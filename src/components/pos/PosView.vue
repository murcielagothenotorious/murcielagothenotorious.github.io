<template>
  <div class="pos-view">
    <!-- Left: Product Grid -->
    <div class="pos-grid">
      <!-- Search -->
      <div class="filter-rail">
        <div class="search-wrapper">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-darker border-secondary text-secondary">
              <i class="bi bi-search"></i>
            </span>
            <input
              type="text"
              v-model="searchQuery"
              class="form-control bg-darker border-secondary text-white"
              placeholder="Ürün Ara..."
            >
          </div>
        </div>
      </div>

      <!-- Products -->
      <div class="pos-categories" id="posCategories">
        <template v-for="(items, category) in menuStore.menuData" :key="category">
          <!-- Category heading -->
          <h3 class="category-title mt-4" :id="category">{{ category }}</h3>

          <div class="row g-3">
            <div
              v-for="item in items"
              :key="item.name"
              class="col-6 col-md-4 col-xl-3"
              :class="{ 'd-none': !matchesSearch(item.name) }"
            >
              <ProductCard :item="item" />
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Right: Ticket Sidebar (Desktop) -->
    <aside class="ticket-sidebar d-none d-lg-flex">
      <Ticket />
    </aside>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMenuStore } from '@/stores/menu.js'
import ProductCard from './ProductCard.vue'
import Ticket      from './Ticket.vue'

const menuStore = useMenuStore()
const searchQuery = ref('')

function matchesSearch(name) {
  return name.toLowerCase().includes(searchQuery.value.toLowerCase())
}
</script>
