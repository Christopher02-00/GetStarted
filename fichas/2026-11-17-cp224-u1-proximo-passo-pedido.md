# cp224-u1-proximo-passo-pedido — no processo novo, cada pedido do cliente diz o próximo passo e leva ao conteúdo
Pedido original (literal): "Toda recusa diz o motivo e o próximo passo, com o botão para quem resolve (ou demanda para mim)."
Unidade: U1 de 4 (Bloco 2 do CP224) · Tipo: erro
Sintoma observado: Fedalto 2026-12 (17/11). Os 10 pedidos do cliente mostram "A publicação anterior e a origem deste pedido precisam de conferência… Use Conferir pedidos no servidor". O botão não muda nada e parece que o mês travou.
Reprodução: emulador. A J77 (J60d) cria a Bluefit 2026-12 liberada, com peça CP142 e ajuste CP123 já liberados, e 2 pedidos do cliente (um na peça CP142). No código antigo, a lista do servidor e a tela do Chris mostram "precisam de conferência" e nenhum botão (vermelho).
Causa-raiz: `dtoCorrecaoCp115` (functions-get/correcao-conteudo-pedido-cp115.mjs) explica a falta da prova CP115. Só que essa prova só existe no processo antigo (`contextoPublicado` exige `continuar_legado`). No processo novo, a correção é feita no editor do mês (central_editor_salvar) e não pelo CP115, então a mensagem é sempre falsa ali.
Árvore:
RAIZ: correcao.motivo do pedido (dto do CP112)
├─ ESCRITORES : dtoCorrecaoCp115 (servidor); dto() em ajustes-calendarios-cp112.mjs passa o ciclo
├─ LEITORES   : painel CP112 (gs-ajustes-calendarios-cp112.mjs, aviso data-motivo-correcao-cp182)
├─ HUMANOS    : Chris (corrige); Amanda continua vendo "A correção do conteúdo é feita pelo Chris"
├─ RULES      : nenhuma
├─ AUTOMAÇÕES : nenhuma
├─ LEGADO     : no processo antigo a frase e a prova continuam iguais (U3 cuida da célula 🟥)
└─ COLATERAL  : o editor I172 ganha a opção aoIrConteudo para o painel (rolar e focar o cartão do conteúdo)
Mudança:
- correcao-conteudo-pedido-cp115.mjs: `dtoCorrecaoCp115(r,ator,c)`. No processo novo, em vez da frase do CP115: "Corrija este conteúdo no editor do mês (botão abaixo) e toque em Salvar conteúdos. Depois escreva aqui a explicação e o que foi feito, toque em Salvar explicação e execução e envie à Amanda."
- ajustes-calendarios-cp112.mjs: passa `c`.
- gs-ajustes-calendarios-cp112.mjs: botão "Ir para o conteúdo no editor" (`ir-conteudo-cp224`), só no processo novo, quando o painel recebe `aoIrConteudo`.
- gs-editor-calendario-central-i172.mjs: passa `aoIrConteudo`, que rola até o cartão do conteúdo e foca o primeiro campo. Hashes dos imports atualizados.
O que NÃO muda: as travas do servidor, o caminho CP112/CP121, o CP115 do processo antigo, as rules e o histórico.
Testes: J77 (vermelha antes, verde depois); J06, J56, J60, J60B e J74 no computador e no celular; bateria inteira no CI.
Risco residual: publicar a frase nova exige o deploy das Functions (ok nominal do Chris). Até lá, o botão já aparece, mas o texto antigo continua.
Achado no caminho (vira a U5): o CP193 recusa um novo pedido num conteúdo que já teve pedido resolvido antes da última liberação ("Este conteúdo já está em ajuste"). A J77 da U1 evita esses conteúdos, e a U5 ganha um caso próprio.
