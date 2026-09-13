/**
 * ============================================================================
 *  RECEBE OS LEADS DO SITE E GRAVA NUMA PLANILHA DO GOOGLE
 * ============================================================================
 *
 *  Este arquivo NÃO faz parte do site. Ele é o código que você cola no
 *  Google Apps Script. Passo a passo completo no LEIA-ME.md,
 *  seção "3. Leads caindo na planilha".
 *
 *  Resumo:
 *   1. Crie uma planilha no Google Drive chamada "Leads — Site".
 *   2. Nela: Extensões > Apps Script.
 *   3. Apague o conteúdo e cole tudo isto aqui.
 *   4. Troque o EMAIL_AVISO abaixo pelo seu e-mail.
 *   5. Implantar > Nova implantação > Tipo: App da Web
 *        - Executar como: Eu
 *        - Quem tem acesso: Qualquer pessoa
 *   6. Copie a URL gerada e cole em assets/js/config.js -> formEndpoint
 * ============================================================================
 */

// Um ou mais e-mails, separados por vírgula. Deixe "" para não receber aviso.
var EMAIL_AVISO = "marcos.censi@ecommercecompany.com.br, marcosjr.ads@gmail.com";

var COLUNAS = [
  ["enviado",     "Data/hora"],
  ["nome",        "Nome"],
  ["whatsapp",    "WhatsApp"],
  ["email",       "E-mail"],
  ["loja",        "Site da loja"],
  ["faturamento", "Faturamento/mês"],
  ["plataforma",  "Plataforma"],
  ["desafio",     "Desafio relatado"],
  ["origem",      "Página de origem"]
];


function doPost(e) {
  try {
    var dados = JSON.parse(e.postData.contents);
    var aba = pegaAba();

    var linha = COLUNAS.map(function (c) { return dados[c[0]] || ""; });
    aba.appendRow(linha);

    avisaPorEmail(dados);

    return resposta({ ok: true });
  } catch (erro) {
    console.error(erro);
    return resposta({ ok: false, erro: String(erro) });
  }
}


/** Permite testar a URL abrindo no navegador. */
function doGet() {
  return resposta({ ok: true, mensagem: "Endpoint da E-commerce Company no ar." });
}


function pegaAba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName("Leads");

  if (!aba) {
    aba = planilha.insertSheet("Leads");
  }

  // Cria o cabeçalho na primeira execução
  if (aba.getLastRow() === 0) {
    var titulos = COLUNAS.map(function (c) { return c[1]; });
    aba.appendRow(titulos);
    aba.getRange(1, 1, 1, titulos.length)
       .setFontWeight("bold")
       .setBackground("#21841F")
       .setFontColor("#FFFFFF");
    aba.setFrozenRows(1);
    aba.setColumnWidth(8, 380);   // coluna do desafio, mais larga
  }

  return aba;
}


function avisaPorEmail(dados) {
  if (!EMAIL_AVISO) return;

  var corpo =
    "Novo lead pelo site\n\n" +
    "Nome: "            + (dados.nome || "-")        + "\n" +
    "WhatsApp: "        + (dados.whatsapp || "-")    + "\n" +
    "E-mail: "          + (dados.email || "-")       + "\n" +
    "Loja: "            + (dados.loja || "-")        + "\n" +
    "Faturamento/mês: " + (dados.faturamento || "-") + "\n" +
    "Plataforma: "      + (dados.plataforma || "-")  + "\n\n" +
    "Desafio:\n"        + (dados.desafio || "-")     + "\n\n" +
    "Página: "          + (dados.origem || "-")      + "\n" +
    "Enviado: "         + (dados.enviado || "-");

  MailApp.sendEmail({
    to: EMAIL_AVISO,
    subject: "🟢 Novo lead: " + (dados.nome || "sem nome"),
    body: corpo,
    replyTo: dados.email || undefined
  });
}


function resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
