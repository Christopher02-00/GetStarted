# cp259-panorama-le-so-a-semana — o Panorama da Semana do Início lê só os dias da semana

Pedido (Chris, 22/11): varredura de acúmulo. Unidade: L1-d3 (CP259) · Tipo: erro (peso)

Caso (código e dados reais de 22/11):
- No Início do Chris, a atualização dos retornos mensais (CP155) roda a cada minuto com a aba visível e no foco da janela.
  Ao terminar, ela redesenha o Resumo do Dia (`renderResumoDiarioHome`).
- De sexta a domingo, esse redesenho monta o "Panorama da Semana" lendo TODOS os resumos diários (116 documentos, ~0,9 MB)
  para somar só os dias da semana.
- `resumos_diarios` não tem ouvinte em tempo real, então essas leituras vão de fato ao servidor: cerca de 116 leituras e 0,9 MB por minuto,
  o dia inteiro, nos fins de semana.

Causa-raiz: leitura da coleção inteira para usar no máximo 7 documentos, cujo identificador é a própria data (AAAA-MM-DD).

Árvore:
RAIZ: `renderResumoDiarioHome` (escritorio.html), bloco do Panorama da Semana
├─ ESCRITORES : `gerarResumoDiarioSeNecessario` (1 documento por dia, id = data)
├─ LEITORES   : este bloco; o gerador (lê tudo 1 vez por dia, custo desprezível, sem mudança)
├─ PAPÉIS     : Chris e Amanda (o redesenho por minuto é do Chris)
├─ RULES      : a mesma leitura, agora com filtro pelo identificador
└─ EFEITO     : o panorama soma exatamente os mesmos dias (o filtro é o mesmo `id >= início da semana && id <= hoje`, aplicado no servidor)

Mudança (só tela): consulta `where(documentId(),'>=',inícioDaSemana)` e `where(documentId(),'<=',hoje)`. O filtro na tela continua igual.
O que NÃO muda: o gerador, os números do dia e o restante do Resumo do Dia.
Testes:
- J113 (nova): vermelha antes (1 leitura de todos os resumos), verde depois (só a semana; a soma continua 7, sem os antigos).
  O "agora" da página é fixado em domingo para a jornada não depender do dia em que roda.
- Bateria inteira no CI.
Risco residual: nenhum identificado. O identificador sempre foi a data local, e o filtro na tela continua de segurança.
