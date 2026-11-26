# lz3c-referencias-capsula-equipe — Referências (tela interna), Protocolo Cápsula, Equipe, Roteiros e a planilha de pedidos saem
Pedido (Chris, 26/11): catálogo Limpeza 2027 (menu-referencias, menu-capsula, menu-equipe, menu-roteiros, menu-pedidos-planilha) —
"No geral ok pode começar".
Unidade: LZ3c (menu, parte 3 de 4) · Tipo: ajuste (remoção)
Prova de desuso (export 25/11): refs_perfil_semana parado desde 29/07; referencias do dia desde 29/10 (tela escondida pelo processo
novo desde 27/10); capsulas_clientes 1 registro sem data; Equipe escondida para todos desde 01/08; Roteiros só redirecionava para a
Central de Calendários; a planilha de pedidos foi substituída pelos pedidos no próprio sistema (outubro).
Árvore (levantamento só leitura, 26/11):
RAIZ: navReferencias/view-referencias (perfis, hub, fora da meta), navCapsulaAmanda/view-capsulaAmanda, navitemEquipe/view-equipe,
      navRoteiros (alias irPara roteiros→calendarios), navPedidosClientes (link externo + CSS)
├─ LEITORES que perdem a parte de referências: indicador "Referências de hoje" (lia a coleção inteira a cada recálculo), atalho do Chris
│  "Referências do dia" e seus contadores, placar de conteúdo (fica só "Calendários do mês"), checklist da Gabrielle (g_d_9, saiu da equipe)
├─ FICAM (conferido): coleções referencias / refs_perfil_semana / referencias_cliente (calendário, agenda do filmmaker, Banco de
│  referências da Central — gs-referencias-cp109.mjs —, Portal do Cliente); semanaRefAtual; aviso "cliente sem postagem" (o texto de
│  cápsula continua; o botão agora leva só ao Postagem Até Quando); pagarTudoDaPessoa, cobrarPessoaWhats, renderEquipeVisao
├─ MUDA DE LUGAR (para não perder operação): o cartão "fora da meta" (único jeito de marcar/desmarcar clientes_config.semConteudoRecorrente;
│  hoje 1 cliente ativo marcado "só edição") vai para Central de Clientes → Saídas, arquivo e reativação, com as mesmas funções
├─ MÓDULOS: gs-ate-quando-postagens.mjs sem o botão do painel da Cápsula; gs-central-unificada-r87.mjs sem navRoteiros/navReferencias
│  (?v atualizados)
└─ REGRA: AGENTS.md (aviso de cápsula) atualizada — a demanda leva ao Postagem Até Quando
Testes: sintaxe e caminhos verdes (1 item da linha de base resolvido); J70 caso (a) reescrito (sem botão da Cápsula, abre o Postagem Até
Quando); J12, J01, J09, J37, J50, J109, J117, J118: 84/84.
