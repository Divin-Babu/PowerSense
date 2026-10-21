# PowerSense AI - Selenium Test Automation Suite

Automated UI, Functional, and Integration testing suite for the **PowerSense AI Smart Plug** web platform.

---

## Setup Instructions

### 1. Install Dependencies
Make sure Python 3.8+ is installed, then install required Python packages:

```bash
pip install -r requirements.txt
```

### 2. Ensure App & Backend Servers are Active
Before running tests, confirm both local servers are running:
- **Web Application**: `npx expo start --web` (listening on `http://localhost:8081`)
- **FastAPI Backend**: `python -m uvicorn main:app --host 0.0.0.0 --port 8000` (in `backend/`)

---

## Executing the Test Suites

### 1. Run Individual Test Suites
```bash
# Login Tests
python test_login.py

# Registration Tests
python test_register.py

# Dashboard & Relay Control Tests
python test_dashboard.py

# AI Insights & Assistant Tests
python test_ai_insights.py
```

### 2. Run All Test Suites Together via `pytest`
```bash
pytest -v
```

### 3. Run in Headless Mode (No Browser Window)
```powershell
# Windows PowerShell
$env:HEADLESS="1"; python test_dashboard.py

# Linux / macOS
HEADLESS=1 python test_dashboard.py
```

---

## Test Suites & Scenarios Matrix

### 1. Login Test Suite (`test_login.py`)
| Test ID | Test Scenario | Description |
| :--- | :--- | :--- |
| **TC-01** | Page Rendering | Validates presence of PowerSense logo, title, inputs, and sign-in CTA. |
| **TC-02** | Empty Credentials | Submits empty form and verifies client validation warnings. |
| **TC-03** | Invalid Password | Submits wrong password and asserts error message display. |
| **TC-04** | Valid User Login | Submits valid user credentials (`divin@gmail.com` / `123456`) and asserts dashboard navigation. |
| **TC-05** | Forgot Password | Opens Forgot Password modal and verifies prompt feedback. |
| **TC-06** | Navigation to Register | Clicks Register link and verifies redirect to `/register`. |

### 2. Registration Test Suite (`test_register.py`)
| Test ID | Test Scenario | Description |
| :--- | :--- | :--- |
| **TC-01** | Form Rendering | Validates presence of header, 5 input fields (Name, Mobile, Email, Pass, Confirm Pass), and Create Account CTA. |
| **TC-02** | Empty Form Submission | Submits empty form and verifies full name validation warning. |
| **TC-03** | Invalid Mobile Number | Submits invalid length mobile number and verifies mobile validation error. |
| **TC-04** | Password Mismatch | Submits non-matching passwords and asserts mismatch error warning. |
| **TC-05** | Successful Registration | Generates unique user email, fills valid profile data, submits form, and asserts dashboard navigation. |
| **TC-06** | Navigation to Login | Clicks Sign In link and verifies redirect back to `/login`. |

### 3. Dashboard & Relay Control Test Suite (`test_dashboard.py`)
| Test ID | Test Scenario | Description |
| :--- | :--- | :--- |
| **TC-01** | Live Telemetry Render | Verifies Live Power (Watts), Voltage, Current, and Power Factor metrics card. |
| **TC-02** | Smart Plug Relay Toggle | Clicks remote relay toggle button and verifies status update. |
| **TC-03** | Countdown Timer Modal | Opens Countdown Timer modal and verifies duration presets. |
| **TC-04** | Automation Schedules | Opens Plug Schedules modal and checks active routines. |
| **TC-05** | Alerts Navigation | Clicks notification bell button and verifies navigation to `/alerts`. |

### 4. AI Insights & Assistant Test Suite (`test_ai_insights.py`)
| Test ID | Test Scenario | Description |
| :--- | :--- | :--- |
| **TC-01** | Insights Header Render | Validates AI Monthly Optimization hero card and Potential Savings banner. |
| **TC-02** | Product Quick Specs Grid | Verifies 10A current rating, 2.4GHz Wi-Fi, and PZEM-004T v3 sensor cards. |
| **TC-03** | Quick Prompt Chips | Clicks interactive prompt chip (*⚡ Max Load Limit*) and asserts AI Assistant response. |
| **TC-04** | Custom Question Query | Inputs custom doubt (*Why does it show 0V when unplugged?*) and asserts zero-load explanation response. |
