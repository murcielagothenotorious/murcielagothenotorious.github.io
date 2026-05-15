// src/services/firebase.js
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, push, onValue, remove, child, update } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.FIREBASE_DATABASE_URL,
  projectId: import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.FIREBASE_APP_ID,
}

// Guard: warn loudly but don't crash if env vars are missing
if (!firebaseConfig.databaseURL || !firebaseConfig.projectId) {
  console.error(
    '[Firebase] ❌ Missing environment variables!\n' +
    'Create a .env file in the project root with FIREBASE_* variables.\n' +
    'See .env.example for the full list.',
  )
}

const isMisconfigured = !firebaseConfig.databaseURL || !firebaseConfig.projectId

let app, db, ordersRef

if (!isMisconfigured) {
  app = initializeApp(firebaseConfig)
  db = getDatabase(app)
  ordersRef = ref(db, 'orders')
} else {
  // Create stubs so imports don't crash; listeners just won't fire
  app = null
  db = null
  ordersRef = null
}

export { db, ordersRef, ref, push, onValue, remove, child, update }
