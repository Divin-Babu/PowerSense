import { fetchLiveTelemetry, sendEsp32RelayCommand } from '../services/api.js';

const savedSession = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('powersense_session') : null;
const savedTheme = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('powersense_theme') : null;

let initialUser = null;
let initialLoggedIn = false;
let initialPage = 'login';

if (savedSession) {
  try {
    const parsed = JSON.parse(savedSession);
    if (parsed && parsed.isLoggedIn && parsed.user) {
      initialUser = parsed.user;
      initialLoggedIn = true;
      initialPage = parsed.user.role === 'admin' ? 'admin' : 'dashboard';
    }
  } catch (e) {
    console.warn('Failed to parse saved session:', e);
  }
}

const initialAppState = {
  theme: (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light',
  currentPage: initialPage, // 'login' | 'register' | 'dashboard' | 'admin' | 'analytics' | 'alerts' | 'profile'
  isLoggedIn: initialLoggedIn,
  user: initialUser,
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
    hardwareStatus: 'Awaiting ESP32 PZEM-004T stream',
    wifiRssi: null,
    peakTariffActive: false
  },
  singlePlug: {
    id: 'single-plug-01',
    nodeId: 'ESP32-PZEM-PLUG-10A',
    name: 'PowerSense AI Smart Plug (10A Rating)',
    relayState: 'OFF',
    connectedLoadName: 'Awaiting Hardware Data',
    connectedLoadCategory: 'ESP32 PZEM-004T Sensor Node',
    emoji: '⚡',
    icon: 'bolt',
    watts: 0,
    baselineWatts: 0,
    isAnomaly: false,
    anomalyReason: null,
    history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  appliances: [],
  alerts: [],
  ragKnowledgeBase: [
    {
      id: 'rag-1',
      title: '10A Smart Plug Relay Hardware Limits & Protection',
      category: 'Hardware Specs',
      content: 'This smart plug unit is engineered with an ESP32 MCU and PZEM-004T v3 sensor wired to an inline 10A/250V AC relay (2300W max power rating). It measures Voltage (80-260V), Current (0-10A safe range), Power, and Frequency. High-power appliances exceeding 10A must not be connected to prevent relay contact welding.'
    },
    {
      id: 'rag-2',
      title: 'ESP32 & PZEM-004T Hardware Connection Protocol',
      category: 'Hardware Setup',
      content: 'Connect PZEM-004T TX/RX to ESP32 HardwareSerial pins (GPIO16 RX, GPIO17 TX). Ensure 5V power supply and proper optocoupler isolation. The ESP32 pushes JSON telemetry payloads via HTTP POST to /api/esp32/telemetry at 1.0 Hz.'
    },
    {
      id: 'rag-3',
      title: 'Real-Time Energy Cost & Peak Shaving Optimization',
      category: 'Energy Optimization',
      content: 'Configure tariff rates in the Admin Dashboard. The system computes real-time spend from cumulative kWh sensor telemetry, alerting you when power surges or peak tariff windows occur.'
    }
  ],
  simulatedAnomalyActive: false,
  isRagModalOpen: false,
  isSimulatorModalOpen: false,
  selectedKnowledgeItem: null
};

class Store {
  constructor() {
    this.state = { ...initialAppState };
    this.listeners = new Set();

    // Apply active theme to DOM immediately
    this.applyThemeToDOM(this.state.theme);

    // Browser back/forward navigation protection
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        if (!this.state.isLoggedIn) {
          if (this.state.currentPage !== 'login' && this.state.currentPage !== 'register') {
            this.setState({ currentPage: 'login' });
          }
        }
      });

      // Expose globally for inline events
      window.toggleTheme = () => this.toggleTheme();

      // Poll live ESP32 telemetry from backend
      setInterval(() => this.syncTelemetry(), 2500);
    }
  }

  applyThemeToDOM(mode) {
    if (typeof document !== 'undefined') {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('powersense_theme', nextTheme);
      }
    } catch (e) {}

    this.applyThemeToDOM(nextTheme);
    this.setState({ theme: nextTheme });
  }

  setTheme(mode) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('powersense_theme', mode);
      }
    } catch (e) {}

    this.applyThemeToDOM(mode);
    this.setState({ theme: mode });
  }

  async syncTelemetry() {
    try {
      const live = await fetchLiveTelemetry();
      if (live && live.connected) {
        this.setState({
          telemetry: {
            ...this.state.telemetry,
            totalPowerKw: live.power_kw || 0.0,
            costToday: live.cost_today || 0.0,
            voltage: live.voltage || 0.0,
            currentAmps: live.current || 0.0,
            powerFactor: live.power_factor || 0.0,
            frequency: live.frequency || 0.0,
            cumulativeKwh: live.energy_kwh || 0.0,
            gridStatus: 'ONLINE (ESP32 Live Stream)',
            hardwareStatus: `ESP32 Active (${live.device_id || 'Node'})`,
            wifiRssi: live.rssi || -60
          },
          singlePlug: {
            ...this.state.singlePlug,
            watts: live.power_watts || (live.power_kw ? live.power_kw * 1000 : 0),
            relayState: live.relay_state || 'OFF',
            nodeId: live.device_id || this.state.singlePlug.nodeId,
            connectedLoadName: live.device_name || 'ESP32 Live Monitored Load'
          }
        });
      }
    } catch (e) {}
  }

  getState() {
    return this.state;
  }

  setState(partialState) {
    const nextState = { ...this.state, ...partialState };

    // Sync session to localStorage if authentication state changes
    if ('isLoggedIn' in partialState || 'user' in partialState) {
      if (nextState.isLoggedIn && nextState.user) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('powersense_session', JSON.stringify({
              isLoggedIn: true,
              user: nextState.user,
              savedAt: new Date().toISOString()
            }));
          }
        } catch (e) {
          console.warn('Storage sync error:', e);
        }
      } else if (partialState.isLoggedIn === false || partialState.user === null) {
        try {
          if (typeof window !== 'undefined') {
            if (window.localStorage) window.localStorage.removeItem('powersense_session');
            if (window.sessionStorage) window.sessionStorage.clear();
          }
        } catch (e) {
          console.warn('Storage clear error:', e);
        }
      }
    }

    if ('theme' in partialState) {
      this.applyThemeToDOM(nextState.theme);
    }

    this.state = nextState;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  loginSession(user) {
    const userRole = user.role || (user.email?.toLowerCase().includes('admin') ? 'admin' : 'user');
    const dispName = user.full_name || user.name || (userRole === 'admin' ? 'System Administrator' : 'User');
    const userData = {
      name: dispName,
      full_name: dispName,
      email: user.email || (userRole === 'admin' ? 'admin@powersense.com' : 'user@powersense.ai'),
      phone: user.phone || null,
      role: userRole,
      nodeId: user.nodeId || 'ESP32-PZEM-PLUG-10A',
      firmware: user.firmware || 'v3.2.0-cyber'
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('powersense_session', JSON.stringify({
          isLoggedIn: true,
          user: userData,
          savedAt: new Date().toISOString()
        }));
      }
    } catch (e) {}

    this.setState({
      isLoggedIn: true,
      user: userData,
      currentPage: userRole === 'admin' ? 'admin' : 'dashboard'
    });
  }

  updateUserProfile(data) {
    const nextName = data.full_name || data.name || this.state.user?.name;
    const updatedUser = {
      ...this.state.user,
      name: nextName,
      full_name: nextName,
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('powersense_session', JSON.stringify({
          isLoggedIn: true,
          user: updatedUser,
          savedAt: new Date().toISOString()
        }));
      }
    } catch (e) {}

    this.setState({ user: updatedUser });
  }

  logoutSession() {
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage) window.localStorage.removeItem('powersense_session');
        if (window.sessionStorage) window.sessionStorage.clear();
      }
    } catch (e) {}

    this.setState({
      isLoggedIn: false,
      user: null,
      currentPage: 'login'
    });
  }

  setPage(page) {
    this.setState({ currentPage: page });
  }

  togglePlugRelay() {
    const plug = this.state.singlePlug;
    const nextState = plug.relayState === 'ON' ? 'OFF' : 'ON';

    this.setState({
      singlePlug: {
        ...plug,
        relayState: nextState
      }
    });

    // Send real command to ESP32 relay endpoint
    sendEsp32RelayCommand(plug.nodeId || 'ESP32-PZEM-PLUG-10A', nextState);
  }

  toggleAppliance(applianceId) {
    this.togglePlugRelay();
  }

  triggerSimulatedAnomaly() {
    const isCurrentlyActive = this.state.simulatedAnomalyActive;
    if (!isCurrentlyActive) {
      const surgeWatts = Math.min(2100, Math.round(this.state.singlePlug.baselineWatts * 2.8 + 180));
      const surgeAmps = parseFloat((surgeWatts / 230.8).toFixed(2));

      const newAlert = {
        id: `alt-${Date.now()}`,
        timestamp: 'Just now',
        type: 'error',
        title: 'WARNING: 10A Load Anomaly Spikes',
        description: `PZEM-004T detected abnormal load surge to ${surgeWatts}W (${surgeAmps}A). Near 10A safety limit threshold!`,
        actionable: true,
        actionText: 'Diagnose via AI'
      };

      this.setState({
        simulatedAnomalyActive: true,
        singlePlug: {
          ...this.state.singlePlug,
          watts: surgeWatts,
          isAnomaly: true,
          anomalyReason: `WARNING: Motor bearing resistance causing ${surgeWatts}W (${surgeAmps}A) surge on 10A circuit!`
        },
        alerts: [newAlert, ...this.state.alerts],
        telemetry: {
          ...this.state.telemetry,
          totalPowerKw: parseFloat((surgeWatts / 1000).toFixed(2)),
          voltage: 230.8,
          currentAmps: surgeAmps,
          powerFactor: 0.76
        }
      });
    } else {
      const isRelayOn = this.state.singlePlug.relayState === 'ON';
      const normWatts = isRelayOn ? this.state.singlePlug.baselineWatts : 0;
      const normAmps = isRelayOn ? parseFloat((normWatts / 230.8).toFixed(2)) : 0;

      this.setState({
        simulatedAnomalyActive: false,
        singlePlug: {
          ...this.state.singlePlug,
          watts: normWatts,
          isAnomaly: false,
          anomalyReason: null
        },
        telemetry: {
          ...this.state.telemetry,
          totalPowerKw: parseFloat((normWatts / 1000).toFixed(2)),
          voltage: 230.8,
          currentAmps: normAmps,
          powerFactor: isRelayOn ? 0.94 : 0.00
        }
      });
    }
  }

  toggleRagModal(isOpen, selectedItem = null) {
    this.setState({ isRagModalOpen: isOpen, selectedKnowledgeItem: selectedItem });
  }

  toggleSimulatorModal(isOpen) {
    this.setState({ isSimulatorModalOpen: isOpen });
  }
}

export const store = new Store();
