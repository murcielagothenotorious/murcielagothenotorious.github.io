<template>
  <div class="cashier-view">
    <div class="view-shell">
      <div class="view-header">
        <div>
          <span class="view-kicker">Kasa</span>
          <h2 class="view-title"><i class="bi bi-cash-stack text-success me-2"></i>KASA EKRANI</h2>
        </div>
        <button class="btn btn-outline-light btn-sm" @click="setView('pos')">
          <i class="bi bi-arrow-left"></i> POS'a Dön
        </button>
      </div>

      <div class="row g-3">
        <div v-if="ordersStore.cashierQueue.length === 0" class="col-12 text-center text-secondary py-5">
          <h3>Bekleyen Ödeme Yok</h3>
          <p>Tüm hesaplar kapatıldı!</p>
        </div>

        <div
          v-for="order in ordersStore.cashierQueue"
          :key="order.id"
          class="col-md-6 col-xl-4 col-xxl-3"
        >
          <div class="kds-card h-100">
            <div class="kds-card-header bg-success">
              <div>
                <h5 class="mb-0 fw-bold">{{ order.name }}</h5>
                <small class="x-small text-white-50">{{ order.waiterName }}</small>
              </div>
              <div class="fs-3 fw-bold">{{ order.total }}$</div>
            </div>
            <div class="kds-card-body">
              <div
                v-for="item in order.items.filter(i => i.name !== 'Servis Hizmeti')"
                :key="item.name"
                class="kds-item"
              >
                <span>{{ item.qty }}x {{ item.name }}</span>
                <span>{{ item.qty * item.price }}$</span>
              </div>
            </div>
            <div class="kds-action">
              <button
                class="btn btn-success w-100 fw-bold py-2"
                @click="markPaid(order.id, order.name)"
              >
                <i class="bi bi-cash-coin me-2"></i> ÖDENDİ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import { useOrdersStore } from '@/stores/orders.js'
import { useToast }       from '@/composables/useToast.js'

const ordersStore = useOrdersStore()
const { showToast } = useToast()
const setView = inject('setView')

async function markPaid(id, name) {
  await ordersStore.orderPaid(id)
  showToast(`💰 "${name}" ödendi. Geçmişe taşındı.`)
}
</script>
