# cp219-retirar-peca-cp142 — peça adicional CP142 já liberada sai do mês por pedido do Chris e aprovação da Amanda (CP219)
Pedido original (literal, essencial): "retirar as peças CP142 do 2026-11 da Mochi, que já foi liberado".
Escopo: só a retirada (a observação sobre o quadro foi descartada). Unidade: U1 de 1 · Tipo: erro (falta de caminho).

## Reprodução (código; sem leitura de produção)
Mochi 2026-11 liberado (processo novo I155, como a Mochi 2026-12 da CP212). As peças CP142 já liberadas viraram itens comuns
`adicional_cp142_*` do calendário e do retrato.
- Editor do mês: `central_editor_salvar` (com `excluirIds`) só vale com o mês em rascunho/ajuste_interno; mês liberado não reabre por ele.
  Na continuidade antiga, `capacidadesLegadoEditorialI172` devolve `excluir:false` sempre.
- Ajustes internos (CP123/CP208), o único caminho de mês liberado: só correção de texto, substituição (só legado) e peça nova.
  `editorial-contrato-i172` recusa qualquer outro `tipoAjuste`. → Nenhum caminho pela tela retira a peça.

## Causa
Falta o tipo "retirada" no ajuste interno do mês liberado.

## Árvore de impacto
- Escritores: `operarInternoCp123` (iniciar/enviar/decidir com `tipoAjuste:'retirada_cp219'`); a liberação da Amanda
  (`central_editor_decidir` publicar → `prepararPublicacaoInternosCp123`) marca a peça `excluido:true`, `excluidoPor:'Chris'`,
  `excluidoEm`, `retiradaCp219{ajusteId,motivo,aprovadoPor:'Amanda',aprovadoEm}`. O item continua no documento (soft-delete).
- Leitores: `criarRetratoLiberadoV115` já ignora `excluido` → sai do retrato, da cópia do cliente e da entrega do ciclo;
  `resumoInternosCp123` (identidade ignora excluídos); `dtoInternosCp123`/`filaInternosCp123` mostram "Retirada da peça · …".
- Papéis: Chris pede (motivo); Amanda aprova/devolve e libera. Cliente: a peça some do Portal após a liberação.
- Rules: não mudam. Tela: `gs-ajustes-internos-cp123.mjs` (opção "Retirar esta peça adicional do mês" no tipo de ajuste;
  cartão sem campos de texto) + `?v=` em cascata (`gs-editor-calendario-central-i172.mjs`, `escritorio.html`).
- Guardas mantidas: só `adicional_cp142_*`; peça gravada/agendada/postada/ligada a vídeo (ocupação) não entra (`alvoDisponivel`);
  pedido do cliente aberto na peça continua coberto pela CP212 (vira "conteúdo retirado", encerrar com explicação).
- Legado: vale para processo novo e continuidade antiga (mesmo caminho de ajuste interno).

## Mudança (menor diff)
- functions-get/ajustes-internos-cp123.mjs: `TIPO_RETIRADA_CP219`; registro sem campos; iniciar só para peça CP142; salvar recusado;
  enviar sem exigir alteração de texto; publicação marca `excluido` em vez de revisar o texto. `conteudoVirtualInternoCp123` só mexe
  nas variantes de legenda quando o ajuste traz `legenda` (os tipos antigos sempre trazem → sem mudança para eles).
- functions-get/editorial-contrato-i172.mjs: aceita `tipoAjuste:'retirada_cp219'` no iniciar.
- gs-ajustes-internos-cp123.mjs: opção na tela e cartão da retirada.
O que NÃO muda: rules, texto das peças, outros conteúdos, pedidos do cliente, exclusão física (nenhuma).

## Testes
J74 (arquivo J60c; continua a J60, Bluefit 2026-12 processo novo com peça CP142 liberada): Chris pede a retirada pela tela e envia; Amanda aprova e
libera; a peça sai do retrato e da cópia do cliente, fica `excluido` com o texto intacto, os demais conteúdos não mudam.
Vermelha antes (a tela não oferece a retirada), verde depois. Vizinhas: J06,J56,J60,J60b,J62,J67,J71 + `--movel`.

## Mochi 2026-11 (produção) — sem escrita minha
Depende do deploy de `functions-get/` (ok nominal do Chris) e da publicação do site. Passos de tela no Escritório.
