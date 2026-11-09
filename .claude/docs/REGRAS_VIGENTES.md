# Site Get — Leia primeiro: regras vigentes e índice
### Projeto Design Get · a partir de 08/11/2026 o Site Get é mantido exclusivamente aqui (Claude), não mais no ChatGPT/Codex.

## Como funciona daqui pra frente (resumo de 1 minuto)
1. Chris pede. Claude aplica **`get-arvore-do-pedido`**: separa em unidades, monta a árvore de impacto, escreve 1 ficha por unidade, avisa qualquer conflito com regra vigente.
2. Para cada ficha, **`get-mudanca-segura`**: branch própria, menor diff na raiz, portão (sintaxe + caminhos + duplicatas + jornadas + diff) verde — e `--movel` quando toca interface —, PR com 5 blocos.
3. Prova pela **`get-prova-de-jornada`**: navegador real + emulador com seed, por papel, do clique ao destinatário; contraprova vermelha antes de corrigir bug.
4. **`get-publicacao-e-rollback`**: merge só com autorização nominal, tag de versão, conferência de hash e telas, rollback = `git revert`. Atualiza estes docs no mesmo dia.
5. Nunca: lote de vários assuntos num PR; teste em produção com dado fictício; "validado" sem jornada; copiar pasta antiga por cima; regra que depende de memória do agente em vez de teste.

## Meta de confiabilidade (definida por Chris em 08/11/2026) e como ela é medida
Meta: **99,9% de certeza** — na prática: nenhuma mudança chega ao `main` sem o portão verde; toda regressão que já tem jornada é impossível de republicar; toda regressão nova vira jornada no mesmo dia. Medição mensal, registrada em `SITE_GET_01_ESTADO_ATUAL.md`: (a) PRs publicados, (b) regressões reportadas pela equipe, (c) quantas dessas já tinham jornada (meta: 0), (d) cobertura de cliques do mapa (meta: 100% dos handlers com jornada), (e) taxa de mutantes mortos (meta: ≥ 95%). Claude não declara "validado" sem apontar qual dessas provas foi executada.

## Teto do robô (roadmap de construção — Claude executa sozinho, um PR por etapa)
| Etapa | O que entrega | Estado |
|---|---|---|
| R1 | J03 gravação, J04 vídeo ponta a ponta com Functions reais, J05 portal A≠B, J09 troca de papel, J10 financeiro — **27/27 ×3, publicado (PR #29)** | ✅ 08/11 |
| R1.1 | J11 filmmaker envia materiais (V100) + sentinela de rules no portão — **31/31 ×2, publicado (PR #30)** | ✅ 08/11 |
| R1.2 | J06 calendário 4.0 (preparação → editor → cliente não vê → revisão/liberação → cliente lê → filmmaker) — **8/8, publicado (PR #31)** | ✅ 08/11 |
| R1.3 | Bateria em celular 390×844 (`--movel`) — **toda verde, publicado (PR #35)** | ✅ 08/11 |
| R1.4 | J08 motor, Stokki multi-plataforma (J07 stories retirado: cadeia parada desde 02/10) | próximo |
| R2 | Seed = cópia anonimizada do banco real — J12 tour por papel sobre 120 coleções; achou F-16/F-18/F-12/D-01 — **publicado (PR #39)** | ✅ 09/11 |
| R3 | Mapa de cliques → cobertura (handler sem jornada = vermelho) + mutação automática (meta ≥ 95% mortos) | planejado |
| R4 | Rules nas duas direções (permitido/negado por papel, por coleção) + CI no GitHub a cada PR + rodada diária 6h contra o `main` | planejado |
| R5 | Concorrência (duas abas) + falha de rede no meio da escrita ("erro nunca vira zero") + tempo até tela utilizável por tela | planejado |
Fora do teto (honesto): Safari/iPhone físico, Cloud Functions **em produção** (no emulador elas rodam de verdade desde R1), formatos de dado que ainda não existem, decisão de negócio. Quando um desses escapar: jornada nova no mesmo dia.

## Regras vigentes (decisões de Chris — mais recente prevalece)
| Data | Decisão |
|---|---|
| 09/11/2026 01:30 | Chris: linguagem simples ao fechar etapas; dizer sempre a próxima etapa e quantas faltam; nada em aberto; só concluir a 100%. Programação do Site Get passa ao **Claude Code** (Mac) com o pacote `SITE_GET_03`. |
| 08/11/2026 | Manutenção do Site Get passa 100% para Claude (projeto Design Get). ChatGPT/Codex não é mais fonte de mudanças. |
| 08/11/2026 | Gabrielle, Fernanda e Júlia estão desligadas. Autoria/histórico preservados; não reativar; remover das opções ativas no código (pendência). |
| 08/11/2026 | Claude pode seguir sem pedir confirmação a cada passo, **mas sempre avisa a regra vigente** quando o pedido contraria `AGENTS.md`/invariantes, e espera a decisão. |
| 08/11/2026 | Acesso GitHub de escrita autorizado por Chris; depende de instalar o GitHub App do Claude no repo. Até lá: Claude entrega PR/patch, Chris faz merge. |
| 08/11/2026 20:30 | Chris criou (pelo Chrome, com Claude guiando) a conta de serviço `claude-site-get` com Firebase Rules Admin + Cloud Datastore Viewer e entregou a chave JSON; secret `FIREBASE_SERVICE_ACCOUNT` gravado no repo. **Rules passam a publicar sozinhas a cada merge** (R11 publicada às 21:20). Leitura do Firestore de produção autorizada (só leitura, anonimizada, nunca commitada). |
| 08/11/2026 18:00 | Chris: "Eu autorizo tudo, pode fazer qualquer coisa, siga em frente e não pare" → Claude publicou F-02 (rules, no GitHub), F-07 e F-08 (site) sem pedir; publicação de rules **no Firebase** continua dependendo de credencial (secret `FIREBASE_SERVICE_ACCOUNT`). |
| 08/11/2026 02:00 | Chris: meta 99,9%/zero erros; processo deve ser automático a partir do próximo pedido; Claude constrói o teto do robô (R1–R5) por conta própria e só pede ok para ler/escrever produção. |
| 08/11/2026 01:43 | Chris: "não quero ter que fazer nada, você pode fazer manualmente tudo, eu autorizo" → Claude faz branch, PR, espera CI, merge e conferência sozinho; Chris só recebe o resumo. Continua valendo: publicação de **rules/functions/dados** é avisada antes. |
| 08/11/2026 | Gancho de ensaio (emulador local, inerte em produção) autorizado no `escritorio.html`. Portão de jornadas (`ensaio/rodar.mjs`) é obrigatório antes de qualquer PR. |
| 04/11/2026 (Codex, CP183) | Legendas → Chris. Referências/documentos/preparação → Amanda. Documento único por cliente/mês (Amanda → Chris adota → Amanda libera). |
| jul/2026 | NUNCA criar demanda endereçada a Chris/Amanda sobre trabalho de terceiro (`escalacaoGerencial` + filtros intactos). |
| histórico (`AGENTS.md`) | Soft-delete sempre; identidade canônica de cliente (Zeiss, Master Chef, Hitech≠Rodrigo); itens de papel fora do DOM dos outros; falha de leitura nunca vira zero; `calendario.html`==`calendarios.html`; Financeiro/`negocios` só Chris; rules ≤ 256 KB compiladas. |

## Índice dos documentos deste projeto
- `SITE_GET_00_REGRAS_VIGENTES.md` — este arquivo.
- `SITE_GET_01_ESTADO_ATUAL.md` — commit/tag publicado, mapa do repositório, equipe, clientes, coleções, pendências.
- `SITE_GET_02_CAUSA_RAIZ_REGRESSOES.md` — por que toda correção quebrava outras; o que muda.
- `SITE_GET_03_PASSAGEM_PARA_CLAUDE_CODE.md` — pacote de passagem (09/11): ambientes, estrutura, regras, feito, pendências, bugs, dúvidas.
- `skills/get-arvore-do-pedido/SKILL.md` · `skills/get-mudanca-segura/SKILL.md` · `skills/get-prova-de-jornada/SKILL.md` · `skills/get-publicacao-e-rollback/SKILL.md`
- `ferramentas/verificar_caminhos.py` — verificador estático de cliques/rotas/ids (baseline 08/11: 0 cliques quebrados).

## Fontes externas (leitura, não cópia)
- Repo: `Christopher02-00/GetStarted` (`main`). Regras/incidentes históricos do Codex: `AGENTS.md` (repo) e `~/site Get — atualizado/AGENTS.md` (254 KB, changelog), `CATALOGO_DE_ERROS.md`.
- Estado do Codex: `~/site Get — atualizado/LEIA_AQUI_GET.md` → `03_MEMORIA_E_REGRAS_ATUAIS/01_ESTADO_ATUAL_COMPROVAVEL.md`, `06_OPERACAO_GET_4_0/MANIFESTO_VIGENTE_CP183.json`, `07_PENDENCIAS_E_RETOMADA/PENDENCIAS.json`.
- Skills antigas do Codex (referência, não vigentes): `~/site Get — atualizado/.agents/skills/` (get-confiabilidade, demandas-portal-get, get-calendarios-social, get-legendas-portal, get-roteiros-social, get-voz-social). As 4 de Social Media tratam de conteúdo, não de código — podem ser aproveitadas depois para a parte editorial.

## Sugestão para as instruções do projeto (Chris cola no campo de instruções)
> Para qualquer pedido sobre o Site Get (escritorio.html, portal, calendários, rules, functions), leia primeiro `claude/SITE_GET_00_REGRAS_VIGENTES.md` e siga as 4 skills em `claude/skills/`. Nunca mude código sem ficha/árvore; nunca declare validado sem jornada; nunca publique sem autorização nominal.
