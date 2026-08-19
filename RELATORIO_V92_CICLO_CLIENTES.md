# V92 — Reconciliação de mensalista ativo sem contrato

Data da preparação local: 19/08/2026  
Base confirmada antes da alteração: V91 + patch V91.1  
Estado desta entrega: **pronta para publicação; ainda não comprovada em produção**

## Problema reproduzido

Na versão publicada, a Central de Clientes confirma `iPhone Campo Largo` como mensalista ativo, mas a coleção de contratos não possui o contrato canônico desse cliente. Ao abrir a edição e tentar acessar o valor, a interface responde:

> O contrato deste cliente não apareceu entre os ativos. Confira a reativação na Central.

Assim, Amanda e Chris não conseguem completar valor e vencimento depois que uma entrada ou reativação legada terminou sem contrato. O problema não é apenas permissão de campo: são fontes de estado divergentes.

Também foram observadas, sem alteração de dados:

- `She Joias` aparece como mensalista ativo sem contrato e exige confirmação humana antes de qualquer correção;
- `Hitech` continua presente, com contrato próprio de R$ 2.500;
- `Rodrigo` continua separado, com contrato próprio de R$ 870 e classificação de somente edição;
- `Zeens` possui contrato, mas não aparece na mesma carteira ativa da Central; não foi reativado nem alterado por suposição.

## Causa comprovada

A Central reconhece mensalistas ativos a partir da projeção unificada de cadastro/configuração/carteira. Já a tela **Valores dos contratos** lia somente `contratos_cliente`. Quando a entrada ou reativação legada terminava sem esse documento, o cliente permanecia ativo em parte do sistema e ausente no Financeiro. A ficha ativa mostrava valor, mas bloqueava a edição operacional inteira quando valor ou vencimento estavam vazios.

## Alteração local

1. **Valores dos contratos cruza duas fontes confirmadas**: contratos e a mesma projeção ativa da Central.
2. Mensalista ativo sem qualquer contrato recebe um cartão de **estrutura financeira incompleta**.
3. Amanda ou Chris informam plano, valor, vencimento, primeira competência e cortesia na única porta financeira.
4. Antes de gravar, é obrigatória uma confirmação explícita de que a identidade é mensalista ativa.
5. Uma transação relê as fontes ativas e cria IDs determinísticos:
   - `contratos_cliente/{slug}`;
   - `pagamentos_mensais/{slug}_{AAAA-MM}`.
6. Contrato já existente, registro avulso, cliente arquivado, mensalidade divergente ou conflito em outra aba bloqueiam a operação sem sobrescrever dados.
7. Portal, calendário, Stories, token e contato não são recriados nem alterados por esta reparação.
8. A ficha operacional pode continuar sendo atualizada mesmo quando o financeiro está incompleto; valor zero não é propagado.
9. Contrato pausado/encerrado aparece como divergência para conferência e nunca é reativado automaticamente.

## Validação executada

### Fluxo transacional isolado

Comando:

```text
node scripts/regression-v92-ciclo-clientes.mjs
```

Resultado: **23/23 verificações aprovadas**.

Cenário principal: Amanda, `iPhone Campo Largo`, plano Básico, R$ 800, vencimento dia 10, primeira competência 2026-08 e cortesias 2026-08/2026-09. Foram comprovados: contrato, primeira mensalidade, idempotência, bloqueio de conflito, bloqueio de avulso, confirmação humana e preservação de Portal/calendário/Stories/tokens.

### Interface com cliques reais em Chrome isolado

Comando:

```text
node scripts/regression-v92-ui-contrato-incompleto.mjs
```

Resultado: **16/16 verificações aprovadas**, em desktop 1180×820 e mobile 390×844.

Foi clicado o botão antes da confirmação — nenhuma gravação ocorreu e a interface explicou o bloqueio. Depois da confirmação, o clique criou exatamente o contrato e a mensalidade no banco isolado e preservou o acesso do Portal.

### Regressões

- `scripts/preflight.mjs`: aprovado;
- `scripts/regression-critical.mjs`: 608 asserções aprovadas;
- `scripts/regression-v81-clientes.mjs`: 49 verificações aprovadas;
- `scripts/regression-v83-contatos-contratos.mjs`: 30 verificações aprovadas;
- `scripts/regression-v75.mjs`: 37 asserções aprovadas;
- `scripts/regression-v77.mjs`: 49 asserções aprovadas;
- `scripts/regression-v80.mjs`: 29 asserções aprovadas;
- `scripts/regression-v91-carteira-publicados.mjs`: 15 verificações aprovadas;
- `scripts/regression-v91-1-rodrigo-central.mjs`: 6 verificações com clique real aprovadas.

## Limites objetivos de validação

- A versão publicada ainda é V91 + V91.1. A V92 não foi enviada nem verificada no ambiente publicado.
- Nenhum dado real foi gravado. O teste funcional usou um banco isolado e sintético.
- Completar o caso real do iPhone exige decisão explícita sobre dia de vencimento, primeira competência e tratamento da compensação/cortesia. A operação real não deve ser presumida.
- Esta entrega corrige somente a causa **mensalista ativo sem contrato**. Não corrige nem declara validados, nesta etapa, os fluxos de Helo/calendários, a divergência de Zeens, a saída de clientes ou a auditoria completa de entrada.

## Reversão

Repor o `escritorio.html` da V91.1 remove a nova porta. Os testes e a documentação não alteram runtime. Como nenhuma migração automática foi incluída, publicar ou reverter o HTML não apaga nem altera dados existentes por si só.
