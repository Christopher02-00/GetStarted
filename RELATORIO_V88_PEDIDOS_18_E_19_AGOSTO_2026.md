# Matriz completa de pedidos — 18 e 19 de agosto de 2026

Atualizado em 19/08/2026. `REAL` = clicado com Firestore; `LOCAL` = V88 testada e ainda depende do upload; `PARCIAL` = cadeia incompleta; `PENDENTE` = sem prova recente.

## Calendários e rotina editorial

1. Gabi abrir/iniciar iPhone Campo Largo — reprodução real mostrou que o cartão sumia junto com outros três mensalistas; a carteira foi corrigida localmente para incluir config-only e compatibilidade legada. A função real foi executada em sandbox com os quatro casos e um novo mensalista. **LOCAL validado; falta repetição visual pós-upload**.
2. Identificar outros calendários vazios — V87 real: 22 mensalistas, 11 publicados, Fior em montagem e 10 não iniciados. **REAL**.
3. Gabi montar qualquer competência desde julho/2026 — seletor multimeses. **LOCAL**.
4. Gabi salvar com confirmação — conteúdo sintético salvo; recibo “salvo às 09:27”. **REAL**.
5. Gabi enviar para Amanda — conteúdo sintético saiu da edição e o estado final publicado foi confirmado no Firestore; o clique da etapa Amanda não foi observado de forma independente nesta repetição. **REAL com rastreabilidade parcial por papel**.
6. Amanda ter fila única — `linhasCalendariosAguardandoRevisao`. **LOCAL**.
7. Amanda ver roteiro, legenda, referência e solicitação — gates verdes. **PENDENTE de clique real**.
8. Amanda aprovar/publicar imediatamente — único escritor de publicação. **LOCAL; falta clique real**.
9. Cecília não receber vazio ambíguo — ausência, montagem, revisão, publicado, arquivo e falha são estados distintos. **PARCIAL**.
10. Cecília copiar qualquer mês publicado — URL exata, sem publicar. **LOCAL; falta clique real**.
11. Gabi/Amanda/Cecília acessarem todos os meses internamente — papéis e seletores preservados. **PENDENTE de login real das três**.
12. Cliente abrir qualquer mês liberado — o Portal publicado da Vitalle abriu agosto (11 itens) e, em nova abertura, setembro (7 itens) com estado liberado pela Amanda. **REAL para Vitalle em agosto e setembro**.
13. Não exibir “link inválido” genérico — mensagens próprias para produção, arquivo e indisponibilidade. **LOCAL**.
14. Mês fechado mostrar apenas “Calendário arquivado” — conteúdo oculto. **LOCAL**.
15. Publicar um mês não arquivar outro — escritor lateral removido; V88 34/34. **LOCAL**.
16. Reabrir arquivo sem derrubar mês atual — transação isolada com recibo. **LOCAL**.
17. Arquivamento simples — automático 30 dias após o fim da competência. **LOCAL**.
18. Agosto/setembro de 2026 continuarem abertos — compatibilidade explícita. **LOCAL**.
19. Regra nova valer depois de setembro — outubro/2026 é a primeira competência arquivável automaticamente. **LOCAL**.
20. Nada anterior a julho/2026 — limite fixo e teste. **LOCAL**.
21. Avulsos fora da carteira de calendário — opt-in de mensalista. **LOCAL**.
22. IKN/IKN Brasil fora de Calendários — avulso confirmado vence legado. **LOCAL**.
23. X Joias fora de Calendários — mesma classificação. **LOCAL**.
24. Não inventar os dez calendários que a Gabi ainda não fez — nenhum conteúdo real criado. **REAL**.
25. Validar mensalistas um a um — a primeira fotografia tinha 22; a regressão posterior no perfil da Gabi mostrou somente 18 e identificou nominalmente os quatro ausentes. A projeção corrigida foi executada e incluiu os quatro, um config-only novo e excluiu inativo/IKN/X Joias. **LOCAL validado; falta repetição visual pós-upload**.
26. Teste real Gabi → Amanda → Cecília → cliente — o registro sintético comprovou preparação, gravação e estado final publicado; a Vitalle comprovou a porta real do cliente em agosto e setembro. O roteiro artificial não autenticou seu token e a cópia pela conta real da Cecília não foi repetida nesta sessão. **PARCIAL; elos reais comprovados, mas não numa única identidade fim a fim**.
27. Erro/cota/timeout não virar vazio — timeout, cache e último retrato cobertos. **LOCAL**.
28. `calendario.html` e `calendarios.html` idênticos — comparação byte a byte. **LOCAL validado**.
28a. Impedir que Cecília copie um acesso já inativo, vencido, ilegível ou divergente — validação antes da transação e no recibo; nenhuma cópia ocorre nesses estados. **LOCAL validado; Vitalle real está ativa e abriu normalmente**.
28b. Gabi receber porta de criação/edição para todos os mensalistas — perfil real reproduziu 18/22; faltavam Açougue São Joaquim, iPhone Campo Largo, Joaquin Assados e Zeiss. A causa foi corrigida na projeção da carteira e na compatibilidade de classificação. O gate V88 executou a função real e passou 55/55; o navegador autenticado não concluiu a nova captura após o recarregamento. **LOCAL validado por execução; produção não confirmada**.

## Stories

29. Stories da Vitalle não sumirem — roteiro real da semana de 17/08 abriu no Portal V87. **REAL para Vitalle**.
30. Correção valer a todo cliente com Stories — plano/ficha/histórico convergem; gate 25/25. **LOCAL**.
31. Gabi preparar semana sem duplicar — ID determinístico e trava. **LOCAL**.
32. Amanda aprovar/devolver sem corrida — transação e recibo. **LOCAL**.
33. Links aparecerem somente após Amanda — fontes isoladas. **LOCAL**.
34. Falha de links não esconder roteiro/aba — no Portal real da Vitalle, os links opcionais ficaram indisponíveis e o roteiro 17–22/08 continuou visível. **REAL para Vitalle**.
35. URLs de Story seguras — HTTPS, escape e `noopener`. **LOCAL**.
36. Teste real completo por papel/cliente — Vitalle real e sintético anterior; repetir pós-V88. **PENDENTE**.

## Clientes, contatos, contratos e saída

37. Número do cadastro redistribuir-se automaticamente — fonte única para contato/financeiro. **PENDENTE de revalidação**.
38. Contatos ativos exclusivos do Chris — DOM e coleção privada. **PENDENTE de revalidação real**.
39. Aba de contatos conter somente recorrentes — filtro reforçado na V88. **LOCAL**.
40. X Joias sair da aba de números — projeção avulsa antes do filtro. **LOCAL; depende de upload**.
41. IKN sair da aba de números — mesmo tratamento. **LOCAL; depende de upload**.
42. Botões de contatos voltarem a clicar — correção anterior existe, mas houve novo relato de regressão. **PENDENTE**.
43. Régua abrir conversa específica — aliases/número canônico. **PENDENTE de clique real**.
44. Cobrança organizada no WhatsApp — linhas e emojis legíveis. **PENDENTE de clique real**.
45. Saída remover listas e preservar histórico — soft-delete/token/arquivo; gate 49/49. **LOCAL**.
46. Arquivo de clientes ser uma fonte única — ficha, saída e reativação centralizadas. **PENDENTE de revalidação**.
47. Reativação não duplicar cadastro/token — ponteiro e token canônicos. **LOCAL**.
48. Amanda informar valor inicial ao ativar/reativar — campo e transação unificada. **LOCAL; falta tela real**.
49. Amanda alterar mensalidade a qualquer momento — pedido explícito posterior. **PENDENTE; sem prova recente**.
50. iPhone Campo Largo com R$ 800/mês — refletir contrato/mensalidade/contato. **PENDENTE de comprovação**.
51. iPhone Campo Largo com telefone 41 99268-8449 — contato recorrente. **PENDENTE de comprovação**.
52. Encerrado sair dos contatos e ficar arquivado — projeção única. **PENDENTE de revalidação**.

## Vendas, propostas e primeiro atendimento

53. Central de Vendas no Financeiro — leads por mês, origem, estágio e arquivo. **PENDENTE de revalidação**.
54. Pré-cadastro por link da bio/WhatsApp — cliente preenche e recebe retorno. **PENDENTE de revalidação**.
55. Unificar links de cadastro sem quebrar onboarding — entrada canônica e compatibilidade. **PENDENTE de revalidação**.
56. Mensagem de boas-vindas com link correto — WhatsApp da agência. **PENDENTE de comprovação**.
57. Registro rápido de reunião e resumo — formulário e recibo. **LOCAL em versão anterior; não reensaiado**.
58. Proposta nascer preparada, sem fingir “enviada” — data real só após ação. **LOCAL**.
59. Proposta idempotente — família determinística; colisão SHA entre famílias continua limite. **PARCIAL**.
60. HiTech/Rodrigo como renovação mensal — sem avulso/receita indevida. **PENDENTE de produção**.
61. Proposta iPhone de R$ 800/mês — mensalista novo e compensação preservada. **PENDENTE de status comercial**.
62. IKN como projeto avulso — fora da carteira mensalista. **LOCAL V88**.
63. Formatura Júlio Nerone como evento institucional — não mensalista. **PENDENTE de cadastro**.
64. Cadastrar as quatro propostas fornecidas — sem duplicar/fingir envio. **PENDENTE de status e links duráveis**.
65. Número da agência no link da bio/site — 41 99908-8357. **PENDENTE de revalidação pública**.
66. PDF novo dos planos em todos os pontos — `Planos.pdf` no cadastro/site. **PENDENTE de revalidação visual**.

## Produção, vídeos, demandas e permissões

67. Videomaker lançar trabalho externo/pontual — não cria cliente, contrato, calendário ou mensalidade. **LOCAL anterior; 72/72**.
68. Amanda subir vídeos como filmmaker — mesmas operações autorizadas. **PENDENTE de tela real**.
69. Trabalho externo não contaminar contadores/clientes — badge/agrupamento próprios. **LOCAL anterior**.
70. Demanda da Gabi não desaparecer após “enviada” — recibo e fila do destinatário. **PENDENTE de revalidação**.
71. Legendas irem à Cecília e não voltarem para Gabi — estado único. **PENDENTE de revalidação**.
72. Referência do cliente ir a Referências — roteamento único. **PENDENTE de revalidação**.
73. Gravações concluírem em duas captações — sessões planejadas sem terceira obrigatória. **PENDENTE de revalidação**.
74. Checklist limpar só após meia-noite; às 19h apenas avisar — não apagar trabalho. **PENDENTE de revalidação**.
75. Stories diários no checklist da Gabi — tarefa recorrente. **PENDENTE de revalidação**.

## Regras permanentes de entrega

76. Usuário sempre sobe GitHub e aplica Firebase — mantida; nenhuma publicação feita nesta V88.
77. Uma única pasta central no Mac — V88 será preparada em `site Get — atualizado`.
78. Remover pacotes antigos da área de upload — manter somente o pacote atual; `SITE_GET_ATUAL` continua a base completa.
79. Entregar tudo junto em pasta clicável — V88 terá um pacote único com caminhos relativos.
80. Não afirmar produção corrigida sem clique real — aplicado neste relatório.
81. Testes reais, não só leitura/strings — registro sintético criado, salvo, publicado e encerrado por soft-delete com recibo; Portal real da Vitalle abriu agosto, setembro e Stories. **REAL com limite de papéis descrito no item 26**.
82. Não tocar calendários reais para “corrigir vazio” sem provar ausência — mantido.
83. Lista completa de ontem e hoje — esta matriz será atualizada após os cliques restantes.

## Fotografia real de setembro/2026 na V87

**Publicados (11):** Mochi, Divina Cantina, Vip, Camargo's, Master Chef, Bluefit, Juliane Nerone, Vitalle Odonto, Cookiery, Emanuelle Bernaski nutri e Dra Júlia.

**Em montagem (1):** Fior Restaurante, com um conteúdo.

**Sem calendário confirmado (10):** Açougue São Joaquim, Dra. Monique, Fedalto Eletro Comercial, Helo Arquiteta, iPhone Campo Largo, Joaquin Assados, Place, Stokki, Vital Seg e Zeiss.

Essa fotografia prova que “tela vazia” precisa ser interpretada por estado. Ela não autoriza reconstrução automática dos dez calendários ausentes.
