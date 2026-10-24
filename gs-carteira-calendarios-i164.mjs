/* Extração literal CP101; ambiente explícito BRT/nomes. Não classifica por política financeira. */
export function carteiraCanonicaI164({extras,configs,hoje,competencia,listaNomesAnterior}){
const MENSALISTAS_OPERACIONAIS_CONFIRMADOS = new Map([
    ['acougue-sao-joaquim','Açougue São Joaquim'],
    ['cookiery','Cookiery'],
    ['dra-julia','Dra Júlia'],
    ['emanuelle-bernaski-nutri','Emanuelle Bernaski Nutri'],
    ['hitech','Hitech'],
    ['iphone-campo-largo','iPhone Campo Largo'],
    ['joaquin-assados','Joaquin Assados'],
    ['zeiss','Zeiss']
  ]);
const CLIENTES_BASE = [
    {nome:"Get Started (conteúdo interno)", slug:"get-started"},
    {nome:"Bluefit", slug:"bluefit"}, {nome:"Camargo's", slug:"camargos"}, {nome:"Juliane Nerone", slug:"juliane-nerone"},
    {nome:"Dra. Monique", slug:"dra-monique"}, {nome:"Hitech", slug:"hitech"}, {nome:"Joaquin Assados", slug:"joaquin-assados"},
    {nome:"Mochi", slug:"mochi"}, {nome:"Vitalle Odonto", slug:"vitalle-odonto"}, {nome:"Place", slug:"place"},
    {nome:"Stokki", slug:"stokki"}, {nome:"Vip", slug:"vip"}, {nome:"Vital Seg", slug:"vital-seg"},
    {nome:"Divina Cantina", slug:"divina-cantina"}, {nome:"Helo Arquiteta", slug:"helo-arquiteta"}, {nome:"Rodrigo", slug:"rodrigo"},
    {nome:"Fior Restaurante", slug:"fior-restaurante"}, {nome:"Zeiss", slug:"zeiss"}
  ].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
const CLIENTES_SEM_CALENDARIO_OPERACIONAL = new Set(['get-started','rodrigo']);
const FORA_DA_META_SEMENTE = {
    'suellen': 'cliente avulso',
    'elis noivas': 'saiu da carteira',
    'eliz noivas': 'saiu da carteira',
    'ikn': 'cliente avulso',
    'ikn brasil': 'cliente avulso',
    'x joias': 'cliente avulso'
  };
const APELIDOS_DE_CONTRATO = {
    'zeens': 'zeiss',
    'otica-visao-araucaria': 'zeiss',
    'master-chefe': 'master-chef',
    'master-chef-pizzaria': 'master-chef',
    'emanuelle': 'emanuelle-bernaski-nutri',
    'cliente-rodrigo': 'rodrigo'
  };
const NOMES_CLIENTES_CANONICOS = {
    'master-chef':'Master Chef',
    'zeiss':'Zeiss',
    'emanuelle-bernaski-nutri':'Emanuelle Bernaski Nutri',
    'rodrigo':'Rodrigo'
  };
let CLIENTES_LISTA=(listaNomesAnterior||CLIENTES_BASE).map(x=>({...x}));const hojeLocal=()=>hoje;
function mensalistaConfirmadoDisponivelNoCalendario(slug,config){
    const canonico=slugClienteCanonico(slug), cfg=config||{};
    if(!MENSALISTAS_OPERACIONAIS_CONFIRMADOS.has(canonico)) return false;
    if(cfg.excluido===true||cfg.ativo===false||saidaClienteJaEfetiva(cfg)) return false;
    const inativoDesde=dataOperacionalISO(cfg.inativoDesde);
    if(inativoDesde&&inativoDesde<=hojeLocal()) return false;
    return true;
  }
function projetarListaClientesI21(snapExtras,snapConfig){
    const snap=snapExtras,cfgSnap=snapConfig;
      const configuracoes={}; cfgSnap.forEach(d=>{
        const slug=slugClienteCanonico(d.id), dados=d.data()||{};
        if(d.id==='zeiss') exigirClienteOperacionalR4(d.id,dados);
        if(!fonteFisicaClienteR4(d.id,dados)) return;
        const anterior=configuracoes[slug];
        if(!anterior){ configuracoes[slug]={...dados,__origensCalendarioV127:[d.id]}; return; }
        const preferido=d.id===slug?dados:anterior;
        const secundario=d.id===slug?anterior:dados;
        const saidas=[
          dataCalendarioV127(anterior.dataSaida||anterior.saidaProgramadaPara||anterior.inativoDesde),
          dataCalendarioV127(dados.dataSaida||dados.saidaProgramadaPara||dados.inativoDesde)
        ].filter(Boolean);
        const datasSaida=[...new Set(saidas)];
        const saidaPreferida=preferido.dataSaida||preferido.saidaProgramadaPara||preferido.inativoDesde||
          secundario.dataSaida||secundario.saidaProgramadaPara||secundario.inativoDesde||'';
        configuracoes[slug]={...secundario,...preferido,
          dataSaida:preferido.dataSaida||secundario.dataSaida||'',
          saidaProgramadaPara:preferido.saidaProgramadaPara||secundario.saidaProgramadaPara||'',
          inativoDesde:preferido.inativoDesde||secundario.inativoDesde||'',
          __saidaCalendarioV127:saidaPreferida,
          __conflitoSaidaCalendarioV127:datasSaida.length>1,
          __origensCalendarioV127:[...new Set([...(anterior.__origensCalendarioV127||[]),d.id])]
        };
      });
      const porSlug=new Map();
      CLIENTES_BASE.forEach(c=>{
        const slug=slugClienteCanonico(c.slug);
        if(!porSlug.has(slug)) porSlug.set(slug,{nome:nomeClienteCanonico(slug,c.nome),slug,base:true});
      });
      /* Um cliente ativado pelo fluxo novo pode existir somente em
         clientes_config. Antes, essa ficha era usada para classificar, mas
         não entrava na lista que alimenta Calendários; por isso a Gabi não
         recebia nem o botão para começar o mês. A projeção abaixo inclui
         somente mensalistas ativos e não cria nem altera dados. */
      Object.entries(configuracoes).forEach(([slug,dados])=>{
        const confirmadoDisponivel=mensalistaConfirmadoDisponivelNoCalendario(slug,dados);
        const tipoConfig=String(dados?.tipoCliente||'').toLowerCase();
        const saidaDatada=!!dataOperacionalISO(dados?.dataSaida||dados?.saidaProgramadaPara||dados?.inativoDesde);
        const mensalistaEncerradoComHistorico=tipoConfig==='encerrado'&&saidaDatada;
        const cicloI21=dados?.cicloClienteAvulsoI21;
        const avulsoManualI21=dados?.tipoCliente==='avulso'&&cicloI21?.versao===1&&cicloI21.estado==='ativo'&&
          typeof cicloI21.saidaId==='string'&&!!cicloI21.saidaId.trim()&&typeof cicloI21.operacaoId==='string'&&!!cicloI21.operacaoId.trim()&&
          Number.isSafeInteger(cicloI21.revisao)&&cicloI21.revisao>0&&dados.ativo!==false&&dados.excluido!==true&&!clienteInativoEfetivo(dados);
        if(tipoConfig!=='mensalista'&&!mensalistaEncerradoComHistorico&&!confirmadoDisponivel&&!avulsoManualI21) return;
        const nome=dados.nome||dados.clienteNome||MENSALISTAS_OPERACIONAIS_CONFIRMADOS.get(slug)||nomeDeSlugSeguro(slug);
        const anterior=porSlug.get(slug)||{};
        porSlug.set(slug,{...anterior,nome:nomeClienteCanonico(slug,nome),slug,config:true});
      });
      MENSALISTAS_OPERACIONAIS_CONFIRMADOS.forEach((nome,slug)=>{
        if(!porSlug.has(slug)) porSlug.set(slug,{nome,slug,compatibilidade:true});
      });
      snap.forEach(d=>{
        const v=d.data();
        if(v.excluido||!v.slug) return;
        if(aliasHistoricoZeissR4(d.id)||!fonteFisicaClienteR4(v.slug,v)) return;
        const slug=slugClienteCanonico(v.slug);
        const anterior=porSlug.get(slug);
        if(!anterior||v.slug===slug) porSlug.set(slug,{
          ...(anterior||{}),
          nome:v.slug===slug?(v.nome||nomeDeSlugSeguro(slug)):(anterior?.nome||nomeDeSlugSeguro(slug)),
          slug,
          extra:true,
          tipoOperacionalExtra:String(v.casta||v.tipoCliente||v.tipo||'').toLowerCase()
        });
      });
      const ativos=[...porSlug.values()].filter(c=>{
        const cfg=configuracoes[c.slug]||{};
        return mensalistaConfirmadoDisponivelNoCalendario(c.slug,cfg)||!clienteInativoEfetivo(cfg);
      }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return {configuracoes,porSlug,ativos};
  }
function semCalendarioPorEntregaI117(cfg={}){
    return cfg.semConteudoRecorrente===true ||
      (cfg.tipoEntrega==='entrega_direta' && cfg.semConteudoRecorrente!==false);
  }
function normNomeCliente(x){
    return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  }
function slugClienteCanonico(slug){
    let atual = String(slug||'').trim();
    if(familiaZeissR4(atual)) atual=atual.toLowerCase();
    const visitados = new Set();
    while(APELIDOS_DE_CONTRATO[atual] && !visitados.has(atual)){
      visitados.add(atual);
      atual = APELIDOS_DE_CONTRATO[atual];
    }
    return atual;
  }
function nomeClienteCanonico(slug,nome){
    return NOMES_CLIENTES_CANONICOS[slugClienteCanonico(slug)] || String(nome||'').trim();
  }
function familiaZeissR4(valor){
    return ['zeiss','zeens','otica-visao-araucaria'].includes(String(valor||'').trim().toLowerCase());
  }
function aliasHistoricoZeissR4(valor){
    return familiaZeissR4(valor)&&String(valor||'').trim().toLowerCase()!=='zeiss';
  }
function fonteFisicaClienteR4(id,dados){
    const campos=['canonicalId','cliente','clienteSlug','clienteSlugRef','slug','slugAtivado',
      'calendarClienteSlug','clienteId','clientId','calendarioDocumentoIdPlanejado','calendarioDocumentoId'];
    const ids=campos.map(k=>dados?.[k]).filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
    if(!familiaZeissR4(id)&&!ids.some(familiaZeissR4)) return true;
    return String(id||'')==='zeiss'&&ids.every(v=>typeof v==='string'&&v.trim().toLowerCase()==='zeiss');
  }
function exigirClienteOperacionalR4(id,dados){
    const fisico=familiaZeissR4(id)?String(id||'').trim().toLowerCase():String(id||'');
    if(!fonteFisicaClienteR4(fisico,dados)){
      throw new Error('Este registro pertence a um cadastro histórico ou tem identidade divergente. A cliente ativa é Zeiss. Nenhum dado foi transferido; confira o vínculo exato antes de continuar.');
    }
    return fisico;
  }
function dataOperacionalISO(valor){
    if(!valor) return '';
    if(typeof valor === 'string') return valor.slice(0,10);
    if(typeof valor.toDate === 'function') return valor.toDate().toISOString().slice(0,10);
    if(valor instanceof Date) return valor.toISOString().slice(0,10);
    return '';
  }
function saidaClienteJaEfetiva(dados, hoje){
    if(!dados || dados.excluido === true || dados.statusSaida === 'cancelada') return false;
    const data = dataOperacionalISO(dados.dataSaida || dados.saidaProgramadaPara);
    return !!data && data <= (hoje || hojeLocal());
  }
function clienteInativoEfetivo(config, hoje){
    const cfg = config || {};
    return cfg.clienteInativo === true || saidaClienteJaEfetiva(cfg, hoje);
  }
function dataCalendarioV127(valor){
    if(!valor) return '';
    try{
      if(typeof valor==='string') return valor.slice(0,10);
      if(valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0,10);
      if(typeof valor.toDate==='function'){
        const data=valor.toDate();
        return data instanceof Date&&!Number.isNaN(data.getTime())?data.toISOString().slice(0,10):'';
      }
      const segundos=Number(valor.seconds??valor._seconds);
      if(Number.isFinite(segundos)){
        const data=new Date(segundos*1000);
        return Number.isNaN(data.getTime())?'':data.toISOString().slice(0,10);
      }
    }catch(e){ return ''; }
    return '';
  }
function clienteAtivoNaCompetenciaCalendarioV127(config,competencia){
    const cfg=config&&typeof config==='object'?config:{};
    if(cfg.excluido===true) return false;
    if(String(cfg.statusSaida||'').toLowerCase()==='cancelada') return true;
    if(cfg.__conflitoSaidaCalendarioV127===true) return false;
    const mes=String(competencia||'').slice(0,7);
    const valorSaida=cfg.__saidaCalendarioV127||cfg.dataSaida||cfg.saidaProgramadaPara||cfg.inativoDesde;
    const data=dataCalendarioV127(valorSaida);
    const mesSaida=/^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.test(data)?data.slice(0,7):'';
    if(/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)&&mesSaida){
      return mes<mesSaida;
    }
    /* Data informada mas ilegível não autoriza gerar uma obrigação.
       A Central mostra o registro no histórico; a operação volta somente
       depois de a ficha receber uma data válida. */
    if(valorSaida&&!mesSaida) return false;
    if(cfg.ativo===false||cfg.clienteInativo===true||String(cfg.tipoCliente||'').toLowerCase()==='encerrado') return false;
    return true;
  }
function nomeDeSlugSeguro(slug){
    return (CLIENTES_LISTA.find(c => c.slug === slug) || {}).nome || slug;
  }
const snap=rows=>({forEach:f=>rows.forEach(x=>f({id:x.id,data:()=>x.data}))});const {configuracoes,porSlug,ativos}=projetarListaClientesI21(snap(extras),snap(configs));const catalogoCalendarios=[...porSlug.values()].filter(c=>{
        const slug=slugClienteCanonico(c.slug);
        if(CLIENTES_SEM_CALENDARIO_OPERACIONAL.has(slug)) return false;
        const cfg=configuracoes[slug]||{};
        const mensalistaOperacionalConfirmado=MENSALISTAS_OPERACIONAIS_CONFIRMADOS.has(slug);
        if(semCalendarioPorEntregaI117(cfg)) return false;
        const tipoCfg=String(cfg.tipoCliente||'').toLowerCase();
        const saidaDatada=!!dataOperacionalISO(cfg.dataSaida||cfg.saidaProgramadaPara||cfg.inativoDesde);
        const mensalistaEncerradoComHistorico=tipoCfg==='encerrado'&&saidaDatada;
        if(tipoCfg&&!['mensalista','encerrado'].includes(tipoCfg)&&!mensalistaOperacionalConfirmado) return false;
        if(tipoCfg==='encerrado'&&!mensalistaEncerradoComHistorico&&!mensalistaOperacionalConfirmado) return false;
        const tipoExtra=String(c.tipoOperacionalExtra||'').toLowerCase();
        /* `clientes_extras` antigos usavam castas genéricas como "outro".
           Isso não pode retirar um mensalista confirmado da Gabi. Avulso,
           interno e encerrado explícitos continuam soberanos. */
        if(!tipoCfg&&['avulso','interno','encerrado'].includes(tipoExtra)) return false;
        if(!tipoCfg&&tipoExtra&&tipoExtra!=='mensalista'&&!mensalistaOperacionalConfirmado) return false;
        if(FORA_DA_META_SEMENTE[normNomeCliente(c.nome)]==='cliente avulso') return false;
        if(tipoCfg==='mensalista'||mensalistaEncerradoComHistorico||tipoExtra==='mensalista'||mensalistaOperacionalConfirmado||c.config||c.compatibilidade) return true;
        return c.base===true;
      }).map(c=>({nome:c.nome,slug:slugClienteCanonico(c.slug)}))
        .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
return {configuracoes,porSlug:[...porSlug.values()],ativos,catalogo:catalogoCalendarios,carteira:competencia?catalogoCalendarios.filter(c=>clienteAtivoNaCompetenciaCalendarioV127(configuracoes[c.slug]||{},competencia)):catalogoCalendarios.filter(c=>{const cfg=configuracoes[c.slug]||{};return cfg.excluido!==true&&cfg.ativo!==false&&!clienteInativoEfetivo(cfg);})};
}
