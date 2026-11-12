# video-ligado-ao-calendario — todo vídeo nasce ligado a um conteúdo do calendário ou como extra descrito (CP207)
Pedido original (literal): "dos 25 vídeos na fila, 14 aparecem como 'conteúdo ainda não identificado'. Para esses, quem legenda
não tem o roteiro, a ideia nem o recado da Amanda. Só tem o vídeo… consertar da maneira que eu falei, definitiva, da origem ao fim".
Proposta da conversa social media: (1) no envio, escolher de qual conteúdo do calendário é o vídeo; extra exige campo dizendo o que é;
(2) na fila de legendas, botão "Vincular ao calendário" para os que já estão lá.
Unidade: U3 · Tipo: erro (origem) + ajuste (fila)
Reprodução: produção RO 12/11 — 18 de 26 postagens da fila sem calendarItemId; ex.: Bluefit "Comparação" com
`vinculoSessao:'declarado_em_campo'` e `registradoPor:'Nathan'` (digitado em "Vídeos gravados fora da lista do calendário").
Causa-raiz: (a) o registro da gravação (registrarGravacaoRealizadaNucleo → prepararMateriaisDeclaradosSessao) cria o vídeo digitado
sem nenhuma identificação — o checklist do calendário fica numa seção fechada e o campo de texto é o primeiro à vista;
(b) a janela de identificação do envio (I106) aceitava "Ainda preciso identificar" mesmo com o calendário disponível, e "extra" sem
dizer o que é; (c) na fila, o caminho para ligar existia ("Conteúdo e legenda →") mas não dizia que faltava a ligação.
Árvore: RAIZ videos_producao/postagens.referenciaLegendaI78 + identificacaoConteudoI106 · ESCRITORES registro da gravação (Luís/Nathan),
envio manual I67 (editores/Amanda), identificarVideoI106 (Gerência), salvarReferenciaLegendasI78 (fila) · LEITORES fila de legendas
(resumoI106, htmlReferenciaLegendaI78, recado I96), postagem nasce copiando a referência do vídeo (linha ~9024) · RULES sem mudança
(create de vídeo não restringe esses campos; postagens já aceitam a referência de Chris/Amanda/Cecília/Fernanda) · LEGADO
vídeos antigos continuam como estão e são ligados pelo botão da fila.
Mudança: gs-identidade-conteudo-i106.mjs (sem "ainda preciso identificar" quando o calendário está disponível; extra com descrição
obrigatória; `identificacaoI106`; resumo mostra a descrição do extra e o aviso "sem ligação"); escritorio.html (registro da gravação
passa os vídeos digitados pela mesma janela e confere a escolha na transação; os 3 envios gravam a descrição; botão
"🔗 Vincular ao calendário" na fila quando falta a ligação). Referência editorial (não reserva de produção): a reserva I28 só
aceita vídeo ainda não aprovado, e mudar isso exigiria rules — fora do escopo.
O que NÃO muda: reserva de produção I28, checklist do calendário, rules, functions, dados de produção.
Testes: J59 (origem: Luís registra 2 vídeos digitados → conteúdo do calendário + extra descrito; extra sem descrição recusado;
fila: aviso + Vincular → ligação gravada e cartão mostra o conteúdo) vermelha antes, verde depois; J11 atualizada; portão + --movel.
Risco residual: os 14 vídeos que já estão na fila precisam ser ligados uma vez pelo botão (quem legenda ou Amanda/Chris).
