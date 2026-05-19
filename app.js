/* FertiliGuia - versão corrigida sem ES Modules.
   Funciona por servidor local e também ao abrir o index.html direto no navegador.
*/

const BOLETIM100 = {
  meta: {
    nome: "Boletim 100: Recomendações de Adubação e Calagem para o Estado de São Paulo",
    instituicao: "Instituto Agronômico (IAC)",
    edicao: "2022",
    aviso: "Dados estruturados para sistema. Validar antes de uso agronômico real."
  },

  classesSolo: {
    fosforoResina: [
      { id: "baixo", rotulo: "Baixo", min: -Infinity, max: 16 },
      { id: "medio", rotulo: "Médio", min: 16, max: 40 },
      { id: "alto", rotulo: "Alto", min: 40, max: Infinity }
    ],
    potassioTrocavel: [
      { id: "baixo", rotulo: "Baixo", min: -Infinity, max: 1.6 },
      { id: "medio", rotulo: "Médio", min: 1.6, max: 3.0 },
      { id: "alto", rotulo: "Alto", min: 3.0, max: Infinity }
    ]
  },

  fertilizantes: {
    ureia: { nome: "Ureia", n: 0.45, p2o5: 0, k2o: 0 },
    map: { nome: "MAP", n: 0.11, p2o5: 0.52, k2o: 0 },
    kcl: { nome: "KCl", n: 0, p2o5: 0, k2o: 0.60 }
  },

  culturas: {
    milho: {
      nome: "Milho",
      ativosistema: true,
      alvoV: 70,
      mgMinimo: 8,
      produtividade: {
        baixa: { rotulo: "< 6 t/ha de grãos", tabela: "lt6" },
        media: { rotulo: "6 a 8 t/ha de grãos", tabela: "6a8" },
        alta: { rotulo: "8 a 10 t/ha de grãos", tabela: "8a10" }
      },
      tabelas: {
        p2o5: {
          lt6: { baixo: 90, medio: 60, alto: 30 },
          "6a8": { baixo: 100, medio: 70, alto: 40 },
          "8a10": { baixo: 120, medio: 90, alto: 60 }
        },
        k2o: {
          lt6: { baixo: 70, medio: 40, alto: 30 },
          "6a8": { baixo: 90, medio: 50, alto: 30 },
          "8a10": { baixo: 100, medio: 70, alto: 40 }
        },
        n: {
          lt6: { alta: 90, media_baixa: 60 },
          "6a8": { alta: 120, media_baixa: 90 },
          "8a10": { alta: 160, media_baixa: 120 }
        }
      },
      manejo: [
        "Aplicar parte do N na semeadura e o restante em cobertura.",
        "Evitar doses elevadas de N + K₂O no sulco de semeadura.",
        "Para milho safrinha após soja, normalmente usar classe de média/baixa resposta ao N."
      ]
    },

    soja: {
      nome: "Soja",
      ativosistema: true,
      alvoV: 70,
      mgMinimo: 8,
      produtividade: {
        baixa: { rotulo: "< 3,0 t/ha de grãos", tabela: "lt3" },
        media: { rotulo: "3,0 a 4,0 t/ha de grãos", tabela: "3a4" },
        alta: { rotulo: "4,0 a 5,0 t/ha de grãos", tabela: "4a5" }
      },
      tabelas: {
        p2o5: {
          lt3: { baixo: 120, medio: 80, alto: 30 },
          "3a4": { baixo: 140, medio: 100, alto: 40 },
          "4a5": { baixo: 160, medio: 120, alto: 60 }
        },
        k2o: {
          lt3: { baixo: 100, medio: 60, alto: 40 },
          "3a4": { baixo: 120, medio: 80, alto: 60 },
          "4a5": { baixo: 140, medio: 100, alto: 80 }
        },
        n: {
          lt3: { alta: 0, media_baixa: 0 },
          "3a4": { alta: 0, media_baixa: 0 },
          "4a5": { alta: 0, media_baixa: 0 }
        }
      },
      manejo: [
        "A fixação biológica de nitrogênio normalmente supre a demanda de N da soja.",
        "Inocular as sementes com Bradyrhizobium específico para soja.",
        "Evitar excesso de K₂O no sulco de semeadura para reduzir risco de efeito salino."
      ]
    },

    cana: { nome: "Cana-de-açúcar", ativosistema: false },
    cafe: { nome: "Café", ativosistema: false },
    laranja: { nome: "Laranja", ativosistema: false }
  }
};

let modoAtual = "analise";
let resultadoAtual = null;
let installPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

window.addEventListener("DOMContentLoaded", () => {
  configurarEventos();
  inicializarAuth();
  registrarServiceWorker();
  prepararInstalacaoPWA();
  renderHistorico();
  setModo("analise");
  atualizarCamposPorCultura();
});

function configurarEventos() {
  const startBtn = $("#startBtn");
  const form = $("#calcForm");

  startBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    $("#formSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  form?.addEventListener("submit", onCalcular);
  $("#clearBtn")?.addEventListener("click", limparFormulario);
  $("#saveBtn")?.addEventListener("click", salvarResultadoAtual);
  $("#pdfBtn")?.addEventListener("click", () => resultadoAtual && gerarPDF(resultadoAtual));
  $("#clearHistoryBtn")?.addEventListener("click", apagarHistorico);
  $("#cultura")?.addEventListener("change", atualizarCamposPorCultura);

  $$(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => setModo(btn.dataset.mode));
  });

  $("#installBtn")?.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("#installBtn").hidden = true;
  });
}

function setModo(modo) {
  modoAtual = modo === "estimado" ? "estimado" : "analise";

  $$(".mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === modoAtual);
    btn.setAttribute("aria-selected", btn.dataset.mode === modoAtual ? "true" : "false");
  });

  const analiseFields = $("#analiseFields");
  const estimadoFields = $("#estimadoFields");

  if (analiseFields) analiseFields.hidden = modoAtual !== "analise";
  if (estimadoFields) estimadoFields.hidden = modoAtual !== "estimado";

  // Evita que campos escondidos interfiram em validação futura.
  $$("#analiseFields input, #analiseFields select").forEach((el) => {
    el.disabled = modoAtual !== "analise";
  });
  $$("#estimadoFields input, #estimadoFields select").forEach((el) => {
    el.disabled = modoAtual !== "estimado";
  });

  atualizarProgresso();
}

function atualizarProgresso() {
  const spans = $$(".progress span");
  spans.forEach((span, index) => {
    span.classList.toggle("active", index <= (modoAtual === "analise" ? 1 : 2));
  });
}

function atualizarCamposPorCultura() {
  const cultura = $("#cultura")?.value || "milho";
  const wrap = $("#respostaNWrap");
  const respostaN = $("#respostaN");
  if (!wrap || !respostaN) return;

  const soja = cultura === "soja";
  wrap.style.opacity = soja ? "0.55" : "1";
  respostaN.disabled = soja;
}

function onCalcular(event) {
  event.preventDefault();

  try {
    const input = coletarInput();
    resultadoAtual = calcularRecomendacao(input);
    renderResultado(resultadoAtual);

    const resultSection = $("#resultSection");
    resultSection.hidden = false;
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    alert(error.message || "Erro ao calcular recomendação.");
  }
}

function coletarInput() {
  const cultura = $("#cultura").value;
  const tipoSolo = modoAtual === "analise" ? $("#tipoSoloAnalise").value : $("#tipoSoloEstimado").value;

  return {
    talhao: $("#talhao").value.trim(),
    cultura,
    produtividade: $("#produtividade").value,
    respostaN: $("#respostaN").value,
    modo: modoAtual,
    tipoSolo,
    fertilidade: $("#fertilidade")?.value || "media",
    dadosSolo: {
      ph: $("#ph")?.value,
      mo: $("#mo")?.value,
      p: $("#p")?.value,
      k: $("#k")?.value,
      ca: $("#ca")?.value,
      mg: $("#mg")?.value,
      hal: $("#hal")?.value,
      v: $("#v")?.value,
      prnt: $("#prnt")?.value,
      tipoSolo,
      argila: $("#argila")?.value,
      vSubsolo: $("#vSubsolo")?.value
    }
  };
}

function numero(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function arredondar(valor, casas = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return null;
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function classePorFaixa(valor, faixas) {
  if (valor === null || valor === undefined) return "medio";
  const item = faixas.find((faixa) => valor >= faixa.min && valor < faixa.max);
  return item?.id || "medio";
}

function classeEstimativaPorFertilidade(fertilidade) {
  if (fertilidade === "baixa") return "baixo";
  if (fertilidade === "alta") return "alto";
  return "medio";
}

function fertilidadePorTipoSolo(tipoSolo) {
  if (tipoSolo === "arenoso") return "baixa";
  if (tipoSolo === "argiloso") return "media";
  return "media";
}

function estimarCalcarioSemAnalise(fertilidade) {
  const tabela = { baixa: 2.0, media: 1.0, alta: 0.0 };
  return tabela[fertilidade] ?? 1.0;
}

function estimarGessoPorTextura(tipoSolo) {
  const tabela = { arenoso: 1.0, medio: 1.5, argiloso: 2.0 };
  return tabela[tipoSolo] ?? 1.5;
}

function calcularCTCeV(dadosSolo) {
  const ca = numero(dadosSolo.ca);
  const mg = numero(dadosSolo.mg);
  const k = numero(dadosSolo.k);
  const hal = numero(dadosSolo.hal);
  const vInformado = numero(dadosSolo.v);

  if ([ca, mg, k, hal].some((x) => x === null)) {
    return { sb: null, ctc: null, vAtual: vInformado };
  }

  const sb = ca + mg + k;
  const ctc = sb + hal;
  const vCalculado = ctc > 0 ? (sb / ctc) * 100 : null;

  return {
    sb: arredondar(sb, 2),
    ctc: arredondar(ctc, 2),
    vAtual: vInformado ?? arredondar(vCalculado, 1)
  };
}

function calcularCalcario({ culturaConfig, dadosSolo, modo }) {
  if (modo === "estimado") {
    const dose = estimarCalcarioSemAnalise(dadosSolo.fertilidade);
    return {
      dose: arredondar(dose, 1),
      metodo: "Estimativa didática sem análise de solo"
    };
  }

  const { ctc, vAtual } = calcularCTCeV(dadosSolo);
  const prnt = numero(dadosSolo.prnt) || 80;
  const alvoV = culturaConfig.alvoV || 70;

  if (ctc === null || vAtual === null) {
    return { dose: null, metodo: "Dados insuficientes para cálculo por saturação por bases" };
  }

  const nc = Math.max(0, (ctc * (alvoV - vAtual)) / (10 * prnt));
  return {
    dose: arredondar(nc, 2),
    metodo: `Saturação por bases: alvo V% ${alvoV}, PRNT ${prnt}%`
  };
}

function calcularGesso({ dadosSolo, modo }) {
  const tipoSolo = dadosSolo.tipoSolo || "medio";
  const argila = numero(dadosSolo.argila);
  const vSubsolo = numero(dadosSolo.vSubsolo);

  if (modo === "analise" && argila !== null && vSubsolo !== null) {
    if (vSubsolo < 40) {
      return {
        dose: arredondar((argila * 6) / 1000, 2),
        metodo: "Cálculo por argila informada e V% de subsolo inferior a 40%"
      };
    }
    return {
      dose: 0,
      metodo: "V% de subsolo informado não indicou necessidade pelo critério simplificado do sistema"
    };
  }

  return {
    dose: arredondar(estimarGessoPorTextura(tipoSolo), 1),
    metodo: "Estimativa didática por textura. Para decisão real, informar análise de subsolo."
  };
}

function converterFertilizantes({ n, p2o5, k2o }) {
  const fert = BOLETIM100.fertilizantes;

  const map = p2o5 > 0 ? p2o5 / fert.map.p2o5 : 0;
  const nFornecidoMap = map * fert.map.n;
  const nComplementar = Math.max(0, n - nFornecidoMap);
  const ureia = nComplementar > 0 ? nComplementar / fert.ureia.n : 0;
  const kcl = k2o > 0 ? k2o / fert.kcl.k2o : 0;

  return {
    map: arredondar(map, 1),
    ureia: arredondar(ureia, 1),
    kcl: arredondar(kcl, 1),
    nFornecidoMap: arredondar(nFornecidoMap, 1),
    observacao: "Conversão simples: MAP para P₂O₅, KCl para K₂O e ureia apenas para complementar N."
  };
}

function calcularRecomendacao(input) {
  const culturaConfig = BOLETIM100.culturas[input.cultura];
  if (!culturaConfig || !culturaConfig.ativosistema) {
    throw new Error("Cultura ainda não ativa no sistema.");
  }

  const warnings = [];
  const produtividade = input.produtividade || "media";
  const produtividadeConfig = culturaConfig.produtividade[produtividade] || culturaConfig.produtividade.media;
  const linha = produtividadeConfig.tabela;
  const modo = input.modo || "analise";

  let classeP = "medio";
  let classeK = "medio";
  let dadosSolo = { ...input.dadosSolo };

  if (modo === "analise") {
    const p = numero(dadosSolo.p);
    const k = numero(dadosSolo.k);
    classeP = classePorFaixa(p, BOLETIM100.classesSolo.fosforoResina);
    classeK = classePorFaixa(k, BOLETIM100.classesSolo.potassioTrocavel);

    if (p === null || k === null) {
      warnings.push("P e K não foram totalmente informados. O sistema usou classe média como fallback onde faltou dado.");
    }
  } else {
    const fertilidade = input.fertilidade || fertilidadePorTipoSolo(input.tipoSolo);
    classeP = classeEstimativaPorFertilidade(fertilidade);
    classeK = classeEstimativaPorFertilidade(fertilidade);
    dadosSolo = { ...dadosSolo, fertilidade, tipoSolo: input.tipoSolo };
    warnings.push("Resultado sem análise de solo é estimativo e serve apenas para simulação. Para recomendação real, use análise de solo.");
  }

  const respostaN = input.cultura === "milho" ? (input.respostaN || "media_baixa") : "media_baixa";

  const n = culturaConfig.tabelas.n[linha]?.[respostaN] ?? 0;
  const p2o5 = culturaConfig.tabelas.p2o5[linha]?.[classeP] ?? 0;
  const k2o = culturaConfig.tabelas.k2o[linha]?.[classeK] ?? 0;
  const calcario = calcularCalcario({ culturaConfig, dadosSolo, modo });
  const gesso = calcularGesso({ dadosSolo, modo });
  const fertilizantes = converterFertilizantes({ n, p2o5, k2o });
  const solo = calcularCTCeV(dadosSolo);

  const mg = numero(dadosSolo.mg);
  if (modo === "analise" && mg !== null && mg < culturaConfig.mgMinimo) {
    warnings.push(`Teor de Mg abaixo de ${culturaConfig.mgMinimo} mmolc/dm³. Avaliar uso de calcário magnesiano/dolomítico.`);
  }

  if (input.cultura === "soja") {
    warnings.push("Para soja, o sistema mantém N mineral igual a zero e destaca a importância da inoculação.");
  }

  warnings.push("Este sistema não substitui recomendação de engenheiro agrônomo nem validação completa das tabelas do Boletim 100.");

  return {
    id: globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : String(Date.now()),
    criadoEm: new Date().toISOString(),
    talhao: input.talhao || "Sem identificação",
    cultura: input.cultura,
    culturaNome: culturaConfig.nome,
    produtividade,
    produtividadeRotulo: produtividadeConfig.rotulo,
    modo,
    classes: { p: classeP, k: classeK },
    solo,
    recomendacao: {
      n: arredondar(n, 1),
      p2o5: arredondar(p2o5, 1),
      k2o: arredondar(k2o, 1),
      calcario: calcario.dose,
      gesso: gesso.dose
    },
    metodos: {
      calcario: calcario.metodo,
      gesso: gesso.metodo
    },
    fertilizantes,
    manejo: culturaConfig.manejo,
    warnings
  };
}

function renderResultado(resultado) {
  $("#resultHeading").textContent = `${resultado.culturaNome} — ${resultado.produtividadeRotulo}`;
  $("#dashboard").innerHTML = gerarCards(resultado);
  $("#iaText").innerHTML = gerarExplicacaoTecnica(resultado);
  $("#warningsList").innerHTML = resultado.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
}

function gerarCards(resultado) {
  const r = resultado.recomendacao;
  const f = resultado.fertilizantes;
  const cards = [
    { label: "Nitrogênio", valor: r.n, unidade: "kg/ha de N", max: 220 },
    { label: "Fósforo", valor: r.p2o5, unidade: "kg/ha de P₂O₅", max: 180 },
    { label: "Potássio", valor: r.k2o, unidade: "kg/ha de K₂O", max: 180 },
    { label: "Calcário", valor: r.calcario, unidade: "t/ha", max: 5 },
    { label: "Gesso", valor: r.gesso, unidade: "t/ha", max: 4 },
    { label: "MAP", valor: f.map, unidade: "kg/ha", max: 350 },
    { label: "Ureia", valor: f.ureia, unidade: "kg/ha", max: 400 },
    { label: "KCl", valor: f.kcl, unidade: "kg/ha", max: 300 },
    { label: "N via MAP", valor: f.nFornecidoMap, unidade: "kg/ha", max: 60 }
  ];

  return cards.map((card) => metricCard(card)).join("");
}

function metricCard({ label, valor, unidade, max }) {
  const numeroCard = valor ?? 0;
  const width = Math.max(0, Math.min(100, (numeroCard / max) * 100));
  const texto = valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR");

  return `
    <article class="metric-card">
      <small>${label}</small>
      <div>
        <div class="metric-value">${texto}</div>
        <div class="metric-unit">${unidade}</div>
      </div>
      <div class="bar-wrap" aria-hidden="true"><span class="bar-fill" style="--w:${width}%"></span></div>
    </article>
  `;
}

function gerarExplicacaoTecnica(resultado) {
  const r = resultado.recomendacao;
  const classeP = traduzirClasse(resultado.classes.p);
  const classeK = traduzirClasse(resultado.classes.k);
  const modo = resultado.modo === "analise" ? "com análise de solo" : "sem análise de solo";

  const paragrafos = [];

  paragrafos.push(
    `A recomendação foi calculada para ${resultado.culturaNome}, no modo ${modo}, considerando produtividade esperada ${resultado.produtividadeRotulo}. O resultado é apresentado apenas por hectare.`
  );

  paragrafos.push(
    `O fósforo foi classificado como ${classeP}, resultando em ${formatar(r.p2o5)} kg/ha de P₂O₅. O potássio foi classificado como ${classeK}, resultando em ${formatar(r.k2o)} kg/ha de K₂O.`
  );

  if (resultado.cultura === "milho") {
    paragrafos.push(
      `Para o milho, o nitrogênio depende da produtividade esperada e da classe de resposta da área. O sistema calculou ${formatar(r.n)} kg/ha de N.`
    );
  } else if (resultado.cultura === "soja") {
    paragrafos.push(
      "Para soja, a recomendação mineral de N foi mantida em zero, pois a cultura depende principalmente da fixação biológica de nitrogênio quando bem inoculada."
    );
  }

  paragrafos.push(
    `A calagem resultou em ${formatar(r.calcario, "t/ha")}. Método usado: ${resultado.metodos.calcario}.`
  );

  paragrafos.push(
    `A gessagem resultou em ${formatar(r.gesso, "t/ha")}. Método usado: ${resultado.metodos.gesso}. A decisão real de gessagem deve considerar análise da camada subsuperficial.`
  );

  paragrafos.push(
    "A conversão comercial usa MAP como fonte de P₂O₅, KCl como fonte de K₂O e ureia apenas para complementar o N não fornecido pelo MAP. Essa conversão é operacional e não substitui o ajuste técnico de formulações comerciais."
  );

  return paragrafos.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

function traduzirClasse(classe) {
  const mapa = { baixo: "baixo", medio: "médio", alto: "alto" };
  return mapa[classe] || "médio";
}

function formatar(valor, unidade = "kg/ha") {
  if (valor === null || valor === undefined) return "não calculado";
  return `${Number(valor).toLocaleString("pt-BR")} ${unidade}`;
}

function salvarResultadoAtual() {
  if (!resultadoAtual) return;
  salvarNoHistorico(resultadoAtual);
  renderHistorico();
  alert("Resultado salvo no histórico local.");
}

function chaveHistorico() {
  return "fertiliguia_historico_v1";
}

function listarHistorico() {
  try {
    return JSON.parse(localStorage.getItem(chaveHistorico()) || "[]");
  } catch {
    return [];
  }
}

function salvarNoHistorico(resultado) {
  const lista = listarHistorico().filter((item) => item.id !== resultado.id);
  lista.unshift(resultado);
  localStorage.setItem(chaveHistorico(), JSON.stringify(lista.slice(0, 20)));
}

function removerDoHistorico(id) {
  const lista = listarHistorico().filter((item) => item.id !== id);
  localStorage.setItem(chaveHistorico(), JSON.stringify(lista));
}

function limparHistorico() {
  localStorage.removeItem(chaveHistorico());
}

function renderHistorico() {
  const lista = listarHistorico();
  const container = $("#historyList");
  if (!container) return;

  if (!lista.length) {
    container.innerHTML = `<div class="history-empty">Nenhum cálculo salvo ainda.</div>`;
    return;
  }

  container.innerHTML = lista.map((item) => `
    <article class="history-item">
      <div>
        <strong>${escapeHtml(item.talhao)} • ${escapeHtml(item.culturaNome)}</strong>
        <span>${new Date(item.criadoEm).toLocaleString("pt-BR")} — N ${item.recomendacao.n} | P₂O₅ ${item.recomendacao.p2o5} | K₂O ${item.recomendacao.k2o}</span>
      </div>
      <div class="history-buttons">
        <button class="secondary" type="button" data-load="${item.id}">Abrir</button>
        <button class="ghost danger" type="button" data-remove="${item.id}">Excluir</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-load]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = listarHistorico().find((x) => x.id === btn.dataset.load);
      if (!item) return;
      resultadoAtual = item;
      renderResultado(item);
      $("#resultSection").hidden = false;
      $("#resultSection").scrollIntoView({ behavior: "smooth" });
    });
  });

  container.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removerDoHistorico(btn.dataset.remove);
      renderHistorico();
    });
  });
}

function apagarHistorico() {
  if (!confirm("Apagar todo o histórico local?")) return;
  limparHistorico();
  renderHistorico();
}

function limparFormulario() {
  $("#calcForm").reset();
  resultadoAtual = null;
  setModo("analise");
  atualizarCamposPorCultura();
  $("#resultSection").hidden = true;
}

function gerarPDF(resultado) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    alert("jsPDF ainda não carregou. Abra online na primeira vez ou tente novamente em alguns segundos.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FertiliGuia", margin, y);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  y += 8;
  doc.text("Relatório técnico de recomendação de adubação", margin, y);

  y += 10;
  linhaPDF(doc, y);
  y += 8;

  y = blocoPDF(doc, "Identificação", [
    ["Talhão", resultado.talhao],
    ["Cultura", resultado.culturaNome],
    ["Produtividade esperada", resultado.produtividadeRotulo],
    ["Modo", resultado.modo === "analise" ? "Com análise de solo" : "Sem análise de solo"],
    ["Data", new Date(resultado.criadoEm).toLocaleString("pt-BR")]
  ], y);

  y = blocoPDF(doc, "Recomendação por hectare", [
    ["N", kg(resultado.recomendacao.n)],
    ["P₂O₅", kg(resultado.recomendacao.p2o5)],
    ["K₂O", kg(resultado.recomendacao.k2o)],
    ["Calcário", ton(resultado.recomendacao.calcario)],
    ["Gesso", ton(resultado.recomendacao.gesso)]
  ], y + 4);

  y = blocoPDF(doc, "Fertilizantes comerciais", [
    ["MAP", kg(resultado.fertilizantes.map)],
    ["Ureia", kg(resultado.fertilizantes.ureia)],
    ["KCl", kg(resultado.fertilizantes.kcl)],
    ["N fornecido pelo MAP", kg(resultado.fertilizantes.nFornecidoMap)]
  ], y + 4);

  y = blocoPDF(doc, "Classes interpretadas", [
    ["Fósforo", classePDF(resultado.classes.p)],
    ["Potássio", classePDF(resultado.classes.k)],
    ["CTC", resultado.solo.ctc ?? "Não calculado"],
    ["V%", resultado.solo.vAtual ?? "Não calculado"]
  ], y + 4);

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Avisos", margin, y);
  doc.setFont("helvetica", "normal");
  y += 7;
  resultado.warnings.forEach((w) => {
    const linhas = doc.splitTextToSize(`• ${w}`, 180);
    doc.text(linhas, margin, y);
    y += linhas.length * 5 + 2;
  });

  y = Math.max(y + 6, 265);
  linhaPDF(doc, y);
  y += 6;
  doc.setFontSize(9);
  doc.text("Não substitui avaliação de engenheiro agrônomo.", margin, y);

  const nome = `fertiliguia-${resultado.cultura}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
}

function blocoPDF(doc, titulo, linhas, y) {
  const margin = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(titulo, margin, y);
  y += 7;
  doc.setFontSize(10.5);

  linhas.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), margin + 52, y);
    y += 6;
  });
  return y;
}

function linhaPDF(doc, y) {
  doc.setDrawColor(210, 225, 210);
  doc.line(14, y, 196, y);
}

function kg(v) { return v === null || v === undefined ? "Não calculado" : `${v} kg/ha`; }
function ton(v) { return v === null || v === undefined ? "Não calculado" : `${v} t/ha`; }
function classePDF(v) { return ({ baixo: "Baixo", medio: "Médio", alto: "Alto" }[v] || "Médio"); }

function inicializarAuth() {
  const loginBtn = $("#loginBtn");
  const logoutBtn = $("#logoutBtn");
  const userBadge = $("#userBadge");

  const firebaseConfig = {
    apiKey: "COLE_AQUI_API_KEY",
    authDomain: "COLE_AQUI_AUTH_DOMAIN",
    projectId: "COLE_AQUI_PROJECT_ID",
    appId: "COLE_AQUI_APP_ID"
  };

  const configValida = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("COLE_AQUI");

  const setVisitante = () => {
    if (userBadge) userBadge.textContent = "Visitante";
    if (loginBtn) loginBtn.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
  };

  if (!loginBtn || !logoutBtn || !userBadge) return;

  if (!window.firebase || !configValida) {
    loginBtn.addEventListener("click", () => {
      alert("Para ativar o login Google, preencha a configuração do Firebase em app.js e autorize o domínio no Firebase Console.");
    });
    logoutBtn.addEventListener("click", setVisitante);
    setVisitante();
    return;
  }

  const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
  const auth = app.auth();
  const provider = new window.firebase.auth.GoogleAuthProvider();

  loginBtn.addEventListener("click", async () => {
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      alert(`Falha no login: ${error.message}`);
    }
  });

  logoutBtn.addEventListener("click", () => auth.signOut());

  auth.onAuthStateChanged((user) => {
    if (!user) {
      setVisitante();
      return;
    }
    userBadge.textContent = user.displayName || user.email || "Usuário Google";
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
  });
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!["http:", "https:"].includes(location.protocol)) return;

  try {
    const reg = await navigator.serviceWorker.register("./service-worker.js");
    reg.update?.();
  } catch (error) {
    console.warn("Service worker não registrado", error);
  }
}

function prepararInstalacaoPWA() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    const installBtn = $("#installBtn");
    if (installBtn) installBtn.hidden = false;
  });
}

function escapeHtml(texto) {
  return String(texto).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  }[char]));
}
