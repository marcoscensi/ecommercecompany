/* =========================================================================
   /black-friday/ — Operação Black Friday (venda pela Kiwify)
   Botões de compra, contagem regressiva e barra fixa no celular.
   ========================================================================= */

(function () {
  "use strict";

  var cfg = window.ECC || {};

  /* ------------------------------------------------------ checkout
     Todo elemento com [data-checkout] vira link pro checkout da Kiwify,
     levando as UTMs do anúncio junto (a Kiwify registra utm_* na venda). */
  var botoes = document.querySelectorAll("[data-checkout]");
  var link = cfg.checkoutBlackFriday;

  function urlCheckout() {
    var url = new URL(link);
    var u = window.ECC_utms ? window.ECC_utms() : {};
    Object.keys(u).forEach(function (k) { if (u[k]) url.searchParams.set(k, u[k]); });
    return url.toString();
  }

  botoes.forEach(function (el) {
    if (!link) {
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("data-em-breve", "sim");
      el.addEventListener("click", function (e) { e.preventDefault(); });
      return;
    }
    el.href = urlCheckout();
    el.addEventListener("click", function () {
      if (window.fbq) fbq("track", "InitiateCheckout", {
        content_name: "operacao-black-friday",
        value: Number(cfg.precoBlackFriday) || 47,
        currency: "BRL"
      });
      if (window.gtag && cfg.ga4) gtag("event", "begin_checkout", {
        currency: "BRL",
        value: Number(cfg.precoBlackFriday) || 47,
        items: [{ item_name: "Operação Black Friday" }]
      });
    });
  });

  /* ------------------------------------------------ contagem regressiva
     Black Friday 2026: sexta, 27/11, 00h de Brasília.                   */
  var alvo = new Date("2026-11-27T00:00:00-03:00").getTime();
  var dias = document.querySelectorAll("[data-faltam]");

  function atualiza() {
    var ms = alvo - Date.now();
    var d = Math.ceil(ms / 86400000);
    var texto = d > 1 ? "Faltam " + d + " dias para a Black Friday"
              : d === 1 ? "A Black Friday é amanhã"
              : "A Black Friday chegou";
    dias.forEach(function (el) { el.textContent = texto; });
  }
  if (dias.length) { atualiza(); setInterval(atualiza, 60000); }

  /* ------------------------------------------------ barra fixa (celular)
     Aparece depois que o botão do topo sai da tela e some quando a
     oferta final está visível, pra não ter dois botões iguais juntos.   */
  var barra = document.querySelector(".bf-barra");
  var heroCta = document.querySelector(".bf-hero [data-checkout]");
  var oferta = document.getElementById("oferta");

  if (barra && heroCta && "IntersectionObserver" in window) {
    var passouHero = false, vendoOferta = false;
    var decide = function () {
      barra.setAttribute("data-visivel", passouHero && !vendoOferta ? "sim" : "nao");
    };
    new IntersectionObserver(function (e) {
      passouHero = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      decide();
    }).observe(heroCta);
    if (oferta) new IntersectionObserver(function (e) {
      vendoOferta = e[0].isIntersecting;
      decide();
    }, { threshold: 0.25 }).observe(oferta);
  }
})();
