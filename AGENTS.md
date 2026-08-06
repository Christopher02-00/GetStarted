# Get Started — regra de trabalho para mudanças no sistema

Este repositório é um sistema operacional em produção, baseado principalmente em HTML/JavaScript e Firestore. Trate cada pedido como engenharia de manutenção: entender a causa, limitar o impacto e provar o resultado.

## Antes de editar

1. Leia o pedido atual e os requisitos anteriores relacionados. Só faça pergunta quando a resposta mudar materialmente o resultado; nos demais casos, investigue o código e avance.
2. Localize todos os leitores e escritores dos dados ou estados afetados. Mapeie, no mínimo: telas, navegação, listeners/timers, coleções Firestore, regras, papéis de usuário e arquivos duplicados por compatibilidade.
3. Registre os invariantes que a mudança não pode quebrar: login e `etapaSegura()`, autorização por papel, privacidade do cliente, isolamento financeiro, soft-delete e preservação de dados existentes.
4. Compare a cópia de trabalho, a pasta usada no upload e a versão publicada quando houver acesso seguro. Nunca suponha que um arquivo local foi commitado, enviado ou publicado.

## Ao implementar

- Corrija a causa-raiz com a menor mudança reversível que resolva o fluxo inteiro.
- Evite refatoração ampla, novas funcionalidades e substituições globais fora do pedido.
- Preserve dados legados por leitura compatível; migrações e gravações em produção exigem autorização e validação específicas.
- Centralize regras de negócio compartilhadas. Remova a lógica antiga quando ela for substituída, inclusive listeners, timers, chamadas e variáveis residuais.
- Itens exclusivos por papel não podem existir no DOM de outros papéis; esconder com CSS não é isolamento.
- Exclusões de dados operacionais são soft-delete. Não use exclusão física salvo para registros temporários explicitamente aprovados.

## Depois de editar

1. Inspecione o diff/arquivos tocados e procure mudanças fora do escopo.
2. Busque implementações duplicadas, chamadas residuais, handlers órfãos, variáveis fora de escopo e caminhos de escrita não atualizados.
3. Execute `scripts/preflight.mjs` e `scripts/regression-critical.mjs` com Node.js, além dos testes específicos do fluxo alterado em sandbox, com funções nomeadas próprias. Não chame uma função nua já carregada na página para provar código novo.
4. Para UI, valide carregamento, erro/vazio, desktop e mobile e, quando possível, o DOM real. Para dados, diferencie teste local, leitura de produção e gravação de produção.
5. Segurança, papéis, Firestore, login, financeiro e privacidade são sempre regressões obrigatórias, mesmo quando não forem o tema principal.

## Evidência e entrega

- Nunca declare uma correção validada sem informar comando ou método, resultado e limite do teste.
- Classifique o resultado como `validado`, `corrigido + validado`, `não validável` ou `bloqueado`.
- Não invente arquivos para upload. Informe nome, caminho absoluto, hash, estado Git, estado de publicação e se existe ação manual.
- O usuário faz o upload manual para o GitHub, salvo autorização explícita diferente. Não diga que algo está no ar sem comparação da versão publicada.
- Entregue sempre em cinco blocos curtos: **Entendimento**, **Alterações**, **Provas de validação**, **Riscos/pendências**, **Próximo passo**.

O objetivo não é prometer perfeição; é tornar regressões raras, pequenas e diagnosticáveis.
