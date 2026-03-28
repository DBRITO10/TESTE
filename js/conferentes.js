import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, addDoc, doc, getDoc, updateDoc, deleteDoc, 
    onSnapshot, query, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Espera o HTML carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    
    const form = document.getElementById('formConf');
    const btnSalvar = document.getElementById('btnSalvar');
    const tituloForm = document.getElementById('tituloForm');
    const btnCancelar = document.getElementById('btnCancelar');

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

    // --- SALVAR / ATUALIZAR ---
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const id = document.getElementById('editId').value;
            const nome = document.getElementById('nomeConf').value.toUpperCase();
            const matricula = document.getElementById('idConf').value;

            btnSalvar.disabled = true;
            btnSalvar.innerText = "PROCESSANDO...";

            try {
                const dados = { nome, matricula, atualizadoEm: serverTimestamp() };
                if (id) {
                    await updateDoc(doc(db, "conferentes", id), dados);
                    alert("Atualizado!");
                    window.cancelarEdicao();
                } else {
                    await addDoc(collection(db, "conferentes"), { ...dados, criadoEm: serverTimestamp() });
                    alert("Cadastrado!");
                }
                form.reset();
            } catch (err) {
                alert("Erro ao salvar.");
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = "SALVAR CONFERENTE";
            }
        };
    }

    // --- LISTAR EM TEMPO REAL ---
    onSnapshot(query(collection(db, "conferentes"), orderBy("nome")), (snap) => {
        const corpo = document.getElementById('corpoConferentes');
        if (!corpo) return;
        corpo.innerHTML = "";
        snap.forEach(d => {
            const c = d.data();
            corpo.innerHTML += `
                <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 12px; border-right: 1px solid #eee;"><strong>${c.nome}</strong></td>
                    <td style="padding: 12px; border-right: 1px solid #eee;">${c.matricula}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button style="background:#fbc02d; border:none; padding:5px; cursor:pointer;" onclick="editar('${d.id}', '${c.nome}', '${c.matricula}')">✏️</button>
                        <button style="background:#ffcdd2; border:none; padding:5px; cursor:pointer;" onclick="excluir('${d.id}', '${c.nome}')">🗑️</button>
                    </td>
                </tr>`;
        });
    });

    // --- FUNÇÕES GLOBAIS ---
    window.editar = (id, nome, matricula) => {
        document.getElementById('editId').value = id;
        document.getElementById('nomeConf').value = nome;
        document.getElementById('idConf').value = matricula;
        btnSalvar.innerText = "ATUALIZAR CONFERENTE";
        btnSalvar.style.background = "var(--success)";
        btnCancelar.style.display = "block";
        tituloForm.innerText = "EDITANDO CONFERENTE";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelarEdicao = () => {
        document.getElementById('editId').value = "";
        form.reset();
        btnSalvar.innerText = "SALVAR CONFERENTE";
        btnSalvar.style.background = "var(--primary)";
        btnCancelar.style.display = "none";
        tituloForm.innerText = "CADASTRAR NOVO CONFERENTE";
    };

    window.excluir = async (id, nome) => {
        if (confirm(`Excluir ${nome}?`)) {
            await deleteDoc(doc(db, "conferentes", id));
        }
    };

    document.getElementById('btnSair').onclick = () => signOut(auth);
});
