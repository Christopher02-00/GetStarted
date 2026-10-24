import {exigirI165,jsonCanonicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {validarOperacaoProgramacaoI165,chaveExcecaoI165,assinaturaDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {contextoTxI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {camposPendentesI79} from './lib/gs-legenda-qualidade-i79.mjs';
import {exigirPacoteMidiaManualTxI166} from './midia-guard-programacao-i166.mjs';
/** This guard must execute inside the transaction which will write the canonical post. A preview call is not write authorization. */
export async function exigirProgramacaoTxI165(db,tx,ator,dados,agora=new Date()){
 exigirI165(['Amanda','Chris','Cecília'].includes(ator.papel),'papel','Esta ação é da operação de postagem.');
 const {cfg}=await contextoTxI165(db,tx,ator,'programacao');
 const f=await fontesPostagemTxI165(db,tx,dados.postagemId,agora);exigirI165(f.clienteAtivo&&f.configEntrega.modo==='postagem'&&f.diretriz,'fonte','A fonte precisa estar disponível e com diretriz atual.');
 if(f.video)exigirI165(f.video.status==='aprovado'&&f.video.clienteAprovou===true,'cliente','A confirmação real do cliente ainda não foi registrada.');
 const acao={acao:dados.tipo,data:dados.data||'',hora:dados.hora||'',rede:dados.rede||'geral',prova:dados.prova||'',agora};
 const legendaPendenteI90=f.post.status==='aguardando_legenda'||camposPendentesI79(f.post).length>0;
 let midiaArquivoI166={aplicavel:false,snapshot:null};
 if(acao.acao==='agendar'){
  exigirI165(typeof cfg.permitirAgendarSemLegendaI90==='boolean','i90','A política atual de legenda precisa ser confirmada.');
  exigirI165(!legendaPendenteI90||cfg.permitirAgendarSemLegendaI90===true,'legenda-pendente','Este conteúdo ainda precisa de legenda antes de agendar. O texto e as datas foram preservados.');
  midiaArquivoI166=await exigirPacoteMidiaManualTxI166(db,tx,f);
 }
 if(['agendar','cancelar'].includes(acao.acao)){const key=chaveExcecaoI165(acao);acao.excecao=f.controle?.assinaturaDiretriz===assinaturaDiretrizI165(f.diretriz)?f.controle.excecoes?.[key]||null:null;}
 const resultado=validarOperacaoProgramacaoI165(f.diretriz,acao);if(resultado.excecaoAplicada)exigirI165(acao.excecao?.assinaturaFonte===jsonCanonicoI165({post:f.post,video:f.video,diretriz:f.diretriz}),'excecao-fonte','O conteúdo mudou depois da decisão. A exceção não libera uma versão diferente.');
 return {resultado,fontes:f,midiaArquivoI166,i90:{legendaPendente:legendaPendenteI90,permitirAgendarSemLegenda:cfg.permitirAgendarSemLegendaI90===true}};
}
