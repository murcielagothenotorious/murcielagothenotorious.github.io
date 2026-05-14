import { addOrder, deleteOrder, listenOrders, updateOrder, orderDelivered, orderReady, orderPaid, listenWaiterStats, setWaiterStats, listenMasters, listenCashiers, uploadReceipt } from "./orders.js";
import { monitor } from "./firebase.js";

/* =========================================
   NETWORK & ERROR MONITORING
   ========================================= */
class NetworkMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateUI();
      console.log('[Network] Back online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateUI();
      console.log('[Network] Offline');
    });

    monitor.addListener(({ connected, error }) => {
      this.updateFirebaseStatus(connected, error);
    });
  }

  updateFirebaseStatus(connected, error) {
    const badge = document.getElementById('firebase-status');
    if (!badge) return;

    if (connected) {
      badge.textContent = '🟢';
      badge.title = 'Firebase bağlantılı';
      badge.classList.remove('d-none');
    } else if (error) {
      badge.textContent = '🔴';
      badge.title = `Firebase hata: ${error.message}`;
      badge.classList.remove('d-none');
    } else {
      badge.textContent = '🟡';
      badge.title = 'Firebase bağlantı bekleniyor...';
      badge.classList.remove('d-none');
    }
  }

  updateUI() {
    const statusBadge = document.getElementById('network-status');
    if (!statusBadge) return;

    if (this.isOnline) {
      statusBadge.textContent = 'Online';
      statusBadge.classList.remove('badge-danger');
      statusBadge.classList.add('badge-success');
    } else {
      statusBadge.textContent = 'Offline';
      statusBadge.classList.remove('badge-success');
      statusBadge.classList.add('badge-danger');
    }
  }

  async tryAsync(fn, label = 'Operation') {
    try {
      if (!this.isOnline) {
        console.warn(`[Network] Offline - ${label} queued`);
        // Queue for later sync
        return null;
      }
      return await fn();
    } catch (error) {
      console.error(`[Network] ${label} failed:`, error);
      // Show user-friendly error
      this.showError(`${label} başarısız. ${this.isOnline ? 'Lütfen tekrar deneyin.' : 'İnternet bağlantısını kontrol edin.'}`);
      throw error;
    }
  }

  showError(message) {
    // Toast notification (implement based on your UI library)
    const toast = document.createElement('div');
    toast.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 10000; max-width: 300px;';
    toast.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.remove();
      }
    }, 5000);
  }
}

const networkMonitor = new NetworkMonitor();

/* =========================================
   CONSTANTS & CONFIG
   ========================================= */
const PRODUCTS = {
  "ANA YEMEKLER": [
    { name: "Branzino alla Griglia", price: 550, image: "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=400&q=80", desc: "Izgara levrek, taze otlar, limon, sızma zeytinyağı" },
    { name: "Osso Buco alla Milanese", price: 600, image: "https://images.unsplash.com/photo-1544025162812-1a20f9c146db?auto=format&fit=crop&w=400&q=80", desc: "Ağır ateşte pişmiş dana incik, safranlı risotto" },
    { name: "Bistecca Tagliata", price: 600, image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=400&q=80", desc: "Dilimlenmiş dana antrikot, taze roka, parmesan yaprakları" }
  ],
  "MAKARNALAR": [
    { name: "Istakozlu ve Safranlı Ravioli", price: 500, image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=80", desc: "El yapımı ravioli, taze ıstakoz dolgusu, safran sosu" },
    { name: "Siyah Trüf Mantarlı Cacio e Pepe", price: 500, image: "https://images.unsplash.com/photo-1621510456681-2330135e5871?auto=format&fit=crop&w=400&q=80", desc: "Taze siyah trüf mantarı, pecorino romano peyniri, karabiber" }
  ],
  "SALATALAR": [
    { name: "Izgara Şeftali ve Burrata", price: 300, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80", desc: "Taze burrata peyniri, ızgara şeftali, balzamik sirke, taze fesleğen" },
    { name: "Rezene Salatası", price: 300, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80", desc: "İnce dilimlenmiş taze rezene, portakal dilimleri, siyah zeytin, nane" }
  ],
  "TATLILAR": [
    { name: "Dekonstrüktif Tiramisu", price: 200, image: "https://images.unsplash.com/photo-1571115177098-24eb428aea8f?auto=format&fit=crop&w=400&q=80", desc: "Mascarpone köpüğü, kahve havyarı, savoiardi kıtırı" },
    { name: "Panna Cotta", price: 200, image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80", desc: "Gerçek vanilya çubuğu ile hazırlanmış panna cotta, taze orman meyveleri sosu" },
    { name: "Torta Caprese", price: 200, image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=400&q=80", desc: "Geleneksel unsuz bademli ve yoğun çikolatalı İtalyan keki" }
  ],
  "İÇECEKLER": [
    { name: "Negroni", price: 250, image: "https://images.unsplash.com/photo-1575037614876-c3859ea49d10?auto=format&fit=crop&w=400&q=80", desc: "Cin, Campari, tatlı vermut, portakal kabuğu" },
    { name: "Aperol Spritz", price: 250, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&q=80", desc: "Aperol, prosecco, soda, taze portakal dilimi" },
    { name: "Kırmızı Şarap", price: 250, image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=400&q=80", desc: "Kadeh, özel İtalyan şarap seçkisi" }
  ]
};

const SERVICE_FEE = 200;
const SERVICE_SHARE_RATIO = 0.2;
const WAITER_STORAGE_KEY = "waiterName";

// Default masters (fallback if Firebase has no data)
let MASTER_WAITERS = ["samuel pugliani", "austin marcelli", "frederick scarcelli", "serena castello"];

// Cashiers list (dynamic from Firebase)
let CASHIERS = [];

// Audio for new orders
const bellAudio = new Audio('./artifacts/bell.wav');
bellAudio.volume = 0.5;

// Sound and Theme settings
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let darkMode = localStorage.getItem('darkMode') !== 'false';

// Track order count for new order detection
let previousOrderCount = 0;

// Current view mode: 'pos' | 'kds' | 'cashier'
let currentView = 'pos';

/* =========================================
   STATE MANAGEMENT
   ========================================= */
let state = {
  cart: {}, // { "ProductName": { price: 100, qty: 2 } }
  waiterStats: {},
  orders: [],
  editingOrderId: null,
  activeWaiter: localStorage.getItem(WAITER_STORAGE_KEY) || "",
};

/* =========================================
   DOM ELEMENTS
   ========================================= */
const els = {
  categories: document.getElementById("categories"),
  // Desktop Ticket Elements
  liveCartList: document.getElementById("liveCartList"),
  subTotal: document.getElementById("subTotal"),
  totalPrice: document.getElementById("totalPrice"),
  calcName: document.getElementById("calcName"),
  saveButton: document.getElementById("saveButton"),

  // Mobile Ticket Elements
  mobileTicketItems: document.getElementById("mobile-ticket-items"),
  mobileTotalPrice: document.getElementById("mobileTotalPrice"),
  mobileCalcName: document.getElementById("mobileCalcName"),
  mobileSaveButton: document.getElementById("mobileSaveButton"),
  mobileCartBadge: document.getElementById("mobileCartBadge"),
  mobileActiveWaiter: document.getElementById("mobileActiveWaiter"),

  // Mobile Nav Buttons (for dynamic visibility if needed)
  mobileBtnKDS: document.getElementById("mobile-btn-kds"),
  mobileBtnCashier: document.getElementById("mobile-btn-cashier"),

  // Mobile Stats
  mobileWaiterOrderCount: document.getElementById("mobileWaiterOrderCount"),
  mobileWaiterServiceShare: document.getElementById("mobileWaiterServiceShare"),

  waiterNameDisplay: document.getElementById("activeWaiterName"),
  waiterRankDisplay: document.getElementById("waiterRank"),
  waiterOrderCount: document.getElementById("waiterOrderCount"),
  waiterServiceShare: document.getElementById("waiterServiceShare"),
  productSearch: document.getElementById("productSearch"),
  leaderboardList: document.getElementById("leaderboardList"),
  historyList: document.getElementById("calcList"),
  activeOrdersList: document.getElementById("activeOrdersList"),
  activeOrderBadge: document.getElementById("activeOrderBadge"),

  // Views
  posView: document.getElementById("pos-view"),
  kdsView: document.getElementById("kds-view"),
  cashierView: document.getElementById("cashier-view"),

  // Toggle buttons (Desktop)
  btnToggleKDS: document.getElementById("btn-toggle-kds"),
  btnToggleCashier: document.getElementById("btn-toggle-cashier"),

  // KDS elements
  kdsGrid: document.getElementById("kds-grid"),
  kdsClock: document.getElementById("kds-clock"),

  // Cashier elements
  cashierGrid: document.getElementById("cashier-grid"),

  // Sound & Theme
  btnSoundToggle: document.getElementById("btn-sound-toggle"),
  btnThemeToggle: document.getElementById("btn-theme-toggle"),

  // Modals
  waiterModal: new bootstrap.Modal('#waiterModal'),
  historyModal: new bootstrap.Modal('#historyModal'),
  activeOrdersModal: new bootstrap.Modal('#activeOrdersModal'),

  // Inputs
  waiterModalInput: document.getElementById("waiterModalInput"),
  waiterModalSave: document.getElementById("waiterModalSave"),
};

/* =========================================
   INITIALIZATION
   ========================================= */
function init() {
  loadProducts();
  checkAuth();
  setupEventListeners();

  // Expose switchView globally for inline onclick handlers
  window.switchView = switchView;

  // Start Listeners
  listenOrders((orders) => {
    const newOrders = orders || [];

    // Detect new order for bell sound (Kitchen ONLY - for masters)
    const activeNow = newOrders.filter(o => !o.ready && !o.delivered).length;
    const waiterLower = state.activeWaiter?.toLowerCase().trim() || '';
    const isMaster = MASTER_WAITERS.includes(waiterLower);

    // Only play bell for masters when new order arrives
    if (isMaster && activeNow > previousOrderCount && previousOrderCount >= 0) {
      playBellSound();
    }
    previousOrderCount = activeNow;

    // Detect order becoming "ready" (kitchen says it's done) - notify only the waiter who took it
    if (state.activeWaiter && state.orders.length > 0) {
      newOrders.forEach(newOrder => {
        const oldOrder = state.orders.find(o => o.id === newOrder.id);
        // Check if order just became READY (not delivered!)
        if (oldOrder && !oldOrder.ready && newOrder.ready) {
          // Check if current user is the waiter who took this order
          if (newOrder.waiterName.toLowerCase().trim() === waiterLower) {
            playBellSound();
            showToast(`🍽️ "${newOrder.name}" siparişi hazır!`, "success");
          }
        }
      });
    }

    state.orders = newOrders;
    renderActiveOrders(); // Açık Masalar
    renderClosedHistory(); // Kapananlar
    renderKDS(); // Update Kitchen Screen if active
    renderCashierView(); // Update Cashier Screen if active
    renderLeaderboard(); // Update leaderboard
    syncStats();
  });

  listenWaiterStats((stats) => {
    state.waiterStats = stats || {};
    updateDashboardStats();
  });

  // Listen to dynamic masters from Firebase
  listenMasters((masters) => {
    if (masters && masters.length > 0) {
      MASTER_WAITERS = masters;
    }
    updateProfileDisplay(); // Refresh toggle visibility
  });

  // Listen to dynamic cashiers from Firebase
  listenCashiers((cashiers) => {
    CASHIERS = cashiers || [];
    updateProfileDisplay(); // Refresh toggle visibility
  });
}

function checkAuth() {
  if (!state.activeWaiter) {
    els.waiterModal.show();
  } else {
    updateProfileDisplay();
  }
}

function setupEventListeners() {
  // Waiter Login
  els.waiterModalSave.addEventListener("click", () => {
    const name = els.waiterModalInput.value.trim();
    if (name) {
      state.activeWaiter = name;
      localStorage.setItem(WAITER_STORAGE_KEY, name);
      updateProfileDisplay();
      els.waiterModal.hide();
      showToast(`Servis açıldı: ${name}`);
    }
  });

  // Search
  els.productSearch?.addEventListener("input", (e) => {
    filterProducts(e.target.value);
  });

  // Save Order
  // Save Order (Desktop & Mobile)
  els.saveButton.addEventListener("click", handleSaveOrder);
  els.mobileSaveButton?.addEventListener("click", handleSaveOrder);

  // Remove Item Delegation (Desktop)
  els.liveCartList.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-item-btn");
    if (btn) {
      const name = btn.dataset.name;
      removeFromCart(name);
    }
  });

  // Remove Item Delegation (Mobile)
  els.mobileTicketItems?.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-item-btn");
    if (btn) {
      const name = btn.dataset.name;
      removeFromCart(name);
    }
  });

  // Sync Name Inputs
  els.calcName.addEventListener("input", (e) => {
    if (els.mobileCalcName) els.mobileCalcName.value = e.target.value;
  });
  els.mobileCalcName?.addEventListener("input", (e) => {
    els.calcName.value = e.target.value;
  });

  // View Toggle Buttons
  els.btnToggleKDS?.addEventListener("click", () => switchView('kds'));
  els.btnToggleCashier?.addEventListener("click", () => switchView('cashier'));

  // Sound Toggle
  els.btnSoundToggle?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    updateSoundIcon();
  });
  updateSoundIcon();

  // Theme Toggle
  els.btnThemeToggle?.addEventListener("click", () => {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    updateTheme();
  });
  updateTheme();


  // Global Click Event Delegation (Performance)
  document.addEventListener("click", (e) => {

    // Quantity Controls in Product Card
    const qtyBtn = e.target.closest(".qty-btn");
    if (qtyBtn) {
      e.stopPropagation();
      const card = qtyBtn.closest(".product-card");
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const delta = qtyBtn.classList.contains("qty-plus") ? 1 : -1;
      console.log("QTY Button clicked:", name, price, delta);
      updateCartItem(name, price, delta);
    }

    // Ticket Item Remove
    if (e.target.closest(".remove-item-btn")) {
      const name = e.target.closest(".remove-item-btn").dataset.name;
      removeFromCart(name);
    }

    // Edit/Delete/Deliver Actions
    if (e.target.closest(".action-btn")) {
      const btn = e.target.closest(".action-btn");
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      handleOrderAction(id, action);
    }
  });
}

/* =========================================
   PRODUCT & CART LOGIC
   ========================================= */
function loadProducts() {
  els.categories.innerHTML = "";

  Object.entries(PRODUCTS).forEach(([category, items]) => {
    // Create Category Section
    const sectionTitle = document.createElement("h3");
    sectionTitle.className = "category-title mt-4 mb-3";
    sectionTitle.textContent = category;
    els.categories.appendChild(sectionTitle);

    const row = document.createElement("div");
    row.className = "row g-3";

    items.forEach(item => {
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-xl-3 product-wrapper";
      col.dataset.name = item.name.toLowerCase();

      col.innerHTML = `
         <div class="product-card h-100" data-name="${item.name}" data-price="${item.price}">
            <button class="product-info-btn" data-bs-toggle="tooltip" data-bs-placement="top" title="${item.desc || ''}">
               <i class="bi bi-info-circle"></i>
            </button>
            <div class="product-image-container">
               <img src="${item.image || 'https://image.pollinations.ai/prompt/gourmet%20food%20plating?width=400&height=300&nologo=true'}" alt="${item.name}" class="product-img">
            </div>
            <div class="product-content">
               <h4 class="product-name">${item.name}</h4>
               <span class="product-price">${item.price}$</span>
               <div class="badge-qty d-none">0</div>
            </div>
            <div class="product-controls">
               <button class="qty-btn qty-minus"><i class="bi bi-dash"></i></button>
               <span class="qty-display">0</span>
               <button class="qty-btn qty-plus"><i class="bi bi-plus"></i></button>
            </div>
         </div>
      `;
      row.appendChild(col);
    });
    els.categories.appendChild(row);
  });

  // Initialize Bootstrap tooltips
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
}

function addToCart(name, price) {
  if (!state.cart[name]) {
    state.cart[name] = { price, qty: 0 };
  }
  state.cart[name].qty++;
  renderCart();
  updateProductCardUI(name);
}


// function setTime() {
//   const now = new Date();
//   const hours = String(now.getHours()).padStart(2, '0');
//   const minutes = String(now.getMinutes()).padStart(2, '0');
//   const timeString = `${hours}:${minutes}`;

//   els.kdsClock.textContent = timeString;
// }

// setInterval(setTime, 1000);

function updateCartItem(name, price, delta) {
  // Not used directly from card anymore in POS mode, but good for logic
  if (!state.cart[name]) {
    if (delta > 0) state.cart[name] = { price, qty: 0 };
    else return;
  }

  state.cart[name].qty += delta;
  if (state.cart[name].qty <= 0) {
    delete state.cart[name];
  }

  renderCart();
  updateProductCardUI(name);
}

function removeFromCart(name) {
  delete state.cart[name];
  renderCart();
  updateProductCardUI(name);
}

function updateProductCardUI(name) {
  const card = document.querySelector(`.product-card[data-name="${name}"]`);
  if (!card) return;

  const qty = state.cart[name]?.qty || 0;
  const badge = card.querySelector(".badge-qty");
  const qtyDisplay = card.querySelector(".qty-display");

  // Update qty display
  if (qtyDisplay) qtyDisplay.textContent = qty;

  if (qty > 0) {
    card.classList.add("active");
    if (badge) {
      badge.textContent = qty;
      badge.classList.remove("d-none");
    }
  } else {
    card.classList.remove("active");
    if (badge) badge.classList.add("d-none");
  }
}


function renderCart() {
  const items = Object.entries(state.cart);
  const itemCount = items.reduce((sum, [_, item]) => sum + item.qty, 0);
  let subTotal = 0;

  els.liveCartList.innerHTML = "";
  if (els.mobileTicketItems) els.mobileTicketItems.innerHTML = "";

  if (itemCount === 0) {
    els.liveCartList.innerHTML = '<li class="text-center text-muted py-4 small">Sepet Boş</li>';
    if (els.mobileTicketItems) els.mobileTicketItems.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-cart-x display-1 opacity-25"></i><p class="mt-3">Sepet Boş</p></div>';
    if (els.mobileCartBadge) els.mobileCartBadge.classList.add("d-none");
  } else {
    // Show Badge
    if (els.mobileCartBadge) {
      els.mobileCartBadge.textContent = itemCount;
      els.mobileCartBadge.classList.remove("d-none");
    }

    items.forEach(([name, item]) => {
      subTotal += item.qty * item.price;

      const itemHTML = `
        <div class="d-flex align-items-center justify-content-between w-100 gap-2">
           <div class="d-flex align-items-center flex-grow-1" style="min-width: 0;">
              <span class="badge bg-gold text-dark rounded-pill me-2 flex-shrink-0">${item.qty}x</span>
              <span class="fw-bold text-truncate" style="font-size: 0.9rem;" title="${name}">${name}</span>
           </div>
           <span class="fw-bold flex-shrink-0">${item.qty * item.price}$</span>
           <button class="btn btn-sm btn-outline-danger border-0 p-1 remove-item-btn flex-shrink-0" data-name="${name}">
              <i class="bi bi-trash-fill"></i>
           </button>
        </div>
      `;

      // Desktop
      const li = document.createElement("li");
      li.className = "ticket-item";
      li.innerHTML = itemHTML;
      els.liveCartList.appendChild(li);

      // Mobile
      if (els.mobileTicketItems) {
        const div = document.createElement("div");
        div.className = "ticket-item bg-darker border-start-0 border-bottom border-secondary rounded-0 mb-0 py-3";
        div.innerHTML = itemHTML;
        els.mobileTicketItems.appendChild(div);
      }
    });
  }

  // Update Totals
  const total = subTotal > 0 ? subTotal + SERVICE_FEE : 0;

  els.subTotal.textContent = `${subTotal} $`;
  els.totalPrice.textContent = `${total} $`;
  if (els.mobileTotalPrice) els.mobileTotalPrice.textContent = `${total} $`;
}

/* =========================================
   ORDER MANAGEMENT
   ========================================= */
async function handleSaveOrder() {
  const name = els.calcName.value.trim();
  if (!name) return showToast("Masa numarasını veya müşteri adını girin!", "warning");

  const items = Object.entries(state.cart).map(([n, i]) => ({
    name: n,
    qty: i.qty,
    price: i.price
  }));

  if (items.length === 0) return showToast("Adisyon boş!", "warning");

  if (!state.activeWaiter) {
    return els.waiterModal.show();
  }

  let productTotal = items.reduce((sum, i) => sum + (i.qty * i.price), 0);

  // Add Service Fee
  if (productTotal > 0) {
    items.push({ name: "Servis Hizmeti", qty: 1, price: SERVICE_FEE });
  }

  const total = productTotal + SERVICE_FEE;

  const orderData = {
    name,
    items,
    total,
    timestamp: state.editingOrderId
      ? state.orders.find(o => o.id === state.editingOrderId)?.timestamp
      : Date.now(),
    date: new Date().toLocaleString("tr-TR"),
    waiterName: state.activeWaiter,
    delivered: false // Important for new logic
  };

  els.saveButton.disabled = true;
  els.saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> İletiliyor...';

  try {
    if (state.editingOrderId) {
      // Preserve delivered status if editing
      const oldOrder = state.orders.find(o => o.id === state.editingOrderId);
      if (oldOrder) orderData.delivered = oldOrder.delivered;

      await updateOrder(state.editingOrderId, orderData);
      showToast("Sipariş güncellendi!");
    } else {
      console.log('🔵 Calling addOrder...');
      const result = await addOrder(orderData);
      console.log('🔵 addOrder result:', result);
      console.log('🔵 result?.key:', result?.key);
      if (result?.key) {
        console.log('🔵 Calling generateAndUploadReceipt...');
        // Generate and upload receipt to Firebase Storage
        generateAndUploadReceipt(result.key, orderData);
      } else {
        console.warn('⚠️ No result.key - skipping receipt generation');
      }
      flushText();
      showToast("Sipariş mutfağa iletildi!");
      updateWaiterStatsLocally(state.activeWaiter, 1);
    }
    resetCart();
  } catch (err) {
    console.error(err);
    showToast("Bağlantı hatası!", "danger");
  } finally {
    els.saveButton.disabled = false;
    els.saveButton.innerHTML = 'MUTFAĞA İLET <i class="bi bi-send-fill ms-2"></i>';
    state.editingOrderId = null;
  }
}

// Generate receipt PNG and upload to Cloudinary
async function generateAndUploadReceipt(orderId, orderData) {
  console.log('📄 Starting receipt generation for order:', orderId);
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Receipt dimensions
    const width = 480;
    const padding = 32;
    const lineHeight = 24;
    const itemCount = orderData.items.length;
    const height = 520 + (itemCount * 28);

    canvas.width = width;
    canvas.height = height;

    // Background (cream/beige color)
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, width, height);

    // Add subtle paper texture (dotted pattern)
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    for (let i = 0; i < width; i += 4) {
      for (let j = 0; j < height; j += 4) {
        if (Math.random() > 0.7) {
          ctx.fillRect(i, j, 1, 1);
        }
      }
    }

    let y = 40;
    ctx.fillStyle = '#2c3e50';

    // Header - Restaurant Name
    ctx.font = 'italic 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CASA CARMARETTI', width / 2, y);

    // Subtitle
    y += 30;
    ctx.font = '14px Georgia, serif';
    ctx.fillText('Fine Dining', width / 2, y);

    // Address
    y += 20;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    ctx.fillText('Downtown Vinewood Power St.', width / 2, y);

    // Phone
    y += 16;
    ctx.fillText('PH: 62618712', width / 2, y);

    // Dotted separator
    y += 20;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Receipt info
    y += 25;
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`Fiş: ${orderData.name}`, padding, y);

    y += 22;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    const dateStr = orderData.date || new Date().toLocaleString('tr-TR');
    ctx.fillText(`Tarih: ${dateStr}`, padding, y);

    y += 18;
    ctx.fillText(`Garson: ${orderData.waiterName}`, padding, y);

    // Dotted separator
    y += 20;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Table Header
    y += 30;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Ürün', padding, y);
    ctx.fillText('Adet', 240, y);
    ctx.fillText('Birim', 300, y);
    ctx.textAlign = 'right';
    ctx.fillText('Ara Toplam', width - padding, y);

    // Items
    y += 10;
    ctx.font = '12px Arial, sans-serif';
    let subtotal = 0;
    let serviceItem = null;

    orderData.items.forEach(item => {
      if (item.name === 'Servis Hizmeti') {
        serviceItem = item;
        return;
      }
      y += 28;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(item.name, padding, y);
      ctx.fillText(`x${item.qty}`, 250, y);
      ctx.fillText(`${item.price} $`, 300, y);
      ctx.textAlign = 'right';
      const itemTotal = item.qty * item.price;
      ctx.fillText(`${itemTotal} $`, width - padding, y);
      subtotal += itemTotal;
    });

    // Dotted separator before totals
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subtotal
    y += 25;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a6a7a';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Ara toplam', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${subtotal.toFixed(2)} $`, width - padding, y);

    // Service fee
    y += 22;
    ctx.textAlign = 'left';
    ctx.fillText('Servis', padding, y);
    ctx.textAlign = 'right';
    const serviceFee = serviceItem ? serviceItem.price : 200;
    ctx.fillText(`${serviceFee.toFixed(2)} $`, width - padding, y);

    // Total
    y += 28;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOPLAM', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${orderData.total.toFixed(2)} $`, width - padding, y);

    // Dotted separator
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Payment info
    y += 25;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    ctx.textAlign = 'left';
    ctx.fillText('Ödeme yöntemi: Kart', padding, y);

    y += 20;
    const receiptNo = Math.floor(1000000000000 + Math.random() * 9000000000000);
    ctx.fillText(`Fiş No: ${receiptNo}`, padding, y);

    // Dotted separator
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Thank you message
    y += 30;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bizi tercih ettiğiniz için teşekkür ederiz!', width / 2, y);

    // Convert to blob and upload
    console.log('📄 Canvas ready, converting to blob...');
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        console.log('📄 Blob created:', blob ? `${blob.size} bytes` : 'null');
        if (blob) {
          console.log('📄 Calling uploadReceipt...');
          const url = await uploadReceipt(orderId, blob);
          if (url) {
            console.log('✅ Receipt uploaded:', url);
          } else {
            console.warn('⚠️ uploadReceipt returned null');
          }
          resolve(url);
        } else {
          console.error('❌ Blob creation failed');
          resolve(null);
        }
      }, 'image/png');
    });
  } catch (err) {
    console.error('Receipt generation failed:', err);
    return null;
  }
}

function flushText() {
  els.mobileCalcName.value = "";
  els.calcName.value = "";
}

function handleOrderAction(id, action) {
  const order = state.orders.find(o => o.id === id);
  if (!order) return;

  const isMaster = MASTER_WAITERS.includes(state.activeWaiter.toLowerCase());

  if (action === "delete") {
    if (!order.delivered && !isMaster) {
      return showToast("Yetkisiz işlem: Sadece Şef Garson silebilir.", "danger");
    }
    if (confirm("Bu kayıt silinecek. Onaylıyor musunuz?")) {
      deleteOrder(id);
      if (!order.delivered) updateWaiterStatsLocally(order.waiterName, -1);
    }
  }
  else if (action === "edit") {
    loadOrderToCart(order);
    state.editingOrderId = id;
    els.saveButton.textContent = "GÜNCELLE";
    // Hide both modals just in case
    els.historyModal.hide();
    els.activeOrdersModal.hide();
  }
  else if (action === "ready") {
    // Kitchen marks as ready (NOT delivered)
    orderReady(id);
    showToast(`🍽️ "${order.name}" hazır! Garsonlar bilgilendirildi.`);
  }
  else if (action === "deliver") {
    // Waiter marks as delivered (goes to cashier, NOT closed yet)
    orderDelivered(id);
    showToast(`✅ "${order.name}" teslim edildi. Kasaya düştü.`);
  }
  else if (action === "paid") {
    // Cashier marks as paid (now it's truly closed)
    orderPaid(id);
    showToast(`💰 "${order.name}" ödendi. Geçmişe taşındı.`);
    updateWaiterStatsLocally(order.waiterName, -1);
  }
  else if (action === "copy") {
    copyOrderText(order);
  }
  else if (action === "download") {
    downloadReceipt(order);
  }
}

function loadOrderToCart(order) {
  state.cart = {};
  order.items.forEach(item => {
    if (item.name !== "Servis Hizmeti") {
      state.cart[item.name] = { price: item.price, qty: item.qty };
    }
  });
  els.calcName.value = order.name;
  renderCart();
  // Update UI
  document.querySelectorAll(".product-card").forEach(card => {
    updateProductCardUI(card.dataset.name);
  });
}

function renderActiveOrders() {
  // Filter only NON-delivered orders
  const active = [...state.orders]
    .filter(o => !o.delivered)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (els.activeOrderBadge) {
    els.activeOrderBadge.textContent = active.length;
    els.activeOrderBadge.classList.toggle("d-none", active.length === 0);
  }

  if (active.length === 0) {
    els.activeOrdersList.innerHTML = '<li class="list-group-item text-center text-muted py-4">Açık masa yok.</li>';
    return;
  }

  els.activeOrdersList.innerHTML = "";
  active.forEach(order => {
    // Build items list HTML
    const itemsHtml = order.items
      .filter(i => i.name !== "Servis Hizmeti")
      .map(i => `<span class="badge bg-light text-dark border me-1 mb-1 text-wrap text-start" style="max-width: 100%;">${i.qty}x ${i.name}</span>`)
      .join("");

    const minsElapsed = Math.floor((Date.now() - order.timestamp) / 60000);
    const isReady = order.ready === true;

    // Status badge
    const statusBadge = isReady
      ? '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Hazır</span>'
      : '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Hazırlanıyor</span>';

    const li = document.createElement("li");
    li.className = `list-group-item p-3 ${isReady ? 'border-success border-2' : ''}`;
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
         <div class="flex-grow-1" style="min-width: 0;">
            <h5 class="fw-bold mb-0 text-truncate">${order.name}</h5>
            <small class="text-secondary text-truncate d-block">${order.waiterName} • ${minsElapsed} dk önce</small>
         </div>
         <div class="d-flex flex-column align-items-end gap-1">
            ${statusBadge}
            <span class="badge bg-dark">${order.total}$</span>
         </div>
      </div>
      <div class="mb-2">${itemsHtml}</div>
      <div class="d-flex gap-2 justify-content-end">
         ${!isReady ? `
           <button class="btn btn-sm btn-outline-primary action-btn" data-id="${order.id}" data-action="edit">
             <i class="bi bi-pencil-fill"></i> Düzelt
           </button>
         ` : `
           <button class="btn btn-sm btn-success btn-pulse action-btn" data-id="${order.id}" data-action="deliver">
             <i class="bi bi-bag-check-fill"></i> Teslim Edildi
           </button>
         `}
      </div>
    `;
    els.activeOrdersList.appendChild(li);
  });
}

function renderClosedHistory() {
  // Filter ONLY PAID orders (truly closed)
  const closed = [...state.orders]
    .filter(o => o.paid === true)
    .sort((a, b) => b.timestamp - a.timestamp);

  els.historyList.innerHTML = "";

  if (closed.length === 0) {
    els.historyList.innerHTML = '<li class="list-group-item text-center text-muted py-4">Henüz kapanan işlem yok.</li>';
    return;
  }

  closed.forEach(order => {
    const li = document.createElement("li");
    li.className = "history-item";

    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
        <div class="flex-grow-1" style="min-width: 0;">
          <h6 class="mb-0 fw-bold text-truncate">${order.name}</h6>
        </div>
        <span class="badge bg-success flex-shrink-0">Ödendi</span>
      </div>
      <div class="d-flex justify-content-between align-items-center">
         <span class="fw-bold">${order.total} $</span>
         <div class="d-flex gap-2">
            <button class="btn btn-sm action-btn" data-id="${order.id}" data-action="download">
               <i class="bi bi-receipt"></i>
            </button>
            <button class="btn btn-sm action-btn" data-id="${order.id}" data-action="delete">
               <i class="bi bi-trash"></i>
            </button>
         </div>
      </div>
    `;
    els.historyList.appendChild(li);
  });
}

function resetCart() {
  state.cart = {};
  els.calcName.value = "";
  renderCart();
  document.querySelectorAll(".product-card").forEach(card => card.classList.remove("active"));
  document.querySelectorAll(".badge-qty").forEach(b => b.classList.add("d-none"));
}

/* =========================================
   RECEIPT GENERATION
   ========================================= */
const RECEIPT_FONT_FAMILY = '"Inconsolata", "Courier New", monospace';
const RECEIPT_ITEM_FONT = `14px ${RECEIPT_FONT_FAMILY}`;
let receiptFontPromise = null;

function ensureReceiptFont() {
  if (receiptFontPromise) return receiptFontPromise;
  if (document.fonts?.load) {
    receiptFontPromise = document.fonts.load(`16px ${RECEIPT_FONT_FAMILY}`);
  } else {
    receiptFontPromise = Promise.resolve();
  }
  return receiptFontPromise;
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [""];
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function downloadReceipt(order) {
  // 1. If receiptUrl already exists (uploaded to Cloudinary), copy to clipboard
  if (order.receiptUrl) {
    try {
      await navigator.clipboard.writeText(order.receiptUrl);
      showToast("📋 Fiş URL'i panoya kopyalandı!");
      return;
    } catch (err) {
      console.warn("Clipboard failed, will try to open URL");
      window.open(order.receiptUrl, '_blank');
      return;
    }
  }

  // 2. No receiptUrl - generate receipt with CDN design and try to upload
  showToast("🔄 Fiş oluşturuluyor...");

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Receipt dimensions (same as CDN version)
    const width = 480;
    const padding = 32;
    const itemCount = order.items.length;
    const height = 520 + (itemCount * 28);

    canvas.width = width;
    canvas.height = height;

    // Background (cream/beige color)
    ctx.fillStyle = '#f5f0e8';
    ctx.fillRect(0, 0, width, height);

    // Add subtle paper texture (dotted pattern)
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    for (let i = 0; i < width; i += 4) {
      for (let j = 0; j < height; j += 4) {
        if (Math.random() > 0.7) {
          ctx.fillRect(i, j, 1, 1);
        }
      }
    }

    let y = 40;
    ctx.fillStyle = '#2c3e50';

    // Header - Restaurant Name
    ctx.font = 'italic 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('CASA CARMARETTI', width / 2, y);

    // Subtitle
    y += 30;
    ctx.font = '14px Georgia, serif';
    ctx.fillText('Fine Dining', width / 2, y);

    // Address
    y += 20;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    ctx.fillText('Downtown Vinewood Power St.', width / 2, y);

    // Phone
    y += 16;
    ctx.fillText('PH: 62618712', width / 2, y);

    // Dotted separator
    y += 20;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Receipt info
    y += 25;
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`Fiş: ${order.name}`, padding, y);

    y += 22;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    const dateStr = order.date || new Date().toLocaleString('tr-TR');
    ctx.fillText(`Tarih: ${dateStr}`, padding, y);

    y += 18;
    ctx.fillText(`Garson: ${order.waiterName}`, padding, y);

    // Dotted separator
    y += 20;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Table Header
    y += 30;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Ürün', padding, y);
    ctx.fillText('Adet', 240, y);
    ctx.fillText('Birim', 300, y);
    ctx.textAlign = 'right';
    ctx.fillText('Ara Toplam', width - padding, y);

    // Items
    y += 10;
    ctx.font = '12px Arial, sans-serif';
    let subtotal = 0;
    let serviceItem = null;

    order.items.forEach(item => {
      if (item.name === 'Servis Hizmeti') {
        serviceItem = item;
        return;
      }
      y += 28;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2c3e50';
      ctx.fillText(item.name, padding, y);
      ctx.fillText(`x${item.qty}`, 250, y);
      ctx.fillText(`${item.price} $`, 300, y);
      ctx.textAlign = 'right';
      const itemTotal = item.qty * item.price;
      ctx.fillText(`${itemTotal} $`, width - padding, y);
      subtotal += itemTotal;
    });

    // Dotted separator before totals
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Subtotal
    y += 25;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5a6a7a';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Ara toplam', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${subtotal.toFixed(2)} $`, width - padding, y);

    // Service fee
    y += 22;
    ctx.textAlign = 'left';
    ctx.fillText('Servis', padding, y);
    ctx.textAlign = 'right';
    const serviceFee = serviceItem ? serviceItem.price : 200;
    ctx.fillText(`${serviceFee.toFixed(2)} $`, width - padding, y);

    // Total
    y += 28;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TOPLAM', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${order.total.toFixed(2)} $`, width - padding, y);

    // Dotted separator
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Payment info
    y += 25;
    ctx.font = '12px Arial, sans-serif';
    ctx.fillStyle = '#5a6a7a';
    ctx.textAlign = 'left';
    ctx.fillText('Ödeme yöntemi: Kart', padding, y);

    y += 20;
    const receiptNo = Math.floor(1000000000000 + Math.random() * 9000000000000);
    ctx.fillText(`Fiş No: ${receiptNo}`, padding, y);

    // Dotted separator
    y += 25;
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Thank you message
    y += 30;
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bizi tercih ettiğiniz için teşekkür ederiz!', width / 2, y);

    // Try to upload to Cloudinary
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

    if (blob) {
      const url = await uploadReceipt(order.id, blob);
      if (url) {
        // Successfully uploaded - copy URL
        try {
          await navigator.clipboard.writeText(url);
          showToast("✅ Fiş yüklendi ve URL kopyalandı!");
          return;
        } catch (clipErr) {
          window.open(url, '_blank');
          showToast("✅ Fiş yüklendi! Yeni sekmede açıldı.");
          return;
        }
      }
    }

    // 3. Last resort - download as blob
    console.warn('Cloudinary upload failed, downloading locally...');
    const link = document.createElement("a");
    link.download = `Fiş-${order.name}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    showToast("📥 Fiş indirildi (çevrimdışı)");

  } catch (err) {
    console.error('Receipt generation failed:', err);
    showToast("Fiş oluşturulamadı!", "danger");
  }
}


/* =========================================
   VIEW SWITCHING (POS / KDS / CASHIER)
   ========================================= */
function switchView(view) {
  // Toggle: if already on this view, go back to POS
  if (currentView === view) {
    view = 'pos';
  }

  // Authorization check - block unauthorized access
  const waiterLower = state.activeWaiter?.toLowerCase().trim() || '';
  const isMaster = MASTER_WAITERS.includes(waiterLower);
  const isCashier = CASHIERS.includes(waiterLower);

  if (view === 'kds' && !isMaster) {
    showToast('Mutfak ekranına erişim yetkiniz yok!', 'warning');
    return;
  }

  if (view === 'cashier' && !isCashier) {
    showToast('Kasa ekranına erişim yetkiniz yok!', 'warning');
    return;
  }

  currentView = view;

  // Hide all views
  els.posView.classList.add("d-none");
  els.posView.classList.remove("d-flex"); // Remove flex since we hide it
  els.kdsView.classList.add("d-none");
  els.cashierView.classList.add("d-none");

  // Show selected view
  if (view === 'kds') {
    els.kdsView.classList.remove("d-none");
    document.body.style.backgroundColor = "#000";
    renderKDS();
    startKDSClock();
  } else if (view === 'cashier') {
    els.cashierView.classList.remove("d-none");
    document.body.style.backgroundColor = "#000";
    renderCashierView();
  } else {
    els.posView.classList.remove("d-none");
    els.posView.classList.add("d-flex"); // Restore flex
    document.body.style.backgroundColor = "";
    stopKDSClock();
  }
}

let kdsClockInterval;
function startKDSClock() {
  if (kdsClockInterval) clearInterval(kdsClockInterval);

  // Her güncelleme için kullanılacak fonksiyon
  function updateKDSDisplay() {
    const now = new Date();
    els.kdsClock.textContent = now.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
    renderKDS(); // dk göstergelerini de güncelle
  }

  // İlk çağrıda hemen güncelle
  updateKDSDisplay();

  // Her 30 saniyede bir güncelle (saat ve dk senkron kalır)
  kdsClockInterval = setInterval(updateKDSDisplay, 30000);
}

function stopKDSClock() {
  if (kdsClockInterval) clearInterval(kdsClockInterval);
}

function renderKDS() {
  if (currentView !== 'kds') return;

  // Only show orders that are NOT ready yet (still being prepared)
  const pendingOrders = state.orders
    .filter(o => !o.delivered && !o.ready && !o.paid)
    .sort((a, b) => a.timestamp - b.timestamp);

  els.kdsGrid.innerHTML = "";

  if (pendingOrders.length === 0) {
    els.kdsGrid.innerHTML = '<div class="col-12 text-center text-secondary py-5"><h3>Bekleyen Sipariş Yok</h3><p>Tüm siparişler hazır!</p></div>';
    return;
  }

  pendingOrders.forEach(order => {
    const minsElapsed = Math.floor((Date.now() - order.timestamp) / 60000);
    let headerClass = "";
    if (minsElapsed > 20) headerClass = "late";
    else if (minsElapsed > 10) headerClass = "medium";

    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4 col-xxl-3";

    let itemsHtml = "";
    order.items.forEach(item => {
      if (item.name === "Servis Hizmeti") return;
      itemsHtml += `<div class="kds-item"><span>${item.qty}x ${item.name}</span></div>`;
    });

    col.innerHTML = `
      <div class="kds-card h-100">
        <div class="kds-card-header ${headerClass}">
          <div>
            <h5 class="mb-0 fw-bold">${order.name}</h5>
            <small class="x-small text-white-50">${order.waiterName}</small>
          </div>
          <div class="kds-time fs-4">${minsElapsed} dk</div>
        </div>
        <div class="kds-card-body">${itemsHtml}</div>
        <div class="kds-action">
          <button class="btn btn-warning w-100 fw-bold py-2 action-btn" data-id="${order.id}" data-action="ready">
            <i class="bi bi-bell-fill me-2"></i> HAZIR
          </button>
        </div>
      </div>
    `;
    els.kdsGrid.appendChild(col);
  });
}

/* =========================================
   CASHIER VIEW (Kasa Ekranı)
   ========================================= */
function renderCashierView() {
  if (currentView !== 'cashier') return;

  // Show only DELIVERED but NOT PAID orders
  const unpaidOrders = state.orders
    .filter(o => o.delivered && !o.paid)
    .sort((a, b) => b.timestamp - a.timestamp);

  els.cashierGrid.innerHTML = "";

  if (unpaidOrders.length === 0) {
    els.cashierGrid.innerHTML = '<div class="col-12 text-center text-secondary py-5"><h3>Bekleyen Ödeme Yok</h3><p>Tüm hesaplar kapatıldı!</p></div>';
    return;
  }

  unpaidOrders.forEach(order => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4 col-xxl-3";

    let itemsHtml = "";
    order.items.forEach(item => {
      if (item.name === "Servis Hizmeti") return;
      itemsHtml += `<div class="kds-item"><span>${item.qty}x ${item.name}</span><span>${item.qty * item.price}$</span></div>`;
    });

    col.innerHTML = `
      <div class="kds-card h-100">
        <div class="kds-card-header bg-success">
          <div>
            <h5 class="mb-0 fw-bold">${order.name}</h5>
            <small class="x-small text-white-50">${order.waiterName}</small>
          </div>
          <div class="fs-3 fw-bold">${order.total}$</div>
        </div>
        <div class="kds-card-body">${itemsHtml}</div>
        <div class="kds-action">
          <button class="btn btn-success w-100 fw-bold py-2 action-btn" data-id="${order.id}" data-action="paid">
            <i class="bi bi-cash-coin me-2"></i> ÖDENDİ
          </button>
        </div>
      </div>
    `;
    els.cashierGrid.appendChild(col);
  });
}

/* =========================================
   STATS & HELPERS
   ========================================= */
function updateWaiterStatsLocally(name, delta) {
  // handled by listener mostly
}

function syncStats() {
  const currentStats = state.waiterStats || {};
  const newCounts = {};

  state.orders.forEach(order => {
    // Leaderboard tracks ONLY active orders? OR All time?
    // Let's assume Leaderboard = Active Shifts Performance
    // For now, let's track everything today

    const key = order.waiterName.toLowerCase().trim();
    if (!newCounts[key]) newCounts[key] = { name: order.waiterName, count: 0 };
    newCounts[key].count++;
  });

  if (state.activeWaiter) {
    const myKey = state.activeWaiter.toLowerCase().trim();
    const myStats = newCounts[myKey] || { count: 0 };

    // Desktop Update
    if (els.waiterOrderCount) els.waiterOrderCount.textContent = myStats.count;
    if (els.waiterServiceShare) els.waiterServiceShare.textContent = `${(myStats.count * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(2)} $`;

    // Mobile Update
    if (els.mobileWaiterOrderCount) els.mobileWaiterOrderCount.textContent = myStats.count;
    if (els.mobileWaiterServiceShare) els.mobileWaiterServiceShare.textContent = `${(myStats.count * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(2)} $`;
  }
}

function renderLeaderboard() {
  if (!els.leaderboardList) return;

  // Count orders per waiter
  const counts = {};
  state.orders.forEach(order => {
    const key = order.waiterName.toLowerCase().trim();
    if (!counts[key]) counts[key] = { name: order.waiterName, count: 0, total: 0 };
    counts[key].count++;
    counts[key].total += order.total || 0;
  });

  // Sort by count descending
  const sorted = Object.values(counts).sort((a, b) => b.count - a.count);

  els.leaderboardList.innerHTML = "";

  if (sorted.length === 0) {
    els.leaderboardList.innerHTML = '<li class="list-group-item text-center text-muted py-4">Henüz sipariş yok.</li>';
    return;
  }

  sorted.forEach((waiter, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="fs-5">${medal}</span>
        <span class="fw-bold">${waiter.name}</span>
      </div>
      <div class="text-end">
        <span class="badge bg-primary rounded-pill">${waiter.count} sipariş</span>
        <span class="badge bg-success rounded-pill ms-1">${waiter.total}$</span>
      </div>
    `;
    els.leaderboardList.appendChild(li);
  });
}

function updateDashboardStats() {
  syncStats();
}

function updateProfileDisplay() {
  if (state.activeWaiter) {
    els.waiterNameDisplay.textContent = state.activeWaiter;
    if (els.mobileActiveWaiter) els.mobileActiveWaiter.textContent = state.activeWaiter;

    const waiterLower = state.activeWaiter.toLowerCase().trim();
    const isMaster = MASTER_WAITERS.includes(waiterLower);
    const isCashier = CASHIERS.includes(waiterLower);

    // Set rank display
    let rank = "Garson";
    if (isMaster && isCashier) rank = "Şef Garson & Kasiyer";
    else if (isMaster) rank = "Şef Garson";
    else if (isCashier) rank = "Kasiyer";
    els.waiterRankDisplay.textContent = rank;

    // Toggle KDS Button (Desktop & Mobile)
    if (isMaster) {
      els.btnToggleKDS?.classList.remove("d-none");
      els.mobileBtnKDS?.classList.remove("d-none");
    } else {
      els.btnToggleKDS?.classList.add("d-none");
      els.mobileBtnKDS?.classList.add("d-none");
    }

    // Toggle Cashier Button (Desktop & Mobile)
    if (isCashier) {
      els.btnToggleCashier?.classList.remove("d-none");
      els.mobileBtnCashier?.classList.remove("d-none");
    } else {
      els.btnToggleCashier?.classList.add("d-none");
      els.mobileBtnCashier?.classList.add("d-none");
    }
  }
}

function filterProducts(query) {
  const term = query.toLowerCase();
  document.querySelectorAll(".product-wrapper").forEach(el => {
    const name = el.dataset.name;
    if (name.includes(term)) el.classList.remove("d-none");
    else el.classList.add("d-none");
  });
}

function animateCard(card) {
  card.classList.add("scale-click");
  setTimeout(() => card.classList.remove("scale-click"), 100);
}

function playBellSound() {
  if (!soundEnabled) return;
  bellAudio.currentTime = 0;
  bellAudio.play().catch(err => {
    console.warn("Bell sound could not play:", err);
  });
}

function updateSoundIcon() {
  const icon = els.btnSoundToggle?.querySelector('i');
  if (icon) {
    icon.className = soundEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill';
  }
}

function updateTheme() {
  document.body.classList.toggle('light-mode', !darkMode);
  const icon = els.btnThemeToggle?.querySelector('i');
  if (icon) {
    icon.className = darkMode ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
  }
}

/* =========================================
   UTILITIES
   ========================================= */
function showToast(msg, type = "success") {
  const container = document.querySelector(".toast-container");
  const id = "toast_" + Date.now();

  const bgClass = type === "success" ? "text-bg-success" : (type === "warning" ? "text-bg-warning" : "text-bg-danger");

  const html = `
    <div id="${id}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body fs-6">
          ${msg}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  container.insertAdjacentHTML("beforeend", html);

  const el = document.getElementById(id);
  const toast = new bootstrap.Toast(el, { delay: 3000 });
  toast.show();

  el.addEventListener("hidden.bs.toast", () => el.remove());
}

function copyOrderText(order) {
  let text = `*** ${order.name} ***\n`;
  text += `Garson: ${order.waiterName}\n`;
  text += `Tarih: ${order.date}\n`;
  text += "------------------\n";
  order.items.forEach(item => {
    text += `${item.name} x${item.qty} (${item.price * item.qty}$)\n`;
  });
  text += "------------------\n";
  text += `TOPLAM: ${order.total} $`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Panoya kopyalandı!");
  });
}

// Start
document.addEventListener("DOMContentLoaded", init);
