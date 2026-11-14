# Ficha · Senha do cofre aparece toda em maiúsculas

- **Pedido literal (Chris, 14/11/2026):** "nosso cofre de senhas não está atualizado… a Amanda colocou a senha dos clientes lá dos insta deles, porém o sistema deixou todas maiúsculas… nenhuma senha foi mudada, elas só ficaram maiúsculas do nada"
- **Unidade:** 1 de 1 · **Tipo:** erro (tela)

## Sintoma
Ao clicar em "Revelar" (Gerência → Cofre de Senhas, ou Senhas dos Clientes da Cecília), a senha aparece toda em MAIÚSCULAS.

## Causa-raiz
`revelarSenhaCofreNoAlvo` (escritorio.html) mostra a senha dentro de `<span class="prioTag verde">`. A classe `.prioTag` (linha 169) tem `text-transform:uppercase`. **O dado não muda:** o cadastro (`salvarSenhaCofre`) cifra `input.value` sem tratamento, e `gs-cofre.mjs` não mexe em maiúsculas/minúsculas. Por isso nada precisa ser recuperado: as senhas no Firestore estão como a Amanda digitou.

A J15 não pegava o problema porque lia `textContent` (texto bruto, sem CSS), e não o que a pessoa vê.

## Árvore
```
RAIZ: span da senha revelada em revelarSenhaCofreNoAlvo
├─ ESCRITORES: salvarSenhaCofre (sem alteração; grava o texto como digitado)
├─ LEITORES: revelarSenhaCofre (Chris/Amanda) e revelarSenhaCofreCecilia, que passam pela mesma função
├─ CONSUMIDORES HUMANOS: Chris, Amanda, Cecília
├─ RULES / AUTOMAÇÕES / LEGADO: nenhum
└─ EFEITO COLATERAL: nenhum; .prioTag continua igual nas outras 33 telas
```

## Mudança
- escritorio.html: o span da senha revelada recebe `text-transform:none;letter-spacing:normal` inline. As outras etiquetas `.prioTag` não mudam.
- ensaio/jornadas/J15: lê `innerText` (o que aparece na tela). Os segredos do teste têm minúsculas, então a jornada fica vermelha sem a correção.

## O que NÃO muda
Dados do cofre, criptografia, rules, cadastro, permissões e o estilo `.prioTag` em geral.

## Testes
- Portão local: inline `node --check` ok, verificar_caminhos 0 handlers quebrados, verificar_duplicatas 0 divergências novas.
- J15 (Cecília revela v2 e compara com o original), rodada no CI do PR. Localmente não havia Java nem firebase-tools para os emuladores.

## Risco residual
Nenhum para os dados. Hash do escritorio.html: 95844c94… → 8884bfdc…
