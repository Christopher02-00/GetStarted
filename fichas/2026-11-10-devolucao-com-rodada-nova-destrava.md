# devolucao-com-rodada-nova-destrava (CP196) — a devolução da Amanda vale quando o Chris já começou a rodada nova
Pedido original (literal, 10/11): "No calendário little-elephant, mês 2026-12, o pedido de 'devolver para ajustes' feito pelo perfil da Amanda (tentativa ed_f0555a05…) fica como 'guardado, mas não confirmado' e o 'Reconfirmar a mesma ação' não resolve. Antes disso, o Chris iniciou a rodada com a base nova da Amanda (documento de 09/11)… destrava, sem apagar os 5 conteúdos."
Unidade: urgente de 10/11 (achado E1 da auditoria do percurso) · Tipo: erro
Estado em produção (somente leitura):
- calendário: `aprovacaoMeses[2026-12]` = `aguardando_interna`, enviado pelo Chris em 03/11, e `planejamentoBasesI155[2026-12]` = `doc_consolidado_3c34…` (base antiga);
- ciclo: `criacao.base` = `doc_campanha_c3fd…` (base nova), iniciada pelo Chris em 10/11 17:27, com `enviadoRevisao:false`;
- 5 conteúdos intactos.
Causa-raiz: a decisão da Amanda (I172) exige `criacao.enviadoRevisao===true` e `planejamentoBasesI155[mes]===criacao.base`. Com a rodada nova iniciada durante a revisão, as duas condições ficam falsas para sempre, e o editar do Chris exige `rascunho/ajuste_interno`. É um impasse: ninguém decide nem edita.
Mudança: `functions-get/editorial-calendarios-i172.mjs`. Quando o mês está em revisão e a rodada nova (base atual do ciclo) ainda não foi enviada, a devolução da Amanda passa a ser aceita (`rodadaNovaCp196`):
- o mês vai para `ajuste_interno` com o motivo dela;
- `planejamentoBasesI155[mes]` passa a ser a base nova;
- a etapa `devolvido_revisao` do ciclo continua (rodada +1, aviso CP155 ao Chris).
O Chris edita os mesmos conteúdos e reenvia.
O que NÃO muda: publicar continua exigindo a base enviada. Nenhum conteúdo é apagado. As outras decisões seguem iguais.
Provas:
- Cópia real da Little Elephant no emulador (`provas-locais/J45-dbg.mjs`, fora do repo, pois tem conteúdo do cliente).
- Código antigo: "marca aguardando_interna por Chris · base doc_consolidado_3c34…" (vermelha).
- Código novo: "Pronto. A ação foi confirmada no servidor" · `ajuste_interno` por Amanda · 5 itens · base `doc_campanha_c3fd…` (verde).
- Portão completo no CI.
Pendência: jornada permanente sintética (refazer pela tela o caminho documento novo → rodada nova → devolução), que entra na fila da auditoria.
