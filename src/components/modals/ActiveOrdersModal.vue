<template>
  <div class="modal fade" id="activeOrdersModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content surface-elevated border-theme shadow-lg">
        <div class="modal-header border-theme">
          <h5 class="modal-title fw-bold text-main">Açık Masalar</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
          <ul class="list-group list-group-flush">
            <li v-if="ordersStore.activeOrders.length === 0" class="list-group-item text-center text-muted py-4">
              Açık masa yok.
            </li>
            <li
              v-for="order in ordersStore.activeOrders"
              :key="order.id"
              class="list-group-item p-3"
              :class="{ 'border-success border-2': order.ready }"
            >
              <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                <div class="flex-grow-1" style="min-width:0">
                  <h5 class="fw-bold mb-0 text-truncate">{{ order.name }}</h5>
                  <small class="text-secondary text-truncate d-block">
                    {{ order.waiterName }} • {{ elapsedMins(order.timestamp) }} dk önce
                  </small>
                </div>
                <div class="d-flex flex-column align-items-end gap-1">
                  <span v-if="order.ready" class="badge bg-success">
                    <i class="bi bi-check-circle me-1"></i>Hazır
                  </span>
                  <span v-else class="badge bg-warning text-dark">
                    <i class="bi bi-hourglass-split me-1"></i>Hazırlanıyor
                  </span>
                  <span class="badge bg-dark">{{ order.total }}$</span>
                </div>
              </div>

              <!-- Items -->
              <div class="mb-2">
                <span
                  v-for="item in order.items.filter(i => i.name !== 'Servis Hizmeti')"
                  :key="item.name"
                  class="badge bg-light text-dark border me-1 mb-1 text-wrap text-start"
                  style="max-width:100%"
                >
                  {{ item.qty }}x {{ item.name }}
                </span>
              </div>

              <!-- Actions -->
              <div class="d-flex gap-2 justify-content-end">
                <button
                  v-if="!order.ready"
                  class="btn btn-sm btn-outline-primary"
                  @click="editOrder(order)"
                >
                  <i class="bi bi-pencil-fill"></i> Düzelt
                </button>
                <button
                  v-else
                  class="btn btn-sm btn-success btn-pulse"
                  @click="deliverOrder(order.id, order.name)"
                >
                  <i class="bi bi-bag-check-fill"></i> Teslim Edildi
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useOrdersStore } from '@/stores/orders.js'
import { useCartStore }   from '@/stores/cart.js'
import { useToast }       from '@/composables/useToast.js'
import { Modal } from 'bootstrap'

const ordersStore = useOrdersStore()
const cartStore   = useCartStore()
const { showToast } = useToast()

function elapsedMins(ts) {
  return Math.floor((Date.now() - ts) / 60000)
}

function editOrder(order) {
  cartStore.loadFromOrder(order)
  // Close modal
  const el = document.getElementById('activeOrdersModal')
  if (el) Modal.getInstance(el)?.hide()
}

async function deliverOrder(id, name) {
  await ordersStore.orderDelivered(id)
  showToast(`✅ "${name}" teslim edildi. Kasaya düştü.`)
}
</script>
