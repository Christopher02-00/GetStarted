# cp272 — pedido de mudança à Amanda com a postagem fora da operação fecha sozinho (faxina) e não volta

Pedido (Chris, 24/11, caixa de perguntas, ok nominal): "Sim, fechar e prevenir (Recomendado)" — faxina fecha os 8 com nota e qualquer
pedido futuro cuja postagem foi arquivada, cancelada, excluída ou publicada; regra no vigia; publicar as Functions depois dos testes.
Unidade: 1 · Tipo: erro (estado sem saída).

Caso real (export só leitura 23/11): na tela "Aprovar vídeos" da Amanda, "Mudanças de postagem para conferir · 8" — pedidos "não precisa
mais agendar" de 09 a 17/11 (Bluefit 6, Fedalto 1, Vitalle 1); as 8 postagens já estão `arquivada_sem_postagem`.
Causa: `decidirExcecao` (excecoes.mjs) exige `conferirFonte` → postagem ativa (`aguardando_legenda|aguardando_agendamento|agendado`,
não excluída, não arquivada). Quando a postagem sai da operação antes da decisão, o pedido fica `pendente` e ninguém consegue decidir;
`listarSolicitacoesExcecaoI165` continua mostrando. Nenhum caminho (arquivar, cancelar, publicar, excluir vídeo) fechava o pedido.

Árvore:
RAIZ: `programacao_solicitacoes_i165` com `estado: 'pendente'`
├─ ESCRITORES: solicitar (excecoes.mjs:22), decidir (:33, só com a postagem ativa); NOVO: faxina CP272 (encerrada_sem_decisao)
├─ LEITORES: lista da Amanda (`listar_solicitacoes_excecao`, só 'pendente'), histórico do cartão (programar.mjs:17, mostra o estado),
│  conferir pedido (:42); Raio-X (NOVO D6)
├─ QUEM TIRA A POSTAGEM DA OPERAÇÃO: publicacao.mjs (arquivar/cancelar/publicar), CP244 (vídeo excluído), faxina CP248/CP262 (publica)
│  → a faxina roda depois de tudo isso (passo 4) e pega qualquer origem, inclusive a do próprio passo de confirmação
├─ RULES: sem mudança (coleção só do servidor) · Functions: SIM (ok nominal do Chris)
└─ LEGADO: os 8 de 09–17/11 fecham na 1ª rodada (autorizado); decididos (autorizada/negada) nunca são tocados

Mudança:
- `functions-get/lib/gs-solicitacoes-orfas-cp272.mjs`: `postagemDecidivelCp272` — UMA regra, usada pela decisão (`conferirFonte`, mesma
  semântica de antes), pela faxina e pelo Raio-X.
- `functions-get/solicitacoes-orfas-cp272.mjs` + passo 4 da faxina CP248: pedido pendente cuja postagem não é decidível →
  `estado: 'encerrada_sem_decisao'` + `encerramentoCp272 {por, em, estadoAnterior:'pendente', situacaoPostagem, motivo}` (reversível).
- Raio-X D6 (amarelo, dono: faxina até 2 h): pedido pendente com a postagem fora da operação. No export: exatamente os 8.

Testes: J127 — vermelha no main (faxina não fecha; a Amanda vê 3 pedidos) → 5/5 (fecha arquivada e inexistente com nota; não toca ativa
nem decidida; idempotente; a Amanda vê só o decidível). Vizinhas J116, J124, J88, J121 (24/24 com a J127), J102 faxina e J101 (12/12).
Publicação: Functions com o ok nominal do Chris (24/11) → conferir no ar pelo relatório `sistema/faxina_cp248` e pelo vigia (D6 = 0).
