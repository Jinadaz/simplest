/* Simplest - Orders Management Controller */

let orderViewScope = window.innerWidth >= 768 ? 'month' : 'day'; // Default to 'month' on desktop, 'day' on mobile
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
    const paidOrders = monthOrders.filter(ord => ord.paymentStatus === 'Paid');
    const unpaidOrders = monthOrders.filter(ord => ord.paymentStatus !== 'Paid');
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
      const address = (contact && contact.address) ? contact.address : (ord.customerAddress || '');
      const riderName = (contact && contact.riderId && cachedContacts[contact.riderId]) ? cachedContacts[contact.riderId].name : (contact && contact.riderName ? contact.riderName : '');
      const isDispatched = ord.dispatched === true;

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
          <td style="font-weight: 800; color: var(--primary-dark); font-size: 0.95rem;">${formatRM(ord.totalAmount)}</td>
          <td>
            <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')" title="Click to toggle payment status">
              ${isPaid ? 'Paid' : 'Unpaid'}
            </button>
          </td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.2rem;">
              <span style="font-size: 0.78rem; font-weight: 700; color: ${riderName ? 'var(--primary-dark)' : 'var(--text-muted)'};">
                ${riderName ? `🛵 ${riderName}` : '—'}
              </span>
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
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
            <div>
              <span style="font-size: 1rem; font-weight: 800;">${ord.customerName}</span>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDateReadable(ord.date)} (${ord.day})</div>
            </div>
            <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
            🥗 ${ord.foodName}
            <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">${portion === 'Small' ? 'Small' : 'Standard'}</span>
            × ${ord.quantity}
            ${riderName ? ` • 🛵 ${riderName}` : ''}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
                ${isPaid ? 'Paid' : 'Unpaid'}
              </button>
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
              <th>Total Amount</th>
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
    const address = (contact && contact.address) ? contact.address : (ord.customerAddress || '');
    const riderName = (contact && contact.riderId && cachedContacts[contact.riderId]) ? cachedContacts[contact.riderId].name : (contact && contact.riderName ? contact.riderName : '');
    const isDispatched = ord.dispatched === true;

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
        <td style="font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</td>
        <td>
          <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
            ${isPaid ? 'Paid' : 'Unpaid'}
          </button>
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
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="font-size: 1rem; font-weight: 800;">${ord.customerName}</span>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          ${ord.day}, ${formatDateReadable(ord.date)} • 🥗 ${ord.foodName}
          <span class="portion-badge ${portion === 'Small' ? 'portion-small' : 'portion-standard'}">${portion === 'Small' ? 'Small' : 'Standard'}</span>
          × ${ord.quantity}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
          <div style="display: flex; gap: 0.35rem;">
            <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
              ${isPaid ? 'Paid' : 'Unpaid'}
            </button>
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
            <th>Total Amount</th>
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

async function togglePaymentStatusAction(orderId, currentStatus) {
  const nextStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
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
    item.innerHTML = `
      <div>
        <strong>${c.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${c.phone || 'No phone'})</span>
      </div>
    `;
    item.onclick = () => selectOrderCustomer(c);
    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

function selectOrderCustomer(customer) {
  document.getElementById('order-input-customer').value = customer.id;
  document.getElementById('order-input-customer-search').value = `${customer.name} (${customer.phone || ''})`;
  document.getElementById('order-customer-dropdown').style.display = 'none';

  const infoBadge = document.getElementById('order-customer-selected-info');
  if (infoBadge) {
    infoBadge.style.display = 'block';
    infoBadge.textContent = `Selected: ${customer.name} • ${customer.phone || 'No phone'}`;
  }

  if (customer.remark) {
    document.getElementById('order-input-remark').value = customer.remark;
  }
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

function selectOrderPortion(portion) {
  selectedOrderPortion = portion;
  const btnStd = document.getElementById('portion-btn-standard');
  const btnSml = document.getElementById('portion-btn-small');
  const input = document.getElementById('order-input-portion');

  if (btnStd) btnStd.classList.toggle('active', portion === 'Standard');
  if (btnSml) btnSml.classList.toggle('active', portion === 'Small');
  if (input) input.value = portion;

  renderOrderDateCards();
  updateOrderFormCalculations();
}

function selectOrderPaymentStatus(status) {
  const hiddenInput = document.getElementById('order-input-payment');
  if (hiddenInput) hiddenInput.value = status;

  const unpaidCard = document.getElementById('payment-radio-card-unpaid');
  const paidCard = document.getElementById('payment-radio-card-paid');

  if (unpaidCard) unpaidCard.classList.toggle('active', status === 'Unpaid');
  if (paidCard) paidCard.classList.toggle('active', status === 'Paid');

  const unpaidRadio = unpaidCard ? unpaidCard.querySelector('input') : null;
  const paidRadio = paidCard ? paidCard.querySelector('input') : null;
  if (unpaidRadio) unpaidRadio.checked = (status === 'Unpaid');
  if (paidRadio) paidRadio.checked = (status === 'Paid');
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

  if (preselectedContactId && cachedContacts[preselectedContactId]) {
    selectOrderCustomer(cachedContacts[preselectedContactId]);
  }

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

  // Reset payment status to Unpaid
  selectOrderPaymentStatus('Unpaid');

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
  const pricing = dbGetPricing();
  const unitPrice = selectedOrderPortion === 'Small' ? pricing.small : pricing.standard;

  const datesCount = datesArr.length;
  const total = unitPrice * datesCount * quantity;
  const totalMealsCount = datesCount * quantity;

  // Set hidden input
  const hiddenDateInput = document.getElementById('order-input-date');
  if (hiddenDateInput) hiddenDateInput.value = datesArr.join(',');

  const titleEl = document.getElementById('order-selected-food-title');
  if (titleEl) {
    const portionTag = selectedOrderPortion === 'Small' ? 'Small' : 'Standard';
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
  if (totalEl) totalEl.textContent = formatRM(total);
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

  // Batch create order records for each selected date card
  const pricing = dbGetPricing();
  const portion = selectedOrderPortion || 'Standard';
  const unitPrice = portion === 'Small' ? pricing.small : pricing.standard;
  const totalAmount = unitPrice * quantity;

  const createdOrderIds = [];

  for (const dateStr of selectedDates) {
    const menuObj = dbGetMenuByDate(dateStr);
    const matchedDay = weekDays.find(d => d.dateStr === dateStr);
    const dayName = matchedDay ? matchedDay.day : 'Monday';
    const foodName = (menuObj && menuObj.foodName) ? menuObj.foodName : 'Daily Healthy Meal';

    const orderRecord = {
      contactId: contactId,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      date: dateStr,
      day: dayName,
      menuId: dateStr,
      foodName: foodName,
      portion: portion,
      unitPrice: unitPrice,
      quantity: quantity,
      totalAmount: totalAmount,
      paymentStatus: paymentStatus,
      remark: remark || customer.remark || ''
    };

    const newOrdId = await dbAddOrder(orderRecord);
    createdOrderIds.push(newOrdId);
  }

  closeAddOrderModal();
  renderOrders();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderKitchen === 'function') renderKitchen();

  // Clean circular checkmark animation
  if (typeof showCleanCheckmark === 'function') {
    showCleanCheckmark('Order Added');
  }
}

