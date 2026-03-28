import { db, auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let todosProdutos = [];

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            // Nome do usuário no canto esquerdo
            document.getElementById('userName').innerText = userDoc.data().nome.split(' ')[0].toUpperCase();
            carregarDados();
        }
    } else { window.location.href = "index.html"; }
});

// Função para padronizar e carregar dados
async function carregarDados() {
    const snap = await getDocs(collection(db, "produtos_lista"));
    todosProdutos = [];
    snap.forEach(doc => { 
        todosProdutos.push({ id: doc.id, ...doc.data() }); 
    });
    renderizarCards();
}

// Renderiza os "Pastas" de Fornecedores
function renderizarCards() {
    const grid = document.getElementById('gridFornecedores');
    grid.innerHTML = "";
    const fornecedores = [...new Set(todosProdutos.map(p => p.fornecedor))].sort();

    fornecedores.forEach(forn => {
        const qtd = todosProdutos.filter(p => p.fornecedor === forn).length;
        const card = document.createElement('div');
        card.className = 'card-forn';
        card.onclick = () => abrirListaForn(forn);
        card.innerHTML = `
            <div style="font-size:30px; margin-bottom:10px;">📁</div>
            <div style="text-transform: uppercase;">${forn}</div>
            <div style="font-size:10px; font-weight:normal; color:#888;">${qtd} ITENS</div>
        `;
        grid.appendChild(card);
    });
}

// CADASTRO MANUAL (PADRONIZADO MAIÚSCULO)
document.getElementById('btnSalvarManual').onclick = async () => {
    const forn = document.getElementById('manualForn').value.trim().toUpperCase();
    const cod = document.getElementById('manualCod').value.trim().toUpperCase();
    const desc = document.getElementById('manualDesc').value.trim().toUpperCase();
    const grade = document.getElementById('manualGrade').value.trim().toUpperCase() || "UNICA";
    const custo = document.getElementById('manualCusto').value;

    if(!forn || !cod || !desc) return alert("Preencha Fornecedor, Código e Descrição!");

    // CORREÇÃO: Remove barras do ID para evitar erro no Firestore
    const idUnico = `${cod}_${grade}`.replace(/\//g, '-');
    
    await setDoc(doc(db, "produtos_lista", idUnico), {
        fornecedor: forn,
        codigo: cod,
        descricao: desc,
        grade: grade,
        custoUnitario: custo || 0
    }, { merge: true });

    alert("Produto cadastrado com sucesso!");
    document.querySelectorAll('.card-cadastro input').forEach(i => i.value = "");
    carregarDados();
};

// MODAL 1: Lista de Produtos do Fornecedor
window.abrirListaForn = (forn) => {
    document.getElementById('nomeFornModal').innerText = forn;
    const lista = todosProdutos.filter(p => p.fornecedor === forn);
    const corpo = document.getElementById('corpoListaProdutos');
    corpo.innerHTML = "";

    lista.forEach(p => {
        const item = document.createElement('div');
        item.className = 'item-produto';
        item.innerHTML = `
            <div>
                <b style="text-transform: uppercase;">${p.descricao}</b>
                <small>CÓD: ${p.codigo} | GRADE: ${p.grade}</small><br>
                <span style="color:green; font-weight:bold;">R$ ${parseFloat(p.custoUnitario).toFixed(2)}</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="abrirEdicaoCompleta('${p.id}')" style="background:#ffa000; border:none; padding:8px; border-radius:5px; color:white; cursor:pointer;">✏️</button>
                <button onclick="excluirProduto('${p.id}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
            </div>
        `;
        corpo.appendChild(item);
    });
    document.getElementById('modalLista').style.display = 'block';
};

// MODAL 2: Edição Completa de Campos
window.abrirEdicaoCompleta = (id) => {
    const p = todosProdutos.find(x => x.id === id);
    if(!p) return;

    let modalEdit = document.getElementById('modalEdit');
    if(!modalEdit) {
        alert("Erro: Estrutura de modal de edição não encontrada no HTML.");
        return;
    }

    document.getElementById('editId').value = p.id;
    document.getElementById('editForn').value = p.fornecedor;
    document.getElementById('editCod').value = p.codigo;
    document.getElementById('editDesc').value = p.descricao;
    document.getElementById('editGrade').value = p.grade;
    document.getElementById('editCusto').value = p.custoUnitario;

    modalEdit.style.display = 'flex';
};

// SALVAR EDIÇÃO DO MODAL
document.getElementById('btnSalvarEdicao').onclick = async () => {
    const idOriginal = document.getElementById('editId').value;
    const novoForn = document.getElementById('editForn').value.trim().toUpperCase();
    const novoCod = document.getElementById('editCod').value.trim().toUpperCase();
    const novoDesc = document.getElementById('editDesc').value.trim().toUpperCase();
    const novaGrade = document.getElementById('editGrade').value.trim().toUpperCase();
    const novoCusto = document.getElementById('editCusto').value;

    // CORREÇÃO: Remove barras do novo ID
    const novoId = `${novoCod}_${novaGrade}`.replace(/\//g, '-');

    if (idOriginal !== novoId) {
        await deleteDoc(doc(db, "produtos_lista", idOriginal));
    }

    await setDoc(doc(db, "produtos_lista", novoId), {
        fornecedor: novoForn,
        codigo: novoCod,
        descricao: novoDesc,
        grade: novaGrade,
        custoUnitario: novoCusto
    }, { merge: true });

    alert("Produto atualizado com sucesso!");
    fecharModal('modalEdit');
    fecharModal('modalLista');
    carregarDados();
};

// IMPORTAÇÃO VIA PLANILHA
document.getElementById('btnProcessar').onclick = async () => {
    const file = document.getElementById('inputPlanilha').files[0];
    if (!file) return alert("Selecione um arquivo!");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        for (const item of json) {
            const cod = String(item["Cod."] || item["Cod"] || "").trim().toUpperCase();
            const grade = String(item["Grade"] || "UNICA").trim().toUpperCase();
            
            if (cod) {
                // CORREÇÃO: Remove barras do ID gerado pela planilha
                const idUnico = `${cod}_${grade}`.replace(/\//g, '-');
                
                await setDoc(doc(db, "produtos_lista", idUnico), {
                    fornecedor: String(item["Fornecedor"] || "SEM FORNECEDOR").trim().toUpperCase(),
                    codigo: cod,
                    descricao: String(item["Descricao"] || "").trim().toUpperCase(),
                    grade: grade,
                    custoUnitario: item["Custo unitario"] || 0
                }, { merge: true });
            }
        }
        alert("Sincronização concluída!");
        carregarDados();
    };
    reader.readAsArrayBuffer(file);
};

// Funções Auxiliares
window.excluirProduto = async (id) => {
    if(confirm("Deseja realmente excluir este produto?")) {
        await deleteDoc(doc(db, "produtos_lista", id));
        fecharModal('modalLista');
        carregarDados();
    }
};

window.fecharModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

window.filtrarGeral = () => {
    const termo = document.getElementById('inputBusca').value.toLowerCase();
    const cards = document.querySelectorAll('.card-forn');
    cards.forEach(c => {
        const fornNome = c.innerText.toLowerCase();
        // Lógica para filtrar fornecedores que contenham produtos com o termo buscado
        const temProd = todosProdutos.some(p => 
            p.fornecedor.toLowerCase() === fornNome.split('\n')[1].toLowerCase() && 
            (p.codigo.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo))
        );
        c.style.display = (fornNome.includes(termo) || temProd) ? "" : "none";
    });
};

document.getElementById('btnSair').onclick = () => signOut(auth);
