/* I39: namespace da persistência; autorização continua exclusivamente nas Rules. */
export function nomeSessaoPublicaI39(canal,cliente){
  if(!['portal','calendario-cliente','calendario-equipe'].includes(canal))throw new Error('Canal público não reconhecido.');
  return 'getstarted-public-i39:'+canal+':'+encodeURIComponent(String(cliente||''));
}
export function entradaPortalI39(busca,ultimoSlug,ultimoToken){
  const p=new URLSearchParams(busca),cliente=p.get('c');
  return Object.freeze({slug:cliente||String(ultimoSlug||''),token:cliente?String(p.get('t')||''):String(ultimoToken||'')});
}
