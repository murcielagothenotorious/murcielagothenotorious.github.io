// orders.js
import { ordersRef, push, remove, onValue, ref, update } from "./firebase.js";

// Yeni sipariş ekleme
export function addOrder(order) {
  if (!order) return null;
  return push(ordersRef, order);
}

// Sipariş güncelleme
export function updateOrder(orderId, order) {
  if (!orderId || !order) return null;
  return update(ref(ordersRef, orderId), order);
}

// Sipariş silme
export function deleteOrder(orderId) {
  return remove(ref(ordersRef, orderId));
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
