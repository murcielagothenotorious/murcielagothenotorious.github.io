<template>
  <div class="modal fade" id="historyModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content surface-elevated border-theme shadow-lg">
        <div class="modal-header border-theme">
          <h5 class="modal-title fw-bold text-main">Geçmiş</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
          <ul class="list-group list-group-flush">
            <li v-if="ordersStore.history.length === 0" class="list-group-item text-center text-muted py-4">
              Henüz kapanan işlem yok.
            </li>
            <li
              v-for="order in ordersStore.history"
              :key="order.id"
              class="history-item"
            >
              <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
                <div class="flex-grow-1" style="min-width:0">
                  <h6 class="mb-0 fw-bold text-truncate">{{ order.name }}</h6>
                </div>
                <span class="badge bg-success flex-shrink-0">Ödendi</span>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-bold">{{ order.total }} $</span>
                <div class="d-flex gap-2">
                  <button class="btn btn-sm action-btn" @click="receipt(order)">
                    <i class="bi bi-receipt"></i>
                  </button>
                  <button class="btn btn-sm action-btn" @click="remove(order)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
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
import { useAuthStore }   from '@/stores/auth.js'
import { useToast }       from '@/composables/useToast.js'
import { downloadOrCopyReceipt } from '@/services/receipt.js'

const ordersStore = useOrdersStore()
const auth        = useAuthStore()
const { showToast } = useToast()

function receipt(order) {
  downloadOrCopyReceipt(order, showToast)
}

function remove(order) {
  const isMaster = auth.isMaster
  if (!order.delivered && !isMaster) {
    return showToast('Yetkisiz işlem: Sadece Şef Garson silebilir.', 'danger')
  }
  if (confirm('Bu kayıt silinecek. Onaylıyor musunuz?')) {
    ordersStore.deleteOrder(order.id)
  }
}
</script>
