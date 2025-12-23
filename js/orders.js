// orders.js
import { ordersRef, push, remove, onValue, ref, update, child, db } from "./firebase.js";

// Waiter stats reference in DB
const waiterStatsRef = ref(db, "waiterStats");

// Masters (Şef Garsonlar) reference in DB
const mastersRef = ref(db, "masters");

// Yeni sipariş ekleme
export async function addOrder(order) {
  if (!order) return null;
  return await push(ordersRef, order);
}

// Sipariş güncelleme
export async function updateOrder(orderId, order) {
  if (!orderId || !order) return null;
  return await update(child(ordersRef, orderId), order);
}

// Sipariş teslim edildi olarak işaretleme (Garson tarafından - hesap kapatma)
export async function orderDelivered(orderId) {
  if (!orderId) return null;
  return await update(child(ordersRef, orderId), { delivered: true });
}

// Sipariş hazır olarak işaretleme (Mutfak tarafından - yemek hazır)
export async function orderReady(orderId) {
  if (!orderId) return null;
  return await update(child(ordersRef, orderId), { ready: true });
}

// Sipariş silme
export function deleteOrder(orderId) {
  return remove(child(ordersRef, orderId));
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
  return await update(waiterStatsRef, stats);
}

// Listen to masters list for dynamic authorization
export function listenMasters(callback) {
  return onValue(mastersRef, (snapshot) => {
    const data = snapshot.val();
    // Expecting either an array or object with names
    let masters = [];
    if (Array.isArray(data)) {
      masters = data.map(n => n.toLowerCase().trim());
    } else if (data && typeof data === 'object') {
      masters = Object.values(data).map(n => String(n).toLowerCase().trim());
    }
    callback?.(masters);
  });
}
