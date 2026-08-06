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

### Invariantes da cadeia de calendários

- A cadeia é única: Gabi grava e envia o mês, Amanda revisa pela mesma fonte de estado e Luís/Nathan consultam o conteúdo de gravação. Alterar qualquer elo exige testar os três papéis.
- Falha, cota ou timeout do Firestore nunca pode ser convertido em lista vazia, contador zero ou “calendário apagado”. Mostre estado indisponível e preserve o último retrato confirmado quando existir.
- O modo do filmmaker não deve listar a coleção inteira para abrir um cliente: mostre a carteira autorizada e leia somente o documento escolhido. A atualização daquele documento continua em tempo real.
- A carteira e os calendários de Luís/Nathan ficam disponíveis durante todo o dia. Data e hora da gravação servem apenas para ordenar e destacar o trabalho; nunca são condição de autorização. O papel continua limitado ao modo de campo e às próprias sessões/clientes operacionais, sem herdar telas de Gabi ou gestão.
- Um fluxo de papel operacional nunca pode consultar contratos, mensalidades, financeiro ou outra coleção que suas regras não permitem. Classificação gerencial e carteira operacional são fontes diferentes quando a privacidade exige.
- A fila e o contador da Amanda usam `linhasCalendariosAguardandoRevisao`; não crie filtro paralelo para `aprovacaoInterna`/`aprovacaoMeses`.
- `calendario.html` e `calendarios.html` são endereços compatíveis do mesmo produto e devem permanecer byte a byte idênticos.
- Calendários não têm exclusão física. Antes de concluir que algo sumiu, confira o documento primário, `calendarios_versoes` e os backups disponíveis, sem restaurar por cima nem duplicar dados.

#### Incidente registrado — 06/08/2026

O Firestore excedeu a cota de leitura e o código interpretou falhas como lista vazia em dois destinos: o modo de campo do filmmaker e a aprovação da Amanda. Os documentos continuavam no banco (21 calendários; Master Chef e Zeiss aguardavam revisão), mas a interface sugeria ausência. A correção permanente remove a assinatura da coleção inteira para filmmakers, abre somente o documento escolhido, exibe `!` quando a fila da Amanda não foi confirmada e mantém testes de regressão para os três papéis. Nunca “corrigir” este incidente restaurando ou recriando calendários sem primeiro comprovar a ausência do documento.

No mesmo dia, a segunda porta do filmmaker (`Minha agenda`) ainda listava todos os calendários, e o modo de campo montava a carteira por uma função que também consultava contratos, mensalidades e clientes encerrados. Essas coleções são privadas da gestão e a negativa correta das regras podia virar carregamento ou lista vazia para Luís. A correção separa a carteira operacional (`clientes_extras` + `clientes_config`), lê somente os calendários presentes na agenda do filmmaker e mantém o acesso independente de horário. Nunca ampliar regras financeiras para consertar uma tela operacional.

A entrada de Elô expôs outra variante: o portão Google aguardava toda a inicialização operacional. Uma leitura sem resposta mantinha “Abrindo Google…” para sempre apesar de e-mail e usuário estarem ativos. Identidade, limpeza do papel anterior e isolamento do DOM agora acontecem antes da primeira leitura; a carga seguinte é progressiva e cada etapa tem limite de tempo. Nunca voltar a aguardar a carga completa dentro de `aplicarUsuarioGoogle()`.

O acesso de Luís no Safari expôs uma regressão diferente no primeiro toque: o handler aguardava `setPersistence()` antes de `signInWithPopup()`, perdia o gesto transitório do usuário e o navegador bloqueava/cancelava a janela do Google. A persistência deve ser preparada na inicialização, o botão permanece desativado até ela terminar e `signInWithPopup()` precisa ser a primeira operação assíncrona disparada diretamente pelo clique. Mantenha também a trava de tentativa única e sempre mostre o código real de `auth/*`; nunca reintroduza `await` antes do popup nem uma mensagem apenas genérica.

O caso Kerry revelou que “semana” visual não é vínculo operacional de gravação. A agenda mostrava todos os conteúdos pendentes do mês como marcáveis, e a confirmação confiava no índice recebido da tela. A regra permanente é: cada gravação possui `cliente + mesCalendario + sessaoOrdem`, congela `sessaoItensPlanejados` e a transação revalida status, aprovação, equipe, cliente e itens permitidos. Conteúdo de outra sessão aparece em “NÃO GRAVAR HOJE” e nunca vira checkbox executável. Itens novos recebem `itemId` estável; legado usa índice + nome somente como compatibilidade. Se mês ou vínculo legado for ambíguo, bloquear e pedir planejamento humano — nunca escolher uma semana por suposição nem migrar produção ao abrir a tela.

Ainda neste incidente, duas falhas de manutenção foram registradas: a trava de clique duplo precisa ser armada antes do primeiro `await`, e campos compatíveis (`filmmaker` e `equipe`) precisam ser atualizados juntos. Ao trocar de usuário, listeners, caches e identidade anterior são fronteira de privacidade e devem ser limpos antes de validar a nova conta. Edição de calendário preserva campos desconhecidos com merge do item anterior; modal de item novo sempre limpa mês/data/bloco; redução de sessões não pode deixar bloco manual órfão.

A V32 expôs dois outros rompimentos de compatibilidade. Primeiro, a trava correta de edição durante `aguardando_interna` foi reutilizada em `submitFeedback()` e impediu a Amanda de comentar justamente enquanto revisava. Comentário de revisão não é edição de pauta: deve atualizar somente `comments` e `updatedAt` em transação, enquanto roteiro, legenda, referências e botões de aprovar/devolver permanecem ligados à mesma fila `linhasCalendariosAguardandoRevisao`. Nunca chamar o `save()` completo para registrar esse comentário nem remover a trava dos conteúdos.

Segundo, a ordem de sessão da V32 removeu a descrição livre que registros anteriores usavam para declarar o que já havia sido filmado. Agendamentos sem `sessaoPlanejamentoVersao`, `sessaoChave`, competência e bloco precisam de compatibilidade explícita: se o calendário possui um único mês, ele pode ser exibido por derivação inequívoca; se possui mais de um, a execução continua bloqueada para planejamento humano. O material declarado num agendamento legado recebe vínculo apenas com o próprio `agendamentoId` (`vinculoSessao: declarado_legado`), sem `calendarItemIdx`/`calendarItemId` e sem marcar pauta de outra semana. Sessões modernas nunca ganham texto livre sem autorização. Grafias legadas de equipe (Natan/Nathan e Luiz/Luís) são comparadas por identidade operacional normalizada, sem ampliar a carteira para outros filmmakers.

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
