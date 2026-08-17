# Entrega V70 — Stories, calendários e controle de gravações

Data: 17/08/2026  
Base oficial analisada: `main` em `a67f166fd3a840a4815da311e32ff6990f950b23`

## O que foi comprovado

- O Story da Vitalle com conteúdo de 17–22/08 estava liberado, mas armazenado na semana técnica de 10/08. Na semana atual do Portal ele aparecia vazio e, ao voltar uma semana, o conteúdo estava presente.
- Um calendário aprovado bloqueava `openEdit()` antes de abrir o modal. Por isso a Cecília conseguia abrir a referência externa, mas não o roteiro, a legenda e o direcionamento interno.
- Os links de calendário não levavam a competência do mês. O leitor escolhia o mês padrão, então um link copiado durante setembro podia abrir agosto.
- Baixas antigas de gravação registravam quantidade sem títulos individuais. O Controle não conseguia associar a quantidade aos itens do calendário e mantinha saldo aparente.

## Correções preparadas

- Stories novos gravam competência explícita e não são salvos quando as datas DD/MM do roteiro pertencem inequivocamente a outra semana.
- O registro legado da Vitalle é recuperado em leitura na semana correta, sem migração ou regravação automática.
- Calendário aprovado abre todos os campos em consulta; salvar, excluir e alterar continuam bloqueados.
- O link do calendário inclui `mes=AAAA-MM`, valida conteúdo existente e exige que o mês esteja liberado para o cliente.
- A competência escolhida dentro do calendário sincroniza com o campo usado para copiar o link.
- Cecília ou o filmmaker da própria sessão pode conciliar baixa antiga selecionando exatamente os títulos correspondentes. A transação não cria vídeo duplicado e não altera a quantidade já registrada.

## Arquivos da entrega

- `escritorio.html`
- `portal-cliente.html`
- `calendario.html`
- `calendarios.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`
- `RELATORIO_ENTREGA_V70.md`

## Validação concluída

- `scripts/preflight.mjs`: aprovado.
- `scripts/regression-critical.mjs`: aprovado com 604 asserções.
- Sintaxe: 9/9 scripts inline aprovados pelo preflight.
- `calendario.html` e `calendarios.html`: byte a byte idênticos.
- Git diff: sem erro de whitespace.
- Página local: carregou o HTML e montou o DOM sem erro de sintaxe; a validação de dados autenticados pós-upload ainda depende da versão publicada.

## Verificação após o upload

- A branch `main` avançou até `9b897d628a686c906965016c1be24bffb9b5d642`.
- Os quatro HTMLs operacionais publicados no domínio possuem os mesmos hashes dos arquivos correspondentes na `main`.
- O preflight executado sobre a árvore recebida do GitHub foi aprovado com 9/9 scripts inline válidos.
- A regressão crítica executada sobre a árvore recebida foi aprovada com 604 asserções.
- Nenhuma regra do Firebase nem dado de produção foi alterado nesta entrega.

## Limite real

Código presente no GitHub e servido pelo domínio não prova, sozinho, cada ação autenticada com dados reais. A validação restante é comportamental: Vitalle visualizar Stories na semana correta, Cecília consultar e compartilhar o mês escolhido e Cecília/Luís conciliarem uma baixa antiga autorizada.
