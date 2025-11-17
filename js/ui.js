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
let savedCalculations = [];
let editingIndex = -1;

const selectors = {
  categories: document.getElementById("categories"),
  calcList: document.getElementById("calcList"),
  totalPrice: document.getElementById("totalPrice"),
  calcName: document.getElementById("calcName"),
  saveButton: document.getElementById("saveButton"),
  receiptCanvas: document.getElementById("receiptCanvas"),
};

function loadProducts() {
  selectors.categories.innerHTML = "";

  Object.entries(products).forEach(([category, items]) => {
    const group = document.createElement("div");
    group.className = "category-group";

    const title = document.createElement("h3");
    title.textContent = category;
    group.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "product-grid";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.price = item.price;
      card.dataset.name = item.name;

      const name = document.createElement("div");
      name.className = "product-name";
      name.textContent = item.name;

      const price = document.createElement("div");
      price.className = "product-price";
      price.textContent = `${item.price} $`;

      const controls = document.createElement("div");
      controls.className = "controls";

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
      rowTotal.className = "row-total";

      card.append(name, price, controls, rowTotal);
      grid.appendChild(card);
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

  const calculation = {
    name,
    total,
    items,
    date: new Date().toLocaleString("tr-TR"),
  };

  if (editingIndex >= 0) {
    savedCalculations[editingIndex] = calculation;
    editingIndex = -1;
    selectors.saveButton.textContent = "Hesaplamayı Kaydet";
  } else {
    savedCalculations.push(calculation);
  }

  renderCalculationList();
  resetForm();
}

function renderCalculationList() {
  selectors.calcList.innerHTML = "";

  savedCalculations.forEach((calc, index) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "calc-info";
    const breakdown = calc.items
      .map((item) => `${item.name} x${item.qty}`)
      .join(", ");
    info.innerHTML = `<strong>${calc.name}</strong><small>${calc.date}</small><small>${breakdown}</small><strong>${calc.total} $</strong>`;

    const actions = document.createElement("div");
    actions.className = "calc-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => editCalculation(index));

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-copy";
    copyBtn.textContent = "Kopyala";
    copyBtn.addEventListener("click", () => copyList(index));

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-download";
    downloadBtn.textContent = "İndir";
    downloadBtn.addEventListener("click", () => downloadReceipt(calc));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.textContent = "Sil";
    deleteBtn.addEventListener("click", () => deleteCalculation(index));

    actions.append(editBtn, copyBtn, downloadBtn, deleteBtn);
    li.append(info, actions);
    selectors.calcList.appendChild(li);
  });
}

function copyList(index) {
  const calc = savedCalculations[index];
  let text = `${calc.name}: \nToplam: ${calc.total} $\n\nÜrünler:\n`;
  calc.items.forEach((item) => {
    text += `- ${item.name} x${item.qty} = ${item.qty * item.price} $\n`;
  });

  navigator.clipboard
    .writeText(text)
    .then(() => alert("Hesaplama detayları panoya kopyalandı!"))
    .catch(() => alert("Kopyalama başarısız oldu."));
}

function editCalculation(index) {
  const calc = savedCalculations[index];
  editingIndex = index;
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

function deleteCalculation(index) {
  if (confirm("Bu hesaplamayı silmek istediğinizden emin misiniz?")) {
    savedCalculations.splice(index, 1);
    renderCalculationList();
  }
}

function resetForm() {
  selectors.calcName.value = "";
  resetCounts();
  selectors.totalPrice.innerText = SERVICE_FEE;
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
}

function initCalculator() {
  loadProducts();
  attachEvents();
  calculateTotal();
}

document.addEventListener("DOMContentLoaded", initCalculator);
