import { addOrder, deleteOrder, listenOrders, updateOrder, orderDelivered, listenWaiterStats, setWaiterStats, listenMasters } from "./orders.js";

/* =========================================
   CONSTANTS & CONFIG
   ========================================= */
const PRODUCTS = {
  Pizza: [
    { name: "Margherita", price: 350, icon: "🍕" },
    { name: "Pepperoni", price: 300, icon: "🍕" },
    { name: "Spicy Arrabbiata", price: 200, icon: "🌶️" },
  ],
  "Spesiyal Makarna": [
    { name: "Trufa al Maretti", price: 250, icon: "🍝" },
    { name: "Mare", price: 290, icon: "🦐" },
    { name: "Shrimp Fra Diavolo", price: 260, icon: "🍤" },
    { name: "Penne San Remo", price: 200, icon: "🍜" },
  ],
  "Ana Yemek": [
    { name: "Rosso", price: 250, icon: "🥩" },
    { name: "Dolce Agnello", price: 240, icon: "🍖" },
    { name: "Mozzarella Caprese", price: 230, icon: "🧀" },
    { name: "Fried Calamari", price: 220, icon: "🦑" },
  ],
  Tatlılar: [
    { name: "Tiramì", price: 250, icon: "🍰" },
    { name: "Panna", price: 200, icon: "🍮" },
    { name: "Cannolì", price: 300, icon: "🥐" },
  ],
  İçecekler: [
    { name: "Arancìa", price: 250, icon: "🍊" },
    { name: "Sprìtz", price: 200, icon: "🍹" },
    { name: "Fresco", price: 190, icon: "🥤" },
    { name: "Grappa", price: 160, icon: "🍇" },
  ],
  Salatalar: [
    { name: "Capres", price: 180, icon: "🥗" },
    { name: "Arugula", price: 200, icon: "🥬" },
    { name: "Insalata di Mare", price: 150, icon: "🥒" },
    { name: "Panzanella", price: 100, icon: "🍅" },
  ],
  Noel: [
    { name: "Hindi", price: 700, icon: "🦃" },
    { name: "Sıcak Şarap", price: 300, icon: "🍷" },
    { name: "Noel Kurabiyeleri", price: 300, icon: "🍪" },
    { name: "Üzümlü Kek", price: 400, icon: "🍰" },
  ],
};

const SERVICE_FEE = 200;
const SERVICE_SHARE_RATIO = 0.2;
const WAITER_STORAGE_KEY = "waiterName";

// Default masters (fallback if Firebase has no data)
let MASTER_WAITERS = ["samuel pugliani", "austin marcelli", "frederick scarcelli", "serena castello"];

// Audio for new orders
const bellAudio = new Audio('./artifacts/bell.wav');
bellAudio.volume = 0.7;

// Track order count for new order detection
let previousOrderCount = 0;

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
  cartItemsContainer: document.getElementById("ticketItemsContainer"),
  liveCartList: document.getElementById("liveCartList"),
  subTotal: document.getElementById("subTotal"),
  totalPrice: document.getElementById("totalPrice"),
  calcName: document.getElementById("calcName"),
  saveButton: document.getElementById("saveButton"),
  waiterNameDisplay: document.getElementById("activeWaiterName"),
  waiterRankDisplay: document.getElementById("waiterRank"),
  waiterOrderCount: document.getElementById("waiterOrderCount"),
  waiterServiceShare: document.getElementById("waiterServiceShare"),
  productSearch: document.getElementById("productSearch"),
  leaderboardList: document.getElementById("leaderboardList"), // Hidden but kept for logic
  historyList: document.getElementById("calcList"),
  activeOrdersList: document.getElementById("activeOrdersList"),
  activeOrderBadge: document.getElementById("activeOrderBadge"),

  // Views
  posView: document.getElementById("pos-view"),
  kdsView: document.getElementById("kds-view"),
  btnToggleMode: document.getElementById("btn-toggle-mode"),
  modeText: document.getElementById("mode-text"),
  kdsGrid: document.getElementById("kds-grid"),
  kdsClock: document.getElementById("kds-clock"),

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

  // Start Listeners
  listenOrders((orders) => {
    const newOrders = orders || [];

    // Detect new order for bell sound (Kitchen)
    const activeNow = newOrders.filter(o => !o.delivered).length;
    if (activeNow > previousOrderCount && previousOrderCount > 0) {
      playBellSound();
    }
    previousOrderCount = activeNow;

    // Detect order becoming "delivered" (ready) - notify only the waiter who took it
    if (state.activeWaiter && state.orders.length > 0) {
      newOrders.forEach(newOrder => {
        const oldOrder = state.orders.find(o => o.id === newOrder.id);
        // Check if order just became delivered
        if (oldOrder && !oldOrder.delivered && newOrder.delivered) {
          // Check if current user is the waiter who took this order
          if (newOrder.waiterName.toLowerCase().trim() === state.activeWaiter.toLowerCase().trim()) {
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
    updateProfileDisplay(); // Refresh KDS toggle visibility
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
  els.saveButton.addEventListener("click", handleSaveOrder);

  // KDS Toggle
  els.btnToggleMode.addEventListener("click", toggleMode);

  // Global Click Event Delegation (Performance)
  document.addEventListener("click", (e) => {
    // POS Style: Click product card to add
    if (e.target.closest(".product-card")) {
      const card = e.target.closest(".product-card");
      // Don't trigger if clicked on qty controls
      if (!e.target.closest(".qty-btn")) {
        addToCart(card.dataset.name, parseFloat(card.dataset.price));
        animateCard(card);
      }
    }

    // Quantity Controls in Product Card (if visible)
    if (e.target.matches(".qty-btn")) {
      const card = e.target.closest(".product-card");
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const delta = e.target.classList.contains("plus") ? 1 : -1;
      // Stop propagation to prevent card click
      e.stopPropagation();
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
            <div class="product-content">
               <span class="product-icon">${item.icon || '🍽️'}</span>
               <h4 class="product-name">${item.name}</h4>
               <span class="product-price">${item.price}$</span>
               <div class="badge-qty d-none">0</div>
            </div>
         </div>
      `;
      row.appendChild(col);
    });
    els.categories.appendChild(row);
  });
}

function addToCart(name, price) {
  if (!state.cart[name]) {
    state.cart[name] = { price, qty: 0 };
  }
  state.cart[name].qty++;
  renderCart();
  updateProductCardUI(name);
}

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

  if (qty > 0) {
    card.classList.add("active");
    badge.textContent = qty;
    badge.classList.remove("d-none");
  } else {
    card.classList.remove("active");
    badge.classList.add("d-none");
  }
}

function renderCart() {
  const items = Object.entries(state.cart);
  const itemCount = items.reduce((sum, [_, item]) => sum + item.qty, 0);
  let subTotal = 0;

  els.liveCartList.innerHTML = "";

  if (itemCount === 0) {
    els.liveCartList.classList.add("d-none");
    document.querySelector(".empty-ticket-state").classList.remove("d-none");
  } else {
    els.liveCartList.classList.remove("d-none");
    document.querySelector(".empty-ticket-state").classList.add("d-none");

    items.forEach(([name, item]) => {
      subTotal += item.qty * item.price;
      const li = document.createElement("li");
      li.className = "ticket-item";
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start w-100">
           <div class="me-2">
              <span class="ticket-qty text-white bg-dark rounded px-1 me-1">${item.qty}</span>
              <span class="ticket-name fw-bold">${name}</span>
           </div>
           <span class="fw-bold">${item.qty * item.price}</span>
        </div>
        <button class="btn btn-sm text-danger p-0 ms-auto d-block remove-item-btn" data-name="${name}">
           <i class="bi bi-x-circle-fill"></i> Sil
        </button>
      `;
      els.liveCartList.appendChild(li);
    });
  }

  // Update Totals
  const total = subTotal > 0 ? subTotal + SERVICE_FEE : 0;

  els.subTotal.textContent = `${subTotal} $`;
  els.totalPrice.textContent = `${total} $`;
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
      await addOrder(orderData);
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
  else if (action === "deliver") {
    // Close table action
    orderDelivered(id);
    showToast("Masa hesabı kapatıldı. Geçmişe taşındı.");
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

  els.activeOrderBadge.textContent = active.length;
  els.activeOrderBadge.classList.toggle("d-none", active.length === 0);

  if (active.length === 0) {
    els.activeOrdersList.innerHTML = '<li class="list-group-item text-center text-muted py-4">Açık masa yok.</li>';
    return;
  }

  els.activeOrdersList.innerHTML = "";
  active.forEach(order => {
    // Build items list HTML
    const itemsHtml = order.items
      .filter(i => i.name !== "Servis Hizmeti")
      .map(i => `<span class="badge bg-light text-dark border me-1 mb-1">${i.qty}x ${i.name}</span>`)
      .join("");

    const minsElapsed = Math.floor((Date.now() - order.timestamp) / 60000);

    const li = document.createElement("li");
    li.className = "list-group-item p-3";
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start mb-2">
         <div>
            <h5 class="fw-bold mb-0">${order.name}</h5>
            <small class="text-secondary">${order.waiterName} • ${minsElapsed} dk önce</small>
         </div>
         <span class="badge bg-warning text-dark">${order.total}$</span>
      </div>
      <div class="mb-2">${itemsHtml}</div>
      <div class="d-flex gap-2 justify-content-end">
         <button class="btn btn-sm btn-outline-primary action-btn" data-id="${order.id}" data-action="edit">
           <i class="bi bi-pencil-fill"></i> Düzelt
         </button>
         <button class="btn btn-sm btn-success action-btn" data-id="${order.id}" data-action="deliver">
           <i class="bi bi-check-lg"></i> Kapat
         </button>
      </div>
    `;
    els.activeOrdersList.appendChild(li);
  });
}

function renderClosedHistory() {
  // Filter ONLY delivered (closed) orders
  const closed = [...state.orders]
    .filter(o => o.delivered)
    .sort((a, b) => b.timestamp - a.timestamp);

  els.historyList.innerHTML = "";

  if (closed.length === 0) {
    els.historyList.innerHTML = '<li class="text-center text-muted py-3">Henüz kapanan işlem yok.</li>';
    return;
  }

  closed.forEach(order => {
    const li = document.createElement("li");
    li.className = "history-item bg-white border p-3 rounded";

    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h6 class="mb-0 fw-bold text-dark">${order.name}</h6>
          <small class="text-muted">${order.date} • ${order.waiterName}</small>
        </div>
        <span class="badge bg-success">Ödendi</span>
      </div>
      <div class="d-flex justify-content-between align-items-center">
         <span class="fw-bold">${order.total} $</span>
         <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-dark action-btn" data-id="${order.id}" data-action="download">
               <i class="bi bi-receipt"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger action-btn" data-id="${order.id}" data-action="delete">
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
  await ensureReceiptFont();
  const canvas = document.getElementById("receiptCanvas");
  const ctx = canvas.getContext("2d");

  const width = 480;
  const padding = 32;
  const lineHeight = 26;
  const headerHeight = 220;

  // Calculate height
  let contentHeight = headerHeight;
  const items = order.items.map(item => ({
    ...item,
    lines: wrapText(ctx, item.name, 200) // Estimate wrap
  }));

  items.forEach(item => {
    contentHeight += Math.max(item.lines.length * lineHeight, lineHeight) + 10;
  });
  contentHeight += 150; // Total area

  canvas.width = width;
  canvas.height = contentHeight;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, contentHeight);

  // Header
  ctx.font = `bold 24px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText("CASA CARMARETTI", width / 2, 60);

  ctx.font = `16px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillText("Sipariş Fişi", width / 2, 90);

  ctx.font = `14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillText(order.date, width / 2, 120);

  ctx.textAlign = "left";
  ctx.fillText(`Masa/Kişi: ${order.name}`, padding, 160);
  ctx.fillText(`Garson: ${order.waiterName}`, padding, 185);

  // Divider
  ctx.beginPath();
  ctx.moveTo(padding, 200);
  ctx.lineTo(width - padding, 200);
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  // Items
  let y = 230;
  ctx.font = RECEIPT_ITEM_FONT;

  items.forEach(item => {
    const qtyText = `x${item.qty}`;
    const priceText = `${item.qty * item.price} $`;

    ctx.fillText(qtyText, padding, y);
    ctx.fillText(priceText, width - padding - ctx.measureText(priceText).width, y);

    // Name wrapping
    let nameY = y;
    const nameX = padding + 50;
    const nameWidth = width - padding - 150;
    const wrappedName = wrapText(ctx, item.name, nameWidth);

    wrappedName.forEach(line => {
      ctx.fillText(line, nameX, nameY);
      nameY += lineHeight;
    });

    y = Math.max(nameY, y + lineHeight) + 10;
  });

  // Divider
  y += 10;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();

  // Total
  y += 40;
  ctx.font = `bold 20px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillText("TOPLAM", padding, y);
  const totalText = `${order.total} $`;
  ctx.fillText(totalText, width - padding - ctx.measureText(totalText).width, y);

  // Footer
  y += 60;
  ctx.font = `12px ${RECEIPT_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillText("Teşekkür ederiz!", width / 2, y);

  // Download
  const link = document.createElement("a");
  link.download = `Fiş-${order.name}-${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
}


/* =========================================
   KITCHEN DISPLAY SYSTEM (KDS)
   ========================================= */
let isKDSMode = false;

function toggleMode() {
  isKDSMode = !isKDSMode;

  if (isKDSMode) {
    els.posView.classList.add("d-none");
    els.kdsView.classList.remove("d-none");
    els.modeText.textContent = "Sipariş Ekranı";
    document.body.style.backgroundColor = "#111"; // Full dark for kitchen
    renderKDS();
    startKDSClock();
  } else {
    els.posView.classList.remove("d-none");
    els.kdsView.classList.add("d-none");
    els.modeText.textContent = "Mutfak Ekranı";
    document.body.style.backgroundColor = ""; // Reset
    stopKDSClock();
  }
}

let kdsClockInterval;
function startKDSClock() {
  if (kdsClockInterval) clearInterval(kdsClockInterval);
  kdsClockInterval = setInterval(() => {
    const now = new Date();
    els.kdsClock.textContent = now.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
    renderKDS(); // Re-render to update elapsed times
  }, 60000); // Update every minute
}

function stopKDSClock() {
  if (kdsClockInterval) clearInterval(kdsClockInterval);
}

function renderKDS() {
  if (!isKDSMode) return;

  const activeOrders = state.orders.filter(o => !o.delivered).sort((a, b) => a.timestamp - b.timestamp);
  els.kdsGrid.innerHTML = "";

  if (activeOrders.length === 0) {
    els.kdsGrid.innerHTML = '<div class="col-12 text-center text-secondary py-5"><h3>Aktif Sipariş Yok</h3><p>Şu an mutfak sakin.</p></div>';
    return;
  }

  activeOrders.forEach(order => {
    const minsElapsed = Math.floor((Date.now() - order.timestamp) / 60000);
    let headerClass = "";
    if (minsElapsed > 20) headerClass = "late";
    else if (minsElapsed > 10) headerClass = "medium";

    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4 col-xxl-3";

    let itemsHtml = "";
    order.items.forEach(item => {
      if (item.name === "Servis Hizmeti") return;
      itemsHtml += `
            <div class="kds-item">
               <span>${item.qty}x ${item.name}</span>
            </div>
         `;
    });

    col.innerHTML = `
         <div class="kds-card h-100">
            <div class="kds-card-header ${headerClass}">
               <div>
                  <h5 class="mb-0 fw-bold title-font">${order.name}</h5>
                  <small class="x-small text-white-50">${order.waiterName}</small>
               </div>
               <div class="kds-time fs-4">${minsElapsed} dk</div>
            </div>
            <div class="kds-card-body">
               ${itemsHtml}
            </div>
            <div class="kds-action">
               <button class="btn btn-success w-100 fw-bold py-2 action-btn" data-id="${order.id}" data-action="deliver">
                  <i class="bi bi-check-lg me-2"></i> HAZIR / TESLİM
               </button>
            </div>
         </div>
      `;
    els.kdsGrid.appendChild(col);
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
    els.waiterOrderCount.textContent = `${myStats.count} Sipariş`;
    els.waiterServiceShare.textContent = `${(myStats.count * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(0)} $`;
  }
}

function updateDashboardStats() {
  syncStats();
}

function updateProfileDisplay() {
  if (state.activeWaiter) {
    els.waiterNameDisplay.textContent = state.activeWaiter;
    const isMaster = MASTER_WAITERS.includes(state.activeWaiter.toLowerCase());
    els.waiterRankDisplay.textContent = isMaster ? "Şef Garson" : "Garson";

    // Toggle KDS Button
    if (isMaster) {
      els.btnToggleMode.classList.remove("d-none");
    } else {
      els.btnToggleMode.classList.add("d-none");
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
  bellAudio.currentTime = 0;
  bellAudio.play().catch(err => {
    console.warn("Bell sound could not play:", err);
  });
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
