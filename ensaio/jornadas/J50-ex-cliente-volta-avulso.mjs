// J50 — Ex-cliente mensalista volta para um trabalho avulso no mesmo cadastro (decisão do Chris 10/11/2026).
// Antes: "Este cliente já existe no arquivo… Use 'Reativar cliente'" — e a reativação só aceitava mensalista.
// Agora: a Amanda ativa a solicitação avulsa; o mesmo cadastro volta como avulso (sem contrato mensal), as datas de saída
// antigas saem da configuração e o sistema passa a tratá-lo como ativo.
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J50';
export const nome = 'Ex-cliente mensalista volta como avulso no mesmo cadastro';
const SLUG = 'j50-ex', NOME = 'J50 Ex', LEAD = 'lead-j50-ex';
const esperar = async (fn, ms = 20000) => { const f = Date.now() + ms; while (Date.now() < f) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 1000)); } return null; };

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  const agora = new Date().toISOString();
  await seed.set('clientes_extras', SLUG, { slug: SLUG, nome: NOME, ativo: false, excluido: true, criadoEm: '2026-05-01T12:00:00.000Z' });
  await seed.set('clientes_config', SLUG, { tipoCliente: 'mensalista', clienteInativo: true, inativoDesde: '2026-09-30', saidaProgramadaPara: '2026-09-30', modoAprovacaoCliente: 'manual', excluido: false });
  await seed.set('contratos_cliente', SLUG, { clienteNome: NOME, status: 'encerrado', ativo: false, valorVigente: 900, diaVencimento: 10, primeiraCompetencia: '2026-05', ultimaCompetenciaPagamento: '2026-09', excluido: false });
  await seed.set('leads_avulsos', LEAD, { nome: NOME, whatsapp: '(41) 99999-8888', telefone: '41999998888', status: 'novo', servico: 'Vídeo institucional (avulso)', criadoEm: agora, excluido: false });
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  const toasts = []; page.on('console', m => { if (/avulso|cliente/i.test(m.text())) toasts.push(m.text().slice(0, 160)); });
  try {
    page.on('dialog', d => d.accept());
    await entrarComo(page, amb.url(), 'Amanda'); await page.waitForTimeout(3000);
    await page.evaluate(([c, i]) => window.ativarAvulsoRecebido(c, i), ['leads_avulsos', LEAD]);
    const cfg = await esperar(async () => { const c = await seed.get('clientes_config', SLUG); return c?.tipoCliente === 'avulso' ? c : null; });
    const ext = await seed.get('clientes_extras', SLUG), lead = await seed.get('leads_avulsos', LEAD);
    const tela = await page.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role=status], [role=alert]')].map(e => e.textContent.trim()).filter(Boolean).join(' | '));
    const graves = erros.filter(erroGrave);
    await foto(page, 'J50-amanda');
    const ok = !!cfg && cfg.clienteInativo === false && !cfg.inativoDesde && !cfg.saidaProgramadaPara && ext?.excluido === false && lead?.status === 'convertido' && !graves.length;
    registrar({ jornada: id, caso: 'Amanda ativa o ex-cliente como avulso', ok, ms: Date.now() - t0,
      detalhe: cfg ? `config avulso · inativo ${cfg.clienteInativo} · datas de saída ${cfg.inativoDesde || cfg.saidaProgramadaPara ? 'ainda lá' : 'limpas'} · cadastro ${ext?.excluido ? 'arquivado' : 'ativo'} · lead ${lead?.status}` : `não ativou · ${tela || toasts[0] || 'sem mensagem'}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J50-falha'); registrar({ jornada: id, caso: 'Amanda ativa o ex-cliente como avulso', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 260) }); }
  finally { await fechar(); }
}
