/* Simplest - Orders Management Controller */

let orderViewScope = 'day'; // Default to 'day' view
let ordersDayOffset = 0; // 0 = Today, -1 = Yesterday, +1 = Tomorrow
let ordersMonthOffset = 0; // 0 = Current Month, -1 = Prev Month, +1 = Next Month
let orderFilterPayment = 'All';
let orderSearchQuery = '';

function initOrdersView() {
  renderOrders();
}

function setOrdersViewScope(scope) {
  orderViewScope = scope;
  renderOrders();
}

function setOrdersDayOffset(offsetChange) {
  if (offsetChange === 0) ordersDayOffset = 0;
  else ordersDayOffset += offsetChange;
  renderOrders();
}

function setOrdersMonthOffset(offsetChange) {
  if (offsetChange === 0) ordersMonthOffset = 0;
  else ordersMonthOffset += offsetChange;
  renderOrders();
}

function setOrderFilter(type, value) {
  if (type === 'payment') {
    orderFilterPayment = value;
    document.querySelectorAll('.filter-payment').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === value);
    });
  }
  renderOrders();
}

function handleOrderSearchFilter(query) {
  orderSearchQuery = query;
  renderOrders();
}

function getOrderPriceBreakdown(ord) {
  const isCreditFood = (ord.foodAmount === 0 && (ord.unitPrice === 0 || ord.paymentStatus === 'Package'));
  const rawFoodAmt = (ord.foodAmount !== undefined && ord.foodAmount !== null)
    ? parseFloat(ord.foodAmount)
    : (ord.unitPrice !== undefined ? (parseFloat(ord.unitPrice) + (parseFloat(ord.addonPerMeal) || 0)) * (parseInt(ord.quantity) || 1) : (parseFloat(ord.totalAmount) - (parseFloat(ord.riderFee) || 0)));

  const foodAmt = isNaN(rawFoodAmt) ? 0 : Math.max(0, rawFoodAmt);
  const riderFee = parseFloat(ord.riderFee) || 0;
  const riderPaidByCredit = !!ord.riderFeePaidByCredit;

  let mealDisplay = formatRM(foodAmt);
  let mealSub = '';
  let mealBadge = formatRM(foodAmt);

  if (isCreditFood) {
    mealDisplay = 'RM 0.00';
    mealSub = '💳 Package';
    mealBadge = 'RM 0.00 (Pkg)';
  } else if (ord.addons && ord.addons.length > 0 && ord.addonPerMeal > 0) {
    mealSub = `+RM${(parseFloat(ord.addonPerMeal) * (parseInt(ord.quantity) || 1)).toFixed(2)} Add-on`;
  }

  let riderDisplay = formatRM(riderFee);
  let riderSub = '';
  let riderBadge = formatRM(riderFee);

  if (riderPaidByCredit) {
    riderSub = '💳 Credit';
    riderBadge = `${formatRM(riderFee)} (Credit)`;
  }

  return {
    mealDisplay,
    mealSub,
    mealBadge,
    riderDisplay,
    riderSub,
    riderBadge,
    totalDisplay: formatRM(ord.totalAmount || 0)
  };
}

function renderOrders() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  // Sync Scope Toggle Buttons
  const scopeDayBtn = document.getElementById('orders-scope-day');
  const scopeMonthBtn = document.getElementById('orders-scope-month');
  if (scopeDayBtn) scopeDayBtn.classList.toggle('active', orderViewScope === 'day');
  if (scopeMonthBtn) scopeMonthBtn.classList.toggle('active', orderViewScope === 'month');

  // Toggle Day vs Month Navigation
  const dayNav = document.getElementById('orders-day-nav');
  const monthNav = document.getElementById('orders-month-nav');
  if (dayNav) dayNav.style.display = (orderViewScope === 'day') ? 'flex' : 'none';
  if (monthNav) monthNav.style.display = (orderViewScope === 'month') ? 'flex' : 'none';

  const weekTitleEl = document.getElementById('orders-week-title');
  const weekRangeEl = document.getElementById('orders-week-range');
  const totalCountEl = document.getElementById('orders-total-weekly-count');

  const allOrders = Object.values(cachedOrders || {});
  const q = (orderSearchQuery || '').toLowerCase().trim();

  // ==========================================
  // CASE 1: MONTHLY VIEW (Entire Month Details)
  // ==========================================
  if (orderViewScope === 'month') {
    const now = new Date();
    const targetMonthDate = new Date(now.getFullYear(), now.getMonth() + ordersMonthOffset, 1);
    const yyyy = targetMonthDate.getFullYear();
    const mm = String(targetMonthDate.getMonth() + 1).padStart(2, '0');
    const yearMonth = `${yyyy}-${mm}`;
    const monthName = targetMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const lastDayDate = new Date(yyyy, targetMonthDate.getMonth() + 1, 0);
    const lastDay = lastDayDate.getDate();
    const shortMonth = targetMonthDate.toLocaleDateString('en-US', { month: 'short' });

    // Active state for Month segmented buttons
    const mPrev = document.getElementById('orders-month-prev');
    const mCurr = document.getElementById('orders-month-current');
    const mNext = document.getElementById('orders-month-next');
    if (mPrev && mCurr && mNext) {
      mPrev.classList.toggle('active', ordersMonthOffset < 0);
      mCurr.classList.toggle('active', ordersMonthOffset === 0);
      mNext.classList.toggle('active', ordersMonthOffset > 0);
    }

    if (weekTitleEl) weekTitleEl.textContent = `🗓️ ${monthName} Orders`;
    if (weekRangeEl) weekRangeEl.textContent = `01 ${shortMonth} - ${lastDay} ${shortMonth} ${yyyy} (Full Month)`;

    // Filter month orders & sort chronologically
    const monthOrders = allOrders.filter(ord => ord.date && ord.date.startsWith(yearMonth));
    monthOrders.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    const totalMonthOrders = monthOrders.length;
    const totalMonthMeals = monthOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);
    const totalMonthRevenue = monthOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);
    const totalMonthMealRevenue = monthOrders.reduce((sum, ord) => {
      const isCredit = (ord.foodAmount === 0 && (ord.unitPrice === 0 || ord.paymentStatus === 'Package'));
      if (isCredit) return sum;
      const amt = (ord.foodAmount !== undefined && ord.foodAmount !== null) ? parseFloat(ord.foodAmount) : (parseFloat(ord.totalAmount) - (parseFloat(ord.riderFee) || 0));
      return sum + (isNaN(amt) ? 0 : Math.max(0, amt));
    }, 0);
    const totalMonthRiderRevenue = monthOrders.reduce((sum, ord) => sum + (parseFloat(ord.riderFee) || 0), 0);
    const paidOrders = monthOrders.filter(ord => ord.paymentStatus === 'Paid');
    const unpaidOrders = monthOrders.filter(ord => ord.paymentStatus === 'Unpaid');
    const paidRevenue = paidOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);
    const unpaidRevenue = unpaidOrders.reduce((sum, ord) => sum + (parseFloat(ord.totalAmount) || 0), 0);

    if (totalCountEl) {
      totalCountEl.textContent = `${totalMonthOrders} Orders (${totalMonthMeals} Meals)`;
    }

    // Apply Filter & Search
    const filtered = monthOrders.filter(ord => {
      if (orderFilterPayment !== 'All' && ord.paymentStatus !== orderFilterPayment) return false;
      if (q) {
        const matchName = (ord.customerName || '').toLowerCase().includes(q);
        const matchFood = (ord.foodName || '').toLowerCase().includes(q);
        const matchDate = (ord.date || '').toLowerCase().includes(q);
        const matchDay = (ord.day || '').toLowerCase().includes(q);
        const matchPhone = (ord.customerPhone || '').toLowerCase().includes(q);
        if (!matchName && !matchFood && !matchDate && !matchDay && !matchPhone) return false;
      }
      return true;
    });

    // Monthly Stat Cards
    const statsHtml = `
      <div class="monthly-stats-grid">
        <div class="monthly-stat-card">
          <span class="monthly-stat-label">Total Orders</span>
          <span class="monthly-stat-value">${totalMonthOrders} <span class="monthly-stat-sub">(${totalMonthMeals} meals)</span></span>
        </div>
        <div class="monthly-stat-card">
          <span class="monthly-stat-label">Total Revenue</span>
          <span class="monthly-stat-value" style="color:var(--primary-dark);">${formatRM(totalMonthRevenue)}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-top: 2px;">
            🍱 Meal: ${formatRM(totalMonthMealRevenue)} • 🛵 Rider: ${formatRM(totalMonthRiderRevenue)}
          </div>
        </div>
        <div class="monthly-stat-card">
          <span class="monthly-stat-label">Paid Received</span>
          <span class="monthly-stat-value" style="color:#10b981;">${formatRM(paidRevenue)} <span class="monthly-stat-sub">(${paidOrders.length})</span></span>
        </div>
        <div class="monthly-stat-card">
          <span class="monthly-stat-label">Unpaid Pending</span>
          <span class="monthly-stat-value" style="color:#ef4444;">${formatRM(unpaidRevenue)} <span class="monthly-stat-sub">(${unpaidOrders.length})</span></span>
        </div>
      </div>
    `;

    if (filtered.length === 0) {
      container.innerHTML = `
        ${statsHtml}
        <div class="empty-state">
          <div class="empty-state-icon" style="display:flex; justify-content:center; margin-bottom:0.5rem;">${getSvgIcon('orders', 'lg')}</div>
          <div style="font-weight:700; font-size:0.95rem;">No orders found for ${monthName}</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">Try adjusting payment filter or search query</div>
        </div>
      `;
      return;
    }

    let tableRowsHtml = '';
    let mobileCardsHtml = '';

    filtered.forEach(ord => {
      const isPaid = ord.paymentStatus === 'Paid';
      const portion = ord.portion || 'Standard';
      const contact = ord.contactId ? cachedContacts[ord.contactId] : null;
      const address = ord.address || (contact && contact.address ? contact.address : (ord.customerAddress || ''));
      const riderId = ord.riderId || (contact && contact.riderId ? contact.riderId : '');
      const riderName = (riderId && cachedContacts[riderId]) ? cachedContacts[riderId].name : (ord.riderName || (contact && contact.riderName ? contact.riderName : ''));
      const isDispatched = ord.dispatched === true;
      const breakdown = getOrderPriceBreakdown(ord);

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

      // Desktop Table Row for Month View
      tableRowsHtml += `
        <tr data-order-id="${ord.orderId}">
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
              <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">${formatDateReadable(ord.date)}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${ord.day}</span>
            </div>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
              <span style="font-weight: 700; font-size: 0.9rem;">${ord.customerName}</span>
              ${ord.customerPhone ? `<span style="font-size: 0.78rem; color: var(--text-muted);">${ord.customerPhone}</span>` : ''}
              ${address ? `<span style="font-size: 0.725rem; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${address}">📍 ${address}</span>` : ''}
            </div>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span style="font-weight: 700;">${ord.foodName}</span>
              <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">
                ${portion === 'Small' ? 'Small' : 'Standard'}
              </span>
              <span style="color: var(--text-muted); font-weight: 700;">× ${ord.quantity}</span>
            </div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${breakdown.mealDisplay}</div>
            ${breakdown.mealSub ? `<div style="font-size: 0.7rem; color: #059669; font-weight: 700;">${breakdown.mealSub}</div>` : ''}
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${breakdown.riderDisplay}</div>
            ${breakdown.riderSub ? `<div style="font-size: 0.7rem; color: #0284c7; font-weight: 700;">${breakdown.riderSub}</div>` : ''}
          </td>
          <td>
            <div style="font-weight: 800; color: var(--primary-dark); font-size: 0.95rem;">${breakdown.totalDisplay}</div>
          </td>
          <td>
            ${renderPaymentBadgeHtml(ord.paymentStatus, ord.orderId)}
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <span style="font-size: 0.78rem; font-weight: 700; color: ${riderName ? 'var(--primary-dark)' : 'var(--text-muted)'};">
                ${riderName ? `🛵 ${riderName}` : '—'}
              </span>
              ${ord.riderFee && parseFloat(ord.riderFee) > 0 ? `<span style="font-size: 0.68rem; color: #0284c7; font-weight: 700;">Fee: RM${parseFloat(ord.riderFee).toFixed(2)}</span>` : ''}
              <span class="badge ${isDispatched ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.65rem; padding: 0.15rem 0.4rem; width: fit-content;">
                ${isDispatched ? '✓ Sent' : '⏳ Pending'}
              </span>
            </div>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm" title="WhatsApp Message">
                ${getSvgIcon('whatsapp', 'sm')}
              </a>
              <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="deleteOrderAction('${ord.orderId}')" title="Delete">
                ${getSvgIcon('trash', 'sm')}
              </button>
            </div>
          </td>
        </tr>
      `;

      // Mobile Card Item
      mobileCardsHtml += `
        <div class="mobile-data-card" data-order-id="${ord.orderId}">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.45rem; gap: 0.5rem;">
            <div>
              <span style="font-size: 1rem; font-weight: 800;">${ord.customerName}</span>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDateReadable(ord.date)} (${ord.day})</div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
              <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                <span style="font-size: 0.725rem; background: var(--bg-surface-secondary, #f1f5f9); border: 1px solid var(--border-color); padding: 1px 6px; border-radius: 4px; font-weight: 700; color: var(--text-main);">🍱 ${breakdown.mealBadge}</span>
                <span style="font-size: 0.725rem; background: #e0f2fe; border: 1px solid #bae6fd; padding: 1px 6px; border-radius: 4px; font-weight: 700; color: #0369a1;">🛵 ${breakdown.riderBadge}</span>
              </div>
              <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark); margin-top: 1px;">
                Total: ${breakdown.totalDisplay}
              </div>
            </div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            🥗 ${ord.foodName}
            <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">${portion === 'Small' ? 'Small' : 'Standard'}</span>
            × ${ord.quantity}
            ${riderName ? ` • 🛵 ${riderName}${ord.riderFee && parseFloat(ord.riderFee) > 0 ? ` (Fee: RM${parseFloat(ord.riderFee).toFixed(2)})` : ''}` : ''}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              ${renderPaymentBadgeHtml(ord.paymentStatus, ord.orderId)}
              <span class="badge ${isDispatched ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.65rem;">
                ${isDispatched ? '✓ Sent' : '⏳ Pending'}
              </span>
            </div>
            <div style="display: flex; gap: 0.35rem;">
              <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm">
                ${getSvgIcon('whatsapp', 'sm')}
              </a>
              <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="deleteOrderAction('${ord.orderId}')">
                ${getSvgIcon('trash', 'sm')}
              </button>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      ${statsHtml}
      <!-- Desktop Table View -->
      <div class="data-table-card desktop-table-view">
        <table class="data-table">
          <thead>
            <tr>
              <th>Meal Date</th>
              <th>Customer</th>
              <th>Food Item</th>
              <th>🍱 Meal</th>
              <th>🛵 Rider</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Rider Dispatch</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="mobile-card-list">
        ${mobileCardsHtml}
      </div>
    `;
    return;
  }

  // ==========================================
  // CASE 2: DAILY VIEW (Single Day Details)
  // ==========================================
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ordersDayOffset);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const targetDateStr = `${yyyy}-${mm}-${dd}`;

  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDateReadable(targetDateStr);

  let labelText = "Today's Orders";
  if (ordersDayOffset === -1) labelText = "Yesterday's Orders";
  else if (ordersDayOffset === 1) labelText = "Tomorrow's Orders";
  else if (ordersDayOffset < -1) labelText = `${Math.abs(ordersDayOffset)} Days Ago Orders`;
  else if (ordersDayOffset > 1) labelText = `In ${ordersDayOffset} Days Orders`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${dayName}, ${formattedDate}`;

  // iOS Segment Active State
  const pBtn = document.getElementById('orders-seg-prev');
  const cBtn = document.getElementById('orders-seg-current');
  const nBtn = document.getElementById('orders-seg-next');
  if (pBtn && cBtn && nBtn) {
    pBtn.classList.toggle('active', ordersDayOffset < 0);
    cBtn.classList.toggle('active', ordersDayOffset === 0);
    nBtn.classList.toggle('active', ordersDayOffset > 0);
  }

  // Filter Orders for Today/Target Date
  const dayOrders = allOrders.filter(ord => ord.date === targetDateStr);
  dayOrders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const dayMealsCount = dayOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);

  if (totalCountEl) {
    totalCountEl.textContent = `${dayOrders.length} Orders (${dayMealsCount} Meals Today)`;
  }

  const filtered = dayOrders.filter(ord => {
    if (orderFilterPayment !== 'All' && ord.paymentStatus !== orderFilterPayment) return false;
    if (q) {
      const matchName = (ord.customerName || '').toLowerCase().includes(q);
      const matchFood = (ord.foodName || '').toLowerCase().includes(q);
      const matchPhone = (ord.customerPhone || '').toLowerCase().includes(q);
      if (!matchName && !matchFood && !matchPhone) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="display:flex; justify-content:center; margin-bottom:0.5rem;">${getSvgIcon('orders', 'lg')}</div>
        <div style="font-weight:700; font-size:0.9rem;">No orders for ${dayName} (${formattedDate})</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">Try adjusting payment status or navigate to another date</div>
      </div>
    `;
    return;
  }

  let tableRowsHtml = '';
  let mobileCardsHtml = '';

  filtered.forEach(ord => {
    const isPaid = ord.paymentStatus === 'Paid';
    const portion = ord.portion || 'Standard';
    const contact = ord.contactId ? cachedContacts[ord.contactId] : null;
    const address = ord.address || (contact && contact.address ? contact.address : (ord.customerAddress || ''));
    const riderId = ord.riderId || (contact && contact.riderId ? contact.riderId : '');
    const riderName = (riderId && cachedContacts[riderId]) ? cachedContacts[riderId].name : (ord.riderName || (contact && contact.riderName ? contact.riderName : ''));
    const isDispatched = ord.dispatched === true;
    const breakdown = getOrderPriceBreakdown(ord);

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

    tableRowsHtml += `
      <tr data-order-id="${ord.orderId}">
        <td style="font-weight: 700;">
          <div>${ord.customerName}</div>
          ${address ? `<div style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">📍 ${address}</div>` : ''}
        </td>
        <td style="color: var(--text-muted);">${ord.day.slice(0, 3)} (${formatDateReadable(ord.date)})</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="font-weight: 700;">${ord.foodName}</span>
            <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">
              ${portion === 'Small' ? 'Small' : 'Standard'}
            </span>
            <span style="color: var(--text-muted);">× ${ord.quantity}</span>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${breakdown.mealDisplay}</div>
          ${breakdown.mealSub ? `<div style="font-size: 0.7rem; color: #059669; font-weight: 700;">${breakdown.mealSub}</div>` : ''}
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${breakdown.riderDisplay}</div>
          ${breakdown.riderSub ? `<div style="font-size: 0.7rem; color: #0284c7; font-weight: 700;">${breakdown.riderSub}</div>` : ''}
        </td>
        <td>
          <div style="font-weight: 800; color: var(--primary-dark); font-size: 0.95rem;">${breakdown.totalDisplay}</div>
        </td>
        <td>
          ${renderPaymentBadgeHtml(ord.paymentStatus, ord.orderId)}
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm" title="WhatsApp Message">
              ${getSvgIcon('whatsapp', 'sm')}
            </a>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="deleteOrderAction('${ord.orderId}')" title="Delete">
              ${getSvgIcon('trash', 'sm')}
            </button>
          </div>
        </td>
      </tr>
    `;

    mobileCardsHtml += `
      <div class="mobile-data-card" data-order-id="${ord.orderId}">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.45rem; gap: 0.5rem;">
          <div>
            <span style="font-size: 1rem; font-weight: 800;">${ord.customerName}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${ord.day}, ${formatDateReadable(ord.date)}</div>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
            <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <span style="font-size: 0.725rem; background: var(--bg-surface-secondary, #f1f5f9); border: 1px solid var(--border-color); padding: 1px 6px; border-radius: 4px; font-weight: 700; color: var(--text-main);">🍱 ${breakdown.mealBadge}</span>
              <span style="font-size: 0.725rem; background: #e0f2fe; border: 1px solid #bae6fd; padding: 1px 6px; border-radius: 4px; font-weight: 700; color: #0369a1;">🛵 ${breakdown.riderBadge}</span>
            </div>
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--primary-dark); margin-top: 1px;">
              Total: ${breakdown.totalDisplay}
            </div>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          🥗 ${ord.foodName}
          <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">${portion === 'Small' ? 'Small' : 'Standard'}</span>
          × ${ord.quantity}
          ${riderName ? ` • 🛵 ${riderName}${ord.riderFee && parseFloat(ord.riderFee) > 0 ? ` (Fee: RM${parseFloat(ord.riderFee).toFixed(2)})` : ''}` : ''}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
          <div style="display: flex; gap: 0.35rem;">
            ${renderPaymentBadgeHtml(ord.paymentStatus, ord.orderId)}
          </div>
          <div style="display: flex; gap: 0.35rem;">
            <a href="${waLink}" target="_blank" class="btn btn-whatsapp btn-sm">
              ${getSvgIcon('whatsapp', 'sm')}
            </a>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="deleteOrderAction('${ord.orderId}')">
              ${getSvgIcon('trash', 'sm')}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <!-- Desktop Table View -->
    <div class="data-table-card desktop-table-view">
      <table class="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Meal Date</th>
            <th>Food Item</th>
            <th>🍱 Meal</th>
            <th>🛵 Rider</th>
            <th>Total</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Mobile Card View -->
    <div class="mobile-card-list">
      ${mobileCardsHtml}
    </div>
  `;
}

function renderPaymentBadgeHtml(status, orderId) {
  let badgeClass = 'badge-unpaid';
  let label = status || 'Unpaid';
  if (status === 'Paid') {
    badgeClass = 'badge-paid';
  } else if (status === 'Package') {
    badgeClass = 'badge-package';
  }

  const onclickAttr = orderId ? `onclick="togglePaymentStatusAction('${orderId}', '${status}')"` : '';
  const styleAttr = orderId ? 'style="cursor: pointer; border: none;"' : '';
  return `<button class="badge ${badgeClass}" ${styleAttr} ${onclickAttr} title="Click to toggle payment status">${label}</button>`;
}

async function togglePaymentStatusAction(orderId, currentStatus) {
  const ord = cachedOrders[orderId];
  let nextStatus = 'Paid';
  if (ord && parseFloat(ord.totalAmount) > 0) {
    nextStatus = (currentStatus === 'Paid') ? 'Unpaid' : 'Paid';
  } else {
    if (currentStatus === 'Unpaid') nextStatus = 'Paid';
    else if (currentStatus === 'Paid') nextStatus = 'Package';
    else if (currentStatus === 'Package') nextStatus = 'Unpaid';
  }

  await dbUpdateOrderStatus(orderId, nextStatus, null);
  renderOrders();
  if (typeof renderDashboard === 'function') renderDashboard();
}

async function deleteOrderAction(orderId) {
  const confirmed = await showMaterialConfirm('Delete Order', 'Are you sure you want to delete this order? This action cannot be undone.', 'Delete', true);
  if (confirmed) {
    await dbDeleteOrder(orderId);
    renderOrders();
    if (typeof renderDashboard === 'function') renderDashboard();
    showMaterialToast('Order deleted successfully', 'info');
  }
}

// Customer Search Autocomplete Handler
function handleOrderCustomerSearch(query) {
  const dropdown = document.getElementById('order-customer-dropdown');
  if (!dropdown) return;

  const contactsArr = Object.entries(cachedContacts || {}).map(([id, val]) => ({ id, ...val }));
  const q = (query || '').toLowerCase().trim();

  const filtered = contactsArr.filter(c => {
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div class="customer-search-item" style="color:var(--text-muted);">No customer matches found</div>`;
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = '';
  filtered.forEach(c => {
    const item = document.createElement('div');
    item.className = 'customer-search-item';
    const stdC = c.creditStandard || 0;
    const smlC = c.creditSmall || 0;
    const credTag = (stdC > 0 || smlC > 0)
      ? `<span style="font-size:0.725rem; color:#047857; font-weight:800; background:#dcfce7; padding:2px 6px; border-radius:4px; margin-left:6px;">💳 ${stdC} Std / ${smlC} Sml</span>`
      : '';
    const has2Addr = c.address && c.address2 && c.address2.trim();
    const addrTag = has2Addr
      ? `<span style="font-size:0.7rem; color:#0284c7; background:#e0f2fe; padding:1px 6px; border-radius:4px; margin-left:4px; font-weight:700;">📍 2 Addr</span>`
      : '';

    item.innerHTML = `
      <div>
        <strong>${c.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${c.phone || 'No phone'})</span>
        ${addrTag}
        ${credTag}
      </div>
    `;
    item.onclick = () => selectOrderCustomer(c);
    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

function setPackagePaymentOptionEnabled(enabled) {
  const packageCard = document.getElementById('payment-radio-card-package');
  if (!packageCard) return;
  if (enabled) {
    packageCard.classList.remove('disabled');
    packageCard.style.pointerEvents = 'auto';
    packageCard.style.opacity = '1';
    const radio = packageCard.querySelector('input');
    if (radio) radio.disabled = false;
  } else {
    packageCard.classList.add('disabled');
    packageCard.style.pointerEvents = 'none';
    packageCard.style.opacity = '0.45';
    const radio = packageCard.querySelector('input');
    if (radio) radio.disabled = true;
  }
}

function checkCustomerHasCreditForPortion(customer, portion) {
  if (!customer) return false;
  const stdC = parseInt(customer.creditStandard) || 0;
  const smlC = parseInt(customer.creditSmall) || 0;

  if (portion === 'Small') {
    return smlC > 0;
  }
  return stdC > 0;
}

function setupOrderAddressSelector(customer) {
  const group = document.getElementById('order-address-selector-group');
  if (!group) return;

  const addr1 = (customer.address || '').trim();
  const addr2 = (customer.address2 || '').trim();

  // If customer has BOTH address 1 and address 2
  if (addr1 && addr2) {
    group.style.display = 'block';

    const text1 = document.getElementById('order-addr-text-1');
    const rider1El = document.getElementById('order-addr-rider-1');
    const text2 = document.getElementById('order-addr-text-2');
    const rider2El = document.getElementById('order-addr-rider-2');

    const rider1Name = (customer.riderId && cachedContacts[customer.riderId])
      ? cachedContacts[customer.riderId].name
      : (customer.riderName || 'No Rider');
    const rider2Name = (customer.riderId2 && cachedContacts[customer.riderId2])
      ? cachedContacts[customer.riderId2].name
      : (customer.riderName2 || 'No Rider');

    if (text1) text1.textContent = addr1;
    if (rider1El) rider1El.textContent = `🛵 Rider: ${rider1Name}`;
    if (text2) text2.textContent = addr2;
    if (rider2El) rider2El.textContent = `🛵 Rider: ${rider2Name}`;

    // Default select Address 1
    selectOrderDeliveryAddress(1);
  } else {
    group.style.display = 'none';
    const hiddenInput = document.getElementById('order-input-selected-address-num');
    if (hiddenInput) hiddenInput.value = '1';
    refreshOrderRiderOptions(customer.riderId || customer.riderId2 || '');
  }
}

function selectOrderDeliveryAddress(num) {
  const hiddenInput = document.getElementById('order-input-selected-address-num');
  if (hiddenInput) hiddenInput.value = String(num);

  const card1 = document.getElementById('order-addr-card-1');
  const card2 = document.getElementById('order-addr-card-2');
  if (card1) card1.classList.toggle('active', num === 1);
  if (card2) card2.classList.toggle('active', num === 2);

  const contactId = document.getElementById('order-input-customer')?.value;
  const customer = contactId ? cachedContacts[contactId] : null;
  if (customer) {
    const assignedRiderId = (num === 2) ? (customer.riderId2 || '') : (customer.riderId || '');
    refreshOrderRiderOptions(assignedRiderId);
  }
}

function refreshOrderRiderOptions(chosenRiderId = '') {
  const selectEl = document.getElementById('order-select-rider');
  if (!selectEl) return;

  const pricing = dbGetPricing();
  const riderFees = pricing.riderFees || {};
  const defRiderFee = (pricing.defaultRiderFee !== undefined && !isNaN(pricing.defaultRiderFee))
    ? parseFloat(pricing.defaultRiderFee)
    : 0;

  const riders = Object.entries(cachedContacts || {})
    .map(([id, c]) => ({ id, ...c }))
    .filter(c => c.isRider === true || c.role === 'rider');

  let optionsHtml = '<option value="">-- No Rider Assigned (RM 0.00) --</option>';
  riders.forEach(r => {
    let fee = defRiderFee;
    if (riderFees[r.id] !== undefined && riderFees[r.id] !== null && !isNaN(riderFees[r.id])) {
      fee = parseFloat(riderFees[r.id]);
    }
    const isSelected = (r.id === chosenRiderId);
    optionsHtml += `<option value="${r.id}" ${isSelected ? 'selected' : ''}>🛵 ${r.name} (${r.phone || 'No phone'}) — Fee: RM ${fee.toFixed(2)}</option>`;
  });

  selectEl.innerHTML = optionsHtml;

  const riderFeeInput = document.getElementById('order-input-rider-fee');
  if (riderFeeInput) {
    if (chosenRiderId) {
      let fee = defRiderFee;
      if (riderFees[chosenRiderId] !== undefined && riderFees[chosenRiderId] !== null && !isNaN(riderFees[chosenRiderId])) {
        fee = parseFloat(riderFees[chosenRiderId]);
      }
      riderFeeInput.value = fee.toFixed(2);
    } else {
      riderFeeInput.value = '0.00';
    }
  }

  updateOrderFormCalculations();
}

function handleOrderRiderSelectChange(selectedRiderId) {
  const pricing = dbGetPricing();
  const riderFees = pricing.riderFees || {};
  const defRiderFee = (pricing.defaultRiderFee !== undefined && !isNaN(pricing.defaultRiderFee))
    ? parseFloat(pricing.defaultRiderFee)
    : 0;

  const riderFeeInput = document.getElementById('order-input-rider-fee');
  if (riderFeeInput) {
    if (selectedRiderId) {
      let fee = defRiderFee;
      if (riderFees[selectedRiderId] !== undefined && riderFees[selectedRiderId] !== null && !isNaN(riderFees[selectedRiderId])) {
        fee = parseFloat(riderFees[selectedRiderId]);
      }
      riderFeeInput.value = fee.toFixed(2);
    } else {
      riderFeeInput.value = '0.00';
    }
  }

  updateOrderFormCalculations();
}

function selectOrderCustomer(customer) {
  document.getElementById('order-input-customer').value = customer.id;
  document.getElementById('order-input-customer-search').value = `${customer.name} (${customer.phone || ''})`;
  document.getElementById('order-customer-dropdown').style.display = 'none';

  const stdC = parseInt(customer.creditStandard) || 0;
  const smlC = parseInt(customer.creditSmall) || 0;
  const rdrC = parseFloat(customer.creditRider) || 0;
  const currentPortion = selectedOrderPortion || 'Standard';
  const hasCreditForPortion = checkCustomerHasCreditForPortion(customer, currentPortion);

  setPackagePaymentOptionEnabled(hasCreditForPortion);

  const infoBadge = document.getElementById('order-customer-selected-info');
  if (infoBadge) {
    infoBadge.style.display = 'block';
    let credText = '';
    if (stdC > 0 || smlC > 0 || rdrC > 0) {
      const parts = [];
      if (stdC > 0 || smlC > 0) parts.push(`💳 ${stdC} Std, ${smlC} Sml`);
      if (rdrC > 0) parts.push(`🛵 RM ${rdrC.toFixed(2)} Rider`);
      credText = ` • <span style="color:#047857; font-weight:800; background:#dcfce7; padding:2px 6px; border-radius:4px;">${parts.join(' • ')}</span>`;
    } else {
      credText = ` • <span style="color:#64748b; font-size:0.75rem;">(No Credit Balance)</span>`;
    }
    infoBadge.innerHTML = `Selected: <strong>${customer.name}</strong> (${customer.phone || 'No phone'})${credText}`;
  }

  // Handle Meal Credit Box in Add Order modal
  const mealCreditBox = document.getElementById('order-meal-credit-box');
  const mealCreditAvail = document.getElementById('order-meal-credit-available');
  const mealCreditCheckbox = document.getElementById('order-checkbox-use-meal-credit');
  if (mealCreditBox && mealCreditAvail && mealCreditCheckbox) {
    if (hasCreditForPortion) {
      mealCreditBox.style.display = 'block';
      const balStr = currentPortion === 'Small' ? `${smlC} Small` : `${stdC} Std`;
      mealCreditAvail.textContent = `Bal: ${balStr}`;
      mealCreditCheckbox.checked = true;
    } else {
      mealCreditBox.style.display = 'none';
      mealCreditCheckbox.checked = false;
    }
  }

  // Handle Rider Credit Box in Add Order modal
  const rdrCreditBox = document.getElementById('order-rider-credit-box');
  const rdrCreditAvail = document.getElementById('order-rider-credit-available');
  const rdrCreditCheckbox = document.getElementById('order-checkbox-use-rider-credit');
  if (rdrCreditBox && rdrCreditAvail && rdrCreditCheckbox) {
    if (rdrC > 0) {
      rdrCreditBox.style.display = 'block';
      rdrCreditAvail.textContent = `Bal: RM ${rdrC.toFixed(2)}`;
      rdrCreditCheckbox.checked = true; // Auto-check if customer has rider credit!
    } else {
      rdrCreditBox.style.display = 'none';
      rdrCreditCheckbox.checked = false;
    }
  }

  // Setup address selector if customer has two addresses
  setupOrderAddressSelector(customer);

  if (customer.remark) {
    document.getElementById('order-input-remark').value = customer.remark;
  }

  updateOrderFormCalculations();
}

// Close Customer Search Dropdown when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('order-input-customer-search');
  const dropdown = document.getElementById('order-customer-dropdown');
  if (dropdown && container && !container.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

let selectedOrderDates = new Set();
let selectedOrderPortion = 'Standard';
let selectedOrderAddons = new Set(); // 'protein', 'vege', 'rice'

function toggleAddon(type) {
  const btn = document.getElementById(`addon-btn-${type}`);
  if (selectedOrderAddons.has(type)) {
    selectedOrderAddons.delete(type);
    if (btn) btn.classList.remove('active');
  } else {
    selectedOrderAddons.add(type);
    if (btn) btn.classList.add('active');
  }
  // Update hidden input
  const hiddenInput = document.getElementById('order-input-addons');
  if (hiddenInput) hiddenInput.value = Array.from(selectedOrderAddons).join(',');
  updateOrderFormCalculations();
}

function refreshAddonPriceTags() {
  const pricing = dbGetPricing();
  const proteinTag = document.getElementById('addon-price-protein');
  const vegeTag = document.getElementById('addon-price-vege');
  const riceTag = document.getElementById('addon-price-rice');
  if (proteinTag) proteinTag.textContent = `+RM${(pricing.addonProtein || 2.00).toFixed(2)}`;
  if (vegeTag) vegeTag.textContent = `+RM${(pricing.addonVege || 1.50).toFixed(2)}`;
  if (riceTag) riceTag.textContent = `+RM${(pricing.addonRice || 1.00).toFixed(2)}`;
}

function selectOrderPortion(portion) {
  selectedOrderPortion = portion;
  const btnStd = document.getElementById('portion-btn-standard');
  const btnSml = document.getElementById('portion-btn-small');
  const input = document.getElementById('order-input-portion');

  if (btnStd) btnStd.classList.toggle('active', portion === 'Standard');
  if (btnSml) btnSml.classList.toggle('active', portion === 'Small');
  if (input) input.value = portion;

  // Re-evaluate customer credit eligibility for newly selected portion
  const contactId = document.getElementById('order-input-customer').value;
  const customer = contactId ? cachedContacts[contactId] : null;

  if (customer) {
    const hasCreditForPortion = checkCustomerHasCreditForPortion(customer, portion);
    const mealCreditBox = document.getElementById('order-meal-credit-box');
    const mealCreditAvail = document.getElementById('order-meal-credit-available');
    const mealCreditCheckbox = document.getElementById('order-checkbox-use-meal-credit');
    if (mealCreditBox && mealCreditAvail && mealCreditCheckbox) {
      if (hasCreditForPortion) {
        mealCreditBox.style.display = 'block';
        const balStr = portion === 'Small' ? `${customer.creditSmall || 0} Small` : `${customer.creditStandard || 0} Std`;
        mealCreditAvail.textContent = `Bal: ${balStr}`;
        mealCreditCheckbox.checked = true;
      } else {
        mealCreditBox.style.display = 'none';
        mealCreditCheckbox.checked = false;
      }
    }
  }

  renderOrderDateCards();
  updateOrderFormCalculations();
}

function selectOrderPaymentStatus(status, triggerCalc = true) {
  const packageCard = document.getElementById('payment-radio-card-package');
  if (status === 'Package' && packageCard && packageCard.classList.contains('disabled')) {
    return;
  }

  const hiddenInput = document.getElementById('order-input-payment');
  if (hiddenInput) hiddenInput.value = status;

  const unpaidCard = document.getElementById('payment-radio-card-unpaid');
  const paidCard = document.getElementById('payment-radio-card-paid');

  if (unpaidCard) unpaidCard.classList.toggle('active', status === 'Unpaid');
  if (paidCard) paidCard.classList.toggle('active', status === 'Paid');
  if (packageCard) packageCard.classList.toggle('active', status === 'Package');

  const unpaidRadio = unpaidCard ? unpaidCard.querySelector('input') : null;
  const paidRadio = paidCard ? paidCard.querySelector('input') : null;
  const packageRadio = packageCard ? packageCard.querySelector('input') : null;
  if (unpaidRadio) unpaidRadio.checked = (status === 'Unpaid');
  if (paidRadio) paidRadio.checked = (status === 'Paid');
  if (packageRadio) packageRadio.checked = (status === 'Package');

  if (triggerCalc) {
    updateOrderFormCalculations();
  }
}

// Render 5 Mon-Fri Meal Date Cards inside Add Order modal (Multi-Select Supported)
function renderOrderDateCards(defaultDateStr = null) {
  const grid = document.getElementById('order-date-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const weekDays = getWeekDays(0);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (defaultDateStr && defaultDateStr >= todayStr) {
    selectedOrderDates.clear();
    selectedOrderDates.add(defaultDateStr);
  }

  weekDays.forEach((d) => {
    const isPast = d.dateStr < todayStr;
    const menuObj = dbGetMenuByDate(d.dateStr);
    const hasMenu = !!(menuObj && menuObj.foodName);
    const foodName = hasMenu ? menuObj.foodName : 'No Menu';
    const imgSrc = (menuObj && menuObj.image) ? menuObj.image : '';

    // Format YYYY-MM-DD to DD/M (e.g. 2026-09-16 -> 16/9)
    const dateParts = d.dateStr.split('-');
    const dayNum = parseInt(dateParts[2], 10);
    const monthNum = parseInt(dateParts[1], 10);
    const dateNumStr = `${dayNum}/${monthNum}`;

    const isSelected = selectedOrderDates.has(d.dateStr);

    const card = document.createElement('div');
    card.className = `date-select-card ${isSelected ? 'active' : ''} ${isPast ? 'disabled' : ''}`;
    card.setAttribute('data-date', d.dateStr);

    let imgHtml = '';
    if (imgSrc) {
      imgHtml = `<img src="${imgSrc}" class="date-select-img" />`;
    } else {
      imgHtml = `<div class="date-select-img" style="display:flex; align-items:center; justify-content:center;">${getSvgIcon('utensils', 'sm')}</div>`;
    }

    card.innerHTML = `
      <div class="date-select-check">✓</div>
      ${imgHtml}
      <div class="date-select-day">${d.day.slice(0, 3)}</div>
      <div class="date-select-date" style="font-weight:800;">${dateNumStr}</div>
      <div class="date-select-food">${foodName}</div>
    `;

    if (!isPast) {
      card.onclick = () => toggleOrderDateCard(d.dateStr, d.day, menuObj);
    } else {
      card.title = 'Past dates cannot be selected';
    }
    grid.appendChild(card);
  });

  updateOrderFormCalculations();
}

function toggleOrderDateCard(dateStr, dayName, menuObj) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (dateStr < todayStr) return; // Prevent selecting past dates

  if (selectedOrderDates.has(dateStr)) {
    selectedOrderDates.delete(dateStr);
  } else {
    selectedOrderDates.add(dateStr);
  }

  document.querySelectorAll('.date-select-card').forEach(card => {
    const dStr = card.getAttribute('data-date');
    card.classList.toggle('active', selectedOrderDates.has(dStr));
  });

  updateOrderFormCalculations();
}

// Quantity Stepper Handler (+ / - buttons)
function changeOrderQuantity(delta) {
  const input = document.getElementById('order-input-quantity');
  if (!input) return;

  let currentVal = parseInt(input.value) || 1;
  currentVal += delta;
  if (currentVal < 1) currentVal = 1;

  input.value = currentVal;
  updateOrderFormCalculations();
}

function openAddOrderModal(preselectedContactId = null) {
  document.getElementById('order-input-customer').value = '';
  document.getElementById('order-input-customer-search').value = '';
  const infoBadge = document.getElementById('order-customer-selected-info');
  if (infoBadge) infoBadge.style.display = 'none';

  const addrGroup = document.getElementById('order-address-selector-group');
  if (addrGroup) addrGroup.style.display = 'none';
  const addrNumInput = document.getElementById('order-input-selected-address-num');
  if (addrNumInput) addrNumInput.value = '1';

  // Reset Meal credit option box
  const mealCreditBox = document.getElementById('order-meal-credit-box');
  const mealCreditCheckbox = document.getElementById('order-checkbox-use-meal-credit');
  if (mealCreditBox) mealCreditBox.style.display = 'none';
  if (mealCreditCheckbox) mealCreditCheckbox.checked = false;

  // Reset portion selector to Standard
  selectedOrderPortion = 'Standard';
  const btnStd = document.getElementById('portion-btn-standard');
  const btnSml = document.getElementById('portion-btn-small');
  if (btnStd) btnStd.classList.add('active');
  if (btnSml) btnSml.classList.remove('active');
  const portionInput = document.getElementById('order-input-portion');
  if (portionInput) portionInput.value = 'Standard';

  // Update current pricing labels in modal
  const pricing = dbGetPricing();
  const stdLbl = document.getElementById('order-lbl-standard-price');
  const smlLbl = document.getElementById('order-lbl-small-price');
  if (stdLbl) stdLbl.textContent = formatRM(pricing.standard);
  if (smlLbl) smlLbl.textContent = formatRM(pricing.small);

  document.getElementById('order-input-quantity').value = 1;
  document.getElementById('order-input-remark').value = '';

  // Reset add-ons
  selectedOrderAddons.clear();
  ['protein', 'vege', 'rice'].forEach(type => {
    const btn = document.getElementById(`addon-btn-${type}`);
    if (btn) btn.classList.remove('active');
  });
  const addonsHidden = document.getElementById('order-input-addons');
  if (addonsHidden) addonsHidden.value = '';

  // Refresh addon price tags
  refreshAddonPriceTags();

  // Reset Rider selection & fee
  refreshOrderRiderOptions('');

  // Reset Rider credit option box
  const rdrCreditBox = document.getElementById('order-rider-credit-box');
  const rdrCreditCheckbox = document.getElementById('order-checkbox-use-rider-credit');
  if (rdrCreditBox) rdrCreditBox.style.display = 'none';
  if (rdrCreditCheckbox) rdrCreditCheckbox.checked = false;

  setPackagePaymentOptionEnabled(false);
  selectOrderPaymentStatus('Unpaid', false);

  if (preselectedContactId && cachedContacts[preselectedContactId]) {
    selectOrderCustomer(cachedContacts[preselectedContactId]);
  }

  // Clear date selection so no date is selected by default
  selectedOrderDates.clear();

  renderOrderDateCards();
  document.getElementById('add-order-modal').classList.add('active');
}

function openAddOrderForCustomer(contactId) {
  if (document.getElementById('customer-profile-modal')) {
    closeCustomerProfileModal();
  }
  openAddOrderModal(contactId);
}

function closeAddOrderModal() {
  document.getElementById('add-order-modal').classList.remove('active');
}

function updateOrderFormCalculations() {
  const quantity = parseInt(document.getElementById('order-input-quantity').value) || 1;
  const datesArr = Array.from(selectedOrderDates);
  const datesCount = datesArr.length;
  const totalMealsCount = datesCount * quantity;

  const contactId = document.getElementById('order-input-customer')?.value;
  const customer = contactId ? cachedContacts[contactId] : null;
  const portion = selectedOrderPortion || 'Standard';

  const mealCreditCheckbox = document.getElementById('order-checkbox-use-meal-credit');
  const hasCreditForPortion = checkCustomerHasCreditForPortion(customer, portion);
  const isUseMealCredit = !!(customer && hasCreditForPortion && mealCreditCheckbox && mealCreditCheckbox.checked);

  const pricing = dbGetPricing();
  const unitPrice = isUseMealCredit ? 0 : (portion === 'Small' ? pricing.small : pricing.standard);

  // Add-ons are ALWAYS charged, even for Package/credit meals
  let addonPerMeal = 0;
  if (selectedOrderAddons.has('protein')) addonPerMeal += parseFloat(pricing.addonProtein) || 2.00;
  if (selectedOrderAddons.has('vege')) addonPerMeal += parseFloat(pricing.addonVege) || 1.50;
  if (selectedOrderAddons.has('rice')) addonPerMeal += parseFloat(pricing.addonRice) || 1.00;

  // Rider Delivery Fee & Credit Calculation
  const riderFeeInput = document.getElementById('order-input-rider-fee');
  const riderFee = riderFeeInput ? (parseFloat(riderFeeInput.value) || 0) : 0;
  const totalRiderFee = riderFee * datesCount;

  const currentRdrCredit = customer ? (parseFloat(customer.creditRider) || 0) : 0;
  const useRiderCreditCheckbox = document.getElementById('order-checkbox-use-rider-credit');
  const isUseRiderCredit = !!(customer && useRiderCreditCheckbox && useRiderCreditCheckbox.checked && currentRdrCredit > 0);

  let riderCoveredByCredit = 0;
  if (isUseRiderCredit) {
    riderCoveredByCredit = Math.min(currentRdrCredit, totalRiderFee);
  }
  const riderPayable = totalRiderFee - riderCoveredByCredit;

  // Food Total
  const foodPerDate = (unitPrice + addonPerMeal) * quantity;
  const foodTotal = foodPerDate * datesCount;

  const total = foodTotal + riderPayable;

  // Dynamic Payment Status Label & Options
  const lblPaymentStatus = document.getElementById('order-lbl-payment-status');
  const hintPaymentStatus = document.getElementById('order-payment-status-hint');
  const hiddenPaymentInput = document.getElementById('order-input-payment');
  let currentPayment = hiddenPaymentInput ? hiddenPaymentInput.value : 'Unpaid';

  if (isUseMealCredit) {
    if (total === 0) {
      // Both meal and rider covered by credit (or free delivery)
      setPackagePaymentOptionEnabled(true);
      selectOrderPaymentStatus('Package', false);
      if (lblPaymentStatus) lblPaymentStatus.textContent = 'Payment Status *';
      if (hintPaymentStatus) {
        hintPaymentStatus.textContent = '✓ Covered by Package Credits';
        hintPaymentStatus.style.color = '#047857';
      }
    } else {
      // Meal covered by credit, but rider fee or add-on is payable in cash!
      // User can choose Paid or Unpaid for the rider fee
      setPackagePaymentOptionEnabled(false); // Disable Package since cash is payable
      if (currentPayment === 'Package') {
        selectOrderPaymentStatus('Unpaid', false);
      }
      if (lblPaymentStatus) {
        if (riderPayable > 0 && foodTotal === 0) {
          lblPaymentStatus.textContent = `Rider Fee Payment (${formatRM(riderPayable)}) *`;
        } else if (riderPayable > 0) {
          lblPaymentStatus.textContent = `Payment Status (${formatRM(total)}) *`;
        } else {
          lblPaymentStatus.textContent = `Payment Status (Add-ons: ${formatRM(total)}) *`;
        }
      }
      if (hintPaymentStatus) {
        hintPaymentStatus.textContent = '🍱 Food in Package • Rider fee payable';
        hintPaymentStatus.style.color = '#0284c7';
      }
    }
  } else {
    // Normal cash order
    setPackagePaymentOptionEnabled(false);
    if (currentPayment === 'Package') {
      selectOrderPaymentStatus('Unpaid', false);
    }
    if (lblPaymentStatus) lblPaymentStatus.textContent = 'Payment Status *';
    if (hintPaymentStatus) {
      hintPaymentStatus.textContent = '';
    }
  }

  // Set hidden input date
  const hiddenDateInput = document.getElementById('order-input-date');
  if (hiddenDateInput) hiddenDateInput.value = datesArr.join(',');

  const titleEl = document.getElementById('order-selected-food-title');
  if (titleEl) {
    const portionTag = portion === 'Small' ? 'Small' : 'Standard';
    if (datesArr.length === 0) {
      titleEl.textContent = 'Please select meal date(s)';
    } else if (datesArr.length === 1) {
      const menuObj = dbGetMenuByDate(datesArr[0]);
      const weekDays = getWeekDays(0);
      const matched = weekDays.find(w => w.dateStr === datesArr[0]);
      const foodTitle = (menuObj && menuObj.foodName) ? menuObj.foodName : 'Daily Healthy Meal';
      titleEl.textContent = `${matched ? matched.day : ''}: ${foodTitle} [${portionTag}]`;
    } else {
      titleEl.textContent = `${datesArr.length} Days [${portionTag}] (${totalMealsCount} Meals Total)`;
    }
  }

  const totalEl = document.getElementById('order-display-totalAmount');
  if (totalEl) {
    const notes = [];
    if (isUseMealCredit) {
      notes.push('Meal: Package');
    } else if (datesCount > 0) {
      notes.push(`Food: RM${foodTotal.toFixed(2)}`);
    }
    if (addonPerMeal > 0) notes.push('Add-ons');

    if (totalRiderFee > 0) {
      if (isUseRiderCredit && riderCoveredByCredit >= totalRiderFee) {
        notes.push('Rider: Covered by Credit');
      } else if (isUseRiderCredit && riderCoveredByCredit > 0) {
        notes.push(`Rider: RM${riderPayable.toFixed(2)} (RM${riderCoveredByCredit.toFixed(2)} from Credit)`);
      } else {
        notes.push(`Rider: RM${totalRiderFee.toFixed(2)}`);
      }
    }

    if (datesCount === 0) {
      totalEl.textContent = 'RM 0.00';
    } else if (notes.length > 0) {
      totalEl.textContent = `${formatRM(total)} (${notes.join(' • ')})`;
    } else {
      totalEl.textContent = formatRM(total);
    }
  }
}

async function saveOrderSubmit(event) {
  event.preventDefault();
  let contactId = document.getElementById('order-input-customer').value;
  const searchInputVal = document.getElementById('order-input-customer-search').value.trim();
  const quantity = parseInt(document.getElementById('order-input-quantity').value) || 1;
  const paymentStatus = document.getElementById('order-input-payment').value || 'Unpaid';
  const remark = document.getElementById('order-input-remark').value.trim();

  // If hidden contactId is empty, try to resolve from the search text or auto-create
  if (!contactId && searchInputVal) {
    const contactsArr = Object.values(cachedContacts || {});
    const matched = contactsArr.find(c => 
      c.name.toLowerCase() === searchInputVal.toLowerCase() ||
      (c.phone && c.phone.includes(searchInputVal)) ||
      `${c.name} (${c.phone || ''})`.toLowerCase().includes(searchInputVal.toLowerCase())
    );

    if (matched) {
      contactId = matched.id;
      selectOrderCustomer(matched);
    } else {
      // Auto-create contact so the order is never lost
      const newContactId = await dbAddContact({
        name: searchInputVal,
        phone: '',
        company: '',
        address: '',
        remark: ''
      });
      contactId = newContactId;
      selectOrderCustomer(cachedContacts[newContactId]);
    }
  }

  if (!contactId) {
    showMaterialToast('Please enter or select a customer name', 'warning');
    document.getElementById('order-input-customer-search').focus();
    return;
  }

  const customer = cachedContacts[contactId] || { name: searchInputVal || 'Customer', phone: '' };

  const selectedDates = Array.from(selectedOrderDates);
  if (selectedDates.length === 0) {
    const weekDays = getWeekDays(0);
    if (weekDays && weekDays.length > 0) {
      selectedDates.push(weekDays[0].dateStr);
    } else {
      showMaterialToast('Please select at least one meal date card', 'warning');
      return;
    }
  }

  const weekDays = getWeekDays(0);
  const portion = selectedOrderPortion || 'Standard';
  const totalMealsToOrder = selectedDates.length * quantity;

  // Check customer's Meal Credit for the SPECIFIC portion size
  let currentStdCredit = parseInt(customer.creditStandard) || 0;
  let currentSmlCredit = parseInt(customer.creditSmall) || 0;

  const mealCreditCheckbox = document.getElementById('order-checkbox-use-meal-credit');
  const isUseMealCredit = !!(mealCreditCheckbox && mealCreditCheckbox.checked);

  let creditDeducted = 0;
  let newStdCredit = currentStdCredit;
  let newSmlCredit = currentSmlCredit;

  if (isUseMealCredit) {
    if (portion === 'Standard') {
      if (currentStdCredit <= 0) {
        showMaterialToast(`Cannot use Package for Standard portion: Customer has 0 Standard credits (Current: 0 Std, ${currentSmlCredit} Small).`, 'warning');
        return;
      }
      creditDeducted = Math.min(currentStdCredit, totalMealsToOrder);
      newStdCredit = currentStdCredit - creditDeducted;
    } else if (portion === 'Small') {
      if (currentSmlCredit <= 0) {
        showMaterialToast(`Cannot use Package for Small portion: Customer has 0 Small credits (Current: ${currentStdCredit} Std, 0 Small).`, 'warning');
        return;
      }
      creditDeducted = Math.min(currentSmlCredit, totalMealsToOrder);
      newSmlCredit = currentSmlCredit - creditDeducted;
    }

    // If credit was deducted, update the contact record in DB and log transaction
    if (creditDeducted > 0) {
      await dbUpdateContact(contactId, {
        creditStandard: newStdCredit,
        creditSmall: newSmlCredit
      });

      if (typeof dbAddCreditLog === 'function') {
        await dbAddCreditLog({
          contactId: contactId,
          customerName: customer.name,
          type: 'consume',
          action: 'Meal Consumed',
          deltaStandard: portion === 'Standard' ? -creditDeducted : 0,
          deltaSmall: portion === 'Small' ? -creditDeducted : 0,
          newStandard: newStdCredit,
          newSmall: newSmlCredit,
          remark: `Used for ${totalMealsToOrder} meal(s) order (${portion})`
        });
      }
    }
  }

  // Determine pricing based on Package / Credit status
  const pricing = dbGetPricing();
  const unitPrice = isUseMealCredit ? 0 : (portion === 'Small' ? pricing.small : pricing.standard);

  // Add-on cost per meal — ALWAYS charged even for Package/credit meals
  const addonsArr = Array.from(selectedOrderAddons);
  let addonPerMeal = 0;
  if (selectedOrderAddons.has('protein')) addonPerMeal += parseFloat(pricing.addonProtein) || 2.00;
  if (selectedOrderAddons.has('vege')) addonPerMeal += parseFloat(pricing.addonVege) || 1.50;
  if (selectedOrderAddons.has('rice')) addonPerMeal += parseFloat(pricing.addonRice) || 1.00;

  // Rider Delivery Fee & Rider Credit Deduction
  const riderFeeInput = document.getElementById('order-input-rider-fee');
  const riderFee = riderFeeInput ? (parseFloat(riderFeeInput.value) || 0) : 0;

  const currentRdrCredit = parseFloat(customer.creditRider) || 0;
  const useRiderCreditCheckbox = document.getElementById('order-checkbox-use-rider-credit');
  const isUseRiderCredit = !!(useRiderCreditCheckbox && useRiderCreditCheckbox.checked && currentRdrCredit > 0);

  const totalRiderFeeForDates = riderFee * selectedDates.length;
  let riderCreditDeducted = 0;
  let newRiderCredit = currentRdrCredit;
  let riderFeePaidByCredit = false;

  if (isUseRiderCredit && totalRiderFeeForDates > 0) {
    riderCreditDeducted = Math.min(currentRdrCredit, totalRiderFeeForDates);
    newRiderCredit = currentRdrCredit - riderCreditDeducted;
    riderFeePaidByCredit = (riderCreditDeducted >= totalRiderFeeForDates);

    // Update customer's rider credit in DB
    await dbUpdateContact(contactId, {
      creditStandard: newStdCredit,
      creditSmall: newSmlCredit,
      creditRider: newRiderCredit
    });

    if (typeof dbAddCreditLog === 'function') {
      await dbAddCreditLog({
        contactId: contactId,
        customerName: customer.name,
        type: 'consume',
        action: 'Rider Fee Consumed',
        deltaStandard: 0,
        deltaSmall: 0,
        deltaRider: -riderCreditDeducted,
        newStandard: newStdCredit,
        newSmall: newSmlCredit,
        newRider: newRiderCredit,
        remark: `Rider fee for ${selectedDates.length} delivery(ies)`
      });
    }
  }

  // Food and Rider amounts calculated separately
  const foodAmount = (unitPrice + addonPerMeal) * quantity;
  const riderPayablePerDate = (riderCreditDeducted >= totalRiderFeeForDates)
    ? 0
    : Math.max(0, riderFee - (riderCreditDeducted / selectedDates.length));
  const totalAmount = foodAmount + riderPayablePerDate;

  // Determine final payment status:
  // If totalAmount is 0 (covered by Package credits), status is 'Package'
  // If totalAmount > 0 (e.g. rider fee payable), respect user's selection: 'Paid' or 'Unpaid'!
  let finalPaymentStatus = paymentStatus;
  if (totalAmount === 0 && (isUseMealCredit || riderFeePaidByCredit)) {
    finalPaymentStatus = 'Package';
  } else {
    finalPaymentStatus = (paymentStatus === 'Paid') ? 'Paid' : 'Unpaid';
  }

  const createdOrderIds = [];

  // Determine delivery address and assigned rider (supports Address 1 vs Address 2)
  let finalAddress = (customer.address || '').trim();
  let finalRiderId = customer.riderId || '';
  let finalRiderName = customer.riderName || ((customer.riderId && cachedContacts[customer.riderId]) ? cachedContacts[customer.riderId].name : '');

  const hasTwoAddresses = customer.address && customer.address2 && customer.address2.trim();
  if (hasTwoAddresses) {
    const selectedNum = document.getElementById('order-input-selected-address-num') ? document.getElementById('order-input-selected-address-num').value : '1';
    if (selectedNum === '2') {
      finalAddress = customer.address2.trim();
      finalRiderId = customer.riderId2 || '';
      finalRiderName = customer.riderName2 || ((customer.riderId2 && cachedContacts[customer.riderId2]) ? cachedContacts[customer.riderId2].name : '');
    } else {
      finalAddress = customer.address ? customer.address.trim() : '';
      finalRiderId = customer.riderId || '';
      finalRiderName = customer.riderName || ((customer.riderId && cachedContacts[customer.riderId]) ? cachedContacts[customer.riderId].name : '');
    }
  } else if (!finalAddress && customer.address2) {
    finalAddress = customer.address2.trim();
    finalRiderId = customer.riderId2 || '';
    finalRiderName = customer.riderName2 || ((customer.riderId2 && cachedContacts[customer.riderId2]) ? cachedContacts[customer.riderId2].name : '');
  }

  // Check if rider is overridden in the order rider selector
  const chosenRiderSelect = document.getElementById('order-select-rider');
  if (chosenRiderSelect && chosenRiderSelect.value) {
    finalRiderId = chosenRiderSelect.value;
    finalRiderName = (cachedContacts[finalRiderId] ? cachedContacts[finalRiderId].name : '') || finalRiderName;
  } else if (chosenRiderSelect && chosenRiderSelect.value === '') {
    finalRiderId = '';
    finalRiderName = '';
  }

  for (const dateStr of selectedDates) {
    const menuObj = dbGetMenuByDate(dateStr);
    const matchedDay = weekDays.find(d => d.dateStr === dateStr);
    const dayName = matchedDay ? matchedDay.day : 'Monday';
    const foodName = (menuObj && menuObj.foodName) ? menuObj.foodName : 'Daily Healthy Meal';

    let finalRemark = remark || customer.remark || '';
    if (isUseMealCredit) {
      const creditNote = `Paid via Meal Credit (${creditDeducted} deducted)`;
      finalRemark = finalRemark ? `${finalRemark} (${creditNote})` : creditNote;
    }
    if (riderFeePaidByCredit) {
      finalRemark = finalRemark ? `${finalRemark} • Rider Paid by Credit` : 'Rider Paid by Credit';
    }

    const orderRecord = {
      contactId: contactId,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      address: finalAddress,
      riderId: finalRiderId,
      riderName: finalRiderName,
      foodAmount: foodAmount,
      foodUnitPrice: unitPrice,
      addonPerMeal: addonPerMeal,
      riderFee: riderFee,
      riderFeePaidByCredit: riderFeePaidByCredit,
      date: dateStr,
      day: dayName,
      menuId: dateStr,
      foodName: foodName,
      portion: portion,
      addons: addonsArr.length > 0 ? addonsArr : [],
      unitPrice: unitPrice,
      quantity: quantity,
      totalAmount: totalAmount,
      paymentStatus: finalPaymentStatus,
      remark: finalRemark
    };

    const newOrdId = await dbAddOrder(orderRecord);
    createdOrderIds.push(newOrdId);
  }

  closeAddOrderModal();
  renderOrders();
  if (typeof renderContacts === 'function') renderContacts();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderKitchen === 'function') renderKitchen();

  if (creditDeducted > 0 || riderCreditDeducted > 0) {
    const msgs = [];
    if (creditDeducted > 0) {
      const remainingCount = portion === 'Standard' ? newStdCredit : newSmlCredit;
      msgs.push(`Deducted ${creditDeducted} ${portion} Meal Credit(s) (Bal: ${remainingCount})`);
    }
    if (riderCreditDeducted > 0) {
      msgs.push(`Deducted RM ${riderCreditDeducted.toFixed(2)} Rider Credit (Bal: RM ${newRiderCredit.toFixed(2)})`);
    }
    showMaterialToast(msgs.join(' • '), 'success');
  }

  // Clean circular checkmark animation
  if (typeof showCleanCheckmark === 'function') {
    showCleanCheckmark('Order Added');
  }
}

