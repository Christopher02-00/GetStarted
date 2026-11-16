# Ficha · "Postagem Até Quando" volta para a Amanda e responde com uma conta só

- **Pedido literal (Chris, 16/11/2026, resumo):** "A Amanda perdeu acesso a tudo de 'conteúdos até quando'. O sistema que mostra até quando temos conteúdo não era muito funcional… Deixe ideal para o nosso processo de hoje — como funcionam as postagens e principalmente os calendários. Dê acesso para ela saber até quando tem conteúdo, ver tudo que está agendado, tudo que não está agendado e a frequência de cada cliente."
- **Unidade:** U2 de 2 desta rodada (U3 = alerta de cápsula, branch seguinte) · **Tipo:** erro (acesso) + ajuste (tela)

## Sintoma e reprodução
Com a Central R87 ativa (`processo_calendarios_i164/ativo`, estado real da operação), o laço `sincronizar` do `gs-central-unificada-r87.mjs` esconde todo id de `NAVS` — inclusive `navControlePostagem`. A exceção existia só para a Cecília. A matriz (`VISIBILIDADE_POR_FUNCAO.Amanda`, `DIA_A_DIA_POR_FUNCAO.Amanda`) e as guardas (`irPara`, `renderControlePostagem`) já autorizavam a Amanda — §52.1 de novo, desta vez pela 4ª camada (a Central). Reprodução: J69 vermelha no `main`.

## Causa-raiz
1. Acesso: exceção da Central R87 sem a Amanda.
2. Tela: três contas diferentes para a mesma pergunta — tela A (`renderControlePostagem`) colore pela data **manual**; tela B (`renderConteudoAteQuando`) só `agendado`; resumo C (`htmlPostagemAteQuandoResumo`) manual primeiro e ainda soma data do calendário como cobertura (contraria §52.2). Leituras com `catch → vazio` (falha parecia "nada").

## Árvore
```
RAIZ: resposta "até quando o cliente tem conteúdo"
├─ ESCRITORES : postagens (Functions/agendamento — sem mudança); controle_postagens (anotação manual — sem mudança)
├─ LEITORES   : tela A view-controlePostagem; tela B view-conteudoAteQuando; resumo C no painel da gestão;
│               motor coberturaPostagensAmanda (calcularCoberturaPostagens — mesma regra, agora no módulo)
├─ HUMANOS    : Amanda (sidebar), Chris (Central → "Postagem até quando" + painel), Cecília (sidebar); Helo/outros bloqueados
├─ RULES      : nenhuma mudança (leituras já permitidas: postagens, calendarios, controle_postagens, clientes_config)
├─ AUTOMAÇÕES : alerta de cobertura usa a mesma função pura (comportamento idêntico nesta unidade)
├─ LEGADO     : item sem dataPostagem → data = mes + day; item sem mes → mesDoItemCalendario; alias → slug canônico/nome
└─ COLATERAL  : sidebar da Amanda ganha o item; Chris continua sem o item na barra (pedido antigo dele)
```

## Mudança
- `gs-central-unificada-r87.mjs`: exceções por papel numa tabela; Amanda mantém `navPostagens` e agora `navControlePostagem`.
- `gs-ate-quando-postagens.mjs` (novo, puro): `coberturaPostagensAteQuando` (a regra de cobertura, movida sem mudar) e `projetarAteQuando` (por cliente: data até, faixa, agendados à frente, não agendados das competências atual e seguinte, frequência planejada/real, divergência da anotação) + render.
- `escritorio.html`: import estático; `calcularCoberturaPostagens` delega ao módulo; `carregarProjecaoAteQuando()` lê as fontes uma vez e é usada por A, B e C; erro de leitura vira aviso explícito.

## O que NÃO muda
Rules, Functions, `controle_postagens` (campos iguais), motor e texto do alerta (U3), rotas e views existentes.

## Testes
J69 (desktop e `--movel`): Amanda e Cecília pela barra lateral, Chris pela Central; cliente semeado mostra data, agendados, não agendados e frequência; Helo sem a porta e sem render. Bateria inteira.

## Risco residual
Cliente sem calendário mostra "planejado: sem calendário" (não zero). Hashes antes: escritorio.html 64a6a9e2…, gs-central-unificada-r87.mjs d4795cb8….
