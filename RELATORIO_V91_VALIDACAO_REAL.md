# V91 — validação real pós-publicação da V90

Data: 19/08/2026  
Escopo: somente Calendários e efeitos diretos de Stories/carteira.  
Publicação: o usuário publicou a V90; a V91 descrita aqui está preparada localmente e ainda não foi comprovada em produção.

## Evidências observadas na V90 publicada

- Os quatro endereços públicos (`escritorio.html`, `portal-cliente.html`, `calendario.html` e `calendarios.html`) responderam com o marcador `2026-08-19-calendarios-stories-v90`.
- Login real do Chris no Escritório e cliques reais em Calendários, Central de Clientes e suas subtelas.
- A Central mostrou 24 mensalistas ativos e 2 trabalhos avulsos.
- Hitech e Rodrigo apareceram em cartões separados. Hitech: empresa mensalista com calendário; Rodrigo: cliente de entrega direta/só edição, fora da carteira editorial.
- A tela de Calendários mostrou 12 competências liberadas, 2 em montagem e 6 vazias.
- `Montar e editar`, `Links e envio` e `Resgatar` continuaram sem iPhone Campo Largo, Açougue São Joaquim e Joaquin Assados, apesar de a Central confirmar os três como mensalistas; Açougue/Joaquin operam até a saída futura de 15/09/2026.
- O botão Calendário da ficha do iPhone abriu o editor interno vazio de setembro, comprovando que o editor funciona e que a falha está na projeção/lista geral, antes da abertura do documento.
- `Publicados e arquivo` mostrou 28 linhas, incluindo `AUDITORIA V87 — NÃO É CLIENTE` e duas linhas `Zeiss · Agosto 2026`.
- Central confirmou Stories habilitados para Juliane Nerone e Vitalle Odonto. Não houve escrita de Story nem troca para as contas reais da Gabi/Amanda nesta validação.

## Causa comprovada

1. A compatibilidade mensalista V90 ainda era aplicada depois dos bloqueios residuais de `clientes_config`: `clienteInativo`, casta diferente de mensalista, `semConteudoRecorrente` e `tipoEntrega` podiam vencer a ficha oficial já corrigida.
2. Publicados/arquivo percorria todos os documentos brutos da coleção `calendarios`, sem cruzar a carteira recorrente nem consolidar `slug canônico + competência`.

## Correção local V91

- Mensalistas confirmados permanecem na carteira até a saída efetiva. Saída futura não remove a operação antes da data.
- `ativo:false`, soft-delete, `inativoDesde` alcançado e saída efetiva continuam removendo o cliente.
- iPhone Campo Largo, Açougue São Joaquim, Joaquin Assados, Hitech e Zeiss entram na mesma projeção canônica.
- Rodrigo continua fora do calendário por ser somente edição.
- IKN Brasil e X Joias continuam fora por serem avulsos.
- Publicados/arquivo cruza a carteira recorrente, consolida aliases por cliente+mês e preserva a cópia com mais conteúdo.
- O registro de auditoria V87 e IKN deixam de aparecer na listagem visual; Zeiss/Agosto aparece uma vez. Nenhum documento é apagado do Firestore.
- `calendario.html` e `calendarios.html` permanecem byte a byte idênticos.

## Evidências de validação local

- V91 carteira/publicados: 15/15.
- Chrome isolado, clique real em `Montar e editar` e `Visão do mês`: 7/7.
- Chrome isolado, clique real em `Publicados e arquivo`: 4/4.
- V90 carteira real: 12/12.
- V89 carteira/papéis: 8/8.
- V89 Stories/operação: 15/15.
- V88 arquivo/avulsos: 55/55.
- V87 Calendários/operação: 50/50.
- V81 clientes: 49/49.
- V81 calendários: 67/67.
- V81 Portal/Stories: 25/25.
- V83 contatos/contratos: 30/30.
- Regressão crítica: 608/608.
- Preflight geral: aprovado.
- Total enumerado fora do preflight: 945 verificações aprovadas.

## Limites de validação

- V91 ainda não foi publicada; portanto iPhone/Açougue/Joaquin e a limpeza visual do arquivo ainda não estão comprovados no site público.
- Nenhum documento do Firebase foi criado, atualizado, arquivado ou removido por esta correção.
- O fluxo real autenticado como Gabi/Amanda/Cecília depende das contas dessas pessoas ou de uma sessão delas. O teste por papéis foi executado em Chrome isolado com as barreiras reais do código, mas não substitui o login pessoal de cada funcionária.
- Stories reais foram preservados pelas suítes e a Central confirmou a elegibilidade de Juliane/Vitalle, mas não houve publicação de roteiro/links nem resposta de cliente em produção.

## Reversão

Repor os quatro HTML da V90 desfaz integralmente a mudança funcional. A V91 não exige reversão de dados porque não migra nem apaga Firestore.
