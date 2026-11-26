// J135 — LZ11 (26/11/2026, ok do Chris para publicar Functions). Comparações da Preparação/Planejamento no servidor eram feitas pelo texto
// dos dados na ordem em que chegavam; o Firestore não garante a mesma ordem de campos entre leituras (achado da LZ6b). Aqui as funções
// reais do servidor (functions-get/central/lib) recebem o MESMO conteúdo com os campos em ordem invertida. Contraprova (código anterior):
// "informação do cliente mudou", "atribuição histórica alterada" e "ficha da Organização desatualizada" sem nada ter mudado.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
export const id = 'J135';
export const nome = 'Preparação no servidor: mesma informação com os campos em outra ordem não vira "mudou"; mudança real continua detectada';
const inverter = v => Array.isArray(v) ? v.map(inverter) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).reverse().map(k => [k, inverter(v[k])])) : v;

export async function executar({ registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok: !!ok, ms: Date.now() - t0, detalhe });
  const lib = f => import(pathToFileURL(path.join(RAIZ, 'functions-get/central/lib', f)).href);
  const { mesmaInfoClienteI164 } = await lib('gs-contexto-cliente-i164.mjs');
  const { atribuicaoAnteriorPreservadaR81 } = await lib('gs-papeis-planejamento-r81.mjs');
  const { projetarFontesAgendaI167, camposAgendaI167 } = await lib('gs-agenda-fonte-i167-i155.mjs');
  const info = { segmento: 'Clínica', publico: 'Mulheres 30+', tom: { voz: 'leve', evitar: 'gírias' } };
  fim('1 informação do cliente igual em outra ordem é a mesma; mudança real não é', mesmaInfoClienteI164(info, inverter(info)) === true && mesmaInfoClienteI164(info, { ...info, tom: { voz: 'formal', evitar: 'gírias' } }) === false,
    `mesma ${mesmaInfoClienteI164(info, inverter(info))} · mudou ${mesmaInfoClienteI164(info, { ...info, tom: { voz: 'formal', evitar: 'gírias' } })}`);
  const etapa = { responsavel: 'Fernanda', inicio: '2026-12-01', prazo: '2026-12-05', prazoHora: '19:00', fixo: false };
  fim('2 atribuição histórica igual em outra ordem continua preservada', atribuicaoAnteriorPreservadaR81(etapa, inverter(etapa)) === true && atribuicaoAnteriorPreservadaR81(etapa, { ...etapa, prazo: '2026-12-09' }) === false,
    `igual ${atribuicaoAnteriorPreservadaR81(etapa, inverter(etapa))}`);
  const d = { tipoEspecial: 'organizacao_social_i167', cliente: 'mochi', destinatario: 'Amanda', prazoData: '2026-12-05', prazoHora: '19:00', status: 'pendente',
    agendaOrganizacaoI167: { versao: 1, mes: '2026-12', empresaId: '', inicio: '2026-12-01', prioridade: 'normal', fixo: false } };
  const io = { db: {}, doc: (_db, col, i) => ({ col, i }), getDocFromServer: async () => ({ exists: () => true, data: () => d }) };
  const projetar = async campos => { const c = { cliente: 'mochi', competencia: '2026-12', agenda: { pesquisa: { origemI167: { demandaId: 'j135', empresaId: '', campos } } } };
    await projetarFontesAgendaI167(io, c); return c.fontesAgendaI167.pesquisa; };
  const igual = await projetar(inverter(camposAgendaI167(d))), mudou = await projetar({ ...camposAgendaI167(d), prazo: '2026-12-09' });
  fim('3 ficha da Organização igual em outra ordem não fica "desatualizada"; prazo mudado fica', igual.conferida === true && igual.desatualizada === false && mudou.desatualizada === true,
    `igual: conferida ${igual.conferida} · desatualizada ${igual.desatualizada} · mudou: desatualizada ${mudou.desatualizada}`);
}
