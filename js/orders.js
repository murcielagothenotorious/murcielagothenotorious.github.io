// orders.js
import { ordersRef, push, remove, onValue, ref, update, child, db } from "./firebase.js";

// Waiter stats reference in DB
const waiterStatsRef = ref(db, "waiterStats");

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

// Sipariş teslim edildi olarak işaretleme
export async function orderDelivered(orderId) {
  if (!orderId) return null;
  return await update(child(ordersRef, orderId), { delivered: true });
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
