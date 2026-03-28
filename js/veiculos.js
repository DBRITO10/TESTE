import { db, auth } from "./firebase-config.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    addDoc, 
    updateDoc, 
    onSnapshot, // CORREÇÃO: Importação necessária para listar em tempo real
    deleteDoc, 
    query, 
    orderBy, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let editandoId = null;

// Controle de Acesso e Identificação do Usuário
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            document.getElementById('userName').innerText = userData.nome.split(' ')[0].toUpperCase();
            
            // Verifica se é admin para permitir acesso à frota
            if (userData.nivel !== 'admin') {
                alert("Acesso restrito a administradores.");
                window.location.href = "menu.html";
            }
        }
    } else { 
        window.location.href = "index.html"; 
    }
});

// Máscara para o campo de Placa (AAA-0000)
const inputPlaca = document.getElementById('placa');
if (inputPlaca) {
    inputPlaca.addEventListener('input', (e) => {
        let v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (v.length > 3) v = v.substring(0, 3) + "-" + v.substring(3);
        e.target.value = v.substring(0, 8);
    });
}

// Função para registrar histórico de ações (Logs)
async function registrarLog(acao, detalhe) {
    try {
        await addDoc(collection(db, "historico"), {
            usuario: auth.currentUser ? auth.currentUser.email : "desconhecido",
            acao: acao,
            detalhe: detalhe,
            data: serverTimestamp()
        });
    } catch (e) { console.error("Erro ao registrar log:", e); }
}

// Lógica para Salvar ou Atualizar Veículo
document.getElementById('formVeiculo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const placaValue = document.getElementById('placa').value.toUpperCase();
    const tipoValue = document.getElementById('tipoVeiculo').value;
    const btn = document.getElementById('btnSalvar');

    if (!placaValue || !tipoValue) return alert("Preencha todos os campos!");

    btn.disabled = true;
    btn.innerText = "PROCESSANDO...";

    try {
        if (editandoId) {
            // Atualização de veículo existente
            await updateDoc(doc(db, "cad_veiculos", editandoId), {
                placa: placaValue,
                tipo: tipoValue
            });
            await registrarLog("EDIÇÃO VEÍCULO", `Placa alterada para ${placaValue}`);
            alert("Veículo atualizado!");
            window.cancelarEdicao();
        } else {
            // Cadastro de novo veículo
            await addDoc(collection(db, "cad_veiculos"), {
                placa: placaValue,
                tipo: tipoValue,
                criadoEm: serverTimestamp()
            });
            await registrarLog("CADASTRO VEÍCULO", `Placa ${placaValue} cadastrada`);
            alert("Veículo cadastrado!");
        }
        e.target.reset();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar: Verifique suas permissões no Firebase.");
    } finally {
        btn.disabled = false;
        btn.innerText = editandoId ? "ATUALIZAR VEÍCULO" : "CADASTRAR VEÍCULO";
    }
});

// Listagem em Tempo Real (Resolve o erro onSnapshot is not defined)
onSnapshot(query(collection(db, "cad_veiculos"), orderBy("criadoEm", "desc")), (snapshot) => {
    const corpo = document.getElementById('corpoTabela');
    if (!corpo) return;
    corpo.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
        const v = docSnap.data();
        corpo.innerHTML += `
            <tr>
                <td><strong>${v.placa}</strong></td>
                <td>${v.tipo}</td>
                <td style="text-align: right;">
                    <button class="btn-edit" onclick="prepararEdicao('${docSnap.id}', '${v.placa}', '${v.tipo}')">EDITAR</button>
                    <button class="btn-delete" onclick="excluirVeiculo('${docSnap.id}', '${v.placa}')">EXCLUIR</button>
                </td>
            </tr>
        `;
    });
});

// Funções Globais para o HTML (Window Object)
window.prepararEdicao = (id, placa, tipo) => {
    editandoId = id;
    document.getElementById('placa').value = placa;
    document.getElementById('tipoVeiculo').value = tipo;
    document.getElementById('btnSalvar').innerText = "ATUALIZAR VEÍCULO";
    document.getElementById('btnSalvar').style.background = "#2e7d32";
    document.getElementById('btnCancelar').style.display = "block";
    document.getElementById('tituloForm').innerText = "EDITANDO VEÍCULO";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicao = () => {
    editandoId = null;
    document.getElementById('formVeiculo').reset();
    document.getElementById('btnSalvar').innerText = "CADASTRAR VEÍCULO";
    document.getElementById('btnSalvar').style.background = "#d32f2f";
    document.getElementById('btnCancelar').style.display = "none";
    document.getElementById('tituloForm').innerText = "CADASTRAR VEÍCULO";
};

window.excluirVeiculo = async (id, placa) => {
    if (confirm(`Deseja excluir definitivamente o veículo ${placa}?`)) {
        try {
            await deleteDoc(doc(db, "cad_veiculos", id));
            await registrarLog("EXCLUSÃO VEÍCULO", `Removeu a placa ${placa}`);
        } catch (e) {
            alert("Erro ao excluir veículo.");
        }
    }
};

document.getElementById('btnSair').onclick = () => signOut(auth);
