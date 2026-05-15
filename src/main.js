// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Bootstrap CSS + Icons
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.min.css'
import * as bootstrap from 'bootstrap'

// Global CSS
import './assets/styles.css'

// Make bootstrap available globally for composables that need it
window.bootstrap = bootstrap

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
