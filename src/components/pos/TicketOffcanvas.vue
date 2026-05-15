<template>
  <div class="offcanvas offcanvas-bottom h-75 surface-elevated text-main" tabindex="-1" id="ticketOffcanvas">
    <div class="offcanvas-header border-theme">
      <h5 class="offcanvas-title fw-bold">Adisyon</h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
    </div>
    <div class="offcanvas-body p-0 d-flex flex-column">
      <div class="p-3">
        <input
          type="text"
          v-model="cartStore.tableName"
          class="form-control surface-ground text-main border-theme text-center"
          placeholder="Masa / Müşteri"
        >
      </div>

      <div class="flex-grow-1 overflow-y-auto p-3">
        <div v-if="cartStore.itemCount === 0" class="text-center text-muted py-5">
          <i class="bi bi-cart-x display-1 opacity-25"></i>
          <p class="mt-3">Sepet Boş</p>
        </div>
        <div
          v-for="item in cartStore.items"
          :key="item.name"
          class="ticket-item bg-darker border-start-0 border-bottom border-secondary rounded-0 mb-0 py-3"
        >
          <div class="d-flex align-items-center justify-content-between w-100 gap-2">
            <div class="d-flex align-items-center flex-grow-1" style="min-width:0">
              <span class="badge bg-gold text-dark rounded-pill me-2 flex-shrink-0">{{ item.qty }}x</span>
              <span class="fw-bold text-truncate" style="font-size:0.9rem">{{ item.name }}</span>
            </div>
            <span class="fw-bold flex-shrink-0">{{ item.qty * item.price }}$</span>
            <button class="btn btn-sm btn-outline-danger border-0 p-1 flex-shrink-0" @click="cartStore.removeItem(item.name)">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="p-3 surface-ground mt-auto">
        <div class="d-flex justify-content-between fs-4 fw-bold mb-3">
          <span>Toplam</span>
          <span>{{ cartStore.total }} $</span>
        </div>
        <button class="btn btn-gold w-100 fw-bold py-3" :disabled="saving" @click="handleSave">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
          {{ saving ? 'İletiliyor...' : 'MUTFAĞA İLET' }}
          <i v-if="!saving" class="bi bi-send-fill ms-2"></i>
        </button>
      </div>
    </div>
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
  if (!cartStore.tableName.trim()) return showToast('Masa numarasını girin!', 'warning')
  if (cartStore.itemCount === 0)   return showToast('Sepet boş!', 'warning')
  if (!auth.activeWaiter) {
    const el = document.getElementById('waiterModal')
    if (el) new window.bootstrap.Modal(el, { backdrop: 'static' }).show()
    return
  }

  const items = cartStore.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price }))
  const productTotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  if (productTotal > 0) items.push({ name: 'Servis Hizmeti', qty: 1, price: SERVICE_FEE })

  const orderData = {
    name: cartStore.tableName.trim(),
    items,
    total: productTotal + SERVICE_FEE,
    timestamp: Date.now(),
    date: new Date().toLocaleString('tr-TR'),
    waiterName: auth.activeWaiter,
    delivered: false,
  }

  saving.value = true
  try {
    const result = await ordersStore.addOrder(orderData)
    if (result?.key) generateAndUploadReceipt(result.key, orderData)
    cartStore.reset()
    showToast('Sipariş mutfağa iletildi!')

    // Close offcanvas
    const el = document.getElementById('ticketOffcanvas')
    if (el) window.bootstrap.Offcanvas.getInstance(el)?.hide()
  } catch (err) {
    console.error(err)
    showToast('Bağlantı hatası!', 'danger')
  } finally {
    saving.value = false
  }
}
</script>
