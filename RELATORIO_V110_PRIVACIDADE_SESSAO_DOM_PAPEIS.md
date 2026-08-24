# Relatório V110 — privacidade de sessão, DOM e papéis

## Resultado desta causa

A V110 é a primeira entrega isolada do redesenho do ciclo comercial. Ela não redesenha ainda a Central de Vendas nem cria a nova projeção pública do Portal. Esta causa corrige a fronteira local de identidade: ao trocar Chris, Amanda, Cecília ou outro funcionário no mesmo navegador, dados e telas restritos da pessoa anterior são eliminados antes de qualquer nova leitura.

O caminho comercial aprovado permanece inequívoco. Um pré-cadastro mensalista ou avulso deve chegar primeiro à Central de Vendas; ele não entra no Financeiro só por preencher o formulário. Mensalista só chega a contrato, mensalidade e Financeiro depois do fechamento, cadastro final e ativação confirmada. Avulso só gera uma receita não recorrente depois do gate operacional/financeiro aplicável. A auditoria mostrou que o mensalista já possui a maior parte desse gate, enquanto o avulso ainda conserva caminhos legados; a convergência completa pertence às próximas causas e não foi falsamente declarada pronta nesta versão.

## O que mudou

- uma função única limpa projeções da Central de Clientes, negócios, reuniões, leads, fichas avulsas, onboarding e painéis restritos em toda mudança real de identidade;
- a limpeza é síncrona e ocorre antes da atribuição do novo papel e antes de qualquer `await`;
- toda troca incrementa uma geração; respostas iniciadas pela identidade anterior são descartadas;
- Central de Clientes, Central de Vendas e Projetos Avulsos verificam papel e geração antes de publicar cache ou DOM;
- Amanda deixa de receber a antiga porta “Projetos Avulsos (produção)”, pois ela dependia de `negocios`, coleção comercial exclusiva do Chris;
- Amanda continua com a Central de Clientes e seus recursos operacionais autorizados;
- ao voltar de Cecília para Chris ou Amanda, os links autorizados são restaurados sem reload;
- as views financeiras e comerciais exclusivas deixam de existir no DOM de papéis indevidos e voltam pelo marcador quando Chris retorna.

## O que não mudou

`portal-cliente.html`, `avulso.html`, `firestore.rules`, `financeiro-core.mjs`, `financeiro-ui-v103.mjs` e `financeiro-ui-v104.mjs` permanecem byte a byte iguais à V109. Não houve mudança em Fedalto, Joaquim/Açougue, Vitalle, Monique, contratos, competências, mensalidades, pagamentos, Régua, contatos financeiros, Calendários, Stories, Place, Luís, Nathan, vídeos, postagens ou captação.

Nenhuma coleção, documento ou regra de produção foi escrito. A V110 não exige publicação no Firebase porque `firestore.rules` não mudou. A futura projeção estreita do Portal e o endurecimento de writers públicos são a Causa 0B e exigirão uma entrega própria, regras próprias e prova fresca no Emulator.

## Provas locais

- teste vermelho sobre a V109: 29 falhas em 31 verificações, reproduzindo a ausência da fronteira única;
- teste V110 final: 49/49;
- Chromium real V110: 28/28, desktop/mobile, Chris → Amanda → Chris, Cecília → Chris, funcionário, resposta atrasada, duas abas, reload e zero `pageerror`;
- núcleo financeiro: 248/248;
- Portal financeiro: 42/42;
- UIs financeiras protegidas: V103 181/181, V104 187/187, V105 86/86, V106 56/56, V107 111/111 e V109 93/93;
- Calendários: V81 67/67, V87 50/50, V101 lógica 128/128 e UI 127/127;
- Place/Luís/Nathan: V99 lógica 80/80 e UI 57/57;
- segurança V81: 20/20; vendas V81: 30/30; Portal/Stories V81: 25/25;
- regressão crítica: 610/610;
- preflight: aprovado com 9/9 scripts inline válidos.

As regras V109, preservadas no SHA-256 `bb7c6020…`, já passaram 144/144 no Firebase Emulator com orçamento zero. Não se atribui uma nova execução de Emulator à V110: o ambiente atual não possui Java e não existe diff de regra. A Causa 0B não poderá usar essa equivalência e terá de executar o Emulator novamente.

## Rollback

`rollback_v109/` contém somente os dois arquivos necessários para reverter o diff público desta causa: `escritorio.html` e `_config.yml`, ambos exatos da V109. O rollback não toca banco, não desfaz dados e não altera Financeiro. A pasta de rollback não deve ser enviada ao GitHub.

## Estado

Corrigida, testada e empacotada localmente. Ainda não publicada. Produção continua V109 até o usuário enviar os arquivos V110 e a publicação ser comprovada por hash e jornada autenticada.
