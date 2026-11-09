# menu-sem-diario-julia — tirar o "Registro do dia" da Júlia do menu da Amanda e do Chris

Pedido original: "Pode tirar do menu" (Chris, 09/11/2026), depois do achado de que o Diário ainda mostra "Demandas recebidas pela Júlia".
Unidade: 1 de 1 · Tipo: ajuste de menu (sem dados, sem rules)
Reprodução: Amanda ou Chris entram → o menu mostra "Registro do dia" (`navDiarioI118`), uma tela que só serve para conferir o dia da Júlia. A conta dela (`Fernanda`) está `ativo:false` em `usuarios_equipe`. A base exportada tem 1 registro (07/10, já conferido).

## Árvore
```
RAIZ: item navDiarioI118 no menu
├─ VISIBILIDADE  : VISIBILIDADE_POR_FUNCAO['Amanda'] (sai) · Chris = 'todos' → ITENS_OCULTOS_POR_PESSOA['Chris'] (entra)
├─ DIA A DIA     : lista do grupo "Dia" de Amanda e Chris (sai)
├─ TELA          : view-diarioEquipe e gs-diario-equipe-i118.mjs ficam iguais (Fernanda mantém, se for reativada)
├─ DADOS         : diario_equipe_i118 intacto (nada é apagado)
├─ RULES         : nenhuma mudança
└─ TESTES        : J24 perde o caso Amanda/Diário (a porta não existe mais); J26 nova
```

## O que NÃO muda
A tela, o módulo, os dados, as rules e o menu da Fernanda (se a conta voltar, o Diário volta junto).

## Testes
J26: verde com a mudança e vermelha no `main` (Diário no menu: true). Bateria inteira mais `--movel`.

## Rollback
`git revert` do merge.
