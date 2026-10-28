import {exigirI165,idFisicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {contextoTxI165,identidadeTokenI165,clienteTxI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {projetarPostagemServidorI165} from './acompanhamento.mjs';
import {obrigacaoEdicaoI165} from './lib/gs-obrigacoes-operacionais-i165.mjs';
const selecionar=(v,campos)=>Object.fromEntries(campos.filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
export async function consultarOperacionaisI165(db,auth,dados,{agora=new Date()}={}){
 const ator=identidadeTokenI165(auth,dados.papelOperado,dados.sessao||'consulta'),edicao=dados.acao==='consultar_edicao';
 exigirI165(Array.isArray(dados.ids)&&dados.ids.length<=20&&dados.ids.every(idFisicoI165),'lista','Confira até20 conteúdos físicos.');
 if(!edicao)exigirI165(['Amanda','Chris','Cecília'].includes(ator.papel),'papel','Esta fila pertence à operação de postagem.');
 const ids=[...new Set(dados.ids)],resultado=(linhas,erros)=>({linhas,erros,nenhumaEscrita:true,contratoUiRevisao:2});
 const erro=(id,e)=>({id,codigo:e.code||'i165/fonte-indisponivel',mensagem:'Este conteúdo não foi conferido; a fila original foi mantida.'});
 if(!ids.length)return resultado([],[]);
 try{return await db.runTransaction(async tx=>{
   // Uma única fotografia de leitura; referências comuns não são relidas por conteúdo.
   const leituras=new Map(),leitor={get:ref=>{if(!leituras.has(ref.path))leituras.set(ref.path,tx.get(ref));return leituras.get(ref.path);}};
   const {cfg}=await contextoTxI165(db,leitor,ator,edicao?'edicao':'programacao');
   const refs=ids.flatMap(id=>edicao?[db.doc('videos_producao/'+id),db.doc('programacao_episodios_i165/'+id)]:[db.doc('postagens/'+id)]);
   const snaps=await tx.getAll(...refs);for(const s of snaps)leituras.set(s.ref.path,Promise.resolve(s));
   const linhas=await Promise.all(ids.map(async id=>{try{
   const tx=leitor;
   if(edicao){const [s,e]=await Promise.all([tx.get(db.doc('videos_producao/'+id)),tx.get(db.doc('programacao_episodios_i165/'+id))]);exigirI165(s.exists,'video','O vídeo não foi confirmado.');const v={...s.data(),id};exigirI165(v.editorAtribuido===ator.papel||ator.papel==='Chris','editor','Este vídeo pertence a outro responsável.');const cliente=await clienteTxI165(db,tx,v.cliente,agora);return {video:selecionar(v,['id','cliente','clienteNome','empresaOtavio','titulo','editorAtribuido','status','prazoEntrega','prioridade','correcao']),obrigacoes:e.exists&&cliente.clienteAtivo?obrigacaoEdicaoI165(v,e.data()):[],estado:e.exists?'conferido':'episodio_a_conferir',motivo:e.exists?'':'A atribuição está visível; o aviso do serviço ainda precisa de conferência.'};}
   const f=await fontesPostagemTxI165(db,tx,id,agora),p=projetarPostagemServidorI165(f,cfg,agora);return {postagem:selecionar(f.post,['id','cliente','clienteNome','empresaOtavio','titulo','status','videoId','calendarClienteSlug','calendarCompetencia','calendarItemId']),politica:f.diretriz?.politica||null,programacaoCp111:f.programacaoCp111,legadoProgramacao:f.legadoProgramacao,obrigacoes:p.obrigacoes,estado:p.estado,motivo:p.motivo||'',revisao:f.diretriz?.revisao||0};
   }catch(e){return {erro:erro(id,e)};}}));
   return resultado(linhas.filter(l=>!l.erro),linhas.filter(l=>l.erro).map(l=>l.erro));
 },{readOnly:true});}catch(e){return resultado([],ids.map(id=>erro(id,e)));}
}
