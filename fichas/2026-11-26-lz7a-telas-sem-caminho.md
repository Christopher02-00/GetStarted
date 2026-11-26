# lz7a-telas-sem-caminho — telas sem caminho, fantasmas e ferramentas de console saem; o Acompanhamento fica com o que tem dado
Pedido (Chris, 26/11): catálogo Limpeza 2027 — aba-postagens, aba-calendario-mes, aba-telas-orfas, aba-fantasmas, aba-console ("apagar")
e menu-acompanhamento ("simplificar") — "No geral ok pode começar". Unidade: LZ7a · ajuste (remoção) · sem servidor/rules/dados.
Prova de desuso: "Conteúdo até quando" foi aposentada em 28/07 (só a jornada J69 abria a rota); "Controle editorial" já não existia no HTML (o código só removia nós ausentes);
`badgeAprovar` e o botão "Telas antigas" nunca existiam na tela (`ABSORVIDAS_PELAS_NOVAS = {}`); as ferramentas de console só eram
chamadas à mão (grep em escritorio, módulos, .qa-get e ensaio); V13/V16 devolviam `{suspensa:true}` na 1ª linha; o bloco A do
Acompanhamento lia gravacoes_cliente e calendarios_producao (0 documentos) e o editor I63 nunca foi usado.
Árvore (levantamento só leitura, 26/11):
RAIZ: escritorio.html (abas, telas, contadores e funções de console)
├─ FICAM por decisão do Chris (26/11, depois da correção da evidência do catálogo: as abas apareciam, sem regra que as escondesse):
│  "Todas as Postagens" e "Status Completo" em Legendas e Postagens (aba inicial 'todas' como antes) e "Ver Calendário (clique no
│  dia)" em Gravações — código idêntico ao anterior. Sai só a referência à aba de legendas que não existe (subtabLegendasCalendario,
│  nenhum elemento; atalho 'legendasCalendario', ninguém chama)
├─ SAEM (telas): view-conteudoAteQuando, renderConteudoAteQuando e os 2 gatilhos; a rota 'controleEditorialCalendarios' e
│  irParaControleEditorialCalendarios; as remoções de nav/view inexistentes
├─ FICAM: view-producao (porta real: "Consultar esteira de vídeos" da Central da Cecília) e a caixa/dados/fontesProtegidas da aba Controle
├─ SAEM (fantasmas): atualizarBadgeAprovar e o bloco do badgeAprovar; ABSORVIDAS_PELAS_NOVAS, alternarTelasAntigas,
│  montarBotaoTelasAntigas; comentário velho do navDiarioI118. navMetas: nenhum rastro
├─ SAEM (console): junção de duplicados (fundirClientes, arquivarClienteDuplicado, juntarZeens, arrumarMensalidadesMasterChef,
│  detalharMensalidades, raioXCliente, compararDuplicados), saneamento Zeiss/Zeens, importarContratosIniciais, conciliação antiga
│  de gravação (stubs + botão com podeConciliar=false), V13 e V16 com as 2 entradas do motor e o reparo do boot. FICAM V11/V12 e V102
├─ ACOMPANHAMENTO: sai o bloco A e gs-conferencia-cecilia-i65.js; ficam o seletor (agora só Amanda/Cecília), "O que os filmmakers
│  registraram" (I141) e o histórico (processos_cliente). Portas: atalho amarelo "Controle de gravações" da Cecília mantido (leva ao
│  que ficou); cartão do Início "Registrar gravados" sai (a ação não existe); item c_d_i61_gravacoes com texto e botão novos;
│  Nathan e Luís perdem o item Acompanhamento (a tela só mostrava a eles o bloco A)
└─ REGRAS/TESTES: AGENTS.md ("Até quando" tem uma conta só) e J69 (caso a3: tela + painel; a tela antiga não pode voltar)
Testes: sintaxe, caminhos (4 itens da linha de base resolvidos, regravada) e duplicatas verdes; RPR1 verde; contraprova: a J69 nova
contra o código anterior fica vermelha (5/6, "a tela antiga voltou ao DOM"); jornadas (26: J01, J12, J95, J69, J08, J04, J25, J28, J33, J59, J88, J108, J119, J120, J121, J124, J102, J32, J61, J43, J72, J03, J11, J68, J128, J109): 187/187 no computador e 187/187 no celular.
