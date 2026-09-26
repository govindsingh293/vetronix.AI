# Vetronix ESP32 backend fix

## Why the 502 happened
The ESP32 web page is reachable from Chrome, but FastAPI's HTTP client was timing out.
The backend now uses `httpx.Client(..., trust_env=False)` so Windows HTTP/HTTPS proxy
environment variables cannot intercept the private ESP32 request.

## Start
Open this folder in VS Code:
`vetronix(new)`

In a terminal:
```powershell
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Test the ESP32 directly
Open:
`http://10.227.183.26/data`

## Test through FastAPI
Open:
`http://127.0.0.1:8000/api/esp32-live`

## Auto refresh
The frontend polls `/api/esp32-live` every 2 seconds. Temperature, TDS and conductivity
are updated automatically.

## If FastAPI still returns 502
Run this in the SAME terminal/environment used to start FastAPI:
```powershell
python -c "import httpx; r=httpx.get('http://10.227.183.26/data', timeout=8, trust_env=False); print(r.status_code); print(r.text)"
```
If this command fails while Chrome can open the ESP32 page, the Python/WSL/container
environment is on a different network path. Run FastAPI from native Windows Python/PowerShell,
not WSL/Docker.
