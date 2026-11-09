# casta-cecilia-projecao — Cecília classifica os clientes igual à gerência, sem ler o financeiro

Pedido: P1 / F-12 do pacote de passagem. Decisão do Chris (09/11/2026): "Sim, pode fazer" a projeção `castas_operacionais` (rules + preenchimento inicial), com novo ok antes de publicar.
Unidade: P1 · Tipo: erro (classificação vazia para a Cecília desde sempre)
Reprodução: J16 contra o `main` → Amanda classifica 23 clientes, Cecília 0, `console.error` "Não consegui classificar as castas" (rules negam `contratos_cliente`, `pagamentos_mensais`, `clientes_encerrados` → `Promise.all` inteiro cai).

## Causa-raiz
`castaDosClientes()` usa as cinco coleções para todo papel. Para papel operacional, três são negadas (correto: invariante "fluxo operacional nunca consulta contratos/mensalidades") e o resultado vira `{}`.

## Mudança de caminho em relação à ficha R2 (avisada ao Chris no PR)
A ficha R2 previa a projeção mantida por **Cloud Function**. Hoje não há como publicar Functions em produção (P14: sem workflow e a conta de serviço não tem o papel). Por isso a projeção é publicada pelo **navegador da gerência** (Chris/Amanda), que já lê as cinco coleções: depois de classificar com sucesso, grava só o que mudou em `castas_operacionais/{slug}` (tipo + origem). Quando a P14 for liberada, dá para mover a publicação para uma Function sem mudar leitores nem rules.

## Árvore
```
RAIZ: castaDosClientes() (escritorio.html)
├─ ESCRITORES  : gerência → castas_operacionais (novo, gs-castas-operacionais.mjs)
├─ LEITORES    : clientesForaDoConteudo ("12 telas"), clientesSemClassificacao, mapaTipoCliente (extras), castaDoClienteSync
├─ HUMANOS     : Cecília (passa a ver avulso/encerrado fora do processo mensal, como a Amanda); demais papéis operacionais idem
├─ RULES       : castas_operacionais → read aa(); create/update ae() com tipo enumerado, origem ≤120, 4 campos; sem delete
├─ AUTOMAÇÕES  : nenhuma nova; a publicação acontece quando a gerência classifica (abertura do sistema)
├─ LEGADO      : sem projeção ainda → Cecília vê como hoje (vazio, permissivo) até a 1ª abertura da gerência
└─ COLATERAL   : tipoCompatExtraI21 continua só gerência (__cacheCastaConfirmada=false para os demais)
```

## O que NÃO muda
Classificação da gerência (mesmas cinco fontes); regras financeiras; nenhum valor sai para a equipe (origem é texto como "tem contrato ativo").

## Testes
J16 (vermelha 1/7 → verde 8/8): Amanda publica 23 = Cecília lê 23 iguais; Cecília não grava (negação esperada 1/1); mudança na gerência chega à Cecília. Bateria inteira + `--movel`.

## Autorizações
- Rules: o merge publica `castas_operacionais`.
- Dados: depois do merge, a 1ª abertura do Chris/Amanda grava ~1 documento por cliente (hoje ~50). Só tipo + origem.

## Risco residual
A projeção fica tão atual quanto a última abertura da gerência (diária na prática).
