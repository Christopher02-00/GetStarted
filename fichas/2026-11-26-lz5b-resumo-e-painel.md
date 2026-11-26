# lz5b-resumo-e-painel — Resumo Executivo e Painel da Amanda só com o que não existe em outra tela
Pedido (Chris, 26/11, catálogo da Limpeza 2027: "simplificar"): manter o que é único, tirar o que repete a aba Agora da mesma pessoa
ou conta por outra regra; dar casa à conferência manual "Envio de arquivos" (I166), que saiu com a Saúde das Automações na LZ5a.
Unidade: LZ5b · Tipo: limpeza (sem escrita em dados, sem rules, sem functions; a ação `conferir_saude_midia_i166` fica igual)
Árvore: `setGerenciaSub('chris'|'amanda')` → `renderGerenciaChris` → `montarCockpitEm` (também `htmlCockpitCompleto` → Financeiro,
"Carregar o Resumo Executivo", com `organizacao:false`) · `renderGerenciaAmanda` (também redesenhado por `carregarGerencia` e pelo
aprovar/recusar pular legenda); Aprovações → "Outras decisões" abre o painel; J69 chama `htmlPostagemAteQuandoResumo`; J109 lê o Radar.
Resumo Executivo — ficam: O que a Amanda decidiu (Chris), até quando cada cliente tem postagem (não está no Agora; o Chris pediu em
28/07), pedido(s) pelo site em aberto (LZ6), Radar de Perdas, Backup completo e, logo depois, "Envio de arquivos" (só Chris real; mesmo
`import()` com `?v=ea6ffff1…`, `cont.__saudeMidiaI166.destroy()` a cada redesenho). Saem: semáforo e cartão "atrasadas no time" (= Agora
"demandas atrasadas" / "Travado agora — por pessoa"), placar "Calendários do mês" (= Agora "Calendários no ar"/"Cliente sem nada
montado"; "em montagem" fica na Central de Calendários), cartão de extras (só a folha do mês do relógio; o Agora usa `extrasExigiveisAte`)
e de vídeos atrasados (prazo inventado; o Agora usa `videoAtrasado`) — com eles, a leitura inteira de `pagamentos_extra` do cockpit.
Painel da Amanda — ficam: "somente edição — registros enviados" (não está no Agora: o vídeo nasce `aguardando_encaminhamento`, fora do
"Sem editor"), "você resolveu hoje" (único; a regra é corrigida na LZ5c), pedidos para pular legenda (só aqui), Radar, reatribuição rápida,
ok final das referências. Saem: pedidos de prazo e demandas esperando aprovação (mesmos botões do "Esperando você decidir" do Agora e da
Aprovações), o resto do "Como está o dia", disciplina (Início + "Conferir checklists"), os 3 cartões, "Por funcionário" (Demandas →
Equipe), "Criar nova demanda" (botão 📌; a forma antiga deixava escolher "quem pede"), organização (calendários, até quando e extras:
telas próprias), carga por editor (= "Resumo por editor" da distribuição) e "Vídeos por cliente" (data da gravação). O Chris vê só
"N pedido(s) para pular legenda esperando a Amanda". O atalho da Aprovações passa a dizer "Ver pedidos para pular legenda".
Telas de detalhe sem número que as abra: "Atrasos da Equipe" e "Demandas que Eu Enviei" saem (contêiner, roteador, listas de limpeza,
redesenhos); "Que eu enviei" continua em Minhas Demandas. Funções sem uso que saíram: `calcularSemaforoAgencia`, `renderAtrasosEquipe`,
`renderMinhasDemandasEnviadas`, `criarDemanda`, `gerarHtmlVideosPorCliente`, `renderDisciplinaHojeHtml`, `htmlPlacarConteudo`,
`htmlResumoExtrasGestao`, `htmlPainelOrganizacaoComum`, `htmlExtrasAtrasadosPagamento`, `agruparEmFamiliasHtml`, `abrirPainelAtrasos`/
`abrirPainelDemandas`. Ficam `calcularDisciplinaHoje`, `corrigirDemandasAvisoAntigas` (motor) e `htmlPostagemAteQuandoResumo` (J69).
Teste: J133 (nova) — Resumo do Chris (fica/sai, conferência logo depois do backup), redesenho não duplica a conferência, Financeiro sem
ela, Painel da Amanda (pular legenda com Aprovar/Recusar, fica/sai), Resumo da Amanda sem a conferência.
Resultado: portão 1–3 verde (sintaxe; handlers quebrados 0, nada novo além da linha de base; 0 divergência nova). Jornadas J01, J02,
J10x, J12, J16, J37, J54, J69, J109, J117, J118, J133: 74/74 verde; no celular J01, J12, J37, J109, J117, J118, J133: 35/35 verde.
