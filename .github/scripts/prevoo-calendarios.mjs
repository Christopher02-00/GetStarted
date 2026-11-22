// Checagem prévia dos calendários (Programa Estabilidade, 21/11/2026 — pedido do Chris: "99% de assertividade e fluidez" ao fazer os
// calendários da equipe). SÓ LEITURA, com os dados reais. Para cada cliente da carteira de cada competência, roda o PRÓPRIO código do
// servidor (leitura do editor oficial I172, `central_editor_ler`) como o Chris e como a Amanda e confere:
//   preparação incluída · documento consolidado enviado · editor abre · o que o Chris pode fazer (iniciar/editar/enviar) ·
//   identidade dos conteúdos (sem itemId / repetido) · tamanho do documento do calendário (limite de 1 MiB do Firestore) ·
//   estado do mês · pedidos do cliente e ajustes internos em aberto no mês anterior.
// 🟩 pronto para o Chris · 🟨 esperando uma pessoa (diz quem e o quê) · 🟥 o sistema travaria (vermelho falha o run).
// Uso: node .github/scripts/prevoo-calendarios.mjs [2026-12,2027-01]   (GOOGLE_APPLICATION_CREDENTIALS só-leitura)
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { somenteLeitura } from './vigia-liberacao.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mod = f => import(pathToFileURL(path.join(RAIZ, 'functions-get', f)).href);
const LIMITE_DOC = 1048576, ALERTA_DOC = 700 * 1024, PERIGO_DOC = 900 * 1024;
// 'aprovado' é o estado final de uma correção aprovada pela Amanda: com o mês liberado de novo, ela já foi ao cliente (pedidosLiberadosCp112).
// Só conta como pendente enquanto o mês ainda espera a nova liberação.
const PEDIDO_ABERTO = ['pendente', 'rascunho', 'dependencia', 'enviado', 'devolvido'], INTERNO_FINAL = ['publicado', 'substituido', 'descartado', 'cancelado'];
const proxMes = (m, n = 1) => { const [a, b] = m.split('-').map(Number), d = new Date(Date.UTC(a, b - 1 + n, 1)); return d.toISOString().slice(0, 7); };

export async function prevooCalendarios(dbReal, { competencias, agora = new Date() } = {}) {
  const db = somenteLeitura(dbReal);
  const { operarEditorialCalendariosI172 } = await mod('editorial-calendarios-i172.mjs');
  const { abrirEnvelopeCentralR80 } = await mod('codec-central-r80.mjs');
  const { carteiraCanonicaI164 } = await mod('central/lib/gs-carteira-calendarios-i164.mjs');
  const equipe = (await dbReal.collection('usuarios_equipe').get()).docs.map(s => ({ email: s.id, ...s.data() }));
  const pessoa = nome => { const u = equipe.find(x => x.pessoa === nome && x.ativo !== false); return u ? { uid: u.uid || 'prevoo-' + nome, token: { email: u.email, email_verified: true, firebase: { sign_in_provider: 'google.com' } } } : null; };
  const atores = { Chris: pessoa('Chris'), Amanda: pessoa('Amanda') };
  const rows = q => q.docs.map(d => ({ id: d.id, data: d.data() }));
  const [extras, configs] = await Promise.all([dbReal.collection('clientes_extras').get(), dbReal.collection('clientes_config').get()]);
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora);
  const cals = new Map((await dbReal.collection('calendarios').get()).docs.map(s => [s.id, s]));
  const revs = (await dbReal.collection('revisoes_ajustes_cp112').get()).docs.map(s => s.data());
  const ints = (await dbReal.collection('calendarios_ajustes_internos_cp123').get()).docs.map(s => s.data());
  const { mesPorExtenso, somarMes } = await mod('lib/gs-estado-mes.mjs');
  // CP249: ciclo criado para um mês que já tinha passado (ex.: janeiro de 2026 enviado em 20/11/2026) — o documento "some" do mês certo
  const tsIso = v => typeof v === 'string' ? v : v?.toDate ? v.toDate().toISOString() : v?._seconds ? new Date(v._seconds * 1000).toISOString() : '';
  const mesBRT = iso => iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7) : '';
  const ciclosErrados = (await dbReal.collection('planejamento_social_i155').get()).docs.map(x => ({ id: x.id, ...x.data() }))
    .filter(c => { const cr = mesBRT(tsIso(c.criadoEm)); return cr && c.competencia < somarMes(cr, -1); });
  const linhas = [];
  for (const comp of competencias) {
    const carteira = carteiraCanonicaI164({ extras: rows(extras), configs: rows(configs), hoje, competencia: comp }).carteira.map(x => x.slug).sort();
    const anterior = proxMes(comp, -1);
    for (const slug of carteira) {
      const ciclo = comp + '__' + slug, l = { ciclo, cliente: slug, competencia: comp, nivel: 'verde', itens: [], quem: '' };
      const add = (nivel, txt, quem = '') => { l.itens.push((nivel === 'vermelho' ? '🟥 ' : nivel === 'amarelo' ? '🟨 ' : '') + txt); if (nivel === 'vermelho' || (nivel === 'amarelo' && l.nivel === 'verde')) l.nivel = nivel; if (quem && !l.quem) l.quem = quem; };
      // calendário: tamanho e identidade dos conteúdos (mês anterior e este)
      const cs = cals.get(slug), cal = cs?.exists ? cs.data() : null;
      if (cal) {
        const bytes = Buffer.byteLength(JSON.stringify(cal));
        if (bytes > PERIGO_DOC) add('vermelho', `calendário com ${Math.round(bytes / 1024)} KB (limite do banco ${Math.round(LIMITE_DOC / 1024)} KB): gravar o mês pode falhar`, 'conferência técnica');
        else if (bytes > ALERTA_DOC) add('amarelo', `calendário grande: ${Math.round(bytes / 1024)} KB de ${Math.round(LIMITE_DOC / 1024)} KB`, 'conferência técnica');
        for (const m of [anterior, comp]) {
          const its = (cal.items || []).filter(i => i && !i.excluido && (i.mes === m || (!i.mes && String(i.dataPostagem || '').startsWith(m))));
          const sem = its.filter(i => !i.itemId).length, ids = its.map(i => i.itemId).filter(Boolean), dup = [...new Set(ids.filter((x, k) => ids.indexOf(x) !== k))];
          if (sem) add('vermelho', `${sem} conteúdo(s) de ${m} sem identidade (itemId)`, 'Chris (Corrigir identidades)');
          if (dup.length) add('vermelho', `identidade repetida em ${m}: ${dup.slice(0, 3).join(', ')}`, 'conferência técnica');
        }
        // mês anterior: o que ainda está aberto
        const mAnt = cal.aprovacaoMeses?.[anterior];
        if (mAnt && ['ajuste_interno', 'aguardando_interna', 'aprovado_interno'].includes(mAnt.status)) add('amarelo', `${anterior} ainda em ${mAnt.status} (por ${mAnt.por || '?'})`, mAnt.status === 'ajuste_interno' ? 'Chris' : 'Amanda');
        const mesAntLiberado = ['liberado', 'arquivado'].includes(mAnt?.status), pAnt = revs.filter(r => r.ciclo === anterior + '__' + slug && (PEDIDO_ABERTO.includes(r.estado) || (r.estado === 'aprovado' && !mesAntLiberado))), iAnt = ints.filter(r => r.ciclo === anterior + '__' + slug && r.estado && !INTERNO_FINAL.includes(r.estado));
        if (pAnt.length) add('amarelo', `${pAnt.length} pedido(s) do cliente de ${anterior} em aberto (${[...new Set(pAnt.map(r => r.estado))].join(', ')})`, 'Chris/Amanda');
        if (iAnt.length) add('amarelo', `${iAnt.length} ajuste(s) interno(s) de ${anterior} em aberto`, 'Chris/Amanda');
      }
      // preparação (Amanda) e leitura do editor oficial como o Chris e como a Amanda
      const ps = await dbReal.doc('planejamento_social_i155/' + ciclo).get(), prep = ps.exists ? ps.data() : null;
      const legado = (await dbReal.doc('continuidade_calendarios_i164/' + ciclo).get()).data()?.ativo === true;
      l.processo = legado ? 'antigo' : 'novo';
      l.estado = cal?.aprovacaoMeses?.[comp]?.status || (prep ? 'preparação' : 'sem preparação');
      const errado = !prep && ciclosErrados.find(c => c.cliente === slug && c.competencia.slice(5) === comp.slice(5) && c.competencia < comp);
      if (!legado && errado) { const em = tsIso(errado.documentos?.enviadoEm || errado.criadoEm);
        add('amarelo', `o documento de ${mesPorExtenso(comp)} foi para ${mesPorExtenso(errado.competencia)}, um mês que já tinha passado (${errado.documentos?.consolidadoEnviado ? 'enviado' : 'incluído'} em ${em ? new Date(em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '?'} por ${errado.documentos?.enviadoPor || errado.autorNome || '?'})`, `Amanda (reenviar o documento em ${mesPorExtenso(comp)})`); linhas.push(l); continue; }
      if (!legado && !prep) { add('amarelo', 'preparação do mês ainda não incluída', 'Amanda (Planejamento Social Media → incluir o cliente no mês)'); linhas.push(l); continue; }
      if (!legado && prep && !prep.documentos?.consolidadoEnviado) add('amarelo', 'documento consolidado ainda não enviado ao Chris', 'Amanda (enviar o documento do mês)');
      for (const [nome, auth] of Object.entries(atores)) {
        if (!auth) { add('vermelho', `cadastro ativo de ${nome} não encontrado`, 'conferência técnica'); continue; }
        const pedido = { acao: 'central_editor_ler', ciclo, uidEsperado: auth.uid, atorRealEsperado: nome, papelOperado: nome, sessao: 'prevoo_' + nome, ...(legado ? { origemEditorial: 'continuar_legado' } : {}) };
        try {
          const dto = abrirEnvelopeCentralR80(await operarEditorialCalendariosI172(db, auth, pedido, { agora }));
          const cap = dto?.capacidades || {};
          if (nome === 'Chris') {
            l.chris = Object.entries(cap).filter(([, v]) => v === true).map(([k]) => k).join(', ') || 'só leitura';
            if (dto?.motivoRecusa) add('vermelho', 'editor recusa o Chris: ' + String(dto.motivoRecusa).slice(0, 200), 'conferência técnica');
            else if (!legado && prep?.documentos?.consolidadoEnviado && !cap.iniciar && !cap.editar && ['rascunho', 'ajuste_interno', undefined, ''].includes(cal?.aprovacaoMeses?.[comp]?.status))
              add('vermelho', 'documento enviado, mas o editor não deixa o Chris iniciar nem editar', 'conferência técnica');
          }
        } catch (e) {
          const msg = String(e?.message || e).slice(0, 220);
          const daPessoa = /Inclua a preparação|não pertence à carteira/.test(msg);
          add(daPessoa ? 'amarelo' : 'vermelho', `editor não abre para ${nome}: ${msg}`, daPessoa ? 'Amanda' : 'conferência técnica');
        }
      }
      linhas.push(l);
    }
  }
  return linhas;
}

export function relatorioPrevoo(linhas, agora = new Date()) {
  const ic = { vermelho: '🟥', amarelo: '🟨', verde: '🟩' }, t = [`# Checagem prévia dos calendários — ${agora.toISOString().slice(0, 16).replace('T', ' ')} UTC`, ''];
  for (const comp of [...new Set(linhas.map(l => l.competencia))]) {
    const ls = linhas.filter(l => l.competencia === comp);
    t.push(`## ${comp} — ${ls.filter(l => l.nivel === 'verde').length} pronto(s) · ${ls.filter(l => l.nivel === 'amarelo').length} esperando alguém · ${ls.filter(l => l.nivel === 'vermelho').length} travaria(m)`, '',
      '| | Cliente | Processo | Estado | O Chris pode | Pendências | Quem resolve |', '|---|---|---|---|---|---|---|');
    for (const l of ls.sort((a, b) => ['vermelho', 'amarelo', 'verde'].indexOf(a.nivel) - ['vermelho', 'amarelo', 'verde'].indexOf(b.nivel) || a.cliente.localeCompare(b.cliente)))
      t.push(`| ${ic[l.nivel]} | ${l.cliente} | ${l.processo || '—'} | ${l.estado || '—'} | ${l.chris || '—'} | ${l.itens.join('<br>').replace(/\|/g, '/') || '—'} | ${l.quem || '—'} |`);
    t.push('');
  }
  return t.join('\n');
}

async function main() {
  const req = createRequire(path.join(RAIZ, 'functions-get/package.json'));
  const { initializeApp, applicationDefault } = req('firebase-admin/app'), { getFirestore } = req('firebase-admin/firestore');
  initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: 'get-started-4956d' } : { credential: applicationDefault(), projectId: 'get-started-4956d' });
  const agora = new Date(), mesAtual = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora).slice(0, 7);
  const competencias = (process.argv[2] || [proxMes(mesAtual, 1), proxMes(mesAtual, 2)].join(',')).split(',').map(s => s.trim()).filter(s => /^20\d{2}-\d{2}$/.test(s));
  const linhas = await prevooCalendarios(getFirestore(), { competencias, agora }), texto = relatorioPrevoo(linhas, agora);
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + '\n');
  if (process.argv.includes('--json')) fs.writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(linhas, null, 1));
  if (linhas.some(l => l.nivel === 'vermelho')) { console.log('::error::há cliente em que o sistema travaria — veja o resumo'); process.exitCode = 1; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exitCode = 2; });
