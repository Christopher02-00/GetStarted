// J133 — Limpeza 2027 (26/11/2026, decisão do Chris: "simplificar"). LZ5b: o Resumo Executivo e o Painel Operacional da Amanda ficam só
// com o que não existe em outra tela; o que repetia a aba Agora (ou contava por outra regra) sai. Esperado:
//  1. Resumo Executivo do Chris: "O que a Amanda decidiu", até quando, pedido pelo site, Radar, Backup completo e — logo depois do
//     backup — a conferência manual "Envio de arquivos" (I166, que morava na Saúde das Automações); sem semáforo, placar de calendários
//     e os cartões de extras / vídeos atrasados / atrasadas do time;
//  2. redesenhar o Resumo destrói a conferência anterior: continua UMA só;
//  3. o mesmo cockpit no Financeiro (sem organização) não leva a conferência de arquivos nem os cartões que saíram;
//  4. Painel Operacional da Amanda: pedidos para pular legenda (com Aprovar/Recusar), "você resolveu hoje", Radar; sem "Como está o
//     dia", carga por editor, vídeos por cliente, criar demanda, por funcionário, disciplina, calendários, folha de extras, pedidos de
//     prazo; o Resumo Executivo da Amanda não leva a conferência de arquivos (é do Chris).
// LZ5c — um número, uma regra (cada caso compara a mesma tela antes e depois do dado semeado):
//  1. pedido de novo prazo guardado numa demanda já aprovada não conta no Agora nem na badge da Gerência (regra da Aprovações);
//  2. "vídeo atrasado" é o prazo gravado (`videoAtrasado`): a reatribuição rápida não traz o vídeo que só tinha prazo inventado;
//  3. "você resolveu hoje" conta a aprovação da Amanda (`eventoFinalDemandaI119`);
//  4. "esperando outros" do editor conta o que ele entregou (aprovação interna / cliente);
//  5. Meu Dia do filmmaker: só as gravações da equipe dele (`pessoaNaEquipe`);
//  6. Resumo do Dia: "gravações hoje" conta como o Agora (a realizada também);
//  7. Agora: o bloco Agenda diz que os 7 dias são de postagens.
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J133';
export const nome = 'Resumo Executivo e Painel da Amanda sem o que repete o Agora (LZ5b) e números com uma regra só (LZ5c)';

const SAI_RESUMO = [/Saúde geral da operação/, /extra\(s\) da folha/, /vídeo\(s\) atrasado\(s\)/, /atrasada\(s\) no time/, /Calendários do mês/];
const SAI_PAINEL = [/Como está o dia/, /Carga por editor/, /Vídeos por Cliente/, /Criar nova demanda/, /Por funcionário/, /Disciplina de hoje/,
  /Calendários do mês/, /Folha de extras/, /Pedidos de novo prazo/, /Aprovações Pendentes/, /Em aberto no total/];

async function abrirSub(page, sub, pronto) {
  await page.evaluate(s => setGerenciaSub(s, document.querySelector(`.subtab[data-sub="${s}"]`)), sub);
  await page.waitForFunction(pronto, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
}

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const t0 = Date.now(), fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const agora = new Date().toISOString();
  const pular = { titulo: '🙋 Decisão sua: liberar pular a legenda? — J133', descricao: 'Ensaio J133: a Gabi pede para pular a legenda.', destinatario: 'Amanda',
    origem: 'gabrielle', status: 'pendente', tipoEspecial: 'pular_legenda', postagemId: 'p-hitech-1', prazoData: '2026-12-20', prazoHora: '18:00', criadoEm: agora, excluido: false };
  await seed.set('demandas', 'j133-pular', pular);
  try {
    // ---- 1 a 3: Chris
    {
      const { page, erros, fechar } = await nav.novaPagina();
      try {
        page.on('dialog', d => d.accept());
        await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000); await entrarGerencia(page);
        const prontoResumo = () => !!document.querySelector('#gerenciaChris #btnBackupCompleto') && !!document.querySelector('#gerenciaChris [data-saude-midia-i166] [data-conferir]');
        await abrirSub(page, 'chris', prontoResumo);
        const r = await page.evaluate(() => {
          const c = document.getElementById('gerenciaChris'), t = c.innerText;
          const backup = c.querySelector('#btnBackupCompleto')?.closest('.card'), midia = c.querySelector('[data-saude-midia-i166]');
          return { t, depois: !!(backup && midia && (backup.compareDocumentPosition(midia) & Node.DOCUMENT_POSITION_FOLLOWING)), radar: !!c.querySelector('.radar-i110'),
            conferencias: c.querySelectorAll('[data-saude-midia-i166] [data-conferir]').length };
        });
        const fica = [/O que a Amanda decidiu/, /Até quando cada cliente tem postagem/, /pedido\(s\) pelo site em aberto/, /Backup completo/, /Envio de arquivos/];
        const faltam = fica.filter(re => !re.test(r.t)).map(String), sobram = SAI_RESUMO.filter(re => re.test(r.t)).map(String);
        await foto(page, 'J133-resumo-chris');
        fim('LZ5b 1 Resumo Executivo do Chris: fica o que é único (com "Envio de arquivos" logo depois do backup), sai o que repete o Agora',
          !faltam.length && !sobram.length && r.depois && r.radar && r.conferencias === 1,
          `faltam: ${faltam.join(', ') || '—'} · sobram: ${sobram.join(', ') || '—'} · conferência depois do backup: ${r.depois} · Radar: ${r.radar}`);
        // 2: redesenha duas vezes; a conferência antiga é destruída (continua uma)
        await abrirSub(page, 'chris', prontoResumo);
        await abrirSub(page, 'chris', prontoResumo);
        const n = await page.evaluate(() => ({ dentro: document.querySelectorAll('#gerenciaChris [data-saude-midia-i166] [data-conferir]').length,
          total: [...document.querySelectorAll('h2')].filter(h => /Envio de arquivos/.test(h.textContent)).length }));
        fim('LZ5b 2 redesenhar o Resumo não duplica a conferência de arquivos', n.dentro === 1 && n.total === 1, `${n.dentro} no Resumo · ${n.total} na página`);
        // 3: o Financeiro usa o mesmo cockpit, sem organização
        const fin = await page.evaluate(async () => { const d = document.createElement('div'); d.innerHTML = await htmlCockpitCompleto({ organizacao: false }); return d.innerText; });
        const sobramFin = [...SAI_RESUMO, /Envio de arquivos/, /Até quando cada cliente/].filter(re => re.test(fin)).map(String);
        fim('LZ5b 3 Financeiro (mesmo cockpit, sem organização): backup e Radar ficam; nada do que saiu, sem a conferência de arquivos',
          /Backup completo/.test(fin) && /Radar/.test(fin) && !sobramFin.length, `sobram: ${sobramFin.join(', ') || '—'}`);
        const graves = erros.filter(erroGrave);
        if (graves.length) fim('LZ5b Chris sem erro grave', false, graves[0].slice(0, 200));
      } finally { await fechar(); }
    }
    // ---- 4: Amanda
    {
      const { page, erros, fechar } = await nav.novaPagina();
      try {
        page.on('dialog', d => d.accept());
        await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000); await entrarGerencia(page);
        await abrirSub(page, 'amanda', () => /você resolveu hoje/.test(document.getElementById('gerenciaAmanda')?.innerText || '') && !!document.querySelector('#gerenciaAmanda .radar-i110'));
        const p = await page.evaluate(() => { const c = document.getElementById('gerenciaAmanda'); const item = [...c.querySelectorAll('.item')].find(i => /J133/.test(i.innerText));
          return { t: c.innerText, botoes: item ? [...item.querySelectorAll('button')].map(b => b.textContent.trim()) : [] }; });
        const sobram = SAI_PAINEL.filter(re => re.test(p.t)).map(String);
        const pularOk = /Pedidos pra pular legenda/.test(p.t) && p.botoes.some(b => /Aprovar/.test(b)) && p.botoes.some(b => /Recusar/.test(b));
        await foto(page, 'J133-painel-amanda');
        await abrirSub(page, 'chris', () => !!document.querySelector('#gerenciaChris #btnBackupCompleto'));
        const midiaAmanda = await page.evaluate(() => document.querySelectorAll('#gerenciaChris [data-saude-midia-i166] [data-conferir]').length);
        fim('LZ5b 4 Painel da Amanda: pular legenda (Aprovar/Recusar), "você resolveu hoje" e Radar ficam; sai o que repete o Agora; Resumo da Amanda sem a conferência de arquivos',
          pularOk && !sobram.length && midiaAmanda === 0, `pular legenda: ${pularOk ? 'ok' : 'NÃO'} (${p.botoes.join(' / ') || 'sem item'}) · sobram: ${sobram.join(', ') || '—'} · conferência no Resumo da Amanda: ${midiaAmanda}`);
        const graves = erros.filter(erroGrave);
        if (graves.length) fim('LZ5b Amanda sem erro grave', false, graves[0].slice(0, 200));
      } finally { await fechar(); }
    }
    // ======== LZ5c — números com uma regra só (cada caso compara a mesma tela antes e depois do dado semeado) ========
    const hojeSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const ontemSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() - 86400000));
    const dias = n => new Date(Date.now() + n * 86400000).toISOString();
    const lerAmanda = async page => {
      await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
      // a badge da Gerência é recalculada quando Minhas Demandas desenha
      await page.evaluate(() => irPara('minhasDemandasAtribuidas', document.getElementById('navMinhasDemandasAtribuidas')));
      await page.waitForTimeout(6000);
      const badge = await page.evaluate(() => { const b = document.getElementById('badgeGerencia'); return b && b.style.display !== 'none' ? Number(b.textContent) || 0 : 0; });
      await entrarGerencia(page);
      await page.waitForFunction(() => /Esperando você decidir/i.test(document.getElementById('gerenciaAgora')?.textContent || '') && /Agenda/.test(document.getElementById('gerenciaAgora')?.textContent || ''), null, { timeout: 60000 });
      await page.waitForTimeout(3000);
      const agora = await page.evaluate(() => { const c = document.getElementById('gerenciaAgora');
        return { prazosJ133: [...c.querySelectorAll('.item')].filter(i => /pediu novo prazo/.test(i.innerText) && /J133/.test(i.innerText)).length, texto: c.innerText }; });
      await abrirSub(page, 'amanda', () => /você resolveu hoje/.test(document.getElementById('gerenciaAmanda')?.innerText || '') && !!document.querySelector('#gerenciaAmanda .radar-i110'));
      const painel = await page.evaluate(() => { const c = document.getElementById('gerenciaAmanda');
        const card = [...c.querySelectorAll('.resumoCard')].find(x => /você resolveu hoje/i.test(x.textContent)); // o rótulo é maiúsculo por CSS
        return { resolveu: Number(card?.querySelector('.num')?.textContent), reatrib: [...c.querySelectorAll('.item')].map(i => i.innerText).filter(t => /J133/.test(t)) }; });
      await abrirSub(page, 'videos', () => [...document.querySelectorAll('#gerenciaVideos .resumoCard')].some(x => /Helo · pra editar/.test(x.textContent)));
      const esperando = await page.evaluate(() => { const c = [...document.querySelectorAll('#gerenciaVideos .resumoCard')].find(x => /Helo · pra editar/.test(x.textContent));
        const d = c && [...c.querySelectorAll('div')].find(x => /esperando outros/.test(x.textContent)); return d ? parseInt(d.textContent, 10) : NaN; });
      return { badge, ...agora, ...painel, esperando };
    };
    const totalMeuDia = async page => {
      await entrarComo(page, amb.url(), 'Luís'); await page.waitForTimeout(3000);
      await page.waitForFunction(() => /no total|Nenhuma pendência/.test(document.getElementById('meuDiaBox')?.innerText || ''), null, { timeout: 45000 });
      await page.waitForTimeout(2500);
      return page.evaluate(() => { const t = document.getElementById('meuDiaBox').innerText; const m = t.match(/(\d+) no total/); return m ? Number(m[1]) : 0; });
    };
    const semeadosLz5c = {};
    const semear = async (col, idDoc, dados) => { semeadosLz5c[col + '/' + idDoc] = [col, idDoc, dados]; await seed.set(col, idDoc, dados); };
    try {
      let A, L1;
      { const p = await nav.novaPagina(); try { p.page.on('dialog', d => d.accept()); A = await lerAmanda(p.page); } finally { await p.fechar(); } }
      { const p = await nav.novaPagina(); try { L1 = await totalMeuDia(p.page); } finally { await p.fechar(); } }
      const dem = (titulo, extra) => ({ titulo, descricao: 'Ensaio J133', destinatario: 'Helo', origem: 'amanda', remetente: 'Amanda', status: 'pendente',
        prazoData: '2026-12-10', prazoHora: '19:00', criadoEm: dias(-6), excluido: false, ...extra });
      await semear('demandas', 'j133-prazo-aberto', dem('Roteiro do mês J133 (pedido aberto)', { prazoSolicitado: '2026-12-18', prazoSolicitadoPor: 'Helo', motivoPrazo: 'Ensaio J133' }));
      await semear('demandas', 'j133-prazo-resolvido', dem('Arte antiga J133 (pedido já resolvido)', { status: 'aprovada', prazoSolicitado: '2026-12-19', prazoSolicitadoPor: 'Helo',
        concluidaEm: dias(-3), aprovadoPor: 'Chris', aprovadoEm: dias(-3) }));
      await semear('demandas', 'j133-aprovada-hoje', dem('Capa aprovada hoje J133', { destinatario: 'Gabrielle', status: 'aprovada', concluidaEm: dias(-1), provaTexto: 'Feito (J133)',
        aprovadoPor: 'Amanda', aprovadoEm: new Date().toISOString() }));
      const vid = (titulo, status, extra) => ({ cliente: 'zeiss', clienteNome: 'Zeiss', titulo, status, data: ontemSP, editorAtribuido: 'Helo', editorAtribuidoEm: dias(-4),
        editorAtribuidoPor: 'Amanda', criadoEm: dias(-5), excluido: false, nivelEscalonamento: 0, ...extra });
      await semear('videos_producao', 'j133-vid-sem-prazo', vid('Correção sem prazo J133', 'correcao', { correcaoSolicitadaEm: dias(-3), correcaoSolicitadaPor: 'Chris', motivoCorrecao: 'Ajuste (J133)' }));
      await semear('videos_producao', 'j133-vid-vencido', vid('Edição com prazo vencido J133', 'aguardando_edicao', { prazoEntrega: ontemSP }));
      await semear('videos_producao', 'j133-vid-cliente', vid('Entregue ao cliente J133', 'aguardando_cliente', { enviadoEm: dias(-2), aprovadoInternoEm: dias(-1), aprovadoPor: 'Amanda' }));
      const grav = (cliente, clienteNome, hora, quem, extra) => ({ cliente, clienteNome, data: hojeSP, hora, filmmaker: quem, equipe: [{ nome: quem, papel: 'Filmmaker' }],
        status: 'agendado', aprovado: true, qtdVideosPlanejados: 2, criadoEm: dias(-2), excluido: false, ...extra });
      await semear('agendamentos', 'j133-grav-luis', grav('bluefit', 'Bluefit', '06:13', 'Luís'));
      await semear('agendamentos', 'j133-grav-nathan', grav('mochi', 'Mochi', '06:47', 'Nathan'));
      await semear('agendamentos', 'j133-grav-realizada', grav('hitech', 'Hitech', '06:29', 'Nathan', { status: 'realizado', qtdVideosRealizados: 2, finalizadoEm: dias(0) }));
      await new Promise(r => setTimeout(r, 6000));   // deixa os gatilhos dos vídeos e gravações semeados terminarem
      let B, L2, resumoDia, esperado;
      { const p = await nav.novaPagina(); try { p.page.on('dialog', d => d.accept()); B = await lerAmanda(p.page);
          // o Resumo do Dia é refeito com os dados de agora (botão 🔄 Atualizar do Início)
          await p.page.evaluate(() => atualizarResumoDiarioAgora()); await p.page.waitForTimeout(4000);
          resumoDia = (await seed.get('resumos_diarios', hojeSP))?.numeros?.gravacoesHoje;
          esperado = (await seed.listar('agendamentos')).filter(a => a.data === hojeSP && a.excluido !== true && a.status !== 'cancelado' && a.status !== 'concluido_sem_gravacao' && a.aprovado !== false).length;
          await foto(p.page, 'J133-lz5c-amanda');
        } finally { await p.fechar(); } }
      { const p = await nav.novaPagina(); try { L2 = await totalMeuDia(p.page); await foto(p.page, 'J133-lz5c-luis'); } finally { await p.fechar(); } }
      fim('LZ5c 1 "Pediu novo prazo": pedido de demanda já aprovada não conta no Agora nem na badge da Gerência (regra da Aprovações)',
        B.prazosJ133 === 1 && B.badge === A.badge + 1, `Agora: ${B.prazosJ133} pedido(s) J133 (esperado 1) · badge ${A.badge} → ${B.badge} (esperado +1)`);
      const reatribOk = B.reatrib.some(t => /prazo vencido J133/.test(t)) && !B.reatrib.some(t => /sem prazo J133/.test(t));
      fim('LZ5c 2 "Vídeo atrasado" é o prazo gravado: a reatribuição rápida tem o vencido e não o que só tinha prazo inventado',
        reatribOk, `itens J133 no painel: ${B.reatrib.map(t => t.split('\n')[0]).join(' | ') || 'nenhum'}`);
      fim('LZ5c 3 "Você resolveu hoje" conta a aprovação da Amanda', B.resolveu === A.resolveu + 1, `${A.resolveu} → ${B.resolveu} (esperado +1)`);
      fim('LZ5c 4 "Esperando outros" do editor conta o que ele entregou (aprovação interna/cliente)', B.esperando === A.esperando + 1 && B.esperando >= 1,
        `Helo: ${A.esperando} → ${B.esperando} (esperado +1)`);
      fim('LZ5c 5 Meu Dia do filmmaker: só as gravações da equipe dele', L2 === L1 + 1, `Luís: ${L1} → ${L2} itens (semeadas 1 dele e 1 do Nathan; esperado +1)`);
      fim('LZ5c 6 Resumo do Dia: "gravações hoje" conta como o Agora (a realizada também)', resumoDia === esperado, `resumo ${resumoDia} · banco ${esperado}`);
      fim('LZ5c 7 Agora: o bloco Agenda diz que os 7 dias são de postagens', /postagens agendadas para os próximos 7 dias/i.test(B.texto) && /Postagens nos próximos 7 dias/i.test(B.texto),
        /postagens agendadas para os próximos 7 dias/.test(B.texto) ? 'rótulo ok' : 'rótulo antigo');
    } finally {
      for (const [col, idDoc, dados] of Object.values(semeadosLz5c))
        await seed.set(col, idDoc, { ...dados, excluido: true, excluidoPor: 'ensaio J133', excluidoEm: new Date().toISOString() }).catch(() => {});
    }
  } catch (e) { fim('J133 execução', false, String(e).replace(/\s+/g, ' ').slice(0, 300)); }
  finally {
    // o pedido da jornada não fica na fila de quem vem depois
    await seed.set('demandas', 'j133-pular', { ...pular, excluido: true, excluidoPor: 'ensaio J133', excluidoEm: new Date().toISOString() }).catch(() => {});
  }
}
