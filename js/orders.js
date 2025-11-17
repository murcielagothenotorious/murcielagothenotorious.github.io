// orders.js
import { ordersRef, push, remove, onValue, ref, update, child } from "./firebase.js";

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
