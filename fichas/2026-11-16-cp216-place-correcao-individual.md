# cp216-place-correcao-individual — correção individual do pedido (CP115) não trava os ajustes internos do mesmo mês (CP216)
Pedido original (literal, essencial): "Place · 2026-11 travado — mesma trava da Fedalto 2026-12 (CP215), mas num caso que a CP215 não cobriu:
mês com pedido do cliente em correção individual (CP115) e rascunho interno feito antes da última publicação … Nem a Amanda nem o Chris
conseguem sair desse estado pela tela."
Unidade: U1 de 1 · Tipo: erro

## Reprodução (relato do Chris, 16/11; sem leitura de produção minha)
Place 2026-11 (continuidade antiga, `modo:'continuar_legado'`):
- pedido do cliente "É oficial! A Black Friday chegou à Place!" (calitem_1792166346711_6qz6gkc) corrigido pelo Chris (CP115) e enviado
  à Amanda → continuidade `fase:'enviada'` com `correcaoIndividualCp115`, mês `aguardando_interna`.
- 2 peças adicionais CP142 (interno_cp123_8f0b…, interno_cp123_6d5a…), versão 3, "Aguardando revisão da Amanda".
- Telas: "A publicação deste mês mudou…" nas peças; "O mês contém outra versão editorial ainda não reconciliada"; sem "Revisar e
  aprovar este ajuste" (Amanda), sem "Trazer para a versão atual" (Chris); "A liberação ainda depende da revisão dos ajustes internos".

## Causa (functions-get/ajustes-internos-cp123.mjs)
`baseValida()` (continuidade antiga) exige `marcaPublicadaCp215` (mês 'liberado' ou 'ajuste_interno' por pedido do cliente),
`fase==='publicada'` e `!correcaoIndividualCp115`. A correção individual CP115 muda justamente esses três (fase aberta/enviada/devolvida,
mês ajuste_interno/aguardando_interna/aprovado_interno, escopo CP115 gravado) SEM mudar a publicação (`publicacaoAtual` e o retrato
continuam os mesmos; a própria prova CP115 `provaPublicacaoCorrecaoTxCp115` confirma isso). Resultado: base inválida → nenhum ajuste
interno "atual" (Amanda sem aprovar), `rebaseDisponivelCp215` falso (Chris sem trazer), liberação do mês bloqueada pelos internos.
A comparação "outra versão editorial" só ignorava os conteúdos dos pedidos com o mês em `ajuste_interno`; em `aguardando_interna`
o conteúdo corrigido do pedido contava como divergência.

## Árvore de impacto
- Escritores: nenhum novo. `operarInternoCp123`/`rebaseInternoCp215` (já existentes) passam a aceitar o estado CP115.
  Publicação: `central_editor_decidir` publicar (continuidade antiga, fase 'enviada') já leva pedidos CP112 + internos CP123
  (`prepararPublicacaoInternosCp123`) e já limpa o escopo CP115 (`correcaoIndividualCp115:null`) e atualiza `publicacaoAtual`.
- Leitores: `dtoInternosCp123` (tela Ajustes internos do editor, `gs-ajustes-internos-cp123.mjs`), `resumoInternosCp123`
  (motivos/assinatura), `assinatura()` do editor, fila da Amanda (`filaInternosCp123`, não muda).
- Papéis: Chris (inicia/edita/envia; traz para a versão atual), Amanda (revisa/aprova; traz para a versão atual; libera).
- Rules: não mudam. Tela: não muda (já mostra motivos, "Trazer para a versão atual" e aprovar conforme o servidor).
- Legado: processo novo (I155) não muda; CP210/CP129 não mudam; `adocao-preparacao-cp129` continua recusando adoção com CP115.

## Mudança (menor diff, 1 arquivo de servidor)
1. `correcaoIndividualCp216(c,cal)`: escopo CP115 da MESMA publicação (schema 1, ciclo, competência, `retratoPublicadoEm` e
   `retratoHash` iguais ao retrato liberado; fase aberta/enviada/devolvida; mês ajuste_interno/aguardando_interna/aprovado_interno).
   `baseValida` aceita esse estado como alternativa a "mês publicado"; o resto da prova (retrato, `publicacaoAtual` igual) continua.
2. `resumoInternosCp123`: com o escopo CP115 válido, a comparação ignora também os conteúdos do escopo CP115 (revisados pela
   própria revisão do pedido).
O que NÃO muda: rules, tela, pedidos do cliente, publicação, conteúdo já liberado, texto das peças.

## Testes
J71 (Hitech 2027-04 — março é da J75, continuidade antiga): publicação P1 → peça CP142 enviada sobre P1 → publicação P2 registrada (recibo I172) →
cliente pede ajuste → Chris corrige (CP115) e envia à Amanda. Vermelha no `main` (sem "trazer"/aprovar); verde depois: peça trazida
com o mesmo texto, Amanda aprova pedido e peça, UMA liberação leva os dois. Portão inteiro + `--movel`.

## Place 2026-11 (produção) — sem escrita minha
Depende do deploy de `functions-get/` (ok nominal do Chris). Depois do deploy, pela tela, sem correção de dados:
se as peças estiverem sobre a publicação atual, a Amanda aprova as 2 peças e o pedido; se estiverem sobre a anterior, Chris ou Amanda
clicam "Trazer para a versão atual" em cada peça (mesmo texto, volta a rascunho), o Chris envia, a Amanda aprova; depois a Amanda
aprova o pedido e libera o mês (uma liberação leva o pedido do dia 26 e as peças dos dias 27 e 28).
