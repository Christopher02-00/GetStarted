# Relatório V89 — Calendários e Stories

Data da consolidação: 19/08/2026  
Base usada: pacote V88 que estava separado para upload  
Identificador da entrega local: `2026-08-19-calendarios-stories-v89`

## Entendimento e evidência inicial

Esta etapa tratou somente Calendários e Stories. Financeiro, cadastro, contatos, vendas e produção não foram usados como pretexto para ampliar a mudança.

Os dois vídeos enviados pela Gabi foram analisados como evidência funcional:

1. `WhatsApp Video 2026-08-19 at 14.16.59 (2).mp4`: ao entrar em **Calendários > Montar e editar**, a carteira terminava em **“Nenhum cliente encontrado”**.
2. `WhatsApp Video 2026-08-19 at 14.17.41.mp4`: ao entrar em **Visão do mês**, a tela permanecia em **“Lendo os calendários...”**.

A causa comprovada não era a ausência dos calendários. A montagem da carteira operacional da Gabi ainda dependia de leituras/classificações gerenciais. Quando uma dessas leituras era negada, demorava ou falhava, a interface perdia a carteira ou não concluía a montagem. Essa dependência contrariava a separação entre a operação editorial e dados de gestão.

## Correções aplicadas localmente

### 1. Carteira operacional dos calendários

- A carteira da Gabi passou a usar somente as fontes operacionais permitidas: `clientes_extras` e `clientes_config`.
- A classificação mensalista foi projetada sem consultar contratos, mensalidades, clientes encerrados ou financeiro.
- Leituras concorrentes são unificadas e há um retrato confirmado com validade curta.
- Se uma leitura posterior falhar, a tela conserva a última carteira confirmada e exibe indisponibilidade; não converte a falha em lista vazia.
- Se a primeira leitura falhar, a tela mostra erro explícito; não mostra “nenhum cliente”.
- A **Visão do mês** aguarda carteira e calendários dentro da mesma barreira de erro, encerrando o estado “Lendo...”.
- IKN, IKN Brasil e X Joias permanecem fora das carteiras editoriais por serem avulsos.

### 2. Títulos, tabelas e linguagem de estado

- “Mês publicado” foi substituído por **“Mês para conferir ou copiar”**.
- “Copiar link publicado” foi substituído por **“Copiar link do mês”**.
- “Liberar e copiar para cliente” foi substituído por **“Copiar para o cliente”**, porque Cecília copia; ela não publica.
- O estado legado `aprovado_interno` agora é exibido como **“Aprovação da versão antiga — falta publicar”**.
- `liberado` é exibido como **“Publicado — cliente já vê”**.
- A fila e os indicadores explicam aprovações antigas que ainda precisam de publicação, sem confundir aprovação interna com acesso do cliente.

### 3. Cadeia Gabi → Amanda → Cecília → cliente

- Gabi continua gravando e enviando o mesmo documento mensal para `aguardando_interna`.
- Amanda continua sendo a única etapa que aprova e publica para o cliente, com releitura transacional do estado e recibo.
- A publicação de um mês não arquiva nem altera outro mês.
- Cecília pode abrir internamente qualquer competência válida e copiar apenas o mês já publicado para o cliente.
- Copiar o link não altera estado, não publica e não regrava conteúdo.
- O cliente recebe exatamente a competência solicitada; um rascunho não aparece como publicado.
- Mês arquivado mostra apenas **“Calendário arquivado”**.
- Agosto e setembro de 2026 coexistem; outubro continua independente.
- `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.

### 4. Stories da equipe e do Portal

- Leituras da carteira de Stories, roteiros e links passaram a ter tempo limite explícito.
- Uma falha posterior conserva o último retrato confirmado e mostra indisponibilidade.
- Uma falha inicial não é apresentada como “nenhum Story”.
- Clientes de Stories já cadastrados continuam visíveis mesmo quando a carteira de inclusão não responde.
- A inclusão de novo cliente de Story oferece somente mensalistas confirmados; avulsos não aparecem.
- Entrada, saída e reativação preservam a identidade operacional e usam exclusão lógica.
- Links só ficam clicáveis quando são HTTPS válidos; links legados inválidos permanecem visíveis como erro e não abrem.
- A troca de usuário/papel limpa os retratos em memória para impedir vazamento entre sessões.

## Arquivos funcionais da V89

- `escritorio.html`
- `calendario.html`
- `calendarios.html`
- `portal-cliente.html`
- `CATALOGO_DE_ERROS.md`

Não houve alteração de `firestore.rules` nesta etapa V89.

## Evidências de validação

### Controles gerais e de autorização

- `scripts/preflight.mjs`: **APROVADO**.
- `scripts/regression-critical.mjs`: **608 asserções aprovadas**.
- `scripts/regression-v81-seguranca.mjs`: **20 verificações aprovadas**.
- `scripts/regression-v81-clientes.mjs`: **49 verificações aprovadas**.
- Os nove scripts inline dos HTMLs compilam.
- Nenhuma exclusão física operacional foi introduzida.
- `calendario.html` e `calendarios.html`: comparação byte a byte aprovada.

### Regressões de Calendários

- V81 Calendários: **67/67**.
- V83 Arquivo: **15/15**.
- V85 Acesso: **19/19**.
- V86 Fluxo simples: **24/24**.
- V87 Operação: **50/50**.
- V88 Arquivo e avulsos: **55/55**.
- V89 Carteira por papel: **8/8**.

### Cliques reais em navegador local isolado — Calendários

`scripts/regression-v89-ui-calendarios.mjs`: **6/6**.

- Gabi clicou em “Montar e editar” e viu a carteira mensalista.
- IKN/X Joias não apareceram.
- Gabi clicou em “Visão do mês” e a leitura terminou.
- Não houve consulta a coleções gerenciais.
- Falha posterior preservou a carteira com aviso.
- Falha inicial apareceu como indisponibilidade, não como lista vazia.

`scripts/regression-v89-ui-cadeia-calendarios.mjs`: **9/9**.

- Clique da Gabi levou setembro a `aguardando_interna`.
- Clique da Amanda publicou setembro e confirmou o recibo.
- Agosto permaneceu publicado; outubro permaneceu rascunho.
- Conteúdos não foram apagados nem duplicados.
- Cecília abriu outubro internamente antes de publicação.
- Cecília copiou o link exato de setembro sem mudar o estado.
- Cliente abriu agosto e setembro.
- Cliente não viu outubro e recebeu mensagem de preparação.

Os dados desses cliques foram isolados em memória; nenhum documento real do Firebase foi criado ou modificado.

### Regressões e cliques reais — Stories

- V81 Portal/Stories: **25/25**.
- V86 Cadeia de Stories: **19/19**.
- V89 Stories/Operação: **15/15**.
- `scripts/regression-v89-ui-stories.mjs`: **11/11 cliques reais**.

Os cliques confirmaram: Vitalle visível; iPhone Campo Largo como candidato mensalista; avulsos ausentes; URL segura clicável; URL insegura bloqueada; inclusão sem duplicação; retirada lógica; Vitalle preservada; falha posterior com cache; timeout explícito; e falha inicial diferente de vazio.

### Comparação com o site publicado

Em 19/08/2026, a leitura pública dos quatro HTMLs mostrou o marcador `2026-08-19-calendarios-arquivo-v88`. Os identificadores e helpers novos da V89 não estavam presentes no site público. Logo:

- a V89 está validada localmente;
- o site publicado ainda era V88 no momento da conferência;
- nenhuma afirmação de correção em produção é feita neste relatório.

## Limites de validação

1. A V89 ainda precisa ser enviada manualmente pelo usuário para substituir os arquivos correspondentes no GitHub.
2. Depois que a publicação terminar, é necessário comparar o marcador público e repetir os cliques nas contas reais de Gabi, Amanda e Cecília.
3. Nenhuma escrita foi feita no Firebase real nesta etapa. Um ensaio fim a fim com escrita em produção só pode ocorrer após autorização pontual, com coleção, identidade fictícia, impacto e limpeza definidos antes.
4. Os testes de navegador atravessaram DOM, handlers, estados, transações e permissões simuladas com dados isolados. Eles não substituem a confirmação pós-publicação com autenticação e regras reais.

Classificação desta entrega: **pronto para publicar; ainda não comprovado em produção**.

## Reversão

A V89 é um conjunto de substituições completas. Se a publicação apresentar comportamento diferente do ensaiado, a reversão é restaurar os quatro HTMLs e os scripts/documentos da V88. Não há migração de banco nem alteração de regras para desfazer nesta etapa.
