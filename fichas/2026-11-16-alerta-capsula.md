# Ficha · Aviso de conteúdo cápsula volta (só aviso, decisão manual da Amanda)

- **Pedido literal (Chris, 16/11/2026, resumo):** "E traga de volta o aviso que tínhamos sobre conteúdo cápsula: quando um cliente fica muito tempo sem postagem, trazemos conteúdo cápsula (conteúdo pré-programado que só precisa de edição, sem gravação) para o cliente não ficar sem postagem."
- **Unidade:** U3 (depois da U2 `feat/ate-quando-amanda`, mesma projeção) · **Tipo:** ajuste + erro (caso nunca avisado)

## Sintoma e reprodução
O alerta de cobertura (`verificarCoberturaPostagensAmanda`) só nascia quando o cliente JÁ tinha tido uma postagem com data (`ultimaData`). Cliente da carteira com calendário e nenhuma postagem ativa nunca era avisado. O texto citava a cápsula só no fim da descrição, sem botão na demanda. Reprodução: J70 vermelha no `main` (nenhum alerta para o cliente semeado).

## Causa-raiz
`coberturaPostagensAteQuando` (ex-`calcularCoberturaPostagens`) devolvia `evento:''` quando não havia `ultimaData`.

## Árvore
```
RAIZ: demandas/alerta_cobertura_<slug>_<data>_<evento> (tipoEspecial alerta_cobertura_postagem)
├─ ESCRITORES : verificarCoberturaPostagensAmanda (motor, frequente) — único; transação + id determinístico
├─ LEITORES   : Minhas Demandas da Amanda (modal genérico + bloco novo de cápsula); tela "Postagem Até Quando" (mesma projeção)
├─ HUMANOS    : só a Amanda recebe; botão "Avaliar conteúdo cápsula" → irParaCapsulaAmanda() (painel manual)
├─ RULES      : nenhuma mudança (demandas já gravadas por este motor; calendarios já lidos pela gestão)
├─ AUTOMAÇÕES : motor frequente; agora lê também `calendarios` (falha aborta a rodada, §53)
├─ LEGADO     : alertas abertos das etapas antigas seguem as mesmas regras de validade/encerramento
└─ COLATERAL  : clientes do seed com calendário e sem postagem passam a ter 1 alerta cada (esperado)
```

## Mudança
- `gs-ate-quando-postagens.mjs`: `slugsComCalendarioAteQuando`; evento `sem_postagem_programada` (carteira recorrente + calendário com conteúdo ativo + nenhuma postagem ativa com data); textos do alerta com cápsula; `htmlAcoesAlertaCoberturaAteQuando` (botões na demanda).
- `escritorio.html`: o motor passa o conjunto de clientes com calendário; validade/encerramento da etapa nova; textos via módulo; bloco de cápsula no modal da demanda; tela usa o mesmo texto.

## O que NÃO muda (§52.3)
Nenhuma escrita em `capsulas_clientes`, nenhuma chamada de `acionarCapsulaAmanda()` pela automação, destinatário único Amanda, soft-delete ao encerrar.

## Testes
J70: 1 alerta com texto de cápsula e botão que abre o painel; 2ª rodada não duplica; postagem futura encerra (cancelado_automaticamente + excluido); `capsulas_clientes` intacta. Bateria inteira desktop e `--movel` sobre a U2.

## Risco residual
Id do alerta "sem postagem" é estável por cliente: se o cliente voltar a ficar sem NENHUMA postagem (todas excluídas) depois de encerrado, não nasce um segundo (os eventos por data continuam cobrindo o caso comum). Hashes antes: escritorio.html a1cf4f38…, gs-ate-quando-postagens.mjs 590db60b….
