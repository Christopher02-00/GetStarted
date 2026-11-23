# cp260-retencao-fase1-contagem — o vigia diário conta (só leitura) o que a retenção pegaria

Pedido (Chris, 22–23/11): varredura de acúmulo. Proposta de retenção dos registros técnicos. Resposta do Chris: "Ok".
Interpretação registrada: o "Ok" autoriza a fase 1 (contar, sem apagar). A exclusão física (fase 2) só acontece com a confirmação dele
sobre os números de produção que esta fase mostra (CLAUDE.md: exclusão física = ok nominal).
Unidade: L1-g (CP260) · Tipo: novo (só leitura)

Árvore:
RAIZ: política única de retenção `functions-get/retencao-l1.mjs` (`POLITICA_RETENCAO_L1`, `contarRetencaoL1`, `relatorioRetencaoL1`)
├─ ESCRITORES : nenhum (count() e select() só leem; nada grava `sistema/retencao_l1` nesta fase)
├─ LEITORES   : passo novo do vigia da operação (`.github/scripts/contar-retencao-l1.mjs`, conta Cloud Datastore Viewer), resumo do run
├─ COLEÇÕES   : fila_emails (sem uso desde 09/11), email_throttle (trava de 2 h), log_automacoes (Saúde 30 dias), log_acessos (botão)
├─ FUNCTIONS  : o arquivo fica em functions-get para a fase 2 reaproveitar a mesma política; NÃO é importado pelo index (nada publicado)
├─ RULES      : n.a. (conta de serviço só leitura)
└─ EFEITO     : o resumo diário do vigia ganha a tabela "Retenção L1 — só contagem" (total, sairia, fica)

Critérios (iguais à proposta aprovada):
- fila_emails: enviado, ou com mais de 30 dias;
- email_throttle: mais de 7 dias;
- log_automacoes: mais de 90 dias (registro sem executadoEm fica);
- log_acessos: mais de 90 dias.

Testes:
- J114 (nova), vermelha antes (módulo inexistente) e verde depois (5/5):
  - números exatos por regra;
  - nada gravado nem apagado;
  - o script do vigia imprime os mesmos números.
- Bateria inteira no CI.
Próximo: disparar o vigia, mostrar os números ao Chris e, com a confirmação dele, fazer a fase 2.
A fase 2 é uma Function diária que copia o que vai sair para o Storage e então apaga, limitada por rodada.
