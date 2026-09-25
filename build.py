#!/usr/bin/env python3
"""
Gerador do blog da E-commerce Company.
--------------------------------------
Lê os arquivos .md de content/posts/ e gera:

    blog/index.html            -> listagem dos posts
    blog/<slug>/index.html     -> cada post
    sitemap.xml                -> mapa do site completo

Não depende de nada além da biblioteca padrão do Python 3.
Rode com:  python3 build.py
"""

import html
import os
import re
import shutil
from datetime import date, datetime

RAIZ = os.path.dirname(os.path.abspath(__file__))
POSTS = os.path.join(RAIZ, "content", "posts")
BLOG = os.path.join(RAIZ, "blog")
SITE = "https://ecommercecompany.com.br"

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


# --------------------------------------------------------------- markdown --

def inline(t):
    """Formatação dentro de uma linha: negrito, itálico, link, código, imagem."""
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)",
               r'<img src="\2" alt="\1" loading="lazy">', t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", _link, t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![\*\w])\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", t)
    return t


def _link(m):
    texto, url = m.group(1), m.group(2)
    externo = url.startswith("http") and "ecommercecompany.com.br" not in url
    extra = ' target="_blank" rel="noopener"' if externo else ""
    return f'<a href="{url}"{extra}>{texto}</a>'


def markdown(texto):
    """Converte um subconjunto de Markdown suficiente para posts de blog."""
    linhas = texto.split("\n")
    saida, i = [], 0
    pilha = None          # "ul" | "ol" | None

    def fecha_lista():
        nonlocal pilha
        if pilha:
            saida.append(f"</{pilha}>")
            pilha = None

    while i < len(linhas):
        ln = linhas[i]
        cru = ln.strip()

        # bloco de código
        if cru.startswith("```"):
            fecha_lista()
            i += 1
            buf = []
            while i < len(linhas) and not linhas[i].strip().startswith("```"):
                buf.append(html.escape(linhas[i]))
                i += 1
            saida.append("<pre><code>" + "\n".join(buf) + "</code></pre>")
            i += 1
            continue

        if not cru:
            fecha_lista()
            i += 1
            continue

        # separador
        if re.fullmatch(r"-{3,}|\*{3,}", cru):
            fecha_lista()
            saida.append("<hr>")
            i += 1
            continue

        # títulos
        m = re.match(r"^(#{2,4})\s+(.*)", cru)
        if m:
            fecha_lista()
            nivel = len(m.group(1))
            saida.append(f"<h{nivel}>{inline(m.group(2))}</h{nivel}>")
            i += 1
            continue

        # citação
        if cru.startswith("> "):
            fecha_lista()
            buf = []
            while i < len(linhas) and linhas[i].strip().startswith("> "):
                buf.append(linhas[i].strip()[2:])
                i += 1
            saida.append("<blockquote><p>" + inline(" ".join(buf)) + "</p></blockquote>")
            continue

        # listas
        m = re.match(r"^[-*+]\s+(.*)", cru)
        if m:
            if pilha != "ul":
                fecha_lista()
                saida.append("<ul>")
                pilha = "ul"
            saida.append(f"<li>{inline(m.group(1))}</li>")
            i += 1
            continue

        m = re.match(r"^\d+[.)]\s+(.*)", cru)
        if m:
            if pilha != "ol":
                fecha_lista()
                saida.append("<ol>")
                pilha = "ol"
            saida.append(f"<li>{inline(m.group(1))}</li>")
            i += 1
            continue

        # parágrafo (junta linhas até a próxima linha em branco)
        fecha_lista()
        buf = []
        while i < len(linhas) and linhas[i].strip() and not re.match(
                r"^(#{2,4}\s|>\s|[-*+]\s|\d+[.)]\s|```|-{3,}$)", linhas[i].strip()):
            buf.append(linhas[i].strip())
            i += 1
        saida.append("<p>" + inline(" ".join(buf)) + "</p>")

    fecha_lista()
    return "\n".join(saida)


# ----------------------------------------------------------- frontmatter ---

def le_post(caminho):
    bruto = open(caminho, encoding="utf-8").read().lstrip("﻿")

    meta, corpo = {}, bruto
    if bruto.startswith("---"):
        partes = bruto.split("---", 2)
        if len(partes) >= 3:
            corpo = partes[2].strip()
            for linha in partes[1].strip().split("\n"):
                if ":" in linha:
                    k, v = linha.split(":", 1)
                    meta[k.strip()] = v.strip().strip('"').strip("'")

    slug = meta.get("slug") or os.path.basename(caminho)[:-3]
    slug = re.sub(r"[^a-z0-9-]", "-", slug.lower()).strip("-")

    try:
        d = datetime.strptime(meta.get("data", ""), "%Y-%m-%d").date()
    except ValueError:
        d = date.fromtimestamp(os.path.getmtime(caminho))

    if not meta.get("resumo"):
        limpo = re.sub(r"[#*`>\[\]]|\(.*?\)", "", corpo)
        meta["resumo"] = " ".join(limpo.split())[:170].rstrip() + "…"

    palavras = len(corpo.split())

    return {
        "slug": slug,
        "titulo": meta.get("titulo", slug.replace("-", " ").capitalize()),
        "resumo": meta["resumo"],
        "categoria": meta.get("categoria", "Tráfego pago"),
        "autor": meta.get("autor", "Marcos Censi"),
        "capa": meta.get("capa", ""),
        "rascunho": str(meta.get("rascunho", "")).lower() in ("true", "sim", "1"),
        "data": d,
        "data_br": f"{d.day} de {MESES[d.month - 1]} de {d.year}",
        "leitura": max(1, round(palavras / 200)),
        "html": markdown(corpo),
    }


# -------------------------------------------------------------- templates --

def moldura(titulo, descricao, canonico, conteudo, jsonld="", noindex=False):
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(titulo)}</title>
<meta name="description" content="{html.escape(descricao)}">
<link rel="canonical" href="{canonico}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta property="og:type" content="article">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="E-commerce Company">
<meta property="og:title" content="{html.escape(titulo)}">
<meta property="og:description" content="{html.escape(descricao)}">
<meta property="og:url" content="{canonico}">
<meta property="og:image" content="{SITE}/assets/img/logo-fundo-escuro.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/simbolo-fundo-escuro.png" type="image/png">
<meta name="facebook-domain-verification" content="i8cy4e5t1s4coixsv11b6j4ahmvbo8">
<meta name="theme-color" content="#0E100E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
{jsonld}
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>

<header class="nav">
  <div class="wrap nav__inner">
    <a class="nav__logo" href="/" aria-label="E-commerce Company — início">
      <img src="/assets/img/logo-transparente.png" alt="E-commerce Company" width="240" height="34">
    </a>
    <button class="nav__toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
    <nav class="nav__links">
      <a href="/#servicos">Serviços</a>
      <a href="/#resultados">Resultados</a>
      <a href="/#processo">Como funciona</a>
      <a href="/blog/">Blog</a>
      <a class="btn btn--primario" href="/#contato">Quero um diagnóstico</a>
    </nav>
    <a class="btn btn--primario nav__cta nav__cta--desktop" href="/#contato">Diagnóstico gratuito</a>
  </div>
</header>

<main id="conteudo">
{conteudo}
</main>

<footer class="rodape">
  <div class="wrap">
    <div class="rodape__grade">
      <div>
        <img src="/assets/img/logo-transparente.png" alt="E-commerce Company" width="250" height="36">
        <p>Gestão de tráfego pago para lojas virtuais que querem transformar investimento em faturamento previsível.</p>
      </div>
      <div>
        <h4>Navegar</h4>
        <ul>
          <li><a href="/#servicos">Serviços</a></li>
          <li><a href="/#resultados">Resultados</a></li>
          <li><a href="/#processo">Como funciona</a></li>
          <li><a href="/blog/">Blog</a></li>
        </ul>
      </div>
      <div>
        <h4>Contato &amp; legal</h4>
        <ul>
          <li><a data-zap href="#">WhatsApp</a></li>
          <li><a data-email href="#"></a></li>
          <li><a href="/politica-de-privacidade.html">Política de privacidade</a></li>
          <li><a href="/termos-de-uso.html">Termos de uso</a></li>
        </ul>
      </div>
    </div>
    <div class="rodape__base">
      <span>© <span id="ano">2026</span> <span data-preenche="razaoSocial">E-commerce Company</span>. Todos os direitos reservados.</span>
      <span>CNPJ <span data-preenche="cnpj">—</span></span>
    </div>
  </div>
</footer>

<a class="zap" data-zap href="#" aria-label="Falar no WhatsApp">
  <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a9.9 9.9 0 00-8.5 15L2 22l5.2-1.4A9.9 9.9 0 1012 2zm0 2a7.9 7.9 0 016.6 12.3l-.3.5.8 2.8-2.9-.8-.5.3A7.9 7.9 0 1112 4zm-3.4 4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2.1.8 2.5.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.15-1.2-.05-.1-.2-.2-.45-.3l-1.6-.8c-.2-.1-.4-.15-.6.1l-.8 1c-.15.2-.3.2-.55.07-.25-.12-1.05-.4-2-1.24-.74-.66-1.24-1.47-1.38-1.72-.14-.25 0-.38.11-.5l.37-.44c.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44l-.75-1.8c-.2-.47-.4-.4-.55-.41z"/></svg>
</a>

<script>document.getElementById("ano").textContent = new Date().getFullYear();</script>
<script src="/assets/js/config.js"></script>
<script src="/assets/js/site.js" defer></script>
</body>
</html>
"""


def pagina_post(p):
    import json as _json
    jsonld = ('<script type="application/ld+json">\n' + _json.dumps({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": p["titulo"],
        "description": p["resumo"],
        "datePublished": p["data"].isoformat(),
        "author": {"@type": "Person", "name": p["autor"]},
        "publisher": {"@type": "Organization", "name": "E-commerce Company"},
        "mainEntityOfPage": f"{SITE}/blog/{p['slug']}/",
    }, ensure_ascii=False, indent=2) + "\n</script>")

    capa = (f'<img src="{p["capa"]}" alt="" style="border-radius:14px;margin-bottom:34px">'
            if p["capa"] else "")

    conteudo = f"""
<article class="secao">
  <div class="wrap artigo">
    <a href="/blog/" style="display:inline-flex;align-items:center;gap:7px;font-size:.9rem;color:var(--texto-medio);margin-bottom:26px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Todos os artigos
    </a>

    <header class="artigo__cabeca">
      <div class="artigo__meta">
        <span class="post-card__tag">{html.escape(p['categoria'])}</span>
        <span>{p['data_br']}</span>
        <span>·</span>
        <span>{p['leitura']} min de leitura</span>
        <span>·</span>
        <span>por {html.escape(p['autor'])}</span>
      </div>
      <h1 style="font-size:clamp(1.9rem,4.2vw,2.8rem)">{html.escape(p['titulo'])}</h1>
      <p class="subtitulo" style="margin-top:16px">{html.escape(p['resumo'])}</p>
    </header>

    {capa}

    <div class="prosa">
{p['html']}
    </div>

    <aside class="form-card" style="margin-top:56px;text-align:center">
      <h3 style="margin-bottom:12px">Quer que eu olhe a sua conta?</h3>
      <p style="color:var(--texto-medio);font-size:.98rem;margin-bottom:24px">
        Trinta minutos, sem custo. A gente abre sua conta de anúncios junto e você
        sai com pelo menos três ajustes práticos — fechando ou não.
      </p>
      <a class="btn btn--primario btn--grande" href="/#contato">Quero um diagnóstico gratuito</a>
    </aside>
  </div>
</article>
"""
    return moldura(f"{p['titulo']} — Blog E-commerce Company",
                   p["resumo"], f"{SITE}/blog/{p['slug']}/", conteudo, jsonld)


def pagina_indice(posts):
    if posts:
        cards = "\n".join(f"""
      <a class="post-card" href="/blog/{p['slug']}/">
        <div class="post-card__meta">
          <span class="post-card__tag">{html.escape(p['categoria'])}</span>
          <span>{p['data_br']}</span>
          <span>·</span>
          <span>{p['leitura']} min</span>
        </div>
        <h3>{html.escape(p['titulo'])}</h3>
        <p>{html.escape(p['resumo'])}</p>
        <span class="post-card__ler">Ler artigo &rarr;</span>
      </a>""" for p in posts)
        lista = f'<div class="posts">{cards}\n    </div>'
    else:
        lista = """
    <div class="card" style="text-align:center;padding:60px 30px">
      <h3>Nenhum artigo publicado ainda</h3>
      <p>Os primeiros textos chegam em breve.</p>
    </div>"""

    conteudo = f"""
<section class="secao">
  <div class="wrap">
    <div class="secao-topo">
      <span class="etiqueta">Blog</span>
      <h1 style="font-size:clamp(2rem,4.4vw,3rem)">Tráfego pago para e-commerce, sem enrolação</h1>
      <p class="subtitulo">
        O que a gente aprende operando conta de loja virtual todo dia: o que funciona,
        o que parou de funcionar e o que nunca funcionou — mas continuam vendendo por aí.
      </p>
    </div>
{lista}
  </div>
</section>
"""
    return moldura(
        "Blog — E-commerce Company",
        "Artigos sobre Meta Ads, Google Ads, rastreamento e crescimento de lojas virtuais.",
        f"{SITE}/blog/", conteudo)


def sitemap(posts):
    hoje = date.today().isoformat()
    urls = [(f"{SITE}/", hoje, "1.0"),
            (f"{SITE}/blog/", hoje, "0.8"),
            (f"{SITE}/black-friday/", hoje, "0.7"),
            (f"{SITE}/politica-de-privacidade.html", hoje, "0.3"),
            (f"{SITE}/termos-de-uso.html", hoje, "0.3")]
    urls += [(f"{SITE}/blog/{p['slug']}/", p["data"].isoformat(), "0.6") for p in posts]

    itens = "\n".join(
        f"  <url><loc>{u}</loc><lastmod>{d}</lastmod><priority>{p}</priority></url>"
        for u, d, p in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{itens}\n</urlset>\n")


# ------------------------------------------------------------------ main ---

def main():
    os.makedirs(POSTS, exist_ok=True)

    arquivos = sorted(f for f in os.listdir(POSTS) if f.endswith(".md"))
    posts = [le_post(os.path.join(POSTS, f)) for f in arquivos]

    rascunhos = [p for p in posts if p["rascunho"]]
    posts = [p for p in posts if not p["rascunho"]]
    posts.sort(key=lambda p: p["data"], reverse=True)

    if os.path.isdir(BLOG):
        shutil.rmtree(BLOG)
    os.makedirs(BLOG)

    with open(os.path.join(BLOG, "index.html"), "w", encoding="utf-8") as f:
        f.write(pagina_indice(posts))

    for p in posts:
        pasta = os.path.join(BLOG, p["slug"])
        os.makedirs(pasta, exist_ok=True)
        with open(os.path.join(pasta, "index.html"), "w", encoding="utf-8") as f:
            f.write(pagina_post(p))

    with open(os.path.join(RAIZ, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap(posts))

    print(f"✓ {len(posts)} post(s) gerado(s) em blog/")
    for p in posts:
        print(f"   /blog/{p['slug']}/  —  {p['titulo']}")
    if rascunhos:
        print(f"  ({len(rascunhos)} rascunho(s) ignorado(s))")
    print("✓ sitemap.xml atualizado")


if __name__ == "__main__":
    main()
