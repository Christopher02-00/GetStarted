# Get Started — entrega V77: Central de Vendas

Data: 17/08/2026  
Build: `2026-08-17-central-vendas-v77`

## Objetivo entregue

A V77 centraliza pré-cadastros, propostas, reuniões e acompanhamento comercial sem criar uma segunda fonte de verdade. A coleção existente `negocios` continua sendo o funil; `reunioes_vendas` guarda somente atas comerciais privadas. O cadastro final de cliente permanece separado e exige conferência na Entrada de Clientes.

## Fluxo oficial

1. Interessado recebe `https://get-started.agency/avulso.html`.
2. Escolhe projeto avulso, evento pessoal ou plano mensal, informa origem e contato.
3. O formulário reserva protocolo, grava e relê o mesmo documento antes de confirmar.
4. O WhatsApp institucional abre com o resumo; a mensagem só é enviada por ação humana.
5. A Central de Vendas importa o lead uma vez para `negocios`, acompanha proposta, follow-up e resultado.
6. Se fechar mensalidade, o cliente recebe `https://get-started.agency/avulso.html?modo=cadastro`.
7. A Entrada de Clientes confere valor e ativa a identidade. O funil nunca cria mensalista automaticamente.

## Recursos

- Botão verde `Central de Vendas` na área financeira, exclusivo de Chris por DOM e porta de navegação.
- Indicadores mensais de leads, propostas, fechamentos, conversão, pipeline e follow-ups atrasados.
- Origem dos leads e busca por nome, telefone ou interesse.
- Proposta manual para prospect ou cliente existente, vinculada à identidade canônica sem duplicar cadastro.
- Registro rápido de reunião, anotações livres, resumo copiável e reaproveitamento na proposta.
- Arquivo permanente por soft-delete e etapas terminais preservadas.
- Mensagem de boas-vindas individual com pré-cadastro e destinatário validado.
- Número institucional `(41) 99908-8357` no site, página de links, formulário e Portal.

## Segurança e compatibilidade

- `negocios` continua privado da gerência, com leitura estreita do próprio cliente no Portal.
- `reunioes_vendas` é exclusiva da gerência; exclusão física é proibida.
- Recibo público permite somente `get` do documento criado pelo mesmo UID anônimo; `list` continua exclusivo da gerência.
- Leads antigos sem protocolo permanecem legíveis pela gerência e não são alterados.
- `cadastro.html` continua redirecionando ao onboarding final; não existe terceiro formulário concorrente.
- Mensalista sem ficha ativa é bloqueado antes de qualquer criação em `clientes_extras` ou `receitas_avulsas`.

## Validação exigida

- `scripts/preflight.mjs`
- `scripts/regression-critical.mjs`
- `scripts/regression-v71.mjs` a `scripts/regression-v77.mjs`
- inspeção local desktop/mobile de `index.html`, `links.html`, `avulso.html` e `escritorio.html`
- comparação do build publicado e das regras efetivamente implantadas antes de declarar produção concluída

## Limite operacional

O site prepara a conversa no WhatsApp, mas não envia mensagem sozinho. Publicar o HTML no GitHub não publica automaticamente as regras do Firestore; as duas versões precisam ser verificadas separadamente.
