# V90 — Calendários, Stories e separação Hitech/Rodrigo

Data da validação: 19/08/2026.

## 1. Reprodução real na versão publicada V89

A versão publicada foi aberta em `https://get-started.agency/escritorio.html?validacao-real=v89`, autenticada como Chris. Os quatro HTMLs publicados possuíam o mesmo hash do pacote V89.

Em **Calendários → Visão do mês**, setembro de 2026 mostrou:

- 16 clientes na carteira;
- 8 calendários publicados;
- 1 em montagem;
- 7 sem calendário.

Em **Central de Clientes**, a mesma produção confirmou 23 mensalistas ativos. A comparação das telas mostrou seis mensalistas que deveriam operar calendário, mas não possuíam cartão na tela da Gabi:

- Açougue São Joaquim;
- Cookiery;
- Dra. Júlia;
- Emanuelle Bernaski Nutri;
- iPhone Campo Largo;
- Joaquin Assados.

Açougue e Joaquin tinham saída futura em 15/09/2026 e continuavam operacionais até essa data. A Central também apresentava `Rodrigo / Hitech` como uma única identidade. O responsável confirmou que isso estava errado: Hitech é a empresa mensalista; Rodrigo é outro cliente, de somente edição de vídeos.

IKN e X Joias não apareceram na carteira recorrente. Rodrigo e She Joias apareciam como entrega direta na Central e, corretamente, não eram obrigação de calendário.

Nenhum dado foi escrito, corrigido ou apagado durante essa reprodução.

## 2. Causa comprovada

A V89 deixou duas causas residuais:

1. uma casta antiga e genérica de `clientes_extras` ainda podia retirar um mensalista confirmado, mesmo quando a Central o reconhecia como recorrente;
2. `hitech` era convertido em `rodrigo`, e o Portal tratava Hitech como plano só edição.

Por isso a tela deixou de travar, mas a carteira continuou incompleta.

## 3. Alteração local V90

- a compatibilidade operacional inclui os mensalistas reais confirmados;
- uma casta genérica antiga não vence mais essa confirmação;
- avulso, interno, encerrado, entrega direta, saída efetiva e as exceções IKN/X Joias continuam fora;
- Hitech não é mais alias de Rodrigo;
- `cliente-rodrigo` continua sendo alias verdadeiro de Rodrigo;
- o Portal removeu Hitech da lista de clientes só edição;
- os dois endereços de calendário continuam byte a byte idênticos;
- nenhuma regra Firestore foi alterada;
- nenhum documento Firestore foi criado, movido, fundido ou apagado.

## 4. Evidências de validação local

O novo teste `scripts/regression-v90-carteira-mensalistas-reais.mjs` foi executado contra o `escritorio.html` publicado da V89 e falhou no primeiro mensalista ausente, Açougue São Joaquim. O mesmo teste passou 12/12 na V90.

Resultados após a correção:

- preflight geral: aprovado;
- regressão crítica: 608 asserções aprovadas;
- V90 carteira real: 12/12;
- V89 carteira/papéis: 8/8;
- V74 identidade/compatibilidade: 37/37;
- V83 contatos/contratos: 30/30;
- V81 clientes: 49/49;
- V81 calendários: 67/67;
- V85 acesso de clientes: 19/19;
- V86 calendário simples: 24/24;
- V86 Stories: 19/19;
- V87 operação de calendários: 50/50;
- V88 arquivo/avulsos: 55/55;
- V81 Portal/Stories: 25/25;
- V89 Stories/operação: 15/15;
- clique real local em Calendários: 7/7;
- cadeia local com cliques Gabi → Amanda → Cecília → cliente: 9/9;
- clique real local em Stories: 11/11.

O teste visual reforçado abriu as telas em Chrome isolado e confirmou todos os mensalistas ausentes, Hitech separada, Rodrigo fora da carteira, IKN/X Joias fora, preservação do último retrato e erro sem conversão para lista vazia.

## 5. Limites de validação

- A V90 está pronta localmente, mas ainda não foi publicada pelo usuário; portanto a carteira publicada continua sendo a V89 até o próximo upload.
- Após o upload, a prova necessária é repetir a contagem publicada e confirmar Hitech e Rodrigo como identidades separadas.
- A tela operacional real de Stories da Gabi/Amanda não foi aberta com uma conta desses papéis nesta rodada. A conta Chris oculta essa porta, e a credencial gerencial disponível anteriormente não foi aceita. Os testes de Stories desta V90 são locais e interativos, não uma escrita em produção.
- Nenhuma transição real de Gabi/Amanda/Cecília nem dado real de cliente foi alterado para testar. Escrita em produção continua condicionada a autorização pontual com coleção, dado fictício, impacto e limpeza.

## 6. Reversão

A reversão é substituir os quatro HTMLs V90 pelos quatro HTMLs V89. Não existe migração de dados para desfazer.
