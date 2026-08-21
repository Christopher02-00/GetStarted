# V96 — Chris opera os perfis da equipe

## Entendimento

O modo V95 permitia que Chris enxergasse a jornada de Amanda, Cecília, Gabrielle, Helo, João Victor, Luís, Nathan e Yas, mas bloqueava toda gravação. Como Chris não possui nem deve compartilhar as contas Google dos funcionários, a V96 transforma essa auditoria em uma operação delegada exclusiva da identidade Google real do Chris.

O papel escolhido continua determinando menus, filtros, filas e os campos de autoria operacional já usados pelo negócio. Em paralelo, cada escrita recebe um recibo técnico imutável com `atorReal=Chris`, papel operado, tipo de operação, origem, caminhos-alvo e horário do servidor. Assim, “Chris operando como Gabrielle” não vira “login da Gabrielle”.

## Alterações

- `escritorio.html`: “Auditar perfil” virou “Operar perfil da equipe”; seis portas Firestore (`addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, transação e lote) anexaram o recibo no mesmo commit.
- A operação falha fechada: se o recibo for rejeitado, o dado operacional também não é gravado.
- O banner amarelo informa permanentemente o papel operado e oferece retorno direto ao Chris.
- Motores globais, saídas programadas e pedido de notificações continuam parados enquanto Chris opera outro papel.
- A exceção que mostrava conteúdo da gerência dentro de um perfil de funcionário foi removida.
- `calendario.html` e `calendarios.html`: operação delegada coberta também no iframe; ambos confirmam o e-mail Firebase real do Chris e permanecem idênticos.
- `firestore.rules`: nova coleção `log_operacoes_delegadas`, legível/criável somente por Chris e sem update/delete; Chris foi incluído nas duas portas que eram exclusivamente Amanda (`tipos_tarefa_fixa` e `capsulas_clientes`). Nenhum funcionário ganhou regra nova.
- Testes oficiais foram atualizados e foram criadas regressões lógica e visual da V96.

## Provas de validação

| Prova | Resultado |
|---|---|
| Regressão V96 — wrappers, atomicidade, falha do log, oito papéis e negativas | 28/28 aprovada |
| Regressão V96 UI — cliques reais, retorno, negativa e mobile | 10/10 aprovada |
| Regressão crítica | 608/608 aprovada |
| Regressão V95 de legendas | 15/15 aprovada |
| Regressão V74 | 37/37 aprovada |
| Regressão V81 segurança, com VM Modules | 20/20 aprovada |
| Regressão V85 acesso a calendários, com VM Modules | 19/19 aprovada |
| Regressão V89 carteira/papéis | 8/8 aprovada |
| UI V89 calendários | 7/7 cliques reais aprovados |
| UI V91 publicados | 4/4 cliques reais aprovados |
| `calendario.html` × `calendarios.html` | byte a byte idênticos |
| JavaScript inline | 9/9 sintaticamente válidos |
| Preflight funcional | todos os controles passaram; resultado global bloqueado somente pela cópia antiga `regression-critical.mjs` na raiz, incidente pré-existente preservado por decisão explícita |

Os testes usam dados sintéticos e stubs. Nenhuma coleção, cliente, funcionário ou regra publicada foi alterada durante a validação.

## Riscos e pendências

- Estado atual: **corrigido e validado localmente; não publicado**.
- A regra Firebase precisa entrar antes dos HTML V96. Se os HTML entrarem primeiro, toda tentativa delegada falhará fechada — não haverá escrita sem recibo.
- Campos de negócio como `legendaPor` continuam usando o papel operado para preservar os fluxos existentes; a autoria técnica real fica em `log_operacoes_delegadas`.
- Os caminhos do recibo podem conter IDs técnicos de documentos. O log não contém payload, legenda, telefone nem valor e só Chris pode lê-lo.
- O Firebase Emulator continua indisponível neste projeto; as regras foram validadas estruturalmente e pela regressão local, não executadas contra um emulador nem lidas da produção.
- A operação real por Chris, a negativa com conta real de funcionário e a existência do recibo no Firebase ainda dependem da publicação e de autorização específica para um teste operacional.

## Próximo passo

Publicar primeiro `firestore.rules`, depois os três HTML e os scripts. Após comparar os hashes publicados, fazer uma única ação sintética/autorizada como Gabrielle, recarregar, conferir o efeito da fila e ler o recibo correspondente. O alvo real e o rollback dessa escrita serão congelados antes do clique.
