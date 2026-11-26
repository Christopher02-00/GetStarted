# lz10-servidor-sem-sobras — sai o gatilho de análises parado; os registros de presença sem leitor saem pela retenção (com cópia)
Pedido (Chris, 26/11): "eu dou ok e confirmo que pode fazer tudo" — itens "a rotina de análises que ficou parada pode sair" e "os dados
antigos de presença da equipe podem ser apagados" (ok nominal para publicar Functions e para exclusão física).
Unidade: LZ10 · Tipo: limpeza (servidor)
1. `acompanhamentoAnaliseGetCp205` (gatilho em analises_mensais_i108) sai do index: a tela de Análises saiu na LZ3b e nada mais grava
   análise nova. O módulo acompanhamento-cliente-cp205.mjs fica (os outros gatilhos usam). Publicação: workflow publicar-functions,
   modo "publicar", com apagar_funcao=acompanhamentoAnaliseGetCp205 (a função some do projeto antes do deploy).
2. Retenção L1 ganha `presenca_funcionarios` (ultimaAtividade com mais de 1 dia): ninguém lê desde a LZ5a e nada grava desde a LZ7b
   (10 registros em produção, um por pessoa). Sai na rodada da faxina, com cópia antes em retencao_l1_copias (sem cópia, nada sai).
   A regra de presenca_funcionarios no firestore.rules sai na LZ7c (rules).
O que NÃO muda: telas, outros gatilhos, outros critérios da retenção.
Testes: J115 com presença velha (sai) e de agora (fica): 11/11 com J114 (o relatório tem 5 coleções); cópia falha → nada sai (5/5 com motivo).
