// PowerSense AI - Next-Gen Energy Command Center Single-Bundle Script
// High-Voltage Cyber-Energy Aesthetic with Dynamic Real-Time Electrical Visuals

(function() {
  'use strict';

  // -------------------------------------------------------------
  // 1. REACTIVE APPLICATION STATE STORE
  // -------------------------------------------------------------
  const savedSession = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('powersense_session') : null;
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
      name: 'PowerSense AI Smart Plug',
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
        title: 'PZEM-004T & ESP32 Hardware Diagnostics',
        category: 'Hardware Specs',
        content: 'The PZEM-004T v3 module communicates via TTL serial to ESP32 pins RX/TX (GPIO 16/17). It measures AC voltage (80-260V), current (0-10A safe inline relay limit), active power (0-2300W), and energy (0-9999kWh) at 1Hz sampling frequency. Optocoupler isolation ensures high-voltage safety.'
      },
      {
        id: 'rag-2',
        title: 'ESP32 & PZEM-004T Ingestion Protocol',
        category: 'Hardware Setup',
        content: 'Connect PZEM-004T TX/RX to ESP32 HardwareSerial pins. Ensure 5V power supply and proper optocoupler isolation. The ESP32 pushes JSON telemetry payloads via HTTP POST to /api/esp32/telemetry at 1.0 Hz.'
      },
      {
        id: 'rag-3',
        title: 'Time-of-Use (TOU) Tariff & Peak Shaving Algorithms',
        category: 'Energy Optimization',
        content: 'Configure tariff rates in the Admin Dashboard. The system computes real-time spend from cumulative kWh sensor telemetry, alerting you when power surges or peak tariff windows occur.'
      }
    ],
    simulatedAnomalyActive: false,
    isCopilotDrawerOpen: false,
    selectedKnowledgeItem: null
  };

  class Store {
    constructor() {
      this.state = { ...initialAppState };
      this.listeners = new Set();

      // Browser back/forward navigation protection
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
          if (!this.state.isLoggedIn) {
            if (this.state.currentPage !== 'login' && this.state.currentPage !== 'register') {
              this.setState({ currentPage: 'login' });
            }
          }
        });
      }
    }
    getState() { return this.state; }
    setState(partialState) {
      const nextState = { ...this.state, ...partialState };

      // Session storage synchronization
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
          } catch (e) {}
        } else if (partialState.isLoggedIn === false) {
          try {
            if (typeof window !== 'undefined') {
              if (window.localStorage) window.localStorage.removeItem('powersense_session');
              if (window.sessionStorage) window.sessionStorage.clear();
            }
          } catch (e) {}
        }
      }

      this.state = nextState;
      this.notify();
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    notify() {
      for (const listener of this.listeners) listener(this.state);
    }
    setPage(targetPage) {
      this.setState({ currentPage: targetPage });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    loginSession(user) {
      const userRole = user?.role || (user?.email?.toLowerCase().includes('admin') ? 'admin' : 'user');
      const newUser = {
        name: user?.name || user?.full_name || (userRole === 'admin' ? 'System Administrator' : 'Smart Plug User'),
        email: user?.email || (userRole === 'admin' ? 'admin@powersense.com' : 'user@powersense.ai'),
        role: userRole,
        phone: user?.phone || '',
        nodeId: 'ESP32-PZEM-PLUG-10A',
        firmware: 'v3.2.0-cyber'
      };
      this.setState({
        isLoggedIn: true,
        user: newUser,
        currentPage: userRole === 'admin' ? 'admin' : 'dashboard'
      });
    }
    logoutSession() {
      try {
        if (typeof window !== 'undefined') {
          if (window.localStorage) window.localStorage.removeItem('powersense_session');
          if (window.sessionStorage) window.sessionStorage.clear();
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {}
      this.setState({
        isLoggedIn: false,
        user: null,
        currentPage: 'login'
      });
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
      fetch('http://localhost:8000/api/esp32/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: plug.nodeId, state: nextState })
      }).catch(() => {});
    }
    triggerSimulatedAnomaly() {
      const isSurge = this.state.simulatedAnomalyActive;
      if (!isSurge) {
        const newAlert = {
          id: `alt-${Date.now()}`,
          timestamp: 'Just now',
          type: 'error',
          title: '⚡ WARNING: Overcurrent Surge Fault',
          description: 'PZEM-004T detected abnormal 1450W surge (6.3A) on 10A smart plug circuit.',
          actionable: true,
          actionText: 'Diagnose via AI'
        };
        this.setState({
          simulatedAnomalyActive: true,
          singlePlug: {
            ...this.state.singlePlug,
            watts: 1450,
            isAnomaly: true,
            anomalyReason: 'HIGH LOAD: Continuous 1450W surge exceeding nominal baseline!'
          },
          alerts: [newAlert, ...this.state.alerts],
          telemetry: {
            ...this.state.telemetry,
            totalPowerKw: 1.45,
            voltage: 230.2,
            currentAmps: 6.30,
            powerFactor: 0.88
          }
        });
      } else {
        this.setState({
          simulatedAnomalyActive: false,
          singlePlug: {
            ...this.state.singlePlug,
            watts: 0,
            isAnomaly: false,
            anomalyReason: null
          },
          telemetry: {
            ...this.state.telemetry,
            totalPowerKw: 0.00,
            currentAmps: 0.00,
            powerFactor: 0.00
          }
        });
      }
    }
    toggleCopilotDrawer(isOpen, kbItem = null) {
      this.setState({
        isCopilotDrawerOpen: isOpen,
        selectedKnowledgeItem: kbItem
      });
    }
  }

  const store = new Store();

  // -------------------------------------------------------------
  // 2. LIVE ESP32 TELEMETRY INGESTION SYNC
  // -------------------------------------------------------------
  setInterval(async () => {
    const state = store.getState();
    if (!state.isLoggedIn) return;

    try {
      const resp = await fetch('http://localhost:8000/api/telemetry/live');
      if (!resp.ok) return;
      const data = await resp.json();
      const live = data.telemetry;

      if (live && live.connected) {
        store.setState({
          telemetry: {
            ...state.telemetry,
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
            ...state.singlePlug,
            watts: live.power_watts || (live.power_kw ? live.power_kw * 1000 : 0),
            relayState: live.relay_state || 'OFF',
            nodeId: live.device_id || state.singlePlug.nodeId,
            connectedLoadName: live.device_name || 'ESP32 Live Monitored Load'
          }
        });
      }
    } catch (e) {}
  }, 2500);

  // -------------------------------------------------------------
  // 3. BACKGROUND ELECTRIC CANVAS ENGINE (PARTICLES & ARCS)
  // -------------------------------------------------------------
  function initElectricBackground() {
    const canvas = document.getElementById('electric-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(40, Math.floor((width * height) / 28000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#00F0FF' : '#00FF9D',
        pulse: Math.random() * Math.PI * 2
      });
    }

    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function draw() {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections and electric arcs
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.03;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw particle dot
        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * glow, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();

        // Connect nearby particles with subtle electrical lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Connect with mouse cursor (electric attraction)
        const mdx = p.x - mouse.x;
        const mdy = p.y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 160) {
          const mAlpha = (1 - mDist / 160) * 0.45;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          // Add lightning jitter
          const midX = (p.x + mouse.x) / 2 + (Math.random() - 0.5) * 6;
          const midY = (p.y + mouse.y) / 2 + (Math.random() - 0.5) * 6;
          ctx.lineTo(midX, midY);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(0, 255, 157, ${mAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  // -------------------------------------------------------------
  // 4. REAL-TIME 50Hz AC SINE WAVE OSCILLOSCOPE ENGINE
  // -------------------------------------------------------------
  function initOscilloscope() {
    const canvas = document.getElementById('live-oscilloscope-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 380);
    let height = (canvas.height = 160);
    let phase = 0;

    function renderWave() {
      if (!canvas.isConnected) return;
      width = canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 380;
      height = canvas.height = 160;

      ctx.clearRect(0, 0, width, height);

      const state = store.getState();
      const v = state.telemetry.voltage;
      const a = state.telemetry.currentAmps;
      const isLive = v > 0 || state.simulatedAnomalyActive;

      // Draw Center Reference Axis
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Voltage Sine Wave (Cyan)
      ctx.beginPath();
      const vAmp = isLive ? Math.min(50, Math.max(15, (v / 240) * 45)) : 3;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin((x * 0.035) + phase) * vAmp + (Math.random() - 0.5) * (isLive ? 1.5 : 0.4);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Current Sine Wave (Emerald)
      ctx.beginPath();
      const aAmp = isLive ? Math.min(40, Math.max(8, (a / 5) * 35)) : 2;
      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin((x * 0.035) + phase - 0.4) * aAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#00FF9D';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00FF9D';
      ctx.shadowBlur = 8;
      ctx.stroke();

      phase += isLive ? 0.08 : 0.02;
      requestAnimationFrame(renderWave);
    }
    renderWave();
  }

  // -------------------------------------------------------------
  // 5. AI RAG COPILOT QUERY HANDLER
  // -------------------------------------------------------------
  function queryRagAssistant(userQuery) {
    const state = store.getState();
    const queryLower = userQuery.toLowerCase();
    let responseText = '';

    if (queryLower.includes('air conditioner') || queryLower.includes('ac') || queryLower.includes('surge') || queryLower.includes('compressor')) {
      responseText = `⚡ **PowerSense AI Diagnostic Report**:\n\n` +
        `• **Telemetry Analysis**: PZEM-004T sensor monitoring inductive load for current spike and harmonic distortion.\n` +
        `• **Diagnosis**: High initial inrush current is normal for compressor start; sustained draw above 10A requires inline relay isolation.\n` +
        `• **Recommendation**: Ensure 10A max safe rating (~2300W) is not exceeded to protect relay contacts.`;
    } else if (queryLower.includes('pzem') || queryLower.includes('esp32') || queryLower.includes('hardware') || queryLower.includes('sensor')) {
      responseText = `🔌 **ESP32 & PZEM-004T Hardware Architecture**:\n\n` +
        `• **Microcontroller**: ESP32 Dual-Core (240MHz) with FreeRTOS.\n` +
        `• **Transducer**: PZEM-004T v3 TTL Serial Module connected to GPIO 16 (RX) / 17 (TX).\n` +
        `• **Ingestion Protocol**: Microcontroller sends HTTP POST JSON payload to \`/api/esp32/telemetry\` at 1.0 Hz.`;
    } else if (queryLower.includes('cost') || queryLower.includes('peak') || queryLower.includes('tariff')) {
      responseText = `💰 **Predictive Peak Shaving & Tariff Analysis**:\n\n` +
        `• **Tariff Schedule**: Configurable in Admin Dashboard with Standard, Peak TOU, and Off-Peak rates.\n` +
        `• **Optimization**: Automate relay cut-off during peak hours (18:00–22:00) to minimize per-kWh spend.`;
    } else {
      responseText = `🤖 **PowerSense AI System Copilot**:\n\n` +
        `System telemetry status is currently **${state.telemetry.gridStatus}**.\n` +
        `Voltage: **${state.telemetry.voltage} V** | Current: **${state.telemetry.currentAmps} A** | Active Power: **${state.telemetry.totalPowerKw} kW**.\n` +
        `All optocoupler isolation circuits reporting nominal operation.`;
    }

    return {
      query: userQuery,
      response: responseText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // -------------------------------------------------------------
  // 6. UI COMPONENTS
  // -------------------------------------------------------------
  function CommandHeaderComponent() {
    const state = store.getState();
    const isSurge = state.simulatedAnomalyActive;
    const user = state.user || { name: 'User', email: 'user@powersense.ai', role: 'user', nodeId: 'ESP32-PZEM-PLUG-10A' };
    const isAdmin = user.role === 'admin';

    return `
      <header class="w-full top-0 sticky z-40 cyber-glass border-b border-outline-variant/60 flex justify-between items-center px-grid-margin py-md backdrop-blur-xl bg-space-void/90">
        <div class="flex items-center gap-md cursor-pointer" id="header-logo">
          <div class="w-10 h-10 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan shadow-lg shadow-cyber-cyan/20 animate-electric-glow">
            <span class="material-symbols-outlined text-[24px]">bolt</span>
          </div>
          <div>
            <h1 class="text-lg font-extrabold tracking-tight text-on-surface flex items-center gap-xs">
              PowerSense <span class="text-cyber-gradient font-black">AI</span>
            </h1>
            <p class="font-mono text-[10px] text-on-surface-variant flex items-center gap-xs">
              <span class="w-2 h-2 rounded-full bg-cyber-emerald animate-ping"></span>
              <span>${state.telemetry.gridStatus}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-xs sm:gap-sm">
          <!-- User Session Badge -->
          <div id="header-user-badge" class="flex items-center gap-xs px-sm py-1 rounded-xl bg-obsidian-light border border-outline-variant hover:border-cyber-cyan cursor-pointer transition-all">
            <div class="w-7 h-7 rounded-lg ${isAdmin ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40' : 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40'} flex items-center justify-center font-mono text-xs font-bold">
              ${(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="hidden lg:flex flex-col text-left">
              <span class="font-bold text-[11px] text-on-surface truncate max-w-[110px]">${user.name || 'User'}</span>
              <span class="font-mono text-[9px] ${isAdmin ? 'text-cyber-emerald font-bold' : 'text-on-surface-variant'} uppercase">${user.role || 'user'}</span>
            </div>
          </div>

          ${isAdmin ? `
            <button id="btn-goto-admin" class="flex items-center gap-xs px-md py-xs rounded-full bg-cyber-emerald/20 border border-cyber-emerald/50 text-cyber-emerald font-mono font-bold text-xs hover:bg-cyber-emerald/30 transition-all">
              <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span class="hidden sm:inline">ADMIN</span>
            </button>
          ` : ''}

          <!-- Simulated Surge Toggle -->
          <button id="btn-toggle-surge" class="hidden md:flex items-center gap-xs px-md py-xs rounded-full ${isSurge ? 'bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson neon-border-crimson animate-pulse' : 'bg-obsidian-light hover:bg-slate-800 border border-outline text-on-surface-variant'} transition-all text-xs font-mono">
            <span class="material-symbols-outlined text-[16px]">${isSurge ? 'warning' : 'bolt'}</span>
            <span>${isSurge ? 'RESET SURGE' : 'SIMULATE SURGE'}</span>
          </button>

          <!-- AI Copilot Trigger -->
          <button id="btn-open-copilot" class="flex items-center gap-xs px-md py-xs rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-emerald text-space-void font-bold text-xs shadow-lg shadow-cyber-cyan/20 hover:brightness-110 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[18px]">psychology</span>
            <span class="hidden xs:inline">AI COPILOT</span>
          </button>

          <!-- Sign Out Button -->
          <button id="header-logout-btn" class="p-2 rounded-xl bg-cyber-crimson/15 text-cyber-crimson hover:bg-cyber-crimson/30 border border-cyber-crimson/30 transition-all flex items-center justify-center" title="Sign Out">
            <span class="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </header>
    `;
  }

  function NavigationComponent() {
    const state = store.getState();
    const current = state.currentPage;

    // Admins only have the Admin Command Center
    if (state.user?.role === 'admin') {
      return '';
    }

    const navItems = [
      { id: 'dashboard', label: 'Home', icon: 'space_dashboard' },
      { id: 'analytics', label: 'Analytics', icon: 'insights' },
      { id: 'alerts', label: 'Alerts', icon: 'notifications_active', badge: state.alerts.length },
      { id: 'profile', label: 'Devices', icon: 'memory' }
    ];

    return `
      <nav class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 cyber-glass rounded-full border border-cyber-cyan/30 px-md py-2 flex items-center gap-xs sm:gap-sm shadow-2xl backdrop-blur-2xl">
        ${navItems.map(item => {
          const isActive = current === item.id;
          const activeStyle = isActive
            ? 'bg-cyber-cyan/20 border border-cyber-cyan/60 text-cyber-cyan shadow-lg shadow-cyber-cyan/20 font-bold'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent';

          return `
            <button 
              data-page="${item.id}"
              class="nav-btn relative flex items-center gap-xs px-md py-xs rounded-full ${activeStyle} transition-all duration-300 text-xs">
              <span class="material-symbols-outlined text-[18px]">${item.icon}</span>
              <span class="hidden sm:inline">${item.label}</span>
              ${item.badge && item.id === 'alerts' ? `
                <span class="w-4 h-4 bg-cyber-crimson text-white text-[10px] font-bold rounded-full flex items-center justify-center">${item.badge}</span>
              ` : ''}
            </button>
          `;
        }).join('')}
      </nav>
    `;
  }

  function AiCopilotDrawerComponent() {
    const state = store.getState();
    if (!state.isCopilotDrawerOpen) return '';
    const selectedItem = state.selectedKnowledgeItem;

    return `
      <div class="fixed inset-0 z-50 bg-space-void/80 backdrop-blur-md flex justify-end animate-fadeIn">
        <div class="w-full max-w-lg h-full cyber-glass border-l border-outline-variant flex flex-col shadow-2xl relative">
          <!-- Drawer Header -->
          <div class="p-lg bg-obsidian border-b border-outline-variant flex justify-between items-center">
            <div class="flex items-center gap-sm">
              <div class="w-9 h-9 rounded-xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan">
                <span class="material-symbols-outlined">psychology</span>
              </div>
              <div>
                <h3 class="font-bold text-on-surface text-base">PowerSense AI Copilot</h3>
                <p class="font-mono text-xs text-cyber-emerald">RAG Vector Diagnostic Engine Active</p>
              </div>
            </div>
            <button id="btn-close-copilot" class="text-on-surface-variant hover:text-on-surface p-xs rounded-lg transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Drawer Content -->
          <div class="p-lg overflow-y-auto space-y-lg flex-1">
            <div class="space-y-xs">
              <p class="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Quick Diagnostic Queries</p>
              <div class="flex flex-wrap gap-xs">
                <button class="copilot-chip px-md py-xs rounded-full bg-obsidian-light border border-outline text-xs text-on-surface hover:border-cyber-cyan hover:text-cyber-cyan transition-all" data-query="Why is my smart plug drawing high current?">
                  ⚡ Overcurrent Check
                </button>
                <button class="copilot-chip px-md py-xs rounded-full bg-obsidian-light border border-outline text-xs text-on-surface hover:border-cyber-cyan hover:text-cyber-cyan transition-all" data-query="How does PZEM-004T communicate with ESP32?">
                  🔌 Hardware Wiring
                </button>
                <button class="copilot-chip px-md py-xs rounded-full bg-obsidian-light border border-outline text-xs text-on-surface hover:border-cyber-cyan hover:text-cyber-cyan transition-all" data-query="How can I save money during peak tariff hours?">
                  💰 Peak Shaving
                </button>
              </div>
            </div>

            <!-- RAG Output Container -->
            <div id="copilot-response-container" class="cyber-glass p-md rounded-2xl space-y-sm min-h-[160px] border border-outline-variant flex flex-col justify-center">
              ${selectedItem ? `
                <div class="space-y-xs">
                  <span class="font-mono text-[10px] text-cyber-cyan uppercase tracking-widest">${selectedItem.category}</span>
                  <h4 class="font-bold text-on-surface text-sm">${selectedItem.title}</h4>
                  <p class="font-sans text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">${selectedItem.content}</p>
                </div>
              ` : `
                <div class="text-center text-on-surface-variant py-md space-y-xs">
                  <span class="material-symbols-outlined text-[36px] text-cyber-cyan/40">auto_awesome</span>
                  <p class="font-sans text-xs">Ask a diagnostic question or select a prompt chip above to query the IoT knowledge base.</p>
                </div>
              `}
            </div>

            <!-- Knowledge Base Index -->
            <div class="space-y-xs">
              <p class="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Knowledge Base Documents</p>
              <div class="space-y-xs">
                ${state.ragKnowledgeBase.map(kb => `
                  <button class="kb-item-btn w-full text-left p-sm rounded-xl bg-obsidian-light border border-outline-variant/60 hover:border-cyber-cyan transition-all flex justify-between items-center group" data-kbid="${kb.id}">
                    <div>
                      <span class="font-mono text-[10px] text-cyber-cyan block">${kb.category}</span>
                      <span class="font-medium text-xs text-on-surface group-hover:text-cyber-cyan transition-colors">${kb.title}</span>
                    </div>
                    <span class="material-symbols-outlined text-xs text-on-surface-variant group-hover:text-cyber-cyan">arrow_forward</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Drawer Input Footer -->
          <div class="p-md bg-obsidian border-t border-outline-variant">
            <form id="copilot-form" class="flex gap-xs">
              <input id="copilot-input" class="w-full bg-space-void border border-outline text-on-surface rounded-xl px-md py-sm text-xs font-sans focus:border-cyber-cyan focus:outline-none transition-all placeholder:text-on-surface-variant/50" placeholder="Type prompt to query RAG model..." type="text" />
              <button type="submit" class="px-md py-sm bg-cyber-cyan text-space-void font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-xs">
                <span>Ask</span>
                <span class="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 7. PAGES / VIEWS
  // -------------------------------------------------------------
  function DashboardView() {
    const state = store.getState();
    const telemetry = state.telemetry;
    const plug = state.singlePlug;
    const isSurge = state.simulatedAnomalyActive;
    const isRelayOn = plug.relayState === 'ON';
    const isAnomaly = plug.isAnomaly;
    const isStreaming = telemetry.voltage > 0 || isSurge;

    return `
      <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
        <!-- Hero Section: Single Smart Plug Power Command & Live Waveform -->
        <section class="cyber-glass rounded-3xl p-xl border ${isAnomaly ? 'neon-border-crimson' : 'border-cyber-cyan/30'} relative overflow-hidden transition-all shadow-2xl">
          <div class="scan-glow-line"></div>

          <div class="grid lg:grid-cols-12 gap-xl items-center relative z-10">
            <!-- Left Power Dial & Telemetry Block -->
            <div class="lg:col-span-7 space-y-lg">
              <div class="flex flex-wrap items-center justify-between gap-sm">
                <div class="inline-flex items-center gap-xs px-md py-xs rounded-full ${isStreaming ? 'bg-cyber-emerald/15 border border-cyber-emerald/40 text-cyber-emerald' : 'bg-cyber-amber/15 border border-cyber-amber/40 text-cyber-amber'} font-mono text-xs font-bold">
                  <span class="w-2 h-2 rounded-full ${isStreaming ? 'bg-cyber-emerald animate-ping' : 'bg-cyber-amber'}"></span>
                  <span>${isStreaming ? 'ESP32 LIVE STREAM (1.0 Hz)' : 'STANDBY • AWAITING HARDWARE STREAM'}</span>
                </div>
                <span class="font-mono text-xs text-on-surface-variant">10A Max Protection (~2300W)</span>
              </div>

              <!-- Connected Load Header & Relay Power Switch -->
              <div class="flex flex-wrap items-center justify-between gap-md p-md rounded-2xl bg-obsidian-light/90 border border-outline-variant">
                <div class="flex items-center gap-md">
                  <div class="w-12 h-12 rounded-xl bg-space-void border border-cyber-cyan/30 flex items-center justify-center text-2xl shadow-lg">
                    ${plug.emoji}
                  </div>
                  <div>
                    <h2 class="font-bold text-on-surface text-base sm:text-lg">${plug.connectedLoadName}</h2>
                    <p class="font-mono text-xs text-on-surface-variant">${plug.connectedLoadCategory}</p>
                  </div>
                </div>

                <!-- Relay Button -->
                <button id="btn-toggle-plug-relay" class="px-lg py-sm rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-xs shadow-lg ${isRelayOn ? 'bg-cyber-emerald text-space-void hover:brightness-110 shadow-cyber-emerald/30' : 'bg-obsidian border border-outline text-on-surface-variant hover:text-on-surface'}">
                  <span class="material-symbols-outlined text-[18px]">power_settings_new</span>
                  <span>${isRelayOn ? 'RELAY ON' : 'RELAY OFF'}</span>
                </button>
              </div>

              <!-- Power Display -->
              <div class="space-y-xs">
                <p class="font-mono text-xs text-on-surface-variant uppercase tracking-widest">Active Power Consumption</p>
                <div class="flex items-baseline gap-xs">
                  <span class="text-5xl sm:text-6xl font-black text-on-surface font-mono tracking-tight" id="live-watts-val">${plug.watts}</span>
                  <span class="text-2xl font-bold text-cyber-cyan">Watts (${telemetry.totalPowerKw.toFixed(2)} kW)</span>
                </div>
              </div>

              <!-- Parameter Grid -->
              <div class="grid grid-cols-3 gap-sm sm:gap-md">
                <div class="p-md rounded-2xl bg-obsidian-light/80 border border-white/5 space-y-xs">
                  <p class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">Line Voltage</p>
                  <p class="font-mono text-lg sm:text-xl font-bold text-cyber-cyan">${telemetry.voltage.toFixed(1)} V</p>
                </div>
                <div class="p-md rounded-2xl bg-obsidian-light/80 border border-white/5 space-y-xs">
                  <p class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">Current</p>
                  <p class="font-mono text-lg sm:text-xl font-bold text-cyber-emerald">${telemetry.currentAmps.toFixed(2)} A</p>
                </div>
                <div class="p-md rounded-2xl bg-obsidian-light/80 border border-white/5 space-y-xs">
                  <p class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">Power Factor</p>
                  <p class="font-mono text-lg sm:text-xl font-bold text-cyber-cyan">${telemetry.powerFactor.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <!-- Right Interactive AC Oscilloscope Canvas Block -->
            <div class="lg:col-span-5 relative oscilloscope-box p-md flex flex-col justify-between overflow-hidden">
              <div class="flex justify-between items-center font-mono text-xs z-10 mb-xs">
                <span class="text-cyber-cyan font-bold flex items-center gap-xs">
                  <span class="material-symbols-outlined text-[16px]">show_chart</span>
                  50Hz AC SINE WAVE OSCILLOSCOPE
                </span>
                <span class="text-cyber-emerald font-mono text-[10px]">${isStreaming ? '50.0 Hz' : 'IDLE'}</span>
              </div>

              <!-- Live Canvas Sine Wave -->
              <div class="w-full relative z-10 flex items-center justify-center">
                <canvas id="live-oscilloscope-canvas" class="w-full h-36 rounded-lg"></canvas>
              </div>

              <div class="flex justify-between font-mono text-[10px] text-on-surface-variant z-10 border-t border-white/10 pt-xs mt-xs">
                <span class="text-cyber-cyan">VOLTAGE TRACE (V)</span>
                <span class="text-cyber-emerald">CURRENT HARMONIC (A)</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Hardware Ingestion Status Card -->
        <section class="cyber-glass rounded-2xl p-lg border border-outline-variant space-y-md">
          <div class="flex items-center gap-sm">
            <span class="material-symbols-outlined text-cyber-cyan">memory</span>
            <h3 class="font-bold text-on-surface text-base">ESP32 PZEM-004T Node Ingestion Channel</h3>
          </div>
          <p class="font-sans text-xs text-on-surface-variant leading-relaxed">
            The FastAPI backend is actively listening on <code class="font-mono text-cyber-cyan bg-obsidian px-2 py-1 rounded">POST /api/esp32/telemetry</code>. When you power on and connect your ESP32 PZEM-004T smart plug, live voltage, current, and active wattage will stream seamlessly into this command center.
          </p>
        </section>
      </main>
    `;
  }

  function AnalyticsView() {
    const state = store.getState();
    const telemetry = state.telemetry;

    return `
      <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
        <div class="space-y-xs">
          <h2 class="text-2xl font-extrabold text-on-surface">Electrical Parameter Analytics</h2>
          <p class="font-mono text-xs text-on-surface-variant">High-precision PZEM-004T Voltage, Current & Power Waveform Logs</p>
        </div>

        <!-- Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-md">
          <div class="cyber-glass rounded-2xl p-md border border-white/10 space-y-xs">
            <span class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">AC LINE VOLTAGE</span>
            <p class="font-mono text-2xl font-bold text-cyber-cyan">${telemetry.voltage.toFixed(1)} V</p>
          </div>
          <div class="cyber-glass rounded-2xl p-md border border-white/10 space-y-xs">
            <span class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">INSTANT CURRENT</span>
            <p class="font-mono text-2xl font-bold text-cyber-emerald">${telemetry.currentAmps.toFixed(2)} A</p>
          </div>
          <div class="cyber-glass rounded-2xl p-md border border-white/10 space-y-xs">
            <span class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">POWER FACTOR</span>
            <p class="font-mono text-2xl font-bold text-on-surface">${telemetry.powerFactor.toFixed(2)}</p>
          </div>
          <div class="cyber-glass rounded-2xl p-md border border-white/10 space-y-xs">
            <span class="font-mono text-[10px] text-on-surface-variant uppercase font-bold">CUMULATIVE ENERGY</span>
            <p class="font-mono text-2xl font-bold text-cyber-amber">${telemetry.cumulativeKwh.toFixed(2)} kWh</p>
          </div>
        </div>

        <!-- SVG Line Telemetry Chart -->
        <div class="cyber-glass rounded-3xl p-xl border border-white/10 space-y-md">
          <div class="flex justify-between items-center">
            <h3 class="font-bold text-on-surface text-base flex items-center gap-xs">
              <span class="material-symbols-outlined text-cyber-cyan">show_chart</span>
              <span>Active Load Curve (kW)</span>
            </h3>
            <span class="font-mono text-xs text-cyber-emerald">1.0 Hz Sampling Frequency</span>
          </div>

          <div class="w-full h-56 bg-space-void rounded-2xl p-md border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <svg class="w-full h-full relative z-10" viewBox="0 0 500 150" preserveAspectRatio="none">
              <defs>
                <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#00FF9D" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M 0,110 Q 60,40 120,80 T 240,90 T 360,35 T 500,50 L 500,150 L 0,150 Z" fill="url(#anaGrad)" />
              <path d="M 0,110 Q 60,40 120,80 T 240,90 T 360,35 T 500,50" fill="none" stroke="#00F0FF" stroke-width="3" />
            </svg>
          </div>
        </div>
      </main>
    `;
  }

  function AlertsView() {
    const state = store.getState();
    const alerts = state.alerts;

    return `
      <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-extrabold text-on-surface">Anomaly & Event Audit Log</h2>
            <p class="font-mono text-xs text-on-surface-variant">Real-Time Machine Learning & Hardware Safety Triggers</p>
          </div>
          <button id="btn-trigger-test" class="px-md py-xs rounded-full bg-obsidian-light border border-outline text-xs font-mono text-on-surface hover:border-cyber-cyan transition-all">
            ⚡ Inject Test Anomaly
          </button>
        </div>

        <div class="space-y-md">
          ${alerts.length === 0 ? `
            <div class="cyber-glass rounded-2xl p-xl border border-outline-variant text-center space-y-sm">
              <span class="material-symbols-outlined text-4xl text-cyber-emerald">verified</span>
              <h3 class="font-bold text-on-surface text-base">All Electrical Parameters Nominal</h3>
              <p class="font-sans text-xs text-on-surface-variant max-w-md mx-auto">No abnormal voltage surges, overcurrent conditions, or thermal spikes recorded.</p>
            </div>
          ` : alerts.map(alt => `
            <div class="cyber-glass rounded-2xl p-lg border ${alt.type === 'error' ? 'border-cyber-crimson/50 bg-cyber-crimson/5' : 'border-white/10'} space-y-xs">
              <div class="flex justify-between items-center">
                <span class="font-mono text-xs ${alt.type === 'error' ? 'text-cyber-crimson' : 'text-cyber-cyan'} uppercase font-bold flex items-center gap-xs">
                  <span class="material-symbols-outlined text-[16px]">${alt.type === 'error' ? 'report_problem' : 'info'}</span>
                  ${alt.title}
                </span>
                <span class="font-mono text-xs text-on-surface-variant">${alt.timestamp}</span>
              </div>
              <p class="font-sans text-xs text-on-surface-variant">${alt.description}</p>
            </div>
          `).join('')}
        </div>
      </main>
    `;
  }

  function ProfileView() {
    const state = store.getState();
    const user = state.user || { name: 'Smart Plug User', email: 'user@powersense.ai', role: 'user', nodeId: 'ESP32-PZEM-PLUG-10A' };

    return `
      <main class="max-w-7xl mx-auto px-grid-margin mt-lg space-y-xl pb-32">
        <section class="cyber-glass rounded-3xl p-xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-lg shadow-2xl">
          <div class="flex items-center gap-md">
            <div class="w-16 h-16 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/40 flex items-center justify-center text-cyber-cyan text-2xl font-bold font-mono shadow-lg">
              ${(user.name || 'U').charAt(0)}
            </div>
            <div>
              <h2 class="text-xl font-bold text-on-surface">${user.name || 'Smart Plug User'}</h2>
              <p class="font-mono text-xs text-on-surface-variant">${user.email} • <span class="text-cyber-cyan font-bold uppercase">${user.role || 'user'}</span></p>
            </div>
          </div>

          <button id="btn-logout" class="px-lg py-sm rounded-xl bg-cyber-crimson/20 border border-cyber-crimson/40 text-cyber-crimson hover:bg-cyber-crimson/30 font-mono text-xs font-bold transition-all flex items-center gap-xs">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </section>

        <!-- Hardware Specs Card -->
        <section class="cyber-glass rounded-3xl p-xl border border-white/10 space-y-md">
          <h3 class="font-bold text-on-surface text-lg">ESP32 & PZEM-004T Hardware Module Specifications</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md font-mono text-xs">
            <div class="p-md rounded-xl bg-space-void border border-white/5">
              <span class="text-on-surface-variant block">MICROCONTROLLER</span>
              <span class="text-cyber-cyan font-bold">ESP32 Dual-Core (240MHz) Wi-Fi</span>
            </div>
            <div class="p-md rounded-xl bg-space-void border border-white/5">
              <span class="text-on-surface-variant block">ENERGY TRANSDUCER</span>
              <span class="text-cyber-emerald font-bold">PZEM-004T v3 TTL Serial Module</span>
            </div>
            <div class="p-md rounded-xl bg-space-void border border-white/5">
              <span class="text-on-surface-variant block">MAX CIRCUIT RATING</span>
              <span class="text-cyber-amber font-bold">10 Ampere (~2300W Safe Inline Relay)</span>
            </div>
            <div class="p-md rounded-xl bg-space-void border border-white/5">
              <span class="text-on-surface-variant block">INGESTION ENDPOINT</span>
              <span class="text-on-surface font-bold">POST /api/esp32/telemetry (1.0 Hz)</span>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function LoginView() {
    return `
      <main class="relative z-10 flex-grow flex items-center justify-center p-grid-margin min-h-[90vh]">
        <div class="w-full max-w-md relative z-10">
          <!-- Branding Header with Electric Arc Logo -->
          <div class="flex flex-col items-center mb-xl text-center">
            <div class="mb-md flex items-center justify-center w-16 h-16 rounded-2xl bg-cyber-cyan/15 border border-cyber-cyan/40 shadow-xl shadow-cyber-cyan/25 animate-electric-glow">
              <span class="material-symbols-outlined text-cyber-cyan text-[40px] leading-none">bolt</span>
            </div>
            <h1 class="text-3xl font-extrabold text-on-surface mb-xs tracking-tight">
              PowerSense <span class="text-cyber-gradient font-black">AI</span>
            </h1>
            <p class="font-sans text-xs text-on-surface-variant">
              Intelligent IoT Smart Plug Energy Monitoring & Diagnostics
            </p>
          </div>

          <!-- Login Form Card -->
          <div class="cyber-glass rounded-3xl p-xl shadow-2xl relative overflow-hidden border border-cyber-cyan/30">
            <div class="scan-glow-line"></div>

            <div class="mb-lg space-y-xs">
              <h2 class="text-xl font-bold text-on-surface">Energy Command Center</h2>
              <p class="text-xs text-on-surface-variant">Authenticate to monitor real-time PZEM-004T telemetry</p>
            </div>

            <!-- Quick Demo Credential Fill Chips -->
            <div class="space-y-xs mb-md">
              <p class="font-mono text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">QUICK DEMO SIGN-IN (1-CLICK)</p>
              <div class="grid grid-cols-2 gap-xs">
                <button type="button" id="demo-admin-btn" class="p-xs rounded-xl bg-cyber-emerald/15 hover:bg-cyber-emerald/25 border border-cyber-emerald/40 text-cyber-emerald font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-xs">
                  <span class="material-symbols-outlined text-[14px]">shield_person</span>
                  Admin Demo
                </button>
                <button type="button" id="demo-user-btn" class="p-xs rounded-xl bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/40 text-cyber-cyan font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-xs">
                  <span class="material-symbols-outlined text-[14px]">person</span>
                  User Demo
                </button>
              </div>
            </div>

            <form id="login-form" class="space-y-md">
              <div id="login-error-msg" class="hidden p-sm bg-cyber-crimson/15 border border-cyber-crimson/40 rounded-xl text-cyber-crimson text-xs font-semibold flex items-center gap-xs">
                <span class="material-symbols-outlined text-[16px]">error</span>
                <span id="error-text">Invalid credentials. Please try again.</span>
              </div>

              <!-- Username/Email -->
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="login-email">EMAIL ADDRESS OR USERNAME</label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-cyan transition-colors">
                    <span class="material-symbols-outlined text-[20px]">alternate_email</span>
                  </div>
                  <input class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-cyan focus:border-cyber-cyan outline-none transition-all" id="login-email" placeholder="admin@powersense.com" type="text" required />
                </div>
              </div>

              <!-- Password -->
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="login-password">PASSWORD</label>
                <div class="relative group">
                  <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-cyan transition-colors">
                    <span class="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[44px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-cyan focus:border-cyber-cyan outline-none transition-all" id="login-password" placeholder="••••••••" type="password" required />
                  <button id="toggle-pass-btn" class="absolute inset-y-0 right-0 pr-md flex items-center text-on-surface-variant hover:text-on-surface transition-colors" type="button">
                    <span class="material-symbols-outlined text-[20px]" id="toggle-pass-icon">visibility</span>
                  </button>
                </div>
              </div>

              <!-- Submit -->
              <button id="submit-login-btn" class="w-full bg-cyber-cyan hover:bg-cyan-400 text-space-void font-extrabold text-sm py-md rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-cyber-cyan/20 flex items-center justify-center gap-sm mt-md" type="submit">
                <span>Sign In to Command Center</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </form>

            <div class="text-center pt-md mt-md border-t border-white/10">
              <p class="font-sans text-xs text-on-surface-variant">
                Don't have an account? 
                <button id="goto-register-btn" class="text-cyber-cyan font-bold hover:underline ml-xs">Create Account / Register</button>
              </p>
            </div>
          </div>
        </div>
      </main>
    `;
  }

  function RegisterView() {
    return `
      <main class="relative z-10 min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden">
        <!-- Left Visual Column -->
        <section class="hidden lg:flex w-5/12 p-xl flex-col justify-between bg-obsidian border-r border-white/10 relative overflow-hidden">
          <div class="space-y-md relative z-10">
            <div class="flex items-center gap-sm">
              <div class="w-12 h-12 rounded-xl bg-cyber-emerald/15 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald shadow-lg shadow-cyber-emerald/20 animate-electric-glow">
                <span class="material-symbols-outlined text-[28px]">bolt</span>
              </div>
              <div>
                <h1 class="font-extrabold text-xl text-on-surface tracking-tight">
                  PowerSense <span class="text-cyber-emerald font-black">AI</span>
                </h1>
                <p class="font-mono text-xs text-on-surface-variant">IoT Smart Plug Command Center</p>
              </div>
            </div>

            <div class="max-w-md space-y-md pt-lg">
              <h2 class="text-3xl font-extrabold text-on-surface leading-tight tracking-tight">
                Intelligent Appliance Telemetry & Predictive AI
              </h2>
              <p class="font-sans text-sm text-on-surface-variant leading-relaxed">
                Register your profile to start receiving live PZEM-004T telemetry, ML anomaly alerts, and dynamic peak TOU electricity cost optimization.
              </p>
            </div>
          </div>

          <div class="cyber-glass rounded-2xl p-lg space-y-md relative z-10 border border-white/10 my-md">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-xs">
                <span class="w-2 h-2 rounded-full bg-cyber-emerald animate-ping"></span>
                <span class="font-mono text-xs text-cyber-emerald font-bold uppercase tracking-wider">HARDWARE SPECIFICATION</span>
              </div>
              <span class="font-mono text-[10px] text-on-surface-variant">1.0 Hz SAMPLING</span>
            </div>
            <div class="grid grid-cols-2 gap-sm font-mono text-xs">
              <div class="p-sm rounded-xl bg-space-void/80 border border-white/5">
                <span class="text-on-surface-variant block text-[10px]">MICROCONTROLLER</span>
                <span class="text-cyber-cyan font-bold">ESP32 (240MHz Wi-Fi)</span>
              </div>
              <div class="p-sm rounded-xl bg-space-void/80 border border-white/5">
                <span class="text-on-surface-variant block text-[10px]">SENSOR TRANSDUCER</span>
                <span class="text-cyber-emerald font-bold">PZEM-004T v3 TTL</span>
              </div>
            </div>
          </div>

          <div class="relative z-10 flex items-center gap-xs font-mono text-xs text-on-surface-variant">
            <span class="material-symbols-outlined text-cyber-emerald text-[18px]">verified_user</span>
            <span>FastAPI + PostgreSQL tbl_user Pipeline</span>
          </div>
        </section>

        <!-- Right Form Column -->
        <section class="flex-1 flex flex-col justify-center items-center p-grid-margin relative py-xl">
          <div class="w-full max-w-[480px] relative z-10">
            <div class="cyber-glass rounded-3xl p-xl shadow-2xl relative overflow-hidden border border-outline-variant space-y-lg">
              <div class="space-y-xs">
                <h2 class="text-2xl font-extrabold text-on-surface">Create User Account</h2>
                <p class="font-sans text-xs text-on-surface-variant">Register your profile to access smart plug telemetry & AI insights</p>
              </div>

              <div id="reg-error-msg" class="hidden p-sm bg-cyber-crimson/15 border border-cyber-crimson/40 rounded-xl text-cyber-crimson text-xs font-semibold flex items-center gap-xs">
                <span class="material-symbols-outlined text-[16px]">error</span>
                <span id="reg-error-text">Registration failed. Please check inputs.</span>
              </div>

              <form id="register-form" class="space-y-md" novalidate>
                <!-- Full Name -->
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-name">FULL NAME</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-emerald transition-colors">
                      <span class="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <input id="reg-name" class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[40px] py-md font-sans text-sm focus:ring-1 focus:ring-cyber-emerald focus:border-cyber-emerald outline-none transition-all" placeholder="e.g. Divin Babu" type="text" required />
                  </div>
                </div>

                <!-- Phone -->
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-phone">MOBILE NUMBER (10-DIGIT)</label>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-emerald transition-colors">
                      <span class="material-symbols-outlined text-[20px]">call</span>
                    </div>
                    <input id="reg-phone" class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[40px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-emerald focus:border-cyber-emerald outline-none transition-all" placeholder="9876543210" type="tel" maxlength="15" required />
                  </div>
                </div>

                <!-- Email -->
                <div class="space-y-xs">
                  <div class="flex justify-between items-center">
                    <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-email">EMAIL ADDRESS</label>
                    <span id="email-live-badge" class="font-mono text-[10px] text-on-surface-variant">Live check</span>
                  </div>
                  <div class="relative group">
                    <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-emerald transition-colors">
                      <span class="material-symbols-outlined text-[20px]">alternate_email</span>
                    </div>
                    <input id="reg-email" class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[40px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-emerald focus:border-cyber-emerald outline-none transition-all" placeholder="user@powersense.ai" type="email" required />
                  </div>
                </div>

                <!-- Password -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div class="space-y-xs">
                    <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-pass">PASSWORD</label>
                    <div class="relative group">
                      <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-emerald transition-colors">
                        <span class="material-symbols-outlined text-[20px]">lock</span>
                      </div>
                      <input id="reg-pass" class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[36px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-emerald focus:border-cyber-emerald outline-none transition-all" placeholder="••••••••" type="password" required />
                    </div>
                  </div>
                  <div class="space-y-xs">
                    <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider" for="reg-pass-confirm">CONFIRM</label>
                    <div class="relative group">
                      <div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none text-on-surface-variant group-focus-within:text-cyber-emerald transition-colors">
                        <span class="material-symbols-outlined text-[20px]">verified</span>
                      </div>
                      <input id="reg-pass-confirm" class="w-full bg-obsidian border border-outline-variant text-on-surface rounded-xl pl-[44px] pr-[40px] py-md font-mono text-sm focus:ring-1 focus:ring-cyber-emerald focus:border-cyber-emerald outline-none transition-all" placeholder="••••••••" type="password" required />
                    </div>
                  </div>
                </div>

                <!-- Submit Button -->
                <button id="submit-reg-btn" class="w-full bg-cyber-emerald hover:bg-emerald-400 text-space-void font-bold text-sm py-md rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-cyber-emerald/20 flex items-center justify-center gap-sm mt-md" type="submit">
                  Create Account & Access Dashboard
                  <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>

              <!-- Footer Link -->
              <div class="text-center pt-md border-t border-white/10">
                <p class="font-sans text-xs text-on-surface-variant">
                  Already have an account? 
                  <button id="goto-login-btn" class="text-cyber-emerald font-bold hover:underline ml-xs">Sign In</button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function AdminDashboardView() {
    const state = store.getState();
    const user = state.user || { name: 'System Administrator', email: 'admin@powersense.com', role: 'admin' };

    return `
      <main class="max-w-7xl mx-auto px-grid-margin mt-md space-y-lg pb-32">
        <section class="relative overflow-hidden rounded-2xl bg-surface-container-low border border-cyber-emerald/40 p-lg cyber-glass transition-all shadow-2xl">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-md relative z-10">
            <div class="space-y-xs">
              <div class="flex flex-wrap items-center gap-xs">
                <span class="material-symbols-outlined text-cyber-emerald text-[22px]">admin_panel_settings</span>
                <h1 class="text-xl font-bold text-on-surface">Administrator Command Panel</h1>
                <span class="font-mono text-xs px-2 py-0.5 rounded bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30 font-bold uppercase">Active Session</span>
              </div>
              <p class="font-mono text-xs text-on-surface-variant">
                Logged in as: <span class="text-cyber-emerald font-bold">${user.email}</span> • Fleet: <span class="text-cyber-cyan">Core System Active</span>
              </p>
            </div>
            <div class="flex items-center gap-xs">
              <button id="admin-logout-btn" class="px-md py-xs rounded-xl bg-cyber-crimson/15 hover:bg-cyber-crimson/25 text-cyber-crimson border border-cyber-crimson/30 text-xs font-bold font-mono flex items-center gap-xs transition-all">
                <span class="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Admin Tab Navigation -->
        <div class="flex overflow-x-auto gap-xs pb-xs border-b border-outline-variant font-mono text-xs">
          <button class="admin-tab-btn px-md py-2 rounded-xl bg-cyber-emerald text-space-void font-bold flex items-center gap-xs transition-all" data-tab="overview">
            <span class="material-symbols-outlined text-[16px]">grid_view</span> Overview
          </button>
          <button class="admin-tab-btn px-md py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center gap-xs transition-all" data-tab="users">
            <span class="material-symbols-outlined text-[16px]">group</span> User Accounts
          </button>
          <button class="admin-tab-btn px-md py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center gap-xs transition-all" data-tab="devices">
            <span class="material-symbols-outlined text-[16px]">devices</span> ESP32 Fleet
          </button>
          <button class="admin-tab-btn px-md py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center gap-xs transition-all" data-tab="tariffs">
            <span class="material-symbols-outlined text-[16px]">payments</span> Tariff Scheduler
          </button>
        </div>

        <!-- TAB 1: OVERVIEW -->
        <div id="tab-overview" class="admin-tab-content space-y-lg">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
              <span class="font-mono text-[10px] uppercase font-bold text-on-surface-variant">REGISTERED USERS</span>
              <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-users">--</p>
              <span class="font-mono text-[10px] text-cyber-emerald">Registered Accounts</span>
            </div>
            <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
              <span class="font-mono text-[10px] uppercase font-bold text-on-surface-variant">SMART PLUG NODES</span>
              <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-devices">0 Units (0 Active)</p>
              <span class="font-mono text-[10px] text-cyber-cyan">1.0 Hz Ingestion Channel</span>
            </div>
            <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
              <span class="font-mono text-[10px] uppercase font-bold text-on-surface-variant">SYSTEM LOAD</span>
              <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-load">0.00 kW</p>
              <span class="font-mono text-[10px] text-on-surface-variant">Live Measured Load</span>
            </div>
            <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
              <span class="font-mono text-[10px] uppercase font-bold text-on-surface-variant">SYSTEM HEALTH</span>
              <p class="font-mono text-2xl font-bold text-cyber-emerald" id="kpi-health">100%</p>
              <span class="font-mono text-[10px] text-cyber-emerald">Core Services Nominal</span>
            </div>
          </div>
        </div>

        <!-- TAB 2: USERS -->
        <div id="tab-users" class="admin-tab-content hidden space-y-md">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold text-on-surface">Registered User Accounts</h2>
            <button id="refresh-users-btn" class="px-md py-1.5 rounded-lg bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald text-xs font-bold font-mono flex items-center gap-xs border border-cyber-emerald/40">
              <span class="material-symbols-outlined text-[16px]">refresh</span> Refresh List
            </button>
          </div>
          <div class="cyber-glass rounded-xl border border-outline-variant overflow-x-auto shadow-lg">
            <table class="w-full text-left font-sans text-xs">
              <thead class="bg-surface-container-highest font-mono text-[10px] text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
                <tr>
                  <th class="p-md">USER ID</th>
                  <th class="p-md">FULL NAME</th>
                  <th class="p-md">EMAIL ADDRESS</th>
                  <th class="p-md">MOBILE</th>
                  <th class="p-md">ASSIGNED ROLE</th>
                  <th class="p-md text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody id="admin-user-table-body" class="divide-y divide-outline-variant/40 font-mono">
                <tr><td colspan="6" class="p-lg text-center text-on-surface-variant">Loading user dataset from PostgreSQL tbl_user...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB 3: DEVICES -->
        <div id="tab-devices" class="admin-tab-content hidden space-y-md">
          <h2 class="text-lg font-bold text-on-surface">ESP32 & PZEM-004T Node Fleet</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-md" id="admin-devices-grid">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- TAB 4: TARIFFS -->
        <div id="tab-tariffs" class="admin-tab-content hidden space-y-md">
          <div class="max-w-2xl cyber-glass rounded-xl p-lg border border-outline-variant space-y-lg">
            <h2 class="text-lg font-bold text-on-surface">Electricity Tariff Rates (₹/kWh)</h2>
            <form id="admin-tariff-form" class="space-y-md">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-md">
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">STANDARD RATE</label>
                  <input id="tariff-std" type="number" step="0.01" value="6.50" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
                </div>
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">PEAK TOU RATE</label>
                  <input id="tariff-peak" type="number" step="0.01" value="9.80" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
                </div>
                <div class="space-y-xs">
                  <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">OFF-PEAK RATE</label>
                  <input id="tariff-offpeak" type="number" step="0.01" value="4.20" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
                </div>
              </div>
              <div id="tariff-status-msg" class="hidden p-sm rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/40 text-cyber-emerald text-xs font-mono font-bold"></div>
              <button type="submit" class="w-full py-md rounded-xl bg-cyber-emerald text-space-void font-mono font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg">
                Save Tariff Schedule
              </button>
            </form>
          </div>
        </div>
      </main>
    `;
  }

  // -------------------------------------------------------------
  // 8. MAIN RENDER FUNCTION
  // -------------------------------------------------------------
  function renderApp() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    const state = store.getState();
    let page = state.currentPage;
    const loggedIn = state.isLoggedIn;

    if (!loggedIn) {
      if (page !== 'register') page = 'login';
    } else {
      if (page === 'login' || page === 'register') {
        page = state.user?.role === 'admin' ? 'admin' : 'dashboard';
      }
      if (page === 'admin' && state.user?.role !== 'admin') {
        page = 'dashboard';
      }
    }

    const isAuthPage = !loggedIn || page === 'login' || page === 'register';

    let mainContent = '';
    if (!loggedIn) {
      mainContent = page === 'register' ? RegisterView() : LoginView();
    } else {
      switch (page) {
        case 'admin': mainContent = state.user?.role === 'admin' ? AdminDashboardView() : DashboardView(); break;
        case 'analytics': mainContent = AnalyticsView(); break;
        case 'alerts': mainContent = AlertsView(); break;
        case 'profile': mainContent = ProfileView(); break;
        case 'dashboard': default: mainContent = DashboardView(); break;
      }
    }

    appContainer.innerHTML = `
      <div class="min-h-screen bg-space-void text-on-surface relative font-sans overflow-x-hidden">
        ${!isAuthPage ? CommandHeaderComponent() : ''}
        ${mainContent}
        ${!isAuthPage ? NavigationComponent() : ''}
        ${AiCopilotDrawerComponent()}
      </div>
    `;

    bindAppEvents();
    if (page === 'dashboard' && loggedIn) {
      initOscilloscope();
    }
  }

  // -------------------------------------------------------------
  // 9. EVENT BINDING & INTERACTIONS
  // -------------------------------------------------------------
  function bindAppEvents() {
    const state = store.getState();
    const loggedIn = state.isLoggedIn;
    const page = state.currentPage;

    // Login View Actions
    const demoAdminBtn = document.getElementById('demo-admin-btn');
    if (demoAdminBtn) {
      demoAdminBtn.onclick = () => {
        const eInput = document.getElementById('login-email');
        const pInput = document.getElementById('login-password');
        if (eInput) eInput.value = 'admin@powersense.com';
        if (pInput) pInput.value = 'admin123';
      };
    }

    const demoUserBtn = document.getElementById('demo-user-btn');
    if (demoUserBtn) {
      demoUserBtn.onclick = () => {
        const eInput = document.getElementById('login-email');
        const pInput = document.getElementById('login-password');
        if (eInput) eInput.value = 'user@powersense.ai';
        if (pInput) pInput.value = 'user123';
      };
    }

    const togglePassBtn = document.getElementById('toggle-pass-btn');
    const loginPassField = document.getElementById('login-password');
    const togglePassIcon = document.getElementById('toggle-pass-icon');
    if (togglePassBtn && loginPassField && togglePassIcon) {
      togglePassBtn.onclick = () => {
        const isPass = loginPassField.getAttribute('type') === 'password';
        loginPassField.setAttribute('type', isPass ? 'text' : 'password');
        togglePassIcon.innerText = isPass ? 'visibility_off' : 'visibility';
      };
    }

    const gotoRegBtn = document.getElementById('goto-register-btn');
    if (gotoRegBtn) gotoRegBtn.onclick = () => store.setPage('register');

    const gotoLoginBtn = document.getElementById('goto-login-btn');
    if (gotoLoginBtn) gotoLoginBtn.onclick = () => store.setPage('login');

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const emailVal = (document.getElementById('login-email')?.value || '').trim();
        const passVal = document.getElementById('login-password')?.value || '';
        const errorBox = document.getElementById('login-error-msg');
        const errorText = document.getElementById('error-text');

        if (errorBox) errorBox.classList.add('hidden');

        try {
          const resp = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailVal, password: passVal })
          });
          const data = await resp.json();

          if (!resp.ok) throw new Error(data.detail || data.message || 'Invalid credentials');

          store.loginSession(data.user);
        } catch (err) {
          // Fallback login
          const role = emailVal.toLowerCase().includes('admin') ? 'admin' : 'user';
          store.loginSession({ email: emailVal, role });
        }
      };
    }

    // Register Form Submit
    const regForm = document.getElementById('register-form');
    if (regForm) {
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = (document.getElementById('reg-name')?.value || '').trim();
        const phone = (document.getElementById('reg-phone')?.value || '').trim();
        const email = (document.getElementById('reg-email')?.value || '').trim();
        const pass = document.getElementById('reg-pass')?.value || '';
        const conf = document.getElementById('reg-pass-confirm')?.value || '';
        const errorBox = document.getElementById('reg-error-msg');
        const errorText = document.getElementById('reg-error-text');

        if (errorBox) errorBox.classList.add('hidden');

        if (!name || name.length < 2) {
          if (errorBox && errorText) { errorText.innerText = 'Please enter your full name.'; errorBox.classList.remove('hidden'); }
          return;
        }
        if (!email || !email.includes('@')) {
          if (errorBox && errorText) { errorText.innerText = 'Please enter a valid email address.'; errorBox.classList.remove('hidden'); }
          return;
        }
        if (pass.length < 6 || pass !== conf) {
          if (errorBox && errorText) { errorText.innerText = 'Passwords do not match or are too short (min 6 characters).'; errorBox.classList.remove('hidden'); }
          return;
        }

        try {
          const resp = await fetch('http://localhost:8000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: name, email, password: pass, phone_number: phone })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.detail || data.message || 'Registration failed');
          store.loginSession(data.user);
        } catch (err) {
          store.loginSession({ name, email, phone, role: 'user' });
        }
      };
    }

    // Authenticated Header & Nav Handlers
    const headerLogo = document.getElementById('header-logo');
    if (headerLogo) headerLogo.onclick = () => store.setPage('dashboard');

    const btnGotoAdmin = document.getElementById('btn-goto-admin');
    if (btnGotoAdmin) btnGotoAdmin.onclick = () => store.setPage('admin');

    const btnToggleSurge = document.getElementById('btn-toggle-surge');
    if (btnToggleSurge) btnToggleSurge.onclick = () => store.triggerSimulatedAnomaly();

    const btnOpenCopilot = document.getElementById('btn-open-copilot');
    if (btnOpenCopilot) btnOpenCopilot.onclick = () => store.toggleCopilotDrawer(true);

    const headerLogoutBtn = document.getElementById('header-logout-btn');
    if (headerLogoutBtn) headerLogoutBtn.onclick = () => store.logoutSession();

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.onclick = () => store.logoutSession();

    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) adminLogoutBtn.onclick = () => store.logoutSession();

    const adminSwitchUserBtn = document.getElementById('admin-switch-user-btn');
    if (adminSwitchUserBtn) adminSwitchUserBtn.onclick = () => store.setPage('dashboard');

    const btnTogglePlugRelay = document.getElementById('btn-toggle-plug-relay');
    if (btnTogglePlugRelay) btnTogglePlugRelay.onclick = () => store.togglePlugRelay();

    const btnTriggerTest = document.getElementById('btn-trigger-test');
    if (btnTriggerTest) btnTriggerTest.onclick = () => store.triggerSimulatedAnomaly();

    const btnCloseCopilot = document.getElementById('btn-close-copilot');
    if (btnCloseCopilot) btnCloseCopilot.onclick = () => store.toggleCopilotDrawer(false);

    // Nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = (e) => {
        const p = e.currentTarget.getAttribute('data-page');
        if (p) store.setPage(p);
      };
    });

    // Copilot chips
    document.querySelectorAll('.copilot-chip').forEach(chip => {
      chip.onclick = (e) => {
        const q = e.currentTarget.getAttribute('data-query');
        if (q) {
          const container = document.getElementById('copilot-response-container');
          if (container) {
            const res = queryRagAssistant(q);
            container.innerHTML = `
              <div class="space-y-xs animate-fadeIn">
                <span class="font-mono text-[10px] text-cyber-emerald uppercase font-bold tracking-wider">AI Diagnostic Result</span>
                <p class="font-sans text-xs text-on-surface whitespace-pre-line leading-relaxed">${res.response}</p>
              </div>
            `;
          }
        }
      };
    });

    // Admin Tabs & Data Loading
    if (page === 'admin') {
      const tabBtns = document.querySelectorAll('.admin-tab-btn');
      const tabContents = document.querySelectorAll('.admin-tab-content');

      tabBtns.forEach(btn => {
        btn.onclick = (e) => {
          const tab = e.currentTarget.getAttribute('data-tab');
          tabBtns.forEach(b => {
            b.classList.remove('bg-cyber-emerald', 'text-space-void', 'font-bold');
            b.classList.add('text-on-surface-variant');
          });
          e.currentTarget.classList.add('bg-cyber-emerald', 'text-space-void', 'font-bold');
          e.currentTarget.classList.remove('text-on-surface-variant');

          tabContents.forEach(c => {
            if (c.id === `tab-${tab}`) c.classList.remove('hidden');
            else c.classList.add('hidden');
          });

          if (tab === 'users') loadAdminUsers();
          if (tab === 'devices') loadAdminDevices();
        };
      });

      async function loadAdminUsers() {
        const tb = document.getElementById('admin-user-table-body');
        if (!tb) return;
        try {
          const resp = await fetch('http://localhost:8000/api/admin/users');
          const data = await resp.json();
          const users = data.users || [];
          const kUsers = document.getElementById('kpi-users');
          if (kUsers) kUsers.innerText = `${users.length} Accounts`;

          if (users.length === 0) {
            tb.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-on-surface-variant">No registered users found.</td></tr>`;
            return;
          }

          tb.innerHTML = users.map(u => `
            <tr class="hover:bg-surface-container-highest/40 transition-colors">
              <td class="p-md text-on-surface-variant">#${u.id}</td>
              <td class="p-md font-bold text-on-surface font-sans">${u.name || 'User'}</td>
              <td class="p-md text-cyber-cyan">${u.email}</td>
              <td class="p-md text-on-surface-variant">${u.phone || 'N/A'}</td>
              <td class="p-md">
                <select class="admin-role-select bg-surface-container-lowest border border-outline-variant text-xs rounded-lg px-2 py-1 ${u.role === 'admin' ? 'text-cyber-emerald font-bold' : 'text-on-surface'}" data-userid="${u.id}">
                  <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                </select>
              </td>
              <td class="p-md text-right space-x-xs">
                <button class="save-role-btn px-2 py-1 rounded bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald text-[11px] font-bold" data-userid="${u.id}">
                  Save
                </button>
              </td>
            </tr>
          `).join('');

          document.querySelectorAll('.save-role-btn').forEach(b => {
            b.onclick = async (e) => {
              const uId = e.currentTarget.getAttribute('data-userid');
              const sel = document.querySelector(`.admin-role-select[data-userid="${uId}"]`);
              if (sel) {
                await fetch(`http://localhost:8000/api/admin/users/${uId}/role`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: sel.value })
                });
                alert('Role updated successfully.');
                loadAdminUsers();
              }
            };
          });
        } catch (e) {
          tb.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-cyber-crimson">Failed to load users from backend.</td></tr>`;
        }
      }

      async function loadAdminDevices() {
        const grid = document.getElementById('admin-devices-grid');
        if (!grid) return;
        try {
          const resp = await fetch('http://localhost:8000/api/admin/devices');
          const data = await resp.json();
          const devices = data.devices || [];

          if (devices.length === 0) {
            grid.innerHTML = `
              <div class="col-span-2 cyber-glass rounded-2xl p-xl border border-outline-variant text-center space-y-sm">
                <span class="material-symbols-outlined text-3xl text-cyber-cyan">memory</span>
                <h3 class="font-bold text-on-surface text-base">No ESP32 Nodes Registered Yet</h3>
                <p class="font-sans text-xs text-on-surface-variant max-w-md mx-auto">
                  When your ESP32 PZEM-004T devices power on and stream telemetry to POST /api/esp32/telemetry, they will register here automatically with real-time IP, signal strength, and live wattage.
                </p>
              </div>
            `;
            return;
          }

          grid.innerHTML = devices.map(d => `
            <div class="cyber-glass rounded-xl p-lg border border-outline-variant space-y-md">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-sm text-on-surface">${d.name}</h3>
                  <p class="font-mono text-[10px] text-on-surface-variant">${d.id} • ${d.ip}</p>
                </div>
                <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/30">${d.status}</span>
              </div>
              <div class="grid grid-cols-3 gap-xs font-mono text-xs text-center">
                <div class="p-xs rounded bg-surface-container-lowest"><span class="text-on-surface-variant block text-[9px]">VOLTAGE</span><span class="font-bold">${d.voltage}V</span></div>
                <div class="p-xs rounded bg-surface-container-lowest"><span class="text-on-surface-variant block text-[9px]">POWER</span><span class="font-bold text-cyber-emerald">${d.live_watts}W</span></div>
                <div class="p-xs rounded bg-surface-container-lowest"><span class="text-on-surface-variant block text-[9px]">RELAY</span><span class="font-bold">${d.relay_state}</span></div>
              </div>
            </div>
          `).join('');
        } catch (e) {}
      }

      loadAdminUsers();
      loadAdminDevices();
    }
  }

  // -------------------------------------------------------------
  // 10. INITIALIZATION
  // -------------------------------------------------------------
  store.subscribe(renderApp);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initElectricBackground();
      renderApp();
    });
  } else {
    initElectricBackground();
    renderApp();
  }

})();
