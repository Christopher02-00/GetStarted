// Ensaio Get — seed de dados representativos no emulador (REST, bypass de rules via Bearer owner).
import { PROJETO } from './emulador.mjs';

export const EQUIPE = [
  { pessoa: 'Chris',       email: 'christopherveloso0@gmail.com' },
  { pessoa: 'Amanda',      email: 'amandachamorrosm@gmail.com' },
  { pessoa: 'Cecília',     email: 'vitoriaboaron215@gmail.com' },
  { pessoa: 'Helo',        email: 'heloisaksc@gmail.com' },
  { pessoa: 'João Victor', email: 'victorvieiraj814@gmail.com' },
  { pessoa: 'Nathan',      email: 'nathanocosta652@gmail.com' },
  { pessoa: 'Luís',        email: 'luissouza280507@gmail.com' },
  { pessoa: 'Yas',         email: 'yasmocelin@gmail.com' },
];
export const SENHA = 'ensaio-get-2026';

// ---- codificação Firestore REST
function v(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (x instanceof Date) return { timestampValue: x.toISOString() };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  if (typeof x === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
  throw new Error('tipo não suportado: ' + typeof x);
}
export function criarSeed(portas) {
  const base = `http://127.0.0.1:${portas.firestore}/v1/projects/${PROJETO}/databases/(default)/documents`;
  const H = { 'Authorization': 'Bearer owner', 'Content-Type': 'application/json' };
  async function set(colecao, id, dados) {
    const r = await fetch(`${base}/${colecao}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: v(dados).mapValue.fields }) });
    if (!r.ok) throw new Error(`seed ${colecao}/${id}: ${r.status} ${await r.text()}`);
  }
  async function get(colecao, id) {
    const r = await fetch(`${base}/${colecao}/${encodeURIComponent(id)}`, { headers: H });
    if (r.status === 404) return null; if (!r.ok) throw new Error(`get ${colecao}/${id}: ${r.status}`);
    return decod((await r.json()).fields || {});
  }
  async function listar(colecao) {
    const r = await fetch(`${base}/${colecao}?pageSize=300`, { headers: H });
    if (!r.ok) throw new Error(`list ${colecao}: ${r.status}`);
    const j = await r.json();
    return (j.documents || []).map(d => ({ id: d.name.split('/').pop(), ...decod(d.fields || {}) }));
  }
  async function limparTudo() {
    const r = await fetch(`http://127.0.0.1:${portas.firestore}/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: 'DELETE' });
    if (!r.ok) throw new Error('limpar firestore: ' + r.status);
  }
  // ---- Auth emulator
  const authBase = `http://127.0.0.1:${portas.auth}/identitytoolkit.googleapis.com/v1`;
  async function criarUsuario(email, senha = SENHA) {
    let r = await fetch(`${authBase}/accounts:signUp?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha, returnSecureToken: true }) });
    const j = await r.json();
    if (!r.ok && !(j.error?.message || '').includes('EMAIL_EXISTS')) throw new Error('signUp ' + email + ': ' + JSON.stringify(j));
    const uid = j.localId;
    // marcar e-mail verificado (as rules exigem email_verified)
    r = await fetch(`${authBase}/accounts:update`, { method: 'POST', headers: { ...H }, body: JSON.stringify({ localId: uid, emailVerified: true }) });
    if (!r.ok) throw new Error('verificar ' + email + ': ' + await r.text());
    return uid;
  }
  async function limparAuth() {
    await fetch(`http://127.0.0.1:${portas.auth}/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' });
  }
  return { set, get, listar, limparTudo, criarUsuario, limparAuth };
}
function decod(fields) {
  const out = {};
  for (const [k, val] of Object.entries(fields)) out[k] = dv(val);
  return out;
}
function dv(x) {
  if ('stringValue' in x) return x.stringValue; if ('integerValue' in x) return Number(x.integerValue); if ('doubleValue' in x) return x.doubleValue;
  if ('booleanValue' in x) return x.booleanValue; if ('nullValue' in x) return null; if ('timestampValue' in x) return x.timestampValue;
  if ('arrayValue' in x) return (x.arrayValue.values || []).map(dv); if ('mapValue' in x) return decod(x.mapValue.fields || {});
  return x;
}

// ---- perfil padrão
const hoje = new Date();
const iso = d => d.toISOString();
const yyyymmdd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // formato real do app para prazoData, agendamentos.data e postagens.dataAgendada (agDataI29 exige AAAA-MM-DD)
const mais = n => new Date(hoje.getTime() + n * 86400000);

export async function seedPadrao(seed, { log = console.log } = {}) {
  await seed.limparTudo(); await seed.limparAuth();
  const uids = {};
  for (const p of EQUIPE) uids[p.pessoa] = await seed.criarUsuario(p.email);
  for (const p of EQUIPE) {
    await seed.set('emails_equipe', p.pessoa, { nome: p.pessoa, email: p.email, ativo: true, excluido: false });
    // ENSAIO_SEED_SEM_EXCLUIDO=Nome → cadastro legado sem o campo `excluido` (F-02: as rules não podem negar tudo por isso)
    const legado = process.env.ENSAIO_SEED_SEM_EXCLUIDO === p.pessoa;
    await seed.set('usuarios_equipe', p.email, { pessoa: p.pessoa, email: p.email, ativo: true, ...(legado ? {} : { excluido: false }), uid: uids[p.pessoa], criadoEm: iso(hoje) });
  }
  const clientes = [
    { slug: 'bluefit', nome: 'Bluefit' }, { slug: 'stokki', nome: 'Stokki' }, { slug: 'hitech', nome: 'Hitech' }, { slug: 'zeiss', nome: 'Zeiss' }, { slug: 'mochi', nome: 'Mochi' },
  ];
  for (const c of clientes) {
    await seed.set('clientes_config', c.slug, { modoAprovacaoCliente: 'manual', prazoTacitaHorasUteis: 24, whatsappCobranca: '', excluido: false });
    await seed.set('clientes_extras', c.slug, { slug: c.slug, nome: c.nome, ativo: true, excluido: false, criadoEm: iso(hoje) });
  }
  // backend (Cloud Functions) ativo — espelha as flags que a produção tem em programacao_config_i165/ativo e processo_calendarios_i164/ativo.
  // ATENÇÃO (R2): valores reais de produção ainda não lidos; aqui tudo ligado, push desligado. Conferir contra produção na etapa R2.
  await seed.set('programacao_config_i165', 'ativo', { schema: 1, ativo: true, revisao: 1, ativacaoId: 'ensaio-ativacao-000001', permitirAgendarSemLegendaI90: false,
    habilidades: { preparacaoCentral: true, edicao: true, programacao: true, aprovacao: true, organizacao: true, push: false } });
  await seed.set('processo_calendarios_i164', 'ativo', { schema: 1, ativo: true, revisao: 1, ativacaoId: 'ensaio-processo-000001' });
  // acesso ao Portal por token (?c=slug&t=token)
  for (const c of clientes) {
    await seed.set('clientes_portal_tokens', 'tok-' + c.slug, { cliente: c.slug, ativo: true, criadoEm: iso(hoje) });
    await seed.set('clientes_acesso', c.slug, { slug: c.slug, nome: c.nome, token: 'tok-' + c.slug, ativo: true, excluido: false });
  }
  // vídeos em vários status
  const vids = [
    ['v-bluefit-1', 'bluefit', 'Bluefit', 'Reels treino funcional', 'aguardando_edicao', 'Helo'],
    ['v-bluefit-2', 'bluefit', 'Bluefit', 'Depoimento aluno', 'aguardando_aprovacao', 'Helo'],
    ['v-stokki-1', 'stokki', 'Stokki', 'Bastidores do showroom', 'aguardando_cliente', 'João Victor'],
    ['v-zeiss-1', 'zeiss', 'Zeiss', 'Dica de lentes', 'correcao', 'Helo'],
    ['v-mochi-3', 'mochi', 'Mochi', 'Receita do mochi de morango', 'aguardando_edicao', ''],
  ];
  // postagens em cada status — cada uma com o SEU vídeo aprovado e ponteiros nos dois sentidos (postagem.videoId ↔ video.postagemId),
  // como as Cloud Functions exigem (i165/ponteiros). Seed inconsistente dispara erro nas Functions a cada escrita e trava o emulador.
  const posts = [
    ['p-hitech-1', 'v-hitech-1', 'hitech', 'Hitech', 'Tour pela loja', 'aguardando_legenda', null, 'Nathan'],
    ['p-mochi-1', 'v-mochi-1', 'mochi', 'Mochi', 'Combo de outono', 'aguardando_agendamento', null, 'Helo'],
    ['p-mochi-2', 'v-mochi-2', 'mochi', 'Mochi', 'Bastidores da cozinha', 'agendado', yyyymmdd(mais(3)), 'Helo'],
    ['p-bluefit-0', 'v-bluefit-0', 'bluefit', 'Bluefit', 'Aula experimental', 'postado', yyyymmdd(mais(-7)), 'João Victor'],
  ];
  for (const [id, videoId, slug, nome, titulo, status, data, editor] of posts) {
    vids.push([videoId, slug, nome, titulo, 'aprovado', editor, id]);
    await seed.set('postagens', id, { videoId, cliente: slug, clienteNome: nome, titulo, status, dataAgendada: data || '', legenda: status === 'aguardando_legenda' ? '' : 'Legenda de ensaio', criadoEm: iso(mais(-4)), excluido: false, ...(status === 'postado' ? { postadoEm: iso(mais(-7)), postadoPor: 'Cecília' } : {}) });
  }
  for (const [id, slug, nome, titulo, status, editor, postagemId] of vids) {
    await seed.set('videos_producao', id, { cliente: slug, clienteNome: nome, titulo, status, editorAtribuido: editor, ...(editor ? { editorAtribuidoEm: iso(mais(-5)), editorAtribuidoPor: 'Amanda' } : {}), ...(status === 'correcao' ? { correcaoSolicitadaEm: iso(mais(-2)), correcaoSolicitadaPor: 'Chris', motivoCorrecao: 'Ajustar cor (ensaio)' } : {}), criadoEm: iso(mais(-5)), excluido: false, nivelEscalonamento: 0, ...(postagemId ? { postagemId, aprovadoEm: iso(mais(-4)), aprovadoPor: 'Chris' } : {}) });
  }
  // demandas existentes (uma por papel) + uma do cliente
  await seed.set('demandas', 'd-cecilia-1', { titulo: 'Agendar gravação Bluefit', descricao: 'Ensaio', destinatario: 'Cecília', remetente: 'Chris', status: 'pendente', prazoData: yyyymmdd(mais(2)), prazoHora: '18:00', criadoEm: iso(mais(-1)), excluido: false });
  await seed.set('demandas', 'd-helo-1', { titulo: 'Editar Reels treino funcional', descricao: 'Ensaio', destinatario: 'Helo', remetente: 'Amanda', status: 'pendente', prazoData: yyyymmdd(mais(1)), prazoHora: '19:00', criadoEm: iso(mais(-1)), excluido: false });
  // gravação futura
  await seed.set('agendamentos', 'ag-bluefit-1', { cliente: 'bluefit', clienteNome: 'Bluefit', data: yyyymmdd(mais(2)), hora: '09:00', filmmaker: 'Luís', equipe: 'Luís', status: 'agendado', qtdVideosPlanejados: 4, criadoEm: iso(mais(-2)), excluido: false });
  await seed.set('agendamentos', 'ag-hitech-1', { cliente: 'hitech', clienteNome: 'Hitech', data: yyyymmdd(mais(4)), hora: '14:00', filmmaker: 'Nathan', equipe: 'Nathan', status: 'agendado', qtdVideosPlanejados: 3, criadoEm: iso(mais(-2)), excluido: false });
  log(`[seed] ${EQUIPE.length} pessoas, ${clientes.length} clientes, ${vids.length} vídeos (${posts.length} com postagem), 2 demandas, 2 gravações`);
  return { uids, clientes };
}
