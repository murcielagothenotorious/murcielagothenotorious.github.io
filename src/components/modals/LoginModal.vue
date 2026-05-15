<template>
  <div class="modal fade" id="waiterModal" tabindex="-1" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content surface-elevated border-theme shadow-lg">
        <div class="modal-body p-4 text-center">
          <div class="mb-4"><i class="bi bi-person-circle display-1" style="color:var(--accent)"></i></div>
          <h5 class="fw-bold mb-3 text-main">Garson Girişi</h5>
          <input
            type="text"
            v-model="name"
            class="form-control form-control-lg text-center mb-3"
            placeholder="Garson Adınız"
            @keyup.enter="save"
          >
          <button type="button" class="btn btn-gold w-100 py-2 fw-bold" @click="save">
            GİRİŞ YAP
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useToast }     from '@/composables/useToast.js'
import { Modal } from 'bootstrap'

const auth = useAuthStore()
const { showToast } = useToast()
const name = ref('')
let modalInstance = null

onMounted(() => {
  const el = document.getElementById('waiterModal')
  if (el) modalInstance = Modal.getOrCreateInstance(el, { backdrop: 'static' })
})

function save() {
  if (auth.login(name.value)) {
    modalInstance?.hide()
    showToast(`Servis açıldı: ${auth.activeWaiter}`)
  }
}
</script>
