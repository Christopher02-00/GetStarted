/* Apenas projeção de capacidades; nunca abre a IO de preparação para Cecília. */
export function capacidadesConsultaCentralR87(ator, {ativa, exclusivo}) {
  const capacidades = {
    preparacaoAtiva: ator.papel !== 'Cecília' && ativa === true,
    manterFluxoAtual: exclusivo !== true,
    processoExclusivoAtivo: exclusivo === true,
    etapasEditoriaisAtivas: ativa === true && exclusivo === true && ['Chris', 'Amanda'].includes(ator.papel)
  };
  if (ator.papel === 'Cecília') return capacidades;
  return {...capacidades, papelConfirmado: ator.papel, atorReal: ator.real};
}
