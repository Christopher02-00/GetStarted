# cp245-tarefa-sistema-sem-aprovador — tarefa do sistema concluída pela Amanda não fica esperando aprovação para sempre

Origem: Programa Estabilidade (pedido do Chris, 20/11). Achado do Raio-X da produção (exportação de 21/11, só leitura), regra A5.
Unidade: única · Tipo: defeito de caminho

Caso real:
- 143 tarefas de origem 'sistema' para a Amanda, que ela concluiu (82 em agosto, 61 em setembro), estão em `concluida_aguardando_aprovacao`;
- exemplos: "🎬 Distribuir 3 vídeo(s) pros editores" (29), "📸 Aprovar os stories de Juliane Nerone" (18), "🗑️ Nathan quer excluir…" (5);
- mais 2 de hoje: alerta de cobertura da Plasarte e conferência de campanha Black Friday;
- a mediana de espera é 85 dias. Elas enchem o filtro "Aguardando" da Amanda.

Causa (lida no código):
- `aprovacaoEhDe` (escritorio.html) diz que a Amanda aprova o que veio de 'sistema';
- as listas de aprovação excluem a entrega da própria pessoa (`d.destinatario !== pessoa`, salvo quando ela mesma pediu);
- então ninguém aprova;
- a rule de conclusão (`x4`) só deixa a pessoa fechar direto um AVISO (`ehAviso` ou origem cliente, com a nota fixa) e não uma tarefa do sistema.

Correção: um gatilho no servidor, `functions-get/tarefa-sistema-sem-aprovador-cp245.mjs`, export `tarefaSistemaSemAprovadorGetCp245`.
- Ele age em `demandas/{id}` quando a entrega fica em `concluida_aguardando_aprovacao`, com origem 'sistema', destinatário 'Amanda' e sem `ehAviso`.
- Ficam de fora:
  - pedido do cliente;
  - os tipos com revisor próprio: espera CP149, providência CP140, organização I167 e planejamento I155.
- A entrega vira 'aprovada', com a nota "Tarefa do sistema concluída pela Amanda — não há outra pessoa para aprovar." e a marca `fechamentoSemAprovadorCp245`.
- A prova escrita por ela fica intacta.
- Não muda:
  - a tarefa do sistema para outra pessoa (a Amanda aprova, como hoje);
  - as tarefas que pessoas criam;
  - as rules.

Árvore:
RAIZ: entrega de tarefa do sistema sem aprovador possível
├─ ESCRITORES : conclusão em Minhas Demandas (tela, sem mudança) → este gatilho fecha
├─ LEITORES   : filtro "Aguardando" da Amanda, contadores de aprovação (`aprovacaoEhDe`), Aprovações do Chris (não recebia essas)
├─ PAPÉIS     : Amanda (as dela fecham); Cecília/editores/Chris sem mudança
├─ RULES      : sem mudança (escrita pelo servidor)
├─ AUTOMAÇÕES : gatilho novo em `demandas/{id}`; retorno imediato quando não se aplica; idempotente
├─ LEGADO     : as 143 antigas só fecham com escrita em dado → precisa do ok do Chris
└─ EFEITO     : o "Aguardando" da Amanda mostra só o que alguém de fato vai aprovar

Testes:
- J97 (cliques reais):
  - contraprova sem o gatilho: caso 1 vermelho;
  - com o gatilho: verde.
- Vizinhas: J02 (demanda ponta a ponta), J13 e J85.

Publicação: Functions (ok geral do Chris para publicar Functions, 20/11) + docs.
