# calendario-item-sem-itemid — o salvar do editor trava por item antigo sem itemId

Pedido original: Chris, 09/11/2026 ("Calendário trava ao salvar: item antigo sem `itemId`"). Master Chef 2026-12 não salvava: "O calendário possui ID ausente ou duplicado".
Unidade: 1 de 1 · Tipo: correção (rules + site), aplicação em dados com ok do Chris.

## Causa-raiz
1. **Origem:** os 3 itens (master-chef #29, divina-cantina #55, emanuelle-bernaski-nutri #28) têm exatamente as chaves do `novoItem` de `sincronizarItemDoCalendario` **anterior à V101**. Esse código foi gravado pelo cliente até o commit `1090062` (21/08/2026 18:22) e depois aposentado (hoje `escritorio.html` só devolve `{ok:false}`).
2. **Reparo quebrado:** a V102 ("Corrigir identidades de calendários antigos") dava `permission-denied`:
   - (a) `calendarios_versoes` não tinha regra própria, e a genérica nega `calendarios_*` com o processo exclusivo ativo (`XI`);
   - (b) o `update` de `calendarios` passava pelo `XI(y5())`, e o ramo antigo estourava o limite de 1000 expressões antes do ramo da migração (provado por bisseção no emulador: backup+recibo passam; só o `update` falhava).

## Árvore (escritores de `calendarios/{c}.items`, varrida por subagente)
```
├─ alterarAgendamentoPostagemV118 (cliente)   itemId = gerarItemIdCalendarioV101(postId) · bloqueado pelo XI com o processo ativo
├─ programar.mjs (servidor)                   itemId no novo e completa no legado (old.itemId||base.itemId)  ← J28
├─ restaurarAchadoVarredura (cliente)          passa por normalizarItensCalendarioV102
├─ calendario(s).html salvarItemNoSiteI35      itemId garantido · bloqueado pela Central R87 + XI
├─ editorial-calendarios-i172 / cp109 / cp142  itemId vindo do editor ou do pedido
└─ Calendario_Editorial_Interativo_Get.html    SEM itemId · página de jul/2026 sem login, sem link → sai do Pages
```
As rules não conseguem percorrer `items[]` para exigir `itemId` em cada item. A garantia fica nos escritores, que são todos servidor ou estão bloqueados pelo `XI`.

## Mudança (caminho (a), menor diff: o reparo do próprio site, sem deploy de Functions)
- `firestore.rules`:
  - `v102MigracaoItemIds(AP)` vira a 1ª alternativa do `allow update` de `calendarios`: só `ab()` (Chris real), só campos da migração, `itemIdMigradoEm==request.time` e recibo no mesmo commit (`existsAfter`);
  - `match/calendarios_versoes/{AV}` aceita só o backup `antes_itemids_v102` do Chris, com id `<cal>__v102_itemids__<op>` e preso ao recibo.
  - O recibo (`calendarios_itemid_migracoes`) já existia e não muda.
- Editor I172: quando o servidor recusa por ID ausente ou duplicado, a mensagem diz cliente, mês, dia e item (lê o calendário) e o caminho "Controle de conclusão → Corrigir identidades…".
- `_config.yml`: a página antiga sai do Pages.

## Testes
- J27 e J28 novas.
- Contraprova:
  - J27 no `main`: vermelha (mensagem sem diagnóstico; V102 negada);
  - J28 com o mutante sem `itemId` no `programar.mjs`: vermelha.

## Autorizações (ok nominal do Chris)
- O merge publica as rules.
- A aplicação nos 3 itens de produção é feita pelo Chris no botão (prévia → aplicar), já autorizada no pedido.

## Rollback
`git revert` (as rules voltam a negar a V102). Os itens já normalizados continuam válidos; o backup fica em `calendarios_versoes`.
