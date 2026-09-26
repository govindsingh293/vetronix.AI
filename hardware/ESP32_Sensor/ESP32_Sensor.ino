/*
  Vetronix ESP32 Dev Module
  DS18B20 -> GPIO 4
  TDS Meter V1.0 analog output -> GPIO 34

  Current data flow:
  ESP32 -> HTTPS POST /api/esp32/sensor -> FastAPI on Render -> Website
*/

#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ============================================================================
// BACKEND URL - DEPLOYED RENDER BACKEND
// ============================================================================

const char* BACKEND_SENSOR_URL =
    "https://vetronix-ai.onrender.com/api/esp32/sensor";

// ============================================================================
// SENSOR PINS
// ============================================================================

#define DS18B20_PIN 4
#define TDS_PIN 34

// ============================================================================
// DS18B20 SETUP
// ============================================================================

OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

// ============================================================================
// SENSOR VARIABLES
// ============================================================================

float temperatureC = NAN;
float tdsPpm = 0.0;
float tdsVoltage = 0.0;

// ============================================================================
// TIMING
// ============================================================================

unsigned long lastCloudSend = 0;
const unsigned long CLOUD_SEND_INTERVAL_MS = 2000;

// ============================================================================
// READ TEMPERATURE
// ============================================================================

float readTemperature() {
  ds18b20.requestTemperatures();

  float t = ds18b20.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C || t < -50 || t > 125) {
    return NAN;
  }

  return t;
}

// ============================================================================
// READ TDS
// ============================================================================

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

  float compensationCoefficient =
      1.0f + 0.02f * (t - 25.0f);

  float compensatedVoltage =
      tdsVoltage / compensationCoefficient;

  float value =
      (133.42f * compensatedVoltage * compensatedVoltage * compensatedVoltage
       - 255.86f * compensatedVoltage * compensatedVoltage
       + 857.39f * compensatedVoltage) * 0.5f;

  if (value < 0) {
    value = 0;
  }

  return value;
}

// ============================================================================
// SEND SENSOR DATA TO FASTAPI
// ============================================================================

void sendSensorDataToBackend() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Backend send skipped: Wi-Fi is not connected.");
    return;
  }

  if (isnan(temperatureC)) {
    Serial.println("Backend send skipped: DS18B20 temperature is invalid.");
    return;
  }

  // HTTPS client for Render backend
  WiFiClientSecure client;

  // Allow HTTPS connection to Render without manually loading
  // the Render SSL certificate into the ESP32.
  client.setInsecure();

  HTTPClient http;

  if (!http.begin(client, BACKEND_SENSOR_URL)) {
    Serial.println("Could not start HTTPS connection to backend.");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String payload = "{";

  payload += "\"temperature\":";
  payload += String(temperatureC, 2);

  payload += ",\"tds\":";
  payload += String(tdsPpm, 2);

  payload += ",\"voltage\":";
  payload += String(tdsVoltage, 4);

  payload += "}";

  Serial.print("Sending payload: ");
  Serial.println(payload);

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

// ============================================================================
// SETUP
// ============================================================================

void setup() {

  Serial.begin(115200);

  delay(500);

  // ESP32 ADC
  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  // DS18B20
  ds18b20.begin();

  // Wi-Fi
  WiFi.mode(WIFI_STA);

  WiFiManager wifiManager;

  /*
    If saved Wi-Fi credentials are unavailable,
    ESP32 creates:

    VETRONIX-ESP32

    Connect to this setup network and select the
    Wi-Fi network that the ESP32 should use.
  */

  if (!wifiManager.autoConnect("VETRONIX-ESP32")) {

    Serial.println("Wi-Fi setup failed. Restarting...");

    delay(3000);

    ESP.restart();
  }

  Serial.println();
  Serial.println("Wi-Fi connected successfully.");

  Serial.print("ESP32 local IP: ");
  Serial.println(WiFi.localIP());

  Serial.println(
      "ESP32 is connected to the deployed FastAPI backend."
  );

  Serial.println(
      "Backend URL:"
  );

  Serial.println(
      BACKEND_SENSOR_URL
  );
}

// ============================================================================
// LOOP
// ============================================================================

void loop() {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println(
        "Wi-Fi disconnected. Reconnecting..."
    );

    WiFi.reconnect();

    delay(2000);

    return;
  }

  // ========================================================================
  // READ SENSORS
  // ========================================================================

  temperatureC = readTemperature();

  tdsPpm = readTDS(temperatureC);

  Serial.println("--------------------------");

  // ========================================================================
  // TEMPERATURE
  // ========================================================================

  Serial.print("Temperature: ");

  if (isnan(temperatureC)) {

    Serial.println("ERROR");

  } else {

    Serial.print(temperatureC, 2);
    Serial.println(" °C");
  }

  // ========================================================================
  // TDS
  // ========================================================================

  Serial.print("TDS: ");

  Serial.print(tdsPpm, 2);

  Serial.println(" ppm");

  // ========================================================================
  // VOLTAGE
  // ========================================================================

  Serial.print("TDS Voltage: ");

  Serial.print(tdsVoltage, 3);

  Serial.println(" V");

  // ========================================================================
  // ESP32 IP
  // ========================================================================

  Serial.print("WiFi IP: ");

  Serial.println(WiFi.localIP());

  // ========================================================================
  // SEND EVERY 2 SECONDS
  // ========================================================================

  if (millis() - lastCloudSend >= CLOUD_SEND_INTERVAL_MS) {

    lastCloudSend = millis();

    sendSensorDataToBackend();
  }

  Serial.println("--------------------------");

  delay(1000);
}