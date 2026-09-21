/* Simplest - Orders Management Controller */

let ordersWeekOffset = 0;
let orderFilterDate = 'All'; // 'All' or specific dateStr e.g. '2026-09-21'
let orderFilterPayment = 'All';
let orderFilterStatus = 'All';

function initOrdersView() {
  renderOrders();
}

function setOrdersWeekOffset(offsetChange) {
  if (offsetChange === 0) ordersWeekOffset = 0;
  else ordersWeekOffset += offsetChange;
  orderFilterDate = 'All';
  renderOrders();
}

function setOrderDateFilter(dateStr) {
  orderFilterDate = dateStr;
  renderOrders();
}

function setOrderFilter(type, value) {
  if (type === 'payment') orderFilterPayment = value;
  if (type === 'status') orderFilterStatus = value;

  const group = type === 'payment' ? 'filter-payment' : 'filter-status';
  document.querySelectorAll(`.${group}`).forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === value);
  });

  renderOrders();
}

function renderOrders() {
  const container = document.getElementById('orders-list-container');
  if (!container) return;

  const weekDays = getWeekDays(ordersWeekOffset);

  // Update Week Title and Date Range
  const weekTitleEl = document.getElementById('orders-week-title');
  const weekRangeEl = document.getElementById('orders-week-range');
  const totalCountEl = document.getElementById('orders-total-weekly-count');

  let labelText = 'This Week Orders';
  if (ordersWeekOffset === -1) labelText = 'Previous Week Orders';
  else if (ordersWeekOffset === 1) labelText = 'Next Week Orders';
  else if (ordersWeekOffset < -1) labelText = `${Math.abs(ordersWeekOffset)} Weeks Ago Orders`;
  else if (ordersWeekOffset > 1) labelText = `In ${ordersWeekOffset} Weeks Orders`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${weekDays[0].formatted} — ${weekDays[4].formatted}`;

  // Render Day + Date Filter Pills dynamically
  const pillsContainer = document.getElementById('order-day-filter-pills');
  if (pillsContainer) {
    let pillsHtml = `<button class="filter-pill ${orderFilterDate === 'All' ? 'active' : ''}" onclick="setOrderDateFilter('All')">All Days</button>`;
    weekDays.forEach(d => {
      const isSelected = orderFilterDate === d.dateStr;
      pillsHtml += `<button class="filter-pill ${isSelected ? 'active' : ''}" onclick="setOrderDateFilter('${d.dateStr}')">${d.day.slice(0, 3)} (${d.formatted})</button>`;
    });
    pillsContainer.innerHTML = pillsHtml;
  }

  // Filter Orders
  const weekDateSet = new Set(weekDays.map(d => d.dateStr));
  const ordersArr = Object.values(cachedOrders || {}).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Week-level orders (for counting)
  const weekOrders = ordersArr.filter(ord => weekDateSet.has(ord.date) && ord.orderStatus !== 'Cancelled');
  const weekMealsCount = weekOrders.reduce((sum, ord) => sum + (parseInt(ord.quantity) || 0), 0);

  if (totalCountEl) {
    totalCountEl.textContent = `${weekOrders.length} Orders (${weekMealsCount} Meals)`;
  }

  const filtered = ordersArr.filter(ord => {
    // 1. Week & Date filter
    if (!weekDateSet.has(ord.date)) return false;
    if (orderFilterDate !== 'All' && ord.date !== orderFilterDate) return false;

    // 2. Payment filter
    if (orderFilterPayment !== 'All' && ord.paymentStatus !== orderFilterPayment) return false;

    // 3. Status filter
    if (orderFilterStatus !== 'All' && ord.orderStatus !== orderFilterStatus) return false;

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="display:flex; justify-content:center; margin-bottom:0.5rem;">${getSvgIcon('orders', 'lg')}</div>
        <div style="font-weight:700; font-size:0.9rem;">No orders found</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">Try adjusting your date or status filters</div>
      </div>
    `;
    return;
  }

  // Desktop Table HTML
  let tableRowsHtml = '';
  // Mobile Cards HTML
  let mobileCardsHtml = '';

  filtered.forEach(ord => {
    const isPaid = ord.paymentStatus === 'Paid';
    const waLink = createWhatsAppOrderLink(
      ord.customerPhone,
      ord.customerName,
      ord.day,
      ord.date,
      ord.foodName,
      ord.quantity,
      ord.totalAmount
    );

    let statusBadgeClass = 'badge-confirmed';
    if (ord.orderStatus === 'Pending') statusBadgeClass = 'badge-pending';
    if (ord.orderStatus === 'Cancelled') statusBadgeClass = 'badge-cancelled';

    // Build Table Row (Desktop)
    tableRowsHtml += `
      <tr>
        <td style="font-weight: 700;">${ord.customerName}</td>
        <td style="color: var(--text-muted);">${ord.day.slice(0, 3)} (${formatDateReadable(ord.date)})</td>
        <td>
          <span style="font-weight: 700;">${ord.foodName}</span>
          <span style="color: var(--text-muted);">× ${ord.quantity}</span>
        </td>
        <td style="font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</td>
        <td>
          <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
            ${isPaid ? 'Paid' : 'Unpaid'}
          </button>
        </td>
        <td>
          <button class="badge ${statusBadgeClass}" style="cursor: pointer; border: none;" onclick="toggleOrderStatusAction('${ord.orderId}', '${ord.orderStatus}')">
            ${ord.orderStatus}
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

    // Build Card Item (Mobile)
    mobileCardsHtml += `
      <div class="mobile-data-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
          <span style="font-size: 1rem; font-weight: 800;">${ord.customerName}</span>
          <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          ${ord.day}, ${formatDateReadable(ord.date)} • 🥗 ${ord.foodName} × ${ord.quantity}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; pt-2; border-top: 1px dashed var(--border-color);">
          <div style="display: flex; gap: 0.35rem;">
            <button class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="cursor: pointer; border: none;" onclick="togglePaymentStatusAction('${ord.orderId}', '${ord.paymentStatus}')">
              ${isPaid ? 'Paid' : 'Unpaid'}
            </button>
            <button class="badge ${statusBadgeClass}" style="cursor: pointer; border: none;" onclick="toggleOrderStatusAction('${ord.orderId}', '${ord.orderStatus}')">
              ${ord.orderStatus}
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
            <th>Order Status</th>
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
}

async function toggleOrderStatusAction(orderId, currentStatus) {
  let nextStatus = 'Confirmed';
  if (currentStatus === 'Confirmed') nextStatus = 'Pending';
  else if (currentStatus === 'Pending') nextStatus = 'Cancelled';
  else if (currentStatus === 'Cancelled') nextStatus = 'Confirmed';

  await dbUpdateOrderStatus(orderId, null, nextStatus);
  renderOrders();
}

async function deleteOrderAction(orderId) {
  if (confirm('Are you sure you want to delete this order?')) {
    await dbDeleteOrder(orderId);
    renderOrders();
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
      ${c.company ? `<span class="badge badge-confirmed" style="font-size:0.65rem;">${c.company}</span>` : ''}
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
    infoBadge.textContent = `Selected: ${customer.name} • ${customer.phone || 'No phone'} ${customer.company ? '• ' + customer.company : ''}`;
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

// Render 5 Mon-Fri Meal Date Cards inside Add Order modal (Multi-Select Supported)
function renderOrderDateCards(defaultDateStr = null) {
  const grid = document.getElementById('order-date-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const weekDays = getWeekDays(ordersWeekOffset || 0);

  selectedOrderDates.clear();
  const dateToSelect = defaultDateStr || weekDays[0].dateStr;
  selectedOrderDates.add(dateToSelect);

  weekDays.forEach((d) => {
    const menuObj = dbGetMenuByDate(d.dateStr);
    const hasMenu = !!(menuObj && menuObj.foodName);
    const foodName = hasMenu ? menuObj.foodName : 'No Menu';
    const priceStr = hasMenu ? formatRM(menuObj.price) : 'RM --';
    const imgSrc = (menuObj && menuObj.image) ? menuObj.image : '';

    const isSelected = selectedOrderDates.has(d.dateStr);

    const card = document.createElement('div');
    card.className = `date-select-card ${isSelected ? 'active' : ''}`;
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
      <div class="date-select-date">${d.formatted}</div>
      <div class="date-select-food">${foodName}</div>
      <div class="date-select-price">${priceStr}</div>
    `;

    card.onclick = () => toggleOrderDateCard(d.dateStr, d.day, menuObj);
    grid.appendChild(card);
  });

  updateOrderFormCalculations();
}

function toggleOrderDateCard(dateStr, dayName, menuObj) {
  if (selectedOrderDates.has(dateStr)) {
    // Only unselect if at least 1 date remains selected
    if (selectedOrderDates.size > 1) {
      selectedOrderDates.delete(dateStr);
    }
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

  document.getElementById('order-input-quantity').value = 1;
  document.getElementById('order-input-payment').value = 'Unpaid';
  document.getElementById('order-input-status').value = 'Confirmed';
  document.getElementById('order-input-remark').value = '';

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

  let combinedUnitPriceSum = 0;
  datesArr.forEach(dStr => {
    const menuObj = dbGetMenuByDate(dStr);
    if (menuObj && menuObj.price) {
      combinedUnitPriceSum += parseFloat(menuObj.price) || 0;
    }
  });

  const total = combinedUnitPriceSum * quantity;
  const totalMealsCount = datesArr.length * quantity;

  // Set hidden input for HTML5 form validation
  document.getElementById('order-input-date').value = datesArr.join(',');

  const titleEl = document.getElementById('order-selected-food-title');
  if (titleEl) {
    if (datesArr.length === 1) {
      const menuObj = dbGetMenuByDate(datesArr[0]);
      const weekDays = getWeekDays(ordersWeekOffset || 0);
      const matched = weekDays.find(w => w.dateStr === datesArr[0]);
      titleEl.textContent = `${matched ? matched.day : ''}: ${menuObj ? menuObj.foodName : 'No Menu'}`;
    } else {
      titleEl.textContent = `${datesArr.length} Days Selected (${totalMealsCount} Meals Total)`;
    }
  }

  const totalEl = document.getElementById('order-display-totalAmount');
  if (totalEl) totalEl.textContent = formatRM(total);
}

async function saveOrderSubmit(event) {
  event.preventDefault();
  const contactId = document.getElementById('order-input-customer').value;
  const quantity = parseInt(document.getElementById('order-input-quantity').value) || 1;
  const paymentStatus = document.getElementById('order-input-payment').value;
  const orderStatus = document.getElementById('order-input-status').value;
  const remark = document.getElementById('order-input-remark').value.trim();

  const selectedDates = Array.from(selectedOrderDates);

  if (!contactId) {
    alert('Please select or search a valid customer');
    return;
  }

  const customer = cachedContacts[contactId];
  if (!customer) {
    alert('Invalid customer selected');
    return;
  }

  if (selectedDates.length === 0) {
    alert('Please select at least one meal date card');
    return;
  }

  const weekDays = getWeekDays(ordersWeekOffset || 0);

  // Batch create order records for each selected date card
  for (const dateStr of selectedDates) {
    const menuObj = dbGetMenuByDate(dateStr);
    if (!menuObj) continue;

    const matchedDay = weekDays.find(d => d.dateStr === dateStr);
    const dayName = matchedDay ? matchedDay.day : 'Monday';

    const unitPrice = parseFloat(menuObj.price) || 0;
    const totalAmount = unitPrice * quantity;

    const orderRecord = {
      contactId: contactId,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      date: dateStr,
      day: dayName,
      menuId: dateStr,
      foodName: menuObj.foodName,
      unitPrice: unitPrice,
      quantity: quantity,
      totalAmount: totalAmount,
      paymentStatus: paymentStatus,
      orderStatus: orderStatus,
      remark: remark || customer.remark || ''
    };

    await dbAddOrder(orderRecord);
  }

  closeAddOrderModal();
  renderOrders();
}
