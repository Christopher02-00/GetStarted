# V91.1 — porta residual de calendário na Central

Data: 19/08/2026  
Escopo: somente o atalho de calendário da ficha central de Hitech/Rodrigo.  
Publicação: a V91 foi confirmada no site; este patch V91.1 está preparado localmente e ainda não foi publicado.

## Evidência na V91 publicada

- Os quatro HTML públicos responderam com o build `2026-08-19-calendarios-stories-v91`.
- Calendários, Montar e editar, Links e envio e Resgatar exibiram iPhone Campo Largo, Açougue São Joaquim, Joaquin Assados e Hitech.
- Rodrigo, IKN Brasil e X Joias ficaram fora dessas carteiras.
- Publicados e arquivo removeu `AUDITORIA V87 — NÃO É CLIENTE`, removeu avulsos e mostrou Zeiss/Agosto uma vez.
- A Central confirmou Hitech e Rodrigo como fichas separadas, mas o cartão do Rodrigo ainda renderizava o botão genérico `Calendário`.

## Correção V91.1

- O cartão mensal continua renderizado para Rodrigo, inclusive Portal, ficha, edição cadastral, financeiro e saída.
- O botão `Calendário` aparece somente quando o mensalista não é classificado como cliente somente edição.
- Hitech preserva o botão e a operação editorial independente.
- Nenhuma coleção, documento, token ou regra Firebase foi alterado.

## Evidências de validação local

- Teste Chrome isolado V91.1: 6/6, incluindo clique real no botão de calendário da Hitech e ausência do botão em Rodrigo.
- Regressão crítica: 608/608.
- Preflight geral: aprovado, incluindo sintaxe dos nove scripts inline, handlers, papéis, regras e igualdade dos calendários.
- V90 carteira real: 12/12.
- V91 carteira/publicados: 15/15.
- V91 UI publicados: 4/4 com clique real.
- `calendario.html` e `calendarios.html` permanecem byte a byte idênticos; eles não fazem parte deste patch.

## Limite de validação

O patch V91.1 ainda não está no site público. Após o upload, a prova final é abrir Central de Clientes e confirmar visualmente: Hitech com botão `Calendário`; Rodrigo sem esse botão e com os demais controles preservados.

## Reversão

Repor apenas o `escritorio.html` da V91 desfaz o patch. Não existe reversão de dados porque não há escrita ou migração.
