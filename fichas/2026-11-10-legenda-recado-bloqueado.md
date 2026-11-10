# legenda-recado-bloqueado — recado no lugar da legenda não chega mais à Cecília
Pedido original: "Conteúdo indo para a Cecília sem legenda… explique a causa raiz… se acontece só com conteúdo extra ou antigo… corrija de vez, de modo que o erro humano fique visível e bloqueado até estar certo." (Chris, 09–10/11/2026)
Unidade: U2 de 4 · Tipo: erro
Sintoma: "Place — ✂️ Place — Video telao" (conteúdo extra, sem calendário) chegou à fila de agendamento com legenda "Não precisa de legenda!!!!".
Reprodução: J32 (emulador) — no main o recado é salvo e a postagem vai para aguardando_agendamento; uma postagem antiga com recado aparece como legenda normal.
Causa-raiz: o validador único (gs-legenda-qualidade-i79.mjs, cópia em functions-get/lib) só barra vazio, pontuação e 6 frases exatas. "Não precisa de legenda!!!!" → "nao precisa de legenda" não estava na lista e passou em todas as camadas (salvarLegenda, herança do calendário, Function de agendar). O atalho antigo de demanda "✍️ Escrever legenda" (escritorio ~34870) só checava texto não vazio.
Só conteúdo extra/antigo? Não: acontece em qualquer postagem que cai em "aguardando_legenda" e recebe texto digitado por pessoa (extra, manual, legado sem itemId, item de calendário sem legenda, Stokki). Com calendário vigente e legenda escrita no item, a postagem herda o texto e o erro some — a menos que o próprio item do calendário tenha um recado ("sem legenda", "ok"), que também passava.
Árvore:
RAIZ: legendaUtilizavelI79 / exigirLegendaI79
├─ ESCRITORES: salvarLegenda (Chris), criação manual, herança do calendário (aprovação do cliente), atalho de demanda antiga, Functions programar/guardas/stokki
├─ LEITORES: fila da Cecília (#fila-agendar-i90: camposPendentesI79 → "complete a legenda", botão travado), conferência I78, Portal (legenda do cliente I95), calendário (I95)
├─ PAPÉIS: Chris (escreve), Cecília (agenda), Amanda (arquiva sem postagem)
├─ RULES: sem mudança (rules só checam tamanho; detectar recado nas rules seria frágil)
├─ FUNCTIONS: functions-get/lib recebe a mesma cópia; vale no servidor após deploy (ok nominal do Chris)
└─ LEGADO: postagens já na fila com recado passam a aparecer como pendentes, sem migração nem escrita
Mudança: validador reconhece recado sobre a legenda e anotações curtas (ok, x, teste, n/a, pendente, a definir, sem legenda, legenda depois…), mensagem aponta "📦 Arquivar — não vai ser postado" quando o texto diz que não precisa; atalho antigo usa exigirLegendaI79. Cascata de ?v= (escritorio, portal, calendario=calendarios, i78, i95, stokki-publicacao + lib).
O que NÃO muda: legenda curta real ("OK, chegou a promoção…", "Sem filtro: …" passam), legenda externa aprovada pela Amanda, rules, dados.
Testes: J32 (2 casos, vermelha no main e verde depois); bateria completa desktop + --movel.
Risco residual: um recado com outra redação ainda pode passar — a lista cresce no mesmo ponto único. Servidor só fica igual após deploy de functions-get (pedir ok ao Chris).
