# RELATÓRIO V103 — FINANCEIRO POR COMPETÊNCIA E CICLO TEMPORAL

Data: 22/08/2026  
Build: `2026-08-21-financeiro-por-competencia-v103`  
Base anterior: V102 — identidade segura dos calendários legados

## Resultado

A V103 reorganiza a frente financeira para que **Contratos, Mensalidades, Financeiro e Régua de Cobrança usem a mesma competência, a mesma identidade canônica e os mesmos estados**. A tela deixa de criar mensalidades apenas por ter sido aberta. Uma obrigação ainda não materializada pode ser exibida como projeção somente leitura; o primeiro documento nasce somente por uma ação financeira clara de papel autorizado.

Competência contratual e caixa passam a ser informações diferentes. Uma mensalidade de agosto recebida em setembro continua pertencendo a agosto, mas entra no caixa pela data real do recebimento. Assim, os totais não precisam mais fingir que “quitado no mês” e “dinheiro que entrou no mês” são o mesmo número.

O código, as regras e os testes estão **corrigidos e validados localmente / prontos para publicação**. Nenhuma regra V103 foi aplicada no Firebase real e nenhum documento operacional foi alterado pelo Codex. O ambiente publicado continua sendo considerado V102 até a conferência posterior ao upload do usuário.

## Relato transformado em requisitos

O pedido reuniu uma única causa financeira com estes efeitos observáveis:

- não existia troca coerente de competência em toda a Régua de Cobrança;
- atrasos anteriores, mês atual e mês seguinte apareciam misturados;
- totais equivalentes divergiam entre Financeiro, Mensalidades, Régua e Contratos;
- abrir Mensalidades podia materializar cobranças sem uma decisão humana;
- entrada, saída e reativação eram tratadas como um retrato “ativo agora”, insuficiente para reconstruir cada mês;
- duplicatas e aliases podiam competir pela mesma identidade financeira;
- estados terminais não eram interpretados de forma uniforme no Portal;
- salário, custo, ajuste e receita não recorrente não possuíam um livro operacional próprio separado das mensalidades;
- o usuário precisava corrigir o valor futuro da Vitalle, retirar três clientes da carteira financeira de setembro, preservar duas empresas Joaquim distintas e guardar o contato financeiro da Zeiss somente na área privada.

## Causa comprovada

A causa não era um único total incorreto. Quatro superfícies mantinham leitores e cálculos diferentes:

1. **Mensalidades** criava documentos de `pagamentos_mensais` durante a renderização.
2. **Financeiro** misturava competência da obrigação com data efetiva do caixa.
3. **Régua de Cobrança** não possuía uma divisão estável entre passivo anterior, competência selecionada e previsão seguinte.
4. **Contratos e ciclo do cliente** representavam prioritariamente o estado atual e um único começo/fim, sem uma linha temporal segura para saída e reativação.

Esse desenho permitia que duas telas corretas para suas próprias regras apresentassem números diferentes entre si. A correção, portanto, precisava centralizar o cálculo e preservar os escritores legítimos, não apenas trocar rótulos ou ajustar um total no HTML.

## Evidência real usada sem escrita

Foi feita auditoria somente leitura das fontes necessárias. Ela confirmou que o estado real exigia uma correção consciente depois da publicação, sem autorizar alteração automática:

- o contrato da Vitalle ainda estava com o valor anterior e havia mensalidades futuras abertas nesse valor;
- a Monique ainda aparecia financeiramente ativa e sem saída consolidada para setembro;
- Joaquim Assados e Açougue São Joaquim são identidades distintas e devem permanecer separadas;
- existiam registros repetidos do evento de saída do Joaquim, embora apenas um pudesse ser autoritativo;
- a Zeiss estava ativa, mas o contato solicitado não existia na agenda financeira privada.

Essa leitura não publicou regras, não alterou contrato, pagamento, saída, contato, calendário ou Portal. O contato informado pelo usuário não foi escrito em código, teste, relatório, manifesto ou fixture.

## Arquitetura aplicada

### 1. Núcleo puro e compartilhado

`financeiro-core.mjs` recebe retratos já lidos e devolve projeções determinísticas. Ele não possui DOM, Firebase, credencial ou efeito colateral. O mesmo núcleo calcula:

- vigência por competência;
- valor devido por competência;
- estado canônico da mensalidade;
- obrigações materializadas e virtuais;
- receita prevista, quitada e em aberto;
- caixa por data real;
- atrasos anteriores, mês selecionado e previsão seguinte;
- ativos, entradas e saídas de cada competência;
- conflitos de identidade, vigência e pagamento.

Um conflito torna o resultado indisponível para ação. Ele não é convertido em zero nem resolvido pela escolha silenciosa do primeiro documento encontrado.

### 2. Integração única das quatro superfícies

`financeiro-ui-v103.mjs` instala os leitores e escritores V103 nas telas existentes. Trocar de mês sincroniza a competência exibida e todas as telas derivam os totais do mesmo retrato confirmado.

O módulo antigo permanece apenas como compatibilidade de carregamento; os caminhos públicos de renderização apontam para a V103. Isso impede que um botão ou listener residual execute o escritor antigo que materializava mensalidades na abertura.

### 3. Ciclo temporal do cliente

O contrato passa a aceitar `vigencias[]`, com intervalos explícitos de início e fim. Essa lista é autoritativa quando existe. Dados legados continuam legíveis de forma direcional por `primeiraCompetencia`, `ultimaCompetenciaPagamento` e reativações conhecidas, mas abrir a tela não migra nem regrava o documento.

Uma saída fecha o intervalo correto. Uma reativação cria outro intervalo; o hiato não volta a ser faturado. A tabela de carteira da competência deriva esses intervalos e informa quantos clientes estavam ativos, entraram ou saíram no mês escolhido.

### 4. Ledger mínimo e append-only

Mudanças financeiras relevantes geram um evento determinístico em `clientes_ciclo_financeiro`. O evento guarda identidade, operação, tipo, competência, fonte, hashes antes/depois, autoria e horário. Ele não copia ficha completa, calendário, telefone ou conteúdo editorial.

O ledger não é uma segunda fonte de valor. Contrato, mensalidade, saída e lançamento continuam sendo as fontes de negócio; o ledger prova a transição e impede repetição silenciosa.

## Como cada tela funciona

### Mensalidades

- mostra `previsto`, `quitado` e `em aberto` da competência selecionada;
- inclui obrigação virtual claramente marcada quando o documento ainda não existe;
- abrir, recarregar ou trocar mês não grava nada;
- `Recebi`, `Cortesia` ou criação explícita materializam/alteram somente o alvo revalidado;
- pago, isento e cancelado permanecem terminais e não recebem ação normal de cobrança;
- falha de leitura mostra **Mensalidades indisponíveis**, sem zerar totais.

### Régua de Cobrança

A Régua passa a ter três blocos separados:

1. **Atrasados de competências anteriores** — somente documentos reais ainda abertos e vencidos;
2. **Competência selecionada** — a vencer, em carência ou atrasada, sempre com o mês visível;
3. **Próxima competência** — previsão contratual somente leitura, sem criação automática de cobrança.

Abrir a conversa não registra envio. `Confirmar que enviei` continua sendo uma ação separada e transacional. Um contato ausente pode ser corrigido na agenda privada do Chris; o número não entra na Central compartilhada nem no Portal.

### Financeiro

O topo apresenta a ponte de reconciliação:

- receita recorrente prevista da competência;
- quanto daquela competência foi quitado;
- quanto permanece em aberto;
- caixa líquido do mês pela data efetiva de recebimentos e pagamentos.

Um pagamento atrasado recebido depois aparece na competência original e no caixa da data real, sem duplicar receita. Custos, salários, ajustes de receita e outros movimentos usam `financeiro_lancamentos`; ficam separados de mensalidades e de trabalhos extras.

Um lançamento previsto só entra no caixa depois de uma baixa explícita com **data real do pagamento**. Cancelamento preserva o documento e o evento; não existe delete físico.

### Contratos

- a competência escolhida determina a carteira e o valor mostrado;
- a primeira competência é histórica e somente leitura nessa tela;
- o valor base vigente não pode ser editado como atalho;
- alteração comercial é programada com novo valor, competência inicial e motivo;
- a transação usa revisão monotônica, `financeiroOperationId` determinístico e evento correspondente;
- mensalidades futuras já existentes podem acompanhar o novo valor apenas quando ainda estão abertas ou isentas;
- mensalidade paga ou cancelada nunca é reescrita;
- se outro documento surgir em paralelo, a tela não confirma sucesso falso e exige reconciliação.

### Portal do Cliente

O Portal usa a mesma interpretação de estado terminal. Pago, isento, cancelado, encerrado, arquivado ou finalizado não reaparecem como cobrança aberta. O cliente continua isolado pelo próprio slug e não recebe ledger, contratos, carteira financeira, custos ou contatos privados.

## Correção dirigida de setembro

A V103 inclui, no Financeiro exclusivo do Chris, o bloco **Conferência dos dados reais de setembro**. O primeiro botão é `Ver prévia segura`; ele relê todas as fontes e não grava.

A aplicação só é oferecida se a prévia confirmar, simultaneamente:

- contrato físico canônico único para cada alvo;
- nenhum pagamento posterior incompatível;
- saídas autoritativas confirmadas;
- vigências que podem ser fechadas sem sobreposição;
- Vitalle programada em R$ 1.000 a partir de `2026-09`, preservando pagos e cancelados;
- Monique, Joaquim Assados e Açougue São Joaquim fora da carteira financeira de setembro, com último mês financeiro em agosto;
- Joaquim Assados e Açougue São Joaquim preservados como empresas distintas;
- exatamente **19 clientes ativos** na projeção simulada de setembro;
- contato da Zeiss informado no momento da ação e destinado apenas a `contatos_clientes_financeiro`.

Se qualquer fonte mudar depois da prévia, a transação falha antes da escrita. Eventos determinísticos permitem retry sem duplicar a correção. Depois do commit, contratos, saídas, pagamentos, contato, duplicatas arquivadas e recibos são relidos; divergência impede mensagem de sucesso.

A ferramenta não foi executada pelo Codex em produção. O primeiro uso real pertence ao Chris, depois de o usuário publicar frontend e regras V103 e confirmar a prévia verde.

## Segurança e papéis

- Financeiro, Mensalidades, Régua, agenda financeira, lançamentos e correção dirigida permanecem exclusivos do Chris.
- Amanda continua com o fluxo de entrada e com a visão restrita de Contratos necessária ao cadastro, sem receber caixa, mensalidades, Régua, lançamentos, ledger, contatos privados ou totais monetários do Chris.
- Cecília, Gabi, Luís, Nathan, editores e clientes não recebem DOM nem leitura financeira por conveniência.
- `clientes_ciclo_financeiro` é exclusivo do Chris e append-only.
- `financeiro_lancamentos` valida campos, identidade, operação, estado e evento correspondente.
- alterações de contrato exigem revisão, operação e ledger no mesmo commit.
- atualização de mensalidade por valor programado exige o contrato correspondente e preserva estados terminais.
- delete físico permanece proibido; duplicatas são arquivadas por soft-delete.
- erro, timeout, cota ou `permission-denied` bloqueiam ação e exibem indisponibilidade.

## Concorrência e idempotência

- a trava local é armada antes do primeiro `await`;
- operações possuem ID determinístico;
- a transação relê contratos, mensalidades, saídas, contatos e eventos;
- revisão de contrato impede duas abas de confirmarem versões diferentes;
- clique duplo e retry não criam segundo evento ou segunda baixa;
- um recibo existente só é aceito quando todo o estado final também confere;
- falha parcial ou recibo divergente manda atualizar e auditar, nunca repetir às cegas.

## Compatibilidade e limites

A V103 não altera calendário, itemId, captação, vídeo, postagem, Stories, Portal editorial ou autorização de Luís/Nathan. O incidente Place/V100 continua protegido: nenhuma função financeira toca `sessaoPlanejamentoVersao`, `sessaoItensPlanejados`, `calendarItemId` ou `calendarItemIdx`.

O núcleo lê contratos legados sem criar `vigencias[]` durante a abertura. Ambiguidade real permanece bloqueada até correção explícita. A versão não promete corrigir retroativamente qualquer documento fora dos alvos da prévia de setembro.

## Arquivos centrais

- `escritorio.html` — montagem das superfícies, instalação V103 e bloco de prévia;
- `portal-cliente.html` — estado financeiro terminal alinhado;
- `financeiro-core.mjs` — projeção pura por competência, caixa e ciclo;
- `financeiro-ui-v103.mjs` — integração, writers explícitos e correção dirigida;
- `firestore.rules` — contrato de regras V103;
- `scripts/regression-v103-financeiro-competencias.mjs` — domínio financeiro;
- `scripts/regression-v103-portal-financeiro.mjs` — Portal e estados terminais;
- `scripts/regression-v103-ui-financeiro-competencias.mjs` — UI desktop/mobile;
- `scripts/regression-v103-correcao-financeira-real.mjs` — ação dirigida com Firestore sintético;
- `scripts/firebase-emulator-v103-financeiro/` — positivos e negativos das regras.

## Provas locais concluídas

- núcleo financeiro V103: **248/248**;
- Portal financeiro V103: **42/42**;
- correção dirigida de setembro: **63/63**;
- UI V103: **181/181**, desktop e mobile;
- regressão crítica: **610/610**;
- regras V103 no Firestore Emulator: **91/91**, `expression_limit_hits=0`;
- regressão conjunta de regras V101/V102: **55/55**, `expression_limit_hits=0`;
- domínio V102: **39/39**;
- UI V102: **22/22**.

Os testes usam dados sintéticos e não gravam no Firebase real. A auditoria real anterior foi somente leitura. Uma jornada autenticada após a publicação ainda é obrigatória para promover o estado de “pronto para publicação” a “comprovado em produção”.

## Rollback

O pacote V103 deve preservar um rollback coerente V102 para frontend, módulos e regras afetados. Se houver falha antes da correção real, restaurar primeiro o frontend V102 e depois as regras V102, validando novamente o build.

Se a correção dirigida já tiver criado eventos ou alterado documentos reais, não apagar ledger, saídas, pagamentos, contatos ou históricos. Rollback de código não é rollback de dados. Qualquer reversão operacional precisa de diagnóstico, alvo e autorização próprios; valores pagos e estados históricos continuam imutáveis.

## Estado estrito

**Corrigido e validado localmente / pronto para publicação.** O usuário continua responsável por subir a V103 no GitHub e publicar `firestore.rules`. Depois disso, Chris deve abrir a prévia real, interromper diante de qualquer bloqueio e aplicar somente quando a tela confirmar a carteira de setembro com 19 ativos. Até essa ação, nenhum ajuste real descrito neste relatório pode ser chamado de concluído.
