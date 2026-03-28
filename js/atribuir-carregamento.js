import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, addDoc, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let dadosTabela = [];
let usuarioDados = null;
let produtosCache = [];
let cargaFoco = null;
let itensOcorrencia = [];

async function registrarHistorico(acao, detalhe) {
    try {
        await addDoc(collection(db, "historico"), {
            usuario: usuarioDados?.nome || "Sistema",
            acao: acao,
            detalhe: detalhe,
            data: serverTimestamp(),
            modulo: "Carregamento"
        });
    } catch (e) { console.error("Erro log:", e); }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const d = await getDoc(doc(db, "usuarios", user.uid));
        usuarioDados = d.exists() ? d.data() : { nome: user.email };
        document.getElementById('userName').innerText = usuarioDados.nome;
        carregarDadosAuxiliares();
        inicializar();
    } else { window.location.href = "index.html"; }
});

async function carregarDadosAuxiliares() {
    const pSnap = await getDocs(collection(db, "produtos_lista"));
    produtosCache = pSnap.docs.map(d => d.data());
    document.getElementById('dl_produtos').innerHTML = produtosCache.map(p => `<option value="${p.codigo}">${p.descricao}</option>`).join('');

    const sSnap = await getDocs(collection(db, "equipe_separadores"));
    const cont = document.getElementById('containerCheckSeparadores');
    // Renderização organizada para o Modal de Ocorrência
    cont.innerHTML = sSnap.docs.map(d => `
        <label class="pessoa-item-lista">
            <input type="checkbox" name="sep_oc" value="${d.data().nome}"> 
            <span>${d.data().nome}</span>
        </label>
    `).join('');
}

function inicializar() {
    onSnapshot(query(collection(db, "expedicoes"), where("status", "==", "CONFERÊNCIA FINALIZADA")), (snap) => {
        const cont = document.getElementById('listaExpedicoesMulti');
        cont.innerHTML = "";
        snap.forEach(d => {
            const exp = d.data();
            const dataF = exp.data ? exp.data.split('-').reverse().join('/') : '--/--';
            cont.innerHTML += `
                <label class="pessoa-item-lista">
                    <input type="checkbox" name="exp_check" value="${d.id}" data-cod="${exp.codigo}">
                    <span>${dataF} | <strong>${exp.codigo}</strong> | ${exp.placa} | ${exp.destino} | BOX: ${exp.box}</span>
                </label>`;
        });
    });

    onSnapshot(collection(db, "equipe"), (snap) => {
        const t = document.getElementById('listaTerceiro');
        const m = document.getElementById('listaMEI');
        t.innerHTML = ""; m.innerHTML = "";
        snap.forEach(d => {
            const p = d.data();
            const html = `<label class="pessoa-item-lista"><input type="checkbox" name="membros" value="${p.nome}"> <span>${p.nome}</span></label>`;
            if (p.vinculo?.toUpperCase() === "MEI") m.innerHTML += html;
            else t.innerHTML += html;
        });
    });

    onSnapshot(query(collection(db, "expedicoes"), where("status", "==", "EM CARREGAMENTO")), (snap) => {
        dadosTabela = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderizarTabela();
    });
}

function renderizarTabela() {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = "";
    let veiculosSet = new Set();

    dadosTabela.forEach(item => {
        veiculosSet.add(`${item.data}_${item.placa}`);
        corpo.innerHTML += `
            <tr>
                <td>${item.data?.split('-').reverse().join('/')}</td>
                <td><strong>${item.codigo}</strong></td>
                <td>${item.placa}</td>
                <td>${item.tipoVeiculo || 'N/A'}</td>
                <td>${item.destino}</td>
                <td>${item.box}</td>
                <td><span style="background:#e65100; color:white; padding:3px 8px; border-radius:10px; font-size:10px;">${item.status}</span></td>
                <td style="color:#b71c1c; font-weight:bold;">${item.equipe_carregamento?.join(', ')}</td>
                <td>
                    <button class="btn-acao" style="background:#1b5e20; color:white;" onclick="finalizarCarga('${item.id}', '${item.codigo}')">OK</button>
                    <button class="btn-acao" style="background:#fbc02d;" onclick="prepararEdicao('${item.id}')">EDITAR</button>
                    <button class="btn-acao" style="background:#b71c1c; color:white;" onclick="abrirModalOcorrencia('${item.id}', '${item.codigo}')">⚠️ OCORRÊNCIA</button>
                </td>
            </tr>`;
    });
    document.getElementById('kpiExpedicoes').innerText = dadosTabela.length;
    document.getElementById('kpiCarros').innerText = veiculosSet.size;
}

document.getElementById('btnSalvar').onclick = async () => {
    const checks = Array.from(document.querySelectorAll('input[name="exp_check"]:checked'));
    const ids = checks.map(i => i.value);
    const equipe = Array.from(document.querySelectorAll('input[name="membros"]:checked')).map(i => i.value);
    const editId = document.getElementById('editId').value;

    if (equipe.length === 0) return alert("Selecione a equipe!");

    try {
        if(editId) {
            await updateDoc(doc(db, "expedicoes", editId), { equipe_carregamento: equipe });
            await registrarHistorico("Edição de Equipe", `Carga ${editId} atualizada.`);
        } else {
            if(ids.length === 0) return alert("Selecione as cargas!");
            for (let id of ids) {
                await updateDoc(doc(db, "expedicoes", id), {
                    status: "EM CARREGAMENTO",
                    equipe_carregamento: equipe,
                    inicioCarregamento: serverTimestamp()
                });
            }
        }
        alert("Sucesso!");
        location.reload();
    } catch (e) { alert("Erro ao salvar."); }
};

window.prepararEdicao = async (id) => {
    const d = await getDoc(doc(db, "expedicoes", id));
    const data = d.data();
    document.getElementById('editId').value = id;
    document.getElementById('tituloForm').innerText = "✏️ EDITANDO EQUIPE: " + data.codigo;
    document.getElementById('btnSalvar').innerText = "ATUALIZAR EQUIPE";
    
    // MOSTRAR BOTÃO CANCELAR APENAS NA EDIÇÃO
    document.getElementById('btnCancelarForm').style.display = "block";
    
    document.querySelectorAll('input[name="membros"]').forEach(ck => {
        ck.checked = data.equipe_carregamento?.includes(ck.value);
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
};

document.getElementById('btnCancelarForm').onclick = () => location.reload();

window.abrirModalOcorrencia = (id, cod) => {
    cargaFoco = { id, cod };
    document.getElementById('tituloModalOc').innerText = "⚠️ Ocorrência: Exp " + cod;
    document.getElementById('modalOcorrencia').style.display = 'flex';
    itensOcorrencia = [];
    renderizarItensOcorrencia();
};

window.buscarProduto = (cod) => {
    const p = produtosCache.find(x => x.codigo == cod);
    if(p) {
        document.getElementById('oc_desc').value = p.descricao;
        document.getElementById('oc_grade').value = p.grade || "S/ GRADE";
    }
};

window.adicionarItemLista = () => {
    const cod = document.getElementById('oc_codigo').value;
    const qtd = document.getElementById('oc_qtd').value;
    const mot = document.getElementById('oc_motivo').value;
    const seps = Array.from(document.querySelectorAll('input[name="sep_oc"]:checked')).map(i => i.value);

    if(!cod || !qtd || !mot || seps.length === 0) return alert("Preencha Cód, Qtd, Motivo e Separadores!");

    itensOcorrencia.push({
        codigo: cod,
        descricao: document.getElementById('oc_desc').value,
        quantidade: qtd,
        motivo: mot,
        separadores: seps,
        obs: document.getElementById('oc_obs').value
    });

    document.getElementById('oc_codigo').value = "";
    document.getElementById('oc_qtd').value = "";
    document.getElementById('oc_desc').value = "";
    document.getElementById('oc_grade').value = "";
    document.getElementById('oc_obs').value = "";
    document.querySelectorAll('input[name="sep_oc"]').forEach(c => c.checked = false);
    
    renderizarItensOcorrencia();
};

function renderizarItensOcorrencia() {
    const cont = document.getElementById('listaItensTemp');
    if(itensOcorrencia.length === 0) {
        cont.innerHTML = "<i>Nenhum item adicionado...</i>";
        return;
    }
    cont.innerHTML = itensOcorrencia.map((item, index) => `
        <div class="item-row">
            <span><strong>${item.quantidade}x</strong> ${item.codigo} - ${item.motivo}</span>
            <button onclick="removerItemOc(${index})" style="color:red; background:none; border:none; cursor:pointer;">Remover</button>
        </div>
    `).join('');
}

window.removerItemOc = (index) => {
    itensOcorrencia.splice(index, 1);
    renderizarItensOcorrencia();
};

document.getElementById('btnSalvarFinal').onclick = async () => {
    if(itensOcorrencia.length === 0) return alert("Adicione ao menos um item!");
    try {
        await addDoc(collection(db, "ocorrencia_de_carregamento"), {
            expID: cargaFoco.id,
            expCod: cargaFoco.cod,
            usuario: usuarioDados.nome,
            data: serverTimestamp(),
            itens: itensOcorrencia
        });
        alert("Ocorrência salva!");
        fecharModal();
    } catch (e) { alert("Erro ao salvar."); }
};

window.fecharModal = () => {
    document.getElementById('modalOcorrencia').style.display = 'none';
    itensOcorrencia = [];
};

window.finalizarCarga = async (id, cod) => {
    if(confirm(`Finalizar carga ${cod}?`)) {
        await updateDoc(doc(db, "expedicoes", id), { status: "CARREGADO/EM VIAGEM", fimCarregamento: serverTimestamp() });
        alert("Carga Finalizada!");
    }
};

document.getElementById('btnSair').onclick = () => signOut(auth);
