// src/composables/useSound.js
import { ref, watch } from 'vue'

const bellAudio   = new Audio('/bell.wav')
bellAudio.volume  = 0.5

const soundEnabled = ref(localStorage.getItem('soundEnabled') !== 'false')

watch(soundEnabled, (val) => localStorage.setItem('soundEnabled', val))

export function useSound() {
  function playBell() {
    if (!soundEnabled.value) return
    bellAudio.currentTime = 0
    bellAudio.play().catch((err) => console.warn('Bell sound could not play:', err))
  }

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }

  return { soundEnabled, playBell, toggleSound }
}
