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
}
