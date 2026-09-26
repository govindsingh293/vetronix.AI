/*
  Vetronix ESP32 Dev Module
  DS18B20 -> GPIO 4
  TDS Meter V1.0 analog output -> GPIO 34
  Web API: GET /data
*/

#include <WiFi.h>
#include <WebServer.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Fixed network settings
IPAddress local_IP(10, 227, 183, 50);
IPAddress gateway(10, 227, 183, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);
IPAddress secondaryDNS(8, 8, 4, 4);

#define DS18B20_PIN 4
#define TDS_PIN 34

WebServer server(80);
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);

float temperatureC = NAN;
float tdsPpm = 0.0;
float tdsVoltage = 0.0;

float readTemperature() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);
  if (t == DEVICE_DISCONNECTED_C || t < -50 || t > 125) return NAN;
  return t;
}

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

void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vetronix ESP32 Sensor</title>
</head>
<body style="font-family:Arial;text-align:center;padding:20px">
<h2>Vetronix ESP32 Sensor</h2>
<p>Open <b>/data</b> for live JSON telemetry.</p>
<p>Temperature: <span id="t">--</span> °C</p>
<p>TDS: <span id="tds">--</span> ppm</p>
<p>Voltage: <span id="v">--</span> V</p>
<script>
async function update() {
  try {
    const r = await fetch('/data');
    const d = await r.json();
    document.getElementById('t').textContent = Number(d.temperature).toFixed(2);
    document.getElementById('tds').textContent = Number(d.tds).toFixed(2);
    document.getElementById('v').textContent = Number(d.voltage).toFixed(3);
  } catch(e) {}
}
update();
setInterval(update, 2000);
</script>
</body>
</html>
)rawliteral";
  server.send(200, "text/html", html);
}

void handleData() {
  String json = "{";
  json += "\"temperature\":";
  json += isnan(temperatureC) ? "null" : String(temperatureC, 2);
  json += ",\"tds\":";
  json += String(tdsPpm, 2);
  json += ",\"voltage\":";
  json += String(tdsVoltage, 4);
  json += "}";

  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", json);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);

  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS)) {
    Serial.println("Static IP configuration failed!");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected");
    Serial.print("ESP32 Fixed IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  analogReadResolution(12);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  ds18b20.begin();
  connectWiFi();

  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleData);
  server.begin();

  Serial.println("HTTP server started.");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  temperatureC = readTemperature();
  tdsPpm = readTDS(temperatureC);

  Serial.println("--------------------------");
  Serial.print("Temperature: ");
  if (isnan(temperatureC)) Serial.println("ERROR");
  else {
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
  Serial.println("--------------------------");

  server.handleClient();
  delay(1000);
}
