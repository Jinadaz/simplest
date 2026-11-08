/* Simplest - WhatsApp Message Link Generator */

/**
 * Generate WhatsApp message URL for customer order confirmation
 */
function createWhatsAppOrderLink(phone, customerName, day, dateStr, foodName, quantity, totalAmount, portion = 'Standard', items = null) {
  const formattedPhone = formatPhoneForWA(phone);
  const formattedDate = formatDateReadable(dateStr);
  const formattedTotal = formatRM(totalAmount);

  let foodLines = '';
  if (items && Array.isArray(items) && items.length > 0) {
    const list = items.map(it => {
      const addonsList = Array.isArray(it.addons) ? it.addons : [];
      const addonText = addonsList.length > 0 ? ` (+${addonsList.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')})` : '';
      const meatText = it.meat ? ` [${it.meat}]` : '';
      return `   • Meal ${it.id || ''}: ${it.portion}${meatText}${addonText}`;
    }).join('\n');
    foodLines = `🥗 *${foodName}* × ${quantity}\n${list}`;
  } else {
    const portionLabel = portion === 'Small' ? 'Small' : 'Standard';
    foodLines = `🥗 *${foodName}* [${portionLabel}] × ${quantity}`;
  }

  const messageText = 
`Hi ${customerName},

Your healthy meal order for ${day} (${formattedDate}):

${foodLines}
💰 Total: *${formattedTotal}*

Thank you for ordering with Simplest!`;

  const encodedText = encodeURIComponent(messageText);

  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  } else {
    return `https://wa.me/?text=${encodedText}`;
  }
}

/**
 * Generate WhatsApp message URL for Rider Delivery Manifest (customer names, phones & addresses)
 */
function createWhatsAppRiderManifestLink(riderPhone, riderName, dateStr, deliveries) {
  const formattedPhone = formatPhoneForWA(riderPhone);
  const formattedDate = formatDateReadable(dateStr);

 let msg = `RIDER DELIVERY LIST\n`;
msg += `${formattedDate}\n`;
msg += `Rider: *${riderName}*\n\n`;

msg += `TOTAL DELIVERIES: ${deliveries.length}\n\n`;

deliveries.forEach((item, index) => {
  msg += `${index + 1}. *${item.customerName}*\n`;

  if (item.customerPhone) {
    msg += `Phone: ${item.customerPhone}\n`;
  }

  msg += `Address:\n`;
  msg += `${item.address || 'No address specified'}\n`;

  msg += `Food: ${item.foodName} × ${item.quantity}\n`;
  if (item.items && Array.isArray(item.items) && item.items.length > 0) {
    const details = item.items.map(it => {
      const addonsList = Array.isArray(it.addons) ? it.addons : [];
      const addonText = addonsList.length > 0 ? ` (+${addonsList.join(', ')})` : '';
      const meatText = it.meat ? ` [${it.meat}]` : '';
      return `#${it.id} ${it.portion}${meatText}${addonText}`;
    }).join(' | ');
    msg += `Details: ${details}\n\n`;
  } else {
    const portionLabel = item.portion === 'Small' ? 'Small' : 'Standard';
    msg += `Portion: ${portionLabel}\n\n`;
  }

  if (index < deliveries.length - 1) {
    msg += `--------------------\n\n`;
  }
});

msg += `--------------------\n`;
msg += `END OF DELIVERY LIST`;

const encodedText = encodeURIComponent(msg);

if (formattedPhone) {
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
} else {
  return `https://wa.me/?text=${encodedText}`;
}
}

/* ==========================================================================
   WhatsApp Debt Reminder Chat Modal
   ========================================================================== */

const WA_OPENER_KEY = 'simplest_wa_opener';

const DEFAULT_WA_OPENER =
`Hi {name},

Here is your outstanding balance summary:`;

/**
 * Get the current opener template. Prefers the Firebase RTDB value
 * (cachedWaOpener via dbGetWaOpener) and falls back to the built-in default.
 */
function getWaOpenerTemplate() {
  if (typeof dbGetWaOpener === 'function') {
    const v = dbGetWaOpener();
    if (v) return v;
  }
  return DEFAULT_WA_OPENER;
}

/**
 * Save a new default opener template to Firebase RTDB (or local fallback).
 */
async function saveWaOpenerTemplate(text) {
  if (typeof dbSaveWaOpener === 'function') {
    await dbSaveWaOpener(text);
    return true;
  }
  // Fallback if db helpers unavailable
  try {
    localStorage.setItem(WA_OPENER_KEY, text);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Apply placeholders (currently supports {name}).
 */
function applyWaOpenerPlaceholders(template, name) {
  return (template || '').replace(/\{name\}/gi, name || '');
}

/**
 * Toggle the opener settings panel visibility.
 */
function toggleWaOpenerPanel() {
  const wrap = document.querySelector('.wa-chat-opener');
  const panel = document.getElementById('wa-opener-panel');
  if (wrap) wrap.classList.toggle('open');
  if (panel) panel.classList.toggle('open');
}

/**
 * Rebuild the currently-shown chat message when the opener template changes.
 * Re-applies the saved opener above the (unchanged) debt breakdown.
 */
function refreshWaDebtMessageFromOpener() {
  const ctx = window.__waDebtContext;
  if (!ctx || !ctx.debtData) return;

  const msgText = buildDebtReminderMessage(ctx.debtData);
  const bubbleTextEl = document.getElementById('wa-debt-bubble-text');
  const textareaEl = document.getElementById('wa-debt-textarea');

  if (bubbleTextEl) bubbleTextEl.textContent = msgText;
  if (textareaEl) textareaEl.value = msgText;
}

/**
 * Build the debt reminder message text for a customer.
 * Each line follows the format:  1/9 RM14×2+6=RM34
 * i.e. "d/m  RM{unitPrice}×{quantity}+{riderFee}=RM{total}"
 *
 * @param {object} debtData - result of calculateCustomerDebt(contactId)
 * @param {string} [openerOverride] - optional opener template to use instead of the saved one
 */
function buildDebtReminderMessage(debtData, openerOverride) {
  if (!debtData) return '';

  const lines = [];
  const rows = [...(debtData.orderRows || [])].reverse(); // oldest first

  rows.forEach(row => {
    if (row.totalOutstanding <= 0.005) return; // skip settled orders

    // Derive date label "d/m"
    let dateLabel = row.date || '--';
    if (typeof dateLabel === 'string' && dateLabel.indexOf('-') !== -1) {
      const p = dateLabel.split('-');
      const dd = parseInt(p[2], 10);
      const mm = parseInt(p[1], 10);
      if (!isNaN(dd) && !isNaN(mm)) dateLabel = `${dd}/${mm}`;
    }

    const qty = parseInt(row.quantity, 10) || 1;
    const unitPrice = qty > 0 ? row.mealCost / qty : 0;
    const riderFee = row.riderCost || 0;
    const total = row.totalOutstanding || (row.mealCost + row.riderCost);

    lines.push(`${dateLabel} RM${unitPrice.toFixed(0)}×${qty}+${riderFee.toFixed(0)}=RM${total.toFixed(0)}`);
  });

  const totalOutstanding = debtData.totalOutstanding || 0;
  const name = debtData.name || 'there';

  // Custom opener (default greeting) goes above the breakdown
  const openerTemplate = (openerOverride !== undefined && openerOverride !== null)
    ? openerOverride
    : getWaOpenerTemplate();
  const opener = applyWaOpenerPlaceholders(openerTemplate, name);

  let msg = opener;
  if (msg && !/\n$/.test(msg)) msg += '\n';
  msg += '\n';
  msg += lines.join('\n');
  msg += `\nTotal = RM${totalOutstanding.toFixed(0)}\n\n`;
  msg += `Thank you!`;

  return msg;
}

/**
 * Open the WhatsApp-style debt chat modal for a customer.
 * @param {string} contactId
 */
function openWhatsAppDebtModal(contactId) {
  const customer = (typeof cachedContacts !== 'undefined' && cachedContacts) ? cachedContacts[contactId] : null;
  if (!customer) {
    showMaterialToast('Customer not found', 'error');
    return;
  }

  const debtData = (typeof calculateCustomerDebt === 'function')
    ? calculateCustomerDebt(contactId)
    : null;

  if (!debtData) {
    showMaterialToast('Unable to calculate debt', 'error');
    return;
  }

  // Store context for send action
  window.__waDebtContext = { contactId, phone: customer.phone || '', name: customer.name || '', debtData };

  // Header
  const nameEl = document.getElementById('wa-debt-name');
  const phoneEl = document.getElementById('wa-debt-phone');
  const avatarEl = document.getElementById('wa-debt-avatar');
  const dateLabelEl = document.getElementById('wa-debt-date-label');

  if (nameEl) nameEl.textContent = customer.name || 'Customer';
  if (phoneEl) phoneEl.textContent = customer.phone || '';
  if (avatarEl) avatarEl.textContent = (customer.name || '?').charAt(0).toUpperCase();

  // Date label (today)
  if (dateLabelEl) {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    dateLabelEl.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Message
  const msgText = buildDebtReminderMessage(debtData);
  const bubbleTextEl = document.getElementById('wa-debt-bubble-text');
  const textareaEl = document.getElementById('wa-debt-textarea');

  if (bubbleTextEl) bubbleTextEl.textContent = msgText;
  if (textareaEl) textareaEl.value = msgText;

  // Populate opener input with the current template
  const openerInputEl = document.getElementById('wa-opener-input');
  if (openerInputEl) openerInputEl.value = getWaOpenerTemplate();

  // Live sync: textarea <-> bubble
  if (textareaEl) {
    textareaEl.oninput = () => {
      if (bubbleTextEl) bubbleTextEl.textContent = textareaEl.value;
    };
  }

  // Live sync: opener input changes -> rebuild the message (opener above breakdown)
  if (openerInputEl) {
    openerInputEl.oninput = () => {
      window.__waDebtContext.opener = openerInputEl.value;
      const rebuilt = buildDebtReminderMessage(debtData, openerInputEl.value);
      if (bubbleTextEl) bubbleTextEl.textContent = rebuilt;
      if (textareaEl) textareaEl.value = rebuilt;
    };
  }

  const modal = document.getElementById('whatsapp-debt-modal');
  if (modal) modal.classList.add('active');
}

function closeWhatsAppDebtModal() {
  const modal = document.getElementById('whatsapp-debt-modal');
  if (modal) modal.classList.remove('active');
  window.__waDebtContext = null;
}

function sendWhatsAppDebtMessage() {
  const ctx = window.__waDebtContext;
  const textareaEl = document.getElementById('wa-debt-textarea');
  const text = (textareaEl && textareaEl.value) ? textareaEl.value.trim() : '';

  if (!text) {
    showMaterialToast('Message is empty', 'warning');
    return;
  }

  const formattedPhone = ctx && ctx.phone ? formatPhoneForWA(ctx.phone) : '';
  const encodedText = encodeURIComponent(text);
  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank');
}

