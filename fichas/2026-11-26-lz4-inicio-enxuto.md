# lz4-inicio-enxuto — o Início de cada pessoa fica só com o que pede ação
Pedido (Chris, 25–26/11): "até aquela tela de início minha se tornou muito complexa… o calendário que está lá na parte final já nem
apresenta mais as filmagens do dia… a gente não pode deixar isso no site mais"; catálogo decidido ("No geral ok pode começar").
Unidade: LZ4 · Tipo: ajuste (remoção/simplificação)
Itens do catálogo: ini-calendario, ini-atalhos, ini-somente-edicao, ini-extras-gestao, ini-resumo-dia, ini-checklists-amanda, ini-entregar-nathan.
Mudança:
- Sai o calendário de gravações do fim do Início (renderCalendarioVisualHome e as 2 chamadas; chipAgendaI85/abrirAgendarNoDia ficam: a tela Gravações usa).
- Saem os atalhos de setor (renderSetorAtalhos, tabela SETORES).
- Sai o painel "Somente edição" do Início (renderResumoSomenteEdicaoI34 e chamadas); o mesmo cartão continua no Painel Operacional
  (sem o botão "Atualizar pendências", que só redesenhava o Início).
- "Meus extras" sai do Início do Chris e da Amanda (continua para quem filma e edita).
- Resumo do Dia: só Crítico agora, Quem cobrar hoje, Suas pendências e Clientes. Saem os números congelados, o Panorama da Semana
  (e a leitura dos resumos da semana), "Quem mandou bem", reincidências e "já estava ontem".
- Amanda: o cartão "Conferir checklists" só aparece quando há pendência.
- ini-entregar-nathan: medido no código — o bloco "O que entregar, por dia" já some quando não há vídeo pendente; nada a mudar (engano do catálogo).
Fica para a LZ3 (mesmo código das telas que saem do menu): painéis Direção, Análises, Registro do dia e o guia "Pra acompanhar o Luís e a Cecília".
Árvore: RAIZ view-inicio (escritorio.html) · LEITORES: Chris, Amanda, equipe · nada de servidor/rules · gerarResumoDiario (foto do dia) continua
gravando os mesmos campos (o servidor/motor não muda) · J113 reescrita (o Panorama saiu).
Testes: J113 nova (contraprova vermelha no código anterior: 1 consulta aos resumos, panorama/números/quem mandou bem, calendário,
atalhos e somente edição presentes → verde agora 4/4); J95 (somente edição) 5/5; portão 1–3 verde.
