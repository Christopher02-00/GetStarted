// I118 — diário manual privado. Nunca altera a atividade operacional vinculada.
export const COLECAO = 'diario_equipe_i118';
export const PAPEIS = Object.freeze(['Fernanda', 'Amanda', 'Chris']);
export const ESTADOS = Object.freeze({rascunho:'Em preenchimento', enviado:'Enviado para conferência', ajuste:'Esclarecimento solicitado', conferido:'Conferido'});
export const STATUS = Object.freeze({afazer:'A fazer', andamento:'Em andamento', aguardando:'Aguardando', concluido:'Concluído'});
export const LIMITE_LINHAS = 50;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function armazenamentoLocal() { try { return globalThis.sessionStorage; } catch { return null; } }
const CODIGOS_SDK = new Set(['cancelled','unknown','invalid-argument','deadline-exceeded','not-found','already-exists','permission-denied','resource-exhausted','failed-precondition','aborted','out-of-range','unimplemented','internal','unavailable','data-loss','unauthenticated']);
export function mensagemErroDiario(erro) {
  const original = typeof erro?.code === 'string' ? erro.code : '', codigo = original.replace(/^(firestore|firebase)\//, '');
  const mensagem = typeof erro?.message === 'string' ? erro.message : typeof erro === 'string' ? erro : '';
  if (codigo === 'permission-denied' || /permission[-_ ]denied|insufficient permissions|evaluation error|false for ['"]?(get|list|create|update|delete)['"]?\s*@/i.test(mensagem)) {
    return 'Seu acesso a este registro não está disponível. Seu texto foi preservado. Peça à Amanda para conferir seu acesso.';
  }
  if (codigo === 'unauthenticated') return 'Sua sessão precisa ser confirmada. Seu texto foi preservado. Entre novamente para continuar.';
  if (['unavailable','deadline-exceeded','cancelled'].includes(codigo) || /failed to fetch|network request failed/i.test(mensagem)) {
    return 'Não foi possível confirmar o registro agora. Seu texto foi preservado. Confira sua conexão e use Conferir versão atual antes de tentar novamente.';
  }
  if (CODIGOS_SDK.has(codigo) || /^(firestore|firebase)\//.test(original) || erro?.name === 'FirebaseError' ||
      ['TypeError','ReferenceError','SyntaxError'].includes(erro?.name) || !mensagem) {
    return 'Não foi possível confirmar esta ação. Seu texto foi preservado. Use Conferir versão atual antes de tentar novamente.';
  }
  // Validações de preenchimento, revisão concorrente e mudança de perfil já
  // explicam a ação necessária. Conservar esse texto útil, sem mensagem do SDK.
  return mensagem;
}
export function hojeBRT(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit'}).format(d);
}
export function dataValida(v) {
  if (typeof v !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)) return false;
  const d = new Date(v + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}
export function chave(data) {
  if (!dataValida(data)) throw Error('Escolha uma data válida.');
  return 'fernanda_' + data;
}
export function diasAnteriores(data, quantidade = 7) {
  chave(data);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 7) throw Error('Consulte até sete dias por vez.');
  const atual = new Date(data + 'T12:00:00Z');
  return Array.from({length:quantidade}, (_, i) => {
    const d = new Date(atual); d.setUTCDate(d.getUTCDate() - i - 1);
    return d.toISOString().slice(0, 10);
  }).filter(dataValida);
}
export function texto(v, limite) {
  if (v != null && typeof v !== 'string') throw Error('Preencha os campos com texto.');
  const t = String(v ?? '').replace(/\r\n?/g, '\n').trim();
  if (t.length > limite || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(t)) throw Error('Texto inválido ou maior que o limite do campo.');
  return t;
}
export function linkSeguro(v) {
  if (typeof v !== 'string' || !v || v.length > 2000 || /\s/.test(v)) return false;
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password && u.hostname.includes('.'); }
  catch { return false; }
}
export function normalizarLinhas(linhas) {
  if (!Array.isArray(linhas) || linhas.length > LIMITE_LINHAS) throw Error('Use até 50 atividades por dia.');
  const ids = new Set();
  return linhas.map(l => {
    if (!l || typeof l !== 'object' || Array.isArray(l)) throw Error('Atividade inválida.');
    const id = texto(l.id, 80);
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw Error('A identificação de uma atividade está ausente ou repetida.');
    ids.add(id);
    const r = {id, texto:texto(l.texto, 1000), cliente:texto(l.cliente, 160), solicitante:texto(l.solicitante, 100),
      periodo:texto(l.periodo, 80), status:texto(l.status, 20), observacoes:texto(l.observacoes, 2000),
      link:texto(l.link, 2000), vinculo:texto(l.vinculo, 250)};
    if (!r.texto) throw Error('Descreva cada atividade antes de salvar.');
    if (!tem(STATUS, r.status)) throw Error('Escolha a situação de cada atividade.');
    if (r.link && !linkSeguro(r.link)) throw Error('Use um link HTTPS válido, sem login ou senha no endereço.');
    return r;
  });
}
function conteudoIgual(a, b) {
  // Mapas retornados pelo Firestore não garantem a ordem de inserção das chaves.
  return JSON.stringify(normalizarLinhas(a?.linhas || [])) === JSON.stringify(normalizarLinhas(b.linhas)) && texto(a?.resumo, 2000) === b.resumo;
}
export function validarRegistro(d, data) {
  if (!d) return null;
  if (d.schemaVersion !== 1 || d.funcionario !== 'Fernanda' || d.data !== data || !dataValida(d.data) ||
      !tem(ESTADOS, d.estado) || !Number.isInteger(d.revisao) || d.revisao < 1 ||
      !Number.isInteger(d.revisaoConteudo) || d.revisaoConteudo < 1 || d.revisaoConteudo > d.revisao ||
      !Number.isInteger(d.ultimaEntrega) || d.ultimaEntrega < 0 || d.ultimaEntrega > d.revisaoConteudo ||
      !Number.isInteger(d.ultimaConferencia) || d.ultimaConferencia < 0 || d.ultimaConferencia > d.ultimaEntrega) {
    throw Error('Este diário precisa de conferência de identificação. Nenhum registro foi alterado.');
  }
  normalizarLinhas(d.linhas); texto(d.resumo, 2000); texto(d.parecer, 2000);
  return d;
}
export function registroMaisRecente(lido, recebido, data) {
  // Um snapshot confirmado pode chegar enquanto a releitura de uma operação termina.
  // A tela não deve voltar para uma revisão anterior que já estava a caminho.
  return recebido?.data === data && (!lido || lido.data === data) && recebido.revisao > (lido?.revisao || 0) ? recebido : lido;
}
export function transicao(anterior, acao, campos, ctx) {
  if (!ctx?.uid || !PAPEIS.includes(ctx.nome)) throw Error('Acesso não autorizado ao diário.');
  const data = campos.data || anterior?.data;
  chave(data); validarRegistro(anterior, data);
  const revisao = anterior?.revisao || 0;
  if (acao === 'salvar' || acao === 'enviar') {
    if (ctx.nome !== 'Fernanda') throw Error('Fernanda registra as atividades. A gestão confere o que foi enviado.');
    const linhas = normalizarLinhas(campos.linhas), resumo = texto(campos.resumo, 2000);
    if (acao === 'enviar' && !linhas.length && !resumo) throw Error('Registre uma atividade ou explique como foi o dia antes de enviar.');
    const igual = !!anterior && conteudoIgual(anterior, {linhas, resumo});
    const rc = igual ? anterior.revisaoConteudo : (anterior?.revisaoConteudo || 0) + 1;
    const estado = acao === 'enviar' ? 'enviado' : igual ? anterior.estado : 'rascunho';
    if (igual && (acao === 'salvar' || ['enviado','conferido'].includes(anterior.estado))) return {noOp:true, dados:anterior};
    return {noOp:false, dados:{schemaVersion:1, funcionario:'Fernanda', data, linhas, resumo, estado,
      parecer:anterior?.parecer || '', revisao:revisao + 1, revisaoConteudo:rc,
      ultimaEntrega:acao === 'enviar' ? rc : anterior?.ultimaEntrega || 0,
      ultimaConferencia:anterior?.ultimaConferencia || 0}};
  }
  if (acao !== 'conferir' && acao !== 'ajuste') throw Error('Ação inválida.');
  if (!['Amanda','Chris'].includes(ctx.nome) || anterior?.estado !== 'enviado') throw Error('Abra um fechamento enviado antes de conferir.');
  const parecer = texto(campos.parecer, 2000);
  if (acao === 'ajuste' && !parecer) throw Error('Escreva o que precisa de esclarecimento.');
  return {noOp:false, dados:{schemaVersion:1, funcionario:'Fernanda', data, linhas:anterior.linhas, resumo:anterior.resumo,
    estado:acao === 'conferir' ? 'conferido' : 'ajuste', parecer, revisao:revisao + 1,
    revisaoConteudo:anterior.revisaoConteudo, ultimaEntrega:anterior.ultimaEntrega,
    ultimaConferencia:acao === 'conferir' ? anterior.revisaoConteudo : anterior.ultimaConferencia}};
}

export function criarRepositorio(s, contexto, {uuid = () => crypto.randomUUID()} = {}) {
  const {db, doc, collection, query, orderBy, limit, onSnapshot, runTransaction, serverTimestamp, getDocFromServer, getDocsFromServer} = s;
  const capturar = () => {
    const c = {...contexto()};
    if (!c.uid || !PAPEIS.includes(c.nome)) throw Error('Acesso não autorizado ao diário.');
    return c;
  };
  const conferir = c => {
    const n = contexto();
    if (n.uid !== c.uid || n.nome !== c.nome || n.sessao !== c.sessao || (n.atorReal || n.nome) !== (c.atorReal || c.nome)) throw Error('O perfil mudou. Reabra o diário no perfil correto.');
  };
  const formato = (snap, data) => snap.exists() ? validarRegistro({...snap.data(), id:snap.id}, data) : null;
  async function ler(data) {
    const c = capturar(), snap = await getDocFromServer(doc(db, COLECAO, chave(data))); conferir(c);
    if (snap.metadata?.fromCache || snap.metadata?.hasPendingWrites) throw Error('Aguarde a confirmação do diário no servidor.');
    return formato(snap, data);
  }
  return {
    ler,
    async recentes(data, quantidade = 7) {
      const c = capturar(), dias = diasAnteriores(data, quantidade);
      const respostas = await Promise.allSettled(dias.map(ler)); conferir(c);
      return {registros:respostas.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value),
        falhas:respostas.flatMap((r, i) => r.status === 'rejected' ? [{data:dias[i], erro:String(r.reason?.message || r.reason)}] : []),
        diasConferidos:dias.length};
    },
    observar(data, ok, erro) {
      const c = capturar(), ref = doc(db, COLECAO, chave(data)); let ativo = true;
      const off = onSnapshot(ref, {includeMetadataChanges:true}, snap => {
        if (!ativo) return;
        try { conferir(c); ok(formato(snap, data), !snap.metadata?.fromCache && !snap.metadata?.hasPendingWrites); }
        catch (e) { erro(e); }
      }, e => { if (ativo) erro(e); });
      return () => { ativo = false; off(); };
    },
    async historico(data) {
      const c = capturar(), ref = collection(db, COLECAO, chave(data), 'historico');
      // Histórico só sob pedido, limitado; nunca assina a coleção inteira.
      const sn = await getDocsFromServer(query(ref, orderBy('revisao', 'desc'), limit(20))); conferir(c);
      return sn.docs.map(d => validarRegistro({...d.data(), id:d.id}, data));
    },
    async salvar(data, revisaoEsperada, acao, campos, operacao = uuid()) {
      const c = capturar(), id = chave(data);
      if (!Number.isInteger(revisaoEsperada) || revisaoEsperada < 0 || !/^[A-Za-z0-9_-]{8,100}$/.test(operacao)) throw Error('Reabra o diário antes de salvar.');
      const ref = doc(db, COLECAO, id), histRef = doc(db, COLECAO, id, 'historico', String(revisaoEsperada + 1));
      let recibo = null, noOp = false;
      const confirmarResultado = async () => {
        // A transação de escrita não atualiza a visão já assinada pelo Web SDK.
        // A confirmação lê raiz e recibo no servidor em um mesmo retrato, sem writes.
        const resultado = await runTransaction(db, async tx => {
          conferir(c);
          const [sn, hs] = await Promise.all([tx.get(ref), noOp ? Promise.resolve(null) : tx.get(histRef)]); conferir(c);
          const registro = formato(sn, data);
          const confirmado = noOp ? recibo : hs?.exists() ? validarRegistro(hs.data(), data) : null;
          if (!confirmado || (!noOp && (confirmado.operacao !== operacao || confirmado.autorUid !== c.uid || confirmado.autorNome !== (c.atorReal || c.nome) || confirmado.perfil !== c.nome || confirmado.revisao !== revisaoEsperada + 1)) ||
              !registro || registro.revisao < confirmado.revisao) throw Error('A gravação ainda não pôde ser confirmada. Seu rascunho foi preservado.');
          return {registro, recibo:confirmado, noOp};
        });
        conferir(c); return resultado;
      };
      try {
        await runTransaction(db, async tx => {
          recibo = null; noOp = false;
          conferir(c); const [sn, hs] = await Promise.all([tx.get(ref), tx.get(histRef)]); conferir(c);
          const ant = formato(sn, data);
          // Repetir uma resposta incerta consulta o recibo original, sem criar outra versão.
          if (hs.exists() && hs.data().operacao === operacao && hs.data().autorUid === c.uid && hs.data().perfil === c.nome) {
            recibo = validarRegistro(hs.data(), data); return;
          }
          if ((ant?.revisao || 0) !== revisaoEsperada) throw Error('O diário mudou em outra tela. Seu rascunho está preservado. Confira a versão atual antes de tentar novamente.');
          const t = transicao(ant, acao, {...campos, data}, c); noOp = t.noOp;
          if (noOp) { recibo = ant; return; }
          if (hs.exists()) throw Error('O histórico desta versão já existe. Reabra o diário; nenhuma versão foi sobrescrita.');
          const novo = {...t.dados, operacao, autorUid:c.uid, autorNome:c.atorReal || c.nome, perfil:c.nome, atualizadoEm:serverTimestamp()};
          conferir(c); tx.set(ref, novo); tx.set(histRef, novo); recibo = novo;
        });
      } catch (e) {
        try { return await confirmarResultado(); } catch {}
        throw e;
      }
      return confirmarResultado();
    }
  };
}

const CSS = `.d118{color:var(--fg,#eee);margin:0 0 20px}.d118 *{box-sizing:border-box}.d118 .d118-hero,.d118 article,.d118 .d118-gestao{padding:18px;border:1px solid #ffffff28;border-radius:14px;background:#ffffff04;margin:12px 0}.d118 .d118-hero{border-color:#ffbf0055;background:linear-gradient(110deg,#ffbf0012,#ffffff04)}.d118 h2{margin:4px 0 8px;font-size:23px}.d118 h3{margin:2px 0 10px;font-size:17px}.d118 p{margin:8px 0}.d118 small{color:#b9bdc4}.d118 header,.d118 .d118-tools,.d118 .d118-actions,.d118 .d118-stats{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}.d118 .d118-actions{justify-content:flex-start;margin-top:12px}.d118 .d118-tools{align-items:end;margin:14px 0}.d118 .d118-tools label{min-width:170px;max-width:270px;flex:1}.d118 label{display:block;font-size:13px;font-weight:700}.d118 label span{display:block;margin:5px 0 7px}.d118 input,.d118 textarea,.d118 select{font:inherit;width:100%;border:1px solid #ffffff40;background:#202226;color:#fff;border-radius:8px;padding:10px;color-scheme:dark}.d118 textarea{resize:vertical;min-height:80px}.d118 .d118-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.d118 .d118-stats{justify-content:flex-start;margin-top:14px}.d118 .d118-stat{padding:9px 12px;border:1px solid #ffffff25;border-radius:9px;flex:1;min-width:115px}.d118 .d118-stat b{display:block;font-size:22px}.d118 button{font:inherit;cursor:pointer;min-height:44px;white-space:normal}.d118 button:disabled{opacity:.5;cursor:wait}.d118 .d118-badge{display:inline-block;border-radius:7px;padding:6px 9px;background:#ffffff12;font-size:12px;font-weight:800}.d118 .d118-badge.conferido{color:#80dcac}.d118 .d118-badge.ajuste{color:#ffb4a9}.d118 .d118-badge.enviado{color:#ffd167}.d118 .d118-msg{white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid #ffbf00;background:#ffbf000b;padding:12px;margin:12px 0}.d118 .d118-preview{white-space:pre-wrap;overflow-wrap:anywhere}.d118 .d118-meta{font-size:13px;color:#b9bdc4;overflow-wrap:anywhere}.d118 a{color:#99d8ff;overflow-wrap:anywhere}.d118 details{margin-top:12px}.d118 summary{cursor:pointer;font-weight:700}.d118 [hidden]{display:none!important}.d118 .d118-done{display:flex;align-items:center;gap:9px;margin-top:10px}.d118 .d118-done input{width:20px;height:20px}.d118 .d118-remove{font-size:13px;color:#ddd}.d118 .d118-empty{padding:16px;border:1px dashed #ffffff35;border-radius:12px}@media(max-width:480px){.d118 .d118-hero,.d118 article{padding:14px}.d118 .d118-grid{grid-template-columns:1fr}.d118 h2{font-size:21px}.d118 .d118-actions button{flex:1}.d118 .d118-stat{min-width:100px}}`;

export function montarDiario(root, {repo, contexto, compacto = false, dataInicial, abrir, confirmar = t => globalThis.confirm(t), storage = armazenamentoLocal(), uuid = () => crypto.randomUUID()} = {}) {
  const ctx = {...contexto()}, autora = ctx.nome === 'Fernanda', gestao = ['Amanda','Chris'].includes(ctx.nome);
  if (!ctx.uid || !PAPEIS.includes(ctx.nome)) throw Error('Acesso não autorizado ao diário.');
  let vivo = true, geracao = 0, off = null, data = dataValida(dataInicial) ? dataInicial : hojeBRT(),
    confirmado = false, base = null, atual = null, edicao = {linhas:[], resumo:'', parecer:''},
    sujo = false, ocupado = false, conflito = false, recuperado = null, histGeracao = 0, recentesGeracao = 0, consultandoRecentes = false, tipoAviso = '';
  const sessaoValida = () => { const c = contexto(); return vivo && c.uid === ctx.uid && c.nome === ctx.nome && c.sessao === ctx.sessao && (c.atorReal || c.nome) === (ctx.atorReal || ctx.nome); };
  const idDraft = d => ['get-diario-i118', ctx.uid, ctx.nome, d].join(':');
  const draft = () => ({revisao:base?.revisao || 0, data, linhas:edicao.linhas, resumo:edicao.resumo, parecer:edicao.parecer});
  function guardar() {
    if (!sujo) return true;
    try {
      if (!storage?.setItem) throw Error('Armazenamento indisponível');
      storage.setItem(idDraft(data), JSON.stringify(draft())); return true;
    }
    catch { aviso('Não foi possível guardar o rascunho neste navegador. Mantenha a tela aberta até salvar.'); return false; }
  }
  const lerDraft = d => { try { const v = JSON.parse(storage?.getItem(idDraft(d)) || 'null'); return v?.data === d && Array.isArray(v.linhas) ? v : null; } catch { return null; } };
  const limparDraft = d => { try { storage?.removeItem(idDraft(d)); } catch {} };
  root.innerHTML = `<style>${CSS}</style><section class="d118"><div class="d118-hero"><header><div><span class="d118-badge">FERNANDA · REGISTRO DIÁRIO</span><h2>${autora?'Meu dia de trabalho':'Dia de trabalho da Fernanda'}</h2><small>Registre o que foi pedido, o que fez e o que ficou pendente.</small></div>${compacto && abrir?'<button class="btn secondary" data-command="abrir">Abrir diário →</button>':''}</header><div class="d118-stats"></div></div><div class="d118-tools"><label><span>Dia do registro</span><input data-data type="date" min="2000-01-01" max="${hojeBRT()}" value="${data}"></label><button class="btn secondary" data-command="hoje">Hoje</button><button class="btn secondary" data-command="atualizar">Conferir versão atual</button></div><div class="d118-msg" data-virada hidden></div><div class="d118-msg" data-aviso role="status" aria-live="polite">Carregando o diário…</div><div class="d118-msg" data-conflito hidden>Há uma versão mais recente. Seus campos continuam preservados. Abra a versão atual para comparar antes de salvar.<div class="d118-actions"><button class="btn secondary" data-command="versao">Abrir versão atual</button></div></div><div data-recuperado></div><div data-cabecalho></div><div data-corpo></div><div data-historico></div><article><h3>Dias anteriores que precisam de atenção</h3><p class="d118-meta">Consulte os sete dias anteriores ao dia selecionado. Atividades e fechamentos continuam no dia original. Para outras datas, use “Dia do registro”.</p><button class="btn secondary" data-command="recentes">Consultar os sete dias anteriores</button><div data-recentes></div></article><p><small>Este registro é interno. Os checks daqui não alteram demandas, vídeos, legendas, gravações nem aprovações de clientes. Cada dia abre independentemente da conferência do anterior.</small></p></section>`;
  const q = s => root.querySelector(s);
  function aviso(t, tipo = '') { if (!vivo) return; tipoAviso = tipo; q('[data-aviso]').hidden = !t; q('[data-aviso]').textContent = t; }
  function erroVisivel(e) {
    const codigo = typeof e?.code === 'string' ? e.code : '';
    if (/^(?:(?:firestore|firebase)\/)?[a-z-]+$/.test(codigo)) console.warn('[I118 diário] Falha técnica:', codigo);
    return mensagemErroDiario(e);
  }
  function resumoHistorico(r) {
    const linhas = r?.linhas || [];
    return `<div class="d118-preview">${esc(linhas.map(l => STATUS[l.status] + ' · ' + l.texto + (l.cliente?' · ' + l.cliente:'') + (l.observacoes?'\n' + l.observacoes:'')).join('\n\n'))}</div>${r?.resumo?'<p class="d118-preview">'+esc(r.resumo)+'</p>':''}${r?.parecer?'<p class="d118-preview"><b>Retorno:</b> '+esc(r.parecer)+'</p>':''}`;
  }
  function pintarRecuperado() {
    q('[data-recuperado]').innerHTML = recuperado ? `<details open class="d118-msg"><summary>Rascunho anterior preservado · versão ${Number(recuperado.revisao) || 0}</summary>${resumoHistorico(recuperado)}<p><small>Confira os textos acima com os campos da versão atual. Usar o rascunho não salva nem conclui o dia.</small></p><div class="d118-actions"><button class="btn secondary" data-command="usar-rascunho">Usar este rascunho nos campos</button><button class="btn secondary" data-command="descartar-rascunho">Descartar rascunho local</button></div></details>` : '';
  }
  function pintarCabecalho() {
    const r = atual, estado = r?.estado;
    q('[data-conflito]').hidden = !conflito;
    q('.d118-stats').innerHTML = [['Atividades',edicao.linhas.length],['Concluídas',edicao.linhas.filter(l => l.status === 'concluido').length],['Em aberto',edicao.linhas.filter(l => l.status !== 'concluido').length]].map(([rot,n]) => `<div class="d118-stat"><b>${n}</b>${rot}</div>`).join('');
    q('[data-cabecalho]').innerHTML = `${confirmado?`<span class="d118-badge ${esc(estado || '')}">${esc(estado?ESTADOS[estado]:'Ainda sem registro')}</span> <small>${r?'Versão '+r.revisao+' · ':''}${sujo?'Alterações ainda não salvas':'Dados confirmados no servidor'}</small>`:'<small>Aguardando confirmação do servidor</small>'}${r?.ultimaConferencia && r.revisaoConteudo > r.ultimaConferencia?'<p class="d118-msg">Atividades atualizadas após uma conferência anterior. O novo fechamento precisa ser enviado e conferido.</p>':''}${r?.parecer?`<p class="d118-msg"><b>Último retorno da gestão:</b> ${esc(r.parecer)}</p>`:''}`;
    // Não reconstruir os campos durante snapshots ou a digitação.
    root.querySelectorAll('[data-save]').forEach(b => { b.disabled = ocupado || !confirmado || conflito; });
  }
  function linhaForm(l, i) {
    return `<article data-linha="${esc(l.id)}"><header><h3>Atividade ${i + 1}</h3><button type="button" class="btn secondary d118-remove" data-remover="${esc(l.id)}">Retirar do diário</button></header><label><span>O que foi pedido ou feito</span><textarea data-field="texto" maxlength="1000" rows="2" placeholder="Ex.: organizar os materiais da gravação">${esc(l.texto)}</textarea></label><div class="d118-grid"><label><span>Situação</span><select data-field="status">${Object.entries(STATUS).map(([k,v]) => `<option value="${k}" ${l.status === k?'selected':''}>${v}</option>`).join('')}</select></label><label><span>Cliente (opcional)</span><input data-field="cliente" maxlength="160" value="${esc(l.cliente)}"></label><label><span>Quem pediu (opcional)</span><input data-field="solicitante" maxlength="100" value="${esc(l.solicitante)}"></label><label><span>Período (opcional)</span><input data-field="periodo" maxlength="80" placeholder="Manhã, tarde ou horário" value="${esc(l.periodo)}"></label></div><label class="d118-done"><input data-feito type="checkbox" ${l.status === 'concluido'?'checked':''}> Já concluí esta atividade</label><details><summary>Observações, link e vínculo</summary><label><span>Observações (opcional)</span><textarea data-field="observacoes" maxlength="2000">${esc(l.observacoes)}</textarea></label><label><span>Link do material (opcional)</span><input data-field="link" type="url" maxlength="2000" placeholder="https://…" value="${esc(l.link)}"></label><label><span>Identificação de demanda ou trabalho (opcional)</span><input data-field="vinculo" maxlength="250" placeholder="Ex.: nome ou identificação da demanda" value="${esc(l.vinculo)}"></label></details></article>`;
  }
  function pintarCorpo() {
    if (!sessaoValida()) return;
    const r = atual;
    q('[data-corpo]').innerHTML = autora ? `<div data-linhas>${edicao.linhas.map(linhaForm).join('') || '<div class="d118-empty">Ainda não há atividades neste dia. Comece pelo que foi pedido ou pelo que você já fez.</div>'}</div><div class="d118-actions"><button class="btn secondary" data-command="adicionar">+ Adicionar atividade</button></div><label><span>Resumo ou impedimento do dia (opcional)</span><textarea data-resumo maxlength="2000" placeholder="Algo que a Amanda e o Chris precisam saber…">${esc(edicao.resumo)}</textarea></label><div class="d118-actions"><button class="btn secondary" data-save="salvar">Salvar preenchimento</button><button class="btn" data-save="enviar">Enviar fechamento do dia</button></div><p><small>O preenchimento salvo já aparece para Amanda e Chris. Envie o fechamento quando terminar o dia; atividades podem continuar pendentes.</small></p>` : `<div data-linhas>${(r?.linhas || []).map(l => `<article><header><h3>${esc(l.texto)}</h3><span class="d118-badge">${esc(STATUS[l.status])}</span></header><div class="d118-meta">${[l.cliente,l.solicitante?'Pedido por '+l.solicitante:'',l.periodo].filter(Boolean).map(esc).join(' · ')}</div>${l.observacoes?'<p class="d118-preview">'+esc(l.observacoes)+'</p>':''}${linkSeguro(l.link)?'<p><a href="'+esc(l.link)+'" target="_blank" rel="noopener noreferrer">Abrir material ↗</a></p>':''}${l.vinculo?'<p class="d118-meta">Vínculo informado: '+esc(l.vinculo)+'</p>':''}</article>`).join('') || '<div class="d118-empty">Nenhuma atividade salva para este dia.</div>'}</div>${r?.resumo?'<article><h3>Resumo do dia</h3><p class="d118-preview">'+esc(r.resumo)+'</p></article>':''}${r?.estado === 'enviado'?`<div class="d118-gestao"><h3>Conferir fechamento</h3><label><span>Retorno para Fernanda</span><textarea data-parecer maxlength="2000" placeholder="Obrigatório se pedir esclarecimento">${esc(edicao.parecer)}</textarea></label><div class="d118-actions"><button class="btn" data-save="conferir">Marcar como conferido</button><button class="btn secondary" data-save="ajuste">Pedir esclarecimento</button></div><small>A conferência registra a leitura deste diário. Não conclui as tarefas citadas nele.</small></div>`:r?.estado === 'rascunho'?'<p class="d118-msg">Fernanda ainda está preenchendo. A conferência abre quando ela enviar o fechamento.</p>':''}`;
    q('[data-historico]').innerHTML = r ? '<details data-historia><summary>Últimas versões deste dia</summary><div data-versoes>Abra para consultar até 20 versões.</div></details>' : '';
    const h = q('[data-historia]'); if (h) h.ontoggle = () => { if (h.open) void historico(); };
    pintarRecuperado(); pintarCabecalho(); habilitar();
  }
  function habilitar() {
    root.querySelectorAll('input,textarea,select,button').forEach(e => { e.disabled = ocupado; });
    root.querySelectorAll('[data-save]').forEach(e => { e.disabled = ocupado || !confirmado || conflito; });
    const add = q('[data-command="adicionar"]'); if (add) add.disabled = ocupado || edicao.linhas.length >= LIMITE_LINHAS;
    q('[data-command="recentes"]').disabled = ocupado || consultandoRecentes;
  }
  function adotar(r, {recuperar = false} = {}) {
    r = registroMaisRecente(r, atual, data);
    base = r; atual = r; conflito = false;
    edicao = {linhas:(r?.linhas || []).map(l => ({...l})), resumo:r?.resumo || '', parecer:''}; sujo = false;
    if (recuperar) {
      const d = lerDraft(data);
      if (d && d.revisao === (r?.revisao || 0)) { edicao = {linhas:d.linhas.map(l => ({...l})), resumo:d.resumo || '', parecer:d.parecer || ''}; sujo = true; recuperado = null; }
      else recuperado = d;
    }
    pintarCorpo();
  }
  async function carregar(d) {
    if (!sessaoValida() || ocupado) return;
    guardar(); off?.(); off = null; const g = ++geracao; ++histGeracao; ++recentesGeracao;
    data = d; q('[data-data]').value = d; confirmado = false; base = null; atual = null; edicao = {linhas:[], resumo:'', parecer:''}; sujo = false; conflito = false; recuperado = null; consultandoRecentes = false;
    q('[data-corpo]').innerHTML = ''; q('[data-historico]').innerHTML = ''; q('[data-recuperado]').innerHTML = ''; q('[data-recentes]').innerHTML = ''; q('[data-command="recentes"]').disabled = false; conferirDia(); pintarCabecalho(); aviso('Carregando o diário deste dia…');
    try {
      let primeiro = true;
      off = repo.observar(d, (r, fresco) => {
        if (!sessaoValida() || g !== geracao) return;
        // O watch pode ainda entregar uma revisão anterior à releitura transacional.
        // Nunca tratar esse atraso como edição concorrente ou apagar a confirmação nova.
        if (registroMaisRecente(r, atual, data) !== r) return;
        if (!fresco) { confirmado = false; aviso('Aguardando confirmação do servidor. Seus campos continuam preservados.', 'aguardando-servidor'); pintarCabecalho(); return; }
        confirmado = true; atual = r;
        if (primeiro) { primeiro = false; adotar(r, {recuperar:true}); aviso(sujo?'Rascunho recuperado deste navegador.':'' ); return; }
        if (ocupado) { pintarCabecalho(); return; }
        if ((base?.revisao || 0) !== (r?.revisao || 0)) {
          if (sujo) { conflito = true; guardar(); pintarCabecalho(); aviso('Chegou uma nova versão; nenhuma palavra digitada foi substituída.'); }
          else { adotar(r); aviso('Diário atualizado.'); }
        } else {
          pintarCabecalho();
          // Confirmar a mesma revisão encerra a espera de rede; não apaga o
          // resultado de uma ação nem o erro que a pessoa precisa entender.
          if (!conflito && tipoAviso === 'aguardando-servidor') aviso('');
        }
      }, e => { if (sessaoValida() && g === geracao) { confirmado = false; pintarCabecalho(); aviso(erroVisivel(e)); } });
    } catch (e) { if (sessaoValida() && g === geracao) aviso(erroVisivel(e)); }
  }
  async function abrirVersao() {
    if (!sessaoValida() || ocupado) return;
    guardar(); const g = geracao; ocupado = true; habilitar(); aviso('Conferindo a versão atual…');
    try {
      const r = await repo.ler(data); if (!sessaoValida() || g !== geracao) return;
      const d = sujo ? draft() : lerDraft(data); confirmado = true; recuperado = d;
      adotar(r); recuperado = d; pintarRecuperado(); aviso(d?'Versão atual aberta. Seu rascunho anterior está acima para comparar.':'Versão atual confirmada.');
    } catch (e) { if (sessaoValida() && g === geracao) aviso(erroVisivel(e)); }
    finally { ocupado = false; if (sessaoValida()) habilitar(); }
  }
  async function historico() {
    const g = geracao, h = ++histGeracao, d = data;
    const box = q('[data-versoes]'); if (!box) return; box.textContent = 'Carregando versões…';
    try {
      const lista = await repo.historico(d); if (!sessaoValida() || g !== geracao || h !== histGeracao || !box.isConnected) return;
      box.innerHTML = lista.map(r => `<article><b>Versão ${r.revisao} · ${esc(ESTADOS[r.estado])}</b><p class="d118-meta">${esc(r.perfil)}${r.autorNome !== r.perfil?' · operação de '+esc(r.autorNome):''}</p>${resumoHistorico(r)}</article>`).join('') || '<p>Sem versões registradas.</p>';
    } catch (e) { if (sessaoValida() && g === geracao && box.isConnected) box.textContent = 'Histórico indisponível. '+erroVisivel(e); }
  }
  async function recentes() {
    if (!sessaoValida() || consultandoRecentes) return;
    const g = geracao, n = ++recentesGeracao, d = data, botao = q('[data-command="recentes"]'), box = q('[data-recentes]');
    consultandoRecentes = true; botao.disabled = true; box.textContent = 'Conferindo os sete dias anteriores…';
    try {
      const resultado = await repo.recentes(d);
      if (!sessaoValida() || g !== geracao || n !== recentesGeracao) return;
      const pendentes = resultado.registros.filter(r => r.estado !== 'conferido' || r.linhas.some(l => l.status !== 'concluido'));
      box.innerHTML = (resultado.falhas.length?'<p class="d118-msg">Não foi possível conferir '+resultado.falhas.length+' dia(s). A lista abaixo é parcial; você pode tentar novamente. O registro de hoje continua disponível.</p>':'') +
        (pendentes.length?pendentes.map(r => `<article><h3>${esc(r.data.split('-').reverse().join('/'))}</h3><span class="d118-badge ${esc(r.estado)}">${esc(ESTADOS[r.estado])}</span><p>${r.linhas.filter(l => l.status !== 'concluido').length} atividade(s) em aberto · ${r.linhas.length} registrada(s)</p><button class="btn secondary" data-abrir-dia="${r.data}">Abrir este dia</button></article>`).join(''):
          '<p class="d118-meta">'+(resultado.falhas.length?'Nenhuma pendência nos dias que puderam ser conferidos.':'Nenhuma pendência registrada nos '+resultado.diasConferidos+' dias consultados.')+'</p>');
    } catch (e) { if (sessaoValida() && g === geracao && n === recentesGeracao) box.textContent = 'Dias anteriores indisponíveis. O registro atual foi preservado. '+erroVisivel(e); }
    finally { if (sessaoValida() && g === geracao && n === recentesGeracao) { consultandoRecentes = false; botao.disabled = ocupado; } }
  }
  async function salvar(acao) {
    if (!sessaoValida() || ocupado || !confirmado || conflito) return;
    const g = geracao, d = data, rev = base?.revisao || 0, campos = {data:d, ...edicao};
    try { transicao(base, acao, campos, ctx); } catch (e) { aviso(erroVisivel(e)); return; }
    sujo = true; guardar(); ocupado = true; habilitar(); aviso('Salvando e confirmando o diário…');
    try {
      const resultado = await repo.salvar(d, rev, acao, campos);
      if (!sessaoValida() || g !== geracao) return;
      if (!resultado?.registro || !resultado?.recibo) throw Error('Não foi possível confirmar o diário. Seu rascunho foi preservado.');
      limparDraft(d); recuperado = null; confirmado = true; adotar(resultado.registro);
      aviso(resultado.noOp?'Este conteúdo já estava salvo.':acao === 'enviar'?'Fechamento enviado. Amanda e Chris já podem conferir.':acao === 'conferir'?'Conferência registrada. Fernanda já vê o resultado.':acao === 'ajuste'?'Esclarecimento solicitado. Fernanda vê seu retorno no diário.':'Preenchimento salvo e visível para Amanda e Chris.');
    } catch (e) { if (sessaoValida() && g === geracao) { guardar(); aviso(erroVisivel(e)); } }
    finally { ocupado = false; if (sessaoValida()) habilitar(); }
  }
  function mudou(e) {
    if (!sessaoValida() || ocupado) return;
    const target = e.target, card = target.closest('[data-linha]'), linha = card && edicao.linhas.find(l => l.id === card.dataset.linha);
    if (linha && autora && target.hasAttribute('data-field')) {
      const field = target.dataset.field; if (!['texto','cliente','solicitante','periodo','status','observacoes','link','vinculo'].includes(field)) return;
      linha[field] = target.value;
      if (field === 'status') { const ch = card.querySelector('[data-feito]'); if (ch) ch.checked = target.value === 'concluido'; }
    } else if (linha && autora && target.hasAttribute('data-feito')) {
      linha.status = target.checked ? 'concluido' : 'afazer'; card.querySelector('[data-field="status"]').value = linha.status;
    } else if (target.hasAttribute('data-resumo') && autora) edicao.resumo = target.value;
    else if (target.hasAttribute('data-parecer') && gestao) edicao.parecer = target.value;
    else return;
    sujo = true; guardar(); pintarCabecalho();
  }
  function canLeave() {
    if (ocupado) { aviso('Aguarde a confirmação do envio antes de sair.'); return false; }
    if (!sujo) return true;
    if (!guardar()) return false;
    return confirmar('Há alterações ainda não salvas no diário. Elas ficam guardadas neste navegador para você retomar. Deseja sair desta tela?') === true;
  }
  function trocar(d) {
    q('[data-data]').max = hojeBRT();
    if (!dataValida(d) || d > hojeBRT()) { q('[data-data]').value = data; aviso('Escolha hoje ou um dia anterior válido.'); return; }
    if (d === data) return;
    if (!canLeave()) { q('[data-data]').value = data; return; }
    void carregar(d);
  }
  function conferirDia() {
    if (!sessaoValida()) return;
    const hoje = hojeBRT(); q('[data-data]').max = hoje;
    const avisoDia = q('[data-virada]'); avisoDia.hidden = data === hoje;
    avisoDia.textContent = data === hoje ? '' : 'Você está no registro de '+data.split('-').reverse().join('/')+'. Para registrar o dia atual, use Hoje. O texto deste dia permanece guardado.';
  }
  function clique(e) {
    if (!sessaoValida() || ocupado) return;
    const save = e.target.closest('[data-save]'); if (save) { void salvar(save.dataset.save); return; }
    const retirar = e.target.closest('[data-remover]');
    if (retirar && autora) {
      if (!confirmar('Retirar esta atividade do preenchimento? A retirada só valerá depois de salvar; versões anteriores permanecem no histórico.')) return;
      edicao.linhas = edicao.linhas.filter(l => l.id !== retirar.dataset.remover); sujo = true; guardar(); pintarCorpo(); return;
    }
    const cmd = e.target.closest('[data-command]')?.dataset.command;
    const abrirDia = e.target.closest('[data-abrir-dia]')?.dataset.abrirDia;
    if (abrirDia) { trocar(abrirDia); return; }
    if (cmd === 'adicionar' && autora && edicao.linhas.length < LIMITE_LINHAS) {
      edicao.linhas.push({id:uuid(),texto:'',cliente:'',solicitante:'',periodo:'',status:'afazer',observacoes:'',link:'',vinculo:''});
      sujo = true; guardar(); pintarCorpo(); q('[data-linhas] article:last-child [data-field="texto"]')?.focus();
    } else if (cmd === 'atualizar' || cmd === 'versao') { if (!confirmado && !atual && !sujo) void carregar(data); else void abrirVersao(); }
    else if (cmd === 'hoje') trocar(hojeBRT());
    else if (cmd === 'abrir' && abrir) { guardar(); abrir(data); }
    else if (cmd === 'recentes') void recentes();
    else if (cmd === 'usar-rascunho' && recuperado) {
      if (!confirmar('Usar o rascunho anterior nos campos? Confira o texto com a versão atual antes de salvar.')) return;
      if (autora) edicao = {linhas:recuperado.linhas.map(l => ({...l})), resumo:recuperado.resumo || '', parecer:''};
      else edicao.parecer = recuperado.parecer || '';
      recuperado = null; sujo = true; guardar(); pintarCorpo();
    } else if (cmd === 'descartar-rascunho' && recuperado && confirmar('Descartar apenas o rascunho local exibido? O diário salvo permanece.')) { recuperado = null; if (!sujo) limparDraft(data); pintarRecuperado(); }
  }
  const mudarData = e => { if (e.target.hasAttribute('data-data')) trocar(e.target.value); };
  const sairPagina = e => { guardar(); if (sujo || ocupado) { e.preventDefault(); e.returnValue = ''; } };
  const pagehide = () => guardar();
  const docUI = root.ownerDocument;
  const visibility = () => { if (!docUI?.hidden) conferirDia(); };
  root.addEventListener('click', clique); root.addEventListener('input', mudou); root.addEventListener('change', mudou); root.addEventListener('change', mudarData);
  globalThis.addEventListener?.('beforeunload', sairPagina); globalThis.addEventListener?.('pagehide', pagehide);
  globalThis.addEventListener?.('focus', conferirDia); docUI?.addEventListener('visibilitychange', visibility);
  void carregar(data);
  return {
    canLeave, temRascunho:() => sujo, ocupado:() => ocupado,
    destroy() {
      if (!vivo) return; guardar(); vivo = false; ++geracao; ++histGeracao; ++recentesGeracao; off?.(); off = null;
      root.removeEventListener('click', clique); root.removeEventListener('input', mudou); root.removeEventListener('change', mudou); root.removeEventListener('change', mudarData);
      globalThis.removeEventListener?.('beforeunload', sairPagina); globalThis.removeEventListener?.('pagehide', pagehide); root.replaceChildren();
      globalThis.removeEventListener?.('focus', conferirDia); docUI?.removeEventListener('visibilitychange', visibility);
    }
  };
}
