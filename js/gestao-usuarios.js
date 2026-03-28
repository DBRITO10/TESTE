import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, onSnapshot, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let usuarioLogadoNome = "";

// Função de Log Padronizada
async function registrarLog(acao, detalhe) {
    try {
        await addDoc(collection(db, "historico"), {
            usuario: usuarioLogadoNome || auth.currentUser.email,
            acao: acao,
            detalhe: detalhe,
            data: serverTimestamp()
        });
    } catch(e) { console.error("Erro log:", e); }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists() && userDoc.data().nivel === 'admin') {
            usuarioLogadoNome = userDoc.data().nome;
            document.getElementById('userName').innerText = usuarioLogadoNome;
            carregarUsuarios();
            carregarCentraisParaCheckbox();
        } else {
            alert("Acesso restrito a administradores.");
            window.location.href = "menu.html";
        }
    } else { window.location.href = "index.html"; }
});

// Busca os destinos/centrais para criar os checkboxes
async function carregarCentraisParaCheckbox() {
    const container = document.getElementById('gridCentrais');
    const q = query(collection(db, "destinos"), orderBy("nome"));
    const snap = await getDocs(q);
    
    container.innerHTML = "";
    snap.forEach(d => {
        const nome = d.data().nome;
        container.innerHTML += `
            <label class="central-item">
                <input type="checkbox" name="centrais" value="${nome}"> ${nome}
            </label>`;
    });
}

function carregarUsuarios() {
    onSnapshot(collection(db, "usuarios"), (snap) => {
        const corpo = document.getElementById('listaUsuarios');
        corpo.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            // Tratamento para exibir array de centrais ou string antiga
            const centraisExibir = Array.isArray(u.central) ? u.central.join(", ") : (u.central || "NÃO DEFINIDO");
            
            corpo.innerHTML += `
                <tr>
                    <td><strong>${u.nome || 'Sem Nome'}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.nivel}">${u.nivel}</span></td>
                    <td><small>${centraisExibir}</small></td>
                    <td>
                        <button class="btn-edit" onclick="abrirModal('${d.id}', '${u.nome}', '${u.nivel}', '${u.central}')">EDITAR</button>
                        <button class="btn-del" onclick="deletarUsuario('${d.id}', '${u.nome}')">✖</button>
                    </td>
                </tr>`;
        });
    });
}

window.abrirModal = (id, nome, nivel, central) => {
    document.getElementById('editUserId').value = id;
    document.getElementById('editNome').value = nome;
    document.getElementById('editNivel').value = nivel;
    
    // Limpa e marca os checkboxes baseado no que está no banco
    const boxes = document.querySelectorAll('input[name="centrais"]');
    boxes.forEach(box => {
        // Se for array, verifica se inclui. Se for string (antigo), verifica igualdade.
        box.checked = Array.isArray(central) ? central.includes(box.value) : (central === box.value);
    });

    document.getElementById('modalUser').style.display = 'flex';
};

window.deletarUsuario = async (id, nome) => {
    if(confirm(`Deseja realmente remover o acesso de ${nome}?`)) {
        await deleteDoc(doc(db, "usuarios", id));
        await registrarLog("GESTÃO USUÁRIO", `Removeu usuário: ${nome}`);
    }
}

document.getElementById('btnSalvarUser').onclick = async () => {
    const id = document.getElementById('editUserId').value;
    const btn = document.getElementById('btnSalvarUser');
    
    // Captura as centrais selecionadas (Array)
    const selecionadas = Array.from(document.querySelectorAll('input[name="centrais"]:checked')).map(cb => cb.value);

    btn.disabled = true;
    btn.innerText = "SALVANDO...";

    try {
        const novoNivel = document.getElementById('editNivel').value;
        const novoNome = document.getElementById('editNome').value;

        await updateDoc(doc(db, "usuarios", id), {
            nome: novoNome,
            nivel: novoNivel,
            central: selecionadas // Salva como Array
        });

        await registrarLog("GESTÃO USUÁRIO", `Editou: ${novoNome} | Centrais: ${selecionadas.join(", ")}`);
        alert("Usuário atualizado com sucesso!");
        document.getElementById('modalUser').style.display = 'none';
    } catch (e) { 
        alert("Erro ao atualizar."); 
    } finally {
        btn.disabled = false;
        btn.innerText = "SALVAR ALTERAÇÕES";
    }
};

document.getElementById('btnFecharModal').onclick = () => document.getElementById('modalUser').style.display = 'none';
document.getElementById('btnSair').onclick = () => signOut(auth);
