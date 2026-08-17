import { AppState } from '../types';

let tickerInterval: ReturnType<typeof setInterval> | null = null;

export function startTelemetryStream(
  getState: () => AppState,
  setState: (fn: (prev: AppState) => AppState) => void
) {
  if (tickerInterval) return;

  tickerInterval = setInterval(() => {
    setState((state) => {
      const current = state.telemetry;
      const noiseKw = (Math.random() - 0.5) * 0.04;
      const noiseVoltage = (Math.random() - 0.5) * 0.6;
      const noiseAmps = (Math.random() - 0.5) * 0.12;

      const newTotalKw = Math.max(0.1, parseFloat((current.totalPowerKw + noiseKw).toFixed(2)));
      const newVoltage = parseFloat((current.voltage + noiseVoltage).toFixed(1));
      const newAmps = Math.max(0.5, parseFloat((current.currentAmps + noiseAmps).toFixed(2)));
      const newCumulative = parseFloat((current.cumulativeKwh + 0.001).toFixed(3));
      const newCost = parseFloat((current.costToday + 0.0002).toFixed(3));

      const updatedAppliances = state.appliances.map((app) => {
        if (app.status === 'Active') {
          const delta = Math.floor((Math.random() - 0.5) * 6);
          const nextWatts = Math.max(10, app.watts + delta);
          const newHist = [...app.history.slice(1), Math.min(100, Math.max(10, Math.round(nextWatts / 10)))];
          return { ...app, watts: nextWatts, history: newHist };
        }
        return app;
      });

      return {
        ...state,
        telemetry: {
          ...current,
          totalPowerKw: newTotalKw,
          voltage: newVoltage,
          currentAmps: newAmps,
          cumulativeKwh: newCumulative,
          costToday: newCost
        },
        appliances: updatedAppliances
      };
    });
  }, 2500);
}

export function stopTelemetryStream() {
  if (tickerInterval) {
    clearInterval(tickerInterval);
    tickerInterval = null;
  }
}
