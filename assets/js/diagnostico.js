/* =========================================================================
   Página /diagnostico/ — formulário de qualificação em etapas
   -------------------------------------------------------------------------
   Substitui o formulário do Respondi. Mesmo fluxo, mesmas regras:
     - "Menos de 30 mil" de faturamento  -> desqualificado
     - "Não é o momento" de investir      -> desqualificado
     - qualificado -> /agendar/ (+ evento Lead no Pixel / generate_lead no GA4)
   Eventos: StartForm ao clicar em "Começar", Lead / LeadDesqualificado no fim.
   Cada resposta final (qualificado ou não) vira uma linha na planilha.
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ECC || {};
  var etapas = Array.prototype.slice.call(document.querySelectorAll(".etapa[data-etapa]"));
  var barra = document.getElementById("barra");
  /* ordem das telas por data-etapa: nome, loja, faturamento, investimento, WhatsApp.
     O WhatsApp ficou por último de propósito: pedir telefone cedo derrubava
     ~70% de quem começava. */
  var ordem = ["0", "1", "3", "4", "5", "2"];
  var atual = 0;
  var respostas = {};
  var enviado = false;
  var iniciou = false;

  /* ------------------------------------------------------------ helpers */

  function etapa(id) {
    return document.querySelector('.etapa[data-etapa="' + id + '"]');
  }

  function mostra(id) {
    etapas.forEach(function (e) { e.setAttribute("data-ativa", e.getAttribute("data-etapa") === id ? "sim" : "nao"); });
    var idx = ordem.indexOf(id);
    var pct = idx < 0 ? 100 : Math.round((idx / (ordem.length - 1)) * 100);
    if (barra) barra.style.width = pct + "%";
    window.scrollTo({ top: 0, behavior: "smooth" });

    var campo = etapa(id) && etapa(id).querySelector("input");
    if (campo) setTimeout(function () { campo.focus(); }, 120);
  }

  function nomeCurto() {
    var n = (respostas.nome || "").trim().split(/\s+/)[0] || "Você";
    return n.charAt(0).toUpperCase() + n.slice(1);
  }

  function atualizaNome() {
    document.querySelectorAll("[data-nome]").forEach(function (el) { el.textContent = nomeCurto(); });
  }

  function erro(sec, mostrar) {
    var el = sec.querySelector("[data-erro]");
    if (el) el.setAttribute("data-mostra", mostrar ? "sim" : "nao");
  }

  /* ---------------------------------------------------------- validação */

  function valida(sec) {
    var input = sec.querySelector("input");
    if (!input) return true;
    var v = input.value.trim();

    if (input.name === "whatsapp") {
      var d = v.replace(/\D/g, "");
      if (d.length < 10 || d.length > 11) return false;
      respostas.whatsapp = v;
      return true;
    }
    if (!v) return false;
    respostas[input.name] = v;
    return true;
  }

  /* --------------------------------------------------------- navegação */

  function avanca() {
    var sec = etapa(ordem[atual]);
    if (sec.querySelector("[data-campo]")) return;   /* telas de escolha só avançam clicando numa opção */
    if (!valida(sec)) { erro(sec, true); return; }
    erro(sec, false);
    if (ordem[atual] === "0") rastreiaInicio();
    if (ordem[atual] === "1") atualizaNome();
    if (atual === ordem.length - 1) return finaliza(true);   /* WhatsApp: última tela */
    atual += 1;
    mostra(ordem[atual]);
  }

  /* dispara uma vez, quando a pessoa sai da tela de boas-vindas */
  function rastreiaInicio() {
    if (iniciou) return;
    iniciou = true;
    if (window.fbq) fbq("trackCustom", "StartForm", { content_name: "diagnostico" });
    if (window.gtag && cfg.ga4) gtag("event", "start_form", { origem: "diagnostico" });
  }

  function volta() {
    if (atual > 0) { atual -= 1; mostra(ordem[atual]); }
  }

  function escolhe(botao) {
    var grupo = botao.closest("[data-campo]");
    respostas[grupo.getAttribute("data-campo")] = botao.getAttribute("data-valor");

    if (botao.hasAttribute("data-desqualifica")) return finaliza(false);

    atual += 1;
    mostra(ordem[atual]);
  }

  /* ------------------------------------------------------------- final */

  function finaliza(qualificado) {
    respostas.qualificado = qualificado;
    envia();
    rastreia(qualificado);
    mostra(qualificado ? "ok" : "nao");
    if (qualificado) redirecionaCalendly();
  }

  function urlAgenda() {
    if (!cfg.agendaEndpoint) return cfg.calendly || document.getElementById("btn-agenda").href;
    var p = new URLSearchParams({
      nome: respostas.nome || "", whatsapp: respostas.whatsapp || "",
      loja: respostas.loja || "", faturamento: respostas.faturamento || ""
    });
    return "/agendar/?" + p.toString();
  }

  function redirecionaCalendly() {
    var btn = document.getElementById("btn-agenda");
    var txt = document.getElementById("contagem");
    var url = urlAgenda();
    btn.href = url;
    var seg = 5;
    var tick = function () {
      if (txt) txt.textContent = "Abrindo a agenda em " + seg + "s…";
      if (seg <= 0) { window.location.href = url; return; }
      seg -= 1;
      setTimeout(tick, 1000);
    };
    tick();
  }

  function rastreia(qualificado) {
    if (window.fbq) {
      if (qualificado) fbq("track", "Lead", { content_name: "diagnostico" });
      else fbq("trackCustom", "LeadDesqualificado");
    }
    if (window.gtag && cfg.ga4) {
      gtag("event", qualificado ? "generate_lead" : "lead_desqualificado", { origem: "diagnostico" });
    }
  }

  function envia() {
    if (enviado || !cfg.formEndpoint) return;
    enviado = true;

    var dados = {
      nome: respostas.nome || "",
      whatsapp: respostas.whatsapp || "",
      email: "",
      loja: respostas.loja || "",
      faturamento: respostas.faturamento || "",
      plataforma: "",
      desafio: "[Página /diagnostico] " +
               (respostas.qualificado ? "✅ QUALIFICADO" : "❌ Desqualificado") +
               " · Investir R$ 3 mil/mês: " + (respostas.investimento || "não chegou nessa pergunta"),
      origem: window.location.href,
      enviado: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    };
    if (window.ECC_utms) Object.assign(dados, window.ECC_utms());

    /* keepalive: continua enviando mesmo se a pessoa sair pro Calendly */
    fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados),
      keepalive: true
    }).catch(function () {});
  }

  /* ------------------------------------------------------------ eventos */

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-avanca], [data-volta], .opcao");
    if (!t) return;
    if (t.hasAttribute("data-avanca")) avanca();
    else if (t.hasAttribute("data-volta")) volta();
    else if (t.classList.contains("opcao")) escolhe(t);
  });

  document.addEventListener("keydown", function (e) {
    var sec = etapa(ordem[atual]);
    if (!sec || sec.getAttribute("data-ativa") !== "sim") return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      avanca();
      return;
    }
    /* A, B, C… escolhem a opção nas telas de múltipla escolha */
    var opcoes = sec.querySelectorAll(".opcao");
    if (opcoes.length && /^[a-e]$/i.test(e.key)) {
      var i = e.key.toUpperCase().charCodeAt(0) - 65;
      if (opcoes[i]) escolhe(opcoes[i]);
    }
  });

  document.querySelectorAll(".etapa input").forEach(function (input) {
    input.addEventListener("input", function () { erro(input.closest(".etapa"), false); });
  });

  mostra("0");
})();
