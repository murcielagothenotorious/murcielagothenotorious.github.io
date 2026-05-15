// src/stores/orders.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  listenOrders as _listenOrders,
  listenWaiterStats,
  addOrder,
  updateOrder,
  deleteOrder,
  orderReady,
  orderDelivered,
  orderPaid,
  uploadReceipt,
} from '@/services/orders.js'

export const useOrdersStore = defineStore('orders', () => {
  const orders      = ref([])
  const waiterStats = ref({})

  // Derived lists
  const activeOrders = computed(() =>
    [...orders.value]
      .filter((o) => !o.delivered)
      .sort((a, b) => b.timestamp - a.timestamp),
  )

  const pendingKDS = computed(() =>
    [...orders.value]
      .filter((o) => !o.delivered && !o.ready && !o.paid)
      .sort((a, b) => a.timestamp - b.timestamp),
  )

  const cashierQueue = computed(() =>
    [...orders.value]
      .filter((o) => o.delivered && !o.paid)
      .sort((a, b) => b.timestamp - a.timestamp),
  )

  const history = computed(() =>
    [...orders.value]
      .filter((o) => o.paid === true)
      .sort((a, b) => b.timestamp - a.timestamp),
  )

  const leaderboard = computed(() => {
    const counts = {}
    orders.value.forEach((order) => {
      const key = order.waiterName.toLowerCase().trim()
      if (!counts[key]) counts[key] = { name: order.waiterName, count: 0, total: 0 }
      counts[key].count++
      counts[key].total += order.total || 0
    })
    return Object.values(counts).sort((a, b) => b.count - a.count)
  })

  function initListeners(onNewOrderCallback) {
    _listenOrders((incoming) => {
      orders.value = incoming || []
      console.table(incoming.map(o => ({ id: o.id, name: o.name, delivered: o.delivered, ready: o.ready, paid: o.paid })))
      onNewOrderCallback?.(incoming)
    })
    listenWaiterStats((stats) => {
      waiterStats.value = stats || {}
    })
  }

  return {
    orders,
    waiterStats,
    activeOrders,
    pendingKDS,
    cashierQueue,
    history,
    leaderboard,
    initListeners,
    // Re-export service actions for use in components
    addOrder,
    updateOrder,
    deleteOrder,
    orderReady,
    orderDelivered,
    orderPaid,
    uploadReceipt,
  }
})
