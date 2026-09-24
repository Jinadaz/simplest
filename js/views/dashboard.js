/* Simplest - Dashboard View Controller */

let currentWeekOffset = 0;

function initDashboardView() {
  renderDashboard();
}

function setDashboardWeekOffset(offsetChange) {
  if (offsetChange === 0) {
    currentWeekOffset = 0;
  } else {
    currentWeekOffset += offsetChange;
  }
  renderDashboard();
}

function renderDashboard() {
  const weekDays = getWeekDays(currentWeekOffset);
  
  const weekTitleEl = document.getElementById('dashboard-week-title');
  const weekRangeEl = document.getElementById('dashboard-week-range');
  
  let labelText = 'This Week';
  if (currentWeekOffset === -1) labelText = 'Previous Week';
  else if (currentWeekOffset === 1) labelText = 'Next Week';
  else if (currentWeekOffset < -1) labelText = `${Math.abs(currentWeekOffset)} Weeks Ago`;
  else if (currentWeekOffset > 1) labelText = `In ${currentWeekOffset} Weeks`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${weekDays[0].formatted} — ${weekDays[4].formatted}`;

  // Get orders list for this week's date range
  const dateSet = new Set(weekDays.map(d => d.dateStr));
  const allOrders = Object.values(cachedOrders || {});
  
  // Limit to selected week dates
  const weekOrders = allOrders.filter(ord => dateSet.has(ord.date));

  // Compute Total Orders, Total Meals, Total Revenue
  const totalOrdersCount = weekOrders.length;
  const totalMealsCount = weekOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
  const totalRevenueAmount = weekOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);

  // Update Summary Stats Elements
  const statOrdersEl = document.getElementById('dash-stat-orders');
  const statMealsEl = document.getElementById('dash-stat-meals');
  const statRevenueEl = document.getElementById('dash-stat-revenue');

  if (statOrdersEl) statOrdersEl.textContent = totalOrdersCount;
  if (statMealsEl) statMealsEl.textContent = totalMealsCount;
  if (statRevenueEl) statRevenueEl.textContent = formatRM(totalRevenueAmount);

  // Render Daily Food Cards (Mon-Fri)
  const cardsGridEl = document.getElementById('dashboard-daily-grid');
  if (!cardsGridEl) return;

  cardsGridEl.innerHTML = '';

  weekDays.forEach(dayInfo => {
    const menuObj = dbGetMenuByDate(dayInfo.dateStr);
    
    // Calculate Orders & Meals for this specific day
    const dayOrders = weekOrders.filter(ord => ord.date === dayInfo.dateStr);
    const dayOrdersCount = dayOrders.length;
    const dayMealsCount = dayOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);

    const hasMenu = !!(menuObj && menuObj.foodName);
    const foodName = hasMenu ? menuObj.foodName : 'No Menu Set';
    const pricing = dbGetPricing();
    const foodPriceHtml = hasMenu 
      ? `<div class="food-price-pills">
           <span class="price-pill-std">Std ${formatRM(pricing.standard)}</span>
           <span class="price-pill-sml">Sml ${formatRM(pricing.small)}</span>
         </div>`
      : '<div class="food-price">RM --</div>';
    const imageSrc = (menuObj && menuObj.image) ? menuObj.image : '';

    let imageBlockHtml = '';

    if (hasMenu) {
      if (imageSrc) {
        imageBlockHtml = `<img src="${imageSrc}" alt="${foodName}" class="food-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
        <div class="food-no-img-empty" style="display:none;">${getSvgIcon('utensils', 'lg')}</div>`;
      } else {
        imageBlockHtml = `<div class="food-no-img-empty">${getSvgIcon('utensils', 'lg')}</div>`;
      }
    } else {
      imageBlockHtml = `
        <div class="food-no-img-empty">
          <div style="font-size: 0.775rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.35rem;">No Menu Set</div>
          <button class="btn btn-primary btn-sm" onclick="openEditMenuModal('${dayInfo.dateStr}', '${dayInfo.day}')" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">
            ${getSvgIcon('plus', 'sm')} Add Menu
          </button>
        </div>
      `;
    }

    const cardHtml = `
      <div class="food-card">
        <div class="food-card-header">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="day-badge">${dayInfo.day.slice(0, 3)}</span>
            <span class="day-date">${dayInfo.formatted}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openEditMenuModal('${dayInfo.dateStr}', '${dayInfo.day}')" title="Edit Menu for ${dayInfo.day}" style="padding: 0.2rem 0.45rem; font-size: 0.7rem;">
            ${getSvgIcon('edit', 'sm')}
          </button>
        </div>
        <div class="food-img-wrapper">
          ${imageBlockHtml}
        </div>
        <div class="food-card-body">
          <div>
            <div class="food-title">${foodName}</div>
            ${foodPriceHtml}
          </div>
          <div class="food-stats-row">
            <div class="stat-pill">
              <span class="stat-pill-label">Orders</span>
              <span class="stat-pill-val">${dayOrdersCount}</span>
            </div>
            <div class="stat-pill">
              <span class="stat-pill-label">Meals</span>
              <span class="stat-pill-val">${dayMealsCount}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    cardsGridEl.insertAdjacentHTML('beforeend', cardHtml);
  });
}
