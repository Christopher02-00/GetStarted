# ensaio-gancho-e-portao — ambiente de ensaio + portão de jornadas (fundação)
Pedido original (literal): "corrigir o mecanismo, não o bug… construir o detector: emulador + navegador real… me mostrar a bateria passando no main atual e falhando de propósito quando eu sabotar"
Unidade: U1 de 1 · Tipo: novo (infraestrutura de teste) · Autorização: Chris, 08/11/2026 00:55 ("Ok, eu concordo, podemos atuar assim")

## Causa-raiz que esta mudança ataca
Sem portão executável de comportamento (C3/C4 em SITE_GET_02_CAUSA_RAIZ): regressões só apareciam na tela da equipe.

## Árvore de impacto
RAIZ: inicialização Firebase em escritorio.html (getFirestore/initializeAuth)
├─ ESCRITORES: nenhum novo em produção. Em ensaio: seed via REST no emulador (bypass owner), nunca em get-started-4956d
├─ LEITORES: todo o app lê db/auth — em produção, objetos idênticos (gancho só executa em 127.0.0.1/localhost + ?ensaio=1)
├─ PAPÉIS: todos — login no ensaio por e-mail/senha no Auth emulator com email_verified=true (mesmo gate de autorização do app)
├─ RULES: inalteradas; o emulador carrega firestore.rules do repo (as mesmas de produção)
├─ AUTOMAÇÕES: motor roda normalmente no ensaio (cria "Conferência do sistema" pra Amanda — comportamento real)
├─ LEGADO: n/a
└─ EFEITO COLATERAL: 2 imports a mais (connectFirestoreEmulator, connectAuthEmulator, signInWithEmailAndPassword) — tree-shaking não se aplica (CDN), custo zero em runtime

## Mudança
- escritorio.html: +15 linhas (imports + gancho `__ensaio` após `getFirestore` e após `initializeAuth`; `window.__ensaioLogin/__ensaioSair` só no ensaio). Hash antes: 061f302 (main). 
- ensaio/ (novo): lib/emulador.mjs, lib/seed.mjs, lib/navegador.mjs, montar-cdn.mjs, rodar.mjs, explorar.mjs, jornadas/J01, J02, .gitignore, package.json.
- fichas/ (novo): esta ficha.
O que NÃO muda: nenhuma tela, regra, coleção, Cloud Function, portal.

## Testes
- node --check no módulo inline: OK. verificar_caminhos: 0 handlers quebrados (baseline mantido).
- Portão: J01 (8 papéis: login, Início sem erro grave, menu/DOM do papel) + J02 (Chris cria → Cecília encontra/prova → Chris aprova) = 11/11 no main.
- Contraprova (mutante "destinatario:'Amanda'" em criarDemandaModal): sintaxe OK, texto OK, estático OK, **portão vermelho** (1/3). Revertido.
- Ambiente: Chromium headless 1400×900, Firestore emulator 1.22.0 + Auth emulator (firebase-tools 15.35), SDK 10.12.2 empacotado localmente (CDN bloqueada no ambiente Claude; em produção a CDN continua a mesma).

## Achados colaterais (não corrigidos nesta unidade — viram fichas próprias)
- F-01 Minhas Demandas: grupo "Próximos 7 dias" nasce recolhido mesmo com o filtro ativo → contador 2, zero cartões visíveis (bate com E1C do backlog Codex).
- F-02 Rules: `aA()` lê `usuarios_equipe/{email}.excluido` sem `get(...,default)`; doc sem o campo → erro de avaliação → TODAS as leituras negadas pro usuário (sintoma "sumiu tudo"). Em produção os docs têm o campo; é fragilidade latente.
- F-03 Console: negações legítimas de rules (papel sem Gerência) são logadas como `console.error` ("Falha ao checar validade da sessão de gerência", "Não consegui classificar as castas") — ruído que esconde erro real.
- F-04 Nomes: `navMinhasDemandas`/`view-minhasDemandas` = "Minhas Anotações"; "Minhas Demandas" = `navMinhasDemandasAtribuidas`. Armadilha de manutenção.
- F-05 Seed/legado: `prazoData` em DD/MM/YYYY é tratado como atrasado (formato real é YYYY-MM-DD) — confirmar se há docs legados nesse formato em produção.

## Risco residual
Jornadas cobrem 2 de 10 da bateria mínima; Cloud Functions ficam offline no ensaio (ruído filtrado). Portal, calendários, gravações, stories, financeiro ainda sem jornada.
