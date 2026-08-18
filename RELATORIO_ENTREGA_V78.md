# Get Started — entrega V78: contatos ativos e arquivo único

Data: 18/08/2026  
Build: `2026-08-18-contatos-arquivo-unico-v78`

## Objetivo entregue

A V78 restringe a operação de telefones e WhatsApp a Chris dentro do Financeiro, retira da lista ativa quem teve saída efetiva registrada e apresenta um único arquivo de clientes com ficha preservada e reativação. Nenhuma coleção paralela, migração automática ou cópia de cadastro foi criada.

## Fluxo oficial

1. Amanda confere a entrada e pode visualizar o telefone informado somente no onboarding.
2. Depois da ativação, consulta, correção e mensagem ficam em `Financeiro → Contatos ativos e mensagens`, exclusivo de Chris por DOM e navegação.
3. Antes de salvar o número ou abrir o WhatsApp, o sistema relê a carteira ativa confirmada.
4. Quando Amanda registra uma saída efetiva, `clientes_encerrados` atualiza a lista de Chris e o cliente deixa de ser contato ativo.
5. A ficha permanece em `Entrada de Clientes → Arquivo único e reativação`, deduplicada pelo slug canônico.
6. Reativar reutiliza a mesma identidade, ficha, contrato e Portal; não cria cliente duplicado.

## Arquivos da entrega

- `escritorio.html`
- `AGENTS.md`
- `CATALOGO_DE_ERROS.md`
- `scripts/preflight.mjs`
- `scripts/regression-v72.mjs`
- `scripts/regression-v76.mjs`
- `scripts/regression-v77.mjs`
- `scripts/regression-v78.mjs`
- `RELATORIO_ENTREGA_V78.md`

## Segurança e compatibilidade

- A view e o botão de contatos continuam removidos do DOM para Amanda, Gabi, Cecília e demais papéis.
- A Central compartilhada não monta telefone de clientes ativos ou arquivados.
- O onboarding ainda mostra o contato recebido para Amanda poder validar a ficha inicial.
- `clientes_encerrados` continua com soft-delete e fonte única do histórico de saída.
- Falha de leitura impede salvar contato e abrir conversa; não reaproveita cache como confirmação.
- Saída programada não é confundida com saída efetiva.

## Validação exigida

- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v71.mjs` a `scripts/regression-v78.mjs`
- compilação dos scripts inline
- inspeção de diff, duplicidades, isolamento por papel e comportamento desktop/mobile
- comparação do arquivo publicado no GitHub com o arquivo validado localmente

## Limite operacional

O isolamento implementado é de interface e fluxo: o telefone não é montado fora da área exclusiva de Chris. O campo continua no documento operacional `clientes_config`, que outros papéis autenticados podem precisar ler para funções não financeiras; ocultação criptográfica por campo exigiria migração para uma coleção privada e não foi feita nesta versão. O site prepara o WhatsApp, mas a mensagem só é enviada quando Chris confirma no próprio aplicativo.
