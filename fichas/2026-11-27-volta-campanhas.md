# volta-campanhas — o quadro de Campanhas volta para a Amanda e a Cecília
Pedido (Amanda → Chris, demanda de 26/11 00:45): "Não está aparecendo mais o quadro de campanha pra mim, analisar e voltar ele pra mim e
pra Cecília acompanhar as datas e conferências de postagens de CAMPANHA"; Chris, 27/11: "a gente precisa fazer voltar essas coisas".
Unidade: volta 2 de 3 · Tipo: erro (regressão da LZ3e)
Causa: a LZ3e tirou o quadro porque o último registro gravado era de 29/10 — mas a Amanda usava o quadro para ACOMPANHAR (só leitura) as
datas e as conferências de postagem de campanha, e tela só de leitura não deixa rastro no banco. Erro de evidência do catálogo.
Mudança: `git revert` da LZ3e (tela, módulo do quadro, menu, Central R87 "Campanhas e datas", ouvinte do contador, Visão do mês com
"Abrir campanhas", AGENTS). 3 conflitos com unidades posteriores resolvidos a favor delas: o bloco I170 da Gabrielle continua fora (LZ7c) e
os itens de Funil/Avulsos continuam fora (LZ6); voltam só as linhas de Campanhas. ?v dos módulos conferidos com o sha256.
Testes: jornadas de campanha (J105, J106, J124) e vizinhas — resultado no PR.
