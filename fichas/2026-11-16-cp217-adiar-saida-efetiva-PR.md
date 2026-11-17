fix(clientes): adiar uma saída já efetiva sem cobrança nova (CP217, Fior)

## 1. Entendimento
Pedido do Chris (16/11): a Fior Restaurante teve a saída registrada (sai 16/11/2026, último mês 2026-10, protocolo `saida_fior-restaurante_2026-11-16`) e depois decidiu continuar até 30/11 para terminar as postagens. Como a data é hoje, a saída ficou efetiva: a Cecília não consegue mais agendar as postagens do cliente e o Arquivo só oferece "Reativar cliente" (que pede valor e primeiro mês = cobrança nova). Unidade B (CP217). Ficha: `fichas/2026-11-16-cp217-adiar-saida-efetiva.md`.

## 2. Alterações
- `escritorio.html` (hash git antes 64a6a9e2…): função interna `adiarSaidaEfetivaCentralCp217` (ao lado de `cancelarProgramacaoSaidaCentral`); bloco "Adiar a saída" no cartão do Arquivo (`htmlArquivado`), só para mensalista com saída efetiva em `clientes_encerrados`, competência final válida, sem alias/fusão e sem outro `saidaAtivaId`; listener no render do Arquivo (sem `window.*` novo).
- Uma transação: o MESMO registro de saída volta a `programada` com a nova data e ganha `adiamentosSaida[]` (de, para, competência final, motivo, quem, quando, estado/efetivação anteriores). Config, extras, cadastro/lead e contrato voltam ao estado de saída programada; acesso canônico do Portal + token dele (e Stories, se o cliente tinha) voltam até a nova data. Confere na transação: saída ainda efetiva, mesmo slug, mesma competência final no registro e no contrato, ponteiro canônico, credencial. Mensalidades e vigências não são tocadas.
- Jornada nova `ensaio/jornadas/J72-adiar-saida-efetiva.mjs`; linha no `ensaio/README.md`; invariante no `AGENTS.md`; contagem no `CLAUDE.md`.
- Nenhum módulo `.mjs` do site mudou (sem `?v=` a trocar). Sem mudança em `firestore.rules` nem em `functions-get/`.

## 3. Provas
- Sintaxe: `extrair_inline.py | node --check` ok. Caminhos: 0 handlers quebrados, nada novo além da linha de base. Duplicatas: 0 divergência nova.
- Contraprova (main, worktree limpa + J72): "Amanda adia a saída" ❌ (não existe caminho) e "Cecília agenda depois" ❌ (agendar recusado).
- Na branch: J72 5/5 (antes: agendar recusado; Amanda adia 16/11 → 30/11, competência final igual, contrato ativo com as mesmas vigências, mensalidades idênticas, 1 registro de saída, Portal canônico de volta; depois: 2/2 postagens na fila e a Cecília agenda).
- Portão inteiro: desktop 177/177 verde · `--movel` 177/177 verde.
- Não testado: dado real da Fior (só leitura não foi feita; nenhuma escrita em produção).

## 4. Riscos / pendências
- Onboarding encerrado pela efetivação não é reaberto (só aparência na Central). Aliases antigos do Portal continuam desligados; só a credencial canônica volta.
- Na nova data o motor efetiva de novo a mesma saída, com a mesma competência final.
- Regra vigente mantida: saída operacional e competência final continuam um compromisso único — só a data operacional muda.
- Correção real da Fior (nova data 30/11/2026, competência final 2026-10) depende do ok do Chris depois da publicação: Central de Clientes → "Saídas, arquivo e reativação" → Fior Restaurante → "Adiar a saída" → data 30/11/2026 + motivo → confirmar.

## 5. Próximo passo
Aguardar revisão; depois publicar pela skill `get-publicacao-e-rollback` (só código; sem rules/Functions) e então a Amanda/Chris aplica o adiamento da Fior na tela.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
