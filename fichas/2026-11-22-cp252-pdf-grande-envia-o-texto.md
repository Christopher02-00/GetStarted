# cp252-pdf-grande-envia-o-texto — PDF ou Word acima de 4 MB não trava mais o envio da Amanda

Pedido (Chris, 22/11): "os documentos não iam, sumiam … nunca mais tenha nenhum tipo de erro".
Unidade: U3 da área de documentos (CP252) · Tipo: erro (beco sem saída)

Caso: `prepararArquivo` (navegador) recusava antes de ler qualquer coisa: "Escolha um PDF, DOCX ou texto de até 4 MB".
- Nada chegava ao servidor e não ficava rastro, por isso não aparece nos dados.
- Os PDFs de dezembro iam de 89 KB a 3,3 MB (Dom Carv, 3,26 MB, perto do limite). Um PDF com mais fotos passa de 4 MB.
- O limite do original (4 MB, em partes de 700 KB no Firestore) continua: é o que o servidor guarda.

Mudança (só tela; o servidor não muda):
- `gs-arquivos-planejamento-i164.mjs` (raiz): PDF e Word de até 40 MB têm o texto lido, como antes.
  - Acima de 4 MB, o erro `grande_cp252` traz o texto, as páginas e os links.
  - Escaneado sem texto e acima de 60 mil caracteres continuam com as mensagens de sempre.
- `lerArquivoSelecionadoCp177`: pergunta "<arquivo> tem 5,0 MB e o original aceito vai até 4 MB. Posso enviar o TEXTO completo dele (N páginas, M caracteres)… Enviar o texto?".
  - Confirmando, um `.txt` com o texto completo (e os links) vira o original e segue o caminho de sempre: conferência do texto → enviado.
  - Cancelando, nada é enviado e a tela diz o que fazer.

Árvore: mesma da CP251 (envio do documento único). Escritor: o mesmo. Leitores: quadro do mês, editor do Chris. Papéis: Amanda (e Chris/Gabi nos
materiais dele, mesmo caminho). Rules: n.a. Legado: n.a.
Testes: J107 vermelha (PDF de 5 MB recusado, nada enviado) → verde (pergunta, texto enviado, original text/plain, frase do PDF no documento).
Risco residual: o PDF grande não fica guardado no servidor (só o texto); a mensagem diz que o arquivo continua com a Amanda.
