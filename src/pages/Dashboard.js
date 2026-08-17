// Dashboard Page Component

import { store } from '../state/store.js';

export function Dashboard() {
  const state = store.getState();
  const telemetry = state.telemetry;
  const appliances = state.appliances;
  const isSurge = state.simulatedAnomalyActive;
  const user = state.user || { name: 'Smart Plug User', email: 'user@powersense.ai', role: 'user' };
  const isAdmin = user.role === 'admin';

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
      <!-- Active User Session Banner -->
      <section class="glass-card rounded-2xl p-md border border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
        <div class="flex items-center gap-sm">
          <div class="w-10 h-10 rounded-xl ${isAdmin ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40' : 'bg-primary/20 text-primary border border-primary/40'} flex items-center justify-center font-mono font-bold text-sm">
            ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="flex items-center gap-xs">
              <span class="font-bold text-sm text-on-surface">Welcome back, ${user.name || 'User'}</span>
              <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded ${isAdmin ? 'bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30' : 'bg-primary/15 text-primary border border-primary/30'} uppercase">
                ${user.role || 'user'}
              </span>
            </div>
            <p class="font-mono text-xs text-on-surface-variant">
              Active Session: <span class="text-on-surface">${user.email}</span> • Node: <span class="text-primary">${user.nodeId || 'ESP32-PZEM-PLUG-10A'}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-xs self-end sm:self-center">
          ${isAdmin ? `
            <button id="dash-switch-admin-btn" class="px-md py-xs rounded-xl bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald border border-cyber-emerald/40 text-xs font-mono font-bold flex items-center gap-xs transition-all">
              <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              Admin Dashboard
            </button>
          ` : ''}
          <button id="dash-logout-btn" class="px-md py-xs rounded-xl bg-error-container/20 hover:bg-error-container/40 text-on-error-container border border-error/40 text-xs font-mono font-bold flex items-center gap-xs transition-all">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      </section>

      <!-- Hero Section: Real-time Stats -->
      <section class="relative overflow-hidden rounded-xl bg-surface-container-low border ${isSurge ? 'border-error/60 bg-error-container/10' : 'border-outline-variant'} p-xl grid md:grid-cols-2 gap-xl items-center transition-all">
        <div class="space-y-md relative z-10">
          <div class="flex items-center justify-between">
            <p class="font-label-sm text-label-sm text-primary uppercase tracking-widest">Total Consumption (Live Telemetry)</p>
            ${isSurge ? `
              <span class="px-sm py-xs bg-error text-on-error font-data-md text-[11px] rounded-full font-bold animate-pulse flex items-center gap-xs">
                <span class="material-symbols-outlined text-[14px]">bolt</span> VOLTAGE SURGE
              </span>
            ` : ''}
          </div>

          <div class="flex items-baseline gap-xs">
            <span class="font-display-lg text-display-lg text-on-surface" id="live-total-kw">${telemetry.totalPowerKw}</span>
            <span class="font-headline-md text-headline-md text-on-surface-variant">kW</span>
          </div>

          <div class="flex flex-wrap items-center gap-md">
            <div class="px-md py-sm rounded-lg glass-card border border-outline-variant">
              <p class="font-label-sm text-label-sm text-on-surface-variant">Cost Today</p>
              <p class="font-data-lg text-data-lg text-secondary" id="live-cost">$${telemetry.costToday.toFixed(2)}</p>
            </div>
            <div class="px-md py-sm rounded-lg glass-card border border-outline-variant">
              <p class="font-label-sm text-label-sm text-on-surface-variant">vs Yesterday</p>
              <p class="font-data-lg text-data-lg text-error">${telemetry.vsYesterday}%</p>
            </div>
            <div class="px-md py-sm rounded-lg glass-card border border-outline-variant">
              <p class="font-label-sm text-label-sm text-on-surface-variant">Grid Voltage / Amps</p>
              <p class="font-data-lg text-data-lg text-primary">${telemetry.voltage}V / ${telemetry.currentAmps}A</p>
            </div>
          </div>
        </div>

        <!-- Grid Load Balance Graphic -->
        <div class="hidden md:block relative h-48 rounded-xl bg-surface-container overflow-hidden border border-outline-variant">
          <div class="absolute inset-0 p-md flex flex-col justify-between">
            <div class="flex justify-between items-center">
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase">Grid Load Balance Spectrum</span>
              <span class="font-data-md text-[11px] text-secondary">PF: ${telemetry.powerFactor}</span>
            </div>
            <div class="flex items-end justify-between gap-xs h-24">
              <div class="w-full bg-primary/20 rounded-t-sm h-[40%] transition-all"></div>
              <div class="w-full bg-primary/20 rounded-t-sm h-[60%] transition-all"></div>
              <div class="w-full bg-primary/20 rounded-t-sm h-[55%] transition-all"></div>
              <div class="w-full ${isSurge ? 'bg-error border-t-2 border-error' : 'bg-secondary/40 border-t-2 border-secondary'} rounded-t-sm ${isSurge ? 'h-[95%]' : 'h-[85%]'} transition-all"></div>
              <div class="w-full bg-primary/20 rounded-t-sm h-[45%] transition-all"></div>
              <div class="w-full bg-primary/20 rounded-t-sm h-[30%] transition-all"></div>
              <div class="w-full bg-primary/20 rounded-t-sm h-[50%] transition-all"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Appliance Cards Grid / ESP32 Hardware Status -->
      <section class="space-y-md">
        <div class="flex justify-between items-center">
          <h2 class="font-headline-md text-headline-md text-on-surface">Connected Appliances</h2>
          <span class="font-data-md text-[12px] text-outline">
            ${appliances.length > 0 ? `PZEM-004T Monitored Nodes (${appliances.filter(a => a.status === 'Active').length}/${appliances.length} Active)` : 'Awaiting ESP32 Node Stream'}
          </span>
        </div>

        ${appliances.length > 0 ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-grid-gutter">
            ${appliances.map(app => {
              const isActive = app.status === 'Active';
              const isAnomaly = app.isAnomaly;

              let cardBorder = 'border-outline-variant hover:border-primary';
              if (isAnomaly) cardBorder = 'border-error/60 hover:border-error';

              return `
                <div class="dash-card glass-card rounded-xl p-lg border ${cardBorder} transition-all duration-300 relative overflow-hidden group">
                  ${isAnomaly ? `
                    <div class="absolute top-0 right-0 p-sm">
                      <span class="material-symbols-outlined text-error text-[18px] animate-pulse">warning</span>
                    </div>
                  ` : ''}

                  <div class="flex justify-between items-start mb-lg">
                    <div class="p-sm bg-surface-container-highest rounded-lg ${isAnomaly ? 'text-error' : isActive ? 'text-primary' : 'text-on-surface-variant'}">
                      <span class="material-symbols-outlined">${app.icon}</span>
                    </div>
                    <button class="toggle-app-btn px-sm py-1 ${isAnomaly ? 'bg-error/20 text-error border border-error/30' : isActive ? 'bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant hover:bg-surface-bright'} text-label-sm font-label-sm rounded-full transition-all" data-appid="${app.id}">
                      ${isActive ? (isAnomaly ? 'Anomaly' : 'Active') : app.status}
                    </button>
                  </div>

                  <h3 class="font-headline-md text-headline-md mb-xs text-on-surface">${app.name}</h3>
                  <div class="flex items-baseline gap-xs mb-md">
                    <span class="font-data-lg text-data-lg ${isAnomaly ? 'text-error font-bold' : isActive ? 'text-on-surface' : 'text-on-surface-variant'}">${app.watts}</span>
                    <span class="font-data-md text-data-md text-on-surface-variant">Watts</span>
                  </div>

                  <!-- Interactive Sparkline Graph -->
                  <div class="h-12 w-full bg-surface-container rounded flex items-end gap-1 p-1 ${isActive ? 'opacity-100' : 'opacity-30'}">
                    ${(app.history || []).map(val => `
                      <div class="flex-1 ${isAnomaly ? 'bg-error/60' : 'bg-primary/40'} rounded-xs transition-all" style="height: ${Math.max(10, val)}%;"></div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <!-- Clean Hardware Ready Standby Card -->
          <div class="glass-card rounded-2xl p-xl border border-outline-variant/60 text-center space-y-md">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-3xl">developer_board</span>
            </div>
            <div class="space-y-xs max-w-lg mx-auto">
              <h3 class="font-bold text-on-surface text-base">Awaiting ESP32 PZEM-004T Hardware Connection</h3>
              <p class="font-sans text-xs text-on-surface-variant leading-relaxed">
                No telemetry stream active yet. When you configure and power on your ESP32 PZEM-004T smart plug, live voltage, current, active wattage, and relay telemetry will stream automatically into these fields.
              </p>
            </div>
            <div class="inline-flex items-center gap-xs px-md py-xs rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-xs">
              <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span>FastAPI Stream Endpoint Ready (POST /api/esp32/telemetry)</span>
            </div>
          </div>
        `}
      </section>

      <!-- AI Insights Section -->
      <section class="space-y-md">
        <div class="flex items-center gap-sm">
          <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">psychology</span>
          <h2 class="font-headline-md text-headline-md text-on-surface">AI & RAG Diagnostics</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-grid-gutter">
          <div class="relative p-lg rounded-xl bg-surface-container-low border border-outline-variant overflow-hidden space-y-sm">
            <div class="flex items-center gap-sm text-secondary">
              <span class="material-symbols-outlined">network_check</span>
              <span class="font-label-sm text-label-sm uppercase tracking-wider">Hardware Telemetry Channel</span>
            </div>
            <h4 class="font-headline-md text-headline-md text-on-surface">PZEM-004T Ingestion Protocol</h4>
            <p class="font-body-md text-body-md text-on-surface-variant">
              The neural copilot monitors your ESP32 serial data stream (UART 9600 baud) for voltage sags, overcurrent spikes (>10A), and power factor decay.
            </p>
            <div class="pt-xs font-mono text-xs text-primary">Status: Standing by for hardware telemetry</div>
          </div>

          <div class="relative p-lg rounded-xl bg-surface-container-low border border-outline-variant overflow-hidden space-y-sm">
            <div class="flex items-center gap-sm text-secondary">
              <span class="material-symbols-outlined">auto_awesome</span>
              <span class="font-label-sm text-label-sm uppercase tracking-wider">Predictive Peak Optimization</span>
            </div>
            <h4 class="font-headline-md text-headline-md text-on-surface">TOU Tariff Analysis</h4>
            <p class="font-body-md text-body-md text-on-surface-variant">
              Real-time spend and savings will calculate dynamically once the ESP32 logs continuous kWh usage through the calibrated PZEM-004T current transformer.
            </p>
            <div class="pt-xs font-mono text-xs text-secondary">Tariff Engine: Configured & Active</div>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function bindDashboardEvents() {
  document.querySelectorAll('.dash-card').forEach(card => {
    card.addEventListener('mouseenter', () => card.classList.add('glow-primary'));
    card.addEventListener('mouseleave', () => card.classList.remove('glow-primary'));
  });

  document.querySelectorAll('.toggle-app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const appid = e.currentTarget.getAttribute('data-appid');
      if (appid) store.toggleAppliance(appid);
    });
  });

  const btnAcService = document.getElementById('btn-ac-service');
  if (btnAcService) {
    btnAcService.addEventListener('click', () => {
      const state = store.getState();
      const kbItem = state.ragKnowledgeBase.find(kb => kb.id === 'rag-2');
      store.toggleRagModal(true, kbItem);
    });
  }

  const btnApplySchedule = document.getElementById('btn-apply-schedule');
  if (btnApplySchedule) {
    btnApplySchedule.addEventListener('click', () => {
      alert('⚡ Peak Hours Automation applied successfully! Washing Machine and EV Charger schedule updated to 9:00 PM off-peak slot.');
    });
  }

  const dashSwitchAdmin = document.getElementById('dash-switch-admin-btn');
  if (dashSwitchAdmin) {
    dashSwitchAdmin.addEventListener('click', () => {
      store.setPage('admin');
    });
  }

  const dashLogout = document.getElementById('dash-logout-btn');
  if (dashLogout) {
    dashLogout.addEventListener('click', () => {
      store.logoutSession();
    });
  }
}
