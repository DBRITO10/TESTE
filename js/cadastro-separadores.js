import { db } from "./firebase-config.js";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const colRef = collection(db, "equipe_separadores");
let todosSeparadores = [];

// Máscara de CPF
document.getElementById('sep_cpf').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    e.target.value = value;
});

// Carregar Dados em Tempo Real
function inicializar() {
    const q = query(colRef, orderBy("nome", "asc"));
    onSnapshot(q, (snap) => {
        todosSeparadores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizar(todosSeparadores);
    });
}

function renderizar(lista) {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = "";
    
    lista.forEach(s => {
        corpo.innerHTML += `
            <tr>
                <td>${s.nome}</td>
                <td>${s.cpf || '---'}</td>
                <td style="text-align: center;">
                    <button class="btn-acao" style="background:#fbc02d; color:#333;" onclick="prepararEdicao('${s.id}', '${s.nome}', '${s.cpf}')">EDITAR</button>
                    <button class="btn-acao" style="background:#b71c1c; color:white;" onclick="excluirSeparador('${s.id}')">EXCLUIR</button>
                </td>
            </tr>`;
    });
}

// Salvar / Atualizar
document.getElementById('btnSalvar').onclick = async () => {
    const nome = document.getElementById('sep_nome').value.toUpperCase().trim();
    const cpf = document.getElementById('sep_cpf').value.trim();
    const id = document.getElementById('editId').value;

    if (!nome) return alert("O nome é obrigatório!");

    try {
        if (id) {
            await updateDoc(doc(db, "equipe_separadores", id), { nome, cpf });
            alert("Cadastro atualizado!");
        } else {
            await addDoc(colRef, {
                nome,
                cpf,
                dataCadastro: serverTimestamp()
            });
            alert("Separador cadastrado!");
        }
        limparFormulario();
    } catch (e) {
        alert("Erro ao salvar dados.");
    }
};

window.prepararEdicao = (id, nome, cpf) => {
    document.getElementById('editId').value = id;
    document.getElementById('sep_nome').value = nome;
    document.getElementById('sep_cpf').value = cpf;
    document.getElementById('tituloForm').innerText = "✏️ Editar Separador";
    document.getElementById('btnCancelar').style.display = "inline-block";
    window.scrollTo({top: 0, behavior: 'smooth'});
};

window.excluirSeparador = async (id) => {
    if (confirm("Tem certeza que deseja remover este separador?")) {
        await deleteDoc(doc(db, "equipe_separadores", id));
    }
};

window.filtrarTabela = () => {
    const busca = document.getElementById('inputBusca').value.toUpperCase();
    const filtrados = todosSeparadores.filter(s => 
        s.nome.toUpperCase().includes(busca) || s.cpf.includes(busca)
    );
    renderizar(filtrados);
};

document.getElementById('btnCancelar').onclick = limparFormulario;

function limparFormulario() {
    document.getElementById('editId').value = "";
    document.getElementById('sep_nome').value = "";
    document.getElementById('sep_cpf').value = "";
    document.getElementById('tituloForm').innerText = "➕ Cadastrar Novo Separador";
    document.getElementById('btnCancelar').style.display = "none";
}

inicializar();
