/* Simplest - Kitchen Preparation Controller */

let kitchenDayOffset = 0; // 0 = Today, -1 = Yesterday, +1 = Tomorrow

function initKitchenView() {
  renderKitchen();
}

function setKitchenDayOffset(offsetChange) {
  if (offsetChange === 0) kitchenDayOffset = 0;
  else kitchenDayOffset += offsetChange;
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

  const weekTitleEl = document.getElementById('kitchen-week-title');
  const weekRangeEl = document.getElementById('kitchen-week-range');

  let labelText = "Today's Kitchen Prep";
  if (kitchenDayOffset === -1) labelText = "Yesterday's Kitchen Prep";
  else if (kitchenDayOffset === 1) labelText = "Tomorrow's Kitchen Prep";
  else if (kitchenDayOffset < -1) labelText = `${Math.abs(kitchenDayOffset)} Days Ago Kitchen Prep`;
  else if (kitchenDayOffset > 1) labelText = `In ${kitchenDayOffset} Days Kitchen Prep`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${dayName}, ${formattedDate}`;

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
  const totalMealsHeaderEl = document.getElementById('kitchen-total-weekly-meals');
  if (!container) return;

  container.innerHTML = '';

  const allOrders = Object.values(cachedOrders || {});
  const menuObj = dbGetMenuByDate(dateStr);
  const dayOrders = allOrders.filter(ord => ord.date === dateStr);
  
  let dayMealsTotal = 0;
  let dayStdTotal = 0;
  let daySmlTotal = 0;

  dayOrders.forEach(ord => {
    const q = parseInt(ord.quantity) || 0;
    dayMealsTotal += q;
    if (ord.portion === 'Small') {
      daySmlTotal += q;
    } else {
      dayStdTotal += q;
    }
  });

  const foodName = menuObj ? menuObj.foodName : (dayOrders.length > 0 ? dayOrders[0].foodName : 'No Menu Set');

  const cardHtml = `
    <div class="kitchen-card single-day-kitchen-card" style="max-width: 580px; margin: 0 auto; width: 100%;">
      <div class="kitchen-day-header" style="padding: 0.85rem 1.15rem;">
        <span class="day-badge" style="font-size: 0.825rem; padding: 0.25rem 0.65rem;">${dayName}</span>
        <span class="day-date" style="font-size: 0.9rem; font-weight: 700;">${formattedDate}</span>
      </div>
      
      <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); line-height: 1.3; margin: 0.5rem 0 0.85rem 0; text-align: center;">
        ${foodName}
      </div>

      <div class="kitchen-meal-box" style="padding: 1.5rem 1rem; margin-bottom: 1.15rem;">
        <div class="kitchen-meal-val" style="font-size: 3rem;">${dayMealsTotal}</div>
        <div class="kitchen-meal-lbl" style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.85rem;">Meals To Prepare</div>
        <div class="kitchen-portion-breakdown" style="gap: 0.65rem;">
          <span class="kitchen-portion-pill standard" style="font-size: 0.85rem; padding: 0.4rem 0.85rem;">🍱 Standard: ${dayStdTotal}</span>
          <span class="kitchen-portion-pill small" style="font-size: 0.85rem; padding: 0.4rem 0.85rem;">🥣 Small: ${daySmlTotal}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
        <span>Total Customer Orders: ${dayOrders.length}</span>
        <span>${dateStr}</span>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', cardHtml);

  if (totalMealsHeaderEl) {
    totalMealsHeaderEl.textContent = `${dayMealsTotal} Meals Today (Std: ${dayStdTotal}, Sml: ${daySmlTotal})`;
  }
}

