# contador-revisao-igual-a-lista — "Esperando sua revisão" usa o mesmo filtro de carteira da fila
Pedido original (literal): "…se o que eu faço vai pra Amanda aprovar certinho…"
Unidade: V7 da auditoria do percurso (10/11) · Tipo: erro
Sintoma: o cliente sai da carteira com o mês em `aguardando_interna`. Ele some da fila da Amanda, mas continua no número do contador do Painel de controle: aparece número sem lista.
Reprodução: emulador. A J37 deu vermelho no código antigo ("contador antes 0 · depois 1").
Causa-raiz: o contador (`escritorio.html` ~28700) chama `linhasCalendariosAguardandoRevisao(cals)` sem `filtrarLinhasCalendariosPorCarteiraV127`. A fila (~48810) e o envio (~49385) usam esse filtro.
Árvore:
RAIZ: linhasCalendariosAguardandoRevisao → contador calRevisao / sinalizarFilaCalendariosAmanda
├─ LEITORES : Painel de controle (Chris e Amanda), sinal da fila da Amanda
└─ COLATERAL: nenhum. Se a carteira não puder ser lida, o contador cai no número sem filtro (não vira zero) e registra aviso no console
Mudança: o mesmo filtro de carteira no contador, com fallback seguro.
Testes: J37 (nova, vermelha → verde) + portão completo desktop e --movel.
