---
name: get-mudanca-segura
description: Usar ao implementar qualquer alteração de código no Site Get depois que a ficha da árvore existe — define como editar (menor diff, módulo por domínio, sem globais novos), os portões obrigatórios antes do PR e o formato do PR.
---

# Mudança segura — uma ficha, uma branch, um PR, um portão

## Antes de editar
1. `git fetch origin main && git switch -c <tipo>/<slug>` a partir do `main` atual. Nunca trabalhar em cópia solta de arquivo; nunca editar duas unidades na mesma branch.
2. Registrar o hash de cada arquivo que será tocado (`git hash-object`) na ficha — é o "antes".
3. Reler a ficha e a árvore. Se, ao abrir o código, a árvore se mostrar incompleta → voltar à skill `get-arvore-do-pedido`, não "ajustar no caminho".

## Como editar (regras de código do Site Get)
- **Menor diff que resolve a raiz.** Sem reformatar, sem renomear por gosto, sem "aproveitar pra arrumar" outra coisa (isso vira outra unidade).
- **Nada novo entra no `escritorio.html` inline se puder viver em módulo.** Mudança nova = arquivo `gs-<dominio>.mjs` nomeado pelo **domínio** (`gs-legendas.mjs`, `gs-gravacoes.mjs`), não pelo ticket. Se o domínio já tem módulo, estender esse.
- Ao alterar um módulo `.mjs`, atualizar o `?v=` no(s) HTML(s) que o importam com o SHA-256 novo (`sha256sum arquivo.mjs`). Esquecer isso = equipe usa versão antiga em cache.
- Módulos duplicados (raiz × `functions-get/lib`): alterar **os dois** ou, melhor, fazer um importar o outro. Nunca deixar divergir.
- `calendario.html` e `calendarios.html` continuam byte a byte iguais (`cmp`).
- Sem novos `window.*`; expor via objeto de módulo ou registrar em um único ponto já existente. Sem `catch(e){ return [] }`: erro vira estado "indisponível", nunca zero/lista vazia.
- Escritas Firestore: id determinístico ou transação; soft-delete; `registrarHistorico`/`registrarLogAutomacao` onde o padrão já existe.
- Nada de novo em `firestore.rules` sem medir o compilado (limite 256 KB; R8 foi recusada com 264.744 bytes). Preferir reaproveitar função de regra existente.
- Itens exclusivos por papel **não existem no DOM** dos outros papéis (esconder com CSS não é isolamento).
- Dados de operação (nomes de equipe, e-mails, clientes, exceções por cliente) → **não** hardcodar novos; usar `clientes_config`/`usuarios_equipe`/`emails_equipe`. Remoção de pessoa desligada = marcar inativa, preservar autoria.

## Portão obrigatório antes de abrir o PR (todos verdes, em ordem)
```bash
# 1. Sintaxe de TODO módulo e dos scripts inline
node --check <cada .mjs tocado>
python3 ferramentas/extrair_inline.py escritorio.html | xargs -I{} node --check {}
# 2. Integridade de caminhos (cliques → funções, irPara → views, getElementById → ids, duplicatas)
python3 ferramentas/verificar_caminhos.py escritorio.html --out /tmp/vc.json   # 0 handlers quebrados; nada novo além de ferramentas/baseline.json
# (repita para portal-cliente.html e calendario.html quando tocá-los)
# 3. Duplicatas e órfãos
python3 ferramentas/verificar_duplicatas.py .                                  # pares raiz×functions iguais; calendario==calendarios
# 4. Jornadas (skill get-prova-de-jornada): durante o trabalho, só as da ficha; antes do PR, a bateria inteira
node ensaio/rodar.mjs --jornadas <ids da ficha>   # iteração
node ensaio/rodar.mjs                            # obrigatório antes do PR (+ --movel se tocou interface)
# 5. Diff revisado linha a linha: nada fora do escopo da ficha
git diff --stat && git diff
```
Se qualquer passo falhar: corrigir **a causa**, não o teste. Se o teste estava errado, a correção do teste vai no mesmo PR com explicação na ficha.

## Formato do PR
Título: `<tipo>(<domínio>): <uma frase>` — ex.: `fix(legendas): demanda de legenda não fecha ao salvar`.
Corpo (cinco blocos curtos, sempre os mesmos):
1. **Entendimento** — pedido literal + unidade (U2 de 4).
2. **Alterações** — arquivos/funções, hash antes→depois, módulos com `?v=` trocado.
3. **Provas** — saída dos 5 passos do portão; jornadas executadas (papel, cenário, resultado); o que **não** foi testado e por quê.
4. **Riscos/pendências** — residual conhecido; regra vigente avisada e decisão de Chris.
5. **Próximo passo** — publicar (skill `get-publicacao-e-rollback`) ou aguardar.
Anexar a ficha (`fichas/…md`) no PR.

## Quando parar
- Duas tentativas na mesma hipótese sem evidência nova → parar, voltar ao diagnóstico, avisar Chris.
- Árvore cresceu além do previsto → parar, reescrever a ficha, avisar.
- Mudança compartilhada (login/`etapaSegura`, identidade, bootstrap, rules, helper global) → exige bateria transversal completa, não a mínima.

## O que esta skill não faz
Não publica, não mexe em Firebase real, não roda migração de dados. Isso é `get-publicacao-e-rollback`, com autorização explícita.
