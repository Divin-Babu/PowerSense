// BottomNavBar Component

import { store } from '../state/store.js';

export function Navigation() {
  const state = store.getState();
  const current = state.currentPage;

  const navItems = [];
  if (state.user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: 'shield_person' });
  }
  navItems.push(
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'analytics', label: 'Analytics', icon: 'insights' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications_active', badge: state.alerts.length },
    { id: 'profile', label: 'Profile', icon: 'person' }
  );

  return `
    <nav class="fixed bottom-0 w-full z-40 bg-surface-container dark:bg-surface-container flex justify-around items-center px-sm pt-xs pb-[calc(0.5rem+env(safe-area-inset-bottom,16px))] border-t border-outline-variant/30 backdrop-blur-xl">
      ${navItems.map(item => {
        const isActive = current === item.id;
        const activeClass = isActive
          ? 'bg-secondary-container dark:bg-secondary-container text-on-secondary-container dark:text-on-secondary-container rounded-xl shadow-lg'
          : 'text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-highest dark:hover:bg-surface-container-highest rounded-xl';
        
        return `
          <button 
            data-page="${item.id}"
            class="nav-btn relative flex flex-col items-center justify-center p-2 px-md ${activeClass} transition-all duration-200 active:scale-95">
            <span class="material-symbols-outlined" style="${isActive ? "font-variation-settings: 'FILL' 1;" : ''}">${item.icon}</span>
            <span class="font-label-sm text-label-sm mt-0.5">${item.label}</span>
            ${item.badge && item.id === 'alerts' ? `
              <span class="absolute top-1 right-2 w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full flex items-center justify-center">${item.badge}</span>
            ` : ''}
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

export function bindNavigationEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = e.currentTarget.getAttribute('data-page');
      if (page) {
        store.setPage(page);
      }
    });
  });
}
