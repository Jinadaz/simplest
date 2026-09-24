/* Simplest - Database Helper (Firebase Realtime Database & Hybrid Local Engine) */

// Cache objects for reactive UI updates
let cachedMenus = {};
let cachedContacts = {};
let cachedOrders = {};
let cachedPricing = { standard: 12.00, small: 9.00 };

let dbListeners = [];
let isDbInitialized = false;

/**
 * Register data change callback
 */
function onDataChanged(callback) {
  dbListeners.push(callback);
}

function notifyDataChanged() {
  dbListeners.forEach(cb => cb({ 
    menus: cachedMenus, 
    contacts: cachedContacts, 
    orders: cachedOrders,
    pricing: cachedPricing 
  }));
}

/**
 * Initialize Database & Seed Default Data if empty
 */
async function initDatabase() {
  if (isFirebaseLive && db) {
    if (!auth || !auth.currentUser) {
      console.log('[DB] Waiting for user authentication before attaching RTDB listeners...');
      return;
    }

    if (isDbInitialized) return;
    isDbInitialized = true;

    console.log('[DB] Attaching Firebase Realtime Database listeners...');

    db.ref('menus').on('value', (snapshot) => {
      cachedMenus = snapshot.val() || {};
      notifyDataChanged();
    });

    db.ref('contacts').on('value', (snapshot) => {
      cachedContacts = snapshot.val() || {};
      notifyDataChanged();
    });

    db.ref('orders').on('value', (snapshot) => {
      cachedOrders = snapshot.val() || {};
      notifyDataChanged();
    });

    db.ref('settings/pricing').on('value', (snapshot) => {
      const val = snapshot.val();
      if (val && (val.standard !== undefined || val.small !== undefined)) {
        cachedPricing = {
          standard: parseFloat(val.standard) || 12.00,
          small: parseFloat(val.small) || 9.00
        };
      }
      notifyDataChanged();
    });

    // Clean state: Listeners attached, no auto-seeding for live user database
    console.log('[DB] Realtime Database listeners active and connected.');
  } else {
    // LocalStorage fallback engine
    if (isDbInitialized) return;
    isDbInitialized = true;

    const localMenus = localStorage.getItem('simplest_menus');
    const localContacts = localStorage.getItem('simplest_contacts');
    const localOrders = localStorage.getItem('simplest_orders');
    const localPricing = localStorage.getItem('simplest_pricing');

    if (localPricing) {
      try {
        const parsed = JSON.parse(localPricing);
        cachedPricing = {
          standard: parseFloat(parsed.standard) || 12.00,
          small: parseFloat(parsed.small) || 9.00
        };
      } catch (e) {
        cachedPricing = { standard: 12.00, small: 9.00 };
      }
    } else {
      cachedPricing = { standard: 12.00, small: 9.00 };
      localStorage.setItem('simplest_pricing', JSON.stringify(cachedPricing));
    }

    if (!localMenus || !localContacts) {
      console.log('[DB] Seeding default initial data to Local Storage');
      cachedMenus = {};
      cachedContacts = {};
      cachedOrders = {};

      await seedInitialData((path, data) => {
        if (path === 'menus') cachedMenus = data;
        if (path === 'contacts') cachedContacts = data;
        if (path === 'orders') cachedOrders = data;
      });

      saveToLocalStorage();
    } else {
      cachedMenus = JSON.parse(localMenus || '{}');
      cachedContacts = JSON.parse(localContacts || '{}');
      cachedOrders = JSON.parse(localOrders || '{}');
    }
    notifyDataChanged();
  }
}

function saveToLocalStorage() {
  localStorage.setItem('simplest_menus', JSON.stringify(cachedMenus));
  localStorage.setItem('simplest_contacts', JSON.stringify(cachedContacts));
  localStorage.setItem('simplest_orders', JSON.stringify(cachedOrders));
  localStorage.setItem('simplest_pricing', JSON.stringify(cachedPricing));
  notifyDataChanged();
}

/**
 * Seed Sample Menus, Contacts & Orders for current week
 */
async function seedInitialData(saveFn) {
  const currentWeek = getWeekDays(0);

  const createFoodSVG = (title, color1, color2) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}"/>
          <stop offset="100%" stop-color="${color2}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#g)"/>
      <circle cx="200" cy="150" r="80" fill="#ffffff" opacity="0.25"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="bold">🥗 ${title}</text>
      <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="16" opacity="0.9">Fresh &amp; Healthy Meal</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  };

  const sampleMenus = {
    [currentWeek[0].dateStr]: {
      date: currentWeek[0].dateStr,
      day: "Monday",
      foodName: "Grilled Chicken Rice Bowl",
      image: createFoodSVG("Grilled Chicken", "#10b981", "#059669"),
      price: 12.00,
      calories: 480,
      protein: 35,
      carbs: 42,
      description: "Grilled tender chicken breast with brown rice, broccoli and carrot.",
      available: true,
      remark: "Best Seller",
      updatedAt: Date.now()
    },
    [currentWeek[1].dateStr]: {
      date: currentWeek[1].dateStr,
      day: "Tuesday",
      foodName: "Salmon Quinoa Bowl",
      image: createFoodSVG("Salmon Quinoa", "#f59e0b", "#d97706"),
      price: 15.00,
      calories: 520,
      protein: 38,
      carbs: 38,
      description: "Pan-seared salmon fillet with high-protein quinoa and avocado salad.",
      available: true,
      remark: "High Omega-3",
      updatedAt: Date.now()
    },
    [currentWeek[2].dateStr]: {
      date: currentWeek[2].dateStr,
      day: "Wednesday",
      foodName: "Beef Black Pepper Rice",
      image: createFoodSVG("Black Pepper Beef", "#ef4444", "#dc2626"),
      price: 14.00,
      calories: 540,
      protein: 36,
      carbs: 45,
      description: "Lean beef stir-fry with black pepper sauce and steamed multigrain rice.",
      available: true,
      remark: "",
      updatedAt: Date.now()
    },
    [currentWeek[3].dateStr]: {
      date: currentWeek[3].dateStr,
      day: "Thursday",
      foodName: "Honey Soy Tofu & Veggies",
      image: createFoodSVG("Honey Soy Tofu", "#8b5cf6", "#7c3aed"),
      price: 11.00,
      calories: 410,
      protein: 24,
      carbs: 48,
      description: "Organic grilled tofu with honey soy glaze and roasted zucchini.",
      available: true,
      remark: "Vegetarian",
      updatedAt: Date.now()
    },
    [currentWeek[4].dateStr]: {
      date: currentWeek[4].dateStr,
      day: "Friday",
      foodName: "Herb Roasted Chicken Salad",
      image: createFoodSVG("Herb Roasted Chicken", "#06b6d4", "#0891b2"),
      price: 13.00,
      calories: 430,
      protein: 37,
      carbs: 22,
      description: "Juicy herb marinated chicken breast served over garden salad bowl.",
      available: true,
      remark: "Low Carb",
      updatedAt: Date.now()
    }
  };

  const sampleContacts = {
    "ct_101": {
      name: "Sarah Lee",
      phone: "012-3456789",
      company: "ABC Company",
      address: "Level 12, Tower A, Bangsar South",
      remark: "No spicy, low salt",
      createdAt: Date.now()
    },
    "ct_102": {
      name: "John Tan",
      phone: "016-9876543",
      company: "XYZ Tech",
      address: "Unit 5-2, Block B, Cyberia",
      remark: "Call upon arrival",
      createdAt: Date.now()
    },
    "ct_103": {
      name: "Michelle Wong",
      phone: "019-2233445",
      company: "Global Logistics",
      address: "Suite 88, Menara Public",
      remark: "Extra dressing please",
      createdAt: Date.now()
    }
  };

  const sampleOrders = {
    "ord_201": {
      contactId: "ct_101",
      customerName: "Sarah Lee",
      customerPhone: "012-3456789",
      date: currentWeek[0].dateStr,
      day: "Monday",
      menuId: currentWeek[0].dateStr,
      foodName: sampleMenus[currentWeek[0].dateStr].foodName,
      unitPrice: 12.00,
      quantity: 3,
      totalAmount: 36.00,
      paymentStatus: "Paid",
      orderStatus: "Confirmed",
      remark: "No spicy",
      createdAt: Date.now() - 3600000 * 24
    },
    "ord_202": {
      contactId: "ct_102",
      customerName: "John Tan",
      customerPhone: "016-9876543",
      date: currentWeek[0].dateStr,
      day: "Monday",
      menuId: currentWeek[0].dateStr,
      foodName: sampleMenus[currentWeek[0].dateStr].foodName,
      unitPrice: 12.00,
      quantity: 2,
      totalAmount: 24.00,
      paymentStatus: "Unpaid",
      orderStatus: "Confirmed",
      remark: "",
      createdAt: Date.now() - 3600000 * 20
    },
    "ord_203": {
      contactId: "ct_103",
      customerName: "Michelle Wong",
      customerPhone: "019-2233445",
      date: currentWeek[1].dateStr,
      day: "Tuesday",
      menuId: currentWeek[1].dateStr,
      foodName: sampleMenus[currentWeek[1].dateStr].foodName,
      unitPrice: 15.00,
      quantity: 2,
      totalAmount: 30.00,
      paymentStatus: "Paid",
      orderStatus: "Confirmed",
      remark: "Extra dressing",
      createdAt: Date.now() - 3600000 * 12
    }
  };

  await saveFn('menus', sampleMenus);
  await saveFn('contacts', sampleContacts);
  await saveFn('orders', sampleOrders);
}

// Menu DB Actions
async function dbSaveMenu(dateStr, menuData) {
  const record = { ...menuData, updatedAt: Date.now() };
  cachedMenus[dateStr] = record;
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref(`menus/${dateStr}`).set(record);
  } else {
    saveToLocalStorage();
  }
}

function dbGetMenuByDate(dateStr) {
  return cachedMenus[dateStr] || null;
}

// Contact DB Actions
async function dbAddContact(contactData) {
  const contactId = 'ct_' + Date.now();
  const record = { ...contactData, id: contactId, createdAt: Date.now() };

  cachedContacts[contactId] = record;
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref(`contacts/${contactId}`).set(record);
  } else {
    saveToLocalStorage();
  }
  return contactId;
}

async function dbUpdateContact(contactId, contactData) {
  if (cachedContacts[contactId]) {
    cachedContacts[contactId] = { ...cachedContacts[contactId], ...contactData, updatedAt: Date.now() };
    notifyDataChanged();
  }

  if (isFirebaseLive && db) {
    await db.ref(`contacts/${contactId}`).update({ ...contactData, updatedAt: Date.now() });
  } else {
    saveToLocalStorage();
  }
}

async function dbDeleteContact(contactId) {
  delete cachedContacts[contactId];
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref(`contacts/${contactId}`).remove();
  } else {
    saveToLocalStorage();
  }
}

// Order DB Actions
async function dbAddOrder(orderData) {
  const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const record = {
    ...orderData,
    orderId,
    createdAt: Date.now()
  };

  cachedOrders[orderId] = record;
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref(`orders/${orderId}`).set(record);
  } else {
    saveToLocalStorage();
  }
  return orderId;
}

async function dbUpdatePaymentStatus(orderId, paymentStatus) {
  const updates = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;

  if (cachedOrders[orderId]) {
    cachedOrders[orderId] = { ...cachedOrders[orderId], ...updates };
    notifyDataChanged();
  }

  if (isFirebaseLive && db) {
    await db.ref(`orders/${orderId}`).update(updates);
  } else {
    saveToLocalStorage();
  }
}

// Backwards-compatible alias
const dbUpdateOrderStatus = dbUpdatePaymentStatus;

async function dbDeleteOrder(orderId) {
  delete cachedOrders[orderId];
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref(`orders/${orderId}`).remove();
  } else {
    saveToLocalStorage();
  }
}

// Pricing Settings Actions
function dbGetPricing() {
  return cachedPricing || { standard: 12.00, small: 9.00 };
}

async function dbSavePricing(pricing) {
  cachedPricing = {
    standard: parseFloat(pricing.standard) || 12.00,
    small: parseFloat(pricing.small) || 9.00,
    updatedAt: Date.now()
  };
  notifyDataChanged();

  if (isFirebaseLive && db) {
    await db.ref('settings/pricing').set(cachedPricing);
  } else {
    saveToLocalStorage();
  }
  return cachedPricing;
}
