# Ficha · CP220 — Quadro "Alterações de calendário para revisar" (Início da Amanda) some com tudo por causa de um mês

- **Pedido literal (Chris, 16/11/2026):** operando como Amanda, com a página recarregada, o quadro do Início mostra "0 para revisar agora" e "Não consegui confirmar as mudanças agora. A última leitura foi mantida; isso não confirma fila vazia." "Conferir ajustes novamente" não resolve. Há 4 ajustes "Aguardando revisão da Amanda": Mochi 2026-12 dia 22 ("A arte do delivery") e dia 29 ("Foto de prato"), Place 2026-11 dias 27 e 28. Antes das 2 da Mochi (≈11h) o quadro listava as 2 da Place. Um 409 apareceu no console.
- **Unidade:** 1 de 1 · **Tipo:** erro (leitura da fila) · **CP:** CP220 · **Jornada:** J75

## Sintoma
Um único ajuste "diferente" na fila faz o quadro inteiro cair em "falha", com a lista anterior (vazia depois do recarregamento) → "0 para revisar agora". É por isso que a Amanda diz que "nada chega".

## Causa-raiz (provada no código)
1. **Tela (`escritorio.html`, `validarFilaInternaCp123`).** O servidor (`functions-get/ajustes-internos-cp123.mjs`, `filaInternosCp123`) manda o `link` **sem** `origemEditorial` para ajustes do processo novo (`origemI155Cp208===true`, CP208 de 12/11: peça adicional/ajuste em mês liberado do ciclo I155). A tela só aceitava `link` sem `origemEditorial` quando era "só preparação" (`preparacaoSomenteCp140`); para qualquer outro exigia `'continuar_legado'`. Resultado: o 1º ajuste CP208 enviado à Amanda (as 2 peças da Mochi de dezembro, processo novo) faz `validarFilaInternaCp123` lançar "Um ajuste interno precisa ser conferido novamente." → a leitura inteira vira `falha`, e as 2 da Place somem junto. Dentro do calendário da Mochi aparece "Revisar e aprovar" porque o editor usa outra leitura (`dtoInternosCp123`), que não tem esse filtro.
2. **Mesmo defeito na abertura** (`abrirAjusteInternoFilaCp123`): a origem do editor era `preparacaoSomenteCp140 ? '' : 'continuar_legado'` — abriria o ajuste CP208 pela continuidade antiga. Passa a usar a origem que o próprio `link` traz.
3. **Tudo-ou-nada.** Tela e servidor validavam a fila como bloco: um registro que não confere (no servidor, `validarRegistro` lança) derruba a lista inteira. Isso viola "falha não vira zero/vazio" para os outros meses.
4. **O 409:** a callable (`programacaoIndependenteGetI165`) nunca responde 409 (todo erro vira `failed-precondition` = 400). 409 = `ABORTED`, típico de transação do navegador disputando documento. Não é a causa do quadro vazio; não foi reproduzido.

## Árvore
```
RAIZ: leitura da fila interna CP123 (central_editor_interno_fila_cp123)
├─ ESCRITOR: operarInternoCp123 (iniciar/salvar/enviar) — sem alteração
├─ SERVIDOR: filaInternosCp123 — passa a isolar o registro que não confere (vira "problema" com motivo), os outros seguem
├─ LEITORES (tela): validarFilaInternaCp123 → htmlFilaInternaCp123 (Início Amanda/Chris, Aprovações), contarFilaInternaCp123 (chip "Calendários"), abrirAjusteInternoFilaCp123
├─ CONSUMIDORES: Amanda (revisa), Chris (acompanha/corrige)
├─ RULES: nenhuma
└─ LEGADO: servidor antigo (sem `problemas`) continua aceito pela tela nova
```

## Mudança
- `escritorio.html`
  - `validarFilaInternaCp123`: valida cada ajuste sozinho; o que não confere vai para `problemas` (cliente, mês, motivo) em vez de derrubar a fila. Aceita `link` sem `origemEditorial` também para ajuste do processo novo. Aceita `problemas` vindos do servidor.
  - `htmlFilaInternaCp123`: mostra "N ajuste(s) não puderam ser lidos" com cliente · mês, motivo e quem faz o quê, e botão para abrir o calendário daquele mês; os outros continuam listados. Quadro não some se só houver problema.
  - `contarFilaInternaCp123`: conta ajustes + problemas (problema nunca vira zero).
  - `abrirAjusteInternoFilaCp123`: origem do editor vem do `link`; abre também o calendário de um mês com problema (sem ajuste selecionado).
- `functions-get/ajustes-internos-cp123.mjs` (`filaInternosCp123`): registro que falha em `validarRegistro` (erro `central/preparacao`) vira item de `problemas`; outro tipo de erro continua derrubando a leitura.
- `ensaio/jornadas/J75-quadro-ajustes-amanda-por-mes.mjs` (nova).

## O que NÃO muda
Gravação de ajustes, aprovação, liberação, rules, editor, dados.

## Prova (J75)
Bluefit 2026-12 (processo novo, liberado pela J06/J56/J60): Chris envia uma peça adicional CP142 à Amanda. Hitech 2027-03 (processo antigo): Chris envia peça adicional e o mês é publicado de novo (peça fica sobre a versão anterior — o estado "travado" da Place). Amanda abre o Início: as 2 aparecem, sem "Não consegui confirmar"; cada "Revisar este conteúdo" abre o editor do cliente e mês certos com a peça. Depois um registro que não confere (cópia com origem divergente) entra na fila: os 2 continuam listados e o problema aparece com cliente · mês e motivo. Vermelho no `main`, verde depois.

## Publicação
- `escritorio.html`: merge no `main` (Pages). Isso sozinho corrige o caso da Amanda (processo novo).
- `functions-get/`: **precisa de deploy (ok nominal do Chris)** para o servidor isolar registro inválido. Sem o deploy, a tela nova funciona com o servidor atual.

## Hashes (antes)
- escritorio.html `64a6a9e22de003c33659a3e281b0a6768e2d52c4`
- functions-get/ajustes-internos-cp123.mjs `f482f9b88bec5bb4905c951e64d821e1e68a8b67`
