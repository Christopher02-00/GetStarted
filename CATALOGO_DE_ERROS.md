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
