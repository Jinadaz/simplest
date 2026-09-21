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

function renderContacts() {
  const container = document.getElementById('contacts-list-container');
  if (!container) return;

  const contactsArr = Object.entries(cachedContacts || {}).map(([id, val]) => ({ id, ...val }));

  const filtered = contactsArr.filter(c => {
    if (!contactSearchQuery) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(contactSearchQuery);
    const phoneMatch = (c.phone || '').toLowerCase().includes(contactSearchQuery);
    const companyMatch = (c.company || '').toLowerCase().includes(contactSearchQuery);
    return nameMatch || phoneMatch || companyMatch;
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
    const customerOrders = Object.values(cachedOrders || {}).filter(ord => ord.contactId === contact.id);
    const ordersCount = customerOrders.length;
    const mealsCount = customerOrders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
    const totalSpent = customerOrders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) || 0), 0);

    // Desktop Table Row
    tableRowsHtml += `
      <tr>
        <td style="font-weight: 700;">
          <a href="javascript:void(0)" onclick="openCustomerProfileModal('${contact.id}')" style="color: var(--primary-dark); text-decoration: underline;">
            ${contact.name}
          </a>
        </td>
        <td>📞 ${contact.phone || '--'}</td>
        <td>${contact.company ? `<span class="badge badge-confirmed">${contact.company}</span>` : '--'}</td>
        <td style="color: var(--text-muted);">${contact.address || '--'}</td>
        <td style="font-weight: 700;">${ordersCount} Orders (${mealsCount} Meals)</td>
        <td style="font-weight: 800; color: var(--primary-dark);">${formatRM(totalSpent)}</td>
        <td>
          <div style="display: flex; gap: 0.35rem; align-items: center;">
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
          <span style="font-size: 1.05rem; font-weight: 800;" onclick="openCustomerProfileModal('${contact.id}')">${contact.name}</span>
          ${contact.company ? `<span class="badge badge-confirmed">${contact.company}</span>` : ''}
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          📞 ${contact.phone || 'No phone'} • 📍 ${contact.address || 'No address'}
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
          <div style="font-size: 0.8rem; font-weight: 700;">
            ${ordersCount} Orders (${mealsCount} Meals) • <span style="color: var(--primary-dark);">${formatRM(totalSpent)}</span>
          </div>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-primary btn-sm" onclick="openAddOrderForCustomer('${contact.id}')">
              ${getSvgIcon('plus', 'sm')}
            </button>
            <button class="btn btn-outline btn-sm" onclick="openCustomerProfileModal('${contact.id}')">
              ${getSvgIcon('user', 'sm')}
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
            <th>Name</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Address</th>
            <th>Orders & Meals</th>
            <th>Total Spent</th>
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

function openAddContactModal() {
  editingContactId = null;
  document.getElementById('contact-modal-title').textContent = 'Add New Contact';
  document.getElementById('contact-input-name').value = '';
  document.getElementById('contact-input-phone').value = '';
  document.getElementById('contact-input-company').value = '';
  document.getElementById('contact-input-address').value = '';
  document.getElementById('contact-input-remark').value = '';
  document.getElementById('contact-modal').classList.add('active');
}

function openEditContactModal(contactId) {
  editingContactId = contactId;
  const c = cachedContacts[contactId];
  if (!c) return;

  document.getElementById('contact-modal-title').textContent = 'Edit Contact';
  document.getElementById('contact-input-name').value = c.name || '';
  document.getElementById('contact-input-phone').value = c.phone || '';
  document.getElementById('contact-input-company').value = c.company || '';
  document.getElementById('contact-input-address').value = c.address || '';
  document.getElementById('contact-input-remark').value = c.remark || '';
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
  const company = document.getElementById('contact-input-company').value.trim();
  const address = document.getElementById('contact-input-address').value.trim();
  const remark = document.getElementById('contact-input-remark').value.trim();

  if (!name || !phone) {
    alert('Name and phone number are required');
    return;
  }

  const payload = { name, phone, company, address, remark };

  if (editingContactId) {
    await dbUpdateContact(editingContactId, payload);
  } else {
    await dbAddContact(payload);
  }

  closeContactModal();
  renderContacts();
}

async function deleteContactAction(contactId) {
  if (confirm('Are you sure you want to delete this contact?')) {
    await dbDeleteContact(contactId);
    renderContacts();
  }
}

function openCustomerProfileModal(contactId) {
  viewingProfileContactId = contactId;
  const c = cachedContacts[contactId];
  if (!c) return;

  document.getElementById('profile-name').textContent = c.name;
  document.getElementById('profile-phone').textContent = c.phone || 'No phone';
  document.getElementById('profile-company').textContent = c.company || 'No company';
  document.getElementById('profile-address').textContent = c.address || 'No address';
  document.getElementById('profile-remark').textContent = c.remark || 'None';

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
            <div style="font-size: 0.8rem; color: var(--text-muted);">${ord.foodName} × ${ord.quantity}</div>
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
