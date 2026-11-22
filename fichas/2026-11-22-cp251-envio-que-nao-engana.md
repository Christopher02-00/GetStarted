# cp251-envio-que-nao-engana — o documento da Amanda chega ao Chris, e os dois veem a mesma verdade

Pedido (Chris, 22/11): "nunca mais tenha nenhum tipo de erro e a gente possa confiar fielmente no que está ali, nunca eu preciso ficar
verificando por fora o que a Amanda subiu … os documentos não iam, sumiam … vamos simplificar ela".
Unidade: U2 da área de documentos (CP251) · Tipo: erro + simplificação

Caso real (código e ensaio, 22/11):
1. **Texto colado nunca chegava.**
   - A tela diz "Escolha o arquivo ou preencha o texto completo".
   - No documento único da Amanda, porém, o servidor exige o original: `documento` com `modoDocumentoCp183` sem `arquivoId` → "Envie o documento completo com o original".
   - A mensagem do PDF escaneado manda colar o texto, e o texto colado era recusado.
2. **"Ler documento" enganava.**
   - O aviso dizia "Documento lido e guardado", mas só o arquivo original ia para o servidor.
   - O documento ficava nos campos desta aba (sessionStorage), sem rascunho e sem envio.
   - Ao sair, a tela pedia "Há campos em edição", e quem fechava a aba perdia tudo. Para o Chris, "não foi".
3. **Nenhuma tela dizia, cliente por cliente, o que já chegou ao Chris.**
   - A Amanda conferia abrindo pasta por pasta, e o Chris conferia "por fora".
   - Dois blocos longos de consulta (documentos recebidos e materiais confirmados) ocupavam a tela antes do envio.

Mudança (só tela; o servidor não muda):
- `textoComoArquivoCp251`: texto colado sem arquivo vira o original (`documento-<cliente>-<mês>.txt`).
  - Segue o mesmo caminho do arquivo: leitura, original guardado e recibo.
  - Vale em "Salvar sem enviar" e em "Confirmar e enviar documento".
  - "Salvar sem enviar" com um arquivo escolhido e ainda não lido também lê o arquivo antes de guardar.
- "Ler documento" diz a verdade: "Arquivo lido, mas o documento ainda NÃO foi enviado ao Chris. Use Confirmar e enviar documento".
- **Quadro do mês** (`quadroDocumentosCp251`) na aba "Enviar meus documentos", que o Chris abre pelo item "Enviar documentos" da Central.
  - Mostra "Documentos de janeiro de 2027: N de M enviados ao Chris".
  - Uma linha por cliente da carteira:
    - ✅ enviado (quando, por quem, formato e tamanho);
    - ⚠️ guardado, mas não enviado;
    - ⚠️ versão mais nova guardada e não enviada (o Chris continua vendo a anterior);
    - ⏳ pasta aberta sem documento;
    - ○ sem documento;
    - histórico.
  - Cada linha com pasta tem um botão "Abrir".
- O texto de instrução passa a ser um passo só: escolher → abrir → anexar ou colar → Confirmar e enviar.
- "Documentos recebidos · conferir fontes" (CP133) vem fechado (consulta), guardando o aberto/fechado entre recargas.

Árvore:
RAIZ: envio do documento único da Amanda (`planejamento_social_i155/{ciclo}`: documentos, registros, arquivos)
├─ ESCRITORES : os mesmos de antes (Central R80 → servidor); nada novo grava
├─ LEITORES   : quadro do mês (lista do mês já carregada: ciclos + carteira), pasta do cliente, editor do Chris, checagem prévia
├─ PAPÉIS     : Amanda (envia; vê o quadro); Chris (vê o quadro em "Enviar documentos"); Gabi (referências: inalterado, não é documento único)
├─ RULES      : n.a.
├─ AUTOMAÇÕES : n.a. (a checagem prévia e o Raio-X seguem lendo o servidor)
├─ LEGADO     : ciclos do fluxo antigo (consolidado) aparecem como enviados pelo `consolidadoEnviado`
└─ EFEITO     : menos texto na tela; nada some de outra tela (o CP133 só fica recolhido)

O que NÃO muda: contrato do servidor, regras de confirmação, conferência do texto antes de enviar, Gabi e Chris nos outros materiais.
Testes: J106 (Amanda e Chris, os 4 estados pelo caminho real, incluindo texto colado enviado e salvo) + J06, J65 e J105.
Risco residual:
- `DataTransfer` exige navegador atual (Safari 14.1+, Chrome, Firefox). Sem ele, a mensagem pede o arquivo e o texto continua no campo.
- PDF acima de 4 MB continua recusado (próxima unidade: enviar o texto do PDF).
