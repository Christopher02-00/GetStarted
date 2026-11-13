# observacao-conteudo-sem-corte — observação por conteúdo até 8.000 caracteres, nunca cortada em silêncio (CP213)
Pedido original (literal): "A observação por conteúdo que a Amanda escreve ao devolver um calendário … é cortada em 1.000 caracteres sem nenhum aviso.
Caso real: Stokki 2026-12, item ed_6f2abdb36440426cb542fc1c42017374 (dia 22, Retrospectiva)."
Unidade: U1 de 2 · Tipo: erro
Causa-raiz: gs-editor-calendario-central-i172.mjs — `campoNota()` com `maxlength="1000"` (o navegador corta a colagem sem avisar) e
`lerNotasRevisaoCp145()`/`change()` exigindo ≤1000. Também o recado geral `#ed172_motivo` tinha `maxlength="10000"` (corte silencioso).
Árvore: notas → `locais.observacoes` (rascunho local, raw ≤400.000) → `motivoNotasRevisaoCp145` junta no recado da devolução →
servidor `central_editor_decidir` (limite total 30.000, CP103/J52) → `aprovacaoMeses[mes].motivoAjuste` → Retornos da Amanda (CP155,
mostra `motivoAjuste` inteiro) e calendário. Sem outro corte de 1.000 em functions, rules ou nas telas de retorno.
Tamanho: o recado inteiro (geral + observações) continua limitado a 30.000 no servidor (recusa com aviso, não corta) — o documento do
calendário fica muito abaixo de 1 MB mesmo com 30 conteúdos (cada observação acima do total é recusada antes de gravar).
Mudança: `LIMITE_NOTA_CP213 = 8000` na caixa e na leitura; contador "x / 8.000"; acima do limite: aviso "O texto passou de 8.000
caracteres…", o texto não é guardado e "Devolver" fica desligado até corrigir; recado geral sem maxlength (vale o total de 30.000).
Testes: J65 (Amanda cola 3.500 caracteres, contador, aviso acima de 8.000, devolve; o recado chega inteiro ao calendário e aos Retornos da
Amanda) vermelha antes, verde depois; portão + --movel.
Stokki 2026-12: o recado gravado no dia ficou cortado — a Amanda precisa colar de novo o roteiro (numa nova devolução ou por recado).
