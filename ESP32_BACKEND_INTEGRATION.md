# Vetronix ESP32 -> UI -> Backend integration

The existing `frontend/index.html` and `frontend/style.css` are unchanged.

Data flow:
ESP32 `/data` -> FastAPI `/api/esp32-live` -> existing Model 1 UI fields -> FastAPI `/api/sensor-data`.

The frontend polls every 2 seconds without changing the UI layout.

Current backend default ESP32 address:
`http://10.34.187.26`

If the ESP32 gets a new IP, set the environment variable before starting FastAPI:

PowerShell:
`$env:ESP32_BASE_URL="http://NEW_IP"`

Start backend from the `backend` folder:
`python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`

The PC running FastAPI and the ESP32 must be on the same Wi-Fi/hotspot network.

Milk yield remains manual because the existing project UI defines it as manual input.

For battery operation, upload the ESP32 sketch first, then use a suitable regulated supply. Do not connect an unregulated battery voltage directly to a GPIO.
