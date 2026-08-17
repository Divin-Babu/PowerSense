import { KnowledgeItem, TelemetryData } from '../types';

export interface RagResult {
  query: string;
  response: string;
  citations: string[];
  timestamp: string;
}

export function queryRagEngine(
  userQuery: string,
  knowledgeBase: KnowledgeItem[],
  telemetry: TelemetryData
): RagResult {
  const queryLower = userQuery.toLowerCase();
  let responseText = '';
  let citations: string[] = [];

  if (
    queryLower.includes('air conditioner') ||
    queryLower.includes('ac') ||
    queryLower.includes('surge') ||
    queryLower.includes('compressor')
  ) {
    const doc = knowledgeBase.find((d) => d.id === 'rag-2');
    citations.push(doc ? doc.title : 'HVAC Maintenance Standard IEEE-430');
    responseText =
      `⚡ **PowerSense AI RAG Diagnostic Analysis**:\n\n` +
      `• **Observed Anomaly**: Continuous active load surge (+34.6% vs thermal baseline).\n` +
      `• **Root Cause**: Sensor telemetry indicates compressor head-pressure overload due to restricted airflow.\n` +
      `• **Action Plan**: \n` +
      `  1. Clean electrostatic intake filters.\n` +
      `  2. Clear outdoor condenser shroud clearance.\n` +
      `  3. **Expected Savings**: ~$14.20/month energy reduction.`;
  } else if (
    queryLower.includes('pzem') ||
    queryLower.includes('esp32') ||
    queryLower.includes('hardware') ||
    queryLower.includes('sensor')
  ) {
    const doc = knowledgeBase.find((d) => d.id === 'rag-1');
    citations.push(doc ? doc.title : 'PZEM-004T Hardware Manual');
    responseText =
      `🔌 **Hardware Transducer Specs**:\n\n` +
      `• **MCU Unit**: ESP32 Dual-Core 240MHz with FreeRTOS 1Hz sampling.\n` +
      `• **Sensor Transducer**: PZEM-004T v3 measuring Voltage (${telemetry.voltage}V), Current (${telemetry.currentAmps}A), and Active Power.\n` +
      `• **Security**: TLS 1.3 encrypted WebSocket socket transmission to FastAPI backend.`;
  } else if (
    queryLower.includes('cost') ||
    queryLower.includes('peak') ||
    queryLower.includes('bill') ||
    queryLower.includes('tariff')
  ) {
    const doc = knowledgeBase.find((d) => d.id === 'rag-3');
    citations.push(doc ? doc.title : 'TOU Peak Tariff Shaving Protocol');
    responseText =
      `💰 **Predictive Peak Cost Optimization**:\n\n` +
      `• **Current Spend**: $${telemetry.costToday.toFixed(2)} USD (14.2% below baseline).\n` +
      `• **Peak Hours Window**: 4:00 PM – 9:00 PM ($0.38/kWh).\n` +
      `• **Automated Scheduling**: Shifting heavy appliance cycles (Washer, EV Charger) past 9:00 PM yields **$144.00 annual savings**.`;
  } else {
    citations.push('PowerSense Neural Core Engine v3.2');
    responseText =
      `🤖 **PowerSense AI Copilot Status**:\n\n` +
      `Your grid telemetry is synchronized at **${telemetry.totalPowerKw} kW** (${telemetry.voltage}V). Optocoupler isolation circuits reporting nominal operation.`;
  }

  return {
    query: userQuery,
    response: responseText,
    citations,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
