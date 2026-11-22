# Mapa da operação — de onde vem, para onde vai, quem devolve (Programa Estabilidade, 21/11/2026)

Cada linha é um caminho real da operação. Cada caminho tem:
- **prova**: a jornada, com clique real no emulador;
- **vigia**: a regra do Raio-X diário (`.github/scripts/raio-x-operacao.mjs`) que acusa quando o caminho trava em produção.

Caminho sem prova ou sem vigia é um ponto cego: criar os dois antes de mexer nele (skill `get-guardiao-operacao`).

## 1. O que vem do cliente
| Origem (quem/onde) | Chega para | Volta ao cliente | Prova | Vigia |
|---|---|---|---|---|
| Portal → pedido geral | Amanda (demanda, ao abrir Minhas Demandas) | resposta pela demanda | J99 | F1, F3 |
| Portal → pedido de agendamento | Cecília (demanda) | — | J99 | F1, F3 |
| Portal → pedido de calendário | Chris (servidor CP175 a cada 5 min) | calendário | J99 | F1, F3 |
| Portal → pedido de legenda | Chris → legenda na postagem | postagem | J48 | F1 |
| Portal → referência / ideia | Chris / Amanda (demanda) | — | J99 | F1 |
| Link do calendário → ajuste/observação por conteúdo | Chris (revisão CP112) → Amanda aprova → libera | mês liberado de novo | J06, J42, J55, J56, J60b–J60k, J78, J91–J94 | B1, B2, B4, F1 |
| Link do calendário → aprovação do conteúdo | Cecília/equipe (aviso CP191) | — | J20, J38 | — |
| Portal → isolamento entre clientes | ninguém além do próprio cliente | — | J05, J30 | — |

## 2. Calendário (preparação → criação → revisão → liberação → cliente)
| Etapa | Quem | Próximo | Prova | Vigia |
|---|---|---|---|---|
| Preparação / documento | Amanda | Chris cria | J06, J49, J49b, J104 (dados reais) | checagem prévia (07:31) |
| Criação e envio | Chris | Amanda revisa | J06, J36, J53, J104 (dados reais) | checagem prévia (editor lido como Chris e Amanda), vigia da liberação |
| Revisão / devolução | Amanda | Chris refaz ou libera | J52, J53, J60f, J60k | vigia da liberação |
| Liberação | Amanda | cliente e filmmaker leem | J06, J55, J60h | E1, E2, vigia da liberação |
| Ajuste interno em mês liberado | Chris → Amanda | libera junto | J60, J60b–J60e, J62, J67, J71, J84 | B3, vigia da liberação |

## 3. Gravação → vídeo → postagem → publicação
| Etapa | Quem | Próximo | Prova | Vigia |
|---|---|---|---|---|
| Agenda da gravação | Cecília | filmmaker vê a dele | J03, J21 | — |
| Envio do material | Luís/Nathan | vídeos sem editor na fila da Amanda | J11, J82, J87, J41 | C1 |
| Distribuição | Amanda | Helo ou João Victor | J04, J76, J95 | C1, C2, A2 |
| Edição / correção | editor | Chris ou Amanda aprova a qualidade | J04, J31, J83, J80 | C2 |
| Aprovação do cliente | Amanda confirma | postagem `aguardando_legenda` | J04, J40 | C3, C4 |
| Legenda | Chris/Amanda/Cecília | Cecília agenda | J04, J35, J61, J61b, J66, J32 | D3 |
| Agendamento | Cecília | publicação | J04, J25, J28, J88, J43, J63 | D4 |
| Publicação real | Cecília confirma | Portal mostra publicado | J04, J33, J57 | D2 |
| Vídeo para a Lixeira | qualquer caminho | postagem encerrada (CP244) | J96, J80 | D1 |

## 4. Demandas e avisos da equipe
| Caminho | Quem recebe | Saída | Prova | Vigia |
|---|---|---|---|---|
| Demanda criada por pessoa | destinatário → prova → quem pediu aprova | aprovada | J02, J13 | A1, A4, A5 |
| Tarefa do sistema da Amanda | Amanda conclui | fecha sozinha (CP245) | J97 | A6 |
| Tarefa do sistema de outra pessoa | pessoa conclui | Amanda aprova | J97 | A5 |
| Aviso operacional (I165) | pessoa no site e no celular | resolvido pela fonte | J54, J70 | G1, G2 |
| Aviso no celular | aparelho ativado pela pessoa | push | J100 | G2 |

## 5. Pessoas e papéis
| Regra | Prova | Vigia |
|---|---|---|
| Cada papel vê só o seu menu; trocar de papel limpa a tela | J01, J09, J10, J19, J26 | — |
| Cada papel abre cada tela e clica em cada botão de navegação sem erro | J12, J98 | — |
| Editores: só Helo e João Victor (CP242/CP243) | J95 | A2, C2 |
| Pessoa desligada não recebe nada novo | J19 | A1, B2, F2, G1 |
