const PERFIS = {
  saudavel: {
    veiculo: "Onix 1.0 Turbo Flex 2023",
    vin: "9BGKS48U0PG100421",
    protocolo: "ISO 15765-4 (CAN)",
    stft: 0.8,
    ltft: 1.5,
    bateria: 14.1,
    posResetKm: 4280,
    monitoresInc: 0,
    dtcs: []
  },
  falha_flex: {
    veiculo: "Gol G6 1.6 Flex 2015",
    vin: "9BWAB45U7FP029814",
    protocolo: "ISO 15765-4 (CAN)",
    stft: 23.0,
    ltft: 18.0,
    bateria: 13.7,
    posResetKm: 1150,
    monitoresInc: 1,
    dtcs: ["P0171"]
  },
  maquiagem: {
    veiculo: "HB20 1.6 Flex 2019 (Suspeita Pré-Venda)",
    vin: "9BHBG51DABP884120",
    protocolo: "ISO 15765-4 (CAN)",
    stft: 4.2,
    ltft: 3.1,
    bateria: 13.9,
    posResetKm: 12,
    monitoresInc: 5,
    dtcs: []
  }
};

const DTC_DB = {
  P0171: {
    desc: "Sistema de Dosagem de Combustível Muito Pobre (Banco 1)",
    grav: "🟡 Oficina em breve",
    pts: 15,
    causas: "Excesso de água no Etanol, ajuste A/F descalculado ou entrada falsa de ar.",
    multi: "Medir alimentação da bomba (12–14,2V) e oscilação da sonda pré-catalisador (0,1–0,9V)."
  },
  P0300: {
    desc: "Falha Aleatória/Múltipla de Ignição (Misfire)",
    grav: "🔴 Parar veículo",
    pts: 30,
    causas: "Velas gastas, bobina com fuga térmica ou bicos travados.",
    multi: "Testar 12V na bobina e resistência do primário (0,5–2,0 Ω)."
  },
  P0420: {
    desc: "Eficiência do Catalisador Abaixo do Limite",
    grav: "🟢 Pode rodar",
    pts: 5,
    causas: "Catalisador degradado por combustível adulterado ou sonda pós lenta.",
    multi: "Medir resistência do aquecedor da sonda pós (3–15 Ω)."
  }
};

let estadoAtual = null;

function calcularAntifraude(p) {
  let score = 100;
  p.dtcs.forEach(c => { score -= (DTC_DB[c] ? DTC_DB[c].pts : 5); });
  if (Math.abs(p.stft + p.ltft) > 15) score -= 15;
  const maquiagem = p.posResetKm < 100 && p.monitoresInc > 2;
  if (maquiagem) score -= 40;
  score = Math.max(0, Math.min(100, score));
  let veredito = "✅ APROVADO";
  let cls = "verde";
  if (maquiagem) {
    veredito = "🚨 ALERTA DE MAQUIAGEM / RESET RECENTE";
    cls = "vermelho";
  } else if (score < 60) {
    veredito = "🚨 ALTO RISCO / MAQUIAGEM";
    cls = "vermelho";
  } else if (score < 85) {
    veredito = "⚠️ ATENÇÃO / NEGOCIAR DESCONTO";
    cls = "amarelo";
  }
  return { score, maquiagem, veredito, cls };
}

function carregarPerfil(chave) {
  const p = PERFIS[chave] || PERFIS.saudavel;
  const af = calcularAntifraude(p);
  estadoAtual = { perfil: p, antifraude: af };

  document.getElementById("kpi-veic").textContent = `${p.veiculo} (${p.protocolo})`;
  document.getElementById("kpi-score").innerHTML = `<span class="badge ${af.cls}">${af.score}/100 — ${af.veredito}</span>`;
  document.getElementById("kpi-trim").textContent = `STFT ${p.stft}% | LTFT ${p.ltft}%`;
  document.getElementById("kpi-reset").textContent = `${p.posResetKm} km (${p.monitoresInc}/8 inc.)`;

  const topo = [
    { nome: "Injeção / ECU", st: p.dtcs.length ? "amarelo" : "verde" },
    { nome: "Mistura Flex (A/F)", st: Math.abs(p.stft + p.ltft) > 15 ? "vermelho" : "verde" },
    { nome: "Emissões / Readiness", st: af.maquiagem ? "vermelho" : (p.monitoresInc > 0 ? "amarelo" : "verde") },
    { nome: "Bateria / Alternador", st: p.bateria < 12.4 ? "amarelo" : "verde" },
    { nome: "Rede CAN / OBD", st: "verde" }
  ];
  document.getElementById("topo-grid").innerHTML = topo.map(t => `<div class="topo-item ${t.st}">${t.nome}</div>`).join("");

  const dtcHtml = p.dtcs.length
    ? p.dtcs.map(c => {
        const d = DTC_DB[c] || { desc: "Código genérico", grav: "🟢 Pode rodar", causas: "Checar chicote.", multi: "Medir 12V e massa." };
        return `<p><strong>${c}</strong> (${d.grav}): ${d.desc}<br><small>Flex BR: ${d.causas}</small><br><small>🔧 Multímetro AL: ${d.multi}</small></p>`;
      }).join("")
    : `<p>Nenhum DTC ativo. ${af.maquiagem ? "⚠️ Porém há forte indício de reset recente antes da venda!" : "Parâmetros dentro da faixa normal."}</p>`;
  document.getElementById("dtc-box").innerHTML = dtcHtml;

  document.getElementById("laudo-preview").innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--b);padding-bottom:10px;margin-bottom:12px">
      <div class="al-metal" style="width:36px;height:36px;font-size:14px">AL®</div>
      <div><strong>Laudo Técnico Pré-Compra — AL AutoScan Pro</strong><br><small>VIN: ${p.vin} | ${p.veiculo}</small></div>
    </div>
    <p><span class="badge ${af.cls}">${af.score}/100 — ${af.veredito}</span></p>
    <p>STFT: ${p.stft}% | LTFT: ${p.ltft}% | Bateria: ${p.bateria}V | Pós-Reset: ${p.posResetKm} km | Monitores incompletos: ${p.monitoresInc}/8</p>
    ${dtcHtml}
    <div class="warn-box">⚠️ Leitura eletrônica ECU; não substitui inspeção mecânica. Stellantis pós-2018 exige cabo bypass SGW.</div>
  `;
}

function consultarDtcAvulso() {
  const cod = (document.getElementById("dtc-input").value || "").trim().toUpperCase();
  if (!cod) return;
  const d = DTC_DB[cod] || { desc: `Código ${cod} (consulta estendida Flex BR)`, grav: "🟢 Pode rodar", causas: "Verificar combustível e sensores.", multi: "Conferir 12V e aterramento." };
  document.getElementById("dtc-box").innerHTML = `<p><strong>${cod}</strong> (${d.grav}): ${d.desc}<br><small>Flex BR: ${d.causas}</small><br><small>🔧 Multímetro AL: ${d.multi}</small></p>`;
}

function mudarAba(aba) {
  ["scanner", "laudo", "comparativo", "adaptadores"].forEach(s => {
    document.getElementById("sec-" + s).classList.toggle("hide", s !== aba);
    document.getElementById("tab-" + s).classList.toggle("active", s === aba);
  });
}

async function conectarSerial() {
  const el = document.getElementById("hw-status");
  if (!("serial" in navigator)) {
    el.textContent = "Web Serial indisponível neste navegador (use Chrome/Edge desktop ou Modo Demo).";
    return;
  }
  try {
    await navigator.serial.requestPort();
    el.textContent = "Porta Serial OBD-II selecionada (modo somente leitura ativo).";
  } catch (e) {
    el.textContent = "Seleção Web Serial cancelada.";
  }
}

async function conectarBLE() {
  const el = document.getElementById("hw-status");
  if (!("bluetooth" in navigator)) {
    el.textContent = "Web Bluetooth indisponível neste navegador (use Chrome Android/Edge ou Modo Demo).";
    return;
  }
  try {
    await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    el.textContent = "Adaptador BLE selecionado (modo somente leitura ativo).";
  } catch (e) {
    el.textContent = "Seleção Web Bluetooth cancelada.";
  }
}

function exportarEspecialista() {
  if (!estadoAtual) return;
  const payload = JSON.stringify(estadoAtual, null, 2);
  const msg = encodeURIComponent(`*AL® AutoScan Pro — Sessão Remota*\n${estadoAtual.perfil.veiculo}\nScore: ${estadoAtual.antifraude.score}/100\n${estadoAtual.antifraude.veredito}\nJSON:\n${payload}`);
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

carregarPerfil("maquiagem");
