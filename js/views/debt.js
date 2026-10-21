/* Simplest - Customer Debt Management Controller */

let debtSearchQuery = '';
let debtStatusFilter = 'debt_only'; // 'debt_only' | 'all'
let debtTypeFilter = 'all'; // 'all' | 'meal_debt' | 'rider_debt'
let debtDateFilter = 'all'; // 'all' | 'this_month' | 'last_month' | 'custom'
let debtCustomStartDate = '';
let debtCustomEndDate = '';
let debtSortBy = 'debt_desc'; // 'debt_desc' | 'debt_asc' | 'meal_desc' | 'rider_desc' | 'name_asc'
let debtModalContactId = null;
let debtHistoryActiveTab = 'orders'; // 'orders' | 'payments'
let isSavingDebtPayment = false;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Initialize / Render Customer Debt View
 */
function initCustomerDebtView() {
  if (typeof ensureAllOrdersLoaded === 'function') {
    ensureAllOrdersLoaded();
  }
  renderCustomerDebtView();
}

/**
 * Calculate Debt Breakdown for a Single Customer
 */
function calculateCustomerDebt(contactId, options = {}) {
  const contact = cachedContacts[contactId];
  if (!contact) return null;

  // Filter orders for this customer (ignoring credit package sales)
  const allOrders = Object.values(cachedOrders || {}).filter(ord => {
    if (!ord) return false;
    if (ord.isCreditPackageSale === true) return false;
    if (ord.contactId) return ord.contactId === contactId;
    if (contact.phone && ord.customerPhone === contact.phone) return true;
    return false;
  });

  // Date filtering if applicable
  const orders = allOrders.filter(ord => {
    if (options.startDate && ord.date && ord.date < options.startDate) return false;
    if (options.endDate && ord.date && ord.date > options.endDate) return false;
    return true;
  });

  // Sort chronological for FIFO repayment allocation
  orders.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || 0) - (b.createdAt || 0));

  let totalMealCost = 0;
  let totalRiderCost = 0;
  let totalDirectMealPaid = 0;
  let totalDirectRiderPaid = 0;

  const orderRows = orders.map(ord => {
    // 1. Meal Cost
    const isPackageMeal = (ord.foodAmount === 0 && (ord.foodUnitPrice === 0 || ord.paymentStatus === 'Package'));
    let mealCost = 0;
    if (!isPackageMeal) {
      if (ord.foodAmount !== undefined && ord.foodAmount !== null) {
        mealCost = parseFloat(ord.foodAmount) || 0;
      } else if (ord.unitPrice !== undefined) {
        const u = parseFloat(ord.unitPrice) || 0;
        const add = parseFloat(ord.addonPerMeal) || 0;
        const q = parseInt(ord.quantity) || 1;
        mealCost = (u + add) * q;
      } else {
        const tot = parseFloat(ord.totalAmount) || 0;
        const rf = parseFloat(ord.riderFee) || 0;
        mealCost = Math.max(0, tot - rf);
      }
    }
    mealCost = Math.max(0, mealCost);

    // 2. Rider Cost
    const isSelfCollect = ord.isSelfCollect || (ord.riderName === 'Self Collect') || (ord.riderId === 'self-collect');
    const riderFee = isSelfCollect ? 0 : (parseFloat(ord.riderFee) || 0);
    const riderCost = Math.max(0, riderFee);

    // 3. Paid at Order Time
    let mealPaidDirect = 0;
    let riderPaidDirect = 0;

    if (ord.paymentStatus === 'Paid') {
      mealPaidDirect = mealCost;
      riderPaidDirect = riderCost;
    } else if (ord.paymentStatus === 'Package') {
      mealPaidDirect = mealCost;
      riderPaidDirect = ord.riderFeePaidByCredit ? riderCost : 0;
    } else {
      // Unpaid
      if (isPackageMeal) {
        mealPaidDirect = mealCost;
      }
      if (ord.riderFeePaidByCredit) {
        riderPaidDirect = riderCost;
      }
    }

    const initialMealDebt = Math.max(0, mealCost - mealPaidDirect);
    const initialRiderDebt = Math.max(0, riderCost - riderPaidDirect);

    totalMealCost += mealCost;
    totalRiderCost += riderCost;
    totalDirectMealPaid += mealPaidDirect;
    totalDirectRiderPaid += riderPaidDirect;

    return {
      orderId: ord.orderId || ord.id,
      date: ord.date || '--',
      day: ord.day || '',
      foodName: ord.foodName || 'Daily Meal',
      quantity: ord.quantity || 1,
      portion: ord.portion || 'Standard',
      items: ord.items || [],
      riderName: ord.riderName || 'No Rider',
      isSelfCollect,
      paymentStatus: ord.paymentStatus || 'Unpaid',
      mealCost,
      riderCost,
      totalCost: mealCost + riderCost,
      mealPaidDirect,
      riderPaidDirect,
      initialMealDebt,
      initialRiderDebt,
      allocatedMealRepay: 0,
      allocatedRiderRepay: 0,
      finalMealPaid: mealPaidDirect,
      finalRiderPaid: riderPaidDirect,
      outstandingMeal: initialMealDebt,
      outstandingRider: initialRiderDebt,
      totalOutstanding: initialMealDebt + initialRiderDebt,
      rawOrder: ord
    };
  });

  // Get debt payments for this contact
  const allPayments = Object.values(cachedDebtPayments || {}).filter(p => p && p.contactId === contactId);
  allPayments.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  let totalRepaidMeal = 0;
  let totalRepaidRider = 0;
  allPayments.forEach(p => {
    totalRepaidMeal += parseFloat(p.mealAmount) || 0;
    totalRepaidRider += parseFloat(p.riderAmount) || 0;
  });

  // Allocate customer repayments to individual orders in FIFO sequence
  let mealPool = totalRepaidMeal;
  let riderPool = totalRepaidRider;

  orderRows.forEach(row => {
    if (mealPool > 0 && row.initialMealDebt > 0) {
      const alloc = Math.min(mealPool, row.initialMealDebt);
      row.allocatedMealRepay = alloc;
      row.finalMealPaid = row.mealPaidDirect + alloc;
      row.outstandingMeal = Math.max(0, row.mealCost - row.finalMealPaid);
      mealPool -= alloc;
    }
    if (riderPool > 0 && row.initialRiderDebt > 0) {
      const alloc = Math.min(riderPool, row.initialRiderDebt);
      row.allocatedRiderRepay = alloc;
      row.finalRiderPaid = row.riderPaidDirect + alloc;
      row.outstandingRider = Math.max(0, row.riderCost - row.finalRiderPaid);
      riderPool -= alloc;
    }
    row.totalOutstanding = row.outstandingMeal + row.outstandingRider;
  });

  const totalMealPaid = totalDirectMealPaid + totalRepaidMeal;
  const totalRiderPaid = totalDirectRiderPaid + totalRepaidRider;
  const outstandingMeal = Math.max(0, totalMealCost - totalMealPaid);
  const outstandingRider = Math.max(0, totalRiderCost - totalRiderPaid);
  const totalOutstanding = outstandingMeal + outstandingRider;

  return {
    contactId,
    id: contact.id || contactId,
    name: contact.name,
    phone: contact.phone || '--',
    address: contact.address || '--',
    totalMealCost,
    totalRiderCost,
    totalCost: totalMealCost + totalRiderCost,
    mealPaid: totalMealPaid,
    riderPaid: totalRiderPaid,
    totalPaid: totalMealPaid + totalRiderPaid,
    outstandingMeal,
    outstandingRider,
    totalOutstanding,
    orderRows: [...orderRows].reverse(), // reverse for newest first in view
    payments: [...allPayments].reverse(), // reverse for newest first in view
    hasDebt: totalOutstanding > 0.005
  };
}

/**
 * Get Date Range Bounds based on debtDateFilter
 */
function getDebtDateRangeBounds() {
  const now = new Date();
  if (debtDateFilter === 'this_month') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { startDate: `${y}-${m}-01`, endDate: `${y}-${m}-31` };
  } else if (debtDateFilter === 'last_month') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, '0');
    return { startDate: `${y}-${m}-01`, endDate: `${y}-${m}-31` };
  } else if (debtDateFilter === 'custom') {
    return {
      startDate: debtCustomStartDate || '',
      endDate: debtCustomEndDate || ''
    };
  }
  return { startDate: '', endDate: '' };
}

/**
 * Render Customer Debt Management View
 */
function renderCustomerDebtView() {
  const container = document.getElementById('debt-table-container');
  if (!container) return;

  const dateBounds = getDebtDateRangeBounds();

  // Calculate debt for all non-rider customers
  const contactsArr = Object.entries(cachedContacts || {})
    .filter(([id, c]) => !(c.isRider === true || c.role === 'rider'))
    .map(([id]) => calculateCustomerDebt(id, dateBounds))
    .filter(Boolean);

  // Overall Global KPI Totals (unfiltered by search/status for absolute truth)
  let kpiTotalOutstanding = 0;
  let kpiMealOutstanding = 0;
  let kpiRiderOutstanding = 0;
  let kpiCustomersInDebtCount = 0;

  contactsArr.forEach(c => {
    kpiTotalOutstanding += c.totalOutstanding;
    kpiMealOutstanding += c.outstandingMeal;
    kpiRiderOutstanding += c.outstandingRider;
    if (c.hasDebt) kpiCustomersInDebtCount++;
  });

  // Update Top Metric KPI Cards
  const elTotalOut = document.getElementById('debt-kpi-total-outstanding');
  const elMealOut = document.getElementById('debt-kpi-meal-outstanding');
  const elRiderOut = document.getElementById('debt-kpi-rider-outstanding');
  const elCountOut = document.getElementById('debt-kpi-customers-count');

  if (elTotalOut) elTotalOut.textContent = formatRM(kpiTotalOutstanding);
  if (elMealOut) elMealOut.textContent = formatRM(kpiMealOutstanding);
  if (elRiderOut) elRiderOut.textContent = formatRM(kpiRiderOutstanding);
  if (elCountOut) elCountOut.textContent = `${kpiCustomersInDebtCount} ${kpiCustomersInDebtCount === 1 ? 'Customer' : 'Customers'}`;

  // Filter contacts by Status, Category, and Search Query
  let filtered = contactsArr.filter(c => {
    // 1. Search Query
    if (debtSearchQuery) {
      const q = debtSearchQuery.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      const matchId = (c.id || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }

    // 2. Debt Status Filter
    if (debtStatusFilter === 'debt_only' && !c.hasDebt) {
      return false;
    }

    // 3. Category Filter
    if (debtTypeFilter === 'meal_debt' && c.outstandingMeal <= 0.005) {
      return false;
    }
    if (debtTypeFilter === 'rider_debt' && c.outstandingRider <= 0.005) {
      return false;
    }

    return true;
  });

  // Sort contacts
  filtered.sort((a, b) => {
    if (debtSortBy === 'debt_desc') return b.totalOutstanding - a.totalOutstanding;
    if (debtSortBy === 'debt_asc') return a.totalOutstanding - b.totalOutstanding;
    if (debtSortBy === 'meal_desc') return b.outstandingMeal - a.outstandingMeal;
    if (debtSortBy === 'rider_desc') return b.outstandingRider - a.outstandingRider;
    if (debtSortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    return b.totalOutstanding - a.totalOutstanding;
  });

  // Empty State
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 3rem 1rem; text-align: center;">
        <div class="empty-state-icon" style="display: flex; justify-content: center; margin-bottom: 0.75rem;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #ecfdf5; display: flex; align-items: center; justify-content: center; font-size: 1.75rem;">🎉</div>
        </div>
        <div style="font-weight: 800; font-size: 1.05rem; color: var(--text-main);">No Customers with Outstanding Debt</div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.35rem; max-width: 420px; margin-left: auto; margin-right: auto;">
          ${debtStatusFilter === 'debt_only' 
            ? 'All customers are currently settled! Click "All Customers" above to inspect past history.' 
            : 'No customer records match your active search or filters.'}
        </div>
      </div>
    `;
    return;
  }

  // Render Desktop Table & Mobile Cards
  let tableRowsHtml = '';
  let mobileCardsHtml = '';

  filtered.forEach(c => {
    const isIndebt = c.hasDebt;
    const debtBadge = isIndebt
      ? `<span class="badge" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 800; font-size: 0.725rem; padding: 2px 7px;">In Debt</span>`
      : `<span class="badge" style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-weight: 800; font-size: 0.725rem; padding: 2px 7px;">✓ Settled</span>`;

    const mealDebtHtml = c.outstandingMeal > 0.005
      ? `<span style="color: #dc2626; font-weight: 800;">${formatRM(c.outstandingMeal)}</span>`
      : `<span style="color: #10b981; font-weight: 700;">RM 0.00</span>`;

    const riderDebtHtml = c.outstandingRider > 0.005
      ? `<span style="color: #dc2626; font-weight: 800;">${formatRM(c.outstandingRider)}</span>`
      : `<span style="color: #10b981; font-weight: 700;">RM 0.00</span>`;

    // Row HTML for Desktop Table
    tableRowsHtml += `
      <tr class="${isIndebt ? 'debt-row-highlight' : ''}" style="transition: background 0.15s ease;">
        <td style="padding: 0.85rem 1rem;">
          <div style="font-weight: 800; font-size: 0.92rem; color: var(--text-main);">${escapeHtml(c.name)}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
            📞 ${escapeHtml(c.phone)} <span style="opacity: 0.4;">|</span> ID: <span style="font-family: monospace; font-size: 0.74rem;">${c.id}</span>
          </div>
        </td>
        <td style="padding: 0.85rem 0.75rem; text-align: right;">
          <div style="font-size: 0.82rem; color: var(--text-muted);">${formatRM(c.totalMealCost)}</div>
          <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">Paid: ${formatRM(c.mealPaid)}</div>
        </td>
        <td style="padding: 0.85rem 0.75rem; text-align: right;">
          <div style="font-size: 0.9rem;">${mealDebtHtml}</div>
        </td>
        <td style="padding: 0.85rem 0.75rem; text-align: right;">
          <div style="font-size: 0.82rem; color: var(--text-muted);">${formatRM(c.totalRiderCost)}</div>
          <div style="font-size: 0.75rem; color: #059669; font-weight: 600;">Paid: ${formatRM(c.riderPaid)}</div>
        </td>
        <td style="padding: 0.85rem 0.75rem; text-align: right;">
          <div style="font-size: 0.9rem;">${riderDebtHtml}</div>
        </td>
        <td style="padding: 0.85rem 1rem; text-align: right;">
          <div style="font-size: 1.05rem; font-weight: 800; color: ${isIndebt ? '#dc2626' : '#059669'};">
            ${formatRM(c.totalOutstanding)}
          </div>
          ${!isIndebt ? `<div style="margin-top: 3px;">${debtBadge}</div>` : ''}
        </td>
        <td style="padding: 0.85rem 1rem; text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 0.45rem; align-items: center;">
            <button type="button" class="btn btn-sm btn-primary" onclick="openRecordRepaymentModal('${c.contactId}')"
              style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 700; background: #059669; border-color: #059669;"
              title="Record payment for this customer">
              💳 Record Payment
            </button>
            <button type="button" class="btn btn-sm btn-outline" onclick="openCustomerDebtHistoryModal('${c.contactId}')"
              style="padding: 0.35rem 0.7rem; font-size: 0.78rem; font-weight: 700;"
              title="View all orders and payment history">
              📜 Details
            </button>
          </div>
        </td>
      </tr>
    `;

    // Mobile Card HTML
    mobileCardsHtml += `
      <div class="debt-mobile-card ${isIndebt ? 'has-debt' : ''}" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.9rem 1rem; margin-bottom: 0.75rem; box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-main);">${escapeHtml(c.name)}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              📞 ${escapeHtml(c.phone)}
            </div>
          </div>
          <div>${debtBadge}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; background: var(--bg-main); border: 1px solid var(--border-light); border-radius: 8px; padding: 0.6rem 0.75rem; margin: 0.75rem 0;">
          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🍱 Meal Debt</div>
            <div style="font-size: 0.88rem; margin-top: 2px;">${mealDebtHtml}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">Cost: ${formatRM(c.totalMealCost)}</div>
          </div>
          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🛵 Rider Debt</div>
            <div style="font-size: 0.88rem; margin-top: 2px;">${riderDebtHtml}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">Cost: ${formatRM(c.totalRiderCost)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Due</div>
            <div style="font-size: 1rem; font-weight: 800; color: ${isIndebt ? '#dc2626' : '#059669'}; margin-top: 2px;">
              ${formatRM(c.totalOutstanding)}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
          <button type="button" class="btn btn-sm btn-outline" onclick="openCustomerDebtHistoryModal('${c.contactId}')" style="flex: 1; padding: 0.45rem; font-weight: 700;">
            📜 Order &amp; Debt History
          </button>
          <button type="button" class="btn btn-sm btn-primary" onclick="openRecordRepaymentModal('${c.contactId}')" style="flex: 1; padding: 0.45rem; font-weight: 800; background: #059669; border-color: #059669;">
            💳 Record Payment
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = `
    <!-- Desktop Table View -->
    <div class="desktop-table-view" style="overflow-x: auto; border: 1px solid var(--border-color); border-radius: 12px; background: var(--bg-surface); box-shadow: var(--shadow-sm);">
      <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background: var(--bg-main); border-bottom: 2px solid var(--border-color); font-size: 0.775rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.03em;">
            <th style="padding: 0.85rem 1rem;">Customer</th>
            <th style="padding: 0.85rem 0.75rem; text-align: right;">Meal Cost / Paid</th>
            <th style="padding: 0.85rem 0.75rem; text-align: right;">Meal Due</th>
            <th style="padding: 0.85rem 0.75rem; text-align: right;">Rider Fee / Paid</th>
            <th style="padding: 0.85rem 0.75rem; text-align: right;">Rider Due</th>
            <th style="padding: 0.85rem 1rem; text-align: right;">Total Outstanding</th>
            <th style="padding: 0.85rem 1rem; text-align: right;">Actions</th>
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

/**
 * Filter and Search Handlers
 */
function handleDebtSearch(query) {
  debtSearchQuery = (query || '').trim();
  renderCustomerDebtView();
}

function setDebtStatusFilter(status) {
  debtStatusFilter = status;
  document.querySelectorAll('.debt-status-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-status') === status);
  });
  renderCustomerDebtView();
}

function setDebtTypeFilter(type) {
  debtTypeFilter = type;
  document.querySelectorAll('.debt-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-type') === type);
  });
  renderCustomerDebtView();
}

function setDebtDateFilter(dateFilter) {
  debtDateFilter = dateFilter;
  document.querySelectorAll('.debt-date-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-date') === dateFilter);
  });

  const customRangeBox = document.getElementById('debt-custom-date-box');
  if (customRangeBox) {
    customRangeBox.style.display = (dateFilter === 'custom') ? 'flex' : 'none';
  }

  renderCustomerDebtView();
}

function handleDebtCustomDateChange() {
  const startEl = document.getElementById('debt-input-start-date');
  const endEl = document.getElementById('debt-input-end-date');
  if (startEl) debtCustomStartDate = startEl.value;
  if (endEl) debtCustomEndDate = endEl.value;
  renderCustomerDebtView();
}

function handleDebtSortChange(sortBy) {
  debtSortBy = sortBy;
  renderCustomerDebtView();
}

/**
 * Open Record Repayment Modal
 */
function openRecordRepaymentModal(contactId) {
  debtModalContactId = contactId;
  const customer = cachedContacts[contactId];
  if (!customer) return;

  const debtData = calculateCustomerDebt(contactId);

  // Set modal headers
  document.getElementById('repay-customer-name').textContent = customer.name;
  document.getElementById('repay-customer-phone').textContent = customer.phone || 'No phone';
  document.getElementById('repay-customer-id').textContent = customer.id || contactId;

  document.getElementById('repay-bal-meal').textContent = formatRM(debtData.outstandingMeal);
  document.getElementById('repay-bal-rider').textContent = formatRM(debtData.outstandingRider);
  document.getElementById('repay-bal-total').textContent = formatRM(debtData.totalOutstanding);

  // Set today date as default
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('repay-input-date').value = `${yyyy}-${mm}-${dd}`;

  // Reset inputs
  document.getElementById('repay-input-meal-amount').value = '';
  document.getElementById('repay-input-rider-amount').value = '';
  document.getElementById('repay-input-method').value = 'Bank Transfer';
  document.getElementById('repay-input-remark').value = '';

  // Show active admin user
  const adminEmail = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) ? currentUser.email : 'Admin';
  const adminEl = document.getElementById('repay-admin-display');
  if (adminEl) adminEl.textContent = adminEmail;

  // Set default repayment type
  if (debtData.outstandingMeal > 0 && debtData.outstandingRider <= 0) {
    setRepaymentType('meal');
  } else if (debtData.outstandingRider > 0 && debtData.outstandingMeal <= 0) {
    setRepaymentType('rider');
  } else {
    setRepaymentType('combined');
  }

  updateRepaymentTotalSummary();
  document.getElementById('debt-repayment-modal').classList.add('active');
}

function closeRecordRepaymentModal() {
  document.getElementById('debt-repayment-modal').classList.remove('active');
  debtModalContactId = null;
  isSavingDebtPayment = false;
}

/**
 * Switch Repayment Type: 'meal' | 'rider' | 'combined'
 */
function setRepaymentType(type) {
  const btnMeal = document.getElementById('repay-type-btn-meal');
  const btnRider = document.getElementById('repay-type-btn-rider');
  const btnCombined = document.getElementById('repay-type-btn-combined');

  const groupMeal = document.getElementById('repay-group-meal');
  const groupRider = document.getElementById('repay-group-rider');
  const hiddenType = document.getElementById('repay-input-type');

  if (hiddenType) hiddenType.value = type;

  if (btnMeal) btnMeal.classList.toggle('active', type === 'meal');
  if (btnRider) btnRider.classList.toggle('active', type === 'rider');
  if (btnCombined) btnCombined.classList.toggle('active', type === 'combined');

  if (type === 'meal') {
    if (groupMeal) groupMeal.style.display = 'block';
    if (groupRider) groupRider.style.display = 'none';
    document.getElementById('repay-input-rider-amount').value = '0';
  } else if (type === 'rider') {
    if (groupMeal) groupMeal.style.display = 'none';
    if (groupRider) groupRider.style.display = 'block';
    document.getElementById('repay-input-meal-amount').value = '0';
  } else {
    if (groupMeal) groupMeal.style.display = 'block';
    if (groupRider) groupRider.style.display = 'block';
  }

  updateRepaymentTotalSummary();
}

/**
 * Quick Fill Repayment Amounts
 */
function quickFillRepayment(target) {
  if (!debtModalContactId) return;
  const debtData = calculateCustomerDebt(debtModalContactId);
  if (!debtData) return;

  const mealInp = document.getElementById('repay-input-meal-amount');
  const riderInp = document.getElementById('repay-input-rider-amount');

  if (target === 'meal') {
    if (mealInp) mealInp.value = debtData.outstandingMeal.toFixed(2);
  } else if (target === 'rider') {
    if (riderInp) riderInp.value = debtData.outstandingRider.toFixed(2);
  } else if (target === 'both') {
    if (mealInp) mealInp.value = debtData.outstandingMeal.toFixed(2);
    if (riderInp) riderInp.value = debtData.outstandingRider.toFixed(2);
  }
  updateRepaymentTotalSummary();
}

/**
 * Live Update Repayment Total
 */
function updateRepaymentTotalSummary() {
  const type = document.getElementById('repay-input-type')?.value || 'combined';
  let mealAmt = 0;
  let riderAmt = 0;

  if (type === 'meal' || type === 'combined') {
    mealAmt = Math.max(0, parseFloat(document.getElementById('repay-input-meal-amount')?.value) || 0);
  }
  if (type === 'rider' || type === 'combined') {
    riderAmt = Math.max(0, parseFloat(document.getElementById('repay-input-rider-amount')?.value) || 0);
  }

  const total = mealAmt + riderAmt;
  const totalEl = document.getElementById('repay-summary-total');
  if (totalEl) totalEl.textContent = formatRM(total);
}

/**
 * Submit Debt Repayment Form
 */
async function submitRecordRepayment(event) {
  event.preventDefault();
  if (isSavingDebtPayment) return;

  const contactId = debtModalContactId;
  const customer = cachedContacts[contactId];
  if (!customer) {
    showMaterialToast('Customer not found', 'error');
    return;
  }

  const debtData = calculateCustomerDebt(contactId);
  if (!debtData) return;

  const type = document.getElementById('repay-input-type')?.value || 'combined';
  const payDate = document.getElementById('repay-input-date')?.value || '';
  const payMethod = document.getElementById('repay-input-method')?.value || 'Bank Transfer';
  const remark = document.getElementById('repay-input-remark')?.value.trim() || '';

  let mealAmt = 0;
  let riderAmt = 0;

  if (type === 'meal' || type === 'combined') {
    mealAmt = parseFloat(document.getElementById('repay-input-meal-amount')?.value) || 0;
  }
  if (type === 'rider' || type === 'combined') {
    riderAmt = parseFloat(document.getElementById('repay-input-rider-amount')?.value) || 0;
  }

  if (mealAmt < 0 || riderAmt < 0) {
    showMaterialToast('Repayment amounts cannot be negative', 'warning');
    return;
  }

  const totalAmount = mealAmt + riderAmt;
  if (totalAmount <= 0) {
    showMaterialToast('Please enter a valid repayment amount greater than 0', 'warning');
    return;
  }

  // Safety checks against overpayment
  if (mealAmt > (debtData.outstandingMeal + 0.001)) {
    showMaterialToast(`Meal repayment (RM ${mealAmt.toFixed(2)}) cannot exceed outstanding meal debt (${formatRM(debtData.outstandingMeal)})`, 'error');
    document.getElementById('repay-input-meal-amount').focus();
    return;
  }

  if (riderAmt > (debtData.outstandingRider + 0.001)) {
    showMaterialToast(`Rider repayment (RM ${riderAmt.toFixed(2)}) cannot exceed outstanding rider fee debt (${formatRM(debtData.outstandingRider)})`, 'error');
    document.getElementById('repay-input-rider-amount').focus();
    return;
  }

  if (!payDate) {
    showMaterialToast('Please select a payment date', 'warning');
    return;
  }

  isSavingDebtPayment = true;
  const btnSubmit = document.getElementById('btn-submit-repayment');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Saving...';
  }

  try {
    const paymentRecord = {
      contactId: contactId,
      customerName: customer.name,
      customerPhone: customer.phone || '',
      paymentType: type,
      totalAmount: totalAmount,
      mealAmount: mealAmt,
      riderAmount: riderAmt,
      paymentDate: payDate,
      paymentMethod: payMethod,
      remark: remark
    };

    await dbAddDebtPayment(paymentRecord);

    closeRecordRepaymentModal();
    renderCustomerDebtView();
    if (typeof renderContacts === 'function') renderContacts();
    if (typeof renderOrders === 'function') renderOrders();

    showMaterialToast(`Recorded repayment of ${formatRM(totalAmount)} for ${customer.name}!`, 'success');
    if (typeof showCleanCheckmark === 'function') {
      showCleanCheckmark('Repayment Recorded');
    }
  } catch (err) {
    console.error('[Debt] Error saving repayment:', err);
    showMaterialToast('Failed to record repayment: ' + err.message, 'error');
  } finally {
    isSavingDebtPayment = false;
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Save Repayment';
    }
  }
}

/**
 * Open Customer Debt & Order History Modal
 */
function openCustomerDebtHistoryModal(contactId) {
  const customer = cachedContacts[contactId];
  if (!customer) return;

  const debtData = calculateCustomerDebt(contactId);
  if (!debtData) return;

  document.getElementById('history-modal-customer-name').textContent = customer.name;
  document.getElementById('history-modal-customer-phone').textContent = customer.phone || '--';
  document.getElementById('history-modal-customer-address').textContent = customer.address || '--';

  document.getElementById('history-stat-meal-cost').textContent = formatRM(debtData.totalMealCost);
  document.getElementById('history-stat-meal-paid').textContent = formatRM(debtData.mealPaid);
  document.getElementById('history-stat-meal-due').textContent = formatRM(debtData.outstandingMeal);

  document.getElementById('history-stat-rider-cost').textContent = formatRM(debtData.totalRiderCost);
  document.getElementById('history-stat-rider-paid').textContent = formatRM(debtData.riderPaid);
  document.getElementById('history-stat-rider-due').textContent = formatRM(debtData.outstandingRider);

  document.getElementById('history-stat-total-cost').textContent = formatRM(debtData.totalCost);
  document.getElementById('history-stat-total-paid').textContent = formatRM(debtData.totalPaid);
  document.getElementById('history-stat-total-due').textContent = formatRM(debtData.totalOutstanding);

  // Render Orders Tab
  const ordersListEl = document.getElementById('history-orders-list');
  if (ordersListEl) {
    if (debtData.orderRows.length === 0) {
      ordersListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">No meal orders found for this customer.</div>`;
    } else {
      let ordersHtml = '';
      debtData.orderRows.forEach(row => {
        const isSettled = row.totalOutstanding <= 0.005;
        const statusBadgeClass = isSettled ? 'badge-paid' : (row.finalMealPaid > 0 || row.finalRiderPaid > 0 ? 'badge-package' : 'badge-unpaid');
        const statusLabel = isSettled ? '✓ Fully Settled' : (row.finalMealPaid > 0 || row.finalRiderPaid > 0 ? 'Partially Paid' : 'Unpaid');

        ordersHtml += `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.65rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.45rem; flex-wrap: wrap; gap: 0.35rem;">
              <div style="display: flex; align-items: center; gap: 0.45rem;">
                <span style="font-weight: 800; font-size: 0.92rem; color: var(--text-main);">📅 ${row.date}</span>
                ${row.day ? `<span style="font-size: 0.725rem; font-weight: 700; background: var(--bg-main); padding: 1px 6px; border-radius: 4px; color: var(--text-muted);">${row.day}</span>` : ''}
                <span style="font-family: monospace; font-size: 0.7rem; color: var(--text-light);">${row.orderId}</span>
              </div>
              <div>
                <span class="badge ${statusBadgeClass}" style="font-size: 0.7rem; font-weight: 800;">${statusLabel}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; gap: 0.35rem;">
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
                🥗 ${escapeHtml(row.foodName)} <span style="color: var(--primary-dark); font-weight: 800;">× ${row.quantity}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-left: 0.35rem;">(${row.portion})</span>
              </div>
              <div style="font-size: 0.95rem; font-weight: 800; color: ${isSettled ? '#059669' : '#dc2626'};">
                Remaining Due: ${formatRM(row.totalOutstanding)}
              </div>
            </div>

            <!-- Breakdown Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; background: var(--bg-main); border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.78rem;">
              <div>
                <div style="font-weight: 700; color: var(--text-main);">🍱 Meal Cost: ${formatRM(row.mealCost)}</div>
                <div style="color: var(--text-muted); font-size: 0.73rem;">Paid: <span style="color:#059669; font-weight:700;">${formatRM(row.finalMealPaid)}</span> • Due: <strong style="color:${row.outstandingMeal > 0 ? '#dc2626' : '#059669'};">${formatRM(row.outstandingMeal)}</strong></div>
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-main);">🛵 Rider: ${formatRM(row.riderCost)} ${row.isSelfCollect ? '(Self Collect)' : ''}</div>
                <div style="color: var(--text-muted); font-size: 0.73rem;">Paid: <span style="color:#059669; font-weight:700;">${formatRM(row.finalRiderPaid)}</span> • Due: <strong style="color:${row.outstandingRider > 0 ? '#dc2626' : '#059669'};">${formatRM(row.outstandingRider)}</strong></div>
              </div>
            </div>
          </div>
        `;
      });
      ordersListEl.innerHTML = ordersHtml;
    }
  }

  // Render Repayments Tab
  const paymentsListEl = document.getElementById('history-payments-list');
  if (paymentsListEl) {
    if (debtData.payments.length === 0) {
      paymentsListEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem 1rem;">No repayment records yet. Click "Record Payment" to add one.</div>`;
    } else {
      let paymentsHtml = '';
      debtData.payments.forEach(pay => {
        const typeLabels = {
          'meal': '🍱 Meal Payment',
          'rider': '🛵 Rider Fee Payment',
          'combined': '🍱+🛵 Combined Payment'
        };
        const dt = new Date(pay.createdAt || Date.now());
        const timeStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

        paymentsHtml += `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 0.65rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.45rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="badge" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-weight: 800; font-size: 0.725rem;">
                  ${typeLabels[pay.paymentType] || 'Repayment'}
                </span>
                <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">📅 Date: ${pay.paymentDate || '--'}</span>
              </div>
              <div style="font-size: 1.05rem; font-weight: 800; color: #059669;">
                + ${formatRM(pay.totalAmount)}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.45rem; font-size: 0.8rem; flex-wrap: wrap; gap: 0.35rem;">
              <div>
                ${pay.paymentType === 'combined' ? `
                  <span style="color: var(--text-muted);">Allocation: 🍱 Meal <strong>${formatRM(pay.mealAmount)}</strong> • 🛵 Rider <strong>${formatRM(pay.riderAmount)}</strong></span>
                ` : `
                  <span style="color: var(--text-muted);">Method: <strong>${escapeHtml(pay.paymentMethod || 'Bank Transfer')}</strong></span>
                `}
              </div>
              <div style="font-size: 0.74rem; color: var(--text-light);">
                Operator: <span style="font-weight: 600; color: var(--text-muted);">${escapeHtml(pay.createdBy || 'Admin')}</span> (Recorded: ${timeStr})
              </div>
            </div>

            ${pay.remark ? `
              <div style="margin-top: 0.35rem; font-size: 0.76rem; color: #475569; font-style: italic; background: var(--bg-main); padding: 0.35rem 0.6rem; border-radius: 5px;">
                💬 Note: ${escapeHtml(pay.remark)}
              </div>
            ` : ''}
          </div>
        `;
      });
      paymentsListEl.innerHTML = paymentsHtml;
    }
  }

  // Quick action inside modal to record payment for this customer
  const btnRepayInHistory = document.getElementById('history-btn-quick-repay');
  if (btnRepayInHistory) {
    btnRepayInHistory.onclick = () => {
      closeCustomerDebtHistoryModal();
      openRecordRepaymentModal(contactId);
    };
  }

  switchDebtHistoryTab('orders');
  document.getElementById('customer-debt-history-modal').classList.add('active');
}

function closeCustomerDebtHistoryModal() {
  document.getElementById('customer-debt-history-modal').classList.remove('active');
}

function switchDebtHistoryTab(tab) {
  debtHistoryActiveTab = tab;
  const btnOrders = document.getElementById('history-tab-btn-orders');
  const btnPayments = document.getElementById('history-tab-btn-payments');
  const paneOrders = document.getElementById('history-tab-pane-orders');
  const panePayments = document.getElementById('history-tab-pane-payments');

  if (tab === 'payments') {
    if (btnPayments) {
      btnPayments.style.color = 'var(--primary-dark)';
      btnPayments.style.borderBottom = '2px solid var(--primary-dark)';
      btnPayments.style.fontWeight = '800';
    }
    if (btnOrders) {
      btnOrders.style.color = 'var(--text-muted)';
      btnOrders.style.borderBottom = 'none';
      btnOrders.style.fontWeight = '700';
    }
    if (panePayments) panePayments.style.display = 'block';
    if (paneOrders) paneOrders.style.display = 'none';
  } else {
    if (btnOrders) {
      btnOrders.style.color = 'var(--primary-dark)';
      btnOrders.style.borderBottom = '2px solid var(--primary-dark)';
      btnOrders.style.fontWeight = '800';
    }
    if (btnPayments) {
      btnPayments.style.color = 'var(--text-muted)';
      btnPayments.style.borderBottom = 'none';
      btnPayments.style.fontWeight = '700';
    }
    if (paneOrders) paneOrders.style.display = 'block';
    if (panePayments) panePayments.style.display = 'none';
  }
}
