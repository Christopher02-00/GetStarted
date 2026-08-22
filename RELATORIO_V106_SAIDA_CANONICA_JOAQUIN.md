# V106 — Saída canônica do Joaquin Assados

## Resultado

A V106 resolve uma única causa: dois registros de saída ativos e historicamente divergentes para `joaquin-assados` impediam a consolidação dos totais de Mensalidades e bloqueavam a operação financeira geral. O responsável confirmou qual documento representa a saída correta, a data efetiva, a última competência cobrada e o motivo. A aplicação deixa de tentar escolher por semelhança e passa a oferecer uma porta específica, independente e fail-closed para conciliar somente esses dois documentos auditados.

O registro de saída confirmado permanece intacto. O registro concorrente é preservado por soft-delete, a ficha canônica passa a apontar para a saída confirmada e um evento determinístico registra a conciliação. Contrato, mensalidades, Açougue São Joaquim e todos os demais clientes ficam fora do orçamento de escrita.

Esta entrega está corrigida, validada localmente e pronta para publicação. O pacote V106 possui **79 arquivos totais**: **78 entradas manifestadas**, sendo **71 publicáveis** e **7 no rollback V105**, mais o próprio manifesto. O upload do GitHub contém **72 arquivos**: os 71 publicáveis mais `MANIFESTO_SHA256_V106.txt`. Publicar o código não executa a conciliação. Nenhum dado real foi escrito pela V106 durante o desenvolvimento.

## Fato confirmado pelo responsável

- identidade financeira: `joaquin-assados`;
- documento canônico de saída: `clientes_encerrados/62eBY5iSyFtP21vECYMm`;
- documento concorrente: `clientes_encerrados/0oqy4pk1tcKZccWWyZDi`;
- saída efetiva: `15/09/2026`;
- última competência cobrada: `2026-08`;
- motivo: baixo retorno financeiro;
- Açougue São Joaquim é outra empresa e não participa desta conciliação.

Esses fatos são a autoridade humana desta causa. O código ainda exige que contrato, ficha, pagamentos posteriores e os dois documentos correspondam exatamente ao retrato auditado antes de oferecer a escrita.

## Causa

A V105 falhava corretamente quando encontrava saídas divergentes: nenhum dos dois documentos podia ser arquivado por uma suposição baseada em nome, data parcial ou ordem de leitura. Esse bloqueio protegia o histórico, mas a correção geral não possuía uma decisão humana suficiente para definir o documento canônico.

Depois da confirmação do responsável, manter apenas a operação geral continuaria desnecessariamente amplo: outro alvo financeiro poderia bloquear a solução do Joaquin, e uma alteração posterior em qualquer uma das fontes poderia tornar a prévia antiga insegura. A V106 cria, portanto, uma porta limitada aos documentos conhecidos, com contrato explícito e hashes de pré-condição.

## Correção aplicada localmente

### Porta específica e zero-write

No Financeiro do Chris aparece o cartão `Joaquim Assados — confirmar a saída correta`. O botão `Verificar esta correção sem salvar` relê os dois registros, a ficha, o contrato, as mensalidades posteriores e os eventos financeiros. Essa etapa não grava documentos.

Quando o retrato é exatamente o esperado, a tela informa:

- qual registro será mantido;
- qual registro será arquivado sem exclusão física;
- que contrato, mensalidades, Açougue São Joaquim e outros clientes não serão alterados;
- e oferece o botão separado `Confirmar saída correta do Joaquim`.

O bloqueio do lote geral V105 não impede essa porta específica. Isso não relaxa o fail-closed: qualquer divergência dentro do orçamento V106 continua bloqueando a ação.

### Transação mínima

A confirmação explícita executa uma única transação com operação determinística `fin_v106_joaquin_saida_canonica_20260915`:

1. relê todas as pré-condições e compara os hashes do retrato usado na prévia;
2. não escreve no documento canônico de saída;
3. acrescenta em `clientes_config/joaquin-assados` somente o apontamento `saidaAtivaId` para o documento confirmado e metadados de atualização;
4. marca o documento concorrente como excluído/cancelado por soft-delete, com vínculo para o documento canônico e autoria/horário;
5. cria um evento append-only em `clientes_ciclo_financeiro` com o `operationId` determinístico;
6. relê os recibos depois do commit e só declara sucesso se saída, apontamento, arquivo, contrato e evento forem confirmados.

O documento canônico, o contrato e as mensalidades são verificados por hash antes e depois. Eles não são regravados para “fazer coincidir” o resultado.

## Contrato de dados

| Fonte | Papel na V106 | Escrita permitida nesta causa |
|---|---|---|
| `clientes_encerrados/62eBY5iSyFtP21vECYMm` | saída canônica confirmada | nenhuma; preservada |
| `clientes_encerrados/0oqy4pk1tcKZccWWyZDi` | registro concorrente auditado | somente soft-delete, cancelamento e vínculo de unificação |
| `clientes_config/joaquin-assados` | ficha operacional canônica | somente apontamento para a saída canônica e metadados de atualização |
| `contratos_cliente/joaquin-assados` | prova da vigência e competência final | nenhuma; preservado |
| `pagamentos_mensais` de `2026-09` em diante | negativa contra pagamento posterior | nenhuma; todos precisam estar cancelados |
| `clientes_ciclo_financeiro/fin_v106_joaquin_saida_canonica_20260915` | recibo idempotente da conciliação | criação única e imutável |

Uma terceira saída ou mensalidade que já exista — inclusive criada enquanto a confirmação humana estava aberta — é encontrada por uma segunda leitura de pertencimento e interrompe a operação antes da transação. Alteração dos documentos conhecidos depois dessa leitura é barrada pelos hashes dentro da transação. Como o SDK Web do Firestore não bloqueia consultas de coleção dentro de uma transação, uma escrita manual/Admin SDK criada no intervalo residual entre essa segunda consulta e o commit não pode ser prometida como “zero escrita”: a releitura posterior detecta o estado, impede sucesso falso e exige nova auditoria, sem apagar nenhum registro. Os writers normais do site também alteram a ficha protegida e, portanto, fazem a transação falhar por precondition.

## Idempotência, concorrência e histórico

- clique duplo é travado antes da escrita;
- retry e duas abas convergem no mesmo `operationId`;
- recibo já existente só é aceito quando todo o estado final confere;
- mudança entre prévia e transação invalida os hashes e aborta;
- histórico concorrente nunca é apagado fisicamente;
- uma execução já concluída responde como no-op e não cria segundo evento;
- estado parcial com recibo sem resultado final exige auditoria e não é repetido às cegas.

## Segurança e papéis

- o cartão e suas funções pertencem somente ao Chris;
- Amanda, Cecília e demais papéis não recebem o painel nem leem as fontes pela porta V106;
- nenhuma permissão global foi ampliada;
- `firestore.rules` é byte a byte a mesma regra aprovada na V105, com SHA-256 `289fdc40d5cc061463b898faae8e4571072897038238a7cf3c463462e170a558`;
- nenhuma nova publicação no Firebase é necessária;
- a V106 não contém telefone, contato financeiro ou outro dado pessoal em código, teste ou documentação.

## O que não muda

- Açougue São Joaquim continua uma identidade separada;
- a saída canônica, o contrato e as mensalidades do Joaquin não são reescritos;
- Vitalle, Monique, Fedalto, Zeiss e outros ajustes V104/V105 não são executados por esta porta;
- totais continuam bloqueados diante de qualquer outro conflito real;
- Calendários, captação, Place/Luís, vídeos, postagens e Portal não são tocados;
- publicar V106 não corrige o banco e não envia mensagem de cobrança.

## Provas locais

- regressão dirigida V106: **193/193**;
- UI V106: **53/53** em Chrome real, desktop `1365×900` e mobile `390×844`, sem `pageerror` ou overflow;
- conciliação V105: **84/84**;
- compatibilidade V104: **68/68**;
- regressões históricas alinhadas: **483/483**;
- regressão crítica: **610/610**;
- regras: arquivo inalterado no SHA-256 completo acima; a prova Emulator da V105 para esse mesmo arquivo foi preservada. O ambiente atual não produziu uma nova execução do Emulator, portanto não é apresentada como prova fresca V106.

Os cenários V106 cobrem prévia zero-write, estado pronto, aplicação, preservação dos documentos fora do orçamento, soft-delete, recibo, no-op, clique duplo, retry, duas abas, alteração concorrente, terceiro registro e mensalidade surgindo durante a confirmação, pagamento posterior, evento incompatível, papel indevido, desktop e mobile. São fixtures sintéticas; não equivalem a uma escrita no Firebase real.

## Operação depois da publicação

1. Confirmar que o HTML público contém o build `2026-08-22-saida-canonica-joaquin-v106`.
2. Entrar como Chris e abrir `Financeiro`.
3. No cartão específico do Joaquin, clicar em `Verificar esta correção sem salvar`.
4. Ler os blocos `Será mantido` e `Será arquivado, sem apagar`.
5. Se aparecer qualquer bloqueio ou indisponibilidade, parar e registrar a mensagem; não editar o Firestore diretamente.
6. Se a prévia estiver segura, clicar em `Confirmar saída correta do Joaquim` e confirmar a caixa do navegador.
7. Aguardar a releitura informar `Saída correta confirmada`.
8. Recarregar Mensalidades e Financeiro para confirmar que o conflito deixou de bloquear os totais, sem fundir o Açougue ou alterar outros clientes.

## Rollback

Antes de uma escrita real, o rollback coerente do frontend V105 remove a porta V106 sem alterar dados. Depois de uma conciliação confirmada, rollback de código não desfaz apontamento, soft-delete ou evento. Não apagar documentos: qualquer reversão de dados exige uma nova operação auditada, específica e autorizada.

## Estado estrito

**V106 corrigida, validada localmente, empacotada e pronta para publicação.** Pacote: **79 arquivos**; manifesto: **78/78**; upload GitHub: **72 arquivos**; rollback local: **7 arquivos V105**. Publicação GitHub e jornada real: **pendentes do usuário**. Firebase: **sem ação nova**. Dados reais alterados pela V106 durante o desenvolvimento: **nenhum**.
