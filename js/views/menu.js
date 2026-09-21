/* Simplest - Weekly Menu View Controller */

let menuWeekOffset = 0;
let editingMenuDate = null;
let currentCompressedBase64 = null;

function initMenuView() {
  renderMenu();
}

function setMenuWeekOffset(offsetChange) {
  if (offsetChange === 0) menuWeekOffset = 0;
  else menuWeekOffset += offsetChange;
  renderMenu();
}

function renderMenu() {
  const weekDays = getWeekDays(menuWeekOffset);
  
  const weekTitleEl = document.getElementById('menu-week-title');
  const weekRangeEl = document.getElementById('menu-week-range');
  
  let labelText = 'This Week Menu';
  if (menuWeekOffset === -1) labelText = 'Previous Week Menu';
  else if (menuWeekOffset === 1) labelText = 'Next Week Menu';
  else if (menuWeekOffset < -1) labelText = `${Math.abs(menuWeekOffset)} Weeks Ago Menu`;
  else if (menuWeekOffset > 1) labelText = `In ${menuWeekOffset} Weeks Menu`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${weekDays[0].formatted} — ${weekDays[4].formatted}`;

  const container = document.getElementById('menu-list-container');
  if (!container) return;

  container.innerHTML = '';

  weekDays.forEach(dayInfo => {
    const menu = dbGetMenuByDate(dayInfo.dateStr);
    
    const foodName = menu ? menu.foodName : 'Not Set';
    const price = menu ? formatRM(menu.price) : 'RM --';
    const cals = menu ? `${menu.calories || 0} kcal` : '-- kcal';
    const protein = menu ? `${menu.protein || 0}g P` : '-- P';
    const carbs = menu ? `${menu.carbs || 0}g C` : '-- C';
    const desc = menu ? (menu.description || 'No description provided.') : 'Click Edit Menu to set food details for this day.';
    const imageSrc = (menu && menu.image) ? menu.image : '';
    const available = (menu && menu.available !== false);

    const itemHtml = `
      <div class="mobile-data-card" style="margin-bottom: 0.85rem; padding: 1.15rem;">
        <div style="display: flex; gap: 1.15rem; align-items: flex-start; flex-wrap: wrap;">
          <div style="width: 100px; height: 100px; border-radius: var(--radius-md); overflow: hidden; background: #f1f5f9; flex-shrink: 0;">
            ${imageSrc 
              ? `<img src="${imageSrc}" class="food-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
                 <div class="food-no-img-empty" style="display:none; height:100%;">${getSvgIcon('utensils', 'lg')}</div>`
              : `<div class="food-no-img-empty" style="height:100%;">${getSvgIcon('utensils', 'lg')}</div>`
            }
          </div>
          
          <div style="flex: 1; min-width: 220px;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
              <span class="day-badge">${dayInfo.day}</span>
              <span class="day-date">${dayInfo.formatted} (${dayInfo.dateStr})</span>
              ${available ? `<span class="badge badge-paid">Available</span>` : `<span class="badge badge-cancelled">Unavailable</span>`}
            </div>
            
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">${foodName}</h3>
            <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.5rem; line-height: 1.4;">${desc}</p>
            
            <div style="display: flex; gap: 0.5rem; font-size: 0.725rem; font-weight: 700; color: var(--text-muted); flex-wrap: wrap;">
              <span style="background:#f1f5f9; padding: 0.15rem 0.45rem; border-radius: 4px;">${cals}</span>
              <span style="background:#f1f5f9; padding: 0.15rem 0.45rem; border-radius: 4px;">${protein}</span>
              <span style="background:#f1f5f9; padding: 0.15rem 0.45rem; border-radius: 4px;">${carbs}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.65rem; margin-left: auto;">
            <span style="font-size: 1.2rem; font-weight: 800; color: var(--primary-accent);">${price}</span>
            <button class="btn btn-outline btn-sm" onclick="openEditMenuModal('${dayInfo.dateStr}', '${dayInfo.day}')">
              ${getSvgIcon('edit', 'sm')} Edit Menu
            </button>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', itemHtml);
  });
}

function openEditMenuModal(dateStr, dayName) {
  editingMenuDate = dateStr;
  currentCompressedBase64 = null;

  const existing = dbGetMenuByDate(dateStr);

  document.getElementById('menu-edit-date-display').textContent = `${dayName}, ${formatDateReadable(dateStr)}`;
  document.getElementById('menu-input-foodName').value = existing ? existing.foodName : '';
  document.getElementById('menu-input-price').value = existing ? existing.price : '';
  document.getElementById('menu-input-cals').value = existing ? (existing.calories || '') : '';
  document.getElementById('menu-input-protein').value = existing ? (existing.protein || '') : '';
  document.getElementById('menu-input-carbs').value = existing ? (existing.carbs || '') : '';
  document.getElementById('menu-input-desc').value = existing ? (existing.description || '') : '';
  document.getElementById('menu-input-remark').value = existing ? (existing.remark || '') : '';
  document.getElementById('menu-input-available').checked = existing ? (existing.available !== false) : true;

  const imgPreview = document.getElementById('menu-image-preview');
  if (existing && existing.image) {
    imgPreview.src = existing.image;
    imgPreview.style.display = 'block';
    currentCompressedBase64 = existing.image;
  } else {
    imgPreview.src = '';
    imgPreview.style.display = 'none';
  }

  document.getElementById('edit-menu-modal').classList.add('active');
}

function closeEditMenuModal() {
  document.getElementById('edit-menu-modal').classList.remove('active');
  editingMenuDate = null;
  currentCompressedBase64 = null;
}

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

async function saveMenuSubmit(event) {
  event.preventDefault();
  if (!editingMenuDate) return;

  const foodName = document.getElementById('menu-input-foodName').value.trim();
  const price = parseFloat(document.getElementById('menu-input-price').value);
  const cals = parseInt(document.getElementById('menu-input-cals').value) || 0;
  const protein = parseInt(document.getElementById('menu-input-protein').value) || 0;
  const carbs = parseInt(document.getElementById('menu-input-carbs').value) || 0;
  const desc = document.getElementById('menu-input-desc').value.trim();
  const remark = document.getElementById('menu-input-remark').value.trim();
  const available = document.getElementById('menu-input-available').checked;

  if (!foodName || isNaN(price)) {
    alert('Please provide food name and a valid price');
    return;
  }

  const existing = dbGetMenuByDate(editingMenuDate);
  const dayName = existing ? existing.day : new Date(editingMenuDate).toLocaleDateString('en-US', { weekday: 'long' });

  const menuData = {
    date: editingMenuDate,
    day: dayName,
    foodName: foodName,
    price: price,
    calories: cals,
    protein: protein,
    carbs: carbs,
    description: desc,
    remark: remark,
    available: available,
    image: currentCompressedBase64 || (existing ? existing.image : '')
  };

  await dbSaveMenu(editingMenuDate, menuData);
  closeEditMenuModal();
  renderMenu();
}
