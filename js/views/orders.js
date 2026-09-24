/* Simplest - Orders Management Controller */

let ordersWeekOffset = 0;
let orderFilterDate = 'All'; // 'All' or specific dateStr e.g. '2026-09-21'
let orderFilterPayment = 'All';

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
  if (type === 'payment') {
    orderFilterPayment = value;
    document.querySelectorAll('.filter-payment').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-val') === value);
    });
  }
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
  const weekOrders = ordersArr.filter(ord => weekDateSet.has(ord.date));
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

    // Build Table Row (Desktop)
    tableRowsHtml += `
      <tr data-order-id="${ord.orderId}">
        <td style="font-weight: 700;">${ord.customerName}</td>
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

    // Build Card Item (Mobile)
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

// Render 5 Mon-Fri Meal Date Cards inside Add Order modal (Multi-Select Supported)
function renderOrderDateCards(defaultDateStr = null) {
  const grid = document.getElementById('order-date-cards-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const weekDays = getWeekDays(ordersWeekOffset || 0);

  if (defaultDateStr) {
    selectedOrderDates.clear();
    selectedOrderDates.add(defaultDateStr);
  } else if (selectedOrderDates.size === 0) {
    selectedOrderDates.add(weekDays[0].dateStr);
  }

  const pricing = dbGetPricing();
  const currentUnitPrice = selectedOrderPortion === 'Small' ? pricing.small : pricing.standard;

  weekDays.forEach((d) => {
    const menuObj = dbGetMenuByDate(d.dateStr);
    const hasMenu = !!(menuObj && menuObj.foodName);
    const foodName = hasMenu ? menuObj.foodName : 'No Menu';
    const priceStr = hasMenu ? formatRM(currentUnitPrice) : 'RM --';
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
  document.getElementById('order-input-payment').value = 'Unpaid';
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
    if (datesArr.length === 1) {
      const menuObj = dbGetMenuByDate(datesArr[0]);
      const weekDays = getWeekDays(ordersWeekOffset || 0);
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
    alert('Please enter or select a customer name');
    document.getElementById('order-input-customer-search').focus();
    return;
  }

  const customer = cachedContacts[contactId] || { name: searchInputVal || 'Customer', phone: '' };

  const selectedDates = Array.from(selectedOrderDates);
  if (selectedDates.length === 0) {
    const weekDays = getWeekDays(ordersWeekOffset || 0);
    if (weekDays && weekDays.length > 0) {
      selectedDates.push(weekDays[0].dateStr);
    } else {
      alert('Please select at least one meal date card');
      return;
    }
  }

  const weekDays = getWeekDays(ordersWeekOffset || 0);

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

