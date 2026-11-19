---
name: get-arvore-do-pedido
description: Usar em TODO pedido de mudança, correção ou erro no Site Get (escritorio.html, portal-cliente.html, calendários, rules, functions) antes de tocar código — desmembra o pedido, monta a árvore de impacto (quem lê, quem escreve, quem recebe) e produz fichas de 1 mudança cada.
---

# Árvore do pedido — do sintoma à raiz, sem ramo esquecido

Esta é a skill mais importante do projeto. Ela existe porque a causa nº 1 das regressões no Site Get foi **mexer no ponto do sintoma sem mapear o que mais depende daquele estado**. Nenhum código é escrito antes de a árvore existir e caber numa tela.

## Passo 0 — Separar o pedido em unidades
Chris costuma ditar pedidos longos com vários assuntos. Antes de qualquer coisa:
1. Listar cada assunto como uma linha: `U1 …`, `U2 …`. Um assunto = uma mudança observável por uma pessoa da equipe.
2. Para cada unidade, classificar: **erro** (algo que funcionava e parou / nunca funcionou), **ajuste** (muda comportamento existente), **novo** (não existia), **dúvida** (precisa de resposta, não de código).
3. Confirmar a lista com Chris em uma frase por unidade **só se** houver ambiguidade que mude o resultado. Caso contrário, seguir e registrar a interpretação na ficha.
4. **Uma unidade = uma branch = um PR.** Nunca juntar unidades no mesmo PR, mesmo que toquem o mesmo arquivo.

## Passo 1 — Reproduzir ou localizar
- Erro: reproduzir no emulador (skill `get-prova-de-jornada`) ou, se depender de dado real, ler o dado em produção (somente leitura) e descrever exatamente o estado que gera o sintoma. Sem reprodução → é hipótese, e a ficha diz "hipótese".
- Ajuste/novo: localizar o processo equivalente que já existe. No Site Get **quase tudo já existe em alguma forma**; criar paralelo é a segunda maior causa de bug.

## Passo 1b — CASO REAL PRIMEIRO (obrigatório desde 19/11/2026, retrospectiva)
Erros que se repetiram e esta regra impede: atalho que não resolvia o Nathan (CP229), mensagem mandando usar botão que não existe (Fedalto, CP232), recusa só no ar (CP226b).
1. **Ouvir e ver tudo**: transcrever todo áudio (`whisper-cli` + `ffmpeg` em `iCloud/.../FERRAMENTAS`), ver o vídeo inteiro (quadros com `ffmpeg -vf fps=…,tile=4x2`), ler cada print. Escrever em 1 linha **o que a pessoa tenta fazer** (não o que a tela diz).
2. **Abrir o caso no ar, somente leitura, no papel e no aparelho de quem reclamou** (perfil, tablet/celular) e ler o dado real (Firestore/servidor). A causa só é "causa" quando explica exatamente aquela tela com aquele dado.
3. **Necessidade ≠ sintoma**: se a correção não faz a pessoa concluir o gesto que ela tentava, não é correção. Atalho/aviso/texto nunca fecha um erro sozinho.

## Passo 2b — TODOS os ramos (lista de conferência; colar na ficha com ✅/n.a.)
- [ ] **Ação nova/alterada**: contrato do servidor (`ACOES_*`, `validarEntrada*`), roteador, lista `EDITORIAL` de `gs-central-preparacao-http-r80.mjs`, regex de tentativa guardada na tela, `acaoConferida` (CP226b).
- [ ] **Resposta nova do servidor**: validação na tela **e** onde a tela GUARDA o estado (ex.: `__filaInternaCp123`) (CP232).
- [ ] **Ramos por papel na tela**: Chris / Amanda / Cecília / editor — cada um percorre o mesmo caminho? Há `if(papel==='X')` que manda para outro fluxo? (CP230)
- [ ] **Onde o painel monta**: o contêiner está visível na aba em que a pessoa está? (CP228)
- [ ] **Toda mensagem aponta para uma saída que existe** naquele estado e para aquele papel: `grep` o nome do botão citado e a condição que o mostra. Mensagem sem saída disponível = bug (Fedalto, CP232/CP233).
- [ ] **Estado que trava** (liberação, fila, mês): lista a saída e com quem está; a saída funciona.
- [ ] **Outros produtores do mesmo estado**: quem mais grava aquilo (editor, Central, motor, portal) e deixa o mesmo estado sem saída? Corrigir a classe inteira, não o caso (ex.: qualquer republicação deixa ajustes internos sobre a versão anterior).

## Passo 2 — Montar a árvore de impacto
Para o estado/dado/tela tocado, responder com `grep` e leitura real (não de memória):

```
RAIZ: <coleção/campo/estado ou função/elemento>
├─ ESCRITORES  : quem grava isso? (funções, Cloud Functions, motor, portal, migrações)
├─ LEITORES    : quem lê? (telas, badges, contadores, filtros, caches tempo real, relatórios, Portal)
├─ CONSUMIDORES HUMANOS: que papel vê/clica/recebe? (Chris, Amanda, Cecília, editores, filmmakers, cliente)
├─ RULES       : que regra do Firestore permite/nega? (função em firestore.rules; limite 256 KB)
├─ AUTOMAÇÕES  : entra em `verificacoes` do motor? cron? e-mail/push?
├─ LEGADO      : docs antigos sem o campo? aliases? status antigos? (ler AGENTS.md por palavra-chave)
└─ EFEITO COLATERAL: o que muda de aparência/contagem em OUTRA tela se eu mexer aqui?
```
Comandos padrão (no clone do repo):
```bash
grep -n "nomeDoCampo" escritorio.html portal-cliente.html calendario.html *.mjs functions-get -r | wc -l
grep -n "nomeDoCampo" firestore.rules
grep -n "nomeDaFuncao(" escritorio.html | head          # chamadas
grep -n "id=\\\\\?['\"]idDoElemento" escritorio.html     # onde o elemento nasce (inclui templates)
grep -in "palavra-chave" AGENTS.md | head                # incidentes passados sobre isso
```
Regra: se a árvore tiver mais de ~12 folhas, a unidade é grande demais → desmembrar de novo ou declarar "mudança compartilhada" (exige plano amplo e teste transversal).

## Passo 3 — Decidir a menor mudança que resolve a raiz
- Preferência: (1) reutilizar sem alterar; (2) menor ajuste no ponto da **raiz** (não do sintoma); (3) só então algo maior, com justificativa.
- Proibido: nova função global com nome genérico; novo `window.*`; duplicar helper que já existe; `catch → lista vazia`; `addDoc` por clique (usar id determinístico/transação); exclusão física; "corrigir" trocando mensagem.
- Toda escrita nova respeita os invariantes do `AGENTS.md` (soft-delete, identidade canônica, papel no DOM, falha não vira zero).

## Passo 4 — Escrever a ficha (antes do código)
Arquivo `fichas/AAAA-MM-DD-<slug>.md` na branch, 15–30 linhas:
```
# <slug> — <uma frase>
Pedido original (literal): "…"
Unidade: U2 de 4 · Tipo: erro
Sintoma observado: … · Reprodução: emulador seed X / produção RO doc Y / não reproduzido (hipótese)
Causa-raiz: …
Árvore: (colar a árvore do passo 2)
Mudança: arquivos/funções exatas · Por que esta e não outra
O que NÃO muda: …
Testes: jornada(s) que vão rodar (ids da skill de prova) + papéis + cenários legado/novo/vazio/erro
Risco residual: …
Regra vigente avisada a Chris: … (quando a mudança toca algo que AGENTS.md trata diferente)
```

## Passo 5 — Avisar a regra vigente
Sempre que o pedido de Chris contrariar uma regra do `AGENTS.md`/invariante conhecida, **dizer em uma linha**: "Regra vigente: X. Você está pedindo Y. Sigo com Y?" — e esperar. Chris decide; a ficha registra a decisão e o `AGENTS.md`/docs do projeto são atualizados no mesmo PR.

## Saída desta skill
Lista de unidades + uma ficha por unidade + ordem de execução (erro > ajuste > novo; dependências primeiro). Só depois disso entra `get-mudanca-segura`.
