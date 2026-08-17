// Alerts Page Component

import { store } from '../state/store.js';

export function Alerts() {
  const state = store.getState();
  const alerts = state.alerts;

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 class="font-headline-lg text-headline-lg text-on-surface">Telemetry & Anomaly Log</h2>
          <p class="font-body-md text-on-surface-variant">Real-time fault events detected by Machine Learning models.</p>
        </div>
        
        <button id="btn-trigger-test-alert" class="px-md py-xs bg-surface-container-high border border-outline-variant text-on-surface text-label-sm font-label-sm rounded-lg hover:bg-surface-variant transition-all">
          ⚡ Trigger Test Anomaly
        </button>
      </section>

      <section class="space-y-md">
        ${alerts.length === 0 ? `
          <div class="glass-card rounded-xl p-xl text-center space-y-sm text-outline">
            <span class="material-symbols-outlined text-[48px]">verified</span>
            <p class="font-headline-md text-on-surface">No Active Anomaly Alerts</p>
            <p class="font-body-md">All connected IoT nodes are performing within normal power parameters.</p>
          </div>
        ` : `
          <div class="space-y-md">
            ${alerts.map(alt => {
              let badgeColor = 'bg-primary/20 text-primary border-primary/30';
              let icon = 'info';
              let border = 'border-outline-variant';

              if (alt.type === 'error') {
                badgeColor = 'bg-error/20 text-error border-error/30';
                icon = 'report_problem';
                border = 'border-error/50 bg-error-container/10';
              } else if (alt.type === 'warning') {
                badgeColor = 'bg-tertiary-container/20 text-tertiary border-tertiary/30';
                icon = 'warning';
                border = 'border-tertiary-container/40';
              }

              return `
                <div class="glass-card rounded-xl p-lg border ${border} transition-all space-y-sm">
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-sm">
                      <span class="material-symbols-outlined ${alt.type === 'error' ? 'text-error' : 'text-primary'}">${icon}</span>
                      <h3 class="font-headline-md text-headline-md text-on-surface">${alt.title}</h3>
                    </div>
                    <span class="font-data-md text-[12px] text-outline">${alt.timestamp}</span>
                  </div>

                  <p class="font-body-md text-on-surface-variant">${alt.description}</p>

                  ${alt.actionable ? `
                    <div class="pt-sm flex justify-end gap-sm">
                      <button class="alert-rag-btn px-md py-xs bg-surface-container-highest border border-outline-variant text-on-surface rounded-lg font-label-sm hover:border-secondary transition-all" data-alertid="${alt.id}">
                        Ask RAG Assistant
                      </button>
                      <button class="alert-ack-btn px-md py-xs bg-primary text-on-primary font-bold rounded-lg font-label-sm hover:brightness-110 transition-all shadow" data-alertid="${alt.id}">
                        ${alt.actionText || 'Acknowledge'}
                      </button>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>
    </main>
  `;
}

export function bindAlertsEvents() {
  const btnTest = document.getElementById('btn-trigger-test-alert');
  if (btnTest) {
    btnTest.addEventListener('click', () => {
      store.triggerSimulatedAnomaly();
    });
  }

  document.querySelectorAll('.alert-rag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const state = store.getState();
      const item = state.ragKnowledgeBase.find(kb => kb.id === 'rag-2');
      store.toggleRagModal(true, item);
    });
  });

  document.querySelectorAll('.alert-ack-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const alertId = e.currentTarget.getAttribute('data-alertid');
      const filtered = store.getState().alerts.filter(a => a.id !== alertId);
      store.setState({ alerts: filtered });
    });
  });
}
