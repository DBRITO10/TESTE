import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function initHeader(isMenu = false) {
    const auth = getAuth();
    const db = getFirestore();
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = "index.html"; return; }
        
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        const userData = userDoc.data();
        
        const header = document.createElement('header');
        header.style = "background: #d32f2f; color: white; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000;";
        
        const leftDiv = document.createElement('div');
        leftDiv.style = "display: flex; align-items: center; gap: 10px;";
        
        if (!isMenu) {
            leftDiv.innerHTML = `<a href="menu.html" style="color: white; text-decoration: none; font-size: 20px;">⬅️</a>`;
        }
        leftDiv.innerHTML += `<span>Bem-vindo, <strong>${userData.nome}</strong></span>`;
        
        const btnSair = document.createElement('button');
        btnSair.innerText = "SAIR";
        btnSair.style = "background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 5px 15px; border-radius: 4px; cursor: pointer;";
        btnSair.onclick = () => signOut(auth);

        header.appendChild(leftDiv);
        header.appendChild(btnSair);
        document.body.prepend(header);
        
        // Verificação de Nível de Acesso simplificada
        checkPermissions(userData, window.location.pathname);
    });
}

function checkPermissions(user, path) {
    // Lógica de bloqueio por nível (Ex: se for leitor e tentar entrar no cadastro, volta pro dash)
    if (user.nivel === 'leitor' && !path.includes('dashboard.html')) window.location.href = 'dashboard.html';
}
