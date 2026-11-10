# pedido-ajuste-cliente-pelo-servidor (CP193) — o pedido de ajuste do cliente grava em calendário grande
Pedido original (literal, 10/11): "O calendário da Zeiss sumiu e tinha um ajuste que foi enviado nele… ela não conseguia fazer o ajuste de jeito nenhum." (print: "Não consegui confirmar o ajuste no servidor")
Unidade: urgente de 10/11 · Tipo: erro
Sintoma: no link do calendário da Zeiss, "Enviar pedido de ajuste" falha sempre. O calendário em si está intacto (36 conteúdos, nov liberado pela Amanda às 07:03).
Reprodução:
- Emulador com a cópia real (somente leitura): `permission-denied`, "maximum of 1000 expressions" na regra de `calendarios` (L2181) e na do aviso.
- A J42 usa uma cópia anonimizada (`ensaio/fixtures/calendario-grande-j42.json`) e dá vermelho no código antigo.
Causa-raiz: o navegador do cliente gravava o calendário e o aviso, validados por dd()/dP(). Em calendário grande, essa validação estoura o limite de 1000 expressões.
Árvore:
RAIZ: calendarios/{slug}.aprovacaoMeses[mes] + pedidoAjusteCliente + pedidosAjusteClienteI71 + avisos_do_cliente/{operationId}
├─ ESCRITORES : registrarPedidoAjusteClienteNoBancoV113 (calendario/calendarios) → callable pública `cliente_pedido_ajuste_cp193`
├─ LEITORES   : Central de ajustes CP112, aviso/demanda do Chris, calendário do cliente (mês em ajuste)
├─ HUMANOS    : cliente (envia), Chris (recebe a demanda), Amanda (revisa)
├─ RULES      : sem mudança
└─ COLATERAL  : nenhum. Os mesmos campos e valores que o navegador gravava
Mudança:
- `functions-get/pedido-ajuste-cliente-cp193.mjs` confere a sessão do cliente e o token do link (mesma decisão de bq() das rules).
- Confere também o item exato, o mês liberado ou em ajuste e que o item não está agendado nem postado.
- Grava a mesma marca, o pedido e o aviso numa transação, idempotente por operationId.
- A tela continua fazendo as próprias conferências numa leitura do servidor e envia o item localizado.
Testes: J42 (nova, vermelha → verde, calendário grande anonimizado) + portão completo desktop e --movel.
