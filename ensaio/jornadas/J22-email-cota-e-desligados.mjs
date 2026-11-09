// J22 — E-mail: cota esgotada não vira tentativa a cada envio (backlog P39).
// Desde o #64 o resumo diário não sai por e-mail; o que sai é imediato (ex.: vídeo voltou para correção).
// O EmailJS é trocado por um dublê que responde "Monthly request quota exceeded" (o erro real desde setembro).
// Chris pede ajuste em dois vídeos da Helo: esperado 1 tentativa só e 1 aviso email_cota_esgotada.
// (Pessoa desligada fora do e-mail: coberto pela J23 — com o resumo cortado, a fila antiga não sai para ninguém.)
import { entrarComo, foto } from '../lib/navegador.mjs';
export const id = 'J22';
export const nome = 'E-mail: para na cota esgotada';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const VIDEOS = ['j22-video-a', 'j22-video-b'];

export async function executar({ amb, seed, nav, erroGrave, registrar }) {
  await seed.set('emails_equipe', 'Helo', { email: 'j22-helo@ensaio.invalid', pessoa: 'Helo' });
  for (const v of VIDEOS)
    await seed.set('videos_producao', v, { cliente: 'bluefit', clienteNome: 'Bluefit', titulo: 'Ensaio J22 ' + v, data: hoje(), status: 'aguardando_aprovacao',
      editorAtribuido: 'Helo', editorAtribuidoEm: new Date().toISOString(), editorAtribuidoPor: 'Amanda', excluido: false });
  const conta = async tipo => (await seed.listar('log_automacoes')).filter(l => l.tipo === tipo).length;
  const antes = { falhou: await conta('email_FALHOU'), cota: await conta('email_cota_esgotada') };
  const { page, erros, fechar } = await nav.novaPagina(); const t0 = Date.now();
  try {
    await page.addInitScript(() => {
      window.__emailTentativas = [];
      Object.defineProperty(window, 'emailjs', { configurable: true, get: () => ({ init() {}, send: (s, t, d) => { window.__emailTentativas.push(d.tipo_aviso + ':' + d.to_name); return Promise.reject({ status: 426, text: 'Monthly request quota exceeded' }); } }), set() {} });
    });
    await entrarComo(page, amb.url(), 'Chris'); await page.waitForTimeout(3000);
    for (const v of VIDEOS) {
      await page.evaluate(id => {
        for (const [k, val] of [['motivoAjuste_', 'Ensaio J22: ajustar o corte final'], ['fotoAjuste_', '']]) {
          let el = document.getElementById(k + id); if (!el) { el = document.createElement('input'); el.id = k + id; el.hidden = true; document.body.appendChild(el); }
          el.value = val;
        }
        return confirmarRejeicaoComAjuste(id);
      }, v);
      await page.waitForTimeout(2500);
    }
    const tentativas = await page.evaluate(() => window.__emailTentativas);
    const falhou = (await conta('email_FALHOU')) - antes.falhou, cota = (await conta('email_cota_esgotada')) - antes.cota;
    const marca = await seed.get('sistema', 'email_cota');
    const graves = erros.filter(erroGrave);
    await foto(page, 'J22-chris');
    registrar({ jornada: id, caso: 'Dois pedidos de ajuste com a cota esgotada', ms: Date.now() - t0,
      ok: tentativas.length === 1 && cota === 1 && marca?.dia === hoje() && !graves.length,
      detalhe: `tentativas: ${tentativas.length} [${tentativas.join(', ')}] · email_FALHOU +${falhou} · email_cota_esgotada +${cota} · marca do dia: ${marca?.dia === hoje()}` + (graves.length ? ' | ' + graves[0] : '') });
  } catch (e) { await foto(page, 'J22-falha'); registrar({ jornada: id, caso: 'Dois pedidos de ajuste com a cota esgotada', ok: false, ms: Date.now() - t0, detalhe: String(e).slice(0, 220) }); }
  finally { await fechar(); }
}
