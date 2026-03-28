import { db, auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    updatePassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    collection, 
    getDocs, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    if (user) { 
        currentUser = user; 
        await carregarDestinos();
    } else { 
        window.location.href = "index.html"; 
    }
});

async function carregarDestinos() {
    const select = document.getElementById('centralUser');
    try {
        const q = query(collection(db, "destinos"), orderBy("nome"));
        const querySnapshot = await getDocs(q);
        
        select.innerHTML = '<option value="" disabled selected>Selecione a Central</option>';
        
        querySnapshot.forEach((doc) => {
            const dados = doc.data();
            if(dados.nome) {
                const option = document.createElement('option');
                option.value = dados.nome;
                option.textContent = dados.nome;
                select.appendChild(option);
            }
        });
    } catch (e) { 
        console.error("Erro ao carregar destinos:", e); 
    }
}

document.getElementById('formPerfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnFinalizar');
    const novaSenha = document.getElementById('novaSenha').value;
    const funcaoSelecionada = document.getElementById('funcaoUser').value;
    
    btn.innerText = "CONFIGURANDO...";
    btn.disabled = true;

    try {
        await updatePassword(currentUser, novaSenha);

        await setDoc(doc(db, "usuarios", currentUser.uid), {
            nome: document.getElementById('nomeUser').value.toUpperCase(),
            funcao: funcaoSelecionada,
            nivel: funcaoSelecionada, 
            central: document.getElementById('centralUser').value,
            email: currentUser.email,
            dataConfiguracao: new Date().toISOString()
        }, { merge: true });

        alert("Perfil configurado!");
        window.location.href = "menu.html";

    } catch (error) {
        alert("Erro: " + error.message);
        btn.disabled = false;
        btn.innerText = "FINALIZAR E ENTRAR";
    }
});
