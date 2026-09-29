/* Simplest - Contacts & Customer Profile Controller */

let contactSearchQuery = '';
let editingContactId = null;
let viewingProfileContactId = null;

function initContactsView() {
  renderContacts();
}

function handleContactSearch(query) {
  contactSearchQuery = (query || '').toLowerCase().trim();
  renderContacts();
}

function toggleContactAddress2(show) {
  const addr2Group = document.getElementById('contact-address2-group');
  const btnShowAddr2 = document.getElementById('btn-show-add-address2');
  const addr2Input = document.getElementById('contact-input-address2');
  const rider2Select = document.getElementById('contact-input-rider2');

  if (show) {
    if (addr2Group) addr2Group.style.display = 'block';
    if (btnShowAddr2) btnShowAddr2.style.display = 'none';
    if (addr2Input) addr2Input.focus();
  } else {
    if (addr2Group) addr2Group.style.display = 'none';
    const role = document.getElementById('contact-input-role')?.value || 'customer';
    if (btnShowAddr2) {
      btnShowAddr2.style.display = (role === 'rider') ? 'none' : 'inline-flex';
    }
    if (addr2Input) addr2Input.value = '';
    if (rider2Select) rider2Select.value = '';
  }
}

function setContactRole(role) {
  const roleInput = document.getElementById('contact-input-role');
  if (roleInput) roleInput.value = role;

  const btnCustomer = document.getElementById('contact-role-btn-customer');
  const btnRider = document.getElementById('contact-role-btn-rider');

  const riderGroup1 = document.getElementById('contact-rider-select-group');
  const addr2Group = document.getElementById('contact-address2-group');
  const btnShowAddr2 = document.getElementById('btn-show-add-address2');

  if (role === 'rider') {
    if (btnCustomer) btnCustomer.classList.remove('daytype-active');
    if (btnRider) btnRider.classList.add('daytype-active');
    if (riderGroup1) riderGroup1.style.display = 'none';
    if (addr2Group) addr2Group.style.display = 'none';
    if (btnShowAddr2) btnShowAddr2.style.display = 'none';
  } else {
    if (btnRider) btnRider.classList.remove('daytype-active');
    if (btnCustomer) btnCustomer.classList.add('daytype-active');
    if (riderGroup1) riderGroup1.style.display = 'block';
    // If address 2 is open, hide "+ Add Address 2"; otherwise show it
    const isAddr2Open = addr2Group && addr2Group.style.display !== 'none';
    if (btnShowAddr2) {
      btnShowAddr2.style.display = isAddr2Open ? 'none' : 'inline-flex';
    }
  }
}

function populateRidersDropdown(selectedRiderId = '', selectedRiderId2 = '') {
  const riders = Object.entries(cachedContacts || {})
    .map(([id, c]) => ({ id, ...c }))
    .filter(c => c.isRider === true || c.role === 'rider');

  const populateSelect = (selectEl, chosenId) => {
    if (!selectEl) return;
    selectEl.innerHTML = '<option value="">-- No Rider Assigned --</option>';
    riders.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `🛵 ${r.name} (${r.phone || 'No phone'})`;
      if (r.id === chosenId) opt.selected = true;
      selectEl.appendChild(opt);
    });
  };

  populateSelect(document.getElementById('contact-input-rider'), selectedRiderId);
  populateSelect(document.getElementById('contact-input-rider2'), selectedRiderId2);
}

function renderContacts() {
  const container = document.getElementById('contacts-list-container');
  if (!container) return;

  const contactsArr = Object.entries(cachedContacts || {}).map(([id, val]) => ({ id, ...val }));

  const filtered = contactsArr.filter(c => {
    if (!contactSearchQuery) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(contactSearchQuery);
    const phoneMatch = (c.phone || '').toLowerCase().includes(contactSearchQuery);
    const addressMatch = (c.address || '').toLowerCase().includes(contactSearchQuery) || (c.address2 || '').toLowerCase().includes(contactSearchQuery);
    const riderNameMatch = (c.riderName || '').toLowerCase().includes(contactSearchQuery) || (c.riderName2 || '').toLowerCase().includes(contactSearchQuery);
    return nameMatch || phoneMatch || addressMatch || riderNameMatch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon" style="display:flex; justify-content:center; margin-bottom:0.5rem;">${getSvgIcon('users', 'lg')}</div>
        <div style="font-weight:700; font-size:0.9rem;">No contacts found</div>
      </div>
    `;
    return;
  }

  let tableRowsHtml = '';
  let mobileCardsHtml = '';

  filtered.forEach(contact => {
    const isRider = contact.isRider === true || contact.role === 'rider';
    
    // Resolve assigned rider display for Address 1
    let assignedRiderDisplay = '<span style="color:var(--text-light);">--</span>';
    let assignedRiderDisplay2 = '';

    if (isRider) {
      assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.775rem;">🛵 Rider</span>`;
    } else {
      if (contact.riderId && cachedContacts[contact.riderId]) {
        const riderObj = cachedContacts[contact.riderId];
        assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#f0fdf4; border-color:#86efac; color:#166534; font-size:0.775rem; font-weight:800;" title="Rider for Address 1">🛵 ${riderObj.name}</span>`;
      } else if (contact.riderName) {
        assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#f0fdf4; border-color:#86efac; color:#166534; font-size:0.775rem; font-weight:800;" title="Rider for Address 1">🛵 ${contact.riderName}</span>`;
      }

      // Resolve assigned rider for Address 2
      if (contact.riderId2 && cachedContacts[contact.riderId2]) {
        const riderObj2 = cachedContacts[contact.riderId2];
        assignedRiderDisplay2 = `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.75rem; font-weight:800; margin-top:3px; display:inline-block;" title="Rider for Address 2">🛵2 ${riderObj2.name}</span>`;
      } else if (contact.riderName2) {
        assignedRiderDisplay2 = `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.75rem; font-weight:800; margin-top:3px; display:inline-block;" title="Rider for Address 2">🛵2 ${contact.riderName2}</span>`;
      }
    }

    const nameBadge = isRider
      ? `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.675rem; margin-left:0.35rem;">🛵 Rider</span>`
      : '';

    const stdCred = contact.creditStandard || 0;
    const smlCred = contact.creditSmall || 0;
    const riderCred = parseFloat(contact.creditRider) || 0;
    let creditDisplay = '<span style="color:var(--text-muted); font-size:0.775rem;">0</span>';
    if (stdCred > 0 || smlCred > 0 || riderCred > 0) {
      creditDisplay = `
        <div style="display:flex; gap:0.25rem; flex-wrap:wrap; align-items:center;">
          ${stdCred > 0 ? `<span class="badge" style="background:#ecfdf5; border-color:#a7f3d0; color:#047857; font-size:0.725rem; font-weight:800;">🍱 ${stdCred}</span>` : ''}
          ${smlCred > 0 ? `<span class="badge" style="background:#f0fdf4; border-color:#bbf7d0; color:#15803d; font-size:0.725rem; font-weight:800;">🥣 ${smlCred}</span>` : ''}
          ${riderCred > 0 ? `<span class="badge" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; font-size:0.725rem; font-weight:800;">🛵 RM${riderCred.toFixed(2)}</span>` : ''}
        </div>
      `;
    }

    // Desktop Table Row
    tableRowsHtml += `
      <tr>
        <td style="font-weight: 700; white-space: nowrap;">
          <a href="javascript:void(0)" onclick="openCustomerProfileModal('${contact.id}')" style="color: var(--primary-dark); text-decoration: underline;">
            ${contact.name}
          </a>
          ${nameBadge}
        </td>
        <td style="white-space: nowrap;">📞 ${contact.phone || '--'}</td>
        <td style="color: var(--text-main); line-height: 1.35;">
          <div>📍 ${contact.address || '--'}</div>
          ${contact.address2 ? `<div style="font-size:0.76rem; color:var(--text-muted); margin-top:3px;">📍2: ${contact.address2}</div>` : ''}
        </td>
        <td style="white-space: nowrap;">
          <div>${assignedRiderDisplay}</div>
          ${assignedRiderDisplay2 ? `<div>${assignedRiderDisplay2}</div>` : ''}
        </td>
        <td style="white-space: nowrap;">${creditDisplay}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center; justify-content: flex-end;">
            <button class="btn btn-primary btn-sm" onclick="openAddOrderForCustomer('${contact.id}')">
              ${getSvgIcon('plus', 'sm')} Order
            </button>
            <button class="btn btn-outline btn-sm" onclick="openCustomerProfileModal('${contact.id}')">
              ${getSvgIcon('user', 'sm')} Profile
            </button>
            <button class="btn btn-outline btn-sm" onclick="openEditContactModal('${contact.id}')">
              ${getSvgIcon('edit', 'sm')}
            </button>
            <button class="btn btn-outline btn-sm" style="color: #ef4444;" onclick="deleteContactAction('${contact.id}')">
              ${getSvgIcon('trash', 'sm')}
            </button>
          </div>
        </td>
      </tr>
    `;

    // Mobile Card Item
    mobileCardsHtml += `
      <div class="mobile-data-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            <span style="font-size: 1.05rem; font-weight: 800;" onclick="openCustomerProfileModal('${contact.id}')">${contact.name}</span>
            ${nameBadge}
          </div>
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">📞 ${contact.phone || 'No phone'}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 0.4rem; line-height: 1.4;">
          <div>📍 ${contact.address || 'No address'}</div>
          ${contact.address2 ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">📍2: ${contact.address2}</div>` : ''}
        </div>
        ${(stdCred > 0 || smlCred > 0 || riderCred > 0) ? `
          <div style="font-size: 0.8rem; color: #047857; font-weight: 800; margin-bottom: 0.4rem; background: #ecfdf5; padding: 0.25rem 0.5rem; border-radius: 6px; display: inline-block;">
            💳 Credit: 🍱 Std: ${stdCred} | 🥣 Sml: ${smlCred}${riderCred > 0 ? ` | 🛵 Rider: RM${riderCred.toFixed(2)}` : ''}
          </div>
        ` : ''}
        ${!isRider && (contact.riderName || contact.riderId || contact.riderName2 || contact.riderId2) ? `
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin-bottom: 0.5rem;">
            ${assignedRiderDisplay !== '<span style="color:var(--text-light);">--</span>' ? assignedRiderDisplay : ''}
            ${assignedRiderDisplay2}
          </div>
        ` : ''}
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
          <button class="btn btn-primary btn-sm" onclick="openAddOrderForCustomer('${contact.id}')">
            ${getSvgIcon('plus', 'sm')} Order
          </button>
          <button class="btn btn-outline btn-sm" onclick="openCustomerProfileModal('${contact.id}')">
            ${getSvgIcon('user', 'sm')} Profile
          </button>
          <button class="btn btn-outline btn-sm" onclick="openEditContactModal('${contact.id}')">
            ${getSvgIcon('edit', 'sm')}
          </button>
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
            <th style="width: 18%;">Name</th>
            <th style="width: 14%;">Phone</th>
            <th style="width: 30%;">Address</th>
            <th style="width: 12%;">Rider</th>
            <th style="width: 13%;">Meal Credit</th>
            <th style="width: 13%; text-align: right;">Actions</th>
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

function openAddContactModal() {
  editingContactId = null;
  document.getElementById('contact-modal-title').textContent = 'Add New Contact';
  document.getElementById('contact-input-name').value = '';
  document.getElementById('contact-input-phone').value = '';
  document.getElementById('contact-input-address').value = '';
  document.getElementById('contact-input-remark').value = '';

  setContactRole('customer');
  populateRidersDropdown('', '');
  toggleContactAddress2(false);

  document.getElementById('contact-modal').classList.add('active');
}

function openEditContactModal(contactId) {
  editingContactId = contactId;
  const c = cachedContacts[contactId];
  if (!c) return;

  document.getElementById('contact-modal-title').textContent = 'Edit Contact';
  document.getElementById('contact-input-name').value = c.name || '';
  document.getElementById('contact-input-phone').value = c.phone || '';
  document.getElementById('contact-input-address').value = c.address || '';
  document.getElementById('contact-input-remark').value = c.remark || '';

  const role = (c.isRider || c.role === 'rider') ? 'rider' : 'customer';
  setContactRole(role);
  populateRidersDropdown(c.riderId || '', c.riderId2 || '');

  const hasAddr2 = !!(c.address2 && c.address2.trim());
  if (role === 'customer' && hasAddr2) {
    toggleContactAddress2(true);
    const addr2Input = document.getElementById('contact-input-address2');
    if (addr2Input) addr2Input.value = c.address2;
    const rider2Select = document.getElementById('contact-input-rider2');
    if (rider2Select) rider2Select.value = c.riderId2 || '';
  } else {
    toggleContactAddress2(false);
  }

  document.getElementById('contact-modal').classList.add('active');
}

function closeContactModal() {
  document.getElementById('contact-modal').classList.remove('active');
  editingContactId = null;
}

async function saveContactSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('contact-input-name').value.trim();
  const phone = document.getElementById('contact-input-phone').value.trim();
  const address = document.getElementById('contact-input-address').value.trim();
  const addr2Input = document.getElementById('contact-input-address2');
  const address2 = addr2Input ? addr2Input.value.trim() : '';
  const remark = document.getElementById('contact-input-remark').value.trim();
  const role = document.getElementById('contact-input-role').value;

  if (!name || !phone) {
    showMaterialToast('Name and phone number are required', 'warning');
    return;
  }

  const isRider = (role === 'rider');
  let riderId = '';
  let riderName = '';
  let riderId2 = '';
  let riderName2 = '';

  if (!isRider) {
    const riderSelect = document.getElementById('contact-input-rider');
    if (riderSelect) {
      riderId = riderSelect.value;
      if (riderId && cachedContacts[riderId]) {
        riderName = cachedContacts[riderId].name;
      }
    }
    const riderSelect2 = document.getElementById('contact-input-rider2');
    if (riderSelect2) {
      riderId2 = riderSelect2.value;
      if (riderId2 && cachedContacts[riderId2]) {
        riderName2 = cachedContacts[riderId2].name;
      }
    }
  }

  const existingObj = editingContactId ? (cachedContacts[editingContactId] || {}) : {};

  const payload = {
    name,
    phone,
    address,
    address2,
    remark,
    isRider,
    role,
    riderId,
    riderName,
    riderId2,
    riderName2,
    creditStandard: existingObj.creditStandard || 0,
    creditSmall: existingObj.creditSmall || 0,
    creditRider: existingObj.creditRider || 0
  };

  if (editingContactId) {
    await dbUpdateContact(editingContactId, payload);
  } else {
    await dbAddContact(payload);
  }

  closeContactModal();
  renderContacts();
}

/* ─────────────────────────────────────────
   PACKAGE PURCHASE MODAL HANDLERS
───────────────────────────────────────── */
function handlePkgCustomerSearch(query) {
  const dropdown = document.getElementById('pkg-customer-dropdown');
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
    item.onclick = () => selectPkgCustomer(c);
    dropdown.appendChild(item);
  });

  dropdown.style.display = 'block';
}

function selectPkgCustomer(customer) {
  document.getElementById('pkg-input-customer-id').value = customer.id;
  document.getElementById('pkg-input-customer-search').value = `${customer.name} (${customer.phone || ''})`;
  document.getElementById('pkg-customer-dropdown').style.display = 'none';

  const infoBadge = document.getElementById('pkg-customer-selected-info');
  if (infoBadge) {
    infoBadge.style.display = 'block';
    const stdC = customer.creditStandard || 0;
    const smlC = customer.creditSmall || 0;
    infoBadge.innerHTML = `Selected: <strong>${customer.name}</strong> • Current Balance: ${stdC} Standard, ${smlC} Small`;
  }
}

function openPackagePurchaseModal(preselectedContactId = null) {
  const targetId = preselectedContactId || viewingProfileContactId;
  if (document.getElementById('customer-profile-modal')) {
    closeCustomerProfileModal();
  }

  document.getElementById('pkg-input-customer-id').value = '';
  document.getElementById('pkg-input-customer-search').value = '';
  const infoBadge = document.getElementById('pkg-customer-selected-info');
  if (infoBadge) infoBadge.style.display = 'none';

  document.getElementById('pkg-input-credit-standard').value = 0;
  document.getElementById('pkg-input-credit-small').value = 0;
  const rdrInp = document.getElementById('pkg-input-credit-rider');
  if (rdrInp) rdrInp.value = 0;
  document.getElementById('pkg-input-price').value = '';
  document.getElementById('pkg-input-remark').value = '';

  if (targetId && cachedContacts[targetId]) {
    selectPkgCustomer(cachedContacts[targetId]);
  }

  document.getElementById('package-purchase-modal').classList.add('active');
}

function closePackagePurchaseModal() {
  document.getElementById('package-purchase-modal').classList.remove('active');
}

async function savePackagePurchaseSubmit(event) {
  event.preventDefault();
  let contactId = document.getElementById('pkg-input-customer-id').value;
  const searchInputVal = document.getElementById('pkg-input-customer-search').value.trim();
  const addStd = Math.max(0, parseInt(document.getElementById('pkg-input-credit-standard').value) || 0);
  const addSml = Math.max(0, parseInt(document.getElementById('pkg-input-credit-small').value) || 0);
  const addRider = Math.max(0, parseFloat(document.getElementById('pkg-input-credit-rider').value) || 0);
  const price = Math.max(0, parseFloat(document.getElementById('pkg-input-price').value) || 0);
  const remark = document.getElementById('pkg-input-remark').value.trim();

  if (!contactId && searchInputVal) {
    const contactsArr = Object.values(cachedContacts || {});
    const matched = contactsArr.find(c => 
      c.name.toLowerCase() === searchInputVal.toLowerCase() ||
      (c.phone && c.phone.includes(searchInputVal))
    );
    if (matched) {
      selectPkgCustomer(matched);
      contactId = matched.id;
    }
  }

  if (!contactId || !cachedContacts[contactId]) {
    showMaterialToast('Please search and select a valid customer', 'warning');
    document.getElementById('pkg-input-customer-search').focus();
    return;
  }

  if (addStd <= 0 && addSml <= 0 && addRider <= 0) {
    showMaterialToast('Please enter at least 1 credit (Standard, Small, or Rider) to add', 'warning');
    document.getElementById('pkg-input-credit-standard').focus();
    return;
  }

  if (price <= 0) {
    showMaterialToast('Please enter a valid Package Purchase Price (RM)', 'warning');
    document.getElementById('pkg-input-price').focus();
    return;
  }

  const customer = cachedContacts[contactId];
  const newStd = (customer.creditStandard || 0) + addStd;
  const newSml = (customer.creditSmall || 0) + addSml;
  const newRider = (parseFloat(customer.creditRider) || 0) + addRider;

  // Update customer credits balance in DB
  await dbUpdateContact(contactId, {
    creditStandard: newStd,
    creditSmall: newSml,
    creditRider: newRider
  });

  // Log credit transaction history
  await dbAddCreditLog({
    contactId: contactId,
    customerName: customer.name,
    type: 'topup',
    action: 'Package Top-up',
    deltaStandard: addStd,
    deltaSmall: addSml,
    deltaRider: addRider,
    newStandard: newStd,
    newSmall: newSml,
    newRider: newRider,
    amount: price,
    remark: remark ? `Package Purchase: ${remark}` : `Package Purchase (RM ${price.toFixed(2)})`
  });

  // Record sales order for Today
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = DAY_LABELS[now.getDay()];

  let creditDesc = [];
  if (addStd > 0) creditDesc.push(`+${addStd} Std`);
  if (addSml > 0) creditDesc.push(`+${addSml} Sml`);
  if (addRider > 0) creditDesc.push(`+RM${addRider.toFixed(2)} Rider`);
  const portionLabel = addStd > 0 ? 'Standard' : (addSml > 0 ? 'Small' : 'Standard');

  const salesRecord = {
    contactId: contactId,
    customerName: customer.name,
    customerPhone: customer.phone || '',
    date: todayStr,
    day: dayName,
    menuId: todayStr,
    foodName: `💳 Meal Credit Package (${creditDesc.join(', ')})`,
    portion: portionLabel,
    unitPrice: price,
    quantity: 1,
    totalAmount: price,
    paymentStatus: 'Paid',
    isCreditPackageSale: true,
    remark: remark ? `Meal Credit Package Purchase - ${remark}` : `Meal Credit Package Purchase`
  };

  await dbAddOrder(salesRecord);

  closePackagePurchaseModal();
  renderContacts();
  if (typeof renderOrders === 'function') renderOrders();
  if (typeof renderDashboard === 'function') renderDashboard();

  showMaterialToast(`Purchased Package for ${customer.name}! Added RM ${price.toFixed(2)} to Today's Sales.`, 'success');
}

// EDIT MEAL CREDIT HANDLERS
function openEditMealCreditModal(contactId = null) {
  const targetId = contactId || viewingProfileContactId;
  if (document.getElementById('customer-profile-modal')) {
    closeCustomerProfileModal();
  }

  const customer = cachedContacts[targetId];
  if (!customer) return;

  document.getElementById('edit-credit-contact-id').value = targetId;
  document.getElementById('edit-credit-customer-name').textContent = customer.name;
  document.getElementById('edit-credit-input-standard').value = customer.creditStandard || 0;
  document.getElementById('edit-credit-input-small').value = customer.creditSmall || 0;
  const riderCreditInp = document.getElementById('edit-credit-input-rider');
  if (riderCreditInp) riderCreditInp.value = (parseFloat(customer.creditRider) || 0).toFixed(2);
  document.getElementById('edit-credit-input-remark').value = '';

  document.getElementById('edit-meal-credit-modal').classList.add('active');
}

function closeEditMealCreditModal() {
  document.getElementById('edit-meal-credit-modal').classList.remove('active');
}

async function saveEditMealCreditSubmit(event) {
  event.preventDefault();
  const contactId = document.getElementById('edit-credit-contact-id').value;
  const customer = cachedContacts[contactId];
  if (!customer) return;

  const oldStd = customer.creditStandard || 0;
  const oldSml = customer.creditSmall || 0;
  const oldRider = parseFloat(customer.creditRider) || 0;

  const newStd = parseInt(document.getElementById('edit-credit-input-standard').value) || 0;
  const newSml = parseInt(document.getElementById('edit-credit-input-small').value) || 0;
  const newRider = Math.max(0, parseFloat(document.getElementById('edit-credit-input-rider').value) || 0);
  const remark = document.getElementById('edit-credit-input-remark').value.trim();

  if (!remark) {
    showMaterialToast('Please enter an adjustment remark/reason', 'warning');
    return;
  }

  const deltaStd = newStd - oldStd;
  const deltaSml = newSml - oldSml;
  const deltaRider = newRider - oldRider;

  // Update contact credit balance in DB
  await dbUpdateContact(contactId, {
    creditStandard: newStd,
    creditSmall: newSml,
    creditRider: newRider
  });

  // Log to credit logs history
  await dbAddCreditLog({
    contactId: contactId,
    customerName: customer.name,
    type: 'adjust',
    action: 'Manual Adjust',
    deltaStandard: deltaStd,
    deltaSmall: deltaSml,
    deltaRider: deltaRider,
    newStandard: newStd,
    newSmall: newSml,
    newRider: newRider,
    remark: remark
  });

  closeEditMealCreditModal();
  renderContacts();
  showMaterialToast(`Credits updated for ${customer.name}`, 'success');
}

function switchProfileTab(tab) {
  const btnOrders = document.getElementById('tab-btn-orders');
  const btnCredits = document.getElementById('tab-btn-credits');
  const tabOrders = document.getElementById('profile-tab-orders');
  const tabCredits = document.getElementById('profile-tab-credits');
  if (!btnOrders || !btnCredits || !tabOrders || !tabCredits) return;

  if (tab === 'credits') {
    btnCredits.style.color = 'var(--primary-dark)';
    btnCredits.style.borderBottom = '2px solid var(--primary-dark)';
    btnCredits.style.fontWeight = '800';

    btnOrders.style.color = 'var(--text-muted)';
    btnOrders.style.borderBottom = 'none';
    btnOrders.style.fontWeight = '700';

    tabCredits.style.display = 'block';
    tabOrders.style.display = 'none';
  } else {
    btnOrders.style.color = 'var(--primary-dark)';
    btnOrders.style.borderBottom = '2px solid var(--primary-dark)';
    btnOrders.style.fontWeight = '800';

    btnCredits.style.color = 'var(--text-muted)';
    btnCredits.style.borderBottom = 'none';
    btnCredits.style.fontWeight = '700';

    tabOrders.style.display = 'block';
    tabCredits.style.display = 'none';
  }
}

async function deleteContactAction(contactId) {
  const confirmed = await showMaterialConfirm('Delete Contact', 'Are you sure you want to delete this contact? This action cannot be undone.', 'Delete', true);
  if (confirmed) {
    await dbDeleteContact(contactId);
    renderContacts();
    showMaterialToast('Contact deleted successfully', 'info');
  }
}

function openCustomerProfileModal(contactId) {
  viewingProfileContactId = contactId;
  const c = cachedContacts[contactId];
  if (!c) return;

  const isRider = c.isRider === true || c.role === 'rider';
  document.getElementById('profile-name').textContent = isRider ? `🛵 ${c.name}` : c.name;
  document.getElementById('profile-phone').textContent = c.phone || 'No phone';
  document.getElementById('profile-address').textContent = c.address || 'No address';
  document.getElementById('profile-remark').textContent = c.remark || 'None';

  const stdEl = document.getElementById('profile-credit-standard');
  if (stdEl) stdEl.textContent = c.creditStandard || 0;
  const smlEl = document.getElementById('profile-credit-small');
  if (smlEl) smlEl.textContent = c.creditSmall || 0;
  const riderCreditEl = document.getElementById('profile-credit-rider');
  if (riderCreditEl) riderCreditEl.textContent = (parseFloat(c.creditRider) || 0).toFixed(2);

  const riderTag = document.getElementById('profile-rider-tag');
  if (riderTag) {
    if (isRider) {
      riderTag.style.display = 'block';
      riderTag.textContent = '🛵 Delivery Rider';
    } else if (c.riderId && cachedContacts[c.riderId]) {
      riderTag.style.display = 'block';
      riderTag.textContent = `🛵 Assigned Rider (Addr 1): ${cachedContacts[c.riderId].name}`;
    } else if (c.riderName) {
      riderTag.style.display = 'block';
      riderTag.textContent = `🛵 Assigned Rider (Addr 1): ${c.riderName}`;
    } else {
      riderTag.style.display = 'none';
    }
  }

  const addr2Row = document.getElementById('profile-address2-row');
  const addr2Span = document.getElementById('profile-address2');
  if (addr2Row && addr2Span) {
    if (c.address2 && c.address2.trim()) {
      addr2Row.style.display = 'block';
      addr2Span.textContent = c.address2.trim();
    } else {
      addr2Row.style.display = 'none';
    }
  }

  const rider2Tag = document.getElementById('profile-rider2-tag');
  if (rider2Tag) {
    if (!isRider && (c.riderId2 || c.riderName2)) {
      const r2Name = (c.riderId2 && cachedContacts[c.riderId2]) ? cachedContacts[c.riderId2].name : (c.riderName2 || 'Rider 2');
      rider2Tag.style.display = 'block';
      rider2Tag.textContent = `🛵 Assigned Rider (Addr 2): ${r2Name}`;
    } else {
      rider2Tag.style.display = 'none';
    }
  }

  const customerOrders = Object.values(cachedOrders || {})
    .filter(ord => ord.contactId === contactId)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const totalOrders = customerOrders.length;
  const totalMeals = customerOrders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
  const totalSpent = customerOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

  document.getElementById('profile-stat-orders').textContent = totalOrders;
  document.getElementById('profile-stat-meals').textContent = totalMeals;
  document.getElementById('profile-stat-spent').textContent = formatRM(totalSpent);

  // Render Order History
  const historyContainer = document.getElementById('profile-order-history');
  historyContainer.innerHTML = '';

  if (customerOrders.length === 0) {
    historyContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">No order history found.</div>`;
  } else {
    customerOrders.forEach(ord => {
      const statusClass = ord.paymentStatus === 'Paid' ? 'badge-paid' : (ord.paymentStatus === 'Package' ? 'badge-package' : 'badge-unpaid');
      const itemHtml = `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${ord.day}, ${formatDateReadable(ord.date)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${ord.foodName} (${ord.portion === 'Small' ? 'Small' : 'Standard'}) × ${ord.quantity}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.9rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</div>
            <span class="badge ${statusClass}" style="font-size: 0.65rem;">
              ${ord.paymentStatus || 'Unpaid'}
            </span>
          </div>
        </div>
      `;
      historyContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
  }

  // Render Credit History & Remarks
  const creditLogs = typeof dbGetCreditLogsForContact === 'function' ? dbGetCreditLogsForContact(contactId) : [];
  const creditContainer = document.getElementById('profile-credit-history');
  if (creditContainer) {
    creditContainer.innerHTML = '';

    if (creditLogs.length === 0) {
      creditContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">No meal credit history found.</div>`;
    } else {
      creditLogs.forEach(log => {
        const dt = new Date(log.timestamp || Date.now());
        const timeStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
        
        let badgeStyle = 'background: #f0fdf4; color: #166534; border: 1px solid #86efac;';
        if (log.type === 'adjust') badgeStyle = 'background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;';
        if (log.type === 'consume') badgeStyle = 'background: #f8fafc; color: #475569; border: 1px solid #cbd5e1;';
        if (log.type === 'refund') badgeStyle = 'background: #fefce8; color: #854d0e; border: 1px solid #fef08a;';

        let stdText = '';
        if (log.deltaStandard !== 0 && log.deltaStandard !== undefined) {
          stdText = `Std ${log.deltaStandard > 0 ? '+' : ''}${log.deltaStandard}`;
        }
        let smlText = '';
        if (log.deltaSmall !== 0 && log.deltaSmall !== undefined) {
          smlText = `Sml ${log.deltaSmall > 0 ? '+' : ''}${log.deltaSmall}`;
        }
        let rdrText = '';
        if (log.deltaRider !== 0 && log.deltaRider !== undefined) {
          rdrText = `Rider RM ${log.deltaRider > 0 ? '+' : ''}${parseFloat(log.deltaRider).toFixed(2)}`;
        }
        const deltaText = [stdText, smlText, rdrText].filter(Boolean).join(', ') || 'No change';
        const balRiderStr = log.newRider !== undefined ? `, RM ${parseFloat(log.newRider).toFixed(2)} Rider` : '';

        const itemHtml = `
          <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 0.4rem;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span class="badge" style="${badgeStyle} font-size: 0.7rem; font-weight: 800;">
                ${log.action || 'Credit Update'}
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${timeStr}</span>
            </div>
            <div style="font-size: 0.825rem; font-weight: 700; color: var(--text-main); margin-top: 0.35rem;">
              Change: <span style="color: var(--primary-dark);">${deltaText}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">(Bal: ${log.newStandard || 0} Std, ${log.newSmall || 0} Sml${balRiderStr})</span>
            </div>
            ${log.remark ? `<div style="font-size: 0.775rem; color: #475569; margin-top: 0.2rem; font-style: italic;">Remark: ${log.remark}</div>` : ''}
          </div>
        `;
        creditContainer.insertAdjacentHTML('beforeend', itemHtml);
      });
    }
  }

  // Ensure default tab is Order History
  switchProfileTab('orders');

  document.getElementById('customer-profile-modal').classList.add('active');
}

function closeCustomerProfileModal() {
  document.getElementById('customer-profile-modal').classList.remove('active');
  viewingProfileContactId = null;
}
