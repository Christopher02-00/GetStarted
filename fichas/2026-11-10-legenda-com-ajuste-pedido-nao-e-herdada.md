# legenda-com-ajuste-pedido-nao-e-herdada — postagem não nasce com a legenda que o cliente pediu para mudar
Pedido original (literal): "…desde correções de legendas e etc…"
Unidade: V10 da auditoria do percurso (10/11) · Tipo: erro
Sintoma: o mês está em ajuste porque o cliente pediu para trocar a legenda do conteúdo X. Mesmo assim, quando o vídeo X é aprovado, a postagem nasce em "aguardando agendamento" com a legenda da versão publicada, justamente a que o cliente recusou. A Cecília pode agendar antes de alguém corrigir.
Reprodução: emulador. A J40 deu vermelho no código antigo ("postagem aguardando_agendamento · legenda 'Legenda que o cliente recusou J40'").
Causa-raiz: com o mês em ajuste, `projetarFonteLegendaPublicadaI164` devolve `fonte_publicada_anterior` com `permitirLegenda:true` para todos os itens. `obterLegendaEditorialTransacionalV118` (escritorio ~8653) não consulta `GetAprovacaoI68.pedidoDoItem`.
Árvore:
RAIZ: herança da legenda na aprovação do cliente (confirmarAprovacaoClienteCore ~8904/9005)
├─ LEITORES : postagem nova/retomada (legenda, legendaOrigem, status)
├─ HUMANOS  : Cecília (deixa de receber legenda recusada), fila de legendas (Chris/Gabi recebem o item)
└─ COLATERAL: nenhum fora do item com pedido pendente; os outros itens do mês seguem herdando a versão publicada
Mudança: depois de `permitirLegenda`, quando a fonte é `fonte_publicada_anterior` e existe pedido pendente do cliente para o item, retorna o estado `pedido_cliente_pendente`. Esse estado não é "pronta", então a postagem nasce sem legenda.
O que NÃO muda: o item ausente ou duplicado continua recusando como antes. Na auditoria apareceu que o caminho "fora da pauta" esbarra no limite de 1000 expressões das rules; isso fica com a unidade das rules.
Testes: J40 (nova, vermelha → verde) + portão completo desktop e --movel.
