import { periodoFuncoesFixasI167, htmlFuncaoFixaAgendaI167 } from './gs-funcoes-fixas-agenda-i167.mjs?v=i167-r81';

/** Agenda de organização. A obrigação física e toda autorização pertencem ao repo I167. */
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const h = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
const norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const chaveEtapa = v => norm(v).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'etapa';
const role = c => norm(c?.pessoa || c?.nome);
const editavel = c => role(c) === 'amanda';
const consultaEquipe = c => ['amanda', 'chris', 'christopher'].includes(role(c));
const legivel = c => consultaEquipe(c) || role(c) === 'gabrielle';
const labelPessoa = v => norm(v) === 'fernanda' ? 'Júlia' : String(v || 'Sem responsável');
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const date = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(`${s}T12:00:00`) : null;
const add = (s, n) => { const d = date(s); if (!d) return ''; d.setDate(d.getDate() + n); return iso(d); };
const hoje = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const mesSeguinte = () => { const d = date(`${hoje().slice(0, 7)}-01`); d.setMonth(d.getMonth() + 1); return iso(d).slice(0, 7); };
const fmtDia = s => date(s)?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) || 'Sem data';
const fmtMes = s => date(`${s}-01`)?.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) || s;
const opId = () => `agenda167_${globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
const clone = x => JSON.parse(JSON.stringify(x));
const fonte = v => typeof v === 'function' ? v() : v;
const array = v => Array.isArray(v) ? v : [];
const fechada = i => ['aprovada', 'concluida', 'concluída', 'cancelada', 'cancelado', 'finalizada'].includes(norm(i.status));
const arquivada = i => i.excluido === true || i.agendaOrganizacaoI167?.arquivada === true;
const urlSegura = s => { try { const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const ordemItens = (a, b) => String(a.prazoData || '9999').localeCompare(String(b.prazoData || '9999')) || Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.prazoHora || '').localeCompare(String(b.prazoHora || '')) || String(a.id).localeCompare(String(b.id));

export const ETAPAS_INICIAIS_I167 = Object.freeze([
  { id: 'referencias', titulo: 'Referências', destinatario: 'Gabrielle', offsetDias: 0, quantidade: 12, unidade: 'referências', ordem: 1 },
  { id: 'previa', titulo: 'Prévia para a reunião', destinatario: 'Chris', offsetDias: 1, quantidade: 1, unidade: 'prévia', ordem: 2 },
  { id: 'reuniao', titulo: 'Reunião com o cliente', destinatario: 'Amanda', offsetDias: 2, quantidade: 1, unidade: 'reunião', ordem: 3 },
  { id: 'consolidado', titulo: 'Consolidado da reunião', destinatario: 'Amanda', offsetDias: 3, quantidade: 1, unidade: 'documento', ordem: 4 },
  { id: 'criacao', titulo: 'Criação do calendário', destinatario: 'Chris', offsetDias: 4, quantidade: 1, unidade: 'calendário', ordem: 5 },
  { id: 'revisao', titulo: 'Revisão da Amanda', destinatario: 'Amanda', offsetDias: 5, quantidade: 1, unidade: 'revisão', ordem: 6 },
  { id: 'liberacao', titulo: 'Liberação para envio', destinatario: 'Amanda', offsetDias: 6, quantidade: 1, unidade: 'liberação', ordem: 7 }
]);

function itemPlano(i) {
  const m = i.agendaOrganizacaoI167 || {};
  const prazo = typeof i.prazo === 'string' ? i.prazo : '';
  return { ...i, mes: i.mes || m.mes || '', etapa: i.etapa || m.etapa || i.titulo || '',
    inicio: i.inicio ?? m.inicio ?? '', prazoData: i.prazoData || prazo.slice(0, 10),
    prazoHora: i.prazoHora || prazo.slice(11, 16) || '', ordem: i.ordem ?? m.ordem ?? 0,
    quantidade: i.quantidade ?? m.quantidade ?? 1, unidade: i.unidade ?? m.unidade ?? 'etapa',
    fixo: i.fixo ?? m.fixo ?? false, prioridade: i.prioridade || m.prioridade || 'normal',
    empresaId: i.empresaId ?? m.empresaId ?? '', assinatura: i.assinatura || i.versao };
}

const CSS = `
.ago167{--ag-bg:var(--paper,var(--card-bg,#fff));--ag-text:var(--offwhite,var(--text,#1e293b));--ag-muted:var(--muted,#64748b);--ag-line:var(--line,var(--border,#e2e8f0));--ag-brand:#7155ce;--ag-link:#c4b5fd;font-family:inherit;font-size:14px;line-height:1.45;color:var(--ag-text);max-width:1540px;margin:0 auto;padding:clamp(12px,2vw,28px)}
.ago167 *{box-sizing:border-box}.ago167 button,.ago167 input,.ago167 select,.ago167 textarea{font:inherit}.ago167 button{cursor:pointer}.ago167 button:disabled{cursor:wait;opacity:.55}.ago167 button:focus-visible,.ago167 input:focus-visible,.ago167 select:focus-visible,.ago167 textarea:focus-visible{outline:3px solid #c4b5fd;outline-offset:2px}
.ago167 .ag-head,.ago167 .ag-toolbar,.ago167 .ag-actions,.ago167 .ag-topline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.ago167 .ag-head{justify-content:space-between;margin-bottom:22px}.ago167 h2{font-size:clamp(23px,3vw,32px);letter-spacing:-.04em;margin:2px 0 4px}.ago167 h3{margin:0;font-size:18px}.ago167 p{margin:4px 0}.ago167 .ag-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--ag-brand)}.ago167 .ag-muted{color:var(--ag-muted);font-size:12px}.ago167 .ag-btn{border:1px solid var(--ag-line);border-radius:10px;background:var(--ag-bg);color:var(--ag-text);padding:9px 13px;min-height:39px;font-weight:650}.ago167 .ag-btn:hover{border-color:#a995e3;background:#f7f4ff;color:#1e293b}.ago167 .ag-primary{background:var(--ag-brand);border-color:var(--ag-brand);color:white}.ago167 .ag-primary:hover{background:#6044ba;color:white}.ago167 .ag-danger{color:#b42338}.ago167 .ag-textbtn{border:0;background:none;padding:5px 0;color:var(--ag-link);text-align:left;font-weight:700}.ago167 .ag-tab[aria-pressed=true]{background:#eee8fb;border-color:#d7c8f4;color:#5938ad}
.ago167 .ag-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}.ago167 .ag-stat{border:1px solid var(--ag-line);background:var(--ag-bg);border-radius:16px;padding:14px 18px}.ago167 .ag-stat strong{display:block;font-size:25px;letter-spacing:-.04em}.ago167 .ag-stat small{color:var(--ag-muted)}.ago167 .ag-stat.ag-late strong{color:#b45309}.ago167 .ag-tools{border:1px solid var(--ag-line);border-radius:16px;background:var(--ag-bg);padding:14px;margin-bottom:16px}.ago167 .ag-toolbar{justify-content:space-between}.ago167 .ag-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.ago167 label{display:grid;gap:5px;font-size:12px;font-weight:650;color:var(--ag-muted)}.ago167 input,.ago167 select,.ago167 textarea{width:100%;min-width:0;border:1px solid var(--ag-line);border-radius:9px;padding:9px 10px;color:var(--ag-text);background:var(--ag-bg)}.ago167 textarea{min-height:94px;resize:vertical}.ago167 input[type=checkbox]{width:auto;accent-color:var(--ag-brand)}.ago167 .ag-check{display:flex;align-items:center;gap:8px}
.ago167 .ag-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:18px}.ago167 .ag-layout.ag-editing{grid-template-columns:minmax(0,1.4fr) minmax(320px,.85fr)}.ago167 .ag-panel{border:1px solid var(--ag-line);border-radius:17px;background:var(--ag-bg);padding:18px;min-width:0}.ago167 .ag-editor{align-self:start;position:sticky;top:16px}.ago167 .ag-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}.ago167 .ag-span{grid-column:1/-1}.ago167 details{margin:15px 0}.ago167 summary{cursor:pointer;color:var(--ag-link);font-weight:700}.ago167 .ag-alert{padding:12px 14px;border-radius:12px;background:#fff5e5;border:1px solid #f4d6a1;margin-bottom:14px;color:#7c4916}.ago167 .ag-error{background:#fff1f2;border-color:#fecdd3;color:#9f1239}.ago167 .ag-ok{background:#ecfdf5;border-color:#a7f3d0;color:#065f46}.ago167 .ag-alert p{white-space:pre-wrap}.ago167 .ag-empty{text-align:center;padding:40px 16px;color:var(--ag-muted)}.ago167 .ag-empty strong{color:var(--ag-text);display:block;margin-bottom:7px}
.ago167 .ag-list{display:grid;gap:10px}.ago167 .ag-item{border:1px solid var(--ag-line);border-left:3px solid #aa96dd;border-radius:12px;padding:13px 14px;background:var(--ag-bg);min-width:0}.ago167 .ag-item.ag-overdue{border-left-color:#d97706}.ago167 .ag-item.ag-archived{opacity:.7}.ago167 .ag-item h4{margin:3px 0 5px;font-size:14px;overflow-wrap:anywhere}.ago167 .ag-item .ag-topline{justify-content:space-between;font-size:11px;color:var(--ag-muted)}.ago167 .ag-meta{display:flex;gap:6px 12px;flex-wrap:wrap;font-size:12px;color:var(--ag-muted);margin-top:8px}.ago167 .ag-pill{border-radius:99px;background:#f1edf9;color:#685087;padding:2px 7px;font-size:10px;display:inline-block}.ago167 .ag-urgent{background:#fff0f0;color:#a92436}.ago167 .ag-item-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:9px}.ago167 .ag-item-actions button{font-size:12px}.ago167 .ag-date{font-weight:750;color:var(--ag-text)}.ago167 .ag-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--ag-line);border-left:1px solid var(--ag-line);overflow:hidden;border-radius:12px}.ago167 .ag-dayname,.ago167 .ag-day{border-right:1px solid var(--ag-line);border-bottom:1px solid var(--ag-line);padding:8px;min-width:0}.ago167 .ag-dayname{text-align:center;font-size:10px;color:var(--ag-muted);font-weight:750;background:var(--ag-bg)}.ago167 .ag-day{min-height:130px}.ago167 .ag-day>strong{font-size:11px;color:var(--ag-muted);display:block;margin-bottom:8px}.ago167 .ag-day.ag-today{background:#f8f5ff}.ago167 .ag-othermonth{opacity:.5}.ago167 .ag-mini{width:100%;text-align:left;border:0;border-left:3px solid #b29bdf;border-radius:5px;background:#f1edf9;color:#4c3c69;padding:5px;margin:0 0 5px;font-size:11px;line-height:1.35;overflow-wrap:anywhere}.ago167 .ag-mini.ag-overdue{background:#fff5e5;border-color:#d97706}.ago167 .ag-mini small{display:block;opacity:.8}.ago167 .ag-week{display:grid;grid-template-columns:repeat(7,minmax(130px,1fr));gap:8px;overflow-x:auto}.ago167 .ag-weekcol{border:1px solid var(--ag-line);border-radius:12px;padding:9px;min-height:200px}.ago167 .ag-weekcol>strong{display:block;font-size:12px;margin-bottom:10px}.ago167 .ag-weekcol .ag-item{padding:9px;margin-bottom:9px}.ago167 .ag-weekcol .ag-item h4{font-size:12px}.ago167 .ag-weekcol .ag-item-actions{gap:7px}.ago167 .ag-model-row{display:grid;grid-template-columns:minmax(120px,2fr) minmax(105px,1fr) 65px 70px 95px 35px;gap:7px;align-items:end;margin:10px 0}.ago167 .ag-model-row input,.ago167 .ag-model-row select{padding:8px}.ago167 .ag-preview{margin:18px 0}.ago167 .ag-preview .ag-item{margin-top:8px}.ago167 .ag-compact{padding:16px 0}.ago167 .ag-compact .ag-head{margin-bottom:12px}.ago167 .ag-compact h2{font-size:21px}.ago167 .ag-compact .ag-list{grid-template-columns:repeat(2,minmax(0,1fr))}.ago167 .ag-compact .ag-item{padding:12px}.ago167 .ag-compact .ag-stat{padding:10px 14px}.ago167 .ag-compact .ag-stat strong{font-size:21px}
@media(max-width:1050px){.ago167 .ag-layout.ag-editing{grid-template-columns:1fr}.ago167 .ag-editor{position:static;grid-row:1}.ago167 .ag-model-row{grid-template-columns:2fr 1fr 65px}.ago167 .ag-model-row>label{min-width:0}}@media(max-width:650px){.ago167{padding:12px}.ago167 .ag-filters{grid-template-columns:1fr 1fr}.ago167 .ag-stats{gap:7px}.ago167 .ag-stat{padding:10px}.ago167 .ag-stat strong{font-size:22px}.ago167 .ag-calendar{overflow-x:auto;grid-template-columns:repeat(7,minmax(83px,1fr))}.ago167 .ag-day{min-height:110px;padding:5px}.ago167 .ag-grid{gap:10px}.ago167 .ag-compact .ag-list{grid-template-columns:1fr}.ago167 .ag-btn{padding:8px 10px}.ago167 .ag-head{gap:15px}.ago167 .ag-panel{padding:13px}}
`;

/** Synchronous mounting; `pronto` resolves after the first server read. No global listener survives cleanup. */
export function montarAgenda(root, { repo, contexto, abrirDemanda, carteira = [], pessoas = [], compacto = false, abrirCompleto, mesInicial, funcoesFixas = null } = {}) {
  if (!root?.ownerDocument || !repo || typeof contexto !== 'function') throw new Error('A agenda precisa de área, repositório e contexto válidos.');
  const doc = root.ownerDocument, win = doc.defaultView;
  const ctxInicial = JSON.stringify(contexto()), ctx = () => contexto();
  const valido = () => !destruido && JSON.stringify(ctx()) === ctxInicial;
  let destruido = false, geracao = 0, carregando = false, conferido = false, ocupado = false;
  let itens = [], erro = '', sucesso = '', pendente = null, editor = null, editorBase = '', preview = [], lote = null, loteExecutando = false;
  let config = null, modeloEdit = null, modeloBase = '', configErro = '', configurando = false;
  const estado = { mes: /^20\d{2}-(0[1-9]|1[0-2])$/.test(mesInicial || '') ? mesInicial : mesSeguinte(), data: hoje(), modo: compacto ? 'lista' : 'mes', cliente: '', empresaId: '', pessoa: consultaEquipe(ctx()) ? '' : String(ctx().pessoa || ctx().nome || ''), etapa: '', arquivo: 'ativos', foco: '', bloco: '' };
  const identidadeStorage = { uid: String(ctx().uid || ''), nome: String(ctx().pessoa || ctx().nome || ''), atorReal: String(ctx().atorReal || '') };
  const storageKey = `get_agenda_i167_v1_${encodeURIComponent(identidadeStorage.uid)}_${encodeURIComponent(identidadeStorage.nome)}_${encodeURIComponent(identidadeStorage.atorReal)}`;
  let storageBloqueado = false, storageMensagem = '';
  function limparArmazenamento() { try { win.sessionStorage.removeItem(storageKey); } catch { throw new Error('Não foi possível guardar a confirmação nesta aba. Preserve esta tela e confira a tentativa antes de continuar.'); } }
  function persistir() {
    if (storageBloqueado) throw new Error(storageMensagem);
    try {
      if (!pendente && (!lote || lote.entradas.every(p => p.confirmadaId))) { win.sessionStorage.removeItem(storageKey); return; }
      win.sessionStorage.setItem(storageKey, JSON.stringify({ schema: 1, ...identidadeStorage, pendente, preview, lote, editor, editorBase, estado, config, modeloEdit, modeloBase, configurando }));
    } catch { throw new Error('Não foi possível guardar esta tentativa nesta aba. Nenhuma nova etapa será enviada. Libere espaço ou mantenha este rascunho aberto antes de tentar novamente.'); }
  }
  try {
    const bruto = win.sessionStorage.getItem(storageKey);
    if (bruto) {
      const salvo = JSON.parse(bruto), opValida = p => !!p && /^[A-Za-z0-9_-]{12,100}$/.test(p.opcoes?.operacaoId || '') && ['salvar', 'cancelar', 'restaurar', 'config'].includes(p.tipo);
      if (salvo.schema !== 1 || Object.keys(identidadeStorage).some(k => salvo[k] !== identidadeStorage[k]) || !salvo.estado || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(salvo.estado.mes || '') || !date(salvo.estado.data) || !['mes', 'semana', 'lista'].includes(salvo.estado.modo) || !Array.isArray(salvo.preview) || (salvo.pendente && !opValida(salvo.pendente)) || (salvo.lote && (!Array.isArray(salvo.lote.entradas) || salvo.lote.entradas.some(p => !opValida(p)) || salvo.lote.entradas.length !== salvo.preview.length))) throw new Error('Tentativa guardada incompatível. Preserve esta aba para conferência; nenhuma nova escrita foi iniciada.');
      Object.assign(estado, salvo.estado); pendente = salvo.pendente; preview = salvo.preview; lote = salvo.lote; editor = salvo.editor; editorBase = salvo.editorBase || ''; config = salvo.config; modeloEdit = salvo.modeloEdit; modeloBase = salvo.modeloBase || ''; configurando = salvo.configurando === true;
      if (!pendente && lote) pendente = lote.entradas.find(p => !p.confirmadaId) || null;
      if (pendente) { pendente.ausente = false; sucesso = 'A tentativa desta aba foi recuperada. Confira o resultado antes de repetir qualquer envio.'; }
      else if (editavel(ctx()) && lote?.entradas.every(p => p.confirmadaId)) limparArmazenamento();
    }
  } catch (e) { storageBloqueado = true; storageMensagem = String(e?.message || 'O armazenamento desta aba está indisponível. Nenhuma escrita será enviada.'); erro = storageMensagem; }
  const shell = doc.createElement('section'); shell.className = `ago167${compacto ? ' ag-compact' : ''}`;
  const style = doc.createElement('style'); style.textContent = CSS; shell.append(style);
  const conteudo = doc.createElement('div'); shell.append(conteudo); root.replaceChildren(shell);
  const clientes = () => array(fonte(carteira)).filter(c => c && c.ativo !== false && c.excluido !== true).map(c => typeof c === 'string' ? { id: c, nome: c, empresas: [] } : { id: String(c.id || c.slug || c.chave || c.cliente || ''), nome: String(c.nome || c.clienteNome || c.id || c.slug || ''), empresas: array(c.empresas).map(e => ({ id: String(e.id || ''), nome: String(e.nome || e.id || '') })) }).filter(c => c.id);
  const equipe = () => array(fonte(pessoas)).map(p => typeof p === 'string' ? { id: p, nome: labelPessoa(p) } : { id: String(p.id || p.chave || p.pessoa || p.nome || ''), nome: labelPessoa(p.label || p.nome || p.id) }).filter(p => p.id);
  const podeEditar = () => valido() && editavel(ctx());
  const sujo = () => !!(editor && JSON.stringify(editor) !== editorBase) || !!(modeloEdit && JSON.stringify(modeloEdit) !== modeloBase) || preview.length > 0;
  const message = e => String(e?.message || e || 'Não foi possível concluir. Tente novamente.');
  const option = (v, label, atual) => `<option value="${h(v)}"${String(atual) === String(v) ? ' selected' : ''}>${h(label)}</option>`;
  const optsPessoas = atual => option('', 'Escolha uma pessoa', atual) + equipe().map(p => option(p.id, p.nome, atual)).join('') + (atual && !equipe().some(p => p.id === atual) ? option(atual, labelPessoa(atual), atual) : '');
  const optsClientes = atual => option('', 'Escolha um cliente', atual) + clientes().map(c => option(c.id, c.nome, atual)).join('') + (atual && !clientes().some(c => c.id === atual) ? option(atual, `${editor?.clienteNome || atual} · conferir cadastro`, atual) : '');
  const optsEmpresas = (cliente, atual) => option('', 'Geral', atual) + (clientes().find(c => c.id === cliente)?.empresas || []).map(e => option(e.id, e.nome, atual)).join('');
  const nomeEmpresa = (cliente, id) => id ? clientes().find(c => c.id === cliente)?.empresas.find(e => e.id === id)?.nome || id : 'Geral';
  function podeSair() {
    if (!editavel(ctx())) return true; // Tentativas antigas continuam guardadas nesta aba; consulta não as descarta.
    if (pendente || ocupado || loteExecutando) { erro = 'Há uma tentativa em conferência. Confira o resultado antes de sair.'; render(); return false; }
    if (!sujo()) return true;
    return !!win?.confirm(lote ? 'Fechar a prévia? As etapas já confirmadas permanecem na agenda; as restantes não serão criadas.' : 'Há alterações ainda não salvas. Sair e descartar este rascunho?');
  }
  function liberarRascunho() { if (!editavel(ctx())) return true; if (!podeSair()) return false; if (lote) limparArmazenamento(); editor = null; modeloEdit = null; configurando = false; preview = []; lote = null; return true; }
  function alerta() {
    const a = erro ? `<div class="ag-alert ag-error" role="alert"><strong>Precisamos conferir</strong><p>${h(erro)}</p>${!pendente ? '<button class="ag-textbtn" data-ag="reload">Recarregar do servidor</button>' : ''}</div>` : '';
    return a + (pendente ? `<div class="ag-alert" role="status"><strong>${pendente.ausente ? 'Tentativa não encontrada no servidor' : 'O resultado ainda precisa ser conferido'}</strong><p>Seu rascunho está guardado nesta tela. A mesma tentativa será mantida para evitar duplicação.</p><div class="ag-actions"><button class="ag-btn" data-ag="recover"${ocupado ? ' disabled' : ''}>Conferir tentativa</button>${pendente.ausente && podeEditar() ? `<button class="ag-btn ag-primary" data-ag="retry"${ocupado ? ' disabled' : ''}>Repetir a mesma tentativa</button>${pendente.rejeitada ? '<button class="ag-textbtn" data-ag="abandon">Voltar ao rascunho</button>' : ''}` : ''}</div></div>` : '') + (sucesso ? `<div class="ag-alert ag-ok" role="status">${h(sucesso)}</div>` : '');
  }
  function visiveis() {
    return itens.filter(i => (!estado.bloco || (estado.bloco === 'rotinas' ? i._fonteAgenda === 'funcao_fixa' : i._fonteAgenda !== 'funcao_fixa')) && (estado.arquivo === 'todos' || (estado.arquivo === 'arquivados' ? arquivada(i) : !arquivada(i))) && (!estado.cliente || i.cliente === estado.cliente) && (!estado.cliente || i.cliente !== 'zeiss' || i.empresaId === estado.empresaId) && (!estado.pessoa || i.destinatario === estado.pessoa) && (!estado.etapa || i.etapa === estado.etapa)).sort(ordemItens);
  }
  function status(i) { return arquivada(i) ? 'Arquivada' : ({ pendente: 'A fazer', concluida_aguardando_aprovacao: 'Entregue · aguardando aprovação', aprovada: 'Concluída', cancelada: 'Cancelada' }[i.status || 'pendente'] || String(i.status).replaceAll('_', ' ')); }
  function atrasada(i) { return !fechada(i) && !arquivada(i) && i.prazoData && i.prazoData < hoje(); }
  function card(i, mini = false) {
    if (i._fonteAgenda === 'funcao_fixa') return htmlFuncaoFixaAgendaI167(i, { mini, gestao: role(ctx()) === 'amanda' });
    if (mini) return `<button class="ag-mini${atrasada(i) ? ' ag-overdue' : ''}" data-ag="${podeEditar() ? 'edit' : 'open'}" data-id="${h(i.id)}"><b>${h(i.clienteNome || i.cliente)}</b>${i.cliente === 'zeiss' ? `<small>${h(nomeEmpresa(i.cliente, i.empresaId))}</small>` : ''}<br>${h(i.titulo)}<small>${h(i.prazoHora || '')} · ${h(labelPessoa(i.destinatario))} · #${h(i.ordem)}</small></button>`;
    return `<article class="ag-item${atrasada(i) ? ' ag-overdue' : ''}${arquivada(i) ? ' ag-archived' : ''}"><div class="ag-topline"><span>${h(i.clienteNome || i.cliente)} · #${h(i.ordem)}</span><span class="ag-pill">${h(status(i))}</span></div><h4>${h(i.titulo)}</h4><div class="ag-meta"><span class="ag-date">${h(fmtDia(i.prazoData))}${i.prazoHora ? ` · ${h(i.prazoHora)}` : ''}</span><span>${h(labelPessoa(i.destinatario))}</span><span>${h(i.quantidade)} ${h(i.unidade)}</span>${i.cliente === 'zeiss' ? `<span>${h(nomeEmpresa(i.cliente, i.empresaId))}</span>` : ''}${i.inicio ? `<span>Começa ${h(fmtDia(i.inicio))}</span>` : ''}${i.fixo ? '<span>Data fixa</span>' : ''}${i.prioridade !== 'normal' ? `<span class="ag-pill ag-urgent">${h(i.prioridade)}</span>` : ''}${atrasada(i) ? '<span class="ag-pill ag-urgent">Prazo passou</span>' : ''}</div><div class="ag-item-actions"><button class="ag-textbtn" data-ag="open" data-id="${h(i.id)}">Abrir demanda</button>${podeEditar() && !compacto ? `${!arquivada(i) ? `<button class="ag-textbtn" data-ag="edit" data-id="${h(i.id)}">Editar datas e etapa</button>` : ''}<button class="ag-textbtn${arquivada(i) ? '' : ' ag-danger'}" data-ag="${arquivada(i) ? 'restore' : 'archive'}" data-id="${h(i.id)}">${arquivada(i) ? 'Restaurar' : 'Arquivar'}</button>` : ''}</div></article>`;
  }
  function calendario(lista) {
    const primeiro = `${estado.data.slice(0, 7)}-01`, d = date(primeiro), fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const inicio = add(primeiro, -((d.getDay() + 6) % 7)), qtd = Math.ceil((fim + ((d.getDay() + 6) % 7)) / 7) * 7;
    return `<div class="ag-calendar">${['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(x => `<div class="ag-dayname">${x}</div>`).join('')}${Array.from({ length: qtd }, (_, n) => { const dia = add(inicio, n); return `<div class="ag-day${dia === hoje() ? ' ag-today' : ''}${dia.slice(0, 7) !== primeiro.slice(0, 7) ? ' ag-othermonth' : ''}"><strong>${Number(dia.slice(8))}</strong>${lista.filter(i => i.prazoData === dia).map(i => card(i, true)).join('')}</div>`; }).join('')}</div>`;
  }
  function semana(lista) {
    const inicio = add(estado.data, -((date(estado.data).getDay() + 6) % 7));
    return `<div class="ag-week">${Array.from({ length: 7 }, (_, n) => { const dia = add(inicio, n); return `<div class="ag-weekcol"><strong>${h(date(dia).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }))}</strong>${lista.filter(i => i.prazoData === dia).map(i => card(i)).join('') || '<span class="ag-muted">Dia livre</span>'}</div>`; }).join('')}</div>`;
  }
  function renderEditor() {
    if (!editor || !podeEditar()) return '';
    const lock = ocupado || !!pendente;
    return `<aside class="ag-panel ag-editor"><div class="ag-topline"><h3>${editor.id ? 'Ajustar organização' : 'Nova etapa'}</h3><button class="ag-textbtn" data-ag="close-editor"${lock ? ' disabled' : ''}>Fechar</button></div><p class="ag-muted">Planeje a tarefa. A entrega continua na mesma demanda.</p><form data-form="etapa"><fieldset${lock ? ' disabled' : ''} style="border:0;padding:0;margin:0"><div class="ag-grid"><label>Cliente<select name="cliente" required>${optsClientes(editor.cliente)}</select></label><label>Competência<input type="month" name="mes" value="${h(editor.mes)}" required></label>${editor.cliente === 'zeiss' ? `<label class="ag-span">Empresa<select name="empresaId">${optsEmpresas(editor.cliente, editor.empresaId)}</select></label>` : ''}<label class="ag-span">Etapa<input name="titulo" maxlength="180" value="${h(editor.titulo)}" required placeholder="Ex.: organizar referências"></label><label>Responsável<select name="destinatario" required>${optsPessoas(editor.destinatario)}</select></label><label>Começa em<input type="date" name="inicio" value="${h(editor.inicio)}"></label><label>Prazo<input type="date" name="prazoData" value="${h(editor.prazoData)}" required></label><label>Horário<input type="time" name="prazoHora" value="${h(editor.prazoHora)}" required></label></div><details${editor.id ? ' open' : ''}><summary>Quantidade, ordem e detalhes</summary><div class="ag-grid"><label>Quantidade<input type="number" min="1" max="1000" step="1" name="quantidade" value="${h(editor.quantidade)}" required></label><label>Unidade<input name="unidade" maxlength="60" value="${h(editor.unidade)}" required></label><label>Ordem<input type="number" min="0" max="99999" step="1" name="ordem" value="${h(editor.ordem)}" required></label><label>Prioridade<select name="prioridade">${['normal', 'alta', 'urgente'].map(x => option(x, x[0].toUpperCase() + x.slice(1), editor.prioridade)).join('')}</select></label><label class="ag-check ag-span"><input type="checkbox" name="fixo"${editor.fixo ? ' checked' : ''}>Data fixa para esta etapa</label><label class="ag-span">Notas para quem vai fazer<textarea name="descricao" maxlength="12000">${h(editor.descricao)}</textarea></label><label class="ag-span">Link de apoio<input type="url" name="linkAnexo" value="${h(editor.linkAnexo)}" placeholder="https://"></label></div></details><div class="ag-actions"><button class="ag-btn ag-primary" type="submit">${ocupado ? 'Conferindo…' : 'Salvar etapa'}</button><button class="ag-btn" type="button" data-ag="close-editor">Cancelar rascunho</button></div></fieldset></form></aside>`;
  }
  function renderModelos() {
    if (!configurando || !podeEditar()) return '';
    const modelos = config?.modelos?.length ? config.modelos : [{ id: 'inicial_sete', nome: 'Começo com sete etapas', etapas: clone(ETAPAS_INICIAIS_I167) }];
    const m = modeloEdit || modelos[0];
    return `<section class="ag-panel" style="margin-bottom:18px"><div class="ag-topline"><h3>Modelos de organização</h3><button class="ag-textbtn" data-ag="close-models">Fechar</button></div><p class="ag-muted">Modelos são pontos de partida. Escolher ou ajustar um modelo não cria tarefas.</p>${configErro ? `<div class="ag-alert ag-error" role="alert">${h(configErro)}</div>` : ''}<div class="ag-grid"><label>Modelo<select data-filter="modelo">${modelos.map(x => option(x.id, x.nome, m.id)).join('')}</select></label><label>Nome do modelo<input data-model="nome" value="${h(m.nome)}" maxlength="100"></label><label>Primeiro dia da prévia<input type="date" data-model-base value="${h(estado.data)}"></label><label>Dias considerados na prévia<span class="ag-actions">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x, n) => `<label class="ag-check"><input type="checkbox" data-workday="${n}"${(config?.diasTrabalho || [1, 2, 3, 4, 5]).includes(n) ? ' checked' : ''}>${x}</label>`).join('')}</span></label></div><div style="overflow:auto">${m.etapas.map((e, n) => `<div class="ag-model-row"><label>Etapa<input data-stage="${n}" data-key="titulo" value="${h(e.titulo)}" maxlength="180"></label><label>Responsável<select data-stage="${n}" data-key="destinatario">${optsPessoas(e.destinatario)}</select></label><label>+ dias<input data-stage="${n}" data-key="offsetDias" type="number" min="-365" max="365" value="${h(e.offsetDias)}"></label><label>Qtd.<input data-stage="${n}" data-key="quantidade" type="number" min="1" max="1000" value="${h(e.quantidade)}"></label><label>Unidade<input data-stage="${n}" data-key="unidade" value="${h(e.unidade)}" maxlength="60"></label><button class="ag-btn ag-danger" data-ag="remove-stage" data-index="${n}" aria-label="Remover etapa ${n + 1}">×</button></div>`).join('')}</div><div class="ag-actions"><button class="ag-btn" data-ag="add-stage">+ Etapa</button><button class="ag-btn" data-ag="new-model">+ Modelo</button><button class="ag-btn ag-danger" data-ag="remove-model">Remover modelo</button><button class="ag-btn" data-ag="save-model"${ocupado || pendente ? ' disabled' : ''}>Salvar modelo</button><button class="ag-btn ag-primary" data-ag="preview"${ocupado || pendente ? ' disabled' : ''}>Ver prévia para o cliente</button></div><p class="ag-muted">A prévia usa o filtro de cliente escolhido acima. As datas continuam ajustáveis antes de salvar cada etapa.</p></section>`;
  }
  function renderPreview() {
    if (!preview.length || !podeEditar()) return '';
    const feitas = preview.filter(x => x._salvoId).length;
    return `<section class="ag-panel ag-preview"><div class="ag-topline"><h3>${lote ? `Confirmação · ${feitas} de ${preview.length} etapas` : 'Prévia · nada criado ainda'}</h3><button class="ag-textbtn" data-ag="close-preview"${pendente || ocupado || loteExecutando ? ' disabled' : ''}>${feitas ? 'Fechar prévia' : 'Descartar prévia'}</button></div><p class="ag-muted">${lote ? 'As etapas confirmadas mantêm seus IDs. Uma pausa preserva o progresso para continuar.' : 'Confira cada etapa. Você pode revisar individualmente ou confirmar todas nesta ordem.'}</p>${preview.map((x, n) => `<article class="ag-item"><div class="ag-topline"><span>#${h(x.ordem)} · ${h(x.clienteNome)}${x.cliente === 'zeiss' ? ` / ${h(nomeEmpresa(x.cliente, x.empresaId))}` : ''} · ${h(fmtMes(x.mes))}</span><span>${h(fmtDia(x.prazoData))} · ${h(x.prazoHora)}</span></div><h4>${h(x.titulo)}</h4><div class="ag-meta"><span>${h(labelPessoa(x.destinatario))}</span><span>${h(x.quantidade)} ${h(x.unidade)}</span>${x._salvoId ? `<span class="ag-pill">Salva · ${h(x._salvoId)}</span>` : ''}</div>${!lote ? `<button class="ag-textbtn" data-ag="review-preview" data-index="${n}">Revisar e salvar esta etapa</button>` : ''}</article>`).join('')}<div class="ag-actions" style="margin-top:14px">${feitas < preview.length ? `<button class="ag-btn ag-primary" data-ag="confirm-batch"${pendente || ocupado || loteExecutando ? ' disabled' : ''}>${loteExecutando ? 'Confirmando etapas…' : lote ? 'Continuar etapas restantes' : 'Confirmar estas etapas'}</button>` : '<span class="ag-pill">Todas as etapas confirmadas</span>'}</div></section>`;
  }
  function render() {
    if (destruido) return;
    if (!valido()) { conteudo.innerHTML = '<div class="ag-alert" role="status">O perfil mudou. Reabra a agenda para continuar; nenhuma resposta antiga foi aplicada.</div>'; return; }
    if (!legivel(ctx())) { conteudo.innerHTML = ''; return; }
    const lista = visiveis(), ativos = itens.filter(i => !i._previsaoFixa && !arquivada(i) && !fechada(i) && (!compacto || consultaEquipe(ctx()) || norm(i.destinatario) === (role(ctx()) === 'julia' ? 'fernanda' : role(ctx())))), proximos = ativos.filter(i => i.prazoData >= hoje() && i.prazoData <= add(hoje(), 6)), atrasados = ativos.filter(atrasada);
    if (compacto) {
      const curta = [...atrasados, ...proximos].sort(ordemItens).slice(0, 7);
      conteudo.innerHTML = `<div class="ag-head"><div><div class="ag-kicker">Datas e responsáveis</div><h2>${role(ctx()) === 'amanda' ? 'Organização das datas' : role(ctx()) === 'gabrielle' ? 'Minhas datas' : 'Agenda da equipe'}</h2><p class="ag-muted">Planejamento de ${h(fmtMes(estado.mes))} · próximos sete dias</p><label style="margin-top:8px">Competência<input data-filter="mes" type="month" value="${h(estado.mes)}"></label></div><button class="ag-btn ag-primary" data-ag="full">${!consultaEquipe(ctx()) ? 'Ver minhas datas' : !editavel(ctx()) ? 'Ver agenda da equipe' : itens.length ? 'Ver calendário completo' : 'Organizar datas'}</button></div>${alerta()}<div class="ag-stats"><div class="ag-stat"><strong>${conferido ? proximos.length : '—'}</strong><small>próximos sete dias</small></div><div class="ag-stat ag-late"><strong>${conferido ? atrasados.length : '—'}</strong><small>com prazo passado</small></div><div class="ag-stat"><strong>${conferido ? ativos.length : '—'}</strong><small>compromissos em andamento</small></div></div>${carregando ? '<p class="ag-muted" role="status">Conferindo organização no servidor…</p>' : ''}<div class="ag-list">${curta.map(i => card(i)).join('')}</div>${!curta.length && conferido ? '<p class="ag-muted">Nenhuma etapa para estes dias nesta competência. Abra a agenda para conferir outros períodos.</p>' : ''}`;
      return;
    }
    const empty = !conferido ? '<div class="ag-empty" role="status"><strong>Conferindo a agenda</strong>Aguardando a leitura completa do servidor.</div>' : !lista.length ? '<div class="ag-empty"><strong>Nenhuma etapa neste filtro</strong>Escolha outro período ou filtro para conferir os compromissos.</div>' : estado.modo === 'mes' ? calendario(lista) : estado.modo === 'semana' ? semana(lista) : `<div class="ag-list">${lista.map(i => card(i)).join('')}</div>`;
    conteudo.innerHTML = `<div class="ag-head"><div><div class="ag-kicker">Planejamento do trabalho</div><h2>${role(ctx()) === 'amanda' ? 'Organização das datas' : role(ctx()) === 'gabrielle' ? 'Minhas datas' : 'Agenda da equipe'}</h2><p class="ag-muted">${role(ctx()) === 'amanda' ? 'Organize as datas dos clientes e as funções fixas aqui. Cada entrega continua na sua demanda.' : role(ctx()) === 'gabrielle' ? 'Confira suas datas e abra a demanda de cada entrega.' : 'Confira as datas combinadas pela Amanda. Etapas e funções fixas continuam nas mesmas demandas.'}</p></div>${podeEditar() ? '<div class="ag-actions">'+(role(ctx()) === 'amanda' && funcoesFixas ? '<button class="ag-btn" data-ag="fixed-settings">Editar rotinas</button>' : '')+'<button class="ag-btn" data-ag="models">Modelos de etapas</button><button class="ag-btn ag-primary" data-ag="new">+ Nova etapa</button></div>' : '<span class="ag-pill">Consulta · entregas pela demanda</span>'}</div>${alerta()}<div class="ag-stats"><div class="ag-stat"><strong>${conferido ? proximos.length : '—'}</strong><small>nos próximos sete dias</small></div><div class="ag-stat ag-late"><strong>${conferido ? atrasados.length : '—'}</strong><small>com prazo passado</small></div><div class="ag-stat"><strong>${conferido ? ativos.length : '—'}</strong><small>compromissos em andamento</small></div></div><section class="ag-tools"><div class="ag-toolbar"><label>Planejamento de<input data-filter="mes" type="month" value="${h(estado.mes)}"></label><div class="ag-actions">${['mes', 'semana', 'lista'].map(x => `<button class="ag-btn ag-tab" data-ag="mode" data-mode="${x}" aria-pressed="${estado.modo === x}">${({ mes: 'Mês', semana: 'Semana', lista: 'Lista' })[x]}</button>`).join('')}<button class="ag-btn" data-ag="reload"${carregando ? ' disabled' : ''}>${carregando ? 'Conferindo…' : 'Atualizar'}</button></div></div><div class="ag-filters">${funcoesFixas ? `<label>Compromissos<select data-filter="bloco">${option('', 'Etapas e rotinas', estado.bloco)}${option('etapas', 'Etapas dos clientes', estado.bloco)}${option('rotinas', 'Funções fixas', estado.bloco)}</select></label>` : ''}<label>Cliente<select data-filter="cliente">${option('', 'Todos os clientes', estado.cliente)}${clientes().map(c => option(c.id, c.nome, estado.cliente)).join('')}</select></label>${estado.cliente === 'zeiss' ? `<label>Empresa<select data-filter="empresaId">${optsEmpresas(estado.cliente, estado.empresaId)}</select></label>` : ''}<label>Pessoa<select data-filter="pessoa">${option('', 'Toda a equipe', estado.pessoa)}${equipe().map(p => option(p.id, p.nome, estado.pessoa)).join('')}</select></label><label>Etapa<select data-filter="etapa">${option('', 'Todas as etapas', estado.etapa)}${[...new Set(itens.map(i => i.etapa).filter(Boolean))].sort().map(e => option(e, e === 'funcao_fixa' ? 'Funções fixas' : itens.find(i => i.etapa === e)?.titulo || e, estado.etapa)).join('')}</select></label><label>Mostrar<select data-filter="arquivo">${option('ativos', 'Em uso', estado.arquivo)}${option('arquivados', 'Arquivadas', estado.arquivo)}${option('todos', 'Todas', estado.arquivo)}</select></label></div></section>${renderModelos()}${renderPreview()}<div class="ag-layout${editor && podeEditar() ? ' ag-editing' : ''}"><section class="ag-panel"><div class="ag-toolbar" style="margin-bottom:16px"><div><h3>${estado.modo === 'lista' ? 'Etapas em ordem' : h(fmtMes(estado.data.slice(0, 7)))}</h3><p class="ag-muted">Etapas: competência ${h(fmtMes(estado.mes))} · Rotinas: período visível · ${lista.length} compromisso${lista.length === 1 ? '' : 's'}</p></div><div class="ag-actions"><button class="ag-btn" data-ag="prev" aria-label="Período anterior">←</button><button class="ag-btn" data-ag="today">Hoje</button><button class="ag-btn" data-ag="next" aria-label="Próximo período">→</button></div></div>${empty}${lista.some(i => !i.prazoData) ? '<p class="ag-muted">Há etapas sem data; use a lista para conferir.</p>' : ''}</section>${renderEditor()}</div>`;
  }
  async function recarregar({ preservar = true } = {}) {
    if (!valido() || !legivel(ctx())) return;
    const seq = ++geracao, mes = estado.mes, periodoChave = estado.data + '|' + estado.modo; carregando = true; erro = storageBloqueado ? storageMensagem : ''; render();
    try {
      const [r, fixas] = await Promise.all([repo.listar({ mes, incluirArquivados: true }), funcoesFixas ? funcoesFixas.listar({ periodo: periodoFuncoesFixasI167({ data: estado.data, modo: estado.modo, compacto, hoje: hoje() }), competencia: mes }) : Promise.resolve({ origem: 'servidor', completo: true, itens: [] })]);
      if (!valido() || seq !== geracao || mes !== estado.mes || periodoChave !== estado.data + '|' + estado.modo) return;
      if (r?.origem !== 'servidor' || r.completo !== true || !Array.isArray(r.itens)) throw new Error('A leitura completa da agenda não foi confirmada. Os dados anteriores foram preservados.');
      if (fixas?.origem !== 'servidor' || fixas.completo !== true || !Array.isArray(fixas.itens)) throw new Error('As funções fixas não foram conferidas. O retrato anterior foi preservado.');
      itens = [...r.itens.map(i => ({ ...itemPlano(i), _fonteAgenda: 'organizacao' })), ...fixas.itens.map(itemPlano)]; conferido = true;
    } catch (e) { if (valido() && seq === geracao) erro = message(e); }
    finally { if (valido() && seq === geracao) { carregando = false; if (!preservar) editor = null; render(); } }
  }
  function novo(entrada = {}, previewIndex = null) {
    const c = clientes().find(x => x.id === estado.cliente);
    editor = { cliente: c?.id || '', clienteNome: c?.nome || '', empresaId: c?.id === 'zeiss' ? estado.empresaId : '', titulo: '', descricao: '', destinatario: '', prazoData: estado.data, prazoHora: '19:00', linkAnexo: '', mes: estado.mes, etapa: '', ordem: itens.length + 1, quantidade: 1, unidade: 'etapa', inicio: '', fixo: false, prioridade: 'normal', ...entrada };
    if (previewIndex !== null) editor._preview = previewIndex;
    editorBase = JSON.stringify(editor); sucesso = ''; render(); conteudo.querySelector('[name="titulo"]')?.focus();
  }
  async function abrirEditor(id) {
    if (!podeEditar() || !liberarRascunho()) return;
    ocupado = true; erro = ''; render();
    try { const i = itemPlano(await repo.ler(id)); if (!valido()) return; if (!i.id || !i.assinatura) throw new Error('Esta etapa não teve sua versão confirmada pelo servidor.'); novo(i); }
    catch (e) { if (valido()) erro = message(e); }
    finally { ocupado = false; if (valido()) render(); }
  }
  function entradaEditor(rascunho = editor) {
    const e = clone(rascunho); delete e._preview; delete e.id;
    const campos = ['cliente', 'clienteNome', 'empresaId', 'titulo', 'descricao', 'destinatario', 'prazoData', 'prazoHora', 'linkAnexo', 'mes', 'etapa', 'ordem', 'quantidade', 'unidade', 'inicio', 'fixo', 'prioridade'];
    const out = Object.fromEntries(campos.map(k => [k, e[k]])); if (rascunho.id) out.id = rascunho.id;
    out.etapa = out.etapa || chaveEtapa(out.titulo); out.titulo = out.titulo.trim();
    if (!out.cliente || !out.destinatario || !out.titulo || !out.prazoData || !out.prazoHora || !out.mes) throw new Error('Escolha cliente, competência, etapa, responsável e prazo com horário.');
    if (out.inicio && out.inicio > out.prazoData) throw new Error('O começo precisa ser no prazo ou antes dele.');
    if (out.linkAnexo && !urlSegura(out.linkAnexo)) throw new Error('O link de apoio precisa começar com https:// ou http://.');
    if (!Number.isInteger(out.quantidade) || out.quantidade < 1 || out.quantidade > 1000 || !Number.isInteger(out.ordem) || out.ordem < 0 || out.ordem > 1000000) throw new Error('Quantidade e ordem precisam ser números inteiros válidos.');
    return out;
  }
  async function executar(p) {
    if (!podeEditar() || ocupado) return;
    ocupado = true; erro = ''; render();
    try {
      persistir(); // Síncrono e obrigatório antes de qualquer escrita, inclusive a primeira do lote.
      let r;
      if (p.tipo === 'salvar') r = await repo.salvar(clone(p.entrada), p.opcoes);
      else if (p.tipo === 'config') r = await repo.salvarConfig(clone(p.entrada), p.opcoes);
      else r = await repo[p.tipo](p.id, p.opcoes);
      if (!valido()) return;
      await confirmar(p, r);
      return true;
    } catch (e) { if (valido()) { erro = message(e); p.rejeitada = ['ENTRADA_INVALIDA', 'VERSAO_MUDOU', 'CLIENTE_NAO_CONFERIDO', 'REGISTRO_ARQUIVADO', 'RESTAURO_INCOMPATIVEL', 'NAO_ENCONTRADO', 'CONFIG_INCOMPATIVEL', 'REGISTRO_INCOMPATIVEL', 'VERSAO_INVALIDA', 'OPERACAO_INVALIDA'].includes(e?.codigo); pendente = p; } return false; }
    finally { ocupado = false; if (valido()) render(); }
  }
  async function confirmar(p, r) {
    if (!r || (p.tipo !== 'config' && !r.id)) throw new Error('O servidor não confirmou o alvo desta tentativa.');
    pendente = null;
    if (p.loteIndex !== undefined) { lote.entradas[p.loteIndex].confirmadaId = r.id; preview[p.loteIndex]._salvoId = r.id; persistir(); sucesso = `Etapa ${p.loteIndex + 1} confirmada. As etapas já salvas não serão recriadas.`; return; }
    if (p.tipo === 'config') { config = r; modeloEdit = clone(r.modelos.find(m => m.id === modeloEdit?.id) || r.modelos[0] || { id: 'inicial_sete', nome: 'Começo com sete etapas', etapas: clone(ETAPAS_INICIAIS_I167) }); modeloBase = JSON.stringify(modeloEdit); persistir(); sucesso = 'Modelo salvo. Nenhuma etapa foi criada.'; }
    else {
      if (p.tipo === 'salvar') { if (p.previewIndex !== undefined) preview.splice(p.previewIndex, 1); editor = null; editorBase = ''; }
      persistir();
      sucesso = p.tipo === 'cancelar' ? 'Etapa arquivada. O histórico foi preservado.' : p.tipo === 'restaurar' ? 'Etapa restaurada. Confira o estado atual na demanda.' : 'Etapa salva na mesma agenda e na demanda da pessoa.';
      await recarregar();
    }
  }
  async function recuperar() {
    if (!pendente || ocupado || !(podeEditar() || ['chris', 'christopher'].includes(role(ctx())))) return;
    const p = pendente; ocupado = true; erro = ''; render();
    try { const r = await repo.retomarOperacao(p.opcoes.operacaoId); if (!valido()) return; if (!podeEditar()) { sucesso = r === null ? 'Esta tentativa não foi localizada no servidor. Ela continua guardada nesta aba; peça à Amanda para conferir antes de qualquer novo envio.' : 'O servidor confirmou o registro desta tentativa. A cópia guardada nesta aba foi preservada; nenhuma etapa foi reenviada.'; return; } if (r === null) { p.ausente = true; erro = ''; } else await confirmar(p, r); }
    catch (e) { if (valido()) { p.ausente = false; erro = message(e); } }
    finally { ocupado = false; if (valido()) render(); }
  }
  async function confirmarLote() {
    if (!podeEditar() || ocupado || pendente || loteExecutando || !preview.length) return;
    if (editor && JSON.stringify(editor) !== editorBase) throw new Error('Salve ou feche o rascunho aberto antes de confirmar a prévia.');
    if (!lote) {
      const entradas = preview.map((r, n) => ({ tipo: 'salvar', entrada: entradaEditor(r), loteIndex: n, opcoes: { operacaoId: opId(), versaoEsperada: null } }));
      if (!win.confirm(`Criar ${entradas.length} etapas para ${preview[0].clienteNome}? Confira datas, pessoas e competência na prévia antes de confirmar.`)) return;
      lote = { entradas }; editor = null;
    }
    loteExecutando = true; render();
    try {
      for (const p of lote.entradas) {
        if (!valido() || pendente) break;
        if (p.confirmadaId) continue;
        pendente = p;
        if (!await executar(p)) break;
      }
      if (valido()) {
        const feitas = lote.entradas.filter(p => p.confirmadaId).length;
        sucesso = feitas === lote.entradas.length ? `${feitas} etapas confirmadas na agenda e nas demandas. Os IDs estão preservados nesta prévia.` : `${feitas} de ${lote.entradas.length} etapas confirmadas. Confira a tentativa pendente para continuar.`;
        const erroDaTentativa = erro;
        await recarregar();
        if (pendente && erroDaTentativa) erro = erroDaTentativa + (erro ? `\n${erro}` : '');
      }
    } finally { loteExecutando = false; if (valido()) render(); }
  }
  async function abrirModelos() {
    if (!podeEditar() || !liberarRascunho()) return;
    configurando = true; ocupado = true; configErro = ''; render();
    try { const r = await repo.lerConfig(); if (!valido()) return; if (r?.origem !== 'servidor' || r.completo !== true || !Array.isArray(r.modelos)) throw new Error('Os modelos não tiveram sua leitura confirmada no servidor.'); config = r; modeloEdit = clone(r.modelos[0] || { id: 'inicial_sete', nome: 'Começo com sete etapas', etapas: clone(ETAPAS_INICIAIS_I167) }); modeloBase = JSON.stringify(modeloEdit); }
    catch (e) { if (valido()) configErro = message(e); }
    finally { ocupado = false; if (valido()) render(); }
  }
  function configEntrada() {
    if (!config || !modeloEdit || configErro) throw new Error('Confira os modelos no servidor antes de salvar.');
    const m = clone(modeloEdit); m.etapas.forEach((e, n) => { e.ordem = n + 1; });
    const modelos = clone(config.modelos); const idx = modelos.findIndex(x => x.id === m.id); if (idx >= 0) modelos[idx] = m; else modelos.push(m);
    return { diasTrabalho: clone(config.diasTrabalho), modelos };
  }
  function prepararPreview() {
    if (lote) throw new Error('Feche a prévia atual antes de montar outra. As etapas já confirmadas serão preservadas.');
    if (!config || !modeloEdit || configErro) throw new Error('Confira os modelos no servidor antes de montar a prévia.');
    if (pendente) return;
    const c = clientes().find(x => x.id === estado.cliente);
    if (!c) throw new Error('Escolha o cliente no filtro antes de montar a prévia.');
    if (!config.diasTrabalho.length) throw new Error('Escolha pelo menos um dia de trabalho para a prévia.');
    const diaTrabalho = offset => { let dia = estado.data; let restantes = Math.abs(Number(offset) || 0); const sentido = Number(offset) < 0 ? -1 : 1; let limite = 0; while (!config.diasTrabalho.includes(date(dia).getDay()) && limite++ < 800) dia = add(dia, sentido); while (restantes > 0 && limite++ < 1600) { dia = add(dia, sentido); if (config.diasTrabalho.includes(date(dia).getDay())) restantes--; } return dia; };
    preview = modeloEdit.etapas.map((e, n) => ({ cliente: c.id, clienteNome: c.nome, empresaId: c.id === 'zeiss' ? estado.empresaId : '', titulo: e.titulo, etapa: e.id, destinatario: e.destinatario, prazoData: diaTrabalho(e.offsetDias), prazoHora: '19:00', mes: estado.mes, quantidade: Number(e.quantidade), unidade: e.unidade, ordem: n + 1, descricao: '', inicio: '', fixo: false, prioridade: 'normal', linkAnexo: '' }));
    sucesso = 'Prévia pronta. Nenhuma demanda foi criada.'; render();
  }
  function input(e) {
    if (!valido()) return;
    const el = e.target;
    if (el.closest('[data-form="etapa"]') && editor && !pendente && !ocupado) {
      if (el.name === 'cliente') { const c = clientes().find(c => c.id === el.value); editor.cliente = el.value; editor.clienteNome = c?.nome || ''; editor.empresaId = ''; }
      else if (el.name) editor[el.name] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    }
    if (modeloEdit && !pendente && !ocupado) {
      if (el.dataset.model) modeloEdit[el.dataset.model] = el.value;
      if (el.dataset.stage !== undefined) { const row = modeloEdit.etapas[Number(el.dataset.stage)]; if (row) row[el.dataset.key] = ['offsetDias', 'quantidade'].includes(el.dataset.key) ? Number(el.value) : el.value; }
      if (el.dataset.workday !== undefined) { const n = Number(el.dataset.workday); config.diasTrabalho = [...new Set(el.checked ? [...config.diasTrabalho, n] : config.diasTrabalho.filter(x => x !== n))].sort(); modeloBase = ''; }
      if (el.hasAttribute('data-model-base')) estado.data = el.value || hoje();
    }
  }
  async function change(e) {
    const el = e.target, campo = el.dataset.filter; if (!valido()) return;
    if (el.name === 'cliente' && editor && !ocupado && !pendente) { render(); return; }
    if (!campo) return;
    if (ocupado || (editavel(ctx()) && (pendente || loteExecutando))) { render(); return; }
    if (campo === 'mes') {
      if (!liberarRascunho()) { el.value = estado.mes; return; }
      if (!/^\d{4}-\d{2}$/.test(el.value)) { el.value = estado.mes; return; }
      estado.mes = el.value; configurando = false; modeloEdit = null; conferido = false; itens = []; await recarregar(); return;
    }
    if (campo === 'modelo') {
      if (modeloEdit && JSON.stringify(modeloEdit) !== modeloBase && !win.confirm('Descartar as alterações deste modelo?')) { el.value = modeloEdit.id; return; }
      modeloEdit = clone(config.modelos.find(x => x.id === el.value) || { id: 'inicial_sete', nome: 'Começo com sete etapas', etapas: clone(ETAPAS_INICIAIS_I167) }); modeloBase = JSON.stringify(modeloEdit); render(); return;
    }
    estado[campo] = el.value; if (campo === 'cliente') estado.empresaId = ''; render();
  }
  async function click(e) {
    const b = e.target.closest('[data-ag]'); if (!b || !shell.contains(b) || b.disabled || !valido()) return;
    const a = b.dataset.ag; erro = ''; sucesso = '';
    try {
      if (a === 'full') { if (typeof abrirCompleto === 'function') abrirCompleto(); return; }
      if (a === 'recover') return await recuperar();
      if (a === 'retry') { if (podeEditar() && pendente?.ausente) { pendente.ausente = false; await executar(pendente); } return; }
      if (a === 'abandon') { if (podeEditar() && pendente?.ausente && pendente.rejeitada) { if (pendente.loteIndex !== undefined) { erro = 'A etapa do lote foi recusada. Feche a prévia para ajustar e monte uma nova prévia; as etapas já confirmadas serão preservadas.'; } else limparArmazenamento(); pendente = null; if (lote) persistir(); render(); } return; }
      if (a === 'reload') { if (!pendente || !editavel(ctx())) await recarregar(); return; }
      if (a === 'open') { if (!liberarRascunho()) return; if (typeof abrirDemanda !== 'function') throw new Error('A abertura da demanda não está disponível nesta tela.'); await abrirDemanda(b.dataset.id); return; }
      if (a === 'fixed-open') {
        if (!liberarRascunho()) return;
        const i = itens.find(i => i._fonteAgenda === 'funcao_fixa' && i._chaveAgenda === b.dataset.chave && !i._previsaoFixa);
        if (!i?.id || typeof funcoesFixas?.abrir !== 'function') throw new Error('Atualize o calendário para conferir esta rotina.');
        await funcoesFixas.abrir(i.id); return;
      }
      if (a === 'fixed-settings') { if (role(ctx()) !== 'amanda' || !liberarRascunho()) return; await funcoesFixas?.editarConfiguracao?.(); return; }
      if (a === 'mode') { estado.modo = b.dataset.mode; if (funcoesFixas) await recarregar(); else render(); return; }
      if (['prev', 'next', 'today'].includes(a)) {
        if (a === 'today') estado.data = hoje();
        else if (estado.modo === 'mes') { const d = date(`${estado.data.slice(0, 7)}-01`); d.setMonth(d.getMonth() + (a === 'next' ? 1 : -1)); estado.data = iso(d); }
        else estado.data = add(estado.data, a === 'next' ? 7 : -7);
        if (funcoesFixas) await recarregar(); else render(); return;
      }
      if (!podeEditar() || ocupado || pendente || loteExecutando) return;
      if (a === 'confirm-batch') return await confirmarLote();
      if (a === 'new') { if (liberarRascunho()) novo(); return; }
      if (a === 'edit') return await abrirEditor(b.dataset.id);
      if (a === 'close-editor') { if (podeSair()) { editor = null; render(); } return; }
      if (a === 'archive' || a === 'restore') {
        if (!liberarRascunho()) return; const i = itens.find(i => i.id === b.dataset.id); if (!i?.assinatura) throw new Error('Atualize a agenda para conferir a versão desta etapa.');
        if (!win.confirm(a === 'archive' ? 'Arquivar esta etapa e cancelar a demanda? O histórico será preservado.' : 'Restaurar esta etapa? O estado atual será conferido pelo servidor.')) return;
        const p = { tipo: a === 'archive' ? 'cancelar' : 'restaurar', id: i.id, opcoes: { operacaoId: opId(), versaoEsperada: i.assinatura } }; pendente = p; await executar(p); return;
      }
      if (a === 'models') return await abrirModelos();
      if (a === 'close-models') { if (podeSair()) { configurando = false; modeloEdit = null; render(); } return; }
      if (a === 'close-preview') { if (win.confirm(lote ? 'Fechar a prévia? As etapas já confirmadas continuam na agenda; as restantes não serão criadas.' : 'Descartar esta prévia? Nenhuma tarefa foi criada por ela.')) { if (lote) limparArmazenamento(); preview = []; lote = null; render(); } return; }
      if (a === 'review-preview') { if (lote) return; if (editor && JSON.stringify(editor) !== editorBase && !win.confirm('Descartar o rascunho atual?')) return; const n = Number(b.dataset.index); novo(preview[n], n); return; }
      if (a === 'add-stage') { if (!modeloEdit) return; if (modeloEdit.etapas.length >= 30) throw new Error('Cada modelo pode ter até 30 etapas.'); modeloEdit.etapas.push({ id: opId(), titulo: 'Nova etapa', destinatario: '', offsetDias: 0, quantidade: 1, unidade: 'etapa', ordem: modeloEdit.etapas.length + 1 }); render(); return; }
      if (a === 'remove-stage') { modeloEdit?.etapas.splice(Number(b.dataset.index), 1); render(); return; }
      if (a === 'new-model') { if (modeloEdit && JSON.stringify(modeloEdit) !== modeloBase && !win.confirm('Descartar as alterações do modelo atual?')) return; modeloEdit = { id: opId(), nome: 'Novo modelo', etapas: [] }; modeloBase = ''; render(); return; }
      if (a === 'remove-model') { if (!config || !modeloEdit || !win.confirm('Remover este modelo salvo? As demandas já criadas serão preservadas.')) return; const entrada = { diasTrabalho: clone(config.diasTrabalho), modelos: clone(config.modelos).filter(x => x.id !== modeloEdit.id) }; const p = { tipo: 'config', entrada, opcoes: { operacaoId: opId(), versaoEsperada: config.assinatura || null } }; modeloEdit = null; pendente = p; await executar(p); return; }
      if (a === 'save-model') { const p = { tipo: 'config', entrada: configEntrada(), opcoes: { operacaoId: opId(), versaoEsperada: config.assinatura || null } }; pendente = p; await executar(p); return; }
      if (a === 'preview') { prepararPreview(); return; }
    } catch (err) { if (valido()) { erro = message(err); render(); } }
  }
  async function submit(e) {
    if (!e.target.matches('[data-form="etapa"]')) return; e.preventDefault(); if (!podeEditar() || ocupado || pendente) return;
    try { const p = { tipo: 'salvar', entrada: entradaEditor(), previewIndex: editor._preview, opcoes: { operacaoId: opId(), versaoEsperada: editor.id ? editor.assinatura : null } }; pendente = p; await executar(p); }
    catch (err) { erro = message(err); render(); }
  }
  const beforeUnload = e => { if (valido() && podeEditar() && (sujo() || pendente || ocupado)) { e.preventDefault(); e.returnValue = ''; } };
  const refreshSeguro = () => { if (valido() && root.isConnected && doc.visibilityState !== 'hidden' && !carregando && !ocupado && !pendente && !editor && !configurando && !preview.length && !sujo()) void recarregar(); };
  const visibility = () => { if (doc.visibilityState !== 'hidden') refreshSeguro(); };
  shell.addEventListener('input', input); shell.addEventListener('change', change); shell.addEventListener('click', click); shell.addEventListener('submit', submit); win?.addEventListener('beforeunload', beforeUnload);
  win?.addEventListener('focus', refreshSeguro); doc.addEventListener('visibilitychange', visibility);
  const refreshTimer = globalThis.setInterval(refreshSeguro, 60000);
  render(); const pronto = recarregar();
  function cleanup() { if (destruido) return; destruido = true; geracao++; globalThis.clearInterval(refreshTimer); shell.removeEventListener('input', input); shell.removeEventListener('change', change); shell.removeEventListener('click', click); shell.removeEventListener('submit', submit); win?.removeEventListener('beforeunload', beforeUnload); win?.removeEventListener('focus', refreshSeguro); doc.removeEventListener('visibilitychange', visibility); shell.remove(); }
  return { cleanup, destroy: cleanup, podeSair, recarregar, refresh: recarregar, pronto };
}

export default montarAgenda;
