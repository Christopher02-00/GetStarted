# cp261-retencao-fase2-copia-e-apaga — a rotina copia e só então apaga os registros técnicos antigos

Ok nominal do Chris (23/11), dado sobre os números de produção da fase 1 (CP260): 31.179 de 45.416 registros.
Literal: "Eu aceitei que fizesse pode fazer", em resposta a "pode apagar os 31 mil registros … publico a rotina diária, que copia cada registro antes de apagar".
Unidade: L1-h (CP261) · Tipo: novo (exclusão física autorizada, com cópia)

Árvore:
RAIZ: `aplicarRetencaoL1` (functions-get/retencao-l1.mjs) + `retencaoRegistrosGetL1` (index.mjs, a cada 2 h)
├─ ESCRITORES : exclusão em lotes de 400; relatório `sistema/retencao_l1`; cópia `retencao-l1/AAAA-MM-DD/<coleção>-<instante>.json` no Storage
├─ COLEÇÕES   : fila_emails (sem uso desde 09/11), email_throttle (trava de 2 h), log_automacoes (Saúde lê 30 dias), log_acessos (botão)
├─ LEITORES   : nenhum leitor perde o que usa; o resumo das 19 h (sem executadoEm) não entra; a fila recente não enviada fica
├─ SEGURANÇA  : cópia antes; cópia falhou → nada daquela coleção é apagado (relatório diz por quê); no máximo 6.000 por coleção e rodada
├─ FUNCTIONS  : função própria (não mexe no agendamento de 5 min); maxInstances 1 (global); publicação com o ok de Functions do Chris
├─ VIGIA      : o resumo diário mostra a contagem que ainda sairia e a última rodada (encontrados, copiados, apagados, arquivo)
└─ RESTAURAR  : o JSON traz id e dados com datas fiéis ({__ts}); basta regravar os documentos (roteiro manual, só se precisar)

Testes:
- J115 (nova), vermelha antes (rotina inexistente) e verde depois (4/4):
  - sai exatamente o que a regra pega;
  - a cópia traz cada registro antes da exclusão, com datas fiéis;
  - sem cópia, nada sai;
  - o limite por rodada é respeitado e a rodada seguinte continua.
- J114: atualizada ao texto novo do relatório.
- Bateria inteira no CI.
- Depois da publicação: o vigia mostra as rodadas e a contagem caindo até perto de zero (cerca de 3 rodadas, ~6 h).
Risco residual: o Storage do projeto passa a guardar as cópias (≈ 10 MB no total). Uma limpeza das cópias antigas pode ser decidida depois.

Atualização (23/11, publicação):
- A 1ª publicação falhou só na função agendada nova `retencaoRegistrosGetL1`: "Failed to set the IAM Policy". A conta do workflow tem
  Cloud Functions Developer e não define o invoker. As demais funções foram atualizadas e nada da retenção rodou.
- Correção: sem função nova. A retenção roda na rodada da faxina CP248 (`faxinaOperacaoGetCp248`, a cada 2 h), depois dela
  e só se a faxina terminou em menos de 5 min, com no máximo 2.000 por coleção. Protegida por try/catch: nunca derruba a faxina.
- J115 caso 5: o pedido da faxina dispara a retenção. No emulador não há Storage, a cópia falha e nada é apagado (ponta a ponta).
- J114: a contagem é comparada antes/depois pelo carimbo do relatório, porque a faxina de outra jornada pode gravá-lo.
- Publicação: `apagar_funcao=retencaoRegistrosGetL1`, para remover a função que ficou pela metade.

Atualização CP261c (23/11, 1ª rodada em produção às 07:29 UTC):
- A cópia recusou: "The specified bucket does not exist". O Storage do projeto nunca foi criado; as Functions de mídia também dependem
  de um bucket configurado que não está ligado. A trava funcionou: **nada foi apagado** (relatório: copiados 0, apagados 0, com o motivo).
- Correção: a cópia vai para o próprio Firestore, na coleção `retencao_l1_copias` (só servidor; as rules negam o que não está listado).
  São blocos de até ~600 KB (o limite do documento é 1 MiB), gravados e confirmados ANTES da exclusão.
  Os 31 mil registros viram ~20 documentos de cópia, restauráveis a partir do JSON.
- J115 caso 5: no emulador a cópia agora dá certo de ponta a ponta (pedido da faxina → cópia → exclusão; o registro está na cópia).
  Caso 6: cópia grande dividida em partes volta inteira.
- J114: se o script do vigia falhar, a jornada mostra o erro real dele (assim foi achada uma função apagada por engano na troca).
