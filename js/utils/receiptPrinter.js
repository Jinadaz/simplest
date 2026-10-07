/**
 * Simplest - Thermal Receipt Printer Utility (80mm POS-MAC CP-Q3)
 * Optimized for high-contrast thermal printing, solid black typography,
 * logo integration, and auto-cut pagination.
 */

let cachedReceiptLogoDataUrl = 'icons/logo.png';

/**
 * Preload and compress logo to high-contrast monochrome base64 for instant printing
 */
function initReceiptLogo() {
  if (typeof window === 'undefined') return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas');
      const size = 120;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Draw image
      ctx.drawImage(img, 0, 0, size, size);
      cachedReceiptLogoDataUrl = canvas.toDataURL('image/png');
    } catch(e) {
      cachedReceiptLogoDataUrl = img.src || 'icons/logo.png';
    }
  };
  img.onerror = function() {
    const brandImg = document.querySelector('.brand-logo-img');
    if (brandImg && brandImg.src) {
      cachedReceiptLogoDataUrl = brandImg.src;
    }
  };
  img.src = 'icons/logo.png';
}

if (typeof window !== 'undefined') {
  initReceiptLogo();
}

/**
 * Generate HTML markup for a single customer receipt ticket
 */
function generateReceiptTicketHtml(c, index, totalCount, meta) {
  const customerName = c.name || 'Unknown';
  const customerPhone = c.phone || '-';
  const customerAddress = c.address || 'Self Pick-up / No Address';
  const specialRemarks = c.special || '';
  const dateStr = meta.dateStr || '';
  const dayName = meta.dayName || '';
  const logoSrc = cachedReceiptLogoDataUrl || 'icons/logo.png';

  let portionRows = '';
  if (c.smallCount > 0) {
    portionRows += `
      <tr style="border-bottom: 1.5px solid #000;">
        <td style="padding: 7px 0; font-size: 16px; font-weight: 900; color: #000;">400 (Small)</td>
        <td style="padding: 7px 0; font-size: 20px; font-weight: 900; text-align: right; color: #000;">× ${c.smallCount}</td>
      </tr>
    `;
  }
  if (c.standardCount > 0) {
    portionRows += `
      <tr style="border-bottom: 1.5px solid #000;">
        <td style="padding: 7px 0; font-size: 16px; font-weight: 900; color: #000;">ST (Standard)</td>
        <td style="padding: 7px 0; font-size: 20px; font-weight: 900; text-align: right; color: #000;">× ${c.standardCount}</td>
      </tr>
    `;
  }
  if (!c.smallCount && !c.standardCount) {
    portionRows += `
      <tr style="border-bottom: 1.5px solid #000;">
        <td style="padding: 7px 0; font-size: 16px; font-weight: 900; color: #000;">Meals</td>
        <td style="padding: 7px 0; font-size: 20px; font-weight: 900; text-align: right; color: #000;">× ${c.totalMeals || 1}</td>
      </tr>
    `;
  }

  // Optional item details breakdown if available
  let itemDetailsHtml = '';
  if (c.itemLines && c.itemLines.length > 0) {
    itemDetailsHtml = `
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1.5px dashed #000; font-size: 12px; line-height: 1.45; font-weight: 700; color: #000;">
        <div style="font-weight: 900; font-size: 13px; margin-bottom: 3px;">ITEM BREAKDOWN:</div>
        ${c.itemLines.map(line => `<div>• ${escapeReceiptXml(line)}</div>`).join('')}
      </div>
    `;
  }

  // Remarks section
  let remarksHtml = '';
  if (specialRemarks.trim()) {
    remarksHtml = `
      <div style="margin-top: 10px; border: 3px solid #000; padding: 6px 8px; font-size: 14px; font-weight: 900; line-height: 1.35; color: #000; background: #fff;">
        <div style="font-size: 13px; text-decoration: underline; margin-bottom: 4px;">⚠️ SPECIAL REMARKS / NOTES:</div>
        <div>${escapeReceiptXml(specialRemarks)}</div>
      </div>
    `;
  }

  return `
    <div class="receipt-ticket">
      <!-- Header with Logo -->
      <div style="text-align: center; margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <img src="${logoSrc}" alt="Logo" class="receipt-logo-img" style="width: 52px; height: 52px; object-fit: contain; display: inline-block; filter: contrast(160%);">
        </div>
        <div style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #000; line-height: 1.1;">SIMPLEST</div>
        <div style="font-size: 12px; font-weight: 800; color: #000; margin-top: 2px;">HEALTHY MEAL MANAGEMENT</div>
        <div style="font-size: 14px; font-weight: 900; color: #000; margin-top: 4px; padding: 3px 0; border-top: 2px dashed #000; border-bottom: 2px dashed #000; letter-spacing: 1px;">
          DELIVERY TICKET
        </div>
      </div>

      <!-- Date & Sequence -->
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; color: #000; margin-bottom: 6px; line-height: 1.3;">
        <div>DATE: ${dateStr} (${dayName.slice(0, 3)})</div>
        <div>NO: #${index + 1} / ${totalCount}</div>
      </div>

      <!-- High-Contrast Section Banner: Customer Details -->
      <div style="background: #000; color: #fff; padding: 4px 6px; font-size: 13px; font-weight: 900; text-align: center; letter-spacing: 1px; margin: 6px 0 6px 0;">
        CUSTOMER DETAILS
      </div>

      <!-- Customer Info (Extra Bold & High Visibility) -->
      <div style="margin-bottom: 6px; padding: 2px 0;">
        <div style="font-size: 21px; font-weight: 900; color: #000; line-height: 1.2; word-break: break-word;">
          ${escapeReceiptXml(customerName)}
        </div>
        <div style="font-size: 16px; font-weight: 900; color: #000; margin-top: 5px;">
          TEL: ${escapeReceiptXml(customerPhone)}
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #000; margin-top: 5px; line-height: 1.35; word-break: break-word;">
          ADD: ${escapeReceiptXml(customerAddress)}
        </div>
      </div>

      <!-- High-Contrast Section Banner: Meal Portions -->
      <div style="background: #000; color: #fff; padding: 4px 6px; font-size: 13px; font-weight: 900; text-align: center; letter-spacing: 1px; margin: 8px 0 6px 0;">
        MEAL PORTIONS &amp; QUANTITY
      </div>

      <!-- Meals Breakdown Table -->
      <div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
          <tbody>
            ${portionRows}
          </tbody>
        </table>
        ${itemDetailsHtml}
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 3px solid #000; border-bottom: 3px solid #000; margin-top: 8px; padding: 6px 0;">
          <span style="font-size: 16px; font-weight: 900; color: #000;">TOTAL MEALS:</span>
          <span style="font-size: 24px; font-weight: 900; color: #000;">${c.totalMeals}</span>
        </div>
      </div>

      <!-- Special Remarks / Instructions -->
      ${remarksHtml}

      <!-- Footer & Cutter Buffer -->
      <div style="margin-top: 10px; padding-top: 6px; border-top: 2px dashed #000; text-align: center; font-size: 11px; font-weight: 800; color: #000;">
        <div>Thank you for choosing Simplest!</div>
        <div style="font-weight: 900; margin-top: 2px;">Enjoy Your Fresh Meal</div>
        <div style="margin-top: 5px; font-size: 10px; font-weight: 700; color: #000;">---------------- ✂️ AUTO CUT ----------------</div>
      </div>

      <!-- Feed space before cutter blade hits -->
      <div class="cutter-feed-space" style="height: 18mm;"></div>
    </div>
  `;
}

/**
 * Escape XML/HTML special characters
 */
function escapeReceiptXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate full HTML document containing all or selected receipts
 */
function buildReceiptDocumentHtml(ticketsHtml, title) {
  const currentBaseHref = window.location.href;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <base href="${currentBaseHref}">
  <title>${escapeReceiptXml(title || 'Delivery Receipts')}</title>
  <style>
    /* 80mm Thermal Paper Specifications (POS-MAC CP-Q3) */
    @page {
      size: 80mm auto;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      color: #000 !important;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
      -webkit-font-smoothing: antialiased;
    }
    .receipt-container {
      width: 76mm;
      max-width: 76mm;
      margin: 0 auto;
      padding: 0 2mm;
    }
    .receipt-ticket {
      width: 100%;
      padding: 4mm 1mm 0mm 1mm;
      page-break-after: always;
      break-after: page;
      position: relative;
    }
    .receipt-ticket:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    /* Feed margin before physical cutter strikes */
    .cutter-feed-space {
      height: 18mm;
      width: 100%;
      display: block;
    }
    @media screen {
      body {
        background: #f1f5f9;
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .screen-actions {
        position: sticky;
        top: 10px;
        z-index: 100;
        background: #ffffff;
        padding: 12px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        margin-bottom: 24px;
        display: flex;
        gap: 14px;
        align-items: center;
        font-family: system-ui, sans-serif;
      }
      .screen-actions button {
        background: #059669;
        color: white;
        border: none;
        padding: 9px 20px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
      }
      .receipt-container {
        background: #ffffff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.12);
        border: 1px solid #cbd5e1;
      }
      .receipt-ticket {
        border-bottom: 3px dashed #94a3b8;
      }
    }
    @media print {
      .screen-actions {
        display: none !important;
      }
      .receipt-container {
        width: 76mm !important;
        max-width: 76mm !important;
        margin: 0 !important;
        padding: 0 2mm !important;
        box-shadow: none !important;
        border: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-actions">
    <button onclick="window.print()">🖨️ Print Now</button>
    <span style="font-size: 13px; font-weight: 600; color: #334155;">POS-MAC CP-Q3 (80mm) | Auto-Cut Per Customer</span>
  </div>

  <div class="receipt-container">
    ${ticketsHtml}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;
}

/**
 * Print all thermal receipts for the specified day
 */
function printDailyThermalReceipts(dayOffset = 0) {
  if (typeof getDayOrdersDataForExcel !== 'function') {
    alert('Order data processor is not ready.');
    return;
  }

  const dayData = getDayOrdersDataForExcel(dayOffset);
  if (!dayData.customers || dayData.customers.length === 0) {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast(`No orders found for ${dayData.dateStr}.`, 'warning');
    } else {
      alert(`No orders found for ${dayData.dateStr}.`);
    }
    return;
  }

  const ticketsHtml = dayData.customers.map((c, idx) => 
    generateReceiptTicketHtml(c, idx, dayData.customers.length, dayData)
  ).join('');

  const fullHtml = buildReceiptDocumentHtml(ticketsHtml, `Simplest Delivery Receipts - ${dayData.dateStr}`);

  openPrintWindow(fullHtml);
}

/**
 * Print a single customer's thermal receipt on demand
 */
function printSingleCustomerThermalReceipt(customerIndex, dayOffset) {
  const currentOffset = (typeof dayOffset === 'number') 
    ? dayOffset 
    : (typeof currentExportDayOffset === 'number' ? currentExportDayOffset : (typeof ordersDayOffset !== 'undefined' ? ordersDayOffset : 0));

  const dayData = getDayOrdersDataForExcel(currentOffset);
  if (!dayData.customers || !dayData.customers[customerIndex]) {
    alert('Customer order not found.');
    return;
  }

  const customer = dayData.customers[customerIndex];
  const ticketHtml = generateReceiptTicketHtml(customer, customerIndex, dayData.customers.length, dayData);
  const fullHtml = buildReceiptDocumentHtml(ticketHtml, `Delivery Ticket - ${customer.name}`);

  openPrintWindow(fullHtml);
}

/**
 * Helper to open and write to a print window
 */
function openPrintWindow(htmlContent) {
  const printWindow = window.open('', '_blank', 'width=460,height=750,top=50,left=100');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Popup window blocked! Please allow popups to print.', 'warning');
    } else {
      alert('Popup window blocked! Please allow popups to print.');
    }
  }
}

/**
 * Wrapper for printing all receipts from the export modal
 */
function printDailyThermalReceiptsFromModal() {
  const offset = typeof currentExportDayOffset === 'number' ? currentExportDayOffset : 0;
  printDailyThermalReceipts(offset);
}

/**
 * Print individual order receipt directly by orderId
 */
function printOrderReceiptById(orderId) {
  const ord = (typeof cachedOrders !== 'undefined' ? cachedOrders : {})[orderId];
  if (!ord) {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Order not found.', 'warning');
    } else {
      alert('Order not found.');
    }
    return;
  }

  const contactsMap = (typeof cachedContacts !== 'undefined' ? cachedContacts : {});
  const contact = contactsMap[ord.contactId] || {};
  const name = (ord.customerName || contact.name || 'Unknown').trim();
  const phone = (ord.customerPhone || contact.phone || '').trim();
  const address = (contact.address || ord.address || '').trim();

  let smallCount = 0;
  let standardCount = 0;
  const itemLines = [];

  if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
    ord.items.forEach(it => {
      const p = it.portion || 'Standard';
      if (p.toLowerCase() === 'small') smallCount++;
      else standardCount++;

      const addonsList = Array.isArray(it.addons) ? it.addons : Array.from(it.addons || []);
      const addonText = addonsList.length > 0 ? ` (+${addonsList.join(', ')})` : '';
      const idText = it.id ? `#${it.id} ` : '';
      itemLines.push(`${idText}${p}${addonText}`.trim());
    });
  } else {
    const qty = parseInt(ord.quantity) || 1;
    const p = (ord.portion || 'Standard').toLowerCase();
    if (p === 'small') smallCount += qty;
    else standardCount += qty;
  }

  const customerObj = {
    name: name,
    phone: phone,
    address: address,
    special: ord.remark || '',
    itemLines: itemLines,
    smallCount: smallCount,
    standardCount: standardCount,
    totalMeals: smallCount + standardCount
  };

  const targetDate = ord.date ? new Date(ord.date + 'T00:00:00') : new Date();
  const meta = {
    dateStr: ord.date || '',
    dayName: targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
    formattedDate: typeof formatDateReadable === 'function' ? formatDateReadable(ord.date) : ord.date
  };

  const ticketHtml = generateReceiptTicketHtml(customerObj, 0, 1, meta);
  const fullHtml = buildReceiptDocumentHtml(ticketHtml, `Delivery Ticket - ${name}`);
  openPrintWindow(fullHtml);
}
