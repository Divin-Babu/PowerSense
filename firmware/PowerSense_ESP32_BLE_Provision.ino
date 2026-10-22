/*
  ==============================================================================
  PowerSense AI: Intelligent IoT Smart Plug & Dual Relay Node Firmware
  Board: ESP32 Dev Module / NodeMCU-32S / ESP32-WROOM-32
  Ordered Components Integrated:
    1. ESP-WROOM-32 Dev Board (WiFi Direct + BLE Provisioning Preserved)
    2. Peacefair PZEM-004T v3 AC Energy Meter (UART RX: GPIO 16, TX: GPIO 17)
    3. Hi-Link HLK-PM01 5V/3W AC-DC Switch Power Supply Module (Self-powered node)
    4. 5V Dual Channel Relay Module with Optocoupler (CH1: GPIO 26, CH2: GPIO 27)
    5. MB102 830-Point Breadboard + Male-Male / Male-Female / Female-Female Cables
  ==============================================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiProv.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <PZEM004Tv30.h>
#include <ArduinoJson.h>

// ─── ESP32 Arduino Core 3.x Compatibility Defines ─────────────────────────────
#ifndef WIFI_PROV_SCHEME_BLE
#define WIFI_PROV_SCHEME_BLE NETWORK_PROV_SCHEME_BLE
#endif

#ifndef WIFI_PROV_SCHEME_HANDLER_FREE_BTDM
#define WIFI_PROV_SCHEME_HANDLER_FREE_BTDM NETWORK_PROV_SCHEME_HANDLER_FREE_BTDM
#endif

#ifndef WIFI_PROV_SECURITY_0
#define WIFI_PROV_SECURITY_0 NETWORK_PROV_SECURITY_0
#endif

// ─── Hardware Pin Configuration ──────────────────────────────────────────────
#define RELAY1_PIN           26    // GPIO connected to Relay CH1
#define RELAY2_PIN           27    // GPIO connected to Relay CH2
#define RELAY_ACTIVE_LEVEL   LOW   // Standard 5V optocoupler relay modules are ACTIVE-LOW (LOW = ON)
#define RELAY_INACTIVE_LEVEL HIGH  // HIGH = OFF (de-energize coil)
#define LED_INDICATOR_PIN    2     // On-board status LED (Blinks in BLE mode, Solid on Wi-Fi)
#define RESET_BUTTON_PIN  0     // BOOT Button (Hold 5s to reset Wi-Fi & enter BLE mode)
#define PZEM_RX_PIN       16    // ESP32 RX2 connected to PZEM-004T TX
#define PZEM_TX_PIN       17    // ESP32 TX2 connected to PZEM-004T RX

// ─── Unique Device Identifier & BLE Name ─────────────────────────────────────
const char* DEVICE_UID    = "ESP32-PZEM-PLUG-10A";
const char* BLE_PROV_NAME = "PowerSense-PLUG-A12345";

// ─── DIRECT WI-FI & SERVER CONFIGURATION ─────────────────────────────────────
const char* DIRECT_WIFI_SSID  = "vivo Y75";       // Set your Wi-Fi SSID
const char* DIRECT_WIFI_PASS  = "1133557799";   // Set your Wi-Fi Password

// Cloud Deployment Toggle: Set to true for Render cloud, false for local PC IP
#define USE_CLOUD_HOST        true
const char* RENDER_CLOUD_HOST = "powersense-backend.onrender.com"; // Replace with your actual Render URL domain
const char* BACKEND_SERVER_IP = "10.170.121.5";                    // Local FastAPI IP
const int   HTTP_PORT         = 8000;
const int   MQTT_PORT         = 1883;

char telemetryTopic[64];
char relayCommandTopic[64];
char httpEndpoint[256];
char relayPollEndpoint[256];

// ─── Peripheral Drivers & Objects ────────────────────────────────────────────
WiFiClient espClient;
PubSubClient mqttClient(espClient);
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);

// ─── State Variables ─────────────────────────────────────────────────────────
bool relay1State = true;         // Default Relay CH1 state: ON
bool relay2State = false;        // Default Relay CH2 state: OFF
unsigned long lastTelemetryTs = 0;
unsigned long lastRelayPollTs = 0;
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
      Serial.println("[BLE Provisioning] App paired BLE service active and ready.");
      break;
    case ARDUINO_EVENT_PROV_CRED_RECV:
      Serial.println("\n[BLE Provisioning] Received Wi-Fi credentials from React Native app!");
      break;
    case ARDUINO_EVENT_PROV_CRED_SUCCESS:
      Serial.println("\n[BLE Provisioning] Successfully connected to Home Wi-Fi!");
      break;
    case ARDUINO_EVENT_PROV_END:
      Serial.println("\n[BLE Provisioning] Session Finished. Operating in Wi-Fi station mode.");
      break;
    default:
      break;
  }
}

// ─── MQTT Callback for Remote Relay Control ──────────────────────────────────
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  message.toUpperCase();

  Serial.printf("[MQTT Command] Topic: %s, Message: %s\n", topic, message.c_str());

  if (message.indexOf("CH1_ON") >= 0 || (message == "ON")) {
    relay1State = true;
    digitalWrite(RELAY1_PIN, RELAY_ACTIVE_LEVEL);
    Serial.println("[Relay CH1] Turned ON (Primary Load)");
  } else if (message.indexOf("CH1_OFF") >= 0 || (message == "OFF")) {
    relay1State = false;
    digitalWrite(RELAY1_PIN, RELAY_INACTIVE_LEVEL);
    Serial.println("[Relay CH1] Turned OFF (Primary Load)");
  }

  if (message.indexOf("CH2_ON") >= 0) {
    relay2State = true;
    digitalWrite(RELAY2_PIN, RELAY_ACTIVE_LEVEL);
    Serial.println("[Relay CH2] Turned ON (Auxiliary Load)");
  } else if (message.indexOf("CH2_OFF") >= 0) {
    relay2State = false;
    digitalWrite(RELAY2_PIN, RELAY_INACTIVE_LEVEL);
    Serial.println("[Relay CH2] Turned OFF (Auxiliary Load)");
  }
}

// ─── Maintain MQTT Connection ────────────────────────────────────────────────
void reconnectMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    if (mqttClient.connect(DEVICE_UID)) {
      Serial.println("[MQTT] Connected to broker!");
      mqttClient.subscribe(relayCommandTopic);
    }
  }
}

// ─── HTTP GET Relay Poll (Direct FastAPI Control) ────────────────────────────
void pollRelayStateOverHttp() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
#if USE_CLOUD_HOST
  WiFiClientSecure secClient;
  secClient.setInsecure(); // Bypass CA certificate check for Render SSL
  http.begin(secClient, relayPollEndpoint);
#else
  http.begin(relayPollEndpoint);
#endif
  http.setTimeout(3000);

  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err) {
      const char* r1 = doc["relay1_state"] | doc["relay_state"] | "ON";
      const char* r2 = doc["relay2_state"] | "OFF";
      
      bool targetR1 = (strcmp(r1, "ON") == 0);
      bool targetR2 = (strcmp(r2, "ON") == 0);

      if (targetR1 != relay1State) {
        relay1State = targetR1;
        digitalWrite(RELAY1_PIN, relay1State ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
        Serial.printf("[HTTP Relay Poll] Relay CH1 switched to %s\n", relay1State ? "ON" : "OFF");
      }
      if (targetR2 != relay2State) {
        relay2State = targetR2;
        digitalWrite(RELAY2_PIN, relay2State ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
        Serial.printf("[HTTP Relay Poll] Relay CH2 switched to %s\n", relay2State ? "ON" : "OFF");
      }
    }
  }
  http.end();
}

// ─── HTTP POST Telemetry Stream ──────────────────────────────────────────────
void sendHttpTelemetry(const char* jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
#if USE_CLOUD_HOST
  WiFiClientSecure secClient;
  secClient.setInsecure(); // Bypass CA certificate check for Render SSL
  http.begin(secClient, httpEndpoint);
#else
  http.begin(httpEndpoint);
#endif
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);

  int httpCode = http.POST(jsonPayload);
  if (httpCode <= 0) {
    Serial.printf("[HTTP POST] Telemetry stream error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ─── SETUP ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("   PowerSense AI Smart Plug - Direct Wi-Fi + BLE Node   ");
  Serial.println("========================================================");

  // Initialize GPIO Pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(LED_INDICATOR_PIN, OUTPUT);
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);

  // Initial relay output states
  digitalWrite(RELAY1_PIN, relay1State ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
  digitalWrite(RELAY2_PIN, relay2State ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
  digitalWrite(LED_INDICATOR_PIN, LOW);

  // Build Endpoints & Topics
  snprintf(telemetryTopic, sizeof(telemetryTopic), "powersense/nodes/%s/telemetry", DEVICE_UID);
  snprintf(relayCommandTopic, sizeof(relayCommandTopic), "powersense/nodes/%s/relay", DEVICE_UID);

#if USE_CLOUD_HOST
  snprintf(httpEndpoint, sizeof(httpEndpoint), "https://%s/api/esp32/telemetry", RENDER_CLOUD_HOST);
  snprintf(relayPollEndpoint, sizeof(relayPollEndpoint), "https://%s/api/esp32/relay?device_id=%s", RENDER_CLOUD_HOST, DEVICE_UID);
#else
  snprintf(httpEndpoint, sizeof(httpEndpoint), "http://%s:%d/api/esp32/telemetry", BACKEND_SERVER_IP, HTTP_PORT);
  snprintf(relayPollEndpoint, sizeof(relayPollEndpoint), "http://%s:%d/api/esp32/relay?device_id=%s", BACKEND_SERVER_IP, HTTP_PORT, DEVICE_UID);
#endif

  // Configure MQTT
  mqttClient.setServer(BACKEND_SERVER_IP, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  // 1. Direct Wi-Fi Auto-Connect Attempt
  if (strlen(DIRECT_WIFI_SSID) > 0 && strcmp(DIRECT_WIFI_SSID, "YOUR_WIFI_SSID") != 0) {
    Serial.printf("\n[Wi-Fi Direct] Attempting connection : %s\n", DIRECT_WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(DIRECT_WIFI_SSID, DIRECT_WIFI_PASS);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 16) {
      delay(500);
      Serial.print(".");
      digitalWrite(LED_INDICATOR_PIN, !digitalRead(LED_INDICATOR_PIN));
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[Wi-Fi Direct] Connected successfully!");
      Serial.print("[Wi-Fi Direct] IP Address: ");
      Serial.println(WiFi.localIP());
      digitalWrite(LED_INDICATOR_PIN, HIGH);
      isProvisioned = true;
    } else {
      Serial.println("\n[Wi-Fi Direct] Could not connect directly to configured SSID.");
      digitalWrite(LED_INDICATOR_PIN, LOW);
    }
  }

  // 2. Keep BLE Provisioning active and initialized in parallel
  WiFi.onEvent(SysProvEvent);
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
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_INDICATOR_PIN, HIGH);
    
    // Optional MQTT loop
    reconnectMqtt();
    mqttClient.loop();

    // Poll HTTP relay commands every 1.0 second
    unsigned long now = millis();
    if (now - lastRelayPollTs >= 1000) {
      lastRelayPollTs = now;
      pollRelayStateOverHttp();
    }

    // Read PZEM-004T Sensor and Push Telemetry @ 2.0 Hz (500ms interval for fast live updates)
    if (now - lastTelemetryTs >= 500) {
      lastTelemetryTs = now;

      float voltage   = pzem.voltage();
      float current   = pzem.current();
      float power     = pzem.power();
      float energy    = pzem.energy();
      float frequency = pzem.frequency();
      float pf        = pzem.pf();

      bool acConnected = !(isnan(voltage) || voltage <= 0.0);
      if (!acConnected) {
        voltage   = 0.0;
        current   = 0.0;
        power     = 0.0;
        energy    = (isnan(energy) || energy < 0.0) ? 0.0 : energy;
        frequency = 0.0;
        pf        = 0.0;
      }

      StaticJsonDocument<384> doc;
      doc["device_id"]    = DEVICE_UID;
      doc["name"]         = "Living Room Smart Plug";
      doc["voltage"]      = voltage;
      doc["current"]      = current;
      doc["power"]        = power;                      // Exact Watts from PZEM (no round off)
      doc["energy"]       = energy;
      doc["frequency"]    = frequency;
      doc["power_factor"] = pf;
      doc["relay_state"]  = relay1State ? "ON" : "OFF";
      doc["relay1_state"] = relay1State ? "ON" : "OFF";
      doc["relay2_state"] = relay2State ? "ON" : "UNASSIGNED";
      doc["ac_connected"] = acConnected;
      doc["power_source"] = "HLK-PM01 5V AC-DC";
      doc["rssi"]         = WiFi.RSSI();

      char buffer[384];
      size_t len = serializeJson(doc, buffer);

      if (mqttClient.connected()) {
        mqttClient.publish(telemetryTopic, buffer, len);
      }
      sendHttpTelemetry(buffer);

      Serial.printf("[Telemetry 1Hz] V:%.1fV | I:%.2fA | P:%.1fW | Relay CH1:%s | RSSI:%d dBm\n",
                    voltage, current, power, relay1State ? "ON" : "OFF", WiFi.RSSI());
    }
  } else {
    // Fast blink LED when searching for connection / in BLE provision mode
    digitalWrite(LED_INDICATOR_PIN, (millis() / 500) % 2);

    // Auto-retry Wi-Fi connection every 5 seconds if disconnected
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = millis();
      if (strlen(DIRECT_WIFI_SSID) > 0 && strcmp(DIRECT_WIFI_SSID, "vivo Y75") != 0) {
        WiFi.begin(DIRECT_WIFI_SSID, DIRECT_WIFI_PASS);
      }
    }
  }

  // Physical Factory Reset (BOOT Button GPIO 0 hold 5s)
  if (digitalRead(RESET_BUTTON_PIN) == LOW) {
    if (buttonPressStart == 0) {
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart > 5000 && !buttonHeld) {
      buttonHeld = true;
      Serial.println("\n[Factory Reset] 5s press detected! Resetting Wi-Fi & restarting...");
      for (int i = 0; i < 8; i++) {
        digitalWrite(LED_INDICATOR_PIN, !digitalRead(LED_INDICATOR_PIN));
        delay(100);
      }
      WiFi.disconnect(true, true);
      delay(500);
      ESP.restart();
    }
  } else {
    buttonPressStart = 0;
    buttonHeld = false;
  }
}
