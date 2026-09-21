/* Simplest - WhatsApp Message Link Generator */

/**
 * Generate WhatsApp message URL for customer order confirmation
 */
function createWhatsAppOrderLink(phone, customerName, day, dateStr, foodName, quantity, totalAmount) {
  const formattedPhone = formatPhoneForWA(phone);
  const formattedDate = formatDateReadable(dateStr);
  const formattedTotal = formatRM(totalAmount);

  const messageText = 
`Hi ${customerName},

Your healthy meal order for ${day} (${formattedDate}):

🥗 *${foodName}* × ${quantity}
💰 Total: *${formattedTotal}*

Thank you for ordering with Simplest!`;

  const encodedText = encodeURIComponent(messageText);

  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  } else {
    return `https://wa.me/?text=${encodedText}`;
  }
}
