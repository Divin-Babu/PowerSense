// Top AppBar Component

import { store } from '../state/store.js';

export function Header() {
  const state = store.getState();
  const isAnomaly = state.simulatedAnomalyActive;
  const user = state.user || { name: 'User', email: 'user@powersense.ai', role: 'user' };
  const isAdmin = user.role === 'admin';

  return `
    <header class="w-full top-0 sticky z-40 bg-surface dark:bg-[#10161F] border-b border-outline-variant dark:border-[#1E2734] flex justify-between items-center px-grid-margin py-md backdrop-blur-md bg-opacity-90">
      <div class="flex items-center gap-sm cursor-pointer" id="header-logo" title="PowerSense AI">
        <span class="material-symbols-outlined text-primary text-headline-md" style="font-variation-settings: 'FILL' 1;">bolt</span>
        <div>
          <h1 class="text-headline-md font-headline-md font-bold text-primary dark:text-primary tracking-tight">PowerSense AI</h1>
        </div>
      </div>

      <div class="flex items-center gap-sm md:gap-md">
        <!-- User Session Indicator -->
        <div id="header-user-badge" class="flex items-center gap-xs px-sm py-1 rounded-xl bg-surface-container-high dark:bg-[#1A2330] border border-outline-variant dark:border-[#253243] cursor-pointer hover:border-cyber-cyan transition-all" title="Logged in as ${user.email}">
          <div class="w-6 h-6 rounded-lg ${isAdmin ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40' : 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'} flex items-center justify-center font-mono text-[11px] font-bold">
            ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div class="hidden md:flex flex-col text-left">
            <span class="font-bold text-[11px] text-on-surface truncate max-w-[120px]">${user.name || 'User'}</span>
            <span class="font-mono text-[9px] ${isAdmin ? 'text-cyber-emerald font-bold' : 'text-on-surface-variant'} uppercase">${user.role || 'user'}</span>
          </div>
        </div>

        <!-- IoT Simulator Control Toggle -->
        <button id="btn-open-simulator" class="hidden sm:flex items-center gap-xs px-md py-xs rounded-lg bg-surface-container-high dark:bg-[#1A2330] hover:bg-surface-variant border border-outline-variant dark:border-[#253243] text-label-sm font-label-sm text-on-surface transition-all">
          <span class="material-symbols-outlined text-secondary text-[18px]">developer_board</span>
          <span>IoT Control</span>
        </button>

        <!-- RAG AI Chat Trigger -->
        <button id="btn-open-rag" class="flex items-center gap-xs px-md py-xs rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm hover:brightness-110 transition-all shadow-md">
          <span class="material-symbols-outlined text-[18px]">psychology</span>
          <span class="hidden xs:inline">Ask RAG</span>
        </button>

        <!-- Connection Status Chip -->
        <div class="flex items-center gap-sm px-md py-xs rounded-full bg-surface-container-high dark:bg-[#1A2330] border ${isAnomaly ? 'border-error/50 bg-error-container/10' : 'border-outline-variant dark:border-[#253243]'} transition-colors">
          <div class="${isAnomaly ? 'w-2 h-2 rounded-full bg-error animate-ping' : 'w-2 h-2 rounded-full bg-secondary pulse-dot'}"></div>
          <span class="font-label-sm text-label-sm ${isAnomaly ? 'text-error' : 'text-on-surface-variant'} uppercase tracking-wider hidden sm:inline">
            ${isAnomaly ? 'Surge Alert' : 'Connected'}
          </span>
          <span class="material-symbols-outlined text-on-surface-variant text-[20px]">sensors</span>
        </div>

        <!-- Quick Logout Icon -->
        <button id="header-logout-btn" class="p-1.5 rounded-lg bg-error-container/20 text-on-error-container hover:bg-error-container/50 border border-error/30 transition-all" title="Sign Out">
          <span class="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </header>
  `;
}

export function bindHeaderEvents() {
  const logo = document.getElementById('header-logo');
  if (logo) {
    logo.addEventListener('click', () => {
      const state = store.getState();
      store.setPage(state.user?.role === 'admin' ? 'admin' : 'dashboard');
    });
  }

  const userBadge = document.getElementById('header-user-badge');
  if (userBadge) {
    userBadge.addEventListener('click', () => store.setPage('profile'));
  }

  const headerLogout = document.getElementById('header-logout-btn');
  if (headerLogout) {
    headerLogout.addEventListener('click', () => {
      store.logoutSession();
    });
  }

  const btnSim = document.getElementById('btn-open-simulator');
  if (btnSim) {
    btnSim.addEventListener('click', () => store.toggleSimulatorModal(true));
  }

  const btnRag = document.getElementById('btn-open-rag');
  if (btnRag) {
    btnRag.addEventListener('click', () => store.toggleRagModal(true));
  }
}
