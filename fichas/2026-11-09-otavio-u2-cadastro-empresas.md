# otavio-u2-cadastro-empresas — 5 empresas novas do Otávio pela Central

Decisão do Chris (09/11): **6 empresas**. A Zeiss atual (slug `zeiss`, aliases `zeens` e `otica-visao-araucaria`) vira a **Ótica Zeiss Araucária**. Entram 5 novas: Clínica Zeiss Araucária, Ótica Hauer, Clínica dos Olhos Hauer, Ótica São José e Clínica São José.
Decisão do Chris (09/11): **1 link de Portal por empresa** (o que o sistema já faz).
Unidade: 2 de 4 · Tipo: dados (escrita em produção, identidade de clientes: ok nominal do Chris)
Depende de: U1 (sem ela, cada contrato novo entraria na Régua).

## Caminho
Fluxo oficial "+ Novo cliente pela Central" (`novoContrato`), um por empresa, com o WhatsApp de cobrança do Otávio. Nada de script direto no banco.
Slugs novos não podem usar `zeens` nem `otica-visao-araucaria` (aliases da Zeiss, AGENTS.md). Sugestão: `clinica-zeiss-araucaria`, `otica-hauer`, `clinica-olhos-hauer`, `otica-sao-jose`, `clinica-sao-jose`.

## Regra vigente (AGENTS.md)
"Aliases são compatibilidade de leitura, nunca autorização para um segundo cadastro." As 5 empresas **não são aliases**: são clientes distintos, como Hitech e Rodrigo. Isso entra no AGENTS.md no mesmo PR da U3.
A guarda da Stokki (`familiaZeissR4`, functions-get) continua valendo só para a família `zeiss`.

## Pendências do Chris
Nome de exibição de cada empresa, @ do Instagram e responsável que aprova no Portal.
