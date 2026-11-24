// CP272 (24/11/2026, ok nominal do Chris: "Sim, fechar e prevenir"). Um pedido de mudança à Amanda (programacao_solicitacoes_i165) só pode
// ser decidido enquanto a postagem está na operação — `conferirFonte` (excecoes.mjs) recusa a decisão depois disso. Postagem arquivada,
// cancelada, publicada, excluída ou inexistente deixava o pedido "pendente" para sempre na tela de aprovar vídeos da Amanda (8 em 24/11,
// de 09 a 17/11), sem botão que funcionasse. Uma regra só, sem dependências, lida pela decisão, pela faxina e pelo Raio-X (D6).
export const ESTADOS_DECIDIVEIS_CP272 = Object.freeze(['aguardando_legenda', 'aguardando_agendamento', 'agendado']);
export const postagemDecidivelCp272 = p => !!p && p.excluido !== true && !p.arquivado && ESTADOS_DECIDIVEIS_CP272.includes(p.status);
export const POR_CP272 = 'Sistema (faxina: a postagem saiu da operação)';
export const situacaoPostagemCp272 = p => !p ? 'inexistente' : p.excluido === true ? 'excluída' : p.arquivado ? 'arquivada' : String(p.status || 'sem status');
