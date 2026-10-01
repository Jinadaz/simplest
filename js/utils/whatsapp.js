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
      return `   • Meal ${it.id || ''}: ${it.portion}${addonText}`;
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
      return `#${it.id} ${it.portion}${addonText}`;
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

