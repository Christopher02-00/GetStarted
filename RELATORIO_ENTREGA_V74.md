# Get Started — entrega V74

Data: 17/08/2026  
Build: `2026-08-17-identidade-filas-links-v74`

## Escopo confirmado

- Impedir que Emanuelle, Hitech/Rodrigo e Zeiss apareçam sem contato ou como identidades operacionais repetidas.
- Garantir que referência enviada pelo Portal chegue ao Hub de Referências sem depender do aviso para a equipe.
- Impedir que a mesma postagem volte para a fila da Gabi depois de a legenda seguir para Cecília.
- Recuperar a cópia dos links mensais de calendário no navegador da Cecília.
- Não criar, excluir, reativar ou migrar cadastros em produção.

## Alterações

### Identidade de clientes

- `emanuelle` é alias de leitura de `emanuelle-bernaski-nutri`.
- `hitech` e `cliente-rodrigo` são aliases de leitura de `rodrigo`.
- `zeens` e `otica-visao-araucaria` continuam aliases de `zeiss`.
- A Central consolida registros antes do `Map` intermediário e preserva `whatsappCobranca` do canônico ou de um alias compatível.
- O Portal mantém todos os aliases de Rodrigo no escopo “somente edição”.
- Nenhuma função de consolidação grava no Firestore.

### Referências do Portal

- A coleção continua sendo `referencias_cliente`; o Escritório e o calendário já leem essa fonte diretamente.
- A referência passa a usar ID determinístico por cliente+conteúdo, transação e recibo por releitura.
- Duplo clique e retentativa reutilizam o mesmo documento.
- O alerta para Gabi é secundário; falha dele não invalida a referência confirmada nem provoca novo envio.

### Legendas Gabi → Cecília

- Aprovação repetida de vídeo não usa mais `addDoc()` para criar postagem aleatória.
- Postagem nova usa ID determinístico por `videoId` e transação; postagem legada existente é reutilizada.
- A fila da Gabi compara todas as postagens do mesmo vídeo e prefere a etapa mais avançada.
- Salvar legenda trava duplo clique, revalida o status, vincula a postagem no vídeo e relê `aguardando_agendamento` antes do toast de sucesso.
- Falha de leitura exibe “fila indisponível”; nunca vira lista vazia.

### Cópia do calendário da Cecília

- A operação de clipboard começa no gesto do clique, antes das leituras assíncronas.
- A validação de cliente, token, conteúdo do mês e estado `liberado` foi preservada.
- Fallbacks: `ClipboardItem`, `writeText`, cópia legada e exibição manual do link correto.
- O link mensal continua levando `cliente`, token e `mes=AAAA-MM`.

## Provas executadas

- `scripts/regression-v74.mjs`: 34 asserções aprovadas.
- `scripts/preflight.mjs`: aprovado; 9/9 scripts inline compilam, 950 handlers resolvidos, calendários singular/plural idênticos e regras críticas preservadas.
- `scripts/regression-critical.mjs`: 607 asserções aprovadas.
- `scripts/regression-v71.mjs`: 18 asserções aprovadas.
- `scripts/regression-v72.mjs`: 50 asserções aprovadas.
- `scripts/regression-v73.mjs`: 28 asserções aprovadas.
- Testes não contêm telefones reais; usam dados sintéticos.

## Limites reais

- Os testes provam sintaxe, invariantes, transações simuladas e comportamento das funções isoladas. A confirmação final do clipboard exige abrir a V74 publicada no navegador da Cecília e clicar no botão real.
- A V74 impede novas postagens duplicadas e esconde cópia atrasada da fila. Ela não apaga documentos históricos existentes.
- iPhone Campo Largo permanece arquivado; não foi reativado nem recriado.
- Nenhuma regra Firestore foi ampliada e nenhum dado de produção foi migrado nesta entrega.

## Arquivos da V74

- `escritorio.html`
- `portal-cliente.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v72.mjs`
- `scripts/regression-v74.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`
- `RELATORIO_ENTREGA_V74.md`
