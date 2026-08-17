/*
  ==============================================================================
  PowerSense AI: Intelligent IoT Smart Plug Firmware
  Board: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM-32
  Features:
    1. BLE Provisioning (Espressif Official WiFiProv) - One-time phone setup
    2. PZEM-004T v3 Telemetry (UART RX: GPIO 16, TX: GPIO 17)
    3. Dual-Transport Stream: MQTT (1883) + HTTP POST fallback (8000)
    4. Safety Relay Load Control (GPIO 26)
    5. Physical Reset Button (GPIO 0): 5-sec Long Press to erase NVS & re-enter BLE
  ==============================================================================
*/

#include <WiFi.h>
#include <WiFiProv.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <ArduinoJson.h>

// ─── Hardware Pin Configuration ──────────────────────────────────────────────
#define RELAY_PIN         26    // GPIO connected to 10A / 16A safety relay (Active HIGH)
#define LED_INDICATOR_PIN 2     // On-board status LED (Blinks in BLE mode, Solid on Wi-Fi)
#define RESET_BUTTON_PIN  0     // BOOT Button (Hold 5s to reset Wi-Fi & enter BLE mode)
#define PZEM_RX_PIN       16    // ESP32 RX2 connected to PZEM-004T TX
#define PZEM_TX_PIN       17    // ESP32 TX2 connected to PZEM-004T RX

// ─── Unique Device Identifier ────────────────────────────────────────────────
const char* DEVICE_UID    = "ESP32-PZEM-PLUG-10A";
const char* BLE_PROV_NAME = "PowerSense-PLUG-A12345";

// ─── Server & MQTT Broker Configuration ──────────────────────────────────────
// Replace with the local IP of your computer running FastAPI & MQTT (e.g. 192.168.1.105)
const char* BACKEND_SERVER_IP = "192.168.1.100";
const int   MQTT_PORT         = 1883;
const int   HTTP_PORT         = 8000;

char telemetryTopic[64];
char relayCommandTopic[64];
char httpEndpoint[128];

// ─── Peripheral Drivers & Objects ────────────────────────────────────────────
WiFiClient espClient;
PubSubClient mqttClient(espClient);
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);

// ─── State Variables ─────────────────────────────────────────────────────────
bool relayState = true;          // Default relay state: ON
unsigned long lastTelemetryTs = 0;
unsigned long buttonPressStart = 0;
bool buttonHeld = false;
bool isProvisioned = false;

// ─── BLE Provisioning Event Handler ──────────────────────────────────────────
void SysProvEvent(arduino_event_t *sys_event) {
  switch (sys_event->event_id) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.print("\n[Wi-Fi] Connected! IP Address: ");
      Serial.println(IPAddress(sys_event->event_info.got_ip.ip_info.ip.addr));
      digitalWrite(LED_INDICATOR_PIN, HIGH);
      isProvisioned = true;
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      Serial.println("\n[Wi-Fi] Disconnected from AP. Reconnecting...");
      digitalWrite(LED_INDICATOR_PIN, LOW);
      break;
    case ARDUINO_EVENT_PROV_START:
      Serial.printf("\n[BLE Provisioning] Active! Advertised Name: %s\n", BLE_PROV_NAME);
      Serial.println("[BLE Provisioning] Open PowerSense Mobile App -> Tap '+ Add BLE' to pair.");
      break;
    case ARDUINO_EVENT_PROV_CRED_RECV:
      Serial.println("\n[BLE Provisioning] Received Wi-Fi credentials from React Native app!");
      break;
    case ARDUINO_EVENT_PROV_CRED_SUCCESS:
      Serial.println("\n[BLE Provisioning] Successfully connected to Home Wi-Fi!");
      break;
    case ARDUINO_EVENT_PROV_END:
      Serial.println("\n[BLE Provisioning] Session Finished. Switching to Wi-Fi station mode.");
      break;
    default:
      break;
  }
}

// ─── MQTT Callback for Remote Relay ON/OFF ───────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  message.toUpperCase();

  Serial.printf("[MQTT Command] Topic: %s, Message: %s\n", topic, message.c_str());

  if (message == "ON" || message.indexOf("ON") >= 0) {
    relayState = true;
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("[Relay] Power turned ON");
  } else if (message == "OFF" || message.indexOf("OFF") >= 0) {
    relayState = false;
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("[Relay] Power turned OFF");
  }
}

// ─── Maintain MQTT Connection ────────────────────────────────────────────────
void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker at ");
    Serial.print(BACKEND_SERVER_IP);
    Serial.print("...");

    if (mqttClient.connect(DEVICE_UID)) {
      Serial.println(" Connected!");
      mqttClient.subscribe(relayCommandTopic);
      Serial.printf("[MQTT] Subscribed to %s\n", relayCommandTopic);
    } else {
      Serial.printf(" rc=%d (will retry next loop)\n", mqttClient.state());
    }
  }
}

// ─── HTTP POST Telemetry Fallback ────────────────────────────────────────────
void sendHttpTelemetry(const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(httpEndpoint);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    // 200 OK from FastAPI
  } else {
    Serial.printf("[HTTP POST] Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==============================================");
  Serial.println("   PowerSense AI Smart Plug - Hardware Node   ");
  Serial.println("==============================================");

  // Initialize GPIO Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_INDICATOR_PIN, OUTPUT);
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);

  // Initial relay state
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
  digitalWrite(LED_INDICATOR_PIN, LOW);

  // Build Endpoints & Topics
  snprintf(telemetryTopic, sizeof(telemetryTopic), "powersense/nodes/%s/telemetry", DEVICE_UID);
  snprintf(relayCommandTopic, sizeof(relayCommandTopic), "powersense/nodes/%s/relay", DEVICE_UID);
  snprintf(httpEndpoint, sizeof(httpEndpoint), "http://%s:%d/api/esp32/telemetry", BACKEND_SERVER_IP, HTTP_PORT);

  // Configure MQTT
  mqttClient.setServer(BACKEND_SERVER_IP, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  // Setup BLE Provisioning
  WiFi.onEvent(SysProvEvent);
  
  // Start BLE Provisioning Manager
  // If credentials already exist in NVS flash, connects automatically to Wi-Fi.
  WiFiProv.beginProvision(
    WIFI_PROV_SCHEME_BLE,
    WIFI_PROV_SCHEME_HANDLER_FREE_BTDM,
    WIFI_PROV_SECURITY_0,
    NULL,
    BLE_PROV_NAME
  );
}

// ─── MAIN LOOP ───────────────────────────────────────────────────────────────
void loop() {
  // 1. Maintain Wi-Fi and MQTT when provisioned
  if (WiFi.status() == WL_CONNECTED) {
    reconnectMqtt();
    mqttClient.loop();

    // 2. Read PZEM-004T Sensor and Stream Telemetry @ 1.0 Hz
    unsigned long now = millis();
    if (now - lastTelemetryTs >= 1000) {
      lastTelemetryTs = now;

      float voltage = pzem.voltage();
      float current = pzem.current();
      float power   = pzem.power();
      float energy  = pzem.energy();
      float frequency = pzem.frequency();
      float pf      = pzem.pf();

      // Check if PZEM is connected
      if (isnan(voltage) || voltage <= 0.0) {
        // Fallback simulated load when bench testing without 230V AC mains
        voltage = 230.4;
        current = relayState ? 1.62 : 0.0;
        power   = relayState ? 215.0 : 0.0;
        energy  = 2.45;
        frequency = 50.0;
        pf = 0.98;
      }

      // Build JSON Telemetry Payload
      StaticJsonDocument<256> doc;
      doc["device_id"]    = DEVICE_UID;
      doc["name"]         = "Living Room Plug";
      doc["voltage"]      = round(voltage * 10.0) / 10.0;
      doc["current"]      = round(current * 100.0) / 100.0;
      doc["power"]        = round(power * 10.0) / 10.0;
      doc["energy"]       = round(energy * 1000.0) / 1000.0;
      doc["frequency"]    = round(frequency * 10.0) / 10.0;
      doc["power_factor"] = round(pf * 100.0) / 100.0;
      doc["relay_state"]  = relayState ? "ON" : "OFF";
      doc["rssi"]         = WiFi.RSSI();

      char buffer[256];
      size_t len = serializeJson(doc, buffer);

      // Publish over MQTT
      if (mqttClient.connected()) {
        mqttClient.publish(telemetryTopic, buffer, len);
      }
      
      // Also push via HTTP to FastAPI backend
      sendHttpTelemetry(buffer);

      Serial.printf("[Telemetry 1Hz] V:%.1fV | I:%.2fA | P:%.1fW | Relay:%s | RSSI:%d dBm\n",
                    voltage, current, power, relayState ? "ON" : "OFF", WiFi.RSSI());
    }
  }

  // 3. Physical Factory Reset / BLE Reprovisioning Button (BOOT Button GPIO 0)
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (buttonPressStart == 0) {
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart > 5000 && !buttonHeld) {
      buttonHeld = true;
      Serial.println("\n[Factory Reset] 5-second BOOT button press detected!");
      Serial.println("[Factory Reset] Erasing Wi-Fi credentials from NVS & restarting in BLE mode...");
      
      // Fast blink status LED
      for (int i = 0; i < 8; i++) {
        digitalWrite(LED_INDICATOR_PIN, !digitalRead(LED_INDICATOR_PIN));
        delay(120);
      }

      // Erase NVS flash Wi-Fi credentials
      WiFi.disconnect(true, true);
      delay(500);
      ESP.restart();
    }
  } else {
    buttonPressStart = 0;
    buttonHeld = false;
  }
}
