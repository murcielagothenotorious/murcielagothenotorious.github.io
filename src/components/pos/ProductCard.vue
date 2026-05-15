<template>
  <div
    class="product-card h-100"
    :class="{ active: qty > 0 }"
  >
    <!-- Info tooltip trigger -->
    <button
      class="product-info-btn"
      :title="item.desc || ''"
      ref="tooltipEl"
    >
      <i class="bi bi-info-circle"></i>
    </button>

    <div class="product-image-container">
      <img
        :src="item.image || 'https://image.pollinations.ai/prompt/gourmet%20food%20plating?width=400&height=300&nologo=true'"
        :alt="item.name"
        class="product-img"
      >
    </div>

    <div class="product-content">
      <h4 class="product-name">{{ item.name }}</h4>
      <span class="product-price">{{ item.price }}$</span>
      <div class="badge-qty" :class="{ 'd-none': qty === 0 }">{{ qty }}</div>
    </div>

    <div class="product-controls">
      <button class="qty-btn qty-minus" @click.stop="decrement">
        <i class="bi bi-dash"></i>
      </button>
      <span class="qty-display">{{ qty }}</span>
      <button class="qty-btn qty-plus" @click.stop="increment">
        <i class="bi bi-plus"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useCartStore } from '@/stores/cart.js'
import { Tooltip } from 'bootstrap'

const props = defineProps({
  item: { type: Object, required: true },
})

const cartStore  = useCartStore()
const tooltipEl  = ref(null)

const qty = computed(() => cartStore.cart[props.item.name]?.qty || 0)

function increment() {
  cartStore.addItem(props.item.name, props.item.price)
}

function decrement() {
  cartStore.updateItem(props.item.name, props.item.price, -1)
}

onMounted(() => {
  if (tooltipEl.value) new Tooltip(tooltipEl.value)
})
</script>
