// Importando configuração centralizada
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let todosOsDados = [];
let mapaFornecedores = {};
let ordemCrescente = true;

// Controle de Acesso
onAuthStateChanged(auth, async user => {
    if(user) { 
        const userSnap = await getDoc(doc(db, "usuarios", user.uid));
        document.getElementById('userName').innerText = "👤 " + (userSnap.exists() ? userSnap.data().nome : "Usuário");
        await carregarMapaFornecedores();
        setarDatasPadrao();
        filtrarPorPeriodo(); 
    } else { 
        window.location.href = "index.html"; 
    }
});

document.getElementById('btnLogout').onclick = () => signOut(auth);

function setarDatasPadrao() {
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('dataInicio').value = hoje;
    document.getElementById('dataFim').value = hoje;
}

async function carregarMapaFornecedores() {
    const snap = await getDocs(collection(db, "produtos_lista"));
    snap.forEach(d => { mapaFornecedores[d.data().codigo] = d.data().fornecedor || "N/I"; });
}

window.filtrarPorPeriodo = async () => {
    const dIni = document.getElementById('dataInicio').value;
    const dFim = document.getElementById('dataFim').value;
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = '<tr><td colspan="7" style="text-align:center;">Buscando dados...</td></tr>';

    try {
        const [avSnap, expSnap] = await Promise.all([
            getDocs(collection(db, "avarias")),
            getDocs(query(collection(db, "expedicoes"), 
                where("status", "==", "FINALIZADO"), 
                where("data", ">=", dIni), 
                where("data", "<=", dFim)))
        ]);

        let mapaAvarias = {};
        avSnap.forEach(docA => {
            const av = docA.data();
            if (!mapaAvarias[av.expedicaoId]) mapaAvarias[av.expedicaoId] = [];
            mapaAvarias[av.expedicaoId].push(av);
        });

        todosOsDados = [];
        let placasUnicas = new Set();
        let totalDivergencias = 0;

        expSnap.forEach(docExp => {
            const exp = docExp.data();
            const avarias = mapaAvarias[docExp.id] || null;
            if(avarias) totalDivergencias++;
            if(exp.placa) placasUnicas.add(exp.placa);

            todosOsDados.push({
                data: exp.data ? exp.data.split('-').reverse().join('/') : '-',
                codigo: exp.codigo || exp.expedicao || 'N/A',
                destino: exp.destino || '-',
                placa: exp.placa || '-',
                equipe: (exp.equipe_carregamento || []).join(', '),
                avarias: avarias,
                situacaoStr: avarias ? "AVARIA" : "OK"
            });
        });

        // Atualiza Totalizadores no topo
        document.getElementById('totalExp').innerText = todosOsDados.length;
        document.getElementById('totalCarros').innerText = placasUnicas.size;
        document.getElementById('totalAvarias').innerText = totalDivergencias;

        renderizarTabela(todosOsDados);
    } catch (e) { 
        console.error(e); 
        corpo.innerHTML = '<tr><td colspan="7" style="color:red;">Erro ao carregar dados.</td></tr>';
    }
};

function renderizarTabela(lista) {
    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = "";
    lista.forEach((item, index) => {
        const statusBadge = item.avarias ? `<span class="status-badge bg-avaria">⚠️ DIVERGÊNCIA</span>` : `<span class="status-badge bg-ok">✅ OK</span>`;
        const btnAvaria = item.avarias ? `<button class="btn-ver-avaria" onclick="verDetalhes(${index})">VER (${item.avarias.length})</button>` : `<small style="color:#999">Sem ocorrência</small>`;
        
        corpo.innerHTML += `
            <tr>
                <td>${item.data}</td>
                <td><b>${item.codigo}</b></td>
                <td>${item.destino}</td>
                <td>${item.placa}</td>
                <td><small>${item.equipe}</small></td>
                <td>${btnAvaria}</td>
                <td>${statusBadge}</td>
            </tr>`;
    });
}

window.verDetalhes = (index) => {
    const item = todosOsDados[index];
    const body = document.getElementById('modalBody');
    let html = `<div style="font-size:12px; margin-bottom:10px;"><b>Expedição:</b> ${item.codigo}</div>`;

    item.avarias.forEach(a => {
        const forn = mapaFornecedores[a.codigoProduto] || "N/I";
        html += `<div style="padding:10px; border:1px solid #eee; border-radius:5px; margin-bottom:8px; background:#fafafa;">
                    <b style="color:red;">[${a.codigoProduto}] ${a.nomeProduto}</b><br>
                    <small><b>FORN:</b> ${forn} | <b>QTD:</b> ${a.quantidade} | <b>MOTIVO:</b> ${a.motivo}</small><br>
                    <p style="font-size:11px; margin:5px 0; color:#555;"><b>OBS:</b> ${a.descricao || 'Nenhuma'}</p>
                 </div>`;
    });
    body.innerHTML = html;
    document.getElementById('modalAvaria').style.display = 'flex';
};

window.fecharModal = () => document.getElementById('modalAvaria').style.display = 'none';

window.ordenar = (campo) => {
    ordemCrescente = !ordemCrescente;
    todosOsDados.sort((a, b) => {
        let vA = String(a[campo]).toLowerCase();
        let vB = String(b[campo]).toLowerCase();
        return ordemCrescente ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });
    renderizarTabela(todosOsDados);
};

    // PDF PREMIUM - Versão com Observações (Descrição)
    window.exportarPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        // Cabeçalho
        doc.setFillColor(211, 47, 47);
        doc.rect(0, 0, 297, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("RELATÓRIO DE QUALIDADE - SIMONETTI", 15, 15);
        doc.setFontSize(10);
        doc.text(`Período: ${document.getElementById('dataInicio').value} até ${document.getElementById('dataFim').value}`, 15, 22);
        doc.text(`Emissão: ${new Date().toLocaleString()}`, 15, 27);

        const colunas = ["DATA", "EXP", "DESTINO", "PLACA", "EQUIPE", "DETALHES DA OCORRÊNCIA", "SITUAÇÃO"];
        
        const linhas = todosOsDados.map(item => {
            let textoDivergencia = "OK"; // <--- Mudei de textoAvaria para textoDivergencia
            if (item.avarias && item.avarias.length > 0) {
                textoDivergencia = item.avarias.map(a => { // <--- Mudei aqui também
                    const forn = a.fornecedor || mapaFornecedores[a.codigoProduto] || "N/I";
                    const obs = a.descricao ? `\nOBS: ${a.descricao}` : ""; // Pega o campo "NÃO VEIO" do print
                    
                    return `PRODUTO: ${a.nomeProduto}\nFORNECEDOR: ${forn}\nMOTIVO: ${a.motivo} (Qtd: ${a.quantidade})${obs}`;
                }).join("\n--------------------------\n");
            }

            return [item.data, item.codigo, item.destino, item.placa, item.equipe, textoDivergencia, item.situacaoStr === "AVARIA" ? "DIVERGÊNCIA" : "OK"];
        });

        doc.autoTable({
            head: [colunas],
            body: linhas,
            startY: 35,
            styles: { 
                fontSize: 7, 
                cellPadding: 3, 
                lineColor: [200, 200, 200], 
                lineWidth: 0.1,
                valign: 'middle'
            },
            headStyles: { 
                fillColor: [240, 240, 240], 
                textColor: [50, 50, 50],
                fontStyle: 'bold'
            },
            columnStyles: { 
                5: { cellWidth: 100 }, 
                6: { fontStyle: 'bold', halign: 'center' } 
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 6) {
                    data.cell.styles.textColor = (data.cell.raw === "DIVERGÊNCIA") ? [190, 0, 0] : [0, 130, 0];
                }
            }
        });

        doc.save(`Relatorio_Qualidade_Simonetti.pdf`);
    };

    // Filtros
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('keyup', (e) => {
            e.stopPropagation();
            const filtros = {};
            document.querySelectorAll('.filter-input').forEach(i => { if (i.value) filtros[i.dataset.col] = i.value.toLowerCase(); });
            const filtrados = todosOsDados.filter(item => {
                return Object.keys(filtros).every(col => String(item[col]).toLowerCase().includes(filtros[col]));
            });
            renderizarTabela(filtrados);
        });
    });
