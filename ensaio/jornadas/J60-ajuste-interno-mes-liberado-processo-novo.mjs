// J60 — CP208 (12/11/2026, caso Fedalto 2026-12, decisão do Chris sobre a regra CP140): mês FUTURO liberado ao cliente pelo
// processo novo (I155) não aceitava conteúdo novo nem ajuste — só "Preparação para gravação". Continua a J06/J56 (Bluefit,
// dezembro liberado pelo processo novo). Caminho real, com as mesmas ações que a tela chama:
//  1. Chris abre o editor oficial de dezembro → o quadro é "Ajustes internos" e tem "+ Adicionar conteúdo interno a este mês".
//  2. Chris reserva a peça adicional (carrossel dia 8), salva o rascunho completo e envia para a Amanda.
//  3. Amanda aprova a peça e libera → o conteúdo novo entra no retrato liberado, na cópia do cliente e na entrega do ciclo.
//  4. O mês corrente (continuidade antiga) não muda: a J06/J36 seguem verdes na mesma bateria.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J60';
export const nome = 'Mês liberado do processo novo aceita conteúdo interno novo (rascunho → Amanda → cliente)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const NOVO = { day: 8, fmt: 'Carrossel', stage: 'Topo', name: 'Ensaio J60 — Carrossel de ventiladores', ref: '', referenciaDispensada: true,
  desc: 'Slide 1: o calor chegou. Slides 2 a 5: três ventiladores e para que serve cada um. Slide 6: chamada para a loja.',
  legenda: 'Calor de dezembro? Separamos os ventiladores certos para cada canto da casa. Passe na loja. (J60)', obs: 'Usar fotos reais da loja.', preparacaoGravacao: '' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const p = amb.portas, t0 = Date.now(), etapas = [];
  const fim = (caso, ok, detalhe) => registrar({ jornada: id, caso, ok, ms: Date.now() - t0, detalhe });
  const codec = await import(pathToFileURL(path.join(RAIZ, 'functions-get/codec-central-r80.mjs')).href);
  const contas = {};
  async function entrar(pessoa) {
    if (contas[pessoa]) return contas[pessoa];
    const email = EMAILS[pessoa], token = JSON.stringify({ sub: 'ensaio-' + email.replace(/[^a-z0-9]/gi, '-'), email, email_verified: true, name: pessoa });
    const r = await fetch(`http://127.0.0.1:${p.auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-api-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postBody: 'id_token=' + encodeURIComponent(token) + '&providerId=google.com', requestUri: 'http://localhost', returnSecureToken: true }) });
    const j = await r.json(); if (!j.idToken) throw new Error('login ' + pessoa + ': ' + JSON.stringify(j).slice(0, 200));
    return contas[pessoa] = { idToken: j.idToken, uid: j.localId };
  }
  let n = 0;
  const op = () => 'ensaio_j60_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j60_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp123$/, ''));
    return codec.abrirEnvelopeCentralR80(j.result);
  }

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56 (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();

  // 1. Tela: Chris abre o editor oficial de dezembro e vê "Ajustes internos" com "+ Adicionar conteúdo interno a este mês"
  {
    const { page, erros, fechar } = await nav.novaPagina(); const t1 = Date.now();
    try {
      page.on('dialog', d => d.accept());
      await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(2500);
      await page.waitForSelector('#navPlanejamentoPreparacaoR80', { timeout: 20000 }); await abrirMenuSeMovel(page); await page.click('#navPlanejamentoPreparacaoR80');
      await page.waitForFunction(() => { const v = document.getElementById('view-estrategiaCp109'); return v && getComputedStyle(v).display !== 'none' && v.innerText.trim().length > 50; }, null, { timeout: 20000 });
      const v = page.locator('#view-estrategiaCp109'); await v.locator('select').first().waitFor({ timeout: 20000 });
      await v.locator('select').first().selectOption({ label: NOME }); await v.locator('input[type=month]').first().fill(MES);
      await v.getByRole('button', { name: /Abrir cliente e mês/ }).click();
      await page.getByRole('button', { name: /^Abrir materiais do mês$/ }).click({ timeout: 20000 }); await page.waitForTimeout(3000);
      const aba = page.getByRole('button', { name: /^Criar e aprovar$/ }).first(); if (await aba.isVisible().catch(() => false)) { await aba.click(); await page.waitForTimeout(2500); }
      const ed = page.getByRole('button', { name: /^Abrir editor oficial nesta competência$/ }).first(); await ed.evaluate(el => el.scrollIntoView({ block: 'center' })); await ed.click();
      await page.waitForSelector('#planejamentoEditorI172 article', { timeout: 30000 });
      await page.waitForFunction(() => { const s = document.querySelector('.ai123'); return s && !/Conferindo os ajustes internos/.test(s.innerText); }, null, { timeout: 30000 }).catch(() => {});
      const r = await page.evaluate(() => { const s = document.querySelector('.ai123'); return { h2: s?.querySelector('h2')?.textContent || '(sem quadro)', adicionar: !!s?.querySelector('[data-action="preparar-adicional"]'), ajustar: /Iniciar um ajuste interno em conteúdo já liberado/.test(s?.innerText || '') }; });
      await foto(page, 'J60-chris-dezembro');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso: '1 Chris vê "Ajustes internos" em dezembro liberado (processo novo)', ok: r.h2 === 'Ajustes internos' && r.adicionar && r.ajustar && !graves.length, ms: Date.now() - t1,
        detalhe: `quadro "${r.h2}" · adicionar ${r.adicionar ? 'sim' : 'NÃO'} · ajustar ${r.ajustar ? 'sim' : 'NÃO'}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, 'J60-tela-falha'); registrar({ jornada: id, caso: '1 Chris vê "Ajustes internos" em dezembro liberado (processo novo)', ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    finally { await fechar(); }
  }

  // 2 e 3. Servidor: rascunho → envio → aprovação individual → liberação ao cliente
  try {
    let d = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    if (d.internosCp123?.adicionar !== true) { fim('2 peça adicional no processo novo', false, `o servidor não oferece a inclusão (adicionar=${d.internosCp123?.adicionar}, só preparação=${d.internosCp123?.preparacaoSomenteCp140 === true})`); return; }
    const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'A Amanda pediu um carrossel novo de ventiladores (J60).',
      esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === itemId); if (!a) throw new Error('rascunho não criado');
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: NOVO });
    a = d.internosCp123.ajustes.find(x => x.id === a.id);
    d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO }); a = d.internosCp123.ajustes.find(x => x.id === a.id);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '' });
    fim('2 Chris cria e envia a peça adicional; Amanda aprova', d.internosCp123.ajustes.find(x => x.id === a.id)?.estado === 'aprovado', etapas.join(' → '));
    d = await chamar('Amanda', 'central_editor_ler', { ciclo: CICLO });
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES], ciclo = await seed.get('planejamento_social_i155', CICLO);
    const noRetrato = m.retratoLiberadoV115?.items?.some(i => i.itemId === itemId && i.name === NOVO.name && i.day === 8);
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c?.items?.some(i => i && i.itemId === itemId) ? c : null; });
    const entrega = ciclo?.publicacaoAtual?.retrato?.publicadoEm === m.retratoLiberadoV115?.publicadoEm;
    const d2 = await chamar('Chris', 'central_editor_ler', { ciclo: CICLO });
    fim('3 Amanda libera: conteúdo novo no retrato, na cópia do cliente e na entrega do ciclo; o mês segue aceitando ajustes',
      m.status === 'liberado' && noRetrato && !!copia && entrega && d2.internosCp123?.adicionar === true,
      `mês ${m.status} · retrato ${noRetrato ? 'com o carrossel do dia 8' : 'SEM o conteúdo novo'} · cópia do cliente ${copia ? 'com o conteúdo' : 'SEM o conteúdo'} · publicação atual do ciclo ${entrega ? 'atualizada' : 'DIVERGENTE'} · nova inclusão ${d2.internosCp123?.adicionar ? 'disponível' : 'bloqueada'}`);
  } catch (e) { fim('2 peça adicional no processo novo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
}
