# ============================================================
# VETRONIX SMART DAIRY HEALTH ASSISTANT - BACKEND
# ============================================================
#
# Models:
# 1. mastitis_model.pkl  -> Sensor prediction
# 2. mastitis_model.onnx -> Image prediction
#
# Render Free memory optimization:
# ONNX image model is loaded only when image prediction
# is requested.
#
# ============================================================

import os
import io
import traceback
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import httpx
import onnxruntime as ort

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Body
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field, AliasChoices

from PIL import Image


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

MODELS_DIR = os.path.join(
    BASE_DIR,
    "models"
)

SENSOR_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "mastitis_model.pkl"
)

IMAGE_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "mastitis_model.onnx"
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="VETRONIX Smart Dairy Health Assistant API",
    description=(
        "Backend API for VETRONIX mastitis prediction "
        "and IoT sensor integration."
    ),
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# GLOBAL MODEL VARIABLES
# ============================================================

sensor_model = None
sensor_model_error = None

image_session = None
image_model_error = None
image_input_name = None
image_output_name = None


# ============================================================
# SENSOR SETTINGS
# ============================================================

sensor_threshold = 0.5


# ============================================================
# ESP32 LIVE SENSOR DATA
# ============================================================

latest_sensor_data = {
    "Milk_Temperature": None,
    "TDS_PPM": None,
    "TDS_Voltage": None,
    "Milk_Conductivity": None,
    "timestamp": None
}


# ============================================================
# SUPABASE SETTINGS
# ============================================================

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    ""
).rstrip("/")

SUPABASE_SERVICE_KEY = os.getenv(
    "SUPABASE_SERVICE_KEY",
    "" 
)


# ============================================================
# LOAD SENSOR MODEL
# ============================================================

def load_sensor_model():

    global sensor_model
    global sensor_model_error

    if sensor_model is not None:
        return sensor_model

    try:

        print("\nLoading sensor model...")

        if not os.path.exists(
            SENSOR_MODEL_PATH
        ):

            raise FileNotFoundError(
                f"Sensor model not found:\n"
                f"{SENSOR_MODEL_PATH}"
            )

        sensor_model = joblib.load(
            SENSOR_MODEL_PATH
        )

        sensor_model_error = None

        print("=" * 60)
        print(
            "SENSOR MODEL LOADED SUCCESSFULLY"
        )
        print("=" * 60)

        return sensor_model

    except Exception as e:

        sensor_model = None
        sensor_model_error = str(e)

        print("=" * 60)
        print(
            "ERROR LOADING SENSOR MODEL"
        )
        print("=" * 60)

        print(str(e))

        traceback.print_exc()

        print("=" * 60)

        return None


# ============================================================
# LOAD ONNX IMAGE MODEL
# ============================================================

def load_image_model():

    global image_session
    global image_model_error
    global image_input_name
    global image_output_name

    if image_session is not None:
        return image_session

    try:

        print("\nLoading ONNX Image Model...")

        if not os.path.exists(
            IMAGE_MODEL_PATH
        ):

            raise FileNotFoundError(
                f"ONNX image model not found:\n"
                f"{IMAGE_MODEL_PATH}"
            )

        session_options = ort.SessionOptions()

        session_options.intra_op_num_threads = 1
        session_options.inter_op_num_threads = 1

        session_options.graph_optimization_level = (
            ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        )

        image_session = ort.InferenceSession(
            IMAGE_MODEL_PATH,
            sess_options=session_options,
            providers=[
                "CPUExecutionProvider"
            ]
        )

        inputs = image_session.get_inputs()
        outputs = image_session.get_outputs()

        if not inputs:

            raise RuntimeError(
                "ONNX model has no input."
            )

        if not outputs:

            raise RuntimeError(
                "ONNX model has no output."
            )

        image_input_name = inputs[0].name
        image_output_name = outputs[0].name

        image_model_error = None

        print(
            "ONNX input name:",
            image_input_name
        )

        print(
            "ONNX output name:",
            image_output_name
        )

        print(
            "ONNX input shape:",
            inputs[0].shape
        )

        print(
            "ONNX output shape:",
            outputs[0].shape
        )

        print("=" * 60)
        print(
            "ONNX IMAGE MODEL LOADED SUCCESSFULLY"
        )
        print("=" * 60)

        return image_session

    except Exception as e:

        image_session = None
        image_model_error = str(e)

        print("=" * 60)
        print(
            "ERROR LOADING ONNX IMAGE MODEL"
        )
        print("=" * 60)

        print(str(e))

        traceback.print_exc()

        print("=" * 60)

        return None


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(image):

    image = image.convert("RGB")

    image = image.resize(
        (224, 224)
    )

    image_array = np.asarray(
        image,
        dtype=np.float32
    )

    image_array = image_array.transpose(
        2,
        0,
        1
    )

    image_array = (
        image_array / 255.0
    )

    mean = np.array(
        [
            0.485,
            0.456,
            0.406
        ],
        dtype=np.float32
    ).reshape(
        3,
        1,
        1
    )

    std = np.array(
        [
            0.229,
            0.224,
            0.225
        ],
        dtype=np.float32
    ).reshape(
        3,
        1,
        1
    )

    image_array = (
        image_array - mean
    ) / std

    image_array = np.expand_dims(
        image_array,
        axis=0
    )

    return image_array.astype(
        np.float32
    )


# ============================================================
# IMAGE CLASS NAMES
# ============================================================

IMAGE_CLASSES = [
    "Healthy",
    "Mastitis"
]


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup_event():

    print("\n")
    print("=" * 60)
    print(
        "VETRONIX BACKEND STARTING"
    )
    print("=" * 60)

    print(
        "Backend folder:"
    )

    print(
        BASE_DIR
    )

    print(
        "Models folder:"
    )

    print(
        MODELS_DIR
    )

    print(
        "Sensor model:"
    )

    print(
        SENSOR_MODEL_PATH
    )

    print(
        "Image model:"
    )

    print(
        IMAGE_MODEL_PATH
    )

    print(
        "Image model device: CPU / ONNX Runtime"
    )

    print("=" * 60)

    load_sensor_model()

    print(
        "ONNX image model will be loaded "
        "only when image prediction is requested."
    )

    print("=" * 60)

    print(
        "VETRONIX BACKEND READY"
    )

    print("=" * 60)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {

        "success": True,

        "message":
            "VETRONIX Smart Dairy Health Assistant API is running.",

        "sensor_model_loaded":
            sensor_model is not None,

        "image_model_loaded":
            image_session is not None,

        "device":
            "cpu",

        "endpoints": {

            "sensor_prediction":
                "/api/predict",

            "image_prediction":
                "/api/predict-image",

            "combined_prediction":
                "/api/predict-combined",

            "health":
                "/api/health",

            "esp32_sensor":
                "/api/esp32/sensor",

            "esp32_live":
                "/api/esp32-live",

            "sensor_data":
                "/api/sensor-data",

            "docs":
                "/docs"
        }
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
async def health_check():

    return {

        "success": True,

        "status":
            "healthy",

        "sensor_model_loaded":
            sensor_model is not None,

        "image_model_loaded":
            image_session is not None,

        "image_model_error":
            image_model_error,

        "sensor_model_error":
            sensor_model_error,

        "device":
            "cpu",

        "timestamp":
            datetime.utcnow().isoformat()
    }


# ============================================================
# SENSOR PREDICTION REQUEST MODEL
# ============================================================

class SensorPredictionRequest(BaseModel):

    Milk_Temperature: float = Field(
        validation_alias=AliasChoices(
            "Milk_Temperature",
            "temperature",
            "milk_temperature"
        )
    )

    Milk_Conductivity: float = Field(
        validation_alias=AliasChoices(
            "Milk_Conductivity",
            "conductivity",
            "milk_conductivity"
        )
    )

    Milk_Yield: float = Field(
        validation_alias=AliasChoices(
            "Milk_Yield",
            "milk_yield",
            "yield"
        )
    )


# ============================================================
# SENSOR PREDICTION MODEL
# ============================================================

@app.post("/api/predict")
async def predict_sensor(
    data: SensorPredictionRequest = Body(...)
):

    model = load_sensor_model()

    if model is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Sensor model could not be loaded.",

                "error":
                    sensor_model_error
            }
        )

    try:

        sensor_input = np.array(
            [[
                data.Milk_Temperature,
                data.Milk_Conductivity,
                data.Milk_Yield
            ]],
            dtype=float
        )

        probabilities = (
            model.predict_proba(
                sensor_input
            )[0]
        )

        if len(probabilities) < 2:

            raise ValueError(
                "Sensor model did not return two class probabilities."
            )

        probability = float(
            probabilities[1]
        )

        prediction = int(
            probability >= sensor_threshold
        )

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

        print(
            "Sensor prediction error:"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# IMAGE PREDICTION
# ============================================================

@app.post("/api/predict-image")
async def predict_image(
    file: UploadFile = File(...)
):

    session = load_image_model()

    if session is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Image model could not be loaded.",

                "error":
                    image_model_error
            }
        )

    try:

        image_bytes = await file.read()

        if not image_bytes:

            raise ValueError(
                "Uploaded image is empty."
            )

        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        )

        image_array = preprocess_image(
            image
        )

        outputs = session.run(
            [image_output_name],
            {
                image_input_name:
                    image_array
            }
        )

        logits = np.asarray(
            outputs[0]
        )[0]

        logits = (
            logits -
            np.max(logits)
        )

        exp_values = np.exp(
            logits
        )

        probabilities = (
            exp_values /
            np.sum(exp_values)
        )

        predicted_class = int(
            np.argmax(
                probabilities
            )
        )

        probability = float(
            probabilities[
                predicted_class
            ]
        )

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

        print(
            "Image prediction error:"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# COMBINED SENSOR + IMAGE PREDICTION REQUEST
# ============================================================

class CombinedPredictionRequest(BaseModel):

    Milk_Temperature: float = Field(
        validation_alias=AliasChoices(
            "Milk_Temperature",
            "temperature",
            "milk_temperature"
        )
    )

    Milk_Conductivity: float = Field(
        validation_alias=AliasChoices(
            "Milk_Conductivity",
            "conductivity",
            "milk_conductivity"
        )
    )

    Milk_Yield: float = Field(
        validation_alias=AliasChoices(
            "Milk_Yield",
            "milk_yield",
            "yield"
        )
    )


# ============================================================
# COMBINED SENSOR + IMAGE PREDICTION
# ============================================================

@app.post("/api/predict-combined")
async def predict_combined(
    data: CombinedPredictionRequest = Body(...),
    file: UploadFile = File(...)
):

    model = load_sensor_model()

    if model is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Sensor model is not loaded.",

                "error":
                    sensor_model_error
            }
        )

    session = load_image_model()

    if session is None:

        raise HTTPException(
            status_code=500,
            detail={
                "message":
                    "Image model could not be loaded.",

                "error":
                    image_model_error
            }
        )

    try:

        # ----------------------------------------------------
        # SENSOR PREDICTION
        # ----------------------------------------------------

        sensor_input = np.array(
            [[
                data.Milk_Temperature,
                data.Milk_Conductivity,
                data.Milk_Yield
            ]],
            dtype=float
        )

        sensor_probabilities = (
            model.predict_proba(
                sensor_input
            )[0]
        )

        sensor_probability = float(
            sensor_probabilities[1]
        )

        sensor_prediction = int(
            sensor_probability >= sensor_threshold
        )

        if sensor_prediction == 1:
            sensor_result = "Mastitis"
        else:
            sensor_result = "Healthy"


        # ----------------------------------------------------
        # IMAGE PREDICTION
        # ----------------------------------------------------

        image_bytes = await file.read()

        if not image_bytes:

            raise ValueError(
                "Uploaded image is empty."
            )

        image = Image.open(
            io.BytesIO(
                image_bytes
            )
        )

        image_array = preprocess_image(
            image
        )

        outputs = session.run(
            [image_output_name],
            {
                image_input_name:
                    image_array
            }
        )

        logits = np.asarray(
            outputs[0]
        )[0]

        logits = (
            logits -
            np.max(logits)
        )

        exp_values = np.exp(
            logits
        )

        image_probability_values = (
            exp_values /
            np.sum(exp_values)
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

        if image_prediction < len(
            IMAGE_CLASSES
        ):

            image_result = IMAGE_CLASSES[
                image_prediction
            ]

        else:

            image_result = str(
                image_prediction
            )


        # ----------------------------------------------------
        # COMBINED RESULT
        # ----------------------------------------------------

        if (
            sensor_prediction == 1
            or
            image_prediction == 1
        ):

            combined_result = "Mastitis"

        else:

            combined_result = "Healthy"


        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

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
                    data.Milk_Temperature,

                "Milk_Conductivity":
                    data.Milk_Conductivity,

                "Milk_Yield":
                    data.Milk_Yield
            }
        }

    except Exception as e:

        print(
            "Combined prediction error:"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# ESP32 SENSOR DATA MODEL
# ============================================================

class ESP32SensorData(BaseModel):

    Milk_Temperature: float = Field(
        validation_alias=AliasChoices(
            "Milk_Temperature",
            "temperature",
            "milk_temperature"
        )
    )

    TDS_PPM: float = Field(
        validation_alias=AliasChoices(
            "TDS_PPM",
            "tds",
            "tds_ppm"
        )
    )

    TDS_Voltage: float = Field(
        validation_alias=AliasChoices(
            "TDS_Voltage",
            "voltage",
            "tds_voltage"
        )
    )

    Milk_Conductivity: float = Field(
        default=0.0,
        validation_alias=AliasChoices(
            "Milk_Conductivity",
            "conductivity",
            "milk_conductivity"
        )
    )


# ============================================================
# ESP32 SENSOR POST
# ============================================================

@app.post("/api/esp32/sensor")
async def receive_esp32_sensor(
    data: ESP32SensorData
):

    global latest_sensor_data

    latest_sensor_data = {

        "Milk_Temperature":
            round(
                data.Milk_Temperature,
                2
            ),

        "TDS_PPM":
            round(
                data.TDS_PPM,
                2
            ),

        "TDS_Voltage":
            round(
                data.TDS_Voltage,
                3
            ),

        "Milk_Conductivity":
            round(
                data.Milk_Conductivity,
                2
            ),

        "timestamp":
            datetime.utcnow().isoformat()
    }

    print(
        "\nESP32 SENSOR DATA RECEIVED"
    )

    print(
        latest_sensor_data
    )

    return {

        "success": True,

        "message":
            "ESP32 sensor data received successfully.",

        "data":
            latest_sensor_data
    }


# ============================================================
# ESP32 LIVE DATA
# ============================================================

@app.get("/api/esp32-live")
async def get_esp32_live():

    if (
        latest_sensor_data[
            "timestamp"
        ] is None
    ):

        return {

            "success": False,

            "message":
                "No ESP32 sensor data received yet.",

            "data":
                latest_sensor_data
        }

    return {

        "success": True,

        "data":
            latest_sensor_data
    }


# ============================================================
# GET SENSOR DATA
# ============================================================

@app.get("/api/sensor-data")
async def get_sensor_data():

    return {

        "success": True,

        "data":
            latest_sensor_data
    }


# ============================================================
# POST SENSOR DATA
# ============================================================

@app.post("/api/sensor-data")
async def post_sensor_data(
    data: ESP32SensorData
):

    global latest_sensor_data

    latest_sensor_data = {

        "Milk_Temperature":
            round(
                data.Milk_Temperature,
                2
            ),

        "TDS_PPM":
            round(
                data.TDS_PPM,
                2
            ),

        "TDS_Voltage":
            round(
                data.TDS_Voltage,
                3
            ),

        "Milk_Conductivity":
            round(
                data.Milk_Conductivity,
                2
            ),

        "timestamp":
            datetime.utcnow().isoformat()
    }

    return {

        "success": True,

        "message":
            "Sensor data stored successfully.",

        "data":
            latest_sensor_data
    }


# ============================================================
# SUPABASE HELPER
# ============================================================

def supabase_headers():

    if not SUPABASE_SERVICE_KEY:

        raise RuntimeError(
            "SUPABASE_SERVICE_KEY is not configured."
        )

    return {

        "apikey":
            SUPABASE_SERVICE_KEY,

        "Authorization":
            f"Bearer {SUPABASE_SERVICE_KEY}",

        "Content-Type":
            "application/json",

        "Prefer":
            "return=representation"
    }


# ============================================================
# SUPABASE FARMER DATA
# ============================================================

class FarmerSyncData(BaseModel):

    user_id: Optional[str] = None

    email: Optional[str] = None

    mobile: Optional[str] = None

    name: Optional[str] = None

    farm_address: Optional[str] = None

    identifier: Optional[str] = None

    farm_name: Optional[str] = None


# ============================================================
# ENSURE SUPABASE FARMER
# ============================================================

@app.post(
    "/api/supabase/farmer/ensure"
)
async def ensure_supabase_farmer(
    data: FarmerSyncData
):

    if not SUPABASE_URL:

        raise HTTPException(
            status_code=500,
            detail=
                "SUPABASE_URL is not configured."
        )

    user_id = data.user_id

    if not user_id and data.identifier:

        user_id = data.identifier

    if not user_id:

        raise HTTPException(
            status_code=422,
            detail=
                "Supabase farmer user_id is required."
        )

    try:

        headers = supabase_headers()

        check_url = (
            f"{SUPABASE_URL}"
            "/rest/v1/farmers"
        )

        params = {

            "user_id":
                f"eq.{user_id}",

            "select":
                "*"
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.get(
                check_url,
                headers=headers,
                params=params
            )

        if response.status_code >= 400:

            print(
                "Supabase farmer lookup error:"
            )

            print(
                response.text
            )

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        existing = response.json()

        if existing:

            existing_farmer = existing[0]

            return {

                "success": True,

                "message":
                    "Farmer already exists.",

                "farmer_id":
                    existing_farmer.get("id"),

                "farmer":
                    existing_farmer
            }

        farmer_data = {

            "user_id":
                user_id,

            "email":
                data.email,

            "mobile":
                data.mobile,

            "name":
                data.name,

            "farm_name":
                data.farm_name
                if data.farm_name is not None
                else data.farm_address
        }

        farmer_data = {
            key: value
            for key, value
            in farmer_data.items()
            if value is not None
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.post(
                check_url,
                headers=headers,
                json=farmer_data
            )

        if response.status_code >= 400:

            print(
                "Supabase farmer creation error:"
            )

            print(
                response.text
            )

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        created = response.json()

        created_farmer = (
            created[0]
            if isinstance(created, list)
            and created
            else created
        )

        return {

            "success": True,

            "message":
                "Farmer account linked successfully.",

            "farmer_id":
                created_farmer.get("id"),

            "farmer":
                created_farmer
        }

    except HTTPException:

        raise

    except Exception as e:

        print(
            "Supabase farmer error:"
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )


# ============================================================
# GET CATTLE FOR FARMER
# ============================================================

@app.get(
    "/api/supabase/cattle/{farmer_id}"
)
async def get_supabase_cattle(
    farmer_id: int
):

    if not SUPABASE_URL:

        raise HTTPException(
            status_code=500,
            detail=
                "SUPABASE_URL is not configured."
        )

    try:

        headers = supabase_headers()

        url = (
            f"{SUPABASE_URL}"
            "/rest/v1/cattle"
        )

        params = {

            "farmer_id":
                f"eq.{farmer_id}",

            "select":
                "*",

            "order":
                "created_at.desc"
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.get(
                url,
                headers=headers,
                params=params
            )

        if response.status_code >= 400:

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        return {

            "success": True,

            "data":
                response.json()
        }

    except HTTPException:

        raise

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )


# ============================================================
# SUPABASE CATTLE MODEL
# ============================================================

class CattleData(BaseModel):

    farmer_id: int

    name: str

    breed: Optional[str] = None

    age: Optional[float] = None

    weight: Optional[float] = None

    milk_yield: Optional[float] = None


# ============================================================
# CREATE CATTLE
# ============================================================

@app.post(
    "/api/supabase/cattle"
)
async def create_supabase_cattle(
    data: CattleData
):

    if not SUPABASE_URL:

        raise HTTPException(
            status_code=500,
            detail=
                "SUPABASE_URL is not configured."
        )

    try:

        headers = supabase_headers()

        url = (
            f"{SUPABASE_URL}"
            "/rest/v1/cattle"
        )

        cattle_data = {

            "farmer_id":
                data.farmer_id,

            "name":
                data.name,

            "breed":
                data.breed,

            "age":
                data.age,

            "weight":
                data.weight,

            "milk_yield":
                data.milk_yield
        }

        cattle_data = {
            key: value
            for key, value
            in cattle_data.items()
            if value is not None
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.post(
                url,
                headers=headers,
                json=cattle_data
            )

        if response.status_code >= 400:

            print(
                "Supabase cattle creation error:"
            )

            print(
                response.text
            )

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        return {

            "success": True,

            "message":
                "Cattle record created successfully.",

            "data":
                response.json()
        }

    except HTTPException:

        raise

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )


# ============================================================
# SENSOR PREDICTION SUPABASE DATA
# ============================================================

class SensorPredictionData(BaseModel):

    farmer_id: int

    cattle_id: Optional[int] = None

    Milk_Temperature: float = Field(
        validation_alias=AliasChoices(
            "Milk_Temperature",
            "milk_temperature",
            "temperature"
        )
    )

    Milk_Conductivity: float = Field(
        validation_alias=AliasChoices(
            "Milk_Conductivity",
            "milk_conductivity",
            "conductivity"
        )
    )

    Milk_Yield: float = Field(
        validation_alias=AliasChoices(
            "Milk_Yield",
            "milk_yield",
            "yield"
        )
    )

    prediction: Optional[int] = None

    result: Optional[str] = None

    probability: Optional[float] = None


# ============================================================
# SAVE SENSOR PREDICTION
# ============================================================

@app.post(
    "/api/supabase/sensor-prediction"
)
async def save_sensor_prediction(
    data: SensorPredictionData
):

    if not SUPABASE_URL:

        raise HTTPException(
            status_code=500,
            detail=
                "SUPABASE_URL is not configured."
        )

    try:

        headers = supabase_headers()

        url = (
            f"{SUPABASE_URL}"
            "/rest/v1/sensor_predictions"
        )

        prediction_data = {

            "farmer_id":
                data.farmer_id,

            "cattle_id":
                data.cattle_id,

            "milk_temperature":
                data.Milk_Temperature,

            "milk_conductivity":
                data.Milk_Conductivity,

            "milk_yield":
                data.Milk_Yield,

            "prediction":
                data.prediction,

            "result":
                data.result,

            "probability":
                data.probability
        }

        prediction_data = {
            key: value
            for key, value
            in prediction_data.items()
            if value is not None
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.post(
                url,
                headers=headers,
                json=prediction_data
            )

        if response.status_code >= 400:

            print(
                "Supabase sensor prediction error:"
            )

            print(
                response.text
            )

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        return {

            "success": True,

            "message":
                "Sensor prediction saved successfully.",

            "data":
                response.json()
        }

    except HTTPException:

        raise

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )


# ============================================================
# IMAGE PREDICTION SUPABASE DATA
# ============================================================

class ImagePredictionData(BaseModel):

    farmer_id: int

    cattle_id: Optional[int] = None

    prediction: Optional[int] = None

    result: Optional[str] = None

    probability: Optional[float] = None

    filename: Optional[str] = None


# ============================================================
# SAVE IMAGE PREDICTION
# ============================================================

@app.post(
    "/api/supabase/image-prediction"
)
async def save_image_prediction(
    data: ImagePredictionData
):

    if not SUPABASE_URL:

        raise HTTPException(
            status_code=500,
            detail=
                "SUPABASE_URL is not configured."
        )

    try:

        headers = supabase_headers()

        url = (
            f"{SUPABASE_URL}"
            "/rest/v1/image_predictions"
        )

        prediction_data = {

            "farmer_id":
                data.farmer_id,

            "cattle_id":
                data.cattle_id,

            "prediction":
                data.prediction,

            "result":
                data.result,

            "probability":
                data.probability,

            "filename":
                data.filename
        }

        prediction_data = {
            key: value
            for key, value
            in prediction_data.items()
            if value is not None
        }

        async with httpx.AsyncClient(
            timeout=20
        ) as client:

            response = await client.post(
                url,
                headers=headers,
                json=prediction_data
            )

        if response.status_code >= 400:

            print(
                "Supabase image prediction error:"
            )

            print(
                response.text
            )

            raise HTTPException(
                status_code=502,
                detail=response.text
            )

        return {

            "success": True,

            "message":
                "Image prediction saved successfully.",

            "data":
                response.json()
        }

    except HTTPException:

        raise

    except Exception as e:

        traceback.print_exc()

        raise HTTPException(
            status_code=502,
            detail=str(e)
        )


# ============================================================
# END OF MAIN.PY
# ============================================================