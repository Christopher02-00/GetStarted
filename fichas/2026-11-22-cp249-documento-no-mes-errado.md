# cp249-documento-no-mes-errado — o documento da Amanda não pode ir para um mês que já passou

Pedido (Chris, 22/11): "analise estritamente essa região do sistema aonde Amanda sobe os documentos dos clientes … nunca mais tenha nenhum
tipo de erro … confiar fielmente no que está ali … no mês passado muitos erros … os documentos não iam, sumiam … vamos simplificar".
Unidade: U1 da área de documentos (CP249) · Tipo: erro

Caso real (exportação de 22/11 com as subcoleções dos ciclos, só leitura):
- Em 20/11, às 12:45 e às 13:10, a Amanda incluiu e enviou os documentos de janeiro da **Master Chef** e da **Divina Cantina**.
  - Eles ficaram em `2026-01__master-chef` e `2026-01__divina-cantina`: **janeiro de 2026, que já passou**.
  - No mesmo dia, iPhone Campo Largo (12:33) e Bluefit (13:55) foram certos para `2027-01`.
- Em janeiro de 2027, os dois aparecem como "sem preparação" e o documento "sumiu" para o Chris.
- São os únicos ciclos já criados para um mês anterior ao da criação (40 ciclos).

Causa-raiz:
1. O topo da Central mostra "Mês dos conteúdos" como `<input type="month">`, que abre no mês seguinte (2026-12).
   - Para ir a janeiro, a pessoa troca só o mês e o ano fica 2026.
   - No Safari do Mac o campo aparece como texto ("2026-12").
   - O cabeçalho mostra o mês cru ("Enviar meus documentos · 2026-01"), sem o ano por extenso.
2. O servidor aceita incluir e enviar documento para qualquer mês válido, inclusive um que passou há 10 meses.

Árvore:
RAIZ: competência do ciclo de preparação (`planejamento_social_i155/{mes}__{cliente}`)
├─ ESCRITORES : Central R80 (`central_mutar`: incluir, documento, confirmar_documento, enviar_consolidado) → I/O do servidor `central-preparacao-io-r80.mjs`
├─ LEITORES   : editor I172 do Chris (mês escolhido), checagem prévia (07:31), vigias, Central (lista do mês), agenda I167
├─ PAPÉIS     : Amanda (envia), Chris (abre no mês certo), Gabi (referências: incluir)
├─ RULES      : n.a. (só o servidor grava a preparação)
├─ AUTOMAÇÕES : checagem prévia diária; Raio-X diário
├─ LEGADO     : os 2 ciclos de 2026-01 ficam como histórico (nada é apagado)
└─ EFEITO     : só recusa enviar para mês anterior ao mês passado; consultar meses antigos continua igual

Mudança:
- Servidor (`central-preparacao-io-r80.mjs`): incluir, documento, confirmar_documento e enviar_consolidado são recusados se a competência
  for anterior ao mês passado (horário de Brasília).
  - A mensagem diz o mês por extenso e que nada foi gravado.
  - O mês que acabou de terminar continua aceito: fechar o mês e não travar as jornadas com mês fixo.
- Tela (`gs-planejamento-social-i155.mjs`): "Mês dos conteúdos" vira uma lista com o mês por extenso ("janeiro de 2027").
  - Os meses passados ficam marcados "já passou · só consulta".
  - O cabeçalho do envio mostra o mês por extenso.
  - Funciona igual em todo navegador.
- `gs-estado-mes.mjs` (as duas cópias): `mesPorExtenso(mes)`.
- Checagem prévia: o ciclo enviado para um mês anterior ao da criação é acusado no mês certo (mesmo mês, ano seguinte), com quem resolve.
  - Resolve a Amanda, reenviando no mês certo.
- Raio-X: regra nova C5 (o mesmo achado, todo dia).

O que NÃO muda: consultar meses passados; o caminho de envio; os ciclos de 2026-01 (histórico); adotar a base (Chris).
Testes: J105 (vermelha antes: o servidor aceita 2026-01; verde depois: recusa, tela por extenso, checagem prévia acusa) + J06, J49, J104 (Zeiss).
Risco residual: as jornadas com mês fixo (2026-12 em 29 lugares) já dependem da data real: a J06 usa o mês padrão, que vira 2027-01 em 1º/12.
- Esse risco é anterior a esta unidade e está registrado em Pendências.
Dado antigo: Master Chef e Divina Cantina de janeiro precisam ser reenviados pela Amanda em janeiro de 2027 (2 minutos cada).
- Nada é movido sem o ok do Chris.
