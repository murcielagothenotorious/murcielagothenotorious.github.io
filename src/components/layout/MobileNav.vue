<template>
  <nav class="mobile-nav d-lg-none">
    <button class="nav-item btn btn-link d-flex flex-column align-items-center" :class="{ active: currentView === 'pos' }" @click="setView('pos')">
      <i class="bi bi-grid-fill fs-5"></i>
      <span class="x-small">Menü</span>
    </button>

    <button
      class="nav-item btn btn-link d-flex flex-column align-items-center position-relative"
      data-bs-toggle="offcanvas"
      data-bs-target="#ticketOffcanvas"
    >
      <i class="bi bi-receipt fs-5"></i>
      <span class="x-small">Adisyon</span>
      <span
        class="position-absolute top-0 start-50 translate-middle badge rounded-pill bg-gold text-dark"
        :class="{ 'd-none': cartStore.itemCount === 0 }"
      >{{ cartStore.itemCount }}</span>
    </button>

    <button
      class="nav-item btn btn-link d-flex flex-column align-items-center"
      data-bs-toggle="modal"
      data-bs-target="#activeOrdersModal"
    >
      <i class="bi bi-clock-history fs-5"></i>
      <span class="x-small">Açık</span>
    </button>

    <button
      class="nav-item btn btn-link d-flex flex-column align-items-center"
      data-bs-toggle="offcanvas"
      data-bs-target="#moreMenuOffcanvas"
    >
      <i class="bi bi-three-dots fs-5"></i>
      <span class="x-small">Diğer</span>
    </button>
  </nav>
</template>

<script setup>
import { inject } from 'vue'
import { useCartStore } from '@/stores/cart.js'

const currentView = inject('currentView')
const setView     = inject('setView')
const cartStore   = useCartStore()
</script>
