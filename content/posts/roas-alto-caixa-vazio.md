---
titulo: "ROAS 4 e o caixa no vermelho: o erro de leitura que quebra loja"
data: 2026-08-20
categoria: "Dados e rastreamento"
autor: "Marcos Censi"
resumo: "O painel do Meta diz que você multiplicou o investimento por quatro. O extrato do banco discorda. Quase sempre o problema não é a campanha — é o que você está lendo."
rascunho: false
---

Toda semana aparece alguém com a mesma frase: *"o ROAS tá 4, mas eu não tô vendo esse dinheiro"*.

Não é azar e não é o Meta mentindo. É que ROAS de plataforma e lucro de loja são duas coisas diferentes, e a maioria das lojas toma decisão olhando só a primeira.

## O que o painel está te contando

O ROAS que aparece no gerenciador é uma conta simples:

```
receita atribuída às campanhas ÷ valor gasto em anúncio
```

Repare na palavra **atribuída**. A plataforma reivindica toda venda que aconteceu depois de alguém ver ou clicar num anúncio, dentro da janela configurada. Se a pessoa já ia comprar de qualquer jeito — porque te segue há dois anos, porque digitou o nome da sua marca no Google, porque recebeu seu e-mail — o anúncio leva o crédito mesmo assim.

Numa loja que já tem marca, isso infla o número com facilidade. Não porque alguém está trapaceando, mas porque é assim que o modelo funciona.

## As três contas que importam mais

### 1. Margem de contribuição, não receita

ROAS 4 numa loja com 25% de margem é prejuízo.

Faça a conta com o número que sobra de verdade:

- Receita: R$ 100
- Custo do produto: R$ 45
- Frete e embalagem: R$ 15
- Taxa de gateway e comissão da plataforma: R$ 8
- **Sobra antes do anúncio: R$ 32**

Se você gastou R$ 25 de mídia para gerar esses R$ 100, o ROAS aparece 4 — e você ficou com R$ 7. Um problema de estoque, uma troca ou um chargeback come isso inteiro.

O número que você precisa saber de cor é o **ROAS mínimo de equilíbrio**: `1 ÷ margem`. Com 32% de margem, ele é 3,1. Abaixo disso você está pagando para vender.

### 2. Receita nova vs. receita de sempre

Separe cliente novo de cliente recorrente dentro do relatório de campanha. Se 70% da "receita atribuída" vem de quem já comprou antes, o anúncio não está trazendo crescimento — está pagando pedágio em cima da sua própria base.

O jeito mais rápido de sentir isso: olhe o **custo por compra de cliente novo**. É quase sempre bem maior que o custo por compra geral, e é ele que determina se você consegue escalar.

### 3. O teste que resolve a discussão em duas semanas

Pare de discutir atribuição e faça um teste de incrementalidade simples: desligue um conjunto de campanhas por duas semanas e compare o faturamento total da loja com o período anterior equivalente.

Se você cortou 30% da verba e o faturamento total caiu 3%, aquela verba não estava comprando venda nova. Se caiu 25%, estava.

É desconfortável e assusta, mas é a única conta que usa o número do extrato em vez do número do painel.

## Antes de mexer na campanha, arrume o rastreamento

Boa parte dos casos de "ROAS bonito, caixa magro" tem uma causa mais chata: rastreamento duplicado.

Vale conferir:

- **Pixel disparando evento de compra duas vezes** — pelo pixel no site e pela integração nativa da plataforma ao mesmo tempo. Instale um dos dois, não os dois.
- **API de Conversões sem deduplicação** — sem `event_id` batendo entre navegador e servidor, cada compra vira duas.
- **Janela de atribuição no automático** — 7 dias de clique + 1 dia de visualização é o padrão, mas visualização em loja com marca forte infla muito. Compare com "somente clique" e veja a diferença.
- **UTM faltando no e-mail e no orgânico** — sem UTM, o GA4 joga aquela venda em "direto" e a plataforma de anúncio fica com o crédito sozinha.

## O painel que a gente usa

Nos clientes, o relatório semanal tem quatro linhas e nenhuma delas é o ROAS da plataforma sozinho:

1. Faturamento total da loja (fonte: a própria plataforma de e-commerce)
2. Investimento total em mídia
3. **MER** — faturamento total ÷ investimento total, o "ROAS da loja inteira"
4. Custo de aquisição de cliente novo

Se o MER está subindo e o custo de cliente novo está estável, a operação está saudável — não importa muito o que o painel de cada canal diz individualmente.

---

Se você está olhando um ROAS bonito e um caixa que não fecha, provavelmente é uma dessas quatro coisas. [Chama pra gente olhar junto](/#contato) — em trinta minutos dá pra descobrir qual delas é.
