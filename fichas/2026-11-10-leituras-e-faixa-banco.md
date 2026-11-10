# leituras-e-faixa-banco — Functions com fila de 1 servidor e releitura da carteira a cada 5 min
Pedido original: "Lentidão e instabilidade. Aparece a faixa vermelha 'O banco de dados não está respondendo agora' e há travas em vários setores, inclusive na aprovação de vídeos… Meça, ache a causa e corrija na raiz." (Chris, 09–10/11/2026)
Unidade: U3 de 4 · Tipo: erro

## Medição (produção, 10/11 ~01h–02h40, só leitura)
- Firestore: plano Blaze; 2,3 mi leituras em 24h (pico 262 mil/h); 15 mi em 7 dias (4 mi em 03/11); 35 mil gravações/dia. Às 03h (ninguém online) ~32 mil leituras/h → Functions ≈ 770 mil/dia.
- Query Insights 24h: clientes_config 6.441 execuções (265 mil leituras) e clientes_extras 6.440 (155 mil) — 1º e 2º do ranking.
- Callable programacaoIndependenteGetI165 (Cloud Run): no máximo 1 instância; até ~5 pedidos simultâneos (concorrência 4); latência até 55 s; partida a frio ~2 s.
- Site: HTML 1 MB comprimido, pronto em 1,3 s; console do Chris limpo.

## Causa-raiz 1 — travas e faixa vermelha
functions-get/index.mjs: setGlobalOptions({maxInstances:1}) vale também para a callable que atende TODOS os cliques operacionais (aprovar vídeo, agendar, publicar, retirar, e as leituras "Conferindo os compromissos…" de cada lista). Um servidor × 4 pedidos: o 5º espera; com listas abertas por várias pessoas, a espera chega a dezenas de segundos e o site (limite 120 s) recebe deadline-exceeded/unavailable. O ouvinte de console.error transforma isso na faixa "O banco de dados não está respondendo".
Hipótese descartada com prova: "recusas normais (permission-denied/failed-precondition) acendiam a faixa". A J34 (escrita para isso) ficou verde também no código antigo — o ouvinte lê a mensagem do erro, que não contém o código, e nenhum dos 360 console.error do site junta o erro num texto. A mudança da faixa foi desfeita; a faixa estava avisando de um travamento real.

## Causa-raiz 2 — leituras
functions-get/central/notificacoes.mjs: sincronizarOcorrenciasI165 (a cada 5 min) lia clientes_extras + clientes_config inteiras POR CICLO (~22): ≈ 420 mil leituras/dia (~18% do total).

## Árvore
RAIZ A: opções da callable programacaoIndependenteGetI165
├─ ESCRITORES: todas as ações I165/R80/CP… (transação + recibo por operacaoId — seguro com várias instâncias; nenhuma trava em memória no módulo)
├─ CONSUMIDORES: Chris, Amanda, Cecília, Luís/Nathan (Central, aprovação, agendamento, publicação)
└─ CUSTO: Blaze, cobra por uso; mais instâncias só sobem quando há fila
RAIZ B: sincronizarOcorrenciasI165 → consultarRevisao/Envio/Legado
└─ fonteAindaPendenteI165 (antes de cada envio) continua lendo fresco

## Mudança
- index.mjs: callable com maxInstances:10 (gatilhos e agendada continuam com 1).
- notificacoes.mjs: lerCarteiraBrutaI164(db,memo) — carteira lida uma vez por rodada.

## Provas
- B: contador com banco falso, 3 ciclos — antes 3 leituras de cada coleção por rodada, depois 1.
- A: não reproduzível no emulador (não simula instâncias do Cloud Run). Prova depois do deploy: métricas da callable (instâncias > 1 em pico, latência p99 bem abaixo de 55 s) e Firestore (leituras/dia), comparadas a esta medição.
- Bateria completa desktop + --movel (as Functions do checkout rodam no emulador).

## Fora deste PR (ficha própria)
A gestão baixa as 4.671 demandas em tempo real a cada abertura (~190 mil leituras/dia, 4,9 MB no celular da Amanda). Reduzir para "abertas + recentes" toca ~185 leitores de todasDemandas.
