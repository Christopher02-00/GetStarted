# feat(capsula): aviso de cobertura fala em conteúdo cápsula; cliente sem nenhuma postagem passa a ser avisado

## Entendimento
Pedido do Chris (16/11/2026): "Traga de volta o aviso que tínhamos sobre conteúdo cápsula: quando um cliente fica muito tempo sem postagem, trazemos conteúdo cápsula (pré-programado, só edição, sem gravação) para o cliente não ficar sem postagem." Unidade U3. Esta branch sai da U2 (`feat/ate-quando-amanda`), porque usa a mesma projeção. Ficha: `fichas/2026-11-16-alerta-capsula.md`.

Dentro da §52.3: o sistema só avisa a Amanda e leva até o painel manual. Nada é acionado sozinho.

## Alterações
- `gs-ate-quando-postagens.mjs`:
  - `slugsComCalendarioAteQuando` e o evento `sem_postagem_programada`, para cliente da carteira com calendário ativo e nenhuma postagem ativa com data.
  - Textos do alerta: "🥶 <Cliente> sem postagem programada há N dias — avaliar conteúdo cápsula" e "🥶 <Cliente> sem nenhuma postagem programada — avaliar conteúdo cápsula", com a descrição do que é conteúdo cápsula.
  - `htmlAcoesAlertaCoberturaAteQuando`: botão "🥶 Avaliar conteúdo cápsula" (só Amanda, abre `irParaCapsulaAmanda()`) e "📆 Ver Postagem Até Quando".
- `escritorio.html`:
  - O motor `verificarCoberturaPostagensAmanda` também lê `calendarios`; se a leitura falhar, a rodada é abortada (§53).
  - A validade e o encerramento cobrem a etapa nova, e os textos vêm do módulo. Id estável `alerta_cobertura_<slug>__sem_postagem_programada`, criado em transação.
  - O modal genérico da demanda ganha o bloco de cápsula, e a tela usa o mesmo texto.
  - `?v=` do módulo atualizado.
- `ensaio/jornadas/J70-alerta-capsula.mjs` (novo), `ensaio/README.md`, `CATALOGO_DE_ERROS.md` §52.7, `AGENTS.md`, `CLAUDE.md` e `PASSAGEM` (portão 182/182).

## Provas de validação
- Sintaxe: inline e módulo OK. `verificar_caminhos`: 0 handlers quebrados, nada novo. `calendario.html` e `calendarios.html` iguais.
- Contraprova no `main` (J70 no código do `main`, com a trava compartilhada): a/b/c vermelhos, "nenhum alerta (0)". O d (capsulas_clientes intacta) já passava.
- Depois da mudança, J70 4/4:
  - a: 1 alerta "🥶 Gelateria J70 sem nenhuma postagem programada — avaliar conteúdo cápsula" para a Amanda; o botão do painel existe e abre `view-capsulaAmanda`.
  - b: a 2ª rodada não duplica (1 alerta).
  - c: a postagem agendada encerra o alerta com `cancelado_automaticamente` + `excluido`, motivo "Postagem programada até …", e nenhum alerta novo abre.
  - d: `capsulas_clientes` 0 → 0.
- Bateria inteira sobre a U2: desktop **182/182**, `--movel` **182/182**.
- Guardas da §52.3 conferidos no código: o verificador não contém `capsulas_clientes` nem `acionarCapsulaAmanda`, e o destinatário continua só a Amanda.

## Riscos/pendências
- Em produção, todo cliente da carteira com calendário e sem nenhuma postagem ativa com data recebe 1 alerta na primeira rodada depois da publicação. É o comportamento pedido, mas pode chegar de uma vez a vários clientes novos ou parados.
- O id "sem postagem" é estável por cliente: depois de encerrado, só renasce se o documento for outro (os eventos por data cobrem o caso comum).
- Nenhuma mudança em rules, Functions ou dados.

## Próximo passo
Mergear a U2 primeiro e depois este PR (CI → merge → conferir no ar). A confirmação real vem da Amanda ao receber o primeiro aviso.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
