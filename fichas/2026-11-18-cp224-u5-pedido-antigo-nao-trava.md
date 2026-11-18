# cp224-u5-pedido-antigo-nao-trava — pedido já resolvido antes da última liberação não bloqueia um novo pedido no mesmo conteúdo
Pedido original (literal): "Cada mudança é independente por conteúdo; só a liberação final do mês junta tudo." / "Toda recusa diz o motivo e o próximo passo."
Unidade: U5 do Bloco 2 do CP224 (achada pela J77 na U1) · Tipo: erro
Sintoma observado: depois que o mês é liberado com o pedido do cliente resolvido, um novo pedido em outro conteúdo reabre o mês. A partir daí, todo conteúdo que já teve pedido no passado é recusado com "Este conteúdo já está em ajuste", sem saída para o cliente.
Reprodução: emulador. A J77 (caso 5) libera o mês com 2 pedidos resolvidos e depois pede de novo nos mesmos 2 conteúdos. No código antigo, o 1º passa (o mês estava liberado) e o 2º é recusado (vermelho).
Causa-raiz: `jaAberto` em functions-get/pedido-ajuste-cliente-cp193.mjs considera todos os pedidos do conteúdo na competência. A tela do cliente (`pedidosPendentes` em gs-aprovacao-conteudo-i68.js) só considera os criados depois da última publicação (`retratoLiberadoV115.publicadoEm || liberadoEmAnterior`). O servidor e a tela discordavam.
Árvore:
RAIZ: recusa gs/ajuste-ja-aberto (CP193)
├─ ESCRITORES : cliente_pedido_ajuste_cp193 (servidor)
├─ LEITORES   : calendario.html / calendarios.html (mensagem do código gs/ajuste-ja-aberto; sem mudança)
├─ HUMANOS    : cliente pelo link
├─ RULES      : nenhuma
├─ AUTOMAÇÕES : recepção CP175 (cria a demanda do pedido novo; sem mudança)
├─ LEGADO     : pedido sem criadoEm continua contando como aberto (mais seguro)
└─ COLATERAL  : o CP112 lê os pedidos por operationId; um pedido novo no mesmo conteúdo vira um cartão novo (provado na J77)
Mudança: `jaAberto` passa a usar o mesmo corte da tela: só conta pedidos com `criadoEm` depois de `retratoLiberadoV115.publicadoEm || liberadoEmAnterior`.
O que NÃO muda: o pedido repetido no mesmo conteúdo dentro do mesmo ciclo continua recusado; a tela do cliente; as rules; o histórico.
Testes: J77 caso 5 (vermelho antes, verde depois); J06, J49, J52, J55, J56, J60, J64 e J71 no computador e no celular; bateria inteira no CI.
Risco residual: publicar exige o deploy das Functions (ok nominal do Chris).
