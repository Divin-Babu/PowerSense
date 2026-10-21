"""
PowerSense AI - Selenium Automated UI Test Suite for Login Functionality
========================================================================
Author: PowerSense Test Automation Team
Framework: Selenium WebDriver + pytest / unittest

Prerequisites:
  1. Install Python packages: pip install selenium
  2. Ensure Expo Web / Metro server is running on http://localhost:8081
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


class PowerSenseLoginTest(unittest.TestCase):

    BASE_URL = os.getenv("APP_URL", "http://localhost:8081")
    IMPLICIT_WAIT_SEC = 10
    EXPLICIT_WAIT_SEC = 12

    @classmethod
    def setUpClass(cls):
        """Set up Selenium WebDriver once before all tests run."""
        print(f"\n[Selenium] Initializing Chrome WebDriver for {cls.BASE_URL}...")
        options = webdriver.ChromeOptions()
        
        # Optional: enable headless mode by setting HEADLESS=1
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
        """Navigate to login page in a fresh logged-out state before each test."""
        try:
            self.driver.get(f"{self.BASE_URL}/login")
            self.driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
        except Exception:
            pass
        self.driver.get(f"{self.BASE_URL}/login")
        time.sleep(1)

    def find_input_by_placeholder(self, placeholder_text):
        """Helper to find input field by placeholder attribute or input type."""
        try:
            return self.wait.until(
                EC.presence_of_element_located((By.XPATH, f"//input[@placeholder='{placeholder_text}']"))
            )
        except Exception:
            # Fallback for React Native Web inputs
            inputs = self.driver.find_elements(By.TAG_NAME, "input")
            for inp in inputs:
                ph = inp.get_attribute("placeholder") or ""
                if placeholder_text.lower() in ph.lower():
                    return inp
            raise Exception(f"Input field with placeholder '{placeholder_text}' not found.")

    def find_button_by_text(self, button_text):
        """Helper to find clickable CTA button or link containing text."""
        clean_text = button_text.lower().replace("?", "").strip()
        xpath_selectors = [
            f"//div[@role='button' and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?', 'abcdefghijklmnopqrstuvwxyz'), '{clean_text}')]",
            f"//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?', 'abcdefghijklmnopqrstuvwxyz'), '{clean_text}')]",
            f"//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?', 'abcdefghijklmnopqrstuvwxyz'), '{clean_text}')]",
            f"//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?', 'abcdefghijklmnopqrstuvwxyz'), '{clean_text}') and (ancestor::div[@role='button'] or ancestor::button or ancestor::a)]",
            f"//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?', 'abcdefghijklmnopqrstuvwxyz'), '{clean_text}')]",
        ]
        for xpath in xpath_selectors:
            elements = self.driver.find_elements(By.XPATH, xpath)
            for el in elements:
                if el.is_displayed():
                    return el
        raise Exception(f"Button or link with text '{button_text}' not found.")


    # ─── TEST CASE ────────────────────────────────────────────────────────────

    def test_successful_user_login(self):
        """TC-01: Verify entering email and password redirects user to the dashboard."""
        print("[TC-01] Testing Login & Redirection to Dashboard...")
        
        email_field = self.find_input_by_placeholder("email")
        password_field = self.find_input_by_placeholder("password")

        email_field.clear()
        email_field.send_keys("luke@gmail.com")
        
        password_field.clear()
        password_field.send_keys("Luke@1234")

        sign_in_btn = self.find_button_by_text("Sign In")
        sign_in_btn.click()

        # Wait for dashboard navigation
        time.sleep(3)
        current_url = self.driver.current_url
        print(f"  Current URL after login: {current_url}")

        self.assertTrue(
            "dashboard" in current_url.lower() or "tabs" in current_url.lower() or "home" in current_url.lower(),
            f"User was not redirected to dashboard. Current URL: {current_url}"
        )
        print("  [OK] Login successful! User navigated to Dashboard.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
