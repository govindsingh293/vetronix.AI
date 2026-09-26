# ============================================================
# VETRONIX - Smart Dairy Health Assistant
# FastAPI Backend
#
# Models:
# 1. mastitis_model.pkl -> Sensor prediction
# 2. mastitis_model.pth -> Image prediction
# ============================================================

import os
import traceback
import urllib.parse

import httpx
import joblib
import numpy as np

from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from PIL import Image

import torch
import torch.nn as nn
from torchvision import models, transforms


# ============================================================
# SUPABASE CONNECTION
# ============================================================
# The publishable key is safe for client applications when RLS
# policies are configured. This backend uses the same publishable
# key and the policies supplied in supabase_setup.sql.
# ============================================================
SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://uyqratuxyjfnxeerhlbg.supabase.co"
).rstrip("/")

SUPABASE_KEY = os.getenv(
    "SUPABASE_KEY",
    "sb_publishable_cmy2RZ-_L5e6jTYNwo-JZg_LlbwYLH5"
)

SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json",
}


def supabase_request(method, table, params=None, json_data=None, access_token=None):
    """Small REST helper for Supabase Data API.

    When access_token is supplied, Supabase sees the authenticated user and
    applies the project's authenticated RLS policies.
    """
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = dict(SUPABASE_HEADERS)
    headers["Authorization"] = f"Bearer {access_token or SUPABASE_KEY}"

    if method.upper() in {"POST", "PATCH"} and json_data is not None:
        headers["Prefer"] = "return=representation"

    with httpx.Client(timeout=15.0) as client:
        response = client.request(
            method.upper(),
            url,
            headers=headers,
            params=params,
            json=json_data,
        )

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise RuntimeError(
            f"Supabase {table} request failed ({response.status_code}): {detail}"
        )

    if not response.content:
        return []
    try:
        return response.json()
    except Exception:
        return []


def get_supabase_auth_user(access_token):
    """Validate a Supabase access token using Supabase Auth."""
    if not access_token:
        raise HTTPException(status_code=401, detail="Missing Supabase access token.")

    url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {access_token}",
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase Auth unavailable: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session.")

    try:
        return response.json()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Supabase Auth response.")


def require_supabase_user(authorization: str | None = Header(default=None)):
    """FastAPI dependency used by all Supabase data endpoints."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Supabase Bearer token is required.")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Supabase Bearer token is required.")

    user = get_supabase_auth_user(token)
    return {"token": token, "user": user}


def auth_user_email(auth_user):
    return (auth_user.get("email") or "").strip().lower()



def ensure_supabase_farmer(name, identifier, farm_name=None, auth_user_id=None, access_token=None, auth_email=None):
    """Find or create the farmer row belonging to the authenticated user."""
    identifier = (identifier or "").strip()
    name = (name or "Farmer").strip()
    farm_name = (farm_name or "").strip()
    auth_email = (auth_email or "").strip().lower()

    if not auth_user_id:
        raise RuntimeError("Authenticated Supabase user ID is required.")

    # First try the direct Auth-user relationship.
    rows = supabase_request(
        "GET",
        "farmers",
        params={
            "auth_user_id": f"eq.{auth_user_id}",
            "select": "*",
            "limit": "1",
        },
        access_token=access_token,
    )

    if rows:
        farmer_id = rows[0]["id"]
        supabase_request(
            "PATCH",
            "farmers",
            params={"id": f"eq.{farmer_id}"},
            json_data={"name": name, "farm_name": farm_name},
            access_token=access_token,
        )
        return farmer_id

    # Claim an existing farmer row only when its email matches the
    # authenticated Supabase email. This supports a safe migration of
    # pre-existing email-based farmer rows.
    if auth_email:
        rows = supabase_request(
            "GET",
            "farmers",
            params={
                "email": f"eq.{auth_email}",
                "select": "*",
                "limit": "1",
            },
            access_token=access_token,
        )
        if rows:
            farmer_id = rows[0]["id"]
            supabase_request(
                "PATCH",
                "farmers",
                params={"id": f"eq.{farmer_id}"},
                json_data={
                    "auth_user_id": auth_user_id,
                    "name": name,
                    "farm_name": farm_name,
                },
                access_token=access_token,
            )
            return farmer_id

    # New farmer. The RLS policy requires auth_user_id = auth.uid().
    payload = {
        "auth_user_id": auth_user_id,
        "email": auth_email or (identifier.lower() if "@" in identifier else None),
        "mobile": identifier if "@" not in identifier else None,
        "name": name,
        "farm_name": farm_name,
    }

    rows = supabase_request(
        "POST",
        "farmers",
        json_data=payload,
        access_token=access_token,
    )
    if not rows:
        raise RuntimeError("Supabase did not return the new farmer record.")
    return rows[0]["id"]


def find_supabase_cattle(farmer_id, cow_id, access_token=None):
    rows = supabase_request(
        "GET",
        "cattle",
        params={
            "farmer_id": f"eq.{farmer_id}",
            "cow_id": f"eq.{cow_id}",
            "select": "*",
            "limit": "1",
        },
        access_token=access_token,
    )
    return rows[0] if rows else None


def upsert_supabase_cattle(farmer_id, cattle, access_token=None):
    existing = find_supabase_cattle(farmer_id, cattle["cow_id"], access_token)
    payload = {
        "farmer_id": farmer_id,
        "cow_id": cattle["cow_id"],
        "breed": cattle.get("breed", ""),
        "age": cattle.get("age"),
        "animal_type": cattle.get("type", "Other"),
        "medical_history": cattle.get("history", ""),
    }
    if existing:
        rows = supabase_request(
            "PATCH",
            "cattle",
            params={"id": f"eq.{existing['id']}"},
            json_data=payload,
            access_token=access_token,
        )
        return rows[0] if rows else existing
    rows = supabase_request(
        "POST", "cattle", json_data=payload, access_token=access_token
    )
    return rows[0] if rows else None


def get_supabase_cattle(farmer_id, access_token=None):
    return supabase_request(
        "GET",
        "cattle",
        params={
            "farmer_id": f"eq.{farmer_id}",
            "select": "id,created_at,cow_id,breed,age,animal_type,medical_history",
            "order": "id.asc",
        },
        access_token=access_token,
    )


def supabase_cattle_by_tag(farmer_id, cow_id, access_token=None):
    return find_supabase_cattle(farmer_id, cow_id, access_token)


def save_sensor_and_prediction(farmer_id, cow_id, temperature, conductivity, milk_yield, prediction, probability, model_name, access_token=None):
    cattle = supabase_cattle_by_tag(farmer_id, cow_id, access_token)
    if not cattle:
        raise RuntimeError(f"Cattle '{cow_id}' was not found in Supabase for this farmer.")

    sensor_rows = supabase_request(
        "POST",
        "sensor_readings",
        json_data={
            "cattle_id": cattle["id"],
            "milk_temperature": temperature,
            "milk_conductivity": conductivity,
            "milk_yield": milk_yield,
        },
        access_token=access_token,
    )
    sensor_row = sensor_rows[0] if sensor_rows else None

    prediction_rows = supabase_request(
        "POST",
        "predictions",
        json_data={
            "cattle_id": cattle["id"],
            "sensor_reading_id": sensor_row["id"] if sensor_row else None,
            "prediction": prediction,
            "probability": probability,
            "model_name": model_name,
        },
        access_token=access_token,
    )
    return {
        "sensor_reading": sensor_row,
        "prediction": prediction_rows[0] if prediction_rows else None,
    }


def save_image_prediction(farmer_id, cow_id, image_url, prediction, probability, model_name, access_token=None):
    cattle = supabase_cattle_by_tag(farmer_id, cow_id, access_token)
    if not cattle:
        raise RuntimeError(f"Cattle '{cow_id}' was not found in Supabase for this farmer.")

    rows = supabase_request(
        "POST",
        "image_predictions",
        json_data={
            "cattle_id": cattle["id"],
            "image_url": image_url or "teat-image.jpg",
            "prediction": prediction,
            "probability": probability,
            "model_name": model_name,
        },
        access_token=access_token,
    )
    return rows[0] if rows else None


# ============================================================
# 1. FASTAPI APP
# ============================================================

app = FastAPI(
    title="VETRONIX Mastitis Prediction API",
    description="AI-based bovine mastitis prediction system",
    version="1.0.0"
)


# ============================================================
# 2. CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 3. PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODELS_DIR = os.path.join(BASE_DIR, "models")

SENSOR_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "mastitis_model.pkl"
)

IMAGE_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "mastitis_model.pth"
)


# ============================================================
# 4. DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 60)
print("VETRONIX BACKEND STARTING")
print("=" * 60)

print("Backend folder:")
print(BASE_DIR)

print("Models folder:")
print(MODELS_DIR)

print("Sensor model:")
print(SENSOR_MODEL_PATH)

print("Image model:")
print(IMAGE_MODEL_PATH)

print("Device:")
print(DEVICE)

print("=" * 60)


# ============================================================
# 5. GLOBAL MODEL VARIABLES
# ============================================================

sensor_model = None
sensor_threshold = 0.5
sensor_features = [
    "Milk_Temperature",
    "Milk_Conductivity",
    "Milk_Yield"
]

image_model = None
image_model_error = None


# ============================================================
# 6. LOAD SENSOR MODEL (.pkl)
# ============================================================

print("\nLoading Sensor Model...")

try:

    if not os.path.exists(SENSOR_MODEL_PATH):
        raise FileNotFoundError(
            f"Sensor model not found:\n{SENSOR_MODEL_PATH}"
        )

    sensor_package = joblib.load(SENSOR_MODEL_PATH)

    print("Sensor model file loaded.")

    # --------------------------------------------------------
    # Case 1: saved package
    # --------------------------------------------------------

    if isinstance(sensor_package, dict):

        sensor_model = sensor_package.get("model")

        sensor_threshold = sensor_package.get(
            "threshold",
            0.5
        )

        sensor_features = sensor_package.get(
            "features",
            [
                "Milk_Temperature",
                "Milk_Conductivity",
                "Milk_Yield"
            ]
        )

    # --------------------------------------------------------
    # Case 2: model saved directly
    # --------------------------------------------------------

    else:

        sensor_model = sensor_package

    if sensor_model is None:
        raise ValueError(
            "Sensor model object was not found inside mastitis_model.pkl"
        )

    print("Sensor model loaded successfully.")
    print("Sensor features:", sensor_features)
    print("Sensor threshold:", sensor_threshold)

except Exception as e:

    print("ERROR loading sensor model:")
    print(str(e))

    sensor_model = None


# ============================================================
# 7. IMAGE MODEL ARCHITECTURE
# ============================================================

def create_image_model():

    print("\nCreating MobileNetV2 image model...")

    model = models.mobilenet_v2(weights=None)

    # --------------------------------------------------------
    # Two classes:
    # 0 = Healthy
    # 1 = Mastitis
    # --------------------------------------------------------

    model.classifier[1] = nn.Linear(
        model.last_channel,
        2
    )

    return model


# ============================================================
# 8. LOAD IMAGE MODEL (.pth)
# ============================================================

print("\nLoading Image Model...")

try:

    if not os.path.exists(IMAGE_MODEL_PATH):

        raise FileNotFoundError(
            f"Image model not found:\n{IMAGE_MODEL_PATH}"
        )

    print("Image model file found:")
    print(IMAGE_MODEL_PATH)

    # --------------------------------------------------------
    # Create architecture
    # --------------------------------------------------------

    image_model = create_image_model()

    # --------------------------------------------------------
    # Load .pth
    #
    # weights_only=False allows loading checkpoints saved
    # as complete PyTorch objects/dictionaries.
    # --------------------------------------------------------

    checkpoint = torch.load(
        IMAGE_MODEL_PATH,
        map_location=DEVICE,
        weights_only=False
    )

    print("Checkpoint loaded.")
    print("Checkpoint type:", type(checkpoint))

    # ========================================================
    # CASE 1:
    # Direct state_dict
    # ========================================================

    if isinstance(checkpoint, dict):

        state_dict = None

        # ----------------------------------------------------
        # Common checkpoint formats
        # ----------------------------------------------------

        if "state_dict" in checkpoint:

            state_dict = checkpoint["state_dict"]

            print("Found key: state_dict")

        elif "model_state_dict" in checkpoint:

            state_dict = checkpoint["model_state_dict"]

            print("Found key: model_state_dict")

        elif "model" in checkpoint:

            possible_model = checkpoint["model"]

            if isinstance(
                possible_model,
                dict
            ):

                state_dict = possible_model

                print("Found key: model")

        # ----------------------------------------------------
        # If none of the above exists, assume checkpoint
        # itself is a state_dict.
        # ----------------------------------------------------

        if state_dict is None:

            state_dict = checkpoint

            print(
                "Using checkpoint directly as state_dict."
            )

        # ----------------------------------------------------
        # Remove DataParallel "module." prefix
        # ----------------------------------------------------

        cleaned_state_dict = {}

        for key, value in state_dict.items():

            if key.startswith("module."):

                new_key = key.replace(
                    "module.",
                    "",
                    1
                )

            else:

                new_key = key

            cleaned_state_dict[new_key] = value

        state_dict = cleaned_state_dict

        # ----------------------------------------------------
        # Load weights
        # ----------------------------------------------------

        image_model.load_state_dict(
            state_dict,
            strict=True
        )

        print("Image model weights loaded.")

    # ========================================================
    # CASE 2:
    # Complete PyTorch model
    # ========================================================

    elif isinstance(
        checkpoint,
        nn.Module
    ):

        image_model = checkpoint

        print(
            "Complete PyTorch model loaded."
        )

    else:

        raise ValueError(
            "Unsupported .pth file format."
        )

    # --------------------------------------------------------
    # Move model to CPU/GPU
    # --------------------------------------------------------

    image_model = image_model.to(DEVICE)

    image_model.eval()

    image_model_error = None

    print("=" * 60)
    print("IMAGE MODEL LOADED SUCCESSFULLY")
    print("=" * 60)

except Exception as e:

    image_model = None

    image_model_error = str(e)

    print("=" * 60)
    print("ERROR LOADING IMAGE MODEL")
    print("=" * 60)

    print(str(e))

    print("\nFull traceback:")

    traceback.print_exc()

    print("=" * 60)


# ============================================================
# 9. IMAGE PREPROCESSING
# ============================================================

image_transform = transforms.Compose(
    [
        transforms.Resize(
            (224, 224)
        ),

        transforms.ToTensor(),

        transforms.Normalize(
            mean=[
                0.485,
                0.456,
                0.406
            ],

            std=[
                0.229,
                0.224,
                0.225
            ]
        )
    ]
)


# ============================================================
# 10. IMAGE CLASS NAMES
# ============================================================

IMAGE_CLASSES = [
    "Healthy",
    "Mastitis"
]


# ============================================================
# 11. SENSOR REQUEST MODEL
# ============================================================

class SensorData(BaseModel):

    Milk_Temperature: float

    Milk_Conductivity: float

    Milk_Yield: float

class ESP32LiveConfig(BaseModel):
    """Optional runtime override for the ESP32 base URL."""
    base_url: str | None = None


# Latest sensor telemetry received from the ESP32.
# This is kept in memory for local development; Supabase can be added later.
latest_sensor_data = None

# Current ESP32 Dev Module address. Override with the ESP32_BASE_URL
# environment variable if your router/hotspot assigns a new IP.
ESP32_BASE_URL = os.getenv("ESP32_BASE_URL", "http://10.227.183.50").rstrip("/")


@app.get("/api/esp32-live")
def get_esp32_live():
    """Read the live JSON telemetry directly from the ESP32.

    The browser talks only to FastAPI. FastAPI talks to the ESP32.
    This keeps the existing frontend UI unchanged and avoids ESP32
    browser CORS/mixed-content problems.
    """
    url = f"{ESP32_BASE_URL}/data"

    try:
        # Do not use HTTP(S)_PROXY environment variables for the local ESP32.
        # The browser can reach the ESP32 directly on the LAN, so FastAPI
        # must also connect directly instead of sending 10.x traffic to a proxy.
        with httpx.Client(timeout=httpx.Timeout(8.0, connect=3.0), trust_env=False) as client:
            response = client.get(url)
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"ESP32 is not reachable at {url}. Check that this PC can reach the ESP32 from the same network. {type(exc).__name__}: {exc}",
        )

    # Compatible with the current ESP32 web-server JSON:
    # {"temperature": 28.0, "tds": 250.0, "voltage": 0.713}
    try:
        temperature = float(
            payload.get("temperature", payload.get("Milk_Temperature"))
        )
        tds_ppm = float(
            payload.get("tds", payload.get("TDS_PPM"))
        )
        voltage = float(
            payload.get("voltage", payload.get("TDS_Voltage", 0.0))
        )
    except (TypeError, ValueError, AttributeError):
        raise HTTPException(
            status_code=502,
            detail=f"ESP32 returned an unexpected /data response: {payload}",
        )

    conductivity = tds_ppm / 500.0

    return {
        "success": True,
        "Milk_Temperature": temperature,
        "TDS_PPM": round(tds_ppm, 2),
        "TDS_Voltage": round(voltage, 4),
        "Milk_Conductivity": round(conductivity, 4),
        "raw": payload,
    }


@app.post("/api/sensor-data")
def receive_sensor_data(data: SensorData):
    """Receive the latest temperature/conductivity/yield data from ESP32."""
    global latest_sensor_data

    latest_sensor_data = {
        "Milk_Temperature": data.Milk_Temperature,
        "Milk_Conductivity": data.Milk_Conductivity,
        "Milk_Yield": data.Milk_Yield,
        "TDS_PPM": round(data.Milk_Conductivity * 500, 2)
    }

    return {
        "success": True,
        "message": "Sensor data received successfully.",
        "data": latest_sensor_data
    }


@app.get("/api/sensor-data")
def get_sensor_data():
    """Return the latest sensor telemetry for the frontend."""
    if latest_sensor_data is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor data received yet. Send data from the ESP32 first."
        )

    return {
        "success": True,
        **latest_sensor_data
    }


# ============================================================
# SUPABASE DATA ENDPOINTS
# ============================================================

class FarmerSyncData(BaseModel):
    name: str
    identifier: str
    farm_name: str = ""


class CattleSyncData(BaseModel):
    farmer_id: int
    cow_id: str
    type: str = "Other"
    breed: str = ""
    age: float | None = None
    history: str = ""


class SensorPredictionSaveData(BaseModel):
    farmer_id: int
    cow_id: str
    Milk_Temperature: float
    Milk_Conductivity: float
    Milk_Yield: float
    prediction: str
    probability: float
    model_name: str = "sensor_random_forest"


class ImagePredictionSaveData(BaseModel):
    farmer_id: int
    cow_id: str
    image_url: str = "teat-image.jpg"
    prediction: str
    probability: float
    model_name: str = "mastitis_image_model"


@app.post("/api/supabase/farmer/ensure")
def sync_farmer(data: FarmerSyncData, auth=Depends(require_supabase_user)):
    try:
        user = auth["user"]
        auth_email = auth_user_email(user)
        farmer_id = ensure_supabase_farmer(
            data.name,
            data.identifier,
            data.farm_name,
            auth_user_id=user["id"],
            access_token=auth["token"],
            auth_email=auth_email,
        )
        return {"success": True, "farmer_id": farmer_id}
    except HTTPException:
        raise
    except Exception as e:
        print("\n========== SUPABASE FARMER ERROR ==========")
        print(str(e))
        traceback.print_exc()
        print("============================================\n")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/supabase/cattle/{farmer_id}")
def list_supabase_cattle(farmer_id: int, auth=Depends(require_supabase_user)):
    try:
        rows = get_supabase_cattle(farmer_id, auth["token"])
        return {"success": True, "cattle": rows}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/supabase/cattle")
def sync_cattle(data: CattleSyncData, auth=Depends(require_supabase_user)):
    try:
        row = upsert_supabase_cattle(data.farmer_id, data.model_dump(), auth["token"])
        return {"success": True, "cattle": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/supabase/sensor-prediction")
def sync_sensor_prediction(data: SensorPredictionSaveData, auth=Depends(require_supabase_user)):
    try:
        saved = save_sensor_and_prediction(
            data.farmer_id,
            data.cow_id,
            data.Milk_Temperature,
            data.Milk_Conductivity,
            data.Milk_Yield,
            data.prediction,
            data.probability,
            data.model_name,
            auth["token"],
        )
        return {"success": True, **saved}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/api/supabase/image-prediction")
def sync_image_prediction(data: ImagePredictionSaveData, auth=Depends(require_supabase_user)):
    try:
        row = save_image_prediction(
            data.farmer_id,
            data.cow_id,
            data.image_url,
            data.prediction,
            data.probability,
            data.model_name,
            auth["token"],
        )
        return {"success": True, "image_prediction": row}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ============================================================
# 12. COMBINED REQUEST MODEL
# ============================================================

class CombinedSensorData(BaseModel):

    Milk_Temperature: float

    Milk_Conductivity: float

    Milk_Yield: float


# ============================================================
# 13. ROOT ENDPOINT
# ============================================================

@app.get("/")
def root():

    return {

        "success": True,

        "message":
            "VETRONIX Smart Dairy Health Assistant API is running.",

        "sensor_model_loaded":
            sensor_model is not None,

        "image_model_loaded":
            image_model is not None,

        "device":
            str(DEVICE),

        "endpoints": {

            "sensor_prediction":
                "/api/predict",

            "image_prediction":
                "/api/predict-image",

            "combined_prediction":
                "/api/predict-combined",

            "health":
                "/api/health",

            "docs":
                "/docs"
        }
    }


# ============================================================
# 14. HEALTH ENDPOINT
# ============================================================

@app.get("/api/health")
def health():

    return {

        "status": "running",

        "sensor_model_loaded":
            sensor_model is not None,

        "image_model_loaded":
            image_model is not None,

        "image_model_error":
            image_model_error,

        "device":
            str(DEVICE),

        "sensor_model_path":
            SENSOR_MODEL_PATH,

        "image_model_path":
            IMAGE_MODEL_PATH
    }


# ============================================================
# 15. SENSOR PREDICTION
# ============================================================

@app.post("/api/predict")
def predict_sensor(data: SensorData):

    # --------------------------------------------------------
    # Check model
    # --------------------------------------------------------

    if sensor_model is None:

        raise HTTPException(
            status_code=500,
            detail="Sensor model is not loaded."
        )

    try:

        # ----------------------------------------------------
        # Prepare input
        # ----------------------------------------------------

        input_data = np.array(
            [[
                data.Milk_Temperature,
                data.Milk_Conductivity,
                data.Milk_Yield
            ]],
            dtype=float
        )

        # ----------------------------------------------------
        # Prediction probability
        # ----------------------------------------------------

        if hasattr(
            sensor_model,
            "predict_proba"
        ):

            probabilities = sensor_model.predict_proba(
                input_data
            )[0]

            # Probability of class 1
            probability = float(
                probabilities[1]
            )

        else:

            prediction = int(
                sensor_model.predict(
                    input_data
                )[0]
            )

            probability = float(
                prediction
            )

        # ----------------------------------------------------
        # Apply saved threshold
        # ----------------------------------------------------

        prediction = int(
            probability >= sensor_threshold
        )

        # ----------------------------------------------------
        # Result
        # ----------------------------------------------------

        if prediction == 1:

            result = "Mastitis"

        else:

            result = "Healthy"

        return {

            "success": True,

            "prediction":
                prediction,

            "result":
                result,

            "probability":
                round(
                    probability,
                    4
                ),

            "probability_percent":
                round(
                    probability * 100,
                    2
                ),

            "threshold":
                sensor_threshold,

            "input": {

                "Milk_Temperature":
                    data.Milk_Temperature,

                "Milk_Conductivity":
                    data.Milk_Conductivity,

                "Milk_Yield":
                    data.Milk_Yield
            }
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 16. IMAGE PREDICTION
# ============================================================

@app.post("/api/predict-image")
async def predict_image(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Check image model
    # --------------------------------------------------------

    if image_model is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Image model is not loaded.",

                "error":
                    image_model_error
            }
        )

    try:

        # ----------------------------------------------------
        # Read image
        # ----------------------------------------------------

        image_bytes = await file.read()

        if not image_bytes:

            raise ValueError(
                "Uploaded image is empty."
            )

        # ----------------------------------------------------
        # Open image
        # ----------------------------------------------------

        image = Image.open(
            __import__("io").BytesIO(
                image_bytes
            )
        )

        # ----------------------------------------------------
        # Convert to RGB
        # ----------------------------------------------------

        image = image.convert("RGB")

        # ----------------------------------------------------
        # Transform image
        # ----------------------------------------------------

        image_tensor = image_transform(
            image
        )

        # ----------------------------------------------------
        # Add batch dimension
        # ----------------------------------------------------

        image_tensor = image_tensor.unsqueeze(
            0
        )

        # ----------------------------------------------------
        # Move to device
        # ----------------------------------------------------

        image_tensor = image_tensor.to(
            DEVICE
        )

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        with torch.no_grad():

            outputs = image_model(
                image_tensor
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            probability_values = (
                probabilities[0]
                .cpu()
                .numpy()
            )

            predicted_class = int(
                np.argmax(
                    probability_values
                )
            )

            probability = float(
                probability_values[
                    predicted_class
                ]
            )

        # ----------------------------------------------------
        # Class name
        # ----------------------------------------------------

        if predicted_class < len(
            IMAGE_CLASSES
        ):

            result = IMAGE_CLASSES[
                predicted_class
            ]

        else:

            result = str(
                predicted_class
            )

        return {

            "success": True,

            "prediction":
                predicted_class,

            "result":
                result,

            "probability":
                round(
                    probability,
                    4
                ),

            "probability_percent":
                round(
                    probability * 100,
                    2
                ),

            "filename":
                file.filename
        }

    except Exception as e:

        print("Image prediction error:")

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 17. COMBINED PREDICTION
# ============================================================

@app.post("/api/predict-combined")
async def predict_combined(
    Milk_Temperature: float,
    Milk_Conductivity: float,
    Milk_Yield: float,
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # SENSOR MODEL
    # --------------------------------------------------------

    if sensor_model is None:

        raise HTTPException(
            status_code=500,
            detail="Sensor model is not loaded."
        )

    # --------------------------------------------------------
    # IMAGE MODEL
    # --------------------------------------------------------

    if image_model is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Image model is not loaded.",

                "error":
                    image_model_error
            }
        )

    try:

        # ====================================================
        # SENSOR PREDICTION
        # ====================================================

        sensor_input = np.array(
            [[
                Milk_Temperature,
                Milk_Conductivity,
                Milk_Yield
            ]],
            dtype=float
        )

        sensor_probabilities = (
            sensor_model.predict_proba(
                sensor_input
            )[0]
        )

        sensor_probability = float(
            sensor_probabilities[1]
        )

        sensor_prediction = int(
            sensor_probability >=
            sensor_threshold
        )

        if sensor_prediction == 1:

            sensor_result = "Mastitis"

        else:

            sensor_result = "Healthy"

        # ====================================================
        # IMAGE PREDICTION
        # ====================================================

        image_bytes = await file.read()

        image = Image.open(
            __import__("io").BytesIO(
                image_bytes
            )
        )

        image = image.convert("RGB")

        image_tensor = image_transform(
            image
        )

        image_tensor = image_tensor.unsqueeze(
            0
        )

        image_tensor = image_tensor.to(
            DEVICE
        )

        with torch.no_grad():

            outputs = image_model(
                image_tensor
            )

            probabilities = torch.softmax(
                outputs,
                dim=1
            )

            image_probability_values = (
                probabilities[0]
                .cpu()
                .numpy()
            )

            image_prediction = int(
                np.argmax(
                    image_probability_values
                )
            )

            image_probability = float(
                image_probability_values[
                    image_prediction
                ]
            )

        image_result = IMAGE_CLASSES[
            image_prediction
        ]

        # ====================================================
        # COMBINED RESULT
        # ====================================================

        # ----------------------------------------------------
        # If either model detects mastitis, flag for attention.
        # ----------------------------------------------------

        if (
            sensor_prediction == 1
            or image_prediction == 1
        ):

            combined_result = "Mastitis"

        else:

            combined_result = "Healthy"

        return {

            "success": True,

            "sensor_prediction": {

                "prediction":
                    sensor_prediction,

                "result":
                    sensor_result,

                "probability":
                    round(
                        sensor_probability,
                        4
                    ),

                "probability_percent":
                    round(
                        sensor_probability * 100,
                        2
                    )
            },

            "image_prediction": {

                "prediction":
                    image_prediction,

                "result":
                    image_result,

                "probability":
                    round(
                        image_probability,
                        4
                    ),

                "probability_percent":
                    round(
                        image_probability * 100,
                        2
                    )
            },

            "combined_result":
                combined_result,

            "input": {

                "Milk_Temperature":
                    Milk_Temperature,

                "Milk_Conductivity":
                    Milk_Conductivity,

                "Milk_Yield":
                    Milk_Yield
            }
        }

    except Exception as e:

        print("Combined prediction error:")

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# 18. SERVER START MESSAGE
# ============================================================

if __name__ == "__main__":

    import uvicorn

    print("\n")
    print("=" * 60)
    print("Starting VETRONIX API")
    print("=" * 60)
    print("Open:")
    print("http://127.0.0.1:8000")
    print()
    print("Swagger documentation:")
    print("http://127.0.0.1:8000/docs")
    print("=" * 60)

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )