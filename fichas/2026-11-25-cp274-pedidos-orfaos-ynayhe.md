# cp274 — pedidos órfãos da Ynayhe de out/2026 fecham no calendário (lista fechada, ordem do Chris)

Pedido (Chris, 25/11): "3 demandas 'entrada_i54_' da Ynayhe, de outubro/2026, para a Gabrielle (saiu da equipe), estão órfãs … arquivar as 3
pelo caminho do servidor (excluido=true, motivo 'pedido órfão de out/2026; responsável saiu da equipe; arquivado por ordem do Chris'), sem
apagar. Conferir se há outras entrada_i54_ órfãs para destinatário inativo e listar antes de arquivar."
Unidade: 1 · Tipo: limpeza de dado (ok nominal na caixa de perguntas: "Fechar os 3 no calendário").

Conferência (export só leitura de 25/11 18:05 UTC):
- as 3 demandas JÁ estão `excluido: true` desde 09/10 (Amanda) → nada a regravar nelas (o motivo da Amanda é preservado);
- nenhuma outra entrada_i54_ aberta para pessoa inativa (as 3 abertas hoje são do Chris: Zeiss e Vitalle, 2026-12, fluxo normal);
- a mensagem "A demanda não confirma o pedido" vinha do calendário: `pedidosAjusteClienteI71` ainda com os 3 pedidos de 2026-10 e
  `aprovacaoMeses['2026-10']` = ajuste_interno por Cliente desde 06/10 (o 4º pedido, de 2026-11, é de outra demanda e não entra).

Mudança: `functions-get/pedidos-orfaos-ynayhe-cp274.mjs` (lista fechada de 3 operationIds + 3 demandas) chamada uma vez na faxina CP248
(passo 1c), idempotente: pedido → `cancelamentoCp143` (formato do cancelamento oficial, `cp274: true`, motivo da ordem); aviso do cliente →
`cancelado`; demanda → nota `arquivamentoCp274` (sem regravar exclusão); mês 2026-10 sem pedido aberto → `arquivado` manual com
`anteriorCp274`. Nada é apagado. Desfazer: tirar `cancelamentoCp143` dos 3 e voltar a marca para `anteriorCp274`.
Efeito: o vigia da liberação deixa de listar Ynayhe 2026-10 (só lê meses em revisão); a cópia do cliente se atualiza pelo gatilho do calendário
(CP205 não avisa o cliente: "arquivado" não é categoria de aviso).

Testes: J129 — vermelha sem a rotina (0/3 cancelados, outubro em ajuste) → 4/4 (3 cancelados com o motivo, novembro intacto, outubro
arquivado com a marca anterior, avisos cancelados, arquivamento da Amanda preservado, idempotente). Vizinhas J102, J127, J116: 30/30.
Publicação: Functions (ok nominal do Chris, 25/11) → conferir pela faxina e pelo vigia da liberação.
