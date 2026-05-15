// src/services/products.js
import { ref, onValue, update, child, remove, push, db } from './firebase.js'

const isConfigured = !!db
const menuRef = isConfigured ? ref(db, 'menu') : null

export function listenMenu(callback) {
  if (!menuRef) { callback?.(null); return () => {} }
  return onValue(menuRef, (snapshot) => {
    callback?.(snapshot.val())
  })
}

export async function saveMenuCategory(categoryName, itemsArray) {
  if (!menuRef) return null
  // Replace the entire category array
  return await update(child(menuRef, categoryName), itemsArray)
}

export async function updateProduct(categoryName, productIndex, productData) {
  if (!menuRef) return null
  return await update(child(menuRef, `${categoryName}/${productIndex}`), productData)
}

export async function addProduct(categoryName, productData) {
  if (!menuRef) return null
  // In Firebase, arrays can be tricky if we use push. But if we store it as an array or object list:
  // Usually it's better to store items under a category as a list.
  // We'll manage categories as an object with arrays to keep compatibility with existing `PRODUCTS` format.
  // We'll let the store handle array manipulation and just save the whole category.
}

// Helper to replace the entire menu (useful for initial seeding)
export async function setFullMenu(menuData) {
  if (!menuRef) return null
  return await update(ref(db), { menu: menuData })
}
