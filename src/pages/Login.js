// Login Page Component for PowerSense

import { store } from '../state/store.js';
import { loginUser } from '../services/api.js';

export function Login() {
  const state = store.getState();
  const isDark = state.theme === 'dark';

  return `
    <main class="relative z-10 flex-grow flex items-center justify-center p-grid-margin min-h-[90vh]">
      <div class="w-full max-w-md relative z-10">
        <!-- Branding Header & Theme Toggle Logo -->
        <div class="flex flex-col items-center mb-xl text-center">
          <div class="mb-md flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-md cursor-pointer hover:scale-105 transition-all relative group" id="theme-toggle-logo" title="Click to toggle Dark / White Mode">
            <span class="material-symbols-outlined text-[#00C48C] text-[36px] leading-none" style="font-variation-settings: 'FILL' 1;">bolt</span>
            <span class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] text-amber-500 dark:text-sky-400 shadow-sm">
              <span class="material-symbols-outlined text-[13px]">${isDark ? 'dark_mode' : 'light_mode'}</span>
            </span>
          </div>
          <h1 class="font-headline-lg text-2xl font-extrabold text-[#111827] dark:text-slate-100 mb-1 tracking-wide">
            Power <span class="text-[#00C48C]">Sense</span>
          </h1>
          <p class="text-sm font-medium text-[#64748B] dark:text-slate-400">
            Smart Energy, Smarter You
          </p>
          <button id="theme-hint-btn" class="mt-1 text-[11px] font-medium text-[#94A3B8] hover:text-[#00C48C] transition-colors">
            Tap ⚡ for ${isDark ? 'White Mode ☀️' : 'Dark Mode 🌙'}
          </button>
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

  const themeHintBtn = document.getElementById('theme-hint-btn');
  if (themeHintBtn) {
    themeHintBtn.addEventListener('click', () => {
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
}
