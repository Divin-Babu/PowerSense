// Profile & Hardware Configuration Page Component

import { store } from '../state/store.js';

export function Profile() {
  const state = store.getState();
  const isDark = state.theme === 'dark';
  const user = state.user || {
    name: 'Smart Plug Operator',
    email: 'user@powersense.ai',
    phone: '',
    role: 'user',
    nodeId: 'ESP32-PZEM-PLUG-10A',
    firmware: 'v3.2.0-10A-protection'
  };

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
      <!-- Profile Header Card -->
      <section class="glass-card rounded-xl p-xl border border-outline-variant flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
        <div class="flex items-center gap-md">
          <div class="w-16 h-16 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary text-[32px] font-bold">
            ${(user.name || 'U').charAt(0)}
          </div>
          <div>
            <h2 class="font-headline-lg text-headline-lg text-on-surface">${user.name || 'Smart Plug User'}</h2>
            <p class="font-body-md text-on-surface-variant">${user.email || 'user@powersense.ai'} ${user.phone ? `• <span class="font-mono text-cyber-cyan">${user.phone}</span>` : ''} • <span class="text-secondary font-data-md">${user.role || 'Operator'}</span></p>
          </div>
        </div>

        <button id="btn-logout" class="px-lg py-sm bg-error-container/40 text-on-error-container border border-error/30 rounded-xl font-label-sm font-bold hover:bg-error-container/60 transition-all flex items-center gap-xs">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>Sign Out</span>
        </button>
      </section>

      <!-- Appearance & Theme Mode Section -->
      <section class="glass-card rounded-xl p-lg border border-outline-variant space-y-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-primary">${isDark ? 'dark_mode' : 'light_mode'}</span>
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface">App Theme & Appearance</h3>
              <p class="text-xs text-on-surface-variant">Switch between Dark Mode and White Mode. Persists across sessions.</p>
            </div>
          </div>
          <button id="theme-toggle-profile-btn" class="px-md py-sm bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-label-sm font-bold transition-all flex items-center gap-xs">
            <span class="material-symbols-outlined text-[18px]">${isDark ? 'light_mode' : 'dark_mode'}</span>
            <span>Switch to ${isDark ? 'White Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-md pt-2">
          <button id="set-light-mode-btn" class="p-md rounded-xl border ${!isDark ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-outline-variant bg-surface-container-lowest'} flex items-center gap-md text-left transition-all">
            <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <span class="material-symbols-outlined">light_mode</span>
            </div>
            <div>
              <span class="font-bold text-sm text-on-surface block">White Mode</span>
              <span class="text-xs text-on-surface-variant">Clean mint background & crisp cards</span>
            </div>
          </button>

          <button id="set-dark-mode-btn" class="p-md rounded-xl border ${isDark ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-outline-variant bg-surface-container-lowest'} flex items-center gap-md text-left transition-all">
            <div class="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center">
              <span class="material-symbols-outlined">dark_mode</span>
            </div>
            <div>
              <span class="font-bold text-sm text-on-surface block">Dark Mode</span>
              <span class="text-xs text-on-surface-variant">Deep obsidian space void aesthetic</span>
            </div>
          </button>
        </div>
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

  const btnLight = document.getElementById('set-light-mode-btn');
  if (btnLight) {
    btnLight.addEventListener('click', () => {
      store.setTheme('light');
    });
  }

  const btnDark = document.getElementById('set-dark-mode-btn');
  if (btnDark) {
    btnDark.addEventListener('click', () => {
      store.setTheme('dark');
    });
  }
}
