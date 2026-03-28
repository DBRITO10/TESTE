    // js/gerenciar-destinos.js
    import { db, auth } from "./firebase-config.js";
    import { 
        onAuthStateChanged, 
        signOut 
    } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { 
        collection, 
        addDoc, 
        doc, 
        getDoc, 
        updateDoc, 
        deleteDoc, 
        onSnapshot, 
        query, 
        orderBy 
    } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    let listaDestinos = []; // Armazena local para o filtro

    // Controle de Acesso
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists()) {
                document.getElementById('userName').innerText = userDoc.data().nome.split(' ')[0].toUpperCase();
            }
        } else {
            window.location.href = "index.html";
        }
    });

    // Salvar / Editar
    const form = document.getElementById('formDestino');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const nome = document.getElementById('nomeDestino').value.toUpperCase();
        const btn = document.getElementById('btnSalvar');

        btn.disabled = true;
        btn.innerText = "PROCESSANDO...";

        try {
            if(id) {
                await updateDoc(doc(db, "destinos", id), { nome });
                alert("Destino atualizado!");
                cancelarEdicao();
            } else {
                await addDoc(collection(db, "destinos"), { nome });
                alert("Destino cadastrado!");
            }
            form.reset();
        } catch (err) {
            alert("Erro ao salvar.");
        } finally {
            btn.disabled = false;
            btn.innerText = "SALVAR DESTINO";
        }
    };

    // Renderizar Tabela
    function renderizar(dados) {
        const corpo = document.getElementById('corpoDestino');
        corpo.innerHTML = "";
        dados.forEach(d => {
            corpo.innerHTML += `
                <tr>
                    <td><strong>${d.nome}</strong></td>
                    <td style="text-align: right;">
                        <button class="btn-acao edit" onclick="prepararEdicao('${d.id}', '${d.nome}')">✏️</button>
                        <button class="btn-acao del" onclick="excluir('${d.id}', '${d.nome}')">🗑️</button>
                    </td>
                </tr>`;
        });
    }

    // Listar em Tempo Real
    onSnapshot(query(collection(db, "destinos"), orderBy("nome")), snap => {
        listaDestinos = [];
        snap.forEach(d => listaDestinos.push({ id: d.id, ...d.data() }));
        renderizar(listaDestinos);
    });

    // Filtro de Busca
    document.getElementById('inputBusca').addEventListener('input', e => {
        const termo = e.target.value.toUpperCase();
        const filtrados = listaDestinos.filter(d => d.nome.includes(termo));
        renderizar(filtrados);
    });

    // Funções Globais
    window.prepararEdicao = (id, nome) => {
        document.getElementById('editId').value = id;
        document.getElementById('nomeDestino').value = nome;
        document.getElementById('btnSalvar').innerText = "ATUALIZAR DESTINO";
        document.getElementById('btnCancelar').style.display = "block";
        document.getElementById('tituloForm').innerText = "EDITANDO DESTINO";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.cancelarEdicao = () => {
        document.getElementById('editId').value = "";
        form.reset();
        document.getElementById('btnSalvar').innerText = "SALVAR DESTINO";
        document.getElementById('btnCancelar').style.display = "none";
        document.getElementById('tituloForm').innerText = "CADASTRAR DESTINO";
    };

    window.excluir = async (id, nome) => {
        if(confirm(`Excluir o destino ${nome}?`)) {
            await deleteDoc(doc(db, "destinos", id));
        }
    };

    document.getElementById('btnSair').onclick = () => signOut(auth);
