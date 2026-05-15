// src/composables/useTheme.js
import { ref, watch } from 'vue'

const darkMode = ref(localStorage.getItem('darkMode') !== 'false')

function applyTheme(dark) {
  document.body.classList.toggle('light-mode', !dark)
}

// Apply immediately on module load
applyTheme(darkMode.value)

watch(darkMode, (val) => {
  localStorage.setItem('darkMode', val)
  applyTheme(val)
})

export function useTheme() {
  function toggleTheme() {
    darkMode.value = !darkMode.value
  }

  return { darkMode, toggleTheme }
}
