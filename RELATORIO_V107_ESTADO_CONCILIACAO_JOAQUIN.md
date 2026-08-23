# V107 — Estado visual da conciliação do Joaquim

## Resultado

A V107 resolve uma única causa: a conciliação V106 já concluída continuava dentro de um cartão amarelo com linguagem e botão de pendência. O usuário tinha aplicado a saída correta, o conflito `SAIDA_DUPLICADA_DIVERGENTE` desapareceu, mas a apresentação permitia interpretar que ainda existia uma correção a confirmar.

O cartão inteiro agora deriva o estado dos mesmos documentos V106 e assume uma forma inequívoca. Quando resolvido, fica verde, recebe o título `Saída correta do Joaquim confirmada`, selo `Concluído`, cursor normal e não contém botão em nenhuma área. Recarregar a página reproduz esse estado automaticamente pelo snapshot financeiro que a tela já carrega. Segundo clique, retry e duas abas não repetem a gravação.

## Causa

O código anterior criava permanentemente o shell com título, selo, borda e botão de pendência. A classificação `resolvida` substituía apenas o HTML do filho de status. O teste V106 procurava botão somente nesse filho e, por isso, não detectava o botão irmão ainda presente. O agregador geral também executava a prévia do Joaquim, mas não incluía seu resultado ao declarar o conjunto financeiro concluído.

## Alteração aplicada localmente

Um renderer único representa sete estados:

| Estado | Aparência | Ação |
|---|---|---|
| `aguardando` | neutra | verificar sem salvar |
| `verificando` | neutra e ocupada | nenhuma |
| `pronta` | amarela | confirmar a saída correta |
| `aplicando` | neutra e ocupada | nenhuma |
| `resolvida` | verde e concluída | nenhuma |
| `bloqueada` | vermelha | somente verificar novamente |
| `indisponivel` | vermelha | tentar a leitura novamente |

O Financeiro passa ao renderer o snapshot que já foi lido. A classificação visual não cria consulta redundante, não carrega contatos privados e não escreve documentos. O agregador somente declara tudo concluído quando carteira, Fedalto/Régua e Joaquim estiverem realmente resolvidos; bloqueio de qualquer alvo remove a ação geral insegura.

## Segundo clique e concorrência

- estado já resolvido retorna no-op e volta a desenhar o cartão verde;
- clique duplo continua protegido pela trava V106;
- duas abas convergem para um único commit e um único recibo;
- se outra aba concluir enquanto a confirmação está aberta, a segunda leitura muda o cartão para resolvido sem nova escrita;
- timeout, `permission-denied`, alteração concorrente ou recibo divergente não recebem aparência de sucesso.

## Segurança e papéis

- somente Chris recebe o cartão;
- Amanda, Cecília e demais papéis não recebem o elemento, os fatos financeiros ou novas leituras;
- `financeiro-core.mjs` permanece byte a byte no SHA-256 `e78bd23da245686e24c48a470f1aeea02b0a3f1c43d3413ca470b0bc604f9f89`;
- `firestore.rules` permanece byte a byte no SHA-256 `289fdc40d5cc061463b898faae8e4571072897038238a7cf3c463462e170a558`;
- não existe ação Firebase, migração, coleção, campo ou writer novo na V107;
- Calendários, Cecília, Place/Luís, captação, vídeos, postagens e Portal não foram alterados.

## Alerta diferente em Mensalidades

O aviso `PAGAMENTO_SEM_CONTRATO_VIGENTE` mostrado depois da conciliação não significa retorno do erro do Joaquim. Auditoria de produção somente leitura encontrou uma causa separada: a mensalidade Fedalto de agosto está fora da vigência que hoje começa em setembro, e a fachada repete o mesmo conflito nas duas projeções, exibindo contagem 2. A V107 não esconde nem modifica esse fato.

A reparação pertence à V108 e precisa preservar setembro como cortesia, mostrar um único conflito identificado e registrar a data real do pagamento de agosto. Essa data não consta no documento auditado e não será inventada.

## Provas locais

- UI focal V107: **111/111** em Chrome real, desktop e mobile;
- UI V106 endurecida: **56/56**;
- domínio V106: **193/193**;
- V105: **84/84** e UI **86/86**;
- V104: **68/68** e UI **187/187**;
- núcleo V103: **248/248**, UI **181/181** e Portal **42/42**;
- V101: **128/128**;
- V99 captações: **80/80**;
- V87 Calendários: **50/50**;
- V98 perfil Chris: **23/23**;
- V95 legendas: **15/15**;
- regressão crítica: **610/610**.

As provas focais cobrem estado pronto, resolvido, bloqueado e indisponível; reload automático; segundo clique; duas abas; zero write da renderização; um único snapshot; isolamento de papéis; desktop/mobile; ausência de overflow e zero `pageerror`. Os testes são sintéticos e não escrevem no Firebase real.

## Publicação e operação

Depois do upload, abrir o Financeiro como Chris. Se a V106 já estiver concluída, o cartão deve aparecer automaticamente verde e sem botão. Não é necessário clicar outra vez. Se ficar vermelho, a tela está informando uma divergência real ou falha de leitura; registrar a mensagem e não forçar a operação.

## Rollback

O pacote contém rollback completo dos sete arquivos públicos operacionais V106. Restaurá-los remove somente a apresentação V107. O rollback não desfaz a conciliação já executada, não apaga histórico e não requer Firebase.

## Estado estrito

**V107 corrigida e validada localmente, pronta para publicação pelo usuário.** O pacote selado contém 80 arquivos totais: 79 entradas manifestadas, sendo 72 publicáveis e sete no rollback V106, mais o próprio manifesto. O upload do GitHub contém 73 arquivos: 72 publicáveis e o manifesto. O frontend de produção continua no estado que o usuário publicou até o novo upload. Nenhuma regra ou dado real foi alterado por esta entrega.
