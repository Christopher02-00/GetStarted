# lz3e-campanhas — o quadro de Campanhas sai do Escritório; o aviso diário de datas de campanha fica
Pedido (Chris, 26/11): catálogo Limpeza 2027 (menu-campanhas) — "No geral ok pode começar".
Unidade: LZ3e (menu, parte 5 — última) · Tipo: ajuste (remoção)
Prova de desuso (export 25/11): último registro do quadro em 29/10; a tela estava escondida pelo processo novo (27/10) para Chris,
Amanda e Cecília.
Árvore (levantamento só leitura, 26/11):
RAIZ: navAcompCampanhas/view-campanhas + módulo do quadro (58 declarações: kanban, editor, prazos, exclusão I60, envio I7, badge I104)
├─ FICAM (fecho calculado a partir do aviso I153): ETAPAS_CAMPANHA, PODE_VER_CAMPANHA/podeVerCampanha, campHojeI7, campMapaI7,
│  campStatusValidoI7, mesCampanha, campServidorI7, campFonteI7, campLegadoI7, campPostLegadoI7, normalizarCampanhaMensal,
│  statusAutomaticoPostCampanha e as funções I153 (contexto, grupos, sessão, sincronizar, conferir) — Amanda e Cecília continuam
│  recebendo "📅 Conferir a programação — campanha · data"; o cartão de origem perde só o botão "Abrir campanha desta conferência"
├─ FICAM no servidor e em outras telas: coleção campanhas (fontes.mjs exige o documento vivo no agendamento — nunca arquivar/apagar),
│  criação pelo planejamento (CP120), "Faz parte de alguma campanha?" na aprovação, data de campanha como sugestão para a Cecília (J124)
├─ MÓDULOS: gs-planejamento-estrategico-cp109.mjs — a Visão do mês só desenha "Abrir campanhas existentes"/"Abrir mesma campanha" se
│  receber abrirCampanhas (o Escritório não entrega mais; antes o clique dava erro); gs-central-unificada-r87.mjs sem "Campanhas e
│  datas" e sem navAcompCampanhas (?v atualizados)
├─ SAEM também: ouvinte em tempo real do badge de campanhas (onSnapshot da coleção inteira) e as duas paradas dele
└─ REGRAS: AGENTS.md (DOM exclusivo e regra do quadro) atualizado
Testes: sintaxe, caminhos e duplicatas verdes; RPR1 verde; jornadas J105, J106, J124, J01, J12, J37, J109: 75/75.
