// src/stores/cart.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SERVICE_FEE } from '@/data/products.js'

export const useCartStore = defineStore('cart', () => {
  // cart: { [productName]: { price: number, qty: number } }
  const cart         = ref({})
  const tableName    = ref('')
  const editingId    = ref(null)

  const items = computed(() =>
    Object.entries(cart.value).map(([name, item]) => ({ name, ...item })),
  )

  const itemCount = computed(() =>
    items.value.reduce((sum, i) => sum + i.qty, 0),
  )

  const subTotal = computed(() =>
    items.value.reduce((sum, i) => sum + i.qty * i.price, 0),
  )

  const total = computed(() =>
    subTotal.value > 0 ? subTotal.value + SERVICE_FEE : 0,
  )

  function addItem(name, price) {
    if (!cart.value[name]) cart.value[name] = { price, qty: 0 }
    cart.value[name].qty++
  }

  function updateItem(name, price, delta) {
    if (!cart.value[name]) {
      if (delta > 0) cart.value[name] = { price, qty: 0 }
      else return
    }
    cart.value[name].qty += delta
    if (cart.value[name].qty <= 0) delete cart.value[name]
  }

  function removeItem(name) {
    delete cart.value[name]
  }

  function reset() {
    cart.value     = {}
    tableName.value = ''
    editingId.value = null
  }

  function loadFromOrder(order) {
    cart.value = {}
    order.items.forEach((item) => {
      if (item.name !== 'Servis Hizmeti') {
        cart.value[item.name] = { price: item.price, qty: item.qty }
      }
    })
    tableName.value = order.name
    editingId.value = order.id
  }

  return {
    cart,
    tableName,
    editingId,
    items,
    itemCount,
    subTotal,
    total,
    addItem,
    updateItem,
    removeItem,
    reset,
    loadFromOrder,
  }
})
