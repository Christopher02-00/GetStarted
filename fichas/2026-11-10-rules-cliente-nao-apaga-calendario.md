# rules-cliente-nao-apaga-calendario (CP199) — o link do cliente não apaga conteúdos nem comentários
Pedido: achado B da auditoria (ponta do cliente). Ok do Chris (10/11, no chat): "Sim, pode" mexer nas rules para fechar o link do cliente.
Unidade: unidade das rules, etapa 1 · Tipo: erro (segurança)
Sintoma: a regra de update de `calendarios/{slug}` para a sessão de cliente (`af()&&bC(...)`) só exigia `y5().hasOnly(['items','comments','updatedAt'])`. Pelo console, quem tem o link do cliente podia regravar a lista inteira: apagar conteúdos, acrescentar, zerar os comentários.
Reprodução: emulador. A J51 tenta pelo console da página do cliente (`__fb.setDoc`) apagar um conteúdo e zerar os comentários. No código antigo as duas gravações são permitidas (vermelha).
Mudança (`firestore.rules`, bloco `match/calendarios/{AP}`): a função `clienteNaoApagaCp199()` exige o mesmo número de `items` e `comments` maior ou igual ao anterior, no ramo do cliente. São só 2 comparações de tamanho, porque o limite de 1000 expressões já é apertado neste documento (ver CP193).
Árvore:
RAIZ: regra de update de calendarios no ramo da sessão de cliente
├─ ESCRITORES LEGÍTIMOS: aprovar (I56), texto (I68), observação (I35), recado (CP151), sugestão. Todos mantêm o número de itens e só acrescentam ou editam comentários
├─ JÁ NO SERVIDOR: pedido de ajuste (CP193). A regra dd() fica para compatibilidade
└─ FORA: modo equipe, Chris/Amanda, Functions (admin)
O que NÃO muda: o que o cliente pode fazer na tela. A leitura do documento inteiro (meses futuros) fica para a etapa 2 (projeção servida pelo servidor).
Publicação: o merge no main publica as rules pelo workflow `publicar-rules.yml`. Guardar o id do ruleset. O rollback é o revert do PR.
Testes: J51 (nova, vermelha → verde, negações esperadas no sentinela) + J20/J34/J35/J38/J42 (ações legítimas) + portão completo.
