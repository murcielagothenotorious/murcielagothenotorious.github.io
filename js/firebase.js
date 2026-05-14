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

/* =========================================
   LOGGING & CONNECTION MONITORING
   ========================================= */
class FirebaseConnectionMonitor {
  constructor() {
    this.isConnected = false;
    this.lastError = null;
    this.listeners = [];
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(status, error = null) {
    this.isConnected = status;
    this.lastError = error;
    this.listeners.forEach(cb => cb({ connected: status, error }));
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    console.log(`[Firebase ${level}]`, message, data);
    
    try {
      const logs = JSON.parse(localStorage.getItem('firebaseLogs') || '[]');
      logs.push(logEntry);
      if (logs.length > 50) logs.shift();
      localStorage.setItem('firebaseLogs', JSON.stringify(logs));
    } catch (e) {
      console.warn('Failed to save logs', e);
    }
  }
}

const monitor = new FirebaseConnectionMonitor();

const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY,
  authDomain: window.FIREBASE_AUTH_DOMAIN,
  databaseURL: window.FIREBASE_DATABASE_URL,
  projectId: window.FIREBASE_PROJECT_ID,
  storageBucket: window.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID,
  appId: window.FIREBASE_APP_ID,
};

// Firebase’i başlat
let app, db;
try {
  monitor.log('INFO', 'Initializing Firebase...', { config: firebaseConfig.projectId });
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  monitor.log('INFO', 'Firebase initialized successfully');
  monitor.notifyListeners(true);
} catch (error) {
  monitor.log('ERROR', 'Firebase initialization failed', { error: error.message });
  monitor.notifyListeners(false, error);
}

// Connection state monitoring
if (db) {
  const connectedRef = ref(db, '.info/connected');
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      monitor.log('INFO', 'Connected to Firebase');
      monitor.notifyListeners(true);
      window.firebaseConnected = true;
    } else {
      monitor.log('WARN', 'Disconnected from Firebase');
      monitor.notifyListeners(false);
      window.firebaseConnected = false;
    }
  }, (error) => {
    monitor.log('ERROR', 'Connection monitoring failed', { error: error.message });
    window.firebaseConnected = false;
  });
}

// Siparişler için referans
const ordersRef = db ? ref(db, "orders") : null;

export { child, db, ordersRef, push, onValue, remove, ref, update, monitor };