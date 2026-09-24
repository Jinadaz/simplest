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

function setContactRole(role) {
  const roleInput = document.getElementById('contact-input-role');
  if (roleInput) roleInput.value = role;

  const btnCustomer = document.getElementById('contact-role-btn-customer');
  const btnRider = document.getElementById('contact-role-btn-rider');

  if (role === 'rider') {
    if (btnCustomer) btnCustomer.classList.remove('daytype-active');
    if (btnRider) btnRider.classList.add('daytype-active');
    const riderGroup = document.getElementById('contact-rider-select-group');
    if (riderGroup) riderGroup.style.display = 'none';
  } else {
    if (btnRider) btnRider.classList.remove('daytype-active');
    if (btnCustomer) btnCustomer.classList.add('daytype-active');
    const riderGroup = document.getElementById('contact-rider-select-group');
    if (riderGroup) riderGroup.style.display = 'flex';
  }
}

function populateRidersDropdown(selectedRiderId = '') {
  const selectEl = document.getElementById('contact-input-rider');
  if (!selectEl) return;

  selectEl.innerHTML = '<option value="">-- No Rider Assigned --</option>';

  const riders = Object.entries(cachedContacts || {})
    .map(([id, c]) => ({ id, ...c }))
    .filter(c => c.isRider === true || c.role === 'rider');

  riders.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `🛵 ${r.name} (${r.phone || 'No phone'})`;
    if (r.id === selectedRiderId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function renderContacts() {
  const container = document.getElementById('contacts-list-container');
  if (!container) return;

  const contactsArr = Object.entries(cachedContacts || {}).map(([id, val]) => ({ id, ...val }));

  const filtered = contactsArr.filter(c => {
    if (!contactSearchQuery) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(contactSearchQuery);
    const phoneMatch = (c.phone || '').toLowerCase().includes(contactSearchQuery);
    const addressMatch = (c.address || '').toLowerCase().includes(contactSearchQuery);
    const riderNameMatch = (c.riderName || '').toLowerCase().includes(contactSearchQuery);
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
    
    // Resolve assigned rider display
    let assignedRiderDisplay = '<span style="color:var(--text-light);">--</span>';
    if (isRider) {
      assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.775rem;">🛵 Rider</span>`;
    } else if (contact.riderId && cachedContacts[contact.riderId]) {
      const riderObj = cachedContacts[contact.riderId];
      assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#f0fdf4; border-color:#86efac; color:#166534; font-size:0.775rem; font-weight:800;">🛵 ${riderObj.name}</span>`;
    } else if (contact.riderName) {
      assignedRiderDisplay = `<span class="badge badge-confirmed" style="background:#f0fdf4; border-color:#86efac; color:#166534; font-size:0.775rem; font-weight:800;">🛵 ${contact.riderName}</span>`;
    }

    const nameBadge = isRider
      ? `<span class="badge badge-confirmed" style="background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; font-size:0.675rem; margin-left:0.35rem;">🛵 Rider</span>`
      : '';

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
        <td style="color: var(--text-main); line-height: 1.35;">📍 ${contact.address || '--'}</td>
        <td style="white-space: nowrap;">${assignedRiderDisplay}</td>
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
          📍 ${contact.address || 'No address'}
        </div>
        ${!isRider && (contact.riderName || contact.riderId) ? `
          <div style="font-size: 0.8rem; color: #166534; font-weight: 800; margin-bottom: 0.5rem;">
            ${assignedRiderDisplay}
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
            <th style="width: 20%;">Name</th>
            <th style="width: 16%;">Phone</th>
            <th style="width: 36%;">Address</th>
            <th style="width: 14%;">Rider</th>
            <th style="width: 14%; text-align: right;">Actions</th>
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
  populateRidersDropdown('');

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
  populateRidersDropdown(c.riderId || '');

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
  const remark = document.getElementById('contact-input-remark').value.trim();
  const role = document.getElementById('contact-input-role').value;

  if (!name || !phone) {
    showMaterialToast('Name and phone number are required', 'warning');
    return;
  }

  const isRider = (role === 'rider');
  let riderId = '';
  let riderName = '';

  if (!isRider) {
    riderId = document.getElementById('contact-input-rider').value;
    if (riderId && cachedContacts[riderId]) {
      riderName = cachedContacts[riderId].name;
    }
  }

  const payload = {
    name,
    phone,
    address,
    remark,
    isRider,
    role,
    riderId,
    riderName
  };

  if (editingContactId) {
    await dbUpdateContact(editingContactId, payload);
  } else {
    await dbAddContact(payload);
  }

  closeContactModal();
  renderContacts();
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

  const riderTag = document.getElementById('profile-rider-tag');
  if (riderTag) {
    if (isRider) {
      riderTag.style.display = 'block';
      riderTag.textContent = '🛵 Delivery Rider';
    } else if (c.riderId && cachedContacts[c.riderId]) {
      riderTag.style.display = 'block';
      riderTag.textContent = `🛵 Assigned Rider: ${cachedContacts[c.riderId].name}`;
    } else if (c.riderName) {
      riderTag.style.display = 'block';
      riderTag.textContent = `🛵 Assigned Rider: ${c.riderName}`;
    } else {
      riderTag.style.display = 'none';
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

  const historyContainer = document.getElementById('profile-order-history');
  historyContainer.innerHTML = '';

  if (customerOrders.length === 0) {
    historyContainer.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">No order history found.</div>`;
  } else {
    customerOrders.forEach(ord => {
      const isPaid = ord.paymentStatus === 'Paid';
      const itemHtml = `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.65rem 0.85rem; margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${ord.day}, ${formatDateReadable(ord.date)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${ord.foodName} (${ord.portion === 'Small' ? 'Small' : 'Standard'}) × ${ord.quantity}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.9rem; font-weight: 800; color: var(--primary-dark);">${formatRM(ord.totalAmount)}</div>
            <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}" style="font-size: 0.65rem;">
              ${isPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
      `;
      historyContainer.insertAdjacentHTML('beforeend', itemHtml);
    });
  }

  document.getElementById('customer-profile-modal').classList.add('active');
}

function closeCustomerProfileModal() {
  document.getElementById('customer-profile-modal').classList.remove('active');
  viewingProfileContactId = null;
}
