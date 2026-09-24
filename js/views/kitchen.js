/* Simplest - Kitchen Preparation Controller */

let kitchenWeekOffset = 0;

function initKitchenView() {
  renderKitchen();
}

function setKitchenWeekOffset(offsetChange) {
  if (offsetChange === 0) kitchenWeekOffset = 0;
  else kitchenWeekOffset += offsetChange;
  renderKitchen();
}

function renderKitchen() {
  const weekDays = getWeekDays(kitchenWeekOffset);

  const weekTitleEl = document.getElementById('kitchen-week-title');
  const weekRangeEl = document.getElementById('kitchen-week-range');

  let labelText = 'This Week Kitchen Prep';
  if (kitchenWeekOffset === -1) labelText = 'Previous Week Kitchen Prep';
  else if (kitchenWeekOffset === 1) labelText = 'Next Week Kitchen Prep';
  else if (kitchenWeekOffset < -1) labelText = `${Math.abs(kitchenWeekOffset)} Weeks Ago Kitchen Prep`;
  else if (kitchenWeekOffset > 1) labelText = `In ${kitchenWeekOffset} Weeks Kitchen Prep`;

  if (weekTitleEl) weekTitleEl.textContent = labelText;
  if (weekRangeEl) weekRangeEl.textContent = `${weekDays[0].formatted} — ${weekDays[4].formatted}`;

  const container = document.getElementById('kitchen-cards-container');
  const totalMealsHeaderEl = document.getElementById('kitchen-total-weekly-meals');
  if (!container) return;

  container.innerHTML = '';

  const allOrders = Object.values(cachedOrders || {});
  let weeklyMealsSum = 0;
  let weeklyStdSum = 0;
  let weeklySmlSum = 0;

  weekDays.forEach(dayInfo => {
    const menuObj = dbGetMenuByDate(dayInfo.dateStr);
    const dayOrders = allOrders.filter(ord => ord.date === dayInfo.dateStr);
    
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

    weeklyMealsSum += dayMealsTotal;
    weeklyStdSum += dayStdTotal;
    weeklySmlSum += daySmlTotal;

    const foodName = menuObj ? menuObj.foodName : (dayOrders.length > 0 ? dayOrders[0].foodName : 'No Menu Set');

    const cardHtml = `
      <div class="kitchen-card">
        <div class="kitchen-day-header">
          <span class="day-badge" style="font-size: 0.8rem; padding: 0.25rem 0.65rem;">${dayInfo.day}</span>
          <span class="day-date">${dayInfo.formatted}</span>
        </div>
        
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); line-height: 1.3;">
          ${foodName}
        </div>

        <div class="kitchen-meal-box">
          <div class="kitchen-meal-val">${dayMealsTotal}</div>
          <div class="kitchen-meal-lbl">Meals To Prepare</div>
          <div class="kitchen-portion-breakdown">
            <span class="kitchen-portion-pill standard">🍱 Standard: ${dayStdTotal}</span>
            <span class="kitchen-portion-pill small">🥣 Small: ${daySmlTotal}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.775rem; color: var(--text-muted); font-weight: 600;">
          <span>Orders: ${dayOrders.length}</span>
          <span>${dayInfo.dateStr}</span>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', cardHtml);
  });

  if (totalMealsHeaderEl) {
    totalMealsHeaderEl.textContent = `${weeklyMealsSum} Total Meals (Std: ${weeklyStdSum}, Sml: ${weeklySmlSum})`;
  }
}
