# Get Started V100 — registro autônomo do filmmaker

## Estado da entrega

**Corrigido e validado localmente / pronto para publicação.** A produção continua V99 até o upload e a verificação posterior. Nenhum dado real, regra Firebase, calendário ou ambiente de produção foi alterado nesta entrega.

## Entendimento e causa

O print do usuário mostrou Luís na sessão Place `place|2026-08|S02`, com cinco vídeos esperados e zero títulos liberados. O contexto declarado foi que a pauta da Place atrasou. O dado exato que faltava no calendário não foi inferido; a causa estrutural comprovada foi o calendário editorial ter virado autorização prévia para registrar uma captação que já aconteceu.

A V99 corrigiu snapshots vazios e impediu marcar conteúdo de outra sessão, mas manteve Luís/Nathan dependentes de Amanda, Cecília ou Chris replanejar uma pauta. A V100 remove essa dependência sem voltar ao fluxo inseguro antigo.

## Alterações funcionais

- Somente Chris, Amanda ou Cecília cria e atribui uma nova gravação. Luís/Nathan não recebem a aba de criação e não podem escolher um cliente transversalmente.
- Luís/Nathan continuam limitados às sessões da própria equipe, com validação antes e dentro da transação.
- Quando existe checklist exato, ele permanece opcional, revalidado e é o único caminho capaz de marcar itens do calendário.
- Quando o calendário está ausente, vazio, inconsistente ou indisponível, o filmmaker informa os títulos realmente gravados. Esses vídeos ficam ligados apenas ao agendamento, com IDs de calendário nulos.
- Quantidade planejada virou estimativa de controle, nunca autorização. Diferença entre esperado e realizado fica visível e não cria tarefa ou aprovação automática para Cecília.
- Os vídeos continuam nascendo uma única vez em `aguardando_edicao`, sem editor atribuído, na fila posterior da Amanda.
- Erro, timeout, offline e `permission-denied` mostram código e indisponibilidade; nunca viram sessão vazia nem geram escrita parcial.
- Clique duplo, retry e duas abas continuam protegidos pela transação `agendado → realizado`.
- Textos do BIT, manual, alertas e Controle de gravações foram alinhados ao processo novo.

## Provas locais

- V100 domínio: **58/58**.
- V100 UI real extraída do HTML: **102/102**, Chrome headless, desktop 1180×820 e mobile 375×812, zero overflow e zero `pageerror`.
- Compatibilidade V99: **80/80** lógica e **57/57** UI.
- UI V89/V96/V97/V98: **41/41**.
- Regressão crítica: **610/610**.
- Regressões selecionadas: V74 37/37; V81 segurança 20/20; V81 calendários 67/67; V87 50/50; V89 carteira 8/8; V89 Stories 15/15; V90 12/12; V92 24/24; V95 15/15; V96 28/28; V97 44/44; V98 22/22.
- Preflight funcional: sintaxe inline **9/9** e todas as barreiras aprovadas. No espelho completo, permanece somente o bloqueio histórico deliberado da cópia `regression-critical.mjs` na raiz externa a `scripts/`.
- `firestore.rules`: inalterado, SHA-256 `5bd436eed9cc0512674e286e4349051337e1d365b61b62a64ed93a2332109350`.
- `calendario.html` e `calendarios.html`: inalterados, idênticos, SHA-256 `9fc8a2266acdf0fa7a122b29fe33c12c304c91cdf83bc94126dc8e7681006a0c`.
- `escritorio.html` V100: SHA-256 `7971c82d9945d92d33dd5841a36a89d30832e68d555119b8a0ec95c64fe7830e`.

## Arquivos públicos desta entrega

- `escritorio.html`
- `AGENTS.md`
- `CATALOGO_DE_ERROS.md`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- regressões V87, V95, V96, V97, V98, V99 e V100 incluídas no pacote
- `RELATORIO_V100_REGISTRO_AUTONOMO_FILMMAKER.md`
- `UPLOAD_V100.txt`
- `MANIFESTO_SHA256_V100.txt`

`rollback_v99/escritorio.html` é reserva local e não deve ser publicado.

## Critério de produção

Depois do upload, confirmar build/hash e executar uma sessão legítima atribuída a Luís ou Nathan: informar títulos reais sem checklist, concluir uma vez, verificar criação única em `videos_producao`, chegada à fila da Amanda, saldo no Controle e nenhum item de calendário marcado pela declaração. Somente essa jornada publicada pode encerrar a prova operacional.

## Rollback

Repor `rollback_v99/escritorio.html` em `escritorio.html`. Isso restaura a V99 (`73b23eda1f3ebe7743a01c58134c1004451c7c2c5d1676df76997e078d90e66a`) e reabre o bloqueio que exige replanejamento; não apaga nem desfaz dados já criados. Qualquer compensação de dado exige diagnóstico e autorização próprios.
