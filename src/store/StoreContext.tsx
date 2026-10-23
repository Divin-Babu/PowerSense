import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, Appliance, AlertItem, KnowledgeItem, SinglePlugData, SinglePlugLoadPreset, PlugSchedule, TimerState } from '../types';
import { getThemeColors, ThemePalette, ThemeMode } from '../theme/colors';

import {
  fetchLiveTelemetry,
  sendEsp32RelayCommand,
  fetchDashboardData,
  fetchAlertsData,
  fetchKnowledgeData,
  createInAppNotificationApi,
  fetchUserSchedules,
  createUserSchedule,
  updateUserSchedule,
  deleteUserSchedule,
} from '../services/api';
import { setupSystemNotifications, triggerSystemNotification } from '../services/notificationService';

// ─── Default Smart Schedules & Timer Initial ──────────────────────────────────

const DEFAULT_SCHEDULES: PlugSchedule[] = [];

const INITIAL_TIMER: TimerState = {
  active: false,
  targetState: 'OFF',
  totalSeconds: 0,
  secondsRemaining: 0,
  label: 'Inactive',
};

// ─── Initial Single-Plug Data ──────────────────────────────────────────────────

const INITIAL_SINGLE_PLUG: SinglePlugData = {
  id: 'single-plug-01',
  nodeId: 'ESP32-PZEM-PLUG-10A',
  name: 'PowerSense Smart Plug Node',
  relayState: 'OFF',
  relay1State: 'OFF',
  relay2State: 'OFF',
  powerSource: 'HLK-PM01 5V AC-DC',
  selectedLoadId: 'esp32-node',
  connectedLoadName: 'Living Room Smart Plug',
  connectedLoadCategory: 'ESP32 PZEM-004T Smart Plug',
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
  } catch (e) { }
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
  inAppToast: {
    visible: boolean;
    title: string;
    message?: string;
    type: 'info' | 'success' | 'warning' | 'critical';
  } | null;
  showInAppNotification: (title: string, message?: string, type?: 'info' | 'success' | 'warning' | 'critical') => void;
  dismissInAppToast: () => void;
  refreshUserData: (email?: string) => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  togglePlugRelay: () => void;
  togglePlugRelayChannel: (channel: 'CH1' | 'CH2' | 'BOTH') => void;
  setPlugRelayState: (targetState: 'ON' | 'OFF') => void;
  selectPlugPreset: (presetId: string) => void;
  triggerSimulatedAnomaly: () => void;
  simulateLowVoltage: (voltage?: number) => void;
  dismissAlert: (id: string) => void;
  login: (email: string, name?: string, role?: string, phone?: string) => void;
  registerUser: (name: string, email: string, phone?: string) => void;
  updateUserProfile: (updatedData: { name?: string; full_name?: string; phone?: string }) => void;
  logout: () => void;
  // Schedule & Timer
  schedules: PlugSchedule[];
  timer: TimerState;
  startTimer: (minutes: number, targetState: 'ON' | 'OFF') => void;
  cancelTimer: () => void;
  addMinutesToTimer: (minutes: number) => void;
  addSchedule: (schedule: Omit<PlugSchedule, 'id'>) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  updateSchedule: (id: string, updated: Partial<PlugSchedule>) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    ...INITIAL_STATE,
    schedules: DEFAULT_SCHEDULES,
    timer: INITIAL_TIMER,
  });
  const [schedules, setSchedules] = useState<PlugSchedule[]>(DEFAULT_SCHEDULES);
  const [timer, setTimer] = useState<TimerState>(INITIAL_TIMER);
  const [inAppToast, setInAppToast] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type: 'info' | 'success' | 'warning' | 'critical';
  } | null>(null);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTriggeredScheduleRef = useRef<{ [key: string]: number }>({});
  const userEmailRef = useRef<string | undefined>(state.user?.email);
  const voltageAlertStateRef = useRef<'normal' | 'low' | 'high'>('normal');
  const lastVoltageAlertTimeRef = useRef<number>(0);

  useEffect(() => {
    userEmailRef.current = state.user?.email;
  }, [state.user?.email]);

  useEffect(() => {
    setupSystemNotifications().catch(() => {});
  }, []);

  const showInAppNotification = (title: string, message?: string, type: 'info' | 'success' | 'warning' | 'critical' = 'info') => {
    setInAppToast({ visible: true, title, message, type });
    const newAlert: AlertItem = {
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      type: type === 'critical' ? 'error' : type === 'warning' ? 'warning' : 'info',
      title,
      description: message || title,
      actionable: false,
    };
    setState((s) => ({ ...s, alerts: [newAlert, ...s.alerts] }));
    createInAppNotificationApi({
      user_email: userEmailRef.current || state.user?.email,
      title,
      message,
      notification_type: type
    }).catch(() => {});

    // Native heads-up mobile notification in status bar across all apps
    triggerSystemNotification({
      title,
      message: message || title,
      type: type === 'critical' ? 'alert' : type === 'warning' ? 'warning' : 'info',
    }).catch(() => {});
  };

  const dismissInAppToast = () => {
    setInAppToast(null);
  };

  useEffect(() => {
    if (!inAppToast) return;
    const t = setTimeout(() => {
      setInAppToast(null);
    }, 4500);
    return () => clearTimeout(t);
  }, [inAppToast]);

  // User-scoped data fetcher
  const loadUserData = async (email?: string) => {
    try {
      const targetEmail = email || state.user?.email;
      const [dashData, alertsData, kbData, schedsData]: [any, any, any, any] = await Promise.all([
        fetchDashboardData(targetEmail),
        fetchAlertsData('all', targetEmail),
        fetchKnowledgeData(),
        fetchUserSchedules(targetEmail),
      ]);

      if (Array.isArray(schedsData)) {
        setSchedules(schedsData);
        try {
          const g = globalThis as any;
          if (typeof g !== 'undefined' && g.localStorage) {
            g.localStorage.setItem('powersense_schedules', JSON.stringify(schedsData));
          }
        } catch (e) { }
      }

      setState((prev) => {
        const next = { ...prev };
        if (dashData?.live) {
          const isLiveOnline = dashData.live.status === 'ONLINE';
          next.telemetry = {
            ...next.telemetry,
            voltage: isLiveOnline && dashData.live.voltage !== undefined ? dashData.live.voltage : 0.0,
            currentAmps: isLiveOnline && dashData.live.current !== undefined ? dashData.live.current : 0.0,
            totalPowerKw: isLiveOnline && dashData.live.watts !== undefined ? dashData.live.watts / 1000.0 : 0.0,
            powerFactor: isLiveOnline && dashData.live.power_factor !== undefined ? dashData.live.power_factor : 0.0,
            cumulativeKwh: dashData.today_usage?.kwh !== undefined ? dashData.today_usage.kwh : next.telemetry.cumulativeKwh,
            costToday: dashData.bill_estimate?.amount ? dashData.bill_estimate.amount / 30.0 : next.telemetry.costToday,
            gridStatus: isLiveOnline ? "ONLINE" : "STANDBY (ESP32 OFFLINE)",
          };
          next.singlePlug = {
            ...next.singlePlug,
            watts: isLiveOnline && dashData.live.watts !== undefined ? dashData.live.watts : 0.0,
            relayState: isLiveOnline ? (dashData.live.relay_state || 'OFF') : 'OFF',
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
          next.ragKnowledgeBase = kbData.documents.map((d: any) => ({
            id: String(d.id),
            title: d.title,
            category: d.category,
            content: d.content,
          }));
        }
        return next;
      });
    } catch (e) {
      console.log('[Store] DB fetch fallback:', e);
    }
  };

  const refreshUserData = async (email?: string) => {
    await loadUserData(email);
  };

  // Initial database data fetcher on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Sync with live telemetry periodically (1.0 Hz hardware stream rate)
  useEffect(() => {
    const sync = async () => {
      try {
        const live: any = await fetchLiveTelemetry();
        if (live) {
          const v = live.voltage !== undefined ? Number(live.voltage) : undefined;
          if (v !== undefined && v > 0) {
            const now = Date.now();
            const MIN_OPERATING_V = 50.0;
            const LOW_VOLTAGE_THRESHOLD = 205.0;
            const HIGH_VOLTAGE_THRESHOLD = 250.0;
            const ALERT_COOLDOWN_MS = 60000;

            if (v > MIN_OPERATING_V && v < LOW_VOLTAGE_THRESHOLD) {
              if (
                voltageAlertStateRef.current !== 'low' ||
                now - lastVoltageAlertTimeRef.current > ALERT_COOLDOWN_MS
              ) {
                voltageAlertStateRef.current = 'low';
                lastVoltageAlertTimeRef.current = now;
                showInAppNotification(
                  'Low Voltage Warning',
                  `Mains voltage dropped to ${v.toFixed(1)}V (< ${LOW_VOLTAGE_THRESHOLD}V). Brownout condition detected; appliances may experience stress.`,
                  'warning'
                );
              }
            } else if (v >= HIGH_VOLTAGE_THRESHOLD) {
              if (
                voltageAlertStateRef.current !== 'high' ||
                now - lastVoltageAlertTimeRef.current > ALERT_COOLDOWN_MS
              ) {
                voltageAlertStateRef.current = 'high';
                lastVoltageAlertTimeRef.current = now;
                showInAppNotification(
                  'Overvoltage Surge Alert',
                  `Mains voltage spiked to ${v.toFixed(1)}V (≥ ${HIGH_VOLTAGE_THRESHOLD}V). Disconnect load to prevent damage!`,
                  'critical'
                );
              }
            } else if (v >= LOW_VOLTAGE_THRESHOLD && v < HIGH_VOLTAGE_THRESHOLD) {
              if (voltageAlertStateRef.current === 'low') {
                voltageAlertStateRef.current = 'normal';
                showInAppNotification(
                  'Voltage Restored',
                  `Line voltage normalized at ${v.toFixed(1)}V within nominal operating range.`,
                  'success'
                );
              } else if (voltageAlertStateRef.current === 'high') {
                voltageAlertStateRef.current = 'normal';
                showInAppNotification(
                  'Voltage Restored',
                  `Line voltage stabilized at ${v.toFixed(1)}V.`,
                  'success'
                );
              }
            }
          }
          const isOnline = Boolean(live && live.connected && live.status === 'ONLINE');

          setState((prev) => ({
            ...prev,
            telemetry: {
              ...prev.telemetry,
              totalPowerKw: isOnline ? parseFloat((live.power_kw || (live.power_watts ? live.power_watts / 1000.0 : 0)).toFixed(4)) : 0.0,
              voltage: isOnline && live.voltage !== undefined ? Number(live.voltage) : 0.0,
              currentAmps: isOnline && live.current !== undefined ? Number(live.current) : 0.0,
              cumulativeKwh: live.energy_kwh !== undefined ? live.energy_kwh : prev.telemetry.cumulativeKwh,
              costToday: live.cost_today !== undefined ? live.cost_today : prev.telemetry.costToday,
              gridStatus: isOnline ? (live.status || "ONLINE") : "STANDBY (ESP32 OFFLINE)",
              powerFactor: isOnline && live.power_factor !== undefined ? Number(live.power_factor) : 0.0,
              frequency: isOnline && live.frequency !== undefined ? Number(live.frequency) : 0.0,
              relay1State: isOnline ? (live.relay1_state || 'OFF') : 'OFF',
              relay2State: isOnline ? (live.relay2_state || 'OFF') : 'OFF',
              powerSource: live.power_source || prev.telemetry.powerSource || 'HLK-PM01 5V AC-DC',
            },
            singlePlug: {
              ...prev.singlePlug,
              nodeId: live.device_id || prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A',
              watts: isOnline ? (live.power_watts !== undefined ? Number(live.power_watts) : Number(((live.power_kw || 0) * 1000).toFixed(1))) : 0.0,
              relayState: isOnline ? (live.relay_state || 'OFF') : 'OFF',
              relay1State: isOnline ? (live.relay1_state || 'OFF') : 'OFF',
              relay2State: isOnline ? (live.relay2_state || 'OFF') : 'OFF',
              powerSource: live.power_source || prev.singlePlug.powerSource || 'HLK-PM01 5V AC-DC',
              connectedLoadName: live.device_name || 'ESP32 PZEM Smart Plug',
            },
          }));
        }
      } catch (e) { }
    };

    tickerRef.current = setInterval(sync, 400);
    sync(); // Run immediately on mount
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  // Hydrate session, theme, and schedules from storage on mount
  useEffect(() => {
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        const savedTheme = g.localStorage.getItem('powersense_theme');
        const savedSession = g.localStorage.getItem('powersense_session');
        const savedSchedules = g.localStorage.getItem('powersense_schedules');

        if (savedSchedules) {
          try {
            const parsedSchedules = JSON.parse(savedSchedules);
            if (Array.isArray(parsedSchedules) && parsedSchedules.length > 0) {
              setSchedules(parsedSchedules);
            }
          } catch (e) { }
        }

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
                if (parsed.user.email) {
                  loadUserData(parsed.user.email);
                }
              }
            } catch (err) { }
          }
          return updated;
        });
      }
    } catch (e) {
      console.warn('Could not restore session/theme from storage:', e);
    }
  }, []);

  // ─── 1. Countdown Timer Execution Engine (1-sec interval) ───────────────────

  useEffect(() => {
    if (!timer.active) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (!prev.active) return prev;

        if (prev.secondsRemaining <= 1) {
          // Timer finished! Execute relay switch
          const target = prev.targetState;
          setPlugRelayState(target);

          // Add notification alert
          const newAlert: AlertItem = {
            id: `timer-alt-${Date.now()}`,
            timestamp: 'Just now',
            type: 'info',
            title: `⏱️ Timer Completed: Smart Plug turned ${target}`,
            description: `Smart Plug was automatically switched ${target} by countdown timer (${prev.label}).`,
            actionable: false,
          };
          setState((s) => ({
            ...s,
            alerts: [newAlert, ...s.alerts],
          }));

          return {
            active: false,
            targetState: 'OFF',
            totalSeconds: 0,
            secondsRemaining: 0,
            label: 'Completed',
          };
        }

        return {
          ...prev,
          secondsRemaining: prev.secondsRemaining - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.active]);

  // ─── 2. Schedule Periodic Evaluation Engine (10-sec interval) ────────────────

  useEffect(() => {
    const evaluateSchedules = () => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`;
      const dayOfWeek = now.getDay(); // 0: Sun, 6: Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWeekday = !isWeekend;
      const nowTs = Date.now();

      schedules.forEach((sch) => {
        if (!sch.enabled) return;

        // Verify repeat filter
        if (sch.repeat === 'WEEKDAYS' && !isWeekday) return;
        if (sch.repeat === 'WEEKENDS' && !isWeekend) return;

        const onKey = `${sch.id}_ON_${currentTime}`;
        const offKey = `${sch.id}_OFF_${currentTime}`;

        // Trigger Turn ON Time
        if (currentTime === sch.onTime) {
          const lastTriggered = lastTriggeredScheduleRef.current[onKey] || 0;
          if (nowTs - lastTriggered > 65000) {
            lastTriggeredScheduleRef.current[onKey] = nowTs;
            setPlugRelayState('ON');

            const alertItem: AlertItem = {
              id: `sch-on-${nowTs}`,
              timestamp: 'Just now',
              type: 'info',
              title: `⏰ Schedule Triggered: ${sch.name}`,
              description: `Smart Plug turned ON automatically per schedule (${sch.onTime}).`,
              actionable: false,
            };
            setState((s) => ({ ...s, alerts: [alertItem, ...s.alerts] }));
          }
        }

        // Trigger Turn OFF Time
        if (currentTime === sch.offTime) {
          const lastTriggered = lastTriggeredScheduleRef.current[offKey] || 0;
          if (nowTs - lastTriggered > 65000) {
            lastTriggeredScheduleRef.current[offKey] = nowTs;
            setPlugRelayState('OFF');

            const alertItem: AlertItem = {
              id: `sch-off-${nowTs}`,
              timestamp: 'Just now',
              type: 'info',
              title: `⏰ Schedule Triggered: ${sch.name}`,
              description: `Smart Plug turned OFF automatically per schedule (${sch.offTime}).`,
              actionable: false,
            };
            setState((s) => ({ ...s, alerts: [alertItem, ...s.alerts] }));
          }
        }
      });
    };

    const schedInterval = setInterval(evaluateSchedules, 10000);
    evaluateSchedules(); // run once immediately
    return () => clearInterval(schedInterval);
  }, [schedules]);

  // Keep state.schedules and state.timer in sync
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      schedules,
      timer,
    }));
  }, [schedules, timer]);

  // ─── Theme Handlers ──────────────────────────────────────────────────────────

  const toggleTheme = () => {
    setState((prev) => {
      const nextTheme: ThemeMode = prev.theme === 'dark' ? 'light' : 'dark';
      try {
        const g = globalThis as any;
        if (typeof g !== 'undefined' && g.localStorage) {
          g.localStorage.setItem('powersense_theme', nextTheme);
        }
      } catch (e) { }
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
    } catch (e) { }
    setState((prev) => ({
      ...prev,
      theme: mode,
    }));
  };

  // ─── Relay & Smart Plug Controls ─────────────────────────────────────────────

  const setPlugRelayState = (nextRelay: 'ON' | 'OFF') => {
    setState((prev) => {
      sendEsp32RelayCommand(prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A', nextRelay, 'BOTH');
      return {
        ...prev,
        singlePlug: {
          ...prev.singlePlug,
          relayState: nextRelay,
          relay1State: nextRelay,
          relay2State: nextRelay,
        },
      };
    });
  };

  const togglePlugRelay = () => {
    togglePlugRelayChannel('CH1');
  };

  const togglePlugRelayChannel = (channel: 'CH1' | 'CH2' | 'BOTH') => {
    setState((prev) => {
      const curR1 = prev.singlePlug.relay1State || 'ON';
      const curR2 = prev.singlePlug.relay2State || 'OFF';
      let nextR1 = curR1;
      let nextR2 = curR2;

      if (channel === 'CH1') {
        nextR1 = curR1 === 'ON' ? 'OFF' : 'ON';
        sendEsp32RelayCommand(prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A', nextR1, 'CH1');
      } else if (channel === 'CH2') {
        nextR2 = curR2 === 'ON' ? 'OFF' : 'ON';
        sendEsp32RelayCommand(prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A', nextR2, 'CH2');
      } else if (channel === 'BOTH') {
        const anyOn = curR1 === 'ON' || curR2 === 'ON';
        nextR1 = anyOn ? 'OFF' : 'ON';
        nextR2 = anyOn ? 'OFF' : 'ON';
        sendEsp32RelayCommand(prev.singlePlug.nodeId || 'ESP32-PZEM-PLUG-10A', nextR1, 'BOTH');
      }

      const aggState = (nextR1 === 'ON' || nextR2 === 'ON') ? 'ON' : 'OFF';

      return {
        ...prev,
        singlePlug: {
          ...prev.singlePlug,
          relayState: aggState,
          relay1State: nextR1,
          relay2State: nextR2,
        },
        telemetry: {
          ...prev.telemetry,
          relay1State: nextR1,
          relay2State: nextR2,
        },
      };
    });
  };

  // ─── Timer Actions ────────────────────────────────────────────────────────────

  const startTimer = (minutes: number, targetState: 'ON' | 'OFF') => {
    const totalSecs = Math.max(1, Math.round(minutes * 60));
    const label = `${minutes} min${minutes === 1 ? '' : 's'} to Turn ${targetState}`;
    setTimer({
      active: true,
      targetState,
      totalSeconds: totalSecs,
      secondsRemaining: totalSecs,
      label,
      startedAt: Date.now(),
    });
  };

  const cancelTimer = () => {
    setTimer({
      active: false,
      targetState: 'OFF',
      totalSeconds: 0,
      secondsRemaining: 0,
      label: 'Inactive',
    });
  };

  const addMinutesToTimer = (minutes: number) => {
    setTimer((prev) => {
      if (!prev.active) return prev;
      const extraSecs = minutes * 60;
      return {
        ...prev,
        totalSeconds: prev.totalSeconds + extraSecs,
        secondsRemaining: prev.secondsRemaining + extraSecs,
      };
    });
  };

  // ─── Schedule Actions ─────────────────────────────────────────────────────────

  const saveSchedulesToStorage = (updatedList: PlugSchedule[]) => {
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.setItem('powersense_schedules', JSON.stringify(updatedList));
      }
    } catch (e) { }
  };

  const addSchedule = (newSch: Omit<PlugSchedule, 'id'>) => {
    const tempId = `sch-${Date.now()}`;
    const item: PlugSchedule = {
      ...newSch,
      id: tempId,
    };
    setSchedules((prev) => {
      const next = [item, ...prev];
      saveSchedulesToStorage(next);
      return next;
    });

    createUserSchedule({
      name: newSch.name,
      onTime: newSch.onTime,
      offTime: newSch.offTime,
      repeat: newSch.repeat,
      category: newSch.category,
      enabled: newSch.enabled,
      email: state.user?.email,
    }).then((res) => {
      if (res && res.schedule) {
        setSchedules((prev) => {
          const next = prev.map((s) => (s.id === tempId ? res.schedule : s));
          saveSchedulesToStorage(next);
          return next;
        });
      }
    }).catch((err) => {
      console.warn('Failed to save schedule to backend:', err);
    });
  };

  const toggleSchedule = (id: string) => {
    let newEnabled = false;
    setSchedules((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) {
        newEnabled = !target.enabled;
      }
      const next = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      saveSchedulesToStorage(next);
      return next;
    });
    updateUserSchedule(id, { enabled: newEnabled }).catch(() => {});
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSchedulesToStorage(next);
      return next;
    });
    deleteUserSchedule(id).catch(() => {});
  };

  const updateSchedule = (id: string, updated: Partial<PlugSchedule>) => {
    setSchedules((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updated } : s));
      saveSchedulesToStorage(next);
      return next;
    });
    updateUserSchedule(id, updated).catch(() => {});
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

  const simulateLowVoltage = (customVoltage: number = 194.5) => {
    setState((prev) => {
      const isCurrentlyLow = prev.telemetry.voltage > 50 && prev.telemetry.voltage < 205;
      const targetVoltage = isCurrentlyLow ? 230.8 : customVoltage;
      const isRelayOn = prev.singlePlug.relayState === 'ON';
      const targetWatts = isRelayOn ? (isCurrentlyLow ? 215 : 160) : 0;
      const targetAmps = isRelayOn ? parseFloat((targetWatts / targetVoltage).toFixed(2)) : 0.0;

      if (!isCurrentlyLow) {
        voltageAlertStateRef.current = 'low';
        lastVoltageAlertTimeRef.current = Date.now();
        showInAppNotification(
          'Low Voltage Warning',
          `Mains line voltage dropped to ${targetVoltage}V (< 205V). Brownout conditions active; sensitive equipment at risk!`,
          'warning'
        );
      } else {
        voltageAlertStateRef.current = 'normal';
        showInAppNotification(
          'Voltage Restored',
          `Line voltage stabilized at ${targetVoltage}V within nominal operating range.`,
          'success'
        );
      }

      return {
        ...prev,
        telemetry: {
          ...prev.telemetry,
          voltage: targetVoltage,
          currentAmps: targetAmps,
          totalPowerKw: parseFloat((targetWatts / 1000).toFixed(4)),
        },
        singlePlug: {
          ...prev.singlePlug,
          watts: targetWatts,
        },
      };
    });
  };

  const dismissAlert = (id: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((a) => a.id !== id),
    }));
  };

  const login = (email: string, name?: string, role?: string, phone?: string) => {
    const roleVal = role || (email.toLowerCase().includes('admin') ? 'admin' : 'user');
    const rawUser = email.split('@')[0];
    const fallbackName = email === 'divin@gmail.com' ? 'Divin Babu' : (rawUser.charAt(0).toUpperCase() + rawUser.slice(1));
    const displayName = name || fallbackName;

    const userObj = {
      name: displayName,
      full_name: displayName,
      email: email.toLowerCase().trim(),
      phone: phone || '+91 98765 43210',
      role: roleVal,
      nodeId: 'ESP32-PZEM-PLUG-10A',
      firmware: 'v3.2.0-single-plug',
    };

    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.setItem('powersense_session', JSON.stringify({
          isLoggedIn: true,
          user: userObj,
          savedAt: new Date().toISOString(),
        }));
      }
    } catch (e) { }

    setState((prev) => ({
      ...prev,
      isLoggedIn: true,
      user: userObj,
    }));

    loadUserData(userObj.email);
    showInAppNotification('Welcome Back', `Logged in as ${displayName}.`, 'success');
  };

  const registerUser = (name: string, email: string, phone?: string) => {
    login(email, name, 'user', phone);
  };

  const logout = () => {
    setSchedules([]);
    try {
      const g = globalThis as any;
      if (typeof g !== 'undefined' && g.localStorage) {
        g.localStorage.removeItem('powersense_session');
        g.localStorage.removeItem('powersense_schedules');
      }
    } catch (e) { }

    setState((prev) => ({
      ...prev,
      isLoggedIn: false,
      user: {
        name: '',
        full_name: '',
        email: '',
        role: 'user',
        nodeId: 'ESP32-PZEM-PLUG-10A',
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
      } catch (e) { }

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
        inAppToast,
        showInAppNotification,
        dismissInAppToast,
        refreshUserData,
        toggleTheme,
        setTheme,
        togglePlugRelay,
        togglePlugRelayChannel,
        setPlugRelayState,
        selectPlugPreset,
        triggerSimulatedAnomaly,
        simulateLowVoltage,
        dismissAlert,
        login,
        registerUser,
        updateUserProfile,
        logout,
        // Schedule and Timer
        schedules,
        timer,
        startTimer,
        cancelTimer,
        addMinutesToTimer,
        addSchedule,
        toggleSchedule,
        deleteSchedule,
        updateSchedule,
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
