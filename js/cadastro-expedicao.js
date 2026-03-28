// Importando a configuração centralizada (mesma pasta)
import { auth, db } from "./firebase-config.js";

// Importando as funções necessárias do Firebase SDK
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    collection, 
    addDoc, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let dadosOriginais = [];
let ordemDirecao = true;

const obterDataLocal = () => {
    const agora = new Date();
    const offset = agora.getTimezoneOffset() * 60000;
    return new Date(agora - offset).toISOString().split('T')[0];
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) document.getElementById('userName').innerText = userDoc.data().nome;
        const hoje = obterDataLocal();
        document.getElementById('dataExp').value = hoje;
        document.getElementById('filtroInicio').value = hoje;
        document.getElementById('filtroFim').value = hoje;
        carregarPlacas();
        carregarDestinos();
        carregarConferentes();
        listarExpedicoes(hoje, hoje); 
    } else { window.location.href = "index.html"; }
});

async function registrarLog(acao, detalhes, expedicaoId) {
    try {
        await addDoc(collection(db, "logs_acoes"), {
            usuario: document.getElementById('userName').innerText,
            acao: acao,
            detalhes: detalhes,
            expedicaoId: expedicaoId,
            dataHora: serverTimestamp()
        });
    } catch (e) {
        console.error("Erro ao registrar log: ", e);
    }
}

function listarExpedicoes(inicio, fim) {
    const q = query(collection(db, "expedicoes"), where("data", ">=", inicio), where("data", "<=", fim));
    onSnapshot(q, (snap) => {
        dadosOriginais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        dadosOriginais.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, {numeric: true}));
        renderizarTabela(dadosOriginais);
    });
}

function renderizarTabela(lista) {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = "";
    let countExp = 0;
    let placasUnicas = new Set();

    lista.forEach(item => {
        countExp++;
        placasUnicas.add(item.placa + "_" + item.data);
        const dataF = item.data.split('-').reverse().join('/');
        const classeTipo = `tipo-${item.tipo.toUpperCase()}`;

        corpo.innerHTML += `
            <tr>
                <td>${dataF}</td>
                <td><strong>${item.codigo}</strong></td>
                <td>${item.placa}</td>
                <td><span class="${classeTipo}">${item.tipo}</span></td>
                <td>${item.destino}</td>
                <td>${item.box}</td>
                <td>${item.peso}</td>
                <td>${item.conferente}</td>
                <td><span class="badge ${getStatusClass(item.status)}">${item.status}</span></td>
                <td style="white-space: nowrap;">
                    <button class="btn-acao b-sep" onclick="mudarStatus('${item.id}', 'EM SEPARAÇÃO')">SEP</button>
                    <button class="btn-acao b-ok" onclick="mudarStatus('${item.id}', 'CONFERÊNCIA FINALIZADA')">✅</button>
                    <button class="btn-acao btn-edit" onclick="editar('${item.id}')">✏️</button>
                    <button class="btn-acao btn-del" onclick="excluir('${item.id}')">🗑️</button>
                </td>
            </tr>`;
    });
    document.getElementById('totalExp').innerText = countExp;
    document.getElementById('totalCarros').innerText = placasUnicas.size;
}

document.getElementById('btnCancelar').onclick = () => {
    document.getElementById('formExpedicao').reset();
    document.getElementById('editId').value = "";
    document.getElementById('tituloForm').innerText = "NOVA EXPEDIÇÃO";
    document.getElementById('btnCancelar').style.display = "none";
    document.getElementById('dataExp').value = obterDataLocal();
};

window.editar = async (id) => {
    const d = await getDoc(doc(db, "expedicoes", id));
    const data = d.data();
    document.getElementById('editId').value = id;
    document.getElementById('codExp').value = data.codigo;
    document.getElementById('placa').value = data.placa;
    document.getElementById('tipoVeic').value = data.tipo;
    document.getElementById('boxExp').value = data.box;
    document.getElementById('pesoExp').value = data.peso;
    document.getElementById('destinoExp').value = data.destino;
    document.getElementById('conferenteExp').value = data.conferente;
    document.getElementById('dataExp').value = data.data;
    document.getElementById('tituloForm').innerText = "EDITANDO EXPEDIÇÃO";
    document.getElementById('btnCancelar').style.display = "block";
    window.scrollTo({top: 0, behavior: 'smooth'});
};

document.getElementById('formExpedicao').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const dados = {
        codigo: document.getElementById('codExp').value,
        placa: document.getElementById('placa').value,
        tipo: document.getElementById('tipoVeic').value,
        box: document.getElementById('boxExp').value.toUpperCase(),
        peso: document.getElementById('pesoExp').value,
        destino: document.getElementById('destinoExp').value,
        conferente: document.getElementById('conferenteExp').value,
        data: document.getElementById('dataExp').value,
        atualizadoEm: serverTimestamp()
    };
    if (id) {
        await updateDoc(doc(db, "expedicoes", id), dados);
        await registrarLog("EDIÇÃO", `Expedição ${dados.codigo} editada`, id);
        alert("Atualizado!");
    }
    else {
        dados.status = "CRIADO";
        dados.criadoEm = serverTimestamp();
        const docRef = await addDoc(collection(db, "expedicoes"), dados);
        await registrarLog("CRIAÇÃO", `Nova expedição ${dados.codigo} criada`, docRef.id);
        alert("Salvo!");
    }
    
    e.target.reset(); 
    document.getElementById('editId').value = ""; 
    document.getElementById('tituloForm').innerText = "NOVA EXPEDIÇÃO";
    document.getElementById('btnCancelar').style.display = "none";
    document.getElementById('dataExp').value = obterDataLocal();
};

document.getElementById('inputBusca').onkeyup = function() {
    const termo = this.value.toLowerCase();
    const filtrados = dadosOriginais.filter(d => 
        d.codigo.toLowerCase().includes(termo) || 
        d.placa.toLowerCase().includes(termo) || 
        d.destino.toLowerCase().includes(termo)
    );
    renderizarTabela(filtrados);
};

window.ordenarTabela = (index) => {
    const chaves = ['data', 'codigo', 'placa', 'tipo', 'destino', 'box', 'peso', 'conferente', 'status'];
    const chave = chaves[index];
    ordemDirecao = !ordemDirecao;
    dadosOriginais.sort((a, b) => {
        let valA = a[chave].toString().toLowerCase();
        let valB = b[chave].toString().toLowerCase();
        return ordemDirecao ? valA.localeCompare(valB, undefined, {numeric: true}) : valB.localeCompare(valA, undefined, {numeric: true});
    });
    renderizarTabela(dadosOriginais);
};

async function carregarPlacas() {
    const snap = await getDocs(collection(db, "cad_veiculos"));
    const selectPlaca = document.getElementById('placa');
    const veiculosCache = {};
    snap.forEach(doc => {
        const v = doc.data();
        veiculosCache[v.placa] = v.tipo;
        selectPlaca.innerHTML += `<option value="${v.placa}">${v.placa}</option>`;
    });
    selectPlaca.onchange = (e) => document.getElementById('tipoVeic').value = veiculosCache[e.target.value] || "";
}

async function carregarDestinos() {
    const snap = await getDocs(collection(db, "destinos"));
    const select = document.getElementById('destinoExp');
    snap.forEach(doc => { select.innerHTML += `<option value="${doc.data().nome}">${doc.data().nome}</option>`; });
}

async function carregarConferentes() {
    const snap = await getDocs(collection(db, "conferentes"));
    const select = document.getElementById('conferenteExp');
    snap.forEach(doc => { select.innerHTML += `<option value="${doc.data().nome}">${doc.data().nome}</option>`; });
}

document.getElementById('btnFiltrar').onclick = () => {
    listarExpedicoes(document.getElementById('filtroInicio').value, document.getElementById('filtroFim').value);
};

function getStatusClass(s) {
    if (s === 'CRIADO') return 'status-criado';
    if (s === 'EM SEPARAÇÃO') return 'status-separacao';
    if (s === 'CONFERÊNCIA FINALIZADA') return 'status-conf-finalizada';
    return 'status-finalizado';
}

window.mudarStatus = async (id, novoStatus) => {
    // Busca os dados atuais da expedição antes de mudar o status
    const docRef = doc(db, "expedicoes", id);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
        const dados = snap.data();

        // VALIDAÇÃO: Se tentar finalizar e não tiver conferente, bloqueia.
        if (novoStatus === 'CONFERÊNCIA FINALIZADA') {
            if (!dados.conferente || dados.conferente === "" || dados.conferente === "Selecione...") {
                alert("Erro: Você precisa editar a expedição e vincular um CONFERENTE antes de finalizar a conferência.");
                return; // Interrompe a função
            }
        }

        // Se passar pela validação ou for outro status (SEP), atualiza normalmente
        await updateDoc(docRef, { status: novoStatus });
    }
};

window.excluir = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "expedicoes", id)); };
document.getElementById('btnSair').onclick = () => signOut(auth);

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
};

const coresStatusPDF = {
    'CRIADO': '#0d47a1',
    'EM SEPARAÇÃO': '#e65100',
    'EM CARREGAMENTO': '#95e9ae',
    'CARREGADO/EM VIAGEM': '#d123a3',      
    'CONFERÊNCIA FINALIZADA': '#4a148c',
    'FINALIZADO': '#1b5e20'
};

const coresVeiculosPDF = {
    'TOCO': '#fbc02d',
    'TRUCK': '#03a9f4',
    'CARRETA': '#1b5e20',
    'CARRO 3/4': '#4a148c'
};

window.exportarExcel = () => {
    const tabelaOriginal = document.getElementById('tabelaExpedicoes');
    const copiaTabela = tabelaOriginal.cloneNode(true);
    copiaTabela.querySelectorAll('tr').forEach(linha => {
        if (linha.lastElementChild) linha.removeChild(linha.lastElementChild);
    });
    const wb = XLSX.utils.table_to_book(copiaTabela, { sheet: "Expedicoes" });
    XLSX.writeFile(wb, `Expedicao_Simonetti_${new Date().toLocaleDateString()}.xlsx`);
};

window.exportarPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    doc.setFillColor(178, 34, 34);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("EXPEDIÇÃO - MÓVEIS SIMONETTI", 15, 12);

    const totalExp = dadosOriginais.length;
    const placasUnicas = new Set(dadosOriginais.map(item => item.placa + "_" + item.data)).size;

    doc.setFontSize(11);
    doc.text(`TOTAL DE EXPEDIÇÕES: ${totalExp}   |   TOTAL DE CARROS: ${placasUnicas}   |   DATA: ${dataAtual}`, 15, 20);

    const body = [];
    const contagemPorTipo = {};

    dadosOriginais.forEach(item => {
        body.push([
            item.data.split('-').reverse().join('/'),
            item.codigo,
            item.placa,
            item.tipo,
            item.destino,
            item.box,
            item.peso,
            item.conferente,
            item.status
        ]);
        
        const t = item.tipo.toUpperCase();
        if (!contagemPorTipo[t]) contagemPorTipo[t] = new Set();
        contagemPorTipo[t].add(item.placa + "_" + item.data);
    });

    doc.autoTable({
        startY: 30,
        head: [['DATA', 'EXPEDIÇÃO', 'PLACA', 'TIPO', 'DESTINO', 'BOX', 'PESO', 'CONFERENTE', 'STATUS']],
        body: body,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center' },
        headStyles: { fillColor: [178, 34, 34] },
        didParseCell: (data) => {
            if (data.section === 'body') {
                if (data.column.index === 3) {
                    const tipo = data.cell.raw.toUpperCase();
                    if (coresVeiculosPDF[tipo]) {
                        data.cell.styles.textColor = hexToRgb(coresVeiculosPDF[tipo]);
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
                if (data.column.index === 8) {
                    const status = data.cell.raw.toUpperCase();
                    if (coresStatusPDF[status]) {
                        data.cell.styles.textColor = hexToRgb(coresStatusPDF[status]);
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 160) { doc.addPage(); finalY = 20; }
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("RESUMO DE CARROS ÚNICOS POR TIPO:", 15, finalY);

    const summaryData = Object.keys(contagemPorTipo).map(tipo => [tipo, contagemPorTipo[tipo].size]);
    doc.autoTable({
        startY: finalY + 5,
        head: [["VEÍCULO", "QTD CARROS"]],
        body: summaryData,
        tableWidth: 80,
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80] }
    });

    doc.save(`Relatorio_Simonetti_${dataAtual.replace(/\//g, '-')}.pdf`);
};
