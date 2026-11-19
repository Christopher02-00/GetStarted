# cp232-aprovacoes-mostrar-tudo-e-por-que-nao-libera — aba Calendários de Aprovações: uma fila só e o que trava a liberação
Pedido original: "2) ABA 'CALENDÁRIOS' DE APROVAÇÕES (AMANDA): MOSTRAR TUDO E DIZER POR QUE NÃO LIBERA" (Chris, 19/11).
Unidade: U2 de 2 · Tipo: erro (pedidos do cliente invisíveis na aba) + ajuste (diagnóstico no cartão)
Sintoma: Juliane 2026-12, 9 pedidos do cliente aguardando a Amanda, não aparecem na aba; Cookiery 2026-11 e Fedalto 2026-12
"aprovei e não libera" sem dizer o que falta; aprovados mostram "Seu rascunho foi preservado" sem haver rascunho.
Reprodução: J85 no main → grupo do cliente ausente, contador ignora os pedidos.
Causa-raiz: a fila da aba (central_editor_interno_fila_cp123 → htmlFilaInternaCp123) lia só ajustes internos (CP123), e para a
Amanda só enviados/aprovados; o motivo da liberação travada vivia só na tela do calendário (CP224).

Árvore:
RAIZ: fila da aba Calendários (servidor filaInternosCp123 → tela validar/estado/htmlFilaInternaCp123/contador)
├─ LEITORES    : revisoes_ajustes_cp112 (pedidos do cliente) + calendarios (título atual, retrato) — só leitura
├─ PAPÉIS      : Amanda (revisa e libera), Chris (vê o que está com ele); Cecília não vê
├─ ESCRITORES  : nenhum novo (aprovar/devolver seguem na tela do calendário, mesmas ações)
├─ RULES       : sem mudança
└─ EFEITO      : contador da aba soma pedidos + internos que dependem da Amanda; Início usa a mesma fila

Mudança: servidor junta pedidos CP112 abertos (título atual; aprovados já liberados ficam de fora) e um resumo por cliente e mês
(o que falta e com quem); internos devolvidos/em preparação aparecem para a Amanda como "Com o Chris"; a tela mostra
"Por que este mês não avança?" no cartão e o botão de liberar desativado com o motivo; aviso de rascunho só para quem tem rascunho.
O que NÃO muda: pedidos aprovados, histórico, versões liberadas, ações de aprovar/devolver.
Testes: J85 (vermelha no main 3/6, verde 6/6, --movel), vizinhas J06/J55/J56/J60/J60b/J60d/J62/J67/J71/J75/J77/J78 55/55.
Publicação: Functions (ok nominal do Chris) antes do merge da tela. Caso real: Juliane, Cookiery e Fedalto na aba da Amanda.
