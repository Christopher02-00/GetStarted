# RELATÓRIO V102 — IDENTIDADE SEGURA PARA CALENDÁRIOS LEGADOS

Data: 21/08/2026  
Build: `2026-08-21-itemids-calendarios-legados-v102`  
Pai: V101 — Controle de conclusão dos calendários

## Resultado

A V102 corrige a causa que mantinha itens antigos como `legado — somente leitura`: ausência de `itemId` persistido. A solução não tenta reconhecer conteúdos por título, nome, índice ou posição. Ela oferece ao Chris real uma ferramenta explícita em **Calendários → Controle de conclusão** para gerar identidades estáveis com prévia, backup, transação, recibo e verificação posterior.

Renderizar o painel continua sem escrita. A migração só começa depois de o Chris clicar em **Ver prévia**, analisar os totais e confirmar **Aplicar correção**.

## Comportamento

- a prévia lê e mostra somente contagens por calendário;
- IDs válidos existentes ficam byte a byte preservados;
- cada ausência recebe `legacy_` + SHA-256 determinístico da identidade do calendário, competência, posição e retrato estável do item;
- títulos iguais recebem IDs diferentes e nunca são relacionados por nome;
- itens em soft-delete também recebem ID para não voltarem como legado em uma restauração;
- ID inválido, duplicado, colisão, concorrência ou falha de leitura bloqueiam o calendário;
- retry é idempotente; uma execução parcial pode ser retomada sem trocar IDs já aplicados;
- depois da migração, o Controle V101 pode conferir o item pela identidade canônica, desde que o estado operacional permita.

## Escritas autorizadas pela ferramenta

Cada calendário é processado em uma única transação que:

1. cria backup integral em `calendarios_versoes/{calendarId}__v102_itemids__{operationId}`;
2. atualiza por merge somente `calendarios/{calendarId}.items` e metadados V102;
3. cria recibo append-only em `calendarios_itemid_migracoes/{calendarId}/operacoes/{operationId}`.

O recibo armazena identidade técnica, contagens, SHA-256, autoria e horário — nunca título, roteiro, legenda ou cópia da pauta. A transação é confirmada por releitura do calendário e do recibo.

## Proteções no editor e no resgate

`calendario.html` e `calendarios.html` continuam byte a byte idênticos. Antes de um `setDoc` integral, o editor preserva IDs e metadados já existentes no servidor. Se uma aba antiga tentar remover um ID conhecido, a gravação falha fechada e orienta juntar/recarregar. Restauração e varredura atribuem identidade aos itens recuperados antes de escrever, sem criar conferência administrativa.

## Regras Firebase

As regras V102 preservam os escritores normais de calendário e acrescentam um contrato específico para migração:

- somente Chris real cria recibo e executa a atualização marcada como V102;
- campos, versão, operação, contagens, SHA-256, autoria e `request.time` são validados;
- atualização do calendário exige recibo no mesmo commit;
- recibo exige backup correspondente no mesmo commit;
- recibo é imutável e delete físico permanece proibido;
- Cecília e os demais papéis não recebem permissão de migração.

## Fronteiras preservadas

A V102 não altera títulos, estados, competência, ordem, vídeos, postagens, sessões, Portal, workflow editorial ou autorização de captação. Produção V100 com `calendarItemId` nulo permanece sem vínculo e jamais é ligada à pauta por título. A migração também não cria nenhuma conferência da Cecília.

## Provas locais

- V102 lógica: **39/39**;
- V102 UI: **22/22**, desktop e mobile;
- regras V101+V102 no Firestore Emulator isolado: **55/55**, `expression_limit_hits=0`;
- V101 lógica: **128/128**;
- V101 UI: **127/127**;
- V100: **58/58**;
- V99: **80/80**;
- regressão crítica: **610/610**;
- calendários singular/plural: byte a byte idênticos.

O `preflight` funcional conserva como única barreira conhecida a cópia histórica `regression-critical.mjs` na raiz. Ela não pertence a esta causa, não foi removida e continua excluída do Pages.

## Rollback

O pacote traz `rollback_v101/` com `escritorio.html`, `calendario.html`, `calendarios.html` e `firestore.rules` da V101. Restaurar o código não apaga IDs já aplicados: eles podem já estar referenciados por conferências. Uma reversão de dados só pode ocorrer em operação separada, conscientemente autorizada, usando o backup integral de cada calendário.

## Estado

**Corrigido e validado localmente / pronto para publicação.** Produção continua V101 até o usuário publicar os arquivos e as regras. A normalização real ainda não foi executada pelo Codex; depois do deploy, o usuário deve abrir a prévia e aplicar a correção no perfil real do Chris.
