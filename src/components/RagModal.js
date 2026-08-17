// RAG Maintenance & AI Diagnostic Assistant Modal

import { store } from '../state/store.js';
import { queryRagAssistant } from '../services/aiRagEngine.js';

export function RagModal() {
  const state = store.getState();
  if (!state.isRagModalOpen) return '';

  const selectedItem = state.selectedKnowledgeItem;

  return `
    <div class="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-grid-margin animate-fadeIn">
      <div class="glass-card rounded-2xl border border-outline-variant max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        <!-- AI Header -->
        <div class="p-lg bg-surface-container-high border-b border-outline-variant flex justify-between items-center">
          <div class="flex items-center gap-sm">
            <div class="p-xs bg-secondary/10 rounded-lg text-secondary border border-secondary/30">
              <span class="material-symbols-outlined text-[24px]">psychology</span>
            </div>
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface">PowerSense RAG AI Assistant</h3>
              <p class="font-label-sm text-label-sm text-on-surface-variant">LLM + Retrieval-Augmented Knowledge Engine</p>
            </div>
          </div>
          <button id="btn-close-rag" class="text-outline hover:text-on-surface p-xs rounded-lg transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Body Area -->
        <div class="p-lg overflow-y-auto space-y-lg flex-1">
          <!-- Preset Prompt Chips -->
          <div class="space-y-xs">
            <p class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Quick Diagnostic Queries</p>
            <div class="flex flex-wrap gap-xs">
              <button class="rag-chip px-sm py-1 rounded-full bg-surface-container-highest border border-outline-variant text-label-sm text-on-surface hover:border-primary transition-all" data-query="Why is my Air Conditioner drawing high watts?">
                ⚡ Air Conditioner Surge
              </button>
              <button class="rag-chip px-sm py-1 rounded-full bg-surface-container-highest border border-outline-variant text-label-sm text-on-surface hover:border-primary transition-all" data-query="How does PZEM-004T communicate with ESP32?">
                🔌 Hardware Sensor Specs
              </button>
              <button class="rag-chip px-sm py-1 rounded-full bg-surface-container-highest border border-outline-variant text-label-sm text-on-surface hover:border-primary transition-all" data-query="How can I save money during peak tariff hours?">
                💰 Peak Cost Savings
              </button>
            </div>
          </div>

          <!-- RAG Response Output Container -->
          <div id="rag-response-container" class="technical-card p-md rounded-xl space-y-sm min-h-[160px] flex flex-col justify-center">
            ${selectedItem ? `
              <div class="space-y-xs">
                <span class="font-label-sm text-secondary uppercase tracking-widest">${selectedItem.category}</span>
                <h4 class="font-headline-md text-on-surface">${selectedItem.title}</h4>
                <p class="font-body-md text-on-surface-variant whitespace-pre-line">${selectedItem.content}</p>
              </div>
            ` : `
              <div class="text-center text-on-surface-variant py-md">
                <span class="material-symbols-outlined text-[36px] text-primary/40 mb-xs">auto_awesome</span>
                <p class="font-body-md">Select a quick query above or type your question below to search the hardware & maintenance knowledge base.</p>
              </div>
            `}
          </div>

          <!-- Knowledge Base Index -->
          <div class="space-y-xs">
            <p class="font-label-sm text-label-sm text-outline uppercase tracking-wider">Knowledge Base Resources</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-xs">
              ${state.ragKnowledgeBase.map(kb => `
                <button class="kb-card text-left p-sm rounded-lg bg-surface-container border border-outline-variant/60 hover:border-secondary transition-all" data-kbid="${kb.id}">
                  <span class="font-label-sm text-[10px] text-secondary block">${kb.category}</span>
                  <span class="font-data-md text-[12px] text-on-surface font-semibold line-clamp-2">${kb.title}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-md bg-surface-container-low border-t border-outline-variant">
          <form id="rag-form" class="flex gap-sm">
            <div class="relative flex-1">
              <input id="rag-input" class="w-full bg-surface-container-lowest border border-outline-variant text-on-surface rounded-xl pl-md pr-xl py-sm font-body-md focus:border-secondary focus:outline-none transition-all placeholder:text-outline/50" placeholder="Ask AI about energy consumption, sensor pins, maintenance..." type="text" />
            </div>
            <button type="submit" class="px-lg py-sm bg-secondary text-on-secondary font-headline-md text-[14px] rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs">
              <span>Ask RAG</span>
              <span class="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function bindRagModalEvents() {
  const btnClose = document.getElementById('btn-close-rag');
  if (btnClose) {
    btnClose.addEventListener('click', () => store.toggleRagModal(false));
  }

  // Quick Chips
  document.querySelectorAll('.rag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const q = e.currentTarget.getAttribute('data-query');
      if (q) executeRagQuery(q);
    });
  });

  // KB Card select
  document.querySelectorAll('.kb-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const kbid = e.currentTarget.getAttribute('data-kbid');
      const state = store.getState();
      const kb = state.ragKnowledgeBase.find(item => item.id === kbid);
      if (kb) store.toggleRagModal(true, kb);
    });
  });

  // Form submit
  const form = document.getElementById('rag-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('rag-input');
      if (input && input.value.trim()) {
        executeRagQuery(input.value.trim());
        input.value = '';
      }
    });
  }
}

function executeRagQuery(queryText) {
  const container = document.getElementById('rag-response-container');
  if (!container) return;

  // Render loading state
  container.innerHTML = `
    <div class="flex items-center justify-center gap-sm py-lg">
      <div class="w-3 h-3 rounded-full bg-secondary animate-bounce"></div>
      <div class="w-3 h-3 rounded-full bg-primary animate-bounce" style="animation-delay: 0.1s"></div>
      <div class="w-3 h-3 rounded-full bg-secondary animate-bounce" style="animation-delay: 0.2s"></div>
      <span class="font-label-sm text-on-surface-variant ml-xs">Querying RAG Vector Index & LLM...</span>
    </div>
  `;

  setTimeout(() => {
    const result = queryRagAssistant(queryText);
    container.innerHTML = `
      <div class="space-y-sm animate-fadeIn">
        <div class="flex justify-between items-center border-b border-outline-variant/40 pb-xs">
          <span class="font-label-sm text-secondary font-bold uppercase tracking-wider flex items-center gap-xs">
            <span class="material-symbols-outlined text-[16px]">verified</span> RAG Verified Response
          </span>
          <span class="font-data-md text-[11px] text-outline">${result.timestamp}</span>
        </div>
        <p class="font-body-md text-on-surface whitespace-pre-line leading-relaxed">${result.response}</p>
        ${result.citations.length ? `
          <div class="pt-xs flex items-center gap-xs text-[11px] text-outline font-data-md">
            <span class="material-symbols-outlined text-[14px]">menu_book</span>
            <span>Retrieved Sources: ${result.citations.join(', ')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }, 400);
}
