// J60e — CP226 (18/11/2026, caso Camargo's 2026-12, decisão do Chris sobre a regra CP208): no mês liberado do processo novo
// (I155) o ajuste interno só corrigia roteiro, legenda e edição; "Substituir conteúdo" existia só na continuidade antiga.
// Continua a J60/J60b/J60d (Bluefit, dezembro liberado pelo processo novo). Caminho real, com as mesmas ações da tela:
//  1. Tela: Chris abre o editor oficial de dezembro → o tipo "Substituir conteúdo" aparece no ajuste interno.
//  2. Servidor: Chris substitui um conteúdo (título, formato, referência, textos e data dia N → N-1), envia; Amanda aprova.
//  3. Servidor: um ajuste comum já APROVADO vira substituição no mesmo registro (mesmo id, histórico, textos), volta a
//     rascunho; Chris troca título, formato e data, envia; Amanda aprova de novo.
//  4. Contraprova: a Amanda não transforma ajuste (só o Chris, autor).
//  5. Amanda libera → título, formato, dia e data de postagem novos no retrato liberado e na cópia do cliente.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, PROJETO } from '../lib/emulador.mjs';
import { entrarComo, foto, abrirMenuSeMovel } from '../lib/navegador.mjs';
export const id = 'J60e';
export const nome = 'Processo novo: substituir conteúdo e transformar ajuste comum em substituição (título, formato, data)';
const CLIENTE = 'bluefit', NOME = 'Bluefit', MES = '2026-12', CICLO = `${MES}__${CLIENTE}`;
const EMAILS = { Chris: 'christopherveloso0@gmail.com', Amanda: 'amandachamorrosm@gmail.com' };
const esperar = async (fn, ms = 25000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };
const dataDe = dia => `${MES}-${String(dia).padStart(2, '0')}`;

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
  const op = () => 'ensaio_j60e_' + String(++n).padStart(3, '0');
  async function chamar(pessoa, acao, dados = {}) {
    const c = await entrar(pessoa);
    const r = await fetch(`http://127.0.0.1:${p.functions}/${PROJETO}/southamerica-east1/programacaoIndependenteGetI165`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + c.idToken },
      body: JSON.stringify({ data: { acao, ...dados, uidEsperado: c.uid, atorRealEsperado: pessoa, papelOperado: pessoa, sessao: 'ensaio_j60e_' + pessoa } }) });
    const j = await r.json(); if (j.error) throw new Error(acao + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 300));
    etapas.push(pessoa + ':' + acao.replace(/^central_editor_(interno_)?/, '').replace(/_cp(123|226)$/, ''));
    const d = codec.abrirEnvelopeCentralR80(j.result);
    if (d?.motivoRecusa) throw new Error(acao + ' recusado: ' + d.motivoRecusa);
    return d;
  }
  const ler = pessoa => chamar(pessoa, 'central_editor_ler', { ciclo: CICLO });
  const ajuste = (d, idA) => d.internosCp123.ajustes.find(x => x.id === idA);

  const cal0 = await seed.get('calendarios', CLIENTE);
  if (cal0?.aprovacaoMeses?.[MES]?.status !== 'liberado' || !(await seed.get('planejamento_social_i155', CICLO))) { fim('preparação', false, 'depende da J06/J56 (dezembro liberado pelo processo novo)'); return; }
  await amb.aguardarFunctionsOciosas?.();

  // 1. Tela: o tipo "Substituir conteúdo" aparece no ajuste interno do processo novo
  {
    const { page, erros, fechar } = await nav.novaPagina(); const t1 = Date.now(), caso = '1 Chris vê "Substituir conteúdo" no ajuste interno do processo novo';
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
      const r = await page.evaluate(() => { const s = document.querySelector('.ai123'), sel = s?.querySelector('select[data-start="tipoAjuste"]'); return { h2: s?.querySelector('h2')?.textContent || '(sem quadro)', tipos: sel ? [...sel.options].map(o => o.value) : null }; });
      await foto(page, 'J60e-chris-dezembro');
      const graves = erros.filter(erroGrave);
      registrar({ jornada: id, caso, ok: r.h2 === 'Ajustes internos' && !!r.tipos?.includes('substituicao_cp129') && !graves.length, ms: Date.now() - t1,
        detalhe: `quadro "${r.h2}" · tipos: ${r.tipos ? r.tipos.map(x => x || 'corrigir').join(', ') : 'sem seletor'}` + (graves.length ? ' | ' + graves[0] : '') });
    } catch (e) { await foto(page, 'J60e-tela-falha'); registrar({ jornada: id, caso, ok: false, ms: Date.now() - t1, detalhe: String(e).replace(/\s+/g, ' ').slice(0, 400) }); }
    finally { await fechar(); }
  }

  // 2 a 5. Servidor
  let A, B, novoA, novoB;
  try {
    let d = await ler('Chris');
    // Peças próprias da J60e (os conteúdos de dezembro são usados por outras jornadas pelo título): duas peças adicionais
    // liberadas pelo caminho da CP142 viram os alvos A e B.
    const proprias = [];
    for (const [dia, nome] of [[12, 'Ensaio J60e — Peça A'], [15, 'Ensaio J60e — Peça B']]) {
      const itemId = 'adicional_cp142_' + [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
      d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId, motivo: 'Peça de apoio da J60e.',
        esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'adicao_cp142' });
      let x = d.internosCp123.ajustes.find(r => r.itemId === itemId);
      d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, conteudo: { day: dia, fmt: 'Reel', stage: 'Topo', name: nome, ref: '', referenciaDispensada: true,
        desc: 'Abre na loja com o calor. Mostra os ventiladores em uso. Fecha com o convite para visitar.', legenda: 'Calor de dezembro? Venha conhecer os ventiladores na loja e escolha o seu.', obs: 'Imagens reais da loja.', preparacaoGravacao: '' } });
      x = ajuste(d, x.id);
      d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id });
      d = await ler('Amanda'); x = ajuste(d, x.id);
      d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: x.assinatura, ajusteId: x.id, decisao: 'aprovar', motivo: '' });
      d = await ler('Chris'); proprias.push(itemId);
    }
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    d = await ler('Chris');
    const aptos = (d.internosCp123?.aptos || []).filter(i => proprias.includes(i.itemId)).sort((a, b) => b.dia - a.dia);
    if (aptos.length < 2) { fim('2 substituição no processo novo', false, `as peças próprias da J60e não ficaram aptas (${aptos.length})`); return; }
    A = aptos[0]; B = aptos[1];
    novoA = { name: 'Ensaio J60e — Ventilador ou climatizador: qual escolher', fmt: 'Carrossel', ref: 'https://www.instagram.com/p/ensaioJ60eA/', day: A.dia - 1 };
    novoB = { name: 'Ensaio J60e — Três jeitos de refrescar a sala', fmt: 'Reel', day: B.dia - 1 };

    // 2. Substituição nova
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId: A.itemId,
      motivo: 'O cliente trocou a ideia do dia; substituir título, formato e data (J60e).', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash, tipoAjuste: 'substituicao_cp129' });
    let a = d.internosCp123.ajustes.find(x => x.itemId === A.itemId && x.tipoAjuste === 'substituicao_cp129'); if (!a) throw new Error('substituição não criada');
    const temFmt = Object.hasOwn(a.conteudo, 'fmt');
    const conteudoA = { ...a.conteudo, name: novoA.name, fmt: novoA.fmt, ref: novoA.ref,
      desc: 'Slide 1: calor em casa? Slide 2: ventilador move o ar. Slide 3: climatizador umidifica. Slide 4: qual combina com o seu cômodo. Slide 5: chame na loja.',
      legenda: 'Ventilador ou climatizador? Depende do cômodo e do clima. Deslize e descubra qual combina com a sua casa neste verão.',
      obs: 'Fotos reais da loja, uma por slide, fundo claro.', day: novoA.day, dataPostagem: dataDe(novoA.day), dataFlexivel: false };
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, conteudo: conteudoA, confirmacaoEditorial: true });
    a = ajuste(d, a.id);
    d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id });
    d = await ler('Amanda'); a = ajuste(d, a.id);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: a.assinatura, ajusteId: a.id, decisao: 'aprovar', motivo: '', confirmarSubstituicaoCp129: true });
    a = ajuste(d, a.id);
    fim('2 Chris substitui título, formato, referência, textos e data; Amanda aprova', a?.estado === 'aprovado' && temFmt && a.conteudo.fmt === novoA.fmt && a.dia === novoA.day,
      `estado ${a?.estado} · formato no rascunho ${temFmt ? 'sim' : 'NÃO'} · dia ${a?.diaOriginal}→${a?.dia}`);

    // 3. Ajuste comum aprovado vira substituição no mesmo registro
    d = await ler('Chris');
    d = await chamar('Chris', 'central_editor_interno_iniciar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, itemId: B.itemId,
      motivo: 'Trocar o conteúdo deste dia pelo roteiro novo (J60e).', esperadaRevisao: d.ciclo.revisao, publicacaoHash: d.internosCp123.publicacaoHash });
    let b = d.internosCp123.ajustes.find(x => x.itemId === B.itemId && !x.tipoAjuste); if (!b) throw new Error('ajuste comum não criado');
    const textosB = { ...b.conteudo, desc: 'Abre na sala quente. Liga o ventilador de teto, depois o de coluna, depois o climatizador. Fecha com a família no sofá.',
      legenda: 'Três jeitos de deixar a sala fresquinha neste verão. Qual é o seu? Passe na loja e teste antes de levar.', obs: 'Cortes rápidos a cada aparelho; som ambiente.' };
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: b.id, conteudo: textosB });
    b = ajuste(d, b.id);
    d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: b.id });
    d = await ler('Amanda'); b = ajuste(d, b.id);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: b.id, decisao: 'aprovar', motivo: '' });
    b = ajuste(d, b.id);
    // 4. Contraprova: a Amanda não transforma
    let barrada = '';
    try { await chamar('Amanda', 'central_editor_interno_converter_cp226', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: b.id }); } catch (e) { barrada = String(e.message || e); }
    d = await ler('Chris'); b = ajuste(d, b.id);
    const versaoAntes = b.versao, idB = b.id, conv = b.capacidades?.converterCp226 === true;
    d = await chamar('Chris', 'central_editor_interno_converter_cp226', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: b.id });
    b = ajuste(d, idB);
    const mesmo = !!b && b.tipoAjuste === 'substituicao_cp129' && b.estado === 'rascunho' && b.versao === versaoAntes + 1 && ['desc', 'legenda', 'obs'].every(k => b.conteudo[k] === textosB[k]) && Object.hasOwn(b.conteudo, 'fmt');
    const conteudoB = { ...b.conteudo, name: novoB.name, fmt: novoB.fmt, day: novoB.day, dataPostagem: dataDe(novoB.day), dataFlexivel: false };
    d = await chamar('Chris', 'central_editor_interno_salvar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: idB, conteudo: conteudoB, confirmacaoEditorial: true });
    b = ajuste(d, idB);
    d = await chamar('Chris', 'central_editor_interno_enviar_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: idB });
    d = await ler('Amanda'); b = ajuste(d, idB);
    d = await chamar('Amanda', 'central_editor_interno_decidir_cp123', { ciclo: CICLO, operacao: op(), assinaturaEsperada: b.assinatura, ajusteId: idB, decisao: 'aprovar', motivo: '', confirmarSubstituicaoCp129: true });
    b = ajuste(d, idB);
    fim('3 ajuste comum aprovado vira substituição no mesmo registro; Chris troca título, formato e data; Amanda aprova de novo',
      conv && mesmo && b?.estado === 'aprovado' && b.dia === novoB.day,
      `botão ${conv ? 'oferecido' : 'NÃO oferecido'} · mesmo registro com os textos ${mesmo ? 'sim' : 'NÃO'} · estado ${b?.estado} · dia ${b?.diaOriginal}→${b?.dia}`);
    fim('4 contraprova: a Amanda não transforma o ajuste do Chris', /Somente o Chris/.test(barrada), barrada ? barrada.slice(0, 160) : 'a Amanda conseguiu transformar');

    // 5. Liberação ao cliente
    d = await ler('Amanda');
    await chamar('Amanda', 'central_editor_decidir', { ciclo: CICLO, operacao: op(), assinaturaEsperada: d.assinatura, esperadaRevisao: d.ciclo.revisao, decisao: 'publicar', motivo: '',
      assinaturaAjustesCp112: d.ajustesCp112.assinatura, assinaturaInternosCp123: d.internosCp123.assinatura });
    const cal = await seed.get('calendarios', CLIENTE), m = cal.aprovacaoMeses[MES];
    const confere = (itens, it, nv) => (itens || []).some(i => i && i.itemId === it.itemId && i.name === nv.name && i.fmt === nv.fmt && i.day === nv.day && i.dataPostagem === dataDe(nv.day));
    const retA = confere(m.retratoLiberadoV115?.items, A, novoA), retB = confere(m.retratoLiberadoV115?.items, B, novoB);
    const copia = await esperar(async () => { const c = await seed.get('calendarios_cliente', CLIENTE); return c && confere(c.items, A, novoA) && confere(c.items, B, novoB) ? c : null; });
    fim('5 Amanda libera: título, formato, dia e data novos no retrato e na cópia do cliente',
      m.status === 'liberado' && retA && retB && !!copia,
      `mês ${m.status} · retrato A ${retA ? 'ok' : 'SEM a troca'} · retrato B ${retB ? 'ok' : 'SEM a troca'} · cópia do cliente ${copia ? 'ok' : 'SEM a troca'}`);
  } catch (e) { fim('2 substituição no processo novo', false, String(e).replace(/\s+/g, ' ').slice(0, 400) + ' · ' + etapas.join(' → ')); }
}
