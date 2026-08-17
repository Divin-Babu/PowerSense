// Analytics Page Component

import { store } from '../state/store.js';

let activeRange = '24h';

export function Analytics() {
  const state = store.getState();
  const telemetry = state.telemetry;

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
      <!-- Analytics Header -->
      <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div>
          <h2 class="font-headline-lg text-headline-lg text-on-surface">Energy Analytics & Electrical Parameters</h2>
          <p class="font-body-md text-on-surface-variant">PZEM-004T high-precision voltage, current, and active power telemetry logs.</p>
        </div>

        <!-- Range Buttons -->
        <div class="flex items-center gap-xs bg-surface-container-high p-xs rounded-xl border border-outline-variant">
          ${['24h', '7d', '30d', '1y'].map(range => `
            <button class="range-btn px-md py-xs rounded-lg font-label-sm text-label-sm ${activeRange === range ? 'bg-primary text-on-primary font-bold shadow' : 'text-on-surface-variant hover:text-on-surface'} transition-all" data-range="${range}">
              ${range.toUpperCase()}
            </button>
          `).join('')}
        </div>
      </section>

      <!-- Key Metrics Row -->
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-grid-gutter">
        <div class="glass-card rounded-xl p-md border border-outline-variant">
          <p class="font-label-sm text-[11px] text-outline uppercase tracking-wider">Line Voltage (AC)</p>
          <div class="flex items-baseline gap-xs mt-xs">
            <span class="font-data-lg text-data-lg text-primary">${telemetry.voltage}</span>
            <span class="font-data-md text-[12px] text-on-surface-variant">Volts</span>
          </div>
        </div>

        <div class="glass-card rounded-xl p-md border border-outline-variant">
          <p class="font-label-sm text-[11px] text-outline uppercase tracking-wider">Instantaneous Current</p>
          <div class="flex items-baseline gap-xs mt-xs">
            <span class="font-data-lg text-data-lg text-secondary">${telemetry.currentAmps}</span>
            <span class="font-data-md text-[12px] text-on-surface-variant">Amps</span>
          </div>
        </div>

        <div class="glass-card rounded-xl p-md border border-outline-variant">
          <p class="font-label-sm text-[11px] text-outline uppercase tracking-wider">Power Factor</p>
          <div class="flex items-baseline gap-xs mt-xs">
            <span class="font-data-lg text-data-lg text-on-surface">${telemetry.powerFactor}</span>
            <span class="font-data-md text-[12px] text-outline">cos φ</span>
          </div>
        </div>

        <div class="glass-card rounded-xl p-md border border-outline-variant">
          <p class="font-label-sm text-[11px] text-outline uppercase tracking-wider">Cumulative Energy</p>
          <div class="flex items-baseline gap-xs mt-xs">
            <span class="font-data-lg text-data-lg text-tertiary">${telemetry.cumulativeKwh}</span>
            <span class="font-data-md text-[12px] text-on-surface-variant">kWh</span>
          </div>
        </div>
      </section>

      <!-- Main Interactive Telemetry SVG Chart -->
      <section class="glass-card rounded-xl p-lg border border-outline-variant space-y-md">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-primary">show_chart</span>
            <h3 class="font-headline-md text-headline-md text-on-surface">Active Power Load Trend (kW)</h3>
          </div>
          <span class="font-data-md text-[12px] text-secondary">Sampling: 1 Hz | ESP32 Fast-TTL</span>
        </div>

        <div class="w-full h-64 relative bg-surface-container-lowest rounded-xl p-md border border-outline-variant/60 overflow-hidden flex flex-col justify-between">
          <!-- Background Grid Lines -->
          <div class="absolute inset-0 flex flex-col justify-between p-md pointer-events-none opacity-10">
            <div class="border-b border-outline w-full"></div>
            <div class="border-b border-outline w-full"></div>
            <div class="border-b border-outline w-full"></div>
            <div class="border-b border-outline w-full"></div>
          </div>

          <!-- SVG Telemetry Graph -->
          <svg class="w-full h-full relative z-10" viewBox="0 0 500 150" preserveAspectRatio="none">
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#43ecdb" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#2e66ff" stop-opacity="0.0" />
              </linearGradient>
            </defs>
            <path d="M 0,110 Q 50,40 100,70 T 200,90 T 300,30 T 400,65 T 500,45 L 500,150 L 0,150 Z" fill="url(#powerGrad)" />
            <path d="M 0,110 Q 50,40 100,70 T 200,90 T 300,30 T 400,65 T 500,45" fill="none" stroke="#43ecdb" stroke-width="3" stroke-linecap="round" />
            
            <!-- Live Point Indicator -->
            <circle cx="500" cy="45" r="5" fill="#43ecdb" class="animate-ping" />
            <circle cx="500" cy="45" r="4" fill="#ffffff" />
          </svg>

          <!-- Time Labels -->
          <div class="flex justify-between font-data-md text-[11px] text-outline pt-xs relative z-10">
            <span>00:00</span>
            <span>04:00</span>
            <span>08:00</span>
            <span>12:00</span>
            <span>16:00</span>
            <span>20:00</span>
            <span>NOW</span>
          </div>
        </div>
      </section>

      <!-- Appliance Energy Share Breakdown -->
      <section class="glass-card rounded-xl p-lg border border-outline-variant space-y-md">
        <h3 class="font-headline-md text-headline-md text-on-surface">Appliance Energy Distribution Share</h3>
        <div class="space-y-md">
          ${state.appliances.map(app => {
            const total = state.appliances.reduce((a, b) => a + b.watts, 0) || 1;
            const pct = Math.round((app.watts / total) * 100);

            return `
              <div class="space-y-xs">
                <div class="flex justify-between font-body-md text-[14px]">
                  <span class="flex items-center gap-xs text-on-surface">
                    <span class="material-symbols-outlined text-[18px] text-primary">${app.icon}</span>
                    ${app.name}
                  </span>
                  <span class="font-data-md text-on-surface-variant">${app.watts} W (${pct}%)</span>
                </div>
                <div class="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div class="h-full ${app.isAnomaly ? 'bg-error' : 'bg-gradient-to-r from-primary to-secondary'} transition-all duration-500" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    </main>
  `;
}

export function bindAnalyticsEvents() {
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeRange = e.currentTarget.getAttribute('data-range');
      store.notify();
    });
  });
}
