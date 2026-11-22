# f5-u1-modulo-estado-mes — o estado do mês passa a morar num módulo único (a CP200 é a primeira a usar)

Pedido (Chris, 21/11): "pode partir pro estado de simplificação". Plano: `.claude/docs/F5_ESTADO_DO_MES.md`.
Unidade: U1 de 6 · Tipo: ajuste (estrutura), sem mudança de regra

Retrato: três cópias completas da regra "qual é o estado deste mês" (escritório, link do cliente, servidor CP200) + ~15 leituras cruas.
Hoje elas concordam nos meses vivos, mas qualquer mudança futura numa cópia faz as outras divergirem: é a classe de erro que mais se repetiu.

Mudança:
- `functions-get/lib/gs-estado-mes.mjs` e `gs-estado-mes.mjs` (raiz), idênticos;
  - o código é o da CP200, movido sem mudança: `mesDoTexto`, `mesDoItem`, `aprovacaoCompativel`, `mesHistoricoAnteriorAoControle`, `estadoPublicadoEfetivo`, `estadoDoMes`…;
- `functions-get/calendario-cliente-cp200.mjs` importa do módulo e mantém os nomes públicos (`mesDoTextoCp200`, `mesDoItemCp200`, `estadoDoMesCp200`).

Árvore:
RAIZ: regra do estado do mês (CP200)
├─ ESCRITORES : nenhum (leitura pura)
├─ LEITORES   : cópia do cliente (`projecaoClienteCp200`, `mesVisivelClienteCp200`), ações do cliente CP200, Acompanhamento CP205 (`estadoDoMesCp200`)
├─ PAPÉIS     : cliente (o que vê), equipe (sem mudança)
├─ RULES      : sem mudança
├─ AUTOMAÇÕES : gatilho `calendarioLegendaGetCp190` → CP200 (mesma saída)
├─ LEGADO     : regras de mês histórico/arquivado preservadas como estavam
└─ EFEITO     : nenhum — prova abaixo

O que NÃO muda: escritório, link do cliente, rules e as ~15 leituras cruas (próximas unidades).

Testes:
- comparação antes/depois sobre a exportação real de 21/11 (41 calendários, 3 datas de referência, 8 meses, todos os conteúdos e a projeção completa do cliente): **3.593 comparações, 0 diferenças**;
  - a 1ª rodada pegou um import faltando (`aprovacaoCompativel` na projeção), já corrigido;
- jornadas vizinhas: J06, J34, J51, J55, J56 e J57 (19/19);
- `verificar_duplicatas`: as duas cópias são iguais;
- bateria inteira no CI.

Publicação: Functions (ok geral do Chris, 20/11). O site não muda.
