---
name: get-publicacao-e-rollback
description: Usar ao levar uma mudança aprovada do Site Get para produção (GitHub main/Pages, Firestore rules, Cloud Functions) e ao desfazer uma publicação — define a sequência, a conferência pós-publicação, a tag de versão, o rollback de 1 comando e a atualização de memória/projeto.
---

# Publicação e rollback — publicar é um evento, não um upload

## Pré-condições (todas)
- PR aberto pela skill `get-mudanca-segura`, portão verde, CI verde, ficha anexada.
- Chris autorizou **esta** publicação (uma frase: "pode publicar o PR #N"). Autorização genérica anterior não vale para rules/functions/dados.
- `git fetch origin main` — a branch está rebaseada no `main` atual (nada publicado por fora desde a abertura).

## Sequência — código (HTML/módulos)
1. Merge do PR em `main` (squash, mensagem = título do PR). Enquanto o GitHub App do Claude não estiver instalado, Claude entrega o PR pronto e Chris faz o merge.
2. Criar tag anotada `vAAAA.MM.DD-N` (ex.: `v2026.11.10-1`) no commit de merge. A tag é a versão publicada; substitui as pastas `rollback_v*`.
3. Aguardar o Pages (1–3 min). Conferir **hash**: `curl -sL https://codeload.github.com/Christopher02-00/GetStarted/tar.gz/refs/heads/main | tar -xzO <arquivo> | sha256sum` == local (raw.githubusercontent tem cache atrasado; usar o tarball).
4. Conferência de produção (somente leitura, perfil Chris): abrir Início, a tela alterada e uma tela vizinha da árvore; console sem erro; `?v=` dos módulos alterados está novo (Network).
5. Avisar Chris em 3 linhas: o que mudou, versão/tag, o que ele ou a equipe deve observar. Se a mudança afeta o fluxo de alguém (Cecília, Amanda…), incluir a frase que Chris pode encaminhar no WhatsApp.

## Sequência — `firestore.rules`
1. Medir o compilado localmente antes do PR (limite 256.000 bytes; R10 está perto). Rodar os testes de regras do `.qa-get`/ensaio com positivos **e** negativos do contrato alterado.
2. Publicar pelo Firebase CLI (`firebase deploy --only firestore:rules`) ou console, **com a mesma fonte do commit**. Guardar o id do ruleset na ficha.
3. Conferir: uma leitura permitida e uma negada do contrato alterado, em produção, com o perfil correto. Rules e HTML são publicações distintas — registrar as duas.

## Sequência — Cloud Functions (`functions-get/`)
1. Deploy somente das funções alteradas (`--only functions:<nome>`). Registrar revisão retornada.
2. Não repetir deploy por "cleanup warning" (histórico: exit 1 de limpeza não é falha).
3. Conferir log da função em 1 execução real ou disparo controlado.

## Sequência — dados (migração/correção em produção)
Só com autorização nominal de Chris para a operação. Sempre: prévia zero-write com contagem e amostras → confirmação → execução em transação/lote idempotente com id de operação → releitura e recibo (quantos docs, quais ids) na ficha. Soft-delete; nunca `deleteDoc` em dado operacional.

## Rollback
- **Código:** `git revert <commit do merge>` → PR de revert → merge → tag `vAAAA.MM.DD-N-revert`. Nunca copiar pasta antiga por cima; nunca reverter para a base da pausa (sempre para o commit imediatamente anterior).
- **Rules:** republicar o ruleset anterior (id guardado na ficha).
- **Functions:** redeploy da revisão anterior (fonte na tag anterior).
- **Dados:** rollback de dados é operação separada, com a mesma prévia/autorização; nunca automático.
Critério para reverter sem discutir: erro de console na Início para qualquer papel, fila que deixa de receber, tela em branco, regra negando operação legítima. Primeiro reverte, depois investiga.

## Depois de publicar (mesmo dia)
- Atualizar `claude/SITE_GET_01_ESTADO_ATUAL.md` no projeto Design Get: commit/tag vigente, ruleset, revisões de functions, pendências fechadas/abertas.
- Se a mudança criou regra nova de operação ou contrariou `AGENTS.md`: anotar em `claude/SITE_GET_00_REGRAS_VIGENTES.md` (uma linha, data, decisão de Chris).
- Jornada nova entrou no catálogo `ensaio/jornadas/`.
- Mover a ficha para `fichas/publicadas/`.

## Faxina (PRs próprios, um por vez, só com Chris ciente)
Remover `rollback_v*` (viram tags), manifestos/relatórios da raiz (viram `docs/historico/`), módulos órfãos, duplicatas raiz×functions (um importa o outro), `CATALOGO_DE_ERROS.md` e `functions-get/` fora do Pages (`_config.yml`). Cada remoção com `grep` de referência zero antes.
