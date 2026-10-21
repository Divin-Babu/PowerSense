// Login Page Component for PowerSense

import { store } from '../state/store.js';
import { loginUser, requestPasswordReset } from '../services/api.js';

export function Login() {
  const state = store.getState();
  const isDark = state.theme === 'dark';

  return `
    <main class="relative z-10 flex-grow flex items-center justify-center p-grid-margin min-h-[90vh]">
      <div class="w-full max-w-md relative z-10">
        <!-- Branding Header & Theme Toggle Logo -->
        <div class="flex flex-col items-center mb-xl text-center">
          <div class="mb-md flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-md cursor-pointer hover:scale-105 transition-all" id="theme-toggle-logo">
            <span class="material-symbols-outlined text-[#00C48C] text-[36px] leading-none" style="font-variation-settings: 'FILL' 1;">bolt</span>
          </div>
          <h1 class="font-headline-lg text-2xl font-extrabold text-[#111827] dark:text-slate-100 mb-1 tracking-wide">
            Power <span class="text-[#00C48C]">Sense</span>
          </h1>
          <p class="text-sm font-medium text-[#64748B] dark:text-slate-400">
            Smart Energy, Smarter You
          </p>
        </div>

        <!-- Login Form Card -->
        <div class="bg-white dark:bg-[#141B24] rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-[#222C3A] relative overflow-hidden">
          <div class="mb-6">
            <h2 class="text-xl font-bold text-[#111827] dark:text-slate-100">Welcome Back</h2>
            <p class="text-xs text-[#64748B] dark:text-slate-400 mt-1">Sign in to manage and monitor your smart devices</p>
          </div>

          <form id="login-form" class="space-y-4">
            <div id="login-error-msg" class="hidden p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">error</span>
              <span id="error-text">Invalid credentials. Please try again.</span>
            </div>

            <!-- Email / Username Field -->
            <div class="space-y-1">
              <label class="text-xs font-bold text-[#64748B] dark:text-slate-400 tracking-wider uppercase" for="email">EMAIL / USERNAME</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00C48C] transition-colors">
                  <span class="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <input class="w-full bg-[#F8FAF9] dark:bg-[#0F1620] border border-[#E5E9E7] dark:border-[#243040] text-[#111827] dark:text-slate-100 rounded-xl pl-12 py-3 text-sm focus:ring-2 focus:ring-[#00C48C]/20 focus:border-[#00C48C] transition-all placeholder:text-[#94A3B8]" id="email" value="" placeholder="Enter your email or username" type="text" required />
              </div>
            </div>

            <!-- Password Field -->
            <div class="space-y-1">
              <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-[#64748B] dark:text-slate-400 tracking-wider uppercase" for="password">PASSWORD</label>
                <button type="button" id="open-forgot-pass-btn" class="text-xs font-bold text-[#00C48C] hover:underline focus:outline-none">
                  Forgot Password?
                </button>
              </div>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00C48C] transition-colors">
                  <span class="material-symbols-outlined text-[20px]">lock</span>
                </div>
                <input class="w-full bg-[#F8FAF9] dark:bg-[#0F1620] border border-[#E5E9E7] dark:border-[#243040] text-[#111827] dark:text-slate-100 rounded-xl pl-12 pr-12 py-3 text-sm focus:ring-2 focus:ring-[#00C48C]/20 focus:border-[#00C48C] transition-all placeholder:text-[#94A3B8]" id="password" value="" placeholder="Enter your password" type="password" required />
                <button id="toggle-pass-btn" class="absolute inset-y-0 right-0 pr-4 flex items-center text-[#94A3B8] hover:text-[#111827] dark:hover:text-slate-100 transition-colors" type="button">
                  <span class="material-symbols-outlined text-[20px]" id="toggle-pass-icon">visibility</span>
                </button>
              </div>
            </div>

            <!-- Login Button -->
            <button id="submit-login-btn" class="w-full mt-2 bg-[#00C48C] hover:bg-[#00A86B] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2" type="submit">
              Sign In
              <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>

          <!-- Navigation Link to Register / Create Account -->
          <div class="text-center pt-4 mt-6 border-t border-slate-100 dark:border-slate-800">
            <p class="text-xs text-[#64748B] dark:text-slate-400">
              Don't have an account? 
              <button id="goto-register-btn" class="text-[#00C48C] font-bold hover:underline ml-1">Create Account / Register</button>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p class="mt-6 text-center text-xs text-[#94A3B8]">
          PowerSense • Smart Energy, Smarter You
        </p>
      </div>

      <!-- FORGOT PASSWORD MODAL DIALOG -->
      <div id="forgot-password-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm hidden">
        <div class="bg-white dark:bg-[#141B24] border border-slate-100 dark:border-[#222C3A] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#00C48C]">
                <span class="material-symbols-outlined text-[22px]">key</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-[#111827] dark:text-slate-100">Forgot Password</h3>
                <p class="text-xs text-[#64748B] dark:text-slate-400">Reset your PowerSense account password</p>
              </div>
            </div>
            <button id="close-forgot-modal-btn" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Form Area -->
          <div id="forgot-modal-form-area" class="space-y-4">
            <p class="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              Enter your registered email address. We will verify your account and email you a secure link from <strong class="text-[#00C48C]">powersense2026@gmail.com</strong>.
            </p>

            <div id="forgot-error-msg" class="hidden p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">error</span>
              <span id="forgot-error-text">Please enter a valid email.</span>
            </div>

            <!-- Not Registered Prompt Box -->
            <div id="forgot-not-registered-box" class="hidden p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs mb-1">
                <span class="material-symbols-outlined text-[18px]">person_add</span>
                <span>Account Not Found</span>
              </div>
              <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed mb-3">
                No account was found with this email address. Please register to create an account.
              </p>
              <button id="forgot-register-now-btn" class="w-full bg-[#00C48C] hover:bg-[#00A86B] text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                Register New Account
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            <div class="space-y-1">
              <label class="text-xs font-bold text-[#64748B] dark:text-slate-400 tracking-wider uppercase" for="forgot-email">YOUR REGISTERED EMAIL</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8] group-focus-within:text-[#00C48C] transition-colors">
                  <span class="material-symbols-outlined text-[20px]">mail</span>
                </div>
                <input class="w-full bg-[#F8FAF9] dark:bg-[#0F1620] border border-[#E5E9E7] dark:border-[#243040] text-[#111827] dark:text-slate-100 rounded-xl pl-12 py-3 text-sm focus:ring-2 focus:ring-[#00C48C]/20 focus:border-[#00C48C] transition-all placeholder:text-[#94A3B8]" id="forgot-email" placeholder="e.g. name@domain.com" type="email" required />
              </div>
            </div>

            <button id="submit-forgot-btn" class="w-full bg-[#00C48C] hover:bg-[#00A86B] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2" type="button">
              Send Reset Link
              <span class="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>

          <!-- Success Area -->
          <div id="forgot-modal-success-area" class="hidden text-center py-4 space-y-3">
            <div class="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-[#00C48C]">
              <span class="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h4 class="text-base font-bold text-[#111827] dark:text-slate-100">Check Your Inbox!</h4>
            <p class="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              We sent password reset instructions from <strong class="text-[#00C48C]">powersense2026@gmail.com</strong> to <strong id="forgot-success-target-email" class="text-slate-800 dark:text-slate-200"></strong>.
            </p>
            <p class="text-[11px] text-slate-400">
              Please click the link in your email to choose a new password. (Check spam/junk if not received within 1 minute).
            </p>
            <button id="forgot-success-close-btn" class="w-full mt-2 bg-[#00C48C] hover:bg-[#00A86B] text-white font-bold text-sm py-3 rounded-xl transition-all">
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    </main>
  `;
}

export function bindLoginEvents() {
  const themeToggleLogo = document.getElementById('theme-toggle-logo');
  if (themeToggleLogo) {
    themeToggleLogo.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  const toggleBtn = document.getElementById('toggle-pass-btn');
  const passInput = document.getElementById('password');
  const icon = document.getElementById('toggle-pass-icon');

  if (toggleBtn && passInput && icon) {
    toggleBtn.addEventListener('click', () => {
      const isPass = passInput.getAttribute('type') === 'password';
      passInput.setAttribute('type', isPass ? 'text' : 'password');
      icon.innerText = isPass ? 'visibility_off' : 'visibility';
    });
  }

  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error-msg');
  const errorText = document.getElementById('error-text');
  const submitBtn = document.getElementById('submit-login-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailVal = document.getElementById('email').value.trim();
      const passVal = document.getElementById('password').value;

      if (errorBox) errorBox.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Authenticating...';
      }

      try {
        const result = await loginUser(emailVal, passVal);
        if (result && result.user) {
          store.loginSession(result.user);
        }
      } catch (err) {
        if (errorBox) {
          errorBox.classList.remove('hidden');
          if (errorText) errorText.innerText = err.message || 'Invalid username or password.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `Sign In <span class="material-symbols-outlined text-[20px]">arrow_forward</span>`;
        }
      }
    });
  }

  const gotoReg = document.getElementById('goto-register-btn');
  if (gotoReg) {
    gotoReg.addEventListener('click', () => store.setPage('register'));
  }

  // Forgot Password Modal Bindings
  const forgotModal = document.getElementById('forgot-password-modal');
  const openForgotBtn = document.getElementById('open-forgot-pass-btn');
  const closeForgotBtn = document.getElementById('close-forgot-modal-btn');
  const forgotEmailInput = document.getElementById('forgot-email');
  const submitForgotBtn = document.getElementById('submit-forgot-btn');
  const forgotErrorBox = document.getElementById('forgot-error-msg');
  const forgotErrorText = document.getElementById('forgot-error-text');
  const notRegisteredBox = document.getElementById('forgot-not-registered-box');
  const forgotRegisterBtn = document.getElementById('forgot-register-now-btn');
  const forgotFormArea = document.getElementById('forgot-modal-form-area');
  const forgotSuccessArea = document.getElementById('forgot-modal-success-area');
  const successTargetEmail = document.getElementById('forgot-success-target-email');
  const successCloseBtn = document.getElementById('forgot-success-close-btn');

  const openForgot = () => {
    if (forgotModal) {
      forgotModal.classList.remove('hidden');
      if (forgotEmailInput) {
        const currentEmail = document.getElementById('email')?.value?.trim() || '';
        forgotEmailInput.value = currentEmail;
      }
      if (forgotErrorBox) forgotErrorBox.classList.add('hidden');
      if (notRegisteredBox) notRegisteredBox.classList.add('hidden');
      if (forgotFormArea) forgotFormArea.classList.remove('hidden');
      if (forgotSuccessArea) forgotSuccessArea.classList.add('hidden');
    }
  };

  const closeForgot = () => {
    if (forgotModal) forgotModal.classList.add('hidden');
  };

  if (openForgotBtn) openForgotBtn.addEventListener('click', openForgot);
  if (closeForgotBtn) closeForgotBtn.addEventListener('click', closeForgot);
  if (successCloseBtn) successCloseBtn.addEventListener('click', closeForgot);

  if (forgotRegisterBtn) {
    forgotRegisterBtn.addEventListener('click', () => {
      closeForgot();
      store.setPage('register');
    });
  }

  if (submitForgotBtn && forgotEmailInput) {
    submitForgotBtn.addEventListener('click', async () => {
      const emailVal = forgotEmailInput.value.trim().toLowerCase();
      if (!emailVal || !emailVal.includes('@') || !emailVal.includes('.')) {
        if (forgotErrorBox && forgotErrorText) {
          forgotErrorText.innerText = 'Please enter a valid email address.';
          forgotErrorBox.classList.remove('hidden');
        }
        return;
      }

      if (forgotErrorBox) forgotErrorBox.classList.add('hidden');
      if (notRegisteredBox) notRegisteredBox.classList.add('hidden');

      submitForgotBtn.disabled = true;
      submitForgotBtn.innerHTML = `Verifying & Sending...`;

      try {
        const res = await requestPasswordReset(emailVal);
        if (res && res.is_registered === false) {
          if (notRegisteredBox) notRegisteredBox.classList.remove('hidden');
        } else if (res && (res.success || res.is_registered)) {
          if (forgotFormArea) forgotFormArea.classList.add('hidden');
          if (forgotSuccessArea) forgotSuccessArea.classList.remove('hidden');
          if (successTargetEmail) successTargetEmail.innerText = emailVal;
        } else {
          if (notRegisteredBox) notRegisteredBox.classList.remove('hidden');
        }
      } catch (err) {
        const msg = err?.message || '';
        if (
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('not registered') ||
          msg.toLowerCase().includes('no account')
        ) {
          if (notRegisteredBox) notRegisteredBox.classList.remove('hidden');
        } else {
          if (forgotErrorBox && forgotErrorText) {
            forgotErrorText.innerText = msg || 'Failed to send reset link. Please try again.';
            forgotErrorBox.classList.remove('hidden');
          }
        }
      } finally {
        submitForgotBtn.disabled = false;
        submitForgotBtn.innerHTML = `Send Reset Link <span class="material-symbols-outlined text-[18px]">send</span>`;
      }
    });
  }
}
