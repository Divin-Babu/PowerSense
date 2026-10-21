# 🔌 PowerSense ESP32 Firmware & Hardware Setup Guide

This folder contains the complete, production-ready firmware for your **PowerSense IoT Hardware Node**, customized for your specific component kit:

1. **ESP-WROOM-32 WIFI Bluetooth Board** (SKU: 835800)
2. **Peacefair PZEM-004T AC meter** (SKU: R154877)
3. **Hi Link HLK-PM01 5V/3W AC-DC Power Supply Module** (SKU: 211849)
4. **5V Dual Channel Relay Module with Optocoupler** (SKU: 31557)
5. **MB102 830-Point Breadboard** (SKU: 24438)
6. **Male to Male, Male to Female, and Female to Female Jumper Wires** (SKUs: 7447, 7450, 44299)

---

## 1. Complete Pinout & Wiring Guide

### A. Power Distribution (HLK-PM01 5V/3W AC-DC Module)
- **AC Input (AC-L & AC-N)**: Connect to 110V-230V AC Mains Live and Neutral.
- **DC Output +5V**: Connect to MB102 Breadboard **Red (+5V) Rail**.
- **DC Output GND**: Connect to MB102 Breadboard **Blue (GND) Rail**.

### B. Module Interconnections

| Module | Pin | Connects To | Jumper Wire Type | Notes |
|:---|:---|:---|:---|:---|
| **ESP32** | **5V / VIN** | Breadboard Red Rail (+5V) | Male-to-Male / Male-to-Female | Powered via HLK-PM01 |
| **ESP32** | **GND** | Breadboard Blue Rail (GND) | Male-to-Male / Male-to-Female | Common System Ground |
| **ESP32** | **GPIO 16 (RX2)** | PZEM-004T **TX** | Male-to-Female | TTL UART Serial Communication |
| **ESP32** | **GPIO 17 (TX2)** | PZEM-004T **RX** | Male-to-Female | TTL UART Serial Communication |
| **ESP32** | **GPIO 26** | Relay Module **IN1** | Male-to-Female | Relay Channel 1 Control (Primary Load) |
| **ESP32** | **GPIO 27** | Relay Module **IN2** | Male-to-Female | Relay Channel 2 Control (Aux Load) |
| **PZEM-004T** | **VCC (+5V)** | Breadboard Red Rail (+5V) | Male-to-Female / Female-to-Female | Sensor TTL Logic Power |
| **PZEM-004T** | **GND** | Breadboard Blue Rail (GND) | Male-to-Female / Female-to-Female | Sensor TTL Ground |
| **5V Dual Relay** | **VCC** | Breadboard Red Rail (+5V) | Female-to-Female / Male-to-Female | Relay Optocoupler VCC |
| **5V Dual Relay** | **GND** | Breadboard Blue Rail (GND) | Female-to-Female / Male-to-Female | Relay Optocoupler Ground |

> ⚠️ **Wiring Note for PZEM-004T Variants**: 
> - **10A Version (Internal Shunt - `10A max` printed on PCB)**: Does **NOT** use an external CT coil ring! Current is measured via an internal sampling shunt resistor. Connect AC Live & Neutral to Terminals 1 & 2 for voltage, and pass the Load Live wire in series through Terminals 3 & 4.
> - **100A Version (External CT Coil)**: Uses an external clamp ring. Connect AC Live & Neutral to Terminals 1 & 2 for voltage, and connect the 2 green/white wires from the CT coil to Terminals 3 & 4 (clamped around one Live wire).
> - Always connect high-voltage AC mains (`L` and `N`) inside an insulated enclosure.

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

---

### Step 4: Flash the Firmware
1. Open [`firmware/PowerSense_ESP32_BLE_Provision.ino`](PowerSense_ESP32_BLE_Provision.ino).
2. Update `BACKEND_SERVER_IP` (line 34) to your PC's local Wi-Fi IP address (e.g. `192.168.1.100`).
3. Click the **Upload** (➡️) button in Arduino IDE.
4. Press physical **BOOT** button on ESP32 if `Connecting........` appears.

---

## 3. Provisioning & App Dashboard Controls

1. Open **Tools → Serial Monitor** at **115200 baud**.
2. Look for: `[BLE Provisioning] Active! Advertised Name: PowerSense-PLUG-A12345`.
3. Open the **PowerSense Mobile App** (`http://localhost:8081` or mobile phone).
4. Tap **`+ Add BLE`** or use the **"Hardware Kit & Wiring Guide"** card on the Home Dashboard.
5. You can now toggle **Relay CH1** (Primary Load) and **Relay CH2** (Auxiliary Load) independently directly from the PowerSense mobile interface!
