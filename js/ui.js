import { addOrder, deleteOrder, listenOrders, updateOrder, orderDelivered, listenWaiterStats, setWaiterStats } from "./orders.js";

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
const MASTER_WAITERS = ["samuel pugliani", "austin marcelli", "frederick scarcelli", "serena castello"];

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
  cartItemsContainer: document.getElementById("cartItemsContainer"),
  liveCartList: document.getElementById("liveCartList"),
  cartItemCount: document.getElementById("cartItemCount"),
  mobileCartCount: document.getElementById("mobileCartCount"),
  subTotal: document.getElementById("subTotal"),
  totalPrice: document.getElementById("totalPrice"),
  mobileCartTotal: document.getElementById("mobileCartTotal"),
  calcName: document.getElementById("calcName"),
  saveButton: document.getElementById("saveButton"),
  waiterNameDisplay: document.getElementById("activeWaiterName"),
  waiterRankDisplay: document.getElementById("waiterRank"),
  waiterOrderCount: document.getElementById("waiterOrderCount"),
  waiterServiceShare: document.getElementById("waiterServiceShare"),
  productSearch: document.getElementById("productSearch"),
  leaderboardList: document.getElementById("leaderboardList"),
  historyList: document.getElementById("calcList"),

  // Modals
  waiterModal: new bootstrap.Modal('#waiterModal'),
  historyModal: new bootstrap.Modal('#historyModal'),
  leaderboardModal: new bootstrap.Modal('#leaderboardModal'),

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
    state.orders = orders || [];
    renderHistory();
    syncStats();
  });

  listenWaiterStats((stats) => {
    state.waiterStats = stats || {};
    updateDashboardStats();
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
      showToast(`Hoş geldin, ${name}!`);
    }
  });

  // Search
  els.productSearch?.addEventListener("input", (e) => {
    filterProducts(e.target.value);
  });

  // Save Order
  els.saveButton.addEventListener("click", handleSaveOrder);

  // Global Click Event Delegation (Performance)
  document.addEventListener("click", (e) => {
    // Add to Cart
    if (e.target.closest(".btn-add-cart")) {
      const btn = e.target.closest(".btn-add-cart");
      addToCart(btn.dataset.name, parseFloat(btn.dataset.price));
      animateButton(btn);
    }

    // Quantity Controls in Product Card
    if (e.target.matches(".qty-btn")) {
      const card = e.target.closest(".product-card");
      const name = card.dataset.name;
      const price = parseFloat(card.dataset.price);
      const delta = e.target.classList.contains("plus") ? 1 : -1;
      updateCartItem(name, price, delta);
    }

    // Cart Item Remove
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
    const section = document.createElement("div");
    section.className = "category-section mb-4";

    section.innerHTML = `
      <h3 class="category-title">${category}</h3>
      <div class="row g-3">
        ${items.map(item => `
          <div class="col-6 col-md-4 col-xl-3 product-wrapper" data-name="${item.name.toLowerCase()}">
            <div class="product-card" data-name="${item.name}" data-price="${item.price}">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="fs-1">${item.icon || '🍽️'}</span>
                <span class="product-price">${item.price}$</span>
              </div>
              <h4 class="product-name">${item.name}</h4>
              <div class="mt-auto pt-3 d-flex justify-content-between align-items-center">
                 <div class="qty-control d-none">
                    <button class="qty-btn minus">-</button>
                    <span class="qty-val">0</span>
                    <button class="qty-btn plus">+</button>
                 </div>
                 <button class="btn btn-sm btn-primary w-100 btn-add-cart rounded-pill" 
                         data-name="${item.name}" data-price="${item.price}">
                   Ekle <i class="bi bi-plus"></i>
                 </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    els.categories.appendChild(section);
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
  const addBtn = card.querySelector(".btn-add-cart");
  const qtyControl = card.querySelector(".qty-control");
  const qtyVal = card.querySelector(".qty-val");

  if (qty > 0) {
    addBtn.classList.add("d-none");
    qtyControl.classList.remove("d-none");
    qtyVal.textContent = qty;
    card.classList.add("border-primary");
  } else {
    addBtn.classList.remove("d-none");
    qtyControl.classList.add("d-none");
    card.classList.remove("border-primary");
  }
}

function renderCart() {
  const items = Object.entries(state.cart);
  const itemCount = items.reduce((sum, [_, item]) => sum + item.qty, 0);
  let subTotal = 0;

  els.liveCartList.innerHTML = "";

  if (itemCount === 0) {
    els.liveCartList.classList.add("d-none");
    document.querySelector(".empty-cart-state").classList.remove("d-none");
  } else {
    els.liveCartList.classList.remove("d-none");
    document.querySelector(".empty-cart-state").classList.add("d-none");

    items.forEach(([name, item]) => {
      subTotal += item.qty * item.price;
      const li = document.createElement("li");
      li.className = "cart-item fade-in";
      li.innerHTML = `
        <div class="flex-grow-1">
          <span class="cart-item-title">${name}</span>
          <div class="cart-item-meta text-muted">
            ${item.price} $ x ${item.qty}
          </div>
        </div>
        <div class="text-end ms-3">
          <div class="fw-bold mb-1">${item.qty * item.price} $</div>
          <button class="btn btn-link btn-sm p-0 text-danger remove-item-btn" data-name="${name}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      `;
      els.liveCartList.appendChild(li);
    });
  }

  // Update Totals
  const total = subTotal > 0 ? subTotal + SERVICE_FEE : 0;

  els.cartItemCount.textContent = itemCount;
  els.mobileCartCount.textContent = itemCount;
  els.subTotal.textContent = `${subTotal} $`;
  els.totalPrice.textContent = `${total} $`;
  els.mobileCartTotal.textContent = `${total} $`;
}

/* =========================================
   ORDER MANAGEMENT
   ========================================= */
async function handleSaveOrder() {
  const name = els.calcName.value.trim();
  if (!name) return showToast("Lütfen bir masa veya kişi adı girin.", "warning");

  const items = Object.entries(state.cart).map(([n, i]) => ({
    name: n,
    qty: i.qty,
    price: i.price
  }));

  if (items.length === 0) return showToast("Sepetiniz boş!", "warning");

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
    waiterName: state.activeWaiter
  };

  els.saveButton.disabled = true;
  els.saveButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';

  try {
    if (state.editingOrderId) {
      await updateOrder(state.editingOrderId, orderData);
      showToast("Sipariş güncellendi!");
    } else {
      await addOrder(orderData);
      showToast("Sipariş başarıyla oluşturuldu!");

      // Update local stats optimistically
      updateWaiterStatsLocally(state.activeWaiter, 1);
    }
    resetCart();
  } catch (err) {
    console.error(err);
    showToast("Bir hata oluştu.", "danger");
  } finally {
    els.saveButton.disabled = false;
    els.saveButton.innerHTML = 'Siparişi Oluştur <i class="bi bi-arrow-right-short fs-4 align-middle"></i>';
    state.editingOrderId = null;
  }
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

function handleOrderAction(id, action) {
  const order = state.orders.find(o => o.id === id);
  if (!order) return;

  const isMaster = MASTER_WAITERS.includes(state.activeWaiter.toLowerCase());

  if (action === "delete") {
    if (!order.delivered && !isMaster) {
      return showToast("Henüz teslim edilmemiş siparişi sadece yöneticiler silebilir.", "danger");
    }
    if (confirm("Bu siparişi silmek istediğinize emin misiniz?")) {
      deleteOrder(id);
      if (!order.delivered) updateWaiterStatsLocally(order.waiterName, -1);
    }
  }
  else if (action === "edit") {
    loadOrderToCart(order);
    state.editingOrderId = id;
    els.saveButton.textContent = "Güncelle";
    els.historyModal.hide();
  }
  else if (action === "deliver") {
    orderDelivered(id);
    showToast("Sipariş teslim edildi olarak işaretlendi.");
    updateWaiterStatsLocally(order.waiterName, -1); // Aktif sayısı düş
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
  // Update all product cards to reflect new cart state
  document.querySelectorAll(".product-card").forEach(card => {
    updateProductCardUI(card.dataset.name);
  });
}

function renderHistory() {
  els.historyList.innerHTML = "";

  // Sort by date desc
  const sorted = [...state.orders].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    els.historyList.innerHTML = '<li class="text-center text-muted py-3">Henüz kayıtlı sipariş yok.</li>';
    return;
  }

  sorted.forEach(order => {
    const isDelivered = order.delivered;
    const li = document.createElement("li");
    li.className = `history-item ${isDelivered ? 'delivered' : 'pending'}`;

    // Calculate items count without service fee
    const itemCount = order.items.filter(i => i.name !== "Servis Hizmeti").reduce((acc, i) => acc + i.qty, 0);

    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <h5 class="mb-0 fw-bold">${order.name}</h5>
          <small class="text-muted"><i class="bi bi-person"></i> ${order.waiterName} • ${order.date}</small>
        </div>
        <span class="badge ${isDelivered ? 'bg-success' : 'bg-warning text-dark'}">
          ${isDelivered ? 'Teslim Edildi' : 'Hazırlanıyor'}
        </span>
      </div>
      
      <div class="small text-secondary mb-3">
         ${itemCount} parça ürün • Toplam <strong>${order.total} $</strong>
      </div>

      <div class="d-flex gap-2 justify-content-end">
         <button class="btn btn-sm btn-outline-dark action-btn" data-id="${order.id}" data-action="download">
            <i class="bi bi-download"></i> İndir
         </button>
         ${!isDelivered ? `
           <button class="btn btn-sm btn-outline-success action-btn" data-id="${order.id}" data-action="deliver">
             <i class="bi bi-check-lg"></i> Teslim
           </button>
           <button class="btn btn-sm btn-outline-primary action-btn" data-id="${order.id}" data-action="edit">
             <i class="bi bi-pencil"></i>
           </button>
         ` : ''}
         <button class="btn btn-sm btn-outline-secondary action-btn" data-id="${order.id}" data-action="copy">
            <i class="bi bi-clipboard"></i>
         </button>
         <button class="btn btn-sm btn-outline-danger action-btn" data-id="${order.id}" data-action="delete">
            <i class="bi bi-trash"></i>
         </button>
      </div>
    `;
    els.historyList.appendChild(li);
  });
}

function resetCart() {
  state.cart = {};
  els.calcName.value = "";
  renderCart();
  document.querySelectorAll(".product-card").forEach(card => {
    updateProductCardUI(card.dataset.name);
  });
}

/* =========================================
   STATS & HELPERS
   ========================================= */
function updateWaiterStatsLocally(name, delta) {
  // Stats are generally synced from Firebase, but for immediate UI feedback we can act locally
  // However, since we listen to Firebase, optimisitc UI updates might be overwritten quickly.
  // Best to rely on listener or implement proper optimistic update.
  // For now, simpler to just rely on Firebase listener unless latency is an issue.
}

function syncStats() {
  // Logic to calculate stats from orders and update firebase if master
  // Simplified: The original app had logic to recalculate stats from all orders.
  // We can keep it or trust existing stats.
  // Adapting original logic:

  const currentStats = state.waiterStats || {};
  const newCounts = {};

  state.orders.forEach(order => {
    // Only count active (non-delivered) orders for "Active Orders" count?
    // Or total orders? Original app seemed to count active orders for "count" 
    // but leaderboard implied total performance.
    // Let's assume leaderboard is currently active orders for this session.

    if (!order.delivered) {
      const key = order.waiterName.toLowerCase().trim();
      if (!newCounts[key]) newCounts[key] = { name: order.waiterName, count: 0 };
      newCounts[key].count++;
    }
  });

  // Checking auth again
  if (state.activeWaiter) {
    const myKey = state.activeWaiter.toLowerCase().trim();
    const myStats = newCounts[myKey] || { count: 0 };
    els.waiterOrderCount.textContent = myStats.count;
    els.waiterServiceShare.textContent = `${(myStats.count * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(0)} $`;
  }

  renderLeaderboard(newCounts);
}

function updateDashboardStats() {
  syncStats();
}


function renderLeaderboard(stats) {
  els.leaderboardList.innerHTML = "";
  const sorted = Object.values(stats).sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    els.leaderboardList.innerHTML = '<li class="list-group-item bg-transparent text-muted text-center">Aktif sipariş yok</li>';
    return;
  }

  sorted.forEach((s, idx) => {
    const li = document.createElement("li");
    li.className = "list-group-item bg-transparent d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <div>
        <span class="badge bg-primary rounded-pill me-2">#${idx + 1}</span>
        <span class="fw-bold">${s.name}</span>
      </div>
      <span class="badge bg-light text-dark border">${s.count} Sipariş</span>
    `;
    els.leaderboardList.appendChild(li);
  });
}


function updateProfileDisplay() {
  if (state.activeWaiter) {
    els.waiterNameDisplay.textContent = state.activeWaiter;
    const isMaster = MASTER_WAITERS.includes(state.activeWaiter.toLowerCase());
    els.waiterRankDisplay.textContent = isMaster ? "Şef Garson" : "Garson";
    els.waiterRankDisplay.className = isMaster ? "mb-0 x-small text-primary fw-bold" : "mb-0 x-small text-secondary";
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

function animateButton(btn) {
  btn.classList.add("scale-95");
  setTimeout(() => btn.classList.remove("scale-95"), 100);
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
        <div class="toast-body">
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
