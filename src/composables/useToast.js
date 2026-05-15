// src/composables/useToast.js
import { Toast } from 'bootstrap'

export function useToast() {
  function showToast(msg, type = 'success') {
    const container = document.querySelector('.toast-container')
    if (!container) return

    const id      = 'toast_' + Date.now()
    const bgClass =
      type === 'success'
        ? 'text-bg-success'
        : type === 'warning'
        ? 'text-bg-warning'
        : 'text-bg-danger'

    container.insertAdjacentHTML(
      'beforeend',
      `<div id="${id}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body fs-6">${msg}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>`,
    )

    const el    = document.getElementById(id)
    const toast = new Toast(el, { delay: 3000 })
    toast.show()
    el.addEventListener('hidden.bs.toast', () => el.remove())
  }

  return { showToast }
}
