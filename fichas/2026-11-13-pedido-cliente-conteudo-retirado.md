# pedido-cliente-conteudo-retirado — conteúdo com pedido do cliente: servidor recusa retirar; retirado de propósito encerra o pedido (CP212)
Pedido original (literal): "Mochi · dezembro de 2026 travado … retirei 2 conteúdos … que tinham pedidos de ajuste do cliente ativos … A tela
respondeu … mas o servidor gravou a exclusão. Agora o calendário não carrega … 1) caminho para encerrar o pedido … 2) a gravação do editor não
pode excluir conteúdo com pedido ativo … 3) destravar a Mochi · dezembro …"
Unidade: U1 de 1 (3 partes) · Tipo: erro
Reprodução: produção RO 13/11 — Mochi 2026-12 (processo novo I155): itens ed_80c66223… e ed_99e85964… `excluido:true` por Chris 14:26;
demandas entrada_i54_d2433ea0… e entrada_i54_4dcb0e1d… `pendente`, sem revisão, aviso ativo. J64 no código antigo: o `central_editor_salvar`
GRAVA a exclusão (a coleta CP112 roda antes do patch) e só a leitura seguinte lança "O conteúdo de um pedido ativo está excluído" → a tela
mostra erro, o mês fica travado e nem o cancelamento CP143 abre.
Causa-raiz: (a) a exclusão do editor não conferia pedidos ativos; (b) `coletarAjustesTxCp112` lançava erro em vez de tratar o estado.
Mudança: functions-get/editorial-calendarios-i172.mjs — `excluirIds` recusa conteúdo com pedido ativo (nada é gravado);
functions-get/ajustes-calendarios-cp112.mjs — pedido ativo com conteúdo excluído vira `conteudo_retirado` (só "encerrar"; liberação do mês
continua bloqueada até encerrar); o encerramento CP143 marca `conteudoRetiradoCp212` (automático quando o conteúdo já saiu, ou pela caixa
"mostrar este texto ao cliente"); functions-get/acompanhamento-cliente-cp205.mjs — o cliente vê a explicação no Acompanhamento do Portal;
gs-ajustes-calendarios-cp112.mjs — botão "Encerrar pedido — conteúdo retirado" e campo "Explicação ao cliente". `?v=` em cascata.
O que NÃO muda: rules; cancelamento comum CP143; pedidos com conteúdo presente.
Testes: J64 (cliente pede → servidor recusa retirar → estado da Mochi abre com "conteúdo retirado" → encerra com explicação → cliente vê
no Acompanhamento) vermelha antes, verde depois; J06/J56/J60 juntos; portão + --movel.
Produção (ok nominal do Chris): deploy de functions; encerrar os 2 pedidos da Mochi 2026-12 com a explicação combinada; depois o mês segue o
caminho normal (Chris envia à Amanda → Amanda libera).
