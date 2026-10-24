/* Pure contracts. The caller verifies Google/Auth and loads the physical team record. */
export function falhaI165(codigo, mensagem, detalhes = {}) {
  return Object.assign(new Error(mensagem), {code: 'i165/' + codigo, ...detalhes});
}
export const exigirI165 = (ok, codigo, mensagem, detalhes) => { if (!ok) throw falhaI165(codigo, mensagem, detalhes); };
export function idFisicoI165(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= 180 && !/[\/\u0000-\u001f\u007f]/.test(v) && v !== '.' && v !== '..' && !/^__.*__$/.test(v);
}
export function jsonCanonicoI165(valor) {
  const vistos = new Set();
  function n(v) {
    if (v === undefined) return {__undefinedI165: true};
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') { exigirI165(Number.isFinite(v), 'numero', 'Número não finito na versão da fonte.'); return Object.is(v, -0) ? 0 : v; }
    exigirI165(typeof v === 'object', 'tipo', 'Tipo não serializável na versão da fonte.');
    exigirI165(!vistos.has(v), 'ciclo-objeto', 'Objeto circular na versão da fonte.');
    if (typeof v.toDate === 'function') {
      const seconds = v.seconds ?? v._seconds, nanoseconds = v.nanoseconds ?? v._nanoseconds ?? 0;
      exigirI165(Number.isSafeInteger(seconds) && Number.isInteger(nanoseconds) && nanoseconds >= 0 && nanoseconds < 1e9, 'timestamp', 'Timestamp inválido.');
      // Same order as recursively sorted plain maps: normalization is idempotent.
      return {__timestampI165: {nanoseconds, seconds}};
    }
    if (v instanceof Date) { exigirI165(Number.isFinite(v.getTime()), 'data', 'Data inválida.'); return {__dateI165: v.toISOString()}; }
    vistos.add(v);
    const out = Array.isArray(v) ? v.map(n) : Object.fromEntries(Object.keys(v).sort().map(k => [k, n(v[k])]));
    vistos.delete(v); return out;
  }
  return JSON.stringify(n(valor));
}
export function dataCivilI165(v) {
  return typeof v === 'string' && /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v;
}
export const horaCivilI165 = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function instanteI165(v) {
  exigirI165(v instanceof Date || typeof v === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(v), 'instante', 'Informe um instante com fuso, sem adivinhar o horário local.');
  const d = new Date(v); exigirI165(Number.isFinite(d.getTime()), 'instante', 'Instante inválido.'); return d.toISOString();
}
export function horarioBrasiliaI165(v) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(instanteI165(v))).replace(' ', 'T');
}
export function somarDiasI165(dia, quantidade) {
  exigirI165(dataCivilI165(dia) && Number.isInteger(quantidade), 'data', 'Data civil inválida.');
  const d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + quantidade); return d.toISOString().slice(0, 10);
}
export function programacaoAtivaI165(c) {
  return c?.schema === 1 && c.ativo === true && Number.isInteger(c.revisao) && c.revisao > 0 && typeof c.ativacaoId === 'string' && c.ativacaoId.length >= 12;
}
export function contextoOperacionalI165(c) {
  exigirI165(c && idFisicoI165(c.uid) && typeof c.sessao === 'string' && c.sessao.length > 0, 'sessao', 'Entre novamente no seu acesso.');
  const papel = c.papel ?? c.nome;
  exigirI165(!c.nome || !c.papel || c.nome === c.papel, 'perfil', 'Os perfis do contexto divergem.');
  exigirI165(typeof papel === 'string' && typeof c.atorReal === 'string' && c.cadastroAtivo === true, 'cadastro', 'Cadastro ativo da equipe precisa estar confirmado.');
  exigirI165(c.atorReal === papel || c.atorReal === 'Chris', 'delegacao', 'Este ator não pode operar o outro perfil.');
  return Object.freeze({uid: c.uid, nome: papel, papel, atorReal: c.atorReal, sessao: c.sessao, chave: jsonCanonicoI165([c.uid, papel, c.atorReal, c.sessao])});
}
export function mesmoContextoI165(a, b) {
  return contextoOperacionalI165(a).chave === contextoOperacionalI165(b).chave;
}
export function responsavelLegendaI165({processoEditorial, responsavelExplicito} = {}) {
  const novo = programacaoAtivaI165(processoEditorial); // Same schema shape; caller passes ONLY the editorial I164 record here.
  const pessoa = responsavelExplicito || (novo ? 'Chris' : 'Gabrielle');
  exigirI165(['Chris', 'Gabrielle', 'Fernanda'].includes(pessoa) && !(novo && pessoa === 'Gabrielle'), 'responsavel-legenda', 'Confira o responsável editorial desta etapa.');
  return pessoa;
}
