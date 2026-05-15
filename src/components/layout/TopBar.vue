<template>
  <header class="topbar">
    <div class="topbar-brand">
      <div class="brand-mark">
        <img src="/artifacts/italy.png" style="width:40px;height:40px;object-fit:contain">
      </div>
      <div>
        <h1 class="brand-title">CASA CARMARETTI</h1>
        <div class="brand-meta">
          <span id="kds-clock" class="clock-tag d-none d-lg-inline-flex">{{ clockText }}</span>
        </div>
      </div>
    </div>

    <div class="topbar-actions d-none d-lg-flex">
      <!-- Açık Masalar -->
      <button class="action-pill" data-bs-toggle="modal" data-bs-target="#activeOrdersModal">
        <i class="bi bi-clock-history"></i>Açık
        <span
          class="badge bg-danger rounded-pill ms-1"
          :class="{ 'd-none': ordersStore.activeOrders.length === 0 }"
        >{{ ordersStore.activeOrders.length }}</span>
      </button>

      <!-- Geçmiş -->
      <button class="action-pill" data-bs-toggle="modal" data-bs-target="#historyModal">
        <i class="bi bi-journal-check"></i>Geçmiş
      </button>

      <!-- Leaderboard -->
      <button class="action-pill" data-bs-toggle="modal" data-bs-target="#leaderboardModal">
        <i class="bi bi-trophy"></i>Skor
      </button>

      <div class="action-divider"></div>

      <!-- KDS (masters only) -->
      <button
        v-if="auth.isMaster"
        class="action-pill"
        @click="handleViewSwitch('kds')"
      >
        <i class="bi bi-display"></i>Mutfak
      </button>

      <!-- Cashier -->
      <button
        v-if="auth.isCashier"
        class="action-pill alt"
        @click="handleViewSwitch('cashier')"
      >
        <i class="bi bi-cash-stack"></i>Kasa
      </button>

      <div class="action-divider"></div>

      <!-- Sound Toggle -->
      <button class="action-pill icon-only" title="Ses Aç/Kapa" @click="toggleSound">
        <i :class="soundEnabled ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill'"></i>
      </button>

      <!-- Menu Editor Toggle (Master Only) -->
      <button 
        v-if="auth.isMaster"
        class="action-pill alt" 
        title="Menüyü Düzenle" 
        @click="setView(currentView === 'menu_editor' ? 'pos' : 'menu_editor')"
      >
        <i :class="currentView === 'menu_editor' ? 'bi bi-x-lg' : 'bi bi-pencil-square'"></i>
        <span class="d-none d-md-inline">{{ currentView === 'menu_editor' ? 'POS a Dön' : 'Menü Düzenle' }}</span>
      </button>

      <!-- Theme Toggle -->
      <button class="action-pill icon-only" title="Tema Değiştir" @click="toggleTheme">
        <i :class="darkMode ? 'bi bi-moon-fill' : 'bi bi-sun-fill'"></i>
      </button>
    </div>

    <!-- User Profile (Desktop Only) -->
    <div class="topbar-profile d-none d-lg-flex">
      <div class="profile-stats">
        <div class="stat">
          <span class="stat-label">SİPARİŞ</span>
          <strong>{{ myOrderCount }}</strong>
        </div>
        <div class="stat">
          <span class="stat-label">SERVİS</span>
          <strong class="stat-positive">{{ myServiceShare }} $</strong>
        </div>
      </div>
      <div class="profile-info">
        <div class="profile-text">
          <p class="profile-name">{{ auth.activeWaiter || 'Giriş Yap' }}</p>
          <p class="profile-rank">{{ auth.rank }}</p>
        </div>
        <div class="profile-avatar"><i class="bi bi-person-fill"></i></div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore }   from '@/stores/auth.js'
import { useOrdersStore } from '@/stores/orders.js'
import { useSound }       from '@/composables/useSound.js'
import { useTheme }       from '@/composables/useTheme.js'
import { useToast }       from '@/composables/useToast.js'
import { SERVICE_FEE, SERVICE_SHARE_RATIO } from '@/data/products.js'

const auth        = useAuthStore()
const ordersStore = useOrdersStore()
const { soundEnabled, toggleSound } = useSound()
const { darkMode, toggleTheme }     = useTheme()
const { showToast }                 = useToast()

const setView     = inject('setView')
const currentView = inject('currentView')

// Clock (used only when KDS is active in header)
const clockText = ref('--:--')
let clockInterval

onMounted(() => {
  clockInterval = setInterval(() => {
    const now = new Date()
    clockText.value = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }, 1000)
})

onUnmounted(() => clearInterval(clockInterval))

// Stats
const myOrderCount = computed(() => {
  if (!auth.activeWaiter) return 0
  const key = auth.waiterKey
  return ordersStore.orders.filter((o) => o.waiterName.toLowerCase().trim() === key).length
})

const myServiceShare = computed(() =>
  (myOrderCount.value * SERVICE_FEE * SERVICE_SHARE_RATIO).toFixed(2)
)

function handleViewSwitch(view) {
  if (currentView.value === view) {
    setView('pos')
    return
  }
  if (view === 'kds' && !auth.isMaster) {
    showToast('Mutfak ekranına erişim yetkiniz yok!', 'warning')
    return
  }
  if (view === 'cashier' && !auth.isCashier) {
    showToast('Kasa ekranına erişim yetkiniz yok!', 'warning')
    return
  }
  setView(view)
}
</script>
