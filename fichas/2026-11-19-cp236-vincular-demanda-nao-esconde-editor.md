# cp236-vincular-demanda-nao-esconde-editor — vincular a demanda do Chris não esconde "Abrir editor oficial do mês"
Pedido (central do Chris, 19/11): "Vincular demanda cria 'plano' e some o botão do editor". Caso real: Clínica dos Olhos Hauer
2026-12 (demanda da Amanda `3QSLXtFmpEiSAnKupfdF`); contornado às 15h40 pelo caminho "Registrar base e iniciar criação".
Onde: Calendários e conteúdos → Planejamento e roteiros → cliente/mês → "Vincular uma demanda já recebida, sem duplicar".
Sintoma: depois de vincular, "Abrir editor oficial do mês" some. Causa apontada: `gs-planejamento-estrategico-cp109.mjs`, ação
`editorDoMes` recusa quando `dto.plano` existe (o vínculo grava `dto.plano.demandaChrisId`).
Correção pedida: o vínculo da demanda não esconde o editor quando o mês ainda não tem conteúdos.
