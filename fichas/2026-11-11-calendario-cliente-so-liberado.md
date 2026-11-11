# calendario-cliente-so-liberado — o link do cliente só lê os meses liberados (CP200, etapa 2 das regras)
Pedido original (literal): etapa 2 combinada na auditoria de 10/11 — "o cliente lê só os meses liberados"; Chris em 11/11 (madrugada): "pode começar agora isso… Não me peça para subir nada, simplesmente suba".
Unidade: etapa 2 da auditoria do percurso · Tipo: ajuste (segurança/privacidade)
Sintoma: o navegador do link do cliente lia `calendarios/{slug}` inteiro — pelo console dava para ver o mês que a equipe ainda monta (ex.: dezembro em revisão interna na Bluefit, Cookiery, Mochi, Place…), comentários internos e campos de planejamento. As gravações do cliente (aprovar, texto, observação, recado) eram feitas pelo navegador direto no documento, presas ao limite de 1000 expressões das rules (o mesmo que derrubou o pedido de ajuste da Zeiss — CP193).
Causa-raiz: a tela filtrava o que mostrar, mas a regra entregava o documento todo.
Árvore:
RAIZ: calendarios/{slug} lido/gravado pelo cliente
├─ ESCRITORES do cliente: calendario.html (aprovarModalClienteI56, salvarTextosClienteI68, registrarObservacaoClienteI35, avisarEquipeDoRecado), portal-cliente.html (aprovarConteudoCalendario) → agora servidor (CP200)
├─ LEITORES do cliente: calendario.html (onSnapshot do docRef + pré-conferência do CP193), portal-cliente.html (carregarCalendario) → agora calendarios_cliente/{slug}
├─ SERVIDOR: functions-get/calendario-cliente-cp200.mjs (cópia + 4 ações), gatilho calendarioLegendaGetCp190 mantém a cópia, CP193 continua igual
├─ RULES: calendarios get/update sem o ramo af(); novo match calendarios_cliente (get do próprio cliente e da equipe; ninguém grava pelo navegador)
├─ CONTRATO: .qa-get/test/client-intake.mjs passa a ler os avisos cp151/i35 no módulo do servidor (mesmo literal)
├─ LEGADO: mês sem competência e calendário antigo seguem as mesmas funções de mês (cópia fiel das I56); conteúdo de mês escondido vira marcador vazio na mesma posição (o CP193 usa a posição)
└─ EFEITO COLATERAL: nenhum para a equipe (Chris/Amanda/Cecília leem e gravam o original como antes)
Mudança: cópia `calendarios_cliente/{slug}` = mesmo formato do calendário, só com mês liberado/arquivado/em revisão com versão publicada; mês escondido fica só com o estado; sem comentário de revisão interna e sem campos internos. A página do cliente continua projetando o retrato (V115) como antes.
Publicação em 2 PRs (lição "código chega antes das rules"): (1) functions + páginas + backfill da cópia; (2) só as rules.
O que NÃO muda: telas e fluxos da equipe; o pedido de ajuste (CP193); avisos de aprovação (CP191 no gatilho).
Testes: J55 nova (leitura só da cópia; aprovação pelo servidor; mês liberado entra na cópia pelo gatilho; original negado no PR 2); J51 mira o original; portão completo desktop + móvel; CI regression-paths.
Risco residual: mês em revisão com versão publicada inclui os conteúdos atuais daquele mês (como antes), porque a página precisa deles para manter as aprovações do retrato.
