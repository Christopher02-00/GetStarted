# Entrega V72 — Régua de Cobrança e contatos do WhatsApp

Data: 17/08/2026  
Base oficial: `main` em `23cf4a5fcc015af9d99f8e92a2179fc236bf6d96`

## Incidentes comprovados

- A Central de mensagens preservava apenas o telefone do cadastro escolhido como principal; um campo vazio podia apagar o contato válido da ficha complementar.
- A Central não reutilizava `whatsappCobranca`, embora esse fosse o número específico já usado no Financeiro.
- A Régua chamava `window.open()` depois de leituras assíncronas, sujeitando a nova aba ao bloqueio de pop-up.
- Abrir a conversa já incrementava `cobrancasFeitas`, atualizava `ultimaCobranca` e gravava log, sem confirmação de envio.
- Régua e Mensalidades possuíam dois montadores diferentes, com emojis e estruturas diferentes.
- O upload V71 colocou o teste dirigido no caminho `scripts/regression-critical.mjs`, reduzindo a suíte crítica de 1.856 para 92 linhas. `scripts/regression-v71.mjs` e `RELATORIO_ENTREGA_V71.md` ficaram ausentes.

## Correção preparada

- Uma função central escolhe contato válido na ordem: número específico de cobrança, telefone da ficha e WhatsApp legado.
- A consolidação canônica preserva telefone e `whatsappCobranca` não vazios entre ficha oficial, legado e aliases.
- Central, Mensalidades e Régua usam a mesma normalização brasileira com DDD e abrem `https://web.whatsapp.com/send` para o número confirmado.
- A Régua cria a aba em branco no gesto do clique, relê mensalidade/contato e somente então navega para a conversa correta; qualquer falha fecha a aba.
- As cinco mensagens financeiras usam parágrafos e linhas separadas para referência, valor, vencimento, PIX, pedido e comprovante, sem emoji decorativo.
- Abrir conversa não grava nada. O contador e o histórico mudam somente após “Confirmar que enviei”, em transação e com revalidação do estado.
- Mensalidades delega para a mesma função da Régua; o segundo redator foi removido.
- Falha de leitura da Régua mostra indisponibilidade e `!`, sem transformar erro em fila vazia.
- A suíte crítica foi restaurada do histórico; os artefatos V71 foram recolocados nos nomes corretos.

## Arquivos da entrega

- `escritorio.html`
- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v71.mjs`
- `scripts/regression-v72.mjs`
- `CATALOGO_DE_ERROS.md`
- `AGENTS.md`
- `RELATORIO_ENTREGA_V71.md`
- `RELATORIO_ENTREGA_V72.md`

## Validação concluída

- `scripts/regression-v72.mjs`: aprovado com 50 asserções dirigidas.
- `scripts/regression-v71.mjs`: aprovado com 18 asserções dirigidas.
- `scripts/preflight.mjs`: aprovado com 9/9 scripts inline válidos, 950 handlers diretos resolvidos e build V72 correto.
- `scripts/regression-critical.mjs`: restaurado e aprovado com 604 asserções.
- Desktop 1280×900: Régua e Central renderizadas com os controles esperados.
- Mobile 390×844: as duas telas ficaram com `scrollWidth === clientWidth === 390`; os botões permaneceram legíveis e empilhados.
- WhatsApp Business real foi confirmado aberto e conectado no Chrome, apenas em leitura. Nenhuma conversa de cliente foi aberta e nenhuma mensagem foi enviada.
- `firestore.rules`, calendários, Portal e dados de produção não foram alterados.

## Limites reais

- Clientes sem telefone válido em nenhuma fonte continuam bloqueados: o sistema não inventa contato. O cartão direciona para a Central de Clientes para cadastrar o número.
- Os testes comprovam código, links, destinatários distintos, mensagens, transação e responsividade local. A V72 só poderá ser chamada de publicada depois do upload e da verificação do build no domínio.
- O teste não enviou cobrança real nem atualizou `ultimaCobranca`; essa escrita só acontece por ação humana explícita depois da publicação.
