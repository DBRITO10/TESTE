import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, doc, getDoc, getDocs, updateDoc, query, where, 
    addDoc, serverTimestamp, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let usuarioDados = null;
let listaProdutosDB = [];
let cargaSelecionadaId = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        usuarioDados = userDoc.exists() ? userDoc.data() : { nome: user.email, nivel: 'user' };
        document.getElementById('userName').innerText = usuarioDados.nome;
        await carregarListaProdutos();
        carregarCargasPendentes();
    } else {
        window.location.href = "index.html";
    }
});
// FUNÇÃO DE HISTÓRICO PADRONIZADA
async function registrarHistorico(acao, detalhe) {
    try {
        await addDoc(collection(db, "historico"), {
            usuario: usuarioDados?.nome || "Sistema",
            acao: acao,
            detalhe: detalhe,
            data: serverTimestamp(),
            modulo: "Recebimento Central" // Identificador deste módulo
        });
    } catch (e) { console.error("Erro log:", e); }
}

async function carregarListaProdutos() {
    try {
        const snap = await getDocs(collection(db, "produtos_lista"));
        listaProdutosDB = snap.docs.map(d => d.data());
    } catch (e) {
        console.error("Erro ao carregar produtos:", e);
    }
}

function carregarCargasPendentes() {
    const q = query(collection(db, "expedicoes"), where("status", "==", "CARREGADO/EM VIAGEM"));
    onSnapshot(q, (snap) => {
        const container = document.getElementById('listaCargas');
        if (!container) return;
        container.innerHTML = "";
        let temCarga = false;
        snap.forEach(d => {
            const data = d.data();
            if (usuarioDados.nivel === 'admin' || (usuarioDados.central && usuarioDados.central.includes(data.destino))) {
                temCarga = true;
                container.innerHTML += `
                    <div class="item-carga">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span class="badge-data">📅 ${data.data}</span>
                            <strong style="color:var(--primary)">Exp: ${data.codigo || data.expedicao}</strong>
                        </div>
                        <p class="info-p"><strong>🚛 Placa:</strong> ${data.placa}</p>
                        <p class="info-p"><strong>📍 Destino:</strong> ${data.destino}</p>
                        <button class="btn-confirmar" onclick="abrirModal('${d.id}', '${data.data}', '${data.codigo || data.expedicao}', '${data.placa}', '${data.tipo || data.tipoVeiculo || '---'}')">
                            CONFERIR
                        </button>
                    </div>`;
            }
        });
        if (!temCarga) container.innerHTML = "<p style='text-align:center; width:100%; color:#999;'>Sem cargas em trânsito.</p>";
    });
}

window.abrirModal = (id, data, exp, placa, veiculo) => {
    cargaSelecionadaId = id;
    document.getElementById('listaItensAvaria').innerHTML = "";
    const dataFormatadaModal = data.split('-').reverse().join('/');
    document.getElementById('detalheCarga').innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <span><strong>📅 DATA:</strong> ${dataFormatadaModal}</span>
            <span><strong>📦 EXP:</strong> ${exp}</span>
            <span><strong>🚛 PLACA:</strong> ${placa}</span>
            <span><strong>🚚 VEÍCULO:</strong> ${veiculo}</span>
        </div>`;
    document.getElementById('modalConferencia').style.display = 'flex';
    document.getElementById('selectAvaria').value = 'nao';
    toggleCamposAvaria();
};

window.toggleCamposAvaria = () => {
    const val = document.getElementById('selectAvaria').value;
    document.getElementById('containerAvarias').style.display = (val === 'sim') ? 'block' : 'none';
    if (val === 'sim' && document.getElementById('listaItensAvaria').children.length === 0) adicionarItemAvaria();
};

window.adicionarItemAvaria = () => {
    const idUnico = Date.now();
    
    // Agora o "value" da lista suspensa contém a Grade para você diferenciar na busca
    const optsCod = listaProdutosDB.map(p => `<option value="${p.codigo} | ${p.grade}">${p.descricao}</option>`).join('');
    const optsDesc = listaProdutosDB.map(p => `<option value="${p.descricao} | ${p.grade}">${p.codigo}</option>`).join('');
    
    const itemHtml = `
        <div class="item-avaria-card" id="item_${idUnico}">
            <span class="remove-item" onclick="document.getElementById('item_${idUnico}').remove()">X REMOVER</span>
            <input type="hidden" class="p-custo" id="custo_${idUnico}">
            
            <input type="text" class="p-cod" placeholder="Código" list="dl_cod_${idUnico}" oninput="buscarPorDados(this, ${idUnico}, 'codigo')" required>
            <datalist id="dl_cod_${idUnico}">${optsCod}</datalist>
            
            <input type="text" class="p-nome" id="nome_${idUnico}" placeholder="Descrição do Produto" list="dl_desc_${idUnico}" oninput="buscarPorDados(this, ${idUnico}, 'descricao')" required>
            <datalist id="dl_desc_${idUnico}">${optsDesc}</datalist>

            <input type="text" class="p-grade" id="grade_${idUnico}" placeholder="Grade" readonly style="background:#e9ecef; font-weight:bold; color:#333;">
            <input type="text" class="p-forn" id="forn_${idUnico}" placeholder="Fornecedor" readonly style="background:#f5f5f5; font-size:11px;">
            
            <div style="display: flex; gap: 8px;">
                <input type="number" class="p-qtd" placeholder="Qtd" style="flex: 1;" required>
                <select class="p-motivo" style="flex: 2;" required>
                    <option value="">Motivo...</option>
                    <optgroup label="DIVERGÊNCIAS">
                        <option value="Danificado">Danificado</option>
                        <option value="Amassado">Amassado</option>
                        <option value="Quebrado">Quebrado</option>
                        <option value="Molhado">Molhado</option>
                        <option value="Falta">Falta</option>
                        <option value="Sobra">Sobra</option>
                    </optgroup>
                </select>
            </div>
            <textarea class="p-obs" placeholder="Observações..."></textarea>
        </div>`;
    document.getElementById('listaItensAvaria').insertAdjacentHTML('beforeend', itemHtml);
};

window.buscarPorDados = (input, id, tipo) => {
    let valorCompleto = input.value.trim().toUpperCase();
    
    // Se o valor contiver o separador "|", vamos separar os dados
    let valorBusca = valorCompleto;
    let gradeBusca = "";
    
    if (valorCompleto.includes(" | ")) {
        const partes = valorCompleto.split(" | ");
        valorBusca = partes[0].trim();
        gradeBusca = partes[1].trim();
    }

    // Busca no banco local considerando o valor e a grade (se houver)
    const p = listaProdutosDB.find(x => {
        if (tipo === 'codigo') {
            return gradeBusca 
                ? (x.codigo == valorBusca && x.grade.toUpperCase() === gradeBusca)
                : (x.codigo == valorBusca);
        } else {
            return gradeBusca 
                ? (x.descricao.toUpperCase() === valorBusca && x.grade.toUpperCase() === gradeBusca)
                : (x.descricao.toUpperCase() === valorBusca);
        }
    });

    const fieldCod = document.querySelector(`#item_${id} .p-cod`);
    const fieldNome = document.getElementById(`nome_${id}`);
    const fieldForn = document.getElementById(`forn_${id}`);
    const fieldCusto = document.getElementById(`custo_${id}`);
    const fieldGrade = document.getElementById(`grade_${id}`);

    if (p) {
        // Limpa o input para remover o texto da grade que veio do datalist e deixa só o dado puro
        input.value = (tipo === 'codigo') ? p.codigo : p.descricao;
        
        // Preenche os outros campos
        if (tipo === 'codigo') fieldNome.value = p.descricao;
        if (tipo === 'descricao') fieldCod.value = p.codigo;
        
        fieldGrade.value = p.grade || "S/ GRADE";
        fieldForn.value = p.fornecedor || "NÃO VINCULADO";
        fieldCusto.value = p.custoUnitario || 0;
    }
};

document.getElementById('btnFinalizar').onclick = async () => {
    const valAvaria = document.getElementById('selectAvaria').value;
    const loading = document.getElementById('loadingModal');
    loading.style.display = 'flex';
    try {
        if (valAvaria === 'sim') {
            const cards = document.querySelectorAll('.item-avaria-card');
            for (let card of cards) {
                await addDoc(collection(db, "avarias"), {
                    expedicaoId: cargaSelecionadaId,
                    codigoProduto: card.querySelector('.p-cod').value,
                    nomeProduto: card.querySelector('.p-nome').value.toUpperCase(),
                    fornecedor: card.querySelector('.p-forn').value,
                    quantidade: card.querySelector('.p-qtd').value,
                    motivo: card.querySelector('.p-motivo').value,
                    descricao: card.querySelector('.p-obs').value.toUpperCase(),
                    custoUnitario: parseFloat(card.querySelector('.p-custo').value) || 0, // Envia o custo para o banco
                    usuario: usuarioDados.nome,
                    central: usuarioDados.central,
                    dataRegistro: serverTimestamp()
                });
            }
        }
        await updateDoc(doc(db, "expedicoes", cargaSelecionadaId), {
            status: "FINALIZADO",
            dataRecebimento: serverTimestamp(),
            recebidoPor: usuarioDados.nome,
            teveOcorrencia: (valAvaria === 'sim')
        });

        // REGISTRO NO HISTÓRICO
        const logMsg = valAvaria === 'sim'
            ? `Baixa finalizada COM DIVERGÊNCIA. Itens: ${resumoAvarias}`
            : `Baixa finalizada SEM DIVERGÊNCIAS.`;
        // Buscamos o código da carga para o log ficar bonito
        const expCod = document.getElementById('detalheCarga').innerText.match(/EXP: (\d+)/)?.[1] || "";
        await registrarHistorico("Baixa de Carga", `Exp ${expCod}: ${logMsg}`);
        
        alert("Baixa finalizada!");
        document.getElementById('modalConferencia').style.display = 'none';
        carregarHistorico();
    } catch (e) { alert("Erro ao salvar."); }
    loading.style.display = 'none';
};

async function carregarHistorico() {
    const container = document.getElementById('listaHistorico');
    const dInVal = document.getElementById('dataInicio').value;
    const dFimVal = document.getElementById('dataFim').value;
    if(!dInVal || !dFimVal || !container) return;
    container.innerHTML = "<p>Buscando...</p>";
    const q = query(collection(db, "expedicoes"), where("status", "==", "FINALIZADO"), where("dataRecebimento", ">=", new Date(dInVal + "T00:00:00")), where("dataRecebimento", "<=", new Date(dFimVal + "T23:59:59")), orderBy("dataRecebimento", "desc"));
    const snap = await getDocs(q);
    container.innerHTML = "";
    snap.forEach(d => {
        const data = d.data();
        if (usuarioDados.nivel === 'admin' || (usuarioDados.central && usuarioDados.central.includes(data.destino))) {
            container.innerHTML += `
                <div class="item-carga finalizado">
                    <p class="info-p"><strong>Exp: ${data.codigo || data.expedicao}</strong></p>
                    <p class="info-p" style="font-size:11px;">Recebido: ${data.dataRecebimento?.toDate().toLocaleString('pt-BR')}</p>
                    ${data.teveOcorrencia ? `<button class="btn-imprimir" onclick="imprimirResumo('${d.id}')">🖨️ IMPRIMIR</button>` : ''}
                </div>`;
        }
    });
}

window.imprimirResumo = async (id) => {
    const q = query(collection(db, "avarias"), where("expedicaoId", "==", id));
    const snap = await getDocs(q);
    let htmlItens = "";
    snap.forEach(doc => {
        const a = doc.data();
        htmlItens += `<tr><td>${a.codigoProduto}</td><td>${a.nomeProduto}</td><td>${a.quantidade}</td><td>${a.motivo}</td><td>${a.descricao}</td></tr>`;
    });
    const win = window.open('', 'PRINT');
    win.document.write(`<html><head><style>table{width:100%;border-collapse:collapse;font-family:sans-serif;} th,td{border:1px solid #ccc;padding:6px;font-size:10px;}</style></head><body><h3>DIVERGÊNCIAS</h3><table><thead><tr><th>CÓD</th><th>PRODUTO</th><th>QTD</th><th>MOTIVO</th><th>OBS</th></tr></thead><tbody>${htmlItens}</tbody></table></body></html>`);
    win.document.close(); win.print();
};

document.getElementById('btnFiltrarHistorico').onclick = carregarHistorico;
document.getElementById('btnCancelar').onclick = () => document.getElementById('modalConferencia').style.display = 'none';
document.getElementById('btnAddItem').onclick = adicionarItemAvaria;
document.getElementById('btnSair').onclick = () => signOut(auth);
