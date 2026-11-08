/* Simplest - Main Application Entry & SPA Router */

let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Simplest App] Initializing...');

  // Initialize UI Theme (Dark/Light Mode)
  initTheme();

  // Initialize Firebase Config & Aut
  initFirebase();

  // Initialize Database Listeners
  initDatabase();

  // Bind Auth Observer
  initAuth((user) => {
    if (user) {
      refreshActiveView();
    }
  });

  // Data Change Reaction
  // Firebase fires one snapshot per listened node (contacts, credit_logs,
  // debt_payments, pricing ...), so a single edit can arrive as a burst of
  // callbacks. Re-rendering the whole view for each one froze the UI for
  // ~2s with a few hundred orders, so bursts are coalesced into one render.
  let pendingRefreshTimer = null;
  onDataChanged((data) => {
    if (pendingRefreshTimer) return;
    pendingRefreshTimer = setTimeout(() => {
      pendingRefreshTimer = null;
      refreshActiveView();
    }, 50);
  });

  // Bind WhatsApp debt chat modal controls
  const waSendBtn = document.getElementById('wa-debt-send-btn');
  if (waSendBtn) {
    waSendBtn.addEventListener('click', () => {
      if (typeof sendWhatsAppDebtMessage === 'function') sendWhatsAppDebtMessage();
    });
  }
  const waOpenerSaveBtn = document.getElementById('wa-opener-save-btn');
  if (waOpenerSaveBtn) {
    waOpenerSaveBtn.addEventListener('click', async () => {
      if (typeof saveWaOpenerTemplate !== 'function') return;
      const input = document.getElementById('wa-opener-input');
      if (!input) return;
      const val = input.value.trim();
      if (!val) {
        showMaterialToast('Opening message cannot be empty', 'warning');
        return;
      }
      try {
        await saveWaOpenerTemplate(val);
        showMaterialToast('Default opening message saved', 'success');
      } catch (err) {
        showMaterialToast('Failed to save opening message', 'error');
      }
    });
  }
  const waModal = document.getElementById('whatsapp-debt-modal');
  if (waModal) {
    waModal.addEventListener('click', (e) => {
      if (e.target === waModal) closeWhatsAppDebtModal();
    });
  }

  // Setup View Navigation
  setupNavigation();

  // Register PWA Service Worker
  registerServiceWorker();
});

function initTheme() {
  const savedTheme = localStorage.getItem('simplest_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  setTheme(theme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('simplest_theme', theme);

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    if (theme === 'dark') {
      themeToggleBtn.innerHTML = `${getSvgIcon('sun', 'sm')} <span>Light</span>`;
    } else {
      themeToggleBtn.innerHTML = `${getSvgIcon('moon', 'sm')} <span>Dark</span>`;
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function setupNavigation() {
  // Desktop Sidebar Nav Clicks
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const viewName = item.getAttribute('data-view');
      if (viewName) switchView(viewName);
    });
  });

  // Mobile Bottom Nav Clicks
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const viewName = item.getAttribute('data-view');
      if (viewName) switchView(viewName);
    });
  });

  // Global mobile haptic feedback on interactive button / tab clicks
  document.addEventListener('pointerdown', (e) => {
    const interactiveTarget = e.target.closest('button, .btn, .nav-item, .bottom-nav-item, .filter-pill, .daytype-btn, .portion-radio-btn, .date-select-card, .modal-close');
    if (interactiveTarget && typeof triggerHapticFeedback === 'function') {
      triggerHapticFeedback('light');
    }
  });

  // Re-render when crossing the mobile/desktop layout breakpoint.
  // Views only build the markup for the active layout, so a stale render
  // would leave an empty list after resizing the window (or rotating).
  if (window.matchMedia) {
    const layoutMq = window.matchMedia('(max-width: 600px)');
    const onLayoutChange = () => refreshActiveView();
    if (layoutMq.addEventListener) layoutMq.addEventListener('change', onLayoutChange);
    else if (layoutMq.addListener) layoutMq.addListener(onLayoutChange);
  }

  // Modal ESC Key Close Listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

function switchView(viewName) {
  currentView = viewName;

  // Trigger haptic vibration on mobile view navigation
  if (typeof triggerHapticFeedback === 'function') {
    triggerHapticFeedback('light');
  }

  // Toggle View Sections Visibility
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.add('active');
  }

  // Update Page Title (Clean Pure English Title)
  const titleMap = {
    'dashboard': 'Dashboard Overview',
    'menu': 'Weekly Menu',
    'contacts': 'Contacts Management',
    'orders': 'Orders Management',
    'kitchen': 'Rider Dispatch Hub'
  };

  const headerTitleEl = document.getElementById('main-header-title');
  if (headerTitleEl) {
    headerTitleEl.textContent = titleMap[viewName] || 'Simplest';
  }

  // Update Navigation Active Highlights
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === viewName);
  });

  // Render View Content
  refreshActiveView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function refreshActiveView() {
  if (currentView === 'dashboard') initDashboardView();
  if (currentView === 'menu') initMenuView();
  if (currentView === 'contacts') initContactsView();
  if (currentView === 'orders') initOrdersView();
  if (currentView === 'kitchen') initKitchenView();
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
        .catch(err => console.warn('[PWA] Service Worker failed:', err));
    });
  }
}
