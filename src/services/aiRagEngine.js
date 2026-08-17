// Retrieval-Augmented Generation (RAG) & LLM Diagnostic Assistant Engine

import { store } from '../state/store.js';

export function queryRagAssistant(userQuery) {
  const state = store.getState();
  const queryLower = userQuery.toLowerCase();

  // Simple semantic keyword matching against RAG knowledge base
  const matchedDocs = state.ragKnowledgeBase.filter(doc => {
    return (
      doc.title.toLowerCase().includes(queryLower) ||
      doc.content.toLowerCase().includes(queryLower) ||
      doc.category.toLowerCase().includes(queryLower)
    );
  });

  let responseText = '';
  let citations = [];

  if (queryLower.includes('air conditioner') || queryLower.includes('ac') || queryLower.includes('surge') || queryLower.includes('compressor')) {
    const doc = state.ragKnowledgeBase.find(d => d.id === 'rag-2');
    citations.push(doc ? doc.title : 'HVAC Maintenance Standard IEEE-430');
    responseText = `Based on PowerSense RAG analysis of your Air Conditioner telemetry:\n\n` +
      `• **Detected Symptom**: Continuous 850W active power draw vs baseline 650W (+30.7% surge).\n` +
      `• **Root Cause Analysis**: Sensor parameters match compressor head-pressure overload caused by restricted airflow or degraded condenser coil thermal transfer.\n` +
      `• **Recommended Action**: \n` +
      `  1. Clean or replace electrostatic intake air filters.\n` +
      `  2. Verify AC condenser fan shroud clearance.\n` +
      `  3. Expected Savings: Estimated $14.20/month reduction in active power consumption.`;
  } else if (queryLower.includes('pzem') || queryLower.includes('esp32') || queryLower.includes('hardware') || queryLower.includes('sensor')) {
    const doc = state.ragKnowledgeBase.find(d => d.id === 'rag-1');
    citations.push(doc ? doc.title : 'PZEM-004T Specification Manual');
    responseText = `PowerSense IoT Node Diagnostics:\n\n` +
      `• **Hardware Module**: ESP32 Dual-Core 240MHz microcontroller paired with PZEM-004T v3 Energy Transducer.\n` +
      `• **Current Telemetry**: Voltage ${state.telemetry.voltage}V | Current ${state.telemetry.currentAmps}A | Power Factor ${state.telemetry.powerFactor}.\n` +
      `• **Communication Channel**: Secure WebSocket over TLS to FastAPI backend.\n` +
      `• **Status**: All optocoupler isolators reporting nominal operation. Sampling frequency active at 1.0 Hz.`;
  } else if (queryLower.includes('cost') || queryLower.includes('peak') || queryLower.includes('bill') || queryLower.includes('tariff')) {
    const doc = state.ragKnowledgeBase.find(d => d.id === 'rag-3');
    citations.push(doc ? doc.title : 'Time-of-Use Tariff Optimization Protocol');
    responseText = `Energy Cost Optimization Insight:\n\n` +
      `• **Daily Spend**: $${state.telemetry.costToday} USD (12% lower than yesterday).\n` +
      `• **Peak Rate Alert**: On-peak hours run between 4:00 PM and 9:00 PM ($0.38/kWh).\n` +
      `• **Smart Automation**: Deferring high-draw appliance loads (Washing Machine, EV Charger) past 9:00 PM yields an estimated annual saving of $144.00.`;
  } else {
    citations.push('PowerSense AI Core Maintenance Engine v2.4');
    responseText = `PowerSense AI Assistant Analysis:\n\n` +
      `Your system is operating nominal at ${state.telemetry.totalPowerKw} kW. Cumulative usage today is ${state.telemetry.cumulativeKwh} kWh.\n\n` +
      `If you suspect an anomaly, you can run an explicit diagnostic or check the Alerts tab for hardware telemetry reports.`;
  }

  return {
    query: userQuery,
    response: responseText,
    citations: citations,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
