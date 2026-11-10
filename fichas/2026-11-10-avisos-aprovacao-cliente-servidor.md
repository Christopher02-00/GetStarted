# avisos-aprovacao-cliente-servidor (CP191) — avisos da aprovação do cliente saem do servidor, um por mudança
Pedido original (literal): "…e o que eles enviam chega pra mim certo também…"
Unidade: V5 da auditoria do percurso (10/11) · Tipo: erro
Sintomas:
- (a) O aviso "✅ aprovou" é criado no navegador do cliente com `addDoc` (id aleatório), fora da transação e com o erro engolido. Se a rede cai, o aviso se perde; aprovar → remover → aprovar gera 4 avisos.
- (b) Quando o cliente remove a aprovação, ninguém é avisado: a Cecília pode gravar algo desaprovado.
- (c) O aviso "mês inteiro aprovado → Cecília marca as gravações" (decisão do Chris de 29/07) só existia em `window.aprovarConteudoCalendario` do Portal, que nada chama. Ou seja, estava morto.
Reprodução: emulador. A J38 deu vermelho no código antigo (sem aviso para a Cecília, sem aviso de remoção).
Causa-raiz: `avisarEquipeDaAprovacao` (calendario.html) faz uma escrita do cliente fora da transação; o fluxo real de aprovação é o iframe do calendário, não o do Portal.
Árvore:
RAIZ: calendarios/{slug}.items[].apr/aprPor/aprEm × avisos_do_cliente
├─ ESCRITORES : aprovarModalClienteI56 (cliente), novo `avisarAprovacaoClienteCp191` no gatilho do calendário (CP190)
├─ LEITORES   : avisos do escritório (Chris, Amanda, Cecília); viraDemanda da Cecília
├─ HUMANOS    : Chris e Amanda (aprovou, removeu), Cecília (mês inteiro aprovado)
├─ RULES      : sem mudança (a Function grava com admin; o cliente deixa de gravar esses avisos)
└─ COLATERAL  : a J20 continua lendo "Aprovados até agora: 1 de 2", agora gravado pelo servidor
Mudança:
- `functions-get/aprovacao-cliente-avisos-cp191.mjs`, chamado no mesmo gatilho `calendarioLegendaGetCp190`, compara o antes e o depois de `apr` com `aprPor:'cliente'`.
- Os ids são determinísticos: `cal_apr_cp191_*`, `cal_apr_removida_cp191_*` e `cal_mes_aprovado_cp191_*`. Para a Cecília o aviso tem `viraDemanda:true`.
- O `calendario.html`/`calendarios.html` deixa de chamar `avisarEquipeDaAprovacao`. A função fica como marcador dos scripts de regressão.
O que NÃO muda: a transação de aprovação do cliente; os outros avisos do cliente (ajuste V113, recado CP151, observação I35).
Testes: J38 (nova, vermelha → verde) + J20 + portão completo desktop e --movel.
