<template>
  <div class="kds-view">
    <div class="view-shell">
      <div class="view-header">
        <div>
          <span class="view-kicker">Mutfak</span>
          <h2 class="view-title"><i class="bi bi-fire text-danger me-2"></i>MUTFAK EKRANI</h2>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="clock-tag">{{ clockText }}</span>
          <button class="btn btn-outline-light btn-sm" @click="setView('pos')">
            <i class="bi bi-arrow-left"></i> POS'a Dön
          </button>
        </div>
      </div>

      <!-- Pending Orders Grid -->
      <div class="row g-3">
        <div v-if="ordersStore.pendingKDS.length === 0" class="col-12 text-center text-secondary py-5">
          <h3>Bekleyen Sipariş Yok</h3>
          <p>Tüm siparişler hazır!</p>
        </div>

        <div
          v-for="order in ordersStore.pendingKDS"
          :key="order.id"
          class="col-md-6 col-xl-4 col-xxl-3"
        >
          <div class="kds-card h-100">
            <div class="kds-card-header" :class="urgencyClass(order.timestamp)">
              <div>
                <h5 class="mb-0 fw-bold">{{ order.name }}</h5>
                <small class="x-small text-white-50">{{ order.waiterName }}</small>
              </div>
              <div class="kds-time fs-4">{{ elapsedMins(order.timestamp) }} dk</div>
            </div>
            <div class="kds-card-body">
              <div
                v-for="item in order.items.filter(i => i.name !== 'Servis Hizmeti')"
                :key="item.name"
                class="kds-item"
              >
                <span>{{ item.qty }}x {{ item.name }}</span>
              </div>
            </div>
            <div class="kds-action">
              <button
                class="btn btn-warning w-100 fw-bold py-2"
                @click="markReady(order.id, order.name)"
              >
                <i class="bi bi-bell-fill me-2"></i> HAZIR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue'
import { useOrdersStore } from '@/stores/orders.js'
import { useToast }       from '@/composables/useToast.js'

const ordersStore = useOrdersStore()
const { showToast } = useToast()
const setView = inject('setView')

// Clock
const clockText = ref('--:--')
let clockInterval

function tick() {
  clockText.value = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => { tick(); clockInterval = setInterval(tick, 30000) })
onUnmounted(() => clearInterval(clockInterval))

function elapsedMins(ts) {
  return Math.floor((Date.now() - ts) / 60000)
}

function urgencyClass(ts) {
  const mins = elapsedMins(ts)
  if (mins > 20) return 'late'
  if (mins > 10) return 'medium'
  return ''
}

async function markReady(id, name) {
  await ordersStore.orderReady(id)
  showToast(`🍽️ "${name}" hazır! Garsonlar bilgilendirildi.`)
}
</script>
