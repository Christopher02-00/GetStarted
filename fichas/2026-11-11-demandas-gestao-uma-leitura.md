# demandas-gestao-uma-leitura — a gestão lê as demandas uma vez por login, não três
Pendência de 10/11/2026 (velocidade), concluída a pedido do Chris em 11/11.
Medição em produção (11/11, somente leitura):
- 3,4 mi leituras em 24 h. As consultas não estão mais no topo: a carteira do U3 saiu e hoje a maior é a dos avisos operacionais, ~87 mil/dia.
- `demandas` tem 4.810 documentos: 216 abertos e 3.368 encerrados há mais de 30 dias.
- No console do Chris, "carregar demandas" e "recarregar demandas" passavam do tempo limite de 8 s.
Causa: no login da gestão, `carregarTodasDemandas` lia a coleção inteira, o ouvinte em tempo real lia de novo, e "recarregar demandas" lia uma terceira vez. Eram ~14 mil leituras e ~15 MB por login.
Mudança (escritorio.html, `carregarTodasDemandas`):
- Para Chris/Amanda, sem a exigência de ler do servidor (`servidor:true`, usada pelos recibos), a carga aproveita o ouvinte em tempo real, que já mantém `todasDemandas`.
- Se o ouvinte não estiver ativo, ele é iniciado. A carga espera a 1ª entrega, até 15 s.
- Se o ouvinte falhar ou não responder, volta para a leitura direta, como antes.
- Mensagens `console.info` dizem qual caminho foi usado.
O que NÃO muda: o que aparece em qualquer tela; a equipe (fila própria por destinatário); a Fernanda (I118); as leituras forçadas no servidor.
Testes: J54 (nova, vermelha → verde: "carga: ouvinte…" e demandas na tela) + portão completo.
Próximo passo possível (ficha futura): carregar só as abertas e as encerradas nos últimos 30 dias, com o histórico sob demanda (−70% de volume).
