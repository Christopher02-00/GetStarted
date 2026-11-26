# lz9-calendario-equipe-so-ve — calendario.html no modo da equipe só mostra; criar e revisar é na Central
Pedido (Chris, 26/11): "eu dou ok e confirmo que pode fazer tudo" — item "tirar o modo de edição da equipe do calendario.html; o modo
do cliente fica".
Unidade: LZ9 · Tipo: ajuste (calendario.html e calendarios.html, byte a byte iguais)
Caso: o levantamento da CP275 mostrou que a página, no modo da equipe, não grava em nenhum caso — as rules recusam a escrita do
calendário por ela (mesmo com o processo novo desligado), o processo novo recusa itens e o R87 já manda Chris e Amanda para a
Central. Para o resto da equipe a página abria a edição, que só falhava ao salvar ("Não consegui confirmar o salvamento").
Achado antes de mexer: o modo da equipe é também a visualização do calendário dentro do Escritório (Central de Calendários →
Ferramentas, iframe interno=1). Tirar o modo inteiro quebraria essa visualização — por isso sai só a edição.
Mudança: para quem da equipe não é Chris/Amanda, a página mostra o aviso "Esta página só mostra o calendário: criar e revisar
acontece na Central de Calendários" com o link "Abrir este cliente na Central" (o mesmo do R87), e o ponto único de gravação
(exigirAliasEditorialPermitidoR87, chamado por setDoc/addDoc/runTransaction da página) recusa antes de tentar.
O que NÃO muda: o modo do cliente (link com t=), Chris/Amanda (já viam o aviso), rules, servidor, dados.
Testes: J134 nova — contraprova no código anterior: sem aviso e gravação liberada (3/6); corrigido 4/4 (calendário de março visível
com o aviso, gravação recusada, sem erro grave). J134 + J51, J55, J06: 18/18; celular J134, J55, J06: 16/16; duplicatas e
calendario.html == calendarios.html verdes.
A correção de comparação da CP275 (iguaisCalendarioV125) deixa de ter efeito e não será publicada.
