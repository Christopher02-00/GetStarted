import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

// Transporte privado. Autorização, CAS, intenção durável e ativo aprovado vêm do domínio.
export const BASE_API_UPLOAD_POST = 'https://api.upload-post.com';
const DIA = 86_400_000;
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const texto = x => typeof x === 'string' ? x : null;
const id = (x, campo) => {
  if (typeof x !== 'string' || !x.trim() || x !== x.trim() || x.length > 200 || /[\x00-\x1f\x7f]/u.test(x)) invalido(campo);
  return x;
};
function invalido(campo) { throw new ErroUploadPost('ENTRADA_INVALIDA', { campo, resultado: 'nao_enviado' }); }
function chaves(x, permitidas) {
  if (!obj(x)) invalido('objeto');
  for (const k of Object.keys(x)) if (!permitidas.includes(k)) invalido(k);
}
function inteiro(x, min, max, campo) {
  if (!Number.isSafeInteger(x) || x < min || x > max) invalido(campo);
  return x;
}
function utc(x, campo = 'scheduled_date') {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(x)) invalido(campo);
  const d = new Date(x);
  if (!Number.isFinite(d.getTime()) || d.toISOString() !== x.replace(/Z$/u, x.includes('.') ? 'Z' : '.000Z')) invalido(campo);
  return d.toISOString();
}
function futuro(x, agora) {
  const data = utc(x), delta = Date.parse(data) - agora();
  if (!(delta > 0 && delta <= 365 * DIA)) invalido('scheduled_date_futura_ate365dias');
  return data;
}
function legenda(x) {
  if (typeof x !== 'string' || x.length > 10000 || /[\x00\x7f]/u.test(x)) invalido('instagram_title');
  return x;
}
function colaboradores(x) {
  if (!Array.isArray(x) || x.some(v => typeof v !== 'string' || !/^[A-Za-z0-9_][A-Za-z0-9_.]{0,29}$/u.test(v)) || new Set(x).size !== x.length) invalido('collaborators');
  return x.join(',');
}
function origemPublica(x) {
  let u;
  try { u = new URL(x); } catch { invalido('origem_midia'); }
  const host = u.hostname.toLowerCase().replace(/\.+$/u, '');
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.port || isIP(host.replace(/^\[|\]$/gu, '')) || !host.includes('.') || /(?:^|\.)(?:localhost|local|internal)$/u.test(host)) invalido('origem_midia');
  return u;
}
function midia(x, origens) {
  chaves(x, ['tipo', 'blob', 'nome', 'url', 'sha256', 'versao', 'tamanho', 'mime']);
  if (!/^[a-f0-9]{64}$/u.test(x.sha256 || '')) invalido('video.sha256');
  id(x.versao, 'video.versao');
  inteiro(x.tamanho, 1, Number.MAX_SAFE_INTEGER, 'video.tamanho');
  if (typeof x.mime !== 'string' || !/^video\/[a-z0-9.+-]+$/u.test(x.mime)) invalido('video.mime');
  const limpo = { tipo: x.tipo, sha256: x.sha256, versao: x.versao, tamanho: x.tamanho, mime: x.mime };
  if (x.tipo === 'arquivo') {
    if (!(x.blob instanceof Blob) || x.blob.size !== x.tamanho || x.blob.type !== x.mime || typeof x.nome !== 'string' || !/^[A-Za-z0-9_.-]{1,120}$/u.test(x.nome) || x.url !== undefined) invalido('video.arquivo');
    return { valor: x.blob, nome: x.nome, limpo: { ...limpo, nome: x.nome } };
  }
  if (x.tipo !== 'url' || x.blob !== undefined || x.nome !== undefined) invalido('video.tipo');
  const u = origemPublica(x.url);
  if (!origens.has(u.origin)) invalido('video.origem_nao_autorizada');
  // Não baixa o ativo. Integrador fornece armazenamento imutável controlado e metadados conferidos.
  return { valor: u.href, limpo };
}
function camposInstagram(x) {
  const fields = {};
  if (x.instagram_title !== undefined) fields.instagram_title = legenda(x.instagram_title);
  if (x.thumb_offset !== undefined) fields.thumb_offset = String(inteiro(x.thumb_offset, 0, Number.MAX_SAFE_INTEGER, 'thumb_offset'));
  if (x.collaborators !== undefined) fields.collaborators = colaboradores(x.collaborators);
  return fields;
}
function fingerprint(payload) { return createHash('sha256').update(JSON.stringify(payload)).digest('hex'); }
function idsEntrada(x) { return { request_id: id(x.request_id, 'request_id'), external_id: id(x.external_id, 'external_id'), idempotency_key: id(x.idempotency_key, 'idempotency_key') }; }
function preparar(x, agora, origens) {
  chaves(x, ['profile_username', 'instagram_account_id', 'request_id', 'external_id', 'idempotency_key', 'scheduled_date', 'video', 'instagram_title', 'media_type', 'thumb_offset', 'collaborators']);
  const ids = idsEntrada(x), profile = id(x.profile_username, 'profile_username'), conta = id(x.instagram_account_id, 'instagram_account_id');
  const scheduled_date = futuro(x.scheduled_date, agora), media_type = x.media_type ?? 'REELS';
  if (!['REELS', 'STORIES'].includes(media_type) || (media_type === 'STORIES' && (x.thumb_offset !== undefined || x.collaborators !== undefined))) invalido('media_type');
  const asset = midia(x.video, origens), fields = { media_type, ...camposInstagram(x) };
  const payload = { profile_username: profile, instagram_account_id: conta, ...ids, scheduled_date, platforms: ['instagram'], video: asset.limpo, fields };
  const form = new FormData();
  for (const [k, v] of Object.entries({ user: profile, 'platform[]': 'instagram', request_id: ids.request_id, external_id: ids.external_id, scheduled_date, ...fields })) form.append(k, v);
  if (asset.nome) form.append('video', asset.valor, asset.nome); else form.append('video', asset.valor);
  return { ids, payload, hash: fingerprint(payload), form };
}
function esperadoJob(jobId, e) {
  chaves(e, ['job_id', 'profile_username', 'instagram_account_id', 'scheduled_date', 'external_id', 'request_id', 'campos']);
  if (id(e.job_id, 'esperado.job_id') !== jobId) invalido('esperado.job_id');
  const n = { job_id: jobId, profile_username: id(e.profile_username, 'esperado.profile_username'), instagram_account_id: id(e.instagram_account_id, 'esperado.instagram_account_id'), scheduled_date: utc(e.scheduled_date), external_id: id(e.external_id, 'esperado.external_id') };
  if (e.request_id !== undefined) n.request_id = id(e.request_id, 'esperado.request_id');
  if (e.campos !== undefined) {
    chaves(e.campos, ['media_type', 'instagram_title', 'thumb_offset', 'collaborators']);
    n.campos = { ...e.campos };
    if (Object.values(n.campos).some(v => typeof v !== 'string')) invalido('esperado.campos');
  }
  return n;
}
function perfil(p) {
  const ig = obj(p?.social_accounts?.instagram) ? p.social_accounts.instagram : null;
  return { profile_username: texto(p?.username), display_name: texto(p?.display_name), instagram: { account_id: texto(ig?.username), handle: texto(ig?.handle), reauth_required: ig?.reauth_required === undefined ? false : typeof ig.reauth_required === 'boolean' ? ig.reauth_required : null, conectado: !!texto(ig?.username) } };
}
function jobLimpo(d) {
  const form = {};
  for (const k of ['media_type', 'instagram_title', 'thumb_offset', 'collaborators']) if (typeof d.form?.[k] === 'string') form[k] = d.form[k];
  return { job_id: texto(d.job_id), request_id: texto(d.request_id), external_id: texto(d.external_id ?? d.form?.external_id), profile_username: texto(d.profile_username), platforms: Array.isArray(d.platforms) ? d.platforms.filter(x => typeof x === 'string') : [], scheduled_date: texto(d.scheduled_date), editable: d.editable === true, not_editable_reason: texto(d.not_editable_reason), form };
}
function conferirJob(j, e) {
  const divergencias = [];
  for (const k of ['job_id', 'profile_username', 'external_id']) if (j[k] !== e[k]) divergencias.push(k);
  if (j.platforms.length !== 1 || j.platforms[0] !== 'instagram') divergencias.push('platforms');
  if (!j.scheduled_date || Date.parse(j.scheduled_date) !== Date.parse(e.scheduled_date)) divergencias.push('scheduled_date');
  if (j.request_id !== null && e.request_id !== undefined && j.request_id !== e.request_id) divergencias.push('request_id');
  for (const [k, v] of Object.entries(e.campos ?? {})) if (j.form[k] !== v) divergencias.push(`form.${k}`);
  return { agendamento_conferido: divergencias.length === 0, divergencias, conta_nativa_no_job: 'nao_documentada' };
}
function urlInstagram(x) {
  try { const u = new URL(x); return u.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(u.hostname) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
export function interpretarStatusUploadPost(d) {
  if (!obj(d)) throw new ErroUploadPost('RESPOSTA_INVALIDA', { resultado: 'leitura_falhou' });
  const resultados = Array.isArray(d.results) ? d.results.filter(obj) : [];
  const ig = resultados.filter(r => r.platform === 'instagram');
  const r = ig.length === 1 ? ig[0] : null;
  const skipped = r?.skipped === true || r?.status === 'skipped';
  const fallback = r?.fallback_to_inbox === true;
  const post_id = texto(r?.platform_post_id ?? r?.post_id);
  const post_url = urlInstagram(r?.post_url ?? r?.url);
  const sucesso = r?.success === true && !['queued', 'processing', 'failed', 'retryable', 'skipped'].includes(r?.status);
  const evidencia = !!r && sucesso && !skipped && !fallback && !!(post_id || post_url);
  return { global: texto(d.status) ?? 'desconhecido', job_id: texto(d.job_id), request_id: texto(d.request_id), external_id: texto(d.external_id), instagram: { estado: !r ? 'desconhecido' : skipped ? 'skipped' : fallback ? 'inbox_ou_rascunho' : evidencia ? 'evidencia_externa_a_correlacionar' : 'nao_comprovado', success: typeof r?.success === 'boolean' ? r.success : null, status: texto(r?.status), skip_reason: texto(r?.skip_reason), post_id, post_url }, publicado_confirmado: false };
}
export class ErroUploadPost extends Error {
  constructor(codigo, detalhes = {}) { super(codigo); this.name = 'ErroUploadPost'; this.codigo = codigo; Object.assign(this, detalhes); this.retry_automatico = false; }
}

export function criarAdaptadorUploadPost({ obterToken, fetchImpl, timeoutMs = 30000, agora = Date.now, origensMidia = [] } = {}) {
  if (typeof obterToken !== 'function' || typeof fetchImpl !== 'function' || typeof agora !== 'function' || !Array.isArray(origensMidia)) invalido('dependencias');
  inteiro(timeoutMs, 1, 120000, 'timeoutMs');
  const origens = new Set(origensMidia.map(s => { const u = origemPublica(s); if (u.href !== `${u.origin}/`) invalido('origensMidia'); return u.origin; }));

  async function http(method, path, { query, body, ids, payload, hash, aceitar404 = false } = {}) {
    const mutacao = method !== 'GET';
    const ctx = { ...(ids ? { ids: { ...ids } } : {}), ...(payload ? { payload_limpo: payload, fingerprint: hash } : {}) };
    const url = new URL(path, BASE_API_UPLOAD_POST);
    if (url.origin !== BASE_API_UPLOAD_POST || !/^\/api\/(?:upload|uploadposts\/(?:users(?:\/[^/]+)?|schedule(?:\/[^/]+)?|status|history))$/u.test(url.pathname)) invalido('endpoint');
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
    let token;
    try { token = await obterToken(); } catch { throw new ErroUploadPost('CREDENCIAL_INDISPONIVEL', { resultado: 'nao_enviado', ...ctx }); }
    if (typeof token !== 'string' || !/^[\x21-\x7e]+$/u.test(token)) throw new ErroUploadPost('CREDENCIAL_INDISPONIVEL', { resultado: 'nao_enviado', ...ctx });
    const headers = new Headers({ Authorization: `Apikey ${token}` });
    if (ids?.idempotency_key) headers.set('Idempotency-Key', ids.idempotency_key);
    if (obj(body) && !(body instanceof FormData)) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(body); }
    const controller = new AbortController();
    let timer;
    try {
      const processo = (async () => {
        const r = await fetchImpl(url.href, { method, headers, ...(body !== undefined ? { body } : {}), redirect: 'error', signal: controller.signal });
        if (r.redirected || (r.url && new URL(r.url).origin !== BASE_API_UPLOAD_POST) || (r.status >= 300 && r.status < 400)) throw new ErroUploadPost('REDIRECT_BLOQUEADO', { resultado: mutacao ? 'incerto' : 'leitura_falhou', ...ctx });
        const rate = Object.fromEntries(['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after'].map(k => [k, r.headers.get(k)]));
        let d;
        try { d = JSON.parse(await r.text()); } catch { throw new ErroUploadPost('RESPOSTA_INVALIDA', { resultado: mutacao ? 'incerto' : 'leitura_falhou', http_status: r.status, rate, ...ctx }); }
        if (!(r.status >= 200 && r.status < 300) && !(aceitar404 && r.status === 404 && d.status === 'not_found')) {
          const codigo = r.status === 429 ? 'LIMITE_429' : r.status === 409 ? 'CONFLITO_409' : `HTTP_${r.status}`;
          throw new ErroUploadPost(codigo, { resultado: mutacao && r.status >= 500 ? 'incerto' : mutacao ? 'recusado' : 'leitura_falhou', http_status: r.status, rate, ...ctx });
        }
        if (!obj(d) || d.success === false) throw new ErroUploadPost('RESPOSTA_SEM_SUCESSO', { resultado: mutacao ? 'incerto' : 'leitura_falhou', http_status: r.status, ...ctx });
        return { d, http_status: r.status, rate };
      })();
      const limite = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ErroUploadPost('TIMEOUT', { resultado: mutacao ? 'incerto' : 'leitura_falhou', ...ctx })); }, timeoutMs); });
      return await Promise.race([processo, limite]);
    } catch (e) {
      if (e instanceof ErroUploadPost) throw e;
      throw new ErroUploadPost('TRANSPORTE_FALHOU', { resultado: mutacao ? 'incerto' : 'leitura_falhou', ...ctx });
    } finally { clearTimeout(timer); }
  }

  async function lerPerfil(username) {
    const user = id(username, 'profile_username');
    const { d } = await http('GET', `/api/uploadposts/users/${encodeURIComponent(user)}`);
    const p = perfil(d.profile);
    if (p.profile_username !== user) throw new ErroUploadPost('PERFIL_DIVERGENTE', { resultado: 'leitura_falhou' });
    return p;
  }
  async function conferirConta(e) {
    const p = await lerPerfil(e.profile_username);
    if (!p.instagram.conectado || p.instagram.reauth_required !== false || p.instagram.account_id !== e.instagram_account_id) throw new ErroUploadPost('CONEXAO_INSTAGRAM_NAO_CONFERIDA', { resultado: 'nao_enviado' });
    return p;
  }
  async function lerJob(jobId, { esperado } = {}) {
    const job_id = id(jobId, 'job_id'), e = esperadoJob(job_id, esperado);
    const { d } = await http('GET', `/api/uploadposts/schedule/${encodeURIComponent(job_id)}`);
    const j = jobLimpo(d);
    return { ...j, ...conferirJob(j, e) };
  }
  async function preMutacao(jobId, esperado) {
    const e = esperadoJob(id(jobId, 'job_id'), esperado), j = await lerJob(jobId, { esperado: e });
    if (!j.agendamento_conferido) throw new ErroUploadPost('READBACK_DIVERGENTE', { resultado: 'nao_enviado', divergencias: j.divergencias });
    await conferirConta(e);
    return { e, j };
  }
  return Object.freeze({
    prepararAgendamento(x) { const p = preparar(x, agora, origens); return { payload_limpo: p.payload, fingerprint: p.hash }; },
    async listarPerfis() { const { d } = await http('GET', '/api/uploadposts/users'); if (!Array.isArray(d.profiles)) throw new ErroUploadPost('RESPOSTA_INVALIDA', { resultado: 'leitura_falhou' }); return { profiles: d.profiles.map(perfil), plan: texto(d.plan), limit: Number.isSafeInteger(d.limit) ? d.limit : null }; },
    lerPerfil,
    async listarAgendamentos(q) {
      chaves(q, ['profile_username', 'from', 'to', 'limit', 'offset']);
      const query = { profile_username: id(q.profile_username, 'profile_username'), limit: inteiro(q.limit ?? 50, 1, 100, 'limit'), offset: inteiro(q.offset ?? 0, 0, Number.MAX_SAFE_INTEGER, 'offset') };
      if (q.from !== undefined) query.from = utc(q.from, 'from');
      if (q.to !== undefined) query.to = utc(q.to, 'to');
      if (query.from && query.to && query.from >= query.to) invalido('from_to');
      const { d } = await http('GET', '/api/uploadposts/schedule', { query });
      if (!Array.isArray(d.scheduled_posts) || d.scheduled_posts.some(j => j.profile_username !== query.profile_username)) throw new ErroUploadPost('LISTA_FORA_DO_PERFIL', { resultado: 'leitura_falhou' });
      return { scheduled_posts: d.scheduled_posts.map(jobLimpo), total: Number.isSafeInteger(d.total) ? d.total : null, limit: d.limit, offset: d.offset, ausencia_comprovada: false };
    },
    async criarAgendamento(x) {
      const p = preparar(x, agora, origens);
      await conferirConta(p.payload);
      const { d, http_status, rate } = await http('POST', '/api/upload', { body: p.form, ids: p.ids, payload: p.payload, hash: p.hash });
      const esperado_job = d.job_id ? { job_id: texto(d.job_id), profile_username: p.payload.profile_username, instagram_account_id: p.payload.instagram_account_id, request_id: p.ids.request_id, external_id: p.ids.external_id, scheduled_date: p.payload.scheduled_date, campos: { ...p.payload.fields } } : null;
      return { estado: 'aceito_a_conferir', agendamento_conferido: false, publicado_confirmado: false, job_id: texto(d.job_id), request_id_fornecedor: texto(d.request_id), idempotent_replay: d.idempotent_replay === true, ids: p.ids, payload_limpo: p.payload, fingerprint: p.hash, esperado_job, http_status, rate };
    },
    lerJob,
    async status(q) {
      chaves(q, ['request_id', 'job_id']);
      if (Number(q.request_id !== undefined) + Number(q.job_id !== undefined) !== 1) invalido('request_id_ou_job_id');
      const k = q.job_id !== undefined ? 'job_id' : 'request_id', v = id(q[k], k);
      const { d } = await http('GET', '/api/uploadposts/status', { query: { [k]: v }, aceitar404: true });
      if (d[k] !== v) throw new ErroUploadPost('STATUS_ID_DIVERGENTE', { resultado: 'leitura_falhou' });
      return interpretarStatusUploadPost(d);
    },
    async history(q) {
      chaves(q, ['profile_username', 'request_id', 'job_id', 'external_id', 'page', 'limit', 'status']);
      const query = { profile_username: id(q.profile_username, 'profile_username'), platform: 'instagram', page: inteiro(q.page ?? 1, 1, Number.MAX_SAFE_INTEGER, 'page'), limit: q.limit ?? 20 };
      if (![10, 20, 50, 100].includes(query.limit)) invalido('limit');
      const ks = ['request_id', 'job_id', 'external_id'].filter(k => q[k] !== undefined);
      if (!ks.length) invalido('history_id');
      for (const k of ks) query[k] = id(q[k], k);
      if (q.status !== undefined) { if (!['success', 'failed'].includes(q.status)) invalido('status'); query.status = q.status; }
      const { d } = await http('GET', '/api/uploadposts/history', { query });
      const linhas = rows => {
        if (!Array.isArray(rows)) throw new ErroUploadPost('RESPOSTA_INVALIDA', { resultado: 'leitura_falhou' });
        return rows.map(r => {
          if (r.profile_username !== query.profile_username || r.platform !== 'instagram' || ks.some(k => r[k] !== query[k])) throw new ErroUploadPost('HISTORY_FORA_DO_CONTEXTO', { resultado: 'leitura_falhou' });
          return { ...interpretarStatusUploadPost({ results: [r] }).instagram, profile_username: r.profile_username, request_id: texto(r.request_id), job_id: texto(r.job_id), external_id: texto(r.external_id), upload_timestamp: texto(r.upload_timestamp) };
        });
      };
      return { history: linhas(d.history), in_progress: linhas(d.in_progress ?? []), total: Number.isSafeInteger(d.total) ? d.total : null, page: d.page, limit: d.limit, ausencia_comprovada: false };
    },
    async alterar(jobId, { esperado, patch } = {}) {
      chaves(patch, ['scheduled_date', 'instagram_title', 'thumb_offset', 'collaborators']);
      if (!Object.keys(patch).length) invalido('patch_vazio');
      const body = {}, fields = camposInstagram(patch);
      if (patch.scheduled_date !== undefined) body.scheduled_date = futuro(patch.scheduled_date, agora);
      if (Object.keys(fields).length) body.fields = fields;
      const { e, j } = await preMutacao(jobId, esperado);
      if (!j.editable || Date.parse(j.scheduled_date) - agora() <= 60000) throw new ErroUploadPost('JOB_NAO_EDITAVEL', { resultado: 'nao_enviado' });
      const novo = { ...e, ...(body.scheduled_date ? { scheduled_date: body.scheduled_date } : {}), campos: { ...(e.campos ?? {}), ...fields } };
      const payload = { job_id: jobId, patch: body };
      await http('PATCH', `/api/uploadposts/schedule/${encodeURIComponent(jobId)}`, { body, ids: { job_id: jobId }, payload, hash: fingerprint(payload) });
      try { return { estado: 'alteracao_aceita_a_conferir', ...await lerJob(jobId, { esperado: novo }) }; }
      catch { throw new ErroUploadPost('READBACK_APOS_PATCH_FALHOU', { resultado: 'incerto', job_id: jobId }); }
    },
    async cancelar(jobId, { esperado } = {}) {
      await preMutacao(jobId, esperado);
      const { d } = await http('DELETE', `/api/uploadposts/schedule/${encodeURIComponent(jobId)}`, { ids: { job_id: jobId } });
      return { estado: 'cancelamento_aceito_a_conferir', job_id: jobId, publicacao_impedida: false, credits_refunded: Number.isSafeInteger(d.credits_refunded) ? d.credits_refunded : null };
    }
  });
}
