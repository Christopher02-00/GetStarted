# prova-da-entrega-link — "Abrir a prova" só vira link quando é endereço web (CP206)
Pedido original (literal): "onde ela não consegue clicar no link em que está o print acima" (Amanda, card "Criar arte verde limão").
Unidade: U1 de 3 · Tipo: erro
Sintoma: a Amanda clica em "Abrir a prova" e não abre.
Reprodução: produção RO — demanda czgxTJgAfO794CY635aq tem provaImagemUrl = página do Claude (claude.ai/artifact/…) PRIVADA do Chris
(só abre para quem o dono compartilhou). E em 160 demandas aguardando aprovação o campo guarda recado ("Ok", "Feito"),
que virava <a href="Ok"> → página quebrada do próprio site.
Causa-raiz: três telas montavam o link cru (`href=esc(d.provaImagemUrl)`) sem conferir se o valor é um endereço.
Árvore: RAIZ demandas.provaImagemUrl · ESCRITORES conclusão de demanda (provaLinkInput) · LEITORES Aprovações (faixa da pessoa),
detalhe da demanda, card "aguardando aprovação" · PAPÉIS Amanda, Chris · RULES não muda · LEGADO valores-texto mantidos.
Mudança: `htmlProvaEntregaCp206` (escritorio.html, ao lado de linkifyDescricao) nas 3 telas: endereço web (com ou sem https://) vira
link com noopener; texto vira "Recado da entrega: …"; claude.ai ganha o aviso de compartilhamento.
O que NÃO muda: dados gravados, gravação da prova, rules, functions.
Testes: J58 (Amanda, 3 provas: recado, Claude, Drive sem https) vermelha antes, verde depois; portão completo + --movel.
Risco residual: a página do Claude continua privada até o Chris compartilhar (Compartilhar → qualquer pessoa com o link).
