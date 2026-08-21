# RELATÓRIO V98 — RESTAURAÇÃO DA VISÃO NORMAL DO CHRIS

Data: 21/08/2026  
Estado: corrigido e validado localmente; pronto para publicação; não publicado.

## Publicação V97 comprovada

Depois do relato de upload, `escritorio.html` público foi comparado byte a byte com o pacote V97. O build público é `2026-08-21-login-google-redirect-v97` e o SHA-256 público/local é `2ce8a248b4decbd494287b034b510ed7b41d86cd1179c12c0c1ddc35ce3d0c3c`. Relatório, instrução e manifesto V97 também coincidem. Os calendários públicos continuam idênticos, SHA-256 `9fc8a2266acdf0fa7a122b29fe33c12c304c91cdf83bc94126dc8e7681006a0c`.

O navegador interno reconheceu a sessão, mas a inicialização publicada registrou:

`ReferenceError: atualizarBannerAuditoriaChris is not defined`

em `window.mudarUsuarioGlobal()`, antes da reconstrução do menu e das leituras operacionais.

## Causa comprovada

A V95 possuía o modo de auditoria somente leitura e a função `atualizarBannerAuditoriaChris()`. A V96 substituiu esse fluxo pelo modo de operação real, definiu `atualizarBannerOperacaoPerfilChris()` e atualizou entrada/saída, mas deixou uma chamada antiga dentro de `mudarUsuarioGlobal()`. A V97 herdou a chamada sem relação com o fallback de login.

O erro acontece depois de `usuarioAtual = escolhido` e antes de remover `body.semUsuario`, isolar o DOM, iniciar listeners ou alcançar a primeira leitura remota. Por isso o seletor mostra Chris, a sidebar continua escondida e o toast de carga parcial aparece. Esse caminho não apaga documentos; a perda de dados relatada visualmente não foi comprovada.

## Correção V98

- Substituída uma única chamada residual por `atualizarBannerOperacaoPerfilChris()`.
- Build atualizado para `2026-08-21-restaura-perfil-chris-v98`.
- Preservados integralmente o popup/fallback V97, a identidade real, o papel operado e o log delegado V96.
- Nenhuma regra, calendário, coleção, campo ou dado operacional foi alterado.

SHA-256 local V98 de `escritorio.html`: `af7fb0521aaf1e08b07240407b4ac4bf1d64c901a74261a9e05f23b3a2ec1165`.

## Provas locais

- reprodução do pacote V97: `ReferenceError` no identificador antigo antes do menu;
- regressão V98 lógica: 20/20;
- regressão V98 UI: 12/12 em desktop/mobile, Chris normal, delegação e retorno idempotente;
- regressão crítica: 610/610;
- V97 login/fallback: 44/44 lógica e 10/10 UI;
- V96 operação Chris: 28/28 lógica e 10/10 UI;
- segurança V81: 20/20;
- V95: 15/15; V74: 37/37;
- preflight funcional: build V98, scripts inline, regras e invariantes aprovados;
- scanners e prontidão Get 2.0 executados depois do empacotamento.

O preflight global preserva o único bloqueio histórico conhecido: a cópia antiga `regression-critical.mjs` na raiz. Ela não foi removida nesta causa.

## Evidência visual

- Antes, produção V97: captura Safari do usuário com Chris confirmado, sidebar vazia e toast de falha.
- Depois, local sintético V98: `03_MEMORIA_E_REGRAS_ATUAIS/04_OPERACAO_GET_2_0/evidencias/V98_CHRIS_DEPOIS_LOCAL_SINTETICO.png`, SHA-256 `37683a791f304ac983939d46ebd27f46d66737b122e3d8d05a3eef9e998a346e`.

A imagem posterior é marcada como dado sintético e prova a reconstrução visual local; não é captura de produção.

## Integridade e limites

- `firestore.rules` permanece SHA-256 `5bd436eed9cc0512674e286e4349051337e1d365b61b62a64ed93a2332109350`.
- `calendario.html` e `calendarios.html` permanecem byte a byte idênticos à V97/V96.
- Nenhum Firebase real, GitHub, upload, deploy, restauração ou migração foi feito pela correção V98.
- A inspeção autenticada apenas recarregou a página publicada. O código existente pode sincronizar autorizações com `setDoc(...,{merge:true})` em `usuarios_equipe`; esse efeito preexistente não foi alterado nem usado como prova de dados.
- A V98 só poderá ser chamada de comprovada publicada depois do upload e da jornada real Chris → menu completo → recarga → delegação → retorno.

## Rollback

Repor `rollback_v97/escritorio.html`, SHA-256 `2ce8a248b4decbd494287b034b510ed7b41d86cd1179c12c0c1ddc35ce3d0c3c`. Esse rollback recupera exatamente a V97 publicada, mas reabre o incidente da tela vazia; usar somente se a V98 introduzir problema mais grave. Regras e dados não participam do rollback.
