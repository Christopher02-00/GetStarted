# cp248-faxina-diaria — fim dos números enormes de "em aberto" da Amanda e da Cecília

Pedido (Chris, 21/11): "vc está excluindo esses dados passados que formam números gigantes de informações ou atividades em aberto certo?
Quero uma correção definitiva disso, para Amanda ou Cecília que costumam ter números terríveis de coisas em aberto mas que são verificações
do sistema". Decisão (21/11): "Autorizo opção recomendada" — (1) fechar as tarefas antigas do sistema da Amanda, marcadas e reversíveis;
(2) agendada com 2 dias passados conta como publicada, salvo se a Cecília marcar que não saiu.
Unidade: única · Tipo: correção de caminho + legado (com o ok do Chris)

Retrato (exportação de 21/11, só leitura):
- **Amanda: 193 demandas abertas.**
  - Cerca de 150 são tarefas do sistema concluídas por ela entre agosto e outubro e presas em "aguardando aprovação": ninguém pode aprovar (CP245).
  - Exemplos: "Distribuir N vídeos" (29), "N vídeos de <cliente> esperando você distribuir" (~60), "Aprovar os stories de …" (25), "fulano quer excluir…" (8).
- **Cecília: 12 demandas, mas 192 avisos pendentes.**
  - 157 são "confirmar publicação" de postagens agendadas cuja data já passou: 35 de 3 a 7 dias, 48 de 8 a 14 e 73 de 15 a 30.
- Os 416 avisos informativos do cliente não lidos não aparecem em tela nem contador e não pesam no número de ninguém, então ficam como estão.

Correção: faxina do servidor — `functions-get/faxina-diaria-cp248.mjs`, chamada pelo agendamento que já existe (`acompanhamentoOperacionalGetI165`, a cada
5 min) no máximo a cada 2 h (`faxinaSeDevidaCp248`; retoma na volta seguinte se parar no limite de 4 min). Idempotente, item por item em transação.
Por que não uma função agendada própria: a 1ª publicação (run 44931891557) criou `faxinaOperacaoGetCp248` pela metade — a conta de publicação
não pode definir o IAM de quem chama. Ela é apagada pelo passo novo `apagar_funcao` do workflow de publicação (nome exato, só modo publicar).
1. **Agendada vencida**: com a data agendada há 2 dias ou mais, a postagem é confirmada pelo **mesmo caminho** da confirmação da Cecília.
   - Esse caminho é: fontes + conferência factual + calendário + vídeo `finalizado` + baixa das demandas do ciclo.
   - Autor "Sistema (confirmação automática)", com prova que explica a regra e a marca `confirmacaoAutomaticaCp248`.
   - Antes dos 2 dias, a Cecília confirma ou retira ("não saiu"); depois, "Desfazer publicação" continua.
   - Ficam com a Cecília e entram no relatório: Stokki (confirmação por plataforma), postagem sem horário agendado e fonte que o servidor não confere.
2. **Entrega do sistema sem aprovador** (CP245): fecha também o legado, com a marca `fechamentoSemAprovadorCp245`; a prova da Amanda fica intacta.
3. **Postagem de vídeo na Lixeira** (CP244): encerra também o legado (Camargo's "Não olhe!"); recuperar o vídeo reabre.
- Relatório da rodada em `sistema/faxina_cp248`.
- Nada é apagado: só muda o status, com marca e motivo.

Árvore:
RAIZ: itens que esperam uma confirmação ou uma aprovação que não muda nada
├─ ESCRITORES : faxina (servidor); os mesmos campos dos caminhos oficiais (publicar, fechar entrega, encerrar postagem)
├─ LEITORES   : fila "Publicações para conferir" e "Sua fila" (I165 se reconcilia pelo gatilho da postagem), Minhas Demandas da Amanda,
│               calendário e Portal do cliente (publicado), Acompanhamento CP205
├─ PAPÉIS     : Cecília (confirma/retira antes de 2 dias; desfaz depois), Amanda (as dela fecham), cliente (vê publicado)
├─ RULES      : sem mudança (servidor)
├─ AUTOMAÇÕES : faxina no agendamento de 5 min (máx. a cada 2 h); gatilhos CP244/CP245 continuam para o caso novo
├─ LEGADO     : 143 entregas da Amanda + 157 publicações da Cecília + a postagem da Camargo's, na 1ª rodada depois da publicação
└─ EFEITO     : o número da Amanda e o da Cecília passam a mostrar só o que alguém precisa fazer

Testes:
- J102 com 9/9 (inclui a faxina no agendamento de 5 min, que espera 2 h e retoma a rodada parcial):
  - a agendada pela tela (legenda do Chris, agendamento da Cecília), 3 dias depois, fica publicada pelo caminho oficial, com o vídeo finalizado, e sai da fila da Cecília;
  - no horário real não toca;
  - a tarefa antiga da Amanda fecha e sai da tela dela;
  - a Stokki fica com a Cecília;
  - o relatório é gravado;
  - o legado sem escrita prévia é fechado pela faxina.
- Contraprova (sem a faxina): vermelha, porque nada confirma e nada fecha.

Publicação: Functions (ok geral de 20/11 + decisão de 21/11). Depois: conferir o relatório da 1ª rodada e rodar o vigia da operação.

## 1ª rodada em produção (21/11, 18:49 UTC) e correção
- **O que aconteceu:** a faxina rodou dentro do agendamento e confirmou 10 publicações. Na 12ª, a transação esperou lock: os gatilhos das confirmações anteriores do mesmo cliente mexem no calendário e nas postagens. A volta estourou os 9 min sem relatório, e as voltas seguintes dos avisos foram descartadas enquanto ela rodava (avisos e recepção de pedidos a cada ~10 min em vez de 5).
- **Como foi achado:** pela exportação só leitura (`postadoEm` 18:49 em 10 postagens, `config_notificacoes_i165/estado` parado em 18:49) e pela mesma faxina rodada em memória sobre os dados reais (112 publicadas, 145 fechadas, 1 encerrada, 0 erros).
- **Correção:**
  - o agendamento só grava o pedido; a rodada roda na função própria `faxinaOperacaoGetCp248` (gatilho do pedido, 540 s);
  - limite de 30 s e no máximo 3 tentativas por item; o item que estoura volta na próxima rodada;
  - relatório gravado no início e a cada 10 itens (`emAndamento`/`parcial`).
- **J102:** 10/10, incluindo o gatilho real do emulador (o pedido roda a rodada e grava o relatório; logo depois não pede de novo).
- **Ajuste depois da exportação das 19:44:**
  - a versão antiga, dentro do agendamento, tinha confirmado 92 publicações (67 às 18:49, 8 às 19:03 e 17 às 19:17), devagar, porque cada confirmação esperava as anteriores do mesmo cliente;
  - as 145 tarefas da Amanda ficavam para o fim e nunca eram alcançadas.
  - Agora a ordem é: primeiro fecha as entregas sem aprovador (rápido), depois as postagens de vídeo na Lixeira, por último as publicações, **revezando clientes** (a seguinte nunca é do mesmo cliente da anterior).
  - Em memória, sobre os dados reais das 19:44: 145 fechadas, 1 encerrada, 52 publicadas, 0 erros.
