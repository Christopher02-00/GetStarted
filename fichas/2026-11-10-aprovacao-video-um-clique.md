# aprovacao-video-um-clique — aprovar a qualidade do vídeo volta a ser um clique
Pedido original: "Alguns vídeos não conseguem ser aprovados, e eu não quero mais aprovar duas vezes em botões diferentes; prefiro o sistema antigo." (Chris, 09–10/11/2026)
Unidade: U1 de 4 · Tipo: ajuste + erro
Sintoma: "Aprovar" abria um painel e só o 2º botão ("Aprovar a qualidade do vídeo") gravava. Quando a conferência falhava, o 2º botão nem aparecia e a mensagem era genérica ("Não consegui conferir a entrega agora").
Reprodução: J31 (emulador): vídeo com link colado sem https:// → no main o painel trava na conferência (vermelho, 21 s).
História (git): de7962e/4b1fefe (24/10, I165) criaram o painel para a Amanda preencher data/semana/prazo ao aprovar — por isso 2 cliques. 655957d/61dde34 (27/10, CP108) separaram: aprovação de qualidade só do Chris, datas com a Amanda. O painel do Chris ficou sem nenhum campo, só o 2º clique.
Proteção que o 2º passo dá (mantida): a aprovação vale para a versão exata aberta (assinaturaEsperada = JSON canônico do vídeo), recibo idempotente por operacaoId (clique duplo, retry, duas abas), revalidação na transação do servidor (cliente ativo, origem editorial, campanha), link exibido.
Causa-raiz de "não aprova" (front): urlSeguraI165 exigia protocolo; o servidor aceita o texto. Demais recusas são do servidor (origem editorial incompleta, cliente inativo, campanha) e agora aparecem com o motivo real.
Árvore:
RAIZ: aprovarVideo → uiOperacionalI165.tratarAprovacao → criarFluxoAprovacaoI165.abrir/confirmar
├─ ESCRITORES: callable aprovar_video (functions-get/aprovacao.mjs) — sem mudança
├─ LEITORES: lista Aprovar vídeos (Gerência/Central), J04, J31
├─ PAPÉIS: Chris (qualidade). Amanda (orientação com formulário) continua em 2 passos
├─ RULES/FUNCTIONS: sem mudança
└─ LEGADO: link sem protocolo passa a ser lido como https://
Mudança: gs-operacional-ui-i165.mjs — tratarAprovacao confirma na sequência quando o estado é "pronta" e fluxoCp108==='qualidade_chris' e papel Chris; urlSeguraI165 aceita domínio sem protocolo; mensagem de recusa com o motivo do servidor. ?v= atualizado no escritorio.html.
O que NÃO muda: servidor, rules, recibo, orientação da Amanda, "Pedir ajuste", aprovação do cliente.
Testes: J31 nova (vermelha no main, verde depois); J04 sem o 2º clique; bateria completa desktop + --movel.
Risco residual: vídeos recusados pelo servidor (origem editorial legada) continuam recusados — agora com o motivo visível. Relaxar essa regra é mudança de Function (ok do Chris).
