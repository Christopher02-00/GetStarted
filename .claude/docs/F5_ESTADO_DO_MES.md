# F5 — Simplificação: o estado do mês do calendário em UMA regra (Programa Estabilidade, 21/11/2026)

Pedido do Chris (21/11): "pode partir pro estado de simplificação". Causa nº 2 da manutenção diária: caminhos novos foram criados
sem fechar os antigos, e telas diferentes calculam o estado do mês cada uma do seu jeito.

## Retrato (código + exportação real de 21/11, só leitura)
- **Quem grava** `aprovacaoMeses[mes]`:
  - editor oficial I172 (`editorial-calendarios-i172.mjs`: enviar → `aguardando_interna`, devolver → `ajuste_interno`, liberar → `liberado`);
  - devolução de pedido CP112 (`reabrirCalendario`);
  - correção individual CP115;
  - campo antigo `aprovacaoInterna`, gravado junto só quando `usaLegado` (meses até 2026-09 ou documentos sem mês).
- **Quem calcula o estado do mês**:
  - três cópias completas: `estadoMesCal` (escritorio.html), `estadoDoMes` (calendario.html = calendarios.html) e `estadoDoMesCp200` (servidor, cópia do cliente);
  - cerca de 15 módulos do servidor leem `aprovacaoMeses[mes].status` cru, sem as regras de mês histórico e de arquivamento automático.
- **Comparação das três versões nos dados reais** (38 calendários × 6 meses):
  - **outubro de 2026 a janeiro de 2027: 100% iguais**;
  - divergem só em meses passados: em 12 casos de agosto o escritório diz "rascunho" e o cliente "liberado"; no caso VIP 2026-09 a leitura crua dá "arquivado" e a efetiva "liberado".
  - Risco **latente**: a próxima mudança numa cópia faz as outras discordarem num mês vivo.
- **Campo antigo** `aprovacaoInterna`: existe em 24 calendários, mas só em meses até 2026-09 ou em documentos sem mês. Nenhum mês vivo depende dele.

## Unidades (uma por PR, nesta ordem)
| # | Unidade | Tipo | Mudança de comportamento |
|---|---|---|---|
| U1 | Módulo único `gs-estado-mes.mjs` (raiz) = `functions-get/lib/gs-estado-mes.mjs`; a CP200 usa o módulo | ajuste (estrutura) | nenhuma (3.593 comparações nos dados reais, 0 diferenças) |
| U2 | O escritório (`estadoMesCal`) usa o módulo + jornada-trava que compara todas as cópias no CI | ajuste | só meses antes do controle por mês (agosto/2026): o escritório passa a ver como o cliente |
| U3 | O link do cliente (`calendario.html` = `calendarios.html`) usa o módulo | ajuste (estrutura) | nenhuma esperada (a CP200 já é cópia fiel dele) |
| U4 | Leituras cruas do servidor: cada uma das ~15 vira "estado efetivo" quando é isso que ela quer dizer; as que precisam da marca crua ficam, com comentário | ajuste | só casos de mês histórico/arquivado |
| U5 | Caminhos de liberação (CP121, CP123, I172, legado): mapa próprio e unificação da decisão "pode liberar?" numa função | ajuste (maior) | a definir na árvore própria |
| U6 | Aposentar a escrita do campo antigo `aprovacaoInterna` (só histórico) | limpeza | nenhuma em mês vivo |

Prova de cada unidade: comparação antes/depois nos dados reais (exportação só leitura) + jornadas vizinhas + bateria inteira no CI.
