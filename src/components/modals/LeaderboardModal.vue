<template>
  <div class="modal fade" id="leaderboardModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content surface-elevated border-theme shadow-lg">
        <div class="modal-header border-theme">
          <h5 class="modal-title fw-bold text-main">Leaderboard</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
          <ul class="list-group list-group-flush">
            <li v-if="ordersStore.leaderboard.length === 0" class="list-group-item text-center text-muted py-4">
              Henüz sipariş yok.
            </li>
            <li
              v-for="(waiter, index) in ordersStore.leaderboard"
              :key="waiter.name"
              class="list-group-item d-flex justify-content-between align-items-center"
            >
              <div class="d-flex align-items-center gap-2">
                <span class="fs-5">{{ medal(index) }}</span>
                <span class="fw-bold">{{ waiter.name }}</span>
              </div>
              <div class="text-end">
                <span class="badge bg-primary rounded-pill">{{ waiter.count }} sipariş</span>
                <span class="badge bg-success rounded-pill ms-1">{{ waiter.total }}$</span>
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

const ordersStore = useOrdersStore()

function medal(index) {
  return index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
}
</script>
