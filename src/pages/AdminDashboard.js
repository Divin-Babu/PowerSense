// Admin Dashboard Page Component for PowerSense AI (Module 12)

import { store } from '../state/store.js';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateUserRole,
  deleteUser,
  fetchAdminDevices,
  fetchTariffs,
  updateTariffs,
  fetchSystemHealth
} from '../services/api.js';

export function AdminDashboard() {
  const state = store.getState();
  const user = state.user || { name: 'System Administrator', email: 'admin@powersense.com', role: 'admin' };

  return `
    <main class="max-w-7xl mx-auto px-grid-margin mt-md space-y-lg pb-32">
      <!-- Admin Top Banner with Active Session -->
      <section class="relative overflow-hidden rounded-2xl bg-surface-container-low border border-cyber-emerald/40 p-lg cyber-glass transition-all shadow-2xl">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-md relative z-10">
          <div class="space-y-xs">
            <div class="flex flex-wrap items-center gap-xs">
              <span class="w-2.5 h-2.5 rounded-full bg-cyber-emerald animate-ping"></span>
              <span class="font-mono text-[11px] font-bold text-cyber-emerald uppercase tracking-widest bg-cyber-emerald/10 px-2 py-0.5 rounded border border-cyber-emerald/30">
                ACTIVE ADMIN SESSION (ROLE: ADMIN)
              </span>
              <span class="font-mono text-[11px] text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded border border-outline-variant">
                Logged in as: <strong class="text-on-surface">${user.email}</strong> (${user.name || 'Admin'})
              </span>
              <span class="font-mono text-[11px] text-cyber-cyan bg-cyber-cyan/10 px-2 py-0.5 rounded border border-cyber-cyan/30">
                Core System Active
              </span>
            </div>
            <h1 class="font-display-lg text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Enterprise Admin <span class="text-cyber-emerald">Command Center</span>
            </h1>
            <p class="font-sans text-xs text-on-surface-variant">
              Centralized platform control for user roles, ESP32 nodes, PZEM-004T sensors, electricity tariffs, and system diagnostics.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-sm">
            <button id="admin-export-report-btn" class="px-md py-sm rounded-xl bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald border border-cyber-emerald/40 text-xs font-bold font-mono flex items-center gap-xs transition-all shadow-sm">
              <span class="material-symbols-outlined text-[16px]">download</span>
              Export Audit
            </button>
            <button id="admin-logout-btn" class="px-md py-sm rounded-xl bg-error-container/20 hover:bg-error-container/40 text-on-error-container border border-error/40 text-xs font-bold font-mono flex items-center gap-xs transition-all shadow-sm">
              <span class="material-symbols-outlined text-[16px]">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </section>

      <!-- Sub-Navigation Tab Bar -->
      <section class="flex flex-wrap items-center gap-xs border-b border-outline-variant pb-xs">
        <button class="admin-tab-btn active px-md py-sm rounded-lg text-xs font-bold font-mono text-space-void bg-cyber-emerald transition-all flex items-center gap-xs" data-tab="overview">
          <span class="material-symbols-outlined text-[16px]">dashboard</span> Overview
        </button>
        <button class="admin-tab-btn px-md py-sm rounded-lg text-xs font-bold font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-xs" data-tab="users">
          <span class="material-symbols-outlined text-[16px]">group</span> User Management
        </button>
        <button class="admin-tab-btn px-md py-sm rounded-lg text-xs font-bold font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-xs" data-tab="devices">
          <span class="material-symbols-outlined text-[16px]">memory</span> Node & PZEM Fleet
        </button>
        <button class="admin-tab-btn px-md py-sm rounded-lg text-xs font-bold font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-xs" data-tab="tariffs">
          <span class="material-symbols-outlined text-[16px]">payments</span> Tariff Configuration
        </button>
        <button class="admin-tab-btn px-md py-sm rounded-lg text-xs font-bold font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-xs" data-tab="health">
          <span class="material-symbols-outlined text-[16px]">monitoring</span> System Health
        </button>
        <button class="admin-tab-btn px-md py-sm rounded-lg text-xs font-bold font-mono text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-xs" data-tab="rag">
          <span class="material-symbols-outlined text-[16px]">psychology</span> RAG Knowledge Base
        </button>
      </section>

      <!-- TAB 1: OVERVIEW -->
      <div id="tab-overview" class="admin-tab-content space-y-lg">
        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
            <div class="flex justify-between items-center text-on-surface-variant">
              <span class="font-mono text-[10px] uppercase font-bold tracking-wider">REGISTERED USERS</span>
              <span class="material-symbols-outlined text-[18px] text-cyber-cyan">person</span>
            </div>
            <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-users">--</p>
            <span class="font-mono text-[10px] text-cyber-emerald">Registered Accounts</span>
          </div>

          <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
            <div class="flex justify-between items-center text-on-surface-variant">
              <span class="font-mono text-[10px] uppercase font-bold tracking-wider">SMART PLUG NODES</span>
              <span class="material-symbols-outlined text-[18px] text-cyber-emerald">bolt</span>
            </div>
            <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-devices">0 Units (0 Active)</p>
            <span class="font-mono text-[10px] text-cyber-cyan">1.0 Hz PZEM-004T Ingestion Ready</span>
          </div>

          <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
            <div class="flex justify-between items-center text-on-surface-variant">
              <span class="font-mono text-[10px] uppercase font-bold tracking-wider">TOTAL SYSTEM LOAD</span>
              <span class="material-symbols-outlined text-[18px] text-cyber-amber">speed</span>
            </div>
            <p class="font-mono text-2xl font-bold text-on-surface" id="kpi-load">0.00 kW</p>
            <span class="font-mono text-[10px] text-on-surface-variant">Across Connected ESP32 Nodes</span>
          </div>

          <div class="cyber-glass rounded-xl p-md border border-outline-variant space-y-xs">
            <div class="flex justify-between items-center text-on-surface-variant">
              <span class="font-mono text-[10px] uppercase font-bold tracking-wider">SYSTEM HEALTH</span>
              <span class="material-symbols-outlined text-[18px] text-cyber-emerald">verified</span>
            </div>
            <p class="font-mono text-2xl font-bold text-cyber-emerald" id="kpi-health">100%</p>
            <span class="font-mono text-[10px] text-cyber-emerald">Core Services Nominal</span>
          </div>
        </div>

        <!-- Quick System Status Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-md">
          <div class="cyber-glass rounded-xl p-lg border border-outline-variant lg:col-span-2 space-y-md">
            <div class="flex justify-between items-center">
              <h3 class="font-bold text-sm text-on-surface uppercase tracking-wide">Live Grid Load Distribution</h3>
              <span class="font-mono text-xs text-cyber-cyan" id="overview-grid-status">Awaiting Hardware Stream</span>
            </div>
            <div class="p-lg rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-center text-xs text-on-surface-variant font-mono space-y-xs">
              <span class="material-symbols-outlined text-2xl text-cyber-cyan/70">sensors</span>
              <p>No active load draw detected. Telemetry spectrum will populate as soon as ESP32 nodes transmit.</p>
            </div>
          </div>

          <div class="cyber-glass rounded-xl p-lg border border-outline-variant space-y-md">
            <h3 class="font-bold text-sm text-on-surface uppercase tracking-wide">Master Actions</h3>
            <div class="space-y-xs">
              <button id="admin-trigger-anomaly-btn" class="w-full py-sm px-md rounded-lg bg-cyber-amber/15 hover:bg-cyber-amber/25 text-cyber-amber border border-cyber-amber/30 text-xs font-bold font-mono flex items-center justify-between transition-all">
                <span>Simulate Surge Anomaly</span>
                <span class="material-symbols-outlined text-[16px]">bolt</span>
              </button>
              <button id="admin-sync-db-btn" class="w-full py-sm px-md rounded-lg bg-cyber-cyan/15 hover:bg-cyber-cyan/25 text-cyber-cyan border border-cyber-cyan/30 text-xs font-bold font-mono flex items-center justify-between transition-all">
                <span>Refresh User Accounts</span>
                <span class="material-symbols-outlined text-[16px]">sync</span>
              </button>
              <button id="admin-emergency-trip-btn" class="w-full py-sm px-md rounded-lg bg-cyber-crimson/15 hover:bg-cyber-crimson/25 text-cyber-crimson border border-cyber-crimson/30 text-xs font-bold font-mono flex items-center justify-between transition-all">
                <span>Emergency Fleet Cutoff</span>
                <span class="material-symbols-outlined text-[16px]">power_settings_new</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: USER MANAGEMENT -->
      <div id="tab-users" class="admin-tab-content hidden space-y-md">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
          <div>
            <h2 class="text-lg font-bold text-on-surface">Registered User Accounts (tbl_user)</h2>
            <p class="font-sans text-xs text-on-surface-variant">Manage permissions, promote users to admin, or remove accounts.</p>
          </div>
          <div class="flex items-center gap-xs">
            <input id="user-search-input" type="text" placeholder="Search by name or email..." class="bg-surface-container-lowest border border-outline-variant rounded-lg px-md py-1.5 text-xs font-sans text-on-surface outline-none focus:border-cyber-emerald" />
            <button id="refresh-users-btn" class="p-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface border border-outline-variant">
              <span class="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
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
              <tr>
                <td colspan="6" class="p-lg text-center text-on-surface-variant">Loading user dataset from PostgreSQL tbl_user...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: DEVICE FLEET -->
      <div id="tab-devices" class="admin-tab-content hidden space-y-md">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-lg font-bold text-on-surface">ESP32 & PZEM-004T Node Fleet</h2>
            <p class="font-sans text-xs text-on-surface-variant">Live telemetry status across all registered hardware plugs.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-md" id="admin-devices-grid">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- TAB 4: TARIFFS -->
      <div id="tab-tariffs" class="admin-tab-content hidden space-y-md">
        <div class="max-w-2xl cyber-glass rounded-xl p-lg border border-outline-variant space-y-lg">
          <div>
            <h2 class="text-lg font-bold text-on-surface">Electricity Tariff Rates Configuration</h2>
            <p class="font-sans text-xs text-on-surface-variant">Configure per-kWh rates used for real-time cost estimation and predictive billing.</p>
          </div>

          <form id="admin-tariff-form" class="space-y-md">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">STANDARD RATE (₹/kWh)</label>
                <input id="tariff-std" type="number" step="0.01" value="6.50" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
              </div>
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">PEAK TOU RATE (₹/kWh)</label>
                <input id="tariff-peak" type="number" step="0.01" value="9.80" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
              </div>
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">OFF-PEAK RATE (₹/kWh)</label>
                <input id="tariff-offpeak" type="number" step="0.01" value="4.20" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-md pt-xs">
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">PEAK START HOUR (24H)</label>
                <input id="tariff-start" type="number" min="0" max="23" value="18" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
              </div>
              <div class="space-y-xs">
                <label class="font-mono text-[10px] font-bold text-on-surface-variant uppercase">PEAK END HOUR (24H)</label>
                <input id="tariff-end" type="number" min="0" max="23" value="22" class="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md text-sm font-mono text-on-surface focus:border-cyber-emerald outline-none" required />
              </div>
            </div>

            <div id="tariff-status-msg" class="hidden p-sm rounded-lg bg-cyber-emerald/15 border border-cyber-emerald/40 text-cyber-emerald text-xs font-mono font-bold"></div>

            <button type="submit" class="w-full py-md rounded-xl bg-cyber-emerald text-space-void font-mono font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-cyber-emerald/20">
              Save Tariff Schedule
            </button>
          </form>
        </div>
      </div>

      <!-- TAB 5: SYSTEM HEALTH -->
      <div id="tab-health" class="admin-tab-content hidden space-y-md">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div class="cyber-glass rounded-xl p-lg border border-outline-variant space-y-md">
            <h3 class="font-bold text-sm text-on-surface uppercase tracking-wide">Server Diagnostics</h3>
            <div class="space-y-sm font-mono text-xs">
              <div class="flex justify-between p-sm rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                <span class="text-on-surface-variant">FASTAPI BACKEND:</span>
                <span class="text-cyber-emerald font-bold">ONLINE (port 8000)</span>
              </div>
              <div class="flex justify-between p-sm rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                <span class="text-on-surface-variant">POSTGRESQL 18:</span>
                <span class="text-cyber-emerald font-bold">CONNECTED (localhost:5432)</span>
              </div>
              <div class="flex justify-between p-sm rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                <span class="text-on-surface-variant">MQTT BROKER:</span>
                <span class="text-cyber-emerald font-bold">ACTIVE (Mosquitto 1883)</span>
              </div>
              <div class="flex justify-between p-sm rounded-lg bg-surface-container-lowest border border-outline-variant/50">
                <span class="text-on-surface-variant">SAMPLING RATE:</span>
                <span class="text-cyber-cyan font-bold">1.0 Hz (1000ms Interval)</span>
              </div>
            </div>
          </div>

          <div class="cyber-glass rounded-xl p-lg border border-outline-variant space-y-md">
            <h3 class="font-bold text-sm text-on-surface uppercase tracking-wide">Live Diagnostics Terminal</h3>
            <div class="p-md rounded-xl bg-obsidian text-cyber-emerald font-mono text-[11px] h-48 overflow-y-auto space-y-1 border border-white/5" id="admin-log-terminal">
              <div>[INFO] System initialized at 1.0Hz telemetry rate.</div>
              <div>[INFO] PostgreSQL connection pool active (tbl_user verified).</div>
              <div>[INFO] MQTT Broker listening on port 1883.</div>
              <div>[AUTH] Admin credentials verified with role='admin'.</div>
              <div>[AI] ML Anomaly Detector loaded with threshold baseline.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 6: RAG KNOWLEDGE BASE -->
      <div id="tab-rag" class="admin-tab-content hidden space-y-md">
        <div class="cyber-glass rounded-xl p-lg border border-outline-variant space-y-md">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-lg font-bold text-on-surface">RAG AI Knowledge Base Documents</h2>
              <p class="font-sans text-xs text-on-surface-variant">Curated context used by the AI Copilot for predictive maintenance insights.</p>
            </div>
          </div>

          <div class="space-y-sm">
            ${(state.ragKnowledgeBase || []).map((doc, idx) => `
              <div class="p-md rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-xs">
                <div class="flex justify-between items-center">
                  <span class="font-mono text-xs font-bold text-cyber-cyan">${doc.title}</span>
                  <span class="font-mono text-[10px] text-cyber-emerald bg-cyber-emerald/10 px-2 py-0.5 rounded border border-cyber-emerald/20">${doc.category}</span>
                </div>
                <p class="font-sans text-xs text-on-surface-variant leading-relaxed">${doc.content}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </main>
  `;
}

export function bindAdminEvents() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      tabButtons.forEach(b => {
        b.classList.remove('active', 'bg-cyber-emerald', 'text-space-void');
        b.classList.add('text-on-surface-variant');
      });
      e.currentTarget.classList.add('active', 'bg-cyber-emerald', 'text-space-void');
      e.currentTarget.classList.remove('text-on-surface-variant');

      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.remove('hidden');
        } else {
          content.classList.add('hidden');
        }
      });

      if (targetTab === 'users') loadUsers();
      if (targetTab === 'devices') loadDevices();
    });
  });

  // Switch to regular user plug view
  const switchBtn = document.getElementById('admin-switch-user-btn');
  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      store.setPage('dashboard');
    });
  }

  // Admin Logout Button
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      store.logoutSession();
    });
  }

  // Anomaly trigger shortcut
  const anomalyBtn = document.getElementById('admin-trigger-anomaly-btn');
  if (anomalyBtn) {
    anomalyBtn.addEventListener('click', () => {
      store.triggerSimulatedAnomaly();
      alert('Simulated Surge Anomaly triggered on Smart Plug cluster.');
    });
  }

  // Export report
  const exportBtn = document.getElementById('admin-export-report-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      alert('Generating and downloading PowerSense AI System Audit Report (PDF)...');
    });
  }

  // Load KPI overview
  async function loadOverview() {
    const data = await fetchAdminOverview();
    if (data?.kpis) {
      const kUsers = document.getElementById('kpi-users');
      if (kUsers) kUsers.innerText = `${data.kpis.total_registered_users} Accounts`;

      const kDevices = document.getElementById('kpi-devices');
      if (kDevices) kDevices.innerText = `${data.kpis.registered_smart_plugs} Units (${data.kpis.active_online_nodes} Active)`;

      const kLoad = document.getElementById('kpi-load');
      if (kLoad) kLoad.innerText = `${data.kpis.total_system_load_kw} kW`;

      const kHealth = document.getElementById('kpi-health');
      if (kHealth) kHealth.innerText = `${data.kpis.system_health_pct}%`;
    }
  }

  // Load users into table
  async function loadUsers() {
    const tableBody = document.getElementById('admin-user-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-on-surface-variant">Fetching users from PostgreSQL tbl_user...</td></tr>`;

    try {
      const data = await fetchAdminUsers();
      const users = data.users || [];
      if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-on-surface-variant">No registered users found in PostgreSQL tbl_user.</td></tr>`;
        return;
      }

      tableBody.innerHTML = users.map(u => `
        <tr class="hover:bg-surface-container-highest/40 transition-colors">
          <td class="p-md text-on-surface-variant">#${u.id}</td>
          <td class="p-md font-bold text-on-surface font-sans">${u.name || 'User'}</td>
          <td class="p-md text-cyber-cyan">${u.email}</td>
          <td class="p-md text-on-surface-variant">${u.phone || 'N/A'}</td>
          <td class="p-md">
            <select class="admin-role-select bg-surface-container-lowest border border-outline-variant text-xs rounded-lg px-2 py-1 ${u.role === 'admin' ? 'text-cyber-emerald font-bold border-cyber-emerald/50' : 'text-on-surface'}" data-userid="${u.id}">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>user</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          </td>
          <td class="p-md text-right space-x-xs">
            <button class="save-role-btn px-2 py-1 rounded bg-cyber-emerald/20 hover:bg-cyber-emerald/30 text-cyber-emerald text-[11px] font-bold" data-userid="${u.id}">
              Save Role
            </button>
            ${u.email !== 'admin@powersense.com' ? `
              <button class="delete-user-btn px-2 py-1 rounded bg-cyber-crimson/20 hover:bg-cyber-crimson/30 text-cyber-crimson text-[11px] font-bold" data-userid="${u.id}">
                Delete
              </button>
            ` : ''}
          </td>
        </tr>
      `).join('');

      // Bind role update buttons
      document.querySelectorAll('.save-role-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const uId = e.currentTarget.getAttribute('data-userid');
          const select = document.querySelector(`.admin-role-select[data-userid="${uId}"]`);
          if (select) {
            const newRole = select.value;
            const res = await updateUserRole(uId, newRole);
            alert(res.message || 'Role updated successfully.');
            loadUsers();
          }
        });
      });

      // Bind delete buttons
      document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const uId = e.currentTarget.getAttribute('data-userid');
          if (confirm(`Are you sure you want to delete user ID #${uId}?`)) {
            const res = await deleteUser(uId);
            alert(res.message || 'User deleted successfully.');
            loadUsers();
          }
        });
      });

    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" class="p-lg text-center text-cyber-crimson">Error: ${err.message}</td></tr>`;
    }
  }

  // Load devices
  async function loadDevices() {
    const grid = document.getElementById('admin-devices-grid');
    if (!grid) return;

    const data = await fetchAdminDevices();
    const devices = data.devices || [];

    if (devices.length === 0) {
      grid.innerHTML = `
        <div class="col-span-1 md:col-span-2 cyber-glass rounded-2xl p-xl border border-outline-variant/60 text-center space-y-md">
          <div class="w-14 h-14 mx-auto rounded-2xl bg-surface-container-highest flex items-center justify-center text-cyber-cyan">
            <span class="material-symbols-outlined text-3xl">memory</span>
          </div>
          <div class="space-y-xs max-w-md mx-auto">
            <h3 class="font-bold text-on-surface text-base">No ESP32 Nodes Registered Yet</h3>
            <p class="font-sans text-xs text-on-surface-variant leading-relaxed">
              When your ESP32 PZEM-004T smart plug units power on and push live telemetry, they will automatically register here with real-time IP, MAC address, Wi-Fi RSSI signal, voltage, and live watt draw.
            </p>
          </div>
          <div class="inline-flex items-center gap-xs px-md py-xs rounded-full bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald font-mono text-xs">
            <span class="w-2 h-2 rounded-full bg-cyber-emerald animate-ping"></span>
            <span>FastAPI Ingestion Endpoint Ready</span>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = devices.map(d => `
      <div class="cyber-glass rounded-xl p-lg border ${d.status === 'ONLINE' ? 'border-outline-variant hover:border-cyber-emerald' : 'border-cyber-crimson/40 bg-cyber-crimson/5'} transition-all space-y-md">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-xs">
            <div class="w-10 h-10 rounded-lg ${d.status === 'ONLINE' ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30' : 'bg-cyber-crimson/10 text-cyber-crimson border border-cyber-crimson/30'} flex items-center justify-center">
              <span class="material-symbols-outlined">bolt</span>
            </div>
            <div>
              <h3 class="font-bold text-sm text-on-surface">${d.name}</h3>
              <p class="font-mono text-[10px] text-on-surface-variant">${d.id} • ${d.ip}</p>
            </div>
          </div>
          <span class="font-mono text-[10px] font-bold px-2 py-0.5 rounded ${d.status === 'ONLINE' ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/30' : 'bg-cyber-crimson/10 text-cyber-crimson border border-cyber-crimson/30'}">
            ${d.status}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-xs font-mono text-xs">
          <div class="p-xs rounded bg-surface-container-lowest text-center">
            <span class="text-on-surface-variant block text-[9px]">VOLTAGE</span>
            <span class="font-bold text-on-surface">${d.voltage}V</span>
          </div>
          <div class="p-xs rounded bg-surface-container-lowest text-center">
            <span class="text-on-surface-variant block text-[9px]">LIVE LOAD</span>
            <span class="font-bold text-cyber-emerald">${d.live_watts}W</span>
          </div>
          <div class="p-xs rounded bg-surface-container-lowest text-center">
            <span class="text-on-surface-variant block text-[9px]">RELAY</span>
            <span class="font-bold ${d.relay_state === 'ON' ? 'text-cyber-emerald' : 'text-on-surface-variant'}">${d.relay_state}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Tariff form handler
  const tariffForm = document.getElementById('admin-tariff-form');
  if (tariffForm) {
    tariffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const std = parseFloat(document.getElementById('tariff-std')?.value || 6.5);
      const peak = parseFloat(document.getElementById('tariff-peak')?.value || 9.8);
      const offpeak = parseFloat(document.getElementById('tariff-offpeak')?.value || 4.2);
      const start = parseInt(document.getElementById('tariff-start')?.value || 18);
      const end = parseInt(document.getElementById('tariff-end')?.value || 22);

      const res = await updateTariffs({
        standard_rate: std,
        peak_rate: peak,
        off_peak_rate: offpeak,
        currency: 'INR',
        peak_start_hour: start,
        peak_end_hour: end
      });

      const msg = document.getElementById('tariff-status-msg');
      if (msg) {
        msg.innerText = res.message || 'Tariff updated successfully.';
        msg.classList.remove('hidden');
        setTimeout(() => msg.classList.add('hidden'), 4000);
      }
    });
  }

  const refreshBtn = document.getElementById('refresh-users-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadUsers);

  // Initial load
  loadOverview();
}
