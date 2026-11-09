# Fichas — achados do ensaio R1 (08/11/2026)
### Observado no site rodando no emulador com as Cloud Functions reais. Estado em 08/11 18h: **F-02 corrigido nas rules (PR #32, no GitHub; falta publicar no Firebase), F-07 (PR #33) e F-08 (PR #34) corrigidos e publicados no site.** Abertos: F-01, F-03, F-04, F-05 (R2), F-09.

| Id | Onde | O que acontece | Risco | Correção proposta | Precisa de ok? |
|---|---|---|---|---|---|
| F-01 | `escritorio.html` → Minhas Demandas | Com o filtro "Próximos 7 dias" ativo, o grupo "⚪ Próximos 7 dias" nasce **recolhido**: contador mostra 2, zero cartões visíveis até clicar no cabeçalho | Médio — pessoa acha que não tem demanda | Abrir o grupo quando ele é o próprio filtro selecionado (uma linha no renderer da lista) | Não (código) |
| F-02 ✅ | `firestore.rules` `aA()`/`dZ()`/`XJ()`/`QcE()` | Lê `resource.data.excluido` sem default; documento de `usuarios_equipe` sem o campo faz **toda** leitura da pessoa falhar com "evaluation error" | Alto — um cadastro antigo sem `excluido` derruba o acesso da pessoa inteira | `get(...).data.get('excluido', false) != true` nas helpers; conferir todos os `aA()`-like | **Sim** (rules) |
| F-03 | `escritorio.html` (vários) | Negação legítima das rules (ex.: Cecília em `reunioes`, `sessão de gerência`) é registrada com `console.error` como se fosse falha | Baixo — polui o console e esconde erro real | Classificar `permission-denied` esperado como `console.info`/silêncio por papel | Não |
| F-04 | `escritorio.html` menu | `navMinhasDemandas` abre "Minhas Anotações"; "Minhas Demandas" é `navMinhasDemandasAtribuidas` | Baixo — confusão de manutenção, não de uso | Renomear ids quando houver PR na área (não isolado) | Não |
| F-05 | `escritorio.html` demandas | `prazoData` legado em `DD/MM/AAAA` é tratado como atrasado (formato atual `AAAA-MM-DD`) | Médio se houver legado em produção — **R2 confirma** | Leitura compatível dos dois formatos no `calcularUrgencia` | Não (código); dados: só leitura em R2 |
| F-06 | `firestore.rules` `demandas` create | Visto **uma vez** na primeira rodada (seed inconsistente): "maximum of 1000 expressions". **Não reproduzido** no `main afbced3`: os 8 papéis criam demanda sem erro | Baixo enquanto não reaparecer — mas o Firebase para de avaliar acima do limite, então vale vigiar | Sentinela permanente no portão (`RULES`): qualquer ocorrência no log do emulador = vermelho. Sem PR de rules até reaparecer | — |
| F-07 ✅ | `escritorio.html` agenda de reuniões | Para Luís/Nathan, `conferirModoCentralR87()` devolve `null` por desenho e a função registra `console.error("Falha na agenda de reuniões… responsabilidade atual")` a **cada carga** | Baixo — nada é criado; ruído | Não chamar a rotina para papéis fora da Central (Chris/Amanda/Cecília) | Não |
| F-09 | `escritorio.html` Central R87 | Clicar em "Calendários e conteúdos" enquanto a Central ainda carrega (primeiros ~3 s após o login) é **ignorado em silêncio** — sem toast, sem navegação; cliques depois funcionam | Baixo-médio — a pessoa acha que o botão não funciona | Mostrar "carregando…" ou enfileirar o clique até `conferirModoCentralR87()` resolver | Não |
| H-01 | ensaio | Leitura REST da coleção durante transação do app aborta o commit no emulador ("Transaction lock timeout") — **comportamento do emulador, não do site**; o app já se defende (I29 preserva a tentativa e pede 2º clique) | — | Resolvido no ensaio (espera sinal da UI; polling ≥ 1 s) | — |
| F-08 ✅ | `escritorio.html` Enviar materiais | Placeholder do campo "Quais vídeos foram gravados?" mostra `\n` literal em vez de quebra de linha (escape duplo no template) | Cosmético | `&#10;` no atributo | Não |
| H-02 | ensaio | Function morta por erro (seed inconsistente) não desfaz a transação; locks presos ~20 s | — | Resolvido: seed consistente + `aguardarFunctionsOciosas()` | — |

## Confirmações positivas (o que o site provou fazer certo, com as Functions reais)
- **Calendário 4.0 inteiro (J06):** o servidor exige a ordem — sem preparação da Amanda, o editor não abre (`central/preparacao`); Chris só envia depois de salvar; Amanda só libera pelo fluxo de decisão; o link do cliente só mostra o mês `liberado`; Luís lê o mesmo documento em modo gravação.
- Confirmar publicação **futura** é recusada pelo servidor (`i165/fato-futuro`) — correto.
- Postagem de vídeo só nasce com ponteiros nos dois sentidos (`postagem.videoId` ↔ `video.postagemId`); seed inconsistente é rejeitada (`i165/ponteiros`) — correto.
- Agendar gravação: se a casa já tem gravação na mesma pauta, o app exige a conferência "é outra sessão" antes de criar — correto; tentativa não confirmada fica preservada para o segundo clique (I29).
- Luís vê só as próprias sessões; Nathan não vê a do Luís (DOM, não CSS).
- Com o processo 4.0 ativo, a Central R87 troca "Gravações" da Cecília pelos atalhos "Nova gravação"/"Controle de gravações" — comportamento intencional (CP110/R87).

## O que falta
1. **Publicar a R11 no Firebase** (F-02): criar o secret `FIREBASE_SERVICE_ACCOUNT` no repo (ou deploy manual). Até lá, produção segue na R10.
2. F-01 e F-09 (código, pequenos, um PR cada) — próximos.
3. F-05 depende do que R2 encontrar em produção (precisa de acesso de leitura ao Firestore).
4. F-03/F-04: saneamento, sem urgência. F-06: só vigiar (sentinela).
