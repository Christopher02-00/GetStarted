---
name: get-prova-de-jornada
description: Usar para provar que uma mudança no Site Get funciona de verdade — testes de jornada em navegador real (Playwright) contra emulador Firebase com seed, por papel e cliente, do clique até o destinatário; define o que conta como prova e o que não conta.
---

# Prova de jornada — o site é caminhos; a prova é percorrer o caminho

Regra de Chris: *"o site se baseia por caminhos: cliques que levam a tais coisas, que levam a tais pessoas"*. Então a única prova aceita é **o caminho percorrido de ponta a ponta**, pelo papel certo, com o dado chegando em quem deve receber. Texto no HTML, `node --check` e "a função existe" **não são prova** — são pré-requisito.

## Ambiente de ensaio (uma vez por sessão)
```bash
cd <clone>; npm i -g firebase-tools@15      # já disponível no ambiente Claude (Java presente)
node ensaio/subir.mjs                        # sobe Firestore+Auth emulators em portas livres, carrega firestore.rules do repo
node ensaio/seed.mjs --perfil padrao         # seed: equipe atual (Chris, Amanda, Cecília, Helo, JV, Nathan, Luís, Yas), 5 clientes
                                             # (Bluefit, Stokki, Hitech, Zeiss, Mochi) com calendário, gravações, vídeos em cada
                                             # status, postagens em cada status, demandas, stories, 1 cliente arquivado, 1 alias legado
```
O ensaio serve `escritorio.html`/`portal-cliente.html` do checkout via HTTP local e injeta a configuração do emulador **sem alterar o código do site** (variável/meta lida pelo bootstrap). Auth sintética por papel — nunca contas pessoais da equipe. Nenhum teste toca `get-started-4956d` em escrita.

## Catálogo de jornadas (`ensaio/jornadas/*.mjs`) — crescer a cada mudança
Cada jornada: **papel → gesto normal na UI → efeito no servidor (emulador) → destinatário encontra → destinatário executa → autor recebe retorno**. Mínimo exigido em todo PR (bateria mínima, ~2 min):
| id | Jornada |
|---|---|
| J01 | Login de cada papel abre a Início sem erro de console; menu tem só o que o papel pode (DOM, não CSS) |
| J02 | Chris cria demanda → aparece em Minhas Demandas do destinatário → prova → aprovação → some da fila e entra no histórico |
| J03 | Cecília agenda gravação (filmmaker) → Luís vê só a dele → confirma gravação → vídeos nascem na fila da Amanda |
| J04 | Amanda distribui vídeo → Helo entrega → Chris aprova → cliente (manual) → postagem `aguardando_legenda` → Chris salva legenda → Cecília vê em agendar → agenda → confirma publicado → Portal do cliente mostra |
| J05 | Portal: cliente A não enxerga nada do cliente B (calendário, postagens, demandas, stories) |
| J06 | Calendário: Chris cria mês → Amanda revisa/libera → link por competência abre; mês não liberado não abre |
| J07 | Stories: Cecília cria → Amanda revisa → cliente aprova no Portal → status `postado` |
| J08 | Motor de automações roda 1 ciclo no seed sem exceção e sem criar demanda endereçada a Chris/Amanda sobre trabalho de terceiro |
| J09 | Troca de papel na mesma aba limpa DOM/caches (Amanda não vê Financeiro; Chris volta a ver) |
| J10 | Financeiro (Chris): abrir, trocar competência, régua renderiza; Amanda não tem o DOM |
Jornadas específicas da ficha (`Jxx-<slug>`) são adicionadas no mesmo PR da mudança e ficam permanentes.

## Dimensões que toda jornada específica precisa cobrir quando atingidas
identidade (cliente certo, alias, nome parecido) · vida do dado (vazio real, 1 item, legado sem campo, moderno, excluído) · tempo (mês atual/anterior, virada BRT, atraso legítimo) · papel (autor, receptor, papel sem permissão) · caminho (menu, atalho, tela já aberta, F5, duas abas) · erro (Firestore indisponível → tela mostra "indisponível", nunca zero).

## O que conta como prova (gradação — declarar sempre qual foi atingida)
1. **Validado no ensaio**: jornadas passaram no emulador com seed, console sem erro, screenshots gravados em `ensaio/saida/<branch>/`.
2. **Publicado conferido**: após merge, hash do arquivo no GitHub == local; 3 telas abertas em produção com perfil Chris (somente leitura) sem erro de console.
3. **Operação confirmada**: a pessoa real da equipe fez o gesto e confirmou (relato de Chris/Amanda/Cecília). Só isso fecha um erro reportado por humano.
Nunca declarar o nível 3 sem a pessoa. Nunca usar "documento fictício" em produção para subir de nível.

## Contraprova (obrigatória para correção de bug)
Antes de corrigir, a jornada **falha** no `main` (vermelho reproduzido). Depois, passa. Sem o vermelho antes, não se sabe se o teste testa alguma coisa — registrar na ficha "não reproduzido" e tratar como hipótese.

## Verificação estática que acompanha (não substitui)
`ferramentas/verificar_caminhos.py` (cliques→funções, `irPara`→views, ids, duplicatas) em `escritorio.html` e `portal-cliente.html`; baseline em 08/11/2026: 0 handlers quebrados, 2 rotas sem view estática (`capsulaAmanda`, `estrategiaCp109` — criadas dinamicamente), 13 ids mortos. O PR não pode piorar o baseline.

## Produção
Somente leitura para conferência (abrir telas, ler documentos). Escrita em produção = skill `get-publicacao-e-rollback`, com autorização explícita de Chris por operação.
