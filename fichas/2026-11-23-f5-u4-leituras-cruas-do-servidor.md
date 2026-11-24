# f5-u4-leituras-cruas-do-servidor — o servidor lê o estado EFETIVO do mês onde é isso que ele quer dizer (PREPARADA; publicar depois de janeiro)

Pedido (Chris, 21/11) e decisão (23/11: preparar agora, publicar depois da semana de produção de janeiro). Plano: F5_ESTADO_DO_MES.md.
Unidade: U4 de 6 · Tipo: ajuste. Inventário completo (23/11, só leitura, file:line) em `.claude/docs/F5_ESTADO_DO_MES.md` §Inventário U4.

Retrato: só `calendario-cliente-cp200.mjs` (e a CP205 através dela) usa o módulo `lib/gs-estado-mes.mjs`. Todo o resto lê
`aprovacaoMeses[mes].status` CRU. O "efetivo" acrescenta: arquivo automático 30 dias depois do mês, `reabertoAte`, agosto/setembro
substituídos, mês histórico antes do controle por mês e os campos antigos (`aprovacaoInterna`/`mesLegado`). Só `liberado`/`arquivado` e
mês sem marca diferem entre cru e efetivo — nos estados de revisão nada muda hoje.

Achados que mais importam (nenhum é urgente; todos são do mesmo tipo de risco latente):
1. **4ª cópia da regra no editor do servidor**: `editorial-calendarios-i172.mjs:31` `estado(cal,mes)` = cru || `aprovacaoInterna` || legado,
   sem arquivo automático nem mês histórico. Alimenta o DTO, as capacidades e as pré-condições do editor (i172:48, 131–152, legado:29).
2. **Elegibilidade de envio reimplementada**: `central/lib/elegibilidade-envio-i164.mjs:10–13` refaz `reabertoAte` e o limite de 30 dias
   por conta própria e não tem a regra de agosto/setembro.
3. **Pedido do cliente em mês arquivado**: `pedido-ajuste-cliente-cp193.mjs:79–87` aceita pedido se a marca crua é `liberado`, mesmo
   depois do arquivo automático (a tela do cliente já não mostra o mês arquivado; o servidor não confere).
4. **Cópias de `mesDoItem`** em `lib/guardas-stokki-i165`, `central/lib/guardas-stokki-i165` e `lib/guardas-agendamento-cp101-i165`
   (usam `mesDoTextoConf`, que exige ano e não aceita abreviação — difere de `mesDoTexto` do módulo).
5. Espelho do campo antigo `aprovacaoInterna` inconsistente (CP112:162 e CP115:64 espelham quando `aprovacaoInterna.mes===mes`;
   I172:141/153/154 quando `usaLegado`) → tratado na U6.

Classificação: (E) deve usar o estado efetivo — ex.: i172:31 (e o que ela alimenta), elegibilidade-envio-i164, notificações (42/53/67/195),
situação do ciclo I155:66–76, CP109:95/149/249, CP155:22–25/117, CP123:220, CP112:147, I68:66–67/100–107, CP200:37 (redundante: remover);
(C) deve continuar com a marca crua (pré-condição de escrita, assinatura, prova, recibo) — ex.: assinaturas I172:33/I148:9/I155:79,
provas de publicação (CP112:127, CP123:73/94/100, CP129:42, CP115:24), recibo I148:17–19, presença de mês (agenda/processo I164),
CP193 de idempotência, CP155:64–66 (data de autoridade).

Medição (24/11, export só leitura de 23/11, `TZ=America/Sao_Paulo node ferramentas/f5_comparar_servidor_u4.mjs <exportacao>/calendarios.json`):
- U4a `estado()` do I172 × módulo, 1.353 comparações: **hoje (ref 23/11) 0 diferenças em meses vivos** (só 12 × 2026-08 e o VIP 2026-09).
  Com o calendário andando: **a partir de 30/11, outubro (18 calendários)** e **a partir de 30/12, novembro (25)** ficam "liberado" no editor
  do servidor e "arquivado" no módulo (= o que o escritório e o cliente já mostram). É a divergência latente que a U4a fecha.
- U4c `mesDoItemCalendario` das 3 guardas × `mesDoItem` do módulo: 1.547 itens, **0 diferenças** → troca segura.
Efeito da U4a para a equipe (avisar o Chris antes de publicar): mês arquivado automaticamente deixa de aceitar no servidor o que hoje só
"liberado" aceita (ex.: ajuste interno CP267, pedido do cliente CP193). A saída já existe: "reabrir por 30 dias" no escritório (`reabertoAte`,
escritorio.html ~49811) — depois de reaberto, o módulo volta a dar "liberado".

Mudança (quando publicar), em 3 PRs pequenos dentro da U4:
- U4a: `estado()` do I172 passa a ser `estadoDoMes` do módulo (o resto do editor herda); prova: comparação nos dados reais de
  `estado()` antigo × módulo para todos os ciclos ativos (ferramenta a criar no mesmo molde de `ferramentas/f5_comparar_estado_mes.mjs`);
- U4b: elegibilidade-envio-i164, notificações e situação do ciclo I155 usam o efetivo; CP193 recusa pedido em mês efetivamente arquivado
  (mensagem com saída: "Este mês já foi arquivado; fale com a equipe");
- U4c: as três cópias de `mesDoItem` passam a importar do módulo (com teste de equivalência de `mesDoTextoConf` × `mesDoTexto` antes).
Cada (C) recebe um comentário de uma linha dizendo por que lê a marca crua.

Testes previstos: comparação nos dados reais (0 diferença em meses vivos é o critério); J06, J34, J51, J55, J56, J57, J60–J60k, J85, J104
(dados reais); jornada nova: pedido do cliente em mês arquivado é recusado com saída; bateria no CI. Functions com ok nominal.
