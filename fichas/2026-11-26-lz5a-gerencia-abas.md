# lz5a-gerencia-abas — a Gerência entra no Agora e perde as abas que ninguém usava
Pedido (Chris, 26/11, catálogo da Limpeza 2027 + respostas na caixa de perguntas): apagar Ficha do Cliente, Avaliações/RFV, Conteúdo dos
Portais, Ver ambiente de cada um, Digest WhatsApp, Saúde das Automações e a aba Modo Ausência; "E-mails da Equipe" fica só como acesso;
uma entrada só (hoje a Gerência abria a Central de Comando com o botão "Agora" marcado).
Unidade: LZ5a · Tipo: limpeza (sem escrita em dados, sem rules, sem functions)
Árvore: menu `data-sub` → `setGerenciaSub` → `PAINEIS_GERENCIA_POR_SUBABA` → contêiner `gerenciaX` → render; leitores indiretos:
`SUBABAS_OCULTAS_POR_PESSOA`, as 2 listas de limpeza na troca de identidade, `SUBABAS_QUE_MOSTRAM_DEMANDA`, o despachante de tempo real,
`navegarGerenciaSub`/`irParaGerenciaSub`, a Central de Clientes (botão "Ficha operacional") e o cockpit (cartão 🩺).
Saem: as 7 abas e os contêineres mortos (avaliacoes, rfv, saudeClientes, clientesExtras, exClientes, demandasAtrasadas, gravacoesDoDia,
portalCliente, ausencias, digest, equipeVisao, saudeAutomacoes, comando); o grupo "Clientes" do menu (ficou vazio); a Central de Comando
inteira (render, intervalo de 30 s, presença "Status da Equipe", aprovar/pedir ajuste direto, seções expansíveis) e a tela "Gravações de
Hoje" que só ela abria; o "Panorama completo" escondido no Agora (remontava o cockpit a cada ouvinte); o cartão 🩺 e o botão "Ficha
operacional"; `calcularSaudeCliente`/`calcularResumoSaudeClientes`; o diagnóstico de clientes extras e o histórico de saídas (rota já
redirecionada para a Central de Clientes); `GERENCIA_SUBTABS` (constante morta); o fechamento do lembrete "Digest semanal pronto"
(ninguém cria esse lembrete); a conferência manual "Envio de arquivos" que morava dentro da Saúde das Automações (o módulo
`gs-saude-midia-i166.mjs` fica no repositório, sem quem o importe).
Ficam: `renderPortalClienteAdmin` (tela Portal do Cliente; painel padrão agora `portalGeralConteudo`); `todasAusencias`, `estaAusente`,
`carregarAusencias` (sem registro, ninguém está ausente); a coleção `avaliacoes_clientes` (o portal grava); o e-mail 'digest' da fila
(J23); `htmlCockpitCompleto` (Resumo Executivo e Financeiro) e `htmlPainelOrganizacaoComum` (Início da Amanda); `registrarAtividadeUsuario`
(continua gravando `presenca_funcionarios`, que agora não tem leitor no Escritório — candidato para depois); o atalho antigo 'comando',
que abre o Agora. "E-mails da Equipe" virou "Equipe e acessos" com tudo dentro (cadastro, liberação do login em `usuarios_equipe`,
Júlia/Fernanda, desligamento CP183); o título explica que o e-mail é o que autoriza a entrada.
Entrada: `carregarEntradaGerenciaI104` mostra "Carregando o painel…" no próprio Agora e termina em `setGerenciaSub('agora')` (ou na aba
pendente); se a pessoa já trocou de aba durante a carga, a entrada não a puxa de volta.
Testes: J111 sai (a tela que ela provava saiu). J117 e J118 passo 5 liam o cartão da Central: agora leem o quadro da Aprovações
("demandas esperando você" + "com outra pessoa"); na J117 o esperado é −2 (os 2 avisos "esperando você" nunca entram na Aprovações e
o fechamento deles é o passo 1, no servidor).
Resultado: portão 1–3 verde (sintaxe; handlers quebrados 0, nada novo além da linha de base; 0 divergência nova). Jornadas J01, J109,
J11x, J12x, J15, J37, J58, J117, J118: 123/123 verde; no celular J37, J58, J117, J118: verde. Bateria inteira no CI do PR.
