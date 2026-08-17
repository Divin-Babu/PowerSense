# 🔌 PowerSense ESP32 Firmware & Hardware Setup Guide

This folder contains the complete, production-ready firmware to flash onto your physical **ESP32 Dev Module** connected to the **PZEM-004T v3 Energy Sensor** and a **Relay Module**.

---

## 1. Hardware Pinout & Wiring Connections

| ESP32 Pin | Connected Peripheral | Peripheral Pin | Notes |
|:---|:---|:---|:---|
| **GPIO 16 (RX2)** | PZEM-004T v3 Energy Sensor | **TX** | Serial2 TTL UART |
| **GPIO 17 (TX2)** | PZEM-004T v3 Energy Sensor | **RX** | Serial2 TTL UART |
| **5V / VIN** | PZEM-004T & Relay Module | **VCC** | 5V Power Supply |
| **GND** | PZEM-004T & Relay Module | **GND** | Common Ground |
| **GPIO 26** | 10A / 16A Relay Module | **IN / Signal** | Active HIGH Relay Trigger |
| **GPIO 0 (BOOT)** | Built-in BOOT Button | **-** | Hold for 5s to reset Wi-Fi & re-enter BLE |
| **GPIO 2 (LED)** | Built-in Blue LED | **-** | Blinks in BLE mode, Solid on Wi-Fi |

> ⚠️ **Safety Note for PZEM-004T**: Connect the PZEM high-voltage screw terminals (`L` and `N`) only to 230V AC mains through an enclosed socket with proper insulation. The Current Transformer (CT) coil must be clamped around only one line conductor (Live or Neutral), never both together.

---

## 2. Arduino IDE Setup Instructions

### Step 1: Install ESP32 Board Core
1. Open **Arduino IDE** (v2.0 or newer).
2. Go to **File → Preferences** (or `Ctrl + ,`).
3. In **Additional Board Manager URLs**, paste:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**, search for **esp32** (by Espressif Systems), and install version **2.0.14** or latest.

---

### Step 2: Install Required Libraries
Open **Tools → Manage Libraries...** (or `Ctrl + Shift + I`) and install the following:
1. **PZEM004Tv30** (by Mandar / `mandar2812` / Version 1.1.2)
2. **PubSubClient** (by Nick O'Leary / Version 2.8.0)
3. **ArduinoJson** (by Benoit Blanchon / Version 6.21.x or 7.x)

---

### Step 3: Configure Board Settings in Arduino IDE
Select the following under the **Tools** menu:
- **Board**: `ESP32 Dev Module` (or `NodeMCU-32S`)
- **Port**: Select the COM port where your ESP32 is plugged (e.g. `COM3` or `COM4`)
- **Upload Speed**: `921600` or `115200`
- **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)` *(Recommended for BLE)*
- **Flash Frequency**: `80MHz`
- **Core Debug Level**: `None` or `Info`

---

### Step 4: Flash the Firmware
1. Open [`firmware/PowerSense_ESP32_BLE_Provision.ino`](PowerSense_ESP32_BLE_Provision.ino).
2. Update `BACKEND_SERVER_IP` (line 33) to your PC's local Wi-Fi IP address (e.g. `192.168.1.100`).
3. Click the **Upload** (➡️) button in Arduino IDE.
4. If the console shows `Connecting........_____.....`, press and hold the physical **BOOT** button on the ESP32 board for 2 seconds until the upload starts.

---

## 3. Provisioning Over BLE with PowerSense App

1. Once uploaded, open **Tools → Serial Monitor** at **115200 baud**.
2. You will see:
   ```
   ==============================================
      PowerSense AI Smart Plug - Hardware Node   
   ==============================================
   [BLE Provisioning] Active! Advertised Name: PowerSense-PLUG-A12345
   [BLE Provisioning] Open PowerSense Mobile App -> Tap '+ Add BLE' to pair.
   ```
3. Open the **PowerSense App** in your browser (`http://localhost:8081`) or mobile phone.
4. On the **Home Dashboard**, tap **`+ Add BLE`** or the **"Pair New Smart Plug"** card.
5. Tap **"Scan for Nearby Plugs"**:
   - The browser / app triggers Web Bluetooth to scan and detect your physical ESP32.
   - Select `PowerSense-PLUG-A12345`.
   - Select your Home Wi-Fi network and enter the password.
   - Tap **Send Wi-Fi Credentials via BLE**.
6. The ESP32 receives the credentials, saves them to NVS flash, connects to your router, and immediately starts streaming real 1.0 Hz PZEM telemetry!

---

## 4. Resetting Wi-Fi (Factory Reset)
To switch to a different Wi-Fi network:
- Press and hold the physical **BOOT** button on the ESP32 for **5 seconds**.
- The on-board LED will flash rapidly and the ESP32 will restart into BLE provisioning mode.
