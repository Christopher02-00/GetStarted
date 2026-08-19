[CATALOGO_DE_ERROS.md](https://github.com/user-attachments/files/31149725/CATALOGO_DE_ERROS.md)
# CATÁLOGO DE ERROS — lei permanente

> **Instrução para mim mesmo, obrigatória.**
> Cole este documento junto com o prompt mestre em toda conversa nova.
> Ao fim de cada sessão, acrescente os erros novos. Nunca remova nenhum.
>
> Regra zero: **antes de escrever qualquer alteração, leia a seção 1.**
> Ela custa 30 segundos e já teria evitado quatro quedas de produção.

---

## 1. CHECKLIST DE 30 SEGUNDOS — ANTES DE CADA EDIÇÃO

```
[ ] Vou substituir texto? Delimitei a função por CONTAGEM DE CHAVES?
[ ] Contei quantas ocorrências existem, e conferi que TODAS são o alvo?
[ ] O que vem IMEDIATAMENTE ANTES do meu ponto de corte?  ← async? window.? const?
[ ] Criei variável nova? Alguma função a usa sem declarar?
[ ] Criei item de menu? Entrou em ITENS_CONTROLADOS?
[ ] A chave que estou editando ('Amanda':) existe em quantos mapas?
[ ] A trava está DENTRO da função, ou só escondi o botão?
[ ] Existe decisão paralela que também precisa mudar?
[ ] Estou identificando registro por POSIÇÃO? Existe id estável?
[ ] Vou testar CARREGANDO o arquivo, não só compilando?
```

**Se eu errar, NÃO consertar com pressa.** Ver seção 4.2 — o remendo apressado
já foi pior que o erro original.

---

## 2. A FAMÍLIA DE ERRO QUE MAIS ME DERRUBA

> ## SUBSTITUIÇÃO GLOBAL SEM DELIMITAR O ALVO
> **Cinco ocorrências. Sempre a mesma causa.**

### 2.1 O `async` órfão — derrubou o site inteiro *(07/08)*

**O que fiz:** procurei `function renderAcompanhamentoVisaoGeral`. A original era **`async function`**. Recortei a partir do `function`, deixando `async` sozinho numa linha.

**Por que passou no teste:** `async` sozinho é **sintaticamente válido**. Compilou. Só quebra em execução: `ReferenceError: async is not defined`.

**O estrago:** **446 das 718 funções nunca nasceram**, incluindo `irPara`. Nenhuma aba abria. O Chris relatou como *"o site ficou lento e pesado"* — não estava lento, estava **carregando pela metade**.

> **LEI:** antes de recortar uma função, confira o que vem **imediatamente antes** do nome: `async`, `window.`, `const X =`. Delimite pelo início real.

### 2.2 O mesmo `async` órfão — DE NOVO *(08/08)* ⚠️

**O que fiz:** ancorei em `function renderCampanhasKanban` para inserir código antes. A função era **`async function renderCampanhasKanban`**. Inseri entre o `async` e o `function`.

**Por que dói:** eu tinha escrito a LEI 2.1 na véspera, li o catálogo naquela manhã, e repeti mesmo assim.

**O que salvou:** o teste de sintaxe pegou **antes de entregar** — desta vez o órfão precedia um comentário, o que muda o erro de parse.

> **LEI:** ler o catálogo não basta. O checklist da seção 1 tem que ser **executado**, item por item, não lembrado.

### 2.3 `barraFiltros` — derrubou o Painel do Agora *(07/08)*

Troquei `cont.innerHTML = cabecalho` no arquivo inteiro, assumindo que as 6 ocorrências estavam na mesma função. Uma estava em `renderAgora`, que não tem essa variável. O painel travava em "Lendo o dia..." para sempre.

> **LEI:** `split().join()` e `replace` global são proibidos neste arquivo. Delimite a função, edite dentro, e confira se sobrou uso da variável fora.

### 2.4 Os três quadrados amarelos vazios *(07/08)*

Usei `t.replace(/'Amanda':\s*\[([^\]]*)\]/g, ...)`. Existem **quatro mapas** com a chave `'Amanda'`. O regex acertou os quatro. Dois não são listas de permissão:
- `DIA_A_DIA_POR_FUNCAO` — atalhos
- `ATALHO_DESTAQUE` — **lista de objetos** `{rot, acao}`

Como `montarAtalhoDestaque` faz `b.textContent = a.rot`, entrada sem `rot` virou **caixa amarela vazia** no topo da barra da Amanda.

**Reincidiu em 08/08** ao dar acesso à Cecília — e aí o checklist pegou antes de entregar.

> **LEI:** antes de um replace com chave (`'Amanda':`), conte **em quantos mapas** ela existe e confirme que todos têm o mesmo formato.

### 2.5 O regex que comeu os `id:` *(07/08)*

Ao limpar o 2.4, usei `replace(/'nav\w+'\s*,\s*/g,'')`. Pegou os **valores de `id:` dentro dos objetos** — apagou `id:'navCapsulaAmanda'` e `id:'navAuditoriaPerfisChris'`, destruindo a sintaxe.

**Como peguei:** conferi **a lista do que foi removido**, não a contagem. Vi cinco removidos quando esperava três.

> **LEI:** sempre imprima **o que** foi removido, item por item. Contador não denuncia remoção errada.

---

## 3. IDENTIFICAR REGISTRO POR POSIÇÃO *(08/08 — novo)*

**O que fiz:** a nova aba de Campanhas marca "já foi feito" gravando no item do calendário identificado pelo **índice no array** (`items[idx]`).

**O risco que encontrei ao auditar:** só **9 dos 202 itens** têm `itemId`. Se a Gabi acrescentar, apagar ou reordenar um item entre a Cecília abrir a tela e clicar, o índice aponta para **outro item** — e eu marcaria a campanha errada como resolvida. Em silêncio.

**Como consertei:** na hora de desenhar, a tela guarda um retrato de qual título está em cada posição (`window.__campEsperado`). No clique, a função confere o título antes de gravar. Se não bater, **não grava nada**, avisa e recarrega.

**O que fica pendente:** dar `itemId` estável aos 193 itens que não têm. É migração de dado e merece rodada própria.

> **LEI:** nunca identificar registro por posição num array que outra pessoa edita. Se não houver id estável, guardar um retrato e conferir antes de gravar.

---

## 4. TESTES QUE PASSARAM MENTINDO

> **Um teste que confirma o que eu espero, em vez de medir o que o usuário vê, não é teste — é eco.**

### 4.1 O sandbox pegou a função antiga
Chamei a função nova **pelo nome nu** na página aberta. Como a página já tinha aquela função carregada, o navegador resolveu para a versão **antiga**.
> **LEI:** no sandbox, declare as funções sob teste como nome próprio (`var f = window.f`).

### 4.2 Medi a lista que não manda
Para provar que um botão estava escondido, conferi `VISIBILIDADE_POR_FUNCAO`. Quem esconde é **`ITENS_CONTROLADOS`**. O teste disse "não aparece"; na tela da Gabi, aparecia.
> **LEI:** pergunte "quem executa o `display:none`?" e teste **essa** função.

### 4.3 Janela de tamanho fixo invadiu outro mapa
`t.slice(i, i+2600)` passou do fim e entrou no mapa seguinte. Acusei intruso inexistente.
> **LEI:** nunca recorte por distância. Sempre contagem de chaves.

### 4.4 Medi a regra item a item e ignorei a regra de grupo
Acusei vazamento do menu financeiro. Falso positivo — os itens ficam em `navgroupVendas`, escondido em bloco. **Mas ao conferir achei um problema real** (5.1).
> **LEI:** um elemento pode ser escondido por si, pelo grupo, ou por CSS. Confira as três camadas.

### 4.5 O teste dependia do relógio
Cinco asserções passavam às 18h e falhavam às 19h25. De manhã o teste mentia.
> **LEI:** congele o relógio.

### 4.6 Testei numa aba com código velho
A auditoria acusou os quadrados amarelos ainda presentes. Eram — **na aba, carregada antes do upload.** O arquivo no ar estava correto. **Repetiu em 08/08** com `detectarCampanhas is not a function`.
> **LEI:** antes de concluir que um conserto falhou, recarregue e confirme que a página roda a versão nova.

### 4.7 Chamei a função fora do contexto que ela precisa *(08/08 — novo)*
Chamei `renderCampanhasKanban()` direto e vi tela vazia. Concluí que o quadro tinha perdido dados. **Não tinha** — a função precisa da tela ativa. Pelo caminho real (clique no menu) o quadro carregava inteiro.
> **LEI:** teste pelo caminho que o usuário usa. Chamar a função direto pode dar falso negativo.

---

## 5. AGIR SEM VERIFICAR CONTRA A REALIDADE

### 5.1 O comentário que prometia o que o código não fazia
O comentário de 27/07 dizia *"Vendas é só do Chris... Agora é."* A linha embaixo estava **incondicional**: `gVendas.style.display = 'block'`. **O menu financeiro estava visível para a equipe inteira.** Quase passei batido porque li a promessa em vez de medir.
> **LEI:** comentário não é prova. Meça o comportamento.

### 5.2 A proposta do IKN Brasil
Li uma demanda de uma semana antes dizendo *"manda a proposta"* e montei a proposta inteira. O negócio já estava fechado e a produção agendada. **Trabalho inteiro jogado fora.**
> **LEI:** aviso do sistema envelhece. Cruze com o que de fato aconteceu antes de agir.

### 5.3 Quase liberei a Zeiss
Ia remover um cliente de R$1.700/mês de todos os processos, porque o contrato estava sob um apelido diferente (`zeens`). Peguei porque **conferi o banco antes de escrever**.
> **LEI:** nome não é chave. Leia o registro real.

### 5.4 Propus criar registro em vez de janela *(08/08 — novo)*
Para resolver as campanhas perdidas, ia **criar registros** no quadro a partir do texto dos calendários. O Chris corrigiu: seria uma **terceira verdade**. O certo era uma **janela** sobre o que já existe — a Gabi continua no calendário, nada muda, a aba só mostra.
> **LEI:** quando a informação já existe em algum lugar, a solução é uma vista sobre ela — nunca uma cópia.

---

## 6. O DEFEITO CRÔNICO DESTE SISTEMA

> ## AS DUAS VERDADES
> **A mesma pergunta respondida em dois lugares — e o lugar errado ganhando.**

| Sintoma | Causa |
|---|---|
| Amanda mudava o prazo, a Equipe mostrava o antigo | a Equipe tinha uma segunda lista escrita à mão |
| Vídeo voltava pra ajuste e já nascia atrasado | `v.prazoEntrega` ganhava de `calcularPrazoEdicaoVideo()` |
| Badge de aprovações marcou zero por 4 dias | bloco morto em `if(false)` com `atualizarBadgeAprovar(0)` no `else` |
| Filmagens avulsas: R$400 em vez de R$300 | mesma conta respondendo duas perguntas |
| Grade do calendário errada em todo mês | `mesRef()` devolvia `null` e o offset caía em `0` em silêncio |
| **Campanha da Cookiery perdida** | **Gabi escreve no calendário; o quadro lia outra coleção. Nenhuma ponte.** |
| **Duas telas chamadas "Campanhas"** | **eu criei a segunda sem ver. O Chris notou antes de mim.** |

**A regra que resolve a família:** antes de consertar uma tela que mostra número errado, pergunte **quantos lugares respondem esta pergunta**. Se for mais de um, **apague um** — não conserte os dois.

---

## 7. ARMADILHAS ESPECÍFICAS DESTE ARQUIVO

| # | Armadilha | Consequência real |
|---|---|---|
| 1 | Função em `<script type="module">` é invisível para `onclick` | botão morto sem erro — use `window.x = x` |
| 2 | Item fora de `ITENS_CONTROLADOS` nunca é escondido | a Gabi via a Central de Vídeos |
| 3 | Existem **quatro** mapas de menu | mexer num só deixa metade do efeito |
| 4 | Esconder o menu não protege | `irPara()` pelo console entra igual |
| 5 | Colisão de nome de função | quase matei as ações em lote **sem erro na tela** |
| 6 | `if(false){ }` deixa resto vivo | zerou um badge por 4 dias |
| 7 | `orderBy` descarta documento sem o campo | o item some, silenciosamente |
| 8 | Fallback numérico em cálculo de data | grade errada em todo mês, com cara de certa |
| 9 | Bulk replace comendo a própria declaração | `const X = X` — o site não bootava |
| 10 | Variável não declarada **não** faz fallback | `ReferenceError`, não cai no `else` |
| 11 | Arquivo usa `\r\n` | inserir com `\n` muda o hash sem mudar conteúdo |
| 12 | `calendario.html` e `calendarios.html` são espelhos | mexer num só já quebrou |
| 13 | **Só 9 de 202 itens de calendário têm id** | marcar por posição pode acertar o item errado |
| 14 | **O seletor de nome NÃO autentica** | login é por Google; sem ele o Firestore recusa tudo |

---

## 8. O TESTE OBRIGATÓRIO

Compilar **não** prova que o arquivo vive. O `async` órfão compilava.

```js
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:-9999px;width:1400px;height:900px;';
f.src = URL.createObjectURL(new Blob([novo], {type:'text/html'}));
document.body.appendChild(f);
await new Promise(r => { f.onload = r; setTimeout(r, 15000); });
const w = f.contentWindow;
const defs = [...new Set([...novo.matchAll(/window\.(\w+)\s*=/g)].map(m => m[1]))];
const vivas = defs.filter(x => { try { return typeof w[x] !== 'undefined'; } catch(e) { return false; } }).length;
// vivas ≈ defs  E  typeof w.irPara === 'function'
```

**Antes do conserto: 272 vivas. Depois: 614.** Essa diferença é entre um arquivo que funciona e um que parece funcionar.

**Nenhuma entrega sai sem ele.**

---

## 9. QUANDO EU ERRAR: NÃO CONSERTAR COM PRESSA *(08/08 — novo)*

Ao descobrir o `async` órfão do 2.2, tentei mover meu bloco rapidamente. Meu "conserto" jogou a função **para depois do `</html>`** — muito pior que o erro original.

**O que funcionou:** **descartar tudo e recomeçar do arquivo que está no ar.** Custa cinco minutos e devolve terreno conhecido.

> **LEI:** erro descoberto = parar, respirar, e recomeçar do arquivo do ar. Nunca remendar em cima de estado corrompido.

---

## 10. COMO ATUALIZAR ESTE DOCUMENTO

```markdown
### [número] [nome curto]
**O que fiz:** [a ação exata]
**O que aconteceu:** [o efeito no sistema]
**Como o Chris viu:** [o sintoma relatado — quase sempre diferente da causa]
**Por que passou:** [por que meu teste não pegou]
**Como consertei:** [a correção]
> **LEI:** [a regra que impede a repetição]
```

Nunca remova entrada. **Erro repetido com regra escrita é pior que erro novo** — significa que li e não segui. Aconteceu em 07/08 (três vezes) e em 08/08 (uma).

---

## 11. A CONTA HONESTA

| | 07/08 | 08/08 |
|---|---|---|
| Quedas de produção causadas por mim | **3** | **0** |
| Erros pegos **antes** de entregar | 1 | **4** |
| Todos da mesma família | substituição global sem delimitar | idem |
| A regra contra isso já estava escrita | sim, por mim | sim, e eu li naquela manhã |

**O que mudou de um dia para o outro:** o catálogo existia e eu o executei. Nenhuma queda em produção, e quatro erros interceptados antes de saírem — incluindo a repetição do `async` órfão, a poluição do mapa de atalhos, o regex que comia `id:`, e o risco de marcar campanha errada por índice.

**A lição:** documentar não impede o erro. **Executar o checklist impede a entrega do erro.**

---

## 12. ERROS E INTERCEPTAÇÕES — 10/08/2026

### 12.1 Sessão antiga parcialmente enriquecida virou “moderna”
**O que fiz:** a compatibilidade criada na V32 considerava uma gravação moderna quando encontrava mês, bloco ou `sessaoChave`.
**O que aconteceu:** sessões antigas de Vital Seg e Helo receberam esses campos derivados depois, mas nunca receberam a lista congelada de captações. O sistema mostrava quantidade planejada, liberava zero item e também escondia a declaração legada.
**Como o Chris viu:** Luís continuava sem conseguir registrar os vídeos e via “Nenhuma captação está liberada para esta sessão”.
**Por que passou:** o teste cobria sessão antiga totalmente vazia e sessão moderna completa, mas não o estado intermediário existente no banco.
**Como consertei:** a fronteira agora é `sessaoPlanejamentoVersao === 1` junto de `sessaoItensPlanejados` em array. Sem isso, a declaração fica isolada no próprio `agendamentoId`, sem índice/ID de calendário.
> **LEI:** compatibilidade deve testar estados parcialmente migrados; campo derivado isolado não prova que a migração terminou.

### 12.2 Primeiro mês da ficha não chegava ao contrato
**O que fiz:** o cadastro guardava `primeiraCompetencia` na ficha e na primeira mensalidade, mas omitia esse campo de `contratos_cliente`.
**O que aconteceu:** ao abrir um mês anterior, o gerador via um contrato ativo e podia criar uma cobrança antes da entrada real do cliente, inflando previsto e em aberto.
**Como o Chris viu:** o Financeiro mostrava R$ 26.010 a receber com números que pareciam desconfigurados.
**Por que passou:** o teste validava a primeira mensalidade criada, não a geração de meses históricos a partir do contrato.
**Como consertei:** o contrato recebe `primeiraCompetencia`; o gerador pula competências anteriores. Contratos legados sem o campo continuam elegíveis e nenhum lançamento existente é apagado.
> **LEI:** todo dado temporal usado para criar recorrência deve chegar à fonte que gera as próximas ocorrências, e o teste precisa voltar um mês no tempo.

### 12.3 Total recebido e composição pareciam duplicação
**O que fiz:** mostrei “Entrou” e, na mesma grade, “Mensalidades” e “Avulsos” sem dizer que os dois últimos eram a composição do primeiro.
**O que aconteceu:** o mesmo R$ 5.800 aparecia duas vezes com aparência de duas métricas concorrentes; “vs. julho” comparava base prevista, mas parecia comparar caixa.
**Como o Chris viu:** valores iguais e incompatíveis no topo do Financeiro.
**Por que passou:** a aritmética estava correta, mas o teste não media a semântica dos rótulos.
**Como consertei:** separei caixa recebido, composição recebida, previsto, em aberto e base recorrente; o painel explica a equação e mostra contagem de cobranças/avulsos abertos.
> **LEI:** painel financeiro precisa declarar se cada número é caixa, composição, previsão ou saldo; cálculo certo com rótulo ambíguo continua sendo erro.

### 12.4 Campanhas tinham duas portas e duas fontes
**O que fiz:** mantive um kanban da coleção `campanhas` e uma segunda tela que varria calendários.
**O que aconteceu:** Gabi, Amanda e Cecília podiam consultar respostas diferentes para a mesma campanha, e a tela simples não acompanhava postagem individual, mês ou risco.
**Como o Chris viu:** o quadro não correspondia à operação pedida e as mudanças não estavam identificáveis.
**Por que passou:** cada tela isoladamente carregava, mas nenhum teste contava quantas portas respondiam “Campanhas”.
**Como consertei:** ficou um único item de menu e uma única tela mensal. Registros estruturados preservam clientes/postagens; calendários antigos aparecem como leitura compatível, sem cópia ou migração automática.
> **LEI:** antes de ampliar uma área, conte menus, views, coleções e leitores que respondem à mesma pergunta; unifique a porta antes de adicionar recursos.

### 12.5 Fallback de ID escrito antes do spread
**O que fiz:** ao normalizar postagens, escrevi `{id: fallback, status: fallback, ...p}`.
**O que aconteceria:** se o objeto legado tivesse `id: undefined`, o spread sobrescreveria o fallback e a postagem continuaria sem identidade estável.
**Como o Chris viu:** não chegou à produção; a inspeção de diff pegou antes da entrega.
**Por que passou inicialmente:** a leitura visual da expressão sugeria que o fallback já estava garantido.
**Como consertei:** o spread vem primeiro e os campos normalizados por último: `{...p, id: p.id || fallback, status: ...}`.
> **LEI:** em normalização de objeto, campos canônicos/fallbacks ficam depois do spread; teste explicitamente propriedade ausente e propriedade presente como `undefined`.

### 12.6 Subaba inexistente de Campanhas na matriz de calendário
**O que fiz:** uma lista de subabas da Cecília ainda continha `navCampanhas`, embora isso não fosse uma subaba de calendário.
**O que aconteceria:** a primeira subaba permitida poderia não existir, deixando o calendário sem seleção inicial coerente.
**Como o Chris viu:** não chegou como nova regressão; a busca residual do menu único encontrou o valor.
**Por que passou:** o identificador parecia legítimo por existir no menu lateral antigo, mas era inválido naquele mapa.
**Como consertei:** removi o identificador da matriz de subabas e mantive Campanhas apenas na sidebar própria.
> **LEI:** um mesmo nome visual não torna IDs intercambiáveis entre mapas; valide que cada ID existe no contêiner controlado por aquela matriz.

### 12.7 Campanhas estava escondida, mas continuava no DOM de filmmakers
**O que fiz:** incluí Campanhas na matriz visual por papel, mas deixei o nó estático ser apenas alterado para `display:none` nos papéis sem acesso.
**O que aconteceu:** a tela parecia isolada, porém Luís ainda recebia `navAcompCampanhas` e `view-campanhas` no DOM. Isso contrariava a regra permanente de isolamento real e deixava uma porta indevida disponível para chamada manual.
**Como o Chris viu:** não chegou como nova queda; a auditoria autenticada da V45, depois do upload, inspecionou o DOM real do papel Luís e encontrou o nó oculto.
**Por que passou:** o teste anterior verificava remoção real apenas nos itens privados de clientes/financeiro e, para Campanhas, verificava somente mapa, regra e quantidade de menus.
**Como consertei:** o mesmo mecanismo de marcador e restauração agora remove e recoloca `navAcompCampanhas` e `view-campanhas` conforme o papel. O gate automático passou a exigir explicitamente essa fronteira.
> **LEI:** toda nova área restrita entra simultaneamente no mapa de visualização, na autorização interna, nas regras Firestore e na lista de nós removidos do DOM; conferir só `display` não prova isolamento.

## 13. CHECKLIST EXECUTADO NA V46

- [x] Nenhuma substituição global; alterações delimitadas por função/bloco.
- [x] Scripts inline compilados: 9/9.
- [x] Handlers diretos resolvidos: 908.
- [x] Variáveis novas exercitadas em sandbox nomeado.
- [x] Menu Campanhas: uma única porta; item antigo e view antiga ausentes.
- [x] Guardas dentro das funções e regras Firestore específicas por papel.
- [x] Postagens de campanha recebem ID estável; legado é normalizado sem gravação.
- [x] Soft-delete preservado; nenhuma exclusão física operacional.
- [x] `etapaSegura()`, login, calendários singular/plural e isolamento financeiro preservados.
- [x] Sessões antigas pura/parcial e moderna testadas separadamente.
- [x] Primeiro mês financeiro testado antes/no mês e contrato legado sem campo.
- [x] Arquivo V46 carregado localmente com marcador correto; sem identidade autorizada, menu e view de Campanhas estão ambos ausentes do DOM.
- [x] V45 autenticada em produção identificou e comprovou a permanência indevida de Campanhas no DOM do Luís antes da V46.
- [ ] Fluxo autenticado V46 em produção: depende do novo upload/publicação pelo Chris; não pode ser declarado antes disso.

---

## 14. ERROS E INTERCEPTAÇÕES — V47 (10/08/2026)

### 14.1 Nome parecido não é identidade confirmada
**O que fiz:** interpretei inicialmente “Júlia” como Juliane Nerone ao comparar as planilhas.
**O que aconteceria:** Juliane, que paga R$ 1.700, seria excluída indevidamente dos totais por confusão com Dra. Júlia, que tem cortesia permanente.
**Como o Chris viu:** corrigiu imediatamente que Juliane Nerone e Júlia são clientes diferentes.
**Por que passou:** usei semelhança de nome como identidade, apesar de o sistema possuir slugs e contratos distintos.
**Como consertei:** nenhuma gravação havia sido feita; mantive Juliane nas duas competências e confirmei no Firestore o pagamento de agosto. Dra. Júlia permanece fora das planilhas e da cobrança.
> **LEI:** nunca fundir, excluir ou classificar financeiramente por nome parecido; confirmar slug, contrato e mensalidade antes de concluir identidade.

### 14.2 Saída operacional não encerrava a recorrência financeira
**O que fiz:** a tela de saída guardava a data operacional, mas não o último mês que o cliente deveria pagar.
**O que aconteceu:** contratos programados para sair continuavam gerando lançamentos futuros; Joaquin e Dra. Monique tinham setembro aberto mesmo ausentes da planilha correta de setembro.
**Como o Chris viu:** pediu que o último pagamento ficasse vinculado “de todas as maneiras possíveis” ao Financeiro.
**Por que passou:** os testes anteriores cobriam Portal, listas e soft-delete, mas não atravessavam contrato → geração mensal → totais → régua de cobrança.
**Como consertei:** a V47 exige a competência final, bloqueia pagamento posterior já recebido, cancela lançamentos posteriores sem apagá-los, impede novas competências e restaura somente o que a mesma saída cancelou quando ela é desfeita.
> **LEI:** saída de mensalista só está completa quando data operacional e competência financeira final são validadas juntas em contrato, mensalidades, totais e cobrança.

### 14.3 Mensalidade cancelada ainda era contada como aberta
**O que fiz:** `renderMensalidades` reconhecia o selo “Cancelada”, mas três filtros excluíam apenas pago/isento.
**O que aconteceria:** um lançamento cancelado pela saída poderia continuar inflando “Previsto”, “Em aberto” e o contador do grupo por vencimento.
**Como o Chris viu:** não chegou à produção; a inspeção da cadeia financeira encontrou a inconsistência antes do pacote.
**Por que passou:** o normalizador possuía o estado `cancelado`, mas a tela repetia listas locais incompletas.
**Como consertei:** filtro, previsto e contador agora tratam `pago`, `isento` e `cancelado` como resolvidos, coerentes com o Financeiro e a régua.
> **LEI:** todo novo estado financeiro deve ser testado em cada total, filtro, badge, ação e régua; reconhecer o selo não basta.

### 14.4 Contrato ativo podia sumir da Central por cadastro antigo arquivado
**O que fiz:** a Central montava clientes legados por lista base e `clientes_extras`, mas não usava `contratos_cliente` como fonte de descoberta; além disso, um cadastro de origem arquivado sempre vetava o cartão.
**O que aconteceu:** Emanuelle tinha contrato ativo de R$ 1.700 e cortesia de agosto estruturada, mas aparecia apenas no arquivo e não no controle ativo da Amanda.
**Como o Chris viu:** a comparação entre planilha e site encontrou o cliente no financeiro e fora da Central.
**Por que passou:** os testes verificavam que clientes legados apareciam, não o caso cruzado “cadastro arquivado + contrato financeiro ativo”.
**Como consertei:** contratos ativos também alimentam a Central gerencial; um arquivo antigo não esconde a divergência, mas nenhum registro é reativado ou regravado automaticamente.
> **LEI:** uma fonte histórica não pode esconder uma fonte autoritativa ainda ativa; divergência deve ficar visível para correção, nunca ser resolvida silenciosamente.

### 14.5 Texto livre de cortesia divergiu do lançamento real
**O que fiz:** algumas condições comerciais continuaram apenas na observação do contrato.
**O que aconteceu:** Fedalto está como isenta em agosto no Firestore e aberta em setembro, embora o Chris tenha confirmado que agosto foi pago e setembro é o mês grátis. Zeens também mantém a cortesia de agosto só no texto do contrato.
**Como o Chris viu:** informou o pagamento da Fedalto e a volta da cobrança em outubro.
**Por que passou:** texto descritivo e campos estruturados foram tratados como se fossem equivalentes.
**Como consertei:** o código preserva pagamento/isenção existentes e sincroniza `cortesiaMeses` quando a ficha é salva; o relatório V47 separa claramente as correções de dados que ainda precisam ser confirmadas no site depois do upload.
> **LEI:** observação explica; campo estruturado calcula. Quando divergem, sinalizar e pedir correção explícita — nunca inferir pagamento ou cortesia de texto livre.

## 15. CHECKLIST EXECUTADO NA V47

- [x] Alterações delimitadas às saídas, contratos, mensalidades, Central e seus testes.
- [x] Scripts inline compilados: 9/9.
- [x] Handlers diretos resolvidos: 908.
- [x] `etapaSegura()`, login, calendários singular/plural, papéis e isolamento financeiro preservados.
- [x] Última competência testada antes, no mês e depois do fim do contrato.
- [x] Alias financeiro testado sem criar segundo cliente.
- [x] Pagamento posterior bloqueia a saída; cobrança aberta/isenta posterior é cancelada com histórico.
- [x] Cancelamento/reativação restaura apenas lançamentos vinculados à própria saída.
- [x] Pagamento final existente não tem valor nem status sobrescrito.
- [x] Mensalidade cancelada não entra em previsto, aberto, badge ou régua.
- [x] Contrato ativo permanece visível na Central mesmo com cadastro antigo arquivado.
- [x] Nenhuma regra Firestore, Portal, calendário ou arquivo compatível foi alterado.
- [ ] Escrita autenticada V47 em produção: depende do upload do Chris e de salvar as correções de dados identificadas; não foi fingida em teste local.

---

## 16. ERROS E INTERCEPTAÇÕES — V48 (10/08/2026)

### 16.1 Primeiro pagamento misturava conta pessoal e caixa da agência
**O que fiz:** o cadastro criava a primeira competência como uma mensalidade comum, sem guardar em qual conta o pagamento de entrada realmente caiu.
**O que acontecia:** marcar “pago” podia inflar o caixa da agência com dinheiro recebido na conta pessoal do Chris; não havia conciliação específica para pagamentos fora do vencimento normal.
**Como o Chris viu:** explicou que o primeiro pagamento ocorre na assinatura e normalmente entra em sua conta pessoal.
**Por que passou:** o sistema modelava competência e vencimento, mas não modelava destino nem data efetiva do primeiro recebimento.
**Como consertei:** a primeira mensalidade continua única, mas agora nasce ligada a um controle privado. Chris confirma data e conta; conta pessoal quita a competência sem entrar no caixa da agência, conta da empresa entra no caixa pela data real. Cortesia não cria cobrança de entrada.
> **LEI:** quitar uma obrigação e reconhecer caixa são fatos diferentes; todo recebimento fora do fluxo recorrente precisa de vínculo único, data real e destino explícito.

### 16.2 Variável privada do Financeiro caiu na Central de Demandas
**O que fiz:** ao inserir o novo cartão por um fechamento genérico de template (`</div>\`;`), a primeira tentativa atingiu também `cardResumo` de `renderDemandasDaEquipe`.
**O que aconteceria:** a Central chamaria `avisoControleEntradaHTML` e `controleEntradasHTML` fora do escopo, quebrando a tela de demandas.
**Como o Chris viu:** não chegou ao pacote; a busca de escopo encontrou a referência antes dos testes finais.
**Por que passou inicialmente:** o ponto de corte era curto e existia em outra função, repetindo a família de erro 2.3.
**Como consertei:** restaurei o cartão de Demandas, inseri o painel com contexto exclusivo de `renderFinanceiro` e criei gate que falha se os nomes voltarem ao bloco de Demandas.
> **LEI:** fechamento de template não é âncora de edição; incluir no patch pelo menos uma linha semântica exclusiva antes e depois e testar ausência da variável em funções vizinhas.

### 16.3 Mensalidade legada era vinculada pelo ID presumido
**O que fiz:** a classificação de primeiro pagamento antigo reconstruía o ID como `slug_competencia`.
**O que poderia acontecer:** alias legado — como uma grafia antiga de cliente — podia ter documento válido com outro ID; a tela mostraria a mensalidade, mas a transação procuraria o documento presumido e falharia ou vincularia o alvo errado.
**Como o Chris viu:** não chegou à produção; a revisão de compatibilidade com dados antigos identificou a suposição.
**Como consertei:** a tela transmite o ID real do documento escolhido e a transação revalida cliente canônico e competência antes de qualquer escrita.
> **LEI:** para dado legado, nunca reconstruir ID quando a leitura já entregou a identidade real; transmitir o ID e validar o conteúdo dentro da transação.

### 16.4 Destino bancário quase vazou pelo documento da mensalidade
**O que fiz:** a primeira versão da V48 copiava `destinoRecebimento` e `foraCaixaAgencia` também para `pagamentos_mensais`.
**O que aconteceria:** as regras permitem ao cliente ler a própria mensalidade; mesmo sem mostrar o campo na interface, o dado bruto revelaria “conta pessoal do Chris”.
**Como o Chris viu:** não chegou ao pacote; a auditoria da cadeia Portal → regra → documento detectou antes da entrega.
**Por que passou inicialmente:** a tela de Mensalidades é exclusiva do Chris, mas a coleção não é — o Portal também possui leitura restrita ao próprio cliente.
**Como consertei:** o documento mensal guarda apenas que foi quitado por um recebimento de entrada e seu ID; conta, classificação e valor confirmado permanecem somente na coleção legível por Chris.
> **LEI:** privacidade é definida pela regra da coleção, não pela tela que normalmente a escreve; antes de acrescentar campo sensível, listar todos os leitores daquele documento.

## 17. CHECKLIST EXECUTADO NA V48

- [x] Mudança delimitada a cadastro, primeira mensalidade, Financeiro, regra privada e testes.
- [x] Primeiro pagamento e primeira competência mantêm vínculo único; não nasce segunda receita.
- [x] Chris confirma o valor realmente recebido; divergência do valor previsto não altera nem duplica o contrato.
- [x] Conta pessoal quita a competência, mas fica fora do caixa e da evolução da agência.
- [x] Conta da agência entra pela data efetiva do recebimento, mesmo fora do mês de competência.
- [x] Cortesia inicial não cria controle de cobrança.
- [x] Amanda pode criar somente o pendente padronizado; não lê nem confirma a conta pessoal.
- [x] Cliente lê a própria mensalidade sem receber o destino bancário; o dado sensível permanece na coleção exclusiva do Chris.
- [x] Registros antigos exigem classificação humana; nenhuma conta ou data é inferida.
- [x] Desfazer é reversível e não apaga documentos.
- [x] Alias legado usa o ID real e é revalidado dentro da transação.
- [x] Gate de escopo impede variáveis privadas do Financeiro na Central de Demandas.
- [ ] Escrita autenticada V48 em produção: depende do upload das regras antes do HTML e de uma ativação real futura; nenhum dado real foi criado para testar.

---

## 18. ERROS E INTERCEPTAÇÕES — V49 (10/08/2026)

### 18.1 Calendário enviado continuava editável pela equipe
**O que fiz:** a trava do editor reconhecia `aguardando_interna` e `aprovado_interno`, mas não reconhecia `liberado`.
**O que acontecia:** depois de a Amanda enviar o mês ao cliente, a Gabi ainda podia abrir um conteúdo e salvar mudanças silenciosas na versão que o cliente já estava vendo.
**Como o Chris viu:** pediu edição somente enquanto o calendário ainda não tivesse sido enviado ao cliente.
**Por que passou:** a verificação anterior provava o botão de retirada antes do envio, mas não exercitava a tentativa de edição depois do envio.
**Como consertei:** `liberado` passou a travar todos os mesmos caminhos de edição, com aviso específico e sem botão de reabertura. Ajuste posterior só volta à Gabi por uma transição formal de correção.
> **LEI:** toda permissão temporal precisa testar os dois lados da fronteira; provar “antes pode” sem provar “depois não pode” deixa metade da regra aberta.

### 18.2 Reabertura disputava com o envio da Amanda
**O que fiz:** a retirada da aprovação alterava o objeto inteiro na memória e depois usava a gravação completa do calendário.
**O que poderia acontecer:** Amanda enviava o mês ao mesmo tempo em que Gabi reabria; a última gravação podia sobrescrever `liberado` e transformar um calendário já entregue em rascunho.
**Como o Chris viu:** não chegou como perda comprovada; a análise ponta a ponta do novo pedido encontrou a janela de concorrência.
**Por que passou:** havia uma conferência antes da gravação, mas ela não era atômica com a escrita.
**Como consertei:** reabrir agora é uma transação que relê o estado no banco, altera somente aprovação e `updatedAt`, recusa `liberado` e marca `exigeNovaAprovacao:true`.
> **LEI:** transição concorrente de estado não pode ser `get` seguido de `set`; decisão e escrita precisam ocorrer na mesma transação e falhar fechadas se o estado mudou.

## 19. CHECKLIST EXECUTADO NA V49

- [x] Base V48 publicada confirmada com cache-busting e 3,5 segundos de inicialização.
- [x] Alterações delimitadas ao ciclo de aprovação dos dois calendários compatíveis e aos gates correspondentes.
- [x] `calendario.html` e `calendarios.html` continuam idênticos.
- [x] Aprovação interna pode ser reaberta antes do envio e exige nova revisão da Amanda.
- [x] Estado `liberado` bloqueia edição e não oferece botão de reabertura.
- [x] Corrida Amanda envia × Gabi reabre é resolvida por transação; nenhuma pauta é sobrescrita.
- [x] Nenhuma regra Firestore, Portal, Financeiro, login ou exclusão foi alterada.
- [ ] Escrita autenticada V49 em produção: depende do upload e de um calendário aprovado real ainda não enviado; nenhum registro de produção foi modificado para testar.

---

## 20. ERROS E INTERCEPTAÇÕES — AUDITORIA PÓS-PUBLICAÇÃO V49 (10/08/2026)

### 20.1 “Subi tudo” não foi conferido arquivo por arquivo
**O que fiz:** entreguei um pacote com calendários, regras de trabalho, catálogo, instruções e testes, mas a confirmação pós-upload ficou concentrada nos HTMLs operacionais.
**O que aconteceu:** `calendario.html`, `calendarios.html`, `AGENTS.md` e os dois scripts chegaram à `main`, porém `CATALOGO_DE_ERROS.md` e `LEIA-ME_V49.txt` não existem no repositório. A aplicação funciona, mas parte da proteção contra repetição dos erros ficou somente na cópia local.
**Como o Chris viu:** pediu a varredura completa depois de informar que havia subido tudo.
**Por que passou:** tratei a presença do código principal como confirmação do pacote inteiro, em vez de conferir cada caminho anunciado no README.
**Como consertei:** a auditoria passou a comparar individualmente todos os caminhos do pacote na `main` e no domínio; os arquivos ausentes entram em um complemento separado e verificável.
> **LEI:** “upload concluído” só existe quando cada caminho anunciado no pacote foi consultado na branch de publicação. Verificar o HTML principal não prova scripts, regras, catálogo nem instruções.

### 20.2 Regra publicada e backup do GitHub ficaram em versões diferentes
**O que fiz:** a regra V28 foi preparada e publicada no Firebase, mas o arquivo `firestore.rules` da `main` permaneceu na V24.
**O que poderia acontecer:** uma futura restauração ou comparação a partir do GitHub usaria uma regra antiga, sem Yas e sem as coleções acrescentadas depois, reabrindo falhas de login e autorização já corrigidas.
**Como o Chris viu:** não houve regressão comprovada no Firebase; a divergência apareceu na comparação pós-publicação entre fonte local, GitHub e versão operacional informada.
**Por que passou:** publicar no Console e guardar a mesma fonte no repositório foram tratados como uma única etapa, embora sejam destinos independentes.
**Como consertei:** o complemento inclui a cópia V28 já validada para sincronizar o backup do GitHub. Isso não exige republicar as regras no Firebase e não altera dados.
> **LEI:** toda mudança de regra possui duas provas separadas: versão efetivamente publicada no Firebase e arquivo equivalente versionado no GitHub. Uma não substitui a outra.

## 21. CHECKLIST PÓS-PUBLICAÇÃO V49

- [x] `calendario.html` e `calendarios.html` na `main` têm o mesmo blob Git `935d5ab33b4bac42e97be4a3102e83aedc75162a`.
- [x] Domínio carregado com cache-busting único e espera de 3,5 segundos expõe `2026-08-10-reabrir-antes-envio-v49` nos dois endereços.
- [x] `escritorio.html` publicado preserva `2026-08-10-entrada-pagamento-pessoal-v48` e carregou sem transbordamento horizontal em desktop.
- [x] Preflight aprovado: 9/9 scripts inline, 915 chamadas de UI sem handler órfão e invariantes de login, papéis, privacidade, financeiro e soft-delete preservados.
- [x] Regressão crítica aprovada: 492 asserções, incluindo calendários, gravações, Amanda, Gabi, filmmakers, demandas, clientes, Financeiro e primeiro pagamento.
- [x] Nenhuma regressão de código nova foi encontrada nas correções operacionais de hoje.
- [ ] Escrita real de reabertura V49 não foi executada em produção: alterar calendário de cliente apenas para testar violaria a preservação de dados.
- [ ] `CATALOGO_DE_ERROS.md`, instruções V49 e `firestore.rules` V28 ainda precisam ser confirmados na `main` depois do complemento de auditoria.

---

## 22. ERROS E INTERCEPTAÇÕES — V50 (10/08/2026)

### 22.1 Cofre necessário à operação estava preso à Gerência inteira
**O que fiz:** as credenciais dos clientes eram armazenadas no `cofre_senhas`, mas a única tela e a regra de leitura exigiam sessão de Gerência.
**O que aconteceu:** Cecília precisava das senhas para executar a operação e não tinha uma porta própria; liberar a Gerência inteira teria exposto contratos, financeiro, controles e ações que não pertencem ao papel dela.
**Como o Chris viu:** pediu que Ceci tivesse acesso às senhas já salvas no site.
**Por que passou:** “quem pode abrir a tela” e “quem precisa do dado para trabalhar” foram tratados como a mesma autorização ampla.
**Como consertei:** a V50 cria uma tela exclusiva da Cecília, somente leitura, com revelação por oito segundos. Menu e view são removidos do DOM de outros papéis; criar, alterar e fazer soft-delete continuam guardados no handler e nas regras para Chris/Amanda.
> **LEI:** necessidade operacional concede o menor direito possível sobre o dado, nunca a tela gerencial que por acaso o contém; leitura, escrita e navegação devem ter guardas independentes.

### 22.2 Saída antiga sem competência final continuava parecendo conciliada
**O que fiz:** a V47 passou a exigir o último mês financeiro nas novas saídas, mas registros criados antes dela permaneceram sem o campo e sem um alerta visível.
**O que aconteceu:** Joaquin Assados e Açougue São Joaquim tinham saída em setembro, último pagamento em agosto, mas setembro continuava lançado porque o Financeiro não recebeu `ultimaCompetenciaPagamento`. Dra. Monique possuía `2026-08` e funcionava corretamente.
**Como o Chris viu:** os dois clientes ainda apareciam para pagamento em setembro.
**Por que passou:** o teste provava a transação nova, não auditava documentos legados já programados antes da regra obrigatória.
**Como consertei:** corrigi os dois registros reais pela transação existente, que bloqueia pagamento posterior recebido e cancela somente competências futuras sem apagar histórico. A Central agora marca qualquer saída antiga incompleta como `FINANCEIRO PENDENTE` e oferece “Definir último mês”, em vez de parecer concluída.
> **LEI:** tornar um campo obrigatório corrige novas gravações, não dados antigos; toda mudança de esquema precisa de detecção explícita do legado e estado visível até sua reconciliação segura.

## 23. CHECKLIST EXECUTADO NA V50

- [x] Cofre da Cecília é somente leitura no HTML, handlers e Firestore Rules.
- [x] Item e view do cofre não permanecem no DOM de Chris, Amanda, Gabi, editores ou filmmakers.
- [x] Cecília não recebeu Gerência, contratos, mensalidades ou Financeiro.
- [x] Falha de leitura do cofre aparece como indisponibilidade; nunca vira lista vazia falsa.
- [x] Joaquin Assados e Açougue São Joaquim foram conferidos em produção: saída 15/09/2026 e competência final corrigida para 2026-08.
- [x] A transação recusaria a correção se setembro já estivesse pago; os dois salvamentos concluíram sem apagar documentos.
- [x] Competências posteriores ficam canceladas por soft-delete lógico e deixam de entrar nos totais/cobrança.
- [x] Saída legada sem competência final fica vermelha e não pode ser confundida com uma conciliação pronta.
- [ ] Regra V29 e HTML V50 dependem do upload/publicação manual do Chris; o acesso da Cecília não funciona antes dos dois destinos estarem atualizados.

---

## 24. ERROS E INTERCEPTAÇÕES — V51 (10/08/2026)

### 24.1 Calendário legado oferecia um envio que a própria trava recusava
**O que fiz:** a V49 passou a considerar todo estado `liberado` imutável, inclusive o `liberado` implícito de calendários antigos que nunca haviam recebido um status formal.
**O que aconteceu:** a Gabi via “Enviar pra aprovação interna”, mas o primeiro `if` do handler interrompia a ação e mostrava a mensagem de calendário já enviado. A fila da Amanda nunca recebia esse mês.
**Como o Chris viu:** Gabi deixou de conseguir finalizar/enviar calendários, embora o botão ainda estivesse presente.
**Por que passou:** o teste cobria rascunho novo e calendário explicitamente liberado, mas não o estado compatível “legado sem status”, que visualmente compartilha o rótulo `liberado`.
**Como consertei:** somente a ausência comprovada de qualquer status explícito pode atravessar a trava para entrar em `aguardando_interna`, com confirmação de que a visibilidade do cliente será temporariamente suspensa. Um calendário com `liberado` gravado continua bloqueado.
> **LEI:** estado implícito de compatibilidade e estado explícito de negócio nunca podem compartilhar cegamente a mesma guarda; todo botão renderizado precisa ter pelo menos um teste que prove que seu handler aceita exatamente aquele estado.

### 24.2 Acompanhamento misturava o estado do mês atual com totais de outros meses
**O que fiz:** a Visão do mês calculava o estado pelo mês mais recente, mas contava `cal.items` inteiro, somando conteúdos de competências anteriores.
**O que acontecia:** Amanda e Gabi podiam ver um calendário como “agosto” com totais de julho + agosto, impedindo saber quantos roteiros realmente estavam prontos ou faltando no ciclo atual.
**Como o Chris viu:** pediu acompanhamento compartilhado e em tempo real de roteiros por calendário.
**Por que passou:** a tela já exibia totais e status, mas não havia teste que exigisse que ambos fossem calculados sobre o mesmo recorte mensal.
**Como consertei:** status, conteúdos, roteiros, legendas, referências, gravações e publicações agora usam o mesmo `mesAtual` e `itensDoMesCalendario`. O detalhe editorial só existe no DOM de Amanda e Gabi e ambas usam o listener central de calendários.
> **LEI:** todo painel temporal calcula rótulo, numerador e denominador a partir do mesmo recorte; misturar estado mensal com coleção histórica produz um número plausível e falso.

### 24.3 Check de Stories parecia ausente e usava identidade derivada do nome
**O que fiz:** o checklist lia cada cliente em sequência e criava o ID semanal recalculando o nome visível, ignorando o slug estável já carregado.
**O que acontecia:** em rede móvel o controle permanecia vários segundos como “Carregando”; o botão não parecia um check e uma alteração no nome podia abrir outro documento, fazendo a marca anterior desaparecer. Falhas de gravação não tinham retorno claro.
**Como o Chris viu:** Gabi disse que nunca conseguia marcar/ver o verificado no acompanhamento de Stories.
**Por que passou:** a verificação anterior confirmou que a seção existia no código, não mediu seu estado de carregamento nem provou a persistência da ação.
**Como consertei:** leituras independentes são paralelas, o ID usa `c.id/c.slug`, o controle mostra `☐/☑` e autoria, e só confirma depois de `setDoc`; erro mantém o botão disponível e informa que nada foi marcado. O handler também recusa papéis diferentes da Gabi.
> **LEI:** presença tardia no DOM não prova que uma ação está operacional; controles críticos precisam de identidade estável, estado visível de carregamento, confirmação após persistência e falha fechada testada.

## 25. CHECKLIST EXECUTADO NA V51

- [x] Calendário legado sem status entra em `aguardando_interna` e chega à fonte única da fila da Amanda.
- [x] Calendário explicitamente `liberado` permanece travado e não pode voltar silenciosamente à revisão.
- [x] `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.
- [x] Painel de roteiros conta somente o mês mais recente e usa a mesma fonte de estado da aprovação.
- [x] Detalhes de roteiro/legenda/referência existem no DOM somente para Amanda e Gabi.
- [x] Gabi passa a receber o listener compartilhado; filmmakers continuam sem assinatura da coleção inteira.
- [x] Stories carregam em paralelo, usam slug estável e exibem check grande, autoria e falha de gravação.
- [x] O check de Stories é gravável somente pela Gabi no handler; nenhuma ação financeira, de login ou de cliente foi alterada.
- [ ] Escritas autenticadas em produção não foram executadas: enviar calendário real ou marcar Story real apenas para teste alteraria dados operacionais.

---

## 26. ERROS E INTERCEPTAÇÕES — V52 (10/08/2026)

### 26.1 Stories esperava verificações sem relação antes de existir no DOM
**O que fiz:** a V51 acelerou as leituras dos próprios Stories, mas o bloco só era criado depois de `autoVerificarChecklist()` e `calcularStreak()` terminarem.
**O que aconteceu:** no domínio publicado, o check correto levou 11,6 segundos para aparecer. A função existia e gravava, porém a Gabi continuava podendo interpretar a espera como ausência da opção.
**Como o Chris viu:** pediu a verificação após publicar; o teste cronometrado no perfil da Gabi revelou a demora residual.
**Por que passou:** o sandbox provava renderização e gravação isoladas, mas não a ordem completa de inicialização de `abrirChecklist()`.
**Como consertei:** o nó `storiesDiariosBox` nasce e começa a carregar antes da auto-verificação. Quando o checklist geral termina, o mesmo nó é movido para sua posição final, sem segunda leitura nem perda de estado.
> **LEI:** otimizar a função final não resolve uma espera causada por etapas anteriores; teste de UI crítica mede desde o clique do usuário até o primeiro controle acionável e registra dependências que não podem bloquear esse caminho.

## 27. CHECKLIST EXECUTADO NA V52

- [x] A V51 foi confirmada na `main` e no domínio com cache-busting e espera de 3,5 segundos.
- [x] Em auditoria publicada como Gabi, o painel editorial apareceu no DOM, visível, com 16 cartões de clientes.
- [x] O check de Stories apareceu com `☐`, `aria-pressed` e texto “clique para marcar”; nenhuma escrita real foi executada.
- [x] A demora observada de 11,6 segundos foi tratada como falha, não como sucesso.
- [x] V52 cria Stories antes de `await autoVerificarChecklist()` e preserva o mesmo nó ao concluir o restante.
- [x] Calendários, aprovação, papéis, login, Firestore, financeiro e soft-delete permanecem cobertos pela suíte completa.
- [ ] V52 depende de novo upload manual; o domínio continua em V51 até essa publicação.

---

## 28. ERROS E INTERCEPTAÇÕES — V53 (11/08/2026)

### 28.1 O link de Story parava no escritório e nunca chegava ao Portal
**O que existia:** Gabi salvava os documentos diários em `stories_links`, enquanto o Portal lia somente `stories_semanais`; as regras também classificavam `stories_links` como coleção exclusiva da equipe.
**O que aconteceu:** a equipe via link salvo, mas o cliente não tinha caminho de leitura. Era a mesma família já registrada em 29/07: um lado da cadeia mudou e a ponta do cliente ficou na fonte antiga.
**Como consertei:** o link alterado entra em revisão da Amanda; a tela dela mostra os documentos e permite liberar/devolver. O Portal lê somente o documento determinístico do próprio cliente e semana e só renderiza quando `revisaoInterna=liberado` e `liberadoCliente=true`. A regra Firestore exige os mesmos campos e o mesmo cliente da sessão.
> **LEI:** conteúdo destinado ao cliente precisa de prova ponta a ponta — escritor, revisão, regra e leitor do Portal. “Salvo pela equipe” nunca prova “visível ao cliente”.

### 28.2 Aviso de choque usava consulta seguida de criação não atômica
**O que existia:** duas abas podiam consultar `chaveChoque`, ambas encontrar vazio e criar documentos diferentes. A limpeza fazia soft-cancel, mas a lista operacional continuava exibindo status iniciados por `cancelad`.
**O que aconteceu:** Cecília recebeu duas demandas iguais da Dra Júlia, como no registro de 11/08.
**Como consertei:** novos avisos usam ID determinístico derivado da chave e transação; a consulta antiga permanece só para compatibilidade. Demandas canceladas deixam de ser operacionais em todas as telas que usam o filtro central, sem apagar histórico.
> **LEI:** alerta único por fato de negócio exige chave estável e escrita atômica; consulta antes de `addDoc` não impede corrida. Soft-cancelado nunca permanece em fila ativa.

### 28.3 Campanha detectada perdia a data completa
**O que existia:** a janela de campanhas guardava somente `mes` e `day`, ignorando `dataPostagem`, e mostrava “dia N” fora de uma data completa. Itens manuais e detectados também podiam aparecer repetidos.
**Como consertei:** a data segue prioridade `dataPostagem` válida → mês real do item + dia validado; o quadro mostra DD/MM/AAAA, sinaliza data ausente, coloca a pauta detectada no calendário mensal e deduplica contra a postagem estruturada por cliente+título+data, sem copiar ou migrar dados.
> **LEI:** toda data operacional precisa carregar competência e dia validados; nunca exiba um número de dia desacoplado do mês real. Uma janela compatível deduplica, mas não cria terceira verdade.

### 28.4 Painel editorial somava conteúdo arquivado e priorizava número gigante
**O que existia:** a tela já recortava o mês, mas ainda aceitava itens `excluido:true` no denominador e destacava totais globais de roteiros, difíceis de relacionar a um cliente.
**Como consertei:** itens arquivados são retirados de todas as contagens. O resumo passa a contar calendários completos, em andamento e sem roteiro; cada cliente explica “X de Y” e quantos faltam, com legenda e referência como informação secundária.
> **LEI:** acompanhamento editorial é por cliente e competência; agregado só pode resumir estados comparáveis. Item em soft-delete fica no histórico, nunca no trabalho em aberto.

## 29. CHECKLIST EXECUTADO NA V53

- [x] Link de Story alterado volta para revisão; Amanda/Chris têm handlers explícitos de liberar e devolver.
- [x] Portal consulta apenas `{cliente}_{semana}` e não lista links de outros clientes.
- [x] Firestore condiciona leitura do cliente ao slug da sessão e à liberação explícita.
- [x] Choque de data usa transação e documento determinístico; status cancelado é filtrado centralmente.
- [x] Campanhas mostram data completa validada e são deduplicadas sem nova escrita.
- [x] Painel editorial ignora itens arquivados e mostra progresso por calendário.
- [ ] Liberação real de links existentes e gravação de alertas não foram executadas em produção: isso alteraria operação real antes do upload e da conferência da Amanda.

---

## 30. ERROS E INTERCEPTAÇÕES — V54 (11/08/2026)

### 30.1 Posição na grade editorial virou data fixa de publicação
**O que existia:** o alerta da Cecília agrupava itens por `mes + day`. Esse par organiza a pauta no calendário, mas não significa que o post precisa sair naquela data.
**O que aconteceu:** Cookiery e Dra. Júlia geraram demandas de “dois conteúdos no mesmo dia” mesmo quando eram conteúdos comuns que poderiam andar conforme gravação, edição e aprovação.
**Como foi confirmado:** no áudio, a Cecília explicou que somente campanhas e datas comemorativas precisam de publicação fixa; o código confirmou que `avisarChoqueDeData()` não consultava `dataPostagem` nem `dataFlexivel`.
**Como consertei:** conflitos agora usam apenas `dataPostagem` válida de itens ativos e não flexíveis. A grade ganhou rótulo explícito de ordem editorial. Avisos ativos baseados na regra antiga são marcados `cancelado_automaticamente` e `excluido:true`, com causa preservada.
> **LEI:** `day` da grade nunca é compromisso de publicação. Só `dataPostagem` válida e não flexível pode gerar alerta de conflito; limpeza de alerta operacional é soft-delete.

### 30.2 Caixa da agência apareceu como total de mensalidades pagas
**O que existia:** o primeiro número verde do Financeiro mostrava `totalEntrou` no caixa da agência (R$ 5.800 no registro), enquanto Mensalidades mostrava `quitadoMensal` (R$ 8.300). Valores recebidos na conta pessoal são corretamente excluídos do caixa, mas o destaque induzia a leitura de que apenas R$ 5.800 em clientes haviam pago.
**O que aconteceu:** o número verde parecia errado pela quantidade de clientes quitados, e doze cartões misturavam caixa, composição, previsão, folha e comparação histórica.
**Como consertei:** o destaque verde agora usa exatamente a fonte canônica das competências pagas e informa também a quantidade de clientes. Caixa da agência continua separado. O topo foi reduzido a quatro indicadores do mês: mensalidades pagas, mensalidades em aberto, caixa da agência e extras a pagar. Evolução de seis meses e concentração foram removidas desta tela; composição fica recolhida.
> **LEI:** “mensalidades pagas” e “caixa da agência” são métricas diferentes e devem aparecer com fontes e rótulos distintos. O resumo mensal tem no máximo quatro indicadores acionáveis ou decisórios.

## 31. CHECKLIST EXECUTADO NA V54

- [x] Conteúdo comum com `day` igual e sem `dataPostagem` não gera conflito.
- [x] Data flexível, inválida ou item em soft-delete não gera conflito.
- [x] Duas campanhas ativas com a mesma `dataPostagem` fixa continuam gerando um único alerta determinístico.
- [x] Aviso antigo sem conflito válido é soft-cancelado; nenhum `deleteDoc` foi introduzido.
- [x] `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.
- [x] Financeiro usa a mesma soma de competências pagas exibida em Mensalidades e mantém o caixa da agência separado.
- [x] O resumo principal do Financeiro contém exatamente quatro cartões e não exibe evolução/concentração histórica.
- [ ] A limpeza dos alertas antigos depende da V54 publicada e da próxima execução autenticada do motor; nenhum dado de produção foi alterado durante o teste local.

---

## 32. ERRO E INTERCEPTAÇÃO — V55 (11/08/2026)

### 32.1 Alias financeiro retirou a Zeiss da operação da Gabi
**O que existia:** a deduplicação apontava `zeiss` para `zeens`, apesar de contrato/mensalidades usarem o nome legado e calendário, vídeos e extras usarem `zeiss`. Ao arquivar o cadastro extra duplicado, nenhum dos dois slugs permaneceu na carteira operacional.
**O que aconteceu:** Zeiss e todo o trabalho construído pela Gabi deixaram de aparecer nas listas. O calendário não foi comprovado como apagado; ficou órfão do seletor que o tornava acessível.
**Como consertei:** `zeiss` passou a ser a identidade canônica e entrou na carteira-base. `zeens` e `otica-visao-araucaria` viraram aliases de leitura. Listas, placares, links e abertura do editor resolvem o documento existente, inclusive quando o conteúdo está somente no alias legado, sem recriar ou sobrescrever dados. A fusão bloqueia a tentativa de arquivar o destino canônico.
> **LEI:** canonicalização precisa seguir a identidade operacional que possui o conteúdo. Antes de arquivar duplicata, teste lista, calendário, Portal, vídeos, contrato e mensalidade; alias arquivado nunca pode ser a única fonte que mantém um cliente visível.

## 33. CHECKLIST EXECUTADO NA V55

- [x] Zeiss permanece na carteira mesmo se o cadastro extra legado estiver arquivado.
- [x] Calendário preenchido sob `zeens` continua abrindo como Zeiss quando o canônico está ausente ou vazio.
- [x] Um calendário canônico preenchido nunca é substituído automaticamente por conteúdo legado do alias.
- [x] Contratos/mensalidades `zeens` continuam pertencendo financeiramente à Zeiss sem duplicar totais.
- [x] Abrir, copiar link e visualizar o placar resolvem o documento real sem criar cópia.
- [x] A fusão bloqueia a direção que arquivaria o destino canônico.
- [ ] A presença exata do conteúdo da Zeiss no Firestore não foi alterada nem inferida por escrita: a V55 recupera a leitura do documento existente e requer confirmação visual da Gabi após publicação.

---

## 34. ERROS E INTERCEPTAÇÕES — V56 (11/08/2026)

### 34.1 Alteração de contrato reescrevia a competência já aberta
**O que existia:** `valorVigente` era um único número. A ficha geral e o contrato podiam substituí-lo imediatamente, e a ficha ainda atualizava toda mensalidade futura não paga sem uma competência formal de início.
**Risco:** ao registrar o novo formato da Vitalle, agosto poderia passar de R$ 1.700 para R$ 1.000 retroativamente, alterando previsto, aberto e comparações já iniciadas.
**Como consertei:** o contrato ganhou `valorProgramado`, `valorProgramadoEm`, motivo, autoria e histórico. `valorContratoNaCompetencia()` mantém o valor vigente antes da competência escolhida e aplica o novo valor nela e nas seguintes. Cobranças futuras já criadas são ajustadas apenas se abertas ou isentas; pagas e canceladas não mudam.
> **LEI:** alteração comercial tem competência de vigência explícita. Nunca edite valor histórico, competência aberta ou pagamento confirmado para representar um acordo futuro.

### 34.2 Ficha geral mantinha um segundo escritor de valor financeiro
**O que existia:** “Clientes — entrada e saída” também gravava `valorVigente` e `valorDevido`, concorrendo com a aba Contratos.
**Risco:** uma atualização cadastral posterior podia desfazer silenciosamente a programação financeira correta.
**Como consertei:** o valor na ficha geral virou leitura. Ela continua atualizando plano, vencimento, cortesia e dados operacionais, mas mudanças de mensalidade ficam exclusivamente em Contratos.
> **LEI:** dado financeiro crítico tem uma única porta de escrita. Uma tela cadastral não pode sobrescrever a regra temporal do contrato.

## 35. CHECKLIST EXECUTADO NA V56

- [x] R$ 1.700 continua valendo em 2026-08 e R$ 1.000 passa a valer em 2026-09 e nas competências seguintes no sandbox.
- [x] Virada de dezembro para janeiro é calculada corretamente.
- [x] Cobrança futura aberta ou isenta recebe o valor programado; pagamento confirmado e mês anterior permanecem intactos.
- [x] Financeiro sinaliza mudanças vigentes ou do mês seguinte sem criar um quinto indicador no resumo.
- [x] Contrato registra motivo, autoria e histórico da programação.
- [x] A ficha geral não grava mais `valorVigente` nem `valorDevido`.
- [ ] A programação real da Vitalle não foi gravada no Firestore durante o teste local; após o upload, Chris deve confirmar R$ 1.000 com início em 2026-09 na aba Contratos.

---

## 36. ERROS E INTERCEPTAÇÕES — V57 (11/08/2026)

### 36.1 O próprio autosave impedia a Gabi de enviar o calendário
**O que existia:** o envio para a Amanda reutilizava a trava de versão da edição comum. Quando o `onSnapshot` ainda não tinha refletido o eco do autosave, o carimbo remoto mudava e a transição formal era classificada como conflito, mesmo com conteúdo idêntico.
**O que acontecia:** a Gabi via o botão, o calendário estava salvo, mas “Enviar pra aprovação interna” voltava ao estado anterior e não confirmava a fila da Amanda.
**Como consertei:** a transição formal compara a assinatura do conteúdo sem campos de aprovação. Só o eco idêntico pode passar; conteúdo realmente alterado em outra aba ou decisão mais nova da Amanda continua bloqueado.
> **LEI:** transição de workflow não pode ser recusada apenas pelo eco do próprio autosave. A exceção exige conteúdo idêntico e nunca pode vencer edição concorrente nem decisão posterior.

### 36.2 Cobrança cancelada continuava aparecendo como mensalidade operacional
**O que existia:** a saída cancelava competências posteriores por soft-delete financeiro, mas `renderMensalidades()` recolocava todo documento daquela competência no mapa, inclusive `status=cancelado` e competência posterior a `ultimaCompetenciaPagamento`.
**O que acontecia:** Joaquin Assados e Açougue São Joaquim, com último mês financeiro em agosto, ainda podiam aparecer na grade de setembro.
**Como consertei:** a grade operacional ignora cancelados e aplica a vigência histórica do contrato. Agosto permanece consultável; setembro e meses posteriores ficam apenas no histórico/arquivo.
> **LEI:** preservar documento financeiro não significa exibi-lo como obrigação ativa. `cancelado` e competência fora da vigência ficam no arquivo, nunca em grade, régua, contador ou cobrança operacional.

### 36.3 A Gerência prometia avaliação, mas o Portal não tinha como enviá-la
**O que existia:** o Escritório lia `avaliacoes_clientes`, porém não havia aba nem escritor no Portal; as regras permitiam a coleção somente à equipe.
**O que acontecia:** o texto indicava que o cliente avaliaria no Portal, mas a funcionalidade não existia para ele, exatamente como a Amanda relatou no áudio.
**Como consertei:** o Portal ganhou “Avaliar a Get Started”, com nota de 1 a 5 e comentário. Há um documento determinístico por cliente e mês, permitindo atualização sem duplicar. As regras limitam leitura e escrita ao slug da própria sessão e proíbem exclusão física.
> **LEI:** qualquer recurso prometido ao cliente precisa fechar quatro pontos na mesma entrega: entrada visível no Portal, escritor, regra isolada e leitor da equipe. Um painel interno sem caminho do cliente é funcionalidade inexistente.

### 36.4 Cancelar uma saída precisa restaurar a cadeia inteira
**Estado real encontrado:** Dra. Monique estava programada para sair em 31/08/2026, último mês financeiro 2026-08.
**Ação executada:** a saída foi cancelada pela transação oficial; ela voltou a `ATIVO`, com contrato, Portal, calendário e cobranças futuras recuperados. O registro de saída ficou preservado como cancelado, sem exclusão física.
> **LEI:** desistência de saída usa somente a rotina de reativação transacional. Nunca reativar apenas o cartão visual ou editar documentos isolados no console.

## 37. CHECKLIST EXECUTADO NA V57

- [x] Eco idêntico do autosave permite envio formal da Gabi.
- [x] Edição concorrente, envio comum e decisão posterior da Amanda continuam bloqueados.
- [x] Calendários singular e plural permanecem byte a byte idênticos.
- [x] Mensalidade cancelada ou posterior ao último mês não aparece na grade operacional; competência histórica válida permanece.
- [x] Portal contém a nova entrada de avaliação e navega para um painel próprio.
- [x] Regra de avaliação exige sessão do próprio cliente, nota de 1 a 5 e `delete:false`.
- [x] Monique foi confirmada no sistema publicado como `ATIVO` depois do cancelamento oficial da saída.
- [x] Preflight aprovado e regressão crítica aprovada com 529 asserções.
- [ ] A gravação real de uma avaliação não foi executada: depende da publicação das novas regras e criaria um feedback real de cliente.
- [ ] O envio de um calendário real da Gabi não foi disparado no teste: o sandbox validou a transição sem alterar calendário de produção.

---

## 38. ERRO INTERCEPTADO NA VERIFICAÇÃO PUBLICADA — V58 (11/08/2026)

### 38.1 Leitura direta de avaliação inexistente bloqueava o primeiro envio
**O que existia:** o Portal fazia `getDoc()` no documento determinístico antes de mostrar o formulário. Na primeira avaliação esse documento ainda não existe; por segurança, a regra não possui `resource.data.cliente` para provar a propriedade e recusa a leitura.
**O que acontecia:** a aba aparecia, mas mostrava “Não consegui carregar sua avaliação agora” para o cliente que ainda nunca avaliou.
**Como consertei:** a carga passou a consultar `avaliacoes_clientes` com `where('cliente','==',clienteAtual.slug)`. A consulta segura pode retornar zero documentos e então exibir o formulário de primeiro envio. A gravação continua no ID determinístico e leitura de outro cliente continua proibida.
> **LEI:** formulário de criação não pode depender da leitura autorizada de um recurso que ainda não existe. Quando a autorização depende de campos do recurso, o estado vazio deve ser obtido por consulta restrita à identidade da sessão ou por outra prova segura — nunca ampliando `allow get`.

## 39. CHECKLIST EXECUTADO NA V58

- [x] V57 confirmada na `main` e no domínio com cache-busting e espera de inicialização.
- [x] Portal real abriu com sessão válida e exibiu a entrada de avaliação.
- [x] Falha do primeiro carregamento foi reproduzida antes da correção, sem gravar dados.
- [x] Carregamento corrigido não usa `getDoc()` de documento inexistente.
- [x] Consulta exige `where` pelo slug do próprio cliente; regras não foram ampliadas.
- [ ] Envio real de uma avaliação permanece não executado, pois criaria feedback em nome do cliente.

---

## 40. ERROS E INTERCEPTAÇÕES — V59 (12/08/2026)

### 40.1 Status global de um mês moderno contaminava o mês legado
**Reprodução real:** o calendário do Mochi continha julho (1 item), agosto (4) e setembro (24). Depois de a Gabi enviar setembro em 10/08 às 16:55, julho passou a mostrar o mesmo estado, a mesma autora e o mesmo horário de “esperando aprovação”.
**Causa:** o envio escrevia corretamente `aprovacaoMeses['2026-09']`, mas também substituía sempre `aprovacaoInterna`. Os leitores usavam esse campo global como fallback do mês legado sem conferir `aprovacaoInterna.mes`.
**Como consertei:** mês moderno grava somente seu mapa; o campo antigo acompanha apenas o mês legado. Editor, fila da Amanda e Portal só aceitam o global quando a marca declara a mesma competência ou quando o documento é realmente antigo, sem mapa mensal.
> **LEI:** em documento multicompetência, fallback legado precisa provar a competência. Nunca espelhar ou consumir estado global de setembro como estado de julho.

Como segunda barreira, mês anterior permanece consultável, mas o editor não oferece nem aceita “Enviar para aprovação” nele. O histórico continua intacto e não volta à operação por clique acidental.

### 40.2 Abrir Stories tentava gravar dados seed e podia mostrar lista vazia
**Reprodução real:** na auditoria como Gabi, “Fazer stories do cliente” mostrou “Nenhum cliente com story ainda”, embora Vitalle e Juliane façam parte da configuração conhecida.
**Causa:** `carregarClientesDeStory()` misturava leitura com bootstrap de escrita. Em modo somente leitura, cota ou permissão parcial, a própria abertura da tela podia falhar antes de montar a lista.
**Como consertei:** os seeds viraram fallback somente em memória; documentos reais sempre prevalecem, inclusive `ativo:false`. Falha de leitura agora aparece como indisponibilidade e nunca como zero clientes.
> **LEI:** leitura de tela não cria configuração. Falha do Firestore nunca pode virar coleção vazia nem apagar visualmente um contrato conhecido.

## 41. CHECKLIST EXECUTADO NA V59

- [x] Cenário exato julho legado + setembro enviado gera uma única linha de revisão para setembro.
- [x] Julho sem estado mensal explícito não herda mais autor/horário/status de setembro.
- [x] Portal do Cliente usa a mesma compatibilidade por competência.
- [x] Amanda, Cecília e filmmakers continuam consumindo os itens pelo mês da sessão; nenhum item foi removido ou migrado.
- [x] Abrir Stories não contém `setDoc` e mantém Vitalle/Juliane como fallback quando a coleção está vazia.
- [x] Calendários singular e plural permanecem byte a byte idênticos.
- [ ] Estados incorretos já exibidos são corrigidos por leitura na V59; nenhuma gravação automática foi feita em produção.
- [ ] A confirmação visual pelo cliente Vitalle continua dependente de abrir o link privado dele após a publicação; a auditoria não publicou nem aprovou Stories em nome do cliente.

---

## 42. ERRO DE DIAGNÓSTICO APÓS A V59 (12/08/2026)

### 42.1 Confundi cliente conhecido com cliente operacional ativo de Stories
**O que fiz:** tratei Vitalle e Juliane como fallback conhecido em memória e considerei isso suficiente para afirmar que a tela voltaria a oferecer os dois clientes.
**O que aconteceu:** os documentos reais de `stories_clientes` continuaram prevalecendo, como deveriam. Quando o registro persistido estava inativo ou incoerente, ele anulava corretamente o fallback, e a tela publicada continuava em “Nenhum cliente com story ainda”.
**Como o Chris viu:** o Portal da Vitalle continuou vazio e a auditoria real da Gabi confirmou que Vitalle aparecia somente entre os clientes que poderiam ser adicionados, não entre os clientes ativos de Stories.
**Por que passou:** o teste automático cobria coleção vazia e renderização do fallback, mas não cobria o estado real mais importante: documento existente com `ativo:false`, Story semanal inexistente e link ainda não liberado. Eu também usei presença do nome no HTML como evidência, sem provar em qual lista ele aparecia.
**Como deve ser corrigido:** a ativação contratual precisa ter uma fonte canônica e a interface deve distinguir explicitamente `contratado`, `inativo`, `aguardando Amanda` e `liberado ao cliente`. A validação deve percorrer o registro do cliente, a criação semanal, a revisão da Amanda e a leitura do Portal na mesma competência.
> **LEI:** nome presente na página não prova disponibilidade operacional. Para declarar um fluxo de publicação resolvido, prove a mesma chave de cliente e semana nos quatro elos: configuração ativa → conteúdo salvo → revisão/liberação → Portal.

### 42.2 Teste estrutural aceitou um fluxo sem dado real
**O que fiz:** o gate da V59 verificava que `carregarClientesDeStory()` tinha fallback e que o Portal filtrava por cliente/semana, mas não exigia um cenário integrado com documento real inativo, reativação e conteúdo aguardando revisão.
**O que aconteceu:** 534 asserções passaram e, mesmo assim, a jornada real da Vitalle permaneceu vazia.
**Como consertei o processo:** o teste de regressão passa a ter estados explícitos por semana e cliente e não aprova a área somente por marcador, texto ou função existente. A verificação publicada precisa abrir a tela da Gabi e confirmar a seção operacional, não a lista geral de cadastro.
> **LEI:** teste de fluxo precisa conter o estado que causou o incidente. Sintaxe, marcador de versão e presença nominal são pré-condições; nunca são prova de ponta a ponta.

## 43. CHECKLIST OBRIGATÓRIO PARA STORIES APÓS A V59

- [ ] O contrato/ficha e `stories_clientes` concordam sobre `incluiStories` e `ativo`.
- [ ] Gabi enxerga o cliente no bloco “Escolhe o cliente”, não apenas no seletor “Adicionar”.
- [ ] A semana consultada é a mesma em `stories_semanais`, `stories_links`, aprovação da Amanda e Portal.
- [ ] Conteúdo salvo aparece para a Gabi antes de qualquer aprovação; falha de leitura não vira zero.
- [ ] `aguardando_interna` aparece para Amanda e continua invisível ao cliente.
- [ ] Somente `liberadoCliente:true`/revisão liberada aparece no Portal do mesmo slug.
- [ ] Documento inativo não é reativado por fallback silencioso; divergência contratual aparece para gestão corrigir.
- [ ] A prova publicada identifica o bloco/estado onde o nome aparece e registra a contagem real da semana.

## 44. DIAGNÓSTICO E CORREÇÃO — V60 (12/08/2026)

### 44.1 A ficha real da Vitalle estava com Stories desativados
**Prova publicada:** a Central de Clientes mostrou `Vitalle Odonto · Stories: não`; na auditoria da Gabi, o cliente aparecia somente no seletor de adicionar, com zero clientes ativos, zero Stories semanais e zero links na semana de 10/08.
**Causa:** `stories_clientes/vitalle-odonto` estava inativo. O Portal estava correto ao não mostrar material inexistente ou não liberado.
**Correção de dado:** usei a própria tela oficial da Central de Clientes, no perfil Chris, para marcar Stories como incluídos. A transação atualizou a ficha e reativou `stories_clientes` sem criar conteúdo, aprovar em nome da Amanda ou apagar histórico.
**Resultado real:** a Central confirmou `Stories: sim` e a auditoria da Gabi passou a exibir Vitalle no bloco operacional. O contador da semana permaneceu zero, provando que nenhum Story foi inventado e que a Gabi ainda precisa enviar o material real.
> **LEI:** correção de configuração não pode fabricar conteúdo. Primeiro reative o contrato pela porta oficial; depois mostre claramente se o material não foi criado, aguarda Amanda ou já chegou ao Portal.

### 44.2 Seeds em código eram uma segunda verdade sobre contrato
**O que existia:** uma constante dizia que Vitalle e Juliane possuíam Stories, enquanto a ficha e `stories_clientes` podiam dizer o contrário.
**Como consertei:** a lista operacional passa a vir somente de `stories_clientes`. A Central continua sendo a porta oficial para Amanda/Chris ativarem ou desativarem o serviço e sincroniza ficha + coleção na mesma transação.
> **LEI:** contrato ativo não pode ser inferido por lista fixa no HTML. Fallback pode preservar leitura legada, mas nunca contradizer uma decisão persistida nem simular serviço contratado.

### 44.3 O bloco “desta semana” misturava clientes
**O que existia:** mesmo depois de escolher um cliente no topo, `daSemana` filtrava apenas a semana e reunia Stories de todos os clientes. Com vários contratos ativos, a Gabi poderia enxergar conteúdo de outro cliente no bloco da Vitalle.
**Como consertei:** a seleção agora é revalidada contra a lista ativa e o histórico semanal/legado é filtrado por `cliente + semana`. O painel de diagnóstico geral continua separado e pode resumir todos sem misturar o conteúdo editável.
> **LEI:** seletor de cliente precisa governar toda leitura abaixo dele. Filtrar somente por período em tela nominal produz vazamento operacional entre clientes, mesmo dentro da equipe.

## 45. CHECKLIST EXECUTADO NA V60

- [x] Catálogo atualizado antes da correção do código.
- [x] Vitalle confirmada como mensalista ativa com `Stories: não` antes da correção.
- [x] Ativação feita pela transação oficial da Central; nenhuma escrita direta no console.
- [x] Vitalle confirmada com `Stories: sim` na Central e visível no bloco operacional da Gabi.
- [x] Semana de 10/08 continua com zero conteúdo e zero link; nenhum dado fictício foi criado.
- [x] Tela da equipe distingue `não criado`, `aguardando Amanda`, `ajuste` e `liberado no Portal` pela mesma chave cliente+semana.
- [x] O conteúdo detalhado da semana é filtrado pela seleção de cliente e não mistura outras empresas.
- [x] Portal explica que conteúdo vazio ainda depende de preparação e revisão, sem acusar perda.
- [x] Seed fixo de contrato removido; `stories_clientes` é a fonte única operacional.
- [ ] O Story real da semana ainda precisa ser montado ou ter os links colados pela Gabi e depois liberado pela Amanda. O sistema não pode fabricar esse trabalho.

---

## 46. ERRO DE VALIDAÇÃO REPETIDO — PORTAL DO CLIENTE (12/08/2026)

### 46.1 Validei a cadeia interna, mas chamei isso de teste do Portal
**O que fiz:** confirmei a configuração da Vitalle na Central, entrei em auditoria como Gabi e Amanda, contei Stories e links e validei o HTML público sem sessão. Depois tratei essas provas como se o cliente tivesse usado o próprio Portal.
**O que faltou:** abrir o link privado vigente pela porta oficial, entrar como o cliente, percorrer cada aba visível, conferir estados cheio/vazio/erro, navegar entre semanas e validar o conteúdo efetivamente liberado. Um Portal sem token só prova carregamento público e isolamento; não prova a experiência autenticada.
**Por que o Chris precisou pedir pela terceira vez:** eu respondi à pergunta “por que a semana está vazia?” e parei quando a causa interna ficou demonstrada. Não executei o requisito maior já explícito: agir como o cliente e conferir o produto inteiro que ele usa.
> **LEI:** validar Gabi + Amanda + HTML público não equivale a validar o Portal. A aprovação ponta a ponta exige link privado vigente aberto pela interface oficial, sessão do cliente confirmada, todas as abas visíveis percorridas e ausência de escrita operacional durante a auditoria.

### 46.2 Confundi vazio da semana atual com ausência total de conteúdo
**O que fiz:** inicialmente informei apenas que a semana 10/08–14/08 tinha zero conteúdo.
**O que ainda precisava ser provado:** ao navegar para 03/08–07/08, encontrei 1 Story da Vitalle com estado `liberado_portal`. Isso demonstrou que o histórico não havia sumido e que o vazio era restrito à semana atual.
> **LEI:** qualquer diagnóstico semanal precisa comparar ao menos a competência anterior preservada. “Zero nesta semana” nunca pode ser resumido como “cliente sem conteúdo” sem verificar o histórico.

### 46.3 Teste automatizado não substitui inspeção visual autenticada
**O que aconteceu:** preflight e 537 asserções passaram, mas nenhum deles prova ordem das abas, clareza dos textos, botões visíveis, conteúdo cortado no celular ou coerência entre áreas para um cliente real.
**Correção de processo:** a matriz do Portal passa a registrar, por cliente e aba: visibilidade real no DOM, carregamento concluído, conteúdo ou vazio explicado, ausência de erro, isolamento de identidade, ação disponível e comportamento móvel.
> **LEI:** testes de código são gates obrigatórios, não certificado de usabilidade. Portal em produção exige inspeção autenticada e responsiva com evidência por aba.

## 47. CHECKLIST OBRIGATÓRIO — AUDITORIA REAL DO PORTAL

- [ ] Abrir cada Portal exclusivamente pelo botão oficial da Central; não copiar, imprimir ou expor token.
- [ ] Confirmar no cabeçalho que o slug/nome pertence ao cliente esperado.
- [ ] Registrar `Array.from(document.querySelectorAll(...)).filter(n => n.offsetParent !== null)` para as abas realmente visíveis.
- [ ] Abrir cada aba visível e classificar: carregou com dados, vazio legítimo explicado, erro de leitura ou ação quebrada.
- [ ] Conferir pelo menos um cliente com Stories e um sem Stories; cliente sem o serviço não recebe a aba nem dados de outro cliente.
- [ ] Para Stories, comparar semana atual e anterior e provar que só material liberado aparece.
- [ ] Conferir calendário, acompanhamento, demandas, programados, Drive, vídeos, agenda, ideias, atas, informações, briefing, referências, proposta, pagamento e avaliação quando existirem para o papel.
- [ ] Validar celular e desktop: sem corte horizontal, sobreposição que bloqueie ação ou conteúdo inacessível.
- [ ] Não aprovar, comentar, avaliar, publicar, marcar pagamento nem criar demanda em nome do cliente durante a auditoria.
- [ ] Não declarar o Portal aprovado se alguma aba crítica não foi aberta por falta de sessão, dado ou permissão; registrar o limite pelo nome.

## 48. ACHADOS DA VARREDURA CLIENTE POR CLIENTE — V61 (12/08/2026)

### 48.1 Token válido ainda podia exibir o slug como nome da empresa
**Prova real:** 26 links privados existentes foram abertos pela Central. Vários cabeçalhos mostraram `vitalle-odonto`, `bluefit`, `cookiery` e outros slugs, embora a empresa tivesse nome legível na ficha ou na própria Central.
**Causa:** links legados validavam a sessão, mas o fallback de `dadosAcesso` usava somente `{nome:slug}`. A ficha privada era carregada depois, apenas dentro de Informações, e nunca corrigia a identidade do cabeçalho.
**Correção:** a entrada do Portal consulta a ficha do próprio slug, deriva um nome legível quando o legado ainda não tem nome e só então monta a tela.
> **LEI:** token aceito prova autorização, não qualidade da identidade. O cabeçalho deve vir da ficha privada do próprio cliente; slug técnico é apenas último fallback e precisa ser humanizado.

### 48.2 Stories aparecia para clientes sem o serviço contratado
**Prova real:** a aba Stories apareceu nos Portais de Açougue São Joaquim, Bluefit, Mayk Leão e demais acessos, apesar de a Central registrar Stories apenas para a carteira contratada. A exceção fixa do Rodrigo escondia a aba, mas os outros planos não eram consultados.
**Causa:** `entrarPortal()` chamava `carregarStories()` e mantinha a aba no DOM visível para todo cliente que não estivesse na constante `CLIENTES_SO_EDICAO`.
**Correção:** o escopo do Portal agora usa `incluiStories` da ficha privada. `false` explícito vence qualquer histórico; cadastro legado sem o campo preserva a aba somente se existir Story liberado daquele mesmo cliente. Cliente sem o serviço não carrega nem vê a aba.
> **LEI:** ausência numa lista fixa não concede funcionalidade. Aba contratual exige permissão positiva da ficha ou compatibilidade legada comprovada pelo histórico do próprio cliente.

### 48.3 Identidades canônicas ainda geravam cartões de Portal duplicados
**Prova real:** a Central expôs 28 botões de Portal, incluindo duas entradas chamadas Zeiss (`zeens` e `otica-visao-araucaria`), embora ambas sejam aliases declarados de `zeiss` no próprio sistema.
**Causa:** os tokens eram indexados pelo slug bruto, enquanto contratos e outros leitores já normalizavam pelo slug canônico. A leitura remontava duas identidades sem criar dados novos.
**Correção:** a Central indexa tokens por `slugClienteCanonico()` e prefere o token cuja origem já é canônica. O alias continua preservado para auditoria e não é fundido automaticamente.
> **LEI:** normalização de cliente deve acontecer antes de montar listas, contadores e links. Preservar alias no banco não autoriza duplicá-lo na operação; fusão de histórico continua sendo uma ação separada e auditada.

### 48.4 “Página abriu” não é aprovação de todas as abas
**Prova real:** a Vitalle passou por todas as 16 áreas do Portal. Calendário atual está em preparação; Acompanhamento carregou; Programados e Drive carregaram; Vídeos mostrou números; Agenda mostrou histórico; Stories atual está vazio, mas a semana 03/08–07/08 contém o roteiro liberado; Pagamento mostrou a competência; Avaliação concluiu após a leitura assíncrona. A primeira captura feita cedo demais ainda mostrava “Carregando sua avaliação...”.
**Correção de processo:** cada aba assíncrona recebe espera própria e nova leitura antes de ser classificada. Um texto transitório não pode virar falso erro nem falso sucesso.
> **LEI:** auditar portal é testar estados finais e transições. Registre carregamento inicial, aguarde a operação e prove o estado terminal; nunca conclua pelo primeiro retrato.

## 49. MATRIZ EXECUTADA — PORTAL DO CLIENTE V61

- [x] 26 links privados existentes foram abertos pela porta oficial, sem expor a carteira a um cliente e sem executar aprovação, comentário, avaliação, pagamento ou nova demanda.
- [x] Nenhum dos 26 links auditados retornou “Link inválido ou expirado”.
- [x] Vitalle foi validada na V61 com identidade `Vitalle Odonto`, 16 áreas carregadas até o estado terminal e zero erro de console.
- [x] Stories da Vitalle: semana atual 10/08–14/08 corretamente vazia; semana anterior 03/08–07/08 preserva e exibe o roteiro liberado.
- [x] Bluefit foi validada como caso sem Stories: a aba não está visível e o painel não é carregado.
- [x] Rodrigo foi validado como plano só edição: Calendário, Agenda, Ideias e Stories não ficam visíveis; `Meus Vídeos` é a entrada principal.
- [x] V61 autenticada em 390×844: nome e seis ações principais visíveis, sem rolagem horizontal e sem erro de console.
- [x] Ficha com `incluiStories:false` vence histórico; ficha legada sem o campo só preserva a aba quando existe histórico liberado do próprio slug.
- [x] Central passou a montar tokens por identidade canônica e consolida também fichas oficiais/legadas antes de renderizar um único cartão operacional.
- [x] Preflight e regressão crítica passam com gates específicos para identidade, escopo de Stories e aliases.
- [x] O domínio publicado foi confirmado na V61 por `innerHTML.includes()` após cache-busting e espera de 3 segundos; os HTMLs servidos têm o mesmo conteúdo do `main` (diferença apenas de finais de linha no escritório).

## 50. REGRESSÃO ENCONTRADA NA VALIDAÇÃO PÓS-PUBLICAÇÃO — ALIASES NA CENTRAL

### 50.1 Canonizei o token, mas não a lista final de cartões
**O que eu fiz errado:** a primeira V61 agrupou `clientes_portal_tokens` pela identidade canônica e o teste apenas procurava essa implementação. A Central, porém, une ficha oficial, contrato e carteira legada depois dessa etapa. `zeens` e `otica-visao-araucaria` voltaram a entrar no `Map` com as chaves brutas e foram exibidos como dois cartões ativos chamados Zeiss.
**Como foi descoberto:** após o upload, a inspeção real da Central autenticada encontrou os dois cartões, embora o arquivo histórico também estivesse correto. Portanto, o checkbox anterior “não repete alias” era uma conclusão maior do que a prova disponível.
**Correção:** `consolidarClientesAtivosPorIdentidade()` roda na fronteira final, depois de todas as fontes serem unidas e antes da ordenação/renderização. Ela não grava, não apaga e não funde documentos; escolhe a ficha operacional mais rica, preserva token/cadastro complementar e produz um cartão por slug canônico.
**Gate novo:** a regressão agora executa a função com `zeiss`, `zeens` e `otica-visao-araucaria`, exige uma única Zeiss, preservação da ficha oficial e reaproveitamento seguro do token legado. O preflight também exige que a Central realmente chame a consolidação final.
> **LEI:** normalizar uma fonte intermediária não prova deduplicação da interface. Quando várias origens alimentam um painel, a identidade deve ser consolidada depois da última união e o teste deve executar a saída final com aliases concorrentes.

## 51. REGRESSÃO — MÊS HISTÓRICO AINDA APARECIA NA FILA DA AMANDA (12/08/2026)

### 51.1 Bloqueei o reenvio novo, mas não neutralizei o estado antigo já contaminado
**Prova real:** no painel da Amanda, VIP apareceu duas vezes: setembro/2026 com 15 conteúdos e julho/2026 com 6, ambos registrados como enviados por Gabrielle em 12/08. Julho já era histórico e não podia voltar a pedir decisão.
**O que eu fiz errado:** a correção anterior impedia a Gabi de clicar novamente em “Enviar” num mês passado e impedia setembro de herdar o campo global de julho. Porém, `linhasCalendariosAguardandoRevisao()` ainda confiava num `aprovacaoMeses['2026-07'].status='aguardando_interna'` já gravado por uma versão antiga. O teste anterior, pior, exigia que esse julho contaminado continuasse aparecendo.
**Correção:** a fonte única da fila rejeita qualquer competência anterior ao mês vigente, independentemente do estado residual. Isso não modifica nem apaga o calendário: julho continua no histórico, no documento e nas versões; só deixa de ser tratado como decisão pendente. A mesma fonte alimenta fila, badge e painel de Chris/Amanda.
> **LEI:** estado explícito incorreto não transforma mês anterior em trabalho atual. Fila operacional aplica primeiro a janela temporal; histórico permanece consultável, mas não recebe ação de aprovar, devolver ou enviar.

### 51.2 A fila ainda precisava deduplicar aliases no resultado final
**Risco:** se dois documentos históricos do mesmo cliente mantivessem a mesma competência pendente, cada um poderia virar uma decisão separada, mesmo depois da canonicalização usada em outras telas.
**Correção:** depois do filtro de estado e competência, a fila consolida por `slug canônico + mês` e prefere a submissão mais recente; empate prefere o documento canônico. Não há fusão ou exclusão no Firestore.
> **LEI:** fila operacional consolida cliente e competência depois de todos os filtros. Uma decisão real não pode virar dois cartões por causa da estrutura histórica do banco.

### 51.3 Gate obrigatório
- [x] VIP contaminado com julho + setembro produz somente setembro.
- [x] Julho anterior fica fora mesmo com `aguardando_interna` explícito.
- [x] Competência vigente e futura continuam entrando normalmente.
- [x] `zeiss` + `zeens` no mesmo mês produzem uma única linha canônica.
- [x] `calendario.html` e `calendarios.html` continuam idênticos e bloqueiam novos reenvios de mês anterior.
- [x] “Prontos para enviar”, envio unitário e envio em lote usam a mesma barreira temporal.
- [x] Aprovar, devolver ou disparar por um DOM antigo também rejeita mês histórico antes de escrever.

## 52. REGRESSÃO — COBERTURA DE POSTAGENS SEM ALERTA PARA A AMANDA (13/08/2026)

### 52.1 A permissão existia na função, mas a porta sumiu da matriz do papel
**Prova:** `irPara('controlePostagem')` e `renderControlePostagem()` já autorizavam Amanda, Chris e Cecília. Porém, `VISIBILIDADE_POR_FUNCAO.Amanda` e `DIA_A_DIA_POR_FUNCAO.Amanda` não continham `navControlePostagem`, portanto a Amanda não conseguia abrir pela navegação normal.
**Causa:** autorização, navegação e organização da sidebar foram alteradas em pontos separados e o teste anterior não cruzava as três camadas.
> **LEI:** uma tela não está disponível só porque o renderer aceita o papel. A aprovação exige, para cada papel autorizado: item visível na matriz, posição operacional, guarda de navegação e guarda do renderer; papéis não autorizados continuam bloqueados.

### 52.2 O alerta antigo de “3 dias” respondia outra pergunta
**Prova:** a automação existente tratava conteúdo parado, confirmação de publicação ou tempo sem gravação. Nenhuma delas calculava a cobertura real das postagens por cliente nem avisava a Amanda quando a última programação terminava.
**Risco:** reaproveitar o alerta de gravação produziria falso positivo para clientes abastecidos por foto, arte, carrossel ou outro formato sem filmagem.
> **LEI:** cobertura de postagem é calculada pelos registros ativos de `postagens`, independentemente do formato do conteúdo. Gravação, vídeo em edição e anotação manual são sinais auxiliares, nunca substitutos da data programada.

### 52.3 Avisar sobre cápsula não autoriza dispará-la
**Regra operacional confirmada no áudio:** ao receber o alerta, a Amanda avalia o caso e decide manualmente se usa o Protocolo Cápsula.
**Barreira:** a verificação de cobertura não escreve em `capsulas_clientes`, não chama `acionarCapsulaAmanda()` e não cria demanda para terceiros.
> **LEI:** o sistema alerta exclusivamente a Amanda e oferece o caminho para o painel manual; nenhuma ausência de postagem pode selecionar, acionar ou registrar cápsula automaticamente.

### 52.4 Um mesmo buraco não pode inflar a fila
**Risco:** o motor roda várias vezes ao dia. Criar uma demanda por execução transformaria um cliente sem cobertura em dezenas de alertas.
**Correção exigida:** cada evento usa identidade estável por `cliente canônico + última data + etapa`. Como o motor depende de uma sessão de gestão aberta, o primeiro aviso pode nascer retroativamente no primeiro ou segundo dia quando ninguém abriu o sistema na data exata; no terceiro dia ele é substituído pelo aviso urgente. Nova cobertura encerra o alerta por soft-delete operacional. Histórico concluído não é apagado.
> **LEI:** automação recorrente precisa provar idempotência, transição de estado e encerramento automático. Consulta seguida de `addDoc()` sem identidade determinística não é prevenção de duplicidade.

### 52.5 A carteira do controle precisa ser a mesma carteira mensal ativa
**Risco:** montar “Postagem Até Quando” diretamente de `CLIENTES_LISTA` mantém ex-clientes, avulsos e clientes sem conteúdo recorrente no alerta da Amanda.
**Correção exigida:** o motor da gestão parte de `clientesDeConteudoRecorrente()`, normaliza aliases e ignora soft-deletes. Na mesma tela, a Cecília recebe uma projeção operacional equivalente baseada somente em `clientes_config`, sem consultar contrato, mensalidade ou financeiro. Registros históricos permanecem preservados no banco.
> **LEI:** alertas de conteúdo mensal usam a fonte canônica da carteira recorrente; a projeção para papel operacional não consulta coleções financeiras, nunca ressuscita cliente encerrado e nunca apaga histórico para fazê-lo desaparecer.

## 53. GATE OBRIGATÓRIO — ALERTAS DE COBERTURA V64

- [x] Amanda enxerga “Postagem Até Quando” no dia a dia; Chris e Cecília continuam autorizados; demais papéis não navegam nem renderizam a tela.
- [x] A última data programada do cliente gera no máximo um alerta para Amanda no próprio dia, sem destinatário secundário.
- [x] Ao completar três dias sem nova postagem, nasce um único alerta mais urgente e o aviso anterior deixa de ficar simultaneamente aberto.
- [x] Nova postagem futura encerra o alerta aberto por soft-delete operacional; nenhum documento histórico é apagado.
- [x] Foto, arte, vídeo e outros formatos contam igualmente quando possuem postagem ativa e data programada.
- [x] Alias do mesmo cliente não gera dois alertas; cliente encerrado, avulso, entrega direta ou sem conteúdo recorrente não entra.
- [x] O alerta aponta para a avaliação manual da Amanda e não há escritor novo em `capsulas_clientes`.
- [x] Falha de leitura interrompe a rodada e registra erro; nunca vira lista vazia nem encerra alertas existentes.

Os itens acima foram aprovados por inspeção de fonte, preflight e sandbox nomeado. A criação real de um alerta no Firestore só pode ser observada depois do upload da V64, quando existir um cliente que alcance uma das duas condições; nenhum dado de produção foi fabricado para antecipar essa prova.

## 54. REGRESSÃO — BOTÃO DE ANÁLISE PARECIA NÃO CLICAR NO CELULAR (13/08/2026)

### 54.1 Testar o handler diretamente não provou o trajeto visual do toque
**Prova real:** na fila móvel da Amanda, “Analisar roteiro e comentar” era o primeiro de cinco botões empilhados. O painel de resposta era inserido somente depois do último botão, abaixo de “Aprovar e enviar HOJE”. O toque executava sem mudar o rótulo nem levar a tela ao resultado, portanto a análise nascia fora do campo visível e parecia não abrir.

**O que eu fiz errado:** o gate anterior chamou `abrirAnaliseCalendarioRevisao()` diretamente com um alvo fabricado e confirmou roteiro, legenda e comentário. Ele não clicou o botão renderizado, não verificou a ordem real do painel no DOM móvel e não exigiu retorno visual no próprio controle.

**Correção obrigatória:** o botão de análise e seu painel ficam adjacentes, antes das decisões de devolver/aprovar. O controle usa `type="button"`, `aria-controls` e `aria-expanded`, muda o rótulo durante a abertura/fechamento e desloca a tela para a análise ou para o erro. Ausência do alvo deixa de falhar silenciosamente e produz aviso explícito.

> **LEI:** ação assíncrona visível precisa ser testada desde o elemento renderizado até o estado terminal visível. Chamar o handler por nome não prova clique, posição do resultado, retorno de carregamento, acessibilidade nem comportamento móvel.

### 54.2 Gate obrigatório
- [x] O HTML real coloca o painel imediatamente depois do botão “Analisar roteiro e comentar” e antes de “Pedir ajuste”.
- [x] O clique renderizado abre o mês correto, altera `aria-expanded` e mostra o resultado no campo visível.
- [x] Fechar restaura o rótulo e o estado do botão; erro de leitura fica visível e não é confundido com calendário vazio.
- [x] Bluefit, Mochi e nomes com apóstrofo/alias geram `onclick` válido e alvo único.
- [x] Comentário continua exclusivo da Amanda e persiste somente `comments` e `updatedAt`.

## 55. BARREIRAS — CENTRAL EDITORIAL DE CALENDÁRIOS (14/08/2026)

### 55.1 Um painel novo não pode criar uma segunda verdade sobre o calendário
**Risco encontrado antes da implementação:** a tela antiga de visão escolhe somente o mês mais recente de cada cliente. Copiar esse cálculo para uma nova aba faria histórico, fila da Amanda e edição da Gabi divergirem novamente.
**Barreira:** a Central Editorial lê o mesmo snapshot compartilhado de `calendarios`, usa `mesesDeCalendario()`, `itensDoMesCalendario()` e `estadoMesCal()` e apenas projeta esses dados por cliente e competência. Ela não grava estado, não cria coleção e não mantém listener próprio.
> **LEI:** painel de controle é projeção da fonte operacional, não nova fonte. Mês, itens e aprovação continuam determinados pelos helpers canônicos da cadeia de calendários.

### 55.2 “Todos os calendários” exige competência explícita e identidade canônica
**Risco encontrado antes da implementação:** escolher o documento inteiro “mais forte” por slug pode esconder um mês preservado apenas num alias legado; somar aliases, por outro lado, duplica cliente e conteúdo.
**Barreira:** a consolidação é feita por `cliente canônico + competência`. Em cada competência vence um único retrato, sem fundir itens e sem escrever no Firestore; aliases permanecem preservados no banco e aparecem como um único cliente na Central.
> **LEI:** histórico editorial consolida por cliente canônico e mês depois da leitura. Nunca somar documentos aliases nem escolher um documento inteiro quando o produto precisa mostrar todas as competências.

### 55.3 Isolamento da Central precisa existir no DOM e na navegação
**Requisito confirmado para esta entrega:** a porta pertence somente à Amanda e à Gabrielle. Chris e os demais papéis não devem receber botão nem view no DOM.
**Barreira:** botão e view são montados dinamicamente apenas para os dois papéis, removidos na troca de usuário e protegidos também em `irPara()`. A projeção operacional usa `clientes_extras`/`clientes_config` e calendários; não consulta contratos, mensalidades ou financeiro no perfil da Gabi.
> **LEI:** uma central compartilhada por dois papéis nasce somente nesses dois DOMs e usa a interseção segura de dados permitidos aos dois; acesso gerencial mais amplo não pode vazar para o papel operacional.

### 55.4 Gate obrigatório da V66
- [x] Amanda e Gabrielle recebem exatamente um botão verde e uma view; Chris, Cecília, Luís, Nathan, editoras e sessão sem papel ficam com zero nós no DOM.
- [x] A navegação direta para `controleEditorialCalendarios` também recusa qualquer outro papel e remove eventual nó residual.
- [x] Alias concorrente gera um cliente por competência; um mês histórico existente somente no alias continua consultável sem somar itens do mesmo mês.
- [x] Soft-delete de calendário/item não entra na operação e não é apagado do banco.
- [x] Competência atual aparece mesmo quando ainda não existe calendário, permitindo distinguir “não iniciado” de falha de leitura.
- [x] Busca, situação e carteira alteram a lista; cartão mostra título, roteiro, legenda e referência com números do mês selecionado.
- [x] Amanda recebe ação para a fila de revisão; Gabi e Amanda abrem o calendário oficial, sem escritor ou coleção paralela.
- [x] Mudança do snapshot compartilhado redesenha a Central sem listener adicional.
- [x] Falha de `calendarios`, `clientes_config` ou `clientes_extras` mostra indisponibilidade; nunca vira zero ou carteira vazia confirmada.
- [x] Layout possui quebras específicas para desktop, tablet e celular, sem grade de duas colunas forçada no mobile.

Evidência: preflight V66 aprovado; regressão crítica aprovada com 571 asserções, incluindo sandboxes nomeados de papel/DOM, aliases por competência e render/filtros. O navegador local confirmou o marcador V66 após carregamento com cache-busting e confirmou ausência do botão/view antes de autenticar. A validação autenticada com dados reais de Amanda/Gabi permanece para depois do upload, sem fabricação de sessão ou escrita em produção.

## 56. REGRESSÕES — COMPETÊNCIA DA JULIANE E FONTE DE STORIES (16/08/2026)

### 56.1 Aprovação única de setembro absorvia conteúdo legado de agosto
**Prova real:** `calendarios/juliane-nerone` possuía 29 conteúdos: cinco sem `mes`, quatro com `mes=2026-08` e vinte com `mes=2026-09`. O documento ainda declarava `month="Agosto 2026"`, não tinha `mesLegado` e possuía somente `aprovacaoMeses['2026-09']`.
**O que acontecia:** `mesDoItemCalendario()` consultava a única chave de aprovação antes do rótulo do documento. A análise da Amanda classificava 25 conteúdos como setembro e somente quatro como agosto; os cinco antigos já programados/publicados reapareciam na decisão de setembro.
**Como foi corrigido:** a competência explícita do item continua soberana; em item legado, `mesLegado` e o mês escrito no documento vencem qualquer metadado de aprovação. A mesma ordem foi aplicada no Escritório, nos dois endereços do editor e no Portal, sem migrar nem regravar dados.
> **LEI:** metadado de aprovação não define a competência de conteúdo legado. A aprovação decide o estado do mês; nunca transfere conteúdo antigo para esse mês.

### 56.2 Fallbacks antigos ainda contradiziam a fonte única de Stories
**Prova no código:** apesar da V60 declarar `stories_clientes` como fonte operacional única, a cobrança semanal ainda possuía `CLIENTES_COM_STORY`, e o painel de Stories Diários consultava/escrevia `stories_diarios_config` quando não encontrava cliente ativo.
**Risco:** uma carteira corretamente vazia poderia ressuscitar Juliane/Vitalle por lista fixa, criar configuração durante a abertura da tela ou cobrar clientes que o registro persistido marcava como inativos.
**Como foi corrigido:** os seeds e a coleção paralela foram removidos dos leitores. Falha de leitura mostra indisponibilidade; leitura confirmada com zero ativos mostra o estado vazio e não cria, reativa nem cobra ninguém.
> **LEI:** zero clientes ativos de Stories é um estado válido. Leitura vazia confirmada não autoriza seed, segunda coleção ou escrita automática.

### 56.3 Gate obrigatório da V67
- [x] Cenário Juliane com 5 legados + 4 de agosto + 20 de setembro produz agosto 9 e setembro 20.
- [x] A fila da Amanda mantém uma única decisão de setembro com exatamente 20 conteúdos.
- [x] Editor singular/plural e Portal usam a mesma precedência de competência.
- [x] `CLIENTES_COM_STORY`, `STORIES_CLIENTES_PADRAO` e leituras/escritas de `stories_diarios_config` não existem mais no fluxo operacional.
- [x] Falha do Firestore continua diferente de zero clientes ativos.
- [x] Nenhum calendário, cliente, Story ou configuração de produção foi gravado durante a correção local.

## 57. REGRESSÃO — “SALVO NA NUVEM, MAS NÃO ENVIADO” (17/08/2026)

### 57.1 O envio formal ainda disputava com o autosave
**Prova real:** Gabrielle relatou em 17/08/2026 que o editor confirmava “salvo na nuvem”, mas não confirmava o envio para Amanda. A V57 já ignorava o eco idêntico do autosave, porém o handler de envio ainda colocava a aprovação dentro de `data` e chamava a mesma gravação completa usada pelo autosave. Uma gravação iniciada antes do clique podia terminar depois da transição, ou a transição podia encontrar a versão intermediária e falhar.

**Causa:** salvamento de conteúdo e mudança de workflow eram dois escritores concorrentes do documento inteiro. O teste antigo validava apenas a função pura de conflito; não executava a ordem real das gravações, a transação nem a retentativa. A caixa de saída também restaurava o pacote completo da tentativa antiga, com risco de sobrepor edição mais nova.

**Como foi corrigido:** os autosaves do calendário entram numa fila serial. O envio fecha essa fila, confirma o conteúdo na nuvem e somente então executa uma transação que relê o documento, compara a assinatura de conteúdo e grava com `merge` apenas `aprovacaoMeses`, o espelho legado quando aplicável e `updatedAt`. Repetir um envio já confirmado é idempotente; conteúdo concorrente e decisão posterior permanecem bloqueados. Tentativas guardadas pela V67 continuam legíveis, mas nunca substituem o `data` atual nem regravam o documento inteiro.

> **LEI:** envio formal de calendário é uma transição estreita e transacional. Salvamento de conteúdo precisa terminar antes; aprovação nunca volta a usar `setDoc(docRef,data)`.
>
> **LEI:** retentativa nunca restaura pacote antigo sobre conteúdo novo. Ela confirma a mesma assinatura ou para com conflito, mês inválido ou decisão posterior.

### 57.2 Gate obrigatório da V68
- [x] `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.
- [x] Dois autosaves não executam em paralelo, e o snapshot não aplica eco durante a fila.
- [x] A transação escreve somente o patch de workflow com `merge:true`; itens, cliente e campos desconhecidos não entram no patch.
- [x] Repetição de `aguardando_interna` com o mesmo conteúdo confirma sucesso sem nova escrita.
- [x] Conteúdo concorrente, mês vazio/antigo, calendário ausente e decisão posterior falham fechados.
- [x] Pacote pendente da V67 continua compatível sem restaurar o documento antigo.
- [x] A fila da Amanda continua derivada de `linhasCalendariosAguardandoRevisao`; nenhuma fila paralela foi criada.
- [x] Nenhuma regra, calendário ou dado de produção foi gravado durante a correção local.

## 58. REGRESSÕES — VIRADA DO CHECKLIST, STORIES E VÍDEOS DA AMANDA (17/08/2026)

### 58.1 A chave mudava à meia-noite, mas a aba aberta continuava com o estado de ontem
**Prova no código:** `salvarExecucaoChecklist()` calculava a chave no instante da gravação, enquanto `checklistExecAtual` podia ter sido carregado no dia anterior. Se a tela permanecesse aberta na virada, o primeiro clique depois de 00:00 podia escrever no documento novo todas as marcações antigas que ainda estavam em memória.

**Como foi corrigido:** a execução carregada agora guarda a própria chave. Antes de qualquer marcação ou confirmação de prova, o código compara essa chave com o dia atual; se mudou, carrega o documento novo e exige que a pessoa confirme o item novamente. Um temporizador também redesenha o checklist depois da meia-noite. O resumo das 19h não escreve em `checklist_execucoes`.

> **LEI:** estado diário em memória precisa carregar e preservar a identidade do dia que o originou. Nunca recalcular apenas o destino da gravação quando o conteúdo ainda pode pertencer ao dia anterior.

### 58.2 O aviso das 19h mostrava progresso, não a pendência pedida
**Prova no código:** o e-mail listava `feitos/total` e era enviado mesmo quando todos haviam concluído. Isso exigia que Amanda calculasse mentalmente o número aberto e criava um aviso sem ação quando não havia pendência.

**Como foi corrigido:** a rodada mantém seu registro idempotente, mas só envia e-mail quando existe alguém pendente. O texto contém exclusivamente `pessoa: N em aberto`, e o log guarda pessoas, quantidade total de itens abertos e o retrato das 19h. Checklists continuam editáveis até 23:59 e ganham chave nova apenas após 00:00.

> **LEI:** aviso de pendência lista somente quem precisa agir e a quantidade realmente aberta; uma rotina de notificação nunca pode encerrar, limpar ou alterar o trabalho que mede.

### 58.3 Stories da Gabi não participavam do checklist diário geral
**Prova no código:** os checks granulares por cliente já existiam em `stories_diarios_execucoes`, mas o template diário e o resumo de disciplina não tinham um item correspondente. Assim, era possível o checklist geral aparecer completo enquanto ainda havia Story previsto sem confirmação.

**Como foi corrigido:** o Diário efetivo da Gabrielle recebe um item fixo de Stories mesmo quando há template personalizado antigo. Esse item deriva da fonte oficial `stories_clientes` e dos checks já existentes, sem criar coleção paralela. Marcar ou desmarcar um Story sincroniza o item geral; falha de leitura permanece falha e não vira conclusão automática.

> **LEI:** lembrete agregado de Stories deriva dos checks operacionais por cliente. Não criar segundo cadastro, seed ou confirmação independente para representar o mesmo trabalho.

### 58.4 Amanda precisava registrar material recebido sem virar filmmaker
**Prova no código:** a tela já possuía o modo `recebido`, que envia o material direto à edição com `soEdicao=true`, mas a Amanda era bloqueada na subaba de lançamento e não tinha atalho. Adicioná-la a `CAMPO_MAIS_CHRIS` contaminaria agenda e produtividade de filmagem.

**Como foi corrigido:** foi criada uma permissão exclusiva de lançamento para Amanda + papéis que já lançavam. A mesma guarda protege navegação, subaba e escritor. Amanda ganha o atalho “Subir vídeo de cliente”, pré-selecionando edição avulsa; ela continua fora de `PESSOAS_DE_CAMPO` e de todas as métricas de filmmaker. As regras Firestore já autorizavam membros da equipe em `videos_producao`, portanto não foram ampliadas.

> **LEI:** permitir uma ação compartilhada não concede o papel inteiro. A autorização da ação deve ser própria e aplicada também no escritor, sem reutilizar listas que governam agenda, privacidade ou produtividade.

### 58.5 Gate obrigatório da V69
- [x] 18:59, 19:00 e 23:59 usam a mesma chave diária; 00:00 usa a chave do dia seguinte.
- [x] Uma aba antiga não consegue salvar seu estado na chave nova; clique e prova revalidam a chave antes da mutação.
- [x] A rotina das 19h não escreve no checklist e não envia e-mail quando não há pendência.
- [x] O resumo retorna somente pessoas incompletas e o número exato de itens abertos.
- [x] O item de Stories da Gabi deriva da fonte única, acompanha marcar/desmarcar e falha fechado.
- [x] Amanda abre e executa edição avulsa; Gabrielle, Cecília, editoras e papéis sem campo não ganham o escritor.
- [x] Amanda não foi adicionada à lista de filmmakers, e material recebido continua fora da produtividade de gravação.
- [x] Nenhuma regra, dado, usuário ou configuração de produção foi alterado durante a correção local.

## 59. REGRESSÕES — SEMANA DE STORIES, CONSULTA DO CALENDÁRIO E BAIXA LEGADA (17/08/2026)

### 59.1 Vitalle foi aprovada, mas apareceu na semana anterior
**Prova real em produção, somente leitura:** a pauta “Semana 17 á 22/08” estava liberada pela Amanda, porém gravada com `semana=2026-08-10`. O Portal da Vitalle em 17/08 mostrou a semana atual vazia e exibiu essa mesma pauta ao navegar para 10/08.

**Causa:** o escritor confiava exclusivamente na semana selecionada na tela e aceitava datas internas pertencentes à semana seguinte. Na virada da segunda-feira, o Portal consultava a chave correta e o conteúdo parecia ter sumido. Testes antigos conferiam somente o filtro pela chave armazenada, não a coerência entre chave e roteiro.

**Como foi corrigido:** registros novos gravam `semanaConteudo` explícita e a criação é bloqueada antes de qualquer escrita quando todas as datas DD/MM do roteiro apontam para outra semana. Registros antigos são recuperados em leitura quando, e somente quando, todas as datas convergem inequivocamente para uma única segunda-feira. Escritório, cobrança semanal e Portal usam a mesma decisão; texto sem data ou ambíguo continua na chave original.

> **LEI:** a competência de Story é parte do dado, não uma consequência do dia em que a tela foi aberta. Roteiro com datas inequivocamente divergentes não pode ser salvo, e compatibilidade legada nunca pode adivinhar texto ambíguo.

### 59.2 A trava de aprovação bloqueava também a consulta da Cecília
**Prova no código e no print:** `openEdit()` chamava `exigirRetiradaAntesDeEditar()` antes de preencher o modal. Em mês aprovado, roteiro, legenda e solicitação especial ficavam inacessíveis; apenas a referência, que era um link independente, abria.

**Como foi corrigido:** mês aprovado continua fechado para escrita, exclusão e alteração de aprovação, mas o item abre em modo de consulta. Campos ficam somente leitura e botões de salvar/excluir somem. Roteiro, legenda e “Ver conteúdo completo” são ações explícitas na lista.

> **LEI:** bloqueio de workflow impede mutação, nunca leitura necessária à revisão ou execução. Consulta e edição precisam de guardas distintas.

### 59.3 Link de setembro não carregava setembro
**Prova no código:** os geradores copiavam apenas `cliente+t/e`; `calendario.html` ignorava competência solicitada e escolhia o mês padrão. Assim, copiar enquanto se revisava setembro podia abrir agosto.

**Como foi corrigido:** o link do cliente recebe `mes=AAAA-MM`, o gerador exige conteúdo existente e estado `liberado`, e os dois endereços do calendário só aceitam o mês pedido dentro dos meses autorizados. Ao trocar de mês, a URL é atualizada. O Portal embutido passa a competência liberada que já escolheu.

> **LEI:** link mensal precisa carregar identidade do cliente, permissão e competência. O leitor revalida a competência; nunca confia no parâmetro para mostrar mês não liberado.

### 59.4 Baixa antiga guardava quantidade sem títulos e criava saldo fantasma
**Prova real em produção, somente leitura:** o Controle de Gravações mostrou registros como Master Chef com quantidade realizada, mas “registro antigo sem lista individual dos títulos”. Sem vínculo por item, o painel continuava classificando conteúdos como faltantes e podia sugerir outra captação embora o trabalho já tivesse sido executado.

**Como foi corrigido:** Cecília ou o filmmaker da própria sessão pode conciliar uma baixa antiga escolhendo exatamente a quantidade já registrada. Uma transação revalida papel, sessão, mês, índice/`itemId` e vínculo anterior; marca os títulos correspondentes e enriquece o agendamento. Não cria `videos_producao`, não altera a quantidade e não toma item de outra gravação.

> **LEI:** quantidade legada não autoriza adivinhar títulos nem criar produção duplicada. A conciliação exige seleção humana exata e revalidação transacional de cada vínculo.

### 59.5 Gate obrigatório da V70
- [x] O caso Vitalle armazenado em 10/08 com datas 17–22/08 aparece em 17/08 no Escritório e no Portal.
- [x] Texto sem data ou com datas de duas semanas permanece na chave original; campo explícito novo vence compatibilidade.
- [x] Criação com datas de outra semana para antes da primeira escrita.
- [x] Mês aprovado abre roteiro, legenda, solicitação e referência em consulta, sem salvar/excluir.
- [x] Link mensal inclui competência e recusa mês inexistente ou ainda não liberado.
- [x] `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.
- [x] Conciliação antiga exige quantidade exata, não cria vídeo e não reaproveita item de outra gravação.
- [x] Nenhum dado, regra, usuário ou serviço de produção foi alterado durante a correção local.

## 60. REGRESSÕES — RECIBO DE DEMANDAS E MENSAGENS PARA CLIENTES (17/08/2026)

### 60.1 A tela confirmava a demanda sem confirmar a fila do destinatário
**Prova no código e na produção:** Gabi relatou que o site mostrou a demanda como enviada, mas ela não apareceu para Chris. Na leitura de produção não havia demanda aberta da Gabi para Chris. No escritor, `addDoc()` era seguido imediatamente pelo toast de sucesso: o documento não era relido, o destinatário não era validado e a fila local não era atualizada. Em colaboração, a principal era criada, atualizada e os demais documentos eram criados um por vez, permitindo grupo parcial.

**Como foi corrigido:** a principal e todas as partes recebem referências previamente reservadas e são gravadas num único `writeBatch`. Depois do commit, cada referência é relida e precisa confirmar protocolo, título, origem, destinatário, status pendente e ausência de exclusão. Só então a tela mostra sucesso e protocolo. Se a escrita terminou mas a releitura falhou, a tela não afirma sucesso; uma nova tentativa relê os mesmos IDs e não grava cópia. O destinatário principal também entra na notificação, e a memória de demandas é atualizada depois da confirmação.

> **LEI:** sucesso de demanda exige recibo legível da mesma referência e validação dos campos que governam a fila. Falha depois do commit vira confirmação pendente; retentativa relê os mesmos IDs e nunca cria outra demanda.

### 60.2 Uma lista paralela de WhatsApp poderia incluir cliente já encerrado
**Risco interceptado:** montar o botão solicitado a partir de `CLIENTES_LISTA`, de contatos isolados ou de nomes fixos repetiria clientes legados, perderia aliases e poderia oferecer mensagem para quem já saiu da agência.

**Como foi evitado:** a nova tela exclusiva do Chris consome exatamente o resultado confirmado da Central única de clientes, que cruza cadastros, configuração, contratos, saídas e identidade canônica. Se essa leitura falhar, nenhuma lista antiga aparece. Telefone sem DDD ou fora do formato brasileiro é bloqueado. O site abre uma conversa com texto preenchido; não registra “enviado” e não tenta controlar ou simular o clique final no WhatsApp.

> **LEI:** comunicação com clientes usa a carteira ativa confirmada e a mesma identidade canônica da Central. Falha de leitura não reaproveita lista antiga; abrir WhatsApp não significa mensagem enviada.

### 60.3 Gate obrigatório da V71
- [x] Demanda individual e grupo usam lote atômico e referências pré-reservadas.
- [x] Sucesso só aparece após releitura e validação de protocolo, destinatário, origem, título e status.
- [x] Falha de confirmação preserva os mesmos IDs; retentativa não executa outro commit.
- [x] Destinatário principal e colaboradores entram no aviso somente após o recibo.
- [x] Botão de mensagens fica abaixo da Régua de Cobrança e menu/view/porta existem somente no DOM do Chris.
- [x] Carteira vem da Central única; erro não vira lista vazia nem cache antigo.
- [x] Número brasileiro exige DDD; conversa recebe texto personalizado e continua exigindo confirmação no WhatsApp.
- [x] Nenhum dado, regra, usuário, mensagem ou configuração de produção foi alterado durante a correção local.

## 61. REGRESSÕES — CONTATOS E RÉGUA DE COBRANÇA (17/08/2026)

### 61.1 A consolidação apagava telefones válidos
**Prova no código e na tela publicada:** a Central escolhia um cadastro principal por identidade e espalhava seus campos vazios por cima do registro complementar. Apenas dois clientes ficaram com botão de WhatsApp utilizável, embora outras fontes pudessem guardar `telefone`, `whatsapp` ou `whatsappCobranca`.
**Como foi corrigido:** a consolidação preserva explicitamente telefone e número de cobrança não vazios. A comunicação usa uma única prioridade: `whatsappCobranca`, telefone da ficha e WhatsApp legado, sempre normalizados e validados com DDD.
> **LEI:** consolidação de identidade não pode deixar campo vazio do vencedor apagar um contato válido da fonte complementar; comunicação usa uma única prioridade explícita e testada.

### 61.2 A leitura assíncrona podia fazer o navegador bloquear o WhatsApp
**Prova no código:** `abrirCobranca()` aguardava Firestore antes de chamar `window.open()`. Depois do primeiro `await`, o clique já não era necessariamente reconhecido como gesto direto do usuário e o navegador podia bloquear a nova aba.
**Como foi corrigido:** a aba em branco nasce como primeira ação do clique; só depois o sistema relê mensalidade e contato, fecha em qualquer falha e navega para `web.whatsapp.com/send` com número e texto confirmados.
> **LEI:** abertura de aplicativo externo iniciada por clique acontece antes do primeiro `await`; toda validação posterior falha fechada e nunca redireciona sem destinatário confirmado.

### 61.3 Abrir conversa era registrado como cobrança enviada
**Prova no código:** a versão anterior atualizava `ultimaCobranca`, incrementava o contador e gravava log logo depois de abrir `wa.me`, embora o usuário ainda pudesse fechar a aba sem enviar.
**Como foi corrigido:** abrir e confirmar são ações separadas. O registro só nasce em transação depois de “Confirmar que enviei”, relendo o estado e recusando mensalidade já resolvida. Mensagens passaram a ter parágrafos, rótulos e linhas bancárias sem emoji decorativo.
> **LEI:** abrir WhatsApp não prova envio. Histórico, contador e supressão diária só mudam após confirmação humana explícita e revalidação transacional.

### 61.4 O upload trocou o teste crítico pelo teste dirigido
**Prova no GitHub:** `scripts/regression-critical.mjs` caiu de 1.856 para 92 linhas e passou a terminar como “asserções V71”; `scripts/regression-v71.mjs` não existia. O relatório V71 também foi enviado sob o nome V70.
**Como foi corrigido:** a suíte crítica foi restaurada do pai do commit que a substituiu; o teste V71 foi mantido em seu caminho próprio e o relatório correto foi acrescentado, preservando o arquivo antigo sem exclusão.
> **LEI:** upload de testes é conferido por caminho, tamanho e assinatura final; um teste dirigido nunca substitui a suíte crítica, mesmo que ambos terminem com sucesso.

### 61.5 Uma edição curta atingiu um template vizinho durante a manutenção
**Erro real interceptado localmente:** uma substituição ampla feita durante a V72 removeu temporariamente o fechamento `: ''` de um template não relacionado. O primeiro preflight recusou a entrega ao encontrar somente 8 de 9 scripts válidos. A linha foi restaurada por contexto semântico e a nova execução confirmou 9 de 9 scripts válidos antes do empacotamento; a versão defeituosa nunca foi publicada nem incluída no pacote.
**Prevenção permanente:** alterações em templates extensos usam âncoras semânticas do próprio fluxo, seguidas de compilação de todos os scripts inline e inspeção do diff fora do trecho-alvo.
> **LEI:** uma substituição textual em HTML/JavaScript não é aceita apenas porque o trecho-alvo parece correto; todos os scripts inline precisam compilar e o diff deve provar que blocos vizinhos permaneceram intactos.

### 61.6 Gate obrigatório da V72
- [x] Contato canônico preserva ficha, legado e número específico de cobrança sem duplicar cliente.
- [x] Cliente A e cliente B geram URLs com destinatários diferentes; número sem DDD não gera URL.
- [x] Central e Régua usam `web.whatsapp.com/send` e a mesma normalização brasileira.
- [x] A abertura ocorre antes da primeira leitura assíncrona e não grava histórico.
- [x] Somente a confirmação explícita usa transação, contador e log.
- [x] Mensalidades reutiliza a mesma cadeia da Régua; não há segundo redator financeiro.
- [x] Mensagens das cinco fases preservam parágrafos, linhas de dados e não contêm emoji decorativo.
- [x] Falha de leitura mostra indisponibilidade e `!`; nunca vira lista vazia nem quitação.
- [x] Suíte crítica restaurada e testes V71/V72 mantidos em arquivos próprios.
- [x] Nenhuma mensagem, cobrança, mensalidade, regra ou dado de produção foi alterado nos testes locais.

## 62. WHATSAPP SE PERDIA ENTRE O CADASTRO E A ATIVAÇÃO (17/08/2026)

### 62.1 O formulário coletava o telefone, mas a configuração operacional nascia vazia
**Prova no código e na tela publicada:** o link de entrada gravava `telefone`/`whatsapp`, porém `modelarClienteMensalistaUnificado().config` e `ativarAvulsoRecebido()` criavam `clientes_config` sem `whatsappCobranca`. A Central mostrava clientes ativos sem número mesmo quando a ficha recebida possuía o contato.

**Como foi corrigido:** todos os quatro caminhos públicos validam e preservam um número brasileiro canônico. Na confirmação gerencial, mensalista e avulso propagam esse mesmo número para `clientes_config.whatsappCobranca`. A edição da ficha usa a mesma normalização e não esvazia um número operacional quando a ficha legada está vazia. O formulário anônimo continua sem permissão para escrever diretamente na configuração interna.

> **LEI:** dado obrigatório coletado na entrada precisa de teste ponta a ponta até cada consumidor operacional. Guardar na ficha não prova que Mensagens e Cobrança receberam o contato.

### 62.2 Gate obrigatório da V73
- [x] Cadastro final, lead mensal, avulso e pessoa física recusam WhatsApp brasileiro inválido.
- [x] Cadastro final preserva telefone legível e versão canônica com DDI.
- [x] Ativação mensal grava o número canônico em `clientes_config.whatsappCobranca`.
- [x] Ativação avulsa aceita compatibilidade por `whatsappCobranca`, `whatsappNormalizado`, `whatsapp` ou `telefone` e bloqueia valor inválido antes da transação.
- [x] Edição posterior reutiliza a mesma normalização e exibe o número operacional quando a ficha antiga está vazia.
- [x] Central de Mensagens, Mensalidades e Régua continuam lendo a mesma configuração; nenhuma lista fixa foi criada.
- [x] Nenhuma regra Firestore foi ampliada e o formulário anônimo não escreve em `clientes_config`.

## 63. IDENTIDADE, REFERÊNCIAS, LEGENDAS E CÓPIA DE LINK — V74 (17/08/2026)

### 63.1 A deduplicação final recebia uma lista já sobrescrita
**Prova no código e na tela publicada:** Emanuelle e Emanuelle Bernaski apareciam juntas apesar da observação de migração; Hitech, Rodrigo e Cliente Rodrigo também apareciam como clientes diferentes. A Central canonizava o slug antes de inserir num `Map`, então a última origem podia substituir a anterior antes de `consolidarClientesAtivosPorIdentidade()` preservar ficha e telefone. Zeiss exibia número na configuração, mas podia chegar sem ele à Central.

**Como foi corrigido:** Emanuelle legada converge para `emanuelle-bernaski-nutri`; Hitech e Cliente Rodrigo convergem para `rodrigo`; a lista mensal é consolidada antes do `Map`; e o contato procura primeiro o canônico e depois aliases conhecidos. Tudo é projeção de leitura: nenhum cadastro, token, contrato, calendário ou histórico é criado, apagado ou fundido automaticamente.

> **LEI:** alias preservado no banco não pode sobreviver como segunda identidade operacional. Consolidar a interface nunca autoriza criar, apagar ou migrar documento automaticamente.

### 63.2 Aprovação repetida criava uma nova postagem do mesmo vídeo
**Causa encontrada:** `confirmarAprovacaoClienteCore()` usava `addDoc()` em toda confirmação. Dois cliques, uma retentativa ou duas portas concorrentes podiam deixar uma postagem na fila da Cecília e outra ainda na fila da Gabi, produzindo o relato “enviei para a Cecília e voltou para mim”.

**Como foi corrigido:** postagem nova usa ID determinístico por vídeo e transação; registro legado existente é localizado e reutilizado sem regredir status. A fila da Gabi compara todas as postagens do mesmo vídeo e só exibe a canônica se ela ainda estiver realmente em `aguardando_legenda`. Salvar legenda trava duplo clique, revalida a etapa em transação, vincula a postagem ao vídeo e só confirma a Cecília depois da releitura.

> **LEI:** um vídeo possui no máximo uma postagem canônica. Retentativa reutiliza a mesma identidade e uma cópia atrasada nunca vence uma etapa mais avançada.

### 63.3 Referência salva podia parecer falha por causa do aviso
**Causa encontrada:** o Portal usava `addDoc()` e, depois, aguardava a criação do aviso para Gabi. Se o aviso falhasse após a gravação, o cliente podia reenviar e duplicar a referência; também não havia recibo que provasse cliente, conteúdo e status gravados.

**Como foi corrigido:** a referência usa ID determinístico do cliente+conteúdo, transação, trava anterior ao primeiro `await` e releitura completa. O Hub interno continua lendo `referencias_cliente` diretamente; o aviso é secundário e só é tentado na primeira criação.

> **LEI:** referência confirmada e aviso da equipe são efeitos separados. Falha de aviso não invalida a fonte já gravada nem autoriza criar outra referência.

### 63.4 A cópia do link perdia o gesto no navegador da Cecília
**Causa encontrada:** o clique aguardava calendário, tokens e competência antes de chamar `navigator.clipboard.writeText()`. Navegadores que exigem gesto transitório recusavam a área de transferência e mostravam apenas “não consegui preparar/copiar”.

**Como foi corrigido:** a operação de clipboard nasce imediatamente no clique com `ClipboardItem` e recebe o link quando as validações terminam. Há fallback para `writeText`, cópia legada e, por último, campo manual com o link correto. A validação do mês liberado, do conteúdo existente e do token continua obrigatória.

> **LEI:** cópia assíncrona precisa preservar o gesto do clique e oferecer fallback verificável sem remover as travas de autorização ou competência.

### 63.5 Gate obrigatório da V74
- [x] Emanuelle, Hitech/Rodrigo e Zeiss consolidam contato sem criar novo cadastro.
- [x] Aliases continuam preservados no banco e não viram segundo cartão operacional.
- [x] Aprovação repetida reutiliza postagem legada ou o mesmo ID determinístico.
- [x] Postagem mais avançada não reaparece na fila da Gabi.
- [x] Legenda só confirma Cecília após transação e recibo do status.
- [x] Referência do cliente é idempotente, relida e aparece no Hub pela coleção original.
- [x] Aviso da referência não controla o sucesso da gravação.
- [x] Link mensal mantém cliente, token e `AAAA-MM`, com três fallbacks de cópia.
- [x] Nenhum dado de produção foi criado, excluído ou migrado nos testes locais.

## 64. VALOR NA ATIVAÇÃO E REATIVAÇÃO DE MENSALISTA — V75 (17/08/2026)

### 64.1 O botão principal pulava a conferência financeira
**Causa encontrada:** a ficha recebida já possuía o campo editável de valor, mas o botão principal da fila chamava `registrarClienteDaReuniao()` imediatamente depois de carregar os dados. Quando o valor vinha vazio ou precisava de correção, Amanda recebia erro sem passar pela tela em que poderia conferir o valor.

**Como foi corrigido:** o botão principal agora abre a mesma conferência oficial, monta a prévia e foca o valor. Nenhuma escrita ocorre nesse clique; a ativação acontece apenas no botão final do formulário, depois da conferência explícita.

> **LEI:** ativação de mensalista nunca pula a conferência humana do valor. Carregar uma ficha e gravá-la são ações separadas e visíveis.

### 64.2 Reativar recuperava a ficha sem registrar a nova condição financeira
**Causa encontrada:** o arquivo tinha apenas “Reativar cliente e recuperar Portal”. O fluxo restaurava configuração, contrato e acesso, mas não pedia valor, vencimento ou competência de reinício. Em arquivo legado sem contrato, a reativação podia voltar sem base financeira completa.

**Como foi corrigido:** o cartão arquivado coleta valor mensal, dia e primeiro mês. A transação relê a origem arquivada, reutiliza o slug e a ficha existentes, recupera ou atualiza o contrato e preserva a saída como histórico cancelado. Contrato existente recebe alteração datada e auditável; contrato ausente é recuperado no mesmo ID canônico. Mensalidade paga ou cancelada não é sobrescrita.

> **LEI:** reativar cliente arquivado reutiliza a identidade e exige a nova condição financeira. Nunca recadastrar o cliente para contornar o arquivo.

### 64.3 IDs iguais em arquivos diferentes podiam selecionar o registro errado
**Causa encontrada:** o mapa da interface usava somente `documentId`, apesar de reunir `clientes_encerrados`, `cadastros_clientes` e leads. IDs iguais em coleções diferentes poderiam colidir antes do clique de reativação.

**Como foi corrigido:** a chave da interface passou a ser `coleção + ID`. A origem é validada por lista fechada e relida dentro da transação. Arquivo legado recebe registro histórico determinístico, sem `addDoc()` e sem criar outra identidade operacional.

> **LEI:** arquivo legado e saída central possuem chaves de interface distintas. A reativação deve provar coleção, documento e estado antes de qualquer escrita.

### 64.4 Gate obrigatório da V75
- [x] Cadastro novo abre conferência e não grava no primeiro clique.
- [x] Valor da entrada permanece editável para Amanda; ficha ativa continua somente leitura para valor.
- [x] Reativação exige valor positivo, vencimento inteiro de 1 a 31 e competência `AAAA-MM`.
- [x] Cadastro mensalista legado reutiliza a mesma ficha e o mesmo slug.
- [x] Contrato existente recebe valor programado e histórico; contrato ausente é recuperado no ID canônico.
- [x] Pagamentos confirmados e cancelados não são reescritos.
- [x] Saída permanece preservada por soft-delete; não existe `deleteDoc()` nem `addDoc()` no fluxo.
- [x] iPhone Campo Largo não foi reativado, recriado ou alterado em produção.

## 65. PAINÉIS OPERACIONAIS CONSULTAVAM FIRESTORE ANTES DO LOGIN — V76 (17/08/2026)

### 65.1 A carga do módulo disparava uma leitura sem identidade confirmada
**Prova no site publicado:** em sessão limpa, `escritorio.html` mostrou corretamente o portão Google, mas o console registrou duas negativas `Missing or insufficient permissions`. O código executava `carregarClientesExtras()` e `renderFuncionarioMesInicio()` imediatamente depois de declarar os blocos, antes de `onAuthStateChanged`, identidade, isolamento do DOM e abertura da sessão.

**Como foi corrigido:** as duas chamadas soltas foram removidas. As cargas permanecem no ponto protegido de `mudarUsuarioGlobal()`, depois de `abrirSessaoDeEquipe`, usando `etapaSegura`. A sessão anônima não consulta `clientes_extras`, `clientes_config` nem `funcionario_do_mes`; uma sessão autenticada atualiza os dois painéis antes das telas consumidoras.

> **LEI:** declarar uma função de leitura não autoriza executá-la durante a avaliação do módulo. Toda coleção operacional espera a identidade e possui um ponto de carga autenticado e testado.

### 65.2 Gate obrigatório da V76
- [x] Não existe chamada nua de `carregarClientesExtras()` na carga do módulo.
- [x] Não existe chamada nua de `renderFuncionarioMesInicio()` na carga do módulo.
- [x] `mudarUsuarioGlobal()` mantém a carga protegida depois da abertura da sessão.
- [x] O build identifica explicitamente a V76.
- [x] Sessão anônima permanece no portão Google sem depender de leitura operacional.
- [x] Preflight, regressão crítica e testes V71–V76 continuam aprovados.

## 66. PRÉ-CADASTRO, FUNIL E PROPOSTAS COMERCIAIS — V77 (17/08/2026)

### 66.1 O funil comercial ignorava mensalistas e podia duplicar um lead
**Causa encontrada:** `sincronizarLeadsParaFunil()` lia avulsos e pessoa física, mas não `leads_mensalista`. A deduplicação usava somente `leadId` e a criação usava `addDoc()`, portanto IDs iguais em coleções distintas podiam colidir e duas execuções concorrentes podiam criar dois negócios.

**Como foi corrigido:** `negocios` permanece como fonte única, mas a chave de importação passou a ser `origem + leadId` e o documento derivado usa ID determinístico. Mensalistas entram no mesmo acompanhamento; registros antigos continuam preservados e reconhecidos sem migração destrutiva.

> **LEI:** lead comercial é identificado por origem e ID, e sua projeção no funil é idempotente. Não criar uma segunda coleção de propostas nem usar `addDoc()` numa sincronização repetível.

### 66.2 O formulário afirmava sucesso sem recibo e apontava ao número pessoal antigo
**Causa encontrada:** os quatro formulários usavam `addDoc()` e mostravam sucesso logo depois da promessa de escrita, sem reler protocolo, autoria ou origem. O resumo e os pontos públicos do site ainda direcionavam ao contato pessoal anterior.

**Como foi corrigido:** cada envio reserva um ID na sessão, grava a mesma referência e só confirma depois de relê protocolo e UID anônimo. Retentativa reutiliza o ID. A aba do WhatsApp nasce no clique antes do primeiro `await`, recebe o resumo confirmado e continua exigindo que a pessoa clique em Enviar. Site, perfil, formulário e Portal usam o número institucional.

> **LEI:** formulário público só mostra sucesso após recibo do mesmo documento. Abrir conversa não prova envio, e contato institucional não pode divergir entre páginas públicas.

### 66.3 O cadastro final aparecia como escolha para quem ainda era prospect
**Causa encontrada:** `avulso.html` mostrava “Já fechei — finalizar cadastro” junto das opções comerciais. Um interessado podia preencher a ficha de onboarding, que contém valor e contrato, antes de existir fechamento.

**Como foi corrigido:** a página pública exibe apenas as três modalidades de interesse. O onboarding permanece no endereço compatível `?modo=cadastro`, acessível pela Central somente como “Cadastro final — cliente já fechado”. Mensalista sem identidade ativa não pode ir para produção pelo funil e nunca é convertido em cliente avulso.

> **LEI:** pré-cadastro registra interesse; cadastro final ativa a operação somente após conferência. Nenhuma etapa comercial cria ou reativa cliente automaticamente.

### 66.4 Gate obrigatório da V77
- [x] Pré-cadastro coleta origem, reserva protocolo e confirma a mesma referência.
- [x] Retentativa reutiliza ID; não há `addDoc()` nos quatro formulários públicos.
- [x] Leitura do recibo público é restrita ao UID criador e não libera listagem.
- [x] Funil inclui mensalistas e usa `origem + leadId` com documento determinístico.
- [x] Proposta manual cruza a identidade existente sem cadastrar ou reativar cliente.
- [x] Mensalista só entra em produção se a identidade ativa já existir.
- [x] Reuniões comerciais são privadas, persistentes, resumíveis e protegidas por soft-delete.
- [x] Erro de leitura deixa a Central indisponível e não zera métricas.
- [x] WhatsApp institucional substitui o contato pessoal nas páginas públicas.
- [x] A abertura da conversa preserva o gesto; nenhuma mensagem é marcada como enviada automaticamente.

## 67. CONTATOS ATIVOS E ARQUIVO ÚNICO — V78 (18/08/2026)

### 67.1 A lista de contatos podia continuar exibindo quem já saiu
**Causa encontrada:** a área de mensagens montava a carteira ativa ao abrir, mas não observava uma saída registrada por Amanda em outra sessão. Um cartão já aberto também podia navegar ao WhatsApp sem confirmar novamente o estado operacional.

**Como foi corrigido:** a área exclusiva de Chris observa `clientes_encerrados`, atualiza a lista quando a saída muda e relê a Central antes de salvar número ou abrir conversa. Falha de leitura fecha o fluxo e nunca reutiliza a lista antiga como se estivesse confirmada.

> **LEI:** planilha de contatos usa somente a carteira ativa confirmada; abrir WhatsApp exige revalidar que o cliente continua ativo.

### 67.2 O arquivo existia, mas aparecia misturado com a operação ativa
**Causa encontrada:** saídas efetivas, saídas programadas e fichas ativas eram renderizadas no mesmo painel extenso. Isso dava aparência de vários arquivos e aumentava o risco de procurar ou reativar a origem errada.

**Como foi corrigido:** a Entrada de Clientes passou a ter uma subaba única de arquivo e reativação. Ela projeta `clientes_encerrados` e legados compatíveis depois da deduplicação canônica, preserva ficha, contrato, Portal e histórico e reutiliza a identidade existente na reativação.

> **LEI:** arquivo de clientes é uma projeção única por identidade canônica. Arquivar e reativar nunca criam uma segunda ficha.

### 67.3 O telefone aparecia fora do ponto financeiro solicitado
**Causa encontrada:** cartões compartilhados da Central exibiam contato de clientes ativos e arquivados, embora a operação de mensagens devesse ser exclusiva de Chris.

**Como foi corrigido:** telefone de carteira ativa e arquivada deixou de ser montado na Central compartilhada. Consulta, correção e abertura de WhatsApp ficam em `Financeiro → Contatos ativos e mensagens`, cuja view e navegação são removidas do DOM para os demais papéis. O telefone informado no onboarding permanece visível para Amanda somente durante a conferência inicial.

### 67.4 Gate obrigatório da V78
- [x] Nenhuma coleção paralela ou cópia de cliente foi criada.
- [x] Saída efetiva remove o cliente da lista ativa e o preserva no arquivo.
- [x] Saída programada permanece separada de saída efetiva.
- [x] Arquivo deduplica por identidade canônica e conserva reativação.
- [x] Cartões ativos e arquivados compartilhados não montam telefone.
- [x] Área de contatos existe no DOM somente para Chris.
- [x] Salvar contato e abrir WhatsApp revalidam a carteira ativa.
- [x] Falha de leitura não vira lista vazia confirmada nem ação permitida.

## 68. ENVIO DO CALENDÁRIO DO PRÓXIMO MÊS — V79 (18/08/2026)

### 68.1 Cecília recebia “mês ainda não liberado” depois da aprovação
**Causa encontrada:** o botão de copiar aceitava apenas `liberado`, mas a decisão da Amanda termina em `aprovado_interno`. A única transição de `aprovado_interno` para `liberado` estava escondida numa fila exclusiva da Amanda, embora a rotina real seja Cecília enviar o link ao cliente.

**Como foi corrigido:** ao copiar uma competência aprovada, Cecília, Amanda ou Chris confirma a mesma competência em transação. O sistema relê documento, itens e estado, muda somente aquele mês para `liberado` e prepara a URL com `&mes=AAAA-MM`. Rascunho, ajuste ou revisão pendente continuam bloqueados.

> **LEI:** competência de envio é a competência selecionada, mesmo quando pertence ao mês seguinte. Aprovar e entregar continuam etapas separadas; copiar nunca libera rascunho.

### 68.2 Alguns calendários pareciam vazios para Cecília
**Causa encontrada:** na abertura interna sem `&mes`, a tela confiava primeiro no rótulo global `month`. Esse rótulo pode ficar em agosto enquanto os itens reais já estão em setembro, fazendo a grade abrir numa competência sem conteúdo.

**Como foi corrigido:** a abertura interna usa o mês solicitado quando ele existe; sem solicitação, usa o mês mais recente que possui item confirmado. A ferramenta abre inicialmente no próximo mês, exibe a quantidade e o estado lidos do Firestore e distingue “realmente sem conteúdos” de “documento não confirmado”.

> **LEI:** calendário da equipe abre no mês mais recente que possui conteúdo confirmado; tela vazia só pode ser declarada depois de leitura confirmada do documento.

### 68.3 Gate obrigatório da V79
- [x] Agosto pode preparar e enviar setembro sem cair no mês do relógio.
- [x] A URL do cliente mantém `&mes=2026-09`.
- [x] Só `aprovado_interno` pode virar `liberado` durante a cópia.
- [x] A transação relê itens e estado antes de liberar.
- [x] Cecília, Amanda e Chris podem concluir; demais papéis não ganham a decisão.
- [x] Mês realmente vazio não é liberado nem recebe link.
- [x] Falha de leitura não é apresentada como mês vazio.
- [x] `calendario.html` e `calendarios.html` permanecem idênticos.

## 69. CATÁLOGO COMERCIAL E NOVOS PLANOS — V80 (18/08/2026)

### 69.1 O PDF novo e o cadastro final descreviam carteiras diferentes
**Causa encontrada:** o `Planos.pdf` publicado ainda possuía cinco páginas e somente Básico, Intermediário e Premium. O catálogo comercial correto acrescenta Premium Presença 2x, Premium Presença 3x e Premium Conteúdos Vivos, mas o cadastro final, a conferência da Amanda e a edição de ficha aceitavam apenas os três nomes antigos.

**Como foi corrigido:** o PDF oficial foi substituído pela versão correta de nove páginas e otimizado para upload sem retirar páginas. Site, página de links, pré-cadastro e onboarding usam o mesmo arquivo com versão de cache. Os seis planos passaram a existir nos escritores e editores da ficha; valores de catálogo são sugeridos, enquanto Premium Conteúdos Vivos permanece “sob consulta” e exige o valor realmente fechado.

> **LEI:** catálogo, formulário e ficha ativa usam a mesma lista canônica. Plano sob consulta nunca recebe preço presumido, e opção legada desconhecida é preservada em vez de ser convertida silenciosamente para Premium.

### 69.2 Um PDF operacional interno podia ser confundido com material comercial
**Causa encontrada:** havia também um documento chamado “Plano de conteúdo orgânico”, com pautas, pessoas e instruções internas. Ele não é catálogo de serviços e não pode ser exposto no link de cadastro.

**Como foi corrigido:** a seleção foi feita pelo conteúdo e metadados, não apenas pela palavra “Plano” no nome. Somente `Planos_GetStarted_com_Premium_Conteudos_Vivos.pdf` originou o `Planos.pdf`; o calendário orgânico foi desconsiderado e não entrou no repositório nem nos links públicos.

### 69.3 Gate obrigatório da V80
- [x] `Planos.pdf` possui nove páginas e inclui as três novas modalidades.
- [x] PDF otimizado permanece abaixo do limite de upload pelo navegador.
- [x] Pré-cadastro apresenta Premium Presença e Premium Conteúdos Vivos.
- [x] Cadastro final aceita os seis nomes canônicos e sugere somente preços explícitos.
- [x] Básico, Intermediário e Premium preservam compatibilidade.
- [x] Conferência e edição da ficha aceitam as novas opções sem perder plano legado.
- [x] Site, perfil, cadastro e área interna apontam ao mesmo PDF versionado.
- [x] Documento de conteúdo orgânico não foi publicado como catálogo comercial.

## 70. CICLO ÚNICO DE CLIENTES, PROPOSTAS E CALENDÁRIOS — V81 (18/08/2026)

### 70.1 A troca de papel destruía o formulário de entrada
**Defeito comprovado no código:** ao sair do perfil de Gerência, `registroRapidoBox.replaceChildren()` removia permanentemente os campos do DOM. Voltar para Amanda ou Chris não reconstruía o formulário, fazendo o valor e os demais dados parecerem indisponíveis.

**Como foi corrigido:** a troca de papel limpa valores e estado transitório, mas preserva a estrutura do formulário. Cadastro vindo do link e cadastro manual já fechado abrem a mesma conferência e terminam no mesmo escritor unificado.

> **LEI:** isolamento por papel pode desmontar conteúdo privado recriável, mas nunca destruir um formulário estático necessário quando a mesma sessão volta ao papel autorizado.

### 70.2 Saídas concorrentes podiam criar dois arquivos do mesmo cliente
**Defeito comprovado no código:** a saída usava ID aleatório e não mantinha um ponteiro canônico na configuração do cliente. Duas abas podiam registrar duas saídas; a projeção visual escondia a duplicação sem impedir o dado duplicado.

**Como foi corrigido:** o protocolo passou a ser determinístico por `slug + data`, `clientes_config.saidaAtivaId` é relido e atualizado na mesma transação, a trava nasce antes da primeira espera e o sucesso depende do recibo do arquivo e do ponteiro. A mesma transação atualiza ficha, contrato, mensalidades futuras, Portal, tokens compatíveis e Stories. Nenhum histórico é apagado.

> **LEI:** saída possui um único protocolo canônico por identidade. Deduplicar cartões na interface não substitui impedir a segunda escrita na transação.

### 70.3 Desativar token não encerrava uma sessão já aberta
**Defeito comprovado nas regras:** `temSessaoCliente()` verificava somente a existência de `sessoes_cliente/{uid}`. Depois da saída, uma sessão emitida antes do bloqueio ainda satisfazia leituras do Portal; reativação também ligava todos os tokens históricos.

**Como foi corrigido:** cada operação protegida revalida o token canônico, o estado ativo e `ativoAte`. Quando existe `clientes_acesso`, token histórico nunca prevalece. O Portal apaga sua sessão local ao receber negação; a reativação recupera somente o acesso e token canônicos, mantendo aliases e tokens antigos revogados.

> **LEI:** sessão é um vínculo revogável, não uma autorização eterna. Toda leitura do cliente revalida identidade, token canônico e vigência; reativar nunca ressuscita credenciais históricas.

### 70.4 Contador de entrada transformava falha em zero aparente
**Defeito comprovado no código:** erro ao ler as três fontes de entrada podia esconder o badge, levando a equipe a interpretar “indisponível” como “nenhum cliente aguardando”.

**Como foi corrigido:** o último total confirmado é preservado e o badge mostra `!` com explicação. A Central inteira continua falhando fechada quando a projeção não pôde ser confirmada.

> **LEI:** falha, permissão negada ou timeout nunca vira zero, lista vazia ou ausência de cliente.

### 70.5 Propostas manuais não eram idempotentes e renovação podia virar avulso
**Defeitos comprovados no código:** cada salvamento usava ID aleatório, marcava a proposta como enviada naquele instante e permitia repetir o mesmo documento. `renovacao` caía no ramo de projeto avulso ao mover para produção, podendo criar cliente extra e receita avulsa para um mensalista existente.

**Como foi corrigido:** proposta nasce como `preparada`, com família e ID determinísticos, hash/versão e recibo; data de envio só aparece após confirmação real. Renovação exige cliente mensalista ativo e nunca percorre `clientes_extras` ou `receitas_avulsas`. Métricas separam MRR potencial de projeto único.

> **LEI:** arquivo preparado não prova envio, aceite ou pagamento. Nova versão atualiza a família; retentativa do mesmo documento não cria outro negócio; renovação nunca é projeto avulso.

### 70.6 Portas antigas da cópia do calendário omitiam o mês
**Causa-raiz do relato da Cecília:** quatro botões chamavam o copiador sem competência. O helper então podia gerar URL sem `&mes=`; o Portal escolhia outro mês silenciosamente e um calendário real podia parecer agosto, vazio ou “ainda não liberado” enquanto a equipe trabalhava setembro.

**Como foi corrigido:** toda porta visível passa `AAAA-MM`, com próximo mês como padrão operacional. A cópia relê documento, itens e estado; somente `aprovado_interno` vira `liberado` em transação. O envio da Amanda também relê o mesmo mês em transação e exige recibo. O Portal respeita o mês pedido, preserva o último retrato confirmado e diferencia documento ausente, mês confirmado vazio e leitura indisponível.

> **LEI:** cliente, mês, estado e conteúdo formam uma única decisão transacional. Nunca omitir a competência, escolher outro mês por fallback ou anunciar vazio depois de falha de leitura.

### 70.7 Escritores parciais criavam caminhos paralelos de cliente e Portal
**Defeitos comprovados no código:** o cadastro técnico de extra, “novo contrato” e a lista antiga de links podiam iniciar pedaços diferentes da estrutura. Isso deixava a origem de ficha, contrato, cobrança, calendário e Portal obscura e aumentava o risco de duplicação.

**Como foi corrigido:** “novo contrato” e cadastro manual redirecionam à Central única; a lista de links somente exibe acessos já confirmados; o escritor técnico antigo foi removido. A projeção confirmada alimenta pendentes, ativos, saída programada, arquivo e histórico cancelado.

> **LEI:** cliente fechado nasce ou é reativado por um escritor oficial. Diagnóstico, lista de links e contrato não podem criar identidades implicitamente.

### 70.8 Gate obrigatório da V81
- [x] Formulário de entrada sobrevive à troca de papel e Amanda informa valor na entrada/reativação.
- [x] Ficha ativa não ganhou edição retroativa de mensalidade.
- [x] Saída usa ID determinístico, ponteiro transacional, recibo e soft-delete.
- [x] Stories, acesso canônico, tokens históricos e sessões abertas obedecem à saída/reativação.
- [x] Histórico cancelado fica consultável sem contar como arquivo ativo.
- [x] Propostas preparadas não fingem envio e retentativa não duplica a família.
- [x] Renovação não cria receita ou cliente avulso.
- [x] Amanda, Gabi e Cecília usam a mesma competência e fonte do calendário.
- [x] Copiar e enviar calendário relê estado/conteúdo em transação e confirma por recibo.
- [x] Portal não troca mês explícito nem converte erro do Firestore em vazio.
- [x] Nenhum dado, cliente, proposta, calendário ou regra foi publicado durante os testes locais.

### 70.9 O Portal consultava a ficha com uma operação que as regras proibiam
**Defeito comprovado no código e nas regras:** o Portal usava `getDocs(query(... where('slug')))`, que é uma operação `list`, enquanto `cadastros_clientes` concede à sessão do cliente somente `get`. A exceção era convertida em ficha vazia, podendo remover nome, plano e escopo explícito de Stories sem dizer que a autorização falhou.

**Como foi corrigido:** a coleção não ganhou permissão de listagem. O Portal tenta apenas IDs pontuais não enumeráveis/determinísticos e usa `contratos_cliente/{slug}` como retrato canônico compatível dos legados. A aba de informações reutiliza o mesmo retrato já autorizado; nenhuma segunda consulta à coleção privada é feita.

> **LEI:** regra de `get` não autoriza query. Dados do cliente no Portal usam documento determinístico ou ID previamente confirmado; nunca ampliar `list` para resolver uma consulta incompatível.

### 70.10 Comprovante mensal aceitava texto executável em um atributo de link
**Defeito comprovado no código e nas regras:** o cliente podia gravar qualquer texto em `pagamentos_mensais.comprovante`. O Financeiro interpolava esse valor em `href` usando `esc()`, que não escapa aspas nem valida protocolo. Um valor `javascript:` ou com atributo injetado podia virar navegação perigosa na sessão do Chris.

**Como foi corrigido:** Portal e regras aceitam somente URL HTTPS normalizada e limitada. O Financeiro revalida a URL, usa `escAttr`, `rel="noopener"` e mostra o legado inválido como bloqueado em vez de gerar um link. A mesma validação é aplicada somente quando o comprovante da proposta muda, para não impedir resposta a documento legado inalterado.

> **LEI:** texto informado pelo cliente nunca entra diretamente em `href`. Segurança de URL existe no escritor, nas regras e no consumidor; valor legado inválido permanece visível como bloqueado, não é executado nem apagado.

### 70.11 Papéis fixos ignoravam a revogação registrada
**Defeito comprovado nas regras:** `ehGerencia`, `ehAmanda`, `ehChris` e outros papéis especiais conferiam apenas o e-mail fixo. Marcar a conta-semente como inativa/excluída em `usuarios_equipe` revogava `ehEquipe`, mas preservava os privilégios especiais.

**Como foi corrigido:** todos os papéis fixos passam também por `emailDaSementeNaoRevogado()`. A ausência do documento continua liberando o bootstrap legítimo; um documento explícito inativo/excluído bloqueia o papel.

> **LEI:** e-mail fixo define identidade, não uma autorização irrevogável. Toda função especial deve respeitar a mesma fonte de revogação usada pelo portão da equipe.

### 70.12 Resposta de proposta podia reescrever histórico e regredir produção
**Defeito comprovado nas regras:** a sessão do cliente podia substituir todo o array `historico` e mudar a etapa para aceita, ajuste ou perdido partindo de qualquer estado, inclusive produção ou entrega. A interface também aceitava vários slugs, embora consulta e regra autorizassem somente o primeiro.

**Como foi corrigido:** respostas partem somente de proposta/análise/ajuste, acrescentam exatamente uma decisão identificada do próprio slug e preservam todas as entradas anteriores. Novas propostas aceitam um único vínculo explícito; outro cliente exige outro registro. A autorização de `negocios` e `reunioes_vendas` no backend ainda precisa ser alinhada à exclusividade do Chris mostrada no DOM antes de declarar este gate completo.

> **LEI:** histórico comercial é crescente e transição de cliente não volta produção/entrega. Uma proposta do Portal possui uma identidade autorizada explícita; exclusividade visual e regra Firestore precisam coincidir.

### 70.13 Trabalho pontual de vídeo não é cadastro de cliente
**Defeito comprovado no histórico:** o commit `49a5861` ofereceu “Cliente novo” em Vídeos, mas o lançamento criava `clientes_extras`, adicionava a identidade à carteira e a classificava como cliente. O commit `0195f08` eliminou essa escrita indevida e, junto com ela, removeu a possibilidade operacional de Luís/Nathan lançarem uma gravação ou material recebido de alguém fora da carteira.

**Como foi corrigido:** Vídeos → Lançar ganhou “Trabalho externo/pontual”. Nome normalizado e identidade prefixada vivem somente no documento de `videos_producao`; não nasce ficha, contrato, Portal, calendário, mensalidade, `clientes_extras`, `clientes_config` ou afinidade de cliente. A origem do material continua distinguindo gravação da equipe de material recebido. Edição, distribuição e aprovação permanecem na esteira existente; depois da confirmação do cliente, o vídeo termina em Entregas Finalizadas sem criar postagem, legenda ou agendamento. O conciliador reconhece a classificação antes de qualquer atalho e impede que um legado externo gere postagem.

**Revisão adversarial:** a primeira entrega ainda dependia de duas leituras da carteira para desenhar o seletor, deixava a view no DOM de papéis sem função de vídeo e misturava pontuais nos contadores “por cliente”. A opção pontual agora nasce antes das leituras e preserva o último retrato com aviso explícito quando a carteira não é confirmada. Troca de pessoa/logout limpa campos, links e resultados; Gabi/Yas não recebem menu nem view e as regras restringem criação aos quatro lançadores e atualização aos papéis operacionais de vídeo. Chris volta a ter a porta visível. Arquivo, esteira, fila de confirmação e Entregas Finalizadas agrupam pela identidade prefixada e mostram trabalhos pontuais em bloco próprio; cobrança pontual apenas copia uma mensagem e nunca procura telefone financeiro.

O conciliador reconhece pontual **antes** de status/postagem/configuração e nunca cria postagem para ele. Registros novos terminam pelo núcleo transacional de confirmação. Resíduos legados já ligados a uma postagem ficam fora dos contadores e são sinalizados para conferência; esta manutenção local não exclui nem reescreve esses documentos automaticamente.

> **LEI:** trabalho externo de vídeo é uma entrega pontual, não uma identidade de cliente. O nome percorre `videos_producao`, mas nenhum consumidor pode promovê-lo implicitamente à carteira ou à cadeia mensal.

**Gate de regressão:**
- [x] Luís, Nathan, Amanda e Chris continuam passando pela única porta `podeLancarVideo`.
- [x] Nome vazio, controle invisível e nome acima de 80 caracteres são recusados; a identidade externa é determinística e não colide com slug real.
- [x] Material gravado conta como gravação; material recebido mantém `soEdicao` e não altera produtividade de campo.
- [x] Filmmaker envia sem apropriar editor; Amanda/Chris distribuem sem gravar afinidade de cliente externo.
- [x] Aprovação externa não consulta `clientes_config` e não cria `postagens`.
- [x] Falha de `clientes_extras`/`clientes_config` não remove a opção pontual nem é exibida como carteira vazia.
- [x] Entregas Finalizadas, Arquivo e Esteira preservam nome/identidade e não contam pontual como cliente.
- [x] Troca/logout limpa a view; Gabi/Yas ficam sem DOM, rota e mutação de vídeo.
- [x] Regras foram estreitadas: só Luís, Nathan, Amanda e Chris criam; editores/gestão preservam atualização; exclusão física continua proibida.
- [x] Cobrança de pontual não consulta telefone; conciliador classifica antes do atalho por postagem e não cria fluxo mensal.

### 70.14 Gerar o link interno podia trocar o token do Portal do cliente
**Defeito comprovado no código:** quando `clientes_acesso/{slug}` ainda não existia, `garantirTokensDoCliente()` criava dois tokens aleatórios sem procurar primeiro o token legado ativo em `clientes_portal_tokens` ou em um alias de acesso. Como as regras passam a preferir `clientes_acesso` assim que o documento existe, um clique da equipe podia invalidar imediatamente o link antigo do cliente — a mesma classe da regressão recorrente da Vitalle.

**Como foi corrigido:** a gerência confirma aliases e tokens legados, a transação relê todas as referências conhecidas e adota o único token ativo antes de criar o acesso. Dois tokens divergentes bloqueiam sem escrita. Cecília pode completar somente um acesso canônico já seguro; quando a descoberta de legado exigiria listagem proibida pelas regras, recebe uma orientação fechada para a gerência preparar o primeiro link. Todo sucesso exige recibo do mesmo acesso.

> **LEI:** criar token interno nunca pode rotacionar o token do cliente. Ausência de permissão para conferir o legado bloqueia a criação; não autoriza adivinhar uma credencial nova.

### 70.15 Saída futura reativava aliases e uma falha interrompia todas as demais
**Defeitos comprovados no código:** programar uma saída gravava `ativo:true` em todos os acessos, tokens e Stories compatíveis, ressuscitando credenciais históricas. O cancelamento mantinha apenas o documento canônico e podia revogar um Portal que existia somente no alias. A fotografia compartilhada de `clientes_encerrados` copiava telefone. No motor diário, a falha de um cliente abortava os seguintes e, ainda assim, o dia era carimbado como concluído.

**Como foi corrigido:** programação futura altera somente vigência e preserva o estado ativo anterior. Cancelamento novo conserva exatamente esse estado; legado escolhe acesso canônico ou a única credencial ativa alias-only e bloqueia divergência. O recibo confirma arquivo, ponteiro e credencial restaurada. Telefone saiu da fotografia gerencial. O motor isola cada cliente, processa os demais, agrega falhas e impede `ultimaManutencaoDia` quando qualquer rotina diária falha.

> **LEI:** agendar não reativa credencial; cancelar não rotaciona Portal; erro parcial nunca vira conclusão diária.

### 70.16 Produção avulsa podia ficar parcialmente criada e mesmo assim anunciar sucesso
**Defeito comprovado no código:** o funil atualizava primeiro `negocios`, depois criava cliente/configuração e por último tentava `addDoc()` em `receitas_avulsas`. A exceção financeira era apenas registrada no console e o toast afirmava que tudo entrou no Financeiro. Duplo clique ou duas abas também podiam criar duas receitas.

**Como foi corrigido:** o ramo avulso usa trava antes da primeira espera, receita determinística por `negocioId` para registros novos e uma transação que relê/grava negócio, ficha, configuração e receita. Receita legada única é adotada; duas ativas bloqueiam. Só o recibo dos quatro documentos permite o sucesso; o ramo parcial antigo foi removido.

> **LEI:** mover para produção é uma unidade atômica. Negócio, cliente e receita não podem divergir nem ser confirmados por exceção engolida.

### 70.17 O envio em lote escondia quais calendários falharam
**Defeito comprovado no código:** `dispararCalendarios()` capturava a exceção por cliente e retornava somente um número. A tela sempre exibia “N calendários enviados” sem nomear os que falharam; um lote parcial parecia concluído.

**Como foi corrigido:** o resultado agora possui `enviados[]` e `falhas[]`, com cliente, mês e erro. Envio individual mostra a causa; lote mostra quantidade confirmada e nomes das falhas, registra o erro agregado e continua exigindo recibo de cada competência liberada.

> **LEI:** lote parcial é parcial. A interface deve dizer quem foi confirmado e quem falhou; contagem isolada nunca prova conclusão total.

### 70.18 A ficha ativa mantinha um escritor financeiro invisível e inalcançável
**Defeito comprovado no código:** `salvarClienteAtivoCentral()` procurava `ecaContatoFinanceiro`, mas o campo havia sido removido do DOM. O ramo nunca podia receber valor e ainda descrevia uma origem `edicao_financeiro_explicita` que não existia na tela.

**Como foi corrigido:** o ramo, a referência e a escrita foram removidos. Contato privado nasce somente na entrada/reativação autorizada ou na agenda exclusiva do Chris.

> **LEI:** escritor sem controle visível é código morto, não uma barreira de privacidade. Remova-o e mantenha uma única porta real por evento autorizado.

### 70.19 Bloqueio estrutural: rascunho e mês liberado ainda vivem no mesmo documento
**Limite comprovado no modelo atual:** `calendarios/{slug}` guarda vários meses e todos os itens no mesmo documento. As regras do Firestore autorizam ou negam o documento inteiro; filtrar `items` no navegador não impede que uma sessão autorizada receba também um rascunho de outro mês. Pelo mesmo motivo, uma regra baseada em `affectedKeys()` confirma que o array `items` mudou, mas não consegue provar com segurança qual elemento interno foi alterado numa aprovação legada.

**Contenção aplicada sem migrar produção:** equipe e cliente usam sempre uma competência explícita e isolada. Gabi, Amanda e Cecília podem consultar qualquer mês válido necessário à operação; o cliente só recebe competências efetivamente liberadas. Os demais meses aparecem como arquivo histórico separado. O Portal atualiza por `itemId` e mantém fallback legado estrito por índice + dia + nome. Isso reduz mistura e sobrescrita, mas **não transforma o filtro do frontend em confidencialidade**.

**Correção definitiva ainda bloqueada:** exige uma projeção publicada por `cliente + competência` (ou item), regras testadas no Firestore Emulator e migração com recibo antes de trocar leitores. A mesma migração precisa definir uma identidade canônica para aliases: tentar vários documentos a partir do navegador do cliente sem uma regra/projeção comprovada pode ampliar acesso entre clientes. Nenhuma coleção pública, alias automático ou migração de produção foi criada nesta manutenção local.

> **LEI:** segurança do calendário é decidida pelo documento entregue, não pelo que a interface esconde. Rascunho e conteúdo liberado só terão sigilo independente quando forem documentos autorizáveis independentemente.

### 70.20 Uma sugestão literal de senha podia virar a senha real
**Defeito comprovado no código:** a mensagem de troca de senha ensinava corretamente que um segredo escrito no HTML não protege nada, mas em seguida mostrava duas frases literais como exemplos. Se alguém escolhesse uma delas, a senha passaria a estar exposta no próprio código público.

**Como foi corrigido:** a interface deixou de sugerir qualquer frase literal. Ela orienta a criar uma frase inédita, que nunca tenha aparecido no site, na tela, em conversa ou na documentação. A manutenção não altera credenciais nem dados publicados.

> **LEI:** exemplo de senha em código cliente é senha pública. Nunca sugerir, registrar ou repetir uma credencial concreta no HTML, nos testes, no catálogo ou no relatório.

### 70.21 A Central de Vendas era exclusiva no DOM, mas não nas regras
**Defeito comprovado após a publicação da V81:** a navegação e as views de propostas e reuniões eram removidas para Amanda e demais papéis, porém `negocios` e `reunioes_vendas` ainda aceitavam `ehGerencia()` no Firestore. Amanda não via a tela, mas uma chamada direta autenticada ainda podia ler, criar ou alterar esses documentos.

**Como foi corrigido na V82:** a fronteira gerencial dessas duas coleções passou de `ehGerencia()` para `ehChris()`. A sessão do cliente conserva somente as duas operações já estreitas e validadas sobre a própria proposta: responder uma etapa comercial elegível e enviar um comprovante HTTPS. Contratos, onboarding, saída de clientes e demais tarefas legítimas da Amanda não foram alterados.

> **LEI:** exclusividade por papel precisa coincidir em três lugares: navegação, existência no DOM e regra do Firestore. Esconder ou remover a tela sem estreitar o backend não é autorização.

### 70.22 Migração incompleta desativou contatos e a Amanda ficou sem a manutenção contratual
**Defeitos comprovados após a publicação:** a V81 tornou `contatos_clientes_financeiro` a fonte privada preferida, mas a cópia dos números antigos continuou dependendo de um botão manual. Com a coleção privada ainda vazia, a tela confirmava 25 clientes ativos e zero WhatsApps, desativando todos os botões apesar de números inequívocos ainda existirem em `clientes_config`. No ciclo contratual, as regras já autorizavam a gerência, mas navegação, rota e `renderContratos()` continuavam limitados ao Chris; Amanda só conseguia informar o valor durante entrada/reativação e perdia a porta depois que o cliente ficava ativo.

**Como foi corrigido:** contatos privados continuam vencendo. Na ausência deles, Mensagens, clique individual e Régua aceitam o legado somente quando todos os aliases da identidade apontam para um único WhatsApp válido; divergência permanece bloqueada e nenhuma escrita ou migração automática ocorre. Amanda ganhou uma porta própria de **Valores dos contratos**, sem receber Financeiro, Régua, contatos ou Central de Vendas. O escritor compartilhado permite preencher contrato reativado sem valor e, para valor positivo já vigente, exige alteração a partir da próxima competência, registra histórico e não sobrescreve mensalidade paga/cancelada.

> **LEI:** migração manual não pode transformar dado antigo confirmado em botão inoperante. Compatibilidade é leitura estreita, com fonte nova prioritária e conflito bloqueado. Autorizar um papel no Firestore sem entregar DOM, rota e escritor utilizável também é funcionalidade incompleta; a correção deve liberar apenas a capacidade pedida, não o módulo financeiro inteiro.

### 70.23 O acesso canônico invalidou links antigos legítimos do calendário
**Defeito comprovado pelas regras e pelo relato funcional:** `tokenPortalValido()` aceitava `clientes_portal_tokens/{token}` somente enquanto `clientes_acesso/{cliente}` não existisse. Ao materializar a identidade canônica, o token novo passava a vencer sozinho e um link antigo ainda ativo, já entregue ao próprio cliente, recebia “Link inválido ou expirado”. O mês não era a causa: agosto e setembro permaneciam no mesmo documento; a sessão era negada antes da leitura.

**Como foi corrigido:** o token canônico continua preferencial, mas um token histórico só permanece válido quando o documento do token pertence ao mesmo slug, está ativo, está dentro da própria vigência e o acesso atual do cliente também continua ativo e vigente. Saída ou vencimento do acesso canônico bloqueia todos os links; reativação mantém tokens históricos revogados como revogados. No calendário, o cliente continua navegando somente por competências `liberado`, sem receber rascunhos da equipe. O copiador também aceita qualquer mês explicitamente já liberado — agosto, setembro ou outra competência — e gera um link com o acesso atual sem reabrir aprovação nem gravar novamente. A equipe pode montar, revisar e consultar qualquer competência válida; “próximo mês” permanece apenas como sugestão inicial da rotina, nunca como autorização.

Para funcionários, competência histórica passou a gerar um endereço do Escritório sem token na URL. Depois do login Google autorizado, o sistema faz uma leitura pontual de `calendarios/{slug}`, recorta o mês pedido e mostra um painel sem qualquer escritor. A tentativa de prolongar diretamente o token interno foi rejeitada por ampliar a exposição de links vazados e não foi aplicada.

Na agenda de contatos, a projeção e as guardas de salvar/abrir passaram a aceitar somente `tipo==='mensalista'`; avulsos permanecem na Central e no Financeiro correspondente, fora da lista de mensagens recorrentes.

> **LEI:** criar uma identidade canônica não apaga a validade de um link ativo já emitido para o mesmo cliente. Compatibilidade histórica exige duas revogações efetivas — token e cliente — e nunca atravessa slug, vigência ou estado de saída. Um cliente pode reabrir toda competência já liberada; “mês operacional seguinte” limita novas liberações, não o arquivo entregue. Consulta interna histórica exige identidade de equipe, não um token anônimo de duração ampliada.

**Gate de regressão:** `scripts/regression-v83-links-clientes.mjs` cobre token canônico, token histórico do mesmo cliente, token cruzado, saída, vencimento, reativação e seletor de meses liberados. `scripts/regression-v83-calendario-arquivo.mjs` cobre o endereço autenticado da equipe, leitura pontual, mês explícito e ausência de escritores. `scripts/regression-v83-contatos-contratos.mjs` cobre mensalista versus avulso e as guardas de chamada direta.

### 70.24 O editor interno da Gabi dependia da credencial externa do cliente
**Defeito comprovado no código após o relato da Gabi:** ao clicar para abrir um calendário dentro do Escritório, `abrirCalendarioFerramentas()` chamava `garantirTokensDoCliente(slug, 'equipe')`. Esse helper protege corretamente o Portal externo, mas bloqueia Gabi quando o cliente novo ainda não possui acesso canônico e a conta dela não pode listar tokens históricos. Assim, um calendário existente — inclusive o de iPhone Campo Largo — podia não abrir para montagem mesmo com Gabi autenticada e autorizada pelas regras de equipe.

**Como foi corrigido:** o iframe aberto dentro do Escritório recebe `interno=1`, reutiliza a sessão Google padrão já autenticada e não cria, lê, troca nem depende do token externo do cliente. O modo interno espera uma conta Google não anônima por até 12 segundos; Firestore continua decidindo o papel autorizado. Os links externos mantêm o app isolado, login anônimo, token obrigatório e as mesmas regras de cliente/equipe. `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.

> **LEI:** editor autenticado da equipe e link externo do cliente são fronteiras diferentes. Abrir o calendário no Escritório nunca deve materializar, rotacionar ou exigir a credencial pública do cliente.

**Gate de regressão:** `scripts/regression-v81-calendarios.mjs` exige `interno=1` sem `garantirTokensDoCliente()`, app padrão + `onAuthStateChanged` para a equipe, app público anônimo + token para acessos externos e igualdade integral dos dois endereços do calendário.

### 70.25 O primeiro mapa mensal transformava o arquivo anterior em rascunho
**Defeito reproduzido em produção:** alguns calendários já tinham itens com mês explícito, mas ainda não possuíam `mesLegado` nem um estado por competência antiga. Quando setembro recebeu o primeiro registro em `aprovacaoMeses`, agosto deixou de herdar a compatibilidade legada e passou a ser calculado como `rascunho`. O link individual autenticava corretamente, mas ignorava agosto, abria setembro e mostrava “Calendário em preparação”. O Portal também ocultava agosto pelo mesmo cálculo. A Vitalle apresentava exatamente este formato: itens de agosto e setembro, primeiro estado mensal somente em setembro.

**Como foi corrigido localmente na V85:** calendário e Portal reconhecem como arquivo entregue somente competências com conteúdo anteriores à primeira chave válida de `aprovacaoMeses`, desde que o próprio mês não possua estado explícito. Um estado explícito (`rascunho`, revisão, ajuste ou liberado) sempre vence; mês posterior, mês vazio ou conteúdo excluído nunca ganha liberação por inferência. O mês solicitado na URL continua sendo respeitado, o cabeçalho mostra essa competência em vez do rótulo operacional mais novo do documento e o cliente pode alternar entre todas as competências confirmadas como liberadas.

**Causa independente confirmada no ambiente publicado:** às 20h desta auditoria, o Firebase ainda executava as regras V31. Nelas, um token histórico deixava de valer assim que `clientes_acesso/{slug}` existia. A regra V85 preparada mantém o token histórico somente para o mesmo cliente, ativo e vigente, e ainda exige que o acesso canônico atual esteja ativo e vigente. Publicar HTML no GitHub não publica regras do Firestore.

> **LEI:** criar o primeiro estado mensal não pode reclassificar retroativamente uma competência já entregue. Arquivo anterior ao controle exige conteúdo confirmado e ausência de estado explícito; novas competências continuam fechadas até liberação formal. Código publicado e regra publicada são entregas distintas e devem ser comparados no ambiente real.

**Gate de regressão:** `scripts/regression-v85-acesso-calendarios-clientes.mjs` executa as funções reais com o formato da Vitalle, confirma agosto liberado, setembro em revisão, estado explícito prioritário, futuro oculto, mês vazio não inventado, igualdade dos dois calendários, mês solicitado no link/Portal e assinatura das regras compatíveis com token histórico.

### 70.26 Copiar e publicar eram duas decisões concorrentes no calendário
**Defeito comprovado no código:** o link individual ainda podia participar da transição de estado, enquanto a revisão da Amanda possuía mais de uma ação de aprovação/envio. O mês explícito também podia cair silenciosamente em outro mês liberado. Isso tornava a rotina Gabi → Amanda → cliente dependente da Cecília e permitia que conferir um arquivo interferisse no calendário público atual.

**Como foi corrigido localmente na V86:** a aprovação da Amanda é a única transação que publica. Ela relê o mês, publica o alvo e arquiva somente o mês público anterior no mesmo recibo. A Cecília apenas copia um mês já publicado; copiar não grava nem libera. O Portal e o link individual respeitam sempre o mês explícito. Um mês `arquivado` não renderiza conteúdo ao cliente e mostra somente **“Calendário arquivado”**. Amanda abre esse arquivo por uma porta interna somente leitura, sem trocar ou arquivar o calendário público atual.

> **LEI:** aprovação publica; cópia transporta o endereço; conferência de arquivo só lê. Essas três ações nunca compartilham escritor nem mudam o mês ativo umas das outras.

**Gate de regressão:** `scripts/regression-v86-fluxo-calendario-simples.mjs` cobre transição do ativo para arquivo, recibo único, ausência de segundo botão, cópia sem escrita, arquivo interno somente leitura, mês explícito sem fallback e mensagem pública isolada. As suítes V81 e V85 continuam cobrindo os dois endereços byte a byte, timeout, compatibilidade histórica e tokens.

### 70.27 Stories podiam anunciar ausência ou liberação sem estado confirmado
**Defeitos comprovados no código:** a tela interna limpava os mapas de `stories_links` quando a leitura falhava, fazendo erro/cota parecer ausência. Criação semanal usava ID aleatório e não travava o primeiro clique; repetição podia duplicar cliente+semana. Aprovar/devolver roteiro e links usava leitura e atualização separadas, permitindo que uma aba antiga sobrescrevesse uma etapa mais recente. Links internos eram interpolados em `href` sem validação HTTPS/escape de atributo. As regras permitiam que a sessão do cliente alterasse qualquer campo do próprio documento de Story, inclusive roteiro, autoria e semana.

**Como foi corrigido localmente na V86:** novo Story usa identidade determinística por cliente+semana, trava antes da primeira espera e bloqueia legado duplicado em vez de inventar outro. Reenvio só aceita o estado de ajuste. Amanda libera ou devolve roteiro/links em transação, relendo a etapa, com operação idempotente e recibo posterior. A tela da equipe preserva o último retrato confirmado e mostra indisponibilidade quando não existe cache; nunca chama falha de lista vazia. URLs precisam ser HTTPS e usam `escAttr` + `noopener noreferrer`. A regra do cliente passou a aceitar somente comentário, aprovação/ajuste e confirmação de postagem; cliente, semana, roteiro e autoria ficam imutáveis.

> **LEI:** Story é uma cadeia única por cliente+semana: Gabi prepara, Amanda confirma e somente material liberado aparece no Portal. Falha de leitura é indisponibilidade, não ausência; resposta do cliente nunca reescreve conteúdo da equipe.

**Gate de regressão:** `scripts/regression-v86-cadeia-stories.mjs` cobre 19 invariantes da cadeia; `scripts/regression-v81-portal-stories.mjs` mantém 24 verificações de escopo, timeout, cache, isolamento e URL segura. A correção permanece **local** até o usuário publicar HTML e regras e confirmar o fluxo real autenticado.

### 70.28 Um calendário inexistente era bloqueado e clientes avulsos herdavam a carteira editorial
**Defeitos reproduzidos na interface publicada em 19/08/2026:** iPhone Campo Largo aparecia na tela de montagem, mas o documento `calendarios/{slug}` ainda não existia. O Escritório convertia essa ausência legítima em erro e deixava o iframe em branco, embora o editor já soubesse iniciar um rascunho vazio sem gravar. Ao mesmo tempo, Montar e editar usava `CLIENTES_LISTA`, fazendo projetos avulsos como IKN aparecerem ao lado de mensalistas. A barreira temporal também restringia outubro apesar de a equipe precisar montar e consultar qualquer competência.

**Como foi corrigido localmente na V87:** documento ausente agora é um estado próprio: a tela informa que o calendário ainda não foi iniciado e abre o editor vazio; nenhuma escrita ocorre até a Gabi realmente adicionar/salvar conteúdo. Falha, cota e timeout continuam como indisponibilidade e removem o iframe, sem fingir vazio. A competência explícita aceita qualquer `AAAA-MM`; Amanda continua publicando em transação, Cecília só copia mês já publicado e o cliente só navega por meses liberados.

Calendários e áreas editoriais passaram a usar `clientesCalendarioRecorrentesConfirmados()`: somente casta `mensalista` comprovada entra. Contrato ativo ou mensalidade ativa vencem classificação manual antiga; avulso, interno, encerrado, entrega direta e desconhecido ficam fora. A classificação lê também `clientes_extras`, canonicaliza aliases e deduplica por slug. Se essa confirmação falhar, a interface preserva o último retrato ou mostra indisponibilidade; nunca volta para a lista geral.

> **LEI:** inexistência de documento é um começo válido para a equipe, não “calendário apagado”. Carteira editorial é opt-in de mensalista comprovado; lista geral, prospect e avulso nunca são fallback de calendário.

**Evidência real sem escrita:** no site publicado antes da correção, iPhone Campo Largo mostrou “o documento do calendário ainda não existe” e iframe vazio; a visão de setembro exibiu sete mensalistas sem calendário e a lista de montagem continha IKN e outros não recorrentes. Nenhum documento de produção foi criado ou alterado durante essa reprodução.

**Gate de regressão:** `scripts/regression-v87-calendarios-operacao.mjs` executa a função real com iPhone mensalista, IKN avulso, cliente interno e alias duplicado; cobre classificação não confirmada, ausência versus falha, abertura vazia sem gravação, seleção multimeses, arquivo, separação equipe/cliente e igualdade integral dos dois calendários. A correção permanece **local** até upload do usuário e novo teste autenticado da versão publicada.

### 70.29 O primeiro retrato confirmado mantinha um aviso provisório sobre calendário já publicado
**Defeito reproduzido com dados reais em 19/08/2026:** o Portal local abriu setembro da Vitalle com sete conteúdos e estado `liberado`, mas manteve por alguns instantes o aviso provisório “Calendário em produção”. O aviso era montado antes da primeira resposta do Firestore e só era removido no ramo de calendário ainda fechado; quando o primeiro retrato já chegava publicado, o código renderizava o conteúdo sem revalidar o aviso.

**Como foi corrigido:** todo retrato confirmado chama primeiro a mesma verificação de liberação, independentemente do estado. Um mês publicado remove imediatamente o aviso provisório; falha/timeout continua sendo indisponibilidade e não é convertida em calendário vazio. A consulta de `stories_links` também diferencia uma negativa esperada por links ainda não liberados de uma falha de rede, mantendo o roteiro confirmado visível nos dois casos.

O período válido do produto foi fixado em **julho de 2026 em diante**, pois foi quando os calendários começaram a ser montados no site. Links anteriores mostram uma explicação própria e não consultam nem inventam arquivo histórico.

**Evidência funcional real disponível naquela rodada:** Vitalle abriu agosto com 11 conteúdos e setembro com 7 no calendário individual; uma nova abertura do Portal publicado também carregou setembro, mostrou os sete conteúdos e o estado liberado pela Amanda. A semana de Stories de 17/08/2026 carregou o roteiro real no Portal mesmo quando os links opcionais ficaram indisponíveis. iPhone Campo Largo abriu o editor interno vazio, sem criar documento ou conteúdo; IKN não apareceu na carteira editorial. A auditoria posterior de 19/08 criou e salvou um registro sintético, confirmou o estado publicado pela Amanda e encerrou o registro por soft-delete com recibo. O token artificial do roteiro V87 não abriu o Portal e não é prova sobre o acesso real dos clientes; por isso essa parte permanece classificada como limitação do roteiro de teste, não como defeito de produção.

> **LEI:** interface provisória precisa ser reconciliada por todo primeiro retrato confirmado, inclusive sucesso. O produto não possui calendário anterior a julho de 2026. Negativa de um artefato opcional (como links de Story ainda fechados) não pode ocultar o conteúdo principal confirmado.

**Gate de regressão:** `scripts/regression-v87-calendarios-operacao.mjs` exige a revalidação do aviso em todo snapshot e o limite `2026-07`; `scripts/regression-v81-portal-stories.mjs` diferencia links ainda não liberados de indisponibilidade real e preserva o roteiro.

### 70.30 Publicar um mês encerrava outro mês e avulsos ainda podiam reaparecer como recorrentes
**Defeitos comprovados na V87 e no código anterior:** a transação de publicação ainda arquivava o mês público anterior. Isso contrariava a rotina real: agosto e setembro podem permanecer disponíveis ao mesmo tempo, e a Amanda pode reabrir um arquivo apenas para conferência sem substituir nenhum outro mês. A classificação por contrato legado também podia devolver IKN Brasil e X Joias à carteira mensalista, mesmo depois de a gestão confirmar que são trabalhos avulsos.

**Como foi corrigido localmente na V88:** publicar altera somente a competência escolhida; os demais meses ficam byte a byte preservados. Agosto e setembro de 2026 permanecem acessíveis. A partir de outubro de 2026, um mês publicado passa a ser considerado arquivado 30 dias depois do último dia da própria competência. Amanda e Chris podem reabrir somente aquele mês por 30 dias, em transação, com recibo e sem alterar o estado dos demais. O cliente recebe apenas a mensagem **“Calendário arquivado”** quando a competência solicitada está fechada. IKN Brasil e X Joias foram registrados na fonte canônica de exceções como avulsos; essa confirmação vence contrato/configuração legada e os remove das carteiras de calendário e contatos recorrentes sem apagar dados históricos.

**Evidência funcional real da V87 antes da correção:** a visão de setembro mostrou 22 mensalistas: 11 publicados, Fior em montagem com um item e 10 sem documento/conteúdo confirmado. Portanto, “vazio” não possui uma causa única e não pode ser corrigido recriando dados. Os 10 não iniciados eram Açougue São Joaquim, Dra. Monique, Fedalto Eletro Comercial, Helo Arquiteta, iPhone Campo Largo, Joaquin Assados, Place, Stokki, Vital Seg e Zeiss. Essa fotografia é diagnóstico, não prova de que a V88 já esteja publicada.

> **LEI:** mês é uma unidade independente. Publicar, arquivar ou reabrir uma competência nunca modifica outra. Ausência confirmada, rascunho, revisão, publicação, arquivo e falha de leitura são estados distintos. Projeto avulso confirmado nunca participa de calendário ou contato recorrente, ainda que exista contrato legado inconsistente.

**Gate de regressão:** `scripts/regression-v88-arquivo-calendarios-avulsos.mjs` cobre corte de 30 dias, exceção de agosto/setembro, reabertura isolada, recibo transacional, preservação dos demais meses, mensagem pública, classificação avulsa de IKN/X Joias, exclusão de contatos recorrentes, validação do acesso canônico antes da cópia e igualdade integral dos dois calendários. A correção permanece **local** até upload do usuário e validação funcional autenticada da versão publicada.

### 70.31 A carteira estrita de Calendários retirava mensalistas antes da Gabi abrir o mês
**Defeito reproduzido na interface com dados reais em 19/08/2026:** no perfil da Gabrielle, setembro mostrava somente 18 clientes ativos. A comparação com a fotografia gerencial de 22 mensalistas confirmou quatro ausências: Açougue São Joaquim, iPhone Campo Largo, Joaquin Assados e Zeiss. O defeito acontecia antes da leitura do calendário: esses clientes nem recebiam cartão/botão para a Gabi começar ou editar o mês.

**Causa:** `carregarClientesExtras()` classificava documentos de `clientes_config`, porém montava `CLIENTES_LISTA` apenas com a base fixa e `clientes_extras`. Assim, um mensalista ativado pelo fluxo novo e existente somente em `clientes_config` não entrava na carteira. Joaquin e Zeiss estavam na base, mas podiam cair em `indefinido` quando seus registros legados não ofereciam contrato ou mensalidade classificável; o filtro exclusivo de mensalistas então os removia.

**Correção local:** a carteira agora projeta também configurações ativas com `tipoCliente: mensalista`, sem escrever ou duplicar ficha. Os quatro clientes confirmados pela operação possuem uma compatibilidade nominal apenas quando nenhuma classificação persistida responde; classificação manual explícita, saída efetiva, entrega direta e a lista avulsa confirmada continuam vencendo. IKN Brasil e X Joias permanecem fora.

> **LEI:** classificar um mensalista e incluí-lo na carteira são partes da mesma ativação. Um novo mensalista em `clientes_config` precisa receber a porta de Calendários sem depender de `clientes_extras`; falha ou inconsistência legada nunca pode transformar um cliente recorrente confirmado em ausência silenciosa.

**Gate de regressão:** `scripts/regression-v88-arquivo-calendarios-avulsos.mjs` exige os quatro mensalistas, a projeção de config-only, a precedência de saída/avulso/classificação manual e a exclusão de IKN/X Joias. A validação visual repete o perfil da Gabi e precisa mostrar os 22 clientes antes de qualquer entrega.

### 70.32 A carteira da Gabi voltou a depender de leituras gerenciais
**Defeito reproduzido nos dois vídeos de 19/08/2026:** em Calendários → Montar e editar a Gabi recebia “Nenhum cliente encontrado”; em Visão do mês a tela permanecia em “Lendo os calendários...”. O calendário de um cliente específico nem chegava a ser consultado porque a carteira anterior precisava concluir `clientesDeConteudoRecorrente()` e `castaDosClientes()`. Esse caminho mistura classificação gerencial e coleções que o papel operacional não deve ler. Uma negativa legítima de permissão ou uma leitura que não terminava eliminava a porta de todos os clientes.

**Como foi corrigido localmente na V89:** a carteira de Calendários ganhou um retrato operacional próprio, montado somente de `clientes_config`, `clientes_extras` e compatibilidade mensalista já comprovada. Avulso, interno, inativo, entrega direta e “só edição” continuam fora. Leituras concorrentes compartilham a mesma promessa; falha posterior conserva o último retrato com aviso; falha sem retrato mostra indisponibilidade e nunca “nenhum cliente”. A Visão do mês espera explicitamente carteira e calendários e sempre encerra o estado de carregamento. A Central Editorial da Gabi deixou de chamar a classificação financeira paralela.

> **LEI:** o papel operacional recebe uma carteira operacional autorizada. Calendário não pode consultar contratos, pagamentos ou arquivo de saídas para decidir se a Gabi enxerga um cliente; negativa de permissão nunca é lista vazia.

**Gate de regressão:** `scripts/regression-v89-carteira-calendarios-papeis.mjs` cobre a fonte e as proibições; `scripts/regression-v89-ui-calendarios.mjs` clica nas duas abas em Chrome isolado com as coleções gerenciais negadas; `scripts/regression-v89-ui-cadeia-calendarios.mjs` atravessa Gabi → Amanda → Cecília → cliente com o mesmo documento em memória e preserva agosto, setembro e outubro.

### 70.33 Stories podiam ficar vazios indefinidamente e oferecer cliente avulso
**Defeitos comprovados no código da V88:** a leitura de `stories_clientes` não tinha timeout nem unificação de chamadas e não preservava o último retrato. As leituras de `stories_links` e `stories_semanais` também podiam permanecer penduradas. A inclusão de novo cliente partia da lista geral, capaz de oferecer projetos avulsos. Links legados eram interpolados como ação antes de uma validação HTTPS uniforme. Na troca de papel, os retratos de Stories não eram limpos como uma fronteira única.

**Como foi corrigido localmente na V89:** clientes, links e roteiros possuem limite explícito de leitura e estado de erro. O último retrato confirmado continua visível com aviso; sem retrato, a tela declara indisponibilidade. A inclusão nasce somente da mesma carteira mensalista operacional dos calendários. URL HTTPS válida usa `escAttr` e `noopener noreferrer`; valor inválido fica sinalizado e não clicável. Troca/logout limpa carteira, links, roteiros e seleção. Entrada com Stories ativa a identidade canônica; saída efetiva a desativa sem apagar; reativação recupera somente a identidade canônica quando a ficha preservada confirma o serviço.

> **LEI:** erro de Stories não é ausência, e contrato avulso não é candidato a Story recorrente. Entrada, saída e reativação alteram apenas a elegibilidade operacional; roteiros e histórico permanecem preservados.

**Gate de regressão:** `scripts/regression-v89-stories-operacao.mjs` cobre timeout, cache, carteira, URL, troca de papel e ciclo de elegibilidade. `scripts/regression-v89-ui-stories.mjs` abre a tela, ativa e retira logicamente um mensalista fictício, preserva a Vitalle, bloqueia URL inválida e verifica falha com e sem retrato em Chrome isolado.

### 70.34 A V89 carregava a tela, mas ainda retirava mensalistas reais e fundia Hitech com Rodrigo

**Defeito reproduzido na versão publicada em 19/08/2026:** a Central de Clientes confirmou 23 mensalistas ativos, mas Calendários mostrou somente 16 clientes. Ficaram fora Açougue São Joaquim, Cookiery, Dra. Júlia, Emanuelle Bernaski Nutri, iPhone Campo Largo e Joaquin Assados. Açougue e Joaquin ainda operavam até a saída programada de 15/09/2026. A mesma Central exibia um único cartão `Rodrigo / Hitech`, embora o responsável tenha confirmado que são clientes diferentes: Hitech é a empresa recorrente; Rodrigo recebe somente edição de vídeos.

**Causa comprovada:** a V89 criou a carteira operacional, porém ainda deixava uma casta genérica de `clientes_extras` (por exemplo, legado diferente de `mensalista`) vencer a compatibilidade mensalista confirmada. Três clientes recorrentes adicionais nem estavam nessa compatibilidade. Separadamente, `APELIDOS_DE_CONTRATO` convertia `hitech` em `rodrigo`, e o Portal incluía Hitech na lista fixa de clientes só edição. Por isso Hitech herdava as exclusões operacionais do Rodrigo em calendário e Portal.

**Correção local V90:** a compatibilidade inclui os mensalistas reais confirmados e vence somente castas legadas ambíguas. `avulso`, `interno`, `encerrado`, entrega direta, saída efetiva e as exceções IKN/X Joias continuam soberanas. Hitech deixou de ser alias de Rodrigo; `cliente-rodrigo` continua como alias verdadeiro de Rodrigo. O Portal considera somente Rodrigo/cliente-rodrigo como plano só edição. Nenhum documento foi criado, movido, fundido ou apagado.

> **LEI:** classificação operacional antiga e genérica não pode retirar um mensalista confirmado. Compatibilidade nunca pode fundir duas pessoas/empresas que a operação confirmou como distintas. Hitech e Rodrigo possuem carteiras, contatos, calendários, Portal e históricos independentes.

**Prova de regressão:** `scripts/regression-v90-carteira-mensalistas-reais.mjs` falha contra o `escritorio.html` publicado da V89 já no Açougue São Joaquim e passa 12/12 na V90. Cobre os sete mensalistas ausentes/mesclados, IKN/X Joias, entrega direta, saída efetiva, avulso explícito e a separação Hitech/Rodrigo. A V90 permanece **local** até o upload do usuário e a repetição da contagem na versão publicada.

### 70.35 A V90 separou Hitech/Rodrigo, mas a configuração legada ainda retirava três mensalistas e duplicava o arquivo visual

**Defeitos reproduzidos por cliques na V90 publicada em 19/08/2026:** Hitech e Rodrigo passaram a aparecer como identidades diferentes e Hitech entrou em Calendários. Porém iPhone Campo Largo, Açougue São Joaquim e Joaquin Assados continuaram ausentes das listas gerais de montagem, links e resgate. A Central confirmava os três como mensalistas ativos — Açougue e Joaquin com saída futura em 15/09 — e o botão Calendário da ficha do iPhone conseguia abrir o editor vazio. No arquivo visual, `AUDITORIA V87 — NÃO É CLIENTE` aparecia como calendário público e Zeiss/Agosto aparecia duas vezes por aliases legados.

**Causa comprovada:** a compatibilidade mensalista da V90 ainda era avaliada depois de `clienteInativo`, `tipoCliente`, `semConteudoRecorrente` e `tipoEntrega` do `clientes_config` antigo. Portanto, uma ficha oficial reativada/corrigida na Central podia continuar invisível por uma classificação residual. O arquivo percorria todos os documentos brutos de `calendarios` sem cruzar a carteira recorrente nem consolidar `slug canônico + competência`.

**Correção local V91:** para o conjunto mensalista confirmado, casta e flag legadas não retiram a porta de Calendários enquanto não existir saída efetiva, `ativo:false`, soft-delete ou `inativoDesde` já alcançado. Saída futura permanece na operação até a data. Rodrigo continua fora por ser somente edição; IKN e X Joias continuam fora por serem avulsos. Publicados/arquivo agora cruza a carteira mensalista confirmada e consolida aliases por identidade e mês, escolhendo o retrato com mais conteúdo; isso remove o teste V87 e a duplicação visual da Zeiss sem excluir nenhum documento do Firestore.

> **LEI:** ficha oficial ativa e saída futura não podem ser anuladas silenciosamente por classificação residual. Listagem de calendário público é projeção da carteira recorrente canônica, nunca varredura bruta de toda a coleção.

**Prova de regressão:** `scripts/regression-v91-carteira-publicados.mjs` cobre iPhone com casta/flag legada, Açougue e Joaquin com saída futura, saída efetiva, Hitech/Rodrigo, IKN/X Joias, aliases Zeiss/Zeens, remoção do teste V87 e preservação da cópia mais completa.

### 70.36 Rodrigo saiu da carteira editorial, mas a Central ainda oferecia um atalho de calendário

**Defeito reproduzido por clique na V91 publicada em 19/08/2026:** as cinco telas operacionais de Calendários já excluíam Rodrigo e mantinham Hitech como empresa mensalista independente. Porém o cartão mensal de Rodrigo na Central de Clientes ainda recebia o botão genérico `Calendário`, capaz de abrir uma porta editorial que o plano somente edição não utiliza.

**Causa comprovada:** o cartão condicionava o atalho apenas a `tipo === mensalista`; não reutilizava `ehClienteSoEdicao`, barreira que já protegia carteira, montagem, links, resgate e central editorial.

**Correção local V91.1:** o atalho da Central exige mensalista que não seja cliente somente edição. Hitech preserva o botão e Rodrigo mantém Portal, ficha, edição cadastral, financeiro e saída, mas não oferece criação/abertura de calendário. Nenhum dado ou regra Firebase foi alterado.

> **LEI:** classificação somente edição precisa ser respeitada em toda porta editorial, inclusive atalhos gerenciais; esconder o cliente na lista principal não basta se outro consumidor ainda consegue abrir a mesma função.

**Prova de regressão:** `scripts/regression-v91-1-rodrigo-central.mjs` extrai o renderer real da Central, monta cartões de Hitech e Rodrigo em Chrome isolado, clica no calendário da Hitech e confirma que não existe botão equivalente no cartão do Rodrigo.
