# lz3b-telas-paradas — Desafio do Mês, Get Academy, Direção de Filmagem, Análises mensais e Registro do dia saem do Escritório
Pedido (Chris, 26/11): catálogo Limpeza 2027 (menu-desafio, menu-academy, menu-direcao, menu-analises, menu-diario, ini-direcao,
ini-analises, ini-guia-amanda, ger-desafio) — "No geral ok pode começar".
Unidade: LZ3b (menu, parte 2 de 3) · Tipo: ajuste (remoção)
Prova de desuso (export 25/11): desafios_ciclos parado desde 02/10, ranking 17/09; get_academy 4 docs (31/08); direcao_filmagem 20/10;
analises_mensais_i108 2 docs (30/09); diario_equipe_i118 1 doc (08/10, Júlia, desligada).
Árvore (levantamento só leitura, 26/11):
RAIZ: navDesafio/view-desafio (+ Gerência funcionarioMes), navGetAcademy/view-getAcademy, navDirecao/view-direcao (+ Início direcaoInicioI101,
      avisos I113 da Amanda, aba "Direção e conteúdos Get" da rotina do Luís), navAnalisesI108/view-analisesMensais (+ Início, área
      "Resultados e análises" da Central R87), navDiarioI118/view-diarioEquipe (+ Início, demandas da Júlia I162, guia I163, atalhos I160)
├─ MÓDULOS que saem do repositório: gs-desafios-i99.mjs, gs-direcao-filmagem-i101.mjs, gs-analises-mensais-i108.mjs, gs-diario-equipe-i118.mjs
│  (cada um importado só pelo próprio controlador)
├─ OUVINTES que deixam de abrir: avisos I113 da Amanda (direcao_filmagem + agendamentos), painéis de Direção e Análises a cada Início
├─ FICAM (conferido): planejarSessaoGravacao / avaliarPlanejamentoSessaoParaPersistir (CP273, filmmaker abre sessão), FUNCIONARIOS_ELEGIVEIS,
│  getAnteriorLuisI102 e a rotina do Luís (agora: 1 · Rotina de filmmaker, 2 · Demandas pontuais), gs-planejamento-social-i155 (lê análises
│  antigas), regras e coleções (dados guardados); servidor: o gatilho acompanhamentoAnaliseGetCp205 fica ocioso (sem análise nova)
├─ LISTAS limpas: rotaGabiI170, Fernanda, VISIBILIDADE_POR_FUNCAO, ITENS_CONTROLADOS, DIA_A_DIA, ITENS_UNIVERSAIS, ITENS_OCULTOS, navMetas
│  (fantasma), SUBABAS/mapa/roteador/listas de limpeza da Gerência (funcionarioMes), cartão "Desafio do Mês" do Painel Operacional
└─ OUTROS: gs-central-unificada-r87.mjs sem a área "resultados" (?v atualizado); .qa-get/test/nav.mjs sem o stub podeSairDiarioI118
   (as 4 chamadas saíram junto); J24 sem o caso do Get Academy
Testes: sintaxe e caminhos verdes; RPR1 (nav) verde local; jornadas J24, J26, J01, J09, J12, J128 (filmmaker abre sessão), J113, J95: 78/78.
