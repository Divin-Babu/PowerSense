"""
PowerSense AI - Selenium Automated UI Test Suite for Registration Functionality
==============================================================================
Author: PowerSense Test Automation Team
Framework: Selenium WebDriver + pytest / unittest

Prerequisites:
  1. Ensure Python dependencies are installed (pip install selenium)
  2. Ensure Expo Web server is running on http://localhost:8081
  3. Ensure FastAPI backend is running on http://localhost:8000
"""

import os
import sys
import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Optional webdriver_manager support with Selenium 4 built-in fallback
try:
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service as ChromeService
    HAS_WEBDRIVER_MANAGER = True
except ImportError:
    HAS_WEBDRIVER_MANAGER = False


class PowerSenseRegisterTest(unittest.TestCase):

    BASE_URL = os.getenv("APP_URL", "http://localhost:8081")
    IMPLICIT_WAIT_SEC = 10
    EXPLICIT_WAIT_SEC = 12

    @classmethod
    def setUpClass(cls):
        """Set up Selenium WebDriver once before all registration tests run."""
        print(f"\n[Selenium] Initializing Chrome WebDriver for Registration Tests at {cls.BASE_URL}...")
        options = webdriver.ChromeOptions()
        
        # Enable headless mode if HEADLESS=1 environment variable is set
        if os.getenv("HEADLESS", "0") == "1":
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
        
        options.add_argument("--window-size=1280,800")
        options.add_argument("--start-maximized")
        options.add_argument("--disable-notifications")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")

        # Automatically setup ChromeDriver (via webdriver_manager or Selenium 4 Manager)
        if HAS_WEBDRIVER_MANAGER:
            service = ChromeService(ChromeDriverManager().install())
            cls.driver = webdriver.Chrome(service=service, options=options)
        else:
            cls.driver = webdriver.Chrome(options=options)

        cls.driver.implicitly_wait(cls.IMPLICIT_WAIT_SEC)
        cls.wait = WebDriverWait(cls.driver, cls.EXPLICIT_WAIT_SEC)

    @classmethod
    def tearDownClass(cls):
        """Quit browser after completing test suite."""
        if cls.driver:
            print("\n[Selenium] Closing browser session...")
            cls.driver.quit()

    def setUp(self):
        """Navigate to registration page in a fresh logged-out state before each test."""
        try:
            self.driver.get(f"{self.BASE_URL}/login")
            self.driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
        except Exception:
            pass
        self.driver.get(f"{self.BASE_URL}/register")
        time.sleep(1)

    def find_all_inputs(self):
        """Helper to return all input elements in DOM order."""
        return self.wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))

    def find_button_by_text(self, button_text):
        """Helper to find clickable CTA button or link containing text."""
        xpath_selectors = [
            f"//div[@role='button' and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{button_text.lower()}')]",
            f"//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{button_text.lower()}')]",
            f"//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{button_text.lower()}')]",
            f"//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{button_text.lower()}') and (ancestor::div[@role='button'] or ancestor::button)]",
            f"//*[text()='{button_text}']",
        ]
        for xpath in xpath_selectors:
            elements = self.driver.find_elements(By.XPATH, xpath)
            # Reverse order to pick the CTA button at the bottom of the form instead of card title text at the top
            for el in reversed(elements):
                if el.is_displayed():
                    return el
        raise Exception(f"Button or link with text '{button_text}' not found.")

    # ─── TEST CASES ───────────────────────────────────────────────────────────

    def test_01_register_page_renders_correctly(self):
        """TC-01: Verify registration page renders header, inputs, and CTA button."""
        print("[TC-01] Testing Registration Page Render...")
        
        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertIn("PowerSense", body_text, "App header title 'PowerSense' not found.")
        self.assertIn("Create Account", body_text, "Card title 'Create Account' not found.")

        inputs = self.find_all_inputs()
        self.assertGreaterEqual(len(inputs), 4, f"Expected at least 4 input fields, found {len(inputs)}")
        print(f"  [OK] Registration form rendered with {len(inputs)} input fields.")

    def test_02_empty_registration_validation(self):
        """TC-02: Verify validation warning when submitting empty registration form."""
        print("[TC-02] Testing Empty Registration Submission...")
        
        create_btn = self.find_button_by_text("Create Account")
        create_btn.click()
        time.sleep(1)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "please enter" in body_text.lower() or "full name" in body_text.lower() or "required" in body_text.lower(),
            "Expected validation message missing on empty submission."
        )
        print("  [OK] Validation error displayed for empty registration submission.")

    def test_03_invalid_phone_number_validation(self):
        """TC-03: Verify validation error when providing invalid mobile number."""
        print("[TC-03] Testing Invalid Mobile Number Input...")
        
        inputs = self.find_all_inputs()
        # Input 0: Full Name, Input 1: Phone
        inputs[0].clear()
        inputs[0].send_keys("Test Automation User")

        inputs[1].clear()
        inputs[1].send_keys("12345")  # Less than 10 digits

        create_btn = self.find_button_by_text("Create Account")
        create_btn.click()
        time.sleep(1)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "mobile" in body_text.lower() or "digit" in body_text.lower() or "error" in body_text.lower(),
            "Expected mobile validation error not displayed."
        )
        print("  [OK] Validation warning shown for invalid mobile number.")

    def test_04_password_mismatch_validation(self):
        """TC-04: Verify error when password and confirm password do not match."""
        print("[TC-04] Testing Mismatched Passwords Validation...")
        
        inputs = self.find_all_inputs()
        
        inputs[0].clear()
        inputs[0].send_keys("Test Automation User")  # Name

        inputs[1].clear()
        inputs[1].send_keys("9876543210")  # Mobile

        # Input 2 is email
        inputs[2].clear()
        inputs[2].send_keys("test_mismatch@powersense.com")

        # Input 3 is password, Input 4 is confirm password
        if len(inputs) >= 5:
            inputs[3].clear()
            inputs[3].send_keys("password123")

            inputs[4].clear()
            inputs[4].send_keys("different_pass_456")

        create_btn = self.find_button_by_text("Create Account")
        create_btn.click()
        time.sleep(1)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "mismatch" in body_text.lower() or "do not match" in body_text.lower() or "match" in body_text.lower(),
            "Expected password mismatch error not displayed."
        )
        print("  [OK] Mismatched password validation error verified.")

    def test_05_successful_user_registration(self):
        """TC-05: Verify successful user creation and navigation to dashboard."""
        print("[TC-05] Testing Successful New Account Registration...")
        
        unique_timestamp = int(time.time())
        test_email = f"selenium_user_{unique_timestamp}@powersense.com"
        test_name = f"Selenium Tester {unique_timestamp}"

        inputs = self.find_all_inputs()
        
        # 1. Full Name
        inputs[0].clear()
        inputs[0].send_keys(test_name)

        # 2. Mobile Number
        inputs[1].clear()
        inputs[1].send_keys("9876543210")

        # 3. Email
        inputs[2].clear()
        inputs[2].send_keys(test_email)
        time.sleep(1)  # Allow live email check to finish

        # 4. Password & 5. Confirm Password
        if len(inputs) >= 5:
            inputs[3].clear()
            inputs[3].send_keys("Pass123456")

            inputs[4].clear()
            inputs[4].send_keys("Pass123456")

        create_btn = self.find_button_by_text("Create Account")
        create_btn.click()

        # Wait for account provisioning & redirect
        time.sleep(3)
        current_url = self.driver.current_url
        print(f"  Current URL after registration: {current_url}")

        self.assertTrue(
            "dashboard" in current_url.lower() or "tabs" in current_url.lower() or "home" in current_url.lower(),
            f"User was not redirected to dashboard after registration. Current URL: {current_url}"
        )
        print(f"  [OK] Registration successful for '{test_email}'! Navigated to Dashboard.")

    def test_06_navigate_to_login(self):
        """TC-06: Verify clicking Sign In link navigates back to Login screen."""
        print("[TC-06] Testing Navigation to Sign In Screen...")
        
        login_link = self.find_button_by_text("Sign In")
        login_link.click()
        time.sleep(2)

        current_url = self.driver.current_url
        print(f"  Current URL after clicking Sign In: {current_url}")

        self.assertIn("login", current_url.lower(), "Failed to navigate back to login page.")
        print("  [OK] Navigation to Sign In page verified.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
