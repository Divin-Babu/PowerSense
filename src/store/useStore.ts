import { useState, useEffect } from 'react';
import { AppState, ScreenType, KnowledgeItem, Appliance, SinglePlugData } from '../types';
import { startTelemetryStream } from '../services/telemetrySimulator';

const initialSinglePlug: SinglePlugData = {
  id: 'single-plug-01',
  nodeId: 'ESP32-PZEM-PLUG-10A',
  name: 'PowerSense AI Smart Plug (10A Max Rating)',
  relayState: 'OFF',
  selectedLoadId: 'preset-fan',
  connectedLoadName: 'High-Speed Ceiling Fan',
  connectedLoadCategory: 'Cooling / Light Load (0.28A)',
  emoji: '🌀',
  icon: 'mode_fan',
  watts: 0,
  baselineWatts: 65,
  isAnomaly: false,
  anomalyReason: undefined,
  history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  presets: [
    {
      id: 'preset-fan',
      name: 'High-Speed Ceiling Fan',
      category: 'Cooling / Light Load (0.28A)',
      emoji: '🌀',
      icon: 'mode_fan',
      baselineWatts: 65,
    },
    {
      id: 'preset-tv',
      name: 'Smart TV & Audio System',
      category: 'Media Electronics (0.52A)',
      emoji: '📺',
      icon: 'tv',
      baselineWatts: 120,
    },
    {
      id: 'preset-fridge',
      name: 'Single-Door Refrigerator',
      category: 'Kitchen Appliance (0.61A)',
      emoji: '🧊',
      icon: 'kitchen',
      baselineWatts: 140,
    },
    {
      id: 'preset-workstation',
      name: 'Workstation PC & Monitor',
      category: 'Computing / Electronics (0.78A)',
      emoji: '💻',
      icon: 'desktop_windows',
      baselineWatts: 180,
    },
    {
      id: 'preset-cooler',
      name: 'Desert Air Cooler',
      category: 'Climate & Airflow (0.91A)',
      emoji: '💨',
      icon: 'air',
      baselineWatts: 210,
    },
    {
      id: 'preset-kettle',
      name: 'Electric Kettle (10A Safe)',
      category: 'Thermal Utility (5.21A)',
      emoji: '🫖',
      icon: 'local_cafe',
      baselineWatts: 1200,
    },
  ],
};

const initialAppState: AppState = {
  isLoggedIn: false,
  currentScreen: 'dashboard',
  user: {
    name: '',
    email: '',
    role: 'user',
    nodeId: 'ESP32-PZEM-PLUG-01',
    firmware: 'v3.2.0-single-plug',
  },
  telemetry: {
    totalPowerKw: 0.00,
    costToday: 0.00,
    vsYesterday: 0.0,
    voltage: 230.8,
    currentAmps: 0.00,
    powerFactor: 0.00,
    frequency: 50.01,
    cumulativeKwh: 49.2,
    gridStatus: 'OPTIMAL (NO LOAD CONNECTED)',
    hardwareStatus: 'ESP32 Single-Plug Node (Wi-Fi 802.11n)',
    wifiRssi: -62,
    peakTariffActive: false,
    peakCountdown: '03:42:15',
  },
  singlePlug: initialSinglePlug,
  appliances: [
    {
      id: 'app-2',
      name: 'Air Conditioner (1.5 Ton)',
      category: 'Climate',
      icon: 'ac_unit',
      watts: 0,
      baselineWatts: 850,
      status: 'Idle',
      isAnomaly: false,
      anomalyReason: undefined,
      history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  ],
  alerts: [
    {
      id: 'alt-201',
      timestamp: '08 mins ago',
      type: 'error',
      title: 'Smart Plug Compressor Surge',
      description: 'PZEM-004T sensor detected continuous 875W load exceeding baseline.',
      actionable: true,
      actionText: 'Diagnose via AI',
    },
  ],
  ragKnowledgeBase: [
    {
      id: 'rag-1',
      title: 'PZEM-004T & ESP32 Hardware Diagnostics',
      category: 'Hardware Specs',
      content: 'The PZEM-004T v3 module communicates via TTL serial to ESP32 pins RX/TX. It samples AC voltage, current, active power, and energy.',
    },
  ],
  simulatedAnomalyActive: false,
  isCopilotModalOpen: false,
  isSimulatorModalOpen: false,
  selectedKnowledgeItem: null,
};

// Global reactive state container
let globalState: AppState = { ...initialAppState };
const listeners = new Set<(state: AppState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(globalState);
  }
}

export function useStore() {
  const [state, setState] = useState<AppState>(globalState);

  useEffect(() => {
    const handler = (newState: AppState) => setState(newState);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  useEffect(() => {
    startTelemetryStream(
      () => globalState,
      (fn) => {
        globalState = fn(globalState);
        notify();
      }
    );
  }, []);

  const setScreen = (screen: ScreenType) => {
    globalState = { ...globalState, currentScreen: screen };
    notify();
  };

  const toggleAppliance = (appId: string) => {
    const updated = globalState.appliances.map((app) => {
      if (app.id === appId) {
        const nextStatus = (app.status === 'Active' ? 'Idle' : 'Active') as Appliance['status'];
        const nextWatts = nextStatus === 'Active' ? app.baselineWatts : 0;
        return { ...app, status: nextStatus, watts: nextWatts };
      }
      return app;
    });

    const totalWatts = updated.reduce((acc, a) => acc + a.watts, 0);
    const newKw = parseFloat((totalWatts / 1000).toFixed(2));

    globalState = {
      ...globalState,
      appliances: updated,
      telemetry: { ...globalState.telemetry, totalPowerKw: newKw },
    };
    notify();
  };

  const triggerSimulatedAnomaly = () => {
    const isCurrentlyActive = globalState.simulatedAnomalyActive;
    if (!isCurrentlyActive) {
      globalState = {
        ...globalState,
        simulatedAnomalyActive: true,
        singlePlug: {
          ...globalState.singlePlug,
          watts: 1490,
          isAnomaly: true,
          anomalyReason: 'CRITICAL: Severe power surge (+75% baseline).',
        },
        telemetry: {
          ...globalState.telemetry,
          totalPowerKw: 1.49,
          voltage: 248.8,
          currentAmps: 5.98,
          powerFactor: 0.81,
        },
      };
    } else {
      globalState = {
        ...globalState,
        simulatedAnomalyActive: false,
        singlePlug: {
          ...globalState.singlePlug,
          watts: globalState.singlePlug.baselineWatts,
          isAnomaly: false,
          anomalyReason: undefined,
        },
        telemetry: {
          ...globalState.telemetry,
          totalPowerKw: parseFloat((globalState.singlePlug.baselineWatts / 1000).toFixed(2)),
          voltage: 230.8,
          currentAmps: 3.68,
          powerFactor: 0.97,
        },
      };
    }
    notify();
  };

  const toggleCopilotModal = (isOpen: boolean, selectedItem: KnowledgeItem | null = null) => {
    globalState = {
      ...globalState,
      isCopilotModalOpen: isOpen,
      selectedKnowledgeItem: selectedItem,
    };
    notify();
  };

  const toggleSimulatorModal = (isOpen: boolean) => {
    globalState = { ...globalState, isSimulatorModalOpen: isOpen };
    notify();
  };

  return {
    state,
    setScreen,
    toggleAppliance,
    triggerSimulatedAnomaly,
    toggleCopilotModal,
    toggleSimulatorModal,
  };
}
