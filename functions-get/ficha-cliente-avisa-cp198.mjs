// CP198 (decisão do Chris 10/11/2026) — mudar a ficha de informações do cliente depois que o documento do mês foi
// confirmado TRAVA o editor desse mês (guarda do CP183: a base precisa ser readotada). A trava fica; o que faltava era o
// aviso. Este gatilho (info_extras_cliente/{slug}) cria, na hora, UMA demanda para o Chris por mês afetado e versão da
// ficha: "A ficha do cliente mudou — readote o documento do mês para destravar".
import {hashI165} from './contexto.mjs';
import {retratoInfoClienteI164,mesmaInfoClienteI164} from './central/lib/gs-contexto-cliente-i164.mjs';
import {fonteDocumentoUnicoCp183} from './central/lib/gs-documento-unico-cp183.mjs';

const dataBr = d => d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

export async function avisarFichaClienteCp198(db, slug, antes, depois, { agora = new Date() } = {}) {
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(slug || '')) return { demandas: [] };
  const retratoAntes = retratoInfoClienteI164(!!antes, antes || {}), retratoDepois = retratoInfoClienteI164(!!depois, depois || {});
  if (mesmaInfoClienteI164(retratoAntes, retratoDepois)) return { demandas: [] };
  const ant = new Date(agora.getFullYear(), agora.getMonth() - 1, 1), mesMin = ant.getFullYear() + '-' + String(ant.getMonth() + 1).padStart(2, '0');
  const ciclos = await db.collection('planejamento_social_i155').where('cliente', '==', slug).get();
  const criadas = [];
  for (const s of ciclos.docs) {
    const c = s.data();
    if (!c || c.excluido === true || String(c.competencia || '') < mesMin) continue;
    let fonte = null; try { fonte = fonteDocumentoUnicoCp183(c); } catch { fonte = null; }
    if (!fonte?.infoCliente || mesmaInfoClienteI164(fonte.infoCliente, retratoDepois)) continue;
    const id = 'cp198_ficha_' + hashI165([slug, s.id, retratoDepois]).slice(0, 40), ref = db.doc('demandas/' + id);
    const nome = String(depois?.clienteNome || c.clienteNome || slug);
    const criada = await db.runTransaction(async tx => { const x = await tx.get(ref); if (x.exists) return false; tx.set(ref, {
      titulo: `Ficha do cliente mudou · ${nome} · ${c.competencia}`,
      descricao: `A ficha de informações de ${nome} foi alterada depois que o documento de ${c.competencia} foi confirmado. Por segurança, o editor desse mês fica travado até você readotar o documento com a ficha atual (Central → documentos do cliente → adotar o documento). O documento e o histórico continuam preservados.`,
      destinatario: 'Chris', remetente: 'Sistema', status: 'pendente', prazoData: dataBr(agora), prazoHora: '18:00', cliente: slug, criadoEm: agora.toISOString(), excluido: false,
      origemCp198: { schema: 1, ciclo: s.id, competencia: c.competencia } }); return true; });
    if (criada) criadas.push(id);
  }
  return { demandas: criadas };
}
