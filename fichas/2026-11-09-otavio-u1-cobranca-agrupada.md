# otavio-u1-cobranca-agrupada — 1 cobrança de R$ 4.500 dividida entre as 6 empresas do Otávio

Pedido original (Chris, 09/11/2026): cadastrar cada ótica e cada clínica do Otávio como cliente próprio; "subtrai o valor mensal que eles pagam de 4500 em todas as empresas cadastradas assim fechando a conta batendo certinho".
Decisão do Chris (09/11): **1 cobrança, valor dividido**: o Otávio recebe uma cobrança só; no financeiro, cada empresa mostra a sua parte e a soma fecha em 4.500.
Unidade: 1 de 4 · Tipo: novo (código financeiro; escrita em produção só com ok nominal)

## Situação de hoje (leitura da exportação de 09/11 06:42)
- `contratos_cliente/zeiss`: `valorProgramado` 4500 a partir de 2026-10 (operação `fin_oticas_otavio_20261005_valor_202610`), vencimento dia 10.
- Não existe hoje o conceito de "cliente coberto pelo contrato de outro": todo contrato com valor entra na Régua e em Mensalidades.

## Árvore
```
RAIZ: contrato do cliente (contratos_cliente + clientes_ciclo_financeiro)
├─ ESCRITORES : salvarContrato / novoContrato (escritorio.html), financeiro-core.mjs, financeiro-entrada-i94.mjs
├─ LEITORES   : Mensalidades, Régua de cobrança, Central de mensagens, painel financeiro (financeiro-ui-v103/v104), Portal (valorVigente: 1 leitura)
├─ HUMANOS    : Chris (cobra), Amanda (salva contrato)
├─ RULES      : contratos_cliente (3), clientes_ciclo_financeiro (3) → ver se o campo novo cabe nas regras atuais (limite de 256 KB: hoje ~255,5 KB)
├─ AUTOMAÇÕES : lembrete de vencimento / ultimaCobranca (13 pontos nos módulos)
└─ LEGADO     : Zeiss com histórico de valor (1700 → 4500) e cortesia 2026-08
```

## Mudança feita
- `config_financeiro/cobranca_agrupada` (regra atual: só `ab()`, o Chris real; **sem mudança de rules**): `{grupos:[{id,nome,pagador,desde,membros:[{slug,parte}],ativo}],revisao,versaoAnterior,atualizadoPor,atualizadoEm}`.
- `financeiro-core.mjs`: `normalizarGruposCobranca`, `projetarGruposCobranca`. `projetarObrigacoes` recebe `gruposCobranca`, e a empresa coberta sem documento vira linha `isento` com `cobertoPor`/`parteGrupo`. `projetarFinanceiroCompetencia` recebe `cobrancaAgrupada` e devolve `gruposCobranca`.
- Conflitos: `EMPRESA_COBERTA_COM_MENSALIDADE_ABERTA`, `PAGADOR_DO_GRUPO_SEM_COBRANCA`, `PARTES_DO_GRUPO_PASSAM_DO_VALOR`, `GRUPO_COBRANCA_INVALIDO`, `MEMBRO_GRUPO_COBRANCA_INVALIDO`, `MEMBRO_TAMBEM_PAGADOR`.
- `financeiro-ui-v104.mjs`: cartão "Cobrança agrupada" em Mensalidades (conta fechada ou não, partes e restante do pagador) e o editor "Editar grupo" (transação, revisão +1, versão anterior guardada; recusa slug sem contrato).
- `?v=` com sha256: core em `escritorio.html`, v104 e i94; i94 em v104; v104 em `escritorio.html`.
- Os demais chamadores de `projetarObrigacoes` (marcar pago, i94) não passam grupo: a linha coberta já é isenta e não tem botão de cobrança.

## O que NÃO muda
O valor cobrado, o vencimento, o contato de cobrança da Zeiss (continua só em `contatos_clientes_financeiro/zeiss`) e o histórico.

## Testes
Jornada nova: Régua mostra 1 cobrança de 4.500 para o grupo; empresa coberta não aparece na Régua; soma ≠ total → alerta. Bateria completa + `--movel`.

## Risco residual
As regras estão perto do limite de 256 KB: se o campo novo exigir regra, é preciso economizar antes.
