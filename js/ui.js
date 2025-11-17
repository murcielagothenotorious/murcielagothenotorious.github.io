import { addOrder, deleteOrder, listenOrders, updateOrder } from "./orders.js";

const products = {
  Pizza: [
    { name: "Margherita", price: 350 },
    { name: "Pepperoni", price: 300 },
    { name: "Spicy Arrabbiata", price: 200 },
  ],
  "Spesiyal Makarna": [
    { name: "Trufa al Maretti", price: 250 },
    { name: "Mare", price: 290 },
    { name: "Shrimp Fra Diavolo", price: 260 },
    { name: "Penne San Remo", price: 200 },
  ],
  "Ana Yemek": [
    { name: "Rosso", price: 250 },
    { name: "Dolce Agnello", price: 240 },
    { name: "Mozzarella Caprese", price: 230 },
    { name: "Fried Calamari", price: 220 },
  ],
  Tatlılar: [
    { name: "Tiramì", price: 250 },
    { name: "Panna", price: 200 },
    { name: "Cannolì", price: 300 },
  ],
  İçecekler: [
    { name: "Arancìa", price: 250 },
    { name: "Sprìtz", price: 200 },
    { name: "Fresco", price: 190 },
    { name: "Grappa", price: 160 },
  ],
  Salatalar: [
    { name: "Capres", price: 180 },
    { name: "Arugula", price: 200 },
    { name: "Insalata di Mare", price: 150 },
    { name: "Panzanella", price: 100 },
  ],
};

const SERVICE_FEE = 200;
const SERVICE_SHARE_RATIO = 0.2;
const WAITER_STORAGE_KEY = "waiterName";
let savedCalculations = [];
let editingId = null;
let unsubscribeOrders = null;
let waiterModalInstance = null;

const selectors = {
  categories: document.getElementById("categories"),
  calcList: document.getElementById("calcList"),
  totalPrice: document.getElementById("totalPrice"),
  calcName: document.getElementById("calcName"),
  saveButton: document.getElementById("saveButton"),
  receiptCanvas: document.getElementById("receiptCanvas"),
  activeWaiterName: document.getElementById("activeWaiterName"),
  waiterOrderCount: document.getElementById("waiterOrderCount"),
  waiterServiceShare: document.getElementById("waiterServiceShare"),
  leaderboardList: document.getElementById("leaderboardList"),
  waiterChangeButton: document.getElementById("waiterChangeButton"),
  waiterModal: document.getElementById("waiterModal"),
  waiterModalInput: document.getElementById("waiterModalInput"),
  waiterModalSave: document.getElementById("waiterModalSave"),
};

function getStoredWaiterName() {
  return localStorage.getItem(WAITER_STORAGE_KEY) || "";
}

function setWaiterName(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  localStorage.setItem(WAITER_STORAGE_KEY, trimmed);
  selectors.activeWaiterName.textContent = trimmed;
  if (selectors.waiterModalInput) {
    selectors.waiterModalInput.value = trimmed;
  }
  const modal = getWaiterModal();
  modal?.hide();
  updateWaiterStats();
}

function getWaiterModal() {
  if (!waiterModalInstance && window.bootstrap && selectors.waiterModal) {
    waiterModalInstance = new window.bootstrap.Modal(selectors.waiterModal, {
      backdrop: "static",
      keyboard: false,
    });
  }
  return waiterModalInstance;
}

function promptWaiterName(force = false) {
  const stored = getStoredWaiterName();
  if (!force && stored) return;
  const modal = getWaiterModal();
  if (!modal) return;
  if (selectors.waiterModalInput) {
    selectors.waiterModalInput.value = stored || "";
    setTimeout(() => selectors.waiterModalInput?.focus(), 200);
  }
  modal.show();
}

function loadProducts() {
  selectors.categories.innerHTML = "";

  Object.entries(products).forEach(([category, items]) => {
    const group = document.createElement("div");
    group.className = "category-group";

    const header = document.createElement("div");
    header.className = "category-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = category;
    const hint = document.createElement("p");
    hint.className = "muted mb-0";
    hint.textContent = "Ürünleri seçip miktarları ayarla";
    titleWrap.append(title, hint);

    const badge = document.createElement("span");
    badge.className = "badge text-bg-light";
    badge.textContent = `${items.length} ürün`;

    header.append(titleWrap, badge);
    group.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "row g-4 product-grid";

    items.forEach((item) => {
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-md-4 col-xl-3";

      const card = document.createElement("div");
      card.className = "product-card h-100";
      card.dataset.price = item.price;
      card.dataset.name = item.name;

      const header = document.createElement("div");
      header.className = "d-flex align-items-start justify-content-between gap-3";

      const name = document.createElement("div");
      name.className = "product-name fs-6";
      name.textContent = item.name;

      const price = document.createElement("div");
      price.className = "product-price small";
      price.textContent = `${item.price} $`;

      header.append(name, price);

      const controls = document.createElement("div");
      controls.className = "controls d-flex align-items-center gap-2 mt-3";

      const minusBtn = document.createElement("button");
      minusBtn.className = "remove-btn";
      minusBtn.type = "button";
      minusBtn.textContent = "-";

      const count = document.createElement("span");
      count.className = "count";
      count.textContent = "0";

      const plusBtn = document.createElement("button");
      plusBtn.className = "add-btn";
      plusBtn.type = "button";
      plusBtn.textContent = "+";

      controls.append(minusBtn, count, plusBtn);

      const rowTotal = document.createElement("div");
      rowTotal.className = "row-total small";

      card.append(header, controls, rowTotal);
      col.appendChild(card);
      grid.appendChild(col);
    });

    group.appendChild(grid);
    selectors.categories.appendChild(group);
  });
}

function updateRowTotal(card) {
  if (!card) return;
  const countEl = card.querySelector(".count");
  const totalDiv = card.querySelector(".row-total");
  const qty = Number(countEl?.innerText || 0);
  const price = Number(card.dataset.price || 0);
  const total = qty * price;
  if (totalDiv) {
    totalDiv.textContent = qty > 0 ? `${total} $` : "";
  }
  calculateTotal();
}

function changeCount(card, delta) {
  if (!card) return;
  const countEl = card.querySelector(".count");
  if (!countEl) return;
  const next = Math.max(0, Number(countEl.innerText || 0) + delta);
  countEl.innerText = next;
  updateRowTotal(card);
}

function calculateTotal() {
  let total = SERVICE_FEE;
  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    const qty = Number(countEl?.innerText || 0);
    const price = Number(card.dataset.price || 0);
    total += qty * price;
  });

  selectors.totalPrice.innerText = total % 1 === 0 ? total : total.toFixed(2);
}

function saveCalculation() {
  const name = selectors.calcName.value.trim();
  if (!name) return alert("Lütfen hesaplamaya bir isim verin.");

  const waiterName = getStoredWaiterName();
  if (!waiterName) {
    promptWaiterName(true);
    return alert("Lütfen önce garson adını kaydedin.");
  }

  const total = selectors.totalPrice.innerText;
  const items = [];

  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    const qty = Number(countEl?.innerText || 0);
    if (qty === 0) return;
    const productName = card.dataset.name;
    const price = Number(card.dataset.price || 0);
    items.push({ name: productName, qty, price });
  });

  items.push({ name: "Servis Hizmeti", qty: 1, price: SERVICE_FEE });

  if (items.length === 1) {
    return alert("Lütfen en az bir ürün seçin.");
  }

  const timestamp = editingId
    ? savedCalculations.find((c) => c.id === editingId)?.timestamp || Date.now()
    : Date.now();

  const calculation = {
    name,
    total,
    items,
    timestamp,
    date: new Date(timestamp).toLocaleString("tr-TR"),
    waiterName,
  };

  if (editingId) {
    updateOrder(editingId, calculation).finally(() => {
      editingId = null;
      selectors.saveButton.textContent = "Hesaplamayı Kaydet";
      resetForm(false);
    });
  } else {
    addOrder(calculation).finally(() => {
      resetForm(false);
    });
  }
}

function renderCalculationList() {
  selectors.calcList.innerHTML = "";

  if (!savedCalculations.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.innerHTML = "<strong>Henüz kayıt yok</strong><small>Kaydettiğiniz siparişler burada canlı olarak görünecek.</small>";
    selectors.calcList.appendChild(empty);
    return;
  }

  savedCalculations
    .slice()
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .forEach((calc) => {
      const li = document.createElement("li");
      li.className = "d-flex flex-column gap-2";

      const head = document.createElement("div");
      head.className = "calc-head flex-wrap";

      const titleWrap = document.createElement("div");
      titleWrap.className = "calc-title";

      const title = document.createElement("strong");
      title.textContent = calc.name;

      const date = document.createElement("span");
      date.className = "calc-date";
      date.textContent = calc.date;

      titleWrap.append(title, date);

      const total = document.createElement("span");
      total.className = "calc-total";
      total.textContent = `${calc.total} $`;

      head.append(titleWrap, total);

      const meta = document.createElement("div");
      meta.className = "order-meta";

      const waiter = document.createElement("span");
      waiter.className = "calc-waiter";
      waiter.textContent = `Garson: ${calc.waiterName || "-"}`;
      meta.appendChild(waiter);

      const badge = document.createElement("span");
      badge.className = "badge rounded-pill text-bg-light";
      badge.textContent = `${calc.items?.length || 0} satır`;
      meta.appendChild(badge);

      const items = document.createElement("div");
      items.className = "calc-items";
      calc.items.forEach((item) => {
        const chip = document.createElement("span");
        chip.className = "calc-chip";
        chip.textContent = `${item.name} x${item.qty}`;
        items.appendChild(chip);
      });

      const actions = document.createElement("div");
      actions.className = "calc-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-light btn-sm btn-edit";
      editBtn.textContent = "Düzenle";
      editBtn.addEventListener("click", () => editCalculation(calc.id));

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn btn-light btn-sm btn-copy";
      copyBtn.textContent = "Kopyala";
      copyBtn.addEventListener("click", () => copyList(calc.id));

      const downloadBtn = document.createElement("button");
      downloadBtn.className = "btn btn-light btn-sm btn-download";
      downloadBtn.textContent = "İndir";
      downloadBtn.addEventListener("click", () => downloadReceipt(calc));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-light btn-sm btn-delete";
      deleteBtn.textContent = "Sil";
      deleteBtn.addEventListener("click", () => deleteCalculation(calc.id));

      actions.append(editBtn, copyBtn, downloadBtn, deleteBtn);
      li.append(head, meta, items, actions);
      selectors.calcList.appendChild(li);
    });
}

function renderLeaderboard() {
  selectors.leaderboardList.innerHTML = "";
  const leaderboardData = savedCalculations.reduce((acc, calc) => {
    const name = (calc.waiterName || "Bilinmiyor").trim() || "Bilinmiyor";
    if (!acc[name]) {
      acc[name] = { name, count: 0 };
    }
    acc[name].count += 1;
    return acc;
  }, {});

  const rows = Object.values(leaderboardData).sort((a, b) => {
    if (b.count === a.count) return a.name.localeCompare(b.name);
    return b.count - a.count;
  });

  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "text-secondary small";
    empty.textContent = "Henüz sipariş yok. İlk siparişi kaydet!";
    selectors.leaderboardList.appendChild(empty);
    return;
  }

  rows.forEach((row, index) => {
    const li = document.createElement("li");
    li.className = "leaderboard-item";

    const meta = document.createElement("div");
    meta.className = "leaderboard-meta";

    const rank = document.createElement("span");
    rank.className = "badge text-bg-primary";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("strong");
    name.textContent = row.name;

    meta.append(rank, name);

    const numbers = document.createElement("div");
    numbers.className = "text-end";

    const orderCount = document.createElement("div");
    orderCount.className = "fw-semibold";
    orderCount.textContent = `${row.count} sipariş`;

    const serviceShare = document.createElement("small");
    const shareValue = row.count * SERVICE_FEE * SERVICE_SHARE_RATIO;
    serviceShare.className = "text-secondary";
    serviceShare.textContent = `Servis payı: ${shareValue.toFixed(0)} $`;

    numbers.append(orderCount, serviceShare);
    li.append(meta, numbers);
    selectors.leaderboardList.appendChild(li);
  });
}

function copyList(id) {
  const calc = savedCalculations.find((c) => c.id === id);
  if (!calc) return;
  let text = `${calc.name}: \nToplam: ${calc.total} $\nGarson: ${calc.waiterName || "-"}\n\nÜrünler:\n`;
  calc.items.forEach((item) => {
    text += `- ${item.name} x${item.qty} = ${item.qty * item.price} $\n`;
  });

  navigator.clipboard
    .writeText(text)
    .then(() => alert("Hesaplama detayları panoya kopyalandı!"))
    .catch(() => alert("Kopyalama başarısız oldu."));
}

function editCalculation(id) {
  const calc = savedCalculations.find((c) => c.id === id);
  if (!calc) return;
  editingId = id;
  selectors.calcName.value = calc.name;
  selectors.saveButton.textContent = "Güncelle";

  resetCounts();

  calc.items.forEach((item) => {
    if (item.name === "Servis Hizmeti") return;
    const card = Array.from(document.querySelectorAll(".product-card")).find(
      (c) => c.dataset.name === item.name
    );
    if (card) {
      const countEl = card.querySelector(".count");
      if (countEl) {
        countEl.textContent = item.qty;
        updateRowTotal(card);
      }
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteCalculation(id) {
  if (confirm("Bu hesaplamayı silmek istediğinizden emin misiniz?")) {
    deleteOrder(id);
  }
}

function resetForm(resetEditing = true) {
  selectors.calcName.value = "";
  resetCounts();
  selectors.totalPrice.innerText = SERVICE_FEE;
  if (resetEditing) {
    editingId = null;
    selectors.saveButton.textContent = "Hesaplamayı Kaydet";
  }
}

function updateWaiterStats() {
  const storedName = getStoredWaiterName();
  selectors.activeWaiterName.textContent = storedName || "-";

  const count = savedCalculations.filter((c) =>
    (c.waiterName || "").toLowerCase() === (storedName || "").toLowerCase()
  ).length;

  const share = count * SERVICE_FEE * SERVICE_SHARE_RATIO;
  selectors.waiterOrderCount.textContent = count;
  selectors.waiterServiceShare.textContent = `${share.toFixed(0)} $`;

  renderLeaderboard();
}

function resetCounts() {
  document
    .querySelectorAll(".product-card .count")
    .forEach((c) => (c.innerText = "0"));
  document
    .querySelectorAll(".row-total")
    .forEach((c) => (c.textContent = ""));
}

function downloadReceipt(calc) {
  const canvas = selectors.receiptCanvas;
  const ctx = canvas.getContext("2d");

  const width = 600;
  const lineHeight = 30;
  const padding = 40;
  const headerHeight = 120;
  const itemsHeight = calc.items.length * lineHeight + 60;
  const footerHeight = 100;
  const height = headerHeight + itemsHeight + footerHeight;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const weights = [1, 1, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const boxWidth = (i) => width * (weights[i] / totalWeight);

  let x = 0;
  ctx.fillStyle = "#00CC00";
  ctx.fillRect(x, 0, boxWidth(0), 50);
  x += boxWidth(0);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, 0, boxWidth(1), 50);
  x += boxWidth(1);

  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x, 0, boxWidth(2), 50);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("CASA CARMARETTI", width / 2, 40);

  ctx.fillStyle = "#333";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(calc.name, padding, 110);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText(calc.date, padding, 135);

  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, 150);
  ctx.lineTo(width - padding, 150);
  ctx.stroke();

  let yPos = 180;
  ctx.font = "16px Arial";
  ctx.fillStyle = "#333";

  calc.items.forEach((item) => {
    const itemTotal = item.qty * item.price;

    ctx.textAlign = "left";
    ctx.fillText(item.name, padding, yPos);
    ctx.fillText(`x${item.qty}`, padding + 250, yPos);

    ctx.textAlign = "right";
    ctx.fillText(`${item.price} $`, width - padding - 100, yPos);
    ctx.fillText(`${itemTotal} $`, width - padding, yPos);

    yPos += lineHeight;
  });

  yPos += 10;
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, yPos);
  ctx.lineTo(width - padding, yPos);
  ctx.stroke();

  yPos += 40;
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#28a745";
  ctx.textAlign = "left";
  ctx.fillText("TOPLAM:", padding, yPos);

  ctx.textAlign = "right";
  ctx.fillText(`${calc.total} $`, width - padding, yPos);

  yPos += 50;
  ctx.font = "12px Arial";
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  ctx.fillText("Bizi tercih ettiğiniz için teşekkür ederiz!", width / 2, yPos - 10);

  const link = document.createElement("a");
  link.download = `${calc.name.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function handleKeyboardSubmit(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    saveCalculation();
  }
}

function attachEvents() {
  selectors.categories.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");
    if (!card) return;

    if (event.target.classList.contains("add-btn")) {
      changeCount(card, 1);
    }

    if (event.target.classList.contains("remove-btn")) {
      changeCount(card, -1);
    }
  });

  selectors.saveButton.addEventListener("click", saveCalculation);
  selectors.calcName.addEventListener("keydown", handleKeyboardSubmit);

  selectors.waiterChangeButton?.addEventListener("click", () => {
    promptWaiterName(true);
  });

  selectors.waiterModalSave?.addEventListener("click", () => {
    setWaiterName(selectors.waiterModalInput?.value || "");
  });

  selectors.waiterModalInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setWaiterName(selectors.waiterModalInput.value);
    }
  });
}

function initCalculator() {
  loadProducts();
  attachEvents();
  calculateTotal();
  renderCalculationList();
  updateWaiterStats();
  unsubscribeOrders = listenOrders((orders) => {
    savedCalculations = orders || [];
    renderCalculationList();
    updateWaiterStats();
  });

  promptWaiterName();
}

document.addEventListener("DOMContentLoaded", initCalculator);
