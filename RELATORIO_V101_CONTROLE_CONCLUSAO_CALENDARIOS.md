# RELATÓRIO V101 — CONTROLE DE CONCLUSÃO DOS CALENDÁRIOS

Data: 21/08/2026  
Build: `2026-08-21-controle-conclusao-calendarios-v101`  
Pai: V100 — registro autônomo do filmmaker

## Resultado

A V101 acrescenta, dentro da aba **Calendários**, o submodo **Controle de conclusão** para Cecília e Chris. Cada cartão representa um cliente e uma competência, mostra o progresso operacional real e, separadamente, a conferência administrativa da Cecília. Pendências anteriores continuam visíveis na virada do mês.

O painel é consumidor das fontes existentes e não cria uma segunda operação. Calendário, captação, vídeo, aprovação, legenda, agendamento, publicação e Portal continuam com seus escritores e estados atuais.

## Definição de conclusão

- `captado`, `aguardando_edicao`, `correcao`, `aguardando_aprovacao`, `aguardando_cliente`, `aguardando_legenda` e `agendado` são andamento;
- `postagens.status = postado` é a conclusão normal do conteúdo recorrente;
- finalizações diretas reconhecidas e auditadas também podem ser terminais;
- encerramento excepcional é exclusivo de Chris, exige motivo e não é oferecido quando o fluxo já concluiu o item;
- a marca **Conferido pela Cecília** nunca altera o estado operacional.

## Dados e segurança

A identidade é `calendarId + competencia + itemId`. Título, posição e índice não são identidade. Item legado sem `itemId` permanece somente leitura e não produz 100% verificado.

As únicas novas escritas ficam em:

- `calendarios_conferencias/{calendarId}/competencias/{competencia}/itens/{itemId}`;
- `calendarios_encerramentos/{calendarId}/competencias/{competencia}/itens/{itemId}`;
- subcoleção append-only `eventos/{operationId}` de cada retrato.

Retrato e evento nascem juntos em transação. As regras validam papel real, papel operado, campos exatos, revisão, timestamps do servidor, SHA-256 da fonte, `operationId`, evento correspondente, imutabilidade e proibição de delete. Cecília confere; Chris pode conferir apenas quando opera explicitamente como Cecília; encerramento excepcional pertence somente a Chris no próprio perfil. Outros papéis não recebem DOM nem leitura.

## Preservação da V100/Place

A V101 não altera `sessaoPlanejamentoVersao`, `sessaoItensPlanejados`, autorização de captação ou baixa do filmmaker. Produção V100 declarada sem `calendarItemId` continua sem vínculo e nunca é casada por título. Os escritores posteriores foram endurecidos para copiar o vínculo canônico quando existe e preservar o calendário quando a origem é manual, ausente ou divergente.

## Falhas e concorrência

- erro, timeout, cota, `permission-denied`, alias ambíguo ou fonte parcial aparecem como indisponibilidade/inconsistência; nunca como 0%;
- ações ficam bloqueadas quando a fonte não é confiável;
- clique duplo, retry e duas abas usam trava anterior ao primeiro `await`, `operationId` derivado da intenção, transação, revisão e recibo;
- mudança operacional posterior torna a conferência antiga visivelmente desatualizada, sem apagar histórico;
- renderizar, filtrar, trocar competência ou recarregar nunca cria documento.

## Provas locais

- V101 lógica: **128/128**;
- V101 UI: **127/127**, Chrome headless, desktop 1440×1000 e mobile 375×812, sem overflow ou `pageerror`;
- Firestore Emulator isolado: **46/46**, `expression_limit_hits=0`;
- regressão crítica: **610/610**;
- V100 Place/filmmaker: **58/58**;
- V99 compatibilidade de sessões: **80/80**;
- V97 login: **44/44**;
- V98 perfil Chris: **23/23**;
- V81 segurança: **20/20**;
- V87 Calendários: **50/50**;
- `calendario.html` e `calendarios.html`: byte a byte idênticos, SHA-256 `9fc8a2266acdf0fa7a122b29fe33c12c304c91cdf83bc94126dc8e7681006a0c`.

O `preflight` funcional passou e conserva um único bloqueio histórico deliberado: a cópia antiga `regression-critical.mjs` na raiz. Ela não foi removida, por decisão expressa; `_config.yml` impede que ela e os rollbacks executáveis sejam servidos pelo GitHub Pages.

## Selos antes da publicação

- `escritorio.html`: `427d21697923ef74388a2275cde4e350c1369df36163ee9b7a476623c3b05856`;
- `firestore.rules`: `7616469ddf73c3c88758b3f23214fc45ea86f8d5e4623784a830aec0835b5c45`;
- teste lógico V101: `deadd14e91b939f9583685fcf13aa8d2b62905d07781745ef0a7d342c27e73bb`;
- teste UI V101: `025455948bd6af7856d8f849dc2b0c55550964dcc2de0b0ca97384f8978714ec`.

## Limites honestos

Nenhum sistema em produção possui risco literal zero. As regras não conseguem recomputar o estado terminal de vídeo/postagem nem provar a presença do `itemId` dentro do array do calendário; essa semântica é revalidada pela transação do frontend e o checkbox nunca altera as fontes do workflow. Uma validação ainda mais forte exigiria backend confiável/Cloud Function e nova infraestrutura operacional. A primeira carga histórica também cresce com o número de competências; a V101 limita concorrência e usa cache, e um rollup server-side é a evolução indicada antes de o histórico crescer significativamente.

Estado deste relatório: **corrigido e validado localmente / pronto para publicação**. Publicação das regras, deploy Pages e jornada autenticada são provas separadas.
