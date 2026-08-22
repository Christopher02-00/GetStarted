# V104 — Correção do financeiro real, Régua de Cobrança e cortesia Fedalto

## Resultado

A V104 corrige a interpretação dos dados financeiros que apareceu na V103 publicada. A Fedalto Eletro Comercial continua ativa; setembro de 2026 é apenas uma mensalidade isenta por cortesia promocional. A Régua volta a priorizar contatos e ações reais, sem inventar atrasos anteriores a julho de 2026 e sem reabrir julho/agosto já confirmados como cobrados e quitados. A saída manual da Monique passa a preservar mensalidades terminais e a aceitar contratos legados seguros.

Nenhum dado real foi alterado durante a construção ou os testes. Publicar o frontend e as regras não executa correção financeira. A primeira escrita real só ocorre depois de o Chris abrir a prévia, confirmar os alvos e executar a ação explícita.

## O que estava errado

1. A Régua podia derivar obrigações virtuais para meses anteriores ao início real de uso e apresentar muitos dias de atraso sem base operacional.
2. Julho e agosto, embora já cobrados e pagos segundo a confirmação do usuário, ainda podiam aparecer na fila porque não havia um corte histórico explícito.
3. O redesenho espalhava ação, previsão, comprovante e contato em muitos blocos verticais; o contato deixou de aparecer onde a cobrança era feita.
4. A correção de setembro tratava a Fedalto como encerrada, confundindo cortesia mensal com saída do cliente.
5. A saída manual da Monique tentava incluir a mensalidade terminal do último mês numa atualização; as regras negavam o lote inteiro e a interface mostrava `Missing or insufficient permissions`.
6. Um contrato com `vigencias:[]` era interpretado como estrutura moderna incompatível, embora representasse legado ainda recuperável de forma inequívoca.

## Correções aplicadas

### Fedalto Eletro Comercial

- permanece ativa em setembro e nas competências posteriores;
- setembro de 2026 fica `isento`, com motivo `Cortesia promocional da agência`;
- o contrato registra a cortesia do mês sem receber término de vigência;
- eventual marcador de saída indevido é cancelado por soft-delete, sem apagar histórico;
- a operação possui evento e recibo determinísticos e é idempotente.

### Régua de Cobrança

- marco inicial operacional: julho de 2026;
- julho e agosto de 2026 confirmados ficam fora dos acionáveis;
- nenhuma obrigação virtual anterior ao marco é apresentada como atraso;
- lista curta mostra primeiro quem realmente exige ação;
- cada linha mostra cliente, competência, vencimento, estado e contato;
- contato ausente pode ser preenchido dentro da própria Régua;
- comprovante em análise não recebe cobrança;
- cobrança confirmada hoje sai da lista de ação, mas preserva histórico;
- previsão futura permanece somente leitura e recolhida;
- abrir WhatsApp não grava envio; `Confirmar que enviei` continua separado e transacional.

### Contato financeiro da Zeiss

“Coleção financeira privada” significa apenas que o número é salvo no lugar protegido correto: `contatos_clientes_financeiro/zeiss`. Para o Chris, ele aparece normalmente na Régua e pode ser editado ali. Outros papéis, o Portal do Cliente e o código público não recebem esse número. O telefone real informado pelo usuário não foi hardcoded em HTML, JavaScript, teste ou documentação.

### Saída da Monique

- contrato legado sem `vigencias`, ou com array vazio, pode ser fechado quando o intervalo é inequívoco;
- mensalidade final já paga, isenta ou cancelada é preservada e não participa de uma atualização proibida;
- obrigações posteriores abertas podem ser canceladas com `saidaId`, mantendo o histórico;
- erro de permissão continua bloqueando tudo, mas a transação legítima deixa de pedir uma mutação que a regra proíbe.

### Conferência dirigida de setembro

A ferramenta única continua responsável pelos alvos declarados: Vitalle, Monique, Joaquim Assados, Açougue São Joaquim, Zeiss e agora Fedalto. A prévia relê as fontes e simula o resultado sem escrever. A aplicação é dividida em etapas atômicas independentes, cada uma com recibo; retry, clique duplo e duas abas convergem sem duplicar eventos.

## Dados e segurança

- Financeiro, Mensalidades, Régua, lançamentos, contatos financeiros e correção permanecem exclusivos do Chris.
- Amanda mantém somente a visão contratual necessária ao cadastro, sem contatos, caixa, mensalidades ou ledger.
- `config_financeiro/regua_cobranca` é Chris-only e guarda apenas o marco/corte histórico da Régua.
- `contatos_clientes_financeiro` continua Chris-only; o número da Zeiss não é replicado.
- delete físico permanece proibido.
- estados pagos, isentos e cancelados não são reabertos pelo writer comum.
- correção de cortesia anteriormente cancelada por uma saída indevida exige evento atômico compatível.
- erro, timeout, cota ou permissão nunca vira zero, atraso ou sucesso.

## Provas locais

- correção financeira V104: **67/67**;
- UI V104: **187/187** em desktop e mobile, sem `pageerror` e sem overflow;
- núcleo financeiro: **248/248**;
- Portal financeiro: **42/42**;
- regressão crítica: **610/610**;
- Firestore Emulator: **94/94**, `expression_limit_hits=0`;
- preflight funcional: todos os checks do produto aprovados; permanece apenas a cópia histórica conhecida `regression-critical.mjs` na raiz.

Os testes usam dados sintéticos e Firestore Emulator. Eles provam a implementação, a segurança, a concorrência e a interface real, mas não afirmam que dados de produção foram alterados.

## Publicação e operação

O usuário publica o conteúdo do pacote V104 no GitHub e aplica `firestore.rules` no Firebase. Depois:

1. abrir a V104 como Chris;
2. confirmar que a Régua informa julho/agosto como histórico encerrado e não os inclui nos atrasos;
3. abrir a conferência financeira e executar `Ver prévia segura`;
4. conferir Fedalto ativa com setembro em cortesia, Monique/Joaquim/Açougue fora da carteira de setembro, Vitalle em R$ 1.000 e projeção de 19 ativos;
5. preencher o WhatsApp da Zeiss no campo protegido;
6. aplicar uma vez e aguardar os recibos.

Se a prévia estiver bloqueada, nenhum botão de aplicação é oferecido. O usuário deve registrar o texto exibido e parar; não é seguro alterar diretamente documentos no Firebase.

## Rollback

O pacote preserva `rollback_v103` com o frontend, módulos, Portal e regras anteriores. Se a V104 ainda não tiver escrito dados reais, restaurar o conjunto V103 e suas regras. Se a operação V104 já tiver criado recibos, não apagar eventos, pagamentos, saídas ou contatos; reversão de dados exige uma operação auditada separada.

## Estado estrito

**Corrigido e validado localmente / pronto para publicação.** Produção só passa a ser V104 depois da prova do GitHub Pages e das regras aplicadas pelo usuário. Fedalto, Monique, Zeiss e os demais alvos só podem ser chamados de corrigidos em produção depois da prévia e dos recibos reais.
