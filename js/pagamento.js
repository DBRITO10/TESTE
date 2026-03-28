import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let dadosParaExportar = [];
let resumoPorPessoa = {};
let valorTotalGeral = 0;

const fmtBRL = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Controle de Acesso
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        if (userDoc.exists()) {
            document.getElementById('userName').innerText = userDoc.data().nome;
        }
    } else {
        window.location.href = "index.html";
    }
});

window.gerarFechamento = async () => {
    const d1 = document.getElementById('dataIni').value;
    const d2 = document.getElementById('dataFim').value;
    const filtro = document.getElementById('filtroTipo').value;
    
    // Valores dos inputs (Preços cheios por tipo de veículo)
    const precos = { 
        "CARRETA": parseFloat(document.getElementById('v_CARRETA').value || 0), 
        "TRUCK": parseFloat(document.getElementById('v_TRUCK').value || 0), 
        "TOCO": parseFloat(document.getElementById('v_TOCO').value || 0), 
        "CARRO 3/4": parseFloat(document.getElementById('v_34').value || 0) 
    };

    if(!d1 || !d2) return alert("Selecione as datas!");

    const corpo = document.getElementById('corpoTabela');
    corpo.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Processando cálculos...</td></tr>";

    try {
        // 1. BUSCA DADOS DA EQUIPE (Vínculo e CPF)
        const eqSnap = await getDocs(collection(db, "equipe"));
        let infoEquipe = {}; 
        eqSnap.forEach(doc => {
            const data = doc.data();
            infoEquipe[data.nome] = { 
                vinculo: data.vinculo || "MEI", 
                cpf: data.cpf || "000.000.000-00" 
            };
        });

        // 2. Busca expedições no período
        const q = query(collection(db, "expedicoes"), where("data", ">=", d1), where("data", "<=", d2));
        const expSnap = await getDocs(q);

        let agrupado = {};
        expSnap.forEach(doc => {
            const d = doc.data();
            if(d.status === "CARREGADO/EM VIAGEM" || d.status === "FINALIZADO") {
                const chave = `${d.placa}_${d.data}`;
                if(!agrupado[chave]) {
                    agrupado[chave] = { data: d.data, placa: d.placa, tipo: d.tipo, exps: [], equipe: d.equipe_carregamento || [] };
                }
                agrupado[chave].exps.push(d.codigo || d.expedicao);
            }
        });

        corpo.innerHTML = "";
        dadosParaExportar = [];
        resumoPorPessoa = {};
        valorTotalGeral = 0;

        let lastDate = "";
        let isGray = false;

        Object.values(agrupado).sort((a,b) => a.data.localeCompare(b.data)).forEach(item => {
            if(item.data !== lastDate) {
                isGray = !isGray;
                lastDate = item.data;
            }

            const valorVeiculoTotal = precos[item.tipo] || 0;
            const qtdPessoas = item.equipe.length || 1;
            const baseIndividual = valorVeiculoTotal / qtdPessoas;

            item.equipe.forEach(nome => {
                const dadosMembro = infoEquipe[nome] || { vinculo: "MEI", cpf: "---" };
                const vnc = dadosMembro.vinculo;
                const cpfMembro = dadosMembro.cpf;
                
                if(filtro !== "TODOS" && vnc !== filtro) return;

                const valorINSS = (vnc === "TERCEIRO") ? (baseIndividual * 0.20) : 0;
                const valorTotalComInss = baseIndividual + valorINSS;

                const linha = {
                    data: item.data.split('-').reverse().join('/'),
                    placa: item.placa,
                    veiculo: item.tipo,
                    exps: [...new Set(item.exps)].join(', '),
                    nome: nome,
                    cpf: cpfMembro,
                    vinculo: vnc,
                    base: baseIndividual,
                    inss: valorINSS,
                    total: valorTotalComInss
                };

                dadosParaExportar.push(linha);
                
                if(!resumoPorPessoa[nome]) resumoPorPessoa[nome] = { total: 0, carros: 0, cpf: cpfMembro };
                resumoPorPessoa[nome].total += valorTotalComInss;
                resumoPorPessoa[nome].carros++;
                valorTotalGeral += valorTotalComInss;

                corpo.innerHTML += `
                    <tr class="${isGray ? 'row-odd' : 'row-even'}">
                        <td>${linha.data}</td>
                        <td><b>${linha.placa}</b></td>
                        <td>${linha.veiculo}</td>
                        <td><small>${linha.exps}</small></td>
                        <td>${linha.nome}</td>
                        <td style="color:${vnc === 'MEI' ? '#1a73e8' : '#e67e22'}"><b>${vnc}</b></td>
                        <td>R$ ${fmtBRL(linha.base)}</td>
                        <td>R$ ${fmtBRL(linha.inss)}</td>
                        <td style="font-weight:900;">R$ ${fmtBRL(linha.total)}</td>
                    </tr>`;
            });
        });

        // Rodapé da Tabela com Resumos (AJUSTADO: COLABORADOR: Fulano CPF: 000)
        if(dadosParaExportar.length > 0) {
            corpo.innerHTML += `<tr style="background:#444; color:white;"><td colspan="9" style="text-align:center; font-size:11px; letter-spacing:2px;">RESUMO POR COLABORADOR</td></tr>`;
            for (let p in resumoPorPessoa) {
                corpo.innerHTML += `
                    <tr class="summary-row">
                        <td colspan="4">COLABORADOR: ${p} CPF: ${resumoPorPessoa[p].cpf}</td>
                        <td colspan="2">CARROS: ${resumoPorPessoa[p].carros}</td>
                        <td colspan="3" style="text-align:right; font-size:14px;">TOTAL: R$ ${fmtBRL(resumoPorPessoa[p].total)}</td>
                    </tr>`;
            }
            corpo.innerHTML += `
                <tr class="total-geral-row">
                    <td colspan="6" style="text-align:right;">VALOR TOTAL GERAL (SOMA DE TODOS):</td>
                    <td colspan="3" style="text-align:right;">R$ ${fmtBRL(valorTotalGeral)}</td>
                </tr>`;
        } else {
            corpo.innerHTML = "<tr><td colspan='9' style='text-align:center;'>Nenhum dado encontrado para o período.</td></tr>";
        }

    } catch (e) {
        console.error("Erro no fechamento:", e);
        alert("Erro ao processar dados.");
    }
};

// Exportar Excel com o novo formato de resumo solicitado
window.exportExcel = () => {
    if(dadosParaExportar.length === 0) return alert("Gere o relatório!");
    const dadosExcel = dadosParaExportar.map(d => ({
        "DATA": d.data, "PLACA": d.placa, "VEÍCULO": d.veiculo, "EXPEDIÇÕES": d.exps,
        "NOME": d.nome, "CPF": d.cpf, "VÍNCULO": d.vinculo, "BASE (R$)": fmtBRL(d.base), "INSS (R$)": fmtBRL(d.inss), "TOTAL (R$)": fmtBRL(d.total)
    }));

    dadosExcel.push({});
    dadosExcel.push({ "DATA": "RESUMO POR COLABORADOR" });

    for (let p in resumoPorPessoa) {
        dadosExcel.push({
            "DATA": "COLABORADOR: " + p + " CPF: " + resumoPorPessoa[p].cpf,
            "PLACA": "CARROS: " + resumoPorPessoa[p].carros,
            "TOTAL (R$)": "TOTAL: R$ " + fmtBRL(resumoPorPessoa[p].total)
        });
    }

    dadosExcel.push({});
    dadosExcel.push({ "NOME": "VALOR TOTAL GERAL ACUMULADO:", "TOTAL (R$)": "R$ " + fmtBRL(valorTotalGeral) });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
    XLSX.writeFile(wb, "Fechamento_Simonetti.xlsx");
};

// Exportar PDF com o novo formato de resumo solicitado
window.exportPDF = () => {
    if(dadosParaExportar.length === 0) return alert("Gere o relatório primeiro!");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    const corPrimaria = [183, 28, 28];

    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, 297, 25, 'F'); 
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("CARREGAMENTO - FECHAMENTO FINANCEIRO", 15, 12);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, 15, 19);

    let lastDate = "";
    let useGray = false;

    doc.autoTable({
        head: [['DATA', 'PLACA', 'VEÍCULO', 'EXPEDIÇÕES', 'NOME', 'VÍNCULO', 'BASE', 'INSS', 'TOTAL']],
        body: dadosParaExportar.map(d => [
            d.data, d.placa, d.veiculo, d.exps, d.nome, d.vinculo, 
            `R$ ${fmtBRL(d.base)}`, `R$ ${fmtBRL(d.inss)}`, `R$ ${fmtBRL(d.total)}`
        ]),
        startY: 30,
        theme: 'plain',
        headStyles: { fillColor: [51, 51, 51], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        didParseCell: function(data) {
            if (data.section === 'body') {
                const rowDate = data.row.raw[0];
                if (rowDate !== lastDate) { useGray = !useGray; lastDate = rowDate; }
                if (useGray) { data.cell.styles.fillColor = [236, 236, 236]; }
            }
        }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    if (finalY > 150) { doc.addPage(); finalY = 20; }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMO DE PAGAMENTOS POR COLABORADOR:", 14, finalY);
    
    finalY += 2;
    doc.setDrawColor(...corPrimaria);
    doc.line(14, finalY, 100, finalY);

    for (let p in resumoPorPessoa) {
        finalY += 8;
        if (finalY > 185) { doc.addPage(); finalY = 20; }
        doc.setFontSize(10);
        // Formatação solicitada: COLABORADOR: Fulano CPF: 000
        doc.text(`COLABORADOR: ${p} CPF: ${resumoPorPessoa[p].cpf}`, 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(`R$ ${fmtBRL(resumoPorPessoa[p].total)} (${resumoPorPessoa[p].carros} Carros)`, 140, finalY);
        doc.setFont("helvetica", "bold");
    }

    finalY += 12;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY - 5, 270, 10, 'F');
    doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    doc.text(`VALOR TOTAL GERAL A SER PAGO: R$ ${fmtBRL(valorTotalGeral)}`, 16, finalY);

    doc.save(`Fechamento_Simonetti_${new Date().getTime()}.pdf`);
};
