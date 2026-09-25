/* Simplest - Formatters & SVG Icons Helper */

/**
 * Format amount into Ringgit Malaysia (RM 12.00)
 */
function formatRM(amount) {
  const num = parseFloat(amount) || 0;
  return `RM ${num.toFixed(2)}`;
}

/**
 * Format ISO YYYY-MM-DD to readable date (e.g. 21 Sep 2026)
 */
function formatDateReadable(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

/**
 * Get Monday to Friday dates for a given offset from current week
 */
function getWeekDays(weekOffset = 0) {
  const now = new Date();
  const currentDayOfWeek = now.getDay();
  const distanceToMon = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMon + (weekOffset * 7));
  monday.setHours(0, 0, 0, 0);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return days.map((dayName, idx) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + idx);
    
    const yyyy = dayDate.getFullYear();
    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dayDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const formatted = `${dayDate.getDate()} ${months[dayDate.getMonth()]}`;

    return {
      day: dayName,
      dateStr: dateStr,
      formatted: formatted
    };
  });
}

function formatPhoneForWA(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '6' + cleaned;
  }
  return cleaned;
}

/**
 * SVG Icons Generator
 */
function getSvgIcon(name, extraClass = '') {
  const icons = {
    home: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    calendar: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
    users: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    orders: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>`,
    kitchen: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M12 18H8l2-7h4l2 4h3"/><path d="M13 7h-2l-1 4"/><circle cx="13" cy="4" r="1.5"/></svg>`,
    rider: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M12 18H8l2-7h4l2 4h3"/><path d="M13 7h-2l-1 4"/><circle cx="13" cy="4" r="1.5"/></svg>`,
    plus: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    search: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    whatsapp: `<svg class="svg-icon whatsapp-icon ${extraClass}" viewBox="0 0 24 24" style="fill: currentColor; stroke: none;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24M8.53 7.33c-.16 0-.35.06-.53.25-.19.19-.71.69-.71 1.69s.73 1.96.83 2.1c.1.13 1.41 2.22 3.49 3.07.5.2 1.05.32 1.43.43.59.17 1.13.15 1.56.09.47-.07 1.45-.59 1.65-1.17.21-.57.21-1.07.15-1.17-.06-.1-.23-.16-.48-.28s-1.45-.71-1.68-.8-.39-.12-.56.12c-.16.24-.63.8-.77.96-.14.16-.28.18-.53.06s-1.04-.38-1.98-1.22c-.73-.65-1.22-1.46-1.37-1.7-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.55-.42z"/></svg>`,
    edit: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    trash: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    user: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    dollar: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    settings: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    lock: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    utensils: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="M18 2v20"/><path d="M18 7H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7z"/></svg>`,
    sun: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
    moon: `<svg class="svg-icon ${extraClass}" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
  };
  return icons[name] || '';
}

/**
 * Mobile Haptic Vibration Feedback Helper
 */
function triggerHapticFeedback(type = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        // Distinct vibration pattern for successful actions (order created, menu saved)
        navigator.vibrate([35, 50, 35]);
      } else if (type === 'medium') {
        navigator.vibrate(30);
      } else {
        // Light tap vibration for button clicks and tab switches
        navigator.vibrate(15);
      }
    } catch (e) {
      // API un-permitted or unsupported
    }
  }
}

/**
 * Show Clean Circular Checkmark Animation Overlay
 */
let cleanCheckmarkTimeout = null;
function showCleanCheckmark(text = 'Saved') {
  const overlay = document.getElementById('clean-checkmark-overlay');
  const textEl = document.getElementById('clean-checkmark-text');
  if (!overlay) return;

  if (textEl) textEl.textContent = text;

  // Trigger success vibration pattern on mobile devices
  triggerHapticFeedback('success');

  // Restart SVG stroke animation by removing and re-adding active class
  overlay.classList.remove('active');
  void overlay.offsetWidth; // trigger reflow
  overlay.classList.add('active');

  if (cleanCheckmarkTimeout) {
    clearTimeout(cleanCheckmarkTimeout);
  }

  cleanCheckmarkTimeout = setTimeout(() => {
    overlay.classList.remove('active');
  }, 1150);
}

/* ==========================================================================
   Google Material UI Toast / Snackbar Handler
   ========================================================================== */
let materialToastTimeout = null;

function showMaterialToast(message, type = 'warning') {
  const snackbar = document.getElementById('material-snackbar');
  const textEl = document.getElementById('material-snackbar-text');
  const iconEl = document.getElementById('material-snackbar-icon');
  if (!snackbar) {
    alert(message);
    return;
  }

  if (textEl) textEl.textContent = message;

  if (iconEl) {
    if (type === 'error' || type === 'danger') {
      iconEl.textContent = '❌';
    } else if (type === 'info') {
      iconEl.textContent = 'ℹ️';
    } else {
      iconEl.textContent = '⚠️';
    }
  }

  // Trigger light mobile vibration
  if (typeof triggerHapticFeedback === 'function') {
    triggerHapticFeedback('medium');
  }

  snackbar.classList.add('active');

  if (materialToastTimeout) {
    clearTimeout(materialToastTimeout);
  }

  materialToastTimeout = setTimeout(() => {
    hideMaterialToast();
  }, 3200);
}

function hideMaterialToast() {
  const snackbar = document.getElementById('material-snackbar');
  if (snackbar) snackbar.classList.remove('active');
}

/* ==========================================================================
   Google Material UI Confirmation Dialog Handler (Promise-based)
   ========================================================================== */
function showMaterialConfirm(title, message, confirmText = 'Delete', isDanger = true) {
  return new Promise((resolve) => {
    const modal = document.getElementById('material-confirm-modal');
    const titleEl = document.getElementById('material-confirm-title');
    const msgEl = document.getElementById('material-confirm-message');
    const iconWrap = document.getElementById('material-confirm-icon-wrap');
    const cancelBtn = document.getElementById('material-confirm-cancel-btn');
    const actionBtn = document.getElementById('material-confirm-action-btn');

    if (!modal) {
      resolve(window.confirm(`${title}\n\n${message}`));
      return;
    }

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (actionBtn) {
      actionBtn.textContent = confirmText;
      if (isDanger) {
        actionBtn.style.background = '#ef4444';
        actionBtn.style.borderColor = '#ef4444';
      } else {
        actionBtn.style.background = 'var(--primary-accent)';
        actionBtn.style.borderColor = 'var(--primary-accent)';
      }
    }
    if (iconWrap) {
      iconWrap.textContent = isDanger ? '🗑️' : '❓';
      iconWrap.style.background = isDanger ? '#fef2f2' : '#eff6ff';
      iconWrap.style.color = isDanger ? '#ef4444' : '#3b82f6';
    }

    const cleanup = () => {
      modal.classList.remove('active');
      cancelBtn.onclick = null;
      actionBtn.onclick = null;
      modal.onclick = null;
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    actionBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    };

    modal.classList.add('active');
  });
}


