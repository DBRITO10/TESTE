// js/equipe.js
import { db, auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let editandoId = null;

// --- CONTROLE DE ACESSO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            document.getElementById('userName').innerText = userDoc.data().nome.split(' ')[0].toUpperCase();
        }
    } else {
        window.location.href = "index.html";
    }
});

// --- MÁSCARA DE CPF (000.000.000-00) ---
const inputCpf = document.getElementById('cpfPessoa');
if (inputCpf) {
    inputCpf.addEventListener('input', (e) => {
        let v = e.target.value.replace(/\D/g, "");
        if (v.length <= 11) {
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        }
        e.target.value = v;
    });
}

// --- SALVAR OU ATUALIZAR ---
const form = document.getElementById('formEquipe');
form.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const nome = document.getElementById('nomePessoa').value.toUpperCase();
    const cpf = document.getElementById('cpfPessoa').value;
    const vinculo = document.getElementById('vinculoPessoa').value;
    const btn = document.getElementById('btnSalvar');

    btn.disabled = true;
    btn.innerText = "PROCESSANDO...";

    try {
        const dados = { 
            nome, 
            cpf, 
            vinculo, 
            atualizadoEm: serverTimestamp() 
        };

        if (id) {
            await updateDoc(doc(db, "equipe", id), dados);
            alert("Cadastro atualizado com sucesso!");
            window.cancelarEdicao();
        } else {
            await addDoc(collection(db, "equipe"), { 
                ...dados, 
                criadoEm: serverTimestamp() 
            });
            alert("Membro cadastrado com sucesso!");
        }
        form.reset();
    } catch (err) {
        console.error("Erro ao salvar:", err);
        alert("Erro ao salvar dados. Verifique a sua conexão.");
    } finally {
        btn.disabled = false;
        btn.innerText = id ? "ATUALIZAR CADASTRO" : "SALVAR PESSOA";
    }
};

// --- LISTAR EM TEMPO REAL (ORDEM: VÍNCULO + NOME) ---
onSnapshot(collection(db, "equipe"), (snap) => {
    const corpo = document.getElementById('corpoEquipe');
    if (!corpo) return;
    
    let listaEquipe = [];
    snap.forEach(d => listaEquipe.push({ id: d.id, ...d.data() }));

    // Ordenação: 1º Vínculo, 2º Nome (Alfabética)
    listaEquipe.sort((a, b) => {
        const vA = (a.vinculo || "").toUpperCase();
        const vB = (b.vinculo || "").toUpperCase();
        if (vA !== vB) return vA.localeCompare(vB);
        return (a.nome || "").toUpperCase().localeCompare((b.nome || "").toUpperCase());
    });

    corpo.innerHTML = "";
    listaEquipe.forEach(p => {
        corpo.innerHTML += `
            <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 12px; border-right: 1px solid #eee;"><strong>${p.nome}</strong></td>
                <td style="padding: 12px; border-right: 1px solid #eee;">
                    <span style="background:#eee; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:bold;">${p.vinculo}</span>
                </td>
                <td style="padding: 12px; border-right: 1px solid #eee; white-space: nowrap;">${p.cpf}</td>
                <td style="padding: 12px; text-align: center; white-space: nowrap;">
                    <button class="btn-acao edit" onclick="prepararEdicao('${p.id}', '${p.nome}', '${p.cpf}', '${p.vinculo}')">✏️</button>
                    <button class="btn-acao del" onclick="excluir('${p.id}', '${p.nome}')">🗑️</button>
                </td>
            </tr>`;
    });
});

// --- FUNÇÕES GLOBAIS (CONECTADAS AO HTML) ---
window.prepararEdicao = (id, nome, cpf, vinculo) => {
    document.getElementById('editId').value = id;
    document.getElementById('nomePessoa').value = nome;
    document.getElementById('cpfPessoa').value = cpf;
    document.getElementById('vinculoPessoa').value = vinculo;
    
    document.getElementById('btnSalvar').innerText = "ATUALIZAR CADASTRO";
    document.getElementById('btnCancelar').style.display = "block";
    document.getElementById('tituloForm').innerText = "EDITANDO MEMBRO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicao = () => {
    document.getElementById('editId').value = "";
    document.getElementById('formEquipe').reset();
    document.getElementById('btnSalvar').innerText = "SALVAR PESSOA";
    document.getElementById('btnCancelar').style.display = "none";
    document.getElementById('tituloForm').innerText = "CADASTRAR MEMBRO DA EQUIPE";
};

window.excluir = async (id, nome) => {
    if (confirm(`Deseja remover ${nome} da equipe?`)) {
        try {
            await deleteDoc(doc(db, "equipe", id));
        } catch (e) {
            alert("Erro ao excluir.");
        }
    }
};

document.getElementById('btnSair').onclick = () => signOut(auth);
