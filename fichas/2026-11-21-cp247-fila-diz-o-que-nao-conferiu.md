# cp247-fila-diz-o-que-nao-conferiu — a fila de programação diz quais conteúdos não conferiu, por quê, e abre cada um

Origem: o robô de cliques J98 (Programa Estabilidade), na bateria do CI do PR #181. Depois de 113 e 92 cliques, a tela Postagens da Amanda e da
Cecília mostrava "Não consegui conferir 4 conteúdo(s). A fila e os campos anteriores foram mantidos.": sem dizer quais, nem por quê, nem o que fazer.
Unidade: única · Tipo: defeito de tela (estado sem saída)

Diagnóstico (emulador, transação só leitura):
- 3 postagens agendadas das jornadas J69 e J70 têm a origem editorial incompleta: tem o conteúdo, falta o calendário e o mês;
- a conferência do servidor (`fontesPostagemTxI165`) recusa com "Confira os três identificadores da origem editorial.";
- o servidor (`consultarOperacionaisI165`) devolvia só o código e um texto genérico, e a tela mostrava só a contagem.

Produção (exportação de 21/11, só leitura):
- 165 das 209 postagens ativas passam na mesma conferência;
- as outras 44 dependem da data de criação física (`createTime`), que a exportação não traz;
- quem confere essas 44 nos dados reais é a regra D5 do vigia.

Correção:
- `functions-get/leitores-operacionais.mjs`: cada erro leva o título, o cliente e o motivo real (as mensagens de `exigirI165` já são texto para a equipe).
- `gs-operacional-ui-i165.mjs`: lista cada conteúdo não conferido ("cliente · título — motivo") com o botão "Abrir este conteúdo na fila", que já existia.
  - Os hashes foram atualizados em `gs-postagem-controles-i165.mjs` e `escritorio.html`.
- Vigia da operação: a regra D5 roda a mesma conferência, em transação só leitura, para cada postagem ativa real, e acusa em vermelho.

Árvore:
RAIZ: leitura "Compromissos da programação" (I165) com conteúdo que o servidor não confere
├─ ESCRITORES : nenhum (leitura); o servidor só acrescenta campos ao erro
├─ LEITORES   : `anexarLeitura` (fila da Cecília/Amanda/Chris em Postagens; fila de edição usa o mesmo erro)
├─ PAPÉIS     : Cecília, Amanda, Chris (postagem); editores (edição, mesmo formato)
├─ RULES      : sem mudança
├─ AUTOMAÇÕES : vigia da operação (D5)
├─ LEGADO     : a resposta continua com `mensagem`, então telas antigas seguem funcionando
└─ EFEITO     : a pessoa sabe qual conteúdo, por quê, e abre a ficha

Testes:
- J101:
  - contraprova no código anterior: caso 1 vermelho, "lista NÃO · botão NÃO · AINDA 'Não consegui conferir'";
  - verde: 2/2. A lista com o motivo abre a ficha, e o vigia acusa D5 em vermelho.
- J98 (robô): de vermelho para 7/7 sem erro.

Publicação: Functions (ok geral do Chris para publicar Functions, 20/11) + site.
