# proposta4-demandas-abertas-na-entrada — o Escritório da gestão baixa só as demandas vivas ao entrar (PREPARADA; publicar depois de janeiro)

Pedido: relatório de acúmulo L1 (`.claude/docs/ACUMULO_L1.md` §3, Proposta 4) + Chris, 23/11: "pode continuar o resto do trabalho q ficou
pendente" → caixa de perguntas: **preparar agora, publicar depois da semana de produção de janeiro**.
Unidade: P4 (mudança compartilhada — muitas telas leem a mesma lista) · Tipo: ajuste (desempenho), sem mudança de regra.

Sintoma: cada entrada da Amanda e do Chris (e cada troca de perfil do Chris) baixa as 5.387 demandas (5,9 MB, 98% encerradas).
Reprodução: escritorio.html:41185 — o ouvinte da gestão é `onSnapshot(collection(db,'demandas'))` sem filtro (os outros papéis já
escutam só `destinatario==pessoa`, 41186). Mapa completo (23/11, só leitura): levantamento resumido abaixo, linhas de escritorio.html.

Árvore:
RAIZ: ouvinte da gestão (41119–41215) → `todasDemandas` (41197, filtrada por `demandaOperacionalVisivel` 24407, que MANTÉM `aprovada`)
├─ ACOPLAMENTO: o mesmo retrato cru alimenta `__cacheColecoes` (`__alimentarCacheTempoReal` 41189→2279) e o `getDocs` (2316) responde
│  dali os 22 `getDocs(collection(db,'demandas'))` do arquivo. Filtrar o ouvinte sem mexer nisso = 22 leitores recebendo só abertas
│  sem saber (ou, sem cache, 22 leituras completas).
├─ LEITURAS COMPLETAS que reconstroem a lista: `carregarTodasDemandas` com `servidor:true` (29485; chamadores 53043, 53086) e
│  `abrirFilaMinhasCp179` (33483–33487, SUBSTITUI `todasDemandas` pela coleção inteira).
├─ LEITORES QUE PRECISAM DAS ENCERRADAS (12 telas): Minhas Demandas "Que eu enviei"/"Concluídas" (33559–33598); Demandas que Eu Enviei
│  (48194); "Entregue nos últimos 7 dias" (46967); Resumo diário (39842/39910 — GRAVA em `resumos_diarios`); Resumo do dia da Amanda
│  `resolvidasHoje` (51274); O que a Amanda decidiu (51345); feed da Central de Comando (48460); Painel Cápsula (31579); linha do tempo
│  do cliente (9957); Funções Fixas grade e editor (15002, 19510); Recepção de documentos CP133 (53041); `demandaCalendariosDoMes` (19313);
│  reparo CP152 (3108) e os abridores `abrirDemandaGerencia`/`Minha`/`Enviada` (51535, 34281, 33070: `if(!d) return` = clique morto).
├─ ANTI-REPETIÇÃO QUE DEPENDE DA MEMÓRIA (o risco grave):
│  · `avisarCalendarioPronto` (motor diário, 40203/40216): `jaAvisado` lê do cache incluindo `aprovada`; cria com `addDoc` (id aleatório)
│    → só abertas = aviso recriado todo dia para cada cliente cujo aviso já foi fechado;
│  · `sincronizarAutomacaoFuncoesFixas` (14545/14577, conferido 23/11): `existentes` vem de `todasDemandas`; se a função fixa aprovada não
│    está na lista, `setDoc` SEM merge no id determinístico reescreve como `pendente` e apaga prova e aprovação.
│  As demais (criarDemandaSegura, CP109, varrerDuplicatas, I54/I55, avisos de fila, consultas de gargalo/choque/semana) já conferem no
│  servidor ou por id fixo → sem risco.
├─ ESTADOS "ABERTOS": pendente, em_andamento, refazer, andamento (rules:3387), concluida, concluida_aguardando_aprovacao — um filtro
│  `in` só com dois deles esconderia demandas vivas.
├─ OUTROS PAPÉIS: Cecília, Gabi, editores (ouvinte por `destinatario`, todos os estados) e Fernanda (união 29366) — sem mudança.
├─ RULES: sem mudança esperada (leitura de gestão já permitida); um índice composto pode ser preciso se o histórico usar status + data.
└─ EFEITO: entrada da gestão de ~5,9 MB para ~0,6 MB (~505 documentos); histórico passa a carregar ao abrir a tela de histórico.

Mudança proposta (quando publicar), em PRs pequenos dentro da P4, cada um com equivalência provada antes do seguinte:
- P4a (sem efeito visível): as duas rotinas anti-repetição passam a conferir no servidor — `avisarCalendarioPronto` com id determinístico
  por cliente+mês em transação (como CP109) e `sincronizarAutomacaoFuncoesFixas` com `tx.get` no id determinístico antes de gravar
  (nunca reescrever `aprovada`/`cancelada`). Jornada vermelha antes: lista sem a aprovada → hoje reescreve; depois não.
- P4b: um leitor único de histórico `historicoDemandas({desde, pessoa, cliente, ids})` (consulta ao servidor, lembrada na sessão) e os
  12 leitores acima passam a usá-lo; os abridores buscam por id quando o cartão não está na lista. Lista ainda completa → telas iguais.
- P4c: o ouvinte da gestão passa a `where('status','in',[estados abertos])` + encerradas dos últimos 40 dias (cobre resumo de ontem,
  7 dias, mês corrente das Funções Fixas); o cache marca o retrato como parcial e os `getDocs` de histórico deixam de usá-lo;
  `abrirFilaMinhasCp179` e `carregarTodasDemandas({servidor:true})` deixam de substituir a lista pela coleção inteira.
O que NÃO muda: regras de quem vê o quê, outros papéis, motor de e-mails/lembretes (já só abertas), dados (nada é apagado).

Testes previstos: jornada nova por tela de histórico (12) comparando antes/depois com o seed; jornada vermelha→verde das duas rotinas
anti-repetição; J02 (demanda ponta a ponta), J08 (motor rodada completa), J54 (gestão em uma leitura), J110 (confere só a tocada), J118 (aprovação em lote), J98 (robô de cliques), medição de bytes na entrada (antes/depois);
`--movel`; bateria inteira no CI. Sem Functions, sem rules (se surgir índice composto, avisar o Chris antes).
Risco residual: tela de histórico esquecida mostrando vazio — por isso o leitor único (P4b) vem ANTES do filtro (P4c).
