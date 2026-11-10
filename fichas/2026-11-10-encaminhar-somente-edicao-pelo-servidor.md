# encaminhar-somente-edicao-pelo-servidor (CP194) — "Encaminhar ao editor" de takes avulsos funciona
Pedido original (literal, áudio 10/11 11:12): "Tem três vídeos ali que é pra fazer com takes avulsos, porém a hora que eu encaminho pro editor ele não vai de jeito nenhum."
Unidade: urgente U1 de 10/11 · Tipo: erro
Sintoma: na fila de distribuição, os vídeos "somente edição" (sem gravação, sinalizados pelo filmmaker no checklist) não saem de "aguardando Amanda". Aparece "Não alterei o encaminhamento:" sem motivo.
Reprodução: emulador, com cópia do caso real (Mochi, "Conteúdo compartilhável"). A J41 dá vermelho no código antigo: o commit volta `permission-denied`, e o debug do emulador mostra "maximum of 1000 expressions to evaluate has been reached" nas rules de `videos_producao` (L3120/L3137).
Causa-raiz: o navegador gravava o vídeo direto, e as rules do vídeo cresceram a ponto de estourar o limite de 1000 expressões do Firestore por pedido. Por isso o Firestore recusa sem mensagem.
Árvore:
RAIZ: videos_producao/{id}.edicaoManual/status/editorAtribuido (I34)
├─ ESCRITORES : tratarSomenteEdicaoI34 → salvarTratamentoSomenteEdicaoI34 (agora → callable `somente_edicao_tratar_cp194`)
├─ LEITORES   : fila da Amanda/Chris, fila do editor, aviso ao editor (avisarEditorDoVideo, inalterado)
├─ RULES      : sem mudança (a Function grava com admin; a regra antiga fica para quem ainda usar)
└─ COLATERAL  : nenhum. O recibo pós-gravação continua lendo o servidor
Mudança:
- `functions-get/encaminhamento-somente-edicao-cp194.mjs` repete em JS as conferências da tela e da regra: papel Amanda/Chris, cadastro, pendência, revisão, demanda de arte, cliente ativo, link https e editor da lista das rules.
- Ação despachada em `operacoes.mjs`.
- Na tela, `salvarTratamentoSomenteEdicaoI34` chama o servidor.
Testes: J41 (nova, vermelha → verde) + portão completo.
Risco residual: o mesmo limite das rules atinge outras gravações do navegador em documentos grandes. A unidade das rules (ok do Chris) migra as próximas para o servidor.
