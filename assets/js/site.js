/* =========================================================================
   E-commerce Company — comportamento do site
   Sem dependências externas. Roda em qualquer hospedagem estática.
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ECC || {};

  /* ---------------------------------------------------- links do WhatsApp */

  function urlZap(mensagem) {
    var texto = mensagem || cfg.mensagemZap || "";
    return "https://wa.me/" + (cfg.whatsapp || "") +
           "?text=" + encodeURIComponent(texto);
  }

  document.querySelectorAll("[data-zap]").forEach(function (el) {
    el.href = urlZap(el.getAttribute("data-zap-msg"));
    el.target = "_blank";
    el.rel = "noopener";
  });

  document.querySelectorAll("[data-email]").forEach(function (el) {
    el.href = "mailto:" + (cfg.email || "");
    if (!el.textContent.trim()) el.textContent = cfg.email || "";
  });

  document.querySelectorAll("[data-preenche]").forEach(function (el) {
    var valor = cfg[el.getAttribute("data-preenche")];
    if (valor) el.textContent = valor;
  });

  /* Esconde ícone de rede social sem link configurado */
  document.querySelectorAll("[data-rede]").forEach(function (el) {
    var url = cfg[el.getAttribute("data-rede")];
    if (url) { el.href = url; } else { el.remove(); }
  });

  /* --------------------------------------------------------- menu mobile */

  var toggle = document.querySelector(".nav__toggle");
  var links  = document.querySelector(".nav__links");

  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var aberto = links.getAttribute("data-aberto") === "sim";
      links.setAttribute("data-aberto", aberto ? "nao" : "sim");
      toggle.setAttribute("aria-expanded", String(!aberto));
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.setAttribute("data-aberto", "nao");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ------------------------------------------------- borda da nav ao rolar */

  var nav = document.querySelector(".nav");
  if (nav) {
    var aoRolar = function () {
      nav.setAttribute("data-rolado", window.scrollY > 12 ? "sim" : "nao");
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
  }

  /* ------------------------------------------------------ vídeos sob demanda
     O <video> usa preload="none": o arquivo só é baixado quando a pessoa
     clica no play. Mantém a página leve mesmo com 3 depoimentos. */

  document.querySelectorAll(".video-card__play").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var video = botao.parentElement.querySelector("video");
      if (!video) return;
      video.setAttribute("controls", "");
      video.play();
      botao.hidden = true;
      /* pausa os outros depoimentos */
      document.querySelectorAll(".video-card video").forEach(function (outro) {
        if (outro !== video) outro.pause();
      });
    });
  });

  /* ------------------------------------------------- animação de entrada */

  var alvos = document.querySelectorAll(".aparece");
  if (alvos.length && "IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-visivel", "sim");
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    alvos.forEach(function (el) { obs.observe(el); });
  } else {
    alvos.forEach(function (el) { el.setAttribute("data-visivel", "sim"); });
  }

  /* --------------------------------------------- máscara de telefone (BR) */

  var tel = document.querySelector('input[name="whatsapp"]');
  if (tel) {
    tel.addEventListener("input", function () {
      var d = tel.value.replace(/\D/g, "").slice(0, 11);
      if (d.length <= 2)       tel.value = d;
      else if (d.length <= 6)  tel.value = "(" + d.slice(0, 2) + ") " + d.slice(2);
      else if (d.length <= 10) tel.value = "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
      else                     tel.value = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    });
  }

  /* ------------------------------------------------------- envio do form */

  var form = document.querySelector("#form-diagnostico");
  if (!form) return;

  var status = form.querySelector(".form-status");
  var botao  = form.querySelector('button[type="submit"]');
  var rotulo = botao ? botao.textContent : "";

  function erro(msg) {
    if (!status) return;
    status.textContent = msg;
    status.setAttribute("data-tipo", "erro");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (status) status.removeAttribute("data-tipo");

    var dados = Object.fromEntries(new FormData(form).entries());

    /* honeypot anti-spam: bot preenche, humano não vê */
    if (dados.empresa_site) return;
    delete dados.empresa_site;

    dados.origem  = window.location.href;
    dados.enviado = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    /* Sem endpoint configurado: manda pro WhatsApp com tudo preenchido */
    if (!cfg.formEndpoint) {
      var texto =
        "*Novo contato pelo site*\n\n" +
        "Nome: " + (dados.nome || "-") + "\n" +
        "WhatsApp: " + (dados.whatsapp || "-") + "\n" +
        "E-mail: " + (dados.email || "-") + "\n" +
        "Loja: " + (dados.loja || "-") + "\n" +
        "Faturamento/mês: " + (dados.faturamento || "-") + "\n" +
        "Plataforma: " + (dados.plataforma || "-") + "\n" +
        "Desafio: " + (dados.desafio || "-");
      window.location.href = urlZap(texto);
      return;
    }

    if (botao) { botao.disabled = true; botao.textContent = "Enviando…"; }

    fetch(cfg.formEndpoint, {
      method: "POST",
      /* text/plain evita o preflight CORS do Apps Script */
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        window.location.href = "/obrigado.html";
      })
      .catch(function () {
        if (botao) { botao.disabled = false; botao.textContent = rotulo; }
        erro("Não consegui enviar agora. Chama no WhatsApp que eu respondo direto: " +
             "clique no botão verde no canto da tela.");
      });
  });
})();
