// J112 — CP258 (22/11/2026, varredura de acúmulo, pedido do Chris: "acúmulo de coisas que ele armazena … que pesa"). Cada aprovação de vídeo
// (Amanda/Chris) e cada conferência de postagem (agendar, já postado, Stokki — Cecília) deixava um registro no armazenamento do navegador para
// SEMPRE, com a conferência inteira do servidor e um histórico que crescia a cada reabertura e que nenhuma tela lê. A lista é relida inteira
// a cada tela e, quando o espaço do navegador enche, a próxima tentativa não pode ser guardada ("Nada foi enviado").
// Esperado:
//  A (módulos, armazenamento simulado): saem os confirmados com a etapa seguinte feita (postagem: há mais de 7 dias); ficam os recentes,
//    os pendentes e os que ainda pedem conferência; o histórico local fica nos 5 últimos.
//  B (navegador real): a tela da Cecília (Postagens → Agendar) e a da Amanda (Gerência → Aprovar vídeos) limpam os confirmados antigos e
//    mantêm os pendentes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ } from '../lib/emulador.mjs';
import { entrarComo, foto, entrarGerencia } from '../lib/navegador.mjs';
export const id = 'J112';
export const nome = 'Aparelho sem acúmulo: tentativas já confirmadas saem do armazenamento; pendentes e rascunhos ficam';
const dia = 864e5;

function memoria() { const m = new Map(); return { get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; }

export async function executar({ amb, nav, erroGrave, registrar }) {
  const t0 = Date.now();
  // A) módulos com armazenamento simulado
  try {
    const imp = f => import(pathToFileURL(path.join(RAIZ, f)).href);
    const { criarFluxosPostagemI165 } = await imp('gs-postagem-controles-i165.mjs'), { criarFluxoAprovacaoI165 } = await imp('gs-operacional-ui-i165.mjs'), { jsonCanonicoI165 } = await imp('gs-contexto-operacional-i165.mjs');
    const agora = Date.now(), falhar = async () => { throw Error('fora do ar (ensaio)'); };
    const cec = { uid: 'u-cec', papel: 'Cecília', atorReal: 'Cecília', sessao: 's1', rota: 'r' }, donoC = jsonCanonicoI165([cec.uid, cec.papel, cec.atorReal]);
    const st = memoria(), kp = id => 'get_postagem_i165_v1_' + encodeURIComponent(jsonCanonicoI165([donoC, 'publicacao', id]));
    const pos = (id, x) => st.setItem(kp(id), JSON.stringify({ schema: 1, tipo: 'publicacao', id, dono: donoC, campos: {}, snapshot: null, estado: 'confirmada', intencao: { operacaoId: 'op_' + id }, continuidade: 'op_' + id, historico: [], ...x }));
    pos('j112postAntiga01', { enviadaEm: agora - 10 * dia }); pos('j112postRecente1', { enviadaEm: agora - dia }); pos('j112postPendent1', { estado: 'incerta', enviadaEm: agora - 10 * dia });
    pos('j112postFilaFal1', { continuidade: null, enviadaEm: agora - 10 * dia }); pos('j112postHistori1', { historico: Array.from({ length: 20 }, (_, i) => ({ i })), enviadaEm: agora - dia });
    const fp = criarFluxosPostagemI165({ contexto: () => cec, chamar: falhar, storage: st, novoId: () => 'x' });
    fp.listar(); await fp.abrir('publicacao', 'j112postHistori1').catch(() => {});
    const tem = id => st.getItem(kp(id)) !== null, hist = JSON.parse(st.getItem(kp('j112postHistori1')) || '{}').historico?.length;
    const okP = !tem('j112postAntiga01') && tem('j112postRecente1') && tem('j112postPendent1') && tem('j112postFilaFal1') && hist <= 5;
    const ama = { uid: 'u-ama', papel: 'Amanda', atorReal: 'Amanda', sessao: 's1', rota: 'r' }, donoA = jsonCanonicoI165([ama.uid, ama.papel, ama.atorReal]);
    const sa = memoria(), ka = id => 'get_i165_aprovacao_v1_' + encodeURIComponent(donoA) + '_' + encodeURIComponent(id);
    const apr = (id, x) => sa.setItem(ka(id), JSON.stringify({ schema: 1, videoId: id, dono: donoA, campos: {}, snapshot: null, intencao: { operacaoId: 'op_' + id }, estado: 'confirmada', continuidade: 'conferida', ...x }));
    apr('j112vidConfirm01'); apr('j112vidConferir1', { continuidade: 'conferir' }); apr('j112vidPendente1', { estado: 'incerta' }); apr('j112vidRascunho1', { estado: 'rascunho', intencao: null, aberta: true });
    const fa = criarFluxoAprovacaoI165({ contexto: () => ama, chamar: falhar, storage: sa, novoId: () => 'x' });
    fa.listarAbertas();
    const temA = id => sa.getItem(ka(id)) !== null;
    const okA = !temA('j112vidConfirm01') && temA('j112vidConferir1') && temA('j112vidPendente1') && temA('j112vidRascunho1');
    registrar({ jornada: id, caso: 'A1 postagem: sai o confirmado antigo; ficam recente, pendente e o que pede atualização; histórico ≤ 5', ok: okP, ms: Date.now() - t0,
      detalhe: `antigo ${tem('j112postAntiga01') ? 'FICOU' : 'saiu'} · recente ${tem('j112postRecente1') ? 'ficou' : 'SAIU'} · pendente ${tem('j112postPendent1') ? 'ficou' : 'SAIU'} · pede atualização ${tem('j112postFilaFal1') ? 'ficou' : 'SAIU'} · histórico ${hist}` });
    registrar({ jornada: id, caso: 'A2 aprovação: sai a confirmada e conferida; ficam a que pede conferência, a pendente e o rascunho', ok: okA, ms: Date.now() - t0,
      detalhe: `confirmada ${temA('j112vidConfirm01') ? 'FICOU' : 'saiu'} · pede conferência ${temA('j112vidConferir1') ? 'ficou' : 'SAIU'} · pendente ${temA('j112vidPendente1') ? 'ficou' : 'SAIU'} · rascunho ${temA('j112vidRascunho1') ? 'ficou' : 'SAIU'}` });
  } catch (e) { registrar({ jornada: id, caso: 'A módulos', ok: false, ms: Date.now() - t0, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }

  // B) navegador real: grava registros com o dono verdadeiro da sessão e abre a tela que lista as tentativas
  const casosB = [
    { pessoa: 'Cecília', abrir: async page => { await page.evaluate(() => irPara('postagens', document.getElementById('navPostagens'))); await page.evaluate(() => { try { setPostagensSub('agendar', null); } catch (e) {} }); },
      gravar: `const k=id=>'get_postagem_i165_v1_'+encodeURIComponent(j([dono,'publicacao',id]));const e=(id,x)=>localStorage.setItem(k(id),JSON.stringify({schema:1,tipo:'publicacao',id,dono,campos:{},snapshot:null,estado:'confirmada',intencao:{operacaoId:'op_'+id},continuidade:'op_'+id,historico:[],enviadaEm:Date.now()-10*864e5,...x}));
        e('j112BrowserVelh1');e('j112BrowserPend1',{estado:'incerta'});return {velho:k('j112BrowserVelh1'),fica:k('j112BrowserPend1')};` },
    { pessoa: 'Amanda', abrir: async page => { await entrarGerencia(page); await page.evaluate(() => navegarGerenciaSub('aprovarVideos')); },
      gravar: `const k=id=>'get_i165_aprovacao_v1_'+encodeURIComponent(dono)+'_'+encodeURIComponent(id);const e=(id,x)=>localStorage.setItem(k(id),JSON.stringify({schema:1,videoId:id,dono,campos:{},snapshot:null,intencao:{operacaoId:'op_'+id},estado:'confirmada',continuidade:'conferida',...x}));
        e('j112BrowserVelh1');e('j112BrowserPend1',{estado:'incerta'});return {velho:k('j112BrowserVelh1'),fica:k('j112BrowserPend1')};` }
  ];
  for (const c of casosB) {
    const t1 = Date.now(); const { page, erros, fechar } = await nav.novaPagina();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), c.pessoa); await page.waitForTimeout(3000);
      const chaves = await page.evaluate(async ([papel, corpo]) => {
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'), { getApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
        const { jsonCanonicoI165: j } = await import('/gs-contexto-operacional-i165.mjs');
        const dono = j([getAuth(getApp()).currentUser.uid, papel, window.atorRealDaSessao()]);
        return new Function('j', 'dono', corpo)(j, dono);
      }, [c.pessoa, c.gravar]);
      await c.abrir(page); await page.waitForTimeout(6000);
      const r = await page.evaluate(k => ({ velho: localStorage.getItem(k.velho) !== null, fica: localStorage.getItem(k.fica) !== null }), chaves);
      const graves = erros.filter(erroGrave);
      await foto(page, 'J112-' + c.pessoa.normalize('NFD').replace(/[^A-Za-z]/g, '').toLowerCase());
      registrar({ jornada: id, caso: `B ${c.pessoa}: a tela limpa o confirmado antigo e mantém o pendente`, ok: !r.velho && r.fica && !graves.length, ms: Date.now() - t1,
        detalhe: `confirmado antigo ${r.velho ? 'FICOU' : 'saiu'} · pendente ${r.fica ? 'ficou' : 'SAIU'}${graves.length ? ' · erro: ' + graves[0] : ''}` });
    } catch (e) { await foto(page, 'J112-falha'); registrar({ jornada: id, caso: `B ${c.pessoa}`, ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 300) }); }
    finally { await fechar(); }
  }
}
