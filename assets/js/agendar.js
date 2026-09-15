/* =========================================================================
   Página /agendar/ — escolhe horário e cria a reunião via Apps Script
   -------------------------------------------------------------------------
   Eventos de rastreamento:
     ViewContent (Pixel) / view_agendamento (GA4)  -> abriu a página
     Schedule    (Pixel) / schedule (GA4)           -> reunião confirmada
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ECC || {};
  var q = new URLSearchParams(window.location.search);

  var elDias = document.getElementById("dias");
  var elHoras = document.getElementById("horas");
  var elStatus = document.getElementById("status");
  var elErro = document.getElementById("erro");
  var form = document.getElementById("form-agenda");
  var botao = form.querySelector('button[type="submit"]');

  var dias = [];
  var escolhido = null;   // { inicio, rotulo }

  /* ------------------------------------------------------------ telas */

  function tela(nome) {
    document.querySelectorAll("[data-tela]").forEach(function (t) {
      t.setAttribute("data-ativa", t.getAttribute("data-tela") === nome ? "sim" : "nao");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function status(html) {
    elStatus.innerHTML = html || "";
    elStatus.style.display = html ? "" : "none";
  }

  /* ------------------------------------------------------ rastreamento */

  if (window.fbq) fbq("track", "ViewContent", { content_name: "agendamento" });
  if (window.gtag && cfg.ga4) gtag("event", "view_agendamento");

  /* ------------------------------------------ pré-preenche pelo /diagnostico */

  ["nome", "whatsapp", "loja", "email"].forEach(function (k) {
    var v = q.get(k);
    if (v && form.elements[k]) form.elements[k].value = v;
  });

  /* ------------------------------------------------- carrega horários */

  if (!cfg.agendaEndpoint) {
    status("Agenda ainda não configurada. Chama no WhatsApp pelo botão verde que a gente marca por lá.");
    return;
  }

  fetch(cfg.agendaEndpoint + "?acao=horarios&_=" + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.ok) throw new Error(d.erro || "erro");
      dias = d.dias || [];
      status("");
      if (!dias.length) {
        elHoras.innerHTML = '<p class="vazio">Não tem horário aberto nos próximos dias. Me chama no WhatsApp (botão verde) que a gente encaixa.</p>';
        return;
      }
      desenhaDias();
      selecionaDia(0);
    })
    .catch(function () {
      status("Não consegui carregar a agenda agora. Tenta de novo em instantes ou chama no WhatsApp pelo botão verde.");
    });

  function desenhaDias() {
    elDias.innerHTML = "";
    dias.forEach(function (d, i) {
      var partes = d.rotulo.split(", ");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dia";
      b.innerHTML = "<small>" + partes[0] + "</small>" + partes[1];
      b.addEventListener("click", function () { selecionaDia(i); });
      elDias.appendChild(b);
    });
  }

  function selecionaDia(i) {
    Array.prototype.forEach.call(elDias.children, function (b, j) {
      b.setAttribute("data-sel", j === i ? "sim" : "nao");
    });
    elHoras.innerHTML = "";
    dias[i].horarios.forEach(function (h) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "hora";
      b.textContent = h.hora;
      b.addEventListener("click", function () {
        escolhido = { inicio: h.inicio, rotulo: dias[i].rotulo + " às " + h.hora };
        document.getElementById("resumo-horario").textContent = escolhido.rotulo;
        tela("dados");
        setTimeout(function () { (form.elements.nome.value ? form.elements.email : form.elements.nome).focus(); }, 150);
      });
      elHoras.appendChild(b);
    });
  }

  document.getElementById("trocar").addEventListener("click", function () {
    escolhido = null;
    tela("horario");
  });

  /* ------------------------------------------------------- confirmar */

  function erro(msg) {
    elErro.textContent = msg || "";
    elErro.setAttribute("data-mostra", msg ? "sim" : "nao");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    erro("");

    var d = Object.fromEntries(new FormData(form).entries());
    if (!d.nome.trim()) return erro("Preencha seu nome.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) return erro("Digite um e-mail válido — é pra onde vai o convite.");
    if (d.whatsapp.replace(/\D/g, "").length < 10) return erro("Digite um WhatsApp válido com DDD.");
    if (!escolhido) return erro("Escolha um horário.");

    d.acao = "agendar";
    d.inicio = escolhido.inicio;
    d.faturamento = q.get("faturamento") || "";
    d.origem = window.location.href;
    if (window.ECC_utms) Object.assign(d, window.ECC_utms());

    botao.disabled = true;
    botao.textContent = "Confirmando…";

    fetch(cfg.agendaEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(d)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          if (res.erro === "horario_indisponivel") {
            erro("Esse horário acabou de ser ocupado. Escolhe outro, por favor.");
            escolhido = null;
            recarrega();
            return;
          }
          throw new Error(res.erro || "erro");
        }
        document.getElementById("ok-quando").textContent = res.rotulo || escolhido.rotulo;
        if (res.meet) {
          var a = document.getElementById("ok-meet");
          a.href = res.meet; a.hidden = false;
        }
        tela("ok");
        if (window.fbq) fbq("track", "Schedule", { content_name: "apresentacao" });
        if (window.gtag && cfg.ga4) gtag("event", "schedule", { origem: "agendar" });
      })
      .catch(function () {
        erro("Não consegui confirmar agora. Tenta de novo ou me chama no WhatsApp pelo botão verde.");
      })
      .then(function () {
        botao.disabled = false;
        botao.textContent = "Confirmar reunião";
      });
  });

  function recarrega() {
    tela("horario");
    status('<i></i> Atualizando horários…');
    elHoras.innerHTML = "";
    fetch(cfg.agendaEndpoint + "?acao=horarios&_=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (d) { dias = d.dias || []; status(""); desenhaDias(); if (dias.length) selecionaDia(0); });
  }
})();
