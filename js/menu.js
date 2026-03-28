   import { db, auth } from "./firebase-config.js";
   import { 
       onAuthStateChanged, 
       signOut 
   } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
   import { 
       doc, 
       getDoc 
    } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    // Funções de Modal
    window.openModal = (id) => {
        document.getElementById(id).style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
    
    window.closeModal = (e) => { 
        if(e.target.classList.contains('modal-overlay')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    window.forceClose = (id) => {
        document.getElementById(id).style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) { window.location.href = "index.html"; return; }
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (!userDoc.exists()) { signOut(auth).then(() => window.location.href = "index.html"); return; }

            const userData = userDoc.data();
            const nivel = userData.nivel || 'leitor';
            document.getElementById('userName').innerText = (userData.nome || "Usuário").split(' ')[0].toUpperCase();

            if(nivel === 'admin') {
                document.querySelectorAll('.card-main').forEach(c => c.style.display = 'flex');
            } else if(nivel === 'leitor' || nivel === 'colaborador') {
                document.getElementById('cardExpedicao').style.display = 'flex';
            } else if(nivel === 'usuario') {
                document.getElementById('cardConferencia').style.display = 'flex';
            }

            const linksExp = document.querySelectorAll('#gridExpedicao .btn-link');
            linksExp.forEach(link => {
                const min = link.getAttribute('data-min');
                if(nivel === 'admin') return;
                if(nivel === 'leitor' && min !== 'leitor') link.style.display = 'none';
            });
        } catch (e) { window.location.href = "index.html"; }
    });

    document.getElementById('btnSair').onclick = () => {
        if(confirm("Deseja sair?")) signOut(auth).then(() => window.location.href = "index.html");
    };
