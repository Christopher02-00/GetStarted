# Get Started — entrega local V81

Data da revisão: 18/08/2026  
Base Git inspecionada: `ac1ce64ecc39e6879030a279d2d45f918cc9b8b3`  
Branch local: `codex/client-lifecycle-v81`  
Publicação: **não realizada**. Nenhum push, upload, deploy ou dado do Firebase foi alterado.

## Entendimento

Esta entrega consolida os pedidos do ciclo de clientes, Central de Vendas, contatos financeiros, calendários, Portal/Stories e o lançamento de vídeos para trabalhos fora da carteira. A prioridade foi eliminar caminhos duplicados, falhas silenciosas e efeitos laterais entre áreas.

O resultado abaixo é classificado como **corrigido + validado localmente**. Ele não é prova de que produção já mudou: isso só acontece depois que o usuário publicar os HTMLs no GitHub e aplicar `firestore.rules` no Firebase.

## Alterações

### 1. Entrada, valor, ativação, saída e reativação de clientes

- A Central de Clientes passou a ser a porta única de conferência para entrada manual e cadastro vindo do link.
- O formulário deixa de ser destruído ao trocar de papel; Amanda continua podendo informar o valor na entrada e na reativação.
- Identidades e protocolos usam chaves determinísticas e cruzamento por slug/alias antes de criar algo.
- Saída usa um único protocolo transacional, preserva o histórico e não apaga fichas, contratos ou mensalidades.
- Saída efetiva retira o cliente das carteiras operacionais, limita o Portal, tokens e Stories; saída futura não reativa credenciais antigas.
- Cancelamento/reativação recupera somente a credencial canônica ou a única credencial legada comprovada; divergência bloqueia sem escolher no escuro.
- O motor diário isola falhas por cliente e não marca o dia como concluído quando alguma saída falha.

### 2. Contatos, cobrança e arquivo

- A agenda de WhatsApp financeiro foi separada em `contatos_clientes_financeiro`, legível somente pelo Chris.
- Amanda pode registrar/corrigir o contato apenas durante os eventos autorizados de ativação e reativação, sem ler a agenda privada.
- Saída remove o cliente da lista ativa e mantém a ficha no arquivo único; reativação reaproveita a identidade.
- A migração de números legados é transacional, idempotente e bloqueia conflito entre dois números para o mesmo cliente.
- O campo legado não foi apagado automaticamente: a limpeza física só deve ocorrer após migração e recibo em produção.

### 3. Central de Vendas, propostas e reuniões

- Proposta nasce como `preparada`; não finge que foi enviada.
- Família, versão, hash e protocolo reduzem duplicações; o envio real é uma etapa explícita.
- Renovação exige cliente mensalista ativo e nunca cria receita/cliente avulso.
- Projeto avulso vira negócio + ficha + configuração + receita numa única transação e só confirma após quatro recibos.
- Métricas separam mensalidade potencial de projeto único.
- Reuniões e propostas preservam resumo, origem, responsável, próximo passo e follow-up.
- As quatro propostas fornecidas foram auditadas, mas **não foram gravadas no Firebase**: os documentos provam preparação, não envio/aceite/pagamento, e o pedido mais recente proíbe escrita no Firebase.

### 4. Calendários — Gabi → Amanda → Cecília → cliente

- Regra operacional única: no mês vigente trabalha-se exclusivamente o calendário do mês seguinte; dezembro opera janeiro.
- Mês vigente, meses passados e outro futuro ficam em arquivo somente leitura e não voltam à fila operacional.
- Todas as portas de cópia da Cecília passam `cliente + mês` explicitamente.
- A cópia relê documento, itens e estado; somente `aprovado_interno` pode virar `liberado`, em transação e com recibo.
- A devolução da Amanda também é transacional e recusa estado concorrente ou calendário já liberado.
- Envio em lote informa separadamente confirmados e falhas, com os nomes afetados.
- O Portal respeita `?mes=AAAA-MM`, não troca silenciosamente para outro mês e preserva o último retrato confirmado.
- Documento ausente, mês realmente vazio, permissão negada e timeout agora são estados diferentes.
- Aprovação pelo cliente usa `itemId`; legado exige índice + dia + nome ou uma única correspondência inequívoca.
- `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.

### 5. Stories do Portal

- Leitura do conteúdo e leitura dos links possuem timeouts independentes.
- Falha de Firestore não vira “sem Stories” e não esconde a aba de um cliente com escopo/histórico confirmado.
- O último retrato confirmado é reaproveitado durante falha transitória.
- Links só são renderizados quando HTTPS válido, com escape de atributo e `noopener noreferrer`.
- Falha de link é mostrada como indisponibilidade, não como documento inexistente.

### 6. Vídeos de clientes fora da carteira

- “Lançar Vídeos” ganhou **Trabalho externo/pontual — sem cadastrar cliente**.
- A identidade externa vive somente em `videos_producao`, com namespace e hash determinísticos.
- Não cria `clientes_extras`, `clientes_config`, ficha, contrato, Portal, calendário, mensalidade, afinidade ou postagem.
- Luís, Nathan, Amanda e Chris podem lançar; Gabi/Yas ficam sem menu, view, rota e mutação.
- Filmaker envia para distribuição sem se apropriar do editor; Amanda/Chris distribuem.
- Arquivo, Esteira, Entregas Finalizadas e confirmação separam trabalhos pontuais dos contadores de clientes.
- A ação de WhatsApp de um pontual apenas copia a mensagem e nunca consulta o contato financeiro.
- O conciliador identifica o pontual antes de qualquer atalho de postagem/configuração.

### 7. Segurança adjacente

- Sessões do Portal revalidam token canônico, estado ativo e vigência em cada acesso protegido.
- Contas-semente especiais agora respeitam revogação em `usuarios_equipe`.
- Comprovantes e links de proposta passam por validação HTTPS e escape seguro.
- Resposta do cliente não pode substituir o histórico inteiro nem regredir produção/entrega.
- A interface deixou de exibir frases literais como sugestão de senha. Nenhuma credencial foi repetida neste relatório.

## Provas de validação

Runtime usado: Node empacotado pelo Codex, sempre com `--experimental-vm-modules`.

| Gate | Resultado |
|---|---:|
| `scripts/preflight.mjs` | APROVADO |
| `scripts/regression-critical.mjs` | 608/608 |
| V71 | 18/18 |
| V72 | 50/50 |
| V73 | 28/28 |
| V74 | 34/34 |
| V75 | 37/37 |
| V76 | 12/12 |
| V77 | 49/49 |
| V78 | 29/29 |
| V79 | 16/16 |
| V80 | 29/29 |
| V81 calendários | 64/64 |
| V81 clientes | 47/47 |
| V81 contatos | 25/25 |
| V81 integridade | 15/15 |
| V81 Portal/Stories | 24/24 |
| V81 vendas | 30/30 |
| V81 vídeos externos | 72/72 |

Outras provas:

- `git diff --check`: aprovado.
- Nove blocos JavaScript inline: sintaxe válida.
- `calendario.html` e `calendarios.html`: byte a byte idênticos, SHA-256 `781d341c91e23a0f3788f1cd3d7db7357c6ae0e6c56f966ab5afd4f5c6492941`.
- Navegador local real: Escritório carregou em 1280 px e 390 px sem largura excedente; Portal em 390 px mostrou falha de token/conexão como indisponibilidade e preservação do link, sem declarar calendário vazio.
- Nenhuma escrita de produção foi usada como teste.

## Riscos e pendências reais

1. **Regra Firestore não foi testada no Emulator nem comparada integralmente com a versão publicada.** Não há Firebase CLI/configuração de Emulator no repositório. Antes de aplicar V31, é obrigatório comparar os tokens canônicos e legados ativos; publicar sem esse inventário pode invalidar um link antigo que diverge do canônico.
2. **Calendário multi-mês é uma limitação estrutural.** Vários meses vivem no mesmo documento; o frontend separa o fluxo, mas as regras autorizam o documento inteiro. Sigilo independente de rascunho exige projeção por cliente + competência, regras novas, Emulator e migração com recibo.
3. **Alias automático no Portal permanece bloqueado.** Tentar documentos alternativos pelo navegador sem regras comprovadas poderia ampliar o acesso entre clientes. Alias divergente deve ser saneado pela gestão.
4. **Primeiro link de cliente legado pode exigir preparação por Chris/Amanda.** Cecília não ganha permissão para listar tokens históricos; o fluxo falha fechado.
5. **Central de Vendas:** o DOM é exclusivo do Chris, mas `negocios` e `reunioes_vendas` ainda usam `ehGerencia()` e incluem Amanda no backend. O gate de segurança confirma 17 itens e falha somente neste. Estreitar sem confirmar o uso publicado pode cortar uma operação legítima; a decisão e validação por Emulator ficaram pendentes.
6. **Hash de proposta entre duas famílias distintas:** o ID familiar é transacional, mas um mesmo hash salvo simultaneamente com chaves familiares diferentes ainda depende do retrato carregado. Um índice de hash exigiria coleção/regra nova.
7. **Contatos legados:** a cópia privada não apaga `whatsappCobranca` de `clientes_config`; a remoção deve ocorrer somente após recibo de migração em produção.
8. **Página legada `Calendarios_Clientes_Get.html`:** permanece como endereço antigo, não referenciado pelo fluxo atual. A tentativa de substituir a lista por redirecionamento foi bloqueada para não quebrar bookmarks sem validação.
9. **Resíduos antigos de vídeo pontual:** se algum legado já estiver ligado indevidamente a uma postagem, ele fica fora dos contadores e sinalizado para conferência; não foi apagado nem reescrito automaticamente.
10. **Validação de UI autenticada:** não foi possível executar o ciclo real com contas de Gabi/Amanda/Cecília/cliente no ambiente local. A prova atual combina DOM real sem login, sandboxes das funções e testes estáticos/transacionais.
11. **Credencial exposta anteriormente:** qualquer senha que já tenha aparecido no HTML ou em conversa deve ser considerada conhecida e trocada por uma frase inédita. Esta entrega remove a sugestão literal, mas não altera credenciais publicadas.

## Próximo passo

Ordem segura para publicação manual pelo usuário:

1. Fazer backup/registro do estado publicado e comparar `clientes_acesso` com tokens/links legados, principalmente clientes com Portal e Stories.
2. Aplicar e publicar `firestore.rules` no Firebase. **Subir esse arquivo ao GitHub não publica as regras.**
3. Subir os demais arquivos mantendo os caminhos, inclusive `scripts/`.
4. Confirmar no GitHub que os arquivos realmente substituíram a versão anterior.
5. Fazer hard refresh e testar por papel: Gabi envia setembro, Amanda aprova/devolve, Cecília copia setembro, cliente abre setembro; Luís/Nathan lançam um trabalho pontual; Gabi/Yas não veem Vídeos.
6. Se qualquer etapa receber permissão negada, timeout ou estado divergente, não recriar dados. Registrar o erro exato e comparar regra publicada, token e documento antes de qualquer correção.

O pacote local contém somente os arquivos alterados e esta documentação. O usuário realiza todo upload e deploy.
