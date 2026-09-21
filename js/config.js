/* Simplest - Firebase Configuration & Initialization */

const firebaseConfig = {
  apiKey: "AIzaSyCLAzFIKa7WjqygmepX-bQyqmbGPZBU9pM",
  authDomain: "simplest-328e3.firebaseapp.com",
  databaseURL: "https://simplest-328e3-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "simplest-328e3",
  storageBucket: "simplest-328e3.firebasestorage.app",
  messagingSenderId: "271733096683",
  appId: "1:271733096683:web:e15ef71aa28536e72abeae"
};

let app, auth, db;
let isFirebaseLive = false;

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
      app = firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.database();
      isFirebaseLive = true;
      console.log('[Firebase] Successfully initialized Firebase Auth & Realtime Database');
    } else {
      console.warn('[Firebase] Firebase SDK not detected, operating in standalone demo mode');
    }
  } catch (err) {
    console.warn('[Firebase] Initialization error, falling back to local database mode:', err.message);
    isFirebaseLive = false;
  }
}
