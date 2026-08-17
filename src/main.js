// Application Entry Point

import { store } from './state/store.js';
import { startIoTSimulator } from './services/iotSimulator.js';

import { Header, bindHeaderEvents } from './components/Header.js';
import { Navigation, bindNavigationEvents } from './components/Navigation.js';
import { CursorGlow, initCursorGlow } from './components/CursorGlow.js';
import { RagModal, bindRagModalEvents } from './components/RagModal.js';
import { SimulatorModal, bindSimulatorModalEvents } from './components/SimulatorModal.js';

import { Login, bindLoginEvents } from './pages/Login.js';
import { Register, bindRegisterEvents } from './pages/Register.js';
import { Dashboard, bindDashboardEvents } from './pages/Dashboard.js';
import { AdminDashboard, bindAdminEvents } from './pages/AdminDashboard.js';
import { Analytics, bindAnalyticsEvents } from './pages/Analytics.js';
import { Alerts, bindAlertsEvents } from './pages/Alerts.js';
import { Profile, bindProfileEvents } from './pages/Profile.js';

function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const state = store.getState();
  const page = state.currentPage;
  const loggedIn = state.isLoggedIn;

  // Determine active view
  let pageContent = '';
  let bindPageEvents = () => {};

  if (!loggedIn) {
    if (page === 'register') {
      pageContent = Register();
      bindPageEvents = bindRegisterEvents;
    } else {
      pageContent = Login();
      bindPageEvents = bindLoginEvents;
    }
  } else {
    switch (page) {
      case 'admin':
        if (state.user?.role !== 'admin') {
          pageContent = Dashboard();
          bindPageEvents = bindDashboardEvents;
        } else {
          pageContent = AdminDashboard();
          bindPageEvents = bindAdminEvents;
        }
        break;
      case 'analytics':
        pageContent = Analytics();
        bindPageEvents = bindAnalyticsEvents;
        break;
      case 'alerts':
        pageContent = Alerts();
        bindPageEvents = bindAlertsEvents;
        break;
      case 'profile':
        pageContent = Profile();
        bindPageEvents = bindProfileEvents;
        break;
      case 'dashboard':
      default:
        pageContent = Dashboard();
        bindPageEvents = bindDashboardEvents;
        break;
    }
  }

  // App shell markup
  const isAuthPage = !loggedIn || page === 'login' || page === 'register';

  appContainer.innerHTML = `
    <div class="min-h-screen bg-background text-on-surface relative font-body-md overflow-x-hidden">
      ${CursorGlow()}
      
      ${!isAuthPage ? Header() : ''}

      ${pageContent}

      ${!isAuthPage ? Navigation() : ''}

      ${RagModal()}
      ${SimulatorModal()}
    </div>
  `;

  // Bind event listeners
  initCursorGlow();
  if (!isAuthPage) {
    bindHeaderEvents();
    bindNavigationEvents();
  }
  bindPageEvents();
  bindRagModalEvents();
  bindSimulatorModalEvents();
}

// Subscribe to state changes
store.subscribe(renderApp);

// Initialize IoT Simulator
startIoTSimulator();

// Initial Render
renderApp();
