# Diagnóstico remanescente após a etapa V89

Data: 19/08/2026

Calendários e Stories foram retirados desta fila porque formam a entrega V89 separada. Isso não significa “comprovado em produção”: a etapa está **pronta para publicar e validada localmente**, e ainda exige conferência pós-upload.

Os números abaixo preservam os IDs 37–83 da matriz anterior para manter rastreabilidade. Nenhum item deste documento foi alterado durante a V89.

## 1. Clientes, cadastro, contratos, saída e reativação

| ID | Pedido | Evidência atual | Estado estrito | Próxima validação necessária |
|---:|---|---|---|---|
| 37 | Número informado no cadastro ser redistribuído automaticamente | Há implementação anterior de fonte de contato/financeiro, sem ensaio recente | Não validado | Cadastro fictício isolado, recibo e leitura nas telas consumidoras |
| 45 | Saída remover listas e preservar histórico | Regressão local do ciclo passou; sem repetição no site publicado atual | Validado localmente | Saída fictícia com data futura/efetiva e conferência das projeções |
| 46 | Arquivo de clientes ser a fonte única de saída/reativação | Estrutura anterior existe, mas a experiência completa não foi reensaiada | Não validado | Clique real de Amanda e Chris em saída, arquivo e reativação |
| 47 | Reativação não duplicar cadastro nem token | Ponteiro e token canônicos passam no teste local | Validado localmente | Repetição autenticada com identidade fictícia e recibo |
| 48 | Amanda informar o valor inicial ao ativar/reativar | Campo e transação existem | Não validado na tela real | Login Amanda, entrada e reativação fictícias |
| 49 | Amanda alterar a mensalidade em qualquer momento | Relato afirma que ainda aparece “só Chris” | Falhou no uso relatado | Reproduzir no cliente ativo e corrigir uma única porta canônica |
| 50 | iPhone Campo Largo constar com R$ 800/mês em todas as áreas | Não há prova recente do valor efetivamente gravado e propagado | Desconhecido | Leitura real do contrato/mensalidade/config e correção autorizada se divergente |
| 52 | Cliente encerrado sair de contatos e permanecer no arquivo | Projeção local existe, sem ensaio publicado recente | Não validado | Saída fictícia e comparação antes/depois em cada consumidor |

## 2. Mensagens, contatos e cobrança

| ID | Pedido | Evidência atual | Estado estrito | Próxima validação necessária |
|---:|---|---|---|---|
| 38 | Contatos ativos exclusivos do Chris | DOM/coleção privada existem; não houve nova inspeção autenticada | Não validado em produção | Confirmar ausência no DOM de outros papéis e negativa das regras |
| 39 | Aba de contatos conter somente recorrentes | Filtro local anterior aprovado | Validado localmente | Abrir lista publicada e comparar com carteira mensalista real |
| 40 | X Joias sair da aba de números | Classificação avulsa existe na base local | Pronto localmente, não comprovado publicado | Conferir lista do Chris após upload |
| 41 | IKN sair da aba de números | Mesmo tratamento de X Joias | Pronto localmente, não comprovado publicado | Conferir lista do Chris após upload |
| 42 | Botões de contato voltarem a clicar | Usuário relatou nova regressão depois de correção anterior | Falhou no uso relatado | Clique real em todos os botões, não apenas presença de handler |
| 43 | Régua abrir a conversa específica de cada cliente | Código anterior de alias/número existe | Não validado | Clique real, número esperado e conversa aberta |
| 44 | Mensagem de cobrança chegar organizada ao WhatsApp | Pedido não recebeu prova visual recente | Não validado | Gerar prévia para clientes fictícios e abrir WhatsApp sem enviar |
| 51 | iPhone Campo Largo com telefone `41 99268-8449` como recorrente | Número informado na conversa, sem prova da gravação canônica | Desconhecido | Conferir coleção privada e botão correspondente |

## 3. Vendas, propostas e primeiro atendimento

| ID | Pedido | Evidência atual | Estado estrito | Próxima validação necessária |
|---:|---|---|---|---|
| 53 | Central de Vendas no Financeiro com leads por mês/origem/estágio/arquivo | Implementação local anterior, sem reensaio publicado | Não validado | Fluxo fictício de lead do início ao arquivo |
| 54 | Pré-cadastro por link da bio/WhatsApp | Sem prova recente do caminho público completo | Não validado | Abrir URL pública, preencher dado fictício e verificar recibo |
| 55 | Unificar links de cadastro mantendo compatibilidade | Entrada canônica foi preparada anteriormente | Não validado | Inventariar URLs públicas e provar redirecionamento/estado final |
| 56 | Mensagem de boas-vindas usar o link correto | Sem prova de template e link atual no WhatsApp | Não validado | Abrir prévia no WhatsApp sem enviar |
| 57 | Registro rápido de reunião e resumo | Teste local de versão anterior | Validado apenas em versão anterior | Repetir tela real e recibo |
| 58 | Proposta nascer “preparada”, sem fingir envio | Modelo local diferencia preparação/envio | Validado localmente | Criar proposta fictícia e conferir datas/estágio |
| 59 | Proposta idempotente | Família determinística existe; colisão SHA entre famílias não foi eliminada | Parcial | Teste concorrente de duas abas/mesmo documento |
| 60 | Hitech e Rodrigo permanecerem identidades separadas: Hitech empresa mensalista; Rodrigo somente edição | V90 removeu a fusão local; a versão publicada V89 ainda mostra `Rodrigo / Hitech` | Pronto para publicar; não validado em produção | Após upload V90, conferir dois cartões, dois contatos e dois Portais sem mover dados automaticamente |
| 61 | Proposta iPhone R$ 800/mês com compensação preservada | Documento foi auditado; status comercial não comprovado | Desconhecido | Confirmar aceite/status e somente então integrar |
| 62 | IKN ser projeto avulso | Classificação V88 aprovada localmente | Validado localmente | Conferir consumidores publicados fora de mensalistas |
| 63 | Formatura Júlio Nerone ser evento institucional | Documento auditado, não cadastrado | Pendente | Confirmar status e dados comerciais antes de cadastrar |
| 64 | Cadastrar as quatro propostas sem duplicar nem fingir envio | Auditoria concluiu que faltam status, links duráveis e idempotência completa | Pendente | Decisão comercial por proposta e importação isolada |
| 65 | Número da agência `41 99908-8357` no link da bio/site | Alteração anterior sem revalidação pública | Não validado | Abrir página pública e testar CTA |
| 66 | `Planos.pdf` atualizado em cadastro e demais pontos | Arquivo local existe | Não validado visualmente | Abrir todos os CTAs e comparar hash/versão do PDF |

## 4. Produção, vídeos, demandas e permissões

| ID | Pedido | Evidência atual | Estado estrito | Próxima validação necessária |
|---:|---|---|---|---|
| 67 | Videomaker lançar trabalho externo/pontual sem criar cliente/contrato/calendário/mensalidade | Regressão local anterior 72/72 | Validado localmente | Clique real por Luís/Nathan/Amanda/Chris |
| 68 | Amanda subir vídeos como filmmaker | Permissão foi preparada, sem tela real recente | Não validado | Login Amanda e lançamento fictício |
| 69 | Trabalho externo não contaminar contadores/clientes | Testes locais anteriores | Validado localmente | Conferir Arquivo/Esteira/Entregas publicados |
| 70 | Demanda da Gabi não desaparecer depois de “enviada” | Relato operacional não recebeu revalidação final | Não validado | Criar demanda fictícia, enviar e localizar pelo destinatário |
| 71 | Legendas irem à Cecília e não voltarem à Gabi | Relato de retorno indevido permanece sem prova de correção | Não validado | Teste completo com estado e recibo |
| 72 | Referência enviada pelo cliente ir a Referências | Roteamento anterior existe, sem prova publicada recente | Não validado | Envio fictício pelo Portal e conferência da fila correta |
| 73 | Controle de gravações permitir concluir em duas captações | Pedido não foi reensaiado | Não validado | Planejar duas sessões e concluir sem exigir terceira |
| 74 | Checklist limpar só após meia-noite; 19h apenas avisar | Pedido sem nova prova operacional | Não validado | Relógio controlado/teste temporal e tela real |
| 75 | Stories diários no checklist da Gabi | Configuração anterior, sem prova recente | Não validado | Login Gabi e virada diária controlada |

## 5. Regras permanentes de entrega

| ID | Regra | Situação atual |
|---:|---|---|
| 76 | Usuário faz upload no GitHub e aplica Firebase | Mantida; a V89 não publicou nem gravou produção |
| 77 | Uma pasta central no Mac | A V89 deve ser entregue em uma única pasta dentro de `site Get — atualizado` |
| 78 | Não manter pacotes concorrentes na área de upload | A remoção de pacote antigo é uma ação destrutiva separada e não será feita sem confirmação explícita |
| 79 | Entrega completa em uma pasta | Aplicada à V89 com manifesto e caminhos relativos |
| 80 | Não afirmar produção corrigida sem clique real publicado | Mantida; produção foi identificada como V88 durante a conferência |
| 81 | Testes funcionais, não apenas leitura/strings | A V89 acrescentou 26 cliques reais em Chrome isolado; próximos itens exigem seus próprios ensaios |
| 82 | Não recriar calendário real para corrigir “vazio” sem provar ausência | Mantida |
| 83 | Lista completa de ontem e hoje | Preservada nesta matriz, retirando apenas Calendários e Stories conforme solicitado |

## Ordem proposta para as próximas conversas

1. **Cadastro, entrada, saída, reativação e mensalidade da Amanda**, porque afetam identidade e carteira.
2. **Mensagens, contatos e cobrança**, incluindo botões e recorrentes/avulsos.
3. **Vendas, propostas e primeiro atendimento**.
4. **Produção, demandas, legendas, referências, gravações e checklist**.

Cada frente deve começar pela reprodução do relato, tratar uma causa, executar clique real com dado isolado e separar resultado local de resultado publicado.
