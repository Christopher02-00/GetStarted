# Get Started — entrega V76

Data: 17/08/2026  
Base funcional: `2026-08-17-valor-ativacao-reativacao-v75`

## Escopo

- Remover as duas suítes antigas que ainda existiam na raiz do repositório.
- Manter como fontes oficiais somente `scripts/preflight.mjs` e `scripts/regression-critical.mjs`.
- Impedir que um upload completo volte a introduzir as cópias antigas.
- Revisar novamente as entregas V71 a V75 e o comportamento público do site em desktop e mobile.
- Eliminar uma leitura da carteira operacional que o teste real mostrou acontecer antes da autenticação.

## Alterações

- Removidos `preflight.mjs` e `regression-critical.mjs` da raiz.
- Removidas de `_config.yml` as exclusões que mencionavam os dois arquivos inexistentes.
- `scripts/preflight.mjs` agora falha se qualquer uma das cópias antigas reaparecer.
- Criado `scripts/regression-v76.mjs` para verificar fonte única das suítes e preservar a compatibilidade intencional entre `calendario.html` e `calendarios.html`.
- A regra de manutenção foi registrada em `AGENTS.md`.
- Removidas as chamadas soltas de `carregarClientesExtras()` e `renderFuncionarioMesInicio()` executadas durante a carga do módulo. Carteira e funcionário do mês agora carregam no ponto protegido de `mudarUsuarioGlobal()`, depois da sessão autenticada.

## Validação local

- `node scripts/regression-v71.mjs`: 18 asserções aprovadas.
- `node scripts/regression-v72.mjs`: 50 asserções aprovadas.
- `node scripts/regression-v73.mjs`: 28 asserções aprovadas.
- `node scripts/regression-v74.mjs`: 34 asserções aprovadas.
- `node scripts/regression-v75.mjs`: 37 asserções aprovadas.
- `node scripts/regression-v76.mjs`: 12 asserções aprovadas.
- `node --experimental-vm-modules scripts/regression-critical.mjs`: 608 asserções aprovadas.
- O primeiro preflight recusou corretamente a entrega enquanto este relatório ainda estava ausente; depois de completar o artefato, a suíte foi executada novamente.

## Verificação no site publicado

- O site público, o Escritório, o cadastro, o Portal e os dois endereços de calendário carregaram em `get-started.agency`.
- O Escritório publicado contém o build V75; a correção de autenticação V76 está no pacote local e só será considerada publicada após novo upload e conferência da branch.
- Em viewport real de 390 × 844, as cinco páginas verificadas ficaram sem rolagem horizontal.
- `cadastro.html` redireciona para o fluxo oficial `avulso.html?modo=cadastro`.
- Portal e calendário sem token/cliente falham fechados com mensagens explícitas.
- Em sessão anônima, o build V75 registrou duas negativas de permissão: carteira operacional e funcionário do mês tentavam ler antes do login. A V76 removeu as duas chamadas precoces e preservou as cargas autenticadas obrigatórias.

## Limites reais

- A verificação pública não autenticou um papel da equipe e não executou gravações no Firebase de produção. Os fluxos autenticados e transacionais foram exercitados pelas suítes locais com sandboxes e invariantes; a prova ponta a ponta com dados reais continua dependendo de uma sessão autenticada acessível e de casos de teste controlados.
- A exclusão foi feita manualmente pelo usuário e confirmada na árvore da branch `main`: os commits `05fe912` e `2628f81` removeram as duas cópias da raiz; as versões oficiais em `scripts/` permaneceram com os mesmos hashes da V75.
