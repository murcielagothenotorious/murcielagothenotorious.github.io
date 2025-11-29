import { addOrder, deleteOrder, listenOrders, updateOrder, orderDelivered } from "./orders.js";

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
const WAITER_STATS_KEY = "waiterStats";
const MASTER_WAITERS = ["samuel pugliani", "austin marcelli", "frederick scarcelli", "serena castello"];
let savedCalculations = [];
let editingId = null;
let unsubscribeOrders = null;
let waiterModalInstance = null;
let receiptFontPromise = null;
let _initialOrdersLoaded = false;

const RECEIPT_FONT_FAMILY = '"Inconsolata", "Courier New", monospace';
const RECEIPT_ITEM_FONT = `14px ${RECEIPT_FONT_FAMILY}`;

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
  waiterModal: document.getElementById("waiterModal"),
  waiterModalInput: document.getElementById("waiterModalInput"),
  waiterModalSave: document.getElementById("waiterModalSave"),
};

const normalizeName = (name = "") => name.trim();
const normalizeKey = (name = "") => normalizeName(name).toLowerCase();

function loadWaiterStats() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WAITER_STATS_KEY)) || {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "number") {
        parsed[key] = { name: key, count: value };
      }
    });
    return parsed;
  } catch (error) {
    console.error("Waiter stats parse failed", error);
    return {};
  }
}

function saveWaiterStats(stats) {
  localStorage.setItem(WAITER_STATS_KEY, JSON.stringify(stats));
}

function isMasterWaiter(name) {
  return MASTER_WAITERS.includes(normalizeKey(name));
}

function syncStatsWithOrders(orders) {
  const stats = loadWaiterStats();
  const counts = {};

  (orders || []).forEach((order) => {
    const name = normalizeName(order.waiterName || "Bilinmiyor");
    const key = normalizeKey(name);
    if (!key) return;
    if (!counts[key]) {
      counts[key] = { name, count: 0 };
    }
    counts[key].count += 1;
  });

  let changed = false;
  Object.entries(counts).forEach(([key, value]) => {
    if (!stats[key]) {
      stats[key] = value;
      changed = true;
      return;
    }

    if (!stats[key].name) stats[key].name = value.name;
    if ((stats[key].count || 0) < value.count) {
      stats[key].count = value.count;
      changed = true;
    }
  });

  if (changed) {
    saveWaiterStats(stats);
  }

  return stats;
}

function adjustWaiterCount(name, delta) {
  const stats = loadWaiterStats();
  const key = normalizeKey(name);
  if (!key) return stats;

  const current = stats[key]?.count || 0;
  const next = Math.max(0, current + delta);
  stats[key] = {
    name: stats[key]?.name || normalizeName(name),
    count: next,
  };

  saveWaiterStats(stats);
  return stats;
}

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
      header.className =
        "d-flex align-items-start justify-content-between gap-3";

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
  let productTotal = 0;
  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    const qty = Number(countEl?.innerText || 0);
    const price = Number(card.dataset.price || 0);
    productTotal += qty * price;
  });

  const includeService = productTotal > 0;
  const total = productTotal + (includeService ? SERVICE_FEE : 0);
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

  let productTotal = 0;
  const items = [];

  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    const qty = Number(countEl?.innerText || 0);
    if (qty === 0) return;
    const productName = card.dataset.name;
    const price = Number(card.dataset.price || 0);
    const lineTotal = qty * price;
    productTotal += lineTotal;
    items.push({ name: productName, qty, price });
  });

  const includeService = productTotal > 0;
  if (!items.length) {
    return alert("Lütfen en az bir ürün seçin.");
  }

  const total = includeService ? productTotal + SERVICE_FEE : productTotal;

  if (includeService) {
    items.push({ name: "Servis Hizmeti", qty: 1, price: SERVICE_FEE });
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
      selectors.saveButton.textContent = "Siparişi Kaydet";
      resetForm(false);
    });
  } else {
    const stats = adjustWaiterCount(waiterName, 1);
    updateWaiterStats(stats);
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
    empty.innerHTML =
      "<small>Kaydedilen siparişler burada canlı olarak görünecek.</small>";
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

      const deliveredBtn = document.createElement("button");
      deliveredBtn.className = "btn btn-light btn-sm btn-delivered";
      deliveredBtn.textContent = calc.delivered ? "Teslim Edildi" : "Teslim Et";
      deliveredBtn.disabled = !!calc.delivered;
      deliveredBtn.addEventListener("click", () => handleOrderDelivered(calc.id, li, deliveredBtn));

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

      actions.append(editBtn, copyBtn, downloadBtn, deleteBtn, deliveredBtn);
      if (calc.delivered) {
        li.classList.add("order-delivered");
      }

      li.append(head, meta, items, actions);
      selectors.calcList.appendChild(li);
    });
}

function renderLeaderboard(stats = loadWaiterStats()) {
  selectors.leaderboardList.innerHTML = "";
  const rows = Object.values(stats || {})
    .filter((entry) => entry?.name)
    .sort((a, b) => {
      if ((b.count || 0) === (a.count || 0)) {
        return (a.name || "").localeCompare(b.name || "");
      }
      return (b.count || 0) - (a.count || 0);
    });

  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "text-secondary small";
    empty.textContent = "İlk siparişi kaydet ve sıralamayı başlat.";
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
    orderCount.textContent = `${row.count || 0} sipariş`;

    const serviceShare = document.createElement("small");
    const shareValue = (row.count || 0) * SERVICE_FEE * SERVICE_SHARE_RATIO;
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
  let text = `${calc.name}: \nToplam: ${calc.total} $\nGarson: ${
    calc.waiterName || "-"
  }\n\nÜrünler:\n`;
  calc.items.forEach((item) => {
    text += `- ${item.name} x${item.qty} = ${item.qty * item.price} $\n`;
  });

  navigator.clipboard
    .writeText(text)
    .then(() => alert("Sipariş detayları panoya kopyalandı!"))
    .catch(() => alert("Kopyalama başarısız oldu."));
}

function isDelivered(id) {
  if (!id) return false;
  const calc = savedCalculations.find((c) => c.id === id);
  return !!(calc && calc.delivered);
}

function handleOrderDelivered(id, listItem, button) {
  if (!id) return;
  orderDelivered(id)
    .then(() => {
      if (listItem) listItem.classList.add("order-delivered");
      if (button) {
        button.textContent = "Teslim Edildi";
        button.disabled = true;
      }
      const calc = savedCalculations.find((c) => c.id === id);
      const actor = getStoredWaiterName();
      const master = isMasterWaiter(actor);
      if (calc?.waiterName && !master) {
        const stats = adjustWaiterCount(calc.waiterName, -1);
        updateWaiterStats(stats);
      }
    })
    .catch(() => alert("İşaretleme başarısız oldu."));
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
  const calc = savedCalculations.find((c) => c.id === id);
  if (!calc) return;

  const actor = getStoredWaiterName();
  const master = isMasterWaiter(actor);
  const delivered = !!calc.delivered;

  if (!master && !delivered) {
    return alert("Bu siparişi yalnızca yönetici garson silebilir çünkü henüz teslim edilmedi.");
  }

  if (!confirm("Bu siparişi silmek istediğinizden emin misiniz?")) return;

  if (calc?.waiterName && !delivered && !master) {
    const stats = adjustWaiterCount(calc.waiterName, -1);
    updateWaiterStats(stats);
  } else if (calc?.waiterName && master && !delivered) {
    const stats = adjustWaiterCount(calc.waiterName, -1);
    updateWaiterStats(stats);
  }

  deleteOrder(id);
}

function resetForm(resetEditing = true) {
  selectors.calcName.value = "";
  resetCounts();
  selectors.totalPrice.innerText = 0;
  if (resetEditing) {
    editingId = null;
    selectors.saveButton.textContent = "Siparişi Kaydet";
  }
}

function updateWaiterStats(stats = loadWaiterStats()) {
  const storedName = getStoredWaiterName();
  selectors.activeWaiterName.textContent = storedName || "-";

  const key = normalizeKey(storedName);
  const count = key && stats[key]?.count ? stats[key].count : 0;

  const share = count * SERVICE_FEE * SERVICE_SHARE_RATIO;
  selectors.waiterOrderCount.textContent = count;
  selectors.waiterServiceShare.textContent = `${share.toFixed(0)} $`;

  renderLeaderboard(stats);
}

function resetCounts() {
  document
    .querySelectorAll(".product-card .count")
    .forEach((c) => (c.innerText = "0"));
  document.querySelectorAll(".row-total").forEach((c) => (c.textContent = ""));
}

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
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      return;
    }

    const chars = word.split("");
    let segment = "";
    chars.forEach((char) => {
      const attempt = segment + char;
      if (ctx.measureText(attempt).width <= maxWidth) {
        segment = attempt;
      } else {
        if (segment) lines.push(segment);
        segment = char;
      }
    });
    currentLine = segment;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function downloadReceipt(calc) {
  await ensureReceiptFont();

  const canvas = selectors.receiptCanvas;
  const ctx = canvas.getContext("2d");

  const width = 480;
  const padding = 32;
  const lineHeight = 26;
  const headerHeight = 220;
  const colName = padding;
  const colQty = width - padding - 190;
  const nameColumnWidth = colQty - colName - 14;

  canvas.width = width;
  ctx.font = RECEIPT_ITEM_FONT;

  const preparedItems = calc.items.map((item) => ({
    ...item,
    lines: wrapText(ctx, item.name, nameColumnWidth),
  }));

  const itemsHeight =
    preparedItems
      .filter((item) => !item.name.toLowerCase().includes("servis"))
      .reduce((total, item) => total + item.lines.length * lineHeight, 0) + 40;
  const footerHeight = 250;
  const height = headerHeight + itemsHeight + footerHeight;

  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#fdfaf3";
  ctx.fillRect(0, 0, width, height);

  const sideNotch = (x) => {
    ctx.strokeStyle = "#d6d3d1";
    ctx.lineWidth = 1.2;
    for (let y = 10; y < height - 10; y += 12) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y + 2);
      ctx.stroke();
    }
  };

  sideNotch(8);
  sideNotch(width - 14);

  const drawSeparator = (yPos) => {
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, yPos);
    ctx.lineTo(width - padding, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  let yPos = padding + 12;

  ctx.fillStyle = "#0f172a";
  ctx.font = `700 26px ${RECEIPT_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.fillText("CASA CARMARETTI", width / 2, yPos);
  yPos += 30;

  ctx.font = `600 16px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#1f2937";
  ctx.fillText("Fine Dining", width / 2, yPos);
  yPos += 22;

  ctx.font = `14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#4b5563";
  ctx.fillText("Downtown Vinewood Power St.", width / 2, yPos);
  yPos += 18;
  ctx.fillText("PH: 62618712", width / 2, yPos);

  yPos += 26;
  drawSeparator(yPos);
  yPos += 22;

  ctx.textAlign = "left";
  ctx.font = `600 15px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#111827";
  ctx.fillText(`Fiş: ${calc.name}`, padding, yPos);
  yPos += 22;
  ctx.font = `14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#374151";
  ctx.fillText(`Tarih: ${calc.date}`, padding, yPos);
  yPos += 20;
  ctx.fillText(`Garson: ${calc.waiterName || "-"}`, padding, yPos);

  yPos += 26;
  drawSeparator(yPos);
  yPos += 30;

  const colPrice = width - padding - 110;
  const colTotal = width - padding;

  ctx.font = `600 14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#111827";
  ctx.textAlign = "left";
  ctx.fillText("Ürün", colName, yPos);
  ctx.textAlign = "center";
  ctx.fillText("Adet", colQty, yPos);
  ctx.textAlign = "right";
  ctx.fillText("Birim", colPrice, yPos);
  ctx.fillText("Ara Toplam", colTotal, yPos);

  yPos += 14;
  drawSeparator(yPos);
  yPos += 18;

  let subtotal = 0;
  let serviceFee = 0;

  ctx.font = RECEIPT_ITEM_FONT;
  ctx.fillStyle = "#111827";

  preparedItems.forEach((item) => {
    const itemTotal = item.qty * item.price;
    const isService = item.name.toLowerCase().includes("servis");
    if (isService) {
      serviceFee += itemTotal;
      return;
    } else {
      subtotal += itemTotal;
    }

    item.lines.forEach((line, idx) => {
      ctx.textAlign = "left";
      ctx.fillText(line, colName, yPos);

      if (idx === 0) {
        ctx.textAlign = "center";
        ctx.fillText(`x${item.qty}`, colQty, yPos);

        ctx.textAlign = "right";
        ctx.fillText(`${item.price} $`, colPrice, yPos);
        ctx.fillText(`${itemTotal} $`, colTotal, yPos);
      }

      yPos += lineHeight;
    });
  });

  yPos -= 6;
  drawSeparator(yPos);
  yPos += 28;

  ctx.font = `600 15px ${RECEIPT_FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#374151";
  ctx.fillText("Ara toplam", colName, yPos);
  ctx.textAlign = "right";
  ctx.fillText(`${subtotal.toFixed(2)} $`, colTotal, yPos);

  yPos += 22;
  ctx.textAlign = "left";
  ctx.fillStyle = "#374151";
  ctx.fillText("Servis", colName, yPos);
  ctx.textAlign = "right";
  ctx.fillText(`${serviceFee.toFixed(2)} $`, colTotal, yPos);

  yPos += 26;
  ctx.font = `700 17px ${RECEIPT_FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  ctx.fillText("TOPLAM", colName, yPos);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "right";
  ctx.fillText(`${calc.total.toFixed(2)} $`, colTotal, yPos);

  yPos += 32;
  drawSeparator(yPos);
  yPos += 28;

  ctx.font = `14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillStyle = "#1f2937";
  ctx.textAlign = "left";
  ctx.fillText("Ödeme yöntemi: Kart", colName, yPos);
  yPos += 20;
  ctx.fillText(`Fiş No: ${calc.timestamp || Date.now()}`, colName, yPos);
  yPos += 20;

  yPos += 32;
  ctx.textAlign = "center";
  ctx.fillStyle = "#111827";
  ctx.font = `600 14px ${RECEIPT_FONT_FAMILY}`;
  ctx.fillText("Bizi tercih ettiğiniz için teşekkür ederiz!", width / 2, yPos);

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
  updateWaiterStats(syncStatsWithOrders(savedCalculations));
  unsubscribeOrders = listenOrders((orders) => {
    const nextOrders = orders || [];
    const prevIds = new Set((savedCalculations || []).map((o) => o.id));
    const newOnes = nextOrders.filter((o) => !prevIds.has(o.id));

    savedCalculations = nextOrders;
    const stats = syncStatsWithOrders(savedCalculations);
    renderCalculationList();
    updateWaiterStats(stats);

    if (_initialOrdersLoaded && newOnes.length > 0) {
      try {
        playNewOrderSound(newOnes.length);
      } catch (e) {
        console.warn("New order sound failed", e);
      }
    }
    _initialOrdersLoaded = true;
  });

  promptWaiterName();
}

function playNewOrderSound(count = 1) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const now = ctx.currentTime;
  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, now + i * 0.18);
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.2);
  }
  setTimeout(() => {
    try {
      ctx.close();
    } catch (e) {}
  }, Math.max(600, count * 200));
}

document.addEventListener("DOMContentLoaded", initCalculator);
