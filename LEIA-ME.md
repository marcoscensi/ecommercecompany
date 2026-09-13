# Site da E-commerce Company

Site estático, sem framework e sem dependência. Hospedado de graça no
**GitHub Pages**, com o domínio `ecommercecompany.com.br` apontado pela Registro.br.

---

## Antes de tudo: o que você precisa preencher

**`assets/js/config.js`** já está preenchido com WhatsApp, e-mail, Instagram, CNPJ
e razão social. Esse arquivo alimenta o site inteiro — se algo mudar, é só ali.

| Campo | O que colocar |
|---|---|
| `whatsapp` | Seu número, só números: `55` + DDD + número |
| `email` | E-mail de contato que aparece no rodapé e nas páginas legais |
| `instagram` | URL do perfil (deixe `""` para esconder o ícone) |
| `cnpj` | CNPJ da empresa — **obrigatório nas páginas legais** |
| `razaoSocial` | Razão social completa |
| `cidade` | Cidade/UE — usada no foro dos Termos de Uso |
| `formEndpoint` | URL do Apps Script (veja a seção 3) |

Enquanto `formEndpoint` estiver vazio, **o formulário funciona mesmo assim**:
ele abre o WhatsApp já com todos os campos preenchidos. Nada quebra.

Além disso, revise no `index.html`:

- A barra de 4 blocos logo abaixo do topo (procure por `<!-- DIFERENCIAIS -->`).
  Deixei textos qualitativos porque não invento métrica. Se quiser trocar por
  números reais (faturamento gerido, nº de clientes, ROAS médio), é só editar ali.
- A seção de **FAQ** — confira se as respostas batem com como você trabalha,
  principalmente investimento mínimo, fidelidade e exclusividade por nicho.

---

## 1. Ver o site no seu computador

```bash
cd ~/Sites/ecommercecompany
python3 -m http.server 8000
```

Abra <http://localhost:8000>. Para parar, `Ctrl+C`.

> Use o servidor local em vez de abrir o arquivo direto no Finder — os caminhos
> começam com `/`, então só funcionam servidos.

---

## 2. Publicar no GitHub Pages

### 2.1 Subir o código

O repositório git já está criado aqui com o primeiro commit. Falta só o remoto:

1. Em <https://github.com/new> crie um repositório **público** chamado `ecommercecompany`
   (não marque nenhuma opção de README/gitignore)
2. Rode, trocando `SEU-USUARIO`:

```bash
cd ~/Sites/ecommercecompany
git remote add origin https://github.com/SEU-USUARIO/ecommercecompany.git
git push -u origin main
```

> Por que público? No plano gratuito o GitHub Pages só publica de repositório
> público. O site é público de qualquer jeito — o que fica visível é só o código
> HTML, nada de senha ou dado de cliente. Se fizer questão de privado, precisa
> do plano Pro (US$ 4/mês).

### 2.2 Ligar o GitHub Pages

No repositório: **Settings → Pages**

| Campo | Valor |
|---|---|
| Source | **GitHub Actions** |

Só isso. O arquivo `.github/workflows/publicar.yml` cuida do resto: a cada `push`
ele roda o `build.py` e publica. O primeiro deploy leva ~1 minuto e aparece em
`SEU-USUARIO.github.io/ecommercecompany`.

### 2.3 Apontar o domínio na Registro.br

1. Entre em <https://registro.br> → seu domínio → **DNS** → **Editar zona**
   (se aparecer "modo avançado", ative)
2. Crie estes registros:

| Tipo | Nome | Valor |
|---|---|---|
| A | *(vazio ou @)* | `185.199.108.153` |
| A | *(vazio ou @)* | `185.199.109.153` |
| A | *(vazio ou @)* | `185.199.110.153` |
| A | *(vazio ou @)* | `185.199.111.153` |
| CNAME | `www` | `SEU-USUARIO.github.io` |

3. Salve. A Registro.br leva de alguns minutos a algumas horas para propagar.

### 2.4 Confirmar o domínio no GitHub

De volta em **Settings → Pages**:

1. **Custom domain**: `ecommercecompany.com.br` → Save
2. Espere o check verde ("DNS check successful")
3. Marque **Enforce HTTPS** (fica disponível alguns minutos depois do check)

Pronto. `www.ecommercecompany.com.br` redireciona sozinho para o domínio principal.

> O arquivo `CNAME` na raiz já contém o domínio — não apague, é ele que
> mantém a configuração entre deploys.

---

## 3. Leads caindo na planilha

1. Crie uma planilha no Google Drive chamada **Leads — Site**
2. **Extensões → Apps Script**
3. Apague o que estiver lá e cole todo o conteúdo de **`google-apps-script.gs`**
4. Confira a linha `var EMAIL_AVISO` — é para onde vai o aviso de cada lead novo
5. **Implantar → Nova implantação**
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Autorize quando o Google pedir (vai aparecer um aviso de "app não verificado";
   clique em *Avançado* → *Acessar o projeto*, é o seu próprio script)
7. Copie a **URL do app da web** e cole em `assets/js/config.js` → `formEndpoint`
8. Faça um envio de teste pelo site e confira se a linha apareceu na planilha

Cada envio grava uma linha e te manda um e-mail. O formulário tem um campo
armadilha invisível que barra a maior parte do spam automatizado.

---

## 4. Publicar no blog

### Pelo painel visual (recomendado)

1. Entre em <https://app.pagescms.org> e faça login com o GitHub
2. Autorize o acesso ao repositório `ecommercecompany`
3. O painel lê o arquivo `.pages.yml` e monta o editor sozinho

Escrever, clicar em salvar e o GitHub republica em ~1 minuto. Você nunca
precisa abrir o terminal.

O campo **Rascunho** deixa o texto salvo sem publicar.

### Escrevendo o arquivo na mão

Crie um `.md` em `content/posts/` com este cabeçalho:

```markdown
---
titulo: "Título do artigo"
data: 2026-09-01
categoria: "Meta Ads"
autor: "Marcos Censi"
resumo: "Uma ou duas frases. Vira a descrição no Google."
rascunho: false
---

Texto do artigo em Markdown.

## Um subtítulo

Parágrafo com **negrito**, *itálico* e [link](https://exemplo.com).

- item de lista
- outro item
```

Depois rode:

```bash
python3 build.py
```

O nome do arquivo vira o endereço: `roas-alto-caixa-vazio.md` →
`ecommercecompany.com.br/blog/roas-alto-caixa-vazio/`.

> Use só letras minúsculas, números e hífen no nome do arquivo. Nada de acento
> ou espaço.

---

## 5. A página que o Google pede (verificação OAuth)

Já está pronta: **`politica-de-privacidade.html`**.

Ela tem a seção **3 — Dados obtidos por meio das APIs do Google**, com o texto
de *Limited Use* que o Google exige literalmente na verificação, e a seção
**3.2** explicando como revogar o acesso. Os Termos de Uso também apontam
para ela.

Na tela de consentimento OAuth do Google Cloud, preencha:

| Campo | Valor |
|---|---|
| Página inicial do app | `https://ecommercecompany.com.br` |
| Link da política de privacidade | `https://ecommercecompany.com.br/politica-de-privacidade.html` |
| Link dos termos de serviço | `https://ecommercecompany.com.br/termos-de-uso.html` |
| Domínios autorizados | `ecommercecompany.com.br` |

**Antes de enviar para verificação**, ajuste na tabela da seção 3 quais APIs
você realmente vai usar. O Google compara o que está escrito ali com os escopos
que você pediu — se sobrar API que você não usa, ou faltar uma que você pediu,
eles devolvem.

O domínio também precisa estar verificado no
[Search Console](https://search.google.com/search-console) com a mesma conta
Google do projeto no Cloud.

---

## 6. Onde fica cada coisa

```
ecommercecompany/
├── index.html                    ← a landing page
├── obrigado.html                 ← pós-envio do formulário (bom p/ conversão)
├── politica-de-privacidade.html  ← exigida pelo Google
├── termos-de-uso.html
├── 404.html
│
├── content/posts/*.md            ← os artigos (você edita aqui ou no painel)
├── blog/                         ← GERADO pelo build.py, não edite à mão
├── build.py                      ← gera o blog e o sitemap
│
├── assets/
│   ├── css/site.css              ← todo o visual
│   ├── js/config.js              ← ⚠️ SEUS DADOS
│   ├── js/site.js                ← comportamento
│   ├── img/                      ← logos, posters e prints
│   └── video/                    ← os 3 depoimentos
│
├── .pages.yml                    ← configura o painel do blog
├── .github/workflows/publicar.yml← deploy automático no GitHub Pages
├── CNAME                         ← domínio (não apagar)
├── google-apps-script.gs         ← código para colar no Apps Script
├── robots.txt, sitemap.xml
└── LEIA-ME.md                    ← este arquivo
```

---

## 7. Pendências conhecidas

**Vídeo da Carla (27 MB).** O GitHub Pages aceita, então não trava o deploy —
mas é pesado para quem assiste no 4G. Vale exportar no QuickTime
(*Arquivo → Exportar como → 480p*) e salvar por cima de
`assets/video/depoimento-carla-musa-luz.mp4`. Bruno e Fernanda já estão leves.

**Painel do blog (Pages CMS)** — o painel republica ao salvar porque cada
salvamento é um commit na `main`, que dispara o workflow. Nada a configurar.

---

## 8. Rotina do dia a dia

| O que fazer | Como |
|---|---|
| Trocar telefone, e-mail, CNPJ | `assets/js/config.js` |
| Mexer em texto da landing | `index.html` |
| Mexer em cor, espaçamento, fonte | `assets/css/site.css` (variáveis no topo) |
| Publicar artigo | <https://app.pagescms.org> |
| Ver o site local | `python3 -m http.server 8000` |
| Publicar mudança feita na mão | `git add . && git commit -m "..." && git push` |
