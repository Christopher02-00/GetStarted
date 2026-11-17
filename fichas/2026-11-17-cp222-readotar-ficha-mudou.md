# cp222-readotar-ficha-mudou — editor travado pela ficha passa a oferecer o botão para readotar a base
Pedido original (literal): "Quando a ficha muda depois do documento confirmado, a tela que o Chris abre (o editor travado e a página do cliente e mês) mostra o botão para conferir e readotar a base com a ficha atual. O texto da demanda CP198 aponta para o lugar certo."
Unidade: U1 de 1 (+ correção do caso real Little Elephant 2026-12, só com ok do Chris) · Tipo: erro
Sintoma observado: Little Elephant 2026-12 (17/11). O editor mostra "A ficha do cliente mudou…" e fica em "Conferindo a versão no servidor…", sem botão. Nenhuma aba dos materiais mostra docAdotarUnicoCp183.
Reprodução: emulador. J06 confirma o documento único da Bluefit 2026-12, e a J49 muda a ficha. A J49b no código antigo dá "o editor travado não oferece o botão para readotar a base" (vermelho).
Causa-raiz:
1. `central_editor_ler` recusa com a mensagem da ficha (conferirAutoridadeUnicaTxCp183, correto). O editor I172 só mostrava o erro, sem dto, sem caminho.
2. O botão docAdotarUnicoCp183 só existe na lista de documentos do tipo "campanha". O Chris abre os materiais na finalidade "previa", e nada levava até lá.
3. O botão e o handler comparavam `materiaisVigentes[d.chaveMaterial]` sem o fallback `chaveMaterial(finalidade, empresa)` usado no resto do módulo. Documento sem o campo `chaveMaterial` nunca mostra o botão.
4. O texto CP198 mandava para "Central → documentos do cliente → adotar o documento", um caminho que não existe.
Árvore:
RAIZ: recusa "A ficha do cliente mudou" (functions-get/documento-unico-cp183.mjs) → editor I172
├─ ESCRITORES : adotar_documento_unico_cp183 (servidor, sem mudança)
├─ LEITORES   : editor I172 (render sem dto), materiais I155 (renderDocs campanha), demanda CP198 (texto)
├─ HUMANOS    : só o Chris vê o botão (capturado.nome==='Chris'); Amanda continua vendo o aviso
├─ RULES      : nenhuma mudança
├─ AUTOMAÇÕES : gatilho CP198 (só o texto da descrição das demandas novas)
└─ COLATERAL  : abrirCliente aceita a etapa 'campanha' (mesma regra que já valia para previa/reuniao/consolidado)
Mudança:
- gs-editor-calendario-central-i172.mjs: nova opção `abrirDocumentosCp222`, botão "Conferir e readotar a base com a ficha atual" e ação `readotar-base-cp222`.
- escritorio.html: as 2 montagens do editor passam a opção, que abre os materiais do mês em 'campanha'. Hashes dos 2 imports atualizados.
- gs-planejamento-social-i155.mjs: etapa 'campanha' e fallback de chaveMaterial no botão e no handler.
- functions-get/ficha-cliente-avisa-cp198.mjs: texto da demanda.
O que NÃO muda: a trava (proteção da base), a ação de adoção no servidor, rules, documentos e histórico.
Testes: J49b (nova; vermelha antes, verde depois); J06, J49, J55, J56 e J60 (Bluefit dez) no Mac, no computador e no celular; bateria inteira no CI.
Risco residual: as demandas CP198 já criadas mantêm o texto antigo, que não é regravado.
Caso real: Little Elephant 2026-12 readotado pela própria tela (botão acima) só com o ok nominal do Chris.
