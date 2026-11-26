# lz3a-telas-de-apoio — Contatos e mensagens, Relatório Mensal, Manual, Bit e Arquivo de Entregas saem; Central de Vídeos sem botões repetidos
Pedido (Chris, 26/11): catálogo Limpeza 2027 — "esses 12 acredito que nenhum é funcional mais pode apagar" (menu-contatos-msg, menu-relatorio,
menu-manual, menu-bit, menu-arquivo) + "No geral ok pode começar" (menu-central-videos: simplificar).
Unidade: LZ3a (menu, parte 1 de 3) · Tipo: ajuste (remoção)
Árvore (levantamento só leitura, 26/11):
RAIZ: navMensagensClientesChris/view-mensagensClientesChris, navRelatorio/view-relatorioMensal, navManualFuncao/view-manualFuncao,
      navDuvidasBit/view-duvidasBit, navArquivoEntregas/view-arquivoEntregas
├─ ESCRITORES: contatos → contatos_clientes_financeiro (salvarContatoFinanceiroCliente, migração legada); as outras só leem
├─ LEITORES  : o próprio escritório; nenhum módulo, portal, calendário ou servidor
├─ HUMANOS   : Chris (contatos), gestão (relatório), todos (manual, Bit, arquivo)
├─ LISTAS    : rotaGabiI170, aplicarMenuGabiI170, __sidebarExclusivos, VIEWS_SO_CHRIS, lista Fernanda, VISIBILIDADE_POR_FUNCAO,
│              ITENS_CONTROLADOS, idParaId do irParaAtalho — todas limpas
├─ OUVINTES  : 3 onSnapshot inteiros de Chris (clientes_encerrados, clientes_config, contatos_clientes_financeiro) saem
└─ FICAM     : numeroWhatsAppBrasil, contatoLegadoPorIdentidade, urlWhatsAppWeb, abrirArquivoClientesUnico (Régua/Central); coleção
               avaliacoes_clientes; mascote Bit (não é o FAQ)
Saída que não pode sumir: corrigir o WhatsApp salvo de um cliente — vai para a Régua de Cobrança ("Corrigir o número do WhatsApp",
mesmo salvarWhatsRapido com recibo); texto da Central de Clientes atualizado; AGENTS.md (regra dos telefones) reescrita.
Central de Vídeos: medida — tem badge próprio, agenda dia a dia da equipe e 0 leituras; fica. Sai só o cartão "O resto continua onde
sempre esteve" (Aprovações/Extras já estão no menu).
Acompanhamento: fica para a LZ7 (o bloco de gravações é vazio na prática, mas tem portas da Cecília e jornadas J01/J95 que conferem).
Testes: sintaxe e caminhos verdes (0 handler quebrado; nada novo além da linha de base); J12 (volta no menu inteiro), J01, J09: 66/66.
