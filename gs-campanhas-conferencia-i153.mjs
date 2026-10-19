/* Conferência de publicações explícitas do Quadro de Campanhas. Sem IO. */
export const TIPO_I153='conferencia_campanha_i153';
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function dataI153(v){return typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
export function proximoDiaI153(v){if(!dataI153(v))throw Error('Data de conferência inválida.');return new Date(Date.parse(v+'T12:00:00Z')+86400000).toISOString().slice(0,10);}
export function gruposCampanhaI153(c,id,hoje,validarCliente){
  if(!obj(c)||typeof id!=='string'||!id||id.includes('/'))throw Error('Campanha sem identidade física.');
  if(!dataI153(hoje))throw Error('Data de conferência inválida.');
  if(c.excluido||c.arquivada||['cancelado','cancelada','arquivado','arquivada'].includes(c.status))return [];
  if(!Array.isArray(c.clientes))throw Error('Clientes da campanha indisponíveis.');
  const amanha=proximoDiaI153(hoje),grupos=new Map();
  c.clientes.forEach((cl,ci)=>{
    if(!obj(cl)||!Array.isArray(cl.postagens))throw Error('Agrupamento da campanha inconsistente.');
    const slug=cl.slug||cl.cliente;validarCliente(slug,cl);
    cl.postagens.forEach((p,pi)=>{
      if(!obj(p))throw Error('Postagem da campanha inconsistente.');
      if(p.excluido||p.status==='postado'||p.postado===true)return;
      const usaCabecalho=p.dataPublicacao===undefined||p.dataPublicacao===null||p.dataPublicacao==='';
      const data=usaCabecalho?c.dataCampanha:p.dataPublicacao;
      if(!dataI153(data))throw Error('Data de publicação inválida na campanha '+(c.nome||id)+'.');
      if(data!==hoje&&data!==amanha)return;
      if(!(typeof p.id==='string'&&p.id)&&p.legado!==true)throw Error('Conteúdo sem ID estável; confira a campanha antes do aviso.');
      const postagemId=typeof p.id==='string'&&p.id?p.id:'legado_unico';
      const chave=JSON.stringify([slug,postagemId]);
      const post={chave,clienteSlug:slug,clienteNome:String(cl.nome||cl.clienteNome||slug),postagemId,titulo:String(p.titulo||'Conteúdo sem título'),dataPublicacao:data,dataDoCabecalho:usaCabecalho,statusManual:String(p.status||'planejamento')};
      if(!grupos.has(data))grupos.set(data,{versao:1,campanhaId:id,nome:String(c.nome||'Campanha'),dataCampanha:String(c.dataCampanha||''),dataPublicacao:data,postagens:[]});
      const g=grupos.get(data);if(g.postagens.some(x=>x.chave===chave))throw Error('Postagem repetida no mesmo agrupamento.');g.postagens.push(post);
    });
  });
  return [...grupos.values()].sort((a,b)=>a.dataPublicacao.localeCompare(b.dataPublicacao));
}
export async function idAvisoI153(grupo,pessoa,extras=[]){
  if(!['Amanda','Cecília'].includes(pessoa))throw Error('Destinatário inválido.');
  const bytes=new TextEncoder().encode(JSON.stringify([grupo.campanhaId,grupo.dataPublicacao,pessoa,...extras.slice().sort()]));
  return 'campanha_i153_'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function avisoValidoI153(d,g,pessoa){return d?.tipoEspecial===TIPO_I153&&d.destinatario===pessoa&&d.conferenciaCampanhaI153?.versao===1&&d.conferenciaCampanhaI153.campanhaId===g.campanhaId&&d.conferenciaCampanhaI153.dataPublicacao===g.dataPublicacao&&Array.isArray(d.conferenciaCampanhaI153.postagens);}
export function textoAvisoI153(g,hoje,complemento=false){
  const br=v=>v.split('-').reverse().join('/');
  return {titulo:(complemento?'📅 Mais um conteúdo para conferir':'📅 Conferir a programação')+' — '+g.nome+' · '+br(g.dataPublicacao),
    descricao:(g.dataPublicacao===hoje?'Hoje':'Amanhã')+', '+br(g.dataPublicacao)+', tem conteúdo desta campanha. Dá uma olhada se está tudo certo na programação:\n\n'+g.postagens.map(p=>'• '+p.clienteNome+' — '+p.titulo).join('\n')+'\n\nAbra a campanha para ver os dados atuais. Amanda acompanha a conferência e a Cecília verifica a programação. O status do quadro é manual; confira também o agendador antes de marcar como feito.'};
}
export function unirPostagensI153(antigas,novas){const m=new Map(antigas.map(p=>[p.chave,p]));for(const p of novas)m.set(p.chave,p);return [...m.values()];}
