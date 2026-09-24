/* Simplest - Monthly Menu Calendar Controller */

let menuMonthOffset = 0;   // 0 = current month, -1 = last month, etc.
let editingMenuDate = null;
let currentCompressedBase64 = null;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function initMenuView() {
  renderMenu();
}

/** Called from prev/next/today buttons */
function setMenuMonthOffset(change) {
  if (change === 0) menuMonthOffset = 0;
  else menuMonthOffset += change;
  renderMenu();
}

/** Build the target month's Date anchors */
function getMonthMeta(monthOffset) {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth();
  const target = new Date(year, month + monthOffset, 1);
  return {
    year:  target.getFullYear(),
    month: target.getMonth(),
    label: `${MONTH_NAMES[target.getMonth()]} ${target.getFullYear()}`
  };
}

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/* ─────────────────────────────────────────
   RENDER CALENDAR
───────────────────────────────────────── */
function renderMenu() {
  const { year, month, label } = getMonthMeta(menuMonthOffset);

  const titleEl = document.getElementById('menu-month-title');
  if (titleEl) titleEl.textContent = label;

  // iOS Segment Active State
  const pBtn = document.getElementById('menu-seg-prev');
  const cBtn = document.getElementById('menu-seg-current');
  const nBtn = document.getElementById('menu-seg-next');
  if (pBtn && cBtn && nBtn) {
    pBtn.classList.toggle('active', menuMonthOffset < 0);
    cBtn.classList.toggle('active', menuMonthOffset === 0);
    nBtn.classList.toggle('active', menuMonthOffset > 0);
  }

  const container = document.getElementById('menu-calendar-grid');
  if (!container) return;

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayObj = new Date();
  const todayStr = toDateStr(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  // Count normal-type set days for the summary pill
  let setCount = 0;
  let totalWeekdays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow >= 1 && dow <= 5) {
      totalWeekdays++;
      const ds   = toDateStr(year, month, d);
      const data = dbGetMenuByDate(ds);
      if (data && (data.dayType || 'normal') === 'normal' && data.foodName) setCount++;
    }
  }

  let html = '';

  // Day-of-week header
  html += '<div class="cal-header-row">';
  DAY_LABELS.forEach(dl => {
    const isWkend = (dl === 'Sun' || dl === 'Sat');
    html += `<div class="cal-dow-cell${isWkend ? ' cal-weekend-hdr' : ''}">${dl}</div>`;
  });
  html += '</div>';

  // Body grid
  html += '<div class="cal-body">';

  for (let i = 0; i < firstDow; i++) {
    html += '<div class="cal-day-cell cal-empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = toDateStr(year, month, d);
    const dow       = new Date(year, month, d).getDay();
    const isWeekend = (dow === 0 || dow === 6);
    const isToday   = (dateStr === todayStr);
    const data      = dbGetMenuByDate(dateStr);
    const dayType   = data ? (data.dayType || 'normal') : null;

    let cellClass = 'cal-day-cell';
    if (isWeekend) {
      cellClass += ' cal-weekend';
    } else if (dayType === 'holiday') {
      cellClass += ' cal-public-holiday';
    } else if (dayType === 'closed') {
      cellClass += ' cal-closed';
    } else if (data && data.foodName) {
      cellClass += ' cal-has-menu';
    } else {
      cellClass += ' cal-no-menu';
    }
    if (isToday) cellClass += ' cal-today';

    const dayNum = `<span class="cal-day-num">${d}</span>`;
    const clickHandler = isWeekend
      ? ''
      : `onclick="openEditMenuModal('${dateStr}', '${DAY_LABELS[dow]}')"`;

    let content = '';
    if (isWeekend) {
      content = `<div class="cal-rest-label">Rest</div>`;

    } else if (dayType === 'holiday') {
      const note = (data && data.holidayNote) ? data.holidayNote : '';
      content = `
        <div class="cal-ph-label">
          <div class="cal-ph-icon">🎉</div>
          <div class="cal-ph-text">Public Holiday</div>
          ${note ? `<div style="font-size:0.57rem;color:#9a3412;line-height:1.2;margin-top:0.15rem;">${note}</div>` : ''}
        </div>
      `;

    } else if (dayType === 'closed') {
      const note = (data && data.holidayNote) ? data.holidayNote : '';
      content = `
        <div class="cal-closed-label">
          <div class="cal-closed-icon">🔒</div>
          <div class="cal-closed-text">Closed</div>
          ${note ? `<div style="font-size:0.57rem;color:#991b1b;line-height:1.2;margin-top:0.15rem;">${note}</div>` : ''}
        </div>
      `;

    } else if (data && data.foodName) {
      const avail = data.available !== false;
      const img = data.image
        ? `<div class="cal-food-thumb" style="background-image:url('${data.image}')"></div>`
        : `<div class="cal-food-thumb cal-food-no-img">${getSvgIcon('utensils','')}</div>`;
      
      content = `
        ${img}
        <div class="cal-food-name">${data.foodName}</div>
      `;
      if (!avail) cellClass += ' cal-unavail';

    } else {
      content = `<div class="cal-add-hint">${getSvgIcon('plus','')} Set Menu</div>`;
    }

    html += `
      <div class="${cellClass}" ${clickHandler}>
        ${dayNum}
        <div class="cal-day-content">
          ${content}
        </div>
      </div>
    `;
  }

  // Trailing empty cells
  const totalCells = firstDow + daysInMonth;
  const remainder  = totalCells % 7;
  if (remainder !== 0) {
    for (let i = 0; i < (7 - remainder); i++) {
      html += '<div class="cal-day-cell cal-empty"></div>';
    }
  }

  html += '</div>';
  container.innerHTML = html;

  const summaryEl = document.getElementById('menu-month-summary');
  if (summaryEl) summaryEl.textContent = `${setCount} / ${totalWeekdays} days set`;
}

/* ─────────────────────────────────────────
   DAY TYPE TOGGLE (modal UI)
───────────────────────────────────────── */
function setMenuDayType(type) {
  document.getElementById('menu-input-daytype').value = type;

  ['normal','holiday','closed'].forEach(t => {
    document.getElementById(`daytype-btn-${t}`).classList.remove('daytype-active');
  });
  document.getElementById(`daytype-btn-${type}`).classList.add('daytype-active');

  const foodDetails = document.getElementById('menu-food-details');
  const noteGroup   = document.getElementById('menu-holiday-note-group');

  if (type === 'normal') {
    foodDetails.style.display = '';
    noteGroup.style.display   = 'none';
  } else {
    foodDetails.style.display = 'none';
    noteGroup.style.display   = '';
    document.getElementById('menu-input-holiday-note').placeholder =
      type === 'holiday'
        ? 'e.g. Hari Raya Aidilfitri'
        : 'e.g. Kitchen maintenance day';
  }
}

/* ─────────────────────────────────────────
   OPEN / CLOSE MODAL & FORM DATA POPULATION
───────────────────────────────────────── */
function populateMenuFormData(dateStr, dayName) {
  editingMenuDate = dateStr;
  currentCompressedBase64 = null;

  const existing = dbGetMenuByDate(dateStr);
  const dayType  = existing ? (existing.dayType || 'normal') : 'normal';

  const dateDisplayEl = document.getElementById('menu-edit-date-display');
  if (dateDisplayEl) {
    dateDisplayEl.textContent = `${dayName}, ${formatDateReadable(dateStr)}`;
  }

  const dateInputEl = document.getElementById('menu-input-date');
  if (dateInputEl) {
    dateInputEl.value = dateStr;
  }

  document.getElementById('menu-input-foodName').value     = existing ? (existing.foodName    || '') : '';
  
  document.getElementById('menu-input-desc').value         = existing ? (existing.description  || '') : '';
  const remarkInputEl = document.getElementById('menu-input-remark');
  if (remarkInputEl) remarkInputEl.value = existing ? (existing.remark || '') : '';
  const availInputEl = document.getElementById('menu-input-available');
  if (availInputEl) availInputEl.checked = existing ? (existing.available !== false) : true;
  document.getElementById('menu-input-holiday-note').value = existing ? (existing.holidayNote  || '') : '';

  // Reset file input
  const fileInput = document.getElementById('menu-input-file');
  if (fileInput) fileInput.value = '';

  const imgPreview  = document.getElementById('menu-image-preview');
  const emptyWrap   = document.getElementById('material-photo-empty');
  const previewWrap = document.getElementById('material-photo-preview-wrap');

  if (existing && existing.image) {
    if (imgPreview) imgPreview.src = existing.image;
    if (emptyWrap) emptyWrap.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'block';
    currentCompressedBase64 = existing.image;
  } else {
    if (imgPreview) imgPreview.src = '';
    if (emptyWrap) emptyWrap.style.display = 'flex';
    if (previewWrap) previewWrap.style.display = 'none';
    currentCompressedBase64 = null;
  }

  setMenuDayType(dayType);  // sets toggle + shows/hides sections
}

function openEditMenuModal(dateStr, dayName) {
  if (!dateStr) {
    const now = new Date();
    dateStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (!dayName) {
    const d = new Date(dateStr + 'T00:00:00');
    dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  populateMenuFormData(dateStr, dayName);
  document.getElementById('edit-menu-modal').classList.add('active');
}

function handleMenuDateChange(newDateStr) {
  if (!newDateStr) return;
  const d = new Date(newDateStr + 'T00:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  populateMenuFormData(newDateStr, dayName);
}

function closeEditMenuModal() {
  document.getElementById('edit-menu-modal').classList.remove('active');
  editingMenuDate         = null;
  currentCompressedBase64 = null;
}

/* ─────────────────────────────────────────
   IMAGE UPLOAD & REMOVE
───────────────────────────────────────── */
async function handleMenuImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const previewEl   = document.getElementById('menu-image-preview');
    const emptyWrap   = document.getElementById('material-photo-empty');
    const previewWrap = document.getElementById('material-photo-preview-wrap');
    
    if (previewEl) previewEl.style.opacity = '0.4';
    const compressed = await compressImage(file, 500, 500, 0.7);
    currentCompressedBase64 = compressed;
    if (previewEl) {
      previewEl.src = compressed;
      previewEl.style.opacity = '1';
    }
    if (emptyWrap) emptyWrap.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'block';
  } catch (err) {
    showMaterialToast('Failed to compress image: ' + err.message, 'error');
  }
}

function removeMenuPhoto(event) {
  if (event) event.stopPropagation();
  currentCompressedBase64 = null;
  const fileInput = document.getElementById('menu-input-file');
  if (fileInput) fileInput.value = '';
  const imgPreview = document.getElementById('menu-image-preview');
  if (imgPreview) imgPreview.src = '';
  const emptyWrap   = document.getElementById('material-photo-empty');
  const previewWrap = document.getElementById('material-photo-preview-wrap');
  if (emptyWrap) emptyWrap.style.display = 'flex';
  if (previewWrap) previewWrap.style.display = 'none';
}

/* ─────────────────────────────────────────
   SAVE MENU
───────────────────────────────────────── */
async function saveMenuSubmit(event) {
  event.preventDefault();
  
  const chosenDate = document.getElementById('menu-input-date').value || editingMenuDate;
  if (!chosenDate) {
    showMaterialToast('Please select a menu date', 'warning');
    return;
  }

  const dayType     = document.getElementById('menu-input-daytype').value;
  const holidayNote = document.getElementById('menu-input-holiday-note').value.trim();
  const existing    = dbGetMenuByDate(chosenDate);
  const storedDay   = existing
    ? existing.day
    : new Date(chosenDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  let menuData = {
    date:        chosenDate,
    day:         storedDay,
    dayType:     dayType,
    holidayNote: holidayNote
  };

  if (dayType === 'normal') {
    const foodName = document.getElementById('menu-input-foodName').value.trim();
    const pricing  = dbGetPricing();

    if (!foodName) {
      showMaterialToast('Please provide food name', 'warning');
      return;
    }

    const remarkInputEl = document.getElementById('menu-input-remark');
    const remarkVal = remarkInputEl ? remarkInputEl.value.trim() : (existing ? (existing.remark || '') : '');

    const availInputEl = document.getElementById('menu-input-available');
    const availVal = availInputEl ? availInputEl.checked : true;

    menuData = {
      ...menuData,
      foodName:    foodName,
      price:       pricing.standard,
      priceSmall:  pricing.small,
      description: document.getElementById('menu-input-desc').value.trim(),
      remark:      remarkVal,
      available:   availVal,
      image:       currentCompressedBase64 || (existing ? existing.image : '')
    };
  }

  await dbSaveMenu(chosenDate, menuData);
  closeEditMenuModal();

  // Refresh all relevant views immediately
  renderMenu();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderOrders === 'function') renderOrders();
  if (typeof renderKitchen === 'function') renderKitchen();

  // Clean, non-intrusive circular checkmark animation
  if (typeof showCleanCheckmark === 'function') {
    showCleanCheckmark('Menu Saved');
  }
}

/* ─────────────────────────────────────────
   GLOBAL PRICE SETTINGS MODAL CONTROLLER
───────────────────────────────────────── */
function openPriceSettingsModal() {
  const pricing = dbGetPricing();
  const stdInput = document.getElementById('pricing-input-standard');
  const smlInput = document.getElementById('pricing-input-small');
  
  if (stdInput) stdInput.value = (pricing.standard || 12.00).toFixed(2);
  if (smlInput) smlInput.value = (pricing.small || 9.00).toFixed(2);

  const modal = document.getElementById('price-settings-modal');
  if (modal) modal.classList.add('active');
}

function closePriceSettingsModal() {
  const modal = document.getElementById('price-settings-modal');
  if (modal) modal.classList.remove('active');
}

async function savePriceSettingsSubmit(event) {
  event.preventDefault();
  const stdVal = parseFloat(document.getElementById('pricing-input-standard').value);
  const smlVal = parseFloat(document.getElementById('pricing-input-small').value);

  if (isNaN(stdVal) || stdVal < 0 || isNaN(smlVal) || smlVal < 0) {
    showMaterialToast('Please enter valid prices for both portion sizes', 'warning');
    return;
  }

  await dbSavePricing({
    standard: stdVal,
    small: smlVal
  });

  closePriceSettingsModal();

  // Refresh all views to reflect updated prices
  if (typeof renderMenu === 'function') renderMenu();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderOrders === 'function') renderOrders();
  if (typeof renderKitchen === 'function') renderKitchen();
}


