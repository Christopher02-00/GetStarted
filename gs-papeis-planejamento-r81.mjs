/* Responsabilidade operacional do planejamento; não renomeia pessoas nem reescreve autoria histórica. */
export const PESQUISA_RESPONSAVEL_R81='Gabrielle';
export const PAPEL_PESQUISA_ANTERIOR_R81='Fernanda';
export const PAPEIS_PLANEJAMENTO_R81=Object.freeze(['Chris','Amanda',PESQUISA_RESPONSAVEL_R81]);
export const PAPEIS_HISTORICOS_PLANEJAMENTO_R81=Object.freeze([...PAPEIS_PLANEJAMENTO_R81,PAPEL_PESQUISA_ANTERIOR_R81]);
export function pesquisaAnteriorPendenteR81(ciclo){return ciclo?.agenda?.pesquisa?.responsavel===PAPEL_PESQUISA_ANTERIOR_R81&&!ciclo.lote;}
export function responsavelOperacionalPlanejamentoR81(ciclo,etapa,padrao=''){return etapa==='pesquisa'&&pesquisaAnteriorPendenteR81(ciclo)?PESQUISA_RESPONSAVEL_R81:ciclo?.agenda?.[etapa]?.responsavel||padrao;}
export function atribuicaoAnteriorPreservadaR81(atual,anterior){return atual?.responsavel===PAPEL_PESQUISA_ANTERIOR_R81&&anterior?.responsavel===PAPEL_PESQUISA_ANTERIOR_R81&&JSON.stringify(atual)===JSON.stringify(anterior);}
