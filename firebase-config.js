// Configuração do Firebase que você enviou
const firebaseConfig = {
  apiKey: "AIzaSyAKRgavF1F0P7NUq6jGsUcPTFU_JA1erDM",
  authDomain: "logistica-e2b0b.firebaseapp.com",
  projectId: "logistica-e2b0b",
  storageBucket: "logistica-e2b0b.firebasestorage.app",
  messagingSenderId: "877060824520",
  appId: "1:877060824520:web:f477f542d689d2b8b5f4fd"
};

// Inicialização (Importando via CDN para facilitar)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, serverTimestamp };
