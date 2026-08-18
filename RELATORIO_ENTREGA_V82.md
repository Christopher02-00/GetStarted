# Get Started — entrega local V82

Data da preparação: 18/08/2026  
Publicação executada pelo Codex: **nenhuma**

## Entendimento

A Central de Vendas já era exclusiva do Chris na navegação e no DOM, mas as regras V81 ainda autorizavam Amanda por `ehGerencia()` nas coleções `negocios` e `reunioes_vendas`. A V82 fecha somente essa divergência de autorização, sem alterar telas, dados, propostas existentes ou os demais fluxos da Amanda.

## Alterações

- `firestore.rules`
  - leitura/criação gerencial de `negocios`: `ehChris()`;
  - atualização gerencial de `negocios`: `ehChris()`;
  - leitura/criação/atualização de `reunioes_vendas`: `ehChris()`;
  - resposta estreita do cliente à própria proposta foi preservada;
  - envio HTTPS do comprovante pelo próprio cliente foi preservado;
  - exclusão física continua proibida.
- `CATALOGO_DE_ERROS.md`
  - incidente 70.21 registra causa, correção e regra permanente de autorização por papel.

## Provas de validação

| Verificação | Resultado |
|---|---:|
| Segurança V81/V82 | 20/20 |
| Preflight geral | aprovado |
| Regressão crítica | 608/608 |
| Ciclo de clientes | 47/47 |
| Calendários | 64/64 |
| Portal/Stories | 24/24 |
| Integridade | 15/15 |
| Vendas | 30/30 |
| Vídeos externos | 72/72 |
| Contatos privados | 25/25 |
| `git diff --check` | aprovado |

Os testes validam código, sintaxe, invariantes e matriz estática das regras. Não houve escrita de produção nem Rules Emulator nesta entrega.

## Riscos e pendências

- A alteração estará efetiva somente depois que o usuário publicar `firestore.rules` no Firebase.
- Depois da publicação, deve-se confirmar no console que a versão implantada é byte a byte igual ao arquivo V82 e testar uma conta Amanda: Central ausente e leitura direta negada; conta Chris: Central disponível; cliente: resposta da própria proposta preservada.
- O bloqueio estrutural 70.19 de calendários multicompetência permanece documentado. Ele exige projeção nova, migração com recibos e Rules Emulator; não foi misturado a esta correção pequena de autorização.

## Próximo passo

1. No GitHub, substituir `firestore.rules` e `CATALOGO_DE_ERROS.md` pelos arquivos da pasta V82.
2. No Firebase, publicar exatamente o `firestore.rules` V82.
3. Informar nesta conversa que a publicação terminou para a comparação somente leitura da regra implantada.

Nenhum HTML precisa ser reenviado nesta V82.
