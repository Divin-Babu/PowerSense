// IoT ESP32 & PZEM-004T Telemetry Generator

import { store } from '../state/store.js';

let simulatorInterval = null;

export function startIoTSimulator() {
  if (simulatorInterval) return;

  simulatorInterval = setInterval(() => {
    const state = store.getState();
    if (!state.isLoggedIn) return;

    // Small realistic noise adjustments
    const currentTelemetry = state.telemetry;
    const isAnomaly = state.simulatedAnomalyActive;

    const noiseKw = (Math.random() - 0.5) * 0.04;
    const noiseVoltage = (Math.random() - 0.5) * 0.8;
    const noiseAmps = (Math.random() - 0.5) * 0.15;

    const newTotalKw = Math.max(0.1, parseFloat((currentTelemetry.totalPowerKw + noiseKw).toFixed(2)));
    const newVoltage = parseFloat((currentTelemetry.voltage + noiseVoltage).toFixed(1));
    const newAmps = Math.max(0.5, parseFloat((currentTelemetry.currentAmps + noiseAmps).toFixed(2)));
    
    // Increment cumulative kWh slightly
    const newCumulative = parseFloat((currentTelemetry.cumulativeKwh + 0.001).toFixed(3));
    const newCost = parseFloat((currentTelemetry.costToday + 0.0002).toFixed(3));

    // Update active appliances with small random fluctuations
    const updatedAppliances = state.appliances.map(app => {
      if (app.status === 'Active') {
        const delta = Math.floor((Math.random() - 0.5) * 6);
        const nextWatts = Math.max(10, app.watts + delta);
        
        // Push new value into historical sparkline array
        const newHist = [...app.history.slice(1), Math.min(100, Math.max(10, Math.round(nextWatts / 10)))];
        return { ...app, watts: nextWatts, history: newHist };
      }
      return app;
    });

    store.setState({
      telemetry: {
        ...currentTelemetry,
        totalPowerKw: newTotalKw,
        voltage: newVoltage,
        currentAmps: newAmps,
        cumulativeKwh: newCumulative,
        costToday: newCost
      },
      appliances: updatedAppliances
    });

  }, 3000);
}

export function stopIoTSimulator() {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
}
