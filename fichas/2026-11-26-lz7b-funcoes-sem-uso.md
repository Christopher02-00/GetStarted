# lz7b-funcoes-sem-uso — 41 funções que nada chama e a gravação de presença sem leitor saem do Escritório
Pedido (Chris, 26/11, catálogo Limpeza 2027: cod-morto "68 funções que nada chama" → apagar).
Unidade: LZ7b · Tipo: limpeza (sem rules, servidor ou dados)
Método: listar as declarações de topo do script do Escritório (function, window.x = function) com um parser de JavaScript e contar
cada nome, como palavra inteira, em todo o repositório (Escritório, outras páginas, módulos .mjs/.js, ensaio e .qa-get; fora
node_modules/cdn/vendor). Nome que só aparece na própria declaração = sem uso. Conferido antes: nenhum acesso dinâmico
(window[nome]); nenhuma é ferramenta citada nos documentos (ACUMULO_L1 já marcava decidirEditor como morta). Depois das LZ3–LZ5
sobraram 34; tirar as 34 deixou 6 sem uso e depois 1 (3 rodadas) — 41 no total, ~27 KB.
Saem: contarStreakDiario, castaDoClienteSync, decidirEditor, classificarClienteNovo, abrirTrabalhoPontualI51, obterConfigCliente,
postagemComVinculoDaProducao, definirPrazoVideo, aprovarExtra, configsPrazoCalendarioCliente, renderLegendasDoCalendario,
salvarPrazoCalendarioDaGrade, atualizarStatusIdeia, editar/reposicionar/removerItemConteudoCliente, clientesParecidos,
abrirArquivoClientesUnico, irParaConfirmarPublicacoes, atalhoGerenciaSub, limparAvisosDaFila, normalizarInstanteControle,
diasCivisEntreISO, reconciliarDemandasAlertasCanonicosV135, slugContrato, excluirDemandaDoPainel, conferirRevisaoCalendarioI148,
enviarTodosOsCalendarios, aprovarEEnviarAgora, pedirMaterialAmandaCP122, tempoDesde, aplicarRedirecionamento,
abrirAvisoOperacionalI165, abrirProvidenciasGravacoesCp140; depois contarAbertosPorEditor, perguntarCastaClienteNovo,
definir/perguntarTipoEntregaClienteNovo, carregarLegendasCliente, __normNomeCliente e copiarLegendaCalendario.
Presença: registrarAtividadeUsuario gravava presenca_funcionarios a cada 3 min por pessoa conectada; o único leitor era o
"Status da Equipe" da Central de Comando (saiu na LZ5a). Sai a gravação; os dados antigos e a regra ficam (mexer só com ok do Chris).
Fica para a LZ7c (com o Chris, junto com as rules — P8): rastros de quem saiu (bloco I170 da Gabrielle em 17 pontos + módulo e ação
de servidor; cadastro I118 da Fernanda; listas de identidade que espelham as rules).
Testes: sintaxe, caminhos (0 handler quebrado, nada novo) e duplicatas verdes; 30 jornadas (J01–J06, J08–J10, J12, J16, J19, J20,
J35, J37, J38, J50, J55, J61, J69, J95, J109, J113, J117, J118, J122, J128, J130, J131, J133): 193/193.
