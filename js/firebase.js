import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  child,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Ortam değişkenlerinden Firebase config'i alıyoruz
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase’i başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Siparişler için referans
const ordersRef = ref(db, "orders");

export { child, db, ordersRef, push, onValue, remove, ref, update };