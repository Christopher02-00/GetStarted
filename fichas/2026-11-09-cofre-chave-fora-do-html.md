# cofre-chave-fora-do-html — tirar do HTML público a chave do cofre e as senhas antigas

Pedido original: P9 do pacote de passagem ("`SENHA_GERENCIA_COFRE` e um literal de senha em texto puro no `escritorio.html` … mover segredo"). Decisão do Chris em 09/11/2026: **acesso por papel**, sem senha no HTML.
Unidade: P9 parte 2 de 2 (a parte 1, documentos internos fora do Pages, é outro PR) · Tipo: ajuste de segurança
Reprodução: `get-started.agency/escritorio.html` (público) contém `const SENHA_GERENCIA_COFRE = '…'` (l. 19692) e a lista `TEXTOS_QUE_ESTAO_NO_CODIGO` com 3 senhas antigas em texto (l. 3453). Conferido no `main 42b4422`.

## Causa-raiz
As credenciais de clientes em `cofre_senhas` são cifradas (AES-GCM) com chave derivada (PBKDF2) de uma string **fixa no HTML público**. A cifra não protege nada: quem lê o documento também consegue a chave.
O acesso de verdade já é por papel nas rules: `cofre_senhas` → read `ae()||au()` (Chris/Amanda/Cecília por e-mail Google verificado), write `ae()`. A "senha do escritório" é só tela no navegador; as rules não dependem dela.

## Árvore
```
RAIZ: chave do cofre (SENHA_GERENCIA_COFRE → derivarChaveCofre)
├─ ESCRITORES  : salvarSenhaCofre (l. ~19804, criptografarTexto + addDoc em cofre_senhas)
├─ LEITORES    : revelarSenhaCofreNoAlvo (l. ~19817) ← revelarSenhaCofre (Chris/Amanda), revelarSenhaCofreCecilia (Cecília)
├─ OUTROS USOS : trocarSenhaEscritorio — lista TEXTOS_QUE_ESTAO_NO_CODIGO (bloqueia reusar senha exposta)
├─ HUMANOS     : Chris, Amanda (gestão), Cecília (só lê e revela por 8 s)
├─ RULES       : cofre_senhas (l. 1228); coleção nova cofre_chaves (não existe; bloco genérico é lista fechada → nasce negada)
├─ AUTOMAÇÕES  : nenhuma (grep: motor, Functions e Portal não tocam cofre_senhas)
├─ LEGADO      : todo doc atual tem senhaCriptografada {iv,dados} com a chave antiga; docs excluido:true também guardam segredo
└─ COLATERAL   : nenhum outro módulo/página usa criptografarTexto/descriptografarTexto (grep)
```

## Mudança (duas fases, dois PRs)
**Fase A — este PR** (rules + código; não grava dados sozinho):
1. Rules: `match/cofre_chaves/{AE}` → `get` se `ae()||au()`; `create` só `ab()` com `AE=='v2'`; sem `update`/`delete`/`list` (chave imutável).
2. Chave v2 = 32 bytes aleatórios (`crypto.getRandomValues`), importada como AES-GCM direto (sem PBKDF2). Lida de `cofre_chaves/v2` só na hora de cifrar/revelar, nunca guardada em global.
3. Doc novo/recriptografado: `senhaCriptografada` com `{iv,dados,versao:2}`. Leitor: `versao===2` → chave v2; senão → chave antiga (compatibilidade até a fase B).
4. Escritor novo: se `cofre_chaves/v2` existe → cifra com v2; se ainda não existe → cifra como hoje (v1), para não travar a Amanda; a migração converte depois.
5. Painel Segurança (só Chris): "Proteger o cofre" → **prévia zero-write** (quantos docs v1, v2, ilegíveis, arquivados) → confirmar → cria a chave v2 (se faltar) → por doc, transação: relê, decifra v1, cifra v2, confere que decifrar v2 dá o mesmo texto, grava; recibo em `log_automacoes` (contagens, ids, sem segredo). Idempotente: doc já v2 é pulado; clique duplo travado antes do 1º await.
6. (Descartado na implementação) Os 3 textos de `TEXTOS_QUE_ESTAO_NO_CODIGO` são pedaços da própria chave antiga e o domínio `get-started`; o mesmo acontece na checagem da l. ~3388. Enquanto a chave existir no arquivo, trocar por hash não esconde nada e enfraquece a checagem (de "contém" para "igual"). Saem todos juntos na fase B.

**Fase B — PR seguinte, só depois de a prévia mostrar 0 docs v1 em produção:** remover `SENHA_GERENCIA_COFRE`, a leitura v1, o PBKDF2 e os pedaços da chave em `TEXTOS_QUE_ESTAO_NO_CODIGO` e na checagem da l. ~3388. A chave antiga fica sem valor porque nenhum documento depende mais dela.

## O que NÃO muda
Quem acessa o cofre (rules de `cofre_senhas` iguais); tela da Cecília (só leitura, 8 s); senha do escritório e senhas pessoais (outra unidade, se o Chris quiser); soft-delete; nenhum outro módulo.

## Testes
- Jornada nova J15 (vermelha antes): Chris guarda credencial → Cecília revela o mesmo texto → `escritorio.html` não contém a string da chave v2; Amanda/Cecília não conseguem criar `cofre_chaves`; Helo não consegue ler `cofre_chaves/v2` (rules negam); migração no emulador: seed com 3 docs v1 (1 arquivado) → prévia mostra 3 v1 e não grava → aplicar → 3 v2, revelar devolve o texto original, 2º clique = 0 escritas.
- Bateria inteira + `--movel` (toca tela). J10 (Financeiro só Chris) e J01 (DOM por papel) obrigatórias.

## Autorizações necessárias (ok nominal do Chris)
- Rules: o merge publica `cofre_chaves` no Firebase automaticamente.
- Dados: o botão "Proteger o cofre" grava em produção quando o Chris clicar (prévia antes). O código não grava nada sozinho.

## Risco residual
- A chave antiga continua no histórico do git para sempre. Por isso a fase B só vem depois de recriptografar tudo.
- Quem já leu `cofre_senhas` antes (Chris/Amanda/Cecília) já viu as credenciais. Trocar as senhas dos clientes é decisão operacional, fora do código.
- Recomendação ao Chris: trocar a senha do escritório se ainda for uma das antigas (ela está pública).
