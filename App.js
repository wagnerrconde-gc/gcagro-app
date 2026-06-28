import { useState, useMemo, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

// ── Firebase ──────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCGNQgHu045WiK7SvL-TgCY1hkrijMpzj4",
  authDomain: "gc-agro-app.firebaseapp.com",
  databaseURL: "https://gc-agro-app-default-rtdb.firebaseio.com",
  projectId: "gc-agro-app",
  storageBucket: "gc-agro-app.firebasestorage.app",
  messagingSenderId: "79130236395",
  appId: "1:79130236395:web:3619616a50ef448cb075ae"
};
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(firebaseApp);
const fbSet = (path, data) => set(ref(db, path), data).catch(console.error);
const fbListen = (path, cb) => onValue(ref(db, path), s => cb(s.exists() ? s.val() : null));

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  safraVerao: "gcagro_v4_safra_verao",
  safraSafrinha: "gcagro_v4_safra_safrinha",
  safrasAtivas: "gcagro_v4_safras_ativas",
  safrasArquivadas: "gcagro_v4_safras_arquivadas",
  cotacoes: "gcagro_v4_cotacoes",
  vendas: "gcagro_v4_vendas",
  compras: "gcagro_v4_compras",
  produtividade: "gcagro_v4_produtividade",
  planejamentoVerao: "gcagro_v4_plan_verao",
  planejamentoSafrinha: "gcagro_v4_plan_safrinha",
  tsVerao: "gcagro_v4_ts_verao",
  tsSafrinha: "gcagro_v4_ts_safrinha",
  fornecedores: "gcagro_v4_fornecedores",
};
const ls = {
  get: (k,d) => { try { const r=localStorage.getItem(k); return r?JSON.parse(r):d; } catch { return d; } },
  set: (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} }
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_PWD = "gcagro2526";
const BG_IMAGE = "url('/field-bg.jpg')";

const FORN_DEFAULT_INS = [
  {nome:"Trisolo",telefone:"",token:"TR-X7K2"},
  {nome:"Agrocerrado",telefone:"",token:"AG-P3N9"},
  {nome:"Terrena",telefone:"",token:"TE-M8Q4"},
  {nome:"Tchê",telefone:"",token:"TC-W5R1"},
  {nome:"AgroBrasil",telefone:"",token:"AB-K6Y3"},
  {nome:"Valoriza",telefone:"",token:"VA-J2H8"},
  {nome:"Coagril",telefone:"",token:"CO-N4L7"},
  {nome:"Protec",telefone:"",token:"PR-D9F5"},
];
const FORN_DEFAULT_ADUB = [
  {nome:"Yara",telefone:"",token:"YA-B2X9"},
  {nome:"ADM",telefone:"",token:"AD-C7M3"},
  {nome:"Calcário Noroeste",telefone:"",token:"CN-H5K1"},
  {nome:"Agro Brasil",telefone:"",token:"AB-R8P4"},
  {nome:"Plano Agronegócios",telefone:"",token:"PA-Q6T2"},
  {nome:"Valoriza",telefone:"",token:"VA-L9K2"},
  {nome:"Produttiva",telefone:"",token:"PR-W3N7"},
  {nome:"Nascente",telefone:"",token:"NA-L9D5"},
];

const CULT_COLORS = {
  Soja:              {bg:"#1a5c2e",light:"#e8f5e9",accent:"#2e7d32",badge:"#43a047"},
  Feijão:            {bg:"#7b1c1c",light:"#fce4ec",accent:"#c62828",badge:"#e53935"},
  Milho:             {bg:"#5c4a00",light:"#fff8e1",accent:"#f57f17",badge:"#fbc02d"},
  Trigo:             {bg:"#4a3800",light:"#fff8e1",accent:"#b8860b",badge:"#daa520"},
  "Feijão Irrigado": {bg:"#7b1c1c",light:"#fce4ec",accent:"#c62828",badge:"#e53935"},
  "Milho Irrigado":  {bg:"#1a4a5c",light:"#e3f2fd",accent:"#0277bd",badge:"#039be5"},
  "Milho Semente":   {bg:"#2e4a1a",light:"#f1f8e9",accent:"#558b2f",badge:"#7cb342"},
  "Milho Sequeiro":  {bg:"#4a2e00",light:"#fff3e0",accent:"#e65100",badge:"#fb8c00"},
  Sorgo:             {bg:"#3a1a5c",light:"#f3e5f5",accent:"#7b1fa2",badge:"#ab47bc"},
};
const CAT_ICONS = {
  "Adubação":"🌱","Sementes / TS":"🌾","Kit Sulco":"🪱",
  "Dessecação e Pós":"💧","Foliares":"🍃","Fungicidas":"🔬",
  "Inseticidas":"🛡️","Óleos / Adjuvantes":"🧴",
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n==null||n==="") return "—";
  const v=Number(n); if(isNaN(v)) return "—";
  const r=Math.round(v*10)/10;
  return r%1===0?String(Math.round(r)):r.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
};
const fmtR = (n) => isNaN(Number(n))||n==null?"R$ 0,00":Number(n).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtR2 = (v) => v==null||v===""?"—":`R$ ${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const calcProd = (p) => p.dose>0?p.dose*p.area*(p.preco_compra||p.preco_unit):p.area*(p.preco_compra||p.preco_unit);
const calcRef = (p) => p.dose>0?p.dose*p.area*p.preco_unit:p.area*p.preco_unit;

function genToken(name) {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let t=(name||"XX").substring(0,2).toUpperCase()+"-";
  for(let i=0;i<4;i++) t+=chars[Math.floor(Math.random()*chars.length)];
  return t;
}

const INITIAL_DATA_VERAO = {
  Soja: {
    area: 957, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":300, FRETE:150, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Yara Basa", dose:0.125, area:957, fase:"Plantio", obs:"Adubação média", preco_unit:4530, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Kcl", dose:0.22, area:957, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Fort C", dose:179, area:957, fase:"Diluído", obs:"Áreas fracas 11/13", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:957, fase:"Diluído", obs:"Posto Fazenda", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Gesso", dose:0.6, area:957, fase:"Diluído", obs:"Posto Fazenda", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Tecno B10 (ULEXITA)", dose:10, area:957, fase:"Diluído", obs:"", preco_unit:4.4, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Plano Agronegócios", vencimento:"30/04/2026" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTE SOJA", dose:0, area:957, fase:"", obs:"MÉDIA", preco_unit:582, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Endofuse", dose:0.03, area:957, fase:"100 kg sem.", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Auras", dose:0.2, area:957, fase:"100 kg sem.", obs:"", preco_unit:430, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Raiz F Plus", dose:0.2, area:957, fase:"100 kg sem.", obs:"850 hectares", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Germinar", vencimento:"30/04/2026" },
        { produto:"Aveo", dose:0.02, area:840, fase:"100 kg sem.", obs:"EXCETO B5830", preco_unit:5500, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Azos", dose:2, area:957, fase:"doses", obs:"2 doses", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Nodugran", dose:10, area:957, fase:"doses", obs:"10 DOSES", preco_unit:1.28, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Torpeno (Trichoderma)", dose:0.12, area:957, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Dessecação e Pós", products:[
        { produto:"Roundup Wg / Tecnup", dose:5, area:1100, fase:"", obs:"Preço médio", preco_unit:28.96, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"Trisolo / Adm", vencimento:"30/04/2026" },
        { produto:"Pôquer", dose:1.5, area:960, fase:"", obs:"980 l em estoque", preco_unit:33.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cletodim", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Diquat", dose:2, area:957, fase:"", obs:"Dessecação Colheita", preco_unit:22.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Plantar", vencimento:"30/04/2026" },
        { produto:"Glufosinato (offroad)", dose:2, area:960, fase:"", obs:"Dessecação pós sojas CE", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato de amônio", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Dual Gold", dose:1, area:600, fase:"", obs:"Irrigado + sequeiro", preco_unit:55, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Prêmio", dose:0.05, area:957, fase:"Dessecação", obs:"Área Total", preco_unit:490, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorantraniliprole", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Octaborato (Nutry bor)", dose:2, area:957, fase:"", obs:"500 kg em estoque", preco_unit:15.2, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Nutry NiCoMo", dose:0.15, area:957, fase:"V3/V6/R1", obs:"3 x 50 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Aminogran", dose:0.3, area:1666.7, fase:"", obs:"Pré stress", preco_unit:42.15, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valence", vencimento:"30/04/2026" },
        { produto:"Map Purificado (Fluid P)", dose:1, area:1500, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Max K 400", dose:1.5, area:820, fase:"R5.1", obs:"Enchimento", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Utrisha", dose:0.333, area:380, fase:"", obs:"Irrigado", preco_unit:340, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Combat Duo", dose:0.3, area:1666.7, fase:"", obs:"Mildio", preco_unit:73.09, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valence", vencimento:"30/04/2026" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Score", dose:0.2, area:1540, fase:"V2", obs:"Área total vegetativo", preco_unit:79, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Difenoconazol", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Vessarya", dose:0.6, area:583.3, fase:"V6", obs:"Add Difeno", preco_unit:163, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina + Benzovindiflupir", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Belyan", dose:0.6, area:483.3, fase:"R1", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mefentrifluconazol + Fluxapiroxade + Piraclostrobina", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Fox Xpro", dose:0.5, area:500, fase:"R1", obs:"", preco_unit:260, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafem + Protioconazol + Trifloxistrobina", revenda:"Agro Brasil", vencimento:"30/10/2025" },
        { produto:"Excalia Max", dose:0.5, area:670, fase:"R5.1", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Impirfluxam + Tebuconazol", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Approve", dose:1, area:950, fase:"", obs:"Mofo", preco_unit:135, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Unizeb Gold", dose:3, area:1000, fase:"R1", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Accuracy", dose:0.75, area:957, fase:"", obs:"Biológico vegetativo", preco_unit:36, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bacillus subtilis QST 713", revenda:"Valoriza", vencimento:"30/09/2025" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Prêmio // Shenzi", dose:0.1, area:957, fase:"Veg/Rep", obs:"2 x geral", preco_unit:490, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorantraniliprole / Bifentrina", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Expedition", dose:0.3, area:1200, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Lambda-cialotrina", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Platinum Neo", dose:0.3, area:1333.3, fase:"", obs:"", preco_unit:132, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Adm", vencimento:"30/04/2026" },
        { produto:"Vivantha", dose:0.06, area:960, fase:"", obs:"60 g dose", preco_unit:390, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"Adm", vencimento:"30/04/2026" },
        { produto:"Curbix", dose:0.75, area:700, fase:"", obs:"", preco_unit:90, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Etiprole", revenda:"Agro Brasil", vencimento:"30/09/2025" },
        { produto:"Pirate", dose:0.75, area:266.7, fase:"", obs:"Tripes", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"Khrom Oil", dose:0.25, area:1000, fase:"Dessecação", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"TA 35 Ultra", dose:0.15, area:2000, fase:"Dessecação", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"TA 35 Gold", dose:0.15, area:5000, fase:"Herb/fung", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Trisolo", vencimento:"30/04/2026" },
      ]},
    ]
  },
  Feijão: {
    area: 136.5, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":500, FRETE:100, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Map", dose:0.15, area:136.5, fase:"Plantio", obs:"", preco_unit:4690, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"ADM", vencimento:"30/11/2024" },
        { produto:"Kcl", dose:0.21, area:136.5, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:136.5, fase:"Pré plantio", obs:"Posto Fazenda", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Gesso", dose:0.6, area:136.5, fase:"Pré plantio", obs:"Posto Fazenda", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Uréia Mosaic / Tocantins", dose:0.22, area:136.5, fase:"", obs:"Preço médio", preco_unit:3320, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"ADM / Lécio", vencimento:"15/07/2025" },
        { produto:"Fort C", dose:179, area:136.5, fase:"", obs:"Diluido", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/10/2025" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTES FEIJÃO", dose:0, area:136.5, fase:"", obs:"MÉDIA", preco_unit:400, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Dermacor", dose:0.081, area:136.5, fase:"Plantio", obs:"", preco_unit:1970, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Endofuse", dose:0.02, area:136.5, fase:"Plantio", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Raiz F Plus", dose:0.15, area:136.5, fase:"Plantio", obs:"", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Germinar", vencimento:"30/04/2026" },
        { produto:"Aveo", dose:0.01, area:136.5, fase:"Plantio", obs:"", preco_unit:5500, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Azos", dose:2, area:136.5, fase:"doses", obs:"2 doses", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Tropic", dose:5, area:136.5, fase:"doses", obs:"", preco_unit:4.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Torpeno", dose:0.12, area:136.5, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Dessecação e Pós", products:[
        { produto:"Roundup wg", dose:2, area:136.5, fase:"", obs:"", preco_unit:28.96, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Basagran 600", dose:1, area:136.5, fase:"", obs:"", preco_unit:97.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bentazona", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Dual Gold", dose:0.8, area:136.5, fase:"", obs:"Pré plantio", preco_unit:55, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Diquat", dose:2, area:136.5, fase:"", obs:"", preco_unit:22.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Plantar", vencimento:"30/04/2026" },
        { produto:"Glufosinato (off road)", dose:2, area:136.5, fase:"", obs:"Pré plantio", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato de amônio", revenda:"ADM", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Nutry NiCoMo", dose:0.12, area:136.5, fase:"V4/R6", obs:"2 X 60 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Max K 400", dose:1.5, area:136.5, fase:"", obs:"", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Map Purificado (Fluid P)", dose:2.9301, area:136.5, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Promalin", dose:0.05, area:136.5, fase:"R5/R6", obs:"Pré florada", preco_unit:630, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"GA3 + 6-BAP", revenda:"Valoriza", vencimento:"30/08/2024" },
        { produto:"Kellus Copper", dose:0.134, area:136.5, fase:"V6/R5", obs:"2 X 75 G", preco_unit:94, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Agro Brasil", vencimento:"30/10/2025" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Nativo Plus", dose:0.7227, area:276.7, fase:"R5/R7", obs:"2 x", preco_unit:114, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tebuconazol + Trifloxistrobina + Oxicloreto de cobre", revenda:"Agro Brasil", vencimento:"30/10/2025" },
        { produto:"Approve", dose:2, area:136.5, fase:"", obs:"", preco_unit:135, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Unizeb gold", dose:1.5, area:275, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:0.8, area:270, fase:"Pré florada", obs:"2 x", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Expedition", dose:0.3, area:136.5, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Lambda-cialotrina", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Vivantha", dose:0.08, area:270, fase:"", obs:"2 x 75 g", preco_unit:390, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Benevia", dose:0.879, area:136.5, fase:"", obs:"", preco_unit:227, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"Produttiva", vencimento:"30/04/2025" },
        { produto:"Verdavis", dose:0.25, area:136.5, fase:"", obs:"", preco_unit:515, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Plinazolin + Lambda-cialotrina", revenda:"Nascente", vencimento:"30/04/2026" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:1000, fase:"HERBICIDAS", obs:"", preco_unit:65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"Krhom oil", dose:0.25, area:260, fase:"HERBICIDAS", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
    ]
  },
  Milho: {
    area: 252, ativo: true,
    op_costs: { PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 },
    categories: [
      { name:"Adubação", products:[
        { produto:"Yara Basa", dose:0.175, area:252, fase:"Plantio", obs:"Média", preco_unit:4530, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Kcl", dose:0.24, area:252, fase:"Plantio", obs:"Preço médio", preco_unit:2850, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"30/10/2025" },
        { produto:"Calcário", dose:1, area:252, fase:"Pré plantio", obs:"Diluido", preco_unit:205, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Uréia EXCLN / Tocantins", dose:0.4, area:252, fase:"Pós plantio", obs:"Preço médio", preco_unit:3320, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"ADM / Tocantins", vencimento:"15/07/2025" },
        { produto:"Gesso", dose:0.6, area:252, fase:"Pré plantio", obs:"Diluido", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Calcário Noroeste", vencimento:"30/04/2025" },
        { produto:"Fort C", dose:179, area:252, fase:"", obs:"Diluido", preco_unit:0.65, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/10/2025" },
      ]},
      { name:"Sementes / TS", products:[
        { produto:"SEMENTES MILHO", dose:1, area:252, fase:"", obs:"Média", preco_unit:1575, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"30/04/2026" },
        { produto:"Endofuse", dose:0.075, area:252, fase:"", obs:"", preco_unit:7550, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Auras", dose:0.4, area:252, fase:"", obs:"", preco_unit:430, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"30/04/2026" },
        { produto:"Raiz F Plus", dose:0.2, area:252, fase:"", obs:"", preco_unit:420, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Germinar", vencimento:"30/04/2026" },
      ]},
      { name:"Kit Sulco", products:[
        { produto:"Torpeno", dose:0.12, area:252, fase:"", obs:"", preco_unit:200, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Azos", dose:2, area:252, fase:"doses", obs:"", preco_unit:4.35, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Nascente", vencimento:"30/04/2026" },
      ]},
      { name:"Dessecação e Pós", products:[
        { produto:"Proof", dose:4, area:252, fase:"", obs:"Dessecação", preco_unit:22.9, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato + Pirithiobac-sódico", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Reglone", dose:2, area:252, fase:"", obs:"", preco_unit:26.9, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Off road", dose:2, area:252, fase:"", obs:"", preco_unit:18.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato de amônio", revenda:"ADM", vencimento:"30/04/2026" },
        { produto:"Terrador", dose:0.2, area:252, fase:"", obs:"", preco_unit:439, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ioxinil + Bromoxinil", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Roundup Wg", dose:2, area:252, fase:"", obs:"", preco_unit:25.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"ADM", vencimento:"30/04/2026" },
      ]},
      { name:"Foliares", products:[
        { produto:"Nutry NiCoMo", dose:0.2, area:252, fase:"", obs:"3 x 60 g", preco_unit:208, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Utrisha N", dose:0.333, area:252, fase:"", obs:"", preco_unit:340, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/10/2025" },
        { produto:"Map Purificado (Fluid P)", dose:3.2, area:250, fase:"", obs:"", preco_unit:23, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"30/04/2026" },
        { produto:"Max k 400", dose:1.5, area:252, fase:"", obs:"Enchimento", preco_unit:17.6, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
      { name:"Fungicidas", products:[
        { produto:"Unizeb Gold", dose:3, area:252, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"30/04/2026" },
        { produto:"Excalia Max", dose:0.6, area:252, fase:"", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Impirfluxam + Tebuconazol", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Belyan", dose:0.6, area:252, fase:"", obs:"", preco_unit:220, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mefentrifluconazol + Fluxapiroxade + Piraclostrobina", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Fox Xpro", dose:0.5, area:500, fase:"", obs:"2 aplicações", preco_unit:260, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafem + Protioconazol + Trifloxistrobina", revenda:"Agro Brasil", vencimento:"30/10/2025" },
      ]},
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:1.5, area:252, fase:"", obs:"", preco_unit:85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"30/10/2025" },
        { produto:"Verdavis", dose:0.25, area:500, fase:"", obs:"2 aplicações", preco_unit:515, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Plinazolin + Lambda-cialotrina", revenda:"Nascente", vencimento:"30/04/2026" },
        { produto:"Curbix", dose:0.8, area:252, fase:"", obs:"", preco_unit:90, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Etiprole", revenda:"Agro Brasil", vencimento:"30/09/2025" },
        { produto:"Expedition", dose:0.3, area:252, fase:"", obs:"", preco_unit:162, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Lambda-cialotrina", revenda:"Valoriza", vencimento:"30/09/2025" },
        { produto:"Exalt", dose:0.2, area:250, fase:"", obs:"", preco_unit:720, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Espinetoram", revenda:"Valoriza", vencimento:"30/09/2025" },
      ]},
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:1500, fase:"", obs:"", preco_unit:70, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Trisolo", vencimento:"30/04/2026" },
        { produto:"Óleo vegetal", dose:0.5, area:920, fase:"", obs:"", preco_unit:14.66, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:0.25, area:500, fase:"HERBICIDAS", obs:"", preco_unit:37, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"Produttiva", vencimento:"30/04/2026" },
      ]},
    ]
  }
,
  "Milho Semente": {
    area: 0, ativo: true, op_costs: {"Plantio":540,"Aplicações":150,"Colheita":200},
    categories: [
      { name:"Adubação", products:[
        {produto:"Yara Basa",dose:0.125,area:0,fase:"Plantio",obs:"",preco_unit:4530,ingrediente_ativo:"",revenda:"Yara",vencimento:"30/10/2025",preco_compra:null,fornecedor_compra:null},
        {produto:"KCl",dose:0.220,area:0,fase:"Plantio",obs:"",preco_unit:2850,ingrediente_ativo:"",revenda:"Yara",vencimento:"30/10/2025",preco_compra:null,fornecedor_compra:null},
      ]},
      { name:"Sementes / TS", products:[
        {produto:"Semente Milho",dose:0,area:0,fase:"bag",obs:"",preco_unit:0,ingrediente_ativo:"",revenda:"",vencimento:"",preco_compra:null,fornecedor_compra:null},
      ]},
      { name:"Fungicidas", products:[]},
      { name:"Inseticidas", products:[]},
      { name:"Foliares", products:[]},
    ]
  }};

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
        { produto:"Provilar", dose:0.3, area:100.0, fase:"", obs:"Pivot 1/11", preco_unit:240.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Produttiva", vencimento:"2025-08-30" }
      ] },
      { name:"Dessecação e Pós", products:[
        { produto:"Primoleo", dose:6.0, area:575.0, fase:"", obs:"Dessecação", preco_unit:22.11, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mesotriona + Nicossulfurom", revenda:"Nascente", vencimento:"2025-09-15" },
        { produto:"Mesotriona", dose:0.2, area:415.0, fase:"", obs:"", preco_unit:85.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mesotriona", revenda:"Pioneira", vencimento:"2025-08-30" },
        { produto:"Diquat", dose:2.0, area:575.0, fase:"", obs:"", preco_unit:23.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Off road", dose:2.0, area:370.0, fase:"", obs:"", preco_unit:19.44, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato de amônio", revenda:"Nascente", vencimento:"2025-09-15" }
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
        { produto:"Onsuva", dose:0.3, area:330.0, fase:"", obs:"95 ha sequeiro + 230 ha irrigado", preco_unit:350.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluxapiroxade + Piraclostrobina", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Odin", dose:0.2, area:575.0, fase:"", obs:"", preco_unit:45.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluazinam + Tebuconazol", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Fusão", dose:0.7, area:575.0, fase:"", obs:"", preco_unit:80.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina + Tebuconazol", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Almada", dose:2.0, area:58.0, fase:"", obs:"50 ha irrigado", preco_unit:72.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tebuconazol + Trifloxistrobina", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Fox Xpro", dose:0.5, area:323.0, fase:"", obs:"", preco_unit:260.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bixafem + Protioconazol + Trifloxistrobina", revenda:"", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Clorfenapir", dose:2.0, area:575.0, fase:"", obs:"", preco_unit:65.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Pioneira", vencimento:"2025-08-30" },
        { produto:"Verdavis", dose:0.25, area:1000.0, fase:"", obs:"2x", preco_unit:465.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Plinazolin + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Bazuka", dose:1.0, area:575.0, fase:"", obs:"", preco_unit:21.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Bifentrina", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Lufenurom / Kraton", dose:0.5, area:400.0, fase:"", obs:"", preco_unit:55.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lufenurom + Lambda-cialotrina", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Curbix", dose:0.9, area:370.0, fase:"", obs:"", preco_unit:90.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Etiprole", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Expedition", dose:0.3, area:370.0, fase:"", obs:"", preco_unit:162.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Lambda-cialotrina", revenda:"Valoriza", vencimento:"2025-09-30" },
        { produto:"Clorpirifos", dose:1.25, area:575.0, fase:"", obs:"", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:2800.0, fase:"", obs:"Usar no lugar do óleo", preco_unit:60.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:1.0, area:575.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:35.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" }
      ] }
    ] },
  "Feijão Irrigado": { area:160, ativo:true, op_costs:{ PLANTIO:300, "APLICAÇÕES":500, FRETE:100, COLHEITA:300, "INVESTIMENTO SOLO":490, IRRIGAÇÃO:600 }, categories:[
      { name:"Adubação", products:[] },
      { name:"Sementes / TS", products:[
        { produto:"Verimark", dose:0.3, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"", vencimento:"" },
        { produto:"Certeza N / Plust", dose:0.2, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam", revenda:"", vencimento:"" },
        { produto:"Enraize Max", dose:0.1, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Adage / Cruiser / ímpar", dose:0.25, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam", revenda:"", vencimento:"" }
      ] },
      { name:"Kit Sulco", products:[
        { produto:"Protege / Arvatico / Provilar", dose:0.3, area:160.0, fase:"", obs:"Gastar estoque // comprar provilar", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"", vencimento:"" },
        { produto:"Azospirilum", dose:0.2, area:160.0, fase:"", obs:"320 doses", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" }
      ] },
      { name:"Dessecação e Pós", products:[
        { produto:"Amplo", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cletodim + Haloxifope-P-metílico", revenda:"", vencimento:"" },
        { produto:"Select", dose:2.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Cletodim", revenda:"", vencimento:"" },
        { produto:"Dual Gold", dose:0.75, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"", vencimento:"" },
        { produto:"Diquat", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"", vencimento:"" },
        { produto:"SHIFT 250", dose:0.3, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Haloxifope-P-metílico", revenda:"", vencimento:"" },
        { produto:"Trifulalina", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trifluralin", revenda:"", vencimento:"" },
        { produto:"Sungai Xtra", dose:0.08, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato + Sulfentrazona", revenda:"", vencimento:"" },
        { produto:"Roundup WG", dose:2.5, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato", revenda:"", vencimento:"" },
        { produto:"Glufosinato", dose:2.5, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glufosinato de amônio", revenda:"", vencimento:"" },
        { produto:"Diquat", dose:2.0, area:160.0, fase:"", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Diquat", revenda:"", vencimento:"" }
      ] },
      { name:"Foliares", products:[
        { produto:"Essenza Bor", dose:1.5, area:160.0, fase:"V3 / V7 / R6", obs:"3 x 0,5 lt", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Maxcell", dose:0.1688, area:160.0, fase:"V2 / V6", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"", vencimento:"" },
        { produto:"Promalin", dose:0.05, area:160.0, fase:"R5", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"GA3 + 6-BAP", revenda:"", vencimento:"" },
        { produto:"Hulk", dose:0.1, area:160.0, fase:"V3", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Glifosato + Sulfentrazona", revenda:"", vencimento:"" },
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
        { produto:"Vessarya", dose:0.5, area:160.0, fase:"V5", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina + Benzovindiflupir", revenda:"", vencimento:"" },
        { produto:"Evolution", dose:2.0, area:160.0, fase:"R5", obs:"EM ABERTO PRODUTIVA", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina + Ciproconazol", revenda:"", vencimento:"" },
        { produto:"Viovan", dose:0.5, area:160.0, fase:"R7", obs:"EM ESTOQUE", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluindapir + Trifloxistrobina", revenda:"", vencimento:"" },
        { produto:"Aproach Premium", dose:0.7, area:160.0, fase:"R8", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina + Ciproconazol", revenda:"", vencimento:"" },
        { produto:"Unizeb Gold", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"", vencimento:"" },
        { produto:"Sialex / Parrudo", dose:2.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tebuconazol", revenda:"", vencimento:"" },
        { produto:"Fluazinam", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fluazinam", revenda:"", vencimento:"" },
        { produto:"Approve", dose:1.6, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiofanato-metílico", revenda:"", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Clorfenapir Nortox", dose:1.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"", vencimento:"" },
        { produto:"Elestal Neo", dose:0.15, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Flubendiamida", revenda:"", vencimento:"" },
        { produto:"Kraton / Lufenurom 100", dose:1.0, area:160.0, fase:"", obs:"4 x", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lambda-cialotrina + Lufenurom", revenda:"", vencimento:"" },
        { produto:"Benevia", dose:0.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Ciantraniliprole", revenda:"", vencimento:"" },
        { produto:"Perito", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina + Imidacloprido", revenda:"", vencimento:"" },
        { produto:"Abamectin 72", dose:1.0, area:160.0, fase:"Ácaros", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Abamectina", revenda:"", vencimento:"" },
        { produto:"Bifentrina", dose:0.6, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina", revenda:"", vencimento:"" },
        { produto:"Acetamiprid", dose:1.0, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"", vencimento:"" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 GOLD", dose:0.15, area:1600.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"", vencimento:"" },
        { produto:"Krhom oil", dose:0.5, area:160.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"", vencimento:"" }
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
        { produto:"Provilar", dose:0.1579, area:100.0, fase:"", obs:"", preco_unit:240.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Kit Sulco", products:[
        { produto:"Vigorgeo Azos", dose:0.2, area:100.0, fase:"", obs:"Aplicar logo após nascimento", preco_unit:4.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Torpeno", dose:0.2, area:100.0, fase:"", obs:"Aplicar logo após nascimento", preco_unit:216.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Dessecação e Pós", products:[
        { produto:"Dual Gold", dose:0.8, area:100.0, fase:"", obs:"Dessecação", preco_unit:54.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"S-Metolacloro", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Topik", dose:0.25, area:100.0, fase:"", obs:"", preco_unit:595.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clodinafope-propargil", revenda:"Nascente", vencimento:"2025-09-30" }
      ] },
      { name:"Foliares", products:[
        { produto:"Bortrac", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:36.8, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Yara", vencimento:"2024-11-30" },
        { produto:"Produze Max", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Nutry NiCoMo", dose:0.2, area:100.0, fase:"", obs:"", preco_unit:210.4, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Sulfato Magnésio", dose:6.0, area:100.0, fase:"", obs:"", preco_unit:2.85, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Potencer Ultra", dose:0.25, area:200.0, fase:"", obs:"2 X", preco_unit:91.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Utrisha N", dose:0.333, area:100.0, fase:"", obs:"", preco_unit:340.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Valoriza", vencimento:"2025-09-30" },
        { produto:"Octaborato", dose:2.0, area:100.0, fase:"", obs:"Dessecação", preco_unit:16.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-08-30" },
        { produto:"Moddus", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:135.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Trinexapaque-etílico", revenda:"Nascente", vencimento:"2025-09-30" },
        { produto:"Max k 400", dose:1.5, area:100.0, fase:"", obs:"", preco_unit:19.7, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Essenzamino", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:24.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"", revenda:"Produttiva", vencimento:"2025-09-30" }
      ] },
      { name:"Fungicidas", products:[
        { produto:"Bim Max", dose:1.0, area:200.0, fase:"", obs:"2x", preco_unit:160.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Iprodiona + Tiofanato-metílico", revenda:"Valoriza", vencimento:"2025-10-30" },
        { produto:"Fusão", dose:0.6, area:100.0, fase:"", obs:"", preco_unit:80.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Azoxistrobina + Tebuconazol", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Unizeb Gold", dose:3.0, area:100.0, fase:"", obs:"2x", preco_unit:31.5, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Mancozebe", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Mesic", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:120.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Fenpicoxamida", revenda:"Valoriza", vencimento:"2025-10-30" },
        { produto:"Aproach Power", dose:0.6, area:100.0, fase:"", obs:"", preco_unit:82.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Picoxistrobina + Tebuconazol", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Tilt", dose:0.4, area:100.0, fase:"", obs:"", preco_unit:70.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Propiconazol", revenda:"EM ESTOQUE", vencimento:"" }
      ] },
      { name:"Inseticidas", products:[
        { produto:"Pirate", dose:0.8, area:100.0, fase:"", obs:"", preco_unit:85.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorfenapir", revenda:"Terrena", vencimento:"2025-10-30" },
        { produto:"Acetamiprid", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Acetamiprido", revenda:"", vencimento:"" },
        { produto:"Expedition", dose:0.3, area:100.0, fase:"", obs:"", preco_unit:150.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Sulfoxaflor + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Lufenurom 100", dose:0.5, area:100.0, fase:"", obs:"", preco_unit:55.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Lufenurom", revenda:"Produttiva", vencimento:"2025-09-30" },
        { produto:"Perito", dose:1.0, area:100.0, fase:"", obs:"", preco_unit:0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Bifentrina + Imidacloprido", revenda:"", vencimento:"" }
      ] },
      { name:"Óleos / Adjuvantes", products:[
        { produto:"TA 35 Gold", dose:0.15, area:600.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:60.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Tiametoxam + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" },
        { produto:"Krhom oil", dose:1.0, area:100.0, fase:"HERBICIDAS", obs:"Usar no lugar do óleo", preco_unit:35.0, preco_compra:null, fornecedor_compra:null, ingrediente_ativo:"Clorpirifos + Lambda-cialotrina", revenda:"EM ESTOQUE", vencimento:"" }
      ] }
    ] },
  "Milho Irrigado": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490, IRRIGAÇÃO:600 }, categories:[] },
  "Milho Semente": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 }, categories:[] },
  "Milho Sequeiro": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300, "INVESTIMENTO SOLO":490 }, categories:[] },
  "Sorgo": { area:0, ativo:false, op_costs:{ PLANTIO:300, "APLICAÇÕES":300, FRETE:300, COLHEITA:300 }, categories:[] },
};
// ── Histórico de Vendas ───────────────────────────────────────────────────────
const HISTORICO_VENDAS_INICIAL = [
  {id:"v001",cultura:"Soja",safra:"Verão 20/21",qtd:20000,unidade:"sc",preco:80.00,comprador:"Aliança",dataEntrega:"",dataPagamento:"12/04/2021",obs:"ok"},
  {id:"v002",cultura:"Soja",safra:"Verão 20/21",qtd:10000,unidade:"sc",preco:85.00,comprador:"Dreyfus",dataEntrega:"",dataPagamento:"23/04/2021",obs:"ok"},
  {id:"v003",cultura:"Soja",safra:"Verão 20/21",qtd:10000,unidade:"sc",preco:86.00,comprador:"ADM",dataEntrega:"",dataPagamento:"18/05/2021",obs:"20 cent Jusley"},
  {id:"v004",cultura:"Soja",safra:"Verão 20/21",qtd:1862,unidade:"sc",preco:90.00,comprador:"Cereais Sul",dataEntrega:"",dataPagamento:"15/05/2021",obs:"ok"},
  {id:"v005",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:92.00,comprador:"ADM",dataEntrega:"",dataPagamento:"29/04/2021",obs:"ok"},
  {id:"v006",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:96.00,comprador:"Cocari",dataEntrega:"",dataPagamento:"30/04/2021",obs:"ok"},
  {id:"v007",cultura:"Soja",safra:"Verão 20/21",qtd:10000,unidade:"sc",preco:95.00,comprador:"ADM",dataEntrega:"",dataPagamento:"26/04/2021",obs:"ok"},
  {id:"v008",cultura:"Soja",safra:"Verão 20/21",qtd:1320,unidade:"sc",preco:137.00,comprador:"ADM",dataEntrega:"",dataPagamento:"26/04/2021",obs:"arrendo 38"},
  {id:"v009",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:163.00,comprador:"Nova Agri",dataEntrega:"",dataPagamento:"28/05/2021",obs:"ok"},
  {id:"v010",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:166.00,comprador:"Nova Agri",dataEntrega:"",dataPagamento:"01/06/2021",obs:"ok"},
  {id:"v011",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:175.00,comprador:"ADM",dataEntrega:"",dataPagamento:"28/06/2021",obs:"ok"},
  {id:"v012",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:166.50,comprador:"Gavilon",dataEntrega:"",dataPagamento:"01/10/2021",obs:"Jusley 20 cent"},
  {id:"v013",cultura:"Soja",safra:"Verão 20/21",qtd:5000,unidade:"sc",preco:166.20,comprador:"Agro Mercantil",dataEntrega:"",dataPagamento:"25/10/2021",obs:"Jusley 20 cent"},
  {id:"v014",cultura:"Soja",safra:"Verão 20/21",qtd:5230,unidade:"sc",preco:180.20,comprador:"Cofco",dataEntrega:"",dataPagamento:"02/03/2022",obs:"Jusley 20 cent"},
  {id:"v015",cultura:"Soja",safra:"Verão 21/22",qtd:10000,unidade:"sc",preco:125.20,comprador:"ADM",dataEntrega:"28/02/2022",dataPagamento:"07/03/2022",obs:"Jusley"},
  {id:"v016",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:144.50,comprador:"Gavilon",dataEntrega:"28/02/2022",dataPagamento:"18/03/2022",obs:"Jusley"},
  {id:"v017",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:152.00,comprador:"Dreyfus",dataEntrega:"28/02/2022",dataPagamento:"13/04/2022",obs:"Jusley"},
  {id:"v018",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:154.00,comprador:"Dreyfus",dataEntrega:"março/2022",dataPagamento:"25/04/2022",obs:"ok"},
  {id:"v019",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:150.00,comprador:"Dreyfus",dataEntrega:"",dataPagamento:"20/04/2022",obs:"ok"},
  {id:"v020",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:155.50,comprador:"ADM",dataEntrega:"",dataPagamento:"30/05/2022",obs:"ok"},
  {id:"v021",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:180.30,comprador:"Cofco",dataEntrega:"",dataPagamento:"30/05/2022",obs:"Jusley 30 cent"},
  {id:"v022",cultura:"Soja",safra:"Verão 21/22",qtd:7500,unidade:"sc",preco:193.00,comprador:"Cofco",dataEntrega:"",dataPagamento:"24/06/2022",obs:"ok"},
  {id:"v023",cultura:"Soja",safra:"Verão 21/22",qtd:4500,unidade:"sc",preco:195.00,comprador:"Cofco",dataEntrega:"",dataPagamento:"28/06/2022",obs:"ok"},
  {id:"v024",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:180.14,comprador:"ADM",dataEntrega:"",dataPagamento:"30/06/2022",obs:"antecipado taxa 1,5%"},
  {id:"v025",cultura:"Soja",safra:"Verão 21/22",qtd:5000,unidade:"sc",preco:179.00,comprador:"Nova Agri",dataEntrega:"",dataPagamento:"15/07/2022",obs:"ok"},
  {id:"v026",cultura:"Soja",safra:"Verão 21/22",qtd:1800,unidade:"sc",preco:171.00,comprador:"Luizin",dataEntrega:"",dataPagamento:"",obs:"à vista"},
  {id:"v027",cultura:"Soja",safra:"Verão 21/22",qtd:3000,unidade:"sc",preco:163.00,comprador:"Jusley",dataEntrega:"",dataPagamento:"",obs:"à vista"},
  {id:"v028",cultura:"Soja",safra:"Verão 21/22",qtd:10000,unidade:"sc",preco:175.00,comprador:"ADM",dataEntrega:"",dataPagamento:"26/08/2022",obs:"ok"},
  {id:"v029",cultura:"Soja",safra:"Verão 21/22",qtd:5404,unidade:"sc",preco:170.00,comprador:"ADM",dataEntrega:"",dataPagamento:"11/11/2022",obs:"ok"},
  {id:"v030",cultura:"Soja",safra:"Verão 22/23",qtd:5000,unidade:"sc",preco:158.50,comprador:"Ouro Safra",dataEntrega:"10/02/2023",dataPagamento:"14/04/2023",obs:"Jusley"},
  {id:"v031",cultura:"Soja",safra:"Verão 22/23",qtd:5000,unidade:"sc",preco:161.00,comprador:"Ouro Safra",dataEntrega:"18/02/2023",dataPagamento:"10/05/2023",obs:""},
  {id:"v032",cultura:"Soja",safra:"Verão 22/23",qtd:5000,unidade:"sc",preco:162.50,comprador:"ADM",dataEntrega:"30/03/2023",dataPagamento:"20/04/2023",obs:""},
  {id:"v033",cultura:"Soja",safra:"Verão 22/23",qtd:20000,unidade:"sc",preco:156.50,comprador:"ADM",dataEntrega:"30/03/2023",dataPagamento:"10/05/2023",obs:""},
  {id:"v034",cultura:"Soja",safra:"Verão 22/23",qtd:15000,unidade:"sc",preco:140.00,comprador:"Aliança",dataEntrega:"",dataPagamento:"28/05/2023",obs:""},
  {id:"v035",cultura:"Soja",safra:"Verão 22/23",qtd:10000,unidade:"sc",preco:119.50,comprador:"ADM",dataEntrega:"",dataPagamento:"27/07/2023",obs:""},
  {id:"v036",cultura:"Soja",safra:"Verão 22/23",qtd:19211,unidade:"sc",preco:120.00,comprador:"ADM",dataEntrega:"",dataPagamento:"17/08/2023",obs:""},
  {id:"v037",cultura:"Soja",safra:"Verão 23/24",qtd:10000,unidade:"sc",preco:110.00,comprador:"Aliança",dataEntrega:"28/02/2024",dataPagamento:"15/04/2024",obs:""},
  {id:"v038",cultura:"Soja",safra:"Verão 23/24",qtd:10000,unidade:"sc",preco:120.00,comprador:"Ouro Safra",dataEntrega:"28/02/2024",dataPagamento:"10/05/2024",obs:""},
  {id:"v039",cultura:"Soja",safra:"Verão 23/24",qtd:10000,unidade:"sc",preco:105.50,comprador:"ADM",dataEntrega:"março/2024",dataPagamento:"20/04/2024",obs:"Jusley"},
  {id:"v040",cultura:"Soja",safra:"Verão 23/24",qtd:27370,unidade:"sc",preco:111.30,comprador:"Bunge",dataEntrega:"abril/2024",dataPagamento:"29/04/2024",obs:"Jusley 1370 Wagner/1620 Ricardo"},
  {id:"v041",cultura:"Soja",safra:"Verão 23/24",qtd:8000,unidade:"sc",preco:117.50,comprador:"Cofco",dataEntrega:"",dataPagamento:"07/06/2024",obs:"Jusley"},
  {id:"v042",cultura:"Soja",safra:"Verão 23/24",qtd:7000,unidade:"sc",preco:121.30,comprador:"Bunge",dataEntrega:"",dataPagamento:"10/07/2024",obs:"Jusley"},
  {id:"v043",cultura:"Soja",safra:"Verão 23/24",qtd:14614,unidade:"sc",preco:123.30,comprador:"Bunge",dataEntrega:"",dataPagamento:"10/07/2024",obs:"pgto 10/7 e 30/7"},
  {id:"v044",cultura:"Soja",safra:"Verão 24/25",qtd:10000,unidade:"sc",preco:113.00,comprador:"Ouro Safra",dataEntrega:"20/02/2025",dataPagamento:"20/03/2025",obs:""},
  {id:"v045",cultura:"Soja",safra:"Verão 24/25",qtd:10000,unidade:"sc",preco:0,comprador:"Bunge",dataEntrega:"30/03/2025",dataPagamento:"30/04/2025",obs:"Frame - preço não informado"},
  {id:"v046",cultura:"Soja",safra:"Verão 24/25",qtd:10000,unidade:"sc",preco:117.00,comprador:"Bunge",dataEntrega:"20/02/2025",dataPagamento:"25/04/2025",obs:""},
  {id:"v047",cultura:"Soja",safra:"Verão 24/25",qtd:11460,unidade:"sc",preco:116.00,comprador:"Bioma",dataEntrega:"",dataPagamento:"15/05/2025",obs:"1460 sc ***"},
  {id:"v048",cultura:"Soja",safra:"Verão 24/25",qtd:10000,unidade:"sc",preco:120.00,comprador:"Ouro Safra",dataEntrega:"",dataPagamento:"30/05/2025",obs:""},
  {id:"v049",cultura:"Soja",safra:"Verão 24/25",qtd:26233,unidade:"sc",preco:123.00,comprador:"Bunge",dataEntrega:"",dataPagamento:"14/08/2025",obs:""},
  {id:"v050",cultura:"Soja",safra:"Verão 24/25",qtd:3000,unidade:"sc",preco:118.00,comprador:"Ouro Safra",dataEntrega:"",dataPagamento:"22/07/2025",obs:""},
  {id:"v051",cultura:"Soja",safra:"Verão 25/26",qtd:10000,unidade:"sc",preco:121.00,comprador:"Ouro Safra",dataEntrega:"20/02/2026",dataPagamento:"30/04/2026",obs:""},
  {id:"v052",cultura:"Soja",safra:"Verão 25/26",qtd:10000,unidade:"sc",preco:120.00,comprador:"Ouro Safra",dataEntrega:"20/02/2026",dataPagamento:"30/04/2026",obs:""},
  {id:"v053",cultura:"Soja",safra:"Verão 25/26",qtd:10000,unidade:"sc",preco:118.00,comprador:"Ouro Safra",dataEntrega:"28/02/2026",dataPagamento:"29/05/2026",obs:""},
  {id:"v054",cultura:"Soja",safra:"Verão 25/26",qtd:5000,unidade:"sc",preco:117.30,comprador:"ADM",dataEntrega:"30/03/2026",dataPagamento:"30/04/2026",obs:"Jusley"},
  {id:"v055",cultura:"Soja",safra:"Verão 25/26",qtd:5000,unidade:"sc",preco:117.00,comprador:"ADM",dataEntrega:"30/03/2026",dataPagamento:"30/04/2026",obs:""},
  {id:"v056",cultura:"Soja",safra:"Verão 25/26",qtd:20000,unidade:"sc",preco:112.00,comprador:"Ouro Safra",dataEntrega:"",dataPagamento:"05/05/2026",obs:""},
  {id:"v057",cultura:"Soja",safra:"Verão 25/26",qtd:15000,unidade:"sc",preco:110.00,comprador:"Ouro Safra",dataEntrega:"",dataPagamento:"30/04/2026",obs:""},
  {id:"v058",cultura:"Soja",safra:"Verão 25/26",qtd:3642,unidade:"sc",preco:113.00,comprador:"ADM",dataEntrega:"",dataPagamento:"29/06/2026",obs:""},
  {id:"v059",cultura:"Soja",safra:"Verão 26/27",qtd:20000,unidade:"sc",preco:120.00,comprador:"Coagril",dataEntrega:"28/02/2027",dataPagamento:"30/03/2027",obs:""},
];

// ── Planejamento inicial Verão ────────────────────────────────────────────────
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

// ── Planejamento inicial Safrinha ─────────────────────────────────────────────
const PLAN_SAFRINHA_INICIAL = [
  {id:"ps1",lote:"LOTE 11 PIVOT 01",area:100,cultura:"Feijão",variedade:"DAMA",adubacaoPlantio:"MAP 176 kg",cobertura:"KCl 139 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps2",lote:"LOTE 11 PIVOT 02",area:80.5,cultura:"Milho",variedade:"P3808 VYHR",adubacaoPlantio:"MAP 73 kg",cobertura:"KCl 250 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:"TSI Completo"},
  {id:"ps3",lote:"LOTE 11 PIVOT 03",area:41,cultura:"Milho",variedade:"FS 695 PWURR",adubacaoPlantio:"MAP 211 kg",cobertura:"KCl 217 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps4",lote:"LOTE 11 PIVOT 04",area:14,cultura:"Feijão",variedade:"DAMA",adubacaoPlantio:"MAP 150 kg",cobertura:"KCl 176 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps5",lote:"LOTE 13 PIVOT 01",area:101.5,cultura:"Trigo",variedade:"BRS 264",adubacaoPlantio:"MAP 100 kg",cobertura:"KCl 100 kg",nCobertura:"Ureia 300 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps6",lote:"LOTE 13 PIVOT 02",area:57.5,cultura:"Milho",variedade:"P40537 PWURR",adubacaoPlantio:"MAP 180 kg",cobertura:"KCl 250 kg",nCobertura:"Ureia 400 kg",populacao:3.4,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps7",lote:"LOTE 13 PIVOT 03",area:26.5,cultura:"Feijão",variedade:"DAMA",adubacaoPlantio:"MAP 210 kg",cobertura:"KCl 131 kg",nCobertura:"Ureia 250 kg",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps8",lote:"LOTE 40 CHAPADÃO",area:136.5,cultura:"Sorgo",variedade:"K 200",adubacaoPlantio:"MAP 58 kg",cobertura:"KCl 171 kg",nCobertura:"Ureia 200 kg",populacao:12.5,dataPlantio:"",previsaoColheita:"",obs:"Beneficiado"},
  {id:"ps9",lote:"LOTE 13 SEQUEIRO",area:119.5,cultura:"Sorgo",variedade:"1G100 / AA 227",adubacaoPlantio:"MAP 48 kg",cobertura:"KCl 141 kg",nCobertura:"Ureia 150 kg",populacao:12,dataPlantio:"",previsaoColheita:"",obs:""},
  {id:"ps10",lote:"LOTE 11 MUTHEMA + BICO DIVISA",area:75,cultura:"Sorgo",variedade:"1G100",adubacaoPlantio:"MAP 52 kg",cobertura:"KCl 150 kg",nCobertura:"Ureia 150 kg",populacao:12.5,dataPlantio:"",previsaoColheita:"",obs:""},
];

// ── TS Inicial ────────────────────────────────────────────────────────────────
const TS_VERAO_INICIAL = [
  {id:"ts1",cultura:"Soja",variedade:"B 5830 CE",dose100kg:"Dermacor
Lumitreo
Endofuse
Auras
Raiz F Plus",kgha:"",area:0,kitSulco:"Azos 2 doses + Nodugran 10 doses + Torpeno 0,12 L/ha",obs:"SEM AVEO"},
  {id:"ts2",cultura:"Soja",variedade:"Demais variedades",dose100kg:"Dermacor
Lumitreo
Endofuse
Auras
Raiz F Plus
Aveo",kgha:"",area:0,kitSulco:"Azos 2 doses + Nodugran 10 doses + Torpeno 0,12 L/ha",obs:""},
  {id:"ts3",cultura:"Milho",variedade:"Todas",dose100kg:"Endofuse
Auras
Raiz F Plus",kgha:"",area:0,kitSulco:"Azos 2 doses + Torpeno 0,12 L/ha",obs:""},
  {id:"ts4",cultura:"Feijão",variedade:"Todas",dose100kg:"Dermacor
Certeza/Torino
Impar/Adage
Endofuse
Raiz F Plus
Aveo",kgha:"",area:0,kitSulco:"Azos 2 doses + Tropic 5 doses + Torpeno 0,12 L/ha",obs:""},
];
const TS_SAFRINHA_INICIAL = [
  {id:"tsi1",cultura:"Milho",variedade:"P40537 PWURR",dose100kg:"Nema Protection 75ml
Trich Protection 300ml
Bioma Azum 200ml
Bioma Phos 150ml",kgha:"",area:0,kitSulco:"",obs:"TSI Completo"},
  {id:"tsi2",cultura:"Feijão",variedade:"DAMA",dose100kg:"Dermacor 80ml
Adage/Impar 300ml
Endofuse 15ml
Certeza 200ml
Acrescent Raiz 200ml",kgha:"",area:0,kitSulco:"Vigorgeo Azos 200ml",obs:""},
  {id:"tsi3",cultura:"Trigo",variedade:"BRS 264",dose100kg:"Enraize ZN 100ml
Vitavax 300ml
Standak 150ml",kgha:"",area:0,kitSulco:"",obs:""},
  {id:"tsi4",cultura:"Sorgo",variedade:"K200 / 1G100",dose100kg:"Beneficiado",kgha:"15",area:0,kitSulco:"",obs:"K200 Pivots 40/80/57 - 15kg sem/ha"},
];


// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS (proper React components - no hooks violations)
// ═══════════════════════════════════════════════════════════════════════════

// ── PlanejamentoVerao ─────────────────────────────────────────────────────────
function PlanejamentoVerao({data, setData}) {
  const [obs, setObs] = useState(() => ls.get("gcagro_v4_obs_planverao", ""));
  useEffect(() => { ls.set("gcagro_v4_obs_planverao", obs); }, [obs]);
  const total = data.reduce((s,r)=>s+(r.area||0),0);

  function upd(i,field,val) {
    setData(d=>d.map((r,ri)=>ri===i?{...r,[field]:["area","ciclo","populacao"].includes(field)?parseFloat(val)||0:val}:r));
  }

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a"}}>🗺️ Planejamento Campo — Safra Verão</div>
        <button onClick={()=>setData(d=>[...d,{id:Date.now()+"",lote:"",area:0,cultura:"Soja",variedade:"",adubacao:"",kcl:"",ciclo:0,populacao:0,dataPlantio:"",previsaoColheita:"",obs:""}])}
          style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lote</button>
      </div>
      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#1a5c2e",color:"#fff"}}>
                {["Lote / Fazenda","Área (ha)","Cultura","Variedade","Adubação Plantio","KCl","Ciclo (d)","Pop.(sem/m)","Data Plantio","Prev. Colheita",""].map(h=>(
                  <th key={h} style={{padding:"8px 8px",textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row,i)=>{
                const bg=i%2===0?"#fff":"#f9f9f9";
                const cc=CULT_COLORS[row.cultura]||CULT_COLORS.Soja;
                return (
                  <tr key={row.id||i} style={{background:bg}}>
                    <td style={{padding:"3px 5px"}}><input value={row.lote||""} onChange={e=>upd(i,"lote",e.target.value)} style={{width:"100%",minWidth:120,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input type="number" value={row.area||""} onChange={e=>upd(i,"area",e.target.value)} style={{width:65,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:"right"}}/></td>
                    <td style={{padding:"3px 5px"}}>
                      <select value={row.cultura||"Soja"} onChange={e=>upd(i,"cultura",e.target.value)} style={{padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,background:cc.light,color:cc.bg,fontWeight:700}}>
                        {["Soja","Milho","Feijão","Trigo","Sorgo"].map(c=><option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"3px 5px"}}><input value={row.variedade||""} onChange={e=>upd(i,"variedade",e.target.value)} style={{width:"100%",minWidth:100,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.adubacao||""} onChange={e=>upd(i,"adubacao",e.target.value)} style={{width:"100%",minWidth:100,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.kcl||""} onChange={e=>upd(i,"kcl",e.target.value)} style={{width:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input type="number" value={row.ciclo||""} onChange={e=>upd(i,"ciclo",e.target.value)} style={{width:55,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:"right"}}/></td>
                    <td style={{padding:"3px 5px"}}><input type="number" value={row.populacao||""} onChange={e=>upd(i,"populacao",e.target.value)} style={{width:55,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:"right"}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.dataPlantio||""} onChange={e=>upd(i,"dataPlantio",e.target.value)} placeholder="dd/mm/aa" style={{width:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.previsaoColheita||""} onChange={e=>upd(i,"previsaoColheita",e.target.value)} placeholder="dd/mm/aa" style={{width:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 4px",textAlign:"center"}}>
                      <button onClick={()=>setData(d=>d.filter((_,ri)=>ri!==i))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:"#1a5c2e",color:"#fff",fontWeight:700}}>
                <td style={{padding:"7px 8px",fontSize:11}}>TOTAL</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontSize:12}}>{fmtNum(total)} ha</td>
                <td colSpan={9}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {/* Observações rodapé */}
      <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginTop:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#1a3a1a",marginBottom:8}}>📝 Observações / Anotações da Safra</div>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={5}
          placeholder="Anote aqui testes realizados, plantas de cobertura, escarificações, produtos diferentes aplicados, observações gerais..."
          style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui"}}/>
      </div>
    </div>
  );
}

// ── PlanejamentoSafrinha ──────────────────────────────────────────────────────
function PlanejamentoSafrinha({data, setData}) {
  const [obs, setObs] = useState(() => ls.get("gcagro_v4_obs_plansafrinha", ""));
  useEffect(() => { ls.set("gcagro_v4_obs_plansafrinha", obs); }, [obs]);
  const total = data.reduce((s,r)=>s+(r.area||0),0);

  function upd(i,field,val) {
    setData(d=>d.map((r,ri)=>ri===i?{...r,[field]:["area","populacao"].includes(field)?parseFloat(val)||0:val}:r));
  }

  return (
    <div style={{maxWidth:1200,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:800,color:"#5c4a00"}}>🗺️ Planejamento Campo — Safrinha/Inverno</div>
        <button onClick={()=>setData(d=>[...d,{id:Date.now()+"",lote:"",area:0,cultura:"Milho",variedade:"",adubacaoPlantio:"",cobertura:"",nCobertura:"",populacao:0,dataPlantio:"",previsaoColheita:"",obs:""}])}
          style={{padding:"7px 14px",background:"#5c4a00",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Lote</button>
      </div>
      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#5c4a00",color:"#fff"}}>
                {["Lote / Fazenda","Área (ha)","Cultura","Variedade","Adub. Plantio","Cobertura (KCl)","N Cobertura (Ureia)","Pop.(sem/m)","Data Plantio","Prev. Colheita",""].map(h=>(
                  <th key={h} style={{padding:"8px 8px",textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row,i)=>{
                const bg=i%2===0?"#fff":"#f9f9f9";
                const cc=CULT_COLORS[row.cultura]||CULT_COLORS.Milho;
                return (
                  <tr key={row.id||i} style={{background:bg}}>
                    <td style={{padding:"3px 5px"}}><input value={row.lote||""} onChange={e=>upd(i,"lote",e.target.value)} style={{width:"100%",minWidth:120,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input type="number" value={row.area||""} onChange={e=>upd(i,"area",e.target.value)} style={{width:65,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:"right"}}/></td>
                    <td style={{padding:"3px 5px"}}>
                      <select value={row.cultura||"Milho"} onChange={e=>upd(i,"cultura",e.target.value)} style={{padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,background:cc.light,color:cc.bg,fontWeight:700}}>
                        {["Milho","Feijão Irrigado","Trigo","Sorgo","Milho Irrigado","Milho Semente","Milho Sequeiro"].map(c=><option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"3px 5px"}}><input value={row.variedade||""} onChange={e=>upd(i,"variedade",e.target.value)} style={{width:"100%",minWidth:100,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.adubacaoPlantio||""} onChange={e=>upd(i,"adubacaoPlantio",e.target.value)} style={{width:90,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.cobertura||""} onChange={e=>upd(i,"cobertura",e.target.value)} style={{width:90,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.nCobertura||""} onChange={e=>upd(i,"nCobertura",e.target.value)} style={{width:90,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input type="number" value={row.populacao||""} onChange={e=>upd(i,"populacao",e.target.value)} style={{width:55,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11,textAlign:"right"}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.dataPlantio||""} onChange={e=>upd(i,"dataPlantio",e.target.value)} placeholder="dd/mm/aa" style={{width:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 5px"}}><input value={row.previsaoColheita||""} onChange={e=>upd(i,"previsaoColheita",e.target.value)} placeholder="dd/mm/aa" style={{width:80,padding:"3px 5px",border:"1px solid #ddd",borderRadius:3,fontSize:11}}/></td>
                    <td style={{padding:"3px 4px",textAlign:"center"}}>
                      <button onClick={()=>setData(d=>d.filter((_,ri)=>ri!==i))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:"#5c4a00",color:"#fff",fontWeight:700}}>
                <td style={{padding:"7px 8px",fontSize:11}}>TOTAL</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontSize:12}}>{fmtNum(total)} ha</td>
                <td colSpan={9}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginTop:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#5c4a00",marginBottom:8}}>📝 Observações / Anotações da Safrinha</div>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} rows={5}
          placeholder="Anote aqui testes realizados, plantas de cobertura, escarificações, produtos diferentes..."
          style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui"}}/>
      </div>
    </div>
  );
}

// ── TSView ────────────────────────────────────────────────────────────────────
function TSView({data, setData, titulo, cor}) {
  const culturas = [...new Set(data.map(r=>r.cultura))].sort();
  const grouped = {};
  culturas.forEach(c=>{ grouped[c]=data.filter(r=>r.cultura===c); });

  function upd(id,field,val) { setData(d=>d.map(r=>r.id===id?{...r,[field]:val}:r)); }

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:cor||"#1a3a1a"}}>{titulo}</div>
  <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{
            let docContent = "GC Agro — Tratamento de Sementes e Kit Sulco
";
            docContent += "=".repeat(50) + "

";
            const grouped={};
            data.forEach(r=>{if(!grouped[r.cultura])grouped[r.cultura]=[];grouped[r.cultura].push(r);});
            Object.entries(grouped).forEach(([cult,rows])=>{
              docContent += cult.toUpperCase() + "
" + "-".repeat(30) + "
";
              rows.forEach(r=>{
                docContent += "
Variedade: " + (r.variedade||"Todas") + "
";
                if(r.dose100kg) docContent += "Dose por 100kg:
" + r.dose100kg.split("
").map(l=>"  • "+l).join("
") + "
";
                if(r.kgha) docContent += "kg/ha: " + r.kgha + "
";
                if(r.kitSulco) docContent += "Kit Sulco: " + r.kitSulco + "
";
                if(r.obs) docContent += "Obs: " + r.obs + "
";
              });
              docContent += "
";
            });
            const blob = new Blob([docContent],{type:"text/plain;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href=url; a.download="TS_KitSulco_GCAgro.txt"; a.click(); URL.revokeObjectURL(url);
          }} style={{padding:"7px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>📝 Exportar</button>
          <button onClick={()=>setData(d=>[...d,{id:Date.now()+"",cultura:"Soja",variedade:"",dose100kg:"",kgha:"",area:0,kitSulco:"",obs:""}])}
            style={{padding:"7px 14px",background:cor||"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Adicionar</button>
        </div>
      </div>
      {Object.entries(grouped).map(([cult, rows])=>{
        const cc = CULT_COLORS[cult]||{bg:"#37474f",light:"#f5f5f5",accent:"#546e7a"};
        return (
          <div key={cult} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:12}}>
            <div style={{background:cc.bg,color:"#fff",padding:"10px 14px",fontWeight:700,fontSize:13}}>
              {cc.bg==="🌱"?"":""}{cult}
            </div>
            {rows.map((row,i)=>(
              <div key={row.id} style={{padding:14,borderBottom:"1px solid #f0f0f0",background:i%2===0?"#fff":"#fafafa"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Variedade/Híbrido</div>
                    <input value={row.variedade||""} onChange={e=>upd(row.id,"variedade",e.target.value)}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Dose por 100 kg de Semente</div>
                    <input value={row.dose100kg||""} onChange={e=>upd(row.id,"dose100kg",e.target.value)}
                      placeholder="Ex: 80ml Dermacor + 15ml Endofuse"
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Dose por 100 kg de Semente</div>
                    <div style={{fontSize:10,color:"#aaa",marginBottom:4}}>Um produto por linha. Ex: 80ml Dermacor / 200ml Torino</div>
                    <textarea value={row.dose100kg||""} onChange={e=>upd(row.id,"dose100kg",e.target.value)} rows={5}
                      placeholder={"80ml Dermacor
200ml Torino
300ml Cruiser
200ml Raiz F Plus"}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,resize:"vertical",boxSizing:"border-box",fontFamily:"system-ui",lineHeight:1.6}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Kit Sulco</div>
                    <textarea value={row.kitSulco||""} onChange={e=>upd(row.id,"kitSulco",e.target.value)} rows={5}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,resize:"vertical",boxSizing:"border-box"}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>kg/ha</div>
                    <input type="number" value={row.kgha||""} onChange={e=>upd(row.id,"kgha",e.target.value)}
                      placeholder="0"
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box",textAlign:"right"}}/>
                    <div style={{fontSize:10,color:"#888",marginTop:6}}>Qtd total:</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#2e7d32",marginTop:2}}>
                      {row.kgha&&row.area?(fmtNum(parseFloat(row.dose100kg?.split("
")[0])||1 * parseFloat(row.kgha) * parseFloat(row.area||0) / 100))+" kg":"—"}
                    </div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{flex:1,marginRight:10}}>
                    <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Observações</div>
                    <input value={row.obs||""} onChange={e=>upd(row.id,"obs",e.target.value)}
                      style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
                  </div>
                  <button onClick={()=>setData(d=>d.filter(r=>r.id!==row.id))} style={{background:"#ffebee",border:"none",borderRadius:5,color:"#c62828",padding:"6px 10px",cursor:"pointer",fontSize:12,marginTop:16}}>✕ Remover</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {data.length===0&&<div style={{background:"#fff",borderRadius:10,padding:30,textAlign:"center",color:"#aaa",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>Nenhum tratamento cadastrado ainda.</div>}
    </div>
  );
}

// ── VendasView ────────────────────────────────────────────────────────────────
function VendasView({vendas, setVendas}) {
  const [showAdd, setShowAdd] = useState(false);
  const [filtroSafra, setFiltroSafra] = useState("Todas");
  const [filtroCult, setFiltroCult] = useState("Todas");
  const [nova, setNova] = useState({cultura:"Soja",safra:"",qtd:"",unidade:"sc",preco:"",comprador:"",dataEntrega:"",dataPagamento:"",obs:""});

  const safras = ["Todas",...[...new Set(vendas.map(v=>v.safra))].sort()];
  const filtradas = vendas.filter(v=>(filtroSafra==="Todas"||v.safra===filtroSafra)&&(filtroCult==="Todas"||v.cultura===filtroCult));
  const totalVendido = filtradas.reduce((s,v)=>s+(v.qtd||0)*(v.preco||0),0);
  const totalSacas = filtradas.reduce((s,v)=>s+(v.qtd||0),0);

  function adicionar() {
    if(!nova.qtd||!nova.comprador) return;
    setVendas(v=>[...v,{...nova,id:Date.now()+"",qtd:parseFloat(nova.qtd)||0,preco:parseFloat(nova.preco)||0}]);
    setNova({cultura:"Soja",safra:"",qtd:"",unidade:"sc",preco:"",comprador:"",dataEntrega:"",dataPagamento:"",obs:""});
    setShowAdd(false);
  }

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a"}}>💰 Registro de Vendas</div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"7px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nova Venda</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
        <div style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Total Vendido ({filtroSafra})</div>
          <div style={{fontSize:18,fontWeight:800,color:"#1565C0"}}>{fmtR(totalVendido)}</div>
        </div>
        <div style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Total Sacas</div>
          <div style={{fontSize:18,fontWeight:800,color:"#1565C0"}}>{totalSacas.toLocaleString("pt-BR")} sc</div>
        </div>
        <div style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Preço Médio</div>
          <div style={{fontSize:18,fontWeight:800,color:"#1565C0"}}>{totalSacas>0?fmtR(totalVendido/totalSacas):"—"}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <select value={filtroSafra} onChange={e=>setFiltroSafra(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12}}>
          {safras.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={filtroCult} onChange={e=>setFiltroCult(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12}}>
          {["Todas","Soja","Milho","Feijão","Trigo","Sorgo"].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Form */}
      {showAdd&&(
        <div style={{background:"#fff",borderRadius:10,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:"2px solid #1565C0"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Nova Venda</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div>
              <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Cultura</div>
              <select value={nova.cultura} onChange={e=>setNova(p=>({...p,cultura:e.target.value}))} style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}>
                {["Soja","Milho","Feijão","Trigo","Sorgo"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Safra</div>
              <input value={nova.safra} onChange={e=>setNova(p=>({...p,safra:e.target.value}))} placeholder="Ex: Verão 26/27"
                style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
            </div>
            {[{f:"qtd",l:"Quantidade",t:"number"},{f:"unidade",l:"Unidade",t:"text"},{f:"preco",l:"R$/unid.",t:"number"},
              {f:"comprador",l:"Comprador",t:"text"},{f:"dataEntrega",l:"Dt. Entrega",t:"text"},{f:"dataPagamento",l:"Dt. Pagamento",t:"text"},{f:"obs",l:"Obs.",t:"text"}
            ].map(({f,l,t})=>(
              <div key={f}>
                <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>{l}</div>
                <input type={t} value={nova[f]||""} onChange={e=>setNova(p=>({...p,[f]:e.target.value}))}
                  style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={adicionar} style={{padding:"9px 20px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Salvar</button>
            <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",background:"#f5f5f5",border:"none",borderRadius:6,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#1565C0",color:"#fff"}}>
                {["Safra","Cultura","Qtd","Unid.","R$/Unid.","Total","Comprador","Dt.Entrega","Dt.Pgto","Obs",""].map(h=>(
                  <th key={h} style={{padding:"8px 9px",textAlign:"left",fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length===0?(
                <tr><td colSpan={11} style={{padding:"20px",textAlign:"center",color:"#aaa"}}>Nenhuma venda encontrada.</td></tr>
              ):filtradas.map((v,i)=>{
                const color=CULT_COLORS[v.cultura]?.bg||"#333";
                return (
                  <tr key={v.id||i} style={{background:i%2===0?"#fff":"#f9f9f9"}}>
                    <td style={{padding:"6px 9px",fontSize:10,color:"#888"}}>{v.safra}</td>
                    <td style={{padding:"6px 9px",fontWeight:700,color}}>{v.cultura}</td>
                    <td style={{padding:"6px 9px",textAlign:"right"}}>{(v.qtd||0).toLocaleString("pt-BR")}</td>
                    <td style={{padding:"6px 9px",color:"#888"}}>{v.unidade}</td>
                    <td style={{padding:"6px 9px",textAlign:"right"}}>{v.preco>0?fmtR2(v.preco):"—"}</td>
                    <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:"#1565C0"}}>{v.preco>0?fmtR((v.qtd||0)*(v.preco||0)):"—"}</td>
                    <td style={{padding:"6px 9px"}}>{v.comprador}</td>
                    <td style={{padding:"6px 9px",color:"#888",fontSize:10}}>{v.dataEntrega}</td>
                    <td style={{padding:"6px 9px",color:"#888",fontSize:10}}>{v.dataPagamento}</td>
                    <td style={{padding:"6px 9px",color:"#aaa",fontSize:10}}>{v.obs}</td>
                    <td style={{padding:"6px 4px",textAlign:"center"}}>
                      <button onClick={()=>setVendas(vv=>vv.filter(x=>x.id!==v.id))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── ProdutividadeView ─────────────────────────────────────────────────────────
function ProdutividadeView({data, setData}) {
  const [showAdd, setShowAdd] = useState(false);
  const [filtroSafra, setFiltroSafra] = useState("Todas");
  const [nova, setNova] = useState({lote:"",cultura:"Soja",variedade:"",safra:"",area:"",producao:"",pmg:"",dataColheita:"",obs:""});

  const safras = ["Todas",...[...new Set(data.map(r=>r.safra).filter(Boolean))].sort()];
  const filtradas = filtroSafra==="Todas"?data:data.filter(r=>r.safra===filtroSafra);

  function adicionar() {
    if(!nova.lote||!nova.producao) return;
    setData(d=>[...d,{...nova,id:Date.now()+"",area:parseFloat(nova.area)||0,producao:parseFloat(nova.producao)||0,pmg:parseFloat(nova.pmg)||0}]);
    setNova({lote:"",cultura:"Soja",variedade:"",safra:"",area:"",producao:"",pmg:"",dataColheita:"",obs:""});
    setShowAdd(false);
  }

  const byCultura = {};
  filtradas.forEach(r=>{ if(!byCultura[r.cultura])byCultura[r.cultura]=[]; byCultura[r.cultura].push(r); });

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a"}}>📈 Produtividade por Talhão</div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Registrar Colheita</button>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <select value={filtroSafra} onChange={e=>setFiltroSafra(e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12}}>
          {safras.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {showAdd&&(
        <div style={{background:"#fff",borderRadius:10,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:"2px solid #2e7d32"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Nova Colheita</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div>
              <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Cultura</div>
              <select value={nova.cultura} onChange={e=>setNova(p=>({...p,cultura:e.target.value}))} style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}>
                {["Soja","Milho","Feijão","Trigo","Sorgo"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>Safra</div>
              <select value={nova.safra} onChange={e=>setNova(p=>({...p,safra:e.target.value}))} style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}>
                <option value="">-- Selecione --</option>
                <option>Verão 26/27</option>
                <option>Safrinha 2027</option>
                <option>Verão 27/28</option>
              </select>
            </div>
            {[{f:"lote",l:"Lote/Talhão",t:"text"},{f:"variedade",l:"Variedade",t:"text"},
              {f:"area",l:"Área (ha)",t:"number"},{f:"producao",l:"Produção (sc)",t:"number"},
              {f:"pmg",l:"PMG (g)",t:"number"},{f:"dataColheita",l:"Data Colheita",t:"text"},{f:"obs",l:"Obs.",t:"text"}
            ].map(({f,l,t})=>(
              <div key={f}>
                <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>{l}</div>
                <input type={t} value={nova[f]||""} onChange={e=>setNova(p=>({...p,[f]:e.target.value}))}
                  style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={adicionar} style={{padding:"9px 20px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Salvar</button>
            <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",background:"#f5f5f5",border:"none",borderRadius:6,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {Object.entries(byCultura).map(([cult,rows])=>{
        const totalArea=rows.reduce((s,r)=>s+(r.area||0),0);
        const totalProd=rows.reduce((s,r)=>s+(r.producao||0),0);
        const media=totalArea>0?totalProd/totalArea:0;
        const cc=CULT_COLORS[cult]||{bg:"#37474f",light:"#f5f5f5",accent:"#546e7a"};
        return (
          <div key={cult} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:12}}>
            <div style={{background:cc.bg,color:"#fff",padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
              <div style={{fontWeight:700,fontSize:13}}>{cult}</div>
              <div style={{display:"flex",gap:16,fontSize:12}}>
                <span>{fmtNum(totalArea)} ha</span>
                <span>{totalProd.toLocaleString("pt-BR")} sc</span>
                <span style={{fontWeight:800,fontSize:14}}>{fmtNum(media)} sc/ha</span>
              </div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:cc.light}}>
                  {["Safra","Lote/Talhão","Variedade","Área(ha)","Produção(sc)","sc/ha","PMG(g)","Data","Obs",""].map(h=>(
                    <th key={h} style={{padding:"6px 9px",textAlign:"left",color:cc.accent,fontSize:9,textTransform:"uppercase"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((r,i)=>(
                    <tr key={r.id||i} style={{background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"5px 9px",fontSize:10,color:"#888"}}>{r.safra}</td>
                      <td style={{padding:"5px 9px",fontWeight:600}}>{r.lote}</td>
                      <td style={{padding:"5px 9px",color:"#555"}}>{r.variedade}</td>
                      <td style={{padding:"5px 9px",textAlign:"right"}}>{fmtNum(r.area)}</td>
                      <td style={{padding:"5px 9px",textAlign:"right"}}>{(r.producao||0).toLocaleString("pt-BR")}</td>
                      <td style={{padding:"5px 9px",textAlign:"right",fontWeight:700,color:cc.bg}}>{r.area>0?fmtNum(r.producao/r.area):"-"}</td>
                      <td style={{padding:"5px 9px",textAlign:"right",color:"#555"}}>{r.pmg?fmtNum(r.pmg):"—"}</td>
                      <td style={{padding:"5px 9px",color:"#888"}}>{r.dataColheita}</td>
                      <td style={{padding:"5px 9px",color:"#aaa",fontSize:10}}>{r.obs}</td>
                      <td style={{padding:"5px 4px",textAlign:"center"}}>
                        <button onClick={()=>setData(d=>d.filter(x=>x.id!==r.id))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {filtradas.length===0&&<div style={{background:"#fff",borderRadius:10,padding:30,textAlign:"center",color:"#aaa",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>Nenhum registro ainda.</div>}
    </div>
  );
}

// ── ComprasView ───────────────────────────────────────────────────────────────
function ComprasView({compras, setCompras}) {
  const [showAdd, setShowAdd] = useState(false);
  const [tabCat, setTabCat] = useState("sementes");
  const [nova, setNova] = useState({produto:"",fornecedor:"",preco:"",qtd:"",unidade:"sc",data:"",safra:"",obs:""});

  const CATS = [{id:"sementes",label:"🌾 Sementes"},{id:"adubos",label:"🌱 Adubos"},{id:"insumos",label:"💊 Insumos"},{id:"cobertura",label:"🌿 Plantas Cobertura"}];
  const items = compras[tabCat]||[];
  const total = items.reduce((s,i)=>s+(i.preco||0)*(i.qtd||1),0);

  function adicionar() {
    if(!nova.produto.trim()) return;
    setCompras(c=>({...c,[tabCat]:[...(c[tabCat]||[]),{...nova,id:Date.now()+"",preco:parseFloat(nova.preco)||0,qtd:parseFloat(nova.qtd)||0}]}));
    setNova({produto:"",fornecedor:"",preco:"",qtd:"",unidade:"sc",data:"",safra:"",obs:""});
    setShowAdd(false);
  }

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a"}}>📦 Histórico de Compras</div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"7px 14px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Registrar</button>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {CATS.map(c=>(
          <button key={c.id} onClick={()=>setTabCat(c.id)} style={{padding:"6px 14px",background:tabCat===c.id?"#2e7d32":"#fff",border:`1px solid ${tabCat===c.id?"#2e7d32":"#ddd"}`,borderRadius:20,color:tabCat===c.id?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:tabCat===c.id?700:400}}>{c.label}</button>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:10,padding:"10px 16px",marginBottom:14,display:"flex",gap:20,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div><div style={{fontSize:11,color:"#888"}}>Registros</div><div style={{fontSize:18,fontWeight:800,color:"#1a3a1a"}}>{items.length}</div></div>
        <div><div style={{fontSize:11,color:"#888"}}>Total Gasto</div><div style={{fontSize:18,fontWeight:800,color:"#2e7d32"}}>{fmtR(total)}</div></div>
      </div>

      {showAdd&&(
        <div style={{background:"#fff",borderRadius:10,padding:16,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:"2px solid #2e7d32"}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Registrar Compra — {CATS.find(c=>c.id===tabCat)?.label}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            {[{f:"produto",l:"Produto",t:"text"},{f:"fornecedor",l:"Fornecedor",t:"text"},
              {f:"qtd",l:"Quantidade",t:"number"},{f:"unidade",l:"Unidade",t:"text"},
              {f:"preco",l:"Preço Unit.(R$)",t:"number"},{f:"data",l:"Data",t:"text"},
              {f:"safra",l:"Safra",t:"text"},{f:"obs",l:"Obs.",t:"text"}
            ].map(({f,l,t})=>(
              <div key={f}>
                <div style={{fontSize:10,color:"#888",marginBottom:3,textTransform:"uppercase"}}>{l}</div>
                <input type={t} value={nova[f]||""} onChange={e=>setNova(p=>({...p,[f]:e.target.value}))}
                  style={{width:"100%",padding:"7px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,boxSizing:"border-box"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={adicionar} style={{padding:"9px 20px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Salvar</button>
            <button onClick={()=>setShowAdd(false)} style={{padding:"9px 16px",background:"#f5f5f5",border:"none",borderRadius:6,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead>
              <tr style={{background:"#2e7d32",color:"#fff"}}>
                {["Produto","Fornecedor","Qtd","Unid.","Preço","Total","Data","Safra","Obs",""].map(h=>(
                  <th key={h} style={{padding:"7px 9px",textAlign:"left",fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length===0?(<tr><td colSpan={10} style={{padding:"20px",textAlign:"center",color:"#aaa"}}>Nenhuma compra registrada.</td></tr>)
              :items.map((item,i)=>(
                <tr key={item.id||i} style={{background:i%2===0?"#fff":"#f9f9f9"}}>
                  <td style={{padding:"6px 9px",fontWeight:600}}>{item.produto}</td>
                  <td style={{padding:"6px 9px",color:"#555"}}>{item.fornecedor}</td>
                  <td style={{padding:"6px 9px",textAlign:"right"}}>{fmtNum(item.qtd)}</td>
                  <td style={{padding:"6px 9px",color:"#888"}}>{item.unidade}</td>
                  <td style={{padding:"6px 9px",textAlign:"right"}}>{fmtR2(item.preco)}</td>
                  <td style={{padding:"6px 9px",textAlign:"right",fontWeight:700,color:"#2e7d32"}}>{fmtR((item.preco||0)*(item.qtd||1))}</td>
                  <td style={{padding:"6px 9px",color:"#888"}}>{item.data}</td>
                  <td style={{padding:"6px 9px",color:"#aaa",fontSize:10}}>{item.safra}</td>
                  <td style={{padding:"6px 9px",color:"#aaa",fontSize:10}}>{item.obs}</td>
                  <td style={{padding:"6px 4px",textAlign:"center"}}>
                    <button onClick={()=>setCompras(c=>({...c,[tabCat]:c[tabCat].filter((_,ri)=>ri!==i)}))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── FornecedoresView ──────────────────────────────────────────────────────────
function FornecedoresView({fornIns, setFornIns, fornAdub, setFornAdub}) {
  const [tab, setTab] = useState("insumos");
  const list = tab==="insumos"?fornIns:fornAdub;
  const setList = tab==="insumos"?setFornIns:setFornAdub;

  function upd(i,field,val) { setList(l=>l.map((f,fi)=>fi===i?{...f,[field]:val}:f)); }
  function whatsapp(f,tipo) {
    const msg = encodeURIComponent(`Olá ${f.nome}! 🌿

GC Agro — Cotação de ${tipo}

Acesse: https://dashing-lolly-d3af23.netlify.app

Seu token: *${f.token}*`);
    window.open(`https://wa.me/55${f.telefone.replace(/\D/g,"")}?text=${msg}`,"_blank");
  }

  return (
    <div style={{maxWidth:800,margin:"0 auto",padding:14}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a",marginBottom:14}}>👥 Cadastro de Fornecedores</div>
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["insumos","💊 Insumos"],["adubacao","🌱 Adubação"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"7px 16px",background:tab===id?"#1565C0":"#fff",border:`1px solid ${tab===id?"#1565C0":"#ddd"}`,borderRadius:20,color:tab===id?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:tab===id?700:400}}>{label}</button>
        ))}
      </div>
      <div style={{display:"grid",gap:10}}>
        {list.map((f,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:2,minWidth:130}}>
              <div style={{fontSize:10,color:"#888",marginBottom:3}}>NOME</div>
              <input value={f.nome} onChange={e=>upd(i,"nome",e.target.value)}
                style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:13,fontWeight:600,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:2,minWidth:130}}>
              <div style={{fontSize:10,color:"#888",marginBottom:3}}>TELEFONE (WhatsApp)</div>
              <input value={f.telefone} onChange={e=>upd(i,"telefone",e.target.value)} placeholder="(xx) xxxxx-xxxx"
                style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{minWidth:110}}>
              <div style={{fontSize:10,color:"#888",marginBottom:3}}>TOKEN</div>
              <div style={{display:"flex",gap:4}}>
                <input value={f.token} onChange={e=>upd(i,"token",e.target.value)}
                  style={{width:80,padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
                <button onClick={()=>upd(i,"token",genToken(f.nome))} title="Novo token"
                  style={{padding:"6px 8px",background:"#f0f0f0",border:"none",borderRadius:5,cursor:"pointer",fontSize:12}}>🔄</button>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              {f.telefone&&(
                <button onClick={()=>whatsapp(f, tab==="insumos"?"Insumos":"Adubação")}
                  style={{padding:"8px 12px",background:"#25D366",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",marginTop:16}}>
                  📱 WhatsApp
                </button>
              )}
              <button onClick={()=>setList(l=>l.filter((_,fi)=>fi!==i))}
                style={{padding:"8px 10px",background:"#ffebee",border:"none",borderRadius:6,color:"#c62828",fontSize:12,cursor:"pointer",marginTop:16}}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={()=>setList(l=>[...l,{nome:"Novo Fornecedor",telefone:"",token:genToken("NF")}])}
          style={{padding:"10px",background:"none",border:"2px dashed #ddd",borderRadius:10,color:"#aaa",fontSize:13,cursor:"pointer"}}>
          + Adicionar Fornecedor
        </button>
      </div>
    </div>
  );
}

// ── SafrasView ────────────────────────────────────────────────────────────────
function SafrasView({safrasAtivas, setSafrasAtivas, arquivadas, setArquivadas, dataVerao, dataSafrinha}) {
  const [novaNome, setNovaNome] = useState("");
  const [tipoNova, setTipoNova] = useState("verao");

  function arquivarSafra(nome) {
    if(!window.confirm(`Arquivar "${nome}"?`)) return;
    const safra = safrasAtivas.find(s=>s.nome===nome);
    if(!safra) return;
    const arq = {...safra, dataArquivamento: new Date().toLocaleDateString("pt-BR")};
    setArquivadas(a=>{const n=[...a,arq];ls.set("gcagro_v4_arquivadas",n);return n;});
    setSafrasAtivas(s=>{const n=s.filter(x=>x.nome!==nome);ls.set("gcagro_v4_safras_ativas",n);return n;});
  }

  function restaurarSafra(i) {
    const safra = arquivadas[i];
    setSafrasAtivas(s=>{const n=[...s,{nome:safra.nome,tipo:safra.tipo,inicio:safra.inicio}];ls.set("gcagro_v4_safras_ativas",n);return n;});
    setArquivadas(a=>{const n=a.filter((_,ai)=>ai!==i);ls.set("gcagro_v4_arquivadas",n);return n;});
  }

  function novaSafra() {
    if(!novaNome.trim()) return;
    const nova = {nome:novaNome.trim(), tipo:tipoNova, inicio:new Date().toLocaleDateString("pt-BR")};
    setSafrasAtivas(s=>{const n=[...s,nova];ls.set("gcagro_v4_safras_ativas",n);return n;});
    setNovaNome("");
  }

  return (
    <div style={{maxWidth:800,margin:"0 auto",padding:14}}>
      {/* Safras ativas */}
      <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a",marginBottom:14}}>🗂️ Gestão de Safras</div>
      <div style={{background:"#fff",borderRadius:12,padding:"18px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:12}}>✅ Safras Ativas ({safrasAtivas.length})</div>
        {safrasAtivas.map((s,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:s.tipo==="verao"?"#e8f5e9":"#fff8e1",borderRadius:8,marginBottom:8,border:`1px solid ${s.tipo==="verao"?"#2e7d32":"#b8860b"}`}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:s.tipo==="verao"?"#1a5c2e":"#5c4a00"}}>{s.tipo==="verao"?"🌱":"🌾"} {s.nome}</div>
              <div style={{fontSize:11,color:"#888"}}>Iniciada em {s.inicio}</div>
            </div>
            <button onClick={()=>arquivarSafra(s.nome)} style={{padding:"6px 12px",background:"#fff",border:"1px solid #ddd",borderRadius:6,fontSize:11,cursor:"pointer",color:"#666"}}>
              📁 Arquivar
            </button>
          </div>
        ))}
        {safrasAtivas.length===0&&<div style={{color:"#aaa",fontSize:12,padding:"10px 0"}}>Nenhuma safra ativa.</div>}

        {/* Nova safra */}
        <div style={{borderTop:"1px solid #f0f0f0",paddingTop:14,marginTop:14}}>
          <div style={{fontSize:12,fontWeight:700,color:"#333",marginBottom:8}}>+ Adicionar Nova Safra</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <select value={tipoNova} onChange={e=>setTipoNova(e.target.value)} style={{padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12}}>
              <option value="verao">🌱 Verão</option>
              <option value="safrinha">🌾 Safrinha/Inverno</option>
            </select>
            <input value={novaNome} onChange={e=>setNovaNome(e.target.value)} placeholder="Ex: Verão 27/28"
              style={{flex:1,minWidth:180,padding:"8px 10px",border:"2px solid #ddd",borderRadius:6,fontSize:13,outline:"none"}}/>
            <button onClick={novaSafra} disabled={!novaNome.trim()}
              style={{padding:"8px 16px",background:novaNome.trim()?"#2e7d32":"#ccc",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:novaNome.trim()?"pointer":"not-allowed"}}>
              Adicionar
            </button>
          </div>
          <div style={{fontSize:11,color:"#888",marginTop:6}}>💡 A safra é adicionada sem arquivar as outras — você pode ter múltiplas safras ativas.</div>
        </div>
      </div>

      {/* Arquivadas */}
      <div style={{fontSize:14,fontWeight:700,color:"#333",marginBottom:10}}>📁 Safras Arquivadas ({arquivadas.length})</div>
      {arquivadas.length===0&&<div style={{color:"#aaa",fontSize:12}}>Nenhuma safra arquivada ainda.</div>}
      {[...arquivadas].reverse().map((s,i)=>(
        <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#555"}}>{s.nome}</div>
            <div style={{fontSize:11,color:"#aaa"}}>Arquivada em {s.dataArquivamento}</div>
          </div>
          <button onClick={()=>restaurarSafra(arquivadas.length-1-i)}
            style={{padding:"6px 12px",background:"#e8f5e9",border:"1px solid #2e7d32",borderRadius:6,fontSize:11,cursor:"pointer",color:"#2e7d32",fontWeight:700}}>
            🔄 Restaurar
          </button>
        </div>
      ))}
    </div>
  );
}

// ── BackupView ────────────────────────────────────────────────────────────────
function BackupView({allData, onImport}) {
  function exportar() {
    const blob = new Blob([JSON.stringify({versao:"gcagro_v4",...allData,data:new Date().toISOString()},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`gcagro_backup_${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function importar(e) {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{ try { onImport(JSON.parse(ev.target.result)); alert("✅ Backup restaurado!"); } catch { alert("❌ Arquivo inválido."); } };
    reader.readAsText(file);
  }
  return (
    <div style={{maxWidth:600,margin:"0 auto",padding:14}}>
      <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a",marginBottom:16}}>💾 Backup dos Dados</div>
      <div style={{background:"#fff",borderRadius:12,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📤 Exportar Backup</div>
        <div style={{fontSize:12,color:"#666",marginBottom:14}}>Salva todos os dados em um arquivo JSON. Guarde no Google Drive ou OneDrive.</div>
        <button onClick={exportar} style={{padding:"12px 24px",background:"linear-gradient(135deg,#2e7d32,#1b5e20)",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
          💾 Baixar Backup
        </button>
      </div>
      <div style={{background:"#fff",borderRadius:12,padding:"20px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:8}}>📥 Importar Backup</div>
        <div style={{fontSize:12,color:"#e57373",marginBottom:14}}>⚠ Atenção: substituirá todos os dados atuais.</div>
        <label style={{padding:"12px 24px",background:"#1565C0",border:"none",borderRadius:8,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",display:"inline-block"}}>
          📂 Selecionar Arquivo
          <input type="file" accept=".json" onChange={importar} style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );
}


// ── ProgView (Programação Verão/Safrinha) ────────────────────────────────────
function ProgView({data, setData, tipo}) {
  const [activeCult, setActiveCult] = useState(Object.keys(data)[0]||"Soja");
  const [expandedCats, setExpandedCats] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [editingOp, setEditingOp] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [editingArea, setEditingArea] = useState(false);
  const [newProd, setNewProd] = useState({produto:"",dose:"",area:"",fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});

  const culture = data[activeCult]||{area:0,ativo:true,op_costs:{},categories:[]};
  const colors = CULT_COLORS[activeCult]||{bg:"#37474f",light:"#f5f5f5",accent:"#546e7a",badge:"#78909c"};
  const catTotals = culture.categories.map(cat=>cat.products.reduce((s,p)=>s+calcRef(p),0));
  const insumoTotal = catTotals.reduce((a,b)=>a+b,0);
  const opTotal = Object.values(culture.op_costs||{}).reduce((a,b)=>a+b,0);
  const totalHa = culture.area>0?insumoTotal/culture.area+opTotal:0;

  function updField(catIdx,prodIdx,field,value) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); const p=nd[activeCult].categories[catIdx].products[prodIdx];
      p[field]=["produto","fase","obs","revenda","vencimento","ingrediente_ativo"].includes(field)?value:parseFloat(value)||0; return nd; });
  }
  function delProd(catIdx,prodIdx) {
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d)); nd[activeCult].categories[catIdx].products.splice(prodIdx,1); return nd; });
  }
  function addProd(catIdx) {
    if(!newProd.produto.trim()) return;
    setData(d=>{ const nd=JSON.parse(JSON.stringify(d));
      nd[activeCult].categories[catIdx].products.push({...newProd,dose:parseFloat(newProd.dose)||0,area:parseFloat(newProd.area)||nd[activeCult].area,preco_unit:parseFloat(newProd.preco_unit)||0,preco_compra:null,fornecedor_compra:null});
      return nd; });
    setNewProd({produto:"",dose:"",area:"",fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});
    setAddingTo(null);
  }

  const EC = ({catIdx,prodIdx,field,type="text",value}) => {
    const isEd=editingCell?.catIdx===catIdx&&editingCell?.prodIdx===prodIdx&&editingCell?.field===field;
    if(isEd) return <input autoFocus type={type} defaultValue={value} step="any"
      style={{width:"100%",padding:"2px 5px",fontSize:11,border:"2px solid "+colors.badge,borderRadius:3,background:colors.light}}
      onBlur={e=>{updField(catIdx,prodIdx,field,e.target.value);setEditingCell(null);}}
      onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")setEditingCell(null);}}/>;
    return <span onClick={()=>setEditingCell({catIdx,prodIdx,field})} style={{cursor:"pointer",display:"block",minWidth:30}}>{value||<span style={{color:"#ccc"}}>—</span>}<span style={{fontSize:8,color:"#bbb",marginLeft:2}}>✏</span></span>;
  };

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:14}}>
      {/* Culture tabs */}
      <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
        {Object.entries(data).map(([nome,c])=>(
          <button key={nome} onClick={()=>setActiveCult(nome)}
            style={{padding:"5px 12px",background:activeCult===nome?(CULT_COLORS[nome]?.bg||"#37474f"):"#fff",
              border:`1px solid ${CULT_COLORS[nome]?.bg||"#ddd"}`,borderRadius:18,
              color:activeCult===nome?"#fff":(CULT_COLORS[nome]?.bg||"#555"),
              fontSize:11,fontWeight:activeCult===nome?700:400,cursor:"pointer",opacity:c.ativo?1:0.5}}>
            {nome}
          </button>
        ))}
      </div>

      {/* Culture header */}
      <div style={{background:"#fff",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",flexWrap:"wrap"}}>
        <div style={{borderLeft:`4px solid ${colors.bg}`,paddingLeft:10}}>
          <div style={{fontSize:11,color:"#888"}}>Cultura</div>
          <div style={{fontSize:20,fontWeight:800,color:colors.bg}}>{activeCult}</div>
        </div>
        <div style={{borderLeft:"1px solid #eee",paddingLeft:14}}>
          <div style={{fontSize:11,color:"#888"}}>Área total</div>
          {editingArea
            ?<input autoFocus type="number" defaultValue={culture.area} step="0.5"
                style={{fontSize:16,fontWeight:700,color:colors.bg,border:"2px solid "+colors.badge,borderRadius:4,width:80,padding:"2px 5px"}}
                onBlur={e=>{setData(d=>{const nd=JSON.parse(JSON.stringify(d));nd[activeCult].area=parseFloat(e.target.value)||0;return nd;});setEditingArea(false);}}
                onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
            :<div style={{fontSize:17,fontWeight:700,color:colors.bg,cursor:"pointer"}} onClick={()=>setEditingArea(true)}>{fmtNum(culture.area)} ha ✏</div>
          }
        </div>
        <div style={{borderLeft:"1px solid #eee",paddingLeft:14}}><div style={{fontSize:11,color:"#888"}}>Insumos/ha</div><div style={{fontSize:15,fontWeight:700,color:colors.bg}}>{fmtR(culture.area>0?insumoTotal/culture.area:0)}</div></div>
        <div style={{borderLeft:"1px solid #eee",paddingLeft:14}}><div style={{fontSize:11,color:"#888"}}>Custo total/ha</div><div style={{fontSize:15,fontWeight:700,color:colors.bg}}>{fmtR(totalHa)}</div></div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <button onClick={()=>setData(d=>{const nd=JSON.parse(JSON.stringify(d));nd[activeCult].ativo=!nd[activeCult].ativo;return nd;})}
            style={{padding:"6px 12px",background:culture.ativo?"#fff3e0":"#e8f5e9",border:`1px solid ${culture.ativo?"#f57f17":"#2e7d32"}`,borderRadius:5,color:culture.ativo?"#e65100":"#2e7d32",fontSize:11,cursor:"pointer",fontWeight:600}}>
            {culture.ativo?"⏸ Desativar":"▶ Ativar"}
          </button>
          <button onClick={()=>{if(window.confirm(`Remover "${activeCult}" da programação?`)){setData(d=>{const nd=JSON.parse(JSON.stringify(d));delete nd[activeCult];return nd;});setActiveCult(Object.keys(data)[0]||"");}}}
            style={{padding:"6px 12px",background:"#ffebee",border:"1px solid #e57373",borderRadius:5,color:"#c62828",fontSize:11,cursor:"pointer",fontWeight:600}}>
            🗑 Remover
          </button>
          <button onClick={()=>{const nome=window.prompt("Nome da nova cultura:");if(!nome) return;setData(d=>{const nd=JSON.parse(JSON.stringify(d));nd[nome]={area:0,ativo:true,op_costs:{},categories:[{name:"Adubação",products:[]},{name:"Sementes / TS",products:[]},{name:"Fungicidas",products:[]},{name:"Inseticidas",products:[]},{name:"Foliares",products:[]}]};return nd;});}}
            style={{padding:"6px 12px",background:"#e8f5e9",border:"1px solid #2e7d32",borderRadius:5,color:"#2e7d32",fontSize:11,cursor:"pointer",fontWeight:600}}>
            + Cultura
          </button>
          <button onClick={()=>{
            const culturas=Object.keys(data).filter(c=>c!==activeCult);
            if(!culturas.length){alert("Nenhuma outra cultura para importar.");return;}
            const origem=window.prompt("Importar produtos de qual cultura?
"+culturas.join(", "));
            if(!origem||!data[origem]) return;
            if(!window.confirm(`Copiar todos os produtos de "${origem}" para "${activeCult}"?`)) return;
            setData(d=>{const nd=JSON.parse(JSON.stringify(d));
              const src=nd[origem];
              nd[activeCult].categories=JSON.parse(JSON.stringify(src.categories));
              nd[activeCult].op_costs=JSON.parse(JSON.stringify(src.op_costs||{}));
              return nd;});
          }}
            style={{padding:"6px 12px",background:"#e3f2fd",border:"1px solid #1565C0",borderRadius:5,color:"#1565C0",fontSize:11,cursor:"pointer",fontWeight:600}}>
            📥 Importar Produtos
          </button>
        </div>
      </div>

      {/* Categories */}
      {culture.categories.map((cat,catIdx)=>{
        const isOpen=expandedCats[activeCult+catIdx]!==false;
        const catTotal=catTotals[catIdx]||0;
        return (
          <div key={catIdx} style={{background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)",marginBottom:10}}>
            <div onClick={()=>setExpandedCats(e=>({...e,[activeCult+catIdx]:!isOpen}))}
              style={{background:colors.bg,color:"#fff",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span>{CAT_ICONS[cat.name]||"📦"}</span>
                <span style={{fontWeight:700,fontSize:13}}>{cat.name}</span>
                <span style={{background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"1px 7px",fontSize:10}}>{cat.products.length}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,fontWeight:700}}>{fmtR(catTotal)}</span>
                <span style={{fontSize:11,opacity:0.7}}>{culture.area>0?fmtR(catTotal/culture.area):"-"}/ha</span>
                <span>{isOpen?"▲":"▼"}</span>
              </div>
            </div>
            {isOpen&&(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                  <thead>
                    <tr style={{background:colors.light}}>
                      {["Produto","I.A.","Dose","Área","Qtd","Fase","Obs","Ref.(R$)","Compra(R$)","Fornecedor","Total","R$/ha","Revenda","Venc.",""].map(h=>(
                        <th key={h} style={{padding:"5px 7px",textAlign:["Produto","I.A.","Obs"].includes(h)?"left":"right",color:colors.accent,fontSize:9,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.products.map((p,pi)=>{
                      const preco=p.preco_compra||p.preco_unit;
                      const total=p.dose>0?p.dose*p.area*preco:p.area*preco;
                      const bg=pi%2===0?"#fff":"#fafafa";
                      const comprado=p.preco_compra!=null;
                      return (
                        <tr key={pi} style={{background:bg}}>
                          <td style={{padding:"5px 7px",fontWeight:600}}><EC catIdx={catIdx} prodIdx={pi} field="produto" value={p.produto}/></td>
                          <td style={{padding:"5px 7px",color:"#888",fontSize:10,maxWidth:120}}><EC catIdx={catIdx} prodIdx={pi} field="ingrediente_ativo" value={p.ingrediente_ativo||""}/></td>
                          <td style={{padding:"5px 7px",textAlign:"right"}}><EC catIdx={catIdx} prodIdx={pi} field="dose" type="number" value={fmtNum(p.dose)}/></td>
                          <td style={{padding:"5px 7px",textAlign:"right"}}><EC catIdx={catIdx} prodIdx={pi} field="area" type="number" value={fmtNum(p.area)}/></td>
                          <td style={{padding:"5px 7px",textAlign:"right",color:"#555"}}>{fmtNum(p.dose>0?p.dose*p.area:p.area)}</td>
                          <td style={{padding:"5px 7px",color:"#777"}}><EC catIdx={catIdx} prodIdx={pi} field="fase" value={p.fase}/></td>
                          <td style={{padding:"5px 7px",color:"#888",maxWidth:110}}><EC catIdx={catIdx} prodIdx={pi} field="obs" value={p.obs}/></td>
                          <td style={{padding:"5px 7px",textAlign:"right",color:"#999",textDecoration:comprado?"line-through":""}}>{fmtR2(p.preco_unit)}</td>
                          <td style={{padding:"5px 7px",textAlign:"right",fontWeight:comprado?700:400,color:comprado?"#2e7d32":"#bbb"}}>{comprado?fmtR2(p.preco_compra):"—"}</td>
                          <td style={{padding:"5px 7px",fontSize:10,color:"#2e7d32"}}>{p.fornecedor_compra||"—"}</td>
                          <td style={{padding:"5px 7px",textAlign:"right",fontWeight:700,color:comprado?"#2e7d32":colors.bg}}>{fmtR(total)}</td>
                          <td style={{padding:"5px 7px",textAlign:"right",color:"#666"}}>{culture.area>0?fmtR(total/culture.area):"-"}</td>
                          <td style={{padding:"5px 7px"}}><EC catIdx={catIdx} prodIdx={pi} field="revenda" value={p.revenda}/></td>
                          <td style={{padding:"5px 7px",color:"#888",fontSize:10}}><EC catIdx={catIdx} prodIdx={pi} field="vencimento" value={p.vencimento}/></td>
                          <td style={{padding:"5px 4px",textAlign:"center"}}>
                            <button onClick={()=>{if(window.confirm(`Remover "${p.produto}"?`))delProd(catIdx,pi);}} style={{background:"none",border:"none",cursor:"pointer",color:"#e57373",fontSize:13}}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                    {addingTo?.catIdx===catIdx?(
                      <tr style={{background:"#fffde7"}}>
                        {["produto","ingrediente_ativo","dose","area",null,"fase","obs","preco_unit",null,null,null,null,"revenda","vencimento"].map((field,i)=>(
                          <td key={i} style={{padding:"3px 5px"}}>
                            {field?<input placeholder={field} type={["dose","area","preco_unit"].includes(field)?"number":"text"} step="any"
                              value={newProd[field]||""} onChange={e=>setNewProd(p=>({...p,[field]:e.target.value}))}
                              style={{width:"100%",padding:"3px 4px",fontSize:10,border:"1px solid #ccc",borderRadius:3}}/>
                            :<span style={{color:"#bbb",fontSize:9}}>-</span>}
                          </td>
                        ))}
                        <td style={{padding:"3px 4px"}}>
                          <button onClick={()=>addProd(catIdx)} style={{background:colors.bg,color:"#fff",border:"none",borderRadius:3,padding:"2px 6px",cursor:"pointer",fontSize:11,marginRight:2}}>✓</button>
                          <button onClick={()=>setAddingTo(null)} style={{background:"#eee",border:"none",borderRadius:3,padding:"2px 5px",cursor:"pointer",fontSize:11}}>✕</button>
                        </td>
                      </tr>
                    ):(
                      <tr><td colSpan={15} style={{padding:"4px 8px"}}>
                        <button onClick={()=>{setAddingTo({catIdx});setNewProd({produto:"",dose:"",area:culture.area,fase:"",obs:"",preco_unit:"",ingrediente_ativo:"",revenda:"",vencimento:""});}}
                          style={{background:"none",border:"1px dashed "+colors.badge,color:colors.accent,borderRadius:4,padding:"3px 10px",cursor:"pointer",fontSize:10}}>+ Adicionar produto</button>
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
        <div style={{background:"#37474f",color:"#fff",padding:"10px 14px",fontWeight:700,fontSize:12}}>🚜 Custos Operacionais (R$/ha)</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10,padding:12}}>
          {Object.entries(culture.op_costs||{}).map(([key,val])=>(
            <div key={key} style={{background:"#f5f5f5",borderRadius:6,padding:"8px 12px",minWidth:130}}>
              <div style={{fontSize:10,color:"#888",marginBottom:2}}>{key}</div>
              {editingOp===key
                ?<input autoFocus type="number" defaultValue={val} step="10"
                    style={{fontSize:15,fontWeight:700,color:"#37474f",border:"2px solid #546e7a",borderRadius:4,width:80,padding:"2px 4px"}}
                    onBlur={e=>{setData(d=>{const nd=JSON.parse(JSON.stringify(d));nd[activeCult].op_costs[key]=parseFloat(e.target.value)||0;return nd;});setEditingOp(null);}}
                    onKeyDown={e=>{if(e.key==="Enter")e.target.blur();}}/>
                :<div style={{fontSize:15,fontWeight:700,color:"#37474f",cursor:"pointer"}} onClick={()=>setEditingOp(key)}>{fmtR(val)} <span style={{fontSize:9,color:"#bbb"}}>✏</span></div>
              }
            </div>
          ))}
          <div style={{background:"#37474f",color:"#fff",borderRadius:6,padding:"8px 12px",minWidth:130}}>
            <div style={{fontSize:10,opacity:0.7,marginBottom:2}}>OPERACIONAL</div>
            <div style={{fontSize:15,fontWeight:700}}>{fmtR(opTotal)}</div>
          </div>
          <div style={{background:colors.bg,color:"#fff",borderRadius:6,padding:"8px 12px",minWidth:140}}>
            <div style={{fontSize:10,opacity:0.7,marginBottom:2}}>CUSTO TOTAL/ha</div>
            <div style={{fontSize:17,fontWeight:700}}>{fmtR(totalHa)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ResumoView ────────────────────────────────────────────────────────────────
function ResumoView({dataVerao, dataSafrinha}) {
  const [tab, setTab] = useState("verao");
  const data = tab==="verao"?dataVerao:dataSafrinha;
  const cColors = tab==="verao"?CULT_COLORS:CULT_COLORS;

  const summary = Object.entries(data).map(([name,c])=>{
    const ins=c.categories.reduce((s,cat)=>s+cat.products.reduce((ss,p)=>ss+calcRef(p),0),0);
    const op=Object.values(c.op_costs||{}).reduce((s,v)=>s+v,0);
    const total=c.area>0?ins/c.area+op:0;
    const cats=c.categories.map(cat=>({name:cat.name,total:cat.products.reduce((s,p)=>s+calcRef(p),0)}));
    return {name,area:c.area,ativo:c.ativo,ins,op,total,cats};
  });

  const totalArea = summary.filter(c=>c.ativo).reduce((s,c)=>s+c.area,0);
  const totalIns = summary.filter(c=>c.ativo).reduce((s,c)=>s+c.ins,0);

  return (
    <div style={{maxWidth:1000,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["verao","🌱 Verão"],["safrinha","🌾 Safrinha"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 18px",background:tab===id?(id==="verao"?"#1a5c2e":"#5c4a00"):"#fff",border:`1px solid ${id==="verao"?"#1a5c2e":"#5c4a00"}`,borderRadius:20,color:tab===id?"#fff":(id==="verao"?"#1a5c2e":"#5c4a00"),fontSize:12,cursor:"pointer",fontWeight:tab===id?700:400}}>{label}</button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Área Total</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>{fmtNum(totalArea)} ha</div>
        </div>
        <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Total Insumos</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>{fmtR(totalIns)}</div>
        </div>
        <div style={{background:"#fff",borderRadius:10,padding:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>
          <div style={{fontSize:11,color:"#888"}}>Insumos Médio/ha</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1a3a1a"}}>{totalArea>0?fmtR(totalIns/totalArea):"—"}</div>
        </div>
      </div>

      {summary.filter(c=>c.ativo&&c.area>0).map(c=>(
        <div key={c.name} style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",marginBottom:12}}>
          <div style={{background:cColors[c.name]?.bg||"#333",color:"#fff",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:800,fontSize:15}}>{c.name} — {fmtNum(c.area)} ha</div>
            <div style={{fontSize:13,fontWeight:700}}>Total/ha: {fmtR(c.total)}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,padding:12}}>
            {c.cats.filter(cat=>cat.total>0).map(cat=>(
              <div key={cat.name} style={{background:"#f8f9fa",borderRadius:7,padding:"9px 12px"}}>
                <div style={{fontSize:10,color:"#888",marginBottom:2}}>{cat.name}</div>
                <div style={{fontSize:13,fontWeight:700,color:cColors[c.name]?.bg||"#333"}}>{fmtR(cat.total)}</div>
                <div style={{fontSize:10,color:"#aaa"}}>{c.area>0?fmtR(cat.total/c.area):"-"}/ha</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// ── CotacaoView ───────────────────────────────────────────────────────────────
function CotacaoView({tipo, safraLabel, produtos, allPrices, setAllPrices, fornecedores, setFornecedores, onFechar, fbPath}) {
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState(null);
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [myPrices, setMyPrices] = useState({});
  const [saved, setSaved] = useState(false);
  const [adminTab, setAdminTab] = useState("merit");
  const [filterCat, setFilterCat] = useState("Todas");
  const [showFechar, setShowFechar] = useState(false);
  const [showEditForn, setShowEditForn] = useState(false);

  const tipoLabel = tipo==="adub"?"Adubação":tipo==="ins"?"Insumos":"Sementes";
  const categorias = [...new Set(produtos.map(p=>p.categoria))];

  function handleLogin() {
    const val = loginInput.trim();
    if (val===ADMIN_PWD) { setRole({type:"admin"}); setScreen("admin"); return; }
    const found = fornecedores.find(f=>f.token.toLowerCase()===val.toLowerCase()||f.nome.toLowerCase()===val.toLowerCase());
    if (found) {
      setMyPrices(allPrices[found.nome]||{});
      setRole({type:"fornecedor",name:found.nome});
      setScreen("fornecedor"); return;
    }
    setLoginError("Token ou nome não encontrado.");
  }

  function handleSave() {
    const fresh={...allPrices,[role.name]:myPrices};
    setAllPrices(fresh);
    if(fbPath) fbSet(fbPath, fresh);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
  }

  if (screen==="login") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"calc(100vh - 48px)",background:"#0a1628"}}>
      <div style={{width:420,background:"#111d35",borderRadius:14,padding:"36px",border:"1px solid #1e3a5f",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:11,letterSpacing:5,color:"#4a9eff",textTransform:"uppercase",marginBottom:8}}>GC Agro · {safraLabel}</div>
          <div style={{fontSize:22,fontWeight:700,color:"#e8f4fd"}}>Cotação {tipoLabel}</div>
          <div style={{fontSize:11,color:"#5a7a9a",marginTop:4}}>{produtos.length} produtos</div>
        </div>
        <input value={loginInput} onChange={e=>{setLoginInput(e.target.value);setLoginError("");}}
          onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Seu token ou senha admin"
          style={{width:"100%",padding:"12px 14px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:7,color:"#e8f4fd",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:loginError?8:14}}/>
        {loginError&&<div style={{color:"#ff6b6b",fontSize:11,marginBottom:12}}>{loginError}</div>}
        <button onClick={handleLogin} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:7,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Entrar</button>
        <div style={{marginTop:18,padding:12,background:"#0d1e36",borderRadius:7,border:"1px solid #1e3a5f"}}>
          <div style={{fontSize:10,color:"#5a7a9a",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Fornecedores</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {fornecedores.map((f,i)=>(
              <span key={i} onClick={()=>{setLoginInput(f.token);setLoginError("");}}
                style={{padding:"3px 8px",background:"#1e3a5f",border:"1px solid #2a5080",borderRadius:18,color:"#7ab8ff",fontSize:10,cursor:"pointer"}}
                title={`Token: ${f.token}`}>{f.nome}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (screen==="fornecedor") {
    const isSem = tipo==="sem";
    const filled = Object.values(myPrices).filter(v=>v>0).length;
    return (
      <div style={{background:"#0a1628",minHeight:"calc(100vh - 48px)",color:"#e8f4fd"}}>
        <div style={{background:"#111d35",borderBottom:"1px solid #1e3a5f",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"#4a9eff",letterSpacing:3,textTransform:"uppercase"}}>Cotação {tipoLabel} · {safraLabel}</div>
            <div style={{fontSize:14,fontWeight:700}}>{role.name}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!isSem&&<span style={{fontSize:11,color:"#5a7a9a"}}>{filled}/{produtos.length}</span>}
            <button onClick={handleSave} style={{padding:"8px 18px",background:saved?"#2e7d32":"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
              {saved?"✓ Salvo!":"Salvar"}
            </button>
            <button onClick={()=>{setScreen("login");setLoginInput("");setLoginError("");}} style={{padding:"8px 12px",background:"transparent",border:"1px solid #1e3a5f",borderRadius:6,color:"#5a7a9a",fontSize:11,cursor:"pointer"}}>Sair</button>
          </div>
        </div>

        {isSem ? (
          <div style={{padding:20,maxWidth:800,margin:"0 auto"}}>
            <div style={{background:"#0d2040",border:"1px solid #1e3a5f",borderRadius:8,padding:14,marginBottom:20,fontSize:11,color:"#7a9ab8"}}>
              🌾 Cotação de Sementes — Soja: bag=5M sem · Feijão: bag=3,5M sem · Milho: sc=60k sem<br/>
              Digite a variedade, selecione a cultura, área e população. A quantidade de bags/sacos é calculada automaticamente.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:6,marginBottom:6}}>
              {["Variedade","Cultura","Área(ha)","Pop.(mil/ha)","Qtd calc.","R$/bag"].map(h=>(
                <div key={h} style={{fontSize:9,color:"#5a7a9a",textTransform:"uppercase",padding:"4px 6px"}}>{h}</div>
              ))}
            </div>
            {[...Array(12)].map((_,i)=>{
              const kN=`sem_${i}_nome`,kC=`sem_${i}_cult`,kA=`sem_${i}_area`,kP=`sem_${i}_pop`,kPr=`sem_${i}_preco`;
              const cult=myPrices[kC]||"Soja";
              const area=parseFloat(myPrices[kA])||0;
              const pop=parseFloat(myPrices[kP])||0;
              const semPorBag=cult==="Soja"?5000000:cult==="Feijão"?3500000:60000;
              const unid=cult==="Milho"?"sc":"bag";
              const qtd=area>0&&pop>0?((area*(pop*1000))/semPorBag).toFixed(1):"—";
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:6,marginBottom:6}}>
                  <input placeholder="Variedade/Híbrido" value={myPrices[kN]||""} onChange={e=>setMyPrices(p=>({...p,[kN]:e.target.value}))}
                    style={{padding:"6px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none"}}/>
                  <select value={cult} onChange={e=>setMyPrices(p=>({...p,[kC]:e.target.value}))}
                    style={{padding:"6px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none"}}>
                    {["Soja","Milho","Feijão","Trigo"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input placeholder="ha" type="number" value={myPrices[kA]||""} onChange={e=>setMyPrices(p=>({...p,[kA]:e.target.value}))}
                    style={{padding:"6px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none",textAlign:"right"}}/>
                  <input placeholder="mil/ha" type="number" value={myPrices[kP]||""} onChange={e=>setMyPrices(p=>({...p,[kP]:e.target.value}))}
                    style={{padding:"6px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none",textAlign:"right"}}/>
                  <div style={{padding:"6px 8px",background:"#0d2a1a",border:"1px solid #2e7d32",borderRadius:5,color:"#4ade80",fontSize:11,textAlign:"right",fontWeight:700}}>
                    {qtd}{qtd!=="—"?" "+unid:""}
                  </div>
                  <input placeholder="R$" type="number" value={myPrices[kPr]||""} onChange={e=>setMyPrices(p=>({...p,[kPr]:e.target.value}))}
                    style={{padding:"6px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:5,color:"#e8f4fd",fontSize:11,outline:"none",textAlign:"right"}}/>
                </div>
              );
            })}
            <button onClick={handleSave} style={{marginTop:14,padding:"12px 28px",background:saved?"#2e7d32":"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:7,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {saved?"✓ Enviada!":"Salvar Cotação"}
            </button>
          </div>
        ) : (
          <div style={{padding:"12px 18px 40px"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {["Todas",...categorias].map(cat=>(
                <button key={cat} onClick={()=>setFilterCat(cat)} style={{padding:"4px 11px",background:filterCat===cat?"#1565C0":"#111d35",border:`1px solid ${filterCat===cat?"#1565C0":"#1e3a5f"}`,borderRadius:16,color:filterCat===cat?"#fff":"#7a9ab8",fontSize:10,cursor:"pointer"}}>{cat}</button>
              ))}
            </div>
            {categorias.filter(cat=>filterCat==="Todas"||cat===filterCat).map(cat=>{
              const prods=produtos.filter(p=>p.categoria===cat);
              if(!prods.length) return null;
              return (
                <div key={cat} style={{marginBottom:18}}>
                  <div style={{fontSize:10,letterSpacing:3,color:"#f59e0b",textTransform:"uppercase",marginBottom:7,paddingBottom:4,borderBottom:"1px solid #f59e0b33"}}>{cat}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 60px 100px 70px 140px",gap:1,background:"#1e3a5f22"}}>
                    {["Produto","Unid.","Qtd.","I.A.","Preço (R$)"].map(h=>(
                      <div key={h} style={{padding:"6px 9px",background:"#111d35",fontSize:9,color:"#5a7a9a",letterSpacing:1,textTransform:"uppercase"}}>{h}</div>
                    ))}
                    {prods.map((p,ii)=>{
                      const key=p.nome.toLowerCase();
                      const val=myPrices[key]!==undefined?myPrices[key]:"";
                      const bg=ii%2===0?"#0d1e36":"#0f2240";
                      return (
                        <React.Fragment key={key}>
                          <div style={{padding:"8px 9px",background:bg,fontSize:11,color:"#d0e8ff"}}>{p.nome}</div>
                          <div style={{padding:"8px 9px",background:bg,fontSize:10,color:"#5a7a9a",textAlign:"center"}}>{p.unidade}</div>
                          <div style={{padding:"8px 9px",background:bg,fontSize:10,color:"#7a9ab8",textAlign:"right"}}>{fmtNum(p.qtd_total)}</div>
                          <div style={{padding:"8px 9px",background:bg,fontSize:9,color:"#5a7a9a"}}>{p.ingrediente_ativo||"—"}</div>
                          <div style={{padding:"4px 6px",background:bg}}>
                            <input type="number" step="0.01" min="0" value={val}
                              onChange={e=>setMyPrices(prev=>({...prev,[key]:e.target.value===""?"":parseFloat(e.target.value)}))}
                              placeholder="0,00"
                              style={{width:"100%",padding:"5px 8px",background:val>0?"#0d2a4a":"#0a1628",border:`1px solid ${val>0?"#1565C088":"#1e3a5f"}`,borderRadius:4,color:val>0?"#e8f4fd":"#5a7a9a",fontSize:11,outline:"none",boxSizing:"border-box",textAlign:"right"}}/>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:14}}>
              <button onClick={handleSave} style={{padding:"12px 28px",background:saved?"#2e7d32":"linear-gradient(135deg,#1565C0,#0d47a1)",border:"none",borderRadius:7,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {saved?"✓ Enviada!":"Salvar Cotação"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen==="admin") {
    const totalRef = produtos.reduce((s,p)=>s+p.qtd_total*p.preco_ref,0);
    const filtProds = produtos.filter(p=>filterCat==="Todas"||p.categoria===filterCat);

    return (
      <div style={{background:"#0a1628",minHeight:"calc(100vh - 48px)",color:"#e8f4fd"}}>
        <div style={{background:"#111d35",borderBottom:"1px solid #1e3a5f",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:10,color:"#f59e0b",letterSpacing:3,textTransform:"uppercase"}}>Admin · Cotação {tipoLabel} · {safraLabel}</div>
            <div style={{fontSize:14,fontWeight:700}}>{produtos.length} produtos</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button onClick={()=>setShowEditForn(!showEditForn)} style={{padding:"8px 12px",background:"#1e3a5f",border:"1px solid #2a5080",borderRadius:6,color:"#7ab8ff",fontSize:11,cursor:"pointer"}}>👥 Fornecedores</button>
            {tipo!=="sem"&&<button onClick={()=>setShowFechar(true)} style={{padding:"8px 14px",background:"#2e7d32",border:"none",borderRadius:6,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>✅ Fechar Cotação</button>}
            <button onClick={()=>{setScreen("login");setLoginInput("");setLoginError("");}} style={{padding:"8px 12px",background:"transparent",border:"1px solid #1e3a5f",borderRadius:6,color:"#5a7a9a",fontSize:11,cursor:"pointer"}}>Sair</button>
          </div>
        </div>

        {/* Edit fornecedores inline */}
        {showEditForn&&(
          <div style={{background:"#111d35",borderBottom:"1px solid #1e3a5f",padding:"12px 18px"}}>
            <div style={{fontSize:11,color:"#f59e0b",marginBottom:8}}>Editar Fornecedores desta Cotação:</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {fornecedores.map((f,i)=>(
                <div key={i} style={{display:"flex",gap:4,alignItems:"center",background:"#0d1e36",padding:"4px 8px",borderRadius:6,border:"1px solid #1e3a5f"}}>
                  <span style={{fontSize:11,color:"#e8f4fd"}}>{f.nome}</span>
                  <span style={{fontSize:10,color:"#4a9eff",fontFamily:"monospace"}}>{f.token}</span>
                  <button onClick={()=>setFornecedores(fns=>fns.filter((_,fi)=>fi!==i))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:12}}>✕</button>
                </div>
              ))}
              <button onClick={()=>setFornecedores(fns=>[...fns,{nome:"Novo",telefone:"",token:genToken("NV")}])} style={{padding:"4px 10px",background:"#1e3a5f",border:"1px dashed #2a5080",borderRadius:6,color:"#7ab8ff",fontSize:11,cursor:"pointer"}}>+ Adicionar</button>
            </div>
          </div>
        )}

        {/* Status */}
        <div style={{padding:"12px 18px 0",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
          {fornecedores.map((f,i)=>{
            const pr=allPrices[f.nome]||{};
            const count=tipo==="sem"?Object.keys(pr).filter(k=>k.includes("_nome")&&pr[k]).length:Object.values(pr).filter(v=>v>0).length;
            const done=count>0;
            return (
              <div key={f.nome} style={{padding:"9px 12px",background:"#111d35",borderRadius:8,border:`1px solid ${done?"#2e7d32":"#1e3a5f"}`}}>
                <div style={{fontSize:10,color:done?"#4ade80":"#3a5a7a",marginBottom:2}}>{done?"✓":"⏳"} {f.token}</div>
                <div style={{fontSize:11,fontWeight:700,color:done?"#e8f4fd":"#4a6a8a"}}>{f.nome}</div>
              </div>
            );
          })}
        </div>

        <div style={{padding:"12px 18px 0",display:"flex",gap:3,borderBottom:"1px solid #1e3a5f"}}>
          {[["merit","Mérito"],["summary","Resumo"]].map(([t,l])=>(
            <button key={t} onClick={()=>setAdminTab(t)} style={{padding:"8px 16px",background:adminTab===t?"#1e3a5f":"transparent",border:"none",borderBottom:adminTab===t?"2px solid #4a9eff":"2px solid transparent",color:adminTab===t?"#e8f4fd":"#5a7a9a",fontSize:12,cursor:"pointer"}}>{l}</button>
          ))}
        </div>

        {adminTab==="merit"&&tipo!=="sem"&&(
          <div style={{padding:"12px 18px 40px"}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {["Todas",...categorias].map(cat=>(
                <button key={cat} onClick={()=>setFilterCat(cat)} style={{padding:"4px 10px",background:filterCat===cat?"#1565C0":"#111d35",border:`1px solid ${filterCat===cat?"#1565C0":"#1e3a5f"}`,borderRadius:16,color:filterCat===cat?"#fff":"#7a9ab8",fontSize:10,cursor:"pointer"}}>{cat}</button>
              ))}
            </div>
            {categorias.filter(cat=>filterCat==="Todas"||cat===filterCat).map(cat=>{
              const prods=filtProds.filter(p=>p.categoria===cat);
              if(!prods.length) return null;
              return (
                <div key={cat} style={{marginBottom:24}}>
                  <div style={{fontSize:10,letterSpacing:3,color:"#f59e0b",textTransform:"uppercase",marginBottom:8,paddingBottom:4,borderBottom:"1px solid #f59e0b33"}}>{cat}</div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr>
                        <th style={{padding:"7px 9px",background:"#111d35",color:"#7a9ab8",textAlign:"left",fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>Produto</th>
                        <th style={{padding:"7px 9px",background:"#111d35",color:"#7a9ab8",textAlign:"left",fontSize:9,textTransform:"uppercase"}}>I.A.</th>
                        <th style={{padding:"7px 9px",background:"#111d35",color:"#7a9ab8",textAlign:"center",fontSize:9,textTransform:"uppercase"}}>Unid.</th>
                        <th style={{padding:"7px 9px",background:"#111d35",color:"#7a9ab8",textAlign:"right",fontSize:9,textTransform:"uppercase"}}>Qtd.</th>
                        <th style={{padding:"7px 9px",background:"#111d35",color:"#4a9eff",textAlign:"right",fontSize:9,textTransform:"uppercase"}}>Ref.</th>
                        {fornecedores.map(f=>(<th key={f.nome} style={{padding:"7px 9px",background:"#1e3a5f22",color:"#7ab8ff",textAlign:"right",fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{f.nome.split(" ")[0]}</th>))}
                        <th style={{padding:"7px 9px",background:"#0d2a1a",color:"#4ade80",textAlign:"center",fontSize:9,textTransform:"uppercase"}}>✔ Melhor</th>
                        <th style={{padding:"7px 9px",background:"#1a0d0d",color:"#f87171",textAlign:"center",fontSize:9,textTransform:"uppercase"}}>Economia</th>
                      </tr></thead>
                      <tbody>
                        {prods.map((p,ri)=>{
                          const key=p.nome.toLowerCase();
                          const fp=fornecedores.map(f=>{const v=(allPrices[f.nome]||{})[key];return v>0?Number(v):null;});
                          const validos=fp.filter(v=>v!==null);
                          const melhor=validos.length>0?Math.min(...validos):null;
                          const eco=melhor!==null?(p.preco_ref-melhor)*p.qtd_total:null;
                          const bg=ri%2===0?"#0d1e36":"#0f2240";
                          return (
                            <tr key={key}>
                              <td style={{padding:"6px 9px",background:bg,color:"#d0e8ff",fontSize:11}}>{p.nome}</td>
                              <td style={{padding:"6px 9px",background:bg,color:"#5a7a9a",fontSize:9}}>{p.ingrediente_ativo||"—"}</td>
                              <td style={{padding:"6px 9px",background:bg,color:"#5a7a9a",textAlign:"center",fontSize:10}}>{p.unidade}</td>
                              <td style={{padding:"6px 9px",background:bg,color:"#7a9ab8",textAlign:"right",fontSize:10}}>{fmtNum(p.qtd_total)}</td>
                              <td style={{padding:"6px 9px",background:bg,color:"#4a9eff",textAlign:"right",fontWeight:700,fontSize:10}}>{fmtR2(p.preco_ref)}</td>
                              {fp.map((v,fi)=>{const isBest=v!==null&&v===melhor;return(
                                <td key={fi} style={{padding:"6px 9px",background:isBest?"#0d2a1a":bg,color:isBest?"#4ade80":v!==null?"#e8f4fd":"#2a3a4a",textAlign:"right",fontWeight:isBest?700:400,fontSize:10}}>{v!==null?fmtR2(v):"—"}</td>
                              );})}
                              <td style={{padding:"6px 9px",background:"#0d2a1a",color:"#4ade80",textAlign:"center",fontWeight:700,fontSize:10}}>{melhor!==null?fmtR2(melhor):"—"}</td>
                              <td style={{padding:"6px 9px",background:"#1a0d0d",color:eco>0?"#4ade80":eco<0?"#f87171":"#5a7a9a",textAlign:"right",fontWeight:700,fontSize:10}}>
                                {eco!==null?(eco>=0?"+":"")+`R$ ${Math.abs(eco).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {adminTab==="summary"&&(
          <div style={{padding:"14px 18px 40px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12}}>
            {fornecedores.map((f,i)=>{
              const pr=allPrices[f.nome]||{};
              const count=Object.values(pr).filter(v=>v>0).length;
              const total=produtos.reduce((s,p)=>{const v=pr[p.nome.toLowerCase()];return v>0?s+v*p.qtd_total:s;},0);
              return (
                <div key={f.nome} style={{background:"#111d35",borderRadius:10,padding:"16px",border:`1px solid ${count>0?"#2e7d32":"#1e3a5f"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{fontSize:15,fontWeight:700,color:count>0?"#e8f4fd":"#4a6a8a"}}>{f.nome}</div>
                    <div style={{fontSize:10,color:"#4a9eff",fontFamily:"monospace"}}>{f.token}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <div style={{background:"#0d1e36",borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:9,color:"#5a7a9a",textTransform:"uppercase",marginBottom:2}}>Total Cotado</div><div style={{fontSize:12,fontWeight:700,color:"#4a9eff"}}>{total>0?fmtR(total):"—"}</div></div>
                    <div style={{background:"#0d1e36",borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:9,color:"#5a7a9a",textTransform:"uppercase",marginBottom:2}}>Produtos</div><div style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>{count}/{produtos.length}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fechar cotação modal */}
        {showFechar&&<FecharCotacaoModal produtos={produtos} allPrices={allPrices} fornecedores={fornecedores} onConfirm={(decisions)=>{onFechar&&onFechar(decisions);setShowFechar(false);}} onCancel={()=>setShowFechar(false)} fmtR2={fmtR2}/>}
      </div>
    );
  }
  return null;
}

// ── FecharCotacaoModal ────────────────────────────────────────────────────────
function FecharCotacaoModal({produtos, allPrices, fornecedores, onConfirm, onCancel, fmtR2}) {
  const [decisions, setDecisions] = useState(()=>{
    const d={};
    produtos.forEach(p=>{
      const key=p.nome.toLowerCase();
      const vals=fornecedores.map(f=>({nome:f.nome,preco:(allPrices[f.nome]||{})[key]||0})).filter(x=>x.preco>0);
      const melhor=vals.length?vals.reduce((a,b)=>a.preco<b.preco?a:b):null;
      d[key]={nomeReal:p.nome,iaReal:p.ingrediente_ativo||"",splits:melhor?[{nome:melhor.nome,qtd:100,preco:melhor.preco}]:[{nome:"",qtd:100,preco:0}]};
    });
    return d;
  });
  const calcPM=(splits)=>{ const tq=splits.reduce((s,x)=>s+(parseFloat(x.qtd)||0),0); return tq>0?splits.reduce((s,x)=>s+(parseFloat(x.preco)||0)*(parseFloat(x.qtd)||0)/tq,0):0; };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,overflowY:"auto",padding:20}}>
      <div style={{background:"#0d1e36",borderRadius:12,padding:22,width:"min(860px,95vw)",border:"1px solid #1e3a5f",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{color:"#e8f4fd",fontSize:16,fontWeight:800,marginBottom:4}}>✅ Fechar Cotação</div>
        <div style={{color:"#5a7a9a",fontSize:11,marginBottom:18}}>Selecione fornecedor e preço final. Para dividir, adicione linhas. Preço médio ponderado vai para a programação.</div>
        {produtos.map(p=>{
          const key=p.nome.toLowerCase();
          const dec=decisions[key];
          if(!dec) return null;
          const pm=calcPM(dec.splits);
          const allVals=fornecedores.map(f=>({nome:f.nome,preco:(allPrices[f.nome]||{})[key]||0})).filter(x=>x.preco>0);
          return (
            <div key={key} style={{background:"#111d35",borderRadius:8,padding:12,marginBottom:8,border:"1px solid #1e3a5f"}}>
              <div style={{display:"flex",gap:10,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
                <div style={{flex:2}}><div style={{fontSize:9,color:"#5a7a9a",marginBottom:2}}>NOME COMERCIAL</div>
                  <input value={dec.nomeReal} onChange={e=>setDecisions(d=>({...d,[key]:{...d[key],nomeReal:e.target.value}}))}
                    style={{width:"100%",padding:"5px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,outline:"none",boxSizing:"border-box"}}/></div>
                <div style={{flex:2}}><div style={{fontSize:9,color:"#5a7a9a",marginBottom:2}}>INGREDIENTE ATIVO</div>
                  <input value={dec.iaReal} onChange={e=>setDecisions(d=>({...d,[key]:{...d[key],iaReal:e.target.value}}))}
                    style={{width:"100%",padding:"5px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,outline:"none",boxSizing:"border-box"}}/></div>
                <div style={{fontSize:11,color:"#4ade80",fontWeight:700}}>PM: {fmtR2(pm)}</div>
              </div>
              {allVals.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:7}}>
                {allVals.map(v=><span key={v.nome} style={{fontSize:9,padding:"2px 7px",background:"#1e3a5f",borderRadius:9,color:"#7ab8ff"}}>{v.nome}: {fmtR2(v.preco)}</span>)}
              </div>}
              {dec.splits.map((split,si)=>(
                <div key={si} style={{display:"flex",gap:7,alignItems:"center",marginBottom:5,flexWrap:"wrap"}}>
                  <select value={split.nome} onChange={e=>{const ns=[...dec.splits];ns[si]={...ns[si],nome:e.target.value};setDecisions(d=>({...d,[key]:{...d[key],splits:ns}}));}}
                    style={{flex:2,padding:"5px 8px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,outline:"none"}}>
                    <option value="">-- Fornecedor --</option>
                    {fornecedores.map(f=><option key={f.nome} value={f.nome}>{f.nome}</option>)}
                  </select>
                  <input type="number" placeholder="%" value={split.qtd} onChange={e=>{const ns=[...dec.splits];ns[si]={...ns[si],qtd:e.target.value};setDecisions(d=>({...d,[key]:{...d[key],splits:ns}}));}}
                    style={{width:60,padding:"5px 7px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,outline:"none",textAlign:"right"}}/>
                  <span style={{color:"#5a7a9a",fontSize:10}}>%</span>
                  <input type="number" placeholder="Preço" value={split.preco} onChange={e=>{const ns=[...dec.splits];ns[si]={...ns[si],preco:e.target.value};setDecisions(d=>({...d,[key]:{...d[key],splits:ns}}));}}
                    style={{width:100,padding:"5px 7px",background:"#0d1e36",border:"1px solid #1e3a5f",borderRadius:4,color:"#e8f4fd",fontSize:11,outline:"none",textAlign:"right"}}/>
                  {dec.splits.length>1&&<button onClick={()=>{const ns=dec.splits.filter((_,idx)=>idx!==si);setDecisions(d=>({...d,[key]:{...d[key],splits:ns}}));}} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:13}}>✕</button>}
                </div>
              ))}
              <button onClick={()=>{const ns=[...dec.splits,{nome:"",qtd:0,preco:0}];setDecisions(d=>({...d,[key]:{...d[key],splits:ns}}));}}
                style={{fontSize:10,color:"#4a9eff",background:"none",border:"1px dashed #1e3a5f",borderRadius:4,padding:"2px 9px",cursor:"pointer"}}>+ Dividir</button>
            </div>
          );
        })}
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <button onClick={()=>onConfirm(decisions)} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,#2e7d32,#1b5e20)",border:"none",borderRadius:7,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            ✅ Confirmar e Lançar na Programação
          </button>
          <button onClick={onCancel} style={{padding:"12px 18px",background:"#1e3a5f",border:"none",borderRadius:7,color:"#7a9ab8",fontSize:12,cursor:"pointer"}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── CotacaoAvulsaView ─────────────────────────────────────────────────────────
function CotacaoAvulsaView() {
  const [cotacoes, setCotacoes] = useState(()=>ls.get("gcagro_v4_cot_avulsa",[]));
  const [showNew, setShowNew] = useState(false);
  const [nome, setNome] = useState("");
  const [activeId, setActiveId] = useState(null);

  useEffect(()=>{ ls.set("gcagro_v4_cot_avulsa",cotacoes); },[cotacoes]);

  const active = cotacoes.find(c=>c.id===activeId);

  function novaCot() {
    if(!nome.trim()) return;
    const nova={id:Date.now()+"",nome:nome.trim(),data:new Date().toLocaleDateString("pt-BR"),status:"aberta",produtos:[],cotacoes:{},fornecedores:[...FORN_DEFAULT_INS]};
    setCotacoes(c=>[...c,nova]);
    setNome(""); setShowNew(false); setActiveId(nova.id);
  }

  if (activeId&&active) {
    const [myP, setMyP] = useState({});
    const [role, setRole] = useState(null);
    const [loginIn, setLoginIn] = useState("");
    const [loginErr, setLoginErr] = useState("");
    const [screen, setScreen] = useState("admin");

    return (
      <div style={{maxWidth:900,margin:"0 auto",padding:14}}>
        <button onClick={()=>setActiveId(null)} style={{padding:"6px 12px",background:"#f0f0f0",border:"none",borderRadius:6,fontSize:12,cursor:"pointer",marginBottom:14}}>← Voltar</button>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a",marginBottom:4}}>{active.nome}</div>
        <div style={{fontSize:11,color:"#888",marginBottom:16}}>Criada em {active.data}</div>

        {/* Produtos da cotação avulsa */}
        <div style={{background:"#fff",borderRadius:10,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Produtos para cotar</div>
          {active.produtos.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
              <input value={p.nome||""} onChange={e=>setCotacoes(cs=>cs.map(c=>c.id===activeId?{...c,produtos:c.produtos.map((pp,pi)=>pi===i?{...pp,nome:e.target.value}:pp)}:c))}
                placeholder="Produto" style={{flex:2,padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}/>
              <input value={p.qtd||""} onChange={e=>setCotacoes(cs=>cs.map(c=>c.id===activeId?{...c,produtos:c.produtos.map((pp,pi)=>pi===i?{...pp,qtd:e.target.value}:pp)}:c))}
                placeholder="Qtd" style={{width:80,padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}/>
              <input value={p.unidade||""} onChange={e=>setCotacoes(cs=>cs.map(c=>c.id===activeId?{...c,produtos:c.produtos.map((pp,pi)=>pi===i?{...pp,unidade:e.target.value}:pp)}:c))}
                placeholder="Unid" style={{width:60,padding:"6px 8px",border:"1px solid #ddd",borderRadius:5,fontSize:12}}/>
              <button onClick={()=>setCotacoes(cs=>cs.map(c=>c.id===activeId?{...c,produtos:c.produtos.filter((_,pi)=>pi!==i)}:c))} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer"}}>✕</button>
            </div>
          ))}
          <button onClick={()=>setCotacoes(cs=>cs.map(c=>c.id===activeId?{...c,produtos:[...c.produtos,{nome:"",qtd:"",unidade:"L"}]}:c))}
            style={{padding:"5px 12px",background:"none",border:"1px dashed #ddd",borderRadius:5,color:"#888",fontSize:11,cursor:"pointer"}}>+ Produto</button>
        </div>
        <div style={{color:"#888",fontSize:12,textAlign:"center"}}>Configure produtos acima e use a aba Fornecedores para enviar tokens.</div>
      </div>
    );
  }

  return (
    <div style={{maxWidth:900,margin:"0 auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:16,fontWeight:800,color:"#1a3a1a"}}>📋 Cotações Avulsas</div>
        <button onClick={()=>setShowNew(true)} style={{padding:"7px 14px",background:"#1565C0",border:"none",borderRadius:6,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Nova Cotação</button>
      </div>
      {showNew&&(
        <div style={{background:"#fff",borderRadius:10,padding:14,marginBottom:14,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",border:"2px solid #1565C0"}}>
          <div style={{display:"flex",gap:10}}>
            <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome da cotação (ex: Reposição defensivos julho)"
              style={{flex:1,padding:"8px 10px",border:"1px solid #ddd",borderRadius:5,fontSize:12,outline:"none"}}/>
            <button onClick={novaCot} style={{padding:"8px 16px",background:"#1565C0",border:"none",borderRadius:5,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Criar</button>
            <button onClick={()=>setShowNew(false)} style={{padding:"8px 12px",background:"#f5f5f5",border:"none",borderRadius:5,fontSize:12,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}
      {cotacoes.length===0&&!showNew&&(
        <div style={{background:"#fff",borderRadius:10,padding:30,textAlign:"center",color:"#aaa",fontSize:13,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"}}>Nenhuma cotação avulsa ainda.</div>
      )}
      {cotacoes.map((cot,i)=>(
        <div key={cot.id} onClick={()=>setActiveId(cot.id)} style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginBottom:10,cursor:"pointer",borderLeft:`4px solid ${cot.status==="fechada"?"#2e7d32":"#1565C0"}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#1a3a1a"}}>{cot.nome}</div>
            <div style={{fontSize:11,color:"#888",marginTop:2}}>Criada em {cot.data} · {cot.produtos?.length||0} produtos</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,padding:"3px 10px",background:cot.status==="fechada"?"#e8f5e9":"#e3f2fd",color:cot.status==="fechada"?"#2e7d32":"#1565C0",borderRadius:12,fontWeight:700}}>
              {cot.status==="fechada"?"✓ Fechada":"Em aberto"}
            </span>
            <button onClick={e=>{e.stopPropagation();setCotacoes(cs=>cs.filter(c=>c.id!==cot.id));}} style={{background:"none",border:"none",color:"#e57373",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Core data ──
  const [dataVerao,   setDataVerao]   = useState(() => ls.get(KEYS.safraVerao,   INITIAL_DATA_VERAO));
  const [dataSafrinha, setDataSafrinha] = useState(() => ls.get(KEYS.safraSafrinha, INITIAL_DATA_INVERNO));

  // ── Safras ──
  const [safrasAtivas, setSafrasAtivas] = useState(() => ls.get(KEYS.safrasAtivas, [
    {nome:"Verão 26/27",   tipo:"verao",    inicio:"01/09/2025"},
    {nome:"Safrinha 2027", tipo:"safrinha", inicio:"01/01/2027"},
  ]));
  const [arquivadas, setArquivadas] = useState(() => ls.get(KEYS.safrasArquivadas, []));

  // ── Cotações ──
  const [cotVeraoAdub, setCotVeraoAdub]     = useState(() => ls.get(KEYS.cotacoes+"_v_adub", {}));
  const [cotVeraoIns,  setCotVeraoIns]      = useState(() => ls.get(KEYS.cotacoes+"_v_ins",  {}));
  const [cotVeraoSem,  setCotVeraoSem]      = useState(() => ls.get(KEYS.cotacoes+"_v_sem",  {}));
  const [cotSafAdub,   setCotSafAdub]       = useState(() => ls.get(KEYS.cotacoes+"_s_adub", {}));
  const [cotSafIns,    setCotSafIns]        = useState(() => ls.get(KEYS.cotacoes+"_s_ins",  {}));
  const [cotSafSem,    setCotSafSem]        = useState(() => ls.get(KEYS.cotacoes+"_s_sem",  {}));

  // ── Fornecedores ──
  const [fornVeraoAdub, setFornVeraoAdub]   = useState(() => ls.get(KEYS.fornecedores+"_v_adub",  [...FORN_DEFAULT_ADUB]));
  const [fornVeraoIns,  setFornVeraoIns]    = useState(() => ls.get(KEYS.fornecedores+"_v_ins",   [...FORN_DEFAULT_INS]));
  const [fornVeraoSem,  setFornVeraoSem]    = useState(() => ls.get(KEYS.fornecedores+"_v_sem",   [...FORN_DEFAULT_INS]));
  const [fornSafAdub,   setFornSafAdub]     = useState(() => ls.get(KEYS.fornecedores+"_s_adub",  [...FORN_DEFAULT_ADUB]));
  const [fornSafIns,    setFornSafIns]      = useState(() => ls.get(KEYS.fornecedores+"_s_ins",   [...FORN_DEFAULT_INS]));
  const [fornSafSem,    setFornSafSem]      = useState(() => ls.get(KEYS.fornecedores+"_s_sem",   [...FORN_DEFAULT_INS]));

  // ── Other data ──
  const [vendas,          setVendas]        = useState(() => ls.get(KEYS.vendas,             HISTORICO_VENDAS_INICIAL));
  const [compras,         setCompras]       = useState(() => ls.get(KEYS.compras,            {sementes:[],adubos:[],insumos:[],cobertura:[]}));
  const [produtividade,   setProdutividade] = useState(() => ls.get(KEYS.produtividade,      []));
  const [planVerao,       setPlanVerao]     = useState(() => ls.get(KEYS.planejamentoVerao,   PLAN_VERAO_INICIAL));
  const [planSafrinha,    setPlanSafrinha]  = useState(() => ls.get(KEYS.planejamentoSafrinha, PLAN_SAFRINHA_INICIAL));
  const [tsVerao,         setTsVerao]       = useState(() => ls.get(KEYS.tsVerao,            TS_VERAO_INICIAL));
  const [tsSafrinha,      setTsSafrinha]    = useState(() => ls.get(KEYS.tsSafrinha,         TS_SAFRINHA_INICIAL));

  // ── UI ──
  const [view, setView] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Auto-save ──
  useEffect(() => { ls.set(KEYS.safraVerao,    dataVerao);   }, [dataVerao]);
  useEffect(() => { ls.set(KEYS.safraSafrinha, dataSafrinha); }, [dataSafrinha]);
  useEffect(() => { ls.set(KEYS.safrasAtivas,  safrasAtivas); }, [safrasAtivas]);
  useEffect(() => { ls.set(KEYS.safrasArquivadas, arquivadas); }, [arquivadas]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_v_adub", cotVeraoAdub); }, [cotVeraoAdub]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_v_ins",  cotVeraoIns);  }, [cotVeraoIns]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_v_sem",  cotVeraoSem);  }, [cotVeraoSem]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_s_adub", cotSafAdub);   }, [cotSafAdub]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_s_ins",  cotSafIns);    }, [cotSafIns]);
  useEffect(() => { ls.set(KEYS.cotacoes+"_s_sem",  cotSafSem);    }, [cotSafSem]);
  useEffect(() => { ls.set(KEYS.fornecedores+"_v_adub", fornVeraoAdub); }, [fornVeraoAdub]);
  useEffect(() => { ls.set(KEYS.fornecedores+"_v_ins",  fornVeraoIns);  }, [fornVeraoIns]);
  useEffect(() => { ls.set(KEYS.fornecedores+"_s_adub", fornSafAdub);   }, [fornSafAdub]);
  useEffect(() => { ls.set(KEYS.fornecedores+"_s_ins",  fornSafIns);    }, [fornSafIns]);
  useEffect(() => { ls.set(KEYS.vendas,        vendas);       }, [vendas]);
  useEffect(() => { ls.set(KEYS.compras,       compras);      }, [compras]);
  useEffect(() => { ls.set(KEYS.produtividade, produtividade); }, [produtividade]);
  useEffect(() => { ls.set(KEYS.planejamentoVerao,    planVerao);    }, [planVerao]);
  useEffect(() => { ls.set(KEYS.planejamentoSafrinha, planSafrinha); }, [planSafrinha]);
  useEffect(() => { ls.set(KEYS.tsVerao,    tsVerao);    }, [tsVerao]);
  useEffect(() => { ls.set(KEYS.tsSafrinha, tsSafrinha); }, [tsSafrinha]);

  // ── Derived products for cotação ──
  function derivar(data, somenteAdub, excluirAdub) {
    const map={};
    Object.values(data).forEach(c=>{
      if(!c.ativo) return;
      c.categories.forEach(cat=>{
        if(somenteAdub&&cat.name!=="Adubação") return;
        if(excluirAdub&&cat.name==="Adubação") return;
        cat.products.forEach(p=>{
          // Link key: use ingrediente_ativo if available, otherwise product name
          const ia = p.ingrediente_ativo?.trim();
          const key = ia ? ia.toLowerCase() : p.produto.trim().toLowerCase();
          const qtd=p.dose>0?p.dose*p.area:p.area;
          if(map[key]){map[key].qtd_total+=qtd;}
          else{map[key]={
            nome:p.produto.trim(),
            nomeOriginal:p.produto.trim(),
            unidade:p.fase&&p.fase.toLowerCase().includes("dose")?"doses":p.fase&&p.fase.toLowerCase().includes("kg")?"kg":"L",
            qtd_total:qtd,
            categoria:cat.name,
            preco_ref:p.preco_unit,
            ingrediente_ativo:ia||""
          };}
        });
      });
    });
    return Object.values(map);
  }

  const prodVeraoAdub = useMemo(()=>derivar(dataVerao,true,false),   [dataVerao]);
  const prodVeraoIns  = useMemo(()=>derivar(dataVerao,false,true),   [dataVerao]);
  const prodSafAdub   = useMemo(()=>derivar(dataSafrinha,true,false), [dataSafrinha]);
  const prodSafIns    = useMemo(()=>derivar(dataSafrinha,false,true), [dataSafrinha]);

  // ── Fechar cotação → lança na programação ──
  function fecharCotacao(decisions, setDataFn) {
    setDataFn(d=>{
      const nd=JSON.parse(JSON.stringify(d));
      Object.entries(decisions).forEach(([key,dec])=>{
        if(!dec.splits?.some(s=>s.nome&&s.preco>0)) return;
        const tq=dec.splits.reduce((s,x)=>s+(parseFloat(x.qtd)||0),0);
        const pm=tq>0?dec.splits.reduce((s,x)=>s+(parseFloat(x.preco)||0)*(parseFloat(x.qtd)||0)/tq,0):0;
        const forns=dec.splits.filter(s=>s.nome&&s.preco>0).map(s=>s.nome).join(" + ");
        // Link by ingrediente_ativo OR by product name (key)
        const iaReal = dec.iaReal?.trim().toLowerCase();
        Object.values(nd).forEach(c=>c.categories.forEach(cat=>cat.products.forEach(p=>{
          const matchByName = p.produto.trim().toLowerCase()===key;
          const matchByIA = iaReal && p.ingrediente_ativo && p.ingrediente_ativo.trim().toLowerCase()===iaReal;
          if(matchByName||matchByIA){
            p.preco_compra=pm;
            p.fornecedor_compra=forns;
            // Substitui nome comercial pelo que foi efetivamente comprado
            if(dec.nomeReal) p.produto=dec.nomeReal;
            if(dec.iaReal) p.ingrediente_ativo=dec.iaReal;
          }
        })));
      });
      return nd;
    });
    // Add to compras history
    const novosItens=Object.entries(decisions).map(([key,dec])=>{
      if(!dec.splits?.some(s=>s.nome&&s.preco>0)) return null;
      const tq=dec.splits.reduce((s,x)=>s+(parseFloat(x.qtd)||0),0);
      const pm=tq>0?dec.splits.reduce((s,x)=>s+(parseFloat(x.preco)||0)*(parseFloat(x.qtd)||0)/tq,0):0;
      return {id:Date.now()+"_"+key,produto:dec.nomeReal||key,fornecedor:dec.splits.filter(s=>s.nome&&s.preco>0).map(s=>s.nome).join(" + "),preco:pm,qtd:1,unidade:"",data:new Date().toLocaleDateString("pt-BR"),safra:"",obs:"via cotação"};
    }).filter(Boolean);
    if(novosItens.length>0) setCompras(c=>({...c,insumos:[...(c.insumos||[]),...novosItens]}));
  }

  // ── Import backup ──
  function onImport(backup) {
    if(backup.dataVerao) setDataVerao(backup.dataVerao);
    if(backup.dataSafrinha) setDataSafrinha(backup.dataSafrinha);
    if(backup.vendas) setVendas(backup.vendas);
    if(backup.compras) setCompras(backup.compras);
    if(backup.produtividade) setProdutividade(backup.produtividade);
    if(backup.safrasAtivas) setSafrasAtivas(backup.safrasAtivas);
    if(backup.arquivadas) setArquivadas(backup.arquivadas);
  }

  // ── Summary for dashboard ──
  const summaryVerao = useMemo(()=>Object.entries(dataVerao).map(([name,c])=>{
    const ins=c.categories.reduce((s,cat)=>s+cat.products.reduce((ss,p)=>ss+calcRef(p),0),0);
    const op=Object.values(c.op_costs||{}).reduce((s,v)=>s+v,0);
    return {name,area:c.area,ativo:c.ativo,ins,op,total:c.area>0?ins/c.area+op:0};
  }),[dataVerao]);

  // ── Navigation menu ──
  const MENU_GROUPS = [
    { label:"🌱 Safra Verão", color:"#1a5c2e", items:[
      {id:"prog_verao",    icon:"🌱", label:"Programação Verão"},
      {id:"campo_verao",   icon:"🗺️", label:"Campo Verão"},
      {id:"ts_verao",      icon:"🌾", label:"TS / Kit Sulco Verão"},
      {id:"cot_v_adub",    icon:"🌱", label:"Cotação Adubação"},
      {id:"cot_v_ins",     icon:"💊", label:"Cotação Insumos"},
      {id:"cot_v_sem",     icon:"🌾", label:"Cotação Sementes"},
    ]},
    { label:"🌾 Safrinha/Inverno", color:"#5c4a00", items:[
      {id:"prog_safrinha",   icon:"🌾", label:"Programação Safrinha"},
      {id:"campo_safrinha",  icon:"🗺️", label:"Campo Safrinha"},
      {id:"ts_safrinha",     icon:"🌾", label:"TS / Kit Sulco Safrinha"},
      {id:"cot_s_adub",      icon:"🌱", label:"Cotação Adubação"},
      {id:"cot_s_ins",       icon:"💊", label:"Cotação Insumos"},
      {id:"cot_s_sem",       icon:"🌾", label:"Cotação Sementes"},
    ]},
    { label:"📊 Análises", color:"#1565C0", items:[
      {id:"resumo",        icon:"📊", label:"Resumo"},
      {id:"vendas",        icon:"💰", label:"Vendas"},
      {id:"produtividade", icon:"📈", label:"Produtividade"},
    ]},
    { label:"⚙️ Gestão", color:"#37474f", items:[
      {id:"compras",       icon:"📦", label:"Compras"},
      {id:"cot_avulsa",    icon:"📋", label:"Cotações Avulsas"},
      {id:"fornecedores",  icon:"👥", label:"Fornecedores"},
      {id:"safras",        icon:"🗂️", label:"Safras"},
      {id:"backup",        icon:"💾", label:"Backup"},
    ]},
  ];

  const currentLabel = MENU_GROUPS.flatMap(g=>g.items).find(i=>i.id===view)?.label||"Dashboard";

  return (
    <div style={{minHeight:"100vh",background:"#f0f4f8",fontFamily:"system-ui,sans-serif",position:"relative"}}>

      {/* ── TOP NAV ── */}
      <div style={{background:"#1a5c2e",color:"#fff",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",height:50}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{background:"none",border:"none",color:"#fff",fontSize:20,cursor:"pointer",padding:"4px"}}>☰</button>
            <div>
              <div style={{fontSize:15,fontWeight:800,letterSpacing:1}}>🌿 GC Agro</div>
              <div style={{fontSize:9,opacity:0.6,lineHeight:1}}>{currentLabel}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {safrasAtivas.map(s=>(
              <span key={s.nome} style={{fontSize:10,padding:"3px 8px",background:s.tipo==="verao"?"rgba(255,255,255,0.2)":"rgba(255,200,0,0.2)",borderRadius:10,border:"1px solid rgba(255,255,255,0.3)"}}>
                {s.tipo==="verao"?"🌱":"🌾"} {s.nome}
              </span>
            ))}
            <button onClick={()=>window.print()} style={{padding:"6px 10px",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,color:"#fff",fontSize:10,cursor:"pointer"}}>📄 PDF</button>
          </div>
        </div>
      </div>

      {/* ── SIDE MENU ── */}
      {menuOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:300,display:"flex"}}>
          <div style={{width:280,background:"#1a3a1a",overflowY:"auto",boxShadow:"4px 0 20px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"16px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>🌿 GC Agro</div>
              <button onClick={()=>{setView("dashboard");setMenuOpen(false);}} style={{marginTop:8,padding:"8px 14px",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:"pointer",width:"100%",textAlign:"left"}}>🏠 Dashboard</button>
            </div>
            {MENU_GROUPS.map(g=>(
              <div key={g.label} style={{padding:"10px 0"}}>
                <div style={{padding:"4px 14px",fontSize:10,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:1}}>{g.label}</div>
                {g.items.map(item=>(
                  <button key={item.id} onClick={()=>{setView(item.id);setMenuOpen(false);}}
                    style={{width:"100%",padding:"10px 14px",background:view===item.id?"rgba(255,255,255,0.15)":"transparent",border:"none",color:"#fff",fontSize:12,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,borderLeft:view===item.id?"3px solid #4ade80":"3px solid transparent"}}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{flex:1,background:"rgba(0,0,0,0.5)"}} onClick={()=>setMenuOpen(false)}/>
        </div>
      )}

      {/* ── DASHBOARD ── */}
      {view==="dashboard" && (
        <div style={{minHeight:"calc(100vh - 50px)",background:`linear-gradient(rgba(10,30,10,0.85),rgba(10,30,10,0.85)), url("data:image/jpeg;base64,${ls.get("gcagro_bg","")}")`,backgroundSize:"cover",backgroundPosition:"center",padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1}}>🌿 GC Agro</div>
              <div style={{fontSize:12,color:"#4ade80",marginTop:2}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:"#86efac"}}>Área total</div>
              <div style={{fontSize:24,fontWeight:800,color:"#4ade80"}}>{(() => {
                const total = summaryVerao.filter(c=>c.ativo).reduce((s,c)=>s+c.area,0);
                return fmtNum(total);
              })()} ha</div>
            </div>
          </div>

          {/* Cultura cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:20}}>
            {summaryVerao.filter(c=>c.ativo).map(c=>{
              const color=CULT_COLORS[c.name]?.badge||"#4ade80";
              const totalArea=summaryVerao.filter(x=>x.ativo).reduce((s,x)=>s+x.area,0);
              const pct=totalArea>0?c.area/totalArea*100:0;
              return (
                <div key={c.name} onClick={()=>{setView("prog_verao");setMenuOpen(false);}}
                  style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(10px)",borderRadius:14,padding:18,border:`1px solid ${color}44`,cursor:"pointer"}}
                  onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.14)"}
                  onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>{c.name}</div>
                      <div style={{fontSize:11,color:"#86efac"}}>{fmtNum(c.area)} ha</div>
                    </div>
                    <div style={{fontSize:22}}>{c.name==="Soja"?"🌱":c.name==="Milho"?"🌽":"🫘"}</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.1)",borderRadius:4,height:4,marginBottom:10}}>
                    <div style={{background:color,height:4,borderRadius:4,width:`${pct}%`}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontSize:9,color:"#86efac",textTransform:"uppercase"}}>Insumos/ha</div><div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{fmtR(c.area>0?c.ins/c.area:0)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:9,color:"#86efac",textTransform:"uppercase"}}>Total/ha</div><div style={{fontSize:13,fontWeight:700,color}}>{fmtR(c.total)}</div></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(10px)",borderRadius:14,padding:18,border:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:14}}>📋 Cotações Ativas</div>
              {[
                {label:"Adubação Verão",prices:cotVeraoAdub,fns:fornVeraoAdub,color:"#4ade80",view:"cot_v_adub"},
                {label:"Insumos Verão",prices:cotVeraoIns,fns:fornVeraoIns,color:"#60a5fa",view:"cot_v_ins"},
                {label:"Sementes Verão",prices:cotVeraoSem,fns:fornVeraoSem,color:"#fbbf24",view:"cot_v_sem"},
              ].map(({label,prices,fns,color,view:v})=>{
                const resp=fns.filter(f=>prices[f.nome]&&Object.values(prices[f.nome]).some(x=>x>0)).length;
                const pct=fns.length>0?resp/fns.length*100:0;
                return (
                  <div key={label} style={{marginBottom:10,cursor:"pointer"}} onClick={()=>setView(v)}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:11,color:"#e2e8f0"}}>{label}</span>
                      <span style={{fontSize:11,color:pct===100?"#4ade80":pct>0?"#fbbf24":"#94a3b8",fontWeight:700}}>{resp}/{fns.length}</span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.1)",borderRadius:4,height:6}}>
                      <div style={{background:pct===100?"#4ade80":pct>0?"#fbbf24":"#475569",height:6,borderRadius:4,width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(10px)",borderRadius:14,padding:18,border:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:14}}>💰 Custo Total Verão</div>
              {(()=>{
                const totalIns=summaryVerao.filter(c=>c.ativo).reduce((s,c)=>s+c.ins,0);
                const cats={};
                Object.values(dataVerao).forEach(c=>{if(!c.ativo)return;c.categories.forEach(cat=>{if(!cats[cat.name])cats[cat.name]=0;cats[cat.name]+=cat.products.reduce((s,p)=>s+calcRef(p),0);});});
                const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,4);
                const catColors=["#4ade80","#60a5fa","#fbbf24","#f87171"];
                return (
                  <div>
                    <div style={{fontSize:20,fontWeight:800,color:"#4ade80",marginBottom:12}}>{fmtR(totalIns)}</div>
                    {sorted.map(([name,val],i)=>{
                      const pct=totalIns>0?val/totalIns*100:0;
                      return (
                        <div key={name} style={{marginBottom:7}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                            <span style={{fontSize:10,color:"#e2e8f0"}}>{name}</span>
                            <span style={{fontSize:10,color:catColors[i],fontWeight:700}}>{pct.toFixed(1)}%</span>
                          </div>
                          <div style={{background:"rgba(255,255,255,0.1)",borderRadius:3,height:5}}>
                            <div style={{background:catColors[i],height:5,borderRadius:3,width:`${pct}%`}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick access */}
          <div style={{background:"rgba(255,255,255,0.08)",backdropFilter:"blur(10px)",borderRadius:14,padding:18,border:"1px solid rgba(255,255,255,0.1)"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:14}}>⚡ Acesso Rápido</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
              {[
                {label:"Prog. Verão",icon:"🌱",view:"prog_verao",color:"#4ade80"},
                {label:"Prog. Safrinha",icon:"🌾",view:"prog_safrinha",color:"#fbbf24"},
                {label:"Cot. Adubação V",icon:"🌱",view:"cot_v_adub",color:"#86efac"},
                {label:"Cot. Insumos V",icon:"💊",view:"cot_v_ins",color:"#60a5fa"},
                {label:"Vendas",icon:"💰",view:"vendas",color:"#34d399"},
                {label:"Produtividade",icon:"📈",view:"produtividade",color:"#a78bfa"},
                {label:"Compras",icon:"📦",view:"compras",color:"#f59e0b"},
                {label:"Fornecedores",icon:"👥",view:"fornecedores",color:"#f87171"},
              ].map(item=>(
                <button key={item.view} onClick={()=>setView(item.view)}
                  style={{padding:"10px 8px",background:"rgba(255,255,255,0.06)",border:`1px solid ${item.color}33`,borderRadius:10,color:"#fff",fontSize:11,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:6}}
                  onMouseOver={e=>e.currentTarget.style.background="rgba(255,255,255,0.12)"}
                  onMouseOut={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"}>
                  <span style={{fontSize:16}}>{item.icon}</span>
                  <span style={{color:item.color,fontWeight:600}}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEWS ── */}
      {view==="prog_verao"    && <ProgView data={dataVerao}    setData={setDataVerao}    tipo="verao"/>}
      {view==="prog_safrinha" && <ProgView data={dataSafrinha} setData={setDataSafrinha} tipo="safrinha"/>}
      {view==="campo_verao"   && <PlanejamentoVerao   data={planVerao}    setData={setPlanVerao}/>}
      {view==="campo_safrinha"&& <PlanejamentoSafrinha data={planSafrinha} setData={setPlanSafrinha}/>}
      {view==="ts_verao"      && <TSView data={tsVerao}    setData={setTsVerao}    titulo="🌾 TS / Kit Sulco — Safra Verão"    cor="#1a5c2e"/>}
      {view==="ts_safrinha"   && <TSView data={tsSafrinha} setData={setTsSafrinha} titulo="🌾 TS / Kit Sulco — Safrinha/Inverno" cor="#5c4a00"/>}
      {view==="resumo"        && <ResumoView dataVerao={dataVerao} dataSafrinha={dataSafrinha}/>}
      {view==="vendas"        && <VendasView vendas={vendas} setVendas={setVendas}/>}
      {view==="produtividade" && <ProdutividadeView data={produtividade} setData={setProdutividade}/>}
      {view==="compras"       && <ComprasView compras={compras} setCompras={setCompras}/>}
      {view==="fornecedores"  && <FornecedoresView fornIns={fornVeraoIns} setFornIns={setFornVeraoIns} fornAdub={fornVeraoAdub} setFornAdub={setFornVeraoAdub}/>}
      {view==="safras"        && <SafrasView safrasAtivas={safrasAtivas} setSafrasAtivas={setSafrasAtivas} arquivadas={arquivadas} setArquivadas={setArquivadas} dataVerao={dataVerao} dataSafrinha={dataSafrinha}/>}
      {view==="backup"        && <BackupView allData={{dataVerao,dataSafrinha,vendas,compras,produtividade,safrasAtivas,arquivadas}} onImport={onImport}/>}
      {view==="cot_avulsa"    && <CotacaoAvulsaView/>}

      {view==="cot_v_adub" && <CotacaoView tipo="adub" safraLabel="Verão" produtos={prodVeraoAdub} allPrices={cotVeraoAdub} setAllPrices={setCotVeraoAdub} fornecedores={fornVeraoAdub} setFornecedores={setFornVeraoAdub} onFechar={(d)=>fecharCotacao(d,setDataVerao)}/>}
      {view==="cot_v_ins"  && <CotacaoView tipo="ins"  safraLabel="Verão" produtos={prodVeraoIns}  allPrices={cotVeraoIns}  setAllPrices={setCotVeraoIns}  fornecedores={fornVeraoIns}  setFornecedores={setFornVeraoIns}  onFechar={(d)=>fecharCotacao(d,setDataVerao)}/>}
      {view==="cot_v_sem"  && <CotacaoView tipo="sem"  safraLabel="Verão" produtos={[]}            allPrices={cotVeraoSem}  setAllPrices={setCotVeraoSem}  fornecedores={fornVeraoSem}  setFornecedores={setFornVeraoSem}/>}
      {view==="cot_s_adub" && <CotacaoView tipo="adub" safraLabel="Safrinha" produtos={prodSafAdub} allPrices={cotSafAdub}  setAllPrices={setCotSafAdub}  fornecedores={fornSafAdub}  setFornecedores={setFornSafAdub}  onFechar={(d)=>fecharCotacao(d,setDataSafrinha)}/>}
      {view==="cot_s_ins"  && <CotacaoView tipo="ins"  safraLabel="Safrinha" produtos={prodSafIns}  allPrices={cotSafIns}   setAllPrices={setCotSafIns}   fornecedores={fornSafIns}   setFornecedores={setFornSafIns}   onFechar={(d)=>fecharCotacao(d,setDataSafrinha)}/>}
      {view==="cot_s_sem"  && <CotacaoView tipo="sem"  safraLabel="Safrinha" produtos={[]}          allPrices={cotSafSem}   setAllPrices={setCotSafSem}   fornecedores={fornSafSem}   setFornecedores={setFornSafSem}/>}
    </div>
  );
}
