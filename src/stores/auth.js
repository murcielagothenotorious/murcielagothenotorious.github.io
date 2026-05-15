// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listenMasters, listenCashiers } from '@/services/orders.js'

const WAITER_STORAGE_KEY = 'waiterName'

export const useAuthStore = defineStore('auth', () => {
  const activeWaiter  = ref(localStorage.getItem(WAITER_STORAGE_KEY) || '')
  const masterWaiters = ref(['samuel pugliani', 'austin marcelli', 'frederick scarcelli', 'serena castello'])
  const cashiers      = ref([])

  const waiterKey = computed(() => activeWaiter.value.toLowerCase().trim())
  const isMaster  = computed(() => masterWaiters.value.includes(waiterKey.value))
  const isCashier = computed(() => cashiers.value.includes(waiterKey.value))
  const rank      = computed(() => {
    if (isMaster.value && isCashier.value) return 'Şef Garson & Kasiyer'
    if (isMaster.value)  return 'Şef Garson'
    if (isCashier.value) return 'Kasiyer'
    return 'Garson'
  })

  function login(name) {
    if (!name?.trim()) return false
    activeWaiter.value = name.trim()
    localStorage.setItem(WAITER_STORAGE_KEY, name.trim())
    return true
  }

  function initListeners() {
    listenMasters((masters) => {
      if (masters?.length > 0) masterWaiters.value = masters
    })
    listenCashiers((list) => {
      cashiers.value = list || []
    })
  }

  return { activeWaiter, masterWaiters, cashiers, waiterKey, isMaster, isCashier, rank, login, initListeners }
})
