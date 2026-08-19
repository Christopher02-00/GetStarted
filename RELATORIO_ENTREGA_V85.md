# Get Started — recuperação do acesso aos calendários (V85)

Data da auditoria: 18/08/2026  
Escopo: acesso do cliente pelo Portal e link individual; abertura interna da equipe; compatibilidade de meses e links antigos.  
Publicação: **não realizada pelo Codex**. O usuário publica GitHub e Firebase.

## Matriz de recuperação

| Pedido/falha | Evidência anterior | Causa comprovada | Mudança local | Validação | Estado |
|---|---|---|---|---|---|
| Cliente abrir agosto pelo link individual | Produção autenticou Vitalle, mas abriu o estado de setembro e exibiu preparação | Agosto tinha itens explícitos, sem `mesLegado`; o primeiro mapa mensal existia somente para setembro | Compatibilidade restrita para mês com conteúdo anterior à primeira competência controlada; cabeçalho usa o mês solicitado | Chrome + Firebase real: Vitalle abriu **Agosto 2026**, 11 conteúdos, liberado, sem expirado/preparação | Corrigido e validado localmente; aguarda publicação |
| Cliente abrir agosto dentro do Portal | Produção abriu o Portal, mas exibiu “Calendário em preparação” | O Portal repetia o mesmo cálculo que reclassificava agosto como rascunho | Mesmo critério de arquivo histórico aplicado no Portal | Chrome + Firebase real: Portal Vitalle abriu **Aprovação — Agosto 2026** com conteúdos completos | Corrigido e validado localmente; aguarda publicação |
| Setembro ainda em revisão não aparecer ao cliente | Firestore mostra setembro da Vitalle em `aguardando_interna` | Comportamento esperado | Estado explícito continua prioritário | Teste real e regressão confirmam setembro oculto | Confirmado |
| Links antigos aparecerem expirados | Firebase publicado ainda mostra regras **V31**; o fallback histórico exige ausência de `clientes_acesso` | Regra publicada não corresponde ao arquivo atual | `firestore.rules` V85 mantém token histórico apenas do mesmo cliente, ativo e vigente, condicionado ao acesso canônico ativo e vigente | Regressões V83/V85 aprovadas; comparação visual da regra publicada confirmou divergência | Preparado localmente; depende da publicação das regras pelo usuário |
| Gabi abrir iPhone Campo Largo para iniciar calendário | Relato da Gabi; Firestore não possui `calendarios/iphone-campo-largo` | Cliente existe, mas o calendário ainda não foi criado; o editor interno antigo dependia de token externo | V84/V85 usam sessão Google da equipe com `interno=1`, sem token do cliente | Sessão real de equipe abriu iPhone Campo Largo sem “expirado”/“sessão negada”; teste não gravou e a ausência do documento foi reconfirmada | Abertura confirmada com conta de equipe; ação específica na conta da Gabi não executada |
| Cecília copiar mês histórico | Testes V83 e relato anterior | Mês liberado precisava preservar `mes` e não depender de token de equipe prolongado | Arquivo interno autenticado + link externo com mês explícito | V83 arquivo 15/15; V81 calendários 69/69; V85 18/18 | Validado localmente; sessão real da Cecília não disponível |
| Contatos recorrentes / contratos Amanda / vídeo externo | Pedidos anteriores do mesmo dia | Fora da alteração V85 | Nenhuma nova mudança nesses fluxos | Contatos 25/25 e 30/30; clientes 49/49; segurança 20/20; vídeo externo 72/72 | Sem regressão automatizada detectada; não revalidado na tela de cada usuária nesta rodada |

## Arquivos alterados

- `calendario.html`
- `calendarios.html`
- `portal-cliente.html`
- `firestore.rules`
- `CATALOGO_DE_ERROS.md`
- `scripts/regression-critical.mjs`
- `scripts/regression-v85-acesso-calendarios-clientes.mjs` (novo)
- `RELATORIO_ENTREGA_V85.md` (novo)
- `UPLOAD_V85.txt` (novo)

## Provas executadas

- Regressão V85 falhou na base anterior no primeiro cenário: agosto anterior ao controle mensal não era liberado.
- Regressão V85 corrigida: 18/18.
- Links V83: 18/18.
- Arquivo V83: 15/15.
- Calendários V81: 69/69.
- Portal/Stories V81: 24/24.
- Preflight: aprovado.
- Regressão crítica: 608/608.
- Clientes V81: 49/49.
- Contatos V81: 25/25.
- Integridade V81: 15/15.
- Segurança V81: 20/20.
- Vendas V81: 30/30.
- Vídeos externos V81: 72/72.
- Contatos/contratos V83: 30/30.
- `calendario.html` e `calendarios.html`: byte a byte idênticos.
- Teste funcional real, sem escrita de calendário: Vitalle no link individual e no Portal; abertura interna do iPhone Campo Largo; ausência do documento reconfirmada após o teste.

## Limite que não deve ser escondido

O HTML corrigido ainda não está publicado e as regras efetivas no Firebase continuam V31 no momento desta auditoria. Portanto, a correção está comprovada localmente contra dados reais, mas não pode ser chamada de corrigida em produção antes de o usuário publicar os arquivos do GitHub **e** aplicar `firestore.rules` no Firebase. GitHub não publica regras do Firestore.
