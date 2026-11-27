# volta-ver-ambiente — "Ver ambiente de cada um" volta para a Amanda (Gerência → Equipe)
Pedido (Amanda → Chris, demanda de 26/11 17:18): "Sumir da parte equipe - conferência individual de cada colaborador onde eu tinha acesso
de como aparecia as demandas deles onde eu podia ajustar prazos e observações"; Chris, 27/11: "a gente precisa fazer voltar".
Unidade: volta 3 de 3 · Tipo: erro (regressão da LZ5a)
Causa: a LZ5a tirou a aba por falta de sinal de uso — tela só de leitura não deixa rastro no banco; a Amanda a usava para conferir o
ambiente de cada pessoa e abrir a demanda para ajustar prazo e observação (abrirDemandaGerencia).
Mudança: voltam só as linhas da aba (menu no grupo Equipe, contêiner, mapa do painel, roteador, listas de limpeza, redesenho ao mexer no
prazo, atualização ao vivo e renderEquipeVisao idêntica à anterior); continua escondida para o Chris, como era. As outras abas que a LZ5a
tirou continuam fora.
Testes: J137 — código de hoje 3/6 (sem a aba; Campanhas pela Central não abre, para a Amanda e a Cecília); com as voltas 6/6.
