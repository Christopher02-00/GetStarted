# V115 — continuidade de calendários, gravação, vídeos e aprovação

## Resultado

A V115 corrige uma causa transversal que fazia o calendário parecer apagado depois de um pedido de correção e podia ligar uma sessão de gravação ao mês errado. A correção é cumulativa sobre V114/V113 e preserva a transferência de legendas, regras estreitas, papéis e Financeiro.

## Causa comprovada

O pedido do cliente movia corretamente a competência publicada para `ajuste_interno`, mas o calendário direto e o Portal renderizavam somente competências `liberado`. O documento e os itens permaneciam no banco; a apresentação os trocava por `0/0` e “calendário em produção”. O defeito atingia qualquer cliente que pedisse correção, não apenas Bluefit.

Na gravação, o mês da sessão podia continuar derivado da data do evento mesmo quando a pauta pendente já estava na competência seguinte. No retrato da Mochi, o sistema encontrou agosto e seus nove itens, mas classificou tudo como resolvido. Sem a competência correta, os `calendarItemId` não percorriam sessão, vídeo, postagem e legenda.

## Alterações

1. Cada publicação da Amanda conserva no próprio marcador mensal um retrato estreito dos itens entregues ao cliente.
2. Durante `ajuste_interno`, calendário direto e Portal mostram a última versão publicada em modo de consulta. O cliente não aprova de novo nem vê a edição interna incompleta.
3. Calendários que já estavam em ajuste antes da V115 permanecem visíveis e recebem o retrato na primeira gravação segura da equipe, antes de sobrescrever os itens.
4. Agendamento novo compara a competência selecionada com as pendências reais. Se o mês estiver resolvido e outro tiver pauta, sugere o correto e para antes de `addDoc`.
5. Replanejamento sempre confirma competência e bloco, dentro do contrato transacional já existente.
6. Luís/Nathan recebem `Abrir minha sessão e lançar os vídeos` no cartão autorizado. A mesma sessão mostra pauta, referências e baixa; não declara “tudo gravado” quando o mês diverge.
7. Referências do modo operacional, calendário direto e Portal recebem HTTPS quando o link válido veio sem esquema; esquema perigoso ou destino inválido gera mensagem explícita para equipe e cliente.
8. Gabi conclui com `Enviar para Amanda revisar e publicar`.
9. Amanda encontra a fila em `Calendários → Revisar e enviar`. Cada cartão tem uma única porta principal: `Revisar e enviar ao cliente`. Roteiro, legenda, referências, comentário, devolução e publicação ficam no painel expandido.

## Proteções

- `calendario.html` e `calendarios.html` continuam idênticos byte a byte.
- O cliente não ganhou novo campo de escrita; `firestore.rules` permanece byte a byte V114/V113.
- A correção não associa conteúdo por nome ou título.
- Filmaker recebe somente sessões e clientes atribuídos, não carteira ampla, Financeiro ou calendário de terceiros.
- A V114 de legenda continua exigindo cliente + `calendarItemId` + vídeo/postagem canônicos.
- `financeiro-core.mjs`, `financeiro-ui-v103.mjs` e `financeiro-ui-v104.mjs` ficaram byte a byte V114.
- Nenhuma escrita real, push, deploy ou Firebase de produção ocorreu nesta preparação.

## Provas locais

- V115 focal: 31/31; UI focal de referências: 10/10 em Chromium desktop/mobile.
- V114 legenda: 28/28; Chromium real: 19/19.
- V113 ajuste: 23/23; Chromium real: 26/26.
- Firestore Emulator V113: 15/15, `expression_limit_hits=0`.
- V99 captação: 80/80; Chromium desktop/mobile: 57/57.
- V112 Gerência/Amanda: 19/19; Chromium real: 27/27.
- V89 carteira e cadeias de calendário: 8/8 + 16/16 em Chromium.
- V87 Calendários/operação: 50/50.
- V110 privacidade: 49/49.
- Regressão crítica: 610/610.

Os testes de navegador cobriram desktop/mobile, clique duplo, retry, `permission-denied`, falha versus vazio, item moderno/legado, fluxo Gabi → Amanda → cliente, captação e os papéis da Amanda. Os Emulators usaram projeto `demo-*` e não acessaram produção.

## Estado e validação posterior

Estado desta entrega: corrigida, validada e empacotada localmente. Ela só estará em operação depois do upload do pacote e da comprovação do build V115. Como `firestore.rules` não mudou em relação à V114/V113, não se repete a publicação se o hash `66bed60400f8ed73c524cb65e9524729e957788e43dad35cb4a00bbca398fa47` já estiver ativo. Se a produção ainda estiver na regra V112, a regra do pacote precisa ser publicada na mesma janela.

Depois do upload, validar sem inventar dados: Bluefit continua vendo o calendário durante o ajuste; Gabi edita o item solicitado e o envia; Amanda o encontra na fila única; Luís/Nathan abrem uma sessão atribuída na competência correta; uma legenda real já autorizada reaparece na fila exata da Cecília.

## Rollback

`rollback_v114` é reserva local e não entra no GitHub. Ele preserva os quatro HTMLs substituídos e os testes cumulativos alterados. Reverter frontend não deve apagar retratos ou desfazer estados operacionais legítimos que tenham sido gravados depois da publicação.
