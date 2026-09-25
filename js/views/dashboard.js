/* Simplest - Dashboard (Operations Command Center & Mobile App) Controller */

let dashboardDayOffset = 0; // 0 = Today, -1 = Yesterday, +1 = Tomorrow
let dashMobileTab = 'orders'; // 'orders' | 'riders' | 'forecast'

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

function setDashboardMobileTab(tab) {
  dashMobileTab = tab;
  document.querySelectorAll('.dash-mobile-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  const ordersPanel = document.getElementById('cockpit-panel-orders');
  const ridersPanel = document.getElementById('cockpit-panel-riders');
  const forecastPanel = document.getElementById('cockpit-panel-forecast');
  if (ordersPanel) ordersPanel.classList.toggle('mobile-tab-active', tab === 'orders');
  if (ridersPanel) ridersPanel.classList.toggle('mobile-tab-active', tab === 'riders');
  if (forecastPanel) forecastPanel.classList.toggle('mobile-tab-active', tab === 'forecast');
}

function renderDashboard() {
  const kpiContainer = document.getElementById('dashboard-kpi-grid');
  const cockpitContainer = document.getElementById('dashboard-cockpit-grid');
  if (!kpiContainer || !cockpitContainer) return;

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
  
  let labelText = "Today's Operations";
  if (dashboardDayOffset === -1) labelText = "Yesterday's Operations";
  else if (dashboardDayOffset === 1) labelText = "Tomorrow's Operations";
  else if (dashboardDayOffset < -1) labelText = `${Math.abs(dashboardDayOffset)} Days Ago Operations`;
  else if (dashboardDayOffset > 1) labelText = `In ${dashboardDayOffset} Days Operations`;

  if (titleEl) titleEl.textContent = labelText;
  if (dateRangeEl) dateRangeEl.textContent = `${dayName}, ${formattedDate}`;

  // Segmented Navigation active state
  const pBtn = document.getElementById('dash-seg-prev');
  const cBtn = document.getElementById('dash-seg-current');
  const nBtn = document.getElementById('dash-seg-next');
  if (pBtn && cBtn && nBtn) {
    pBtn.classList.toggle('active', dashboardDayOffset < 0);
    cBtn.classList.toggle('active', dashboardDayOffset === 0);
    nBtn.classList.toggle('active', dashboardDayOffset > 0);
  }

  // 1. Compute Day Metrics
  const allOrders = Object.values(cachedOrders || {});
  const dayOrders = allOrders.filter(ord => ord.date === dateStr);
  dayOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const totalOrdersCount = dayOrders.length;
  const totalMealsCount = dayOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
  const totalRevenueAmount = dayOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);
  const stdMealsCount = dayOrders.filter(ord => ord.portion !== 'Small').reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
  const smlMealsCount = dayOrders.filter(ord => ord.portion === 'Small').reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
  const sentDeliveriesCount = dayOrders.filter(ord => ord.dispatched === true).length;
  const unpaidOrdersCount = dayOrders.filter(ord => ord.paymentStatus !== 'Paid').length;
  const unpaidAmount = dayOrders.filter(ord => ord.paymentStatus !== 'Paid').reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);

  // Month-to-date Metrics
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthOrders = allOrders.filter(ord => ord.date && ord.date.startsWith(currentYearMonth));
  const totalMonthRevenue = monthOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);
  const totalMonthOrders = monthOrders.length;

  const dispatchPct = totalOrdersCount > 0 ? Math.round((sentDeliveriesCount / totalOrdersCount) * 100) : 0;

  // =========================================================================
  // TOP 4 KPI CARDS
  // =========================================================================
  kpiContainer.innerHTML = `
    <div class="command-kpi-card kpi-accent">
      <div class="command-kpi-header">
        <span class="command-kpi-label">Today's Meal Volume</span>
        <span class="command-kpi-icon">📦</span>
      </div>
      <div class="command-kpi-value">${totalMealsCount} <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">meals</span></div>
      <div class="command-kpi-sub">
        <span>${totalOrdersCount} Orders</span> • <span style="color:var(--primary-dark); font-weight:700;">Std: ${stdMealsCount}</span> | <span>Sml: ${smlMealsCount}</span>
      </div>
    </div>

    <div class="command-kpi-card kpi-info">
      <div class="command-kpi-header">
        <span class="command-kpi-label">Today's Revenue</span>
        <span class="command-kpi-icon">💰</span>
      </div>
      <div class="command-kpi-value" style="color:var(--primary-dark);">${formatRM(totalRevenueAmount)}</div>
      <div class="command-kpi-sub">
        ${unpaidOrdersCount > 0 
          ? `<span style="color:#ef4444; font-weight:700;">⚠️ ${unpaidOrdersCount} Unpaid (${formatRM(unpaidAmount)})</span>` 
          : `<span style="color:#10b981; font-weight:700;">✓ All Orders Paid</span>`}
      </div>
    </div>

    <div class="command-kpi-card kpi-success">
      <div class="command-kpi-header">
        <span class="command-kpi-label">Rider Dispatch</span>
        <span class="command-kpi-icon">🛵</span>
      </div>
      <div class="command-kpi-value" style="color:#10b981;">${sentDeliveriesCount} <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted);">/ ${totalOrdersCount} sent</span></div>
      <div class="command-progress-track">
        <div class="command-progress-fill" style="width: ${dispatchPct}%;"></div>
      </div>
      <div class="command-kpi-sub" style="margin-top:0.25rem;">
        <span>${dispatchPct}% dispatched today</span>
      </div>
    </div>

    <div class="command-kpi-card kpi-warning">
      <div class="command-kpi-header">
        <span class="command-kpi-label">This Month Total</span>
        <span class="command-kpi-icon">🗓️</span>
      </div>
      <div class="command-kpi-value" style="color:#f59e0b;">${formatRM(totalMonthRevenue)}</div>
      <div class="command-kpi-sub">
        <span>${totalMonthOrders} orders recorded this month</span>
      </div>
    </div>
  `;

  // =========================================================================
  // FOOD IMAGE & DETAILS
  // =========================================================================
  const menuObj = dbGetMenuByDate(dateStr);
  const dayType = menuObj ? (menuObj.dayType || 'normal') : 'normal';
  const hasMenu = !!(menuObj && menuObj.foodName);
  const foodName = hasMenu ? menuObj.foodName : 'No Menu Set For Today';
  const pricing = dbGetPricing();
  const imageSrc = (menuObj && menuObj.image) ? menuObj.image : '';

  let foodImageHtml = '';
  if (dayType === 'holiday') {
    foodImageHtml = `
      <div class="food-no-img-empty" style="background:#fff7ed; color:#c2410c; min-height: 160px; border-radius: var(--radius-md); width: 100%;">
        <div style="font-size:2rem; margin-bottom:0.25rem;">🎉</div>
        <div style="font-weight: 800; color: #9a3412;">Public Holiday</div>
      </div>
    `;
  } else if (dayType === 'closed') {
    foodImageHtml = `
      <div class="food-no-img-empty" style="background:#fef2f2; color:#b91c1c; min-height: 160px; border-radius: var(--radius-md); width: 100%;">
        <div style="font-size:2rem; margin-bottom:0.25rem;">🔒</div>
        <div style="font-weight: 800; color: #991b1b;">Kitchen Closed</div>
      </div>
    `;
  } else if (hasMenu && imageSrc) {
    foodImageHtml = `
      <div class="meal-img-wrap">
        <img src="${imageSrc}" alt="${foodName}" onerror="this.parentElement.style.display='none';" />
      </div>
    `;
  } else {
    foodImageHtml = `
      <div class="meal-img-wrap" style="display: flex; align-items: center; justify-content: center; font-size: 2.2rem;">
        🍱
      </div>
    `;
  }

  // =========================================================================
  // TODAY'S LIVE ORDERS: DESKTOP TABLE + MOBILE CARDS
  // =========================================================================
  let liveOrdersHtml = '';
  if (dayOrders.length === 0) {
    liveOrdersHtml = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.35rem;">📦</div>
        <div style="font-weight: 700; font-size: 0.9rem;">No orders registered for today yet</div>
        <button class="btn btn-primary btn-sm" onclick="openAddOrderModal()" style="margin-top: 0.75rem; border-radius: 20px;">
          + Add First Order
        </button>
      </div>
    `;
  } else {
    const previewOrders = dayOrders.slice(0, 10);
    let tableRows = '';
    let mobileCards = '';

    previewOrders.forEach(ord => {
      const isPaid = ord.paymentStatus === 'Paid';
      const isDispatched = ord.dispatched === true;
      const contact = ord.contactId ? cachedContacts[ord.contactId] : null;
      const address = (contact && contact.address) ? contact.address : (ord.customerAddress || '');
      const riderName = (contact && contact.riderId && cachedContacts[contact.riderId]) ? cachedContacts[contact.riderId].name : (contact && contact.riderName ? contact.riderName : '');
      const portion = ord.portion || 'Standard';

      const waLink = createWhatsAppOrderLink(
        ord.customerPhone,
        ord.customerName,
        ord.day,
        ord.date,
        ord.foodName,
        ord.quantity,
        ord.totalAmount,
        portion
      );

      // Desktop Table Row
      tableRows += `
        <tr data-order-id="${ord.orderId}">
          <td>
            <div style="font-weight: 700; font-size: 0.88rem;">${ord.customerName}</div>
            ${address ? `<div style="font-size: 0.725rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${address}">📍 ${address}</div>` : ''}
          </td>
          <td>
            <div style="font-size: 0.85rem; font-weight: 600;">
              ${ord.foodName}
              <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}" style="font-size: 0.65rem;">${portion === 'Small' ? 'Small' : 'Std'}</span>
              × ${ord.quantity}
            </div>
          </td>
          <td style="font-weight: 800; color: var(--primary-dark); font-size: 0.88rem;">${formatRM(ord.totalAmount)}</td>
          <td>
            <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none; font-size: 0.7rem;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
              ${isPaid ? 'Paid' : 'Unpaid'}
            </button>
          </td>
          <td>
            <span class="badge ${isDispatched ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.65rem;">
              ${isDispatched ? '✓ Sent' : '⏳ Wait'}
            </span>
          </td>
          <td>
            <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm" title="WhatsApp Reminder" style="padding: 0.2rem 0.45rem;">
              ${getSvgIcon('whatsapp', 'sm')}
            </a>
          </td>
        </tr>
      `;

      // Mobile Card Item
      mobileCards += `
        <div class="mobile-data-card" data-order-id="${ord.orderId}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <div>
              <span style="font-size: 0.95rem; font-weight: 800;">${ord.customerName}</span>
              ${ord.customerPhone ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${ord.customerPhone}</div>` : ''}
            </div>
            <span style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</span>
          </div>
          ${address ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem;">📍 ${address}</div>` : ''}
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            🥗 ${ord.foodName}
            <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}" style="font-size: 0.65rem;">${portion === 'Small' ? 'Small' : 'Std'}</span>
            × ${ord.quantity}
            ${riderName ? ` • 🛵 ${riderName}` : ''}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.45rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
                ${isPaid ? 'Paid' : 'Unpaid'}
              </button>
              <span class="badge ${isDispatched ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.65rem;">
                ${isDispatched ? '✓ Sent' : '⏳ Pending'}
              </span>
            </div>
            <div style="display: flex; gap: 0.35rem;">
              <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm" title="WhatsApp Reminder">
                ${getSvgIcon('whatsapp', 'sm')}
              </a>
            </div>
          </div>
        </div>
      `;
    });

    liveOrdersHtml = `
      <!-- Desktop Table View -->
      <div class="data-table-card desktop-table-view" style="overflow-x: auto; box-shadow: none; border: none; padding: 0;">
        <table class="data-table" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Food Item</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>WA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List View -->
      <div class="mobile-card-list">
        ${mobileCards}
      </div>

      ${dayOrders.length > 10 ? `<div style="text-align:center; padding-top:0.75rem;"><button class="btn btn-outline btn-sm" onclick="switchView('orders')">View all ${dayOrders.length} orders in Orders Management →</button></div>` : ''}
    `;
  }

  // =========================================================================
  // RIGHT COLUMN: RIDER STATUS, UPCOMING FORECAST, QUICK ACTIONS
  // =========================================================================
  
  // 1. Group riders
  const riderGroups = {};
  dayOrders.forEach(ord => {
    const contact = ord.contactId ? cachedContacts[ord.contactId] : null;
    const rId = (contact && contact.riderId) ? contact.riderId : 'unassigned';
    let rName = 'Unassigned';
    if (rId !== 'unassigned') {
      rName = (cachedContacts[rId] && cachedContacts[rId].name) ? cachedContacts[rId].name : (contact.riderName || 'Rider');
    }
    if (!riderGroups[rId]) {
      riderGroups[rId] = { id: rId, name: rName, orders: [], dispatchedCount: 0 };
    }
    riderGroups[rId].orders.push(ord);
    if (ord.dispatched) riderGroups[rId].dispatchedCount++;
  });

  const riderList = Object.values(riderGroups);
  let riderStatusHtml = '';
  if (riderList.length === 0) {
    riderStatusHtml = `<div style="font-size: 0.825rem; color: var(--text-muted); text-align: center; padding: 1rem;">No rider assignments for today</div>`;
  } else {
    riderList.forEach(r => {
      const isComplete = r.dispatchedCount === r.orders.length && r.orders.length > 0;
      riderStatusHtml += `
        <div class="rider-status-row">
          <div>
            <div style="font-weight: 700; font-size: 0.875rem;">🛵 ${r.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${r.orders.length} Deliveries assigned</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge ${isComplete ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.725rem;">
              ${r.dispatchedCount}/${r.orders.length} Sent
            </span>
          </div>
        </div>
      `;
    });
  }

  // 2. Upcoming 4 Days Forecast
  let forecastRowsHtml = '';
  for (let i = 1; i <= 4; i++) {
    const fDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const fY = fDate.getFullYear();
    const fM = String(fDate.getMonth() + 1).padStart(2, '0');
    const fD = String(fDate.getDate()).padStart(2, '0');
    const fStr = `${fY}-${fM}-${fD}`;
    const fDay = fDate.toLocaleDateString('en-US', { weekday: 'short' });
    const fReadable = formatDateReadable(fStr);
    const fMenu = dbGetMenuByDate(fStr);
    const fOrders = allOrders.filter(ord => ord.date === fStr);
    const fMeals = fOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);

    const fFoodName = fMenu ? (fMenu.foodName || 'No Menu Set') : 'No Menu Set';
    const isHoliday = fMenu && fMenu.dayType === 'holiday';
    const isClosed = fMenu && fMenu.dayType === 'closed';

    forecastRowsHtml += `
      <div class="forecast-day-row" onclick="openEditMenuModal('${fStr}', '${fDay}')" title="Click to view/edit menu for ${fReadable}">
        <div style="display: flex; align-items: center; gap: 0.65rem;">
          <div style="text-align: center; min-width: 46px; background: var(--bg-surface); padding: 0.25rem 0.4rem; border-radius: 6px; border: 1px solid var(--border-light);">
            <div style="font-size: 0.725rem; font-weight: 800; color: var(--primary-accent);">${fDay}</div>
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">${fD}/${fM}</div>
          </div>
          <div>
            <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">
              ${isHoliday ? '🎉 Public Holiday' : isClosed ? '🔒 Kitchen Closed' : fFoodName}
            </div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">
              ${fReadable}
            </div>
          </div>
        </div>
        <div>
          <span class="badge ${fMeals > 0 ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.725rem;">
            ${fMeals} Booked
          </span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // ASSEMBLE DUAL-COLUMN COCKPIT + MOBILE SEGMENTED TABS
  // =========================================================================
  cockpitContainer.innerHTML = `
    <!-- Left Column: Operations & Kitchen -->
    <div class="command-col-main">
      
      <!-- Panel 1: Today's Featured Menu & Kitchen Prep (Hero Card) -->
      <div class="cockpit-panel-card" id="cockpit-panel-meal">
        <div class="cockpit-panel-header">
          <div class="cockpit-panel-title">
            <span>🍱</span>
            <span>Kitchen Meal & Preparation</span>
            <span class="badge badge-paid" style="font-size: 0.7rem; margin-left: 0.25rem;">${dayName}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="openEditMenuModal('${dateStr}', '${dayName}')" style="font-size: 0.775rem; padding: 0.25rem 0.65rem;">
            ${getSvgIcon('edit', 'sm')} Edit Menu
          </button>
        </div>
        <div class="cockpit-panel-body">
          <div class="meal-cockpit-layout">
            ${foodImageHtml}
            <div style="flex: 1; min-width: 200px;">
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); line-height: 1.3;">
                ${foodName}
              </div>
              ${menuObj && menuObj.remark ? `<span class="badge badge-paid" style="font-size: 0.725rem; margin-top: 0.35rem; display: inline-block;">${menuObj.remark}</span>` : ''}
              ${menuObj && menuObj.description ? `<div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.35rem;">${menuObj.description}</div>` : ''}
              
              <div class="food-price-pills" style="margin-top: 0.65rem;">
                <span class="price-pill-std">Standard ${formatRM(pricing.standard)}</span>
                <span class="price-pill-sml">Small ${formatRM(pricing.small)}</span>
              </div>
            </div>
          </div>

          <!-- Kitchen Prep Ratio Tracker -->
          <div class="prep-ratio-bar">
            <div class="prep-ratio-item">
              <div class="prep-ratio-num" style="color: var(--primary-accent);">${stdMealsCount}</div>
              <div class="prep-ratio-label">Standard</div>
            </div>
            <div style="width: 1px; height: 24px; background: var(--border-color);"></div>
            <div class="prep-ratio-item">
              <div class="prep-ratio-num" style="color: #3b82f6;">${smlMealsCount}</div>
              <div class="prep-ratio-label">Small</div>
            </div>
            <div style="width: 1px; height: 24px; background: var(--border-color);"></div>
            <div class="prep-ratio-item">
              <div class="prep-ratio-num" style="color: #10b981;">${totalMealsCount}</div>
              <div class="prep-ratio-label">Total Cooking</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile Tab Switcher (Visible only on mobile screens <= 768px) -->
      <div class="dash-mobile-tabs-nav">
        <button type="button" class="dash-mobile-tab-btn ${dashMobileTab === 'orders' ? 'active' : ''}" data-tab="orders" onclick="setDashboardMobileTab('orders')">
          📋 Orders (${dayOrders.length})
        </button>
        <button type="button" class="dash-mobile-tab-btn ${dashMobileTab === 'riders' ? 'active' : ''}" data-tab="riders" onclick="setDashboardMobileTab('riders')">
          🛵 Riders (${riderList.length})
        </button>
        <button type="button" class="dash-mobile-tab-btn ${dashMobileTab === 'forecast' ? 'active' : ''}" data-tab="forecast" onclick="setDashboardMobileTab('forecast')">
          🗓️ Forecast
        </button>
      </div>

      <!-- Panel 2: Today's Orders Live Feed -->
      <div class="cockpit-panel-card ${dashMobileTab === 'orders' ? 'mobile-tab-active' : ''}" id="cockpit-panel-orders">
        <div class="cockpit-panel-header">
          <div class="cockpit-panel-title">
            <span>📋</span>
            <span>Today's Deliveries & Orders</span>
            <span class="badge badge-paid" style="font-size: 0.7rem; margin-left: 0.25rem;">${dayOrders.length}</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchView('orders')" style="font-size: 0.775rem; padding: 0.25rem 0.65rem;">
            Full Orders →
          </button>
        </div>
        <div class="cockpit-panel-body" style="padding: 0.65rem 0.85rem;">
          ${liveOrdersHtml}
        </div>
      </div>

    </div>

    <!-- Right Column: Dispatch, Forecast & Shortcuts -->
    <div class="command-col-side">
      
      <!-- Panel 3: Riders Status Monitor -->
      <div class="cockpit-panel-card ${dashMobileTab === 'riders' ? 'mobile-tab-active' : ''}" id="cockpit-panel-riders">
        <div class="cockpit-panel-header">
          <div class="cockpit-panel-title">
            <span>🛵</span>
            <span>Riders Dispatch Status</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchView('kitchen')" style="font-size: 0.775rem; padding: 0.25rem 0.65rem;">
            Rider Hub →
          </button>
        </div>
        <div class="cockpit-panel-body" style="padding: 0.85rem;">
          ${riderStatusHtml}
        </div>
      </div>

      <!-- Panel 4: Next 4 Days Forecast -->
      <div class="cockpit-panel-card ${dashMobileTab === 'forecast' ? 'mobile-tab-active' : ''}" id="cockpit-panel-forecast">
        <div class="cockpit-panel-header">
          <div class="cockpit-panel-title">
            <span>🗓️</span>
            <span>Next 4 Days Advance Bookings</span>
          </div>
          <button class="btn btn-outline btn-sm" onclick="switchView('menu')" style="font-size: 0.775rem; padding: 0.25rem 0.65rem;">
            Calendar →
          </button>
        </div>
        <div class="cockpit-panel-body" style="padding: 0.85rem;">
          ${forecastRowsHtml}
        </div>
      </div>

      <!-- Panel 5: Quick Action Shortcuts -->
      <div class="cockpit-panel-card" id="cockpit-panel-shortcuts">
        <div class="cockpit-panel-header">
          <div class="cockpit-panel-title">
            <span>⚡</span>
            <span>Quick Workflows</span>
          </div>
        </div>
        <div class="cockpit-panel-body" style="padding: 0.85rem;">
          <div class="quick-action-grid">
            <button class="quick-action-btn" onclick="openAddOrderModal()">
              <span>➕</span>
              <span>New Order</span>
            </button>
            <button class="quick-action-btn" onclick="switchView('kitchen')">
              <span>🛵</span>
              <span>Riders</span>
            </button>
            <button class="quick-action-btn" onclick="switchView('menu')">
              <span>🗓️</span>
              <span>Meal Menu</span>
            </button>
            <button class="quick-action-btn" onclick="openPriceSettingsModal()">
              <span>💰</span>
              <span>Set Prices</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `;
}



