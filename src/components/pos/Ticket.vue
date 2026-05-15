<template>
  <div class="ticket-header">
    <div class="ticket-title">
      <span class="ticket-label">Adisyon</span>
    </div>
    <input
      type="text"
      v-model="cartStore.tableName"
      class="form-control ticket-input"
      placeholder="MASA NO / MÜŞTERİ"
    >
  </div>

  <div class="ticket-items">
    <ul class="list-unstyled mb-0">
      <li v-if="cartStore.itemCount === 0" class="text-center text-muted py-4 small">
        Sepet Boş
      </li>
      <li v-for="item in cartStore.items" :key="item.name" class="ticket-item">
        <div class="d-flex align-items-center justify-content-between w-100 gap-2">
          <div class="d-flex align-items-center flex-grow-1" style="min-width:0">
            <span class="badge bg-gold text-dark rounded-pill me-2 flex-shrink-0">{{ item.qty }}x</span>
            <span class="fw-bold text-truncate" style="font-size:0.9rem" :title="item.name">{{ item.name }}</span>
          </div>
          <span class="fw-bold flex-shrink-0">{{ item.qty * item.price }}$</span>
          <button class="btn btn-sm btn-outline-danger border-0 p-1 flex-shrink-0" @click="cartStore.removeItem(item.name)">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </li>
    </ul>
  </div>

  <div class="ticket-footer">
    <div class="ticket-row">
      <span>Ara Toplam</span>
      <span>{{ cartStore.subTotal }} $</span>
    </div>
    <div class="ticket-row ticket-row-accent">
      <span>Servis</span>
      <span>+{{ SERVICE_FEE }} $</span>
    </div>
    <div class="ticket-total">
      <span>TOPLAM</span>
      <span>{{ cartStore.total }} $</span>
    </div>
    <button
      class="btn btn-gold w-100 fw-bold py-3"
      :disabled="saving"
      @click="handleSave"
    >
      <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
      {{ saving ? 'İletiliyor...' : (cartStore.editingId ? 'GÜNCELLE' : 'MUTFAĞA İLET') }}
      <i v-if="!saving" class="bi bi-send-fill ms-2"></i>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useCartStore }   from '@/stores/cart.js'
import { useOrdersStore } from '@/stores/orders.js'
import { useAuthStore }   from '@/stores/auth.js'
import { useToast }       from '@/composables/useToast.js'
import { generateAndUploadReceipt } from '@/services/receipt.js'
import { SERVICE_FEE } from '@/data/products.js'

const cartStore   = useCartStore()
const ordersStore = useOrdersStore()
const auth        = useAuthStore()
const { showToast } = useToast()

const saving = ref(false)

async function handleSave() {
  if (!cartStore.tableName.trim()) {
    return showToast('Masa numarasını veya müşteri adını girin!', 'warning')
  }
  if (cartStore.itemCount === 0) {
    return showToast('Adisyon boş!', 'warning')
  }
  if (!auth.activeWaiter) {
    const el = document.getElementById('waiterModal')
    if (el) new window.bootstrap.Modal(el, { backdrop: 'static' }).show()
    return
  }

  const items = cartStore.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }))
  const productTotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  if (productTotal > 0) items.push({ name: 'Servis Hizmeti', qty: 1, price: SERVICE_FEE })

  const orderData = {
    name:       cartStore.tableName.trim(),
    items,
    total:      productTotal + SERVICE_FEE,
    timestamp:  cartStore.editingId
      ? ordersStore.orders.find((o) => o.id === cartStore.editingId)?.timestamp
      : Date.now(),
    date:       new Date().toLocaleString('tr-TR'),
    waiterName: auth.activeWaiter,
    delivered:  false,
  }

  saving.value = true
  try {
    if (cartStore.editingId) {
      const old = ordersStore.orders.find((o) => o.id === cartStore.editingId)
      if (old) orderData.delivered = old.delivered
      await ordersStore.updateOrder(cartStore.editingId, orderData)
      showToast('Sipariş güncellendi!')
    } else {
      const result = await ordersStore.addOrder(orderData)
      if (result?.key) {
        generateAndUploadReceipt(result.key, orderData)
      }
      showToast('Sipariş mutfağa iletildi!')
    }
    cartStore.reset()
  } catch (err) {
    console.error(err)
    showToast('Bağlantı hatası!', 'danger')
  } finally {
    saving.value = false
  }
}
</script>
