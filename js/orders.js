// orders.js
import { ordersRef, push, remove, onValue, ref, update, child, db, monitor } from "./firebase.js";

/* =========================================
   ERROR HANDLING & RETRY LOGIC
   ========================================= */
class RetryableOperation {
  constructor(maxRetries = 3, delayMs = 1000) {
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
  }

  async execute(fn, label = 'Operation') {
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn();
        if (attempt > 1) {
          console.log(`[Retry] ${label} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[Retry] ${label} failed (attempt ${attempt}/${this.maxRetries}):`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.delayMs * attempt; // Exponential backoff
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    monitor.log('ERROR', `${label} failed after ${this.maxRetries} retries`, { error: lastError.message });
    throw lastError;
  }
}

const retry = new RetryableOperation(3, 500);

// Waiter stats reference in DB
const waiterStatsRef = ref(db, "waiterStats");

// Masters (Şef Garsonlar) reference in DB
const mastersRef = ref(db, "masters");

// Cashiers (Kasiyerler) reference in DB
const cashiersRef = ref(db, "cashiers");

// Yeni sipariş ekleme
export async function addOrder(order) {
  if (!order) return null;
  return await retry.execute(() => push(ordersRef, order), 'addOrder');
}

// Sipariş güncelleme
export async function updateOrder(orderId, order) {
  if (!orderId || !order) return null;
  return await retry.execute(() => update(child(ordersRef, orderId), order), 'updateOrder');
}

// Sipariş teslim edildi olarak işaretleme (Garson tarafından - hesap kapatma)
export async function orderDelivered(orderId) {
  if (!orderId) return null;
  return await retry.execute(() => update(child(ordersRef, orderId), { delivered: true }), 'orderDelivered');
}

// Sipariş hazır olarak işaretleme (Mutfak tarafından - yemek hazır)
export async function orderReady(orderId) {
  if (!orderId) return null;
  return await retry.execute(() => update(child(ordersRef, orderId), { ready: true }), 'orderReady');
}

// Sipariş ödendi olarak işaretleme (Kasa tarafından)
export async function orderPaid(orderId) {
  if (!orderId) return null;
  return await retry.execute(() => update(child(ordersRef, orderId), { paid: true }), 'orderPaid');
}

// Sipariş silme
export function deleteOrder(orderId) {
  return retry.execute(() => remove(child(ordersRef, orderId)), 'deleteOrder');
}

// Realtime listener
export function listenOrders(callback) {
  return onValue(ordersRef, (snapshot) => {
    const orders = [];
    snapshot.forEach((child) => {
      orders.push({ id: child.key, ...child.val() });
    });
    callback?.(orders);
  });
}

// Listen to waiter stats stored in DB
export function listenWaiterStats(callback) {
  return onValue(waiterStatsRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback?.(data);
  });
}

// Set waiter stats in DB (overwrites or updates children)
export async function setWaiterStats(stats) {
  if (!stats) return null;
  return await retry.execute(() => update(waiterStatsRef, stats), 'setWaiterStats');
}

// Listen to masters list for dynamic authorization
export function listenMasters(callback) {
  return onValue(mastersRef, (snapshot) => {
    const data = snapshot.val();
    let masters = [];

    if (!data) {
      // Fallback & Auto-create if empty
      const defaultMasters = ["Samuel Pugliani", "Austin Marcelli"]; // Default defaults
      masters = defaultMasters.map(n => n.toLowerCase().trim());
      // Auto-populate DB for convenience
      update(ref(db), { "masters": defaultMasters }).catch(err => console.warn("Auto-create masters failed", err));
      console.log("Masters DB empty, using defaults and auto-creating...");
    } else {
      if (Array.isArray(data)) {
        masters = data.map(n => n.toLowerCase().trim());
      } else if (typeof data === 'object') {
        masters = Object.values(data).map(n => String(n).toLowerCase().trim());
      }
    }

    callback?.(masters);
  });
}

// Listen to cashiers list for dynamic authorization
export function listenCashiers(callback) {
  return onValue(cashiersRef, (snapshot) => {
    const data = snapshot.val();
    let cashiers = [];

    if (!data) {
      // Fallback & Auto-create if empty
      const defaultCashiers = ["Frederick Scarcelli", "Serena Castello"]; // Default defaults
      cashiers = defaultCashiers.map(n => n.toLowerCase().trim());
      // Auto-populate DB for convenience
      update(ref(db), { "cashiers": defaultCashiers }).catch(err => console.warn("Auto-create cashiers failed", err));
      console.log("Cashiers DB empty, using defaults and auto-creating...");
    } else {
      if (Array.isArray(data)) {
        cashiers = data.map(n => n.toLowerCase().trim());
      } else if (typeof data === 'object') {
        cashiers = Object.values(data).map(n => String(n).toLowerCase().trim());
      }
    }

    callback?.(cashiers);
  });
}

// Upload receipt PNG to Cloudinary
export async function uploadReceipt(orderId, blob) {
  if (!orderId || !blob) return null;

  const cloudName = window.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = window.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    monitor.log('WARN', 'Cloudinary not configured');
    return null;
  }

  try {
    return await retry.execute(async () => {
      const formData = new FormData();
      formData.append('file', blob, `receipt_${orderId}.png`);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'receipts');
      formData.append('public_id', `${orderId}_${Date.now()}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData, timeout: 15000 }
      );

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      const data = await response.json();
      const downloadURL = data.secure_url;

      // Save receipt URL to order in Firebase
      await update(child(ordersRef, orderId), { receiptUrl: downloadURL });

      return downloadURL;
    }, 'uploadReceipt');
  } catch (error) {
    monitor.log('ERROR', 'Receipt upload failed', { error: error.message, orderId });
    throw error;
  }
}
