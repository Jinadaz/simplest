/* Simplest - Grab / Rider Dispatch Controller (formerly Kitchen view) */

let kitchenDayOffset = 0; // 0 = Today, -1 = Yesterday, +1 = Tomorrow

function initKitchenView() {
  renderKitchen();
}

function setKitchenDayOffset(offsetChange) {
  if (offsetChange === 0) kitchenDayOffset = 0;
  else kitchenDayOffset += offsetChange;
  renderKitchen();
}

async function toggleOrderDispatchStatusAction(orderId) {
  if (typeof dbToggleOrderDispatchStatus === 'function') {
    const isSent = await dbToggleOrderDispatchStatus(orderId);
    if (typeof triggerHapticFeedback === 'function') {
      triggerHapticFeedback(isSent ? 'success' : 'light');
    }
  }
  renderKitchen();
}

function renderKitchen() {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + kitchenDayOffset);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = formatDateReadable(dateStr);

  const titleEl = document.getElementById('kitchen-week-title');
  const dateRangeEl = document.getElementById('kitchen-week-range');
  const headerSummaryEl = document.getElementById('kitchen-total-weekly-meals');

  let labelText = "🛵 Today's Grab Dispatch";
  if (kitchenDayOffset === -1) labelText = "🛵 Yesterday's Grab Dispatch";
  else if (kitchenDayOffset === 1) labelText = "🛵 Tomorrow's Grab Dispatch";
  else if (kitchenDayOffset < -1) labelText = `🛵 ${Math.abs(kitchenDayOffset)} Days Ago Dispatch`;
  else if (kitchenDayOffset > 1) labelText = `🛵 In ${kitchenDayOffset} Days Dispatch`;

  if (titleEl) titleEl.textContent = labelText;
  if (dateRangeEl) dateRangeEl.textContent = `${dayName}, ${formattedDate}`;

  // iOS Segment Active State
  const pBtn = document.getElementById('kitchen-seg-prev');
  const cBtn = document.getElementById('kitchen-seg-current');
  const nBtn = document.getElementById('kitchen-seg-next');
  if (pBtn && cBtn && nBtn) {
    pBtn.classList.toggle('active', kitchenDayOffset < 0);
    cBtn.classList.toggle('active', kitchenDayOffset === 0);
    nBtn.classList.toggle('active', kitchenDayOffset > 0);
  }

  const container = document.getElementById('kitchen-cards-container');
  if (!container) return;

  container.innerHTML = '';

  const allOrders = Object.values(cachedOrders || {});
  const dayOrders = allOrders.filter(ord => ord.date === dateStr);

  let sentCount = 0;
  dayOrders.forEach(ord => {
    if (ord.dispatched) sentCount++;
  });

  if (headerSummaryEl) {
    headerSummaryEl.textContent = `${dayOrders.length} Deliveries Today (${sentCount} Sent)`;
  }

  if (dayOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 3rem 1.5rem;">
        <div class="empty-state-icon" style="display:flex; justify-content:center; margin-bottom:0.75rem; font-size: 2.5rem;">🛵</div>
        <div style="font-weight:800; font-size:1.05rem;">No deliveries found for ${dayName} (${formattedDate})</div>
        <div style="font-size:0.825rem; color:var(--text-muted); margin-top:0.35rem;">Orders placed for this date will appear here grouped by assigned Rider</div>
      </div>
    `;
    return;
  }

  // Map orders by Rider ID
  const riderGroups = {}; // key: riderId ('unassigned' for none)
  const contactsMap = cachedContacts || {};

  dayOrders.forEach(ord => {
    const cust = contactsMap[ord.contactId] || {};
    const riderId = cust.riderId || 'unassigned';
    
    if (!riderGroups[riderId]) {
      riderGroups[riderId] = [];
    }

    riderGroups[riderId].push({
      ...ord,
      address: cust.address || ord.address || '',
      customerPhone: cust.phone || ord.customerPhone || ''
    });
  });

  let cardsHtml = '';

  // Render group for each rider
  Object.keys(riderGroups).forEach(riderId => {
    const items = riderGroups[riderId];
    const isUnassigned = riderId === 'unassigned';
    const riderContact = !isUnassigned ? contactsMap[riderId] : null;
    
    const riderName = isUnassigned
      ? 'Unassigned Rider'
      : (riderContact ? riderContact.name : 'Assigned Rider');
    
    const riderPhone = riderContact ? riderContact.phone : '';
    const riderSentCount = items.filter(i => i.dispatched).length;

    // Generate WhatsApp Manifest URL for this Rider
    const waManifestUrl = createWhatsAppRiderManifestLink(riderPhone, riderName, dateStr, items);

    let itemsHtml = '';
    items.forEach((item, idx) => {
      const isSent = item.dispatched === true;
      const portionTag = item.portion === 'Small' ? '🥣 Small' : '🍱 Standard';
      
      itemsHtml += `
        <div class="dispatch-item-card ${isSent ? 'is-sent' : ''}">
          <div class="dispatch-item-left">
            <div class="dispatch-customer-row">
              <span class="dispatch-customer-name">${idx + 1}. ${item.customerName}</span>
              ${item.customerPhone ? `<span class="dispatch-customer-phone">📞 ${item.customerPhone}</span>` : ''}
            </div>
            <div class="dispatch-address-row">
              <span style="flex-shrink:0;">📍</span>
              <span style="flex:1;">${item.address || 'No address specified'}</span>
            </div>
            <div class="dispatch-food-info">
              ${portionTag} × ${item.quantity} (${item.foodName})
            </div>
          </div>
          <div>
            <button type="button" class="dispatch-toggle-btn ${isSent ? 'sent' : 'pending'}" onclick="toggleOrderDispatchStatusAction('${item.orderId}')">
              ${isSent ? '✓ Sent / Dispatched' : '⏳ Mark as Sent'}
            </button>
          </div>
        </div>
      `;
    });

    cardsHtml += `
      <div class="rider-dispatch-card">
        <div class="rider-dispatch-header">
          <div class="rider-dispatch-title-group">
            <span style="font-size: 1.35rem;">🛵</span>
            <div>
              <div class="rider-dispatch-name">${riderName} ${isUnassigned ? '⚠️' : ''}</div>
              <div class="rider-dispatch-phone">${riderPhone ? `📞 ${riderPhone} • ` : ''}${riderSentCount} / ${items.length} Sent</div>
            </div>
          </div>
          <div>
            <a href="${waManifestUrl}" target="_blank" class="btn btn-whatsapp btn-sm" style="border-radius: 20px; font-weight: 700; gap: 0.35rem;">
              ${getSvgIcon('whatsapp', 'sm')} Send Manifest via WhatsApp
            </a>
          </div>
        </div>
        <div class="rider-dispatch-body">
          ${itemsHtml}
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;
}

