// Apresentação somente: o host consulta/canoniza e o writer existente confirma a mesma postagem.
const fisico = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,220}$/.test(id);
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const js = value => String(value ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/</g,'\\u003c').replace(/>/g,'\\u003e');
function materialSeguro(value) {
  if (typeof value !== 'string') return '';
  try {const u = new URL(value.trim());return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : '';} catch {return '';}
}
const pendente = p => p && p.excluido !== true && p.status === 'aguardando_legenda';
const stokki = p => p.cliente === 'stokki' || p.publicacaoStokki != null;
export function htmlApoioLegendasFlatI170(posts, {esc = html, escAttr = html, escJs = js} = {}) {
  const fonte = Array.isArray(posts) ? posts : [];
  const elegiveis = fonte.filter(p => pendente(p) && !stokki(p) && fisico(p.id));
  const notaStokki = fonte.some(p => pendente(p) && stokki(p))
    ? '<p class="meta" data-apoio-stokki-i170>As legendas da Stokki seguem com a gestão e não são editadas por aqui.</p>' : '';
  const cards = elegiveis.map(p => {
    const id = p.id, material = materialSeguro(p.linkVideo), cliente = p.clienteNome || p.cliente || 'Cliente';
    return `<article class="card" data-legenda-post-i66="${escAttr(id)}" data-legenda-busca-i66="${escAttr(cliente+' '+(p.titulo||''))}">
      <h3>${esc(cliente)} — ${esc(p.titulo || 'Conteúdo')}</h3>
      <p class="meta">Aguardando legenda</p>
      ${material ? `<p class="desc"><a href="${escAttr(material)}" target="_blank" rel="noopener noreferrer">Ver material ↗</a></p>` : '<p class="meta">O material está sem um link válido. Peça a conferência à Amanda antes de enviar.</p>'}
      <div class="field"><label for="legenda_${escAttr(id)}">Legenda</label><textarea id="legenda_${escAttr(id)}" placeholder="Escreva a legenda deste conteúdo..." oninput="guardarRascunhoFilaI84(this.closest('[data-legenda-post-i66]'))">${esc(p.legenda || '')}</textarea></div>
      <button type="button" class="btn" onclick="salvarLegenda('${escJs(id)}')">Salvar legenda e enviar pra Cecília</button>
    </article>`;
  }).join('');
  return '<section data-apoio-legendas-flat-i170><div class="card"><h2>Apoio de legendas</h2><p class="meta">Aqui ficam os conteúdos que ainda precisam do texto. Ao salvar, a mesma postagem segue para a Cecília agendar.</p>'+notaStokki+'</div>'+ (cards || '<div class="empty">Nenhuma legenda aguardando seu apoio agora.</div>') + '</section>';
}
