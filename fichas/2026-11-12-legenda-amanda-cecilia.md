# legenda-amanda-cecilia — Amanda e Cecília legendam na fila (CP209)
Pedido original (literal): "Nem a Amanda, nem a Cecília conseguem pegar os conteúdos aprovados para colocar como publicado.
A Cecília não consegue nem ver as legendas, basicamente. Elas estão bloqueadas nessa sessão."
Decisão do Chris (12/11): "Amanda e Cecília salvam" — liberar as duas na fila de legendas.
Unidade: U1 de 1 · Tipo: ajuste
Reprodução: produção RO 12/11 operando como Cecília — 23 vídeos aprovados em "Liberados · aguardando legenda"; a fila desenha o
campo dentro de `<fieldset disabled>` e `salvarLegenda` recusa quem não é Fernanda, Gabrielle ou Chris. Sem legenda o vídeo não
chega ao agendamento nem à confirmação de publicação. J61 no código antigo: "campo de legenda BLOQUEADO".
Causa-raiz: 7 travas de papel na fila (escritorio.html, rascunho, restauração, uso da legenda do calendário, fieldset, salvar).
Os módulos I78/I79 e as rules (equipe → `equipePostCp183`) já aceitavam Amanda e Cecília.
Árvore: RAIZ postagens.legenda/status · ESCRITORES fila de legendas · LEITORES agendamento (Cecília), publicação · RULES sem mudança
(J61 prova que a gravação delas é aceita) · LEGADO nada muda para Fernanda/Gabrielle/Chris.
Mudança: lista única `PAPEIS_LEGENDA_FILA_CP209` no lugar das 7 travas.
O que NÃO muda: rules, functions, dados, o fluxo de agendamento e publicação.
Testes: J61 (Cecília e Amanda salvam a legenda → aguardando_agendamento, legendaPor certo) vermelha antes, verde depois; portão + --movel.
