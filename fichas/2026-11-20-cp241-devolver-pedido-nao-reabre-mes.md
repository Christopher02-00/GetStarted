# cp241-devolver-pedido-nao-reabre-mes — no processo novo, devolver um pedido do cliente muda só o pedido

Pedido (Chris, 20/11): correção definitiva da liberação de ajustes (Fedalto, Stokki e geral), "que não volte a acontecer".
Unidade: U3 de 5 · Tipo: erro (classe que gerou CP233 e CP237)

Caso real (somente leitura, exportações de 20/11 11:54 e 13:35): Fedalto 2026-12 (`em` 19/11 10:18) e Stokki 2026-12 (`em` 19/11 13:33)
ficaram "ajuste_interno por 'Amanda'" com a criação reaberta (rodada 3 e 4) por devolução de UM pedido; nenhum recibo mensal
(`central_editor_decidir`) existe nesses instantes → `lerDevolucaoMensalTxCp155` dá "o recibo único ainda precisa de conferência".

Causa-raiz: `reabrirCalendario` (functions-get/ajustes-calendarios-cp112.mjs), chamado na devolução do pedido (CP112), regrava o mês
inteiro e, no processo novo, reabre a criação (`enviadoRevisao:false`, rodada+1). Efeitos: (1) fila de retornos do Chris (CP155) com erro
sem saída; (2) Acompanhamento do cliente (CP205) "Calendário de … em preparação pela equipe" para mês já entregue; (3) todo leitor do estado
"mês com pedido" precisou de remendo (CP233 ajustes internos, CP237 liberação).

Todos os ramos (Passo 2b): ação nova n.a.; resposta nova n.a.; papéis: Amanda devolve, Chris refaz (o mês já está aberto para ele:
`editar` aceita `ajuste_interno`) ✅; estado que trava: a liberação continua pelo CP121/CP123 ✅; outros produtores do mesmo estado: a
devolução do mês inteiro (`central_editor_decidir` devolver, CP155/CP196) NÃO muda — continua reabrindo o mês, como deve; processo antigo
(`continuar_legado`) e estratégico (CP109) NÃO mudam (o CP115 e o CP109 dependem da fase devolvida). Meses já regravados por 'Amanda'
(Fedalto, Stokki) continuam reconhecidos pelos remendos CP233/CP237 e não são regravados de novo.

Mudança: `reabrirCalendario` devolve nenhuma escrita quando o ciclo é do processo novo (`!c.modo && c.criacao`) e o mês está em
`ajuste_interno` com `pedidoAjusteOperationId` do cliente e retrato publicado. A revisão vira 'devolvido' e a demanda volta ao Chris
(`refazerUltimoI161`) como antes.
O que NÃO muda: devolução do mês inteiro, processo antigo, estratégico, dados de produção.
Testes: J94 (arquivo J60k) vermelha (3/4: mês por 'Amanda' + criação reaberta; erro na fila CP155; "em preparação" 3→4) → verde 4/4;
vizinhas J52/J53/J77/J78/J84/J85/J86/J90/J91/J92/J93 — 88/88.
Publicação: Functions (precisa do ok nominal do Chris para esta unidade).
