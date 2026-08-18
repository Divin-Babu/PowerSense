import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, Appliance, AlertItem, KnowledgeItem, SinglePlugData, SinglePlugLoadPreset } from '../types';
import { getThemeColors, ThemePalette, ThemeMode } from '../theme/colors';

import {
  fetchLiveTelemetry,
  sendEsp32RelayCommand,
  fetchDashboardData,
  fetchAlertsData,
  fetchKnowledgeData
} from '../services/api';

// ─── Initial Single-Plug Data ──────────────────────────────────────────────────

const INITIAL_SINGLE_PLUG: SinglePlugData = {
  id: 'single-plug-01',
  nodeId: 'ESP32-PZEM-PLUG-10A',
  name: 'PowerSense AI Smart Plug',
  relayState: 'OFF',
  selectedLoadId: 'esp32-node',
  connectedLoadName: 'Awaiting Hardware Data',
  connectedLoadCategory: 'ESP32 PZEM-004T Sensor Node',
  emoji: '⚡',
  icon: 'flash-outline',
  watts: 0,
  baselineWatts: 0,
  isAnomaly: false,
  anomalyReason: undefined,
  history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  presets: [],
};

const getInitialTheme = (): ThemeMode => {
  try {
    const g = globalThis as any;
    if (typeof g !== 'undefined' && g.localStorage) {
      const saved = g.localStorage.getItem('powersense_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
  } catch (e) {}
  return 'light';
};

const INITIAL_STATE: AppState = {
  theme: getInitialTheme(),
  user: {
    name: '',
    email: '',
    role: 'user',
    nodeId: 'ESP32-PZEM-PLUG-10A',
    firmware: 'v3.2.0-single-plug',
  },
  telemetry: {
    totalPowerKw: 0.00,
    costToday: 0.00,
    vsYesterday: 0.0,
    voltage: 0.0,
    currentAmps: 0.00,
    powerFactor: 0.00,
    frequency: 0.00,
    cumulativeKwh: 0.00,
    gridStatus: 'STANDBY (AWAITING ESP32 HARDWARE)',
    wifiRssi: 0,
    peakTariffActive: false,
  },
  singlePlug: INITIAL_SINGLE_PLUG,
  appliances: [],
  alerts: [],
  ragKnowledgeBase: [
    {
      id: 'rag-1',
      title: 'PZEM-004T & ESP32 Smart Plug Circuit Specs',
      category: 'Hardware Specs',
      content:
        'The smart plug unit utilizes an ESP32 microcontroller interfaced with a PZEM-004T v3 sensor over TTL serial (GPIO 16/17). It reads Voltage (80-260V), Current (0-10A safe range), Active Power, and Energy. An inline safety relay allows automated load control.',
    },
    {
      id: 'rag-2',
      title: 'ESP32 & PZEM-004T Ingestion Protocol',
      category: 'Hardware Setup',
      content:
        'Connect PZEM-004T TX/RX to ESP32 HardwareSerial pins. Ensure 5V power supply and proper optocoupler isolation. The ESP32 pushes JSON telemetry payloads via HTTP POST to /api/esp32/telemetry at 1.0 Hz.',
    },
    {
      id: 'rag-3',
      title: 'Time-of-Use (TOU) Tariff & Smart Plug Optimization',
      category: 'Energy Optimization',
      content:
        'Configure tariff rates in the Admin Dashboard. The system computes real-time spend from cumulative kWh sensor telemetry, alerting you when power surges or peak tariff windows occur.',
    },
  ],
  simulatedAnomalyActive: false,
  isLoggedIn: false,
};

// ─── Context Types ───────────────────────────────────────────────────────────

interface StoreContextType {
  state: AppState;
  theme: ThemeMode;
  isDark: boolean;
  themeColors: ThemePalette;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  togglePlugRelay: () => void;
  selectPlugPreset: (presetId: string) => void;
  triggerSimulatedAnomaly: () => void;
  dismissAlert: (id: string) => void;
  login: (email: string, name?: string, role?: string, phone?: string) => void;
  registerUser: (name: string, email: string, phone?: string) => void;
  updateUserProfile: (updatedData: { name?: string; full_name?: string; phone?: string }) => void;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial database data fetcher on mount
  useEffect(() => {
    const loadInitialDbData = async () => {
      try {
        const [dashData, alertsData, kbData]: [any, any, any] = await Promise.all([
          fetchDashboardData(),
          fetchAlertsData('all'),
          fetchKnowledgeData(),
        ]);

        setState((prev) => {
          const next = { ...prev };
          if (dashData?.live) {
            next.telemetry = {
              ...next.telemetry,
              voltage: dashData.live.voltage || next.telemetry.voltage,
              currentAmps: dashData.live.current || next.telemetry.currentAmps,
              totalPowerKw: (dashData.live.watts || 0) / 1000.0,
              powerFactor: dashData.live.power_factor || next.telemetry.powerFactor,
              cumulativeKwh: dashData.today_usage?.kwh || next.telemetry.cumulativeKwh,
              costToday: dashData.bill_estimate?.amount ? dashData.bill_estimate.amount / 30.0 : next.telemetry.costToday,
            };
            next.singlePlug = {
              ...next.singlePlug,
              watts: dashData.live.watts || next.singlePlug.watts,
              relayState: dashData.live.relay_state || next.singlePlug.relayState,
            };
          }
          if (alertsData?.alerts && Array.isArray(alertsData.alerts)) {
            next.alerts = alertsData.alerts.map((a: any) => ({
              id: a.id,
              timestamp: a.time || 'Today',
              type: a.category === 'critical' ? 'error' : a.category === 'warning' ? 'warning' : 'info',
              title: a.title,
              description: a.description,
              actionable: true,
              actionText: 'View Details',
            }));
          }
          if (kbData?.documents && Array.isArray(kbData.documents)) {
            next.ragKnowledgeBase = kbData.documents;
          }
          return next;
        });
      } catch (e) {
        console.log('[Store] DB fetch fallback:', e);
      }
    };

    loadInitialDbData();
  }, []);

  // Live IoT telemetry fetcher from backend
  useEffect(() => {
    const sync = async () => {
      try {
        const live: any = await fetchLiveTelemetry();
        if (live && live.connected) {
          setState((prev) => ({
            ...prev,
            telemetry: {
              ...prev.telemetry,
              totalPowerKw: live.power_kw || 0.0,
              costToday: live.cost_today || 0.0,
              voltage: live.voltage || 0.0,
              currentAmps: live.current || 0.0,
              powerFactor: live.power_factor || 0.0,
              frequency: live.frequency || 0.0,
              cumulativeKwh: live.energy_kwh || 0.0,
              gridStatus: 'ONLINE (ESP32 Live Stream)',
              wifiRssi: live.rssi || -60,
            },
            singlePlug: {
              ...prev.singlePlug,
              watts: live.power_watts || (live.power_kw ? live.power_kw * 1000 : 0),
              relayState: (live.relay_state as any) || 'OFF',
              nodeId: live.device_id || prev.singlePlug.nodeId,
              connectedLoadName: live.device_name || 'ESP32 Live Monitored Load',
            },
          }));
        }
      } catch (e) {}
    };

    tickerRef.current = setInterval(sync, 2500);
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  // Hydrate session and theme from storage on mount
  useEffect(() => {
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        const savedTheme = g.localStorage.getItem('powersense_theme');
        const savedSession = g.localStorage.getItem('powersense_session');
        
        setState((prev) => {
          let updated = { ...prev };
          if (savedTheme === 'dark' || savedTheme === 'light') {
            updated.theme = savedTheme;
          }
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession);
              if (parsed && parsed.isLoggedIn && parsed.user) {
                updated.isLoggedIn = true;
                updated.user = parsed.user;
              }
            } catch (err) {}
          }
          return updated;
        });
      }
    } catch (e) {
      console.warn('Could not restore session/theme from storage:', e);
    }
  }, []);

  const toggleTheme = () => {
    setState((prev) => {
      const nextTheme: ThemeMode = prev.theme === 'dark' ? 'light' : 'dark';
      try {
        const g = globalThis as any;
        if (typeof g !== 'undefined' && g.localStorage) {
          g.localStorage.setItem('powersense_theme', nextTheme);
        }
      } catch (e) {}
      return {
        ...prev,
        theme: nextTheme,
      };
    });
  };

  const setTheme = (mode: ThemeMode) => {
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.setItem('powersense_theme', mode);
      }
    } catch (e) {}
    setState((prev) => ({
      ...prev,
      theme: mode,
    }));
  };

  const togglePlugRelay = () => {
    setState((prev) => {
      const nextRelay = prev.singlePlug.relayState === 'ON' ? 'OFF' : 'ON';
      sendEsp32RelayCommand(prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A', nextRelay);

      return {
        ...prev,
        singlePlug: {
          ...prev.singlePlug,
          relayState: nextRelay,
        },
      };
    });
  };

  const selectPlugPreset = (presetId: string) => {
    // Standby preset helper
  };

  const triggerSimulatedAnomaly = () => {
    setState((prev) => {
      if (!prev.simulatedAnomalyActive) {
        const newAlert: AlertItem = {
          id: `alt-${Date.now()}`,
          timestamp: 'Just now',
          type: 'error',
          title: '⚡ CRITICAL: Smart Plug Overload Surge',
          description: 'PZEM-004T detected continuous 1490W load surge (+75% above thermal baseline).',
          actionable: true,
          actionText: 'Diagnose via AI',
        };
        return {
          ...prev,
          simulatedAnomalyActive: true,
          alerts: [newAlert, ...prev.alerts],
          singlePlug: {
            ...prev.singlePlug,
            watts: 1490,
            isAnomaly: true,
            anomalyReason: 'CRITICAL: +75% power surge on smart plug. Severe thermal load!',
          },
          telemetry: {
            ...prev.telemetry,
            totalPowerKw: 1.49,
            voltage: 248.8,
            currentAmps: 5.98,
            powerFactor: 0.81,
          },
        };
      } else {
        return {
          ...prev,
          simulatedAnomalyActive: false,
          singlePlug: {
            ...prev.singlePlug,
            watts: prev.singlePlug.baselineWatts,
            isAnomaly: false,
            anomalyReason: undefined,
          },
          telemetry: {
            ...prev.telemetry,
            totalPowerKw: parseFloat((prev.singlePlug.baselineWatts / 1000).toFixed(2)),
            voltage: 230.8,
            currentAmps: 3.68,
            powerFactor: 0.97,
          },
        };
      }
    });
  };

  const dismissAlert = (id: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((a) => a.id !== id),
    }));
  };

  const login = (email: string, name?: string, role?: string, phone?: string) => {
    const userRole = role || (email?.toLowerCase().includes('admin') ? 'admin' : 'user');
    const dispName = name || (userRole === 'admin' ? 'System Administrator' : 'User');
    const newUser = {
      email: email || (userRole === 'admin' ? 'admin@powersense.com' : 'user@powersense.ai'),
      name: dispName,
      full_name: dispName,
      role: userRole,
      phone: phone || '',
      nodeId: 'ESP32-PZEM-PLUG-10A',
      firmware: 'v3.2.0-single-plug',
    };

    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.setItem('powersense_session', JSON.stringify({
          isLoggedIn: true,
          user: newUser,
          savedAt: new Date().toISOString(),
        }));
      }
    } catch (e) {}

    setState((prev) => ({
      ...prev,
      isLoggedIn: true,
      user: newUser,
    }));
  };

  const registerUser = (name: string, email: string, phone?: string) => {
    const dispName = name || 'User';
    const newUser = {
      name: dispName,
      full_name: dispName,
      email: email || 'user@powersense.ai',
      role: 'user',
      phone: phone || '',
      nodeId: 'ESP32-PZEM-PLUG-10A',
      firmware: 'v3.2.0-single-plug',
    };

    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.setItem('powersense_session', JSON.stringify({
          isLoggedIn: true,
          user: newUser,
          savedAt: new Date().toISOString(),
        }));
      }
    } catch (e) {}

    setState((prev) => ({
      ...prev,
      isLoggedIn: true,
      user: newUser,
    }));
  };

  const logout = () => {
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined') {
        if (g.localStorage) g.localStorage.removeItem('powersense_session');
        if (g.sessionStorage) g.sessionStorage.clear();
      }
    } catch (e) {}

    setState((prev) => ({
      ...prev,
      isLoggedIn: false,
      user: {
        name: '',
        full_name: '',
        email: '',
        role: 'user',
        nodeId: 'ESP32-PZEM-PLUG-01',
        firmware: 'v3.2.0-single-plug',
      },
    }));
  };

  const updateUserProfile = (updatedData: { name?: string; full_name?: string; phone?: string }) => {
    setState((prev) => {
      const nextName = updatedData.full_name || updatedData.name || prev.user.name;
      const nextUser = {
        ...prev.user,
        name: nextName,
        full_name: nextName,
        ...(updatedData.phone !== undefined ? { phone: updatedData.phone } : {}),
      };

      try {
        const g = globalThis as any;
        if (typeof g !== 'undefined' && g.localStorage) {
          g.localStorage.setItem('powersense_session', JSON.stringify({
            isLoggedIn: true,
            user: nextUser,
            savedAt: new Date().toISOString(),
          }));
        }
      } catch (e) {}

      return {
        ...prev,
        user: nextUser,
      };
    });
  };

  const isDark = state.theme === 'dark';
  const themeColors = getThemeColors(state.theme);

  return (
    <StoreContext.Provider
      value={{
        state,
        theme: state.theme,
        isDark,
        themeColors,
        toggleTheme,
        setTheme,
        togglePlugRelay,
        selectPlugPreset,
        triggerSimulatedAnomaly,
        dismissAlert,
        login,
        registerUser,
        updateUserProfile,
        logout,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
