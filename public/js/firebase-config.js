// ============================================================
// FIREBASE CONFIGURATION
// Mi Control de Cobros
// Firebase Authentication + Cloud Firestore
// ============================================================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCKM0SAXPN8k7et_oZ5qwotpSyxysdrtro",
  authDomain: "mi-control-cobros.firebaseapp.com",
  projectId: "mi-control-cobros",
  storageBucket: "mi-control-cobros.firebasestorage.app",
  messagingSenderId: "961676394637",
  appId: "1:961676394637:web:33533faeb0025298ad22c4"
};


// ============================================================
// INICIALIZAR FIREBASE
// ============================================================

export const app = initializeApp(firebaseConfig);


// ============================================================
// FIREBASE AUTHENTICATION
// ============================================================

export const auth = getAuth(app);


// ============================================================
// CLOUD FIRESTORE
// ============================================================

export const db = getFirestore(app);


// ============================================================
// INFORMACIÓN DE DEPURACIÓN
// ============================================================

console.log(
  "[FIREBASE] Firebase inicializado correctamente."
);

console.log(
  "[FIREBASE] Proyecto:",
  firebaseConfig.projectId
);