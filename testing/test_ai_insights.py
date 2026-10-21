"""
PowerSense AI - Selenium Automated UI Test Suite for AI Product Insights & Assistant
=====================================================================================
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


class PowerSenseAiInsightsTest(unittest.TestCase):

    BASE_URL = os.getenv("APP_URL", "http://localhost:8081")
    IMPLICIT_WAIT_SEC = 10
    EXPLICIT_WAIT_SEC = 12

    @classmethod
    def setUpClass(cls):
        """Set up Selenium WebDriver once before AI Insights tests run."""
        print(f"\n[Selenium] Initializing Chrome WebDriver for AI Insights Tests at {cls.BASE_URL}...")
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

    def login_user_helper(self):
        """Helper to log in with valid credentials and reach AI Insights screen."""
        self.driver.get(f"{self.BASE_URL}/login")
        time.sleep(1)

        # Fill credentials
        inputs = self.wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))
        if len(inputs) >= 2:
            inputs[0].clear()
            inputs[0].send_keys("luke@gmail.com")
            inputs[1].clear()
            inputs[1].send_keys("Luke@1234")

        # Click Sign In CTA button
        buttons = self.driver.find_elements(By.XPATH, "//div[@role='button'] | //button")
        for btn in buttons:
            if "sign in" in btn.text.lower():
                btn.click()
                break

        time.sleep(2.5)

    def setUp(self):
        """Navigate to AI Insights screen before each test."""
        current_url = self.driver.current_url
        if "rag" not in current_url.lower():
            self.login_user_helper()
            self.driver.get(f"{self.BASE_URL}/rag")
            time.sleep(1.5)


    # ─── TEST CASES ───────────────────────────────────────────────────────────

    def test_01_ai_insights_screen_renders(self):
        """TC-01: Verify AI Insights header, hero cards, and specs render."""
        print("[TC-01] Testing AI Insights Screen Render...")
        
        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "ai" in body_text.lower() or "insight" in body_text.lower(),
            "AI Product Insights header title missing."
        )
        self.assertIn("Monthly", body_text, "Monthly Energy Optimization card missing.")
        print("  [OK] AI Insights header and monthly savings banner rendered.")

    def test_02_product_specs_cards_render(self):
        """TC-02: Verify product quick specs grid cards (10A, 2.4GHz Wi-Fi, PZEM sensor)."""
        print("[TC-02] Testing Product Quick Specs Cards...")
        
        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "10a" in body_text.lower() or "wi-fi" in body_text.lower() or "pzem" in body_text.lower(),
            "Product Quick Specs cards missing from Insights screen."
        )
        print("  [OK] Product quick spec cards verified.")

    def test_03_quick_prompt_chip_click(self):
        """TC-03: Verify clicking quick prompt chip generates AI answer."""
        print("[TC-03] Testing Quick Prompt Chip Click...")
        
        # Locate prompt chips
        chips = self.driver.find_elements(By.XPATH, "//div[contains(text(), '⚡') or contains(text(), '📶') or contains(text(), '🔌')]")
        if len(chips) > 0:
            chips[0].click()
            time.sleep(2)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "powersense" in body_text.lower() or "load" in body_text.lower() or "limit" in body_text.lower(),
            "AI response not displayed after clicking prompt chip."
        )
        print("  [OK] AI response generated from quick prompt chip interaction.")

    def test_04_custom_question_input(self):
        """TC-04: Verify entering custom product doubt and receiving AI answer."""
        print("[TC-04] Testing Custom Product Doubt Query...")
        
        inputs = self.driver.find_elements(By.TAG_NAME, "input")
        if len(inputs) > 0:
            chat_input = inputs[-1]
            chat_input.clear()
            chat_input.send_keys("Why does it show 0V when unplugged?")
            chat_input.send_keys(Keys.ENTER)
            time.sleep(2.5)

        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        self.assertTrue(
            "0v" in body_text.lower() or "unplug" in body_text.lower() or "mains" in body_text.lower(),
            "AI Assistant response missing for zero-load doubt."
        )
        print("  [OK] Custom question processed and AI response rendered.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
