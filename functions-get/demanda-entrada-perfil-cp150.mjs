/* CP150: projeção mínima da entrada privada em uma única demanda, sem documentos públicos. */
import {isDeepStrictEqual as igual} from 'node:util';
import {hashI165} from './contexto.mjs';
export const TIPO_DEMANDA_ENTRADA_CP150='analise_perfil_cp150';
const ESTADOS=Object.freeze(['aguardando_analise','em_analise','aguardando_complemento','concluida']);
const KEYS=Object.freeze(['schema','processoId','cliente','empresaOtavio','snapshotNumero','snapshotHash','estado']);
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const e=(ok,m)=>{if(!ok)throw Object.assign(new Error(m),{code:'i165/entrada-perfil-demanda'});};
function ancora(p){e(obj(p)&&typeof p.id==='string'&&/^[A-Za-z0-9_.-]{1,200}$/.test(p.id)&&!['.','..'].includes(p.id)&&typeof p.cliente==='string'&&/^[a-z0-9][a-z0-9._-]{0,119}$/.test(p.cliente)&&typeof p.empresaOtavio==='string','Confira a identidade da entrada antes de vincular a demanda.');return [p.id,p.cliente,p.empresaOtavio];}
export const idDemandaEntradaPerfilCp150=p=>'entrada_perfil_cp150_'+hashI165(ancora(p));
function projecao(p,f){
 ancora(p);const s=f?.snapshotEnvio;e(obj(s)&&s.processoId===p.id&&s.cliente===p.cliente&&s.empresaOtavio===p.empresaOtavio&&Number.isSafeInteger(s.numero)&&s.numero>0&&typeof s.hash==='string'&&/^[a-f0-9]{64}$/.test(s.hash)&&ESTADOS.includes(f.estado),'A demanda precisa de um envio confirmado válido da mesma entrada.');
 const {hash,...corpo}=s;e(hashI165(corpo)===hash,'O retrato enviado precisa ser conferido antes de vincular a demanda.');
 if(f.estado==='concluida')e(obj(f.analiseConcluida)&&f.analiseConcluida.baseEnvio===s.hash&&Number.isSafeInteger(f.analiseConcluida.numero)&&f.analiseConcluida.numero>0&&typeof f.analiseConcluida.concluidaEm==='string'&&obj(f.analiseConcluida.concluidaPor)&&typeof f.analiseConcluida.concluidaPor.atorReal==='string','A conclusão não corresponde ao mesmo envio da análise.');
 return {schema:1,processoId:p.id,cliente:p.cliente,empresaOtavio:p.empresaOtavio,snapshotNumero:s.numero,snapshotHash:s.hash,estado:f.estado};
}
export function validarDemandaEntradaPerfilCp150(d,id,p){
 const a=ancora(p),v=d?.entradaPerfilCp150;e(id===idDemandaEntradaPerfilCp150(p)&&obj(d)&&d.tipoEspecial===TIPO_DEMANDA_ENTRADA_CP150&&d.ehAviso===true&&d.cliente===p.cliente&&d.onboardingId===p.id&&(!d.id||d.id===id)&&obj(v)&&Object.keys(v).length===KEYS.length&&Object.keys(v).every(k=>KEYS.includes(k))&&v.schema===1&&v.processoId===a[0]&&v.cliente===a[1]&&v.empresaOtavio===a[2]&&Number.isSafeInteger(v.snapshotNumero)&&v.snapshotNumero>0&&/^[a-f0-9]{64}$/.test(v.snapshotHash||'')&&ESTADOS.includes(v.estado)&&['Chris','Amanda'].includes(d.destinatario)&&['pendente','aprovada'].includes(d.status)&&d.excluido!==true&&d.arquivado!==true&&(d.historico===undefined||Array.isArray(d.historico)),'O identificador calculado já possui uma demanda incompatível ou arquivada. Nada foi sobrescrito.');return d;
}
const destino=f=>f.estado==='aguardando_complemento'?'Amanda':'Chris';
const status=f=>f.estado==='concluida'?'aprovada':'pendente';
export function resumoDemandaEntradaPerfilCp150(p,f,d){
 const id=idDemandaEntradaPerfilCp150(p);if(!f?.snapshotEnvio)return {id,confirmada:false,destinatario:'',estado:'sem_envio'};
 const atual=projecao(p,f),destinatario=destino(f);if(!d)return {id,confirmada:false,destinatario,estado:f.estado};
 try{validarDemandaEntradaPerfilCp150(d,id,p);}catch(err){return {id,confirmada:false,destinatario,estado:f.estado,conflito:true,motivo:err.message};}
 return {id,confirmada:igual(d.entradaPerfilCp150,atual)&&d.destinatario===destinatario&&d.status===status(f),destinatario,estado:f.estado};
}
export function prepararDemandaEntradaPerfilCp150({processo:p,fonte:f,antes=null,ator,em,acao,operacao}){
 const id=idDemandaEntradaPerfilCp150(p),meta=projecao(p,f);e(obj(ator)&&typeof ator.uid==='string'&&ator.uid&&['Chris','Amanda'].includes(ator.papel)&&['Chris','Amanda'].includes(ator.real)&&typeof em==='string'&&Number.isFinite(Date.parse(em))&&typeof operacao==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(operacao),'Confira a autoria e a operação do mesmo envio.');
 e(['enviar_material','iniciar_analise','salvar_analise','concluir_analise','pedir_complemento','vincular_demanda'].includes(acao),'Esta etapa não altera a demanda de análise.');
 if(antes){validarDemandaEntradaPerfilCp150(antes,id,p);const anterior=antes.entradaPerfilCp150;e(anterior.snapshotNumero<=meta.snapshotNumero&&(anterior.snapshotNumero!==meta.snapshotNumero||anterior.snapshotHash===meta.snapshotHash),'A demanda aponta para outra versão de envio. Releia a origem e preserve a versão já vinculada.');}
 const sync=resumoDemandaEntradaPerfilCp150(p,f,antes);if(acao==='vincular_demanda'&&sync.confirmada)return {id,depois:antes,alterou:false};
 const op=hashI165([ator.uid,ator.real,ator.papel,operacao]),rotulos={enviar_material:'Material enviado para análise de perfil',iniciar_analise:'Análise de perfil iniciada',salvar_analise:'Rascunho da análise atualizado na origem',concluir_analise:'Análise de perfil concluída na origem',pedir_complemento:'Complemento solicitado na entrada protegida',vincular_demanda:'Demanda vinculada ao material já confirmado'};
 const evento={acao:rotulos[acao],por:ator.real,em,detalhe:'Versão de envio '+meta.snapshotNumero+' · '+meta.estado,operacaoIdCp150:op,snapshotNumeroCp150:meta.snapshotNumero,...(f.estado==='concluida'?{resultadoNumeroCp150:f.analiseConcluida.numero}:{})};
 const repetidos=(antes?.historico||[]).filter(x=>x?.operacaoIdCp150===op);if(repetidos.length){e(repetidos.length===1&&igual(repetidos[0],evento)&&sync.confirmada,'Esta operação já consta com outro estado. Releia o recibo da tentativa original.');return {id,depois:antes,alterou:false};}
 if(!antes)e(typeof p.nome==='string'&&p.nome.length>0&&p.nome.length<=2000,'Confira o nome do cliente antes de criar a demanda.');
 const novo=antes||{titulo:'Análise de perfil · '+p.nome,descricao:'O material deste cliente está na entrada protegida. Abra esta demanda para consultar briefing, reunião e documentos e continuar a análise no mesmo lugar. Não é necessário reenviar os arquivos. Esta tarefa acompanha a etapa real; abrir não conclui a análise.',tipoEspecial:TIPO_DEMANDA_ENTRADA_CP150,ehAviso:true,origem:'sistema',criadoPor:ator.real,cliente:p.cliente,clienteNome:p.nome,onboardingId:p.id,prazoData:'',prazoHora:'',provaTexto:'',provaImagemUrl:'',criadoEm:em};
 const depois={...novo,destinatario:destino(f),status:status(f),entradaPerfilCp150:meta,atualizadoEm:em,atualizadoPor:ator.real,historico:[...(antes?.historico||[]),evento],...(f.estado==='concluida'?{concluidoPor:f.analiseConcluida.concluidaPor.atorReal,concluidoEm:f.analiseConcluida.concluidaEm,notaConclusao:'Análise concluída na entrada protegida.'}:{concluidoPor:'',concluidoEm:'',notaConclusao:''})};
 validarDemandaEntradaPerfilCp150(depois,id,p);return {id,depois,alterou:true};
}
