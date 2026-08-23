# Relatório V108 — pagamento da Fedalto em agosto de 2026

## Resultado da entrega local

A V108 corrige uma inconsistência financeira específica da Fedalto Eletro Comercial sem reestruturar o Financeiro inteiro. O estado real confirmado é:

- julho de 2026 foi pago em **11/08/2026** e permanece imutável;
- agosto de 2026 foi pago em **15/08/2026**;
- setembro de 2026 continua sendo exatamente o mês de cortesia da promoção da agência;
- depois de setembro, o contrato continua ativo e volta ao fluxo mensal normal.

A correção local está implementada e validada. Este relatório não afirma publicação no GitHub, implantação das regras no Firebase nem aplicação sobre dados reais.

## Causa corrigida

O pagamento de agosto existia sem uma vigência contratual que cobrisse corretamente aquela competência. A mesma causa podia aparecer repetida pela fachada financeira, enquanto registros anteriores ao início operacional da Régua contaminavam a visão atual.

A V108 passa a:

- deduplicar somente a mesma causa pela chave canônica `código + cliente + competência + documento`, mesmo quando fachadas acrescentam metadados diferentes;
- preservar conflitos fisicamente distintos, sem fundi-los por suposição;
- manter registros anteriores ao início da Régua auditáveis em sua competência histórica;
- impedir que esses registros históricos sejam apresentados como cobrança vencida de setembro;
- mostrar a identidade e a competência do conflito real para evitar contagens sem explicação.

Nenhum grupo histórico de identidade desconhecida é alterado automaticamente.

## Ação dirigida disponível para Chris

Somente Chris recebe o cartão de correção da Fedalto. Amanda, Cecília, Gabi, filmmakers, clientes e demais papéis não recebem o cartão no DOM e não fazem leituras ou escritas dessa operação.

O fluxo possui duas portas separadas:

1. **Verificar sem salvar:** relê contrato, pagamento e estado financeiro, calcula a prévia e executa zero escrita.
2. **Aplicar correção:** somente depois da prévia válida, executa uma transação que atualiza o intervalo contratual comprovado, confirma agosto com a data civil `15/08/2026` e grava um recibo determinístico no ledger.

A transação revalida as fontes. Drift, contrato encerrado, saída ativa, intervalo concorrente, pagamento incompatível, data divergente ou permissão insuficiente bloqueiam tudo com zero commit. Clique duplo, retry e duas abas convergem para a mesma operação, sem recibo duplicado.

## O que a operação preserva

- O pagamento de julho em 11/08 não é regravado.
- Setembro permanece cortesia e não vira mensalidade em aberto.
- Outubro e as competências seguintes continuam elegíveis pelo contrato ativo.
- A correção não cria fim de vigência, não encerra e não congela o contrato.
- Nenhum documento é apagado fisicamente.
- Renderização e prévia permanecem zero-write.
- O estado concluído da conciliação V107 do Joaquim continua terminal, verde e sem ação residual.

## Segurança e ordem obrigatória de publicação

A V108 inclui regras novas para autorizar exclusivamente a operação dirigida e auditada. O usuário deve publicar o `firestore.rules` da V108 no Firebase **antes de clicar na aplicação da correção**. Publicar apenas o frontend não autoriza a escrita e deve resultar em bloqueio seguro.

A sequência correta é:

1. enviar ao GitHub somente os arquivos indicados por `MANIFESTO_SHA256_V108.txt` e `UPLOAD_V108.txt`;
2. publicar o `firestore.rules` V108 no Firebase;
3. aguardar o Pages servir o build V108 e recarregar sem cache;
4. entrar como Chris e executar primeiro a prévia zero-write;
5. aplicar somente se a prévia reconhecer a Fedalto, agosto de 2026 e a data 15/08/2026 sem bloqueios;
6. conferir o recibo e os estados de agosto, setembro e outubro após a releitura.

## Provas concluídas

- Núcleo focal V108: **27/27**.
- UI V108 em Chromium real: **72/72**.
- Firestore Emulator: **123/123**, com `expression_limit_hits=0`.
- Matriz antiga preservada: **1.929/1.929**.
- Preflight do espelho: **aprovado**.

Essas provas usam ambiente local, Emulator e fixtures controladas. Elas não equivalem à publicação nem ao clique real em produção.

## Rollback

O pacote contém `rollback_v107` com os sete arquivos operacionais superiores exatos da V107. Antes de qualquer aplicação real, eles permitem voltar frontend e regras para a versão anterior.

Depois que a transação V108 for aplicada em produção, rollback de código não apaga o recibo nem desfaz fisicamente o pagamento confirmado. Qualquer reversão de dados seria uma nova operação auditada, com causa e autorização próprias.

## Estado final desta etapa

Entrega local corrigida e validada. Nenhum arquivo foi publicado por esta preparação, nenhuma regra foi implantada no Firebase e nenhuma escrita foi feita nos dados reais.
