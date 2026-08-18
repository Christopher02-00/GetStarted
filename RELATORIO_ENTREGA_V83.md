# Get Started — entrega local V83

Data da preparação: 18/08/2026  
Base auditada: commit `3467641329eb42206aadf9a270dd6d584f04a830`  
Publicação executada pelo Codex: **nenhuma**

## Matriz de recuperação

| Pedido/falha | Comportamento esperado | Área | Evidência/mudança local | Status honesto | Próxima validação |
|---|---|---|---|---|---|
| Cliente recebe “link expirado” em agosto/setembro | Abrir qualquer mês já liberado, sem mostrar rascunhos | `firestore.rules`, calendários | Token histórico exige mesmo cliente + token e acesso ativos/vigentes; copiador aceita mês `liberado` antes da barreira do próximo mês | corrigido + validado localmente; não validado em produção | publicar regras/HTML e abrir link real de agosto e setembro em sessão de cliente |
| Cecília/equipe precisa consultar mês antigo | Abrir arquivo interno sem prolongar token anônimo | `escritorio.html` | Link `calArquivo` exige login Google da equipe, faz leitura pontual e renderiza somente leitura | corrigido + validado localmente; não validado na tela publicada | abrir um mês antigo pela conta da Cecília |
| Botões de contatos ficaram desativados | Usar contato privado; durante migração, aceitar apenas legado inequívoco | `escritorio.html` | fallback somente leitura entre aliases, conflito bloqueado e fonte privada prioritária | corrigido + validado localmente; não validado em produção | testar clique real em três mensalistas e um conflito |
| Agenda deve listar apenas recorrentes | Excluir avulsos e encerrados | `escritorio.html` | projeção e guardas de salvar/abrir exigem `tipo==='mensalista'` ativo | corrigido + validado localmente | conferir contagem publicada com a carteira real |
| Amanda não consegue colocar/reajustar mensalidade | Amanda e Chris acessam Valores dos contratos; alterações preservam passado | `escritorio.html`, regras já gerenciais | porta própria da Amanda, rota/DOM/escritor compartilhados; Financeiro continua exclusivo do Chris | corrigido + validado localmente; não validado com login Amanda | preencher contrato reativado em ambiente publicado |
| iPhone Campo Largo — R$ 800 e telefone | Gravar dados reais e refletir nas áreas | Firestore de produção | nenhuma escrita executada: Chrome autenticado não respondeu e navegador interno não estava logado | **não realizado** | preencher pela tela publicada ou repetir com sessão autenticada controlável |
| Vídeos externos/pontuais | Voltar a lançar sem criar cliente recorrente | fluxo de vídeos já presente na base | suíte específica existente, 72/72 | validado no código; não revalidado em produção nesta rodada | teste real Amanda/filmmaker após publicação |

## Alterações desta entrega

- `firestore.rules`: restaura links históricos legítimos somente para o mesmo cliente ainda ativo e dentro da vigência; saída/expiração continuam revogando.
- `escritorio.html`: mês já liberado pode receber link atual para o cliente; nova liberação continua limitada à competência seguinte; arquivo interno autenticado da equipe; contatos compatíveis; agenda só de mensalistas; porta contratual da Amanda.
- `CATALOGO_DE_ERROS.md`: incidentes 70.22 e 70.23 com causa, correção, prevenção e gates.
- testes em `scripts/`: expectativas antigas alinhadas e três gates V83 adicionados.

## Provas de validação

| Verificação | Resultado |
|---|---:|
| Calendários V81/V83 | 65/65 |
| Links de clientes V83 | 18/18 |
| Arquivo interno V83 | 15/15 |
| Contatos/contratos V83 | 30/30 |
| Preflight geral | aprovado |
| Regressão crítica | 608/608 |
| Par `calendario.html` / `calendarios.html` | byte a byte idêntico |
| `git diff --check` | aprovado |

Os testes exercitam funções reais extraídas dos arquivos, sintaxe, invariantes, papéis e cenários simulados. Não houve Firebase Rules Emulator disponível, escrita em produção, login real da Cecília/Amanda/cliente nem teste visual móvel publicado.

## Ordem obrigatória de publicação manual

1. Publicar `firestore.rules` no Firebase. Sem isso, os links históricos continuam expirando mesmo que o HTML seja enviado ao GitHub.
2. Subir `escritorio.html`, `CATALOGO_DE_ERROS.md` e todos os arquivos listados em `UPLOAD_V83.txt`, preservando a pasta `scripts/`.
3. Depois da hospedagem atualizar, testar: cliente ativo com link antigo; link novo para agosto; link novo para setembro; cliente encerrado negado; Cecília consultando arquivo; Amanda editando contrato; Chris abrindo WhatsApp de mensalista.

## Limites reais

- Preparado localmente não significa corrigido em produção até a publicação e os testes acima.
- Aceitar mês histórico não libera rascunho: a competência precisa estar com estado `liberado` e ter conteúdo ativo confirmado.
- Token expirado ou revogado continua inválido. Para esse caso, a equipe gera um link novo do mês já liberado usando o acesso atual do cliente.
- Os dados de iPhone Campo Largo não foram gravados no Firestore nesta entrega.
