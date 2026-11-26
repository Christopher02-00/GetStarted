# lz6-central-de-vendas — a Central de Vendas fica como o lugar único de vendas, sem os erros
Pedido (Chris, 26/11): "Central de vendas vamos deixar oq podemos fazer e melhorar simplificar e aprimorar e tirar os erros dela"; catálogo:
Funil de Negócios, Projetos Avulsos e Leads PF/Plano Mensal da Gerência → apagar.
Unidade: LZ6 · Tipo: erro + ajuste
Caso real (export 25/11): leads_mensalista 2 "novo" (30/09 e 12/10) e leads_pessoa_fisica 1 "novo" (19/11) sem negociação; negocios 1
(julho); a Central só sincroniza quando o Chris a abre (acesso registrado 1 vez desde agosto).
Erros achados (levantamento só leitura, 26/11) e o que muda:
1. CRÍTICO — salvarPropostaVenda gravava origemLead:'manual' (merge) num negócio vindo de pedido; a sincronização seguinte via
   lead_<origem>_<id> com outra origem e lançava erro → "Central de Vendas indisponível" (e Funil/Projetos Avulsos também). Agora a origem
   anterior é preservada na transação.
2. Contadores do mês usavam a data em que a Central leu o pedido (e o carimbo provisório sumia na 1ª leitura): agora contam pelo mês em
   que o pedido CHEGOU (leadCriadoEmISO, gravado na sincronização) e arquivados não entram.
3. Cada tecla na busca/mês/filtro refazia a sincronização e 5 leituras, sem guarda: agora buscar/filtrar usa o que já foi lido na sessão.
4. O número do menu (badgeCentralVendas) contava todos os negócios ativos: agora conta os pedidos novos ainda não vistos (estágio recebido).
5. O cartão não mostrava o pedido, a resposta do cliente nem o comprovante: agora mostra o pedido do site (dados, protocolo, data de
   chegada), a resposta do cliente, o comprovante com "✔ Conferi o pagamento" (antes só no Funil) e o lançamento do Financeiro do projeto
   (receitas_avulsas), com aviso quando o valor da proposta difere — sem gravar no Financeiro (escrita financeira só com ok do Chris).
6. Arquivar a negociação não fechava o pedido (que seguia "novo" na Entrada da Amanda e no cockpit): agora arquiva também o pedido.
7. conferirComprovante e arquivarNegocioVenda sem tratamento de falha: agora avisam e não seguem calados.
8. Cockpit do Chris: 3 cartões de leads contavam lead encerrado como novo e abriam abas escondidas para ele; agora 1 cartão "pedido(s)
   pelo site em aberto" (regra do encerramento da sincronização) que abre a Central de Vendas.
Saem (Gerência): Funil de Negócios, Projetos Avulsos (FASES_AVULSO divergente e a fase falsa "arquivado" recusada pelas rules), Leads
Avulsos/PF/Mensal (inseriam campos públicos do formulário sem escape — risco de script de fora na sessão da gestão) e os auxiliares de
agendamento a partir de lead que só elas usavam.
FICAM: Central de Clientes → Entrada (Amanda/Chris: arquivar e ativar pedidos avulso/PF, finalizar/reabrir serviço — alterarEstadoServicoManual
e atualizarTelaServicoManual continuam), Financeiro (receitas avulsas), moverNegocio (cria a receita ao chegar em "Pago — em produção").
Achado registrado para depois: o aviso "🆕 Cadastro novo pelo site" (avisarServicosNovosI19) falhou 126 vezes entre 14/10 e 13/11.
Testes: J130 nova — no código anterior 1, 3 ("Central de Vendas indisponível"), 4 e 5 vermelhos; agora 7/7. J01, J09, J50, J12, J37 verdes.
