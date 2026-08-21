# RELATÓRIO V97 — LOGIN GOOGLE COM FALLBACK CONTROLADO

Data: 21/08/2026  
Estado: corrigido e validado localmente; pronto para publicação; não publicado.

## Causa

No navegador interno controlado pelo Codex, o gate V96 chamava `signInWithPopup()` corretamente como primeira operação do clique, mas a janela não permanecia controlável e o Firebase retornava `auth/popup-closed-by-user` antes de conta, usuário, Firestore ou regras. O Safari fornecido pelo usuário autenticou Chris, confirmando que o caminho popup normal continua válido. A indisponibilidade da conexão Codex ↔ Chrome é uma causa externa e não faz parte deste código.

## Solução V97

- `signInWithPopup()` continua sendo a primeira tentativa e a primeira operação assíncrona do gesto.
- Fechamento/bloqueio compatível apenas revela a segunda ação explícita **Entrar nesta aba**; não há redirect automático.
- A segunda ação chama `signInWithRedirect()` diretamente no próprio clique.
- Uma sentinela em `sessionStorage` expira em dez minutos e é limpa em sucesso, cancelamento, erro, timeout e logout.
- `getRedirectResult()` é processado uma vez na inicialização, com timeout e sem loop.
- Popup, redirect e `onAuthStateChanged` convergem para uma aplicação coordenada da mesma identidade, evitando inicialização duplicada.
- Conta não autorizada continua bloqueada pela mesma cadeia existente.
- Nenhuma leitura Firestore anônima foi adicionada; `firestore.rules` e dados operacionais não foram alterados.

## Arquivos da entrega

- `escritorio.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v97-login-google.mjs`
- `scripts/regression-v97-ui-login-google.mjs`
- `RELATORIO_V97_LOGIN_GOOGLE.md`
- `UPLOAD_V97.txt`
- `MANIFESTO_SHA256_V97.txt`
- `rollback_v96/escritorio.html`

## Provas locais

- regressão V97 lógica: 44 verificações;
- regressão V97 UI: 10 cliques/verificações desktop e mobile;
- regressão crítica: 609 asserções;
- regressão V96 operação Chris: 28 verificações;
- regressão V96 UI: 10 cliques/verificações;
- segurança V81: 20 verificações;
- V95 legendas: 15 verificações;
- V74: 37 asserções;
- preflight funcional: build V97, 9/9 scripts inline, handlers, regras e invariantes aprovados;
- limite histórico do preflight: resultado global continua `FAIL` somente pela cópia antiga `regression-critical.mjs` na raiz, incidente conhecido e preservado deliberadamente.

## Negativas cobertas

Popup normal; popup fechado/bloqueado; ausência de redirect automático; segundo clique explícito; clique duplo; redirect retornando, cancelado, expirado, com timeout e erro; sessão existente; conta não autorizada; logout; recarregamento sem loop; UI mobile; ausência de Firestore antes da identidade.

## Integridade e limites

- `firestore.rules` permanece byte a byte igual à V96, SHA-256 `5bd436eed9cc0512674e286e4349051337e1d365b61b62a64ed93a2332109350`.
- calendários permanecem byte a byte iguais à V96 e entre si.
- nenhum Firebase real, dado, GitHub, upload, deploy ou produção foi alterado nesta entrega.
- o incidente “perfil Chris em branco após V96” está registrado separadamente e não foi misturado ao diff V97.

## Rollback

Repor somente `escritorio.html` do diretório `rollback_v96/`, SHA-256 `feffb0ba24eacb97f6ec658a98a63cddc46650cb7039e32be8ffb54a3ef6af9f`. Regras e dados não participam do rollback porque não mudaram.
