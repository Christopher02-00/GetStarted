import {compatLegadoConfirmadaI165,validarAcaoFonteProgramacaoI165} from './compat-legado-programacao-r83.mjs';
import {exigirI165,jsonCanonicoI165} from './lib/gs-contexto-operacional-i165.mjs';
import {validarOperacaoProgramacaoI165,chaveExcecaoI165,assinaturaDiretrizI165,normalizarDiretrizI165} from './lib/gs-diretriz-publicacao-i165.mjs';
import {contextoTxI165,hashI165} from './contexto.mjs';
import {fontesPostagemTxI165} from './fontes.mjs';
import {camposPendentesI79} from './lib/gs-legenda-qualidade-i79.mjs';
import {exigirPacoteMidiaManualTxI166} from './midia-guard-programacao-i166.mjs';
// A conferência pertence à orientação integral, à fonte lida e à proposta desta operação.
// Ela não é uma autorização persistente: cada agendamento muda a fonte e exige nova leitura.
export function conferenciaOrientacaoCp110(f){
 const d=f.diretriz,disponivel=!!d&&d.autoria?.papel==='Amanda';
 return {schema:1,obrigatoria:true,disponivel,postagemId:f.post.id,revisaoDiretriz:d?.revisao||0,assinaturaDiretriz:d?hashI165(assinaturaDiretrizI165(d)):'',assinaturaFonte:hashI165(jsonCanonicoI165({post:f.post,video:f.video,diretriz:d})),orientacao:d?normalizarDiretrizI165(d.politica):null,motivo:disponivel?'':d?'A Amanda precisa reconferir e assumir esta orientação antes de um novo agendamento.':'A Amanda precisa definir a orientação antes de um novo agendamento.'};
}
export function exigirConferenciaOrientacaoCp110(f,confirmacao,acao,ator,agora=new Date()){
 const atual=conferenciaOrientacaoCp110(f);
 exigirI165(atual.disponivel,'orientacao-amanda-obrigatoria',atual.motivo);
 const campos=['schema','conferida','revisaoDiretriz','assinaturaDiretriz','assinaturaFonte','data','hora','rede'];
 exigirI165(confirmacao&&typeof confirmacao==='object'&&!Array.isArray(confirmacao)&&Object.keys(confirmacao).length===campos.length&&Object.keys(confirmacao).every(k=>campos.includes(k))&&confirmacao.schema===1&&confirmacao.conferida===true,'conferencia-orientacao-obrigatoria','Leia a orientação integral da Amanda e confirme a conferência antes de agendar.');
 exigirI165(confirmacao.revisaoDiretriz===atual.revisaoDiretriz&&confirmacao.assinaturaDiretriz===atual.assinaturaDiretriz&&confirmacao.assinaturaFonte===atual.assinaturaFonte,'conferencia-orientacao-desatualizada','A orientação ou o conteúdo mudou. Reabra a conferência atual antes de agendar.');
 exigirI165(confirmacao.data===acao.data&&confirmacao.hora===acao.hora&&confirmacao.rede===(acao.rede||'geral'),'conferencia-acao-divergente','A data, o horário ou a plataforma mudou depois da conferência. Confira novamente esta proposta.');
 return {...confirmacao,por:ator.papel,autorUid:ator.uid,atorReal:ator.real||ator.atorReal,em:agora.toISOString()};
}
/** This guard must execute inside the transaction which will write the canonical post. A preview call is not write authorization. */
export async function exigirProgramacaoTxI165(db,tx,ator,dados,agora=new Date()){
 exigirI165(['Amanda','Chris','Cecília'].includes(ator.papel),'papel','Esta ação é da operação de postagem.');
 const {cfg}=await contextoTxI165(db,tx,ator,'programacao');
 const f=await fontesPostagemTxI165(db,tx,dados.postagemId,agora);exigirI165(f.clienteAtivo&&f.configEntrega.modo==='postagem'&&(f.diretriz||compatLegadoConfirmadaI165(f)),'fonte','A fonte precisa estar disponível e com diretriz atual.');
 if(f.video)exigirI165(f.video.status==='aprovado'&&f.video.clienteAprovou===true,'cliente','A confirmação real do cliente ainda não foi registrada.');
 const acao={acao:dados.tipo,data:dados.data||'',hora:dados.hora||'',rede:dados.rede||'geral',prova:dados.prova||'',agora};
 const legendaPendenteI90=f.post.status==='aguardando_legenda'||camposPendentesI79(f.post).length>0;
 let midiaArquivoI166={aplicavel:false,snapshot:null};
 let conferenciaCp110=null;
 if(acao.acao==='agendar'){
  conferenciaCp110=exigirConferenciaOrientacaoCp110(f,dados.confirmacaoOrientacaoCp110,acao,ator,agora);
  exigirI165(typeof cfg.permitirAgendarSemLegendaI90==='boolean','i90','A política atual de legenda precisa ser confirmada.');
  exigirI165(!legendaPendenteI90||cfg.permitirAgendarSemLegendaI90===true,'legenda-pendente','Este conteúdo ainda precisa de legenda antes de agendar. O texto e as datas foram preservados.');
  midiaArquivoI166=await exigirPacoteMidiaManualTxI166(db,tx,f);
 }
 if(['agendar','cancelar'].includes(acao.acao)){const key=chaveExcecaoI165(acao);acao.excecao=f.controle?.assinaturaDiretriz===assinaturaDiretrizI165(f.diretriz)?f.controle.excecoes?.[key]||null:null;}
 const resultado=validarAcaoFonteProgramacaoI165(f,acao,ator);if(resultado.excecaoAplicada)exigirI165(acao.excecao?.assinaturaFonte===jsonCanonicoI165({post:f.post,video:f.video,diretriz:f.diretriz}),'excecao-fonte','O conteúdo mudou depois da decisão. A exceção não libera uma versão diferente.');
 return {resultado,fontes:f,midiaArquivoI166,conferenciaOrientacaoCp110:conferenciaCp110,i90:{legendaPendente:legendaPendenteI90,permitirAgendarSemLegenda:cfg.permitirAgendarSemLegendaI90===true}};
}
