/* Simplest - Daily Excel Exporter & Printing Utility */

// Embedded Base64 fallback of js/1.xlsx template
const EXCEL_TEMPLATE_BASE64 = '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';

let currentExportDayOffset = 0;

/**
 * Load template ArrayBuffer: attempts fetch('js/1.xlsx'), fallbacks to embedded base64
 */
async function loadExcelTemplateBuffer() {
  try {
    const res = await fetch('js/1.xlsx');
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (err) {
    console.warn('[ExcelExporter] Fetch js/1.xlsx failed (likely file:// protocol), using base64 fallback.', err);
  }

  // Base64 fallback
  const binaryString = atob(EXCEL_TEMPLATE_BASE64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Aggregate order data for a single date based on dayOffset
 */
function getDayOrdersDataForExcel(dayOffset = 0) {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = yyyy + '-' + mm + '-' + dd;
  if (typeof ensureOrdersMonthLoaded === 'function') {
    ensureOrdersMonthLoaded(yyyy + '-' + mm);
  }

  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const sheetKeyMap = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI' };
  const sheetKey = sheetKeyMap[dayOfWeek] || 'MON'; // fallback to MON for weekends

  const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = typeof formatDateReadable === 'function' ? formatDateReadable(dateStr) : dateStr;

  const allOrders = Object.values(cachedOrders || {});
  const contactsMap = cachedContacts || {};

  // Filter active orders for this specific date
  const dayOrders = allOrders.filter(ord => {
    if (ord.date !== dateStr) return false;
    const status = (ord.orderStatus || ord.status || '').toLowerCase();
    return status !== 'cancelled' && status !== 'canceled';
  });

  // Group by customer (contactId or customerName + phone)
  const customerMap = {};

  dayOrders.forEach(ord => {
    const contact = contactsMap[ord.contactId] || {};
    const name = (ord.customerName || contact.name || 'Unknown').trim();
    const phone = (ord.customerPhone || contact.phone || '').trim();
    const address = (contact.address || ord.address || '').trim();
    const groupKey = ord.contactId || (name + '_' + phone);

    if (!customerMap[groupKey]) {
      customerMap[groupKey] = {
        contactId: ord.contactId || '',
        name: name,
        phone: phone,
        address: address,
        remarks: [],
        smallCount: 0,
        standardCount: 0,
        totalMeals: 0
      };
    }

    // Collect remarks
    if (ord.remark && ord.remark.trim()) {
      const r = ord.remark.trim();
      if (!customerMap[groupKey].remarks.includes(r)) {
        customerMap[groupKey].remarks.push(r);
      }
    }

    // Count portions accurately by inspecting itemsData if available
    let ordSmall = 0;
    let ordStd = 0;
    if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
      ord.items.forEach(it => {
        if ((it.portion || '').toLowerCase() === 'small') {
          ordSmall++;
        } else {
          ordStd++;
        }
      });
    } else {
      const qty = parseInt(ord.quantity) || 1;
      const portion = (ord.portion || 'Standard').toLowerCase();
      if (portion === 'small') {
        ordSmall += qty;
      } else {
        ordStd += qty;
      }
    }

    customerMap[groupKey].smallCount += ordSmall;
    customerMap[groupKey].standardCount += ordStd;
    customerMap[groupKey].totalMeals += (ordSmall + ordStd);
  });

  // Convert map to list and format remarks
  const customerList = Object.values(customerMap).map(c => ({
    name: c.name,
    phone: c.phone,
    special: c.remarks.join('; '),
    smallCount: c.smallCount,
    standardCount: c.standardCount,
    totalMeals: c.totalMeals,
    address: c.address
  }));

  // Sort alphabetically by customer name
  customerList.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { sensitivity: 'base' }));

  const totalSmall = customerList.reduce((acc, c) => acc + c.smallCount, 0);
  const totalStd = customerList.reduce((acc, c) => acc + c.standardCount, 0);

  return {
    dayOffset: dayOffset,
    dateStr: dateStr,
    dayName: dayName,
    sheetKey: sheetKey,
    formattedDate: formattedDate,
    customers: customerList,
    totalSmall: totalSmall,
    totalStd: totalStd,
    totalMeals: totalSmall + totalStd
  };
}

/**
 * Fill 1.xlsx template with ONLY the current day's data and trigger download
 */
async function exportDailyOrdersToExcel(dayOffset = currentExportDayOffset) {
  if (typeof ExcelJS === 'undefined') {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Excel library is still loading, please try again.', 'warning');
    }
    return;
  }

  try {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Generating Daily Excel report...', 'info');
    }

    const templateBuffer = await loadExcelTemplateBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    const dayData = getDayOrdersDataForExcel(dayOffset);
    const targetSheet = workbook.getWorksheet(dayData.sheetKey) || workbook.worksheets[0];

    if (!targetSheet) {
      throw new Error('Template worksheet not found: ' + dayData.sheetKey);
    }

    // Remove all OTHER sheets so the workbook contains ONLY today's sheet
    const sheetsToRemove = [];
    workbook.worksheets.forEach(ws => {
      if (ws.id !== targetSheet.id) {
        sheetsToRemove.push(ws.id);
      }
    });
    sheetsToRemove.forEach(id => workbook.removeWorksheet(id));

    // Rename target sheet to include date
    targetSheet.name = dayData.sheetKey + ' (' + dayData.dateStr + ')';

    const customers = dayData.customers;
    const maxTemplateDataRows = 59; // rows 2 to 60
    const count = Math.min(customers.length, maxTemplateDataRows);

    // Populate rows
    for (let i = 0; i < count; i++) {
      const cust = customers[i];
      const row = targetSheet.getRow(2 + i);
      row.getCell(1).value = cust.name || '';
      row.getCell(2).value = cust.phone || '';
      row.getCell(3).value = cust.special || '';
      row.getCell(4).value = cust.smallCount > 0 ? cust.smallCount : '';
      row.getCell(5).value = cust.standardCount > 0 ? cust.standardCount : '';
      row.getCell(6).value = cust.address || '';
    }

    // If more than 59 customers, insert rows before total row (row 61)
    if (customers.length > maxTemplateDataRows) {
      for (let i = maxTemplateDataRows; i < customers.length; i++) {
        const cust = customers[i];
        const insertAt = 2 + i;
        targetSheet.spliceRows(insertAt, 0, [
          cust.name || '',
          cust.phone || '',
          cust.special || '',
          cust.smallCount > 0 ? cust.smallCount : '',
          cust.standardCount > 0 ? cust.standardCount : '',
          cust.address || ''
        ]);
      }
    }

    // Clear unused rows between (2 + customers.length) and 60 to keep template clean
    for (let r = 2 + customers.length; r <= 60; r++) {
      const row = targetSheet.getRow(r);
      for (let c = 1; c <= 6; c++) {
        row.getCell(c).value = '';
      }
    }

    // Write to buffer and trigger browser download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const fileName = 'Delivery_Orders_' + dayData.dateStr + '.xlsx';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Successfully exported ' + fileName + '!', 'success');
    }
  } catch (err) {
    console.error('[ExcelExporter] Export error:', err);
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Export failed: ' + (err.message || 'Unknown error'), 'error');
    }
  }
}

/**
 * Open Modal to choose day and preview daily delivery sheet
 */
function openExportExcelModal(dayOffset) {
  if (dayOffset !== undefined && !isNaN(dayOffset)) {
    currentExportDayOffset = dayOffset;
  } else if (typeof ordersDayOffset !== 'undefined') {
    currentExportDayOffset = ordersDayOffset;
  } else {
    currentExportDayOffset = 0;
  }

  const modal = document.getElementById('export-excel-modal');
  if (!modal) return;

  renderExportExcelModalContent();
  modal.classList.add('active');
}

function closeExportExcelModal() {
  const modal = document.getElementById('export-excel-modal');
  if (modal) modal.classList.remove('active');
}

function setExportExcelDayOffset(change) {
  if (change === 0) currentExportDayOffset = 0;
  else currentExportDayOffset += change;
  renderExportExcelModalContent();
}

function renderExportExcelModalContent() {
  const dayData = getDayOrdersDataForExcel(currentExportDayOffset);

  const rangeTitle = document.getElementById('export-excel-week-range');
  if (rangeTitle) {
    let dayDesc = 'Today';
    if (currentExportDayOffset === -1) dayDesc = 'Yesterday';
    else if (currentExportDayOffset === 1) dayDesc = 'Tomorrow';
    else if (currentExportDayOffset < -1) dayDesc = Math.abs(currentExportDayOffset) + ' Days Ago';
    else if (currentExportDayOffset > 1) dayDesc = 'In ' + currentExportDayOffset + ' Days';

    rangeTitle.innerHTML = '<span style="font-size:0.8rem; font-weight:600; color:#10b981; margin-right:4px;">' + dayDesc + ':</span> ' +
      dayData.dayName + ', ' + dayData.formattedDate +
      ' <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">[' + dayData.sheetKey + ']</span>';
  }

  const container = document.getElementById('export-excel-days-summary');
  if (!container) return;

  let html = '';

  // Summary Metrics Bar
  html += '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 0.85rem;">' +
    '<div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; text-align: center;">' +
      '<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">Customers</div>' +
      '<div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">' + dayData.customers.length + '</div>' +
    '</div>' +
    '<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.5rem; text-align: center;">' +
      '<div style="font-size: 0.72rem; color: #047857; font-weight: 700;">Small (400)</div>' +
      '<div style="font-size: 1.15rem; font-weight: 800; color: #065f46; margin-top: 2px;">' + dayData.totalSmall + '</div>' +
    '</div>' +
    '<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.5rem; text-align: center;">' +
      '<div style="font-size: 0.72rem; color: #1d4ed8; font-weight: 700;">Standard (ST)</div>' +
      '<div style="font-size: 1.15rem; font-weight: 800; color: #1e40af; margin-top: 2px;">' + dayData.totalStd + '</div>' +
    '</div>' +
    '<div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.5rem; text-align: center;">' +
      '<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">Total Meals</div>' +
      '<div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">' + dayData.totalMeals + '</div>' +
    '</div>' +
  '</div>';

  // Customer List Preview Table
  html += '<div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px;">' +
    '<table style="width: 100%; border-collapse: collapse; font-size: 0.76rem; text-align: left;">' +
      '<thead style="background: var(--bg-surface); position: sticky; top: 0; z-index: 1; border-bottom: 1px solid var(--border-color);">' +
        '<tr>' +
          '<th style="padding: 6px 8px; font-weight: 700;">NAME</th>' +
          '<th style="padding: 6px 8px; font-weight: 700;">PHONE</th>' +
          '<th style="padding: 6px 8px; font-weight: 700;">SPECIAL</th>' +
          '<th style="padding: 6px 8px; font-weight: 700; text-align: center;">400</th>' +
          '<th style="padding: 6px 8px; font-weight: 700; text-align: center;">ST</th>' +
          '<th style="padding: 6px 8px; font-weight: 700;">ADD</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  if (dayData.customers.length === 0) {
    html += '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">No orders scheduled for this day</td></tr>';
  } else {
    dayData.customers.forEach((c, idx) => {
      const bg = idx % 2 === 1 ? 'background: rgba(0,0,0,0.02);' : '';
      html += '<tr style="' + bg + ' border-bottom: 1px solid var(--border-light);">' +
        '<td style="padding: 5px 8px; font-weight: 600;">' + c.name + '</td>' +
        '<td style="padding: 5px 8px; color: var(--text-muted); white-space: nowrap;">' + (c.phone || '-') + '</td>' +
        '<td style="padding: 5px 8px; color: #b45309; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (c.special || '-') + '</td>' +
        '<td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #047857;">' + (c.smallCount > 0 ? c.smallCount : '') + '</td>' +
        '<td style="padding: 5px 8px; text-align: center; font-weight: 700; color: #1d4ed8;">' + (c.standardCount > 0 ? c.standardCount : '') + '</td>' +
        '<td style="padding: 5px 8px; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + (c.address || '') + '">' + (c.address || '-') + '</td>' +
      '</tr>';
    });
  }

  html += '</tbody></table></div>';

  container.innerHTML = html;
}

/**
 * Direct Print Option: Renders 1:1 table for current day's browser print preview
 */
function printDailyOrdersFromModal() {
  const dayData = getDayOrdersDataForExcel(currentExportDayOffset);

  let printHtml = '<!DOCTYPE html><html><head><title>Daily Delivery Sheet - ' + dayData.dateStr + '</title>' +
    '<style>' +
      '@page { size: A4 portrait; margin: 12mm 10mm; }' +
      'body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; }' +
      'h2 { margin: 0 0 4px 0; font-size: 16px; text-align: center; }' +
      '.day-sub { text-align: center; font-size: 11px; margin-bottom: 12px; color: #444; }' +
      'table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }' +
      'th, td { border: 1px solid #000; padding: 5px 6px; }' +
      'th { background: #f2f2f2; text-align: center; font-weight: bold; }' +
      '.center { text-align: center; }' +
      '.right { text-align: right; }' +
      '.total-row { font-weight: bold; background: #fafafa; }' +
    '</style></head><body>' +
    '<h2>' + dayData.dayName.toUpperCase() + ' (' + dayData.sheetKey + ') - DAILY DELIVERY SHEET</h2>' +
    '<div class="day-sub">Date: ' + dayData.dateStr + ' (' + dayData.formattedDate + ') | Total Meals: ' + dayData.totalMeals + ' (Small: ' + dayData.totalSmall + ', Standard: ' + dayData.totalStd + ')</div>' +
    '<table>' +
      '<thead>' +
        '<tr>' +
          '<th style="width: 18%;">NAME</th>' +
          '<th style="width: 14%;">PHONE</th>' +
          '<th style="width: 20%;">SPECIAL</th>' +
          '<th style="width: 8%;">400</th>' +
          '<th style="width: 8%;">ST</th>' +
          '<th style="width: 32%;">ADD</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  if (dayData.customers.length === 0) {
    printHtml += '<tr><td colspan="6" class="center" style="padding: 24px; color:#666;">No delivery orders for this day</td></tr>';
  } else {
    dayData.customers.forEach(c => {
      printHtml += '<tr>' +
        '<td>' + c.name + '</td>' +
        '<td>' + c.phone + '</td>' +
        '<td>' + (c.special || '-') + '</td>' +
        '<td class="center">' + (c.smallCount > 0 ? c.smallCount : '') + '</td>' +
        '<td class="center">' + (c.standardCount > 0 ? c.standardCount : '') + '</td>' +
        '<td>' + (c.address || '-') + '</td>' +
      '</tr>';
    });
  }

  printHtml += '<tr class="total-row">' +
        '<td colspan="3" class="right">TOTAL:</td>' +
        '<td class="center">' + dayData.totalSmall + '</td>' +
        '<td class="center">' + dayData.totalStd + '</td>' +
        '<td class="center">Total: ' + dayData.totalMeals + '</td>' +
      '</tr>' +
    '</tbody>' +
  '</table>' +
  '<script>window.onload = function() { window.print(); };</script></body></html>';

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
  } else {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Popup blocked. Please allow popups to print.', 'warning');
    }
  }
}
