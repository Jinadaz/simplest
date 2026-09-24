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
      // Only show: image + name + price (strip unavail badge — too cluttered in small square)
      content = `
        ${img}
        <div class="cal-food-name">${data.foodName}</div>
        <div class="cal-food-price">${formatRM(data.price)}</div>
      `;
      // Show unavailability via a subtle bottom indicator stripe, not text
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
   OPEN / CLOSE MODAL
───────────────────────────────────────── */
function openEditMenuModal(dateStr, dayName) {
  editingMenuDate       = dateStr;
  currentCompressedBase64 = null;

  const existing = dbGetMenuByDate(dateStr);
  const dayType  = existing ? (existing.dayType || 'normal') : 'normal';

  document.getElementById('menu-edit-date-display').textContent = `${dayName}, ${formatDateReadable(dateStr)}`;

  document.getElementById('menu-input-foodName').value     = existing ? (existing.foodName    || '') : '';
  document.getElementById('menu-input-price').value        = existing ? (existing.price        || '') : '';
  document.getElementById('menu-input-cals').value         = existing ? (existing.calories     || '') : '';
  document.getElementById('menu-input-protein').value      = existing ? (existing.protein      || '') : '';
  document.getElementById('menu-input-carbs').value        = existing ? (existing.carbs        || '') : '';
  document.getElementById('menu-input-desc').value         = existing ? (existing.description  || '') : '';
  document.getElementById('menu-input-remark').value       = existing ? (existing.remark       || '') : '';
  document.getElementById('menu-input-available').checked  = existing ? (existing.available !== false) : true;
  document.getElementById('menu-input-holiday-note').value = existing ? (existing.holidayNote  || '') : '';

  const imgPreview = document.getElementById('menu-image-preview');
  if (existing && existing.image) {
    imgPreview.src = existing.image;
    imgPreview.style.display = 'block';
    currentCompressedBase64 = existing.image;
  } else {
    imgPreview.src = '';
    imgPreview.style.display = 'none';
  }

  setMenuDayType(dayType);  // sets toggle + shows/hides sections

  document.getElementById('edit-menu-modal').classList.add('active');
}

function closeEditMenuModal() {
  document.getElementById('edit-menu-modal').classList.remove('active');
  editingMenuDate       = null;
  currentCompressedBase64 = null;
}

/* ─────────────────────────────────────────
   IMAGE UPLOAD
───────────────────────────────────────── */
async function handleMenuImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const previewEl = document.getElementById('menu-image-preview');
    previewEl.style.opacity = '0.4';
    const compressed = await compressImage(file, 500, 500, 0.7);
    currentCompressedBase64 = compressed;
    previewEl.src = compressed;
    previewEl.style.display = 'block';
    previewEl.style.opacity = '1';
  } catch (err) {
    alert('Failed to compress image: ' + err.message);
  }
}

/* ─────────────────────────────────────────
   SAVE MENU
───────────────────────────────────────── */
async function saveMenuSubmit(event) {
  event.preventDefault();
  if (!editingMenuDate) return;

  const dayType     = document.getElementById('menu-input-daytype').value;
  const holidayNote = document.getElementById('menu-input-holiday-note').value.trim();
  const existing    = dbGetMenuByDate(editingMenuDate);
  const storedDay   = existing
    ? existing.day
    : new Date(editingMenuDate).toLocaleDateString('en-US', { weekday: 'long' });

  let menuData = {
    date:        editingMenuDate,
    day:         storedDay,
    dayType:     dayType,
    holidayNote: holidayNote
  };

  if (dayType === 'normal') {
    const foodName = document.getElementById('menu-input-foodName').value.trim();
    const price    = parseFloat(document.getElementById('menu-input-price').value);

    if (!foodName || isNaN(price)) {
      alert('Please provide food name and a valid price');
      return;
    }

    menuData = {
      ...menuData,
      foodName:    foodName,
      price:       price,
      calories:    parseInt(document.getElementById('menu-input-cals').value)    || 0,
      protein:     parseInt(document.getElementById('menu-input-protein').value) || 0,
      carbs:       parseInt(document.getElementById('menu-input-carbs').value)   || 0,
      description: document.getElementById('menu-input-desc').value.trim(),
      remark:      document.getElementById('menu-input-remark').value.trim(),
      available:   document.getElementById('menu-input-available').checked,
      image:       currentCompressedBase64 || (existing ? existing.image : '')
    };
  }

  await dbSaveMenu(editingMenuDate, menuData);
  closeEditMenuModal();
  renderMenu();
}


