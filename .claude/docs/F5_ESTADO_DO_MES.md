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

## Situação (23/11/2026)
Decisão do Chris (23/11, caixa de perguntas): **preparar agora, publicar depois da semana de produção de janeiro**.
- U1: **no ar** (main 8c80ade, 21/11).
- U2 e U3: **medidas** com o export só leitura de 23/11 (`TZ=America/Sao_Paulo node ferramentas/f5_comparar_estado_mes.mjs <exportacao>/calendarios.json`):
  escritório × módulo 1.353 comparações / 36 diferenças, todas em 2026-08 (0 em meses vivos); link do cliente × módulo 0 diferenças.
  Fichas: `fichas/2026-11-23-f5-u2-escritorio-usa-modulo.md`, `fichas/2026-11-23-f5-u3-link-do-cliente-usa-modulo.md`.
- U4, U5, U6: **inventário pronto** (abaixo) e fichas escritas (`fichas/2026-11-23-f5-u4-…`, `…-u5-…`, `…-u6-…`).
- Nenhum código do site mudou nesta preparação. Cada unidade sai num PR próprio depois de janeiro; U4–U6 mexem em Functions → ok nominal do Chris.

## §Inventário U4 — leituras cruas de `aprovacaoMeses[mes].status` no servidor (23/11, só leitura)
Diferença entre cru e efetivo só existe em `liberado`/`arquivado` e em mês sem marca (arquivo automático 30 dias depois do mês,
`reabertoAte`, agosto/setembro substituídos, mês histórico antes do controle por mês, campos antigos). Estados de revisão: iguais.

**(E) deve ler o estado efetivo** (`estadoDoMes`/`estadoPublicadoEfetivo` de `lib/gs-estado-mes.mjs`):
- `editorial-calendarios-i172.mjs:31` — `estado(cal,mes)` local = cru || `aprovacaoInterna` || legado (4ª cópia da regra, sem arquivo
  automático nem mês histórico); alimenta DTO, capacidades e pré-condições do editor (i172:48, 131–152; legado:29). → U4a.
- `central/lib/elegibilidade-envio-i164.mjs:10–13` — refaz `reabertoAte` e o limite de 30 dias por conta própria, sem agosto/setembro. → U4b.
- notificações (linhas 42/53/67/195 do módulo de avisos de calendário), situação do ciclo I155:66–76, CP109:95/149/249, CP155:22–25/117,
  CP123:220, CP112:147, I68:66–67/100–107. → U4b.
- `pedido-ajuste-cliente-cp193.mjs:79–80` — aceita pedido com marca crua `liberado` mesmo depois do arquivo automático. → U4b
  (recusar com saída: "Este mês já foi arquivado; fale com a equipe").
- `calendario-cliente-cp200.mjs:37` — leitura crua redundante ao lado do módulo. → remover em U4b.
- cópias de `mesDoItem` em `lib/guardas-stokki-i165`, `central/lib/guardas-stokki-i165`, `lib/guardas-agendamento-cp101-i165`
  (usam `mesDoTextoConf`: exige ano, não aceita abreviação). → U4c, com teste de equivalência antes.

**(C) deve continuar com a marca crua** (pré-condição de escrita, assinatura, prova, recibo) — ganha comentário de uma linha:
assinaturas I172:33 / I148:9 / I155:79; provas de publicação CP112:127, CP123:73/94/100, CP129:42, CP115:24; recibo I148:17–19;
presença de mês (agenda/processo I164); CP193 idempotência; CP155:64–66 (data de autoridade).

**Espelho do campo antigo** (→ U6): CP112:162 e CP115:63–64 espelham quando `aprovacaoInterna.mes===mes`; I172:141/153/154 quando `usaLegado`.

## §Mapa U5 — quem decide "pode liberar este mês?" (23/11, só leitura)
| Caminho | Onde | O que decide |
|---|---|---|
| CP121 reliberação | `ajustes-calendarios-cp112.mjs:111–137` `elegibilidadeReliberacaoAjustesCp121` | reliberar depois de pedidos do cliente resolvidos |
| CP123 ajustes internos | `ajustes-internos-cp123.mjs:126–136` `resumoInternosCp123` → `liberacaoPermitida`/`disponivel` | reliberar depois de ajustes internos |
| I172 decidir | `editorial-calendarios-i172.mjs:142–155` | reliberar = CP121 ‖ CP123 → CP238 → autoridade por modo; publicar roda `exigirLiberacaoAjustesCp112`, preparação CP123 e `reciboPublicacaoI148` |
| CP238 mudanças diretas | dentro do I172 decidir | só quando Amanda e (CP121 ou CP123); nunca na primeira liberação |
| CP112 pedidos | `ajustes-calendarios-cp112.mjs:108` `resumoAjustesCp112` | usado em todo publicar |
| fila CP232 | `ajustes-internos-cp123.mjs:222` `podeLiberar` | ignora a marca do mês |

Condições escritas mais de uma vez: "pedido do cliente aberto" (5 versões: cp123:65, cp112:119/161, cp115:14, cp109:95/149, cp205:55),
"marca publicada" (7), "prova do retrato" (8), "cadeia de base I155" (3), "escopo CP115/CP216" (2), "conjunto em revisão" (7).
Foram essas cópias que divergiram em CP215, CP233, CP237, CP238 e CP241.

Fronteira proposta (sem código ainda): `functions-get/lib/gs-liberacao-mes.mjs` `decisaoLiberacaoMes(c, cal, {ajustesCp112, internosCp123, ator, agora})`
→ `{origem, estado (efetivo), marca (crua), publicacao:{conferida,retrato,prova,motivo}, pedidoClienteAberto, caminho, componentes:{pedidosCp112,
internosCp123, diretasCp238}, disponivel, motivos[]}`; primitivas `pedidoClienteAberto`, `marcaPublicada`, `publicacaoConferida`, `baseI155Coerente`,
`emRevisao`. Ordem: U5a primitivas + equivalência (tabela-verdade com os estados reais do export) → U5b CP121/CP123 → U5c I172 decidir →
U5d fila CP232 e vigia da liberação (o vigia passa a ler exatamente o que a Amanda vê).
