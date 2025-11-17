import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Firebase config (senin verdiğin)
const firebaseConfig = {
  apiKey: "AIzaSyC17G-mWb_z2xIHBo7s4rrcQkeyHqv51KA",
  authDomain: "casacarmaretti.firebaseapp.com",
  databaseURL: "https://casacarmaretti-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "casacarmaretti",
  storageBucket: "casacarmaretti.appspot.com",
  messagingSenderId: "1078474886220",
  appId: "1:1078474886220:web:56c8410a0f2189694278e9",
};

// Firebase’i başlat
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Siparişler için referans
const ordersRef = ref(db, "orders");

export { db, ordersRef, push, onValue, remove, ref, update };
