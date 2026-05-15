<template>
  <div class="app-shell">
    <!-- Header -->
    <TopBar />

    <!-- Main Views -->
    <main class="app-main">
      <PosView  v-show="currentView === 'pos'" />
      <KdsView  v-show="currentView === 'kds'" />
      <CashierView v-show="currentView === 'cashier'" />
      <MenuEditorView v-show="currentView === 'menu_editor'" />
    </main>

    <!-- Mobile Bottom Nav -->
    <MobileNav />
  </div>

  <!-- Offcanvas: Mobile Ticket -->
  <TicketOffcanvas />

  <!-- Offcanvas: More Menu -->
  <MoreMenuOffcanvas />

  <!-- Modals -->
  <LoginModal />
  <ActiveOrdersModal />
  <HistoryModal />
  <LeaderboardModal />

  <!-- Toast Container -->
  <div class="toast-container position-fixed top-0 end-0 p-3"></div>
</template>

<script setup>
import { onMounted, provide, ref } from 'vue'
import { useAuthStore }   from '@/stores/auth.js'
import { useOrdersStore } from '@/stores/orders.js'
import { useMenuStore }   from '@/stores/menu.js'
import { useSound }       from '@/composables/useSound.js'

import TopBar            from '@/components/layout/TopBar.vue'
import MobileNav         from '@/components/layout/MobileNav.vue'
import PosView           from '@/components/pos/PosView.vue'
import KdsView           from '@/components/kds/KdsView.vue'
import CashierView       from '@/components/cashier/CashierView.vue'
import MenuEditorView    from '@/components/admin/MenuEditorView.vue'
import TicketOffcanvas   from '@/components/pos/TicketOffcanvas.vue'
import MoreMenuOffcanvas from '@/components/layout/MoreMenuOffcanvas.vue'
import LoginModal        from '@/components/modals/LoginModal.vue'
import ActiveOrdersModal from '@/components/modals/ActiveOrdersModal.vue'
import HistoryModal      from '@/components/modals/HistoryModal.vue'
import LeaderboardModal  from '@/components/modals/LeaderboardModal.vue'

const auth        = useAuthStore()
const ordersStore = useOrdersStore()
const menuStore   = useMenuStore()
const { playBell } = useSound()

// currentView is app-wide state — provide it to children
const currentView = ref('pos')
provide('currentView', currentView)
provide('setView', (v) => { currentView.value = v })

onMounted(() => {
  // Init Firebase listeners
  auth.initListeners()
  menuStore.initListeners()

  // Track previous active order count for bell detection
  let prevActive = 0

  ordersStore.initListeners((newOrders) => {
    const activeNow   = (newOrders || []).filter((o) => !o.ready && !o.delivered).length
    const waiterLower = auth.activeWaiter.toLowerCase().trim()

    // Bell for masters when new order arrives
    if (auth.isMaster && activeNow > prevActive && prevActive >= 0) {
      playBell()
    }

    // Bell for waiters when their order becomes ready
    if (auth.activeWaiter) {
      newOrders?.forEach((newOrder) => {
        const oldOrder = ordersStore.orders.find((o) => o.id === newOrder.id)
        if (oldOrder && !oldOrder.ready && newOrder.ready) {
          if (newOrder.waiterName.toLowerCase().trim() === waiterLower) {
            playBell()
          }
        }
      })
    }

    prevActive = activeNow
  })

  // Show login modal if no waiter logged in
  if (!auth.activeWaiter) {
    const el = document.getElementById('waiterModal')
    if (el) {
      const modal = new window.bootstrap.Modal(el, { backdrop: 'static' })
      modal.show()
    }
  }
})
</script>
