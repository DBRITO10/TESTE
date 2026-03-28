const firebaseConfig = {
  apiKey: "AIzaSyAhxv3c9aajgCYHnEJG7TS_VxKqJ06KBJg",
  authDomain: "logistica-exp.firebaseapp.com",
  projectId: "logistica-exp",
  storageBucket: "logistica-exp.firebasestorage.app",
  messagingSenderId: "850466911484",
  appId: "1:850466911484:web:5c2902e4662912e6465379"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"; // IMPORTANTE: Adicionar isso

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // INICIALIZAR O AUTH

// Exportar tudo para os outros arquivos usarem
export { db, auth, collection, addDoc, serverTimestamp };
