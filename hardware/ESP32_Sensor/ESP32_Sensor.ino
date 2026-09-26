/*
  Vetronix ESP32 Dev Module
  DS18B20 -> GPIO 4
  TDS Meter V1.0 analog output -> GPIO 34

  Cloud data flow:
  ESP32 -> HTTPS POST /api/esp32/sensor -> FastAPI -> Website

  The ESP32 no longer uses a fixed local IP. WiFiManager stores the
  selected Wi-Fi credentials in flash and opens a setup portal when needed.
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================================================
// RENDER BACKEND URL
// ============================================================================
// After Render deployment, replace YOUR-RENDER-SERVICE with the actual
// Render service name. Do not add a trailing slash.
const char* BACKEND_SENSOR_URL =
    "https://YOUR-RENDER-SERVICE.onrender.com/api/esp32/sensor";

#define DS18B20_PIN 4
#define TDS_PIN 34

float temperatureC = NAN;
float tdsPpm = 0.0;
float tdsVoltage = 0.0;

unsigned long lastCloudSend = 0;
const unsigned long CLOUD_SEND_INTERVAL_MS = 2000;

float readTemperature() {
  ds18b20.requestTemperatures();

  float t = ds18b20.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C || t < -50 || t > 125) {
    return NAN;
  }

  return t;
}

OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

float readTDS(float temperature) {
  const int samples = 10;
  uint32_t total = 0;

  for (int i = 0; i < samples; i++) {
    total += analogRead(TDS_PIN);
    delay(5);
  }

  float adc = total / (float)samples;

  tdsVoltage = adc * 3.3f / 4095.0f;

  float t = isnan(temperature) ? 25.0f : temperature;
  float compensationCoefficient = 1.0f + 0.02f * (t - 25.0f);
  float compensatedVoltage = tdsVoltage / compensationCoefficient;

  float value =
      (133.42f * compensatedVoltage * compensatedVoltage * compensatedVoltage
       - 255.86f * compensatedVoltage * compensatedVoltage
       + 857.39f * compensatedVoltage) * 0.5f;

  if (value < 0) value = 0;

  return value;
}

void sendSensorDataToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cloud send skipped: Wi-Fi is not connected.");
    return;
  }

  if (isnan(temperatureC)) {
    Serial.println("Cloud send skipped: DS18B20 temperature is invalid.");
    return;
  }

  WiFiClientSecure client;

  // Render uses HTTPS. This is convenient for the SIH/demo deployment.
  // For a production system, replace setInsecure() with certificate validation.
  client.setInsecure();

  HTTPClient http;

  if (!http.begin(client, BACKEND_SENSOR_URL)) {
    Serial.println("Could not start HTTPS connection to backend.");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"temperature\":" + String(temperatureC, 2);
  payload += ",\"tds\":" + String(tdsPpm, 2);
  payload += ",\"voltage\":" + String(tdsVoltage, 4);
  payload += "}";

  int httpCode = http.POST(payload);

  Serial.print("Backend POST status: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Backend response: ");
    Serial.println(response);
  } else {
    Serial.print("Backend POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  ds18b20.begin();

  WiFi.mode(WIFI_STA);

  WiFiManager wifiManager;

  // If saved Wi-Fi credentials are unavailable, ESP32 creates the
  // "VETRONIX-ESP32" setup network. Connect to it and choose the Wi-Fi
  // network that should be used by the device.
  if (!wifiManager.autoConnect("VETRONIX-ESP32")) {
    Serial.println("Wi-Fi setup failed. Restarting...");
    delay(3000);
    ESP.restart();
  }

  Serial.println();
  Serial.println("Wi-Fi connected successfully.");
  Serial.print("ESP32 local IP (informational only): ");
  Serial.println(WiFi.localIP());
  Serial.println("The local IP is NOT used by the cloud backend.");
  Serial.println("ESP32 is ready to push sensor data to Render.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi disconnected. Reconnecting...");
    WiFi.reconnect();
    delay(2000);
    return;
  }

  temperatureC = readTemperature();
  tdsPpm = readTDS(temperatureC);

  Serial.println("--------------------------");

  Serial.print("Temperature: ");
  if (isnan(temperatureC)) {
    Serial.println("ERROR");
  } else {
    Serial.print(temperatureC, 2);
    Serial.println(" °C");
  }

  Serial.print("TDS: ");
  Serial.print(tdsPpm, 2);
  Serial.println(" ppm");

  Serial.print("TDS Voltage: ");
  Serial.print(tdsVoltage, 3);
  Serial.println(" V");

  Serial.print("WiFi IP: ");
  Serial.println(WiFi.localIP());

  if (millis() - lastCloudSend >= CLOUD_SEND_INTERVAL_MS) {
    lastCloudSend = millis();
    sendSensorDataToBackend();
  }

  Serial.println("--------------------------");
  delay(1000);
}
