# V105 — Conciliação de correções manuais e contato da Régua

## Resultado

A V105 corrige a continuação operacional da V104 depois que o usuário informou ter ajustado manualmente a saída da Monique, o valor futuro da Vitalle e o contato financeiro da Zeiss. A ferramenta deixa de presumir que todos os alvos ainda precisam ser alterados: primeiro reconcilia cada resultado com o estado canônico atual, identifica o que já está confirmado e oferece escrita somente para o que continua pendente.

O contato da Zeiss permanece exclusivamente na coleção financeira privada. Quando já existe um contato canônico válido, a prévia o reconhece, não pede nova digitação e não cria duplicata. O valor real nunca é incorporado ao código, aos testes ou à documentação pública.

Esta correção está validada e empacotada localmente, pronta para publicação pelo usuário. O frontend observado em produção ainda é V104. Nenhum dado real foi escrito pela V105 durante o desenvolvimento. O Firestore Emulator final foi aprovado e `firestore.rules` permanece byte a byte idêntico à V104; portanto a V105 não exige nova ação no Console Firebase.

## O que a V104 revelou em produção

1. A prévia podia continuar descrevendo a operação original mesmo depois de uma correção manual equivalente já ter sido salva.
2. A leitura da correção não trazia a agenda financeira privada no mesmo retrato; por isso o campo de contato podia aparecer vazio embora o contato já existisse na fonte correta.
3. Um alvo legado já resolvido manualmente podia continuar ambíguo para a operação automática e bloquear o lote inteiro.
4. A tela não distinguia com clareza `já confirmado` de `ajuste pendente`, aumentando o risco de o usuário repetir uma ação por receio de que nada tivesse sido reconhecido.
5. A Régua e a ferramenta dirigida não compartilhavam integralmente o mesmo resolvedor de contato financeiro.

Esses fatos não significam que a informação manual foi perdida. Eles demonstram que a V104 não conciliava de maneira suficiente reparos parciais já realizados fora da operação dirigida.

## Correção aplicada localmente

### Estado por alvo

A prévia V105 classifica cada alvo depois de reler as fontes relevantes:

- `já confirmado`: o estado canônico completo coincide com o resultado esperado; nenhuma escrita é preparada;
- `ajuste pendente`: existe uma diferença segura e a operação correspondente pode ser oferecida;
- `bloqueado`: há identidade ambígua, conflito, dado inválido ou estado que não pode ser corrigido automaticamente;
- `indisponível`: a leitura não é confiável; a interface não transforma falha em vazio nem em sucesso.

Uma declaração humana de que a correção foi feita orienta a investigação, mas não substitui a releitura. Vitalle, Monique, Fedalto e o contato da Zeiss só aparecem como confirmados quando todas as condições canônicas necessárias realmente coincidem.

### Contato financeiro único

Régua, ação de WhatsApp e correção dirigida usam a mesma resolução:

1. o documento canônico da agenda financeira privada vence;
2. um contato legado somente pode ser usado quando for válido e inequívoco;
3. duas fontes válidas e diferentes geram conflito e bloqueiam a ação;
4. uma leitura vazia nunca apaga um contato existente;
5. um contato canônico já salvo é exibido como confirmado e não produz nova escrita.

O contato continua disponível apenas ao Chris nas superfícies financeiras autorizadas. Ele não é copiado para a Central compartilhada, Portal, HTML, módulo público, fixture ou relatório.

### Escrita mínima e idempotente

- abrir a página e executar a verificação não gravam nada;
- a aplicação contém somente alvos ainda pendentes;
- se todos os alvos estiverem confirmados, o botão de aplicação não aparece;
- a transação relê o estado antes do commit;
- clique duplo, retry e duas abas convergem sem criar segundo evento, segunda saída ou segundo contato;
- conflito ou mudança concorrente bloqueia a escrita, preservando o retrato atual.

## O que não muda

- Fedalto continua ativa; setembro de 2026 continua sendo cortesia, não saída.
- Julho e agosto de 2026 continuam fora da fila acionável quando confirmados como cobrados e pagos.
- A Régua continua compacta, com contato, competência, vencimento, estado e ação na mesma linha.
- Pago, isento, cancelado e demais estados terminais continuam históricos.
- As empresas Joaquim Assados e Açougue São Joaquim continuam distintas.
- Amanda não recebe acesso aos contatos financeiros nem uma nova obrigação operacional.
- Calendários, captação, Place/Luís, vídeos, postagens e Portal não são reestruturados por esta causa.
- Publicar a V105 não executa correção financeira automaticamente.

## Segurança e papéis

- A correção, a Régua e a agenda financeira permanecem restritas ao Chris.
- O contato é persistido somente em `contatos_clientes_financeiro`, conforme o contrato privado já existente.
- Nenhuma permissão global é ampliada para simplificar o frontend.
- Falha de permissão, timeout, cota ou leitura parcial aparece como indisponibilidade/bloqueio, nunca como contato vazio confirmado.
- Abertura do WhatsApp não significa cobrança enviada; a confirmação de envio permanece uma ação separada.
- Delete físico continua proibido e recibos permanecem auditáveis.

## Provas locais finais

- compatibilidade da lógica V104: **68/68**;
- conciliação V105: **84/84**, incluindo divergência histórica fail-closed e corrida entre abas abortada com zero commit;
- UI V105 de contatos e Régua: **86/86** em desktop e mobile;
- UI V104: **187/187**;
- núcleo financeiro: **248/248**;
- Portal financeiro: **42/42**;
- regressão crítica: **610/610**;
- Firestore Emulator financeiro/contatos: **110/110**; V101/V102: **55/55**; `expression_limit_hits=0`; regras inalteradas no prefixo SHA `289fdc…`;
- V101 alinhada: **128/128**;
- auditoria final do runtime: nenhum P0/P1; hashes locais `388d4a8b…` (HTML), `e78bd23d…` (core), `f53b89e9…` (UI) e `db42126f…` (teste UI V105);
- preflight funcional: todos os checks funcionais passaram e permaneceu apenas o `FAIL` histórico conhecido da cópia redundante na raiz.

Essas provas são locais e usam fixtures sintéticas. Quatro capturas sanitizadas finais cobriram os estados desktop/mobile com hashes prefixados `0012a449…`, `ebe72e72…`, `d0fa02d2…` e `86b962dc…`. O banner interno `fixture V104` identifica a regressão de compatibilidade V104 executada sobre as fontes/runtime V105; não é uma imagem de produção nem um build V104 em validação. O teste de conciliação tem SHA-256 `c014e345f64b201331322abb9b249a052340d24e00a5f3839b795247a2c73d60`. Isso não equivale a publicação, regra implantada ou conciliação dos dados reais.

## Entrega local

O pacote V105 possui **77 arquivos totais**: **76 entradas manifestadas** e o próprio manifesto. Das 76 entradas, **69 são publicáveis** e **7 pertencem ao `rollback_v104` local**. O upload do GitHub contém **70 arquivos**: os 69 publicáveis mais `MANIFESTO_SHA256_V105.txt`. O rollback, o ZIP e a memória privada não são enviados.

## Operação esperada depois da publicação

1. Chris abre Financeiro e executa `Verificar tudo sem salvar`.
2. A tela mostra separadamente o que já está confirmado, o que está pendente e o que está bloqueado.
3. Se o contato canônico da Zeiss já existir, ele aparece reconhecido e não deve ser digitado novamente.
4. Se todos os ajustes já estiverem confirmados, não existe botão de aplicação.
5. Se restar ajuste pendente seguro, aparece uma única ação para aplicar somente esse subconjunto.
6. Após a ação, o sistema relê as fontes e confirma os recibos; qualquer divergência interrompe a operação.

Até a V105 ser publicada e o build público ser comprovado, nenhuma dessas etapas deve ser tratada como prova de produção.

## Rollback

Antes de qualquer escrita real V105, restaurar o conjunto coerente V104 reverte apenas o comportamento do frontend. Depois de uma escrita legítima, não apagar contato, evento, saída, pagamento ou recibo: eventual reversão de dados exige uma nova operação auditada e específica.

## Estado estrito

**V105 corrigida, validada localmente, empacotada e pronta para publicação.** Produção observada: **V104**. Publicação e prova real pós-upload: **pendentes do usuário**. Nenhum dado real foi alterado pela V105.
