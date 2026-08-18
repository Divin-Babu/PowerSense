// Profile & Hardware Configuration Page Component

import { store } from '../state/store.js';
import { updateUserProfileApi } from '../services/api.js';

export function Profile() {
  const state = store.getState();
  const isDark = state.theme === 'dark';
  const user = state.user || {};
  const displayName = user.full_name || user.name || 'User';

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
      <!-- Profile Header Card -->
      <section class="glass-card rounded-xl p-xl border border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
        <div class="flex items-center gap-md">
          <div class="w-16 h-16 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary text-[32px] font-bold">
            ${(displayName || 'U').charAt(0)}
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h2 class="font-headline-lg text-headline-lg text-on-surface" id="profile-display-name">${displayName}</h2>
              <button id="btn-open-edit-profile" class="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">edit</span>
                <span>Edit</span>
              </button>
            </div>
            <p class="font-body-md text-on-surface-variant">${user.email || 'user@powersense.ai'} ${user.phone ? `• <span class="font-mono text-cyber-cyan" id="profile-display-phone">${user.phone}</span>` : ''} • <span class="text-secondary font-data-md">${user.role || 'Operator'}</span></p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button id="btn-open-edit-profile-action" class="px-md py-sm bg-surface-container-high hover:bg-surface-variant text-on-surface border border-outline-variant rounded-xl font-label-sm font-bold transition-all flex items-center gap-xs">
            <span class="material-symbols-outlined text-[18px] text-primary">manage_accounts</span>
            <span>Edit Profile & Password</span>
          </button>
          <button id="btn-logout" class="px-lg py-sm bg-error-container/40 text-on-error-container border border-error/30 rounded-xl font-label-sm font-bold hover:bg-error-container/60 transition-all flex items-center gap-xs">
            <span class="material-symbols-outlined text-[18px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      <!-- Theme Mode Toggle Row -->
      <section class="glass-card rounded-2xl p-lg border border-outline-variant flex items-center justify-between">
        <span class="font-bold text-base text-on-surface">${isDark ? 'Dark Mode' : 'White Mode'}</span>
        <button id="theme-toggle-profile-btn" class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-slate-300'}" title="Switch Mode">
          <span class="inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}"></span>
        </button>
      </section>

      <!-- Hardware Node Settings -->
      <section class="glass-card rounded-xl p-lg border border-outline-variant space-y-md">
        <div class="flex items-center gap-sm">
          <span class="material-symbols-outlined text-primary">memory</span>
          <h3 class="font-headline-md text-headline-md text-on-surface">ESP32 & PZEM-004T Hardware Node Config</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div class="space-y-xs">
            <label class="font-label-sm text-outline">NODE IDENTIFIER</label>
            <input class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md font-data-md text-on-surface" value="${user.nodeId || 'ESP32-PZEM-PLUG-10A'}" readonly />
          </div>

          <div class="space-y-xs">
            <label class="font-label-sm text-outline">FIRMWARE VERSION</label>
            <input class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md font-data-md text-on-surface" value="${user.firmware || 'v3.2.0-10A-protection'}" readonly />
          </div>

          <div class="space-y-xs">
            <label class="font-label-sm text-outline">TTL SERIAL PINS (ESP32)</label>
            <input class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md font-data-md text-on-surface" value="GPIO 16 (RX) / GPIO 17 (TX)" readonly />
          </div>

          <div class="space-y-xs">
            <label class="font-label-sm text-outline">FASTAPI BACKEND WEBSOCKET</label>
            <input class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md font-data-md text-on-surface" value="wss://api.powersense.ai/v1/telemetry" readonly />
          </div>
        </div>
      </section>

      <!-- RAG Knowledge Base Status -->
      <section class="glass-card rounded-xl p-lg border border-outline-variant space-y-md">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-secondary">psychology</span>
            <h3 class="font-headline-md text-headline-md text-on-surface">AI & RAG Engine Metadata</h3>
          </div>
          <span class="px-sm py-1 bg-secondary/10 text-secondary text-label-sm rounded-full border border-secondary/20">Vector Index Ready</span>
        </div>

        <div class="space-y-sm font-body-md text-on-surface-variant">
          <p>• Model: <span class="text-on-surface font-semibold">Lightweight LLM + FAISS Vector Retriever</span></p>
          <p>• Training Corpus: <span class="text-on-surface font-semibold">IEEE Electrical Efficiency & HVAC Diagnostics Standard</span></p>
          <p>• Real-time Inference latency: <span class="text-secondary font-data-md">~38ms</span></p>
        </div>
      </section>
    </main>

    <!-- Edit Profile Modal -->
    <div id="edit-profile-modal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm hidden flex items-center justify-center p-4">
      <div class="bg-white dark:bg-[#141B24] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-[#222C3A] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-[#00C48C] flex items-center justify-center">
              <span class="material-symbols-outlined text-[24px]">manage_accounts</span>
            </div>
            <div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-slate-100">Edit Profile</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Update your name, contact info, and password</p>
            </div>
          </div>
          <button id="btn-close-edit-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div id="edit-modal-error" class="hidden p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">error</span>
          <span id="edit-modal-error-text">Failed to update profile.</span>
        </div>

        <div id="edit-modal-success" class="hidden p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">check_circle</span>
          <span id="edit-modal-success-text">Profile updated successfully!</span>
        </div>

        <form id="edit-profile-form" class="space-y-4">
          <!-- Full Name -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">FULL NAME</label>
            <input id="edit-input-name" class="w-full bg-[#F8FAF9] dark:bg-[#0F1620] border border-[#E5E9E7] dark:border-[#243040] text-[#111827] dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00C48C]/20 focus:border-[#00C48C] transition-all" value="${displayName}" placeholder="Your Full Name" required />
          </div>

          <!-- Email (Read Only) -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">EMAIL ADDRESS (LOCKED)</label>
            <input class="w-full bg-slate-100 dark:bg-[#1A2330] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl px-4 py-3 text-sm cursor-not-allowed" value="${user.email || ''}" readonly />
          </div>

          <!-- Phone Number -->
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">MOBILE NUMBER</label>
            <input id="edit-input-phone" class="w-full bg-[#F8FAF9] dark:bg-[#0F1620] border border-[#E5E9E7] dark:border-[#243040] text-[#111827] dark:text-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#00C48C]/20 focus:border-[#00C48C] transition-all" value="${user.phone || ''}" placeholder="e.g. +91 98765 43210" />
          </div>

          <!-- Change Password Box -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#0F1620] border border-slate-200 dark:border-[#243040] space-y-3">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[#00C48C] text-[20px]">key</span>
              <h4 class="font-bold text-sm text-slate-900 dark:text-slate-100">Change Password</h4>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Leave blank if you do not want to change your password.</p>

            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">CURRENT PASSWORD</label>
              <input id="edit-input-cur-pass" type="password" class="w-full bg-white dark:bg-[#141B24] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm" placeholder="Enter current password" />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">NEW PASSWORD</label>
              <input id="edit-input-new-pass" type="password" class="w-full bg-white dark:bg-[#141B24] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm" placeholder="Min. 6 characters" />
            </div>

            <div class="space-y-1">
              <label class="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">CONFIRM NEW PASSWORD</label>
              <input id="edit-input-conf-pass" type="password" class="w-full bg-white dark:bg-[#141B24] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-sm" placeholder="Repeat new password" />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button id="btn-cancel-edit-modal" type="button" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all">
              Cancel
            </button>
            <button id="btn-save-edit-profile" type="submit" class="flex-1 py-3 bg-[#00C48C] hover:bg-[#00A86B] text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check</span>
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function bindProfileEvents() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      store.logoutSession();
    });
  }

  const btnToggle = document.getElementById('theme-toggle-profile-btn');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  const modal = document.getElementById('edit-profile-modal');
  const btnOpen1 = document.getElementById('btn-open-edit-profile');
  const btnOpen2 = document.getElementById('btn-open-edit-profile-action');
  const btnClose = document.getElementById('btn-close-edit-modal');
  const btnCancel = document.getElementById('btn-cancel-edit-modal');

  const openModal = () => {
    if (modal) {
      modal.classList.remove('hidden');
      const err = document.getElementById('edit-modal-error');
      const succ = document.getElementById('edit-modal-success');
      if (err) err.classList.add('hidden');
      if (succ) succ.classList.add('hidden');
    }
  };

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  if (btnOpen1) btnOpen1.addEventListener('click', openModal);
  if (btnOpen2) btnOpen2.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  const form = document.getElementById('edit-profile-form');
  const errorBox = document.getElementById('edit-modal-error');
  const errorText = document.getElementById('edit-modal-error-text');
  const successBox = document.getElementById('edit-modal-success');
  const successText = document.getElementById('edit-modal-success-text');
  const saveBtn = document.getElementById('btn-save-edit-profile');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const state = store.getState();
      const nameVal = document.getElementById('edit-input-name')?.value.trim();
      const phoneVal = document.getElementById('edit-input-phone')?.value.trim();
      const curPass = document.getElementById('edit-input-cur-pass')?.value;
      const newPass = document.getElementById('edit-input-new-pass')?.value;
      const confPass = document.getElementById('edit-input-conf-pass')?.value;

      if (errorBox) errorBox.classList.add('hidden');
      if (successBox) successBox.classList.add('hidden');

      if (!nameVal) {
        if (errorBox && errorText) {
          errorText.innerText = 'Name cannot be empty.';
          errorBox.classList.remove('hidden');
        }
        return;
      }

      if (newPass) {
        if (newPass.length < 6) {
          if (errorBox && errorText) {
            errorText.innerText = 'New password must be at least 6 characters long.';
            errorBox.classList.remove('hidden');
          }
          return;
        }
        if (newPass !== confPass) {
          if (errorBox && errorText) {
            errorText.innerText = 'New passwords do not match.';
            errorBox.classList.remove('hidden');
          }
          return;
        }
        if (!curPass) {
          if (errorBox && errorText) {
            errorText.innerText = 'Current password is required to change your password.';
            errorBox.classList.remove('hidden');
          }
          return;
        }
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Saving Changes...';
      }

      try {
        const res = await updateUserProfileApi({
          email: state.user?.email,
          name: nameVal,
          phone: phoneVal,
          current_password: curPass || undefined,
          new_password: newPass || undefined,
        });

        store.updateUserProfile({
          name: nameVal,
          phone: phoneVal,
        });

        if (successBox && successText) {
          successText.innerText = res.message || 'Profile updated successfully!';
          successBox.classList.remove('hidden');
        }

        setTimeout(() => {
          closeModal();
          // Update DOM labels if present
          const nameLabel = document.getElementById('profile-display-name');
          if (nameLabel) nameLabel.innerText = nameVal;
          const phoneLabel = document.getElementById('profile-display-phone');
          if (phoneLabel) phoneLabel.innerText = phoneVal;
        }, 1200);

      } catch (err) {
        if (errorBox && errorText) {
          errorText.innerText = err.message || 'Failed to update profile. Please verify your current password.';
          errorBox.classList.remove('hidden');
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">check</span><span>Save Changes</span>`;
        }
      }
    });
  }
}
