/**
 * Simplest - Thermal Receipt Printer Utility (80mm POS-MAC CP-Q3)
 * Features:
 * - Dedicated Large Window Modal with checkboxes, search, and rider filter
 * - High-contrast thermal printing, pure black solid typography
 * - Brand logo integration
 * - Rider name displayed on every receipt
 * - Clean portions layout (no item breakdown)
 * - Auto-cut between receipts via CSS page breaks
 */

let cachedReceiptLogoDataUrl = 'icons/logo.png';
let receiptModalDayOffset = 0;
let receiptModalSearchQuery = '';
let receiptModalRiderFilter = 'All';
let receiptModalSelectedKeys = new Set();
let currentModalCustomersList = [];

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
 * Open the dedicated large receipt printer modal
 */
function openReceiptPrinterModal(dayOffset) {
  receiptModalDayOffset = (typeof dayOffset === 'number') 
    ? dayOffset 
    : (typeof ordersDayOffset !== 'undefined' ? ordersDayOffset : 0);

  receiptModalSearchQuery = '';
  receiptModalRiderFilter = 'All';

  const modal = document.getElementById('receipt-printer-modal');
  if (!modal) return;

  const searchInput = document.getElementById('receipt-modal-search');
  if (searchInput) searchInput.value = '';

  // Pre-select all orders for this day by default
  initReceiptSelectionForCurrentDay();

  renderReceiptPrinterModal();
  modal.classList.add('active');
}

/**
 * Close the dedicated large receipt printer modal
 */
function closeReceiptPrinterModal() {
  const modal = document.getElementById('receipt-printer-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Change day in the modal
 */
function setReceiptDayOffset(change) {
  if (change === 0) receiptModalDayOffset = 0;
  else receiptModalDayOffset += change;

  initReceiptSelectionForCurrentDay();
  renderReceiptPrinterModal();
}

/**
 * Initialize selection set with all customers of current day
 */
function initReceiptSelectionForCurrentDay() {
  receiptModalSelectedKeys.clear();
  if (typeof getDayOrdersDataForExcel === 'function') {
    const dayData = getDayOrdersDataForExcel(receiptModalDayOffset);
    if (dayData && dayData.customers) {
      dayData.customers.forEach((c, idx) => {
        const key = c.contactId || (c.name + '_' + c.phone + '_' + idx);
        receiptModalSelectedKeys.add(key);
      });
    }
  }
}

/**
 * Search input handler
 */
function handleReceiptSearchInput(val) {
  receiptModalSearchQuery = (val || '').trim().toLowerCase();
  renderReceiptCustomerListOnly();
}

/**
 * Rider filter dropdown handler
 */
function handleReceiptRiderFilterChange(val) {
  receiptModalRiderFilter = val || 'All';
  renderReceiptCustomerListOnly();
}

/**
 * Toggle select all or deselect all
 */
function toggleAllReceiptsSelection(selectAll) {
  const visibleCustomers = getFilteredReceiptCustomers();
  visibleCustomers.forEach(c => {
    const key = c._key;
    if (selectAll) {
      receiptModalSelectedKeys.add(key);
    } else {
      receiptModalSelectedKeys.delete(key);
    }
  });

  renderReceiptCustomerListOnly();
}

/**
 * Toggle individual customer checkbox
 */
function toggleCustomerReceiptKey(key, evt) {
  if (evt) evt.stopPropagation();
  if (receiptModalSelectedKeys.has(key)) {
    receiptModalSelectedKeys.delete(key);
  } else {
    receiptModalSelectedKeys.add(key);
  }
  renderReceiptCustomerListOnly();
}

/**
 * Get customers filtered by search and rider
 */
function getFilteredReceiptCustomers() {
  if (!currentModalCustomersList) return [];
  return currentModalCustomersList.filter(c => {
    // Rider filter
    if (receiptModalRiderFilter !== 'All') {
      const cRider = (c.riderName || '').trim();
      if (receiptModalRiderFilter === 'Unassigned') {
        if (cRider) return false;
      } else {
        if (cRider.toLowerCase() !== receiptModalRiderFilter.toLowerCase()) return false;
      }
    }

    // Search query
    if (receiptModalSearchQuery) {
      const q = receiptModalSearchQuery;
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      const matchAddr = (c.address || '').toLowerCase().includes(q);
      const matchRider = (c.riderName || '').toLowerCase().includes(q);
      const matchSpecial = (c.special || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchAddr && !matchRider && !matchSpecial) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Full render of modal contents including date header and rider options
 */
function renderReceiptPrinterModal() {
  if (typeof getDayOrdersDataForExcel !== 'function') return;

  const dayData = getDayOrdersDataForExcel(receiptModalDayOffset);

  // Update date header
  const titleEl = document.getElementById('receipt-modal-date-title');
  const subEl = document.getElementById('receipt-modal-date-sub');
  if (titleEl) {
    let dayDesc = 'Today';
    if (receiptModalDayOffset === -1) dayDesc = 'Yesterday';
    else if (receiptModalDayOffset === 1) dayDesc = 'Tomorrow';
    else if (receiptModalDayOffset < -1) dayDesc = Math.abs(receiptModalDayOffset) + ' Days Ago';
    else if (receiptModalDayOffset > 1) dayDesc = 'In ' + receiptModalDayOffset + ' Days';

    titleEl.innerHTML = `<span style="color:#2563eb; margin-right:4px;">${dayDesc}:</span> ${dayData.dayName}, ${dayData.formattedDate}`;
  }
  if (subEl) {
    subEl.textContent = `Total Orders: ${dayData.customers.length} | Meals: ${dayData.totalMeals} (Small: ${dayData.totalSmall}, Std: ${dayData.totalStd})`;
  }

  // Attach keys to customers
  currentModalCustomersList = (dayData.customers || []).map((c, idx) => ({
    ...c,
    _key: c.contactId || (c.name + '_' + c.phone + '_' + idx),
    _originalIndex: idx
  }));

  // Populate rider dropdown
  const riderSelect = document.getElementById('receipt-rider-filter-select');
  if (riderSelect) {
    const ridersSet = new Set();
    currentModalCustomersList.forEach(c => {
      if (c.riderName && c.riderName.trim()) {
        ridersSet.add(c.riderName.trim());
      }
    });

    const currentVal = receiptModalRiderFilter;
    let optionsHtml = '<option value="All">All Riders</option>';
    Array.from(ridersSet).sort().forEach(r => {
      optionsHtml += `<option value="${escapeReceiptXml(r)}">🛵 ${escapeReceiptXml(r)}</option>`;
    });
    optionsHtml += '<option value="Unassigned">⚠️ Unassigned</option>';
    riderSelect.innerHTML = optionsHtml;

    if (Array.from(riderSelect.options).some(o => o.value === currentVal)) {
      riderSelect.value = currentVal;
    } else {
      riderSelect.value = 'All';
      receiptModalRiderFilter = 'All';
    }
  }

  renderReceiptCustomerListOnly();
}

/**
 * Render customer list inside container and update summary footer
 */
function renderReceiptCustomerListOnly() {
  const container = document.getElementById('receipt-modal-list-container');
  if (!container) return;

  const filteredCustomers = getFilteredReceiptCustomers();
  const allCount = currentModalCustomersList.length;
  const selectedCount = Array.from(receiptModalSelectedKeys).length;

  let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left;">
      <thead style="background: var(--bg-surface); position: sticky; top: 0; z-index: 2; border-bottom: 2px solid var(--border-color);">
        <tr>
          <th style="padding: 8px 10px; width: 44px; text-align: center;">
            <input type="checkbox" id="receipt-modal-header-chk"
              onchange="toggleAllReceiptsSelection(this.checked)"
              style="width: 16px; height: 16px; cursor: pointer; vertical-align: middle;">
          </th>
          <th style="padding: 8px 10px; font-weight: 800; min-width: 180px;">CUSTOMER INFO</th>
          <th style="padding: 8px 10px; font-weight: 800; min-width: 110px;">RIDER</th>
          <th style="padding: 8px 10px; font-weight: 800; min-width: 130px;">PORTIONS</th>
          <th style="padding: 8px 10px; font-weight: 800;">SPECIAL REMARKS</th>
          <th style="padding: 8px 10px; font-weight: 800; text-align: center; width: 75px;">ACTION</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (filteredCustomers.length === 0) {
    html += `
      <tr>
        <td colspan="6" style="padding: 36px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          ${allCount === 0 ? 'No orders scheduled for this day.' : 'No orders matched your search or filter.'}
        </td>
      </tr>
    `;
  } else {
    filteredCustomers.forEach((c, idx) => {
      const isSelected = receiptModalSelectedKeys.has(c._key);
      const bg = isSelected ? 'background: rgba(37, 99, 235, 0.04);' : (idx % 2 === 1 ? 'background: rgba(0,0,0,0.015);' : '');
      const riderBadge = c.riderName 
        ? `<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700; font-size:0.75rem; padding:2px 8px; border-radius:12px;">🛵 ${escapeReceiptXml(c.riderName)}</span>`
        : `<span class="badge" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; font-weight:600; font-size:0.72rem; padding:2px 6px; border-radius:12px;">— Unassigned</span>`;

      let portionBadges = '';
      if (c.smallCount > 0) {
        portionBadges += `<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:800; font-size:0.72rem; padding:2px 6px; border-radius:6px; margin-right:4px;">Small × ${c.smallCount}</span>`;
      }
      if (c.standardCount > 0) {
        portionBadges += `<span class="badge" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:800; font-size:0.72rem; padding:2px 6px; border-radius:6px; margin-right:4px;">Std × ${c.standardCount}</span>`;
      }
      if (!c.smallCount && !c.standardCount) {
        portionBadges += `<span class="badge" style="background:#f8fafc; color:#475569; border:1px solid #e2e8f0; font-weight:700; font-size:0.72rem; padding:2px 6px; border-radius:6px; margin-right:4px;">Meals × ${c.totalMeals}</span>`;
      }

      html += `
        <tr style="${bg} border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.15s ease;"
            onclick="toggleCustomerReceiptKey('${c._key}', event)">
          <td style="padding: 8px 10px; text-align: center;" onclick="event.stopPropagation()">
            <input type="checkbox"
              ${isSelected ? 'checked' : ''}
              onchange="toggleCustomerReceiptKey('${c._key}', event)"
              style="width: 17px; height: 17px; cursor: pointer; vertical-align: middle;">
          </td>
          <td style="padding: 8px 10px;">
            <div style="font-weight: 800; color: var(--text-main); font-size: 0.9rem;">${escapeReceiptXml(c.name)}</div>
            <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 1px;">📞 ${escapeReceiptXml(c.phone || '-')}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeReceiptXml(c.address || '')}">
              📍 ${escapeReceiptXml(c.address || 'No Address')}
            </div>
          </td>
          <td style="padding: 8px 10px;">
            ${riderBadge}
          </td>
          <td style="padding: 8px 10px;">
            <div style="display: flex; flex-wrap: wrap; gap: 3px; align-items: center;">
              ${portionBadges}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; margin-top: 3px;">
              Total: ${c.totalMeals} meal${c.totalMeals > 1 ? 's' : ''}
            </div>
          </td>
          <td style="padding: 8px 10px; color: #b45309; font-weight: 600; font-size: 0.76rem; max-width: 180px;">
            ${c.special ? escapeReceiptXml(c.special) : '<span style="color:var(--text-muted); font-weight:normal;">—</span>'}
          </td>
          <td style="padding: 8px 10px; text-align: center;" onclick="event.stopPropagation()">
            <button type="button" class="btn btn-outline btn-sm" onclick="printSingleCustomerReceiptFromModal('${c._key}')"
              style="padding: 3px 8px; font-size: 0.72rem; border-color: #2563eb; color: #1d4ed8; background: #eff6ff; font-weight: 700; border-radius: 6px; cursor: pointer;"
              title="Print single thermal receipt with auto-cut">
              🖨️ Print
            </button>
          </td>
        </tr>
      `;
    });
  }

  html += `</tbody></table>`;
  container.innerHTML = html;

  // Update header master checkbox state
  const headerChk = document.getElementById('receipt-modal-header-chk');
  if (headerChk && filteredCustomers.length > 0) {
    const visibleSelectedCount = filteredCustomers.filter(c => receiptModalSelectedKeys.has(c._key)).length;
    headerChk.checked = (visibleSelectedCount === filteredCustomers.length);
    headerChk.indeterminate = (visibleSelectedCount > 0 && visibleSelectedCount < filteredCustomers.length);
  }

  // Update footer summary
  const summaryEl = document.getElementById('receipt-modal-selected-summary');
  const footerCountEl = document.getElementById('receipt-footer-count');
  const printBtn = document.getElementById('btn-modal-print-selected');

  const selectedCustomers = currentModalCustomersList.filter(c => receiptModalSelectedKeys.has(c._key));
  const selectedMealsCount = selectedCustomers.reduce((acc, c) => acc + (c.totalMeals || 0), 0);

  if (summaryEl) {
    summaryEl.innerHTML = `Selected: <span style="color:#2563eb;">${selectedCustomers.length}</span> of ${allCount} orders (<span style="color:#059669;">${selectedMealsCount} total meals</span>)`;
  }
  if (footerCountEl) {
    footerCountEl.textContent = selectedCustomers.length;
  }
  if (printBtn) {
    printBtn.disabled = (selectedCustomers.length === 0);
    printBtn.style.opacity = (selectedCustomers.length === 0) ? '0.6' : '1';
  }
}

/**
 * Print all currently selected customers from the large modal
 */
function printSelectedReceiptsFromModal() {
  const selectedCustomers = currentModalCustomersList.filter(c => receiptModalSelectedKeys.has(c._key));

  if (!selectedCustomers || selectedCustomers.length === 0) {
    if (typeof showMaterialToast === 'function') {
      showMaterialToast('Please select at least one order to print.', 'warning');
    } else {
      alert('Please select at least one order to print.');
    }
    return;
  }

  const dayData = getDayOrdersDataForExcel(receiptModalDayOffset);

  const ticketsHtml = selectedCustomers.map((c, seqIdx) => 
    generateReceiptTicketHtml(c, seqIdx, selectedCustomers.length, dayData)
  ).join('');

  const fullHtml = buildReceiptDocumentHtml(ticketsHtml, `Simplest Delivery Receipts - ${dayData.dateStr} (${selectedCustomers.length} Orders)`);

  openPrintWindow(fullHtml);
}

/**
 * Print single customer from large modal
 */
function printSingleCustomerReceiptFromModal(key) {
  const customer = currentModalCustomersList.find(c => c._key === key);
  if (!customer) {
    alert('Customer order not found.');
    return;
  }

  const dayData = getDayOrdersDataForExcel(receiptModalDayOffset);
  const ticketHtml = generateReceiptTicketHtml(customer, 0, 1, dayData);
  const fullHtml = buildReceiptDocumentHtml(ticketHtml, `Delivery Ticket - ${customer.name}`);

  openPrintWindow(fullHtml);
}

/**
 * Generate HTML markup for a single customer receipt ticket (80mm)
 */
function generateReceiptTicketHtml(c, index, totalCount, meta) {
  const customerName = c.name || 'Unknown';
  const customerPhone = c.phone || '-';
  const customerAddress = c.address || 'Self Pick-up / No Address';
  const customerRider = c.riderName ? c.riderName.trim() : '';
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
        <div style="font-size: 16px; font-weight: 900; color: #000; margin-top: 6px; padding-top: 4px; border-top: 1.5px dashed #000;">
          🛵 RIDER: ${escapeReceiptXml(customerRider ? customerRider : '—')}
        </div>
      </div>

      <!-- High-Contrast Section Banner: Meal Portions -->
      <div style="background: #000; color: #fff; padding: 4px 6px; font-size: 13px; font-weight: 900; text-align: center; letter-spacing: 1px; margin: 8px 0 6px 0;">
        MEAL PORTIONS &amp; QUANTITY
      </div>

      <!-- Meals Breakdown Table (No item breakdown) -->
      <div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
          <tbody>
            ${portionRows}
          </tbody>
        </table>
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
 * Direct print all thermal receipts for the specified day
 */
function printDailyThermalReceipts(dayOffset = 0) {
  openReceiptPrinterModal(dayOffset);
}

/**
 * Direct print single customer by index
 */
function printSingleCustomerThermalReceipt(customerIndex, dayOffset) {
  const currentOffset = (typeof dayOffset === 'number') 
    ? dayOffset 
    : (typeof ordersDayOffset !== 'undefined' ? ordersDayOffset : 0);

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
 * Wrapper for backward compatibility
 */
function printDailyThermalReceiptsFromModal() {
  openReceiptPrinterModal(typeof currentExportDayOffset === 'number' ? currentExportDayOffset : 0);
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

  // Resolve rider
  const riderId = ord.riderId || contact.riderId;
  const riderName = (riderId && contactsMap[riderId])
    ? contactsMap[riderId].name
    : (ord.riderName || contact.riderName || '');

  let smallCount = 0;
  let standardCount = 0;

  if (ord.items && Array.isArray(ord.items) && ord.items.length > 0) {
    ord.items.forEach(it => {
      const p = it.portion || 'Standard';
      if (p.toLowerCase() === 'small') smallCount++;
      else standardCount++;
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
    riderName: riderName,
    address: address,
    special: ord.remark || '',
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
