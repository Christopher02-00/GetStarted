# feat(ate-quando): Amanda volta a abrir "Postagem Até Quando"; uma conta só para as três telas

## Entendimento
Pedido do Chris (16/11/2026): "A Amanda perdeu acesso a tudo de 'conteúdos até quando'… deixe ideal para o nosso processo de hoje… ela precisa saber até quando tem conteúdo, ver tudo que está agendado, tudo que não está agendado e a frequência de cada cliente." Unidade U2 (a U3, aviso de cápsula, vem em seguida na branch `feat/alerta-capsula`). Ficha: `fichas/2026-11-16-ate-quando-amanda.md`.

Causa: com a Central R87 ligada, `gs-central-unificada-r87.mjs` escondia `navControlePostagem` da Amanda. A exceção existia só para a Cecília, então é a §52.1 de novo. Além disso, havia três contas diferentes para a mesma pergunta: a tela do controle usava a data manual, a tela antiga contava só `agendado` e o resumo do painel somava datas do calendário.

## Alterações
- `gs-central-unificada-r87.mjs`: tabela `MANTIDOS_NA_BARRA`. A Amanda mantém `navPostagens` e volta a ter `navControlePostagem`; a Cecília fica como estava; o Chris continua sem o item na barra (pedido antigo dele) e entra pela Central. Hash d4795cb8… → novo; `?v=` atualizado no `escritorio.html`.
- `gs-ate-quando-postagens.mjs` (novo, puro):
  - `coberturaPostagensAteQuando` é a regra do alerta, movida sem mudar.
  - `projetarAteQuando` monta, por cliente: a data até onde há conteúdo (última postagem ativa `agendado`/`postado`), a faixa, a lista de agendados daqui para frente e a lista do calendário ainda não agendado (mês atual e seguinte).
  - Também calcula a frequência: planejada por mês e por semana a partir do calendário, real pelos últimos 30 dias.
  - A anotação manual entra como divergência. O módulo traz ainda os helpers de HTML.
- `escritorio.html`:
  - Import estático com `?v=` e `calcularCoberturaPostagens` delegando ao módulo.
  - `carregarProjecaoAteQuando()` é usada por `renderControlePostagem`, `renderConteudoAteQuando` (agora com guarda de papel) e `htmlPostagemAteQuandoResumo`.
  - Falha nas postagens ou na carteira mostra um cartão de erro, nunca zero. Falha em calendário, anotações ou entrega direta mostra um aviso na tela e deixa a linha "indisponível".
  - Hash 64a6a9e2… → novo.
- `ensaio/jornadas/J69-ate-quando-amanda.mjs` (novo), `ensaio/README.md` (linha J69), `CATALOGO_DE_ERROS.md` §52.6, `AGENTS.md` (invariante), `CLAUDE.md` e `PASSAGEM` (portão 178/178).

## Provas de validação
- Sintaxe: `node --check` do módulo e `extrair_inline.py | node --check` OK. `verificar_caminhos.py`: 0 handlers quebrados, nada novo além da linha de base. `verificar_duplicatas.py`: 0 divergências novas. `cmp calendario.html calendarios.html` deu iguais.
- Contraprova no `main` (J69 rodada no código do `main`, com a trava compartilhada), 2/4 vermelhos:
  - a1: "Postagem Até Quando" não estava na barra lateral da Amanda.
  - a2 e a3: os cartões da nova tela não existiam.
  - d (Helo bloqueada) já passava.
- Depois da mudança, J69 4/4 verde:
  - Amanda e Cecília abrem pela barra; o Chris abre pela Central.
  - O cliente semeado mostra até 25/11 (data da postagem, não a anotação de +30 dias), agendados j69-a e j69-b e não agendados calitem_j69_3 e calitem_j69_4.
  - Frequência: "planejado: 3/mês · ~0,7/semana (nov/2026; dez/2026: 1) · real: 2 nos últimos 30 dias".
  - A tela antiga e o resumo do painel dão o mesmo resumo.
  - A Helo não tem a porta nem a tela.
- Bateria inteira: desktop **178/178**; `--movel` **178/178** (o resultado está no relatório da entrega).
- Não testado: `.qa-get` (Node 24 e dependências ausentes neste Mac; o teste R87 de lá não confere o `navControlePostagem` da Amanda). Ele roda no CI do PR.

## Riscos/pendências
- Nenhuma mudança em rules, Functions ou dados de produção.
- Cliente sem calendário mostra "planejado: sem calendário". A tela agora lê `calendarios` também para a Cecília, leitura que as rules já permitiam (a RULES do portão não mostrou leitura negada).
- O resumo "sem nada programado" passa a contar clientes da carteira sem postagem futura. Antes, quem não tinha anotação manual aparecia como "sem data".

## Próximo passo
Abrir o PR (sem `gh` neste Mac, então push e PR ficam com o Chris ou com a próxima sessão) → CI → merge → conferir no ar (skill get-publicacao-e-rollback). Depois, a U3 `feat/alerta-capsula`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
