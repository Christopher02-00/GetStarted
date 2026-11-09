# Site Get — como o Claude Code trabalha neste repositório

Leia nesta ordem, antes de qualquer mudança:
1. `.claude/docs/PASSAGEM_PARA_CLAUDE_CODE.md` — ambientes, estrutura, regras, o que já foi feito, pendências, bugs, dúvidas (seção 0 diz por onde começar).
2. `AGENTS.md` — regras de engenharia e todos os incidentes/invariantes desde julho/2026. É lei.
3. `ensaio/README.md` — o portão de jornadas (emulador + navegador real) e as regras aprendidas.

## Processo obrigatório (skills em `.claude/skills/`)
- **get-arvore-do-pedido** — todo pedido vira unidades + árvore de impacto + 1 ficha por unidade, antes de tocar código.
- **get-mudanca-segura** — uma unidade = uma branch = um PR; menor diff na raiz; sem globais novos; PR em 5 blocos (Entendimento / Alterações / Provas de validação / Riscos-pendências / Próximo passo).
- **get-prova-de-jornada** — `node ensaio/rodar.mjs` verde (hoje 47/47) antes de todo PR; `--movel` quando mexer em interface; bug novo vira jornada nova, vermelha antes e verde depois.
- **get-publicacao-e-rollback** — CI verde → merge → conferir no ar (`https://get-started.agency`) → atualizar docs. Rollback = `git revert`.

## O que só o Chris autoriza (ok nominal)
`firestore.rules` (merge no `main` já publica no Firebase pelo workflow), deploy de `functions-get/`, qualquer escrita em dados de produção, coleções financeiras e `negocios`, identidade canônica de clientes, reativar pessoas desligadas, exclusão física.
Quando um pedido contraria `AGENTS.md`: diga a regra vigente e espere a decisão.

## Como falar com o Chris
Português, linguagem simples ao fechar etapas, dizer sempre qual é a próxima etapa e quantas faltam, nunca deixar nada em aberto, só dar por concluído a 100%.

## Atalhos
- `escritorio.html` tem 3,9 MB: buscar com `grep -n -o` e janelas; nunca substituição global.
- Ao mudar um `.mjs` importado pelo `escritorio.html`, atualizar o `?v=<sha256 do arquivo>` no import.
- `calendario.html` e `calendarios.html` precisam continuar byte a byte iguais.
- Emulador: `pkill -f cloud-firestore-emulator; pkill -f functionsEmulatorRuntime` se sobrar processo órfão.
