# Site Get — Pacote de passagem para o Claude Code
*Escrito por Claude (projeto Design Get) em 09/11/2026 01:40 BRT. Tudo que está aqui foi conferido no repositório e no ar nesta data.*
*Sem senhas, chaves ou dados de clientes. Onde uma chave é necessária, digo o nome e onde ela é usada.*

---

## 0. Como usar este documento (instrução para o Claude Code)

Você assume a manutenção do Site Get (repositório `Christopher02-00/GetStarted`, no Mac do Chris). Antes de qualquer coisa:
1. Leia este documento inteiro — ele é a verdade sobre ambientes, estrutura, regras, o que já foi feito e o que falta.
2. Leia o `AGENTS.md` do repositório inteiro. É lei.
3. Leia `ensaio/README.md` e rode `node ensaio/rodar.mjs` para confirmar o portão verde (141/141) antes de mexer em qualquer código.

Regras com o Chris: um PR por assunto; portão de jornadas verde (e `--movel` quando mexer em tela) antes de todo PR; bug novo vira jornada nova (vermelha antes, verde depois); rules, Functions e dados de produção só com ok nominal dele. Ao fechar cada etapa: linguagem simples, diga a próxima etapa e quantas faltam, nunca deixe nada em aberto, só conclua a 100%.

Comece pelas pendências na ordem de prioridade da seção 5 e pergunte as dúvidas da seção 7 antes do que depende delas.

---

## 1. Repositório e ambientes

**Repositório:** `https://github.com/Christopher02-00/GetStarted` — branch principal `main`. Último commit publicado: **`d3e4e76`** (Merge PR #41, 09/11/2026 ~01:35 BRT).

**Publicação:** GitHub Pages direto da branch `main` (raiz do repo; `CNAME` = `get-started.agency`). Cada merge no `main` publica em 1–3 minutos. **Não existe ambiente de testes publicado** — o "teste" é o ensaio local com emulador (abaixo). `_config.yml` exclui do Pages as pastas `rollback_v*` e o `AGENTS.md`.
- Produção: `https://get-started.agency` (`index.html` institucional; `escritorio.html` sistema interno da equipe; `portal-cliente.html` portal do cliente; `calendario.html`/`calendarios.html` calendário por link; `avulso.html` pré-cadastro; `pedido-cliente.html`, `cadastro(s).html`, `demandas.html`, `roteiros.html`, `painel-tv.html`, `plano-acao.html`, `links.html`).

**Firebase — projeto `get-started-4956d`:**
- **Firestore** (banco principal; ~120 coleções, ~61 mil documentos em 09/11).
- **Auth** — login Google (`signInWithPopup`), e-mail da pessoa é a identidade da equipe; clientes entram no Portal por token/slug (`clientes_portal_tokens`, `sessoes_cliente`), não por Google.
- **Cloud Functions** (Node 22, `functions-get/`, região `southamerica-east1`): `programacaoIndependenteGetI165` (callable — todas as ações do backend passam por ela, despachadas por `acao`), `videoOperacionalGetI165` (gatilho em `videos_producao/{id}`), `postagemOperacionalGetI165` (gatilho em `postagens/{id}`), `acompanhamentoOperacionalGetI165` (agendada a cada 5 min). Deploy das Functions em produção: **não sei** como foi feito da última vez (não há workflow; presumo `firebase deploy` manual pelo Chris/Codex).
- **Rules:** `firestore.rules` (4.828 linhas, 122 KB; perto do teto de 256 KB compilado). Publicação **automática**: workflow `.github/workflows/publicar-rules.yml` roda em push no `main` que toque `firestore.rules` (ou manual) e usa a API REST de Rules com o secret **`FIREBASE_SERVICE_ACCOUNT`** (conta de serviço `claude-site-get@get-started-4956d.iam.gserviceaccount.com`, papéis Firebase Rules Admin + Cloud Datastore Viewer). Rules vigentes em produção = R11 (ruleset `3e9acba6-…`, SHA da fonte `4af247e5…`, igual ao `main`).
- **Storage:** não sei se é usado (não encontrei uso no código do escritório; uploads de vídeo vão por links do Drive).
- E-mails das automações: Functions com secret de e-mail (`emailDeployAtivoI165`/`secrets:[chave…]` em `functions-get/index.mjs`) — nome exato da chave: ver `functions-get/runtime.example.env`.

**Rodar localmente / emulador (já usamos, é o portão obrigatório):**
```bash
git clone https://github.com/Christopher02-00/GetStarted.git && cd GetStarted
npm i -g firebase-tools@15 && firebase setup:emulators:firestore   # Java 21 obrigatório
(cd functions-get && npm i --no-package-lock)   # não há lockfile: npm ci falha
(cd ensaio && npm i && node montar-cdn.mjs)                           # SDK Firebase local, sem CDN
(cd ensaio && npx playwright install chromium)                      # navegador das jornadas
node ensaio/rodar.mjs                 # bateria inteira (desktop) → ensaio/saida/resultado.json + fotos
node ensaio/rodar.mjs --movel         # mesma bateria como celular 390×844 — obrigatória quando mexe em interface
node ensaio/rodar.mjs --jornadas J04  # só uma jornada
node ensaio/explorar.mjs Cecília      # abre o site como a pessoa e tira foto (debug)
```
O ensaio sobe Firestore + Auth + **Functions** emulators com as rules e as Functions do próprio checkout, serve o site em `127.0.0.1`, popula um seed consistente e percorre jornadas por papel no Chromium (Playwright). O gancho no site só liga em `127.0.0.1?ensaio=1` (inerte em produção). Nunca aponta para o projeto real. Detalhes e regras aprendidas: `ensaio/README.md`.
Base real anonimizada (R2): workflow manual `exportar-firestore.yml` gera o artefato `firestore-anonimizado` (3 dias); descompactar em uma pasta local e rodar `ENSAIO_DADOS_REAIS=<pasta> node ensaio/rodar.mjs --jornadas J12`. **Nunca commitar a exportação.**

**CI no GitHub:** `.github/workflows/qa-get.yml` (`.qa-get/`: 4 caminhos reais + 5 mutantes contra o emulador Firestore, Node 24, Java 21) roda em todo PR e push no `main`. É o único check do PR. O portão de jornadas (`ensaio/`) roda **localmente** antes do PR — ainda não está no CI (pendência R4).

---

## 2. Como o site é construído

**Linguagens/libs:** HTML + JavaScript puro (ES modules), CSS inline nas páginas. Firebase Web SDK v10 modular (Firestore, Auth, Functions) carregado por CDN em produção e por cópia local no ensaio. Sem framework, sem bundler, sem TypeScript. `vendor-planejamento/` tem mammoth e pdf.js (leitura de documentos). Functions: `firebase-admin` 14.5, `firebase-functions` 7.4, Node 22.

**Estrutura (517 arquivos):**
| Caminho | O que é |
|---|---|
| `escritorio.html` | Sistema interno da equipe: **52.8 mil linhas / 3,9 MB**, 2 módulos inline + 59 imports locais com `?v=<sha256 do arquivo>` (cache-busting — ao mudar um módulo, atualize o hash no import). Tudo de operação vive aqui: Início, Minhas Demandas, Demandas, Gerência, Central de Clientes, Calendários, Gravações, Vídeos, Postagens, Financeiro, motores de automação (`motorAutomacoes`), roteador `irPara()`. |
| `portal-cliente.html` | Portal do cliente (3.3 mil linhas, 11 módulos): vídeos para aprovar, calendário, referências, pedidos, Stories, propostas. |
| `calendario.html` = `calendarios.html` | Editor/visualizador de calendário por link (`?cliente&t=token&mes=AAAA-MM`). **Devem ser byte a byte idênticos** (duplicata intencional). |
| `gs-*.mjs`, `financeiro-*.mjs`, `stokki-publicacao.mjs`, `codec-central-r80.mjs`, `leitura/*.mjs`, `sessao-publica-i39.mjs` | ~80 módulos de front, nomeados por ticket (`I` = set/out, `CP` = out/nov, `V` = ago/set, `R` = Central). 15 deles duplicados byte a byte em `functions-get/` (contratos compartilhados cliente/servidor, ex.: `gs-providencias-gravacao-cp140.mjs`). |
| `functions-get/` | Cloud Functions: `index.mjs` (4 exports), `central/` (ações da Central/Operação 4.0: agenda, providências, documentos, pedidos do cliente…), `lib/` (validadores compartilhados), `tests/`. 92 módulos. |
| `firestore.rules` | Regras; funções curtas ofuscadas por tamanho (`aa()`, `ae()`, `x6()`…). Mapa útil: `aa()` = membro da equipe ativo; `ae()` = gerência (Chris/Amanda); `ab()` = Chris; `af()/aE()` = sessão de cliente/portal; `x6(d)` = demanda de pedido de ajuste do cliente (imutável). |
| `ensaio/` | Portão de jornadas (abaixo). `rodar.mjs`, `explorar.mjs`, `lib/{emulador,seed,navegador}.mjs`, `jornadas/J01…J14`, `README.md`. |
| `scripts/` | `preflight.mjs`, `regression-critical.mjs` + 60 `regression-v*` — **já falham no `main`** (49 FAIL / falha imediata); não servem de portão hoje. |
| `.qa-get/` | Suíte do CI (única que roda no GitHub). |
| `.github/workflows/` | `qa-get.yml` (CI), `publicar-rules.yml` (rules → Firebase), `exportar-firestore.yml` (R2). `.github/scripts/` tem os dois scripts Node correspondentes. |
| `rollback_v95…v107/` | Cópias antigas de `escritorio.html`/rules (31 MB). Só histórico. |
| `AGENTS.md` (58 KB) | **Leia inteiro.** Regras de engenharia e todos os incidentes/invariantes acumulados desde julho (Codex). É lei. |
| `CATALOGO_DE_ERROS.md` (269 KB), `RELATORIO_V*.md`, `MANIFESTO_SHA256_V*.txt`, `LEIA-ME_*`, `DIAGNOSTICO_*` | Histórico do Codex (público no Pages). |
| `videos/` (32 MB), `Planos.pdf` (catálogo comercial oficial, V80), `vendor-planejamento/` | Mídia e libs. |

**Coleções principais e campos que importam:**
- `demandas` — tarefas. `destinatario` (nome da pessoa), `remetente`/`origem` (`chris`, `sistema`, `cliente`), `status` (`pendente` → `concluida_aguardando_aprovacao` → `aprovada`; `cancelada*`), `prazoData` (`AAAA-MM-DD`), `prazoHora`, `titulo`, `descricao`, `clienteNome`/`clienteSlug`, `tipoEspecial` (`confirmacao_publicacao_v135`, `analise_perfil_cp150`, providências CP140…), `excluido` (soft-delete), `historico[]`, `nivelEscalonamentoDemanda`, `lembretePrazoHojeEm`, `avisoRetaFinalEm`, `emailEnviado`. Demandas `entrada_i54_*` com `tipoPedidoCliente='ajuste_calendario'` são **imutáveis pelo site** (só `emailEnviado`).
- `videos_producao` — vídeos. `cliente`, `clienteNome`, `titulo`, `status` (`aguardando_edicao` → `aguardando_aprovacao` → `aguardando_cliente` → `aprovado` → … `finalizado`), `editorAtribuido` + `editorAtribuidoEm/Por`, `data` (dia da gravação — todo vídeo real tem), `postagemId` (ponteiro canônico), `correcao`/`correcaoSolicitadaEm`, `agendamentoId`, `calendarItemId`.
- `postagens` — uma por vídeo (`id` determinístico `video_<videoId>`). `videoId` (ponteiro de volta — Functions rejeitam ponteiro só de um lado), `status` (`aguardando_legenda` → `aguardando_agendamento` → `agendado` → `postado`; `cancelada_*`, `arquivada_sem_postagem`), `legenda`, `dataAgendada`/`horaAgendada`, `postadoEm`, `legendaPendenteAoAgendarI90`, `confirmacaoPostagemCriada`. Stokki: `textosPorPlataformaI164`/`legendaInstagram|Tiktok|Youtube|Linkedin`.
- `agendamentos` — gravações. `cliente`, `data`, `hora`, `equipe[]`/`filmmaker`, `qtdVideosPlanejados`, `sessaoPlanejamentoVersao` (1 = sessão moderna) + `sessaoItensPlanejados[]`, `mesCalendario`, `sessaoOrdem`, `status` (`agendado` → `realizado`), `aprovacao`.
- `calendarios` (+ `calendarios_versoes` backup, `calendarios_envios_cecilia_i92`, `calendarios_ajustes_internos_cp123`, `continuidade_calendarios_i164`) — id `<slug>__<AAAA-MM>` ou por cliente; `items[]` (`itemId`, `name`, `day` = só posição visual, `desc`, `legenda`, `fmt`, `dataPostagem`), `aprovacaoMeses[AAAA-MM]` (`rascunho` → `aguardando_interna` → `aprovado_interno` → `liberado`; `ajuste_interno`), `comments`.
- `planejamento_social_i155/{MES__cliente}` — ciclo da Operação 4.0 (Central): `incluido`, revisão, documento recebido; `processo_calendarios_i164/ativo` liga o processo (muda o menu da Cecília).
- Clientes: `clientes_config/{slug}` (`tipoCliente`, `clienteInativo`, `whatsappCobranca`, cortesias, `semConteudoRecorrente`), `clientes_extras` (carteira operacional), `clientes_acesso` + `clientes_portal_tokens/{token}` (Portal), `clientes_encerrados` (saídas; soft), `contratos_cliente` (financeiro: `vigencias[]`, `valorVigente`, `primeiraCompetencia`), `pagamentos_mensais/{slug_AAAA-MM}` (`status` canônico `pago|isento|cancelado|aberto`), `financeiro_lancamentos`, `clientes_ciclo_financeiro` (ledger, só Chris), `contatos_clientes_financeiro` (PII, só Chris), `negocios` (funil, só Chris), `reunioes_vendas`, `propostas_portal_*`.
- Equipe: `usuarios_equipe/{email}` (`pessoa`, `email`, `ativo`, `excluido`, `uid`), `emails_equipe`, `ausencias`, `sessoes_equipe`, `sessoes_gerencia`.
- Outros: `providencias_gravacao_cp140` (id `prov140_<hash>`, campo `id` tem de ser igual ao caminho), `demandas_cliente`/`avisos_do_cliente`/`referencias_cliente` (vindos do Portal), `campanhas`, `stories_semanais`/`stories_clientes`/`stories_diarios_execucoes` (cadeia parada desde 02/10), `checklist_execucoes`, `log_automacoes` (14 mil docs — `motor_executado`, `postagem_orfa_bloqueada`…), `sistema/*` (`motor_lock` com `ultimaExecucao`, marcadores diários), `config_*`, `get_academy`.
- Datas são strings `AAAA-MM-DD`; carimbos são Timestamp ou ISO string conforme a idade do documento (leitura deve aceitar os dois).

**Papéis (identificados pelo e-mail Google → `EMAIL_PARA_PESSOA_EQUIPE` no `escritorio.html` + `usuarios_equipe` ativo + lista fixa nas rules):**
- **Chris** — CEO/admin: tudo; exclusivos: Financeiro, Mensalidades, Régua, Contratos (valor), Negócios, Reuniões, ledger, "Operar perfil da equipe" (age como outro papel com recibo), legendas (desde CP183), aprovação de qualidade de vídeo, análise de perfil (CP126/CP150).
- **Amanda** — Social Media chefe / gerência: revisa e libera calendários, distribui vídeos, Central de Clientes operacional, entrada/saída de clientes, referências e documentos, preparação; **sem** Financeiro/Negócios/Projetos Avulsos.
- **Cecília** — produção/coordenação: agenda gravações, confirma gravação (cria vídeos), agenda/publica/confirma postagens, Stories, cofre (só leitura), conferência de calendários, providências de gravação (coordena). Rules negam a ela contratos/mensalidades/encerrados.
- **Helo, João Victor** — editores (fila "Vídeos em Edição", enviar link, corrigir). **Nathan** — editor + filmmaker. **Luís** — filmmaker (só as próprias sessões; modo de campo; envia materiais V100). **Yas** — artes.
- **Cliente** — Portal por token/slug: aprova vídeos, lê calendário liberado, envia referências/pedidos, Stories liberados, propostas (PIN).
- Desligadas (não reativar): Gabrielle (04/11), Fernanda, Júlia. Ainda aparecem em listas do código (pendência de saneamento).
- Itens de um papel **não existem no DOM** dos outros (isolamento real, não CSS). Troca de papel limpa caches/listeners/DOM (V110).

**Rules e Functions — o que existe:** rules por coleção com helpers por papel; demandas/calendários/postagens com contratos de transição; coleções financeiras só gerência/Chris; Portal por sessão de cliente (`sessoes_cliente/{uid}`); bloco genérico `match/{AC}/{AE}` no fim para coleções simples. Functions: uma callable única com dezenas de `acao` (providências, vínculos, documentos, pedidos, entrada de perfil, agenda, canais, transmissões, planejamento social, central/preparação…), dois gatilhos de sincronização vídeo↔postagem (rejeitam seed/ponteiros inconsistentes com códigos `i165/ponteiros`, `i165/fato-futuro`), e um agendador de 5 min. Todas devolvem erros `FAILED_PRECONDITION` com `details.codigo` (`i165/…`) — a UI mostra a mensagem.

---

## 3. Regras e combinados

**Processo (vigente desde 08/11/2026, decidido pelo Chris):**
1. Todo pedido vira **árvore de impacto + 1 ficha por unidade** (escritores, leitores, papéis, rules, legado). Skill `get-arvore-do-pedido`.
2. **Um PR por unidade**, branch própria, menor diff que resolve a causa-raiz. Skill `get-mudanca-segura`.
3. **Portão obrigatório antes do PR:** `node ensaio/rodar.mjs` verde (hoje 141/141) e, quando toca interface, também `--movel`. Bug novo → jornada nova no mesmo PR, **vermelha antes e verde depois** (contraprova). Skill `get-prova-de-jornada`.
4. PR com 5 blocos: **Entendimento / Alterações / Provas de validação / Riscos-pendências / Próximo passo**. Esperar o CI, merge, conferir no ar (`fetch` do arquivo em get-started.agency), atualizar os docs do projeto no mesmo dia. Rollback = `git revert`. Skill `get-publicacao-e-rollback`.
5. Chris autorizou Claude a fazer branch → PR → CI → merge → conferência **sozinho** ("eu autorizo tudo, siga em frente"). O que ainda **pede aviso antes**: publicar **rules** no Firebase (hoje automático via workflow, então avisar no PR), deploy de **Functions**, qualquer **escrita em dados de produção** (migração/correção) — essas exigem ok nominal.
6. Sempre que um pedido contrariar `AGENTS.md`/invariantes, **dizer qual é a regra vigente e esperar a decisão**, em vez de executar.
7. Comunicação com o Chris: português, linguagem simples ao fechar etapas, dizer sempre a próxima etapa e quantas faltam, nunca deixar nada em aberto, só dar por concluído a 100%.

**Padrões de código:** JavaScript puro no estilo do arquivo (funções nomeadas por ticket, ex.: `demandaImutavelPorRegraV113`, `abrirFilaMinhasCp179`); comentário curto no ponto da mudança citando a ficha (F-xx) e o motivo; sem bibliotecas novas; sem globais novos; módulo novo só quando for domínio novo; atualizar o hash `?v=` do import ao mudar um `.mjs`; `calendario.html` e `calendarios.html` sempre iguais; `escAttr()` em atributos HTML; soft-delete sempre (`excluido:true`); falha de leitura **nunca** vira lista vazia/zero (mostrar indisponível e manter o último retrato); trava de clique duplo antes do primeiro `await`; releitura pós-commit antes de dizer "sucesso".

**Não mexer sem autorização do Chris:** `firestore.rules` (publica sozinho ao fazer merge — então o PR já é a publicação), `functions-get/` em produção, dados de produção (nenhuma migração/correção sem prévia zero-write + ok nominal), coleções financeiras e `negocios` (privacidade do Chris), identidade canônica de clientes (Zeiss/Zeens, Master Chef, Hitech≠Rodrigo, Emanuelle), reativar pessoas desligadas, apagar fisicamente qualquer coisa, a pasta histórica `~/Documents/site get`, e os `rollback_v*`.

**Decisões importantes e motivos:**
- Manutenção passou 100% para Claude em 08/11 (antes ChatGPT/Codex); meta de confiabilidade **99,9%**: nada chega ao `main` sem o portão verde; toda regressão vira jornada.
- O ensaio roda as **Functions reais** no emulador (não mocks) porque muitos contratos vivem no servidor (ponteiros, assinaturas, ordem do fluxo).
- Rules publicam por workflow com conta de serviço só-leitura+rules (criada pelo Chris em 08/11) para não depender de `firebase deploy` manual.
- A sentinela de rules mede **escritas negadas** (o site tentou gravar onde a regra proíbe). As frases "maximum of 1000 expressions"/"evaluation error" no log do emulador são diagnóstico verboso de pedido já negado — **não** acontecem em produção (provado por bisseção em 09/11). Não "corrigir" rules por causa delas.
- Stories (J07) ficou fora da bateria: cadeia parada desde 02/10 (Gabrielle inativa).
- `scripts/preflight.mjs`/`regression-critical.mjs` são legado vermelho; o portão real é `ensaio/`. Não gastar tempo neles sem decisão do Chris.

**Legado/frágil (cuidado):**
- `escritorio.html` é um arquivo só de 3,9 MB; ferramentas de busca precisam de `grep -n -o` com janelas (linhas de 100 KB). Nunca fazer substituição global.
- Documentos antigos sem campos novos (`excluido`, `data`, `itemId`, `sessaoPlanejamentoVersao`): toda leitura precisa de default; rules usam `.get(campo, default)`.
- `castaDosClientes()` (classificação mensalista/avulso/encerrado) lê coleções financeiras — para Cecília as rules negam e a casta fica vazia (F-12, aberta).
- Motores de login (`motorAutomacoes`: ~40 varreduras, lock em `sistema/motor_lock` de 60 min, manutenção diária): escrevem em `demandas`, `postagens`, `sistema`; qualquer mudança neles precisa da J12 com base real.
- Itens de calendário legados sem `itemId` (índice + nome como identidade) — migração V102 só por ação explícita do Chris.
- Fusões de clientes com aliases (Zeiss, Master Chef) — leitura por alias, nunca cópia.

---

## 4. O que já foi feito

**Tudo abaixo está no GitHub (`main`) e no ar. Não existe código passado nesta conversa que não tenha sido commitado** — a única coisa que vive só na minha máquina é a exportação anonimizada do banco (`~/.dados-ensaio/exportacao/`), que **não pode** ir para o repo; gere a sua pelo workflow.

| Quando (BRT) | O quê | Onde |
|---|---|---|
| 08/11 00h–04h | Diagnóstico: por que toda correção quebrava outras (sem portão, scripts vermelhos, arquivo gigante). Docs `SITE_GET_00/01/02` + 4 skills no projeto Design Get. | projeto |
| 08/11 manhã | Gancho de ensaio inerte em `escritorio.html`/`portal-cliente.html`/`calendario(s).html` (`127.0.0.1?ensaio=1`); harness `ensaio/` com emuladores Firestore+Auth+Functions, seed consistente, login Google sintético, Chromium. | PR #28, #29 |
| 08/11 12h | Jornadas J01 (login por papel), J02 (demanda), J03 (gravação/filmmaker), J04 (vídeo ponta a ponta com Functions), J05 (Portal A≠B), J09 (troca de papel), J10 (Financeiro só Chris). | PR #29 |
| 08/11 | J11 (Luís envia materiais V100 → fila da Amanda) + sentinela de rules. | PR #30 |
| 08/11 | J06 Calendário 4.0 completo (Amanda inclui ciclo + documento → Chris edita e envia → Amanda libera → cliente lê → Luís modo gravação), 8 casos. | PR #31 |
| 08/11 | **F-02 rules**: `aA()/dZ()/XJ()/QcE()` liam `excluido` sem default — cadastro antigo derrubava toda leitura da pessoa. + workflow `publicar-rules.yml`. | PR #32 |
| 08/11 | **F-07**: `console.error` de agenda de reuniões para Luís/Nathan a cada carga. **F-08**: placeholder com `\n` literal. | PR #33, #34 |
| 08/11 | Bateria em celular 390×844 (`--movel`). | PR #35 |
| 08/11 20h–21h | Publicação de rules via API REST (não `firebase deploy`), retry em 5xx; conta de serviço + secret `FIREBASE_SERVICE_ACCOUNT` (Chris pelo Chrome). **R11 publicada no Firebase.** | PR #36, commit `9c666ef` |
| 08/11 22h | Workflow `exportar-firestore.yml` (export anonimizado só-leitura) + 3 correções do próprio export (`__id`, hashes, paginação, e-mails da equipe). | `b24b181`, `9dae979`, `c8ca6cc`, `867060f` |
| 09/11 00h | **F-16**: varreduras de demandas (escalonamento, lembrete de prazo, reta final) abortavam ao tentar gravar em pedido de ajuste do cliente (imutável por regra); e-mail repetiria. Helper `demandaImutavelPorRegraV113` + try/catch por item. | PR #37 |
| 09/11 00h | **F-18**: aviso falso "Não consegui atualizar as ausências" (validar da conferência I55 chamado após conclusão). | PR #38 |
| 09/11 00h | Ensaio R2: `seedReal` (base anonimizada), **J12** tour por papel (todas as telas), sentinela reescrita, limpeza de emuladores órfãos, seed de vídeos com `data`. | PR #39 |
| 09/11 01h | **F-01**: faixa do filtro escolhido abre sempre em Minhas Demandas (+ J13). | PR #40 |
| 09/11 01h | **F-09**: leitura da Entrada de perfil (CP126) não trava a navegação; clique em "Calendários e conteúdos" não é mais ignorado (+ J14). Hash do import atualizado. | PR #41 |

Portão atual: **47/47 casos** (J01–J06, J09–J14 + 2 sentinelas), desktop e celular, sobre `main d3e4e76`.

---

## 5-A. Estado em 09/11/2026 (fim do dia, Claude Code)
| # | Situação | Onde |
|---|---|---|
| P1 castas da Cecília | ✅ no ar, regra publicada; a projeção nasce na 1ª abertura da gerência | #51, J16 |
| P2 J08 motor | ✅ | #58 |
| P3 Stokki | ⏳ não começou: as ações passam pela Function (V118); precisa criar o vídeo pela esteira real, como a J04 | — |
| P4 duração do motor | ✅ no ar; ler `motor_executado` em 1–2 semanas e decidir | #59 |
| P5 vídeo sem data | ✅ (6 templates, não 3) | #55, J18 |
| P6 D-01 | ✅ no ar; o conciliador para sozinho após 3 recusas; a postagem já estava arquivada desde 27/08 | #52, J17 |
| P7 F-03/F-04 | ⏸ F-04 (ids trocados) não vale o risco de renomear; F-03 sem caso concreto restante | — |
| P8 desligadas | ✅ Gabrielle fora da lista fixa das rules e do login (Fernanda/Júlia já estavam) | #57, J19 |
| P9 segurança | ✅ docs internos fora do Pages (#45); cofre com chave v2 (#54); Chris protegeu (25/25 em v2); fase B no ar: chave antiga e PBKDF2 fora do HTML (#72, J15) | #45, #54, #72 |
| P10 R3 cobertura | ⏳ ferramentas estáticas recriadas (#44); falta "handler sem jornada = vermelho" | #44 |
| P11 R4 CI | ✅ portão no GitHub a cada PR e 6h diário (#47); "negação esperada" na sentinela (#51/#54); publicação de rules paciente (#53) | #47, #53 |
| P12 R5 rede | ⏳ sondagem offline (Amanda, Cecília) sem violação no seed; repetir com a base real | — |
| P13 backlog Codex | ✅ triado (#60); corrigidos 22/43 (#61), 24 (#62), 45 (#63); 11, 26, 37 já resolvidos; 44 é operacional | #60–#63 |
| P14 deploy de Functions | 🟡 workflow `publicar-functions.yml` (#71): PR confere com dry-run, publicar é manual com ok do Chris. Papéis dados: Cloud Functions Developer, Service Account User e Firebase Viewer (09/11) | #71 |
| P15 scripts legados | ✅ aposentados | #43 |
| P16 J06 um clique | ✅ | #56 |
| E-mail | ✅ cota do EmailJS (200/mês) estoura desde setembro; resumo diário cortado por decisão do Chris (#64) e envio para na cota (#63) | #63, #64 |

**Empresas do Otávio (09/11/2026, noite):** as 6 empresas são clientes próprios.
- **Clientes:** `zeiss` (Ótica Zeiss Araucária, pagador) mais `clinica-zeiss-araucaria`, `otica-hauer`, `clinica-dos-olhos-hauer`, `otica-sao-jose` e `clinica-sao-jose`. As 5 novas foram criadas pela Central, com contrato de R$ 750, novembro/2026 em cortesia, Portal, calendário e onboarding.
- **Cobrança agrupada** (`config_financeiro/cobranca_agrupada`, revisão 1): pagador `zeiss` desde 2026-11, R$ 750 por empresa. A Zeiss fica com o restante (R$ 750) e a soma fecha R$ 4.500 (#75, J29).
- **Etiquetas I144 aposentadas** (U3, J30).
- **Instagram das 5:** demanda para a Amanda (protocolo `5zc64mso`, 10/11).
- **Roteiros e calendários das empresas novas:** ficam com o Chris, em outra conversa.

Incidente do dia: o merge do #46 publicou o código do cofre antes de a regra chegar ao Firebase (503 por >20 min) e gravar credencial falhou por ~15 min → revertido (#50). Lições: publicação paciente (#53) e código tolerante a regra atrasada (#54).

**Auditoria do percurso + urgentes de 10/11/2026 (Claude Code):**
Auditoria em 4 trechos (equipe, cliente, legendas, entrada/saída), com ~20 achados. Notas em `side-session-notes/…/auditoria-percurso/`.
| PR | O quê | Prova |
|---|---|---|
| #84 | Comentário da revisão interna não aparece para o cliente | J34 |
| #85 | Legenda corrigida no calendário chega à postagem (CP190, gatilho `calendarioLegendaGetCp190`) | J35 |
| #86 | Postagem manual antes do mês existir não trava o mês | J36 |
| #87 | Contador "Esperando sua revisão" com o filtro da fila | J37 |
| #88 | "Encaminhar ao editor" de somente edição pelo servidor (CP194) — rules estouravam 1000 expressões | J41 |
| #89 | Pedido de ajuste do cliente pelo servidor em calendário grande (CP193) — Zeiss | J42 (fixture anonimizada) |
| #90 | "Não precisa agendar" com item sem ponteiro (Fedalto) | J43 |
| #91 | Devolução da Amanda com rodada nova (CP196) — Little Elephant 2026-12 | prova com cópia real (fora do repo) |
| #92 | Portal do pagador mostra a divisão da cobrança agrupada (CP195) | J44 |
| #93 | Avisos de aprovação do cliente pelo servidor (CP191) | J38 |
| #94 | Cliente que saiu não gera kit/demanda/tácita; pendências viram 1 demanda | J39 |
| #95 | Postagem não herda legenda que o cliente pediu para ajustar | J40 |
| #96 | Cobrança agrupada: empresa sem contrato fora da soma + aviso | J46 |
| #97 | Pedido de legenda do Portal vira a legenda do conteúdo escolhido (CP197) | J48 |
| #98 | Ficha do cliente alterada avisa o Chris (CP198, gatilho `fichaClienteGetCp198`) | J49 |
| #99 | Ex-cliente mensalista volta como avulso no mesmo cadastro | J50 |
| #100 | Rules: link do cliente não apaga conteúdos nem comentários (CP199) | J51 |
| #103 | Devolução com recado longo aceita até 30 mil caracteres e a recusa explica o tamanho | J52 |
| #104 | Jornada permanente do CP196 e J04/J25 sem virada de meia-noite | J53 |
| #105 | Gestão lê as demandas uma vez por login (eram três) | J54 |
| #106 | **Etapa 2 (parte 1, CP200):** link do cliente e Portal leem a cópia `calendarios_cliente/{slug}` só com meses liberados; aprovar/texto/observação/recado pelo servidor; gatilho mantém a cópia · `v2026.11.11-2` + deploy das Functions + 38 cópias preenchidas | J55 vermelha→verde |
| #107 | **Etapa 2 (parte 2, CP200):** rules negam ao cliente o `calendarios/{slug}` original · ruleset `599296b4…` · `v2026.11.11-3` | J55 (original negado) |
- Dados de produção (ok nominal do Chris, 10/11): Clínica Zeiss Araucária apagada (39 docs) e retirada do grupo de cobrança. A Zeiss mantém R$ 4.500, com parte própria de R$ 1.500. O backup está fora do repo.
- Conta `claude-site-get`: ganhou Cloud Scheduler Admin. Política de limpeza `firebase-functions-cleanup` criada (PR #83).
- Portão no main em 10/11 22h: 128/128 desktop e móvel (antes do #100); CI do #100: 130/130.
- Etapa 2 das rules concluída em 11/11 (#106/#107). Gatilho conferido em produção (cópia acompanhou em 6 s). Portão 141/141 desktop e móvel.
- Pendentes: caminho "fora da pauta" de vídeo com item sumido estoura 1000 expressões (mover para o servidor, como CP193/CP200); medir de novo leituras e latência (base 11/11: 3,4 mi leituras/24 h, antes do #105); opcional: demandas da gestão só abertas + últimos 30 dias.

**Pedido de 09–10/11/2026 (4 unidades, Claude Code):**
| U | O quê | PR / versão | Prova |
|---|---|---|---|
| U1 | Aprovar a qualidade do vídeo volta a ser **um clique** (o 2º botão era sobra do painel de datas de 24/10); link sem `https://` não trava; recusa mostra o motivo | #78 · `v2026.11.10-2` | J31 vermelha→verde |
| U2 | Recado no lugar da legenda ("Não precisa de legenda", "ok", "teste"…) é recusado pelo validador único I79 (front + Functions); antigos aparecem como pendência | #79 · `v2026.11.10-3` | J32 vermelha→verde |
| U3 | Lentidão: callable de toda a equipe presa em **1 instância** (latência até 55 s → tempo esgotado → faixa vermelha) → `maxInstances:10`; rodada de 5 min relia a carteira por ciclo (~420 mil leituras/dia) → 1 leitura por rodada | #80 · `v2026.11.10-4` + deploy das Functions | contador 3→1; métricas pós-deploy |
| U4 | Cecília: recusa sem lixo guardado, tentativas antigas se limpam, "Saiu no horário" em um toque, "Já respondi" no aviso de espera, **retirada sem publicar pela Cecília** (decisão do Chris) | #81 · `v2026.11.10-5` + deploy das Functions | J33 vermelha→verde |
- Medição base (10/11 ~01h): 2,3 mi leituras/dia no Firestore (15 mi em 7 dias); às 03h ~32 mil/h só de Functions. Comparar em 24–48 h após o deploy.
- Deploy de Functions: workflow `publicar-functions.yml` (modo publicar) — o Chris autorizou de antemão (10/11). Em 10/11 o Chris deu à conta `claude-site-get` o papel **Cloud Scheduler Admin** (agora são 6 papéis: Firebase Rules Admin, Cloud Scheduler Admin, Cloud Functions Developer, Cloud Datastore Viewer, Firebase Viewer, Service Account User — não remover nenhum) e foi criada a política de limpeza `firebase-functions-cleanup` no `gcf-artifacts` de southamerica-east1 (imagens com mais de 1 dia são apagadas). Publicação de teste verde: run 42810699029.
- Hipótese descartada com prova: "recusas normais acendiam a faixa vermelha" (J34 verde também no código antigo; nenhum `console.error` junta o código do erro ao texto).
- Próximo candidato de desempenho (ficha própria): a gestão assina as 4.671 demandas inteiras a cada abertura (~190 mil leituras/dia, 4,9 MB no celular da Amanda).

## 5. Pendências

| # | Título | O que fazer e por quê | Prioridade | Afeta | Situação |
|---|---|---|---|---|---|
| P1 | **F-12 — casta da Cecília** | `castaDosClientes()` lê `contratos_cliente`/`pagamentos_mensais`/`clientes_encerrados`, negados à Cecília; casta vazia em 12 telas (comportamento permissivo, console com erro a cada carga). Caminho recomendado: projeção `castas_operacionais/{slug}` mantida por Function + regra de leitura para a equipe + J13-bis "Cecília classifica igual à Amanda". Precisa de ok nominal (rules + Function + migração zero-write). Ficha completa em `fichas/2026-11-08-achados-do-ensaio-r2.md`. | média | `escritorio.html` (castaDosClientes, clientesForaDoConteudo, mapaTipoCliente), rules, Functions; papel Cecília | não começou (bloqueada por decisão do Chris sobre Function+rules) |
| P2 | **J08 — jornada do motor** | Provar que `motorAutomacoes` completa a rodada no login de Chris/Amanda sem "falha em …" e grava `log_automacoes` `motor_executado`; hoje só é coberto indiretamente pela J12. | média | `escritorio.html` motores; Chris, Amanda | não começou |
| P3 | **Stokki multi-plataforma** | Jornada: vídeo da Stokki → legendas por plataforma (`textosPorPlataformaI164`, IG/TikTok/YouTube/LinkedIn) → Cecília agenda → publicação (`stokki-publicacao.mjs`). Cliente ativo, últimas postagens 14/10. | média | `escritorio.html`, `stokki-publicacao.mjs`, `postagens`; Chris, Cecília | não começou |
| P4 | **F-14 — duração dos motores no login** | No emulador o motor `postagensEsquecidas` passa dos 8 s de `etapaSegura` e sofre "Transaction lock timeout" (artefato do emulador). Medir em produção (gravar duração em `log_automacoes`) antes de decidir mover para Function agendada. | baixa | motores; Chris, Cecília | não começou |
| P5 | **F-17 — `undefined` em vídeo sem `data`** | `<div class="meta">${v.data}</div>` (3 templates em "Meus Vídeos") → `esc(v.data||'')`. Só legado/seed; produção tem o campo em 1101/1101. | baixa | `escritorio.html` lista do editor; Helo/JV/Nathan | não começou |
| P6 | **D-01 — vídeo órfão em laço (dado)** | Vídeo `A4RgTS8ElTE961tJQjfe` (Juliane Nerone — story para reels, aprovado 04/08): o conciliador V118 tenta a cada rodada e falha; 196 `postagem_orfa_bloqueada` desde 31/08. Decisão humana (arquivar ou corrigir estado) + código: parar de tentar após N recusas do mesmo id. | média | dados de produção; motor V118 | bloqueada (decisão do Chris) |
| P7 | **F-03/F-04 — saneamento** | Negações legítimas logadas como `console.error` (classificar por papel → `console.info`); ids trocados `navMinhasDemandas` (Anotações) × `navMinhasDemandasAtribuidas` (Minhas Demandas). | baixa | `escritorio.html` | não começou |
| P8 | **Pessoas desligadas no código** | Remover Gabrielle/Fernanda/Júlia de `FUNCIONARIOS`, `EMAIL_PARA_PESSOA_EQUIPE`, `EMAILS_EQUIPE_SEMENTE` e listas de rules (`emailDaEquipeSemente()`), preservando autoria/histórico. Rules + site juntos na mesma entrega (regra da Yas, `AGENTS.md`). | média | `escritorio.html`, `firestore.rules` | não começou |
| P9 | **Segurança de superfície** | `SENHA_GERENCIA_COFRE` e um literal de senha em texto puro no `escritorio.html` (~l. 19670 e ~3433); `CATALOGO_DE_ERROS.md` e relatórios públicos no Pages. Mover segredo para Function/claims; excluir docs internos do Pages via `_config.yml`. | alta | `escritorio.html`, `_config.yml` | não começou (precisa de decisão: onde guardar a senha do cofre) |
| P10 | **R3 — cobertura de cliques** | `claude/ferramentas/verificar_caminhos.py` já mapeia cliques/rotas/ids (baseline 0 quebrados); evoluir para "handler sem jornada = vermelho" + mutação automática. | média | ensaio | não começou |
| P11 | **R4 — portão no CI + rules nas duas direções** | Rodar `ensaio/rodar.mjs` no GitHub Actions a cada PR (precisa Java 21, Chromium, ~12 min) e rodada diária contra o `main`; jornada de rules permitido/negado por papel e coleção. | alta | `.github/workflows`, ensaio | não começou |
| P12 | **R5 — concorrência e rede** | Duas abas, falha de rede no meio da escrita ("erro nunca vira zero"), tempo até tela utilizável. | média | ensaio | não começou |
| P13 | **Backlog do Codex** | `~/site Get — atualizado/07_PENDENCIAS_E_RETOMADA/PENDENCIAS.json` (47 itens, 20/10): P37 aviso soma meses, P38 observações públicas com instrução interna, P39 e-mail individual falha, P15 lentidão, P11 celular real. Triar um a um com ficha. | média | vários | não começou |
| P14 | **Deploy das Functions por workflow** | Hoje não sei como as Functions chegam à produção; criar workflow (`firebase deploy --only functions`) com a conta de serviço (precisa de papel extra: Cloud Functions Developer + Service Account User) — só com ok do Chris. | média | `functions-get/`, workflows | bloqueada (papéis IAM) |
| P15 | **Scripts legados vermelhos** | Resolvida em 09/11/2026: Chris decidiu aposentar `scripts/preflight.mjs`/`regression-critical.mjs`; o `ensaio/` é a suíte oficial e o `AGENTS.md` foi atualizado. | — | `AGENTS.md` | concluída |
| P16 | **Simplificar `abrirCentral` na J06** | Com F-09 publicado, o laço de 5 tentativas da J06 pode cair para 1 clique. | baixa | `ensaio/jornadas/J06` | não começou |

---

## 6. Bugs e problemas conhecidos

- **F-12 (Cecília, casta vazia)** — reproduzir: entrar como Cecília, abrir Início; console mostra "Não consegui classificar as castas: … false for 'list'". Causa e caminho em P1. Tentado: nada ainda (só diagnóstico; não ampliar regras financeiras).
- **D-01 (vídeo órfão em laço)** — reproduzir: entrar como Chris com base real; console "V118: órfão preservado para conferência … A4RgTS8ElTE961tJQjfe". Ver P6.
- **F-14 (motor no emulador)** — reproduzir: `ENSAIO_DADOS_REAIS=<pasta> node ensaio/rodar.mjs --jornadas J12` com `ENSAIO_PAPEIS=Chris,Cecília`: "postagensEsquecidas Transaction lock timeout" / "tempo limite de 8000 ms". É carga do emulador (transações seriais + Functions nos gatilhos); produção registra "rodada completa". Não tratar como bug do site sem medir.
- **F-17** — reproduzir: vídeo sem `data` na fila do editor → texto `undefined`. Só seed/legado.
- **Scripts `scripts/*.mjs` falham no `main`** (pré-existente; 49 FAIL idênticas antes e depois de qualquer PR nosso). Não é regressão nossa.
- **Emuladores java órfãos** — se o Chromium "Target crashed" no ensaio, `pkill -f cloud-firestore-emulator; pkill -f functionsEmulatorRuntime` (o `parar()` já faz; só acontece se o processo for morto no meio).
- **Transaction lock timeout no ensaio** — nunca listar coleção por REST durante uma transação do app; esperar o sinal da UI (regra 1 do `ensaio/README.md`).
- **Chamadas 400 `i165/*` com base real** — a maioria é anonimização ou base incompleta; conferir `ensaio/.runtime/functions-chamadas.log` antes de abrir ficha contra o site.
- **No Mac do Chris** o shell remoto do Claude não sobe por falta de disco (< 17 GB livres) — irrelevante para o Claude Code local, mas explica por que downloads passaram pelo Chrome.

---

## 7. Dúvidas em aberto (dependem do Chris)

1. **D-01** — vídeo *Juliane Nerone — story para reels*: arquivar vídeo+postagem ou corrigir o estado?
2. **P9** — onde guardar a senha do cofre (Function com claim? Secret Manager?) para tirá-la do HTML.
3. **P14** — autorizar papéis IAM extras na conta `claude-site-get` para deploy de Functions por workflow? (Hoje: só rules + leitura.)
4. **P15** — aposentar `scripts/preflight.mjs`/`regression-critical.mjs` em favor do `ensaio/`?
5. **P1** — ok para criar a projeção `castas_operacionais` (Function + regra + migração zero-write)?
6. **Stories** — confirmar que a cadeia de Stories está mesmo desativada (sem J07), ou se volta com outra pessoa.
7. **R2 como rotina** — rodar a exportação anonimizada toda semana (workflow + download) e a J12 sobre ela?
8. Como as **Functions** foram publicadas da última vez (`firebase deploy` manual? por quem?) — não sei.
