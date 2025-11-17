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

let savedCalculations = [];
let editingIndex = -1;

function loadProducts() {
  const container = document.getElementById("categories");
  container.innerHTML = "";

  for (const category in products) {
    const categoryGroup = document.createElement("div");
    categoryGroup.className = "category-group";

    const categoryTitle = document.createElement("h3");
    categoryTitle.textContent = category;
    categoryGroup.appendChild(categoryTitle);

    const grid = document.createElement("div");
    grid.className = "product-grid";

    products[category].forEach((item) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.price = item.price;
      card.dataset.name = item.name;

      const nameDiv = document.createElement("div");
      nameDiv.className = "product-name";
      nameDiv.textContent = item.name;

      const priceDiv = document.createElement("div");
      priceDiv.className = "product-price";
      priceDiv.textContent = `${item.price} $`;

      const controlsDiv = document.createElement("div");
      controlsDiv.className = "controls";

      const minusBtn = document.createElement("button");
      minusBtn.className = "remove-btn";
      minusBtn.textContent = "-";
      minusBtn.onclick = function () {
        decrease(this);
      };

      const countSpan = document.createElement("span");
      countSpan.className = "count";
      countSpan.textContent = "0";

      const plusBtn = document.createElement("button");
      plusBtn.className = "add-btn";
      plusBtn.textContent = "+";
      plusBtn.onclick = function () {
        increase(this);
      };

      controlsDiv.appendChild(minusBtn);
      controlsDiv.appendChild(countSpan);
      controlsDiv.appendChild(plusBtn);

      const totalDiv = document.createElement("div");
      totalDiv.className = "row-total";
      totalDiv.textContent = "";

      card.appendChild(nameDiv);
      card.appendChild(priceDiv);
      card.appendChild(controlsDiv);
      card.appendChild(totalDiv);

      grid.appendChild(card);
    });

    categoryGroup.appendChild(grid);
    container.appendChild(categoryGroup);
  }
}

function increase(btn) {
  const card = btn.closest(".product-card");
  if (!card) return;
  const countEl = card.querySelector(".count");
  if (!countEl) return;
  countEl.innerText = Number(countEl.innerText || 0) + 1;
  const price = Number(card.dataset.price || 0);
  updateRowTotal(card, price);
}

function decrease(btn) {
  const card = btn.closest(".product-card");
  if (!card) return;
  const countEl = card.querySelector(".count");
  if (!countEl) return;
  if (Number(countEl.innerText || 0) > 0) {
    countEl.innerText = Number(countEl.innerText) - 1;
    const price = Number(card.dataset.price || 0);
    updateRowTotal(card, price);
  }
}

function updateRowTotal(card, price) {
  if (!card) return;
  const countEl = card.querySelector(".count");
  const totalDiv = card.querySelector(".row-total");
  if (!countEl || !totalDiv) return;
  const qty = Number(countEl.innerText || 0);
  const total = qty * price;
  totalDiv.textContent = qty > 0 ? `${total} $` : "";
  calculateTotal();
}

function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    if (!countEl) return;
    const qty = Number(countEl.innerText || 0);
    const price = Number(card.dataset.price || 0);
    total += qty * price;
  });
  document.getElementById("totalPrice").innerText =
    total % 1 === 0 ? total : total.toFixed(2);
}

function saveCalculation() {
  const name = document.getElementById("calcName").value.trim();
  if (!name) return alert("Lütfen hesaplamaya bir isim verin.");

  const total = document.getElementById("totalPrice").innerText;
  const items = [];

  document.querySelectorAll(".product-card").forEach((card) => {
    const countEl = card.querySelector(".count");
    if (!countEl) return;
    const qty = Number(countEl.innerText || 0);
    if (qty === 0) return;
    const productName = card.dataset.name;
    const price = Number(card.dataset.price || 0);
    items.push({ name: productName, qty: qty, price: price });
  });

  if (items.length === 0) {
    return alert("Lütfen en az bir ürün seçin.");
  }

  const calculation = {
    name: name,
    total: total,
    items: items,
    date: new Date().toLocaleString("tr-TR"),
  };

  if (editingIndex >= 0) {
    savedCalculations[editingIndex] = calculation;
    editingIndex = -1;
    document.getElementById("saveButton").textContent = "Hesaplamayı Kaydet";
  } else {
    savedCalculations.push(calculation);
  }

  renderCalculationList();
  resetForm();
}

function renderCalculationList() {
  const list = document.getElementById("calcList");
  list.innerHTML = "";

  savedCalculations.forEach((calc, index) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "calc-info";
    const breakdown = calc.items
      .map((item) => `${item.name} x${item.qty}`)
      .join(", ");
    info.innerHTML = `<strong>${calc.name}</strong>: ${calc.total} $<br><small>${calc.date}</small><br><small>${breakdown}</small>`;

    const actions = document.createElement("div");
    actions.className = "calc-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn-edit";
    editBtn.textContent = "Düzenle";
    editBtn.onclick = () => editCalculation(index);

    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-copy";
    copyBtn.textContent = "Kopyala";
    copyBtn.onclick = () => copyList(index);

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-download";
    downloadBtn.textContent = "İndir";
    downloadBtn.onclick = () => downloadReceipt(calc);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.textContent = "Sil";
    deleteBtn.onclick = () => deleteCalculation(index);

    actions.appendChild(editBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    list.appendChild(li);
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
    .then(() => {
      alert("Hesaplama detayları panoya kopyalandı!");
    })
    .catch((err) => {
      alert("Kopyalama başarısız oldu: ", err);
    });
}

function editCalculation(index) {
  const calc = savedCalculations[index];
  editingIndex = index;

  document.getElementById("calcName").value = calc.name;
  document.getElementById("saveButton").textContent = "Güncelle";

  resetCounts();

  calc.items.forEach((item) => {
    const card = Array.from(document.querySelectorAll(".product-card")).find(
      (c) => c.dataset.name === item.name
    );
    if (card) {
      const countEl = card.querySelector(".count");
      if (countEl) {
        countEl.textContent = item.qty;
        const price = Number(card.dataset.price || 0);
        updateRowTotal(card, price);
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
  document.getElementById("calcName").value = "";
  resetCounts();
  document.getElementById("totalPrice").innerText = "0";
}

function resetCounts() {
  document
    .querySelectorAll(".product-card .count")
    .forEach((c) => (c.innerText = "0"));
  document.querySelectorAll(".row-total").forEach((c) => (c.textContent = ""));
}

function downloadReceipt(calc) {
  const canvas = document.getElementById("receiptCanvas");
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

  // Arka plan
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  /* ----------------- BAŞLIK (3 kutuya bölünmüş) ----------------- */

  // 3 kutu için weight değerleri (istersen değiştirebilirsin)
  const weights = [1, 1, 1];
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const boxWidth = (i) => width * (weights[i] / totalWeight);

  let x = 0;

  // 1. kutu (yeşil)
  ctx.fillStyle = "#00CC00";
  ctx.fillRect(x, 0, boxWidth(0), 50);
  x += boxWidth(0);

  // 2. kutu
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, 0, boxWidth(1), 50);
  x += boxWidth(1);

  // 3. kutu
  ctx.fillStyle = "#FF0000";
  ctx.fillRect(x, 0, boxWidth(2), 50);

  /* ----------------- BAŞLIK METNİ ----------------- */
  ctx.fillStyle = "#333333";
  ctx.font = "bold 32px Arial";
  ctx.textAlign = "center";
  ctx.fillText("CASA CARMARETTI", width / 2, 40);

  /* ----------------- TARİH + SİPARİŞ ADI ----------------- */
  ctx.fillStyle = "#333";
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(calc.name, padding, 110);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText(calc.date, padding, 135);

  /* ----------------- ÇİZGİ ----------------- */
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, 150);
  ctx.lineTo(width - padding, 150);
  ctx.stroke();

  /* ----------------- ÜRÜNLER ----------------- */
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

  /* ----------------- ALT ÇİZGİ ----------------- */
  yPos += 10;
  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, yPos);
  ctx.lineTo(width - padding, yPos);
  ctx.stroke();

  /* ----------------- TOPLAM ----------------- */
  yPos += 40;
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#28a745";
  ctx.textAlign = "left";
  ctx.fillText("TOPLAM:", padding, yPos);

  ctx.textAlign = "right";
  ctx.fillText(`${calc.total} $`, width - padding, yPos);

  /* ----------------- FOOTER ----------------- */
  yPos += 50;
  ctx.font = "12px Arial";
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  ctx.fillText(
    "Bizi tercih ettiğiniz için teşekkür ederiz!",
    width / 2,
    yPos - 10
  );

  /* ----------------- İNDİRME ----------------- */
  const link = document.createElement("a");
  link.download = `${calc.name.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

loadProducts();
