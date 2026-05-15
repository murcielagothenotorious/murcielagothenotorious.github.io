<template>
  <div class="menu-editor-view">
    <div class="view-shell">
      <div class="view-header">
        <div>
          <span class="view-kicker">Yönetim</span>
          <h2 class="view-title"><i class="bi bi-pencil-square text-gold me-2"></i>MENÜ DÜZENLEME</h2>
        </div>
        <button class="btn btn-outline-secondary btn-sm" @click="setView('pos')">
          <i class="bi bi-arrow-left"></i> POS'a Dön
        </button>
      </div>

      <div class="row g-4">
        <!-- Categories List -->
        <div class="col-md-4">
          <div class="card bg-panel border-secondary">
            <div class="card-header border-secondary d-flex justify-content-between align-items-center">
              <h5 class="mb-0 text-main fw-bold">Kategoriler</h5>
              <button class="btn btn-sm btn-gold" @click="promptNewCategory">
                <i class="bi bi-plus-lg"></i> Ekle
              </button>
            </div>
            <div class="list-group list-group-flush">
              <button
                v-for="(_, cat) in menuStore.menuData"
                :key="cat"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                :class="{ 'active text-gold border-theme bg-darker': activeCategory === cat }"
                @click="activeCategory = cat"
              >
                <span class="fw-bold">{{ cat }}</span>
                <i class="bi bi-chevron-right text-muted" v-if="activeCategory === cat"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Products in Category -->
        <div class="col-md-8">
          <div v-if="activeCategory" class="card bg-panel border-secondary">
            <div class="card-header border-secondary d-flex justify-content-between align-items-center">
              <h5 class="mb-0 text-main fw-bold">{{ activeCategory }} Ürünleri</h5>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-danger" @click="deleteCategory(activeCategory)">
                  <i class="bi bi-trash"></i> Kategoriyi Sil
                </button>
                <button class="btn btn-sm btn-gold" @click="startNewProduct">
                  <i class="bi bi-plus-lg"></i> Ürün Ekle
                </button>
              </div>
            </div>
            <div class="card-body">
              <div v-if="menuStore.menuData[activeCategory]?.length === 0" class="text-center text-muted py-4">
                Bu kategoride ürün yok.
              </div>
              <div class="row g-3">
                <div
                  v-for="(product, index) in menuStore.menuData[activeCategory]"
                  :key="index"
                  class="col-md-6"
                >
                  <div class="card bg-surface border-secondary h-100 p-3">
                    <div class="d-flex gap-3 h-100">
                      <img :src="product.image || 'https://via.placeholder.com/80'" class="rounded" style="width: 80px; height: 80px; object-fit: cover;">
                      <div class="flex-grow-1 d-flex flex-column">
                        <h6 class="text-main fw-bold mb-1">{{ product.name }}</h6>
                        <span class="text-gold fw-bold small mb-2">{{ product.price }} $</span>
                        <div class="mt-auto d-flex gap-2">
                          <button class="btn btn-sm btn-outline-secondary w-50" @click="editProduct(index, product)">Düzenle</button>
                          <button class="btn btn-sm btn-outline-danger w-50" @click="deleteProduct(index)">Sil</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center text-muted py-5">
            <i class="bi bi-arrow-left fs-2"></i>
            <p class="mt-3">Düzenlemek için sol taraftan bir kategori seçin.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Edit Modal -->
    <div class="modal fade" id="productEditModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content surface-elevated">
          <div class="modal-header">
            <h5 class="modal-title">{{ editingIndex === -1 ? 'Yeni Ürün Ekle' : 'Ürünü Düzenle' }}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label text-sub small">Ürün Adı</label>
              <input type="text" class="form-control" v-model="editForm.name">
            </div>
            <div class="mb-3">
              <label class="form-label text-sub small">Fiyat ($)</label>
              <input type="number" class="form-control" v-model.number="editForm.price">
            </div>
            <div class="mb-3">
              <label class="form-label text-sub small">Görsel URL (İsteğe Bağlı)</label>
              <input type="text" class="form-control" v-model="editForm.image">
            </div>
            <div class="mb-4">
              <label class="form-label text-sub small">Açıklama (İsteğe Bağlı)</label>
              <textarea class="form-control" rows="2" v-model="editForm.desc"></textarea>
            </div>
            <button class="btn btn-gold w-100 py-2" @click="saveProduct">KAYDET</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu.js'
import { useToast } from '@/composables/useToast.js'
import { Modal } from 'bootstrap'

const menuStore = useMenuStore()
const { showToast } = useToast()
const setView = inject('setView')

const activeCategory = ref(null)

// Set first category as active initially
if (Object.keys(menuStore.menuData).length > 0) {
  activeCategory.value = Object.keys(menuStore.menuData)[0]
}

const editingIndex = ref(-1)
const editForm = ref({ name: '', price: 0, image: '', desc: '' })
let productModalInstance = null

onMounted(() => {
  const el = document.getElementById('productEditModal')
  if (el) productModalInstance = new Modal(el)
})

function promptNewCategory() {
  const name = prompt('Yeni kategori adı:')
  if (name && name.trim()) {
    if (menuStore.menuData[name]) return showToast('Bu kategori zaten var!', 'warning')
    menuStore.updateCategory(name, [])
    activeCategory.value = name
    showToast('Kategori eklendi.')
  }
}

function deleteCategory(cat) {
  if (confirm(`'${cat}' kategorisini ve içindeki tüm ürünleri silmek istediğinize emin misiniz?`)) {
    menuStore.deleteCategory(cat)
    activeCategory.value = null
    showToast('Kategori silindi.')
  }
}

function startNewProduct() {
  editingIndex.value = -1
  editForm.value = { name: '', price: 0, image: '', desc: '' }
  productModalInstance?.show()
}

function editProduct(index, product) {
  editingIndex.value = index
  editForm.value = { ...product }
  productModalInstance?.show()
}

async function saveProduct() {
  if (!editForm.value.name.trim()) return showToast('Ürün adı gerekli!', 'warning')
  if (editForm.value.price <= 0) return showToast('Geçerli bir fiyat girin!', 'warning')

  const items = [...(menuStore.menuData[activeCategory.value] || [])]
  
  if (editingIndex.value === -1) {
    items.push({ ...editForm.value })
  } else {
    items[editingIndex.value] = { ...editForm.value }
  }

  await menuStore.updateCategory(activeCategory.value, items)
  productModalInstance?.hide()
  showToast('Ürün kaydedildi!')
}

async function deleteProduct(index) {
  if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
    const items = [...menuStore.menuData[activeCategory.value]]
    items.splice(index, 1)
    await menuStore.updateCategory(activeCategory.value, items)
    showToast('Ürün silindi.')
  }
}
</script>

<style scoped>
.menu-editor-view { width: 100%; height: 100%; overflow-y: auto; background-color: var(--bg-app); }
.list-group-item.active { background-color: var(--bg-surface) !important; color: var(--gold) !important; border-color: var(--border) !important; }
</style>
