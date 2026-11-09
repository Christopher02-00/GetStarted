# Ensaio Get — portão de jornadas em navegador real
Sobe Firestore + Auth + **Functions** emulators (rules e `functions-get/` do próprio checkout), serve o site, popula dados representativos e percorre jornadas por papel no Chromium (Playwright), do clique ao destinatário.
```bash
cd ensaio && npm i && node montar-cdn.mjs        # uma vez: SDK Firebase local (sem CDN)
(cd functions-get && npm i --no-package-lock)    # uma vez: dependências das Cloud Functions (não há lockfile; npm ci falha)
(cd ensaio && npx playwright install chromium)  # uma vez: navegador das jornadas
node ensaio/rodar.mjs                            # bateria inteira → ensaio/saida/resultado.json + screenshots
node ensaio/rodar.mjs --jornadas J04             # só uma jornada
node ensaio/rodar.mjs --movel                    # bateria inteira como celular (390x844, touch) — obrigatória antes de publicar mudança de interface
node ensaio/explorar.mjs Cecília                 # abre o site como a pessoa e tira foto (debug)
ENSAIO_CONSOLE=1 ENSAIO_LOG_FN=1 node ensaio/rodar.mjs --jornadas J03   # console completo + todas as chamadas do callable em ensaio/.runtime/
```
No GitHub: o workflow `.github/workflows/ensaio-jornadas.yml` roda esta mesma bateria (desktop e `--movel`) em todo PR, em todo push no `main` e todo dia às 6h (BRT); fotos e logs ficam no artefato `ensaio-desktop`/`ensaio-movel` por 7 dias.
Requisitos: Node ≥ 20, Java 21, firebase-tools 15 (`npm i -g firebase-tools@15`), jar do Firestore emulator em `~/.cache/firebase/emulators/` (baixado por `firebase setup:emulators:firestore`). Variáveis `*proxy*` são removidas do ambiente dos emuladores.
Nunca aponta para `get-started-4956d`; o gancho no `escritorio.html`/`portal-cliente.html` só liga em `127.0.0.1?ensaio=1`. Login = credencial Google sintética no Auth emulator (mesmo provedor e claims que a produção exige).

## Jornadas (R1/R1.1/R1.2 — 08/11/2026)
| Id | Prova | Papéis |
|---|---|---|
| J01 | Login por papel: menu certo, itens dos outros fora do DOM | 8 |
| J02 | Demanda: Chris cria → Cecília encontra e prova → Chris aprova | Chris, Cecília |
| J03 | Gravação: Cecília agenda → Luís vê só a dele → Nathan não vê a do Luís | Cecília, Luís, Nathan |
| J04 | Vídeo ponta a ponta: distribuir → editar → aprovar → cliente → postagem nasce (Function) → legenda → agendar → publicado → Portal | Amanda, Helo, Chris, Cecília, cliente |
| J05 | Portal: cliente A não vê conteúdo de B (token/slug) | clientes |
| J06 | Calendário 4.0: Amanda inclui ciclo + documento → Chris cria no editor oficial e envia → Amanda conclui revisão (libera) → cliente lê pelo link → Luís vê em modo gravação | Amanda, Chris, cliente, Luís |
| J08 | Motor: Chris e Amanda entram com a trava liberada e a manutenção diária forçada → `motor_executado`, sem "falha em…", sem `erro_verificacao` novo, dia carimbado (P2). Mutante: uma rotina que lança erro deixa a J08 vermelha | Chris, Amanda |
| J09 | Troca de papel na mesma aba: DOM do papel anterior some | Chris↔Cecília |
| J10 | Financeiro: só Chris tem DOM e acesso; senha pessoal | Chris, Amanda |
| J11 | Filmmaker envia materiais da sessão (V100) → vídeos sem editor na fila da Amanda → sessão realizada | Luís, Amanda |
| J12 | Tour: cada papel abre todas as telas do próprio menu; vermelho em erro grave no console, tela vazia ou texto de indisponibilidade ("Não consegui…", "undefined", "NaN") — pensado para a cópia anonimizada do banco real (`ENSAIO_DADOS_REAIS=<pasta da exportação>`, `ENSAIO_PAPEIS=Chris,Amanda`) | 8 |
| J13 | Minhas Demandas: o chip de filtro escolhido abre a faixa de mesmo nome, acima do estado guardado no navegador (F-01) | Helo |
| J14 | Central R80 abre mesmo com a listagem da Entrada de perfil (CP126) em voo — leitura não trava navegação (F-09) | Chris |
| J15 | Cofre só com a chave nova (P9 fase B): rules (só Chris cria a chave; Helo não lê) → Cecília revela registro v2 e o HTML não tem a chave antiga, o PBKDF2 nem a chave nova → prévia do Chris aponta a sobra v1 sem gravar → credencial nova nasce v2 → sobra v1 não abre | Cecília, Helo, Amanda, Chris |
| J16 | Casta: Amanda classifica e publica `castas_operacionais` → Cecília vê a mesma classificação sem ler o financeiro → Cecília não grava a projeção → mudança da gerência chega à Cecília (P1/F-12) | Amanda, Cecília |
| J17 | Conciliador V118: vídeo aprovado com postagem arquivada → 5 rodadas da manutenção diária → tenta 3 vezes, avisa `postagem_orfa_suspensa` 1 vez e para (P6/D-01) | Chris |
| J18 | Vídeo legado sem `data` atribuído à Helo → tela de vídeos sem "undefined" (P5/F-17) | Helo |
| J20 | Cliente aprova um conteúdo de dezembro num calendário com outro mês → o aviso para Chris/Amanda diz "1 de 2" (o mês), não "2 de 3" (backlog Codex P16/P37). Usa o calendário criado pela J06 | cliente |
| J19 | Desligada (Gabrielle) sem cadastro tenta entrar → o site não reconhece e as rules negam a leitura (P8) | Gabrielle |
| J21 | Cecília cancela duas sessões da Mochi (Luís) → o Luís recebe dois avisos, um por sessão (backlog Codex P18) | Cecília, Luís |
| J22 | E-mail com EmailJS sem cota (dublê) e fila com pessoa desligada → 1 tentativa só, nenhuma para a Gabrielle, 1 aviso `email_cota_esgotada` (backlog P39) | Chris |
| J23 | Resumo por e-mail desligado (decisão do Chris, 09/11): com fila pendente e EmailJS dublê, o motor não envia resumo e a fila fica intacta | Chris |
| J24 | Sem rede: a Cecília abre Get Academy e cofre → as telas avisam indisponível em vez de "Nenhum…" (P12/R5) | Cecília |
| J25 | Stokki por plataforma: vídeo da edição ao cliente (como a J04) → Chris escreve legendas de Instagram e TikTok → Cecília agenda cada rede (conferência do servidor no cartão) → confirma cada publicação pela fila "Publicações para conferir" → "agendado" com 1 rede, "postado" com as 2 (P3) | Amanda, Helo, Chris, Cecília |
| J26 | Menu: "Registro do dia" da Júlia (conta Fernanda, desligada) não aparece para Amanda e Chris; o registro salvo em `diario_equipe_i118` continua lá | Amanda, Chris |
| J27 | Calendário com item antigo sem `itemId`: salvar no editor I172 é recusado e a mensagem aponta cliente, mês, dia e item e o caminho → Chris aplica "Corrigir identidades" (V102) com backup e recibo, sem mudar título nem estado → o salvar grava | Amanda, Chris |
| J28 | Agendar postagem manual (servidor) grava `itemId` no calendário: item novo nasce `calitem_post_*` e item antigo sem ID ganha o ID sem duplicar | Cecília |
| RULES | Sentinela: nenhuma **escrita** negada pelas rules durante as jornadas (leituras negadas por papel são só informativas). As frases "maximum of 1000 expressions"/"evaluation error" no log são diagnóstico verboso do emulador para pedidos **já negados** — não acontecem em produção | — |

**Cobertura de cliques (P10):** `ENSAIO_COBERTURA=1 node ensaio/rodar.mjs` grava `ensaio/saida/cobertura.json` (funções do site que rodaram, pela cobertura do Chromium) e `python3 ferramentas/cobertura_handlers.py escritorio.html` cruza com todos os `onclick`. Linha de base de 09/11: 80/593 handlers do escritório com jornada, 2/25 do portal, 5/42 do calendário. O CI (desktop) falha quando entra um handler novo sem jornada.

**Negação esperada:** uma jornada que prova o lado "negado" de uma regra chama `esperarNegacao(id, metodo, [linhaIni, linhaFim], vezes)`. A sentinela desconta só essas negações (método + faixa de linhas do `firestore.rules` + quantidade exata) e mostra cada uma como caso próprio. Sobra ou falta é vermelho. Qualquer outra escrita negada continua vermelha.

## Regras do próprio ensaio (aprendidas a duras penas)
1. **Nunca listar uma coleção pelo REST enquanto a transação do app está em voo.** O emulador aborta o commit ("Transaction lock timeout"). Espere o sinal da UI (botão volta ao normal, toast) e só então leia o banco; polling ≥ 1 s.
2. **Seed tem de ser consistente com as Functions.** Postagem sem vídeo, vídeo com editor sem `editorAtribuidoEm`, correção sem `correcaoSolicitadaEm` → a Function do gatilho morre, o worker morto não desfaz a transação e os locks ficam presos. `rodar.mjs` espera as Functions ficarem ociosas depois do seed (`aguardarFunctionsOciosas`).
3. **O que o backend liga muda a UI.** Com `processo_calendarios_i164/ativo` a Central R87 tira "Gravações" da barra da Cecília e põe os atalhos amarelos. As expectativas seguem o estado do backend (R2 vai copiar o estado real).
4. Falhou → corrigir a **causa** (no site ou no ensaio), nunca afrouxar o teste. Uma escrita negada pelas rules é sempre causa (o site tentou gravar onde não pode) — descubra o escritor pelo console (`motorAutomacoes: falha em …`, toast) e corrija o escritor ou a regra, nunca ignore. Bug novo do site → jornada nova no mesmo PR. Negação legítima logada como erro (F-03/F-07) entra em `RUIDO` com o achado anotado — e vira ficha.
5. Botões sob o rodapé fixo do editor (I172) não recebem clique: centralize com `scrollIntoView({block:'center'})` antes. Conteúdo novo nasce com `day:1` e vai para o topo da lista — identifique pelo título vazio, nunca pela posição.
6. Depois de rodar, confira que não ficaram emuladores órfãos (`pgrep -f firebase-tools/lib/emulator`); o `subir()` mata os anteriores e `parar()` mata também `cloud-firestore-emulator`/`functionsEmulatorRuntime` (órfãos em java já comeram 4,5 GB e derrubaram o Chromium — "Target crashed").
7. **R2 — dados reais.** `ENSAIO_DADOS_REAIS=~/.dados-ensaio/exportacao` carrega a exportação anonimizada (artefato `firestore-anonimizado` do workflow `exportar-firestore.yml`, descompactado em `~/.dados-ensaio/exportacao/`). O caminho do documento vem em `__id`; o campo de dados `id`, quando existe, é preservado — contratos do servidor (CP140) exigem `d.id === caminho`. **Nunca** comitar a exportação. Erros com dados reais podem vir da anonimização (texto/URL trocados) — confira o `functions-chamadas.log` antes de abrir ficha contra o site.
