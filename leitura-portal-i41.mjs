const falha=(texto,code)=>Object.assign(new Error(texto),{code});
export async function lerServidorPortalI41(ler,contexto=()=>'',limiteMs=12000){
  const inicial=contexto();let timer;
  try{
    const s=await Promise.race([Promise.resolve().then(ler),new Promise((_,reject)=>{timer=setTimeout(()=>reject(falha('O servidor não respondeu a tempo.','gs/timeout-portal')),limiteMs);})]);
    if(inicial!==contexto())throw falha('O acesso mudou durante a consulta.','gs/contexto-portal');
    if(s?.metadata?.fromCache===true||s?.metadata?.hasPendingWrites===true)throw falha('A consulta ainda não foi confirmada pelo servidor.','gs/cache-portal');
    return s;
  }finally{clearTimeout(timer);}
}

export async function conferirSessaoAposFalhaI41({erro,eNegacao,lerContrato,contexto,limiteMs=8000}){
  if(!eNegacao(erro))return 'indeterminada';
  const inicial=contexto();
  try{await lerServidorPortalI41(lerContrato,contexto,limiteMs);return 'valida';}
  catch(e){if(inicial!==contexto()||e.code==='gs/contexto-portal')return 'trocada';return eNegacao(e)?'negada':'indeterminada';}
}

export function criarLeiturasPortalI41({document:dom=globalThis.document,contexto,onErro,repetir}){
  const pendentes=new Map();
  function envolver(area,painelId,original){
    return function(...args){
      const inicial=contexto(),anterior=pendentes.get(area);
      const promessa=Promise.resolve(anterior).catch(()=>{}).then(async()=>{
        if(inicial!==contexto())return false;
        const painel=dom.getElementById(painelId),anteriores=painel?[...painel.childNodes]:[];
        const edicoes=painel?[...painel.querySelectorAll('input,textarea,select')].filter(e=>e.id&&e.type!=='password'&&(
          e.tagName==='SELECT'?e.selectedIndex!==Math.max(0,[...e.options].findIndex(o=>o.defaultSelected)):
          e.type==='checkbox'||e.type==='radio'?e.checked!==e.defaultChecked:e.value!==e.defaultValue
        )).map(e=>({id:e.id,value:e.value,...(e.type==='checkbox'||e.type==='radio'?{checked:e.checked}:{})})):[];
        try{
          const result=await original(...args);
          if(inicial!==contexto())return false;
          for(const edicao of edicoes){const e=dom.getElementById(edicao.id);if(e&&painel?.contains(e)){e.value=edicao.value;if('checked' in edicao)e.checked=edicao.checked;}}
          return result===false?false:true;
        }catch(e){
          if(inicial!==contexto()||e.code==='gs/contexto-portal')return false;
          if(painel){
            if(edicoes.length)painel.replaceChildren(...anteriores);else painel.replaceChildren();
            const aviso=dom.createElement('div');aviso.className='card';aviso.setAttribute('role','alert');
            const titulo=dom.createElement('b');titulo.textContent='Não foi possível carregar esta área agora.';
            const texto=dom.createElement('p');texto.className='sub';texto.textContent=edicoes.length?'O que você digitou foi mantido. Confira sua conexão antes de tentar novamente.':'Isso não significa que não existam registros. As outras áreas continuam disponíveis.';
            const btn=dom.createElement('button');btn.type='button';btn.className='btn secondary';btn.textContent='Tentar novamente';btn.addEventListener('click',()=>repetir(area));
            aviso.append(titulo,texto,btn);painel.prepend(aviso);
          }
          await onErro(e,area);return false;
        }
      }).finally(()=>{if(pendentes.get(area)===promessa)pendentes.delete(area);});
      pendentes.set(area,promessa);return promessa;
    };
  }
  return {envolver};
}
