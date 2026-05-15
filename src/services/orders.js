// src/services/orders.js
import { ordersRef, push, remove, onValue, ref, update, child, db } from './firebase.js'

// If Firebase is not configured, all operations are no-ops
const isConfigured = !!db

const waiterStatsRef = isConfigured ? ref(db, 'waiterStats') : null
const mastersRef = isConfigured ? ref(db, 'masters') : null
const cashiersRef = isConfigured ? ref(db, 'cashiers') : null

export async function addOrder(order) {
  if (!order || !ordersRef) return null
  return await push(ordersRef, order)
}

export async function updateOrder(orderId, order) {
  if (!orderId || !order || !ordersRef) return null
  return await update(child(ordersRef, orderId), order)
}

export async function orderDelivered(orderId) {
  if (!orderId || !ordersRef) return null
  return await update(child(ordersRef, orderId), { delivered: true })
}

export async function orderReady(orderId) {
  if (!orderId || !ordersRef) return null
  return await update(child(ordersRef, orderId), { ready: true })
}

export async function orderPaid(orderId) {
  if (!orderId || !ordersRef) return null
  return await update(child(ordersRef, orderId), { paid: true })
}

export function deleteOrder(orderId) {
  if (!ordersRef) return Promise.resolve()
  return remove(child(ordersRef, orderId))
}

export function listenOrders(callback) {
  if (!ordersRef) { callback?.([]); return () => { } }
  return onValue(ordersRef, (snapshot) => {
    const orders = []
    snapshot.forEach((c) => orders.push({ id: c.key, ...c.val() }))
    callback?.(orders)
  })
}

export function listenWaiterStats(callback) {
  if (!waiterStatsRef) { callback?.({}); return () => { } }
  return onValue(waiterStatsRef, (snapshot) => {
    callback?.(snapshot.val() || {})
  })
}

export async function setWaiterStats(stats) {
  if (!stats || !waiterStatsRef) return null
  return await update(waiterStatsRef, stats)
}

export function listenMasters(callback) {
  if (!mastersRef) { callback?.([]); return () => { } }
  return onValue(mastersRef, (snapshot) => {
    const data = snapshot.val()
    let masters = []

    if (!data) {
      const defaultMasters = ['Samuel Pugliani', 'Austin Marcelli']
      masters = defaultMasters.map((n) => n.toLowerCase().trim())
      update(ref(db), { masters: defaultMasters }).catch((err) =>
        console.warn('Auto-create masters failed', err),
      )
    } else if (Array.isArray(data)) {
      masters = data.map((n) => n.toLowerCase().trim())
    } else if (typeof data === 'object') {
      masters = Object.values(data).map((n) => String(n).toLowerCase().trim())
    }

    callback?.(masters)
  })
}

export function listenCashiers(callback) {
  if (!cashiersRef) { callback?.([]); return () => { } }
  return onValue(cashiersRef, (snapshot) => {
    const data = snapshot.val()
    let cashiers = []

    if (!data) {
      const defaultCashiers = ['Frederick Scarcelli', 'Serena Castello']
      cashiers = defaultCashiers.map((n) => n.toLowerCase().trim())
      update(ref(db), { cashiers: defaultCashiers }).catch((err) =>
        console.warn('Auto-create cashiers failed', err),
      )
    } else if (Array.isArray(data)) {
      cashiers = data.map((n) => n.toLowerCase().trim())
    } else if (typeof data === 'object') {
      cashiers = Object.values(data).map((n) => String(n).toLowerCase().trim())
    }

    callback?.(cashiers)
  })
}

export async function uploadReceipt(orderId, blob) {
  if (!orderId || !blob) return null

  const cloudName = import.meta.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    console.warn('Cloudinary not configured. Skipping receipt upload.')
    return null
  }

  const formData = new FormData()
  formData.append('file', blob, `receipt_${orderId}.png`)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'receipts')
  formData.append('public_id', `${orderId}_${Date.now()}`)

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData },
    )
    if (!response.ok) throw new Error('Upload failed')

    const data = await response.json()
    const downloadURL = data.secure_url

    await update(child(ordersRef, orderId), { receiptUrl: downloadURL })
    return downloadURL
  } catch (error) {
    console.error('Receipt upload failed:', error)
    return null
  }
}
