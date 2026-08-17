// Registration Page Component for PowerSense AI (Single Smart Plug Focus)

import { store } from '../state/store.js';
import { registerUser, checkEmailAvailability, validateIndianPhone, validateEmailFormat } from '../services/api.js';

export function Register() {
  return `
    <main class="relative z-10 min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden">
      <!-- Left Column: Visual/Marketing Brand Anchor -->
      <section class="hidden lg:flex w-5/12 p-xl flex-col justify-between bg-obsidian-light border-r border-outline-variant relative overflow-hidden">
        <div class="scan-glow-line"></div>
        
        <div class="space-y-md relative z-10">
          <div class="flex items-center gap-sm">
            <div id="theme-toggle-logo-reg" class="w-12 h-12 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald shadow-lg shadow-cyber-emerald/20 cursor-pointer hover:scale-105 transition-all" title="Click to toggle Dark/White Mode">
              <span class="material-symbols-outlined text-[28px]">bolt</span>
            </div>
            <div>
              <h1 class="font-bold text-xl text-on-surface tracking-tight">
                PowerSense <span class="text-cyber-emerald">AI</span>
              </h1>
              <p class="font-mono text-xs text-on-surface-variant">IoT Smart Plug Command Center</p>
            </div>
          </div>

          <div class="max-w-md space-y-md pt-lg">
            <h2 class="text-3xl font-extrabold text-on-surface leading-tight tracking-tight">
              Intelligent Appliance Energy Monitoring & Predictive AI
            </h2>
            <p class="font-sans text-sm text-on-surface-variant leading-relaxed">
              Register your profile to start receiving 1Hz live PZEM-004T telemetry, ML anomaly detection, and RAG-assisted predictive maintenance insights.
            </p>
          </div>
        </div>

        <!-- Technical Telemetry Spec Card -->
        <div class="cyber-glass rounded-2xl p-lg space-y-md relative z-10 border border-white/10 my-md">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-xs">
              <span class="w-2 h-2 rounded-full bg-cyber-emerald animate-ping"></span>
              <span class="font-mono text-xs text-cyber-emerald font-bold uppercase tracking-wider">HARDWARE SPECIFICATION</span>
            </div>
            <span class="font-mono text-[10px] text-on-surface-variant">1.0 Hz SAMPLING</span>
          </div>

          <div class="grid grid-cols-2 gap-sm font-mono text-xs">
            <div class="p-sm rounded-xl bg-space-void/80 border border-white/5">
              <span class="text-on-surface-variant block text-[10px]">MCU MODULE</span>
              <span class="text-cyber-cyan font-bold">ESP32 (240MHz Wi-Fi)</span>
            </div>
            <div class="p-sm rounded-xl bg-space-void/80 border border-white/5">
              <span class="text-on-surface-variant block text-[10px]">SENSOR TRANSDUCER</span>
              <span class="text-cyber-emerald font-bold">PZEM-004T v3 TTL</span>
            </div>
          </div>
        </div>

        <!-- Footer Protocol Badge -->
        <div class="relative z-10 flex items-center gap-xs font-mono text-xs text-on-surface-variant">
          <span class="material-symbols-outlined text-cyber-emerald text-[18px]">verified_user</span>
          <span>FastAPI + PostgreSQL Encrypted Pipeline</span>
        </div>
      </section>

      <!-- Right Column: Registration Form Card -->
      <section class="flex-1 flex flex-col justify-center items-center p-grid-margin relative py-xl">
        <!-- Mobile Header -->
        <div class="lg:hidden flex flex-col items-center mb-lg text-center">
          <div id="theme-toggle-logo-reg-mob" class="w-12 h-12 rounded-xl bg-cyber-emerald/10 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald mb-xs cursor-pointer hover:scale-105 transition-all" title="Click to toggle Dark/White Mode">
            <span class="material-symbols-outlined text-[28px]">bolt</span>
          </div>
          <h1 class="font-bold text-2xl text-on-surface">
            PowerSense <span class="text-cyber-emerald">AI</span>
          </h1>
          <p class="font-mono text-xs text-on-surface-variant mt-1">Smart Plug Account Registration</p>
        </div>

        <div class="w-full max-w-[480px] relative z-10">
          <div class="glass-card rounded-2xl p-xl shadow-2xl relative overflow-hidden border border-outline-variant space-y-lg">
            <div class="space-y-xs">
              <h2 class="text-2xl font-extrabold text-on-surface">Create Account</h2>
              <p class="font-sans text-xs text-on-surface-variant">Register your profile to access smart plug telemetry & AI insights</p>
            </div>

            <div id="reg-error-msg" class="hidden p-sm bg-cyber-crimson/15 border border-cyber-crimson/40 rounded-lg text-cyber-crimson text-xs font-semibold flex items-center gap-xs">
              <span class="material-symbols-outlined text-[16px]">error</span>
              <span id="reg-error-text">Registration failed. Please check inputs.</span>
            </div>

            <!-- Form -->
            <form id="register-form" class="space-y-md" novalidate>
              <!-- Full Name -->
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-name">FULL NAME</label>
                <div class="relative group ai-border-glow">
                  <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline group-focus-within:text-cyber-emerald transition-colors">
                    <span class="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <input id="reg-name" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-[48px] pr-[40px] py-md font-sans text-sm focus:ring-0 focus:border-cyber-emerald transition-all placeholder:text-outline/50" placeholder="e.g. Rahul Sharma" type="text" required />
                  <span id="name-status-icon" class="absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none"></span>
                </div>
                <p id="name-feedback" class="font-sans text-[11px] text-on-surface-variant/70 transition-all"></p>
              </div>

              <!-- Mobile Number -->
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-phone">MOBILE NUMBER</label>
                <div class="relative group ai-border-glow">
                  <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline group-focus-within:text-cyber-emerald transition-colors">
                    <span class="material-symbols-outlined text-[20px]">call</span>
                  </div>
                  <input id="reg-phone" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-[48px] pr-[40px] py-md font-mono text-sm focus:ring-0 focus:border-cyber-emerald transition-all placeholder:text-outline/50" placeholder="9876543210" type="tel" maxlength="15" required />
                  <span id="phone-status-icon" class="absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none"></span>
                </div>
                <p id="phone-feedback" class="font-sans text-[11px] text-on-surface-variant/70 transition-all">Enter 10-digit mobile number starting with 6, 7, 8, or 9</p>
              </div>

              <!-- Email -->
              <div class="space-y-xs">
                <div class="flex justify-between items-center">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-email">EMAIL ADDRESS</label>
                  <span id="email-live-badge" class="font-mono text-[10px] text-on-surface-variant">Live check</span>
                </div>
                <div class="relative group ai-border-glow">
                  <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline group-focus-within:text-cyber-emerald transition-colors">
                    <span class="material-symbols-outlined text-[20px]">alternate_email</span>
                  </div>
                  <input id="reg-email" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-[48px] pr-[40px] py-md font-mono text-sm focus:ring-0 focus:border-cyber-emerald transition-all placeholder:text-outline/50" placeholder="rahul@example.com" type="email" required />
                  <span id="email-status-icon" class="absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none"></span>
                </div>
                <p id="email-feedback" class="font-sans text-[11px] text-on-surface-variant/70 transition-all">Must be a unique valid email address</p>
              </div>

              <!-- Password Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-pass">PASSWORD</label>
                  <div class="relative group ai-border-glow">
                    <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline group-focus-within:text-cyber-emerald transition-colors">
                      <span class="material-symbols-outlined text-[20px]">lock</span>
                    </div>
                    <input id="reg-pass" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-[48px] pr-[36px] py-md font-mono text-sm focus:ring-0 focus:border-cyber-emerald transition-all placeholder:text-outline/50" placeholder="••••••••" type="password" required />
                    <button type="button" id="reg-toggle-pass" class="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface">
                      <span class="material-symbols-outlined text-[18px]" id="reg-toggle-icon">visibility</span>
                    </button>
                  </div>
                  <p id="pass-feedback" class="font-sans text-[11px] text-on-surface-variant/70">Min. 6 characters</p>
                </div>
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-pass-confirm">CONFIRM PASSWORD</label>
                  <div class="relative group ai-border-glow">
                    <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-outline group-focus-within:text-cyber-emerald transition-colors">
                      <span class="material-symbols-outlined text-[20px]">verified</span>
                    </div>
                    <input id="reg-pass-confirm" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-[48px] pr-[40px] py-md font-mono text-sm focus:ring-0 focus:border-cyber-emerald transition-all placeholder:text-outline/50" placeholder="••••••••" type="password" required />
                    <span id="confirm-status-icon" class="absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none"></span>
                  </div>
                  <p id="confirm-feedback" class="font-sans text-[11px] text-on-surface-variant/70">Must match password</p>
                </div>
              </div>

              <!-- Terms Agreement -->
              <label class="flex items-center gap-sm cursor-pointer select-none pt-xs">
                <input id="reg-terms" class="w-4 h-4 rounded border-outline bg-obsidian text-cyber-emerald focus:ring-0" type="checkbox" required checked />
                <span class="font-sans text-xs text-on-surface-variant">
                  I agree to the <a class="text-cyber-cyan hover:underline" href="#" onclick="return false;">Terms of Service</a> and <a class="text-cyber-cyan hover:underline" href="#" onclick="return false;">Privacy Policy</a>.
                </span>
              </label>

              <!-- CTA Button -->
              <button id="reg-submit-btn" class="w-full bg-gradient-to-r from-cyber-emerald to-emerald-400 text-space-void font-bold text-sm py-md rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-cyber-emerald/20 flex items-center justify-center gap-sm mt-md" type="submit">
                Create Account & Access Dashboard
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            <!-- Footer Link -->
            <div class="text-center pt-md border-t border-outline-variant">
              <p class="font-sans text-xs text-on-surface-variant">
                Already registered with PowerSense AI? 
                <button id="goto-login-btn" class="text-cyber-emerald font-bold hover:underline ml-xs">Sign In</button>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Success Feedback Overlay -->
    <div class="fixed inset-0 z-50 bg-space-void/80 backdrop-blur-xl flex items-center justify-center hidden opacity-0 transition-opacity duration-500" id="success-overlay">
      <div class="cyber-glass p-xl rounded-2xl max-w-sm w-full text-center space-y-lg shadow-2xl border border-cyber-emerald/40">
        <div class="flex justify-center">
          <div class="w-16 h-16 rounded-full bg-cyber-emerald/20 border border-cyber-emerald flex items-center justify-center text-cyber-emerald">
            <span class="material-symbols-outlined text-4xl">verified_user</span>
          </div>
        </div>
        <div class="space-y-xs">
          <h3 class="font-bold text-on-surface text-lg">Account Provisioned</h3>
          <p class="font-mono text-xs text-on-surface-variant">Saving credentials to PostgreSQL tbl_user...</p>
        </div>
      </div>
    </div>
  `;
}

export function bindRegisterEvents() {
  const form = document.getElementById('register-form');
  const overlay = document.getElementById('success-overlay');
  const errorBox = document.getElementById('reg-error-msg');
  const errorText = document.getElementById('reg-error-text');
  const submitBtn = document.getElementById('reg-submit-btn');

  // Input elements
  const nameInput = document.getElementById('reg-name');
  const phoneInput = document.getElementById('reg-phone');
  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-pass');
  const confirmInput = document.getElementById('reg-pass-confirm');
  const termsCheckbox = document.getElementById('reg-terms');

  // Feedback elements
  const nameFeedback = document.getElementById('name-feedback');
  const nameIcon = document.getElementById('name-status-icon');
  const phoneFeedback = document.getElementById('phone-feedback');
  const phoneIcon = document.getElementById('phone-status-icon');
  const emailFeedback = document.getElementById('email-feedback');
  const emailIcon = document.getElementById('email-status-icon');
  const emailBadge = document.getElementById('email-live-badge');
  const passFeedback = document.getElementById('pass-feedback');
  const confirmFeedback = document.getElementById('confirm-feedback');
  const confirmIcon = document.getElementById('confirm-status-icon');

  // Password toggle
  const togglePassBtn = document.getElementById('reg-toggle-pass');
  const togglePassIcon = document.getElementById('reg-toggle-icon');
  if (togglePassBtn && passInput && togglePassIcon) {
    togglePassBtn.addEventListener('click', () => {
      const isPass = passInput.getAttribute('type') === 'password';
      passInput.setAttribute('type', isPass ? 'text' : 'password');
      togglePassIcon.innerText = isPass ? 'visibility_off' : 'visibility';
    });
  }

  // Field validation states
  let isNameValid = false;
  let isPhoneValid = false;
  let isEmailValid = false;
  let isPassValid = false;
  let isConfirmValid = false;
  let emailDebounceTimer = null;

  // 1. Live Name Validation
  function validateNameLive() {
    const val = (nameInput?.value || '').trim();
    if (!val) {
      isNameValid = false;
      if (nameFeedback) { nameFeedback.innerText = 'Please enter your full name.'; nameFeedback.className = 'font-sans text-[11px] text-on-surface-variant/70'; }
      if (nameIcon) { nameIcon.innerText = ''; nameIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none'; }
      if (nameInput) nameInput.classList.remove('border-cyber-emerald', 'border-cyber-crimson');
      return false;
    }
    if (val.length < 2) {
      isNameValid = false;
      if (nameFeedback) { nameFeedback.innerText = '✕ Full name must be at least 2 characters.'; nameFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
      if (nameIcon) { nameIcon.innerText = 'cancel'; nameIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-crimson text-[18px] material-symbols-outlined pointer-events-none'; }
      if (nameInput) { nameInput.classList.add('border-cyber-crimson'); nameInput.classList.remove('border-cyber-emerald'); }
      return false;
    }
    isNameValid = true;
    if (nameFeedback) { nameFeedback.innerText = '✓ Name looks great'; nameFeedback.className = 'font-sans text-[11px] text-cyber-emerald font-medium'; }
    if (nameIcon) { nameIcon.innerText = 'check_circle'; nameIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-emerald text-[18px] material-symbols-outlined pointer-events-none'; }
    if (nameInput) { nameInput.classList.add('border-cyber-emerald'); nameInput.classList.remove('border-cyber-crimson'); }
    return true;
  }

  // 2. Live Mobile Phone Validation
  function validatePhoneLive() {
    if (phoneInput) {
      // Strip any non-numeric letters/symbols immediately
      phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '').slice(0, 10);
    }
    const rawVal = phoneInput?.value || '';
    if (!rawVal) {
      isPhoneValid = false;
      if (phoneFeedback) { phoneFeedback.innerText = 'Enter 10-digit mobile number starting with 6, 7, 8, or 9'; phoneFeedback.className = 'font-sans text-[11px] text-on-surface-variant/70'; }
      if (phoneIcon) { phoneIcon.innerText = ''; phoneIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none'; }
      if (phoneInput) phoneInput.classList.remove('border-cyber-emerald', 'border-cyber-crimson');
      return false;
    }

    const result = validateIndianPhone(rawVal);
    if (!result.isValid) {
      isPhoneValid = false;
      if (phoneFeedback) { phoneFeedback.innerText = `✕ ${result.message}`; phoneFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
      if (phoneIcon) { phoneIcon.innerText = 'cancel'; phoneIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-crimson text-[18px] material-symbols-outlined pointer-events-none'; }
      if (phoneInput) { phoneInput.classList.add('border-cyber-crimson'); phoneInput.classList.remove('border-cyber-emerald'); }
      return false;
    }

    isPhoneValid = true;
    if (phoneFeedback) { phoneFeedback.innerText = `✓ ${result.message}`; phoneFeedback.className = 'font-sans text-[11px] text-cyber-emerald font-medium'; }
    if (phoneIcon) { phoneIcon.innerText = 'check_circle'; phoneIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-emerald text-[18px] material-symbols-outlined pointer-events-none'; }
    if (phoneInput) { phoneInput.classList.add('border-cyber-emerald'); phoneInput.classList.remove('border-cyber-crimson'); }
    return true;
  }

  // 3. Live Email Format & Uniqueness Validation
  function validateEmailLive() {
    const rawVal = (emailInput?.value || '').trim();
    if (!rawVal) {
      isEmailValid = false;
      if (emailFeedback) { emailFeedback.innerText = 'Must be a unique valid email address.'; emailFeedback.className = 'font-sans text-[11px] text-on-surface-variant/70'; }
      if (emailIcon) { emailIcon.innerText = ''; emailIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none'; }
      if (emailBadge) { emailBadge.innerText = 'Live check'; emailBadge.className = 'font-mono text-[10px] text-on-surface-variant'; }
      if (emailInput) emailInput.classList.remove('border-cyber-emerald', 'border-cyber-crimson');
      return;
    }

    const formatCheck = validateEmailFormat(rawVal);
    if (!formatCheck.isValid) {
      isEmailValid = false;
      if (emailFeedback) { emailFeedback.innerText = `✕ ${formatCheck.message}`; emailFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
      if (emailIcon) { emailIcon.innerText = 'cancel'; emailIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-crimson text-[18px] material-symbols-outlined pointer-events-none'; }
      if (emailBadge) { emailBadge.innerText = 'Invalid format'; emailBadge.className = 'font-mono text-[10px] text-cyber-crimson'; }
      if (emailInput) { emailInput.classList.add('border-cyber-crimson'); emailInput.classList.remove('border-cyber-emerald'); }
      return;
    }

    // Debounced Backend Uniqueness Check
    if (emailBadge) { emailBadge.innerText = 'Checking...'; emailBadge.className = 'font-mono text-[10px] text-cyber-cyan animate-pulse'; }
    if (emailFeedback) { emailFeedback.innerText = '⏳ Verifying email availability...'; emailFeedback.className = 'font-sans text-[11px] text-cyber-cyan'; }

    clearTimeout(emailDebounceTimer);
    emailDebounceTimer = setTimeout(async () => {
      try {
        const check = await checkEmailAvailability(rawVal);
        if (!check.available) {
          isEmailValid = false;
          if (emailFeedback) { emailFeedback.innerText = `✕ ${check.message}`; emailFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
          if (emailIcon) { emailIcon.innerText = 'cancel'; emailIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-crimson text-[18px] material-symbols-outlined pointer-events-none'; }
          if (emailBadge) { emailBadge.innerText = 'Already Registered'; emailBadge.className = 'font-mono text-[10px] text-cyber-crimson font-bold'; }
          if (emailInput) { emailInput.classList.add('border-cyber-crimson'); emailInput.classList.remove('border-cyber-emerald'); }
        } else {
          isEmailValid = true;
          if (emailFeedback) { emailFeedback.innerText = '✓ Email is unique & available!'; emailFeedback.className = 'font-sans text-[11px] text-cyber-emerald font-medium'; }
          if (emailIcon) { emailIcon.innerText = 'check_circle'; emailIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-emerald text-[18px] material-symbols-outlined pointer-events-none'; }
          if (emailBadge) { emailBadge.innerText = 'Available ✓'; emailBadge.className = 'font-mono text-[10px] text-cyber-emerald font-bold'; }
          if (emailInput) { emailInput.classList.add('border-cyber-emerald'); emailInput.classList.remove('border-cyber-crimson'); }
        }
      } catch (err) {
        // Fallback for client
        isEmailValid = true;
        if (emailFeedback) { emailFeedback.innerText = '✓ Email format valid'; emailFeedback.className = 'font-sans text-[11px] text-cyber-emerald font-medium'; }
        if (emailIcon) { emailIcon.innerText = 'check_circle'; emailIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-emerald text-[18px] material-symbols-outlined pointer-events-none'; }
      }
    }, 350);
  }

  // 4. Live Password Validation
  function validatePassLive() {
    const val = passInput?.value || '';
    if (!val) {
      isPassValid = false;
      if (passFeedback) { passFeedback.innerText = 'Min. 6 characters'; passFeedback.className = 'font-sans text-[11px] text-on-surface-variant/70'; }
      if (passInput) passInput.classList.remove('border-cyber-emerald', 'border-cyber-crimson');
      validateConfirmLive();
      return false;
    }
    if (val.length < 6) {
      isPassValid = false;
      if (passFeedback) { passFeedback.innerText = `✕ Weak: at least 6 characters (${val.length}/6)`; passFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
      if (passInput) { passInput.classList.add('border-cyber-crimson'); passInput.classList.remove('border-cyber-emerald'); }
      validateConfirmLive();
      return false;
    }
    isPassValid = true;
    const isStrong = val.length >= 8 && /[A-Z0-9]/i.test(val);
    if (passFeedback) {
      passFeedback.innerText = isStrong ? '✓ Strong Password' : '✓ Password valid (Good)';
      passFeedback.className = isStrong ? 'font-sans text-[11px] text-cyber-emerald font-bold' : 'font-sans text-[11px] text-cyber-cyan font-medium';
    }
    if (passInput) { passInput.classList.add('border-cyber-emerald'); passInput.classList.remove('border-cyber-crimson'); }
    validateConfirmLive();
    return true;
  }

  // 5. Live Confirm Password Validation
  function validateConfirmLive() {
    const pass = passInput?.value || '';
    const confirm = confirmInput?.value || '';
    if (!confirm) {
      isConfirmValid = false;
      if (confirmFeedback) { confirmFeedback.innerText = 'Must match password'; confirmFeedback.className = 'font-sans text-[11px] text-on-surface-variant/70'; }
      if (confirmIcon) { confirmIcon.innerText = ''; confirmIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-outline text-[18px] material-symbols-outlined pointer-events-none'; }
      if (confirmInput) confirmInput.classList.remove('border-cyber-emerald', 'border-cyber-crimson');
      return false;
    }
    if (pass !== confirm) {
      isConfirmValid = false;
      if (confirmFeedback) { confirmFeedback.innerText = '✕ Passwords do not match'; confirmFeedback.className = 'font-sans text-[11px] text-cyber-crimson font-medium'; }
      if (confirmIcon) { confirmIcon.innerText = 'cancel'; confirmIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-crimson text-[18px] material-symbols-outlined pointer-events-none'; }
      if (confirmInput) { confirmInput.classList.add('border-cyber-crimson'); confirmInput.classList.remove('border-cyber-emerald'); }
      return false;
    }
    isConfirmValid = true;
    if (confirmFeedback) { confirmFeedback.innerText = '✓ Passwords match'; confirmFeedback.className = 'font-sans text-[11px] text-cyber-emerald font-medium'; }
    if (confirmIcon) { confirmIcon.innerText = 'check_circle'; confirmIcon.className = 'absolute inset-y-0 right-0 pr-md flex items-center text-cyber-emerald text-[18px] material-symbols-outlined pointer-events-none'; }
    if (confirmInput) { confirmInput.classList.add('border-cyber-emerald'); confirmInput.classList.remove('border-cyber-crimson'); }
    return true;
  }

  // Attach live event listeners
  if (nameInput) nameInput.addEventListener('input', validateNameLive);
  if (phoneInput) phoneInput.addEventListener('input', validatePhoneLive);
  if (emailInput) emailInput.addEventListener('input', validateEmailLive);
  if (passInput) passInput.addEventListener('input', validatePassLive);
  if (confirmInput) confirmInput.addEventListener('input', validateConfirmLive);

  // Form submission with final strict validation
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorBox) errorBox.classList.add('hidden');

      const showError = (msg) => {
        if (errorBox && errorText) {
          errorText.innerText = msg;
          errorBox.classList.remove('hidden');
          errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      };

      const name = (nameInput?.value || '').trim();
      const phone = (phoneInput?.value || '').trim();
      const email = (emailInput?.value || '').trim();
      const pass = passInput?.value || '';
      const passConfirm = confirmInput?.value || '';
      const termsChecked = termsCheckbox?.checked;

      // 1. Validate Name
      if (!name || name.length < 2) {
        showError('Please enter your full name (at least 2 characters).');
        nameInput?.focus();
        return;
      }

      // 2. Validate Indian Phone
      const phoneRes = validateIndianPhone(phone);
      if (!phoneRes.isValid) {
        showError(`Phone Error: ${phoneRes.message}`);
        phoneInput?.focus();
        return;
      }

      // 3. Validate Email
      const emailRes = validateEmailFormat(email);
      if (!emailRes.isValid) {
        showError(`Email Error: ${emailRes.message}`);
        emailInput?.focus();
        return;
      }

      // 4. Validate Password
      if (!pass || pass.length < 6) {
        showError('Password must be at least 6 characters long.');
        passInput?.focus();
        return;
      }

      if (pass !== passConfirm) {
        showError('Passwords do not match.');
        confirmInput?.focus();
        return;
      }

      if (!termsChecked) {
        showError('You must agree to the Terms of Service & Privacy Policy.');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Provisioning Account...';
      }

      try {
        const result = await registerUser(name, email, pass, phoneRes.formatted);
        if (overlay) {
          overlay.classList.remove('hidden');
          setTimeout(() => overlay.classList.add('opacity-100'), 10);
        }

        setTimeout(() => {
          store.loginSession({
            name: result.user?.name || name,
            email: result.user?.email || email,
            phone: result.user?.phone || phoneRes.formatted,
            role: result.user?.role || 'user'
          });
        }, 1000);

      } catch (err) {
        showError(err.message || 'Registration failed. Please verify your details.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Create Account & Access Dashboard <span class="material-symbols-outlined text-[20px]">arrow_forward</span>`;
        }
      }
    });
  }

  const gotoLogin = document.getElementById('goto-login-btn');
  if (gotoLogin) {
    gotoLogin.addEventListener('click', () => store.setPage('login'));
  }

  const logoDesktop = document.getElementById('theme-toggle-logo-reg');
  if (logoDesktop) {
    logoDesktop.addEventListener('click', () => store.toggleTheme());
  }

  const logoMobile = document.getElementById('theme-toggle-logo-reg-mob');
  if (logoMobile) {
    logoMobile.addEventListener('click', () => store.toggleTheme());
  }
}


