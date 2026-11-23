# f5-u2-escritorio-usa-modulo — o escritório calcula o estado do mês pelo módulo único (PREPARADA; publicar depois de janeiro)

Pedido (Chris, 21/11): "pode partir pro estado de simplificação". Decisão (23/11, caixa de perguntas): **preparar agora, publicar depois
da semana de produção de janeiro**. Plano: `.claude/docs/F5_ESTADO_DO_MES.md`. Unidade: U2 de 6 · Tipo: ajuste (estrutura).

Retrato (23/11): `estadoMesCal` + `estadoPublicadoEfetivoCalendario` + `limiteArquivoAutomaticoCalendario` (escritorio.html ~49534–49580)
são uma cópia antiga da regra que hoje mora em `gs-estado-mes.mjs` (U1, no main desde 21/11).
Diferenças de código: (1) o escritório não tem `mesHistoricoAnteriorAoControle` (mês com conteúdo antes do primeiro mês controlado);
(2) o `legado` do escritório usa só `mesLegado` (o módulo também lê `month` quando o documento não usa meses); (3) sem marca, o escritório
dá "liberado" se o documento tem QUALQUER conteúdo; o módulo exige conteúdo daquele mês. O arquivo automático usa hora local do aparelho
no escritório e meia-noite de São Paulo no módulo (iguais no Brasil).

Medição (export só leitura de 23/11, 41 calendários × 11 meses (2026-06..2027-04 + mesLegado) × 3 datas de referência; ferramenta:
`TZ=America/Sao_Paulo node ferramentas/f5_comparar_estado_mes.mjs <exportacao>/calendarios.json`, que extrai as funções pelo nome):
- **1.353 comparações, 36 diferenças — todas em 2026-08** ("rascunho" no escritório → "liberado" no módulo, que é o que o cliente já vê);
- **meses vivos (≥ 2026-10): 0 diferenças.**

Árvore:
RAIZ: `estadoMesCal(cal, mes, ref)` no escritório
├─ LEITORES: filas de aprovação/liberação da Amanda, Central de Calendários, editor do mês, contadores, filtros de mês, mapa de meses
├─ HUMANOS: Amanda, Chris, Cecília (telas de calendário)
├─ ESCRITORES: nenhum (leitura pura); `window.estadoPublicadoEfetivoCalendario` é usado por outros pontos → manter o nome como ponte
├─ RULES/SERVIDOR: sem mudança
└─ EFEITO: só agosto/2026 passa a aparecer como "liberado" no escritório (igual ao cliente)

Mudança (quando publicar): importar `estadoDoMes`, `estadoPublicadoEfetivo`, `limiteArquivoAutomatico` do módulo no script módulo do
escritório (com `?v=`); `estadoMesCal` e `estadoPublicadoEfetivoCalendario` viram pontes finas para o módulo (mesmos nomes, sem global novo).
Jornada-trava nova: compara no navegador real, para os calendários do seed, o estado do escritório, o do link do cliente e o do módulo
(as três precisam concordar), para que nenhuma cópia volte a divergir.

Testes previstos: comparação acima (de novo, com o export do dia); J06, J34, J51, J55, J56, J57, J85, J60i, J60j; trava nova; bateria no CI.
Risco: telas que dependiam de agosto como "rascunho" (nenhuma encontrada; agosto está fora do período de trabalho).
