// js/index.js
import { db, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const formLogin = document.getElementById('formLogin');
const msgErro = document.getElementById('msgErro');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const btnEntrar = formLogin.querySelector('.btn-login');

    // Feedback visual de carregamento
    btnEntrar.disabled = true;
    btnEntrar.innerText = "A AUTENTICAR...";
    msgErro.innerText = "";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // Guarda o UID para persistência local (opcional, já que o Firebase gere a sessão)
        localStorage.setItem("userUid", user.uid);

        // Verifica se o perfil já existe no Firestore para decidir o destino
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        
        if (userDoc.exists()) {
            window.location.href = "menu.html";
        } else {
            // Se o utilizador existe no Auth mas não no Firestore, é o primeiro acesso
            window.location.href = "primeiro-acesso.html";
        }

    } catch (error) {
        console.error("Erro de login:", error.code);
        
        // Mensagens amigáveis para o utilizador
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            msgErro.innerText = "E-mail ou senha incorretos.";
        } else if (error.code === 'auth/too-many-requests') {
            msgErro.innerText = "Muitas tentativas falhadas. Tente mais tarde.";
        } else {
            msgErro.innerText = "Erro ao entrar. Tente novamente.";
        }
        
        btnEntrar.disabled = false;
        btnEntrar.innerText = "ENTRAR";
    }
});
