/**
 * ============================================================================
 *  AGENDAMENTO DE REUNIÕES — backend da página /agendar/
 * ============================================================================
 *
 *  Este arquivo NÃO faz parte do site. É o código do Google Apps Script que
 *  lê sua agenda, devolve horários livres e cria a reunião com link do Meet.
 *
 *  Passo a passo completo no LEIA-ME.md, seção "Agendamento".
 *
 *  Resumo (logado como marcos.censi@ecommercecompany.com.br):
 *   1. Google Agenda → criar uma agenda nova chamada exatamente "Disponibilidade"
 *   2. https://script.google.com/create → apagar tudo, colar este arquivo, salvar
 *   3. No menu lateral "Serviços" (+) → Google Calendar API → Adicionar
 *   4. Implantar → Nova implantação → App da Web
 *        Executar como: Eu  ·  Quem tem acesso: Qualquer pessoa
 *   5. Copiar a URL do app da Web e colar em assets/js/config.js -> agendaEndpoint
 *
 *  Como abrir horários: crie blocos na agenda "Disponibilidade" (ex.: ter 10h-14h).
 *  A página oferece só o que está dentro desses blocos E livre na agenda principal.
 * ============================================================================
 */

var CFG = {
  agendaDisponibilidade: "Disponibilidade",   // nome exato da agenda secundária
  agendaPrincipal:       "primary",           // onde a reunião é criada e onde se lê o "ocupado"
  fuso:                  "America/Sao_Paulo",

  tituloEvento:          "Apresentação E-commerce Company",
  duracaoMin:            45,    // duração da reunião
  intervaloMin:          30,    // folga obrigatória antes e depois de outro compromisso
  passoMin:              30,    // horários oferecidos de 30 em 30 min (10:00, 10:30, ...)
  antecedenciaMinH:      4,     // não deixa marcar pra daqui a menos de 4 horas
  diasAFrente:           4,     // mostra hoje + 4 dias

  emailAviso:            "marcos.censi@ecommercecompany.com.br, marcosjr.ads@gmail.com",
  lembreteMin:           [1440, 60]   // lembretes do Google pro convidado: 1 dia e 1 hora antes
};


/* ============================================================ HTTP ====== */

function doGet(e) {
  try {
    var acao = (e && e.parameter && e.parameter.acao) || "";
    if (acao === "horarios") return resposta({ ok: true, fuso: CFG.fuso, duracao: CFG.duracaoMin, dias: horariosLivres() });
    return resposta({ ok: true, mensagem: "Agenda da E-commerce Company no ar." });
  } catch (erro) {
    console.error(erro);
    return resposta({ ok: false, erro: String(erro) });
  }
}

function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    if (dados.acao !== "agendar") return resposta({ ok: false, erro: "ação desconhecida" });
    return resposta(agendar(dados));
  } catch (erro) {
    console.error(erro);
    return resposta({ ok: false, erro: String(erro) });
  }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* ================================================== HORÁRIOS LIVRES ===== */

function horariosLivres() {
  var agora = new Date();
  var inicioJanela = new Date(agora.getTime() + CFG.antecedenciaMinH * 3600000);
  var fimJanela = new Date(agora);
  fimJanela.setDate(fimJanela.getDate() + CFG.diasAFrente + 1);
  fimJanela.setHours(0, 0, 0, 0);

  var disp = agendaPorNome(CFG.agendaDisponibilidade);
  if (!disp) throw new Error('Agenda "' + CFG.agendaDisponibilidade + '" não encontrada. Crie uma agenda com esse nome exato.');

  var blocos = disp.getEvents(agora, fimJanela).map(function (ev) {
    return { ini: ev.getStartTime(), fim: ev.getEndTime() };
  });

  var ocupados = ocupadosEntre(agora, fimJanela);

  var dur = CFG.duracaoMin * 60000;
  var folga = CFG.intervaloMin * 60000;
  var passo = CFG.passoMin * 60000;
  var porDia = {};

  blocos.forEach(function (b) {
    // primeiro início possível: arredonda pra cima no passo
    var t = Math.ceil(b.ini.getTime() / passo) * passo;
    for (; t + dur <= b.fim.getTime(); t += passo) {
      if (t < inicioJanela.getTime()) continue;

      var ini = t, fim = t + dur;
      var conflita = ocupados.some(function (o) {
        return ini < o.fim + folga && fim + folga > o.ini;
      });
      if (conflita) continue;

      var d = new Date(ini);
      var chave = Utilities.formatDate(d, CFG.fuso, "yyyy-MM-dd");
      if (!porDia[chave]) porDia[chave] = { data: chave, rotulo: rotuloDia(d), horarios: [] };
      porDia[chave].horarios.push({
        inicio: Utilities.formatDate(d, CFG.fuso, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        hora: Utilities.formatDate(d, CFG.fuso, "HH:mm")
      });
    }
  });

  return Object.keys(porDia).sort().map(function (k) {
    // remove duplicados (blocos sobrepostos) e ordena
    var vistos = {};
    porDia[k].horarios = porDia[k].horarios.filter(function (h) {
      if (vistos[h.inicio]) return false; vistos[h.inicio] = true; return true;
    }).sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
    return porDia[k];
  });
}

function ocupadosEntre(de, ate) {
  var principal = CalendarApp.getCalendarById(CFG.agendaPrincipal) || CalendarApp.getDefaultCalendar();
  return principal.getEvents(de, ate).filter(function (ev) {
    // dia inteiro sem horário e eventos marcados como "disponível" não bloqueiam
    if (ev.isAllDayEvent()) return false;
    if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return false;
    return true;
  }).map(function (ev) {
    return { ini: ev.getStartTime().getTime(), fim: ev.getEndTime().getTime() };
  });
}

function agendaPorNome(nome) {
  var lista = CalendarApp.getCalendarsByName(nome);
  return lista.length ? lista[0] : null;
}

function rotuloDia(d) {
  var semana = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var dia = parseInt(Utilities.formatDate(d, CFG.fuso, "d"), 10);
  var mes = parseInt(Utilities.formatDate(d, CFG.fuso, "M"), 10) - 1;
  var ds = parseInt(Utilities.formatDate(d, CFG.fuso, "u"), 10) % 7;   // 1=seg ... 7=dom
  return semana[ds] + ", " + dia + " " + meses[mes];
}


/* ========================================================== AGENDAR ===== */

function agendar(dados) {
  var inicio = new Date(dados.inicio);
  if (isNaN(inicio.getTime())) return { ok: false, erro: "horário inválido" };
  if (!dados.nome || !dados.email) return { ok: false, erro: "nome e e-mail são obrigatórios" };

  // confere se o horário ainda está livre (evita duas pessoas no mesmo slot)
  var livre = horariosLivres().some(function (dia) {
    return dia.horarios.some(function (h) { return new Date(h.inicio).getTime() === inicio.getTime(); });
  });
  if (!livre) return { ok: false, erro: "horario_indisponivel" };

  var fim = new Date(inicio.getTime() + CFG.duracaoMin * 60000);

  var descricao =
    "Reunião agendada pelo site ecommercecompany.com.br\n\n" +
    "Nome: "     + dados.nome + "\n" +
    "E-mail: "   + dados.email + "\n" +
    "WhatsApp: " + (dados.whatsapp || "-") + "\n" +
    "Loja: "     + (dados.loja || "-") + "\n" +
    (dados.faturamento ? "Faturamento: " + dados.faturamento + "\n" : "") +
    "\nOrigem: "  + (dados.origem || "-") +
    (dados.utm_source ? "\nUTM: " + [dados.utm_source, dados.utm_medium, dados.utm_campaign, dados.utm_content].filter(Boolean).join(" / ") : "");

  var evento = {
    summary: CFG.tituloEvento + " — " + dados.nome,
    description: descricao,
    start: { dateTime: inicio.toISOString(), timeZone: CFG.fuso },
    end:   { dateTime: fim.toISOString(),    timeZone: CFG.fuso },
    attendees: [{ email: dados.email, displayName: dados.nome }],
    conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
    reminders: { useDefault: false, overrides: CFG.lembreteMin.map(function (m) { return { method: "email", minutes: m }; }).concat([{ method: "popup", minutes: 15 }]) },
    guestsCanModify: false,
    guestsCanInviteOthers: false
  };

  // Advanced Calendar service (ativar em "Serviços" → Google Calendar API)
  var criado = Calendar.Events.insert(evento, CFG.agendaPrincipal, { conferenceDataVersion: 1, sendUpdates: "all" });

  var meet = criado.hangoutLink || (criado.conferenceData && criado.conferenceData.entryPoints && criado.conferenceData.entryPoints[0].uri) || "";

  avisaPorEmail(dados, inicio, meet);

  return {
    ok: true,
    inicio: Utilities.formatDate(inicio, CFG.fuso, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    rotulo: rotuloDia(inicio) + " às " + Utilities.formatDate(inicio, CFG.fuso, "HH:mm"),
    meet: meet
  };
}

function avisaPorEmail(dados, inicio, meet) {
  if (!CFG.emailAviso) return;
  var quando = rotuloDia(inicio) + " às " + Utilities.formatDate(inicio, CFG.fuso, "HH:mm");
  MailApp.sendEmail({
    to: CFG.emailAviso,
    subject: "📅 Reunião marcada: " + dados.nome + " — " + quando,
    body:
      "Nova reunião pelo site\n\n" +
      "Quando: "   + quando + "\n" +
      "Meet: "     + (meet || "-") + "\n\n" +
      "Nome: "     + dados.nome + "\n" +
      "E-mail: "   + dados.email + "\n" +
      "WhatsApp: " + (dados.whatsapp || "-") + "\n" +
      "Loja: "     + (dados.loja || "-") + "\n" +
      (dados.faturamento ? "Faturamento: " + dados.faturamento + "\n" : "") +
      "\nOrigem: "  + (dados.origem || "-"),
    replyTo: dados.email
  });
}
