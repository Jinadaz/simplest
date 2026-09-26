/* Simplest - WhatsApp Message Link Generator */

/**
 * Generate WhatsApp message URL for customer order confirmation
 */
function createWhatsAppOrderLink(phone, customerName, day, dateStr, foodName, quantity, totalAmount, portion = 'Standard') {
  const formattedPhone = formatPhoneForWA(phone);
  const formattedDate = formatDateReadable(dateStr);
  const formattedTotal = formatRM(totalAmount);
  const portionLabel = portion === 'Small' ? 'Small' : 'Standard';

  const messageText = 
`Hi ${customerName},

Your healthy meal order for ${day} (${formattedDate}):

🥗 *${foodName}* [${portionLabel}] × ${quantity}
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
  const portionLabel = item.portion === 'Small' ? 'Small' : 'Standard';

  msg += `${index + 1}. *${item.customerName}*\n`;

  if (item.customerPhone) {
    msg += `Phone: ${item.customerPhone}\n`;
  }

  msg += `Address:\n`;
  msg += `${item.address || 'No address specified'}\n`;

  msg += `Food: ${item.foodName}\n`;
  msg += `Portion: ${portionLabel}\n`;
  msg += `Qty: ${item.quantity}\n\n`;

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

