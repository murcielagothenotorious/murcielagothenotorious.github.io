<template>
  <div class="offcanvas offcanvas-end surface-elevated text-main" tabindex="-1" id="moreMenuOffcanvas">
    <div class="offcanvas-header border-theme">
      <h5 class="offcanvas-title">Menü</h5>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
    </div>
    <div class="offcanvas-body p-0">
      <div class="list-group list-group-flush">
        <button
          class="list-group-item list-group-item-action surface-panel text-main border-theme p-3"
          data-bs-toggle="modal"
          data-bs-target="#historyModal"
        >
          <i class="bi bi-journal-check me-2"></i> Geçmiş İşlemler
        </button>
        <button
          class="list-group-item list-group-item-action surface-panel text-main border-theme p-3"
          data-bs-toggle="modal"
          data-bs-target="#leaderboardModal"
        >
          <i class="bi bi-trophy me-2"></i> Leaderboard
        </button>

        <button
          v-if="auth.isMaster"
          class="list-group-item list-group-item-action surface-panel text-main border-theme p-3"
          @click="goToView('kds')"
        >
          <i class="bi bi-display me-2"></i> Mutfak Ekranı
        </button>

        <button
          v-if="auth.isCashier"
          class="list-group-item list-group-item-action surface-panel text-main border-theme p-3"
          @click="goToView('cashier')"
        >
          <i class="bi bi-cash-stack me-2"></i> Kasa Ekranı
        </button>

        <!-- Mobile Waiter Info -->
        <div class="p-3 mt-4">
          <div class="surface-ground rounded p-3 border-theme">
            <div class="text-center mb-3">
              <p class="text-sub small mb-1">Giriş Yapan</p>
              <h6 class="fw-bold text-gold mb-0">{{ auth.activeWaiter || '-' }}</h6>
            </div>
            <div class="row g-2">
              <div class="col-6">
                <div class="surface-panel p-2 rounded text-center">
                  <span class="d-block x-small text-sub">SİPARİŞ</span>
                  <strong class="text-main">{{ myOrderCount }}</strong>
                </div>
              </div>
              <div class="col-6">
                <div class="surface-panel p-2 rounded text-center">
                  <span class="d-block x-small text-sub">SERVİS</span>
                  <strong class="text-success">{{ myServiceShare }} $</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useAuthStore }   from '@/stores/auth.js'
import { useOrdersStore } from '@/stores/orders.js'
import { SERVICE_FEE, SERVICE_SHARE_RATIO } from '@/data/products.js'

const auth        = useAuthStore()
const ordersStore = useOrdersStore()
const setView     = inject('setView')

const myOrderCount = computed(() => {
  if (!auth.activeWaiter) return 0
  const key = auth.waiterKey
  return ordersStore.orders.filter((o) => o.waiterName.toLowerCase().trim() === key).length
})

const myServiceShare = computed(() =>
  (myOrderCount.value * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(2)
)

function goToView(v) {
  // Close offcanvas first
  const el = document.getElementById('moreMenuOffcanvas')
  if (el) {
    const oc = window.bootstrap.Offcanvas.getInstance(el)
    oc?.hide()
  }
  setView(v)
}
</script>
