// src/stores/menu.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listenMenu, setFullMenu } from '@/services/products.js'
import { PRODUCTS as STATIC_PRODUCTS } from '@/data/products.js'

export const useMenuStore = defineStore('menu', () => {
  const menuData = ref({ ...STATIC_PRODUCTS })
  const isLoaded = ref(false)

  function initListeners() {
    listenMenu((data) => {
      if (data) {
        menuData.value = data
      } else {
        // If Firebase is empty/null, use static and optionally seed it
        // We won't automatically seed to avoid overwriting intentionally empty DBs,
        // but we'll fallback to static for local display.
        menuData.value = { ...STATIC_PRODUCTS }
      }
      isLoaded.value = true
    })
  }

  async function updateCategory(categoryName, items) {
    const newData = { ...menuData.value }
    newData[categoryName] = items
    menuData.value = newData
    await setFullMenu(newData)
  }

  async function deleteCategory(categoryName) {
    const newData = { ...menuData.value }
    delete newData[categoryName]
    menuData.value = newData
    await setFullMenu(newData)
  }

  async function saveFullMenu(newMenuObject) {
    menuData.value = newMenuObject
    await setFullMenu(newMenuObject)
  }

  return {
    menuData,
    isLoaded,
    initListeners,
    updateCategory,
    deleteCategory,
    saveFullMenu,
  }
})
