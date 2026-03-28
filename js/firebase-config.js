const firebaseConfig = {
  apiKey: "AIzaSyAKRgavF1F0P7NUq6jGsUcPTFU_JA1erDM",
  authDomain: "logistica-e2b0b.firebaseapp.com",
  projectId: "logistica-e2b0b",
  storageBucket: "logistica-e2b0b.firebasestorage.app",
  messagingSenderId: "877060824520",
  appId: "1:877060824520:web:f477f542d689d2b8b5f4fd"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // IMPORTANTE: Adicionar isso

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // INICIALIZAR O AUTH

// Exportar tudo para os outros arquivos usarem
export { db, auth, collection, addDoc, serverTimestamp };
