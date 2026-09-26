/**
 * Simplest - Live Update Manager
 * Detects software updates and file changes, prompts user, and executes a 2-second update animation
 * with full cache purging and asset reloading.
 */

(function (window, document) {
  'use strict';

  const STORAGE_KEY_HASH = 'simplest_app_html_hash';
  const CHECK_INTERVAL_MS = 45000; // Check every 45 seconds

  let isUpdating = false;
  let updatePromptElement = null;
  let updateModalElement = null;
  let pendingRemoteHash = null;
  let checkTimer = null;

  // Compute fast hash (SHA-256 with fallback to DJB2)
  async function computeHash(text) {
    if (window.crypto && crypto.subtle) {
      try {
        const msgBuffer = new TextEncoder().encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
      } catch (e) {
        // Fallback below
      }
    }
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Inject UI Styles into <head>
  function injectStyles() {
    if (document.getElementById('simplest-updater-styles')) return;

    const style = document.createElement('style');
    style.id = 'simplest-updater-styles';
    style.textContent = `
      /* Update Notification Banner / Toast */
      .simplest-update-banner {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99998;
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-left: 4px solid var(--primary-accent, #10b981);
        border-radius: 14px;
        padding: 16px 20px;
        box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08);
        display: flex;
        align-items: center;
        gap: 16px;
        max-width: 440px;
        width: calc(100% - 32px);
        transform: translateY(120%);
        opacity: 0;
        visibility: hidden;
        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease, visibility 0.35s;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .simplest-update-banner.show {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
      }

      .simplest-update-icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        position: relative;
      }

      .simplest-update-pulse-ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 12px;
        border: 2px solid #10b981;
        animation: simplest-pulse-ring 2s infinite ease-out;
      }

      @keyframes simplest-pulse-ring {
        0% { transform: scale(0.9); opacity: 0.8; }
        100% { transform: scale(1.35); opacity: 0; }
      }

      .simplest-update-content {
        flex: 1;
        min-width: 0;
      }

      .simplest-update-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-main, #0f172a);
        margin: 0 0 3px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .simplest-update-badge {
        font-size: 0.65rem;
        font-weight: 800;
        text-transform: uppercase;
        padding: 2px 6px;
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }

      .simplest-update-desc {
        font-size: 0.8rem;
        color: var(--text-muted, #64748b);
        margin: 0;
        line-height: 1.35;
      }

      .simplest-update-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .simplest-btn-update {
        background: #064e3b;
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.825rem;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s ease, transform 0.1s ease;
        box-shadow: 0 2px 6px rgba(6, 78, 59, 0.25);
      }

      .simplest-btn-update:hover {
        background: #043e2f;
        transform: translateY(-1px);
      }

      .simplest-btn-update:active {
        transform: translateY(0);
      }

      /* 2-Second Update Progress Modal */
      .simplest-update-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99999;
        background: rgba(15, 23, 42, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .simplest-update-modal-overlay.active {
        opacity: 1;
        visibility: visible;
      }

      .simplest-update-card {
        background: var(--bg-surface, #ffffff);
        width: 100%;
        max-width: 420px;
        border-radius: 20px;
        padding: 32px 28px;
        box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.28);
        border: 1px solid var(--border-color, #e2e8f0);
        text-align: center;
        position: relative;
        overflow: hidden;
        transform: scale(0.94);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .simplest-update-modal-overlay.active .simplest-update-card {
        transform: scale(1);
      }

      /* Updating Graphic & Spinner */
      .simplest-update-graphic {
        position: relative;
        width: 72px;
        height: 72px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .simplest-update-ring {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 4px solid var(--border-light, #e2e8f0);
        border-top-color: #10b981;
        border-right-color: #064e3b;
        animation: simplest-spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite;
      }

      .simplest-update-graphic.success .simplest-update-ring {
        display: none;
      }

      .simplest-update-graphic-icon {
        width: 32px;
        height: 32px;
        color: #10b981;
        transition: transform 0.2s ease;
      }

      .simplest-update-check-icon {
        display: none;
        width: 40px;
        height: 40px;
        color: #10b981;
        transform: scale(0);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .simplest-update-graphic.success .simplest-update-graphic-icon {
        display: none;
      }

      .simplest-update-graphic.success .simplest-update-check-icon {
        display: block;
        transform: scale(1);
      }

      @keyframes simplest-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .simplest-update-modal-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--text-main, #0f172a);
        margin: 0 0 6px;
      }

      .simplest-update-modal-step {
        font-size: 0.875rem;
        color: var(--text-muted, #64748b);
        margin: 0 0 24px;
        min-height: 22px;
        transition: all 0.2s ease;
      }

      /* Progress Bar Container */
      .simplest-progress-container {
        position: relative;
        width: 100%;
        height: 8px;
        background: var(--border-light, #e2e8f0);
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 12px;
      }

      .simplest-progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #10b981, #064e3b);
        border-radius: 999px;
        transition: width 0.15s linear;
      }

      .simplest-progress-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.775rem;
        color: var(--text-light, #94a3b8);
        font-weight: 600;
      }

      /* Mobile adjustments */
      @media (max-width: 600px) {
        .simplest-update-banner {
          bottom: calc(var(--bottom-nav-height, 60px) + 16px);
          right: 16px;
          left: 16px;
          width: auto;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
        }

        .simplest-update-actions {
          width: 100%;
          justify-content: flex-end;
        }

        .simplest-update-card {
          padding: 24px 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create DOM Elements for Prompt and Modal
  function createDOMElements() {
    if (document.getElementById('simplest-update-banner')) return;

    // 1. Update Notification Banner
    const banner = document.createElement('div');
    banner.id = 'simplest-update-banner';
    banner.className = 'simplest-update-banner';
    banner.innerHTML = `
      <div class="simplest-update-icon-wrap">
        <div class="simplest-update-pulse-ring"></div>
        <svg style="width: 22px; height: 22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <div class="simplest-update-content">
        <div class="simplest-update-title">
          <span>Software Update</span>
          <span class="simplest-update-badge">New</span>
        </div>
        <p class="simplest-update-desc">A new software version is ready. Update now to refresh all files.</p>
      </div>
      <div class="simplest-update-actions">
        <button type="button" class="simplest-btn-update" id="simplest-update-btn-now">
          <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          <span>Update Now</span>
        </button>
      </div>
    `;
    document.body.appendChild(banner);
    updatePromptElement = banner;

    // 2. 2-Second Updating Animation Modal Overlay
    const modal = document.createElement('div');
    modal.id = 'simplest-update-modal';
    modal.className = 'simplest-update-modal-overlay';
    modal.innerHTML = `
      <div class="simplest-update-card">
        <div class="simplest-update-graphic" id="simplest-modal-graphic">
          <div class="simplest-update-ring"></div>
          <svg class="simplest-update-graphic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          <svg class="simplest-update-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 class="simplest-update-modal-title" id="simplest-modal-title">Updating Simplest</h3>
        <p class="simplest-update-modal-step" id="simplest-modal-step">Clearing cache & preparing update...</p>
        <div class="simplest-progress-container">
          <div class="simplest-progress-bar" id="simplest-modal-progress"></div>
        </div>
        <div class="simplest-progress-meta">
          <span id="simplest-modal-files-label">Synchronizing all files</span>
          <span id="simplest-modal-percent">0%</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    updateModalElement = modal;

    // Event listener
    document.getElementById('simplest-update-btn-now').addEventListener('click', () => {
      hidePrompt();
      startUpdateProcedure(pendingRemoteHash);
    });
  }

  // Show update prompt banner
  function showPrompt(remoteHash) {
    if (isUpdating) return;
    pendingRemoteHash = remoteHash;

    if (!updatePromptElement) createDOMElements();
    updatePromptElement.classList.add('show');
  }

  // Hide update prompt banner
  function hidePrompt() {
    if (updatePromptElement) {
      updatePromptElement.classList.remove('show');
    }
  }

  // Execute the 2-second update animation and purge all caches
  async function startUpdateProcedure(targetHash) {
    if (isUpdating) return;
    isUpdating = true;

    if (!updateModalElement) createDOMElements();
    updateModalElement.classList.add('active');

    const progressBar = document.getElementById('simplest-modal-progress');
    const stepText = document.getElementById('simplest-modal-step');
    const percentText = document.getElementById('simplest-modal-percent');
    const titleText = document.getElementById('simplest-modal-title');
    const graphic = document.getElementById('simplest-modal-graphic');

    // Reset visual state
    progressBar.style.width = '0%';
    percentText.textContent = '0%';
    stepText.textContent = 'Purging browser cache and temp assets...';
    titleText.textContent = 'Updating Simplest';
    graphic.classList.remove('success');

    // Run cache purging concurrently in background
    const cleanCachePromise = (async () => {
      try {
        // 1. Purge all CacheStorage
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
          console.log('[Updater] Cleared CacheStorage keys:', keys);
        }

        // 2. Notify Service Worker to clear cache and skip waiting
        if ('serviceWorker' in navigator) {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
            navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
          }
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            if (reg.waiting) {
              reg.waiting.postMessage({ action: 'skipWaiting' });
            }
            await reg.update().catch(() => { });
          }
        }

        // 3. Mark update completed in storage
        if (targetHash) {
          localStorage.setItem(STORAGE_KEY_HASH, targetHash);
        }
        sessionStorage.setItem('simplest_just_updated', 'true');
      } catch (err) {
        console.warn('[Updater] Background cache purge error:', err);
      }
    })();

    // Animate smoothly across 2000 milliseconds
    const TOTAL_DURATION = 2000;
    const startTime = performance.now();

    function updateFrame(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / TOTAL_DURATION, 1);

      // Percentage and progress bar width
      const percentVal = Math.round(progress * 100);
      progressBar.style.width = `${percentVal}%`;
      percentText.textContent = `${percentVal}%`;

      // Update text descriptions according to progress stages
      if (progress < 0.35) {
        stepText.textContent = 'Purging browser cache and storage...';
      } else if (progress < 0.75) {
        stepText.textContent = 'Downloading latest assets from server...';
      } else if (progress < 0.98) {
        stepText.textContent = 'Synchronizing application files...';
      }

      if (progress < 1) {
        requestAnimationFrame(updateFrame);
      } else {
        // 2-second animation complete!
        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        stepText.textContent = 'Update complete! Restarting...';
        titleText.textContent = 'Update Finished!';
        graphic.classList.add('success');

        // Wait for background tasks to finish, then reload
        cleanCachePromise.finally(() => {
          setTimeout(() => {
            // Hard reload bypassing HTTP cache
            const cleanUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now();
            window.location.replace(cleanUrl);
          }, 350);
        });
      }
    }

    requestAnimationFrame(updateFrame);
  }

  function displayToast(msg, type = 'info') {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast(msg, type);
    } else if (typeof window.showMaterialToast === 'function') {
      window.showMaterialToast(msg, type);
    }
  }

  // Check remote index.html on Server
  async function checkForUpdates(isManual = false) {
    if (isUpdating) return;

    try {
      if (isManual) {
        displayToast('Checking for updates...', 'info');
      }

      const cacheBustUrl = `./index.html?_t=${Date.now()}`;
      const response = await fetch(cacheBustUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });

      if (!response.ok) return;

      const htmlText = await response.text();
      const remoteHash = await computeHash(htmlText);
      const localHash = localStorage.getItem(STORAGE_KEY_HASH);

      if (!localHash) {
        // First visit or fresh initialization
        localStorage.setItem(STORAGE_KEY_HASH, remoteHash);
        if (isManual) {
          displayToast('You are running the latest version!', 'success');
        }
        return;
      }

      if (remoteHash !== localHash) {
        console.log(`[Updater] Update detected! Local: ${localHash} -> Remote: ${remoteHash}`);
        showPrompt(remoteHash);
      } else {
        if (isManual) {
          displayToast('You are running the latest version!', 'success');
        }
      }
    } catch (err) {
      console.warn('[Updater] Failed to check for updates:', err);
      if (isManual) {
        displayToast('Could not reach update server. Check network.', 'error');
      }
    }
  }

  // Listen to Service Worker update events
  function monitorServiceWorkerUpdates() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Check if there is already a waiting worker
      if (registration.waiting) {
        showPrompt('sw-waiting-' + Date.now());
      }

      // Check on updatefound
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showPrompt('sw-installed-' + Date.now());
          }
        });
      });
    });
  }

  // Initialize Updater
  function init() {
    injectStyles();
    createDOMElements();

    // Check if we just completed an update
    if (sessionStorage.getItem('simplest_just_updated') === 'true') {
      sessionStorage.removeItem('simplest_just_updated');
      setTimeout(() => {
        displayToast('All files updated successfully to latest version!', 'success');
      }, 500);
    }

    // Initial check after 3 seconds
    setTimeout(() => {
      checkForUpdates(false);
      monitorServiceWorkerUpdates();
    }, 3000);

    // Periodic check
    if (checkTimer) clearInterval(checkTimer);
    checkTimer = setInterval(() => checkForUpdates(false), CHECK_INTERVAL_MS);

    // Check when user tabs back into the window or wakes device
    window.addEventListener('focus', () => checkForUpdates(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates(false);
      }
    });
  }

  // Expose API on window for manual checks or test calls
  window.SimplestUpdater = {
    checkForUpdates: (manual = true) => checkForUpdates(manual),
    triggerUpdateAnimation: () => startUpdateProcedure('test-' + Date.now()),
    showPrompt: (hash) => showPrompt(hash || 'manual-hash')
  };

  // Auto-init on DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window, document);
