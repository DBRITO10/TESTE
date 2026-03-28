import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let todosOsLogs = [];

// 1. AJUSTE DE DATA PARA O BRASIL (Fuso -3h)
const obterDataHojeBR = () => {
    const dataAtual = new Date();
    // Ajusta para o fuso de Brasília (UTC-3)
    const dataBR = new Date(dataAtual.getTime() - (3 * 3600000));
    return dataBR.toISOString().split('T')[0];
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 2. BUSCAR NOME NA COLEÇÃO "USUARIOS"
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            const nomeExibicao = userDoc.exists() ? userDoc.data().nome : user.email.split('@')[0];
            
            const userNameEl = document.getElementById('userName');
            if(userNameEl) userNameEl.innerText = nomeExibicao.toUpperCase();
        } catch (error) {
            console.error("Erro ao buscar nome do usuário:", error);
        }
        
        configurarDatasPadrao();
        carregarLogs();
    } else {
        window.location.href = "index.html";
    }
});

function configurarDatasPadrao() {
    const inputIn = document.getElementById('dataInicio');
    const inputFim = document.getElementById('dataFim');
    const hoje = obterDataHojeBR(); // Usa a função de fuso horário brasileiro
    
    if (inputIn) inputIn.value = hoje;
    if (inputFim) inputFim.value = hoje;
}

async function carregarLogs() {
    const corpo = document.getElementById('corpoHistorico');
    const inputIn = document.getElementById('dataInicio');
    const inputFim = document.getElementById('dataFim');

    if (!corpo || !inputIn || !inputFim) return;

    corpo.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Buscando dados...</td></tr>";

    try {
        // Ajustamos o início e fim do dia para garantir que pegue tudo de hoje no fuso BR
        const dInicio = new Date(inputIn.value + "T00:00:00");
        const dFim = new Date(inputFim.value + "T23:59:59");

        const q = query(
            collection(db, "historico"),
            where("data", ">=", Timestamp.fromDate(dInicio)),
            where("data", "<=", Timestamp.fromDate(dFim)),
            orderBy("data", "desc")
        );

        const snap = await getDocs(q);
        todosOsLogs = [];

        snap.forEach(docLog => {
            const log = docLog.data();
            todosOsLogs.push({
                // Formatação da data já sai no padrão PT-BR (DD/MM/AAAA)
                data: log.data?.toDate().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) || "---",
                usuario: log.usuario || "Sistema",
                acao: log.acao || "---",
                detalhe: log.detalhe || "---"
            });
        });

        renderizarTabela(todosOsLogs);
    } catch (e) {
        console.error("Erro ao carregar logs:", e);
        corpo.innerHTML = "<tr><td colspan='4' style='color:red; text-align:center;'>Erro ao carregar dados.</td></tr>";
    }
}

function renderizarTabela(dados) {
    const corpo = document.getElementById('corpoHistorico');
    if (!corpo) return;
    
    corpo.innerHTML = "";
    if (dados.length === 0) {
        corpo.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Nenhum registro encontrado.</td></tr>";
        return;
    }

    dados.forEach(log => {
        corpo.innerHTML += `
            <tr>
                <td class="log-data">${log.data}</td>
                <td class="log-user">${log.usuario.toUpperCase()}</td>
                <td class="log-acao">${log.acao}</td>
                <td>${log.detalhe}</td>
            </tr>`;
    });
}

// Filtro de Busca em Tempo Real
const inputBusca = document.getElementById('inputBusca');
if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase();
        const filtrados = todosOsLogs.filter(log => 
            log.usuario.toLowerCase().includes(termo) ||
            log.acao.toLowerCase().includes(termo) ||
            log.detalhe.toLowerCase().includes(termo) ||
            log.data.toLowerCase().includes(termo)
        );
        renderizarTabela(filtrados);
    });
}

const btnFiltrar = document.getElementById('btnFiltrar');
if (btnFiltrar) btnFiltrar.onclick = carregarLogs;

const btnSair = document.getElementById('btnSair');
if (btnSair) btnSair.onclick = () => signOut(auth);
