# f5-u3-link-do-cliente-usa-modulo — o calendário do cliente usa o módulo único (PREPARADA; publicar depois de janeiro)

Pedido (Chris, 21/11) e decisão (23/11: preparar agora, publicar depois da semana de produção de janeiro). Plano: F5_ESTADO_DO_MES.md.
Unidade: U3 de 6 · Tipo: ajuste (estrutura), sem mudança de regra.

Retrato (23/11): `calendario.html` (= `calendarios.html`, byte a byte) tem DUAS cópias da regra:
- principal: `aprovacaoCompativelNoCalendario`, `mesHistoricoAnteriorAoControleNoCalendario`, `limiteArquivoAutomaticoCalendario`,
  `estadoPublicadoEfetivoCalendario`, `estadoDoMes` (linhas ~2817–2907) + `mesRefDoTexto`/`mesDoTexto`/`mesDoItemNoCalendario` (~878–1003);
- cópia "I56": `...NoCalendarioI56` / `...CalendarioI56` (linhas ~2236–2301).

Medição (export só leitura de 23/11, mesmas 1.353 comparações da U2; ferramenta `ferramentas/f5_comparar_estado_mes.mjs`):
**0 diferenças entre o link do cliente e o módulo** (a CP200 do servidor já é cópia fiel dele, U1).

Mudança (quando publicar): o script do calendário importa do módulo (`gs-estado-mes.mjs?v=…`) e as duas cópias viram pontes com os
mesmos nomes; `calendario.html` e `calendarios.html` continuam idênticos (cmp).
Testes previstos: J05, J06, J51, J55, J56, J57 (cliente lê só meses liberados, aprovação pelo link); a trava da U2; bateria no CI.
Risco: nenhum esperado (0 diferenças); o cuidado é a carga do módulo no link do cliente (sem login) — conferir no ar com o token.
