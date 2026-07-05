const { useState, useMemo, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE — sincroniza dados de cotação em tempo real entre dispositivos
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

// Sincroniza um pedaço de estado com o Firebase Realtime Database.
// Escuta mudanças remotas (outro dispositivo) e também envia mudanças locais.
function useFirebaseSync(path, value, setValue) {
  const ready = useRef(false);
  const skipNext = useRef(false);
  useEffect(() => {
    if (!fbDb || !path) return;
    const ref = fbDb.ref(path);
    const cb = ref.on("value", snap => {
      if (snap.exists()) {
        skipNext.current = true;
        setValue(snap.val());
      } else if (!ready.current) {
        ref.set(value).catch(err => console.error("Firebase seed falhou:", err));
      }
      ready.current = true;
    }, err => console.error("Firebase listen falhou:", err));
    return () => ref.off("value", cb);
    // eslint-disable-next-line
  }, [path]);
  useEffect(() => {
    if (!fbDb || !path || !ready.current) return;
    if (skipNext.current) { skipNext.current = false; return; }
    fbDb.ref(path).set(value).catch(err => console.error("Firebase set falhou:", err));
    // eslint-disable-next-line
  }, [value, path]);
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE KEYS
// ─────────────────────────────────────────────────────────────────────────────
const KEY_PROG       = "gcagro_prog_v2";
const KEY_COTACAO    = "gcagro_cotacao_v2";
const KEY_SAFRAS     = "gcagro_safras_v2";
const KEY_COLHEITA   = "gcagro_colheita_v2";
const KEY_PLANEJAMENTO = "gcagro_planejamento_v1";
const KEY_COMPRAS = "gcagro_compras_v1";
const KEY_VENDAS = "gcagro_vendas_v1";

// ─────────────────────────────────────────────────────────────────────────────
// FORNECEDORES
// ─────────────────────────────────────────────────────────────────────────────
function genToken(nome) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t = (nome||"XX").substring(0,2).toUpperCase()+"-";
  for (let i=0;i<4;i++) t += chars[Math.floor(Math.random()*chars.length)];
  return t;
}
function migrateFornecedores(list) {
  return (list||[]).map(f => typeof f === "string" ? {nome:f, telefone:"", token:genToken(f)} : f);
}
const FORN_INSUMOS_INICIAL = ["Trisolo","Agrocerrado","Terrena","Tchê","AgroBrasil","Valoriza","Coagril","Protec"].map(nome=>({nome,telefone:"",token:genToken(nome)}));
const FORN_ADUBACAO_INICIAL = ["Yara","ADM","Calcário Noroeste","Agro Brasil","Plano Agronegócios","Valoriza","Produttiva","Nascente"].map(nome=>({nome,telefone:"",token:genToken(nome)}));
const FORN_COLORS  = ["#1565C0","#2E7D32","#B71C1C","#6A1B9A","#E65100","#00695C","#37474F","#4E342E"];

const ADMIN_PASSWORD = "gcagro2526";

// ─────────────────────────────────────────────────────────────────────────────
// COLORS & ICONS
// ─────────────────────────────────────────────────────────────────────────────
const CULTURE_COLORS_VERAO = {
  Soja:   { bg:"#1a5c2e", light:"#e8f5e9", accent:"#2e7d32", badge:"#43a047" },
  Feijão: { bg:"#7b1c1c", light:"#fce4ec", accent:"#c62828", badge:"#e53935" },
  Milho:  { bg:"#5c4a00", light:"#fff8e1", accent:"#f57f17", badge:"#fbc02d" },
};
const CULTURE_COLORS_INVERNO = {
  Milho:         { bg:"#5c4a00", light:"#fff8e1", accent:"#f57f17", badge:"#fbc02d" },
  "Feijão Irrigado": { bg:"#7b1c1c", light:"#fce4ec", accent:"#c62828", badge:"#e53935" },
  Trigo:         { bg:"#4a3800", light:"#fff8e1", accent:"#b8860b", badge:"#daa520" },
  "Milho Irrigado":  { bg:"#1a4a5c", light:"#e3f2fd", accent:"#0277bd", badge:"#039be5" },
  "Milho Semente":   { bg:"#2e4a1a", light:"#f1f8e9", accent:"#558b2f", badge:"#7cb342" },
  "Milho Sequeiro":  { bg:"#4a2e00", light:"#fff3e0", accent:"#e65100", badge:"#fb8c00" },
  Sorgo:         { bg:"#3a1a5c", light:"#f3e5f5", accent:"#7b1fa2", badge:"#ab47bc" },
};
const CAT_ICONS = {
  "Adubação":"🌱","Sementes":"🌾","TS":"🧪","Kit Sulco":"🪱",
  "Herbicidas - Dessecação e Pós":"💧","Foliares":"🍃","Fungicidas":"🔬",
  "Inseticidas":"🛡️","Óleos / Adjuvantes":"🧴",
};
// Categorias de Insumos/Defensivos (tudo que não é Adubação nem Sementes) e as que mostram
// coluna de Ingrediente Ativo na Cotação — só faz sentido pra defensivos de verdade.
const CATEGORIAS_INSUMOS = ["Herbicidas - Dessecação e Pós","Fungicidas","Inseticidas","Foliares","TS","Kit Sulco","Óleos / Adjuvantes"];
const CAT_IA = new Set(["Herbicidas - Dessecação e Pós","Fungicidas","Inseticidas"]);

const CATEGORIAS_COMPRA_PADRAO = ["Sementes","Adubação Verão","Adubação Inverno","Químicos Verão","Químicos Inverno"];
const CATEGORIA_COMPRA_ICONS = {
  "Sementes":"🌾","Adubação Verão":"🌱","Adubação Inverno":"🌱",
  "Químicos Verão":"🧪","Químicos Inverno":"🧪",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt    = (n) => isNaN(n)||n==null?"R$ 0,00":Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtN   = (n,d=1) => Number(n).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtC   = (v) => v==null||v===""?"—":`R$ ${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtQtd = (v) => Number(v).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});

// Aceita "dd/mm/aaaa" (padrão do app) e "aaaa-mm-dd" (ISO), pra gerar o lembrete de calendário.
function parseDataFlexivel(str) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { let [,d,mo,y] = m; if (y.length===2) y = "20"+y; return { y:+y, m:+mo, d:+d }; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { const [,y,mo,d] = m; return { y:+y, m:+mo, d:+d }; }
  return null;
}
function pad2(n) { return String(n).padStart(2,"0"); }
function escapeICS(s) { return String(s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;"); }
// Gera um evento de calendário (.ics) pro dia do pagamento de uma venda — o alarme roda no
// próprio app de calendário do celular (Google Agenda/Apple Calendar), sem precisar de servidor.
function gerarICSVenda(v) {
  const dt = parseDataFlexivel(v.dataPagamento);
  if (!dt) { window.alert("Preencha a Data de Pagamento num formato válido (ex: 30/07/2026) antes de gerar o lembrete."); return; }
  const dtStart = `${dt.y}${pad2(dt.m)}${pad2(dt.d)}`;
  const fimObj = new Date(dt.y, dt.m-1, dt.d+1);
  const dtEnd = `${fimObj.getFullYear()}${pad2(fimObj.getMonth()+1)}${pad2(fimObj.getDate())}`;
  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad2(now.getUTCMonth()+1)}${pad2(now.getUTCDate())}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}${pad2(now.getUTCSeconds())}Z`;
  const total = (v.qtd||0)*(v.preco||0);
  const summary = `💰 Recebimento ${v.cultura||""} — ${v.comprador||"comprador"}`;
  const desc = `Venda de ${fmtN(v.qtd,1)} ${v.unidade||""} de ${v.cultura||""} a ${fmt(v.preco)}/${v.unidade||"unid."}. Total: ${fmt(total)}.${v.obs?" Obs: "+v.obs:""}`;
  const ics = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GC Agro//Vendas//PT","CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${v.id}@gcagro`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:Lembrete de pagamento — GC Agro","TRIGGER:-PT0M","END:VALARM",
    "END:VEVENT","END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type:"text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `pagamento-${(v.comprador||"venda").replace(/[^a-z0-9]+/gi,"-")}-${dtStart}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

// Quantidade de produto de Tratamento de Sementes (TS): dose é por 100kg de semente.
// Fórmula recuperada do app antigo: qtd = dose × (kg de semente/ha, do produto ou da cultura) × área ÷ 100.
function calcQtdTS(p, culture) {
  const kgHaVal = parseFloat(p.kgHa || (culture&&culture.kgSemente) || 0);
  return p.dose > 0 ? p.dose * kgHaVal * p.area / 100 : kgHaVal * p.area / 100;
}
function calcProdTotal(p, cat, culture) {
  if (cat && cat.name === "TS") return calcQtdTS(p, culture) * p.preco_unit;
  return p.dose > 0 ? p.dose * p.area * p.preco_unit : p.area * p.preco_unit;
}
// Quantidade de sementes (bags/sacos) a partir da população (sementes/metro) e área do lote.
// Fórmula do usuário: sementes totais = população × 20000 × área; bag de soja = 5.000.000 sementes; saco de milho = 60.000 sementes.
const SEMENTES_POR_UNIDADE = { bag: 5000000, saco: 60000 };
function calcQtdSementes(row) {
  const cultura = row.cultura || "";
  const isSoja = cultura === "Soja";
  const isMilho = cultura.startsWith("Milho");
  if (!isSoja && !isMilho) return null; // fórmula só confirmada para Soja (bag) e Milho (saco)
  const pop = parseFloat(row.populacao)||0;
  const area = parseFloat(row.area)||0;
  if (!pop || !area) return 0;
  const unidade = row.unidadeQtd || (isSoja ? "bag" : "saco");
  return (pop * 20000 * area) / SEMENTES_POR_UNIDADE[unidade];
}
function calcCultureTotals(culture) {
  const insumos = culture.categories.reduce((s,cat)=>s+cat.products.reduce((ss,p)=>ss+calcProdTotal(p,cat,culture),0),0);
  const opSum   = Object.values(culture.op_costs||{}).reduce((s,v)=>s+v,0);
  return { insumos, opTotal:opSum, total: culture.area>0 ? insumos/culture.area + opSum : 0 };
}
function derivarProdutos(data, excluirAdubacao=false) {
  const map = {};
  Object.values(data).forEach(culture => {
    culture.categories.forEach(cat => {
      // Adubação e Sementes têm cotações próprias e dedicadas — não entram na de Insumos.
      if (excluirAdubacao && (cat.name === "Adubação" || cat.name === "Sementes")) return;
      cat.products.forEach(p => {
        const key = p.produto.trim().toLowerCase();
        const qtd = p.dose > 0 ? p.dose * p.area : p.area;
        if (map[key]) { map[key].qtd_total += qtd; }
        else { map[key] = { nome:p.produto.trim(), unidade:p.fase&&p.fase.toLowerCase().includes("dose")?"doses":p.fase&&p.fase.toLowerCase().includes("kg")?"kg":"L", qtd_total:qtd, categoria:cat.name, preco_ref:p.preco_unit, ingrediente_ativo:p.ingrediente_ativo||"" }; }
      });
    });
  });
  return Object.values(map);
}
function derivarAdubacao(data) {
  const map = {};
  Object.values(data).forEach(culture => {
    culture.categories.forEach(cat => {
      if (cat.name !== "Adubação") return;
      cat.products.forEach(p => {
        const key = p.produto.trim().toLowerCase();
        const qtd = p.dose > 0 ? p.dose * p.area : p.area;
        if (map[key]) { map[key].qtd_total += qtd; }
        else { map[key] = { nome:p.produto.trim(), unidade:"TN", qtd_total:qtd, categoria:"Adubação", preco_ref:p.preco_unit, ingrediente_ativo:p.ingrediente_ativo||"" }; }
      });
    });
  });
  return Object.values(map);
}
function derivarSementes(data) {
  const map = {};
  Object.values(data).forEach(culture => {
    culture.categories.forEach(cat => {
      if (cat.name !== "Sementes") return;
      cat.products.forEach(p => {
        const key = p.produto.trim().toLowerCase();
        const qtd = p.dose > 0 ? p.dose * p.area : p.area;
        if (map[key]) { map[key].qtd_total += qtd; }
        else { map[key] = { nome:p.produto.trim(), unidade:"bag", qtd_total:qtd, categoria:"Sementes", preco_ref:p.preco_unit, ingrediente_ativo:"" }; }
      });
    });
  });
  return Object.values(map);
}

function loadLS(key, def) { try { const r=localStorage.getItem(key); return r?JSON.parse(r):def; } catch { return def; } }
function saveLS(key, d)   { try { localStorage.setItem(key, JSON.stringify(d)); } catch(e) {} }

// Migra preços de cotação do formato antigo (número único por produto) para o novo
// formato com dois vencimentos manuais ({v1, v2}). Idempotente: se já migrado, mantém.
function migrateVencPrecos(pricesObj) {
  const out = {};
  Object.entries(pricesObj || {}).forEach(([forn, prods]) => {
    const np = {};
    Object.entries(prods || {}).forEach(([prodKey, val]) => {
      np[prodKey] = (val && typeof val === "object") ? val : { v1: val || 0, v2: 0 };
    });
    out[forn] = np;
  });
  return out;
}

// Divide a categoria antiga "Sementes / TS" em duas: "Sementes" (só a semente em si,
// produtos que começam com "SEMENTE") e "TS" (tratamento de sementes, o resto).
// Idempotente — roda em todo carregamento, então também migra dados já salvos no
// localStorage sem perder nada que o usuário tenha editado ou adicionado.
function splitSementesTS(cultureData) {
  const nd = JSON.parse(JSON.stringify(cultureData));
  Object.values(nd).forEach(culture => {
    const idx = (culture.categories || []).findIndex(c => c.name === "Sementes / TS");
    if (idx === -1) return;
    const cat = culture.categories[idx];
    const sementes = cat.products.filter(p => p.produto.trim().toUpperCase().startsWith("SEMENTE"));
    const ts = cat.products.filter(p => !p.produto.trim().toUpperCase().startsWith("SEMENTE"));
    const novas = [];
    if (sementes.length) novas.push({ name:"Sementes", products:sementes });
    if (ts.length) novas.push({ name:"TS", products:ts });
    culture.categories.splice(idx, 1, ...novas);
  });
  return nd;
}

// Renomeia uma categoria pelo nome antigo, se existir — idempotente, migra dados
// já salvos no localStorage junto com os dados padrão.
function renameCategoria(cultureData, oldName, newName) {
  const nd = JSON.parse(JSON.stringify(cultureData));
  Object.values(nd).forEach(culture => {
    (culture.categories || []).forEach(cat => { if (cat.name === oldName) cat.name = newName; });
  });
  return nd;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTAÇÃO DE PLANILHAS (Colheita)
// ─────────────────────────────────────────────────────────────────────────────
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function normHeader(h) {
  return String(h ?? "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function toNum(v) {
  if (v === "" || v == null) return 0;
  if (typeof v === "number") return v;
  let s = String(v).trim();
  if (!s) return 0;
  s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// SheetJS converte datas em texto (ex.: "01/06/2026") para número de série do Excel
// ao ler planilhas/CSV; aqui devolvemos ao formato dd/mm/aaaa em vez de mostrar o serial cru.
function formatMaybeDate(v) {
  if (typeof v === "number" && v > 1000 && v < 100000 && typeof XLSX !== "undefined" && XLSX.SSF) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return String(d.d).padStart(2,"0") + "/" + String(d.m).padStart(2,"0") + "/" + d.y;
  }
  return String(v ?? "").trim();
}

function sniffCsvDelimiter(text) {
  const firstLine = text.split(/\r\n|\n/)[0] || "";
  const commas = (firstLine.match(/,/g)||[]).length;
  const semis  = (firstLine.match(/;/g)||[]).length;
  return semis > commas ? ";" : ",";
}
// Parser CSV manual (em vez do parser embutido do SheetJS): o SheetJS tenta adivinhar
// datas em texto e assume o formato americano MM/DD/AAAA, trocando dia e mês silenciosamente
// para datas em formato brasileiro (ex.: "01/06/2026" virava 06/jan em vez de 01/jun).
// Mantendo tudo como texto puro evitamos essa ambiguidade — cada célula fica exatamente como
// foi digitada na planilha.
function parseCsvText(text) {
  text = text.replace(/^﻿/, "");
  const delim = sniffCsvDelimiter(text);
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignorado, tratado junto do \n */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(c => String(c).trim() !== ""));
  if (!nonEmpty.length) return [];
  const headers = nonEmpty[0];
  return nonEmpty.slice(1).map(r => {
    const obj = {};
    headers.forEach((h,idx) => { obj[h] = r[idx] !== undefined ? r[idx].trim() : ""; });
    return obj;
  });
}

function readSpreadsheetRows(file) {
  const isCsv = /\.csv$/i.test(file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.onload = (e) => {
      try {
        if (isCsv) { resolve(parseCsvText(e.target.result)); return; }
        const wb = XLSX.read(e.target.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
      } catch (err) { reject(err); }
    };
    if (isCsv) reader.readAsText(file, "UTF-8");
    else reader.readAsArrayBuffer(file);
  });
}

function mapRowByAliases(row, aliasMap) {
  const normRow = {};
  Object.keys(row).forEach(k => { normRow[normHeader(k)] = row[k]; });
  const out = {};
  Object.entries(aliasMap).forEach(([field, aliases]) => {
    for (const alias of aliases) {
      if (normRow[alias] !== undefined && normRow[alias] !== "") { out[field] = normRow[alias]; break; }
    }
  });
  return out;
}

async function importSpreadsheet(file, aliasMap, buildRecord, setRecords, onDone) {
  try {
    const rows = await readSpreadsheetRows(file);
    let imported = 0, skipped = 0;
    const novos = [];
    rows.forEach(row => {
      const rec = buildRecord(mapRowByAliases(row, aliasMap));
      if (rec) { novos.push(rec); imported++; } else { skipped++; }
    });
    if (novos.length) setRecords(rs => [...rs, ...novos]);
    onDone(imported ? `✅ ${imported} registro(s) importado(s)${skipped ? `, ${skipped} linha(s) ignorada(s)` : ""}.` : "⚠ Nenhum registro reconhecido. Verifique os nomes das colunas.");
  } catch (err) {
    onDone(`❌ Erro ao importar: ${err.message}`);
  }
}

const ALIASES_COLHEITA = {
  lote:     ["lote","talhao","campo","area_nome","area_talhao","lote_fazenda"],
  cultura:  ["cultura","culture","cultivo"],
  data:     ["data","data_colheita","dia"],
  area_ha:  ["area_ha","area","area_colhida","ha","hectares"],
  sacas:    ["sacas","sc","sacas_colhidas","quantidade_sacas","sc_60kg","qtd_sacas"],
  kg:       ["kg","quilos","peso_kg","kg_colhidos"],
  umidade:  ["umidade","umidade_pct","umidade_percent","umid"],
  pmg:      ["pmg","peso_mil_graos","peso_de_mil_graos","pmg_g"],
  obs:      ["obs","observacao","observacoes"],
};
// Indexa os lotes do Planejamento de Campo (Verão + Safrinha) por nome, para a
// Colheita resolver cultura/área/previsão automaticamente a partir do lote escolhido.
function makeLoteResolver(planVerao, planSafrinha) {
  const index = {};
  planVerao.forEach(r => { if (r.lote) index[r.lote.trim().toLowerCase()] = { loteId:r.id, tipo:"verao", lote:r.lote, cultura:r.cultura, areaHa:r.area, previsaoColheita:r.previsaoColheita, variedade:r.variedade, populacao:r.populacao, dataPlantio:r.dataPlantio }; });
  planSafrinha.forEach(r => { if (r.lote) index[r.lote.trim().toLowerCase()] = { loteId:r.id, tipo:"inv", lote:r.lote, cultura:r.cultura, areaHa:r.area, previsaoColheita:r.previsaoColheita, variedade:r.variedade, populacao:r.populacao, dataPlantio:r.dataPlantio }; });
  return (loteNome) => index[String(loteNome||"").trim().toLowerCase()] || null;
}

function buildColheitaRecord(m, safraAtiva, resolveLote) {
  const loteNome = String(m.lote||"").trim();
  if (!loteNome && !m.cultura) return null;
  const found = loteNome ? resolveLote(loteNome) : null;
  const areaHa = m.area_ha != null ? toNum(m.area_ha) : (found ? found.areaHa : 0);
  const sacas = m.sacas != null ? toNum(m.sacas) : (m.kg != null ? toNum(m.kg) / 60 : 0);
  return { id:newId(), safra:safraAtiva, tipo: found ? found.tipo : "verao",
    loteId: found ? found.loteId : null, lote: loteNome || (found ? found.lote : ""),
    cultura: String(m.cultura || (found ? found.cultura : "")).trim(),
    variedade: found ? found.variedade||"" : "", populacao: found ? found.populacao||0 : 0, dataPlantio: found ? found.dataPlantio||"" : "",
    previsaoColheita: found ? found.previsaoColheita : "",
    data:formatMaybeDate(m.data), areaHa, sacas, umidade:toNum(m.umidade), pmg:toNum(m.pmg), obs:String(m.obs||"").trim() };
}

function addRecord(setRecords, rec) { setRecords(rs => [...rs, { id:newId(), ...rec }]); }
function deleteRecord(setRecords, id) { setRecords(rs => rs.filter(r => r.id !== id)); }
function updateRecordField(setRecords, id, field, value, numeric=false) {
  setRecords(rs => rs.map(r => r.id === id ? { ...r, [field]: numeric ? (parseFloat(value)||0) : value } : r));
}

// ─────────────────────────────────────────────────────────────────────────────
// DADOS INICIAIS — SAFRA VERÃO
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DATA_VERAO = {
  Soja: {
    area: 957, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":300, FRETE:150, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Yara Basa", dose:0.125, area:957, fase:"Plantio", obs:"Adubação média", preco_unit:4530, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"NPK", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Kcl", dose:0.22, area:957, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cloreto de Potássio", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Fort C", dose:179, area:957, fase:"Diluído", obs:"Áreas fracas 11/13", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cálcio", revenda:"Valoriza", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:957, fase:"Diluído", obs:"Posto Fazenda", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Calcário", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Gesso", dose:0.6, area:957, fase:"Diluído", obs:"Posto Fazenda", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfato de Cálcio", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Tecno B10 (ULEXITA)", dose:10, area:957, fase:"Diluído", obs:"", preco_unit:4.4, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Boro", revenda:"Plano Agronegócios", vencimento:"30/04/2026" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTE SOJA", dose:0, area:957, fase:"", obs:"MÉDIA", preco_unit:582, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Endofuse", dose:0.03, area:957, fase:"100 kg sem.", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Flupiram", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Auras", dose:0.2, area:957, fase:"100 kg sem.", obs:"", preco_unit:430, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Raiz F Plus", dose:0.2, area:957, fase:"100 kg sem.", obs:"850 hectares", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Auxinas", revenda:"Germinar", vencimento:"30/04/2026" },
        { produto:"Aveo", dose:0.02, area:840, fase:"100 kg sem.", obs:"EXCETO B5830", preco_unit:5500, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sedaxane", revenda:"Valoriza", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Azos", dose:2, area:957, fase:"doses", obs:"2 doses", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azospirillum", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Nodugran", dose:10, area:957, fase:"doses", obs:"10 DOSES", preco_unit:1.28, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bradyrhizobium", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Torpeno (Trichoderma)", dose:0.12, area:957, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trichoderma", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Roundup Wg / Tecnup", dose:5, area:1100, fase:"", obs:"Preço médio", preco_unit:28.96, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"Trisolo / Adm", vencimento:"30/04/2026" },
        { produto:"Pôquer", dose:1.5, area:960, fase:"", obs:"980 l em estoque", preco_unit:33.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cletodim", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Diquat", dose:2, area:957, fase:"", obs:"Dessecação Colheita", preco_unit:22.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Plantar", vencimento:"30/04/2026" },
        { produto:"Glufosinato (offroad)", dose:2, area:960, fase:"", obs:"Dessecação pós sojas CE", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Dual Gold", dose:1, area:600, fase:"", obs:"Irrigado + sequeiro", preco_unit:55, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Prêmio", dose:0.05, area:957, fase:"Dessecação", obs:"Área Total", preco_unit:490, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorantraniliprole", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Octaborato (Nutry bor)", dose:2, area:957, fase:"", obs:"500 kg em estoque", preco_unit:15.2, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Boro", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Nutry NiCoMo", dose:0.15, area:957, fase:"V3/V6/R1", obs:"3 x 50 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ni+Co+Mo", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Aminogran", dose:0.3, area:1666.7, fase:"", obs:"Pré stress", preco_unit:42.15, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Aminoácidos", revenda:"Valence", vencimento:"30/04/2026" },
        { produto:"Map Purificado (Fluid P)", dose:1, area:1500, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fósforo", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Max K 400", dose:1.5, area:820, fase:"R5.1", obs:"Enchimento", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Potássio", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Utrisha", dose:0.333, area:380, fase:"", obs:"Irrigado", preco_unit:340, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Methylobacterium", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Combat Duo", dose:0.3, area:1666.7, fase:"", obs:"Mildio", preco_unit:73.09, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bacillus", revenda:"Valence", vencimento:"30/04/2026" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Score", dose:0.2, area:1540, fase:"V2", obs:"Área total vegetativo", preco_unit:79, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Difenoconazol", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Vessarya", dose:0.6, area:583.3, fase:"V6", obs:"Add Difeno", preco_unit:163, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Piraclostrobina+Fluxapiroxade", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Belyan", dose:0.6, area:483.3, fase:"R1", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Benzovindiflupir+Azoxistrobina", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Fox Xpro", dose:0.5, area:500, fase:"R1", obs:"", preco_unit:260, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafen+Trifloxistrobina", revenda:"Agro Brasil", vencimento:"30/10/2025" },
        { produto:"Excalia Max", dose:0.5, area:670, fase:"R5.1", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluxapiroxade+Piraclostrobina", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Approve", dose:1, area:950, fase:"", obs:"Mofo", preco_unit:135, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Unizeb Gold", dose:3, area:1000, fase:"R1", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Accuracy", dose:0.75, area:957, fase:"", obs:"Biológico vegetativo", preco_unit:36, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bacillus subtilis", revenda:"Valoriza", vencimento:"30/09/2025" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Prêmio // Shenzi", dose:0.1, area:957, fase:"Veg/Rep", obs:"2 x geral", preco_unit:490, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorantraniliprole", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Expedition", dose:0.3, area:1200, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina+Imidacloprido", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Platinum Neo", dose:0.3, area:1333.3, fase:"", obs:"", preco_unit:132, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam+Lambda-cialotrina", revenda:"Adm", vencimento:"30/04/2026" },
        { produto:"Vivantha", dose:0.06, area:960, fase:"", obs:"60 g dose", preco_unit:390, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"Adm", vencimento:"30/04/2026" },
        { produto:"Curbix", dose:0.75, area:700, fase:"", obs:"", preco_unit:90, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor", revenda:"Agro Brasil", vencimento:"30/09/2025" },
        { produto:"Pirate", dose:0.75, area:266.7, fase:"", obs:"Tripes", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"Khrom Oil", dose:0.25, area:1000, fase:"Dessecação", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Óleo Mineral", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"TA 35 Ultra", dose:0.15, area:2000, fase:"Dessecação", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Adjuvante", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"TA 35 Gold", dose:0.15, area:5000, fase:"Herb/fung", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Adjuvante", revenda:"Trisolo", vencimento:"30/04/2026" },
      ]},
    ]
  },
  Feijão: {
    area: 136.5, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":500, FRETE:100, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Map", dose:0.15, area:136.5, fase:"Plantio", obs:"", preco_unit:4690, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"MAP", revenda:"ADM", vencimento:"30/11/2024" },
        { produto:"Kcl", dose:0.21, area:136.5, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cloreto de Potássio", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:136.5, fase:"Pré plantio", obs:"Posto Fazenda", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Calcário", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Gesso", dose:0.6, area:136.5, fase:"Pré plantio", obs:"Posto Fazenda", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfato de Cálcio", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Uréia Mosaic / Tocantins", dose:0.22, area:136.5, fase:"", obs:"Preço médio", preco_unit:3320, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Nitrogênio", revenda:"ADM / Lécio", vencimento:"15/07/2025" },
        { produto:"Fort C", dose:179, area:136.5, fase:"", obs:"Diluido", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cálcio", revenda:"Valoriza", vencimento:"30/10/2025" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTES FEIJÃO", dose:0, area:136.5, fase:"", obs:"MÉDIA", preco_unit:400, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Dermacor", dose:0.081, area:136.5, fase:"Plantio", obs:"", preco_unit:1970, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorantraniliprole", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Endofuse", dose:0.02, area:136.5, fase:"Plantio", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Flupiram", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Raiz F Plus", dose:0.15, area:136.5, fase:"Plantio", obs:"", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Auxinas", revenda:"Germinar", vencimento:"30/04/2026" },
        { produto:"Aveo", dose:0.01, area:136.5, fase:"Plantio", obs:"", preco_unit:5500, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sedaxane", revenda:"Valoriza", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Azos", dose:2, area:136.5, fase:"doses", obs:"2 doses", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azospirillum", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Tropic", dose:5, area:136.5, fase:"doses", obs:"", preco_unit:4.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Co+Mo", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Torpeno", dose:0.12, area:136.5, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trichoderma", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Roundup wg", dose:2, area:136.5, fase:"", obs:"", preco_unit:28.96, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Basagran 600", dose:1, area:136.5, fase:"", obs:"", preco_unit:97.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bentazona", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Dual Gold", dose:0.8, area:136.5, fase:"", obs:"Pré plantio", preco_unit:55, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Diquat", dose:2, area:136.5, fase:"", obs:"", preco_unit:22.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Plantar", vencimento:"30/04/2026" },
        { produto:"Glufosinato (off road)", dose:2, area:136.5, fase:"", obs:"Pré plantio", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato", revenda:"ADM", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Nutry NiCoMo", dose:0.12, area:136.5, fase:"V4/R6", obs:"2 X 60 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ni+Co+Mo", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Max K 400", dose:1.5, area:136.5, fase:"", obs:"", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Potássio", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Map Purificado (Fluid P)", dose:2.9301, area:136.5, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fósforo", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Promalin", dose:0.05, area:136.5, fase:"R5/R6", obs:"Pré florada", preco_unit:630, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"GA3+BAP", revenda:"Valoriza", vencimento:"30/08/2024" },
        { produto:"Kellus Copper", dose:0.134, area:136.5, fase:"V6/R5", obs:"2 X 75 G", preco_unit:94, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cobre", revenda:"Agro Brasil", vencimento:"30/10/2025" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Nativo Plus", dose:0.7227, area:276.7, fase:"R5/R7", obs:"2 x", preco_unit:114, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trifloxistrobina+Tebuconazol", revenda:"Agro Brasil", vencimento:"30/10/2025" },
        { produto:"Approve", dose:2, area:136.5, fase:"", obs:"", preco_unit:135, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Unizeb gold", dose:1.5, area:275, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:0.8, area:270, fase:"Pré florada", obs:"2 x", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Expedition", dose:0.3, area:136.5, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina+Imidacloprido", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Vivantha", dose:0.08, area:270, fase:"", obs:"2 x 75 g", preco_unit:390, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Benevia", dose:0.879, area:136.5, fase:"", obs:"", preco_unit:227, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"Produttiva", vencimento:"30/04/2025" },
        { produto:"Verdavis", dose:0.25, area:136.5, fase:"", obs:"", preco_unit:515, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Spirotetramat", revenda:"Nascente", vencimento:"30/04/2026" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:1000, fase:"HERBICIDAS", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Adjuvante", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"Krhom oil", dose:0.25, area:260, fase:"HERBICIDAS", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Óleo Mineral", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
    ]
  },
  Milho: {
    area: 252, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Yara Basa", dose:0.175, area:252, fase:"Plantio", obs:"Média", preco_unit:4530, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"NPK", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Kcl", dose:0.24, area:252, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cloreto de Potássio", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:252, fase:"Pré plantio", obs:"Diluido", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Calcário", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Uréia EXCLN / Tocantins", dose:0.4, area:252, fase:"Pós plantio", obs:"Preço médio", preco_unit:3320, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Nitrogênio", revenda:"ADM / Tocantins", vencimento:"15/07/2025" },
        { produto:"Gesso", dose:0.6, area:252, fase:"Pré plantio", obs:"Diluido", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfato de Cálcio", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Fort C", dose:179, area:252, fase:"", obs:"Diluido", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cálcio", revenda:"Valoriza", vencimento:"30/10/2025" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTES MILHO", dose:1, area:252, fase:"", obs:"Média", preco_unit:1575, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"30/04/2026" },
        { produto:"Endofuse", dose:0.075, area:252, fase:"", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Flupiram", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Auras", dose:0.4, area:252, fase:"", obs:"", preco_unit:430, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Raiz F Plus", dose:0.2, area:252, fase:"", obs:"", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Auxinas", revenda:"Germinar", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Torpeno", dose:0.12, area:252, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trichoderma", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Azos", dose:2, area:252, fase:"doses", obs:"", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azospirillum", revenda:"Nascente", vencimento:"30/04/2026" },
      ]},
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Proof", dose:4, area:252, fase:"", obs:"Dessecação", preco_unit:22.9, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Reglone", dose:2, area:252, fase:"", obs:"", preco_unit:26.9, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Off road", dose:2, area:252, fase:"", obs:"", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Terrador", dose:0.2, area:252, fase:"", obs:"", preco_unit:439, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiafenacil", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Roundup Wg", dose:2, area:252, fase:"", obs:"", preco_unit:25.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"ADM", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Nutry NiCoMo", dose:0.2, area:252, fase:"", obs:"3 x 60 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ni+Co+Mo", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Utrisha N", dose:0.333, area:252, fase:"", obs:"", preco_unit:340, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Methylobacterium", revenda:"Valoriza", vencimento:"30/10/2025" },
        { produto:"Map Purificado (Fluid P)", dose:3.2, area:250, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fósforo", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Max k 400", dose:1.5, area:252, fase:"", obs:"Enchimento", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Potássio", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Unizeb Gold", dose:3, area:252, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Excalia Max", dose:0.6, area:252, fase:"", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluxapiroxade+Piraclostrobina", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Belyan", dose:0.6, area:252, fase:"", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Benzovindiflupir+Azoxistrobina", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Fox Xpro", dose:0.5, area:500, fase:"", obs:"2 aplicações", preco_unit:260, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafen+Trifloxistrobina", revenda:"Agro Brasil", vencimento:"30/10/2025" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:1.5, area:252, fase:"", obs:"", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Verdavis", dose:0.25, area:500, fase:"", obs:"2 aplicações", preco_unit:515, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Spirotetramat", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Curbix", dose:0.8, area:252, fase:"", obs:"", preco_unit:90, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor", revenda:"Agro Brasil", vencimento:"30/09/2025" },
        { produto:"Expedition", dose:0.3, area:252, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina+Imidacloprido", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Exalt", dose:0.2, area:250, fase:"", obs:"", preco_unit:720, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Espinetoram", revenda:"Valoriza", vencimento:"30/09/2025" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:1500, fase:"", obs:"", preco_unit:70, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Adjuvante", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"Óleo vegetal", dose:0.5, area:920, fase:"", obs:"", preco_unit:14.66, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Óleo Vegetal", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:0.25, area:500, fase:"HERBICIDAS", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Óleo Mineral", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
    ]
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// DADOS INICIAIS — SAFRINHA / INVERNO
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DATA_INVERNO = {
  "Milho": { area:575, ativo:true, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490, IRRIGAÇÃO:0 }, categories:[
      { name:"Adubação", products:[
        { produto:"Map Mosaic", dose:0.14, area:575.0, fase:"Plantio", obs:"Média", preco_unit:4690.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Kcl", dose:0.214, area:575.0, fase:"Plantio", obs:"Média", preco_unit:2375.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Calcário", dose:1.0, area:575.0, fase:"Pré plantio", obs:"Diluido", preco_unit:192.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"2024-04-30" },
        { produto:"Uréia EXCLN", dose:0.14, area:575.0, fase:"Pós plantio", obs:"Média", preco_unit:3100.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"ADM", vencimento:"2024-11-30" },
        { produto:"Gesso", dose:0.6, area:575.0, fase:"Pré plantio", obs:"Diluido", preco_unit:275.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"2024-04-30" },
        { produto:"Ulexita", dose:10.0, area:575.0, fase:"", obs:"Diluido", preco_unit:3.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Agro Brasil", vencimento:"2024-10-30" },
        { produto:"Yara Bela", dose:0.3, area:575.0, fase:"", obs:"Média", preco_unit:2350.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" }
      ] },
      { name:"Sementes / TS", products:[
        { produto:"SEMENTES", dose:1.0, area:575.0, fase:"", obs:"Média", preco_unit:1078.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"2024-09-05" }
      ] },
      { name:"Kit Sulco", products:[
        { produto:"Profix Ultra", dose:0.075, area:475.0, fase:"", obs:"", preco_unit:695.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"2025-08-30" },
        { produto:"Torpeno", dose:0.15, area:475.0, fase:"", obs:"", preco_unit:216.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Vigorgeo Azos", dose:0.2, area:575.0, fase:"", obs:"2 doses", preco_unit:47.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Auras", dose:0.173, area:121.0, fase:"", obs:"PIVOTS", preco_unit:430.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Raicol Resist", dose:0.173, area:100.0, fase:"", obs:"SEQUEIRO", preco_unit:230.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Provilar", dose:0.3, area:100.0, fase:"", obs:"Pivot 1/11", preco_unit:240.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" }
      ] },
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Primoleo", dose:6.0, area:575.0, fase:"", obs:"Dessecação", preco_unit:22.11, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Atrazina", revenda:"Nascente", vencimento:"2025-09-15" },
        { produto:"Mesotriona", dose:0.2, area:415.0, fase:"", obs:"", preco_unit:85.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mesotriona", revenda:"Pioneira", vencimento:"2025-08-30" },
        { produto:"Diquat", dose:2.0, area:575.0, fase:"", obs:"", preco_unit:23.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Off road", dose:2.0, area:370.0, fase:"", obs:"", preco_unit:19.44, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato", revenda:"Nascente", vencimento:"2025-09-15" }
      ] },
      { name:"Foliares", products:[
        { produto:"Octaborato", dose:2.0, area:575.0, fase:"", obs:"Dessecação", preco_unit:16.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Bortrac", dose:1.0, area:575.0, fase:"", obs:"3 x 0,5 lt", preco_unit:36.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Nutry NiCoMo", dose:0.2, area:575.0, fase:"", obs:"3 x 60 g", preco_unit:210.4, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Produze Max", dose:1.5, area:575.0, fase:"", obs:"2 x 0,75 kg", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Magnésio Ultra", dose:6.0, area:575.0, fase:"", obs:"Repartir no ciclo", preco_unit:2.85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Utrisha N", dose:0.333, area:325.0, fase:"", obs:"PIVOTS", preco_unit:340.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"2025-10-30" },
        { produto:"Max k 400", dose:1.5, area:323.0, fase:"", obs:"Enchimento", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Essenzamino", dose:1.0, area:323.0, fase:"", obs:"Enchimento", preco_unit:20.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Fungicidas", products:[
        { produto:"Unizeb Gold", dose:3.0, area:575.0, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Onsuva", dose:0.3, area:330.0, fase:"", obs:"95 ha sequeiro + 230 ha irrigado", preco_unit:350.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluindapir+Difenoconazol", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Odin", dose:0.2, area:575.0, fase:"", obs:"", preco_unit:45.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tebuconazol", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Fusão", dose:0.7, area:575.0, fase:"", obs:"", preco_unit:80.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Metominostrobina+Tebuconazol", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Almada", dose:2.0, area:58.0, fase:"", obs:"50 ha irrigado", preco_unit:72.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Protioconazol+Fluxapiroxade+Mancozebe", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Fox Xpro", dose:0.5, area:323.0, fase:"", obs:"", preco_unit:260.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafen+Trifloxistrobina", revenda:"", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Clorfenapir", dose:2.0, area:575.0, fase:"", obs:"", preco_unit:65.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Pioneira", vencimento:"2025-08-30" },
        { produto:"Verdavis", dose:0.25, area:1000.0, fase:"", obs:"2x", preco_unit:465.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Spirotetramat", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Bazuka", dose:1.0, area:575.0, fase:"", obs:"", preco_unit:21.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Metomil", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Lufenurom / Kraton", dose:0.5, area:400.0, fase:"", obs:"", preco_unit:55.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lufenurom", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Curbix", dose:0.9, area:370.0, fase:"", obs:"", preco_unit:90.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Expedition", dose:0.3, area:370.0, fase:"", obs:"", preco_unit:162.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina+Imidacloprido", revenda:"Valoriza", vencimento:"2025-09-30" },
        { produto:"Clorpirifos", dose:1.25, area:575.0, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:2800.0, fase:"", obs:"Usar no lugar do óleo", preco_unit:60.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:1.0, area:575.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:35.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" }
      ] }
    ] },
  "Feijão Irrigado": { area:160, ativo:true, op_costs:{ PLANTIO:300, "APLICAÇÕES":500, FRETE:100, COLHEITA:300, "INVESTIMENTO SOLO":490, IRRIGAÇÃO:600 }, categories:[
      { name:"Adubação", products:[] },
      { name:"Sementes / TS", products:[
        { produto:"Verimark", dose:0.3, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Certeza N / Plust", dose:0.2, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Enraize Max", dose:0.1, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Adage / Cruiser / ímpar", dose:0.25, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" }
      ] },
      { name:"Kit Sulco", products:[
        { produto:"Protege / Arvatico / Provilar", dose:0.3, area:160.0, fase:"", obs:"Gastar estoque // comprar provilar", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Azospirilum", dose:0.2, area:160.0, fase:"", obs:"320 doses", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" }
      ] },
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Amplo", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bentazona+Imazamoxi", revenda:"", vencimento:"" },
        { produto:"Select", dose:2.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cletodim", revenda:"", vencimento:"" },
        { produto:"Dual Gold", dose:0.75, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"", vencimento:"" },
        { produto:"Diquat", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"", vencimento:"" },
        { produto:"SHIFT 250", dose:0.3, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fomesafem", revenda:"", vencimento:"" },
        { produto:"Trifulalina", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trifluralina", revenda:"", vencimento:"" },
        { produto:"Sungai Xtra", dose:0.08, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Flumioxazina", revenda:"", vencimento:"" },
        { produto:"Roundup WG", dose:2.5, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"", vencimento:"" },
        { produto:"Glufosinato", dose:2.5, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato", revenda:"", vencimento:"" },
        { produto:"Diquat", dose:2.0, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"", vencimento:"" }
      ] },
      { name:"Foliares", products:[
        { produto:"Essenza Bor", dose:1.5, area:160.0, fase:"V3 / V7 / R6", obs:"3 x 0,5 lt", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Maxcell", dose:0.1688, area:160.0, fase:"V2 / V6", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Promalin", dose:0.05, area:160.0, fase:"R5", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Hulk", dose:0.1, area:160.0, fase:"V3", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Nutry NiCoMo", dose:0.18, area:160.0, fase:"V2 / V6 / R7", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Produze Max", dose:2.0, area:160.0, fase:"V3 / V7 / R6", obs:"3 x 0,7 kg", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Octaborato", dose:2.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Map Purificado", dose:5.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Forte Fluid All Forte", dose:1.0, area:160.0, fase:"R6", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Max k 400", dose:1.5, area:160.0, fase:"R7", obs:"Enchimento", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Magnésio Ultra", dose:6.0, area:160.0, fase:"", obs:"Repartir no ciclo", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Solotek Cobre", dose:0.3, area:160.0, fase:"R6", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"VPR PRO", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Potencer Ultra", dose:0.25, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Fulland", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" }
      ] },
      { name:"Fungicidas", products:[
        { produto:"Vessarya", dose:0.5, area:160.0, fase:"V5", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Piraclostrobina+Fluxapiroxade", revenda:"", vencimento:"" },
        { produto:"Evolution", dose:2.0, area:160.0, fase:"R5", obs:"EM ABERTO PRODUTIVA", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina+Protioconazol+Mancozebe", revenda:"", vencimento:"" },
        { produto:"Viovan", dose:0.5, area:160.0, fase:"R7", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina+Protioconazol", revenda:"", vencimento:"" },
        { produto:"Aproach Premium", dose:0.7, area:160.0, fase:"R8", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciproconazol+Picoxistrobina+Oxicloreto de Cobre", revenda:"", vencimento:"" },
        { produto:"Unizeb Gold", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"", vencimento:"" },
        { produto:"Sialex / Parrudo", dose:2.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Procimidona", revenda:"", vencimento:"" },
        { produto:"Fluazinam", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluazinam", revenda:"", vencimento:"" },
        { produto:"Approve", dose:1.6, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Clorfenapir Nortox", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"", vencimento:"" },
        { produto:"Elestal Neo", dose:0.15, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Espiropidiona+Acetamiprido", revenda:"", vencimento:"" },
        { produto:"Kraton / Lufenurom 100", dose:1.0, area:160.0, fase:"", obs:"4 x", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lufenurom", revenda:"", vencimento:"" },
        { produto:"Benevia", dose:0.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"", vencimento:"" },
        { produto:"Perito", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acefato", revenda:"", vencimento:"" },
        { produto:"Abamectin 72", dose:1.0, area:160.0, fase:"Ácaros", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Abamectina", revenda:"", vencimento:"" },
        { produto:"Bifentrina", dose:0.6, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina", revenda:"", vencimento:"" },
        { produto:"Acetamiprid", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"", vencimento:"" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 GOLD", dose:0.15, area:1600.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Krhom oil", dose:0.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" }
      ] }
    ] },
  "Trigo": { area:100, ativo:true, op_costs:{ PLANTIO:200, "APLICAÇÕES":350, FRETE:200, COLHEITA:350, IRRIGAÇÃO:0 }, categories:[
      { name:"Adubação", products:[
        { produto:"Fort OM 6.30.05", dose:0.26, area:100.0, fase:"Plantio", obs:"Média", preco_unit:4600.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"2024-11-30" },
        { produto:"Kcl", dose:0.17, area:100.0, fase:"Plantio", obs:"Média", preco_unit:2375.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Calcário", dose:0.7, area:100.0, fase:"Pré plantio", obs:"Diluido", preco_unit:190.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"2024-04-30" },
        { produto:"Gesso", dose:0.418, area:100.0, fase:"Pré plantio", obs:"", preco_unit:250.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"2024-04-30" },
        { produto:"Uréia EXCLN", dose:0.1, area:100.0, fase:"", obs:"", preco_unit:3185.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"ADM", vencimento:"2024-11-30" },
        { produto:"SEMENTES", dose:190.0, area:100.0, fase:"", obs:"", preco_unit:2.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Própria", vencimento:"" },
        { produto:"Yara Bela", dose:0.27, area:100.0, fase:"Pré plantio", obs:"", preco_unit:2350.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" }
      ] },
      { name:"Sementes / TS", products:[
        { produto:"Sistiva", dose:0.15, area:100.0, fase:"Plantio", obs:"", preco_unit:345.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Vitavax", dose:0.3, area:100.0, fase:"Plantio", obs:"", preco_unit:62.89, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Standak ( Shelter )", dose:0.2, area:100.0, fase:"Plantio", obs:"", preco_unit:128.9, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Enraize Zn", dose:0.15, area:100.0, fase:"Plantio", obs:"", preco_unit:160.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Provilar", dose:0.1579, area:100.0, fase:"", obs:"", preco_unit:240.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Kit Sulco", products:[
        { produto:"Vigorgeo Azos", dose:0.2, area:100.0, fase:"", obs:"Aplicar logo após nascimento", preco_unit:4.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Torpeno", dose:0.2, area:100.0, fase:"", obs:"Aplicar logo após nascimento", preco_unit:216.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Herbicidas - Dessecação e Pós", products:[
        { produto:"Dual Gold", dose:0.8, area:100.0, fase:"", obs:"Dessecação", preco_unit:54.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Topik", dose:0.25, area:100.0, fase:"", obs:"", preco_unit:595.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clodinafope-Propargil", revenda:"Nascente", vencimento:"2025-09-30" }
      ] },
      { name:"Foliares", products:[
        { produto:"Bortrac", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:36.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Produze Max", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Nutry NiCoMo", dose:0.2, area:100.0, fase:"", obs:"", preco_unit:210.4, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Sulfato Magnésio", dose:6.0, area:100.0, fase:"", obs:"", preco_unit:2.85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Potencer Ultra", dose:0.25, area:200.0, fase:"", obs:"2 X", preco_unit:91.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Utrisha N", dose:0.333, area:100.0, fase:"", obs:"", preco_unit:340.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"2025-09-30" },
        { produto:"Octaborato", dose:2.0, area:100.0, fase:"", obs:"Dessecação", preco_unit:16.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Moddus", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:135.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Max k 400", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Essenzamino", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:24.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Fungicidas", products:[
        { produto:"Bim Max", dose:1.0, area:200.0, fase:"", obs:"2x", preco_unit:160.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Triciclazol+Tebuconazol", revenda:"Valoriza", vencimento:"2025-10-30" },
        { produto:"Fusão", dose:0.6, area:100.0, fase:"", obs:"", preco_unit:80.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Metominostrobina+Tebuconazol", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Unizeb Gold", dose:3.0, area:100.0, fase:"", obs:"2x", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Mesic", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:120.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Protioconazol+Picoxistrobina", revenda:"Valoriza", vencimento:"2025-10-30" },
        { produto:"Aproach Power", dose:0.6, area:100.0, fase:"", obs:"", preco_unit:82.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina+Ciproconazol", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Tilt", dose:0.4, area:100.0, fase:"", obs:"", preco_unit:70.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Propiconazol", revenda:"EM ESTOQUE", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:0.8, area:100.0, fase:"", obs:"", preco_unit:85.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Acetamiprid", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"", vencimento:"" },
        { produto:"Expedition", dose:0.3, area:100.0, fase:"", obs:"", preco_unit:150.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina+Imidacloprido", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Lufenurom 100", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:55.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lufenurom", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Perito", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acefato", revenda:"", vencimento:"" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:600.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:60.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:1.0, area:100.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:35.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" }
      ] }
    ] },
  "Milho Irrigado": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490, IRRIGAÇÃO:600 }, categories:[] },
  "Milho Semente": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 }, categories:[] },
  "Milho Sequeiro": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 }, categories:[] },
  "Sorgo": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300 }, categories:[] },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANEJAMENTO DE CAMPO — dados por lote/talhão (recuperados de um commit anterior
// que havia sido sobrescrito por engano por um "restore" de backup mais antigo)
// ─────────────────────────────────────────────────────────────────────────────
const PLAN_VERAO_INICIAL = [
  {id:"pv1",lote:"LOTE 11 PIVOT 01",area:100,cultura:"Soja",variedade:"NEO 761 I2X",adubacao:"Yara Basa 128 kg",kcl:"241 kg",ciclo:117,populacao:12,dataPlantio:"16/10/2025",previsaoColheita:"10/02/2026",obs:""},
  {id:"pv2",lote:"LOTE 11 PIVOT 02",area:80.5,cultura:"Soja",variedade:"OLIMPO IPRO / DM 78IX80 I2X",adubacao:"Yara Basa 44 kg",kcl:"250 kg",ciclo:123,populacao:10.5,dataPlantio:"11/10/2025",previsaoColheita:"11/02/2026",obs:""},
  {id:"pv3",lote:"LOTE 11 PIVOT 03",area:41,cultura:"Soja",variedade:"RAPTOR I2X / NEO 700 I2X",adubacao:"Yara Basa 164 kg",kcl:"223 kg",ciclo:107,populacao:12,dataPlantio:"14/10/2025",previsaoColheita:"29/01/2026",obs:""},
  {id:"pv4",lote:"LOTE 11 PIVOT 04",area:13.5,cultura:"Milho",variedade:"AS 1868 PRO 4",adubacao:"Yara Basa 124 kg",kcl:"250 kg",ciclo:135,populacao:3.5,dataPlantio:"06/11/2025",previsaoColheita:"21/03/2026",obs:""},
  {id:"pv5",lote:"LOTE 11 SEQUEIRO BICOS",area:54,cultura:"Milho",variedade:"FS 695 PWU / DKB 358 PRO 4 / AS 1868",adubacao:"Yara Basa 122 kg",kcl:"217 kg",ciclo:135,populacao:3.5,dataPlantio:"06/11/2025",previsaoColheita:"21/03/2026",obs:""},
  {id:"pv6",lote:"LOTE 11 BICOS DIVISA",area:36,cultura:"Soja",variedade:"NS 7524 IPRO",adubacao:"Yara Basa 122 kg",kcl:"217 kg",ciclo:117,populacao:12.5,dataPlantio:"06/11/2025",previsaoColheita:"03/03/2026",obs:""},
  {id:"pv7",lote:"LOTE 11 SEQUEIRO MUTHEMA",area:38,cultura:"Soja",variedade:"NS 7524 IPRO",adubacao:"Yara Basa 122 kg",kcl:"217 kg",ciclo:117,populacao:12.5,dataPlantio:"05/11/2025",previsaoColheita:"02/03/2026",obs:""},
  {id:"pv8",lote:"LOTE 13 PIVOT 01",area:101.5,cultura:"Soja",variedade:"TORMENTA CE / MITICA CE",adubacao:"Yara Basa 14 kg",kcl:"226 kg",ciclo:115,populacao:12.5,dataPlantio:"14/10/2025",previsaoColheita:"06/02/2026",obs:""},
  {id:"pv9",lote:"LOTE 13 PIVOT 02",area:57.5,cultura:"Soja",variedade:"OLIMPO IPRO",adubacao:"Yara Basa 129 kg",kcl:"220 kg",ciclo:123,populacao:10.5,dataPlantio:"10/10/2025",previsaoColheita:"10/02/2026",obs:""},
  {id:"pv10",lote:"LOTE 13 PIVOT 03",area:26.5,cultura:"Milho",variedade:"FS 695 PWU RR / DKB 358 PRO 4",adubacao:"Yara Basa 179 kg",kcl:"217 kg",ciclo:135,populacao:3.5,dataPlantio:"05/11/2025",previsaoColheita:"20/03/2026",obs:""},
  {id:"pv11",lote:"LOTE 13 SEQUEIRO",area:119.5,cultura:"Soja",variedade:"TORMENTA CE",adubacao:"Yara Basa 66 kg",kcl:"221 kg",ciclo:115,populacao:12.5,dataPlantio:"05/11/2025",previsaoColheita:"28/02/2026",obs:""},
  {id:"pv12",lote:"LOTE 38",area:132,cultura:"Soja",variedade:"NS 7676 IPRO",adubacao:"Fort OM 140 kg",kcl:"156 kg",ciclo:120,populacao:10,dataPlantio:"19/11/2025",previsaoColheita:"19/03/2026",obs:""},
  {id:"pv13",lote:"LOTE 39",area:251.4,cultura:"Soja",variedade:"TORMENTA CE / B 5830 CE / NEO 761",adubacao:"Yara Basa 135 kg",kcl:"189 kg",ciclo:118,populacao:12,dataPlantio:"20/11/2025",previsaoColheita:"18/03/2026",obs:""},
  {id:"pv14",lote:"LOTE 40",area:158,cultura:"Milho",variedade:"P 40537 PWU RR",adubacao:"Yara Basa 194 kg",kcl:"248 kg",ciclo:135,populacao:3.5,dataPlantio:"10/11/2025",previsaoColheita:"25/03/2026",obs:""},
  {id:"pv15",lote:"LOTE 40 CHAPADÃO",area:136.5,cultura:"Feijão",variedade:"RAJADO FS 311",adubacao:"Fort OM 250 / Yara Basa 80 kg",kcl:"212 kg",ciclo:80,populacao:12,dataPlantio:"08/11/2025",previsaoColheita:"27/01/2026",obs:""},
];
const PLAN_SAFRINHA_INICIAL = [
  {id:"ps1",lote:"LOTE 11 PIVOT 01",area:100,cultura:"Feijão Irrigado",variedade:"DAMA",adubacaoPlantio:"MAP 176 kg",cobertura:"KCl 139 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps2",lote:"LOTE 11 PIVOT 02",area:80.5,cultura:"Milho",variedade:"P3808 VYHR",adubacaoPlantio:"MAP 73 kg",cobertura:"KCl 250 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:"TSI Completo"},
  {id:"ps3",lote:"LOTE 11 PIVOT 03",area:41,cultura:"Milho",variedade:"FS 695 PWURR",adubacaoPlantio:"MAP 211 kg",cobertura:"KCl 217 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps4",lote:"LOTE 11 PIVOT 04",area:14,cultura:"Feijão Irrigado",variedade:"DAMA",adubacaoPlantio:"MAP 150 kg",cobertura:"KCl 176 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps5",lote:"LOTE 13 PIVOT 01",area:101.5,cultura:"Trigo",variedade:"BRS 264",adubacaoPlantio:"MAP 100 kg",cobertura:"KCl 100 kg",nCobertura:"Ureia 300 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps6",lote:"LOTE 13 PIVOT 02",area:57.5,cultura:"Milho",variedade:"P40537 PWURR",adubacaoPlantio:"MAP 180 kg",cobertura:"KCl 250 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps7",lote:"LOTE 13 PIVOT 03",area:26.5,cultura:"Feijão Irrigado",variedade:"DAMA",adubacaoPlantio:"MAP 210 kg",cobertura:"KCl 131 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps8",lote:"LOTE 40 CHAPADÃO",area:136.5,cultura:"Sorgo",variedade:"K 200",adubacaoPlantio:"MAP 58 kg",cobertura:"KCl 171 kg",nCobertura:"Ureia 200 kg",populacao:12.5,dataPlantio:"",previsaoColheita:"",obs:"Beneficiado"},
  {id:"ps9",lote:"LOTE 13 SEQUEIRO",area:119.5,cultura:"Sorgo",variedade:"1G100 / AA 227",adubacaoPlantio:"MAP 48 kg",cobertura:"KCl 141 kg",nCobertura:"Ureia 150 kg",populacao:12,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps10",lote:"LOTE 11 MUTHEMA + BICO DIVISA",area:75,cultura:"Sorgo",variedade:"1G100",adubacaoPlantio:"MAP 52 kg",cobertura:"KCl 150 kg",nCobertura:"Ureia 150 kg",populacao:12.5,dataPlantio:"",previsaoColheita:"",obs:""},
];

const TS_VERAO_INICIAL = [
  {id:"ts1",cultura:"Soja",variedade:"B 5830 CE",dose100kg:"Dermacor\nLumitreo\nEndofuse\nAuras\nRaiz F Plus",kitSulco:"Azos 2 doses + Nodugran 10 doses + Torpeno 0,12 L/ha",obs:"SEM AVEO"},
  {id:"ts2",cultura:"Soja",variedade:"Demais variedades",dose100kg:"Dermacor\nLumitreo\nEndofuse\nAuras\nRaiz F Plus\nAveo",kitSulco:"Azos 2 doses + Nodugran 10 doses + Torpeno 0,12 L/ha",obs:""},
  {id:"ts3",cultura:"Milho",variedade:"Todas",dose100kg:"Endofuse\nAuras\nRaiz F Plus",kitSulco:"Azos 2 doses + Torpeno 0,12 L/ha",obs:""},
  {id:"ts4",cultura:"Feijão",variedade:"Todas",dose100kg:"Dermacor\nCerteza/Torino\nImpar/Adage\nEndofuse\nRaiz F Plus\nAveo",kitSulco:"Azos 2 doses + Tropic 5 doses + Torpeno 0,12 L/ha",obs:""},
];
const TS_SAFRINHA_INICIAL = [
  {id:"tsi1",cultura:"Milho",variedade:"P40537 PWURR",dose100kg:"Nema Protection 75ml\nTrich Protection 300ml\nBioma Azum 200ml\nBioma Phos 150ml",kitSulco:"",obs:"TSI Completo"},
  {id:"tsi2",cultura:"Feijão",variedade:"DAMA",dose100kg:"Dermacor 80ml\nAdage/Impar 300ml\nEndofuse 15ml\nCerteza 200ml\nAcrescent Raiz 200ml",kitSulco:"Vigorgeo Azos 200ml",obs:""},
  {id:"tsi3",cultura:"Trigo",variedade:"BRS 264",dose100kg:"Enraize ZN 100ml\nVitavax 300ml\nStandak 150ml",kitSulco:"",obs:""},
  {id:"tsi4",cultura:"Sorgo",variedade:"K200 / 1G100",dose100kg:"Beneficiado",kitSulco:"",obs:"K200 Pivots 40/80/57 - 15kg sem/ha"},
];

function PlanejamentoTable({data, setData, tipo, cultureColors, onGerarCotacao, onAtualizarCusto, obs, setObs}) {
  const isVerao = tipo === "verao";
  const cor = isVerao ? "#1a5c2e" : "#5c4a00";
  const culturaOpts = isVerao
    ? ["Soja","Milho","Feijão","Trigo","Sorgo"]
    : ["Milho","Feijão Irrigado","Trigo","Sorgo","Milho Irrigado","Milho Semente","Milho Sequeiro"];
  const total = data.reduce((s,r)=>s+(r.area||0),0);
  const [genMsg, setGenMsg] = useState(null);
  const [custoMsg, setCustoMsg] = useState(null);

  function upd(i, field, val) {
    setData(d => d.map((r,ri) => ri===i ? { ...r, [field]: ["area","ciclo","populacao"].includes(field) ? (parseFloat(val)||0) : val } : r));
  }
  function addLote() {
    setData(d => [...d, isVerao
      ? { id:newId(), lote:"", area:0, cultura:culturaOpts[0], variedade:"", adubacao:"", kcl:"", ciclo:0, populacao:0, unidadeQtd:"bag", dataPlantio:"", previsaoColheita:"", obs:"" }
      : { id:newId(), lote:"", area:0, cultura:culturaOpts[0], variedade:"", adubacaoPlantio:"", cobertura:"", nCobertura:"", populacao:0, unidadeQtd:"saco", dataPlantio:"", previsaoColheita:"", obs:"" }
    ]);
  }
  // Divide um lote/pivô ao meio: usado quando duas variedades são plantadas na mesma área física
  // (ex: metade de um pivô com uma variedade, metade com outra). Mantém o nome do lote e os demais
  // dados como base nas duas linhas, com a área dividida — a segunda linha fica com variedade em
  // branco pra preencher.
  function dividirLote(i) {
    setData(d => {
      const row = d[i];
      const metade = (row.area||0)/2;
      const nd = [...d];
      nd[i] = { ...row, area:metade };
      nd.splice(i+1, 0, { ...row, id:newId(), area:metade, variedade:"" });
      return nd;
    });
  }
  function gerarCotacao() {
    const n = onGerarCotacao(data, isVerao);
    setGenMsg(n);
    setTimeout(()=>setGenMsg(null), 4000);
  }
  function atualizarCusto() {
    const relatorio = onAtualizarCusto(data, isVerao);
    setCustoMsg(relatorio);
    setTimeout(()=>setCustoMsg(null), 6000);
  }

  const cols = isVerao
    ? [["lote","Lote / Fazenda","text",120],["area","Área (ha)","number",65],["cultura","Cultura","select"],["variedade","Variedade","text",100],
       ["adubacao","Adubação Plantio","text",100],["kcl","KCl","text",80],["ciclo","Ciclo (d)","number",55],["populacao","Pop.(sem/m)","number",55],
       ["quantidade","Quantidade (bags/sacos)","calc",70],["unidadeQtd","Unid.","unit",60],
       ["dataPlantio","Data Plantio","text",80],["previsaoColheita","Prev. Colheita","text",80]]
    : [["lote","Lote / Fazenda","text",120],["area","Área (ha)","number",65],["cultura","Cultura","select"],["variedade","Variedade","text",100],
       ["adubacaoPlantio","Adub. Plantio","text",90],["cobertura","Cobertura (KCl)","text",90],["nCobertura","N Cobertura (Ureia)","text",90],
       ["populacao","Pop.(sem/m)","number",55],["quantidade","Quantidade (bags/sacos)","calc",70],["unidadeQtd","Unid.","unit",60],
       ["dataPlantio","Data Plantio","text",80],["previsaoColheita","Prev. Colheita","text",80]];

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:16,fontWeight:800,color:cor}}>🗺️ Planejamento de Campo — {isVerao?"Safra Verão":"Safrinha/Inverno"}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={gerarCotacao} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 Gerar Cotação</button>
          <button onClick={atualizarCusto} style={{padding:"7px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>💰 Atualizar Custo Sementes</button>
          <button onClick={addLote} style={{padding:"7px 14px",background:cor,border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lote</button>
        </div>
      </div>
      {genMsg!==null && (
        <div style={{padding:"8px 14px",background:"#e8f5e9",color:"#2e7d32",borderRadius:6,fontSize:12,marginBottom:12}}>
          ✓ Quantidades enviadas para a Cotação de Sementes: {genMsg} variedade(s) nova(s).
        </div>
      )}
      {custoMsg!==null && (
        <div style={{padding:"8px 14px",background:"#e3f2fd",color:"#1565C0",borderRadius:6,fontSize:12,marginBottom:12}}>
          {custoMsg.length===0
            ? "Nenhuma cultura com compras de sementes registradas em Compras ainda."
            : custoMsg.map(r=>`✓ ${r.cultura}: ${fmt(r.precoMedio)}/ha (${fmt(r.totalPago)} ÷ ${fmtN(r.areaTotal,1)} ha)`).join("  •  ")}
        </div>
      )}
      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:cor,color:"#fff"}}>
                {[...cols.map(c=>c[1]),""].map(h=>(
                  <th key={h} style={{padding:"8px 8px",textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row,i)=>{
                const bg = i%2===0?"#fff":"#f9f9f9";
                const cc = (cultureColors[row.cultura]) || { light:"#f5f5f5", bg:"#546e7a" };
                return (
                  <tr key={row.id||i} style={{background:bg}}>
                    {cols.map(([field,,type,width])=>(
                      <td key={field} style={{padding:"3px 5px"}}>
                        {type==="select" ? (
                          <select value={row[field]||culturaOpts[0]} onChange={e=>upd(i,field,e.target.value)}
                            style={{padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,background:cc.light,color:cc.bg,fontWeight:700}}>
                            {culturaOpts.map(c=><option key={c}>{c}</option>)}
                          </select>
                        ) : type==="calc" ? (
                          (()=>{ const qtd=calcQtdSementes(row); return (
                            <div style={{padding:"3px 5px",textAlign:"right",fontWeight:qtd!=null?700:400,color:qtd!=null?cc.bg:"#bbb",minWidth:width||70}} title={qtd!=null?"Calculado: População × 20000 × Área ÷ sementes por unidade":"Fórmula disponível apenas para Soja e Milho"}>
                              {qtd!=null?fmtN(qtd,1):"—"}
                            </div>
                          );})()
                        ) : type==="unit" ? (
                          <select value={row.unidadeQtd||(row.cultura==="Soja"?"bag":"saco")} onChange={e=>upd(i,"unidadeQtd",e.target.value)}
                            style={{padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}>
                            <option value="bag">bag</option>
                            <option value="saco">saco</option>
                          </select>
                        ) : (
                          <input type={type} value={row[field]||(type==="number"?"":"")} onChange={e=>upd(i,field,e.target.value)}
                            placeholder={field.startsWith("data")||field==="previsaoColheita"?"dd/mm/aaaa":""}
                            style={{width:width||"100%",minWidth:type==="number"?55:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:type==="number"?"right":"left"}}/>
                        )}
                      </td>
                    ))}
                    <td style={{padding:"3px 4px",textAlign:"center",whiteSpace:"nowrap"}}>
                      <button onClick={()=>dividirLote(i)} title="Dividir este lote/pivô ao meio (duas variedades na mesma área)" style={{background:"none",border:"none",color:cc.bg,cursor:"pointer",fontSize:13,marginRight:6}}>🔀</button>
                      <button onClick={()=>{if(window.confirm(`Remover lote "${row.lote||"sem nome"}"?`))setData(d=>d.filter((_,ri)=>ri!==i));}} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {data.length===0 && <tr><td colSpan={cols.length+1} style={{padding:"20px",textAlign:"center",color:"#bbb",fontSize:12}}>Nenhum lote cadastrado.</td></tr>}
            </tbody>
            <tfoot>
              <tr style={{background:cor,color:"#fff",fontWeight:700}}>
                <td style={{padding:"7px 8px",fontSize:11}}>TOTAL</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontSize:12}}>{fmtN(total,1)} ha</td>
                <td colSpan={cols.length-1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:10,padding:14,marginTop:12,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{fontSize:12,fontWeight:700,color:cor,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>📝 Observações da safra</div>
        <textarea value={obs||""} onChange={e=>setObs(e.target.value)} rows={4}
          placeholder="Anotações e testes realizados durante a safra..."
          style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui",lineHeight:1.5}}/>
      </div>
    </div>
  );
}

function TSKitSulcoView({data, setData, titulo, cor, cultureColors}) {
  const culturas = [...new Set(data.map(r=>r.cultura))];
  const grouped = {};
  culturas.forEach(c=>{ grouped[c]=data.filter(r=>r.cultura===c); });

  function upd(id, field, val) { setData(d => d.map(r => r.id===id ? {...r,[field]:val} : r)); }
  function remover(id) { if (window.confirm("Remover este registro?")) setData(d => d.filter(r=>r.id!==id)); }
  function adicionar() { setData(d => [...d, { id:newId(), cultura:"Soja", variedade:"", dose100kg:"", kitSulco:"", obs:"" }]); }
  function exportarWord() {
    let html = `<html><head><meta charset='utf-8'><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#222;}
      h1{background:${cor||"#1a5c2e"};color:#fff;padding:8px 14px;border-radius:4px;font-size:16px;}
      h2{color:${cor||"#1a5c2e"};font-size:13px;margin:18px 0 4px;}
      ul{margin:4px 0 10px 20px;}
      li{font-size:12px;line-height:1.8;}
      .obs{font-size:11px;color:#666;}
      hr{border:none;border-top:1px solid #ddd;margin:12px 0;}
    </style></head><body>
    <h1 style='text-align:center'>GC Agro — ${titulo}</h1>`;
    Object.entries(grouped).forEach(([cult,rows])=>{
      html += `<h1>${cult.toUpperCase()}</h1>`;
      rows.forEach(r=>{
        html += `<h2>Variedade: ${r.variedade||"Todas"}</h2>`;
        if (r.dose100kg) {
          html += `<b style='font-size:12px'>Dose por 100 kg de Semente:</b><ul>`;
          r.dose100kg.split("\n").filter(l=>l.trim()).forEach(l=>{html+=`<li>${l.trim()}</li>`;});
          html += `</ul>`;
        }
        if (r.kitSulco) {
          html += `<b style='font-size:12px'>Kit Sulco:</b><ul>`;
          r.kitSulco.split("\n").filter(l=>l.trim()).forEach(l=>{html+=`<li>${l.trim()}</li>`;});
          html += `</ul>`;
        }
        if (r.obs) html += `<p class='obs'>Obs: ${r.obs}</p>`;
        html += `<hr>`;
      });
    });
    html += `</body></html>`;
    const blob = new Blob([html], {type:"application/msword"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = titulo.replace(/[^a-zA-Z0-9]+/g,"_")+".doc";
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:16,fontWeight:800,color:cor||"#1a3a1a"}}>{titulo}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportarWord} style={{padding:"7px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>📄 Exportar Word</button>
          <button onClick={adicionar} style={{padding:"7px 14px",background:cor||"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
        </div>
      </div>
      {Object.entries(grouped).map(([cult,rows])=>{
        const cc = cultureColors[cult] || {bg:"#37474f",light:"#f5f5f5",accent:"#546e7a"};
        return (
          <div key={cult} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:12}}>
            <div style={{background:cc.bg,color:"#fff",padding:"10px 14px",fontWeight:700,fontSize:13}}>{cult}</div>
            {rows.map((row,i)=>(
              <div key={row.id} style={{padding:14,borderBottom:"1px solid #f0f0f0",background:i%2===0?"#fff":"#fafafa"}}>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Cultura</div>
                  <select value={row.cultura} onChange={e=>upd(row.id,"cultura",e.target.value)}
                    style={{padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}>
                    {["Soja","Milho","Feijão","Feijão Irrigado","Trigo","Sorgo"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Variedade/Híbrido</div>
                  <input value={row.variedade||""} onChange={e=>upd(row.id,"variedade",e.target.value)}
                    style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Dose por 100 kg de Semente</div>
                    <textarea value={row.dose100kg||""} onChange={e=>upd(row.id,"dose100kg",e.target.value)} rows={5}
                      placeholder={"80ml Dermacor\n200ml Torino\n300ml Cruiser\n200ml Raiz F Plus"}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui",lineHeight:1.6}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Kit Sulco (dose/ha)</div>
                    <textarea value={row.kitSulco||""} onChange={e=>upd(row.id,"kitSulco",e.target.value)} rows={5}
                      placeholder={"Azos 2 doses\nNodugran 10 doses\nTorpeno 0,12 L/ha"}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui",lineHeight:1.6}}/>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Observações</div>
                    <input value={row.obs||""} onChange={e=>upd(row.id,"obs",e.target.value)}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
                  </div>
                  <button onClick={()=>remover(row.id)} style={{background:"#ffebee",border:"none",borderRadius:5,color:"#c62828",padding:"6px 10px",cursor:"pointer",fontSize:12,marginTop:16}}>✕ Remover</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {data.length===0 && <div style={{background:"#fff",borderRadius:10,padding:30,textAlign:"center",color:"#aaa",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>Nenhum tratamento cadastrado ainda.</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  // ── Safras ──
  const [safraAtiva, setSafraAtiva] = useState(() => loadLS(KEY_SAFRAS+"_ativa", "Verão 25/26"));
  const [safrasArquivadas, setSafrasArquivadas] = useState(() => loadLS(KEY_SAFRAS+"_arquivo", []));

  // ── Programação ──
  const [dataVerao, setDataVerao] = useState(() => splitSementesTS(renameCategoria(loadLS(KEY_PROG+"_verao", INITIAL_DATA_VERAO), "Dessecação e Pós", "Herbicidas - Dessecação e Pós")));
  const [dataInverno, setDataInverno] = useState(() => splitSementesTS(renameCategoria(loadLS(KEY_PROG+"_inverno", INITIAL_DATA_INVERNO), "Dessecação e Pós", "Herbicidas - Dessecação e Pós")));

  // ── Cotação ──
  const [cotVeraoAdub, setCotVeraoAdub]   = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_verao_adub", {})));
  const [cotVeraoIns, setCotVeraoIns]     = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_verao_ins", {})));
  const [cotInvAdub, setCotInvAdub]       = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_inv_adub", {})));
  const [cotInvIns, setCotInvIns]         = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_inv_ins", {})));
  const [cotVeraoSem, setCotVeraoSem]     = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_verao_sem", {})));
  const [cotInvSem, setCotInvSem]         = useState(() => migrateVencPrecos(loadLS(KEY_COTACAO+"_inv_sem", {})));
  const [cotVencLabels, setCotVencLabels] = useState(() => loadLS(KEY_COTACAO+"_venc_labels", {}));
  const [sementesFornecedores, setSementesFornecedores] = useState(() => migrateFornecedores(loadLS(KEY_COTACAO+"_sem_fornecedores", [])));
  const [fornecedoresAdub, setFornecedoresAdub] = useState(() => migrateFornecedores(loadLS(KEY_COTACAO+"_forn_adub", FORN_ADUBACAO_INICIAL)));
  const [fornecedoresIns, setFornecedoresIns]   = useState(() => migrateFornecedores(loadLS(KEY_COTACAO+"_forn_ins", FORN_INSUMOS_INICIAL)));
  const [newSemFornecedor, setNewSemFornecedor] = useState("");

  // ── Cotação Adubação: lista de produtos editável manualmente (desacoplada da Programação) ──
  const [cotAdubProdVerao, setCotAdubProdVerao] = useState(() => loadLS(KEY_COTACAO+"_produtos_verao_adub", null) || derivarAdubacao(dataVerao));
  const [cotAdubProdInv, setCotAdubProdInv]     = useState(() => loadLS(KEY_COTACAO+"_produtos_inv_adub", null) || derivarAdubacao(dataInverno));
  const [addingAdubo, setAddingAdubo]     = useState(false);
  const [newAdubo, setNewAdubo]           = useState({nome:"",unidade:"TN",qtd_total:"",preco_ref:""});

  // ── Cotação Sementes: lista de produtos editável manualmente (desacoplada da Programação) ──
  const [cotSemProdVerao, setCotSemProdVerao] = useState(() => loadLS(KEY_COTACAO+"_produtos_verao_sem", null) || derivarSementes(dataVerao));
  const [cotSemProdInv, setCotSemProdInv]     = useState(() => loadLS(KEY_COTACAO+"_produtos_inv_sem", null) || derivarSementes(dataInverno));
  const [addingSemente, setAddingSemente] = useState(false);
  const [newSemente, setNewSemente]       = useState({nome:"",unidade:"bag",qtd_total:"",preco_ref:""});

  // ── Cotação Insumos/Defensivos: lista de produtos editável manualmente (mesmo fluxo de Adubação/Sementes) ──
  const [cotInsumoProdVerao, setCotInsumoProdVerao] = useState(() => loadLS(KEY_COTACAO+"_produtos_verao_ins", null) || derivarProdutos(dataVerao, true));
  const [cotInsumoProdInv, setCotInsumoProdInv]     = useState(() => loadLS(KEY_COTACAO+"_produtos_inv_ins", null) || derivarProdutos(dataInverno, true));
  const [addingInsumo, setAddingInsumo]   = useState(false);
  const [newInsumo, setNewInsumo]         = useState({nome:"",unidade:"L",qtd_total:"",preco_ref:"",categoria:CATEGORIAS_INSUMOS[0],ingrediente_ativo:""});

  // ── Compras (histórico de compras fechadas na Cotação) ──
  const [comprasRecords, setComprasRecords] = useState(() => loadLS(KEY_COMPRAS, []));
  const [addingCompra, setAddingCompra]     = useState(false);
  const [newCompra, setNewCompra] = useState({safra:"",produto:"",categoria:"Adubação",unidade:"TN",quantidade:"",precoUnitario:"",fornecedor:"",data:"",obs:""});
  const [comprasSafraSel, setComprasSafraSel] = useState(null);
  const [comprasCatSel, setComprasCatSel]     = useState(null);
  const [novaPastaNome, setNovaPastaNome]     = useState("");

  // ── UI ──
  const [appView, setAppView]             = useState("dashboard");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [activeCultureVerao, setActiveCultureVerao] = useState("Soja");
  const [activeCultureInverno, setActiveCultureInverno] = useState("Milho");
  const [expandedCats, setExpandedCats]   = useState({});
  const [editingCell, setEditingCell]     = useState(null);
  const [editingOp, setEditingOp]         = useState(null);
  const [addingTo, setAddingTo]           = useState(null);
  const [editingArea, setEditingArea]     = useState(false);
  const [editingKgSemente, setEditingKgSemente] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newProd, setNewProd]             = useState({produto:"",dose:"",kgHa:"",area:"",fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});
  const [cotScreen, setCotScreen]         = useState("login");
  const [cotRole, setCotRole]             = useState(null);
  const [cotContext, setCotContext]        = useState(null); // {safra, tipo}
  const [loginInput, setLoginInput]       = useState("");
  const [loginError, setLoginError]       = useState("");
  const [myPrices, setMyPrices]           = useState({});
  const [cotSaved, setCotSaved]           = useState(false);
  const [adminTab, setAdminTab]           = useState("merit");
  const [filterCat, setFilterCat]         = useState("Todas");
  const [fornCatFilter, setFornCatFilter] = useState("Todas");
  const [fornecedoresTab, setFornecedoresTab] = useState("adub");
  const [showSafrasModal, setShowSafrasModal] = useState(false);
  const [novaSafraNome, setNovaSafraNome] = useState("");
  const [viewingSafraIdx, setViewingSafraIdx] = useState(null);
  const [safraDetailTab, setSafraDetailTab] = useState("prog_verao");
  const [showFecharCotModal, setShowFecharCotModal] = useState(false);
  const [fecharDecisions, setFecharDecisions] = useState(null);
  const [pedidoCompra, setPedidoCompra] = useState(null);
  const [gerarCotMsg, setGerarCotMsg] = useState(null);

  // ── Planejamento de Campo ──
  const [planVerao, setPlanVerao]         = useState(() => loadLS(KEY_PLANEJAMENTO+"_verao", PLAN_VERAO_INICIAL));
  const [planSafrinha, setPlanSafrinha]   = useState(() => loadLS(KEY_PLANEJAMENTO+"_safrinha", PLAN_SAFRINHA_INICIAL));
  const [planObsVerao, setPlanObsVerao]       = useState(() => loadLS(KEY_PLANEJAMENTO+"_obs_verao", ""));
  const [planObsSafrinha, setPlanObsSafrinha] = useState(() => loadLS(KEY_PLANEJAMENTO+"_obs_safrinha", ""));
  const [tsVerao, setTsVerao]           = useState(() => loadLS(KEY_PLANEJAMENTO+"_ts_verao", TS_VERAO_INICIAL));
  const [tsSafrinha, setTsSafrinha]     = useState(() => loadLS(KEY_PLANEJAMENTO+"_ts_safrinha", TS_SAFRINHA_INICIAL));

  // ── Colheita ──
  const [colheitaRecords, setColheitaRecords]     = useState(() => loadLS(KEY_COLHEITA, []));
  const [editingRecordCell, setEditingRecordCell] = useState(null); // "module|id|field"
  const [importMsg, setImportMsg]         = useState(null); // {modulo, texto}
  const [backupMsg, setBackupMsg]         = useState(null); // {ok, texto}
  const [addingColheita, setAddingColheita]     = useState(false);
  const [newColheita, setNewColheita] = useState({tipo:"verao",loteId:"",data:"",areaHa:"",sacas:"",umidade:"",pmg:"",obs:""});

  // ── Vendas (registro de vendas de grãos) ──
  const [vendasRecords, setVendasRecords] = useState(() => loadLS(KEY_VENDAS, []));
  const [addingVenda, setAddingVenda]     = useState(false);
  const [vendaFiltroSafra, setVendaFiltroSafra] = useState("Todas");
  const [vendaCulturaTab, setVendaCulturaTab]   = useState("Soja");
  const [newVenda, setNewVenda] = useState({cultura:"Soja",safra:"",qtd:"",unidade:"sc",preco:"",comprador:"",dataEntrega:"",dataPagamento:"",obs:""});

  // ── Auto-save ──
  useEffect(() => { saveLS(KEY_PROG+"_verao", dataVerao); }, [dataVerao]);
  useEffect(() => { saveLS(KEY_PROG+"_inverno", dataInverno); }, [dataInverno]);
  useEffect(() => { saveLS(KEY_COTACAO+"_verao_adub", cotVeraoAdub); }, [cotVeraoAdub]);
  useEffect(() => { saveLS(KEY_COTACAO+"_verao_ins", cotVeraoIns); }, [cotVeraoIns]);
  useEffect(() => { saveLS(KEY_COTACAO+"_inv_adub", cotInvAdub); }, [cotInvAdub]);
  useEffect(() => { saveLS(KEY_COTACAO+"_inv_ins", cotInvIns); }, [cotInvIns]);
  useEffect(() => { saveLS(KEY_COTACAO+"_venc_labels", cotVencLabels); }, [cotVencLabels]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_verao_adub", cotAdubProdVerao); }, [cotAdubProdVerao]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_inv_adub", cotAdubProdInv); }, [cotAdubProdInv]);
  useEffect(() => { saveLS(KEY_COTACAO+"_verao_sem", cotVeraoSem); }, [cotVeraoSem]);
  useEffect(() => { saveLS(KEY_COTACAO+"_inv_sem", cotInvSem); }, [cotInvSem]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_verao_ins", cotInsumoProdVerao); }, [cotInsumoProdVerao]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_inv_ins", cotInsumoProdInv); }, [cotInsumoProdInv]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_verao_sem", cotSemProdVerao); }, [cotSemProdVerao]);
  useEffect(() => { saveLS(KEY_COTACAO+"_produtos_inv_sem", cotSemProdInv); }, [cotSemProdInv]);
  useEffect(() => { saveLS(KEY_COTACAO+"_sem_fornecedores", sementesFornecedores); }, [sementesFornecedores]);
  useEffect(() => { saveLS(KEY_COTACAO+"_forn_adub", fornecedoresAdub); }, [fornecedoresAdub]);
  useEffect(() => { saveLS(KEY_COTACAO+"_forn_ins", fornecedoresIns); }, [fornecedoresIns]);

  // ── Sincronização em tempo real via Firebase (fornecedor cota de qualquer aparelho) ──
  useFirebaseSync("gcagro/cotacao/verao_adub", cotVeraoAdub, setCotVeraoAdub);
  useFirebaseSync("gcagro/cotacao/verao_ins", cotVeraoIns, setCotVeraoIns);
  useFirebaseSync("gcagro/cotacao/verao_sem", cotVeraoSem, setCotVeraoSem);
  useFirebaseSync("gcagro/cotacao/inv_adub", cotInvAdub, setCotInvAdub);
  useFirebaseSync("gcagro/cotacao/inv_ins", cotInvIns, setCotInvIns);
  useFirebaseSync("gcagro/cotacao/inv_sem", cotInvSem, setCotInvSem);
  useFirebaseSync("gcagro/cotacao/venc_labels", cotVencLabels, setCotVencLabels);
  useFirebaseSync("gcagro/cotacao/produtos_verao_adub", cotAdubProdVerao, setCotAdubProdVerao);
  useFirebaseSync("gcagro/cotacao/produtos_inv_adub", cotAdubProdInv, setCotAdubProdInv);
  useFirebaseSync("gcagro/cotacao/produtos_verao_ins", cotInsumoProdVerao, setCotInsumoProdVerao);
  useFirebaseSync("gcagro/cotacao/produtos_inv_ins", cotInsumoProdInv, setCotInsumoProdInv);
  useFirebaseSync("gcagro/cotacao/produtos_verao_sem", cotSemProdVerao, setCotSemProdVerao);
  useFirebaseSync("gcagro/cotacao/produtos_inv_sem", cotSemProdInv, setCotSemProdInv);
  useFirebaseSync("gcagro/cotacao/sementes_fornecedores", sementesFornecedores, setSementesFornecedores);
  useFirebaseSync("gcagro/cotacao/forn_adub", fornecedoresAdub, setFornecedoresAdub);
  useFirebaseSync("gcagro/cotacao/forn_ins", fornecedoresIns, setFornecedoresIns);
  useEffect(() => { saveLS(KEY_COMPRAS, comprasRecords); }, [comprasRecords]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_verao", planVerao); }, [planVerao]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_safrinha", planSafrinha); }, [planSafrinha]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_obs_verao", planObsVerao); }, [planObsVerao]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_obs_safrinha", planObsSafrinha); }, [planObsSafrinha]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_ts_verao", tsVerao); }, [tsVerao]);
  useEffect(() => { saveLS(KEY_PLANEJAMENTO+"_ts_safrinha", tsSafrinha); }, [tsSafrinha]);
  useEffect(() => { saveLS(KEY_COLHEITA, colheitaRecords); }, [colheitaRecords]);
  useEffect(() => { saveLS(KEY_VENDAS, vendasRecords); }, [vendasRecords]);

  const resolveLote = useMemo(() => makeLoteResolver(planVerao, planSafrinha), [planVerao, planSafrinha]);
  const lotesDisponiveis = newColheita.tipo === "verao" ? planVerao : planSafrinha;

  // ── Derived products ──
  const prodVeraoAdub = useMemo(() => derivarAdubacao(dataVerao), [dataVerao]);
  const prodVeraoIns  = useMemo(() => derivarProdutos(dataVerao, true), [dataVerao]);
  const prodInvAdub   = useMemo(() => derivarAdubacao(dataInverno), [dataInverno]);
  const prodInvIns    = useMemo(() => derivarProdutos(dataInverno, true), [dataInverno]);

  // ── Context helpers ──
  const isVerao = appView.startsWith("prog_verao") || appView.startsWith("cot_verao") || appView.startsWith("resumo_verao");
  const isInverno = appView.startsWith("prog_inv") || appView.startsWith("cot_inv") || appView.startsWith("resumo_inv");
  const data = isVerao ? dataVerao : dataInverno;
  const setData = isVerao ? setDataVerao : setDataInverno;
  const activeCulture = isVerao ? activeCultureVerao : activeCultureInverno;
  const setActiveCulture = isVerao ? setActiveCultureVerao : setActiveCultureInverno;
  const cultureColors = isVerao ? CULTURE_COLORS_VERAO : CULTURE_COLORS_INVERNO;
  const culture = data[activeCulture] || { area:0, ativo:true, op_costs:{}, categories:[] };
  const colors = cultureColors[activeCulture] || { bg:"#37474f", light:"#f5f5f5", accent:"#546e7a", badge:"#78909c" };

  // ── Cotação context helpers ──
  function getCotData(ctx) {
    if (!ctx) return {};
    if (ctx.safra==="verao" && ctx.tipo==="adub") return cotVeraoAdub;
    if (ctx.safra==="verao" && ctx.tipo==="ins")  return cotVeraoIns;
    if (ctx.safra==="verao" && ctx.tipo==="sem")  return cotVeraoSem;
    if (ctx.safra==="inv"   && ctx.tipo==="adub") return cotInvAdub;
    if (ctx.safra==="inv"   && ctx.tipo==="ins")  return cotInvIns;
    if (ctx.safra==="inv"   && ctx.tipo==="sem")  return cotInvSem;
    return {};
  }
  function setCotData(ctx, val) {
    if (!ctx) return;
    if (ctx.safra==="verao" && ctx.tipo==="adub") setCotVeraoAdub(val);
    if (ctx.safra==="verao" && ctx.tipo==="ins")  setCotVeraoIns(val);
    if (ctx.safra==="verao" && ctx.tipo==="sem")  setCotVeraoSem(val);
    if (ctx.safra==="inv"   && ctx.tipo==="adub") setCotInvAdub(val);
    if (ctx.safra==="inv"   && ctx.tipo==="ins")  setCotInvIns(val);
    if (ctx.safra==="inv"   && ctx.tipo==="sem")  setCotInvSem(val);
  }
  function getProdutos(ctx) {
    if (!ctx) return [];
    if (ctx.safra==="verao" && ctx.tipo==="adub") return cotAdubProdVerao;
    if (ctx.safra==="verao" && ctx.tipo==="ins")  return cotInsumoProdVerao;
    if (ctx.safra==="verao" && ctx.tipo==="sem")  return cotSemProdVerao;
    if (ctx.safra==="inv"   && ctx.tipo==="adub") return cotAdubProdInv;
    if (ctx.safra==="inv"   && ctx.tipo==="ins")  return cotInsumoProdInv;
    if (ctx.safra==="inv"   && ctx.tipo==="sem")  return cotSemProdInv;
    return [];
  }
  function getFornecedorList(tipo) {
    return tipo==="adub" ? fornecedoresAdub : tipo==="sem" ? sementesFornecedores : fornecedoresIns;
  }
  function setFornecedorList(tipo, updater) {
    const setter = tipo==="adub" ? setFornecedoresAdub : tipo==="sem" ? setSementesFornecedores : setFornecedoresIns;
    setter(updater);
  }
  function getFornecedores(ctx) {
    if (!ctx) return fornecedoresIns;
    return getFornecedorList(ctx.tipo);
  }
  function addFornecedor(tipo, nome) {
    const n = (nome||"").trim();
    if (!n) return;
    setFornecedorList(tipo, list => list.some(f=>f.nome.toLowerCase()===n.toLowerCase()) ? list : [...list, {nome:n, telefone:"", token:genToken(n)}]);
  }
  function removeFornecedor(tipo, nome) {
    if (!window.confirm(`Remover fornecedor "${nome}"?`)) return;
    setFornecedorList(tipo, list => list.filter(f=>f.nome!==nome));
  }
  function updateFornecedor(tipo, nome, field, value) {
    setFornecedorList(tipo, list => list.map(f => f.nome===nome ? {...f, [field]: value} : f));
  }
  function regenToken(tipo, nome) {
    updateFornecedor(tipo, nome, "token", genToken(nome));
  }
  function addSementeFornecedor() {
    addFornecedor("sem", newSemFornecedor);
    setNewSemFornecedor("");
  }
  function removeSementeFornecedor(nome) {
    removeFornecedor("sem", nome);
  }
  // ── Vencimentos de pagamento (duas datas manuais por cotação) ──
  function getVencLabels(ctx) {
    const k = ctx ? ctx.safra+"_"+ctx.tipo : null;
    return (k && cotVencLabels[k]) || {v1:"Pagamento 1", v2:"Pagamento 2"};
  }
  function setVencLabel(ctx, vk, label) {
    if (!ctx) return;
    const k = ctx.safra+"_"+ctx.tipo;
    setCotVencLabels(prev => ({...prev, [k]: {...(prev[k]||{v1:"Pagamento 1",v2:"Pagamento 2"}), [vk]: label}}));
  }

  // ── Cotação Adubação/Sementes: CRUD das listas editáveis ──
  function setAduboProdutos(ctx, updater) {
    if (!ctx || ctx.tipo!=="adub") return;
    if (ctx.safra==="verao") setCotAdubProdVerao(updater); else setCotAdubProdInv(updater);
  }
  function addAduboRow() {
    if (!newAdubo.nome.trim() || !cotContext) return;
    setAduboProdutos(cotContext, list => [...list, { nome:newAdubo.nome.trim(), unidade:newAdubo.unidade,
      qtd_total:parseFloat(newAdubo.qtd_total)||0, categoria:"Adubação", preco_ref:parseFloat(newAdubo.preco_ref)||0, ingrediente_ativo:"" }]);
    setNewAdubo({nome:"",unidade:"TN",qtd_total:"",preco_ref:""});
    setAddingAdubo(false);
  }
  function updateAduboField(nome, field, value) {
    if (!cotContext) return;
    setAduboProdutos(cotContext, list => list.map(p => p.nome===nome
      ? { ...p, [field]: ["qtd_total","preco_ref"].includes(field) ? (parseFloat(value)||0) : value }
      : p));
  }
  function deleteAduboRow(nome) {
    if (!cotContext) return;
    if (!window.confirm(`Remover "${nome}" da lista de cotação?`)) return;
    setAduboProdutos(cotContext, list => list.filter(p => p.nome!==nome));
  }
  function setSementeProdutos(ctx, updater) {
    if (!ctx || ctx.tipo!=="sem") return;
    if (ctx.safra==="verao") setCotSemProdVerao(updater); else setCotSemProdInv(updater);
  }
  function addSementeRow() {
    if (!newSemente.nome.trim() || !cotContext) return;
    setSementeProdutos(cotContext, list => [...list, { nome:newSemente.nome.trim(), unidade:newSemente.unidade,
      qtd_total:parseFloat(newSemente.qtd_total)||0, categoria:"Sementes", preco_ref:parseFloat(newSemente.preco_ref)||0, ingrediente_ativo:"" }]);
    setNewSemente({nome:"",unidade:"bag",qtd_total:"",preco_ref:""});
    setAddingSemente(false);
  }
  function updateSementeField(nome, field, value) {
    if (!cotContext) return;
    setSementeProdutos(cotContext, list => list.map(p => p.nome===nome
      ? { ...p, [field]: ["qtd_total","preco_ref"].includes(field) ? (parseFloat(value)||0) : value }
      : p));
  }
  function deleteSementeRow(nome) {
    if (!cotContext) return;
    if (!window.confirm(`Remover "${nome}" da lista de cotação?`)) return;
    setSementeProdutos(cotContext, list => list.filter(p => p.nome!==nome));
  }
  function setInsumoProdutos(ctx, updater) {
    if (!ctx || ctx.tipo!=="ins") return;
    if (ctx.safra==="verao") setCotInsumoProdVerao(updater); else setCotInsumoProdInv(updater);
  }
  function addInsumoRow() {
    if (!newInsumo.nome.trim() || !cotContext) return;
    setInsumoProdutos(cotContext, list => [...list, { nome:newInsumo.nome.trim(), unidade:newInsumo.unidade,
      qtd_total:parseFloat(newInsumo.qtd_total)||0, categoria:newInsumo.categoria, preco_ref:parseFloat(newInsumo.preco_ref)||0,
      ingrediente_ativo:newInsumo.ingrediente_ativo.trim() }]);
    setNewInsumo({nome:"",unidade:"L",qtd_total:"",preco_ref:"",categoria:CATEGORIAS_INSUMOS[0],ingrediente_ativo:""});
    setAddingInsumo(false);
  }
  function updateInsumoField(nome, field, value) {
    if (!cotContext) return;
    setInsumoProdutos(cotContext, list => list.map(p => p.nome===nome
      ? { ...p, [field]: ["qtd_total","preco_ref"].includes(field) ? (parseFloat(value)||0) : value }
      : p));
  }
  function deleteInsumoRow(nome) {
    if (!cotContext) return;
    if (!window.confirm(`Remover "${nome}" da lista de cotação?`)) return;
    setInsumoProdutos(cotContext, list => list.filter(p => p.nome!==nome));
  }

  // ── Programação helpers ──
  function toggleCat(idx) { setExpandedCats(e=>({...e,[activeCulture+idx]:!e[activeCulture+idx]})); }
  function toggleCultura(nome) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); if(nd[nome]) nd[nome].ativo=!nd[nome].ativo; return nd; });
  }
  function deleteCultura(nome) {
    if (!window.confirm(`Remover cultura "${nome}"?`)) return;
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); delete nd[nome]; return nd; });
  }
  // Importa categorias/produtos de outra cultura da mesma safra (Verão ou Inverno) para
  // abastecer uma cultura vazia/recém-ativada com uma base de produtos já usados. Faz merge:
  // categorias que já existem no destino ganham só os produtos que ainda não têm (por nome);
  // categorias novas são criadas. A área de cada produto importado é ajustada pra área da
  // cultura destino, e preco_compra/fornecedor_compra são zerados (ainda não comprado).
  function importarProdutosDeCultura(origemNome) {
    if (!origemNome || !data[origemNome] || origemNome===activeCulture) return;
    setData(d=>{
      const nd = JSON.parse(JSON.stringify(d));
      const origem = d[origemNome];
      const alvo = nd[activeCulture];
      const areaAlvo = alvo.area;
      origem.categories.forEach(catOrigem=>{
        let catAlvo = alvo.categories.find(c=>c.name===catOrigem.name);
        if (!catAlvo) { catAlvo = { name:catOrigem.name, products:[] }; alvo.categories.push(catAlvo); }
        const nomesExistentes = new Set(catAlvo.products.map(p=>p.produto.trim().toLowerCase()));
        catOrigem.products.forEach(p=>{
          if (nomesExistentes.has(p.produto.trim().toLowerCase())) return;
          catAlvo.products.push({ ...p, area:areaAlvo, preco_compra:null, fornecedor_compra:null });
        });
      });
      return nd;
    });
    setShowImportModal(false);
  }
  function updateField(catIdx, prodIdx, field, value) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); const p=nd[activeCulture].categories[catIdx].products[prodIdx];
      p[field]=["produto","fase","obs","revenda","vencimento","ingrediente_ativo"].includes(field)?value:parseFloat(value)||0; return nd; });
  }
  function deleteProduct(catIdx, prodIdx) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); nd[activeCulture].categories[catIdx].products.splice(prodIdx,1); return nd; });
  }
  function addProduct(catIdx) {
    if (!newProd.produto.trim()) return;
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d));
      nd[activeCulture].categories[catIdx].products.push({...newProd,
        dose:parseFloat(newProd.dose)||0, kgHa:parseFloat(newProd.kgHa)||0, area:parseFloat(newProd.area)||nd[activeCulture].area,
        preco_unit:parseFloat(newProd.preco_unit)||0, preco_compra:null, fornecedor_compra:null});
      return nd; });
    setNewProd({produto:"",dose:"",kgHa:"",area:"",fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});
    setAddingTo(null);
  }
  function addCategoria(nome) {
    if (!nome.trim()) return;
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d));
      if (!nd[activeCulture].categories.find(c=>c.name===nome))
        nd[activeCulture].categories.push({name:nome,products:[]});
      return nd; });
  }
  function updateOpCost(key, value) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); nd[activeCulture].op_costs[key]=parseFloat(value)||0; return nd; });
  }
  function updateArea(value) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); nd[activeCulture].area=parseFloat(value)||0; return nd; });
  }
  function updateKgSemente(value) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); nd[activeCulture].kgSemente=parseFloat(value)||0; return nd; });
  }

  // ── Cotação helpers ──
  function handleCotLogin() {
    const val = loginInput.trim();
    if (val === ADMIN_PASSWORD) { setCotRole({type:"admin"}); setCotScreen("admin"); return; }
    const fns = getFornecedores(cotContext);
    const idx = fns.findIndex(f=>f.nome.toLowerCase()===val.toLowerCase()||(f.token&&f.token.toLowerCase()===val.toLowerCase()));
    if (idx>=0) {
      const fresh = getCotData(cotContext);
      setMyPrices(fresh[fns[idx].nome]||{});
      setCotRole({type:"fornecedor",name:fns[idx].nome,idx});
      setCotScreen("fornecedor");
      return;
    }
    setLoginError("Nome, token ou senha incorreta.");
  }
  function handleCotSave() {
    const fresh = {...getCotData(cotContext)};
    fresh[cotRole.name] = myPrices;
    setCotData(cotContext, fresh);
    setCotSaved(true);
    setTimeout(()=>setCotSaved(false),3000);
  }
  function handleCotLogout() { setCotScreen("login"); setLoginInput(""); setLoginError(""); }

  // ── Fechar cotação (lançar na programação) ──
  // Casa o produto da cotação com o da Programação pelo nome; se o nome comprado for
  // diferente do que está na Programação, cai para o casamento por ingrediente ativo
  // (mesmo princípio do sistema antigo). Em ambos os casos alimenta preco_unit, que é
  // o valor usado para gerar os custos — preco_compra fica só como referência visual.
  function fecharCotacao(prodKey, fornecedores_qtds, precoMedio, nomeReal, iaReal) {
    // fornecedores_qtds: [{nome, qtd, preco, venc}]
    const setD = cotContext?.safra==="verao" ? setDataVerao : setDataInverno;
    const vencLabels = getVencLabels(cotContext);
    const fornecedorLabel = fornecedores_qtds.map(f=>f.nome).join(" + ");
    const vencimentoLabel = [...new Set(fornecedores_qtds.map(f=>vencLabels[f.venc||"v1"]))].join(" + ");
    const iaKey = (iaReal||"").trim().toLowerCase();
    setD(d => {
      const nd = JSON.parse(JSON.stringify(d));
      Object.values(nd).forEach(culture => {
        culture.categories.forEach(cat => {
          cat.products.forEach(p => {
            const nomeMatch = p.produto.trim().toLowerCase() === prodKey;
            const iaMatch = !nomeMatch && iaKey && (p.ingrediente_ativo||"").trim().toLowerCase() === iaKey;
            if (nomeMatch || iaMatch) {
              p.preco_unit = precoMedio;
              p.preco_compra = precoMedio;
              p.fornecedor_compra = fornecedorLabel;
              p.revenda = fornecedorLabel;
              p.vencimento = vencimentoLabel;
              if (nomeMatch && nomeReal) p.produto = nomeReal;
              if (iaReal) p.ingrediente_ativo = iaReal;
            }
          });
        });
      });
      return nd;
    });
  }
  function abrirFecharCotacao() {
    const allPrices = getCotData(cotContext);
    const produtos = getProdutos(cotContext);
    const fornecedores = getFornecedores(cotContext);
    const d = {};
    produtos.forEach(p => {
      const key = p.nome.toLowerCase();
      const vals = [];
      fornecedores.forEach(f => {
        const precos = allPrices[f.nome]||{};
        const entry = precos[key]||{};
        ["v1","v2"].forEach(vk => {
          const preco = entry[vk];
          if (preco>0) vals.push({nome:f.nome, venc:vk, preco:Number(preco), nomeComercial:entry.nomeComercial||""});
        });
      });
      const melhor = vals.length ? vals.reduce((a,b)=>a.preco<b.preco?a:b) : null;
      // Se o fornecedor vencedor informou o nome comercial dele (útil quando o produto é
      // genérico e cada fornecedor vende com um nome diferente), pré-preenche com ele.
      d[key] = { nomeReal:(melhor&&melhor.nomeComercial) || p.nome, iaReal:p.ingrediente_ativo||"",
        splits: melhor ? [{nome:melhor.nome, venc:melhor.venc, qtd:100, preco:melhor.preco}] : [{nome:"", venc:"v1", qtd:100, preco:0}] };
    });
    setFecharDecisions(d);
    setShowFecharCotModal(true);
  }

  // ── Gerar Cotação (sincroniza Adubação/Sementes da Programação p/ as cotações editáveis) ──
  function mergeNovosProdutos(existentes, derivados) {
    const nomes = new Set(existentes.map(p=>p.nome.trim().toLowerCase()));
    const novos = derivados.filter(p=>!nomes.has(p.nome.trim().toLowerCase()));
    return novos.length ? [...existentes, ...novos] : existentes;
  }
  function gerarCotacao() {
    const safra = appView==="prog_verao" ? "verao" : "inv";
    const d = safra==="verao" ? dataVerao : dataInverno;
    const adubDerivado = derivarAdubacao(d);
    const semDerivado = derivarSementes(d);
    const insDerivado = derivarProdutos(d, true);
    const adubAtual = safra==="verao" ? cotAdubProdVerao : cotAdubProdInv;
    const semAtual = safra==="verao" ? cotSemProdVerao : cotSemProdInv;
    const insAtual = safra==="verao" ? cotInsumoProdVerao : cotInsumoProdInv;
    const adubMerged = mergeNovosProdutos(adubAtual, adubDerivado);
    const semMerged = mergeNovosProdutos(semAtual, semDerivado);
    const insMerged = mergeNovosProdutos(insAtual, insDerivado);
    (safra==="verao" ? setCotAdubProdVerao : setCotAdubProdInv)(adubMerged);
    (safra==="verao" ? setCotSemProdVerao : setCotSemProdInv)(semMerged);
    (safra==="verao" ? setCotInsumoProdVerao : setCotInsumoProdInv)(insMerged);
    setGerarCotMsg({ adub: adubMerged.length-adubAtual.length, sem: semMerged.length-semAtual.length, ins: insMerged.length-insAtual.length });
    setTimeout(()=>setGerarCotMsg(null), 4000);
  }
  function gerarCotacaoSementesDoPlano(planData, isVerao) {
    const map = {};
    planData.forEach(row => {
      if (!row.variedade || !row.variedade.trim()) return;
      const qtd = calcQtdSementes(row);
      if (!qtd || qtd<=0) return;
      const key = row.variedade.trim().toLowerCase();
      const unidade = row.unidadeQtd || (row.cultura==="Soja" ? "bag" : "saco");
      if (map[key]) { map[key].qtd_total += qtd; }
      else { map[key] = { nome:row.variedade.trim(), unidade, qtd_total:qtd, categoria:"Sementes", preco_ref:0, ingrediente_ativo:"" }; }
    });
    const derivados = Object.values(map);
    const atual = isVerao ? cotSemProdVerao : cotSemProdInv;
    const merged = mergeNovosProdutos(atual, derivados);
    (isVerao ? setCotSemProdVerao : setCotSemProdInv)(merged);
    return merged.length - atual.length;
  }

  // ── Custo médio de sementes: soma o valor pago em Compras e divide pela área plantada,
  // alimentando o preço/ha da categoria "Sementes" na Programação (Verão ou Inverno) ──
  function atualizarCustoSementesDoPlano(planData, isVerao) {
    const culturas = [...new Set(planData.map(r=>r.cultura).filter(Boolean))];
    const setD = isVerao ? setDataVerao : setDataInverno;
    let atualizados = 0;
    const relatorio = [];
    culturas.forEach(cultura => {
      const areaTotal = planData.filter(r=>r.cultura===cultura).reduce((s,r)=>s+(parseFloat(r.area)||0),0);
      if (!areaTotal) return;
      const variedades = new Set(planData.filter(r=>r.cultura===cultura && r.variedade)
        .map(r=>r.variedade.trim().toLowerCase()));
      if (!variedades.size) return;
      const totalPago = comprasRecords.filter(r=>r.categoria==="Sementes" && variedades.has((r.produto||"").trim().toLowerCase()))
        .reduce((s,r)=>s+(r.valorTotal||0),0);
      if (!totalPago) return;
      const precoMedio = totalPago/areaTotal;
      relatorio.push({cultura, precoMedio, totalPago, areaTotal});
      atualizados++;
    });
    if (atualizados) {
      setD(d => {
        const nd = JSON.parse(JSON.stringify(d));
        relatorio.forEach(({cultura,precoMedio})=>{
          const c = nd[cultura];
          if (!c) return;
          c.categories.forEach(cat=>{
            if (cat.name!=="Sementes") return;
            cat.products.forEach(p=>{ p.preco_unit = precoMedio; });
          });
        });
        return nd;
      });
    }
    return relatorio;
  }

  // ── Safras ──
  function arquivarSafra() {
    const arquivo = {
      nome: safraAtiva,
      dataArquivamento: new Date().toLocaleDateString("pt-BR"),
      dataVerao: JSON.parse(JSON.stringify(dataVerao)),
      dataInverno: JSON.parse(JSON.stringify(dataInverno)),
      planVerao: JSON.parse(JSON.stringify(planVerao)),
      planSafrinha: JSON.parse(JSON.stringify(planSafrinha)),
      cotacoes: { cotVeraoAdub, cotVeraoIns, cotInvAdub, cotInvIns }
    };
    setSafrasArquivadas(prev => { const n=[...prev, arquivo]; saveLS(KEY_SAFRAS+"_arquivo",n); return n; });
  }
  function novaSafra(nomeSafra) {
    arquivarSafra();
    // Copia estrutura, zera preços comprados
    const copiaVerao = JSON.parse(JSON.stringify(dataVerao));
    const copiaInverno = JSON.parse(JSON.stringify(dataInverno));
    [copiaVerao,copiaInverno].forEach(d=>{
      Object.values(d).forEach(c=>{
        c.categories.forEach(cat=>{
          cat.products.forEach(p=>{ p.preco_compra=null; p.fornecedor_compra=null; });
        });
      });
    });
    setDataVerao(copiaVerao); setDataInverno(copiaInverno);
    setCotVeraoAdub({}); setCotVeraoIns({}); setCotInvAdub({}); setCotInvIns({});
    setSafraAtiva(nomeSafra);
    saveLS(KEY_SAFRAS+"_ativa", nomeSafra);
    setShowSafrasModal(false);
  }

  // ── Backup (exportar/importar todos os dados) ──
  function exportarBackup() {
    const payload = {
      versao: "gcagro_backup_v1", dataExportacao: new Date().toISOString(),
      dataVerao, dataInverno, safraAtiva, safrasArquivadas,
      cotVeraoAdub, cotVeraoIns, cotVeraoSem, cotInvAdub, cotInvIns, cotInvSem, cotVencLabels,
      cotAdubProdVerao, cotAdubProdInv, cotSemProdVerao, cotSemProdInv, cotInsumoProdVerao, cotInsumoProdInv,
      fornecedoresAdub, fornecedoresIns, sementesFornecedores,
      planVerao, planSafrinha, colheitaRecords, comprasRecords, vendasRecords,
    };
    const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gcagro_backup_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function importarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const b = JSON.parse(ev.target.result);
        if (b.dataVerao) setDataVerao(b.dataVerao);
        if (b.dataInverno) setDataInverno(b.dataInverno);
        if (b.safraAtiva) setSafraAtiva(b.safraAtiva);
        if (b.safrasArquivadas) setSafrasArquivadas(b.safrasArquivadas);
        if (b.cotVeraoAdub) setCotVeraoAdub(b.cotVeraoAdub);
        if (b.cotVeraoIns) setCotVeraoIns(b.cotVeraoIns);
        if (b.cotVeraoSem) setCotVeraoSem(b.cotVeraoSem);
        if (b.cotInvAdub) setCotInvAdub(b.cotInvAdub);
        if (b.cotInvIns) setCotInvIns(b.cotInvIns);
        if (b.cotInvSem) setCotInvSem(b.cotInvSem);
        if (b.cotVencLabels) setCotVencLabels(b.cotVencLabels);
        if (b.cotAdubProdVerao) setCotAdubProdVerao(b.cotAdubProdVerao);
        if (b.cotAdubProdInv) setCotAdubProdInv(b.cotAdubProdInv);
        if (b.cotSemProdVerao) setCotSemProdVerao(b.cotSemProdVerao);
        if (b.cotSemProdInv) setCotSemProdInv(b.cotSemProdInv);
        if (b.cotInsumoProdVerao) setCotInsumoProdVerao(b.cotInsumoProdVerao);
        if (b.cotInsumoProdInv) setCotInsumoProdInv(b.cotInsumoProdInv);
        if (b.fornecedoresAdub) setFornecedoresAdub(migrateFornecedores(b.fornecedoresAdub));
        if (b.fornecedoresIns) setFornecedoresIns(migrateFornecedores(b.fornecedoresIns));
        if (b.sementesFornecedores) setSementesFornecedores(migrateFornecedores(b.sementesFornecedores));
        if (b.planVerao) setPlanVerao(b.planVerao);
        if (b.planSafrinha) setPlanSafrinha(b.planSafrinha);
        if (b.colheitaRecords) setColheitaRecords(b.colheitaRecords);
        if (b.comprasRecords) setComprasRecords(b.comprasRecords);
        if (b.vendasRecords) setVendasRecords(b.vendasRecords);
        setBackupMsg({ok:true, texto:"✅ Backup restaurado com sucesso!"});
      } catch {
        setBackupMsg({ok:false, texto:"❌ Arquivo inválido."});
      }
      setTimeout(()=>setBackupMsg(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Totais ──
  const catTotals = useMemo(()=>culture.categories.map(cat=>cat.products.reduce((s,p)=>s+calcProdTotal(p,cat,culture),0)),[culture]);
  const insumoTotal = catTotals.reduce((a,b)=>a+b,0);
  const opTotal = Object.values(culture.op_costs||{}).reduce((a,b)=>a+b,0);
  const totalHa = culture.area>0 ? insumoTotal/culture.area + opTotal : 0;

  const summaryVerao  = useMemo(()=>Object.entries(dataVerao).map(([name,c])=>{ const t=calcCultureTotals(c); return {name,area:c.area,ativo:c.ativo,...t,cats:c.categories.map(cat=>({name:cat.name,total:cat.products.reduce((s,p)=>s+calcProdTotal(p,cat,c),0)}))}; }),[dataVerao]);
  const summaryInverno = useMemo(()=>Object.entries(dataInverno).map(([name,c])=>{ const t=calcCultureTotals(c); return {name,area:c.area,ativo:c.ativo,...t,cats:c.categories.map(cat=>({name:cat.name,total:cat.products.reduce((s,p)=>s+calcProdTotal(p,cat,c),0)}))}; }),[dataInverno]);

  // ── Colheita: totais derivados ──
  const colheitaTotais = useMemo(() => {
    const totalArea = colheitaRecords.reduce((s,r)=>s+r.areaHa,0);
    const totalSacas = colheitaRecords.reduce((s,r)=>s+r.sacas,0);
    return { totalArea, totalSacas, media: totalArea>0 ? totalSacas/totalArea : 0 };
  }, [colheitaRecords]);

  const comprasTotais = useMemo(() => {
    const total = comprasRecords.reduce((s,r)=>s+r.valorTotal,0);
    const totalSafraAtiva = comprasRecords.filter(r=>r.safra===safraAtiva).reduce((s,r)=>s+r.valorTotal,0);
    const porSafra = {};
    comprasRecords.forEach(r => {
      if (!porSafra[r.safra]) porSafra[r.safra] = { safra:r.safra, total:0, quantidade:0 };
      porSafra[r.safra].total += r.valorTotal;
      porSafra[r.safra].quantidade += r.quantidade;
    });
    return { total, totalSafraAtiva, porSafra: Object.values(porSafra) };
  }, [comprasRecords, safraAtiva]);

  const comprasSafrasList = useMemo(() => {
    const safras = new Set(comprasRecords.map(r=>r.safra));
    safras.add(safraAtiva);
    return Array.from(safras).map(safra => {
      const recs = comprasRecords.filter(r=>r.safra===safra);
      return { safra, total: recs.reduce((s,r)=>s+r.valorTotal,0), count: recs.length };
    }).sort((a,b)=> a.safra===safraAtiva ? -1 : b.safra===safraAtiva ? 1 : b.safra.localeCompare(a.safra));
  }, [comprasRecords, safraAtiva]);

  const comprasCategoriasList = useMemo(() => {
    if (!comprasSafraSel) return [];
    const map = {};
    CATEGORIAS_COMPRA_PADRAO.forEach(cat => { map[cat] = { categoria:cat, total:0, count:0 }; });
    comprasRecords.filter(r=>r.safra===comprasSafraSel).forEach(r => {
      const cat = r.categoria || "Outros";
      if (!map[cat]) map[cat] = { categoria:cat, total:0, count:0 };
      map[cat].total += r.valorTotal;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a,b)=> b.count-a.count || a.categoria.localeCompare(b.categoria));
  }, [comprasRecords, comprasSafraSel]);

  const comprasRecordsFiltrados = useMemo(() => {
    if (!comprasSafraSel || !comprasCatSel) return [];
    return comprasRecords.filter(r=>r.safra===comprasSafraSel && r.categoria===comprasCatSel);
  }, [comprasRecords, comprasSafraSel, comprasCatSel]);

  const refInsumosSafraAtiva = useMemo(() => {
    const verao = summaryVerao.filter(c=>c.ativo).reduce((s,c)=>s+c.insumos,0);
    const inverno = summaryInverno.filter(c=>c.ativo).reduce((s,c)=>s+c.insumos,0);
    return verao + inverno;
  }, [summaryVerao, summaryInverno]);

  // ── Import handlers ──
  function handleImportColheita(file) {
    importSpreadsheet(file, ALIASES_COLHEITA, m=>buildColheitaRecord(m, safraAtiva, resolveLote), setColheitaRecords,
      txt=>{ setImportMsg({modulo:"colheita",texto:txt}); setTimeout(()=>setImportMsg(null),6000); });
  }

  // Importa de uma vez todos os lotes do Planejamento (Verão + Safrinha) que ainda não têm
  // registro de colheita nesta safra — sem precisar selecionar lote por lote. Fica só faltando
  // preencher Data, Sacas, PMG e Umidade em cada linha já criada.
  function importarTodosLotesPlanejamento() {
    const jaTem = new Set(colheitaRecords.filter(r=>r.safra===safraAtiva).map(r=>r.loteId));
    const todos = [
      ...planVerao.map(l=>({...l, tipo:"verao"})),
      ...planSafrinha.map(l=>({...l, tipo:"inv"})),
    ].filter(l=>l.lote && l.lote.trim() && !jaTem.has(l.id));
    if (!todos.length) return;
    const novos = todos.map(lote => ({ id:newId(), safra:safraAtiva, tipo:lote.tipo, loteId:lote.id, lote:lote.lote,
      cultura:lote.cultura, variedade:lote.variedade||"", populacao:lote.populacao||0, dataPlantio:lote.dataPlantio||"", previsaoColheita:lote.previsaoColheita,
      data:"", areaHa:lote.area||0, sacas:0, umidade:0, pmg:0, obs:"" }));
    setColheitaRecords(rs => [...rs, ...novos]);
  }

  // ── Add/delete manuais ──
  function submitColheita() {
    const lote = lotesDisponiveis.find(l => l.id === newColheita.loteId);
    if (!lote) return;
    addRecord(setColheitaRecords, { safra:safraAtiva, tipo:newColheita.tipo, loteId:lote.id, lote:lote.lote,
      cultura:lote.cultura, variedade:lote.variedade||"", populacao:lote.populacao||0, dataPlantio:lote.dataPlantio||"", previsaoColheita:lote.previsaoColheita,
      data:newColheita.data.trim(), areaHa:parseFloat(newColheita.areaHa)||lote.area, sacas:parseFloat(newColheita.sacas)||0,
      umidade:parseFloat(newColheita.umidade)||0, pmg:parseFloat(newColheita.pmg)||0, obs:newColheita.obs.trim() });
    setNewColheita({tipo:newColheita.tipo,loteId:"",data:"",areaHa:"",sacas:"",umidade:"",pmg:"",obs:""});
    setAddingColheita(false);
  }
  function submitVenda() {
    if (!newVenda.qtd || !newVenda.comprador.trim()) return;
    addRecord(setVendasRecords, { cultura:newVenda.cultura, safra:newVenda.safra.trim()||safraAtiva,
      qtd:parseFloat(newVenda.qtd)||0, unidade:newVenda.unidade, preco:parseFloat(newVenda.preco)||0,
      comprador:newVenda.comprador.trim(), dataEntrega:newVenda.dataEntrega.trim(), dataPagamento:newVenda.dataPagamento.trim(),
      obs:newVenda.obs.trim() });
    setNewVenda({cultura:"Soja",safra:"",qtd:"",unidade:"sc",preco:"",comprador:"",dataEntrega:"",dataPagamento:"",obs:""});
    setAddingVenda(false);
  }
  function submitCompra() {
    if (!newCompra.produto.trim()) return;
    const quantidade = parseFloat(newCompra.quantidade)||0;
    const precoUnitario = parseFloat(newCompra.precoUnitario)||0;
    addRecord(setComprasRecords, { safra:newCompra.safra.trim()||safraAtiva, categoria:newCompra.categoria.trim()||"Adubação",
      produto:newCompra.produto.trim(), unidade:newCompra.unidade, quantidade, precoUnitario,
      valorTotal:precoUnitario*quantidade, fornecedor:newCompra.fornecedor.trim(), data:newCompra.data.trim(), obs:newCompra.obs.trim() });
    setNewCompra({safra:"",produto:"",categoria:"Adubação",unidade:"TN",quantidade:"",precoUnitario:"",fornecedor:"",data:"",obs:""});
    setAddingCompra(false);
  }

  const ImportButton = ({label, onFile, color}) => {
    const inputRef = useRef(null);
    return (
      <>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}}
          onChange={e=>{ const f=e.target.files[0]; if (f) onFile(f); e.target.value=""; }} />
        <button onClick={()=>inputRef.current.click()}
          style={{padding:"6px 14px",background:color||"#37474f",border:"none",borderRadius:6,color:"#fff",fontSize:11,cursor:"pointer"}}>
          📥 {label}
        </button>
      </>
    );
  };

  const RecEditCell = ({recKey,field,value,onCommit,type="text",align}) => {
    const editKey = recKey+"|"+field;
    const isEd = editingRecordCell===editKey;
    if (isEd) return (
      <input autoFocus type={type} defaultValue={value} step={type==="number"?"any":undefined}
        style={{width:"100%",padding:"3px 6px",fontSize:12,border:"2px solid #90a4ae",borderRadius:4}}
        onBlur={e=>{onCommit(e.target.value);setEditingRecordCell(null);}}
        onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingRecordCell(null);}}/>
    );
    return (
      <span onClick={()=>setEditingRecordCell(editKey)} style={{cursor:"pointer",display:"block",textAlign:align||"left",minWidth:30}} title="Clique para editar">
        {value===""||value==null?<span style={{color:"#ccc"}}>—</span>:value}
        <span style={{fontSize:8,color:"#bbb",marginLeft:4}}>✏</span>
      </span>
    );
  };

  const EditCell = ({catIdx,prodIdx,field,type="number",value}) => {
    const isEd = editingCell?.catIdx===catIdx&&editingCell?.prodIdx===prodIdx&&editingCell?.field===field;
    if (isEd) return (
      <input autoFocus type={type} defaultValue={value} step="any"
        style={{width:"100%",padding:"3px 6px",fontSize:12,border:"2px solid "+colors.badge,borderRadius:4,background:colors.light}}
        onBlur={e=>{updateField(catIdx,prodIdx,field,e.target.value);setEditingCell(null);}}
        onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingCell(null);}}/>
    );
    return <span onClick={()=>setEditingCell({catIdx,prodIdx,field})} style={{cursor:"pointer",display:"block",minWidth:30}} title="Clique para editar">{value||<span style={{color:"#ccc"}}>—</span>}<span style={{fontSize:8,color:"#bbb",marginLeft:2}}>✏</span></span>;
  };

  // ── PDF print helper ──
  function printView(title) {
    window.print();
  }

  // ── NAV ──
  const isCotView = appView.startsWith("cot_");
  const navBg = appView==="dashboard" ? "#1a5c2e" : isCotView ? "#0d1e36" : appView.startsWith("prog_inv")||appView.startsWith("resumo_inv") ? "#2c1810" : colors.bg;

  const MAIN_TABS = [
    { id:"dashboard",      label:"Dashboard",           icon:"📊", group:null },
    { id:"prog_verao",     label:"Verão",                icon:"🌱", group:"Programação" },
    { id:"prog_inv",       label:"Inverno",               icon:"🌾", group:"Programação" },
    { id:"resumo_verao",   label:"Resumo Verão",          icon:"📈", group:"Resumos" },
    { id:"resumo_inv",     label:"Resumo Inverno",        icon:"📈", group:"Resumos" },
    { id:"cot_verao_adub", label:"Cot. Adub. Verão",      icon:"🌱", group:"Cotação" },
    { id:"cot_verao_sem",  label:"Cot. Sementes Verão",   icon:"🌾", group:"Cotação" },
    { id:"cot_verao_ins",  label:"Cot. Insumos Verão",    icon:"💰", group:"Cotação" },
    { id:"cot_inv_adub",   label:"Cot. Adub. Inverno",    icon:"🌱", group:"Cotação" },
    { id:"cot_inv_sem",    label:"Cot. Sementes Inverno", icon:"🌾", group:"Cotação" },
    { id:"cot_inv_ins",    label:"Cot. Insumos Inverno",  icon:"💰", group:"Cotação" },
    { id:"plan_verao",     label:"Plano Verão",           icon:"🗺️", group:"Planejamento" },
    { id:"plan_inv",       label:"Plano Inverno",         icon:"🗺️", group:"Planejamento" },
    { id:"ts_verao",       label:"TS / Kit Sulco Verão",  icon:"🌾", group:"Planejamento" },
    { id:"ts_inv",         label:"TS / Kit Sulco Inverno",icon:"🌾", group:"Planejamento" },
    { id:"colheita",       label:"Colheita",              icon:"🌾", group:null },
    { id:"vendas",         label:"Vendas",                icon:"💰", group:null },
    { id:"compras",        label:"Compras",               icon:"🛒", group:null },
    { id:"fornecedores",   label:"Fornecedores",          icon:"👥", group:null },
    { id:"safras",         label:"Safras",                icon:"🗂️", group:null },
    { id:"backup",         label:"Backup",                icon:"💾", group:null },
  ];

  // ── Set cotContext when entering cot views ──
  useEffect(() => {
    if (appView==="cot_verao_adub") setCotContext({safra:"verao",tipo:"adub"});
    else if (appView==="cot_verao_ins") setCotContext({safra:"verao",tipo:"ins"});
    else if (appView==="cot_verao_sem") setCotContext({safra:"verao",tipo:"sem"});
    else if (appView==="cot_inv_adub") setCotContext({safra:"inv",tipo:"adub"});
    else if (appView==="cot_inv_ins") setCotContext({safra:"inv",tipo:"ins"});
    else if (appView==="cot_inv_sem") setCotContext({safra:"inv",tipo:"sem"});
    if (appView.startsWith("cot_")) { setCotScreen("login"); setCotRole(null); }
  }, [appView]);

  const tintColor = isCotView ? "10,22,40" : appView.includes("inv") ? "26,15,0" : "240,244,248";
  const tintAlpha = isCotView || appView.includes("inv") ? 0.82 : 0.86;

  return (
    <div style={{minHeight:"100vh",fontFamily:"system-ui,sans-serif"}}>
      {/* Foto de fundo fixa, com um véu semi-transparente por cima (cor muda por seção) para manter a leitura */}
      <div style={{position:"fixed",inset:0,zIndex:-1,
        backgroundImage:"url('images/bg-soja.jpg')",backgroundSize:"cover",backgroundPosition:"center"}}/>
      <div style={{position:"fixed",inset:0,zIndex:-1,background:`rgba(${tintColor},${tintAlpha})`}}/>
      <div style={{minHeight:"100vh"}}>

      {/* ── TOP NAV ── */}
      <div style={{background:navBg,color:"#fff",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={()=>setSidebarOpen(true)} aria-label="Abrir menu"
              style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:6,color:"#fff",width:34,height:34,fontSize:17,cursor:"pointer"}}>☰</button>
            <span style={{fontSize:17,fontWeight:800,letterSpacing:1}}>🌿 GC Agro</span>
            <span style={{fontSize:10,opacity:0.6,background:"rgba(255,255,255,0.1)",padding:"2px 8px",borderRadius:10}}>{safraAtiva}</span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {(appView==="prog_verao"||appView==="prog_inv") && (
              <button onClick={gerarCotacao} style={{padding:"6px 12px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>📋 Gerar Cotação</button>
            )}
            <button onClick={()=>printView(appView)} style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,color:"#fff",fontSize:11,cursor:"pointer"}}>📄 PDF</button>
          </div>
        </div>
        {gerarCotMsg && (
          <div style={{padding:"6px 16px",background:"rgba(46,125,50,0.9)",color:"#fff",fontSize:11,textAlign:"center"}}>
            ✓ Cotação atualizada: {gerarCotMsg.adub} adubo(s), {gerarCotMsg.sem} semente(s) e {gerarCotMsg.ins} insumo(s) novos enviados para a cotação.
          </div>
        )}
        {/* Culture sub-tabs for prog views */}
        {(appView==="prog_verao"||appView==="prog_inv") && (
          <div style={{display:"flex",gap:4,padding:"4px 16px 6px",overflowX:"auto"}}>
            {Object.entries(data).map(([nome,c])=>(
              <div key={nome} style={{display:"flex",alignItems:"center",gap:2}}>
                <button onClick={()=>setActiveCulture(nome)}
                  style={{padding:"4px 12px",background:activeCulture===nome?"rgba(255,255,255,0.25)":"transparent",
                    border:"1px solid rgba(255,255,255,0.3)",borderRadius:16,color:"#fff",fontSize:11,
                    fontWeight:activeCulture===nome?700:400,cursor:"pointer",
                    opacity:c.ativo?1:0.4}}>
                  {nome} {c.ativo?"":"(inativo)"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SIDEBAR (gaveta) ── */}
      {sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:290}}/>
      )}
      <div style={{position:"fixed",top:0,left:0,bottom:0,width:270,background:"#0d1f14",zIndex:291,
          transform:sidebarOpen?"translateX(0)":"translateX(-105%)",transition:"transform 0.25s ease",
          overflowY:"auto",boxShadow:"4px 0 24px rgba(0,0,0,0.35)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
          <span style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:1}}>🌿 GC Agro</span>
          <button onClick={()=>setSidebarOpen(false)} aria-label="Fechar menu"
            style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,color:"#fff",width:30,height:30,fontSize:15,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"10px 10px 24px"}}>
          {MAIN_TABS.map((t,i)=>{
            const prevGroup = i>0 ? MAIN_TABS[i-1].group : undefined;
            const showHeader = t.group && t.group!==prevGroup;
            const active = appView===t.id;
            return (
              <div key={t.id}>
                {showHeader && <div style={{padding:"14px 10px 4px",fontSize:10,letterSpacing:2,textTransform:"uppercase",color:"#5a8a6a"}}>{t.group}</div>}
                <button onClick={()=>{setAppView(t.id);setSidebarOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",padding:"10px 12px",marginBottom:2,
                    background:active?"rgba(255,255,255,0.14)":"transparent",border:"none",borderRadius:8,
                    color:"#fff",fontSize:13,fontWeight:active?700:400,cursor:"pointer"}}>
                  <span style={{fontSize:15}}>{t.icon}</span><span>{t.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DASHBOARD
      ══════════════════════════════════════════════════════ */}
      {appView==="dashboard" && (()=>{
        const culturasVerao = summaryVerao.filter(c=>c.ativo);
        const culturasInverno = summaryInverno.filter(c=>c.ativo);
        const areaTotal = culturasVerao.reduce((s,c)=>s+c.area,0) + culturasInverno.reduce((s,c)=>s+c.area,0);
        const maxAreaVerao = Math.max(1, ...culturasVerao.map(c=>c.area), 0);
        const maxAreaInverno = Math.max(1, ...culturasInverno.map(c=>c.area), 0);
        const NAV_CARDS = [
          { id:"prog_verao",  label:"Programação Verão",   icon:"🌱", color:"#1a5c2e" },
          { id:"prog_inv",    label:"Programação Inverno", icon:"🌾", color:"#5c4a00" },
          { id:"plan_verao",  label:"Planejamento Verão",  icon:"🗺️", color:"#1565C0" },
          { id:"plan_inv",    label:"Planejamento Inverno",icon:"🗺️", color:"#1565C0" },
          { id:"colheita",    label:"Colheita",            icon:"🌾", color:"#2e7d32" },
          { id:"vendas",      label:"Vendas",              icon:"💰", color:"#1565C0" },
          { id:"compras",     label:"Compras",             icon:"🛒", color:"#00695c" },
          { id:"fornecedores",label:"Fornecedores",        icon:"👥", color:"#1565C0" },
          { id:"safras",      label:"Safras",              icon:"🗂️", color:"#37474f" },
          { id:"backup",      label:"Backup",              icon:"💾", color:"#455a64" },
        ];

        return (
          <div style={{maxWidth:1200,margin:"0 auto",padding:"16px"}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>Olá! 👋</div>
              <div style={{fontSize:13,color:"#667"}}>Resumo da safra {safraAtiva}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Área total (ativas)</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1a3a1a"}}>{fmtN(areaTotal,1)} ha</div>
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Custo insumos (Verão+Inv.)</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1a3a1a"}}>{fmt(refInsumosSafraAtiva)}</div>
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Colhido</div>
                <div style={{fontSize:22,fontWeight:800,color:"#2e7d32"}}>{fmtN(colheitaTotais.totalSacas,1)} sc</div>
                <div style={{fontSize:11,color:"#999"}}>{fmtN(colheitaTotais.media,1)} sc/ha média</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#1a3a1a",marginBottom:12}}>🌱 Área — Verão</div>
                {culturasVerao.length===0 && <div style={{fontSize:12,color:"#bbb"}}>Nenhuma cultura ativa.</div>}
                {culturasVerao.map(c=>{
                  const cc = CULTURE_COLORS_VERAO[c.name]||{bg:"#546e7a"};
                  const pct = (c.area/maxAreaVerao)*100;
                  return (
                    <div key={c.name} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{fontWeight:600,color:"#333"}}>{c.name}</span><span style={{color:"#888"}}>{fmtN(c.area,1)} ha</span>
                      </div>
                      <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:cc.bg,borderRadius:4}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{background:"#fff",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:13,fontWeight:700,color:"#5c4a00",marginBottom:12}}>🌾 Área — Inverno</div>
                {culturasInverno.length===0 && <div style={{fontSize:12,color:"#bbb"}}>Nenhuma cultura ativa.</div>}
                {culturasInverno.map(c=>{
                  const cc = CULTURE_COLORS_INVERNO[c.name]||{bg:"#546e7a"};
                  const pct = (c.area/maxAreaInverno)*100;
                  return (
                    <div key={c.name} style={{marginBottom:10}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{fontWeight:600,color:"#333"}}>{c.name}</span><span style={{color:"#888"}}>{fmtN(c.area,1)} ha</span>
                      </div>
                      <div style={{height:8,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:cc.bg,borderRadius:4}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{fontSize:13,fontWeight:700,color:"#1a3a1a",marginBottom:10}}>Acesso rápido</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
              {NAV_CARDS.map(nc=>(
                <button key={nc.id} onClick={()=>setAppView(nc.id)}
                  style={{background:"#fff",border:"none",borderRadius:12,padding:"16px 14px",textAlign:"left",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                  <div style={{fontSize:22,marginBottom:6}}>{nc.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:nc.color}}>{nc.label}</div>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          PROGRAMAÇÃO
      ══════════════════════════════════════════════════════ */}
      {(appView==="prog_verao"||appView==="prog_inv") && (
        <div style={{maxWidth:1100,margin:"0 auto",padding:"16px"}}>
          {/* Culture header */}
          <div style={{background:"#fff",borderRadius:10,padding:"14px 18px",marginBottom:14,display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:10,height:32,background:colors.bg,borderRadius:3}}/>
              <div>
                <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1}}>Cultura</div>
                <div style={{fontSize:20,fontWeight:800,color:colors.bg}}>{activeCulture}</div>
              </div>
            </div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}>
              <div style={{fontSize:11,color:"#888"}}>Área total</div>
              {editingArea
                ? <input autoFocus type="number" defaultValue={culture.area} step="0.5"
                    style={{fontSize:17,fontWeight:700,color:colors.bg,border:"2px solid "+colors.badge,borderRadius:4,width:90,padding:"2px 6px"}}
                    onBlur={e=>{updateArea(e.target.value);setEditingArea(false);}}
                    onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
                : <div style={{fontSize:18,fontWeight:700,color:colors.bg,cursor:"pointer"}} onClick={()=>setEditingArea(true)}>{fmtN(culture.area)} ha ✏</div>
              }
            </div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}>
              <div style={{fontSize:11,color:"#888"}}>Kg semente/ha</div>
              {editingKgSemente
                ? <input autoFocus type="number" defaultValue={culture.kgSemente||0} step="0.5"
                    style={{fontSize:17,fontWeight:700,color:colors.bg,border:"2px solid "+colors.badge,borderRadius:4,width:70,padding:"2px 6px"}}
                    onBlur={e=>{updateKgSemente(e.target.value);setEditingKgSemente(false);}}
                    onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
                : <div style={{fontSize:18,fontWeight:700,color:colors.bg,cursor:"pointer"}} onClick={()=>setEditingKgSemente(true)} title="Usado no cálculo de quantidade do Tratamento de Sementes (TS)">{fmtN(culture.kgSemente||0)} ✏</div>
              }
            </div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}><div style={{fontSize:11,color:"#888"}}>Insumos/ha</div><div style={{fontSize:16,fontWeight:700,color:colors.bg}}>{fmt(culture.area>0?insumoTotal/culture.area:0)}</div></div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}><div style={{fontSize:11,color:"#888"}}>Custo total/ha</div><div style={{fontSize:16,fontWeight:700,color:colors.bg}}>{fmt(totalHa)}</div></div>
            <div style={{marginLeft:"auto",display:"flex",gap:8}}>
              <button onClick={()=>setShowImportModal(true)} style={{padding:"6px 12px",background:"#e3f2fd",border:"none",borderRadius:6,color:"#1565C0",fontSize:11,cursor:"pointer"}}>📥 Importar Produtos</button>
              <button onClick={()=>toggleCultura(activeCulture)} style={{padding:"6px 12px",background:culture.ativo?"#ffebee":"#e8f5e9",border:"none",borderRadius:6,color:culture.ativo?"#c62828":"#2e7d32",fontSize:11,cursor:"pointer"}}>
                {culture.ativo?"⏸ Desativar":"▶ Ativar"}
              </button>
              <button onClick={()=>deleteCultura(activeCulture)} style={{padding:"6px 12px",background:"#ffebee",border:"none",borderRadius:6,color:"#c62828",fontSize:11,cursor:"pointer"}}>🗑 Remover</button>
            </div>
          </div>

          {/* Categories */}
          {culture.categories.map((cat,catIdx)=>{
            const isOpen = expandedCats[activeCulture+catIdx]!==false;
            const catTotal = catTotals[catIdx]||0;
            const icon = CAT_ICONS[cat.name]||"📦";
            const showIA = ["Herbicidas - Dessecação e Pós","Fungicidas","Inseticidas"].includes(cat.name);
            const isTS = cat.name === "TS";
            const progHeaders = ["Produto", ...(showIA?["I.A."]:[]), "Dose", ...(isTS?["Kg semente/ha"]:[]), "Área(ha)","Qtd","Fase","Obs","Ref.(R$)","Compra(R$)","Total","R$/ha","Revenda","Venc.",""];
            const addRowFields = ["produto", ...(showIA?["ingrediente_ativo"]:[]), "dose", ...(isTS?["kgHa"]:[]), "area",null,"fase","obs","preco_unit",null,null,null,"revenda","vencimento"];
            return (
              <div key={catIdx} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:10}}>
                <div onClick={()=>toggleCat(catIdx)} style={{background:colors.bg,color:"#fff",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span>{icon}</span><span style={{fontWeight:700,fontSize:13}}>{cat.name}</span>
                    <span style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"1px 7px",fontSize:10}}>{cat.products.length}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:13,fontWeight:700}}>{fmt(catTotal)}</span>
                    <span style={{fontSize:11,opacity:0.7}}>{culture.area>0?fmt(catTotal/culture.area):"-"}/ha</span>
                    <span>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                {isOpen&&(
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:colors.light}}>
                          {progHeaders.map(h=>(
                            <th key={h} style={{padding:"6px 8px",textAlign:h==="Produto"||h==="I.A."||h==="Obs"?"left":"right",color:colors.accent,fontSize:9,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap",borderBottom:"1px solid "+colors.badge+"44"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cat.products.map((p,prodIdx)=>{
                          const preco = p.preco_compra||p.preco_unit;
                          const qtd = isTS ? calcQtdTS(p,culture) : (p.dose>0?p.dose*p.area:p.area);
                          const total = qtd*preco;
                          const bg = prodIdx%2===0?"#fff":"#fafafa";
                          const comprado = p.preco_compra!=null;
                          return (
                            <tr key={prodIdx} style={{background:bg}}>
                              <td style={{padding:"6px 8px",fontWeight:600}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="produto" type="text" value={p.produto}/></td>
                              {showIA && <td style={{padding:"6px 8px",color:"#666",fontSize:10}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="ingrediente_ativo" type="text" value={p.ingrediente_ativo}/></td>}
                              <td style={{padding:"6px 8px",textAlign:"right"}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="dose" value={fmtN(p.dose,1)}/></td>
                              {isTS && <td style={{padding:"6px 8px",textAlign:"right"}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="kgHa" value={fmtN(p.kgHa||culture.kgSemente||0,1)}/></td>}
                              <td style={{padding:"6px 8px",textAlign:"right"}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="area" value={fmtN(p.area,1)}/></td>
                              <td style={{padding:"6px 8px",textAlign:"right",color:"#555"}}>{fmtN(qtd,1)}</td>
                              <td style={{padding:"6px 8px",textAlign:"right",color:"#777"}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="fase" type="text" value={p.fase}/></td>
                              <td style={{padding:"6px 8px",color:"#888",maxWidth:120}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="obs" type="text" value={p.obs}/></td>
                              <td style={{padding:"6px 8px",textAlign:"right",color:"#888",textDecoration:comprado?"line-through":""}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="preco_unit" value={fmt(p.preco_unit)}/></td>
                              <td style={{padding:"6px 8px",textAlign:"right",fontWeight:comprado?700:400,color:comprado?"#2e7d32":"#bbb"}}>{comprado?fmt(p.preco_compra):"—"}</td>
                              <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:comprado?"#2e7d32":colors.bg}}>{fmt(total)}</td>
                              <td style={{padding:"6px 8px",textAlign:"right",color:"#666"}}>{culture.area>0?fmt(total/culture.area):"-"}</td>
                              <td style={{padding:"6px 8px"}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="revenda" type="text" value={p.revenda}/></td>
                              <td style={{padding:"6px 8px",color:"#888",fontSize:10}}><EditCell catIdx={catIdx} prodIdx={prodIdx} field="vencimento" type="text" value={p.vencimento}/></td>
                              <td style={{padding:"6px 4px",textAlign:"center"}}>
                                <button onClick={()=>{if(window.confirm(`Remover "${p.produto}"?`))deleteProduct(catIdx,prodIdx);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e57373",fontSize:14}}>✕</button>
                              </td>
                            </tr>
                          );
                        })}
                        {addingTo?.catIdx===catIdx?(
                          <tr style={{background:"#fffde7"}}>
                            {addRowFields.map((field,i)=>(
                              <td key={i} style={{padding:"5px 6px"}}>
                                {field?(<input placeholder={field} type={["dose","kgHa","area","preco_unit"].includes(field)?"number":"text"} step="any"
                                  value={newProd[field]||""} onChange={e=>setNewProd(p=>({...p,[field]:e.target.value}))}
                                  style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/>)
                                :<span style={{color:"#bbb",fontSize:10}}>-</span>}
                              </td>
                            ))}
                            <td style={{padding:"5px 6px"}}>
                              <button onClick={()=>addProduct(catIdx)} style={{background:colors.bg,color:"#fff",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:12,marginRight:3}}>✓</button>
                              <button onClick={()=>setAddingTo(null)} style={{background:"#eee",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:12}}>✕</button>
                            </td>
                          </tr>
                        ):(
                          <tr><td colSpan={progHeaders.length} style={{padding:"5px 10px"}}>
                            <button onClick={()=>{setAddingTo({catIdx});setNewProd({produto:"",dose:"",kgHa:"",area:culture.area,fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});}}
                              style={{background:"none",border:"1px dashed "+colors.badge,color:colors.accent,borderRadius:5,padding:"3px 12px",cursor:"pointer",fontSize:11}}>+ Adicionar produto</button>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Op costs */}
          <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginTop:12}}>
            <div style={{background:"#37474f",color:"#fff",padding:"10px 16px",fontWeight:700,fontSize:13}}>🚜 Custos Operacionais (R$/ha)</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10,padding:14}}>
              {Object.entries(culture.op_costs||{}).map(([key,val])=>(
                <div key={key} style={{background:"#f5f5f5",borderRadius:7,padding:"9px 14px",minWidth:140}}>
                  <div style={{fontSize:10,color:"#888",marginBottom:3}}>{key}</div>
                  {editingOp===key
                    ?<input autoFocus type="number" defaultValue={val} step="10"
                        style={{fontSize:16,fontWeight:700,color:"#37474f",border:"2px solid #546e7a",borderRadius:4,width:90,padding:"2px 5px"}}
                        onBlur={e=>{updateOpCost(key,e.target.value);setEditingOp(null);}}
                        onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
                    :<div style={{fontSize:16,fontWeight:700,color:"#37474f",cursor:"pointer"}} onClick={()=>setEditingOp(key)}>{fmt(val)} <span style={{fontSize:10,color:"#bbb"}}>✏</span></div>
                  }
                </div>
              ))}
              <div style={{background:"#37474f",color:"#fff",borderRadius:7,padding:"9px 14px",minWidth:140}}>
                <div style={{fontSize:10,opacity:0.7,marginBottom:3}}>OPERACIONAL TOTAL</div>
                <div style={{fontSize:16,fontWeight:700}}>{fmt(opTotal)}</div>
              </div>
              <div style={{background:colors.bg,color:"#fff",borderRadius:7,padding:"9px 14px",minWidth:160}}>
                <div style={{fontSize:10,opacity:0.7,marginBottom:3}}>CUSTO TOTAL/ha</div>
                <div style={{fontSize:18,fontWeight:700}}>{fmt(totalHa)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          RESUMO
      ══════════════════════════════════════════════════════ */}
      {(appView==="resumo_verao"||appView==="resumo_inv") && (()=>{
        const summary = appView==="resumo_verao" ? summaryVerao : summaryInverno;
        const cColors = appView==="resumo_verao" ? CULTURE_COLORS_VERAO : CULTURE_COLORS_INVERNO;
        const cotAdub = appView==="resumo_verao" ? cotVeraoAdub : cotInvAdub;
        const cotIns  = appView==="resumo_verao" ? cotVeraoIns  : cotInvIns;
        const prodAdub = appView==="resumo_verao" ? prodVeraoAdub : prodInvAdub;
        const prodIns  = appView==="resumo_verao" ? prodVeraoIns  : prodInvIns;

        // Melhor preço por produto de cada cotação
        function melhorPreco(produtos, cotacoes) {
          const map = {};
          produtos.forEach(p => {
            const key = p.nome.toLowerCase();
            const vals = Object.values(cotacoes).map(pr=>pr[key]).filter(v=>v>0);
            map[key] = vals.length ? Math.min(...vals) : null;
          });
          return map;
        }
        const melhAdub = melhorPreco(prodAdub, cotAdub);
        const melhIns  = melhorPreco(prodIns, cotIns);

        const totalRef = summary.filter(c=>c.ativo).reduce((s,c)=>s+c.insumos,0);
        const totalArea = summary.filter(c=>c.ativo).reduce((s,c)=>s+c.area,0);

        return (
          <div style={{maxWidth:1100,margin:"0 auto",padding:"16px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Área Total</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1a3a1a"}}>{fmtN(totalArea)} ha</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Total Insumos (ref.)</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1a3a1a"}}>{fmt(totalRef)}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Média/ha</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1a3a1a"}}>{totalArea>0?fmt(totalRef/totalArea):"-"}</div>
              </div>
            </div>
            {summary.filter(c=>c.ativo).map(c=>(
              <div key={c.name} style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:14}}>
                <div style={{background:cColors[c.name]?.bg||"#333",color:"#fff",padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:800,fontSize:16}}>{c.name} — {fmtN(c.area)} ha</div>
                  <div style={{fontSize:13,fontWeight:700}}>Total/ha: {fmt(c.total)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,padding:14}}>
                  {c.cats.map(cat=>(
                    <div key={cat.name} style={{background:"#f8f9fa",borderRadius:8,padding:"9px 12px"}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>{cat.name}</div>
                      <div style={{fontSize:14,fontWeight:700,color:cColors[c.name]?.bg||"#333"}}>{fmt(cat.total)}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>{c.area>0?fmt(cat.total/c.area):"-"}/ha</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          PLANEJAMENTO DE CAMPO
      ══════════════════════════════════════════════════════ */}
      {appView==="plan_verao" && <PlanejamentoTable data={planVerao} setData={setPlanVerao} tipo="verao" cultureColors={CULTURE_COLORS_VERAO} onGerarCotacao={gerarCotacaoSementesDoPlano} onAtualizarCusto={atualizarCustoSementesDoPlano} obs={planObsVerao} setObs={setPlanObsVerao}/>}
      {appView==="plan_inv" && <PlanejamentoTable data={planSafrinha} setData={setPlanSafrinha} tipo="inv" cultureColors={CULTURE_COLORS_INVERNO} onGerarCotacao={gerarCotacaoSementesDoPlano} onAtualizarCusto={atualizarCustoSementesDoPlano} obs={planObsSafrinha} setObs={setPlanObsSafrinha}/>}
      {appView==="ts_verao" && <TSKitSulcoView data={tsVerao} setData={setTsVerao} titulo="TS / Kit Sulco — Safra Verão" cor="#1a5c2e" cultureColors={CULTURE_COLORS_VERAO}/>}
      {appView==="ts_inv" && <TSKitSulcoView data={tsSafrinha} setData={setTsSafrinha} titulo="TS / Kit Sulco — Safrinha/Inverno" cor="#5c4a00" cultureColors={CULTURE_COLORS_INVERNO}/>}

      {/* ══════════════════════════════════════════════════════
          COLHEITA / PRODUTIVIDADE
      ══════════════════════════════════════════════════════ */}
      {appView==="colheita" && (()=>{
        const jaTem = new Set(colheitaRecords.filter(r=>r.safra===safraAtiva).map(r=>r.loteId));
        const faltantes = [
          ...planVerao.map(l=>({...l, tipo:"verao"})),
          ...planSafrinha.map(l=>({...l, tipo:"inv"})),
        ].filter(l=>l.lote && l.lote.trim() && !jaTem.has(l.id));
        return (
        <div style={{maxWidth:1200,margin:"0 auto",padding:"16px"}}>
          <div style={{background:"#fff",borderRadius:10,padding:"14px 18px",marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:11,color:"#888",textTransform:"uppercase",letterSpacing:1}}>Área colhida</div>
              <div style={{fontSize:20,fontWeight:800,color:"#2e7d32"}}>{fmtN(colheitaTotais.totalArea,1)} ha</div>
            </div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}>
              <div style={{fontSize:11,color:"#888"}}>Total colhido</div>
              <div style={{fontSize:18,fontWeight:700,color:"#2e7d32"}}>{fmtN(colheitaTotais.totalSacas,1)} sc</div>
            </div>
            <div style={{borderLeft:"1px solid #eee",paddingLeft:16}}>
              <div style={{fontSize:11,color:"#888"}}>Produtividade média</div>
              <div style={{fontSize:18,fontWeight:700,color:"#2e7d32"}}>{fmtN(colheitaTotais.media,1)} sc/ha</div>
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              <ImportButton label="Importar planilha" color="#2e7d32" onFile={handleImportColheita}/>
              <button onClick={()=>setAddingColheita(a=>!a)} style={{padding:"6px 14px",background:"none",border:"1px dashed #2e7d32",color:"#2e7d32",borderRadius:6,fontSize:11,cursor:"pointer"}}>+ Registro</button>
            </div>
          </div>
          {faltantes.length>0 && (
            <div style={{background:"#e3f2fd",border:"1px solid #90caf9",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12,color:"#1565C0",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              📋 {faltantes.length} lote(s) do Planejamento desta safra ainda sem registro de colheita.
              <button onClick={importarTodosLotesPlanejamento} style={{padding:"6px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>📥 Importar todos os lotes</button>
            </div>
          )}
          {importMsg?.modulo==="colheita" && <div style={{background:"#fffde7",border:"1px solid #fbc02d",borderRadius:8,padding:"8px 14px",marginBottom:10,fontSize:12,color:"#7a5c00"}}>{importMsg.texto}</div>}
          <div style={{fontSize:11,color:"#999",marginBottom:8}}>O lote é resolvido pelo nome cadastrado no Planejamento de Campo (Verão/Inverno), de onde vêm cultura, área e previsão de colheita. Colunas reconhecidas na importação: lote, cultura (opcional, sobrepõe o plano), data, área_ha (opcional), sacas (ou kg), umidade, pmg, obs.</div>

          <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#e8f5e9"}}>
                  {["Temporada","Lote","Cultura","Variedade","População","Data Plantio","Data","Área(ha)","Sacas","Sc/ha","PMG(g)","Umid.(%)","Prev. Colheita","Obs",""].map(h=>(
                    <th key={h} style={{padding:"7px 9px",textAlign:["Lote","Cultura","Variedade","Obs"].includes(h)?"left":"right",color:"#2e7d32",fontSize:10,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid #a5d6a7",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colheitaRecords.map((r,i)=>{
                  const prod = r.areaHa>0 ? r.sacas/r.areaHa : 0;
                  const bg = i%2===0?"#fff":"#fafafa";
                  return (
                    <tr key={r.id} style={{background:bg}}>
                      <td style={{padding:"6px 9px",fontSize:11,color:r.tipo==="inv"?"#5c4a00":"#1a5c2e",fontWeight:600}}>{r.tipo==="inv"?"Inverno":"Verão"}</td>
                      <td style={{padding:"6px 9px",fontWeight:600}}><RecEditCell recKey={"col|"+r.id} field="lote" value={r.lote} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"lote",v)}/></td>
                      <td style={{padding:"6px 9px"}}><RecEditCell recKey={"col|"+r.id} field="cultura" value={r.cultura} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"cultura",v)}/></td>
                      <td style={{padding:"6px 9px",color:"#555"}}>{r.variedade||"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"#888",fontSize:11}}>{r.populacao||"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"#888",fontSize:11}}>{r.dataPlantio||"—"}</td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"col|"+r.id} field="data" align="right" value={r.data} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"data",v)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"col|"+r.id} field="areaHa" type="number" align="right" value={fmtN(r.areaHa,1)} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"areaHa",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"col|"+r.id} field="sacas" type="number" align="right" value={fmtN(r.sacas,1)} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"sacas",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:"#2e7d32"}}>{fmtN(prod,1)}</td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"col|"+r.id} field="pmg" type="number" align="right" value={fmtN(r.pmg||0,1)} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"pmg",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"col|"+r.id} field="umidade" type="number" align="right" value={fmtN(r.umidade,1)} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"umidade",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"#888",fontSize:11}}>{r.previsaoColheita||"—"}</td>
                      <td style={{padding:"6px 9px",color:"#888"}}><RecEditCell recKey={"col|"+r.id} field="obs" value={r.obs} onCommit={v=>updateRecordField(setColheitaRecords,r.id,"obs",v)}/></td>
                      <td style={{padding:"6px 4px",textAlign:"center"}}>
                        <button onClick={()=>{if(window.confirm("Remover registro?"))deleteRecord(setColheitaRecords,r.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e57373",fontSize:14}}>✕</button>
                      </td>
                    </tr>
                  );
                })}
                {addingColheita && (
                  <tr style={{background:"#fffde7"}}>
                    <td style={{padding:"5px 6px"}}>
                      <select value={newColheita.tipo} onChange={e=>setNewColheita(p=>({...p,tipo:e.target.value,loteId:""}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}>
                        <option value="verao">Verão</option>
                        <option value="inv">Inverno</option>
                      </select>
                    </td>
                    <td style={{padding:"5px 6px"}} colSpan={2}>
                      <select value={newColheita.loteId} onChange={e=>{
                          const lote = lotesDisponiveis.find(l=>l.id===e.target.value);
                          setNewColheita(p=>({...p,loteId:e.target.value,areaHa:lote?lote.area:""}));
                        }} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}>
                        <option value="">Selecione o lote...</option>
                        {lotesDisponiveis.map(l=><option key={l.id} value={l.id}>{l.lote} — {l.cultura}</option>)}
                      </select>
                    </td>
                    {(()=>{ const loteSel = lotesDisponiveis.find(l=>l.id===newColheita.loteId); return (<>
                      <td style={{padding:"5px 6px",fontSize:11,color:"#888"}}>{loteSel?.variedade||"—"}</td>
                      <td style={{padding:"5px 6px",textAlign:"right",fontSize:11,color:"#888"}}>{loteSel?.populacao||"—"}</td>
                      <td style={{padding:"5px 6px",textAlign:"right",fontSize:11,color:"#888"}}>{loteSel?.dataPlantio||"—"}</td>
                    </>); })()}
                    <td style={{padding:"5px 6px"}}><input placeholder="Data" value={newColheita.data} onChange={e=>setNewColheita(p=>({...p,data:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td style={{padding:"5px 6px"}}><input placeholder="Área" type="number" step="any" value={newColheita.areaHa} onChange={e=>setNewColheita(p=>({...p,areaHa:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td style={{padding:"5px 6px"}}><input placeholder="Sacas" type="number" step="any" value={newColheita.sacas} onChange={e=>setNewColheita(p=>({...p,sacas:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td/>
                    <td style={{padding:"5px 6px"}}><input placeholder="PMG(g)" type="number" step="any" value={newColheita.pmg} onChange={e=>setNewColheita(p=>({...p,pmg:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td style={{padding:"5px 6px"}}><input placeholder="Umid.%" type="number" step="any" value={newColheita.umidade} onChange={e=>setNewColheita(p=>({...p,umidade:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td/>
                    <td style={{padding:"5px 6px"}}><input placeholder="Obs" value={newColheita.obs} onChange={e=>setNewColheita(p=>({...p,obs:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                    <td style={{padding:"5px 6px"}}>
                      <button onClick={submitColheita} style={{background:"#2e7d32",color:"#fff",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:12,marginRight:3}}>✓</button>
                      <button onClick={()=>setAddingColheita(false)} style={{background:"#eee",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:12}}>✕</button>
                    </td>
                  </tr>
                )}
                {colheitaRecords.length===0 && !addingColheita && (
                  <tr><td colSpan={15} style={{padding:"20px",textAlign:"center",color:"#bbb",fontSize:12}}>Nenhum registro de colheita ainda. Importe uma planilha ou adicione manualmente.</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          VENDAS DE GRÃOS
      ══════════════════════════════════════════════════════ */}
      {appView==="vendas" && (()=>{
        const CULTS = ["Soja","Milho","Feijão","Trigo","Sorgo"];
        const porCultura = vendasRecords.filter(v=>v.cultura===vendaCulturaTab);
        const filtradas = porCultura.filter(v=>vendaFiltroSafra==="Todas"||v.safra===vendaFiltroSafra);
        const safrasDaCultura = ["Todas",...[...new Set(porCultura.map(v=>v.safra).filter(Boolean))].sort()];
        const totalVendido = filtradas.reduce((s,v)=>s+(v.qtd||0)*(v.preco||0),0);
        const totalQtd = filtradas.reduce((s,v)=>s+(v.qtd||0),0);
        const cc = CULTURE_COLORS_VERAO[vendaCulturaTab] || CULTURE_COLORS_INVERNO[vendaCulturaTab] || {bg:"#1565C0"};
        return (
          <div style={{maxWidth:1100,margin:"0 auto",padding:"16px"}}>
            <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
              {CULTS.map(c=>(
                <button key={c} onClick={()=>{setVendaCulturaTab(c);setVendaFiltroSafra("Todas");}}
                  style={{padding:"7px 16px",background:vendaCulturaTab===c?cc.bg:"#fff",border:`1px solid ${vendaCulturaTab===c?cc.bg:"#ddd"}`,borderRadius:20,color:vendaCulturaTab===c?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:vendaCulturaTab===c?700:400}}>{c}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
              <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Total vendido ({vendaCulturaTab})</div>
                <div style={{fontSize:18,fontWeight:800,color:cc.bg}}>{fmt(totalVendido)}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Total quantidade</div>
                <div style={{fontSize:18,fontWeight:800,color:cc.bg}}>{fmtN(totalQtd,1)}</div>
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:11,color:"#888"}}>Preço médio</div>
                <div style={{fontSize:18,fontWeight:800,color:cc.bg}}>{totalQtd>0?fmt(totalVendido/totalQtd):"—"}</div>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
              <select value={vendaFiltroSafra} onChange={e=>setVendaFiltroSafra(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12}}>
                {safrasDaCultura.map(s=><option key={s}>{s}</option>)}
              </select>
              <button onClick={()=>{setNewVenda(p=>({...p,cultura:vendaCulturaTab}));setAddingVenda(a=>!a);}}
                style={{padding:"6px 14px",background:"none",border:`1px dashed ${cc.bg}`,color:cc.bg,borderRadius:6,fontSize:11,cursor:"pointer"}}>+ Nova Venda</button>
            </div>

            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:cc.light||"#e3f2fd"}}>
                    {["Safra","Qtd","Unid.","R$/Unid.","Total","Comprador","Dt.Entrega","Dt.Pgto","Obs",""].map(h=>(
                      <th key={h} style={{padding:"7px 9px",textAlign:["Comprador","Obs"].includes(h)?"left":"right",color:cc.accent||cc.bg,fontSize:10,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid #0002",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((v,i)=>(
                    <tr key={v.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"6px 9px",color:"#888",fontSize:11}}><RecEditCell recKey={"venda|"+v.id} field="safra" value={v.safra} onCommit={val=>updateRecordField(setVendasRecords,v.id,"safra",val)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"venda|"+v.id} field="qtd" type="number" align="right" value={fmtN(v.qtd,1)} onCommit={val=>updateRecordField(setVendasRecords,v.id,"qtd",val,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right",color:"#888"}}><RecEditCell recKey={"venda|"+v.id} field="unidade" value={v.unidade} onCommit={val=>updateRecordField(setVendasRecords,v.id,"unidade",val)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"venda|"+v.id} field="preco" type="number" align="right" value={fmt(v.preco)} onCommit={val=>updateRecordField(setVendasRecords,v.id,"preco",val,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:cc.bg}}>{fmt((v.qtd||0)*(v.preco||0))}</td>
                      <td style={{padding:"6px 9px",fontWeight:600}}><RecEditCell recKey={"venda|"+v.id} field="comprador" value={v.comprador} onCommit={val=>updateRecordField(setVendasRecords,v.id,"comprador",val)}/></td>
                      <td style={{padding:"6px 9px",color:"#888",fontSize:11}}><RecEditCell recKey={"venda|"+v.id} field="dataEntrega" value={v.dataEntrega} onCommit={val=>updateRecordField(setVendasRecords,v.id,"dataEntrega",val)}/></td>
                      <td style={{padding:"6px 9px",color:"#888",fontSize:11}}><RecEditCell recKey={"venda|"+v.id} field="dataPagamento" value={v.dataPagamento} onCommit={val=>updateRecordField(setVendasRecords,v.id,"dataPagamento",val)}/></td>
                      <td style={{padding:"6px 9px",color:"#aaa",fontSize:11}}><RecEditCell recKey={"venda|"+v.id} field="obs" value={v.obs} onCommit={val=>updateRecordField(setVendasRecords,v.id,"obs",val)}/></td>
                      <td style={{padding:"6px 4px",textAlign:"center",whiteSpace:"nowrap"}}>
                        <button onClick={()=>gerarICSVenda(v)} title="Adicionar lembrete de pagamento ao calendário" style={{background:"none",border:"none",cursor:"pointer",color:v.dataPagamento?cc.bg:"#ccc",fontSize:14,marginRight:6}}>📅</button>
                        <button onClick={()=>{if(window.confirm("Remover venda?"))deleteRecord(setVendasRecords,v.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e57373",fontSize:14}}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {addingVenda && (
                    <tr style={{background:"#fffde7"}}>
                      <td style={{padding:"5px 6px"}}><input placeholder={safraAtiva} value={newVenda.safra} onChange={e=>setNewVenda(p=>({...p,safra:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Qtd." type="number" step="any" value={newVenda.qtd} onChange={e=>setNewVenda(p=>({...p,qtd:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3,textAlign:"right"}}/></td>
                      <td style={{padding:"5px 6px"}}>
                        <select value={newVenda.unidade} onChange={e=>setNewVenda(p=>({...p,unidade:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}>
                          <option value="sc">sc</option>
                          <option value="ton">ton</option>
                          <option value="kg">kg</option>
                        </select>
                      </td>
                      <td style={{padding:"5px 6px"}}><input placeholder="R$/Unid." type="number" step="any" value={newVenda.preco} onChange={e=>setNewVenda(p=>({...p,preco:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3,textAlign:"right"}}/></td>
                      <td/>
                      <td style={{padding:"5px 6px"}}><input placeholder="Comprador" value={newVenda.comprador} onChange={e=>setNewVenda(p=>({...p,comprador:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Dt. Entrega" value={newVenda.dataEntrega} onChange={e=>setNewVenda(p=>({...p,dataEntrega:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Dt. Pagamento" value={newVenda.dataPagamento} onChange={e=>setNewVenda(p=>({...p,dataPagamento:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Obs" value={newVenda.obs} onChange={e=>setNewVenda(p=>({...p,obs:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}>
                        <button onClick={submitVenda} style={{background:cc.bg,color:"#fff",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:12,marginRight:3}}>✓</button>
                        <button onClick={()=>setAddingVenda(false)} style={{background:"#eee",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:12}}>✕</button>
                      </td>
                    </tr>
                  )}
                  {filtradas.length===0 && !addingVenda && (
                    <tr><td colSpan={10} style={{padding:"20px",textAlign:"center",color:"#bbb",fontSize:12}}>Nenhuma venda de {vendaCulturaTab} registrada ainda.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          COTAÇÃO
      ══════════════════════════════════════════════════════ */}
      {appView.startsWith("cot_") && (()=>{
        const allPrices = getCotData(cotContext);
        const produtos = getProdutos(cotContext);
        const fornecedores = getFornecedores(cotContext);
        const categorias = [...new Set(produtos.map(p=>p.categoria))];
        const tipoLabel = cotContext?.tipo==="adub" ? "Adubação" : cotContext?.tipo==="sem" ? "Sementes" : "Insumos";
        const safraLabel = cotContext?.safra==="verao" ? "Verão" : "Inverno";
        const isAdub = cotContext?.tipo==="adub";
        const isSem = cotContext?.tipo==="sem";
        const isIns = cotContext?.tipo==="ins";
        const isEditableList = isAdub || isSem || isIns;
        const unitOptions = isAdub ? ["TN","KG"] : isSem ? ["bag","sc"] : isIns ? ["L","KG","doses"] : [];

        if (cotScreen==="login") return (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 52px)"}}>
            <div style={{width:420,background:"#111d35",borderRadius:16,padding:"40px",boxShadow:"0 24px 80px rgba(0,0,0,0.6)",border:"1px solid #1e3a5f"}}>
              <div style={{textAlign:"center",marginBottom:28}}>
                <div style={{fontSize:12,letterSpacing:5,color:"#4a9eff",textTransform:"uppercase",marginBottom:10}}>GC Agro · {safraLabel}</div>
                <div style={{fontSize:24,fontWeight:700,color:"#e8f4fd"}}>Cotação {tipoLabel}</div>
                <div style={{fontSize:12,color:"#5a7a9a",marginTop:6}}>{produtos.length} produtos · {safraAtiva}</div>
              </div>
              <input value={loginInput} onChange={e=>{setLoginInput(e.target.value);setLoginError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleCotLogin()} placeholder="Seu nome ou senha admin"
                style={{width:"100%",padding:"13px 15px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:8,color:"#e8f4fd",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:loginError?8:16}}/>
              {loginError&&<div style={{color:"#ff6b6b",fontSize:12,marginBottom:12}}>{loginError}</div>}
              <button onClick={handleCotLogin} style={{width:"100%",padding:"13px",background:"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Entrar</button>
              <div style={{marginTop:20,padding:14,background:"#0d1e36",borderRadius:8,border:"1px solid #1e3a5f"}}>
                <div style={{fontSize:10,color:"#5a7a9a",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>Fornecedores</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {fornecedores.map((f,i)=>(
                    <span key={i} onClick={()=>{setLoginInput(f.nome);setLoginError("");}}
                      style={{padding:"3px 9px",background:FORN_COLORS[i%8]+"33",border:`1px solid ${FORN_COLORS[i%8]}66`,borderRadius:20,color:FORN_COLORS[i%8],fontSize:10,cursor:"pointer"}}>{f.nome}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

        if (cotScreen==="fornecedor") {
          const color = FORN_COLORS[cotRole.idx%8];
          const fCat = fornCatFilter, setFCat = setFornCatFilter;
          const vencLabels = getVencLabels(cotContext);
          const filled = Object.values(myPrices).filter(v=>v&&(v.v1>0||v.v2>0)).length;
          return (
            <div style={{color:"#e8f4fd"}}>
              <div style={{background:"#111d35",borderBottom:"1px solid #1e3a5f",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:10,color:"#4a9eff",letterSpacing:3,textTransform:"uppercase"}}>Cotação {tipoLabel} · {safraLabel}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#e8f4fd"}}>Fornecedor: <span style={{color}}>{cotRole.name}</span></div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <SyncBadge/>
                  <span style={{fontSize:11,color:"#5a7a9a"}}>{filled}/{produtos.length} preenchidos</span>
                  <button onClick={handleCotSave} style={{padding:"9px 20px",background:cotSaved?"#2e7d32":"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {cotSaved?"✓ Salvo!":"Salvar"}
                  </button>
                  <button onClick={handleCotLogout} style={{padding:"9px 14px",background:"transparent",border:"1px solid #1e3a5f",borderRadius:7,color:"#5a7a9a",fontSize:11,cursor:"pointer"}}>Sair</button>
                </div>
              </div>
              <div style={{margin:"12px 20px 0",padding:"10px 14px",background:"#0d2040",borderLeft:`3px solid ${color}`,borderRadius:4,fontSize:11,color:"#7a9ab8"}}>
                ⚠ Preencha apenas o preço unitário (R$). Os preços dos outros fornecedores são invisíveis para você.
              </div>
              <div style={{padding:"10px 20px 0",display:"flex",gap:6,flexWrap:"wrap"}}>
                {["Todas",...categorias].map(cat=>(
                  <button key={cat} onClick={()=>setFCat(cat)} style={{padding:"5px 12px",background:fCat===cat?color:"#111d35",border:`1px solid ${fCat===cat?color:"#1e3a5f"}`,borderRadius:18,color:fCat===cat?"#fff":"#7a9ab8",fontSize:11,cursor:"pointer"}}>{cat}</button>
                ))}
              </div>
              <div style={{padding:"12px 20px 40px"}}>
                {categorias.filter(cat=>fCat==="Todas"||cat===fCat).map(cat=>{
                  const prods = produtos.filter(p=>p.categoria===cat);
                  if (!prods.length) return null;
                  const showIA = isIns && CAT_IA.has(cat);
                  return (
                    <div key={cat} style={{marginBottom:20}}>
                      <div style={{fontSize:10,letterSpacing:3,color,textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:`1px solid ${color}33`}}>{cat}</div>
                      <div style={{display:"grid",gridTemplateColumns:showIA?"1fr 140px 60px 100px 80px 140px 140px":"1fr 140px 60px 100px 140px 140px",gap:1,background:"#1e3a5f22"}}>
                        {["Produto","Seu produto (nome comercial)","Unid.","Qtd. Total",...(showIA?["I.A."]:[]),`Preço (${vencLabels.v1})`,`Preço (${vencLabels.v2})`].map(h=>(
                          <div key={h} style={{padding:"7px 10px",background:"#111d35",fontSize:10,color:"#5a7a9a",letterSpacing:1,textTransform:"uppercase"}}>{h}</div>
                        ))}
                        {prods.map((p,i)=>{
                          const key=p.nome.toLowerCase();
                          const entry=myPrices[key]||{};
                          const bg=i%2===0?"#0d1e36":"#0f2240";
                          return (
                            <React.Fragment key={key}>
                              <div style={{padding:"9px 10px",background:bg,fontSize:12,color:"#d0e8ff"}}>{p.nome}</div>
                              <div style={{padding:"5px 7px",background:bg}}>
                                <input value={entry.nomeComercial||""} placeholder="ex: nome que você vende"
                                  onChange={e=>setMyPrices(prev=>({...prev,[key]:{...(prev[key]||{}),nomeComercial:e.target.value}}))}
                                  style={{width:"100%",padding:"5px 9px",background:"#0a1628",border:`1px solid ${color}44`,borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none",boxSizing:"border-box"}}/>
                              </div>
                              <div style={{padding:"9px 10px",background:bg,fontSize:11,color:"#5a7a9a",textAlign:"center"}}>{p.unidade}</div>
                              <div style={{padding:"9px 10px",background:bg,fontSize:11,color:"#7a9ab8",textAlign:"right"}}>{fmtQtd(p.qtd_total)}</div>
                              {showIA && <div style={{padding:"9px 10px",background:bg,fontSize:10,color:"#5a7a9a"}}>{p.ingrediente_ativo||"—"}</div>}
                              {["v1","v2"].map(vk=>{
                                const val = entry[vk]!==undefined?entry[vk]:"";
                                return (
                                  <div key={vk} style={{padding:"5px 7px",background:bg}}>
                                    <input type="number" step="0.01" min="0" value={val}
                                      onChange={e=>setMyPrices(prev=>({...prev,[key]:{...(prev[key]||{}),[vk]:e.target.value===""?"":parseFloat(e.target.value)}}))}
                                      placeholder="0,00"
                                      style={{width:"100%",padding:"5px 9px",background:val>0?"#0d2a4a":"#0a1628",border:`1px solid ${val>0?color+"88":"#1e3a5f"}`,borderRadius:5,color:val>0?"#e8f4fd":"#5a7a9a",fontSize:12,outline:"none",boxSizing:"border-box",textAlign:"right"}}/>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
                  <button onClick={handleCotSave} style={{padding:"12px 32px",background:cotSaved?"#2e7d32":"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                    {cotSaved?"✓ Cotação Enviada!":"Salvar Cotação"}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        if (cotScreen==="admin") {
          const vencLabels = getVencLabels(cotContext);
          const updateEditableField = isIns ? updateInsumoField : isSem ? updateSementeField : updateAduboField;
          const deleteEditableRow = isIns ? deleteInsumoRow : isSem ? deleteSementeRow : deleteAduboRow;
          const recKeyPrefix = isIns ? "insumo|" : isSem ? "semente|" : "adubo|";
          const totalRef2 = produtos.reduce((s,p)=>s+p.qtd_total*p.preco_ref,0);
          const totalPorForn = fornecedores.map(f=>{
            const pr=allPrices[f.nome]||{};let t=0;
            produtos.forEach(p=>{
              const entry=pr[p.nome.toLowerCase()]||{};
              const vals=["v1","v2"].map(vk=>entry[vk]).filter(v=>v>0);
              if (vals.length) t += Math.min(...vals)*p.qtd_total;
            });
            return t;
          });
          const filtProds = produtos.filter(p=>filterCat==="Todas"||p.categoria===filterCat);

          return (
            <div style={{color:"#e8f4fd"}}>
              <div style={{background:"#111d35",borderBottom:"1px solid #1e3a5f",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:10,color:"#f59e0b",letterSpacing:3,textTransform:"uppercase"}}>Admin · Cotação {tipoLabel} · {safraLabel}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"#e8f4fd"}}>Painel de Mérito — {produtos.length} produtos</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <SyncBadge/>
                  <button onClick={abrirFecharCotacao} style={{padding:"9px 16px",background:"#2e7d32",border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>✅ Fechar Cotação</button>
                  <button onClick={()=>{const fresh=getCotData(cotContext);setCotData(cotContext,{...fresh});}} style={{padding:"9px 16px",background:"#1e3a5f",border:"1px solid #2a5080",borderRadius:7,color:"#7ab8ff",fontSize:12,cursor:"pointer"}}>↻</button>
                  <button onClick={handleCotLogout} style={{padding:"9px 14px",background:"transparent",border:"1px solid #1e3a5f",borderRadius:7,color:"#5a7a9a",fontSize:11,cursor:"pointer"}}>Sair</button>
                </div>
              </div>

              {/* Vencimentos de pagamento (labels manuais) */}
              <div style={{padding:"14px 20px 0",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#5a7a9a",letterSpacing:1,textTransform:"uppercase"}}>Datas de pagamento:</span>
                {["v1","v2"].map(vk=>(
                  <input key={vk} value={vencLabels[vk]} onChange={e=>setVencLabel(cotContext,vk,e.target.value)}
                    style={{padding:"6px 10px",background:"#111d35",border:"1px solid #1e3a5f",borderRadius:6,color:"#e8f4fd",fontSize:12,outline:"none",width:160}}/>
                ))}
              </div>

              {/* Gestão de fornecedores (cadastro rápido, use a aba Fornecedores para telefone/token/WhatsApp) */}
              <div style={{padding:"14px 20px 0",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#5a7a9a",letterSpacing:1,textTransform:"uppercase"}}>Fornecedores ({tipoLabel}):</span>
                {fornecedores.map(f=>(
                  <span key={f.nome} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 6px 4px 10px",background:"#111d35",border:"1px solid #1e3a5f",borderRadius:20,color:"#e8f4fd",fontSize:12}}>
                    {f.nome}
                    <button onClick={()=>removeFornecedor(cotContext.tipo,f.nome)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12,padding:0}}>✕</button>
                  </span>
                ))}
                <input value={newSemFornecedor} onChange={e=>setNewSemFornecedor(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){addFornecedor(cotContext.tipo,newSemFornecedor);setNewSemFornecedor("");}}}
                  placeholder="Nome do fornecedor"
                  style={{padding:"6px 10px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:6,color:"#e8f4fd",fontSize:12,outline:"none",width:160}}/>
                <button onClick={()=>{addFornecedor(cotContext.tipo,newSemFornecedor);setNewSemFornecedor("");}} style={{padding:"6px 12px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,cursor:"pointer"}}>+ Adicionar</button>
                <span style={{fontSize:10,color:"#5a7a9a"}}>Para telefone/token/WhatsApp, veja a aba 👥 Fornecedores.</span>
              </div>

              {/* Status */}
              <div style={{padding:"14px 20px 0",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
                {fornecedores.map((f,i)=>{
                  const pr=allPrices[f.nome]||{};const count=Object.values(pr).filter(v=>v&&(v.v1>0||v.v2>0)).length;const done=count>0;
                  return (
                    <div key={f.nome} style={{padding:"10px 13px",background:"#111d35",borderRadius:9,border:`1px solid ${done?FORN_COLORS[i%8]+"88":"#1e3a5f"}`}}>
                      <div style={{fontSize:10,color:done?FORN_COLORS[i%8]:"#3a5a7a",marginBottom:3}}>{done?"✓":"⏳"}</div>
                      <div style={{fontSize:12,fontWeight:700,color:done?"#e8f4fd":"#4a6a8a"}}>{f.nome}</div>
                      <div style={{fontSize:10,color:"#5a7a9a"}}>{count}/{produtos.length}</div>
                    </div>
                  );
                })}
              </div>

              {/* Tabs */}
              <div style={{padding:"14px 20px 0",display:"flex",gap:3,borderBottom:"1px solid #1e3a5f"}}>
                {[["merit","Mérito"],["summary","Resumo"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"8px 18px",background:adminTab===t?"#1e3a5f":"transparent",border:"none",borderBottom:adminTab===t?"2px solid #4a9eff":"2px solid transparent",color:adminTab===t?"#e8f4fd":"#5a7a9a",fontSize:12,cursor:"pointer"}}>{l}</button>
                ))}
              </div>

              {adminTab==="merit"&&(
                <div style={{padding:"14px 20px 40px"}}>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {["Todas",...categorias].map(cat=>(
                      <button key={cat} onClick={()=>setFilterCat(cat)} style={{padding:"4px 11px",background:filterCat===cat?"#1565C0":"#111d35",border:`1px solid ${filterCat===cat?"#1565C0":"#1e3a5f"}`,borderRadius:18,color:filterCat===cat?"#fff":"#7a9ab8",fontSize:10,cursor:"pointer"}}>{cat}</button>
                    ))}
                  </div>
                  {categorias.filter(cat=>filterCat==="Todas"||cat===filterCat).map(cat=>{
                    const prods=filtProds.filter(p=>p.categoria===cat);
                    if(!prods.length) return null;
                    const showIA = isIns && CAT_IA.has(cat);
                    return (
                      <div key={cat} style={{marginBottom:24}}>
                        <div style={{fontSize:10,letterSpacing:3,color:"#f59e0b",textTransform:"uppercase",marginBottom:8,paddingBottom:5,borderBottom:"1px solid #f59e0b33"}}>{cat}</div>
                        <div style={{overflowX:"auto"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                            <thead>
                              <tr>
                                <th rowSpan={2} style={thS("left","#111d35")}>Produto</th>
                                {showIA && <th rowSpan={2} style={thS("left","#111d35","#5a7a9a")}>I.A.</th>}
                                <th rowSpan={2} style={thS("center","#111d35")}>Unid.</th>
                                <th rowSpan={2} style={thS("right","#111d35")}>Qtd.</th>
                                <th rowSpan={2} style={thS("right","#111d35")}>Ref.</th>
                                {fornecedores.map((f,i)=>(<th key={f.nome} colSpan={2} style={thS("center",FORN_COLORS[i%8]+"22",FORN_COLORS[i%8])}>{f.nome.split(" ")[0]}</th>))}
                                <th rowSpan={2} style={thS("center","#0d2a1a","#4ade80")}>✔ Melhor</th>
                                <th rowSpan={2} style={thS("center","#1a0d0d","#f87171")}>Economia</th>
                                {isEditableList && <th rowSpan={2} style={thS("center","#111d35")}></th>}
                              </tr>
                              <tr>
                                {fornecedores.map((f,i)=>["v1","v2"].map(vk=>(
                                  <th key={f.nome+vk} style={{...thS("right",FORN_COLORS[i%8]+"11",FORN_COLORS[i%8]),fontSize:9}}>{vencLabels[vk]}</th>
                                )))}
                              </tr>
                            </thead>
                            <tbody>
                              {prods.map((p,ri)=>{
                                const key=p.nome.toLowerCase();
                                const fornPrecos=fornecedores.flatMap(f=>["v1","v2"].map(vk=>{const entry=(allPrices[f.nome]||{})[key]||{};const v=entry[vk];return v>0?{v:Number(v),nomeComercial:entry.nomeComercial||""}:null;}));
                                const validos=fornPrecos.filter(x=>x!==null).map(x=>x.v);
                                const melhor=validos.length>0?Math.min(...validos):null;
                                const economia=melhor!==null?(p.preco_ref-melhor)*p.qtd_total:null;
                                const bg=ri%2===0?"#0d1e36":"#0f2240";
                                return (
                                  <tr key={key}>
                                    <td style={tdS("left",bg)}>
                                      {isEditableList ? <RecEditCell recKey={recKeyPrefix+p.nome} field="nome" value={p.nome} onCommit={v=>updateEditableField(p.nome,"nome",v)}/> : p.nome}
                                    </td>
                                    {showIA && <td style={{...tdS("left",bg,"#5a7a9a"),fontSize:10}}><RecEditCell recKey={recKeyPrefix+p.nome+"|ia"} field="ingrediente_ativo" value={p.ingrediente_ativo} onCommit={v=>updateEditableField(p.nome,"ingrediente_ativo",v)}/></td>}
                                    <td style={tdS("center",bg,"#5a7a9a")}>
                                      {isEditableList ? (
                                        <select value={p.unidade} onChange={e=>updateEditableField(p.nome,"unidade",e.target.value)}
                                          style={{background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,padding:"2px 4px"}}>
                                          {unitOptions.map(u=><option key={u} value={u}>{u}</option>)}
                                        </select>
                                      ) : p.unidade}
                                    </td>
                                    <td style={tdS("right",bg,"#7a9ab8")}>
                                      {isEditableList ? <RecEditCell recKey={recKeyPrefix+p.nome} field="qtd_total" type="number" align="right" value={fmtQtd(p.qtd_total)} onCommit={v=>updateEditableField(p.nome,"qtd_total",v)}/> : fmtQtd(p.qtd_total)}
                                    </td>
                                    <td style={tdS("right",bg,"#4a9eff",true)}>
                                      {isEditableList ? <RecEditCell recKey={recKeyPrefix+p.nome} field="preco_ref" type="number" align="right" value={p.preco_ref} onCommit={v=>updateEditableField(p.nome,"preco_ref",v)}/> : fmtC(p.preco_ref)}
                                    </td>
                                    {fornPrecos.map((fp,fi)=>{const isBest=fp!==null&&fp.v===melhor;return(
                                      <td key={fi} title={fp?.nomeComercial?`Nome do fornecedor: ${fp.nomeComercial}`:undefined} style={{...tdS("right",isBest?"#0d2a1a":bg,isBest?"#4ade80":fp!==null?"#e8f4fd":"#2a3a4a"),fontWeight:isBest?700:400}}>{fp!==null?fmtC(fp.v):"—"}</td>
                                    );})}
                                    <td style={tdS("center","#0d2a1a","#4ade80",true)}>{melhor!==null?fmtC(melhor):"—"}</td>
                                    <td style={{...tdS("right","#1a0d0d"),color:economia>0?"#4ade80":economia<0?"#f87171":"#5a7a9a",fontWeight:700}}>
                                      {economia!==null?(economia>=0?"+":"")+`R$ ${Math.abs(economia).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}` :"—"}
                                    </td>
                                    {isEditableList && <td style={tdS("center",bg)}><button onClick={()=>deleteEditableRow(p.nome)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:13}}>✕</button></td>}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                  {isAdub && (
                    <div style={{padding:"4px 0"}}>
                      {addingAdubo ? (
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:"#0d1e36",padding:10,borderRadius:6,border:"1px solid #1e3a5f"}}>
                          <input placeholder="Nome do adubo" value={newAdubo.nome} onChange={e=>setNewAdubo(p=>({...p,nome:e.target.value}))}
                            style={{flex:2,minWidth:140,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}/>
                          <select value={newAdubo.unidade} onChange={e=>setNewAdubo(p=>({...p,unidade:e.target.value}))}
                            style={{padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12}}>
                            <option value="TN">TN</option>
                            <option value="KG">KG</option>
                          </select>
                          <input placeholder="Qtd. total" type="number" step="any" value={newAdubo.qtd_total} onChange={e=>setNewAdubo(p=>({...p,qtd_total:e.target.value}))}
                            style={{width:110,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          <input placeholder="Preço ref. (R$)" type="number" step="any" value={newAdubo.preco_ref} onChange={e=>setNewAdubo(p=>({...p,preco_ref:e.target.value}))}
                            style={{width:130,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          <button onClick={addAduboRow} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:5,color:"#fff",fontSize:12,cursor:"pointer"}}>✓ Adicionar</button>
                          <button onClick={()=>setAddingAdubo(false)} style={{padding:"7px 10px",background:"#1e3a5f",border:"none",borderRadius:5,color:"#7a9ab8",fontSize:12,cursor:"pointer"}}>✕</button>
                        </div>
                      ) : (
                        <button onClick={()=>setAddingAdubo(true)} style={{background:"none",border:"1px dashed #1e3a5f",color:"#7ab8ff",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>+ Adicionar adubo</button>
                      )}
                    </div>
                  )}
                  {isSem && (
                    <div style={{padding:"4px 0"}}>
                      {addingSemente ? (
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:"#0d1e36",padding:10,borderRadius:6,border:"1px solid #1e3a5f"}}>
                          <input placeholder="Variedade/híbrido" value={newSemente.nome} onChange={e=>setNewSemente(p=>({...p,nome:e.target.value}))}
                            style={{flex:2,minWidth:140,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}/>
                          <select value={newSemente.unidade} onChange={e=>setNewSemente(p=>({...p,unidade:e.target.value}))}
                            style={{padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12}}>
                            <option value="bag">bag</option>
                            <option value="sc">sc</option>
                          </select>
                          <input placeholder="Qtd. total" type="number" step="any" value={newSemente.qtd_total} onChange={e=>setNewSemente(p=>({...p,qtd_total:e.target.value}))}
                            style={{width:110,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          <input placeholder="Preço ref. (R$)" type="number" step="any" value={newSemente.preco_ref} onChange={e=>setNewSemente(p=>({...p,preco_ref:e.target.value}))}
                            style={{width:130,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          <button onClick={addSementeRow} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:5,color:"#fff",fontSize:12,cursor:"pointer"}}>✓ Adicionar</button>
                          <button onClick={()=>setAddingSemente(false)} style={{padding:"7px 10px",background:"#1e3a5f",border:"none",borderRadius:5,color:"#7a9ab8",fontSize:12,cursor:"pointer"}}>✕</button>
                        </div>
                      ) : (
                        <button onClick={()=>setAddingSemente(true)} style={{background:"none",border:"1px dashed #1e3a5f",color:"#7ab8ff",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>+ Adicionar semente</button>
                      )}
                    </div>
                  )}
                  {isIns && (
                    <div style={{padding:"4px 0"}}>
                      {addingInsumo ? (
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",background:"#0d1e36",padding:10,borderRadius:6,border:"1px solid #1e3a5f"}}>
                          <input placeholder="Nome do insumo" value={newInsumo.nome} onChange={e=>setNewInsumo(p=>({...p,nome:e.target.value}))}
                            style={{flex:2,minWidth:140,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}/>
                          <select value={newInsumo.categoria} onChange={e=>setNewInsumo(p=>({...p,categoria:e.target.value}))}
                            style={{padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12}}>
                            {CATEGORIAS_INSUMOS.map(c=><option key={c} value={c}>{c}</option>)}
                          </select>
                          <select value={newInsumo.unidade} onChange={e=>setNewInsumo(p=>({...p,unidade:e.target.value}))}
                            style={{padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12}}>
                            {["L","KG","doses"].map(u=><option key={u} value={u}>{u}</option>)}
                          </select>
                          <input placeholder="Qtd. total" type="number" step="any" value={newInsumo.qtd_total} onChange={e=>setNewInsumo(p=>({...p,qtd_total:e.target.value}))}
                            style={{width:100,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          <input placeholder="Preço ref. (R$)" type="number" step="any" value={newInsumo.preco_ref} onChange={e=>setNewInsumo(p=>({...p,preco_ref:e.target.value}))}
                            style={{width:120,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                          {CAT_IA.has(newInsumo.categoria) && (
                            <input placeholder="Ingrediente ativo" value={newInsumo.ingrediente_ativo} onChange={e=>setNewInsumo(p=>({...p,ingrediente_ativo:e.target.value}))}
                              style={{width:130,padding:"6px 9px",background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}/>
                          )}
                          <button onClick={addInsumoRow} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:5,color:"#fff",fontSize:12,cursor:"pointer"}}>✓ Adicionar</button>
                          <button onClick={()=>setAddingInsumo(false)} style={{padding:"7px 10px",background:"#1e3a5f",border:"none",borderRadius:5,color:"#7a9ab8",fontSize:12,cursor:"pointer"}}>✕</button>
                        </div>
                      ) : (
                        <button onClick={()=>setAddingInsumo(true)} style={{background:"none",border:"1px dashed #1e3a5f",color:"#7ab8ff",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>+ Adicionar insumo</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {adminTab==="summary"&&(
                <div style={{padding:"16px 20px 40px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
                    {fornecedores.map((f,i)=>{
                      const pr=allPrices[f.nome]||{};const count=Object.values(pr).filter(v=>v&&(v.v1>0||v.v2>0)).length;const total=totalPorForn[i];
                      const bestOf = (prices,key) => { const entry=(prices[key]||{}); const vals=["v1","v2"].map(vk=>entry[vk]).filter(v=>v>0); return vals.length?Math.min(...vals):null; };
                      const wins=produtos.filter(p=>{const v=bestOf(pr,p.nome.toLowerCase());if(!v)return false;const others=fornecedores.filter(x=>x.nome!==f.nome).map(x=>bestOf(allPrices[x.nome]||{},p.nome.toLowerCase())).filter(v2=>v2!==null);return others.every(v2=>v<=v2);}).length;
                      return (
                        <div key={f.nome} style={{background:"#111d35",borderRadius:11,padding:"18px",border:`1px solid ${count>0?FORN_COLORS[i%8]+"66":"#1e3a5f"}`}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                            <div>
                              <div style={{fontSize:16,fontWeight:700,color:count>0?"#e8f4fd":"#4a6a8a"}}>{f.nome}</div>
                              <div style={{fontSize:10,color:FORN_COLORS[i%8],marginTop:2}}>{count} produtos cotados</div>
                            </div>
                            <div style={{width:36,height:36,borderRadius:"50%",background:FORN_COLORS[i%8]+"33",border:`2px solid ${FORN_COLORS[i%8]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:FORN_COLORS[i%8]}}>{i+1}</div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                            <StatC label="Total cotado" value={total>0?`R$ ${total.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"} color={FORN_COLORS[i%8]}/>
                            <StatC label="Menores preços" value={wins>0?`${wins} produtos`:"—"} color="#4ade80"/>
                            <StatC label="Ref. total" value={`R$ ${totalRef2.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`} color="#5a7a9a"/>
                            <StatC label="Cobertura" value={count>0?`${Math.round(count/produtos.length*100)}%`:"0%"} color="#f59e0b"/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        }
        return null;
      })()}

      {/* ══════════════════════════════════════════════════════
          COMPRAS
      ══════════════════════════════════════════════════════ */}
      {appView==="compras" && (
        <div style={{maxWidth:1200,margin:"0 auto",padding:"16px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:14}}>
            <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:11,color:"#888"}}>Total comprado (histórico)</div>
              <div style={{fontSize:18,fontWeight:800,color:"#00695c"}}>{fmt(comprasTotais.total)}</div>
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <div style={{fontSize:11,color:"#888"}}>Total nesta safra ({safraAtiva})</div>
              <div style={{fontSize:18,fontWeight:800,color:"#00695c"}}>{fmt(comprasTotais.totalSafraAtiva)}</div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,fontSize:13,flexWrap:"wrap"}}>
            <span onClick={()=>{setComprasSafraSel(null);setComprasCatSel(null);}}
              style={{cursor:"pointer",fontWeight:comprasSafraSel?600:800,color:"#00695c"}}>🛒 Compras</span>
            {comprasSafraSel && (<>
              <span style={{color:"#bbb"}}>›</span>
              <span onClick={()=>setComprasCatSel(null)} style={{cursor:"pointer",fontWeight:comprasCatSel?600:800,color:"#00695c"}}>📁 {comprasSafraSel}</span>
            </>)}
            {comprasCatSel && (<>
              <span style={{color:"#bbb"}}>›</span>
              <span style={{fontWeight:800,color:"#00695c"}}>{CATEGORIA_COMPRA_ICONS[comprasCatSel]||"📁"} {comprasCatSel}</span>
            </>)}
          </div>

          {/* NÍVEL 0: pastas de safra */}
          {!comprasSafraSel && (<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:16}}>
              {comprasSafrasList.map(s=>(
                <div key={s.safra} onClick={()=>setComprasSafraSel(s.safra)}
                  style={{background:"#fff",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer",border:s.safra===safraAtiva?"2px solid #00695c":"1px solid transparent"}}>
                  <div style={{fontSize:26}}>📁</div>
                  <div style={{fontWeight:700,fontSize:14,marginTop:6,color:"#1a3a1a"}}>Compras safra {s.safra}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:4}}>{s.count} lançamento{s.count===1?"":"s"}</div>
                  <div style={{fontSize:14,fontWeight:800,color:"#00695c",marginTop:2}}>{fmt(s.total)}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"14px 18px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <input placeholder="Nome da nova safra (ex: Verão 26/27)" value={novaPastaNome} onChange={e=>setNovaPastaNome(e.target.value)}
                style={{flex:1,padding:"7px 10px",fontSize:12,border:"1px solid #ccc",borderRadius:6}}/>
              <button onClick={()=>{if(novaPastaNome.trim()){setComprasSafraSel(novaPastaNome.trim());setNovaPastaNome("");}}}
                disabled={!novaPastaNome.trim()}
                style={{padding:"7px 14px",background:"#00695c",color:"#fff",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",opacity:novaPastaNome.trim()?1:0.5}}>+ Nova pasta de safra</button>
            </div>
          </>)}

          {/* NÍVEL 1: pastas de categoria dentro da safra */}
          {comprasSafraSel && !comprasCatSel && (<>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:16}}>
              {comprasCategoriasList.map(c=>(
                <div key={c.categoria} onClick={()=>setComprasCatSel(c.categoria)}
                  style={{background:"#fff",borderRadius:10,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer"}}>
                  <div style={{fontSize:24}}>{CATEGORIA_COMPRA_ICONS[c.categoria]||"📁"}</div>
                  <div style={{fontWeight:700,fontSize:13,marginTop:6,color:"#1a3a1a"}}>{c.categoria}</div>
                  <div style={{fontSize:11,color:"#888",marginTop:4}}>{c.count} lançamento{c.count===1?"":"s"}</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#00695c",marginTop:2}}>{fmt(c.total)}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:10,padding:"14px 18px",display:"flex",gap:8,alignItems:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <input placeholder="Nova categoria (ex: Calcário/Corretivos)" value={novaPastaNome} onChange={e=>setNovaPastaNome(e.target.value)}
                style={{flex:1,padding:"7px 10px",fontSize:12,border:"1px solid #ccc",borderRadius:6}}/>
              <button onClick={()=>{if(novaPastaNome.trim()){setComprasCatSel(novaPastaNome.trim());setNovaPastaNome("");}}}
                disabled={!novaPastaNome.trim()}
                style={{padding:"7px 14px",background:"#00695c",color:"#fff",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",opacity:novaPastaNome.trim()?1:0.5}}>+ Nova pasta de categoria</button>
            </div>
          </>)}

          {/* NÍVEL 2: registros da safra + categoria selecionadas */}
          {comprasSafraSel && comprasCatSel && (<>
            <div style={{background:"#fff",borderRadius:10,padding:"14px 18px",marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
              <button onClick={()=>{setNewCompra(p=>({...p,safra:comprasSafraSel,categoria:comprasCatSel}));setAddingCompra(a=>!a);}}
                style={{padding:"6px 14px",background:"none",border:"1px dashed #00695c",color:"#00695c",borderRadius:6,fontSize:11,cursor:"pointer"}}>+ Lançamento manual</button>
              <div style={{fontSize:11,color:"#999",marginTop:8}}>Fechar uma cotação de adubação lança automaticamente aqui. Use o lançamento manual para registrar compras feitas fora da cotação (ex: calcário, gesso, semente de planta de cobertura).</div>
            </div>

            <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#e0f2f1"}}>
                    {["Data","Produto","Unid.","Qtd.","Preço Unit.","Total","Fornecedor","Obs",""].map(h=>(
                      <th key={h} style={{padding:"7px 9px",textAlign:["Produto","Fornecedor","Obs"].includes(h)?"left":"right",color:"#00695c",fontSize:10,letterSpacing:1,textTransform:"uppercase",borderBottom:"1px solid #80cbc4",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comprasRecordsFiltrados.map((r,i)=>(
                    <tr key={r.id} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"6px 9px"}}><RecEditCell recKey={"compra|"+r.id} field="data" value={r.data} onCommit={v=>updateRecordField(setComprasRecords,r.id,"data",v)}/></td>
                      <td style={{padding:"6px 9px",fontWeight:600}}><RecEditCell recKey={"compra|"+r.id} field="produto" value={r.produto} onCommit={v=>updateRecordField(setComprasRecords,r.id,"produto",v)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}>
                        <select value={r.unidade} onChange={e=>updateRecordField(setComprasRecords,r.id,"unidade",e.target.value)} style={{padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}>
                          <option value="TN">TN</option>
                          <option value="KG">KG</option>
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="doses">doses</option>
                          <option value="bag">bag</option>
                          <option value="sc">sc</option>
                        </select>
                      </td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"compra|"+r.id} field="quantidade" type="number" align="right" value={fmtQtd(r.quantidade)} onCommit={v=>updateRecordField(setComprasRecords,r.id,"quantidade",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right"}}><RecEditCell recKey={"compra|"+r.id} field="precoUnitario" type="number" align="right" value={fmt(r.precoUnitario)} onCommit={v=>updateRecordField(setComprasRecords,r.id,"precoUnitario",v,true)}/></td>
                      <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:"#00695c"}}>{fmt(r.valorTotal)}</td>
                      <td style={{padding:"6px 9px"}}><RecEditCell recKey={"compra|"+r.id} field="fornecedor" value={r.fornecedor} onCommit={v=>updateRecordField(setComprasRecords,r.id,"fornecedor",v)}/></td>
                      <td style={{padding:"6px 9px",color:"#888"}}><RecEditCell recKey={"compra|"+r.id} field="obs" value={r.obs} onCommit={v=>updateRecordField(setComprasRecords,r.id,"obs",v)}/></td>
                      <td style={{padding:"6px 4px",textAlign:"center"}}>
                        <button onClick={()=>{if(window.confirm("Remover compra?"))deleteRecord(setComprasRecords,r.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e57373",fontSize:14}}>✕</button>
                      </td>
                    </tr>
                  ))}
                  {addingCompra && (
                    <tr style={{background:"#fffde7"}}>
                      <td style={{padding:"5px 6px"}}><input placeholder="Data" value={newCompra.data} onChange={e=>setNewCompra(p=>({...p,data:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Produto" value={newCompra.produto} onChange={e=>setNewCompra(p=>({...p,produto:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}>
                        <select value={newCompra.unidade} onChange={e=>setNewCompra(p=>({...p,unidade:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}>
                          <option value="TN">TN</option>
                          <option value="KG">KG</option>
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="doses">doses</option>
                          <option value="bag">bag</option>
                          <option value="sc">sc</option>
                        </select>
                      </td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Qtd." type="number" step="any" value={newCompra.quantidade} onChange={e=>setNewCompra(p=>({...p,quantidade:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Preço Unit." type="number" step="any" value={newCompra.precoUnitario} onChange={e=>setNewCompra(p=>({...p,precoUnitario:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td/>
                      <td style={{padding:"5px 6px"}}><input placeholder="Fornecedor" value={newCompra.fornecedor} onChange={e=>setNewCompra(p=>({...p,fornecedor:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}><input placeholder="Obs" value={newCompra.obs} onChange={e=>setNewCompra(p=>({...p,obs:e.target.value}))} style={{width:"100%",padding:"3px 5px",fontSize:11,border:"1px solid #ccc",borderRadius:3}}/></td>
                      <td style={{padding:"5px 6px"}}>
                        <button onClick={submitCompra} style={{background:"#00695c",color:"#fff",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:12,marginRight:3}}>✓</button>
                        <button onClick={()=>setAddingCompra(false)} style={{background:"#eee",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:12}}>✕</button>
                      </td>
                    </tr>
                  )}
                  {comprasRecordsFiltrados.length===0 && !addingCompra && (
                    <tr><td colSpan={9} style={{padding:"20px",textAlign:"center",color:"#bbb",fontSize:12}}>Nenhuma compra registrada aqui ainda. Feche uma cotação ou lance manualmente.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </>)}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          FORNECEDORES
      ══════════════════════════════════════════════════════ */}
      {appView==="fornecedores" && (()=>{
        const APP_URL = "https://gcagro-app.vercel.app";
        function whatsappLink(f, tipoLabel) {
          const msg = encodeURIComponent(`Olá ${f.nome}! 🌿\n\nGC Agro — Cotação de ${tipoLabel}\n\nAcesse: ${APP_URL}\n\nSeu token de acesso: *${f.token}*`);
          return `https://wa.me/55${(f.telefone||"").replace(/\D/g,"")}?text=${msg}`;
        }
        const TABS = [["adub","🌱 Adubação",fornecedoresAdub],["ins","💊 Insumos",fornecedoresIns],["sem","🌾 Sementes",sementesFornecedores]];
        return (
          <div style={{maxWidth:900,margin:"0 auto",padding:"16px"}}>
            <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a",marginBottom:4}}>👥 Cadastro de Fornecedores</div>
            <div style={{fontSize:12,color:"#667",marginBottom:16}}>Gerencie os fornecedores de cada cotação. Cada um tem um token único para acessar sem precisar digitar o nome exato.</div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {TABS.map(([id,label])=>(
                <button key={id} onClick={()=>setFornecedoresTab(id)} style={{padding:"7px 16px",background:fornecedoresTab===id?"#1565C0":"#fff",border:`1px solid ${fornecedoresTab===id?"#1565C0":"#ddd"}`,borderRadius:20,color:fornecedoresTab===id?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:fornecedoresTab===id?700:400}}>{label}</button>
              ))}
            </div>
            {TABS.filter(([id])=>id===fornecedoresTab).map(([tipo,label,list])=>(
              <div key={tipo} style={{display:"grid",gap:10}}>
                {list.map(f=>(
                  <div key={f.nome} style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{flex:2,minWidth:130}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>NOME</div>
                      <input value={f.nome} onChange={e=>updateFornecedor(tipo,f.nome,"nome",e.target.value)}
                        style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{flex:2,minWidth:130}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>TELEFONE (WhatsApp)</div>
                      <input value={f.telefone} onChange={e=>updateFornecedor(tipo,f.nome,"telefone",e.target.value)} placeholder="(xx) xxxxx-xxxx"
                        style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div style={{minWidth:110}}>
                      <div style={{fontSize:10,color:"#888",marginBottom:3}}>TOKEN</div>
                      <div style={{display:"flex",gap:4}}>
                        <div style={{width:80,padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,fontFamily:"monospace",background:"#f9f9f9"}}>{f.token}</div>
                        <button onClick={()=>regenToken(tipo,f.nome)} title="Novo token"
                          style={{padding:"6px 8px",background:"#f0f0f0",border:"none",borderRadius:5,cursor:"pointer",fontSize:12}}>🔄</button>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                      {f.telefone&&(
                        <a href={whatsappLink(f,label)} target="_blank" rel="noopener noreferrer"
                          style={{padding:"8px 12px",background:"#25D366",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",marginTop:16,textDecoration:"none",display:"inline-block"}}>
                          📱 WhatsApp
                        </a>
                      )}
                      <button onClick={()=>removeFornecedor(tipo,f.nome)}
                        style={{padding:"8px 10px",background:"#ffebee",border:"none",borderRadius:6,color:"#c62828",fontSize:12,cursor:"pointer",marginTop:16}}>✕</button>
                    </div>
                  </div>
                ))}
                <button onClick={()=>addFornecedor(tipo,`Novo Fornecedor ${list.length+1}`)}
                  style={{padding:"10px",background:"none",border:"2px dashed #ddd",borderRadius:10,color:"#aaa",fontSize:13,cursor:"pointer"}}>
                  + Adicionar Fornecedor
                </button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          SAFRAS
      ══════════════════════════════════════════════════════ */}
      {appView==="safras" && (
        <div style={{maxWidth:900,margin:"0 auto",padding:"20px 16px"}}>
          <div style={{background:"#fff",borderRadius:12,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:800,color:"#1a3a1a",marginBottom:4}}>Safra Ativa</div>
            <div style={{fontSize:28,fontWeight:800,color:"#2e7d32",marginBottom:16}}>{safraAtiva}</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button onClick={()=>setShowSafrasModal(true)} style={{padding:"12px 24px",background:"linear-gradient(135deg,#2e7d32,#1b5e20)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                🌱 Abrir Nova Safra
              </button>
            </div>
          </div>

          <div style={{fontSize:16,fontWeight:700,color:"#333",marginBottom:12}}>🗂️ SAFRAS — Arquivadas ({safrasArquivadas.length})</div>
          {safrasArquivadas.length===0 && <div style={{color:"#999",fontSize:13}}>Nenhuma safra arquivada ainda.</div>}
          {safrasArquivadas.map((s,i)=>(
            <div key={i} onClick={()=>{setViewingSafraIdx(i);setSafraDetailTab("prog_verao");}}
              style={{background:"#fff",borderRadius:10,padding:"16px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:10,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:16,fontWeight:700,color:"#333"}}>📁 {s.nome}</div>
                  <div style={{fontSize:12,color:"#888"}}>Arquivada em {s.dataArquivamento}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:11,padding:"4px 10px",background:"#e8f5e9",color:"#2e7d32",borderRadius:12}}>
                    {Object.keys(s.dataVerao||{}).length} cult. verão / {Object.keys(s.dataInverno||{}).length} cult. inverno
                  </span>
                  <span style={{fontSize:11,padding:"4px 10px",background:"#e3f2fd",color:"#1565C0",borderRadius:12}}>
                    {(s.planVerao||[]).length} lotes verão / {(s.planSafrinha||[]).length} lotes inverno
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          BACKUP
      ══════════════════════════════════════════════════════ */}
      {appView==="backup" && (
        <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px"}}>
          <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a",marginBottom:16}}>💾 Backup dos Dados</div>
          <div style={{background:"#fff",borderRadius:12,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📤 Exportar Backup</div>
            <div style={{fontSize:12,color:"#666",marginBottom:14}}>Salva todos os dados do app (programação, cotações, colheita, vendas, compras, planejamento, safras) em um arquivo JSON. Guarde no Google Drive, OneDrive ou onde preferir.</div>
            <button onClick={exportarBackup} style={{padding:"12px 24px",background:"linear-gradient(135deg,#2e7d32,#1b5e20)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              💾 Baixar Backup
            </button>
          </div>
          <div style={{background:"#fff",borderRadius:12,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📥 Importar Backup</div>
            <div style={{fontSize:12,color:"#e57373",marginBottom:14}}>⚠ Atenção: substituirá todos os dados atuais deste aparelho (e, se o Firebase estiver conectado, também os dados de cotação na nuvem).</div>
            <label style={{padding:"12px 24px",background:"#1565C0",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-block"}}>
              📂 Selecionar Arquivo
              <input type="file" accept=".json" onChange={importarBackup} style={{display:"none"}}/>
            </label>
            {backupMsg && <div style={{marginTop:12,fontSize:12,color:backupMsg.ok?"#2e7d32":"#c62828",fontWeight:700}}>{backupMsg.texto}</div>}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: NOVA SAFRA
      ══════════════════════════════════════════════════════ */}
      {showSafrasModal && (()=>{
        const nome = novaSafraNome, setNome = setNovaSafraNome;
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{background:"#fff",borderRadius:14,padding:"32px",width:400,boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a",marginBottom:6}}>Abrir Nova Safra</div>
              <div style={{fontSize:13,color:"#666",marginBottom:20}}>A safra atual <strong>{safraAtiva}</strong> será arquivada. A estrutura de produtos será copiada como base.</div>
              <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Verão 26/27"
                style={{width:"100%",padding:"12px 14px",border:"2px solid #e0e0e0",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:16}}/>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{if(nome.trim()){novaSafra(nome.trim());setNovaSafraNome("");}}} disabled={!nome.trim()}
                  style={{flex:1,padding:"12px",background:nome.trim()?"linear-gradient(135deg,#2e7d32,#1b5e20)":"#ccc",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:nome.trim()?"pointer":"not-allowed"}}>
                  Arquivar e Abrir Nova
                </button>
                <button onClick={()=>{setShowSafrasModal(false);setNovaSafraNome("");}} style={{padding:"12px 20px",background:"#f5f5f5",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          MODAL: DETALHE DE SAFRA ARQUIVADA
      ══════════════════════════════════════════════════════ */}
      {viewingSafraIdx!==null && (()=>{
        const s = safrasArquivadas[viewingSafraIdx];
        if (!s) return null;
        const isProg = safraDetailTab.startsWith("prog_");
        const isPlan = safraDetailTab.startsWith("plan_");
        const isCompras = safraDetailTab==="compras";
        const isVendas = safraDetailTab==="vendas";
        const progData = safraDetailTab==="prog_verao" ? (s.dataVerao||{}) : (s.dataInverno||{});
        const planData = safraDetailTab==="plan_verao" ? (s.planVerao||[]) : (s.planSafrinha||[]);
        // Compras/Vendas não são copiadas pro arquivo — já guardam a safra em cada registro,
        // então buscamos ao vivo pra sempre refletir edições feitas depois do arquivamento.
        const comprasDaSafra = comprasRecords.filter(r=>r.safra===s.nome);
        const vendasDaSafra = vendasRecords.filter(r=>r.safra===s.nome);
        const TABS = [["prog_verao","🌱 Programação Verão"],["prog_inv","🌾 Programação Inverno"],["plan_verao","🗺️ Planejamento Verão"],["plan_inv","🗺️ Planejamento Inverno"],["compras","🛒 Compras"],["vendas","💰 Vendas"]];
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>
            <div style={{background:"#fff",borderRadius:14,padding:"24px",width:"min(1000px,95vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>📁 {s.nome}</div>
                  <div style={{fontSize:12,color:"#888"}}>Arquivada em {s.dataArquivamento} — somente leitura</div>
                </div>
                <button onClick={()=>setViewingSafraIdx(null)} style={{padding:"8px 14px",background:"#f5f5f5",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>Fechar ✕</button>
              </div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",margin:"14px 0",borderBottom:"1px solid #eee",paddingBottom:10}}>
                {TABS.map(([t,l])=>(
                  <button key={t} onClick={()=>setSafraDetailTab(t)} style={{padding:"7px 14px",background:safraDetailTab===t?"#2e7d32":"#f5f5f5",border:"none",borderRadius:6,color:safraDetailTab===t?"#fff":"#555",fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
                ))}
              </div>

              {isProg && (
                Object.keys(progData).length===0 ? <div style={{color:"#999",fontSize:13,padding:20,textAlign:"center"}}>Nenhuma cultura registrada.</div> : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {Object.entries(progData).map(([nome,c])=>{
                      const t = calcCultureTotals(c);
                      return (
                        <div key={nome} style={{border:"1px solid #eee",borderRadius:8,padding:"10px 14px",opacity:c.ativo?1:0.5}}>
                          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                            <div style={{fontWeight:700,fontSize:14,color:"#1a3a1a"}}>{nome} {!c.ativo && "(inativa)"}</div>
                            <div style={{fontSize:12,color:"#666"}}>{fmtN(c.area)} ha · {c.categories.length} categorias · {fmt(t.total)}/ha</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {isPlan && (
                planData.length===0 ? <div style={{color:"#999",fontSize:13,padding:20,textAlign:"center"}}>Nenhum lote registrado.</div> : (
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#f5f5f5"}}>
                          {["Lote","Área (ha)","Cultura","Variedade","População","Data Plantio","Prev. Colheita","Obs"].map(h=>(
                            <th key={h} style={{padding:"7px 9px",textAlign:"left",color:"#666",fontSize:10,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {planData.map((r,i)=>(
                          <tr key={r.id||i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                            <td style={{padding:"6px 9px"}}>{r.lote}</td>
                            <td style={{padding:"6px 9px"}}>{fmtN(r.area)}</td>
                            <td style={{padding:"6px 9px"}}>{r.cultura}</td>
                            <td style={{padding:"6px 9px"}}>{r.variedade}</td>
                            <td style={{padding:"6px 9px"}}>{r.populacao}</td>
                            <td style={{padding:"6px 9px"}}>{r.dataPlantio}</td>
                            <td style={{padding:"6px 9px"}}>{r.previsaoColheita}</td>
                            <td style={{padding:"6px 9px",color:"#888"}}>{r.obs}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {isCompras && (
                comprasDaSafra.length===0 ? <div style={{color:"#999",fontSize:13,padding:20,textAlign:"center"}}>Nenhuma compra registrada nesta safra.</div> : (
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#f5f5f5"}}>
                          {["Data","Categoria","Produto","Qtd.","Preço Unit.","Total","Fornecedor"].map(h=>(
                            <th key={h} style={{padding:"7px 9px",textAlign:"left",color:"#666",fontSize:10,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comprasDaSafra.map(r=>(
                          <tr key={r.id} style={{background:"#fff"}}>
                            <td style={{padding:"6px 9px"}}>{r.data}</td>
                            <td style={{padding:"6px 9px"}}>{r.categoria}</td>
                            <td style={{padding:"6px 9px",fontWeight:600}}>{r.produto}</td>
                            <td style={{padding:"6px 9px"}}>{fmtQtd(r.quantidade)} {r.unidade}</td>
                            <td style={{padding:"6px 9px"}}>{fmt(r.precoUnitario)}</td>
                            <td style={{padding:"6px 9px",fontWeight:700,color:"#00695c"}}>{fmt(r.valorTotal)}</td>
                            <td style={{padding:"6px 9px"}}>{r.fornecedor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {isVendas && (
                vendasDaSafra.length===0 ? <div style={{color:"#999",fontSize:13,padding:20,textAlign:"center"}}>Nenhuma venda registrada nesta safra.</div> : (
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#f5f5f5"}}>
                          {["Cultura","Qtd.","Preço","Total","Comprador","Dt. Entrega","Dt. Pagamento"].map(h=>(
                            <th key={h} style={{padding:"7px 9px",textAlign:"left",color:"#666",fontSize:10,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {vendasDaSafra.map(r=>(
                          <tr key={r.id} style={{background:"#fff"}}>
                            <td style={{padding:"6px 9px",fontWeight:600}}>{r.cultura}</td>
                            <td style={{padding:"6px 9px"}}>{fmtQtd(r.qtd)} {r.unidade}</td>
                            <td style={{padding:"6px 9px"}}>{fmt(r.preco)}</td>
                            <td style={{padding:"6px 9px",fontWeight:700,color:"#00695c"}}>{fmt((r.qtd||0)*(r.preco||0))}</td>
                            <td style={{padding:"6px 9px"}}>{r.comprador}</td>
                            <td style={{padding:"6px 9px"}}>{r.dataEntrega}</td>
                            <td style={{padding:"6px 9px"}}>{r.dataPagamento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          MODAL: IMPORTAR PRODUTOS DE OUTRA CULTURA
      ══════════════════════════════════════════════════════ */}
      {showImportModal && (()=>{
        const outras = Object.keys(data).filter(nome=>nome!==activeCulture);
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{background:"#fff",borderRadius:14,padding:"32px",width:440,boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a",marginBottom:6}}>📥 Importar Produtos</div>
              <div style={{fontSize:13,color:"#666",marginBottom:20}}>Escolha de qual cultura ({isVerao?"Verão":"Inverno"}) importar os produtos como base para <strong>{activeCulture}</strong>. Categorias e produtos que ainda não existem aqui são adicionados; o que já existe não é duplicado.</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto",marginBottom:16}}>
                {outras.map(nome=>{
                  const c = data[nome];
                  const nProdutos = c.categories.reduce((s,cat)=>s+cat.products.length,0);
                  return (
                    <button key={nome} onClick={()=>importarProdutosDeCultura(nome)} disabled={!nProdutos}
                      style={{textAlign:"left",padding:"10px 14px",background:nProdutos?"#f5f5f5":"#fafafa",border:"1px solid #e0e0e0",borderRadius:8,cursor:nProdutos?"pointer":"not-allowed",opacity:nProdutos?1:0.5}}>
                      <div style={{fontWeight:700,fontSize:14,color:"#1a3a1a"}}>{nome} {!c.ativo && <span style={{fontWeight:400,color:"#999"}}>(inativo)</span>}</div>
                      <div style={{fontSize:12,color:"#888"}}>{c.categories.length} categorias · {nProdutos} produtos</div>
                    </button>
                  );
                })}
                {outras.length===0 && <div style={{fontSize:13,color:"#999",textAlign:"center",padding:20}}>Nenhuma outra cultura disponível.</div>}
              </div>
              <button onClick={()=>setShowImportModal(false)} style={{width:"100%",padding:"12px",background:"#f5f5f5",border:"none",borderRadius:8,fontSize:14,cursor:"pointer"}}>Cancelar</button>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          MODAL: FECHAR COTAÇÃO
      ══════════════════════════════════════════════════════ */}
      {showFecharCotModal && (()=>{
        const allPrices = getCotData(cotContext);
        const produtos = getProdutos(cotContext);
        const fornecedores = getFornecedores(cotContext);
        const isAdubFechar = cotContext?.tipo==="adub";
        const isSemFechar = cotContext?.tipo==="sem";
        const isInsFechar = cotContext?.tipo==="ins";
        const tipoLabel = isAdubFechar ? "Adubação" : isSemFechar ? "Sementes" : "Insumos";
        const decisions = fecharDecisions || {};
        const setDecisions = setFecharDecisions;
        const vencLabels = getVencLabels(cotContext);

        function updateSplit(key, idx, field, val) {
          setDecisions(d=>{ const nd={...d}; nd[key]={...nd[key],splits:nd[key].splits.map((s,i)=>i===idx?{...s,[field]:val}:s)}; return nd; });
        }
        function addSplit(key) {
          setDecisions(d=>{ const nd={...d}; nd[key]={...nd[key],splits:[...nd[key].splits,{nome:"",venc:"v1",qtd:0,preco:0}]}; return nd; });
        }
        function remSplit(key, idx) {
          setDecisions(d=>{ const nd={...d}; nd[key]={...nd[key],splits:nd[key].splits.filter((_,i)=>i!==idx)}; return nd; });
        }
        function calcPrecoMedio(splits) {
          const totalQtd = splits.reduce((s,x)=>s+(parseFloat(x.qtd)||0),0);
          if (!totalQtd) return 0;
          return splits.reduce((s,x)=>s+(parseFloat(x.preco)||0)*(parseFloat(x.qtd)||0)/totalQtd,0);
        }
        function confirmar() {
          const novasCompras = [];
          const pedidoPorFornecedor = {};
          const temporadaLabel = cotContext?.safra==="verao" ? "Verão" : "Inverno";
          const categoria = isAdubFechar ? "Adubação "+temporadaLabel : isSemFechar ? "Sementes" : "Químicos "+temporadaLabel;
          const unidadePadrao = isAdubFechar ? "TN" : isSemFechar ? "bag" : "L";
          Object.entries(decisions).forEach(([key,dec])=>{
            if (!dec.splits.some(s=>s.nome&&s.preco>0)) return;
            const pm = calcPrecoMedio(dec.splits);
            const forns = dec.splits.filter(s=>s.nome&&s.preco>0);
            fecharCotacao(key, forns, pm, dec.nomeReal, dec.iaReal);
            const prod = produtos.find(p=>p.nome.toLowerCase()===key);
            const unidade = prod?.unidade||unidadePadrao;
            const fornLabel = f => `${f.nome} (${vencLabels[f.venc||"v1"]})`;
            novasCompras.push({ id:newId(), data:new Date().toLocaleDateString("pt-BR"), safra:safraAtiva,
              categoria, produto:dec.nomeReal, unidade, quantidade:prod?.qtd_total||0,
              precoUnitario:pm, valorTotal:pm*(prod?.qtd_total||0), fornecedor:forns.map(fornLabel).join(" + "), obs:"" });
            // Pedido de compra: agrupa os itens vencidos por fornecedor, pra gerar a lista de envio.
            const totalPct = forns.reduce((s,f)=>s+(parseFloat(f.qtd)||0),0) || 100;
            forns.forEach(f=>{
              const qtd = (prod?.qtd_total||0) * ((parseFloat(f.qtd)||0)/totalPct);
              if (!pedidoPorFornecedor[f.nome]) {
                const fObj = fornecedores.find(x=>x.nome===f.nome);
                pedidoPorFornecedor[f.nome] = { telefone: fObj?.telefone||"", itens:[] };
              }
              pedidoPorFornecedor[f.nome].itens.push({ produto:dec.nomeReal, unidade, qtd, preco:f.preco, venc:vencLabels[f.venc||"v1"] });
            });
          });
          if (novasCompras.length) setComprasRecords(rs => [...rs, ...novasCompras]);
          if (Object.keys(pedidoPorFornecedor).length) {
            setPedidoCompra({ tipoLabel, safraLabel:temporadaLabel, fornecedores:pedidoPorFornecedor });
          }
          setShowFecharCotModal(false);
        }

        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,overflowY:"auto",padding:"20px"}}>
            <div style={{background:"#0d1e36",borderRadius:14,padding:"24px",width:"min(900px,95vw)",border:"1px solid #1e3a5f",maxHeight:"90vh",overflowY:"auto"}}>
              <div style={{color:"#e8f4fd",fontSize:18,fontWeight:800,marginBottom:4}}>✅ Fechar Cotação</div>
              <div style={{color:"#5a7a9a",fontSize:12,marginBottom:20}}>Selecione o fornecedor e preço final para cada produto. Para dividir entre fornecedores, adicione linhas. O preço médio ponderado será lançado na programação.</div>
              
              {produtos.map(p=>{
                const key=p.nome.toLowerCase();
                const dec=decisions[key];
                if (!dec) return null;
                const pm=calcPrecoMedio(dec.splits);
                const allVals=[];
                fornecedores.forEach(f=>{
                  const precos=allPrices[f.nome]||{};
                  ["v1","v2"].forEach(vk=>{
                    const preco=(precos[key]||{})[vk];
                    if (preco>0) allVals.push({nome:f.nome, venc:vk, preco:Number(preco)});
                  });
                });
                return (
                  <div key={key} style={{background:"#111d35",borderRadius:9,padding:"14px",marginBottom:10,border:"1px solid #1e3a5f"}}>
                    <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap"}}>
                      <div style={{flex:2}}>
                        <div style={{fontSize:10,color:"#5a7a9a",marginBottom:3}}>NOME COMERCIAL</div>
                        <input value={dec.nomeReal} onChange={e=>setDecisions(d=>({...d,[key]:{...d[key],nomeReal:e.target.value}}))}
                          style={{width:"100%",padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      {isInsFechar && <div style={{flex:2}}>
                        <div style={{fontSize:10,color:"#5a7a9a",marginBottom:3}}>INGREDIENTE ATIVO</div>
                        <input value={dec.iaReal} onChange={e=>setDecisions(d=>({...d,[key]:{...d[key],iaReal:e.target.value}}))}
                          style={{width:"100%",padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                      </div>}
                      <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                        <div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>Preço médio: {fmtC(pm)}</div>
                      </div>
                    </div>
                    {allVals.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                      {allVals.map((v,vi)=><span key={v.nome+v.venc+vi} style={{fontSize:10,padding:"2px 8px",background:"#1e3a5f",borderRadius:10,color:"#7ab8ff"}}>{v.nome} ({vencLabels[v.venc]}): {fmtC(v.preco)}</span>)}
                    </div>}
                    {dec.splits.map((split,si)=>(
                      <div key={si} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                        <select value={split.nome} onChange={e=>updateSplit(key,si,"nome",e.target.value)}
                          style={{flex:2,padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}>
                          <option value="">-- Fornecedor --</option>
                          {fornecedores.map(f=><option key={f.nome} value={f.nome}>{f.nome}</option>)}
                        </select>
                        <select value={split.venc||"v1"} onChange={e=>updateSplit(key,si,"venc",e.target.value)}
                          style={{flex:1,padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none"}}>
                          <option value="v1">{vencLabels.v1}</option>
                          <option value="v2">{vencLabels.v2}</option>
                        </select>
                        <input type="number" placeholder="%" value={split.qtd} onChange={e=>updateSplit(key,si,"qtd",e.target.value)}
                          style={{width:70,padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                        <span style={{color:"#5a7a9a",fontSize:11}}>%</span>
                        <input type="number" placeholder="Preço" value={split.preco} onChange={e=>updateSplit(key,si,"preco",e.target.value)}
                          style={{width:110,padding:"6px 9px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:12,outline:"none",textAlign:"right"}}/>
                        {dec.splits.length>1&&<button onClick={()=>remSplit(key,si)} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:14}}>✕</button>}
                      </div>
                    ))}
                    <button onClick={()=>addSplit(key)} style={{fontSize:11,color:"#4a9eff",background:"none",border:"1px dashed #1e3a5f",borderRadius:5,padding:"3px 10px",cursor:"pointer"}}>+ Dividir entre fornecedores</button>
                  </div>
                );
              })}

              <div style={{display:"flex",gap:12,marginTop:16}}>
                <button onClick={confirmar} style={{flex:1,padding:"13px",background:"linear-gradient(135deg,#2e7d32,#1b5e20)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                  ✅ Confirmar e Lançar na Programação
                </button>
                <button onClick={()=>setShowFecharCotModal(false)} style={{padding:"13px 20px",background:"#1e3a5f",border:"none",borderRadius:8,color:"#7a9ab8",fontSize:13,cursor:"pointer"}}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          MODAL: PEDIDO DE COMPRA (pós Fechar Cotação, agrupado por fornecedor)
      ══════════════════════════════════════════════════════ */}
      {pedidoCompra && (()=>{
        function textoFornecedor(nome, dados) {
          const linhas = dados.itens.map(it=>`• ${it.produto}: ${fmtN(it.qtd,1)} ${it.unidade} × ${fmt(it.preco)} = ${fmt(it.qtd*it.preco)} (${it.venc})`);
          const total = dados.itens.reduce((s,it)=>s+it.qtd*it.preco,0);
          return `🌿 GC Agro — Pedido de Compra\nCotação de ${pedidoCompra.tipoLabel} — ${pedidoCompra.safraLabel}\nFornecedor: ${nome}\n\n${linhas.join("\n")}\n\nTotal: ${fmt(total)}`;
        }
        function whatsappPedidoLink(nome, dados) {
          const msg = encodeURIComponent(textoFornecedor(nome, dados));
          return `https://wa.me/55${(dados.telefone||"").replace(/\D/g,"")}?text=${msg}`;
        }
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,overflowY:"auto",padding:"20px"}}>
            <div style={{background:"#fff",borderRadius:14,padding:"24px",width:"min(800px,95vw)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div>
                  <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>📋 Pedido de Compra</div>
                  <div style={{fontSize:12,color:"#888"}}>Cotação de {pedidoCompra.tipoLabel} — {pedidoCompra.safraLabel}. Cotação fechada e já lançada na Programação — envie a lista abaixo pra cada fornecedor.</div>
                </div>
                <button onClick={()=>setPedidoCompra(null)} style={{padding:"8px 14px",background:"#f5f5f5",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>Fechar ✕</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:14}}>
                {Object.entries(pedidoCompra.fornecedores).map(([nome,dados])=>{
                  const total = dados.itens.reduce((s,it)=>s+it.qtd*it.preco,0);
                  return (
                    <div key={nome} style={{border:"1px solid #e0e0e0",borderRadius:10,padding:"14px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
                        <div style={{fontWeight:800,fontSize:15,color:"#1a3a1a"}}>{nome}</div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>navigator.clipboard.writeText(textoFornecedor(nome,dados))} style={{padding:"6px 12px",background:"#f0f0f0",border:"none",borderRadius:6,fontSize:11,cursor:"pointer"}}>📋 Copiar texto</button>
                          {dados.telefone && <a href={whatsappPedidoLink(nome,dados)} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",background:"#25D366",color:"#fff",borderRadius:6,fontSize:11,textDecoration:"none",fontWeight:700}}>📱 WhatsApp</a>}
                        </div>
                      </div>
                      <div style={{overflowX:"auto"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:"#f5f5f5"}}>
                              {["Produto","Qtd.","Unid.","Preço","Total","Vencimento"].map(h=>(
                                <th key={h} style={{padding:"5px 8px",textAlign:"left",fontSize:10,color:"#888",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dados.itens.map((it,i)=>(
                              <tr key={i}>
                                <td style={{padding:"5px 8px",fontWeight:600}}>{it.produto}</td>
                                <td style={{padding:"5px 8px"}}>{fmtN(it.qtd,1)}</td>
                                <td style={{padding:"5px 8px"}}>{it.unidade}</td>
                                <td style={{padding:"5px 8px"}}>{fmt(it.preco)}</td>
                                <td style={{padding:"5px 8px",fontWeight:700,color:"#2e7d32"}}>{fmt(it.qtd*it.preco)}</td>
                                <td style={{padding:"5px 8px",color:"#888"}}>{it.venc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{textAlign:"right",marginTop:8,fontWeight:800,color:"#2e7d32"}}>Total: {fmt(total)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
    </div>
  );
}

function StatC({label,value,color}){return <div style={{background:"#0d1e36",borderRadius:7,padding:"9px 11px"}}><div style={{fontSize:9,color:"#5a7a9a",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{label}</div><div style={{fontSize:12,fontWeight:700,color}}>{value}</div></div>;}
function SyncBadge(){
  return fbDb
    ? <span title="Sincronizado em nuvem — outros aparelhos veem em tempo real" style={{fontSize:10,padding:"3px 9px",background:"#0d2a1a",border:"1px solid #2e7d3266",borderRadius:20,color:"#4ade80"}}>☁️ Sincronizado</span>
    : <span title="Sem conexão com a nuvem — dados só neste aparelho/navegador" style={{fontSize:10,padding:"3px 9px",background:"#2a1a0d",border:"1px solid #f59e0b66",borderRadius:20,color:"#f59e0b"}}>⚠ Somente local</span>;
}
function thS(align,bg,color="#7a9ab8"){return {padding:"8px 10px",background:bg,color,textAlign:align,fontSize:10,letterSpacing:1,fontWeight:600,textTransform:"uppercase",whiteSpace:"nowrap",border:"1px solid #1e3a5f22"};}
function tdS(align,bg,color="#c8dff0",bold=false){return {padding:"7px 10px",background:bg,color,textAlign:align,fontSize:11,fontWeight:bold?700:400,border:"1px solid #1e3a5f22",whiteSpace:"nowrap"};}

