// IoT ESP32 & PZEM-004T Hardware Simulator Control Panel

import { store } from '../state/store.js';

export function SimulatorModal() {
  const state = store.getState();
  if (!state.isSimulatorModalOpen) return '';

  const isAnomaly = state.simulatedAnomalyActive;

  return `
    <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-grid-margin animate-fadeIn">
      <div class="technical-card rounded-2xl border border-outline-variant max-w-xl w-full p-lg space-y-lg shadow-2xl relative">
        <div class="flex justify-between items-center border-b border-outline-variant pb-md">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-secondary text-[28px]">developer_board</span>
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface">ESP32 & PZEM-004T IoT Hardware Control</h3>
              <p class="font-label-sm text-label-sm text-outline">Real-time Telemetry & Anomaly Injector</p>
            </div>
          </div>
          <button id="btn-close-sim" class="text-outline hover:text-on-surface p-xs rounded-lg transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Telemetry Status Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-sm">
          <div class="p-sm rounded-lg bg-surface-container border border-outline-variant">
            <span class="font-label-sm text-[10px] text-outline block uppercase">Sensor Voltage</span>
            <span class="font-data-lg text-data-lg text-primary">${state.telemetry.voltage} V</span>
          </div>
          <div class="p-sm rounded-lg bg-surface-container border border-outline-variant">
            <span class="font-label-sm text-[10px] text-outline block uppercase">Current Draw</span>
            <span class="font-data-lg text-data-lg ${state.telemetry.currentAmps > 8 ? 'text-error' : 'text-secondary'}">${state.telemetry.currentAmps} A</span>
          </div>
          <div class="p-sm rounded-lg bg-surface-container border border-outline-variant">
            <span class="font-label-sm text-[10px] text-outline block uppercase">Power Factor</span>
            <span class="font-data-lg text-data-lg text-on-surface">${state.telemetry.powerFactor}</span>
          </div>
          <div class="p-sm rounded-lg bg-surface-container border border-outline-variant">
            <span class="font-label-sm text-[10px] text-outline block uppercase">Wi-Fi RSSI</span>
            <span class="font-data-lg text-data-lg text-on-surface">-64 dBm</span>
          </div>
        </div>

        <!-- Interactive Controls -->
        <div class="space-y-md">
          <h4 class="font-headline-md text-[16px] text-on-surface">Interactive Hardware Controls</h4>
          
          <!-- Anomaly Injector Button -->
          <div class="p-md rounded-xl ${isAnomaly ? 'bg-error-container/20 border border-error/50' : 'bg-surface-container-high border border-outline-variant'} flex items-center justify-between transition-colors">
            <div>
              <p class="font-headline-md text-[15px] text-on-surface">Simulate Power Surge Anomaly</p>
              <p class="font-body-md text-on-surface-variant text-[13px]">Injects sudden +120% wattage surge into AC compressor telemetry.</p>
            </div>
            <button id="btn-trigger-anomaly" class="px-md py-sm rounded-lg font-bold font-headline-md text-[13px] ${isAnomaly ? 'bg-error text-on-error hover:bg-error/80' : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'} transition-all shadow-md">
              ${isAnomaly ? 'Reset Normal State' : 'Inject Surge'}
            </button>
          </div>

          <!-- Quick Appliance Toggle Chips -->
          <div class="space-y-xs">
            <label class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Quick Appliance Power Controls</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-xs">
              ${state.appliances.map(app => `
                <button class="app-toggle-btn p-xs px-sm rounded-lg border text-left flex justify-between items-center ${app.status === 'Active' ? 'bg-primary-container/20 border-primary text-primary' : 'bg-surface-container border-outline-variant text-outline'} transition-all" data-appid="${app.id}">
                  <div class="flex items-center gap-xs overflow-hidden">
                    <span class="material-symbols-outlined text-[16px]">${app.icon}</span>
                    <span class="font-label-sm text-[12px] truncate">${app.name}</span>
                  </div>
                  <span class="font-data-md text-[10px] font-bold">${app.status === 'Active' ? `${app.watts}W` : 'OFF'}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="pt-sm border-t border-outline-variant flex justify-between items-center text-[12px] font-data-md text-outline">
          <span>ESP32 Microcontroller: Connected (FreeRTOS Core 1)</span>
          <button id="btn-done-sim" class="px-lg py-xs bg-surface-bright text-on-surface rounded-lg font-label-sm hover:bg-surface-variant transition-colors">Close</button>
        </div>
      </div>
    </div>
  `;
}

export function bindSimulatorModalEvents() {
  const btnClose = document.getElementById('btn-close-sim');
  const btnDone = document.getElementById('btn-done-sim');
  const closeFn = () => store.toggleSimulatorModal(false);

  if (btnClose) btnClose.addEventListener('click', closeFn);
  if (btnDone) btnDone.addEventListener('click', closeFn);

  const btnAnomaly = document.getElementById('btn-trigger-anomaly');
  if (btnAnomaly) {
    btnAnomaly.addEventListener('click', () => {
      store.triggerSimulatedAnomaly();
    });
  }

  document.querySelectorAll('.app-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const appid = e.currentTarget.getAttribute('data-appid');
      if (appid) store.toggleAppliance(appid);
    });
  });
}
