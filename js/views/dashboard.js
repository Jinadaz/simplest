/* Simplest - Dashboard View Controller */

let dashboardDayOffset = 0; // 0 = Today, -1 = Yesterday, +1 = Tomorrow

function initDashboardView() {
  renderDashboard();
}

function setDashboardDayOffset(offsetChange) {
  if (offsetChange === 0) {
    dashboardDayOffset = 0;
  } else {
    dashboardDayOffset += offsetChange;
  }
  renderDashboard();
}

function renderDashboard() {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dashboardDayOffset);
  
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;
  
  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDateReadable(dateStr);

  const titleEl = document.getElementById('dashboard-week-title');
  const dateRangeEl = document.getElementById('dashboard-week-range');
  
  let labelText = "Today's Food";
  if (dashboardDayOffset === -1) labelText = "Yesterday's Food";
  else if (dashboardDayOffset === 1) labelText = "Tomorrow's Food";
  else if (dashboardDayOffset < -1) labelText = `${Math.abs(dashboardDayOffset)} Days Ago`;
  else if (dashboardDayOffset > 1) labelText = `In ${dashboardDayOffset} Days`;

  if (titleEl) titleEl.textContent = labelText;
  if (dateRangeEl) dateRangeEl.textContent = `${dayName}, ${formattedDate}`;

  // iOS Segment Active State
  const pBtn = document.getElementById('dash-seg-prev');
  const cBtn = document.getElementById('dash-seg-current');
  const nBtn = document.getElementById('dash-seg-next');
  if (pBtn && cBtn && nBtn) {
    pBtn.classList.toggle('active', dashboardDayOffset < 0);
    cBtn.classList.toggle('active', dashboardDayOffset === 0);
    nBtn.classList.toggle('active', dashboardDayOffset > 0);
  }

  // Get orders list for this target date
  const allOrders = Object.values(cachedOrders || {});
  const dayOrders = allOrders.filter(ord => ord.date === dateStr);

  // Compute Today's Stats
  const totalOrdersCount = dayOrders.length;
  const totalMealsCount = dayOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
  const totalRevenueAmount = dayOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);

  // Update Summary Stats Elements
  const statOrdersEl = document.getElementById('dash-stat-orders');
  const statMealsEl = document.getElementById('dash-stat-meals');
  const statRevenueEl = document.getElementById('dash-stat-revenue');

  if (statOrdersEl) statOrdersEl.textContent = totalOrdersCount;
  if (statMealsEl) statMealsEl.textContent = totalMealsCount;
  if (statRevenueEl) statRevenueEl.textContent = formatRM(totalRevenueAmount);

  // Render Single Day Food Card
  const cardsGridEl = document.getElementById('dashboard-daily-grid');
  if (!cardsGridEl) return;

  cardsGridEl.innerHTML = '';

  const menuObj = dbGetMenuByDate(dateStr);
  const dayType = menuObj ? (menuObj.dayType || 'normal') : 'normal';
  const hasMenu = !!(menuObj && menuObj.foodName);
  const foodName = hasMenu ? menuObj.foodName : 'No Menu Set';
  const pricing = dbGetPricing();
  
  const foodPriceHtml = hasMenu 
    ? `<div class="food-price-pills" style="margin-top: 0.5rem;">
         <span class="price-pill-std">Standard ${formatRM(pricing.standard)}</span>
         <span class="price-pill-sml">Small ${formatRM(pricing.small)}</span>
       </div>`
    : '';

  const imageSrc = (menuObj && menuObj.image) ? menuObj.image : '';
  let imageBlockHtml = '';

  if (dayType === 'holiday') {
    const note = (menuObj && menuObj.holidayNote) ? `: ${menuObj.holidayNote}` : '';
    imageBlockHtml = `
      <div class="food-no-img-empty" style="background:#fff7ed; color:#c2410c; min-height: 200px;">
        <div style="font-size:2.2rem; margin-bottom:0.25rem;">🎉</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #9a3412;">Public Holiday</div>
        <div style="font-size: 0.85rem; color: #ea580c; margin-top:0.2rem;">${note}</div>
      </div>
    `;
  } else if (dayType === 'closed') {
    const note = (menuObj && menuObj.holidayNote) ? `: ${menuObj.holidayNote}` : '';
    imageBlockHtml = `
      <div class="food-no-img-empty" style="background:#fef2f2; color:#b91c1c; min-height: 200px;">
        <div style="font-size:2.2rem; margin-bottom:0.25rem;">🔒</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #991b1b;">Kitchen Closed</div>
        <div style="font-size: 0.85rem; color: #dc2626; margin-top:0.2rem;">${note}</div>
      </div>
    `;
  } else if (hasMenu) {
    if (imageSrc) {
      imageBlockHtml = `<img src="${imageSrc}" alt="${foodName}" class="food-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
      <div class="food-no-img-empty" style="display:none; min-height: 200px;">${getSvgIcon('utensils', 'lg')}</div>`;
    } else {
      imageBlockHtml = `<div class="food-no-img-empty" style="min-height: 200px;">${getSvgIcon('utensils', 'lg')}</div>`;
    }
  } else {
    imageBlockHtml = `
      <div class="food-no-img-empty" style="min-height: 200px;">
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.6rem;">No Menu Set For Today</div>
        <button class="btn btn-primary btn-sm" onclick="openEditMenuModal('${dateStr}', '${dayName}')" style="padding: 0.4rem 0.95rem; font-size: 0.825rem;">
          ${getSvgIcon('plus', 'sm')} Set Food Menu
        </button>
      </div>
    `;
  }

  const descText = (menuObj && menuObj.description) ? `<div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.4rem;">${menuObj.description}</div>` : '';
  const remarkBadge = (menuObj && menuObj.remark) ? `<span class="badge badge-paid" style="font-size: 0.75rem; margin-top: 0.4rem; display: inline-block;">${menuObj.remark}</span>` : '';

  const cardHtml = `
    <div class="food-card featured-today-card" style="max-width: 580px; margin: 0 auto; width: 100%;">
      <div class="food-card-header" style="padding: 0.85rem 1.15rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="day-badge" style="font-size: 0.825rem; padding: 0.25rem 0.65rem;">${dayName.slice(0, 3)}</span>
          <span class="day-date" style="font-weight: 700; font-size: 0.9rem;">${formattedDate}</span>
        </div>
        <button class="btn btn-outline btn-sm" onclick="openEditMenuModal('${dateStr}', '${dayName}')" title="Edit Food Menu" style="padding: 0.25rem 0.65rem; font-size: 0.775rem; gap: 0.35rem;">
          ${getSvgIcon('edit', 'sm')} Edit Menu
        </button>
      </div>
      <div class="food-img-wrapper" style="height: 220px;">
        ${imageBlockHtml}
      </div>
      <div class="food-card-body" style="padding: 1.15rem;">
        <div>
          <div class="food-title" style="font-size: 1.25rem; font-weight: 800;">${foodName}</div>
          ${remarkBadge}
          ${descText}
          ${foodPriceHtml}
        </div>
        <div class="food-stats-row" style="margin-top: 1.15rem; padding-top: 0.85rem; border-top: 1px solid var(--border-light);">
          <div class="stat-pill" style="flex: 1; text-align: center;">
            <span class="stat-pill-label">Orders Today</span>
            <span class="stat-pill-val" style="font-size: 1.2rem;">${totalOrdersCount}</span>
          </div>
          <div class="stat-pill" style="flex: 1; text-align: center;">
            <span class="stat-pill-label">Meals Today</span>
            <span class="stat-pill-val" style="font-size: 1.2rem;">${totalMealsCount}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  cardsGridEl.innerHTML = cardHtml;
}

