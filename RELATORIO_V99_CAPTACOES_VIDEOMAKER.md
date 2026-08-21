# RELATÓRIO V99 — ORDEM EXATA DE CAPTAÇÕES DO VIDEOMAKER

Data: 21/08/2026  
Estado: corrigido e validado localmente; pronto para publicação; produção continua V98.

## Evidência e limite

A captura móvel enviada pelo usuário mostra a sessão `place|2026-08|S02`, responsável Luís, cinco vídeos esperados e zero captações liberadas. Essa imagem comprova o bloqueio visual na produção V98; não comprova o formato do documento real nem autoriza concluir que calendário ou vídeos foram apagados. Nenhum documento Place, Firebase real ou dado operacional foi lido ou escrito durante a V99.

## Causa comprovada no código

O escritor aceitava quantidade positiva e ainda assim persistia uma sessão moderna com `sessaoPlanejamentoVersao:1` e `sessaoItensPlanejados:[]`. O sugeridor também convertia zero itens em quantidade `1`. O leitor respeitava corretamente o snapshot vazio e bloqueava o upload para impedir que o videomaker escolhesse conteúdo de outra sessão.

Havia ainda uma incompatibilidade na fronteira Vital Seg/Helo: a regra documental exige versão 1 **e** array para classificar a sessão como moderna, mas o predicado anterior tratava um único marcador como suficiente. A captura não revela qual desses estados existe no documento Place; a V99 corrige ambos sem migrar dados automaticamente.

## Correção V99

- Sessão moderna exige, numa única função canônica, versão 1 e array; registro com somente um marcador permanece legado isolado no próprio agendamento.
- Snapshot moderno vazio ou malformado permanece moderno e bloqueado; nunca ganha texto livre ou fallback que possa capturar pauta de outra sessão.
- Quantidade deixou de ser autorização. Criação sem títulos exatos falha antes do primeiro `addDoc`, salvo extras explicitamente autorizados com booleano `true`.
- Sugestões assíncronas obsoletas não sobrescrevem cliente, mês, bloco ou quantidade mais recentes.
- Amanda, Cecília e Chris podem abrir o calendário e replanejar a ordem; Luís e Nathan continuam apenas na execução autorizada.
- Replanejamento relê agendamento e calendário dentro de `runTransaction`, compara assinatura e snapshot e recusa clique duplo, retry concorrente ou segunda aba obsoleta.
- Quantidade persistida nunca fica abaixo do número de títulos congelados; valores inválidos de extras são normalizados e valores truthy legados falham fechados.
- Snapshot nulo, sem identidade ou duplicado vira inconsistência explícita, sem derrubar a agenda.
- O fluxo final continua criando os vídeos uma única vez e alterando o agendamento na transação já existente.

Build: `2026-08-21-planejamento-sessoes-v99`  
SHA-256 local de `escritorio.html`: `73b23eda1f3ebe7743a01c58134c1004451c7c2c5d1676df76997e078d90e66a`.

## Provas locais

- regressão V99 de lógica: 75/75;
- regressão V99 de UI real em Chrome headless: 55/55, desktop 1180×820 e mobile 375×812;
- regressão crítica: 610/610;
- V74 criação/idempotência: 37/37;
- V81 segurança: 20/20; calendários: 67/67;
- V87 calendários/operação: 50/50;
- V89 papéis/carteira: 8/8; cadeia visual de calendários: 9/9;
- V90 carteira mensalista: 12/12;
- V95 legendas: 15/15;
- V96 operação Chris: 28/28 lógica e 10/10 UI;
- V97 login Google: 44/44 lógica e 10/10 UI;
- V98 perfil Chris: 21/21 lógica e 12/12 UI;
- preflight funcional aprovou build, 9/9 scripts inline, 990 handlers, regras e invariantes. O único resultado vermelho é a cópia histórica `regression-critical.mjs` na raiz, incidente conhecido que deve permanecer nesta etapa.

As imagens de prova V99 usam somente `Cliente Sintético Alfa` e ficam na memória privada, fora deste pacote.

## Integridade

- `firestore.rules` não mudou: SHA-256 `5bd436eed9cc0512674e286e4349051337e1d365b61b62a64ed93a2332109350`.
- `calendario.html` e `calendarios.html` não mudaram, permanecem idênticos: SHA-256 `9fc8a2266acdf0fa7a122b29fe33c12c304c91cdf83bc94126dc8e7681006a0c`.
- Nenhum dado, regra publicada, GitHub, upload ou deploy foi alterado por esta entrega.
- A sessão real não é regravada automaticamente. Depois do upload, Amanda, Cecília ou Chris precisa confirmar os títulos exatos; só então Luís/Nathan pode concluir o envio.

## Rollback

Para desfazer apenas o código, repor `rollback_v98/escritorio.html`, SHA-256 `af7fb0521aaf1e08b07240407b4ac4bf1d64c901a74261a9e05f23b3a2ec1165`. Isso restaura exatamente a V98, mas reabre o escritor contraditório. Replanejamento ou conclusão já executados em produção não devem ser revertidos apagando documentos; qualquer compensação de dado exige snapshot, alvo e autorização próprios.
