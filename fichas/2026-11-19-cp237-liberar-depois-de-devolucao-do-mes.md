# cp237-liberar-depois-de-devolucao-do-mes — quando o diagnóstico manda liberar, a Amanda tem o botão
Pedido (Chris, 19/11): Stokki 2026-12. Pedido do cliente do dia 3 aprovado pela Amanda (17h20); o diagnóstico diz "Todos os pedidos
estão aprovados. A Amanda libera o mês na revisão do calendário", mas não há botão de liberar (editor da Amanda sem publicar-form
nem liberar-form; "Conferir e liberar alterações ao cliente" volta para Aprovações; Chris vê "Amanda precisa liberar essas correções
pelo fluxo de liberação" e "Enviar para a Amanda revisar" desativado). O mês tinha sido devolvido pela Amanda às 10h33
(status ajuste_interno, "Ajustes pedidos pela Amanda"). Cookiery 2026-12, mesmo caso, liberou.
Correção pedida: sempre que o diagnóstico manda liberar, a Amanda tem o botão (editor e "Conferir e liberar").

Caso real (somente leitura): marca 2026-12 = ajuste_interno por 'Amanda' às 10h33 com motivo da DEVOLUÇÃO DO PEDIDO do dia 3
(reabrirCalendario CP112), pedidoAjusteOperationId do cliente; não houve devolução do mês inteiro.
Causa-raiz (ramo que a CP233 deixou passar): a elegibilidade "Liberar correções ao cliente" (CP121,
elegibilidadeReliberacaoAjustesCp121) só aceitava por 'Cliente' ("Devolução da própria Amanda não entra aqui") e, no processo novo,
exigia enviadoRevisao:true — reabertos pela devolução. E na aba Calendários (CP232) "Conferir e liberar" de mês só com pedidos
chamava abrirAvisoCalendarioI148, que para a Amanda só volta para Aprovações.
Mudança: CP121 aceita por 'Cliente' ou 'Amanda' (com pedido do cliente e retrato) e a criação reaberta nesse estado; a aba abre o
editor do mês (`abrirEditorPedidosCp237`), onde fica "Revisar e liberar correções ao cliente".
Provas: J90 (arquivo J60g) vermelha (reliberação INDISPONÍVEL, marca ajuste_interno/Amanda; botão volta para Aprovações) → verde 16/16
(desktop e --movel); vizinhas 63/63.
