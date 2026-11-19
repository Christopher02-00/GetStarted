# cp236-vincular-demanda-nao-esconde-editor — vincular a demanda do Chris não esconde "Abrir editor oficial do mês"
Pedido (central do Chris, 19/11): "Vincular demanda cria 'plano' e some o botão do editor". Caso real: Clínica dos Olhos Hauer
2026-12 (demanda da Amanda `3QSLXtFmpEiSAnKupfdF`); contornado às 15h40 pelo caminho "Registrar base e iniciar criação".
Onde: Calendários e conteúdos → Planejamento e roteiros → cliente/mês → "Vincular uma demanda já recebida, sem duplicar".
Sintoma: depois de vincular, "Abrir editor oficial do mês" some. Causa apontada: `gs-planejamento-estrategico-cp109.mjs`, ação
`editorDoMes` recusa quando `dto.plano` existe (o vínculo grava `dto.plano.demandaChrisId`).
Correção pedida: o vínculo da demanda não esconde o editor quando o mês ainda não tem conteúdos.

Todos os ramos: o botão (semPlanejamentoCp165) e a ação (editorDoMes) usavam `dto.plano` existir; o lado do escritorio
(abrirEditorDoMes) não confere plano. Mudança: "plano montado" = plano com itens; vínculo sem itens não esconde nem recusa.
Provas: J89 vermelha no main (vínculo gravado, botão SUMIU) → verde (botão continua, editor abre); vizinhas CP109
(J06/J27/J36/J49/J49b/J52/J53/J60/J60c/J60d/J60e/J65/J84/J89) verdes; --movel 3/3.
