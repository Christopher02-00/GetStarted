# Relatório V109 — pagamento de agosto e cortesia de setembro da Fedalto

## Resultado

A V109 substitui a ação dirigida V108 antes que ela seja aplicada. A auditoria real mostrou que setembro ainda estava no formato legado `isento + cortesia manual`, e não no formato promocional canônico que a V108 exigia como pré-condição. Por isso a V108 permanecia vermelha e não podia corrigir agosto com segurança.

A V109 trata os quatro fatos como uma única operação:

- julho de 2026 permanece pago, no valor de R$ 1.700, com `pagoEm: 2026-08-11`;
- agosto de 2026 passa de isenção manual incorreta para pago em `15/08/2026`;
- setembro de 2026 continua isento e sem data de caixa, mas passa a identificar explicitamente a cortesia promocional da agência;
- a vigência contratual passa a começar em julho, cobrindo julho, agosto, setembro e os meses posteriores sem encerrar a Fedalto.

Nenhuma dessas alterações ocorre ao abrir a tela ou executar a prévia.

## Causa comprovada

O frontend V108 publicado reconheceu o conflito `PAGAMENTO_SEM_CONTRATO_VIGENTE`, mas bloqueou a ação porque setembro não correspondia à sua pré-condição antiga. A leitura real, somente leitura, confirmou o cartão vermelho e a mensagem de que setembro havia deixado de corresponder à cortesia esperada. A prévia V108 executou zero escrita.

O problema não era atraso de cobrança nem saída da Fedalto. Era uma inconsistência entre:

1. o contrato iniciado em setembro;
2. o pagamento físico de agosto marcado como isento;
3. a cortesia de setembro ainda descrita pelo marcador manual legado.

## Operação explícita V109

Somente Chris recebe o cartão e suas fontes. O fluxo possui duas etapas:

1. **Verificar sem salvar:** relê contrato, julho, agosto, setembro, saídas e recibos; classifica o retrato; executa zero escrita.
2. **Confirmar ajuste da Fedalto:** exibe a confirmação humana e, depois de nova leitura, executa uma única transação.

A transação usa a identidade determinística `fin_v109_fedalto_agosto_setembro_20260815` e escreve apenas:

- `contratos_cliente/fedalto-eletro-comercial`;
- `pagamentos_mensais/fedalto-eletro-comercial_2026-08`;
- `pagamentos_mensais/fedalto-eletro-comercial_2026-09`;
- `clientes_ciclo_financeiro/fin_v109_fedalto_agosto_setembro_20260815`.

Julho é lido e comparado por hash, mas não é escrito. A ficha da Fedalto, contatos, saídas e demais clientes também são apenas pré-condições ou permanecem fora da operação.

## Proteções

- O escritor V108 foi aposentado; seu `operationId` reservado não pode iniciar uma nova gravação.
- Se já existir recibo V108 ou V109, o sistema só aceita o estado final integralmente equivalente; divergência permanece bloqueada.
- Contrato, agosto, setembro e recibo V109 precisam estar no mesmo request.
- As regras conferem IDs físicos, cliente, competências, R$ 1.700, estados anteriores, campos finais, data civil, revisão monotônica, autoria e chaves alteradas.
- O recibo é append-only e precisa nascer no mesmo instante lógico da transação.
- Um recibo antigo não pode ser reutilizado para autorizar os três documentos depois.
- Campo oportunista, valor diferente, data diferente, saída ativa, múltiplo contrato, mensalidade duplicada, drift ou papel indevido bloqueia tudo.
- Clique duplo, retry e duas abas convergem: uma operação pode vencer e a concorrente é recusada sem segundo recibo.
- O limite interno das regras foi medido no Emulator e permaneceu em zero estouros.

## Estado visual

- `aguardando`: informa que verificar apenas lê;
- `verificando`: mostra as fontes em conferência;
- `pronta`: apresenta fatos e um único botão de confirmação;
- `aplicando`: indica transação e releitura;
- `resolvida`: cartão inteiro verde, selo `Concluído` e zero botão;
- `bloqueada`: cartão vermelho, causa explícita e zero gravação;
- `indisponível`: falha de leitura não é tratada como conclusão ou vazio.

O estado concluído sobrevive ao reload pela releitura das fontes canônicas. Uma saída futura legítima não reabre a correção histórica.

## Fronteiras preservadas

A V109 não altera:

- o calendário, a captação ou o fluxo Place/Luís;
- vídeos, postagens ou Portal;
- a conciliação já concluída do Joaquim;
- o contato financeiro da Zeiss;
- Vitalle, Monique, Açougue São Joaquim ou outros clientes;
- julho da Fedalto;
- responsabilidades de Amanda, Gabi, Cecília, Luís, Nathan ou clientes.

Amanda, Gabi, Cecília, Luís, Nathan, cliente e anônimo não recebem o painel, os fatos nem leituras/escritas V109.

## Provas locais concluídas

- núcleo focal V109: **29/29**;
- UI V109 em Chromium real, desktop/mobile e papéis: **93/93**;
- Firestore Emulator: **144/144**, com `expression_limit_hits=0`;
- corrida real no Emulator entre duas gravações concorrentes: exatamente uma aceita e uma recusada;
- recibo antigo sem os três principais no mesmo request: recusado;
- regressão crítica: **610/610**;
- preflight V109: aprovado;
- conferência do frontend V108 publicado, com sessão real do Chris: o bloqueio atual da Fedalto foi reproduzido e a nova prévia somente leitura executou zero escrita.

Os testes de escrita usam ambiente sintético e Emulator. A conferência do domínio real foi somente leitura. O clique V109 real depende do upload do frontend e da publicação de `firestore.rules` pelo usuário.

## Ordem obrigatória para operar

1. enviar os arquivos não-rollback do pacote V109 ao GitHub;
2. publicar o `firestore.rules` V109 no Firebase;
3. aguardar o Pages servir o build `2026-08-23-canonicalizacao-cortesia-fedalto-v109`;
4. recarregar sem cache e confirmar o build V109;
5. entrar como Chris e abrir Financeiro;
6. clicar em `Verificar sem salvar`;
7. conferir julho intocado, agosto pago em 15/08 e setembro cortesia;
8. clicar uma vez em `Confirmar ajuste da Fedalto`;
9. aguardar o cartão verde `Concluído` e reler Financeiro, Mensalidades e Régua.

Publicar só o frontend antes das regras deve bloquear a gravação; não contornar `permission-denied`.

## Rollback

`rollback_v108` contém os sete arquivos operacionais superiores exatos do pacote V108. Antes de aplicar a transação real, eles permitem restaurar frontend e regras.

Depois de o recibo V109 existir, rollback de código não apaga nem desfaz dados. Reversão de dados exige outra operação auditada e não faz parte desta entrega.

## Estado desta entrega

Código corrigido e validado localmente, pacote ainda a ser publicado pelo usuário. Nenhum push, deploy de regra ou escrita real foi feito pelo Codex nesta preparação.
