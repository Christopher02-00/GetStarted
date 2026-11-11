# pedido-legenda-portal-vira-legenda (CP197) — o pedido de legenda do Portal chega à legenda do conteúdo
Pedido original: achado 5 da auditoria (CP152 fechava sem tocar a legenda). Decisão do Chris (10/11, no chat): "Aplicar na postagem".
Unidade: auditoria do percurso · Tipo: ajuste
Antes: o cliente pede "Legenda de publicação" pelo Portal e o Chris entrega o texto ("Legenda ou resposta que o cliente receberá"). A demanda fecha, mas a legenda do calendário e a da postagem continuam as antigas. O pedido do Portal é geral e não diz o conteúdo (client-intake).
Mudança:
- Tela de entrega (escritorio.html) ganha a pergunta "Este texto é a legenda nova de qual conteúdo? (opcional)". É uma lista dos conteúdos do cliente do mês anterior em diante, só os não publicados.
- Escolhendo um conteúdo, o servidor (`pedidos-legenda-cp152.mjs`, campo `aplicarLegendaCp197`) troca a legenda do item no calendário na mesma transação da entrega. Antes confere: texto utilizável (I79), item único no mês e item não publicado.
- O gatilho CP190 faz o resto: a postagem não agendada recebe o texto; se já estiver agendada, a Cecília recebe a demanda.
- `gs-pedidos-legenda-cp152.mjs` leva a escolha na tentativa guardada, com o `?v=` atualizado.
O que NÃO muda: entregar sem escolher conteúdo continua como antes; a resposta pública ao cliente segue igual.
Testes: J48 (nova, ponta a ponta Portal → Chris → postagem), vermelha → verde + portão completo.
