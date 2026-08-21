const { useState, useEffect, useMemo } = React;

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE — mesmo banco do GC Agro (só esta tela é separada; nenhum outro
// dado da fazenda — safras, cotações, financeiro etc. — é carregado aqui)
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCGNQgHu045WiK7SvL-TgCY1hkrijMpzj4",
  authDomain: "gc-agro-app.firebaseapp.com",
  databaseURL: "https://gc-agro-app-default-rtdb.firebaseio.com",
  projectId: "gc-agro-app",
  storageBucket: "gc-agro-app.firebasestorage.app",
  messagingSenderId: "79130236395",
  appId: "1:79130236395:web:3619616a50ef448cb075ae"
};
let fbDb = null;
try {
  if (window.firebase && !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  if (window.firebase) fbDb = firebase.database();
} catch (e) { console.error("Firebase init falhou:", e); }

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function fmtN(v) { const n = Number(v)||0; return n.toLocaleString("pt-BR"); }

function EstoqueApp() {
  const [pecas, setPecas] = useState(null); // null = ainda carregando
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState(null);
  const [qtdBaixa, setQtdBaixa] = useState("1");
  const [obsBaixa, setObsBaixa] = useState("");
  const [msg, setMsg] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!fbDb) { setPecas([]); return; }
    const ref = fbDb.ref("gcagro/estoque_pecas");
    const cb = ref.on("value", snap => setPecas(snap.val() || []), () => setPecas([]));
    return () => ref.off("value", cb);
  }, []);

  const buscaNorm = busca.trim().toLowerCase();
  const filtradas = useMemo(() => {
    const lista = pecas || [];
    return lista.filter(p => !buscaNorm ||
      (p.nome||"").toLowerCase().includes(buscaNorm) ||
      (p.codigo||"").toLowerCase().includes(buscaNorm) ||
      (p.localizacao||"").toLowerCase().includes(buscaNorm)
    ).sort((a,b)=>(a.nome||"").localeCompare(b.nome||""));
  }, [pecas, buscaNorm]);

  function selecionar(p) {
    setSelecionada(p);
    setQtdBaixa("1");
    setObsBaixa("");
    setMsg(null);
  }

  function confirmarBaixa() {
    if (!selecionada || !fbDb) return;
    const qtd = parseFloat(String(qtdBaixa).replace(",","."));
    if (!qtd || qtd<=0) { setMsg({ok:false, texto:"Informe uma quantidade válida."}); return; }
    setEnviando(true);
    fbDb.ref("gcagro/estoque_pecas").once("value").then(snap => {
      const arr = snap.val() || [];
      const idx = arr.findIndex(p => p.id === selecionada.id);
      if (idx === -1) {
        setMsg({ok:false, texto:"Essa peça não foi encontrada — pode ter sido removida. Atualize a busca."});
        setEnviando(false);
        return;
      }
      const atual = arr[idx].quantidade || 0;
      if (qtd > atual) {
        setMsg({ok:false, texto:`Só há ${fmtN(atual)} unidade(s) em estoque.`});
        setEnviando(false);
        return;
      }
      const nova = atual - qtd;
      const localizacao = arr[idx].localizacao || "";
      const nome = arr[idx].nome || "";
      const codigo = arr[idx].codigo || "";
      Promise.all([
        fbDb.ref("gcagro/estoque_pecas/" + idx + "/quantidade").set(nova),
        fbDb.ref("gcagro/estoque_pecas_historico/" + newId()).set({
          codigo, nome, localizacao, quantidadeBaixada: qtd,
          quantidadeAntes: atual, quantidadeDepois: nova,
          obs: obsBaixa.trim(), data: Date.now()
        })
      ]).then(() => {
        setMsg({ok:true, texto:`✓ Baixa registrada! Restam ${fmtN(nova)} unidade(s) de "${nome}" em ${localizacao || "local não informado"}.`});
        setSelecionada(null);
        setBusca("");
        setEnviando(false);
      }).catch(() => {
        setMsg({ok:false, texto:"Erro ao gravar a baixa. Verifique sua internet e tente de novo."});
        setEnviando(false);
      });
    }).catch(() => {
      setMsg({ok:false, texto:"Erro ao consultar o estoque. Verifique sua internet e tente de novo."});
      setEnviando(false);
    });
  }

  if (pecas === null) {
    return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",color:"#5d4037"}}>Carregando estoque...</div>;
  }

  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#5d4037",padding:"16px 18px",color:"#fff"}}>
        <div style={{fontSize:18,fontWeight:800}}>🔧 Estoque de Peças</div>
        <div style={{fontSize:12,opacity:0.85}}>Consulta e baixa — GC Agro</div>
      </div>

      <div style={{padding:"14px 16px",flex:1}}>
        {!fbDb && (
          <div style={{background:"#ffebee",color:"#c62828",padding:"12px 14px",borderRadius:8,fontSize:13,marginBottom:14}}>
            ⚠ Não foi possível conectar ao banco de dados. Verifique sua internet e recarregue a página.
          </div>
        )}

        <input autoFocus placeholder="🔎 Digite o código ou nome da peça..." value={busca}
          onChange={e=>{setBusca(e.target.value);setSelecionada(null);setMsg(null);}}
          style={{width:"100%",padding:"14px 16px",fontSize:16,border:"2px solid #d7ccc8",borderRadius:10,outline:"none",marginBottom:14,boxSizing:"border-box"}}/>

        {!selecionada && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtradas.length===0 && (
              <div style={{textAlign:"center",color:"#aaa",fontSize:13,padding:"30px 10px"}}>
                {buscaNorm ? "Nenhuma peça encontrada." : "Nenhuma peça cadastrada no estoque."}
              </div>
            )}
            {filtradas.map(p => {
              const semEstoque = (p.quantidade||0) <= 0;
              return (
                <div key={p.id} onClick={()=>selecionar(p)}
                  style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:15,color:"#3e2723",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:2}}>
                      {p.codigo && <span>Nº {p.codigo} · </span>}
                      📍 {p.localizacao || "sem localização"}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:semEstoque?"#c62828":"#2e7d32"}}>{fmtN(p.quantidade)}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>em estoque</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selecionada && (
          <div style={{background:"#fff",borderRadius:12,padding:20,boxShadow:"0 2px 10px rgba(0,0,0,0.1)"}}>
            <div style={{fontSize:17,fontWeight:800,color:"#3e2723",marginBottom:4}}>{selecionada.nome}</div>
            {selecionada.codigo && <div style={{fontSize:13,color:"#888",marginBottom:10}}>Nº {selecionada.codigo}</div>}

            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <div style={{flex:1,background:"#efebe9",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#8d6e63",textTransform:"uppercase",letterSpacing:1}}>Localização</div>
                <div style={{fontSize:15,fontWeight:700,color:"#3e2723"}}>📍 {selecionada.localizacao || "—"}</div>
              </div>
              <div style={{flex:1,background:"#efebe9",borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#8d6e63",textTransform:"uppercase",letterSpacing:1}}>Em estoque</div>
                <div style={{fontSize:15,fontWeight:700,color:"#3e2723"}}>{fmtN(selecionada.quantidade)} un.</div>
              </div>
            </div>

            {selecionada.obs && (
              <div style={{fontSize:12,color:"#888",marginBottom:14,fontStyle:"italic"}}>Obs: {selecionada.obs}</div>
            )}

            <label style={{fontSize:11,color:"#8d6e63",textTransform:"uppercase",letterSpacing:1}}>Quantidade a dar baixa</label>
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0 14px"}}>
              <button onClick={()=>setQtdBaixa(q=>String(Math.max(1,(parseFloat(q)||1)-1)))}
                style={{width:42,height:42,fontSize:20,background:"#efebe9",border:"none",borderRadius:8,cursor:"pointer",color:"#5d4037"}}>−</button>
              <input type="number" min="1" step="any" value={qtdBaixa} onChange={e=>setQtdBaixa(e.target.value)}
                style={{flex:1,padding:"10px",fontSize:18,textAlign:"center",border:"2px solid #d7ccc8",borderRadius:8,outline:"none"}}/>
              <button onClick={()=>setQtdBaixa(q=>String((parseFloat(q)||0)+1))}
                style={{width:42,height:42,fontSize:20,background:"#efebe9",border:"none",borderRadius:8,cursor:"pointer",color:"#5d4037"}}>+</button>
            </div>

            <label style={{fontSize:11,color:"#8d6e63",textTransform:"uppercase",letterSpacing:1}}>Observação (opcional)</label>
            <input placeholder="Ex: usado no trator 3" value={obsBaixa} onChange={e=>setObsBaixa(e.target.value)}
              style={{width:"100%",padding:"10px 12px",fontSize:14,border:"1px solid #ccc",borderRadius:8,outline:"none",margin:"6px 0 18px",boxSizing:"border-box"}}/>

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setSelecionada(null);setMsg(null);}}
                style={{flex:1,padding:"14px",background:"#f5f5f5",border:"none",borderRadius:8,fontSize:14,fontWeight:600,cursor:"pointer",color:"#666"}}>Cancelar</button>
              <button onClick={confirmarBaixa} disabled={enviando}
                style={{flex:2,padding:"14px",background:enviando?"#a1887f":"#5d4037",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:enviando?"default":"pointer"}}>
                {enviando ? "Registrando..." : "✓ Confirmar baixa"}
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{marginTop:14,padding:"12px 14px",borderRadius:8,fontSize:13,fontWeight:600,
            background:msg.ok?"#e8f5e9":"#ffebee",color:msg.ok?"#2e7d32":"#c62828"}}>
            {msg.texto}
          </div>
        )}
      </div>
    </div>
  );
}
