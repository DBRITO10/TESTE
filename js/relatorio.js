   // Importa a configuração centralizada
   import { auth, db } from "./firebase-config.js";

   // Importa as funções necessárias do Firebase SDK
   import { 
       onAuthStateChanged, 
       signOut 
   } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

   import { 
       collection, 
       getDocs, 
       doc, 
       getDoc 
   } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

   let dadosFull = [], filtrosAtivos = {}, colAtual = '', cS, cV;

   const CORES = { 
       'CARRETA': '#1b5e20', 'TRUCK': '#03a9f4', 'CARRO 3/4': '#7b1fa2', 'TOCO': '#fbc02d',
       'FINALIZADO': '#1b5e20', 'EM SEPARAÇÃO': '#e65100', 'CRIADO': '#0d47a1',
       'EM CARREGAMENTO': '#95e9ae', 'CARREGADO/EM VIAGEM': '#d123a3', 'CONFERÊNCIA FINALIZADA': '#4a148c'
   };

   onAuthStateChanged(auth, async (user) => {
       if (user) {
           try {
               const userRef = doc(db, "usuarios", user.uid);
               const userSnap = await getDoc(userRef);
               if (userSnap.exists()) {
                   document.getElementById('userName').innerText = userSnap.data().nome;
               } else {
                   document.getElementById('userName').innerText = user.email;
               }
           } catch (error) {
               console.error("Erro ao buscar nome:", error);
           }
           carregar(); 
       } else { 
           window.location.href = "index.html"; 
       }
    });    

    async function carregar() {
        const snap = await getDocs(collection(db, "expedicoes"));
        dadosFull = snap.docs.map(d => d.data());
        
        // AJUSTE: DATA ATUAL NO HORÁRIO DE BRASÍLIA
        const agora = new Date();
        const offsetBR = -3; 
        const dataBR = new Date(agora.getTime() + (offsetBR * 3600000));
        const hoje = dataBR.toISOString().split('T')[0];

        // DEFINE O FILTRO DE DATA INICIALMENTE COMO HOJE
        filtrosAtivos['data'] = [hoje];
        document.getElementById('f-data').classList.add('active');
        
        processar();
    }

    function processar() {
        let filtrados = [...dadosFull];
        Object.keys(filtrosAtivos).forEach(c => {
            if(filtrosAtivos[c].length > 0) {
                filtrados = filtrados.filter(d => filtrosAtivos[c].includes(String(d[c])));
            }
        });
        exibir(filtrados);
    }

    function exibir(lista) {
        const corpo = document.getElementById('corpoTabela');
        corpo.innerHTML = "";
        lista.forEach(d => {
            const stClass = d.status.toUpperCase().replace(/ /g, "_").replace(/\//g, "_");
            const vMod = d.tipo.toUpperCase().includes('3/4') ? '34' : d.tipo.toUpperCase();
            
            corpo.innerHTML += `<tr>
                <td>${d.data.split('-').reverse().join('/')}</td>
                <td><strong>${d.codigo}</strong></td>
                <td>${d.placa}</td>
                <td>${d.destino}</td>
                <td>${d.box}</td>
                <td><span class="badge st-${stClass}">${d.status}</span></td>
                <td>${d.conferente}</td>
                <td><span class="badge v-${vMod}">${d.tipo}</span></td>
                <td>${d.peso}</td>
            </tr>`;
        });
        
        const cargasUnicas = new Set(lista.map(i => i.placa + "_" + i.data)).size;
        document.getElementById('txtKpi').innerText = `CARROS: ${cargasUnicas} | EXPEDIÇÕES: ${lista.length}`;
        graficos(lista);
    }

    function graficos(lista) {
        const sM = {}, vM = {};
        const veiculosUnicos = new Set();
        lista.forEach(d => { 
            sM[d.status] = (sM[d.status] || 0) + 1; 
            const idVeiculo = d.placa.toUpperCase() + "_" + d.data;
            if(!veiculosUnicos.has(idVeiculo)) {
                veiculosUnicos.add(idVeiculo);
                const tipo = d.tipo.toUpperCase();
                vM[tipo] = (vM[tipo] || 0) + 1;
            }
        });
        if(cS) cS.destroy(); if(cV) cV.destroy();
        const cfg = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font:{size:10} }},
                datalabels: { color: '#fff', font: { weight: 'bold', size: 11 }, formatter: v => v }
            }
        };
        cS = new Chart(document.getElementById('chartStatus'), {
            type: 'pie', plugins: [ChartDataLabels],
            data: { labels: Object.keys(sM), datasets: [{ data: Object.values(sM), backgroundColor: Object.keys(sM).map(k => CORES[k] || '#999') }]},
            options: cfg
        });
        cV = new Chart(document.getElementById('chartVeiculos'), {
            type: 'doughnut', plugins: [ChartDataLabels],
            data: { labels: Object.keys(vM), datasets: [{ data: Object.values(vM), backgroundColor: Object.keys(vM).map(k => {
                if(k.includes('CARRETA')) return CORES['CARRETA'];
                if(k.includes('TRUCK')) return CORES['TRUCK'];
                if(k.includes('3/4')) return CORES['CARRO 3/4'];
                return CORES['TOCO'];
            }) }]},
            options: cfg
        });
    }

    window.marcarTodos = (status) => {
        const inputs = document.querySelectorAll('#mBody input[type="checkbox"]');
        inputs.forEach(i => i.checked = status);
    };

    window.abrirFiltro = (col) => {
        colAtual = col;
        const b = document.getElementById('mBody'); b.innerHTML = "";
        let unicos = [...new Set(dadosFull.map(d => String(d[col])))].sort();
        unicos.forEach(v => {
            const ck = (filtrosAtivos[col] || []).includes(v) ? 'checked' : '';
            b.innerHTML += `<label class="filter-item"><input type="checkbox" value="${v}" ${ck}> ${col==='data'?v.split('-').reverse().join('/'):v}</label>`;
        });
        document.getElementById('modalF').style.display = 'block';
    };

    window.aplicarF = () => {
        filtrosAtivos[colAtual] = Array.from(document.querySelectorAll('#mBody input:checked')).map(i => i.value);
        document.getElementById(`f-${colAtual}`).classList.toggle('active', filtrosAtivos[colAtual].length > 0);
        fecharF(); processar();
    };

    window.fecharF = () => document.getElementById('modalF').style.display = 'none';
    window.buscaGlobal = () => {
        const input = document.getElementById("inputBusca").value.toUpperCase();
        const tr = document.getElementById("corpoTabela").getElementsByTagName("tr");
        for (let i = 0; i < tr.length; i++) tr[i].style.display = tr[i].innerText.toUpperCase().indexOf(input) > -1 ? "" : "none";
    };
    window.ordenar = (n) => {
        const table = document.getElementById("tabelaMaster");
        let rows, switching = true, i, x, y, should, dir = "asc", count = 0;
        while (switching) {
            switching = false; rows = table.rows;
            for (i = 1; i < (rows.length - 1); i++) {
                should = false;
                x = rows[i].getElementsByTagName("TD")[n]; y = rows[i+1].getElementsByTagName("TD")[n];
                if (dir == "asc" ? x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase() : x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) { should = true; break; }
            }
            if (should) { rows[i].parentNode.insertBefore(rows[i+1], rows[i]); switching = true; count++; }
            else if (count == 0 && dir == "asc") { dir = "desc"; switching = true; }
        }
    };

    window.exportarExcel = () => {
        const originalTable = document.getElementById('tabelaMaster');
        const clone = originalTable.cloneNode(true);
        clone.querySelectorAll('th').forEach(th => {
            const text = th.childNodes[0].textContent.replace('⇅', '').trim();
            th.innerHTML = text;
        });
        const wb = XLSX.utils.table_to_book(clone, { sheet: "Expedição Simonetti" });
        XLSX.writeFile(wb, `Expedicao_Simonetti_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    };

    window.exportarPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        const dataEmissao = new Date().toLocaleString('pt-BR');
        doc.setFillColor(183, 28, 28);
        doc.rect(0, 0, 297, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("RELATÓRIO DE EXPEDIÇÃO", 15, 18);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const kpiText = document.getElementById('txtKpi').innerText;
        doc.text(`EMISSÃO: ${dataEmissao}  |  RESUMO: ${kpiText}`, 15, 28);
        doc.autoTable({
            html: '#tabelaMaster',
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [183, 28, 28], textColor: 255, fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8, halign: 'center', fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 240, 240] },
            didParseCell: (data) => {
                if (data.section === 'head') {
                    data.cell.text = data.cell.text[0].split('⇅')[0].trim();
                }
            }
        });
        doc.save(`Relatorio_Expedicao_Simonetti_${new Date().getTime()}.pdf`);
    };

    document.getElementById('btnSair').onclick = () => signOut(auth);
