# comentario-interno-nao-vaza — o comentário da revisão interna não aparece para o cliente
Pedido original (literal): "Fazer uma verificação também no sistema que impacta diretamente calendários … como eles chegam para o cliente … identificar erros e corrigi-los definitivamente"
Unidade: V1 da auditoria do percurso (10/11) · Tipo: erro (vazamento interno)
Sintoma: a Amanda comenta na revisão interna; depois de liberado, o cliente abre "💬 Sugestões e comentários" e lê o comentário interno.
Reprodução: emulador. A J34 grava um comentário `origem:'revisao_interna'` no calendário liberado pela J06 e abre o link do cliente: vermelha no código antigo ("o comentário interno da Amanda aparece para o cliente").
Causa-raiz: a revisão interna grava em `calendarios/{slug}.comments` (escritorio.html ~49051 e calendario.html ~3551, `origem:'revisao_interna'`), a mesma lista do recado do cliente; `renderFeedback` (calendario.html ~3818) mostra a lista inteira sem filtro.
Árvore:
RAIZ: calendarios/{slug}.comments[].origem
├─ ESCRITORES : revisão da Amanda (escritorio ~49051), comentário em modo equipe (calendario ~3551), recado do cliente (CP151), observação I35, texto I68
├─ LEITORES   : renderFeedback (calendario/calendarios) — único que mostra a lista; escritório lê os da revisão
├─ HUMANOS    : cliente (não pode ver), Amanda/Chris (continuam vendo em modo equipe)
├─ RULES      : sem mudança (o fechamento da leitura do documento inteiro é a unidade das rules)
└─ COLATERAL  : nenhum — só a lista mostrada ao cliente
Mudança: `renderFeedback` filtra `origem==='revisao_interna'` fora do modo `equipe` (calendario.html e calendarios.html, byte a byte iguais).
O que NÃO muda: gravação dos comentários, fila da Amanda, modo equipe.
Testes: J34 (nova, vermelha→verde) + portão completo desktop e --movel.
Risco residual: o documento ainda chega inteiro ao navegador do cliente (dá para ler pelo console) — fechado na unidade das rules (ok do Chris em 10/11).
