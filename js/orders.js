// orders.js
import { ordersRef, push, remove, onValue } from './firebase.js';
import * as UI from './ui.js';

// Yeni sipariş ekleme
export function addOrder(order) {
  if (!order || order.trim() === "") return;
  push(ordersRef, { text: order, timestamp: Date.now() });
}

// Sipariş silme
export function deleteOrder(orderId) {
  remove(ref(ordersRef, orderId));
}

// Realtime listener
export function listenOrders() {
  onValue(ordersRef, (snapshot) => {
    const orders = [];
    snapshot.forEach(child => {
      orders.push({ id: child.key, ...child.val() });
    });
    UI.renderOrders(orders);
  });
}