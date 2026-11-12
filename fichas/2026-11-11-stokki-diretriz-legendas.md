# stokki-diretriz-legendas — legendas da Stokki por rede estratégica, seguindo o manual da Andrea (CP204)
Pedido original (literal): Chris, 11/11 (print da Amanda): "As legendas da stokki o site tem colocar bem certinho pra cada plataforma que ele identifique que seja estratégico postar. - As legendas da stokki devem seguir essa diretriz se puder passar pra IA salvar daí não tem erro tbm" + PDF "Manual de transição e diretrizes de conteúdo — Stokki WMS".
Unidade: 2 de 3 do pedido de 11/11 à tarde · Tipo: ajuste
Sintoma: revisão da Amanda no editor (I172) mostrava "Sem legenda informada para esta plataforma." nas quatro redes — o conteúdo só tinha a legenda geral; nenhuma regra da Andrea existia no site; não havia IA no site.
Árvore:
RAIZ: legendas da Stokki (legenda + legendaInstagram/Tiktok/Youtube/Linkedin)
├─ ESCRITORES: editor I172 (Chris) → functions-get/editorial-calendarios-i172.mjs; planejamento CP109 → planejamento-estrategico-cp109.mjs; postagem (Chris/Fernanda) → stokki-publicacao.mjs prepararLegendas + legendas-stokki-i165.mjs; correção por rede → stokki-publicacao.mjs alterar('corrigir_legenda')
├─ LEITORES: editor I172 (leitura da Amanda), formulário da postagem (Chris), painel da Cecília, calendário do cliente (gs-legenda-cliente-i95)
└─ EFEITO: cascata de ?v= (stokki-publicacao → escritorio/portal/gs-legenda-cliente-i95 → calendario(s).html; editor I172 → escritorio)
Mudança: gs-diretriz-legenda-stokki-cp204.mjs (cópia idêntica em functions-get/lib): dica por rede, bloqueio de "chão de fábrica"/"gôndola", avisos (armazém, 5 hashtags no Instagram, link no LinkedIn/YouTube, capítulos no YouTube, link no perfil no TikTok). Bloqueio aplicado em: editor I172 (servidor), CP109 (servidor), postagem (tela e servidor, mesmo módulo), correção por rede. Formulário da postagem já marca as redes estratégicas = redes com legenda própria no calendário (diferente da geral herdada). Editor mostra dica e avisos; rede sem legenda própria diz que segue a geral. "Passar pra IA": docs/diretrizes/stokki-legendas-para-ia.md, texto pronto para o conhecimento do projeto de conteúdo (o site não tem IA).
O que NÃO muda: outros clientes; textos já salvos (a regra vale para a próxima gravação).
Testes: J25 passo 1b — "gôndola" na legenda do Instagram é recusada e a postagem continua aguardando legenda (vermelho no main, verde aqui); J25 inteira segue verde.
