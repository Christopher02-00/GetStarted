/* CP204 (11/11/2026, pedido da Amanda): diretriz de legendas da Stokki — "Manual de transição e diretrizes de conteúdo — Stokki WMS"
   (alinhamentos da Andrea Nemoto). Uma regra só para a tela e para o servidor: cópia idêntica em functions-get/lib/.
   Bloqueia o que a Andrea proíbe; avisa o que foge do padrão de cada rede. Não reescreve texto de ninguém. */
export const REDES_DIRETRIZ_STOKKI_CP204 = Object.freeze([
  { campo: 'legendaInstagram', nome: 'Instagram', dica: 'Gancho forte (pergunta ou dor da operação), quebra de linha, tópicos com hífen, benefício da Stokki, chamada para a bio e exatamente 5 hashtags. Tom profissional, direto e visual; nada de texto longo.' },
  { campo: 'legendaTiktok', nome: 'TikTok', dica: 'Linguagem ágil do dia a dia da operação ("bipou, validou, despachou"), gancho curto de POV ou curiosidade, 3 pontos rápidos e chamada para o link no perfil.' },
  { campo: 'legendaLinkedin', nome: 'LinkedIn', dica: 'Visão executiva (diretores de operação, supply chain, donos de e-commerce): governança, acuracidade de inventário, tempo de ciclo do pedido, custos invisíveis, SLAs nos marketplaces. Sempre com o link institucional.' },
  { campo: 'legendaYoutube', nome: 'YouTube', dica: 'Título magnético, com alerta na medida certa ("O ERRO FATAL que…"), e descrição explicativa e técnica, com link institucional e capítulos com minutagem (00:00 - Introdução…).' }
]);
const normalizar = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const LINK = /(https?:\/\/|www\.|stokki\.com)/i;

/** Confere uma legenda da Stokki. campo: 'legenda' (geral) ou um dos campos por rede. */
export function conferirLegendaStokkiCp204(campo, texto) {
  const t = String(texto ?? ''), n = normalizar(t), bloqueios = [], avisos = [];
  if (!t.trim()) return { bloqueios, avisos };
  if (/\bchao\s+de\s+fabrica\b/.test(n)) bloqueios.push('"chão de fábrica" é proibido na Stokki. Use galpão, centro de distribuição (CD), operação ou rotina logística.');
  if (/\bgondolas?\b/.test(n)) bloqueios.push('"gôndola" é proibido na Stokki. Use posição de picking, área de picking, prateleira ou estante.');
  if (/\barmazens?\b/.test(n)) avisos.push('Evite "armazém": prefira galpão ou centro de distribuição (CD).');
  if (campo === 'legendaInstagram') { const h = (t.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu) || []).length; if (h !== 5) avisos.push(`Instagram pede exatamente 5 hashtags (este texto tem ${h}).`); }
  if (campo === 'legendaTiktok' && !/\b(link|perfil|bio)\b/.test(n)) avisos.push('TikTok: termine chamando para o link no perfil.');
  if (campo === 'legendaLinkedin' && !LINK.test(t)) avisos.push('LinkedIn: inclua o link institucional (stokki.com.br).');
  if (campo === 'legendaYoutube') {
    if (!LINK.test(t)) avisos.push('YouTube: inclua o link institucional na descrição.');
    if (!/\b\d{1,2}:\d{2}\b/.test(t)) avisos.push('YouTube: inclua os capítulos com minutagem (00:00 - Introdução…).');
  }
  return { bloqueios, avisos };
}

/** Primeiro bloqueio entre vários campos ({campo: texto}), com o nome da rede; '' quando está tudo dentro da diretriz. */
export function bloqueioDiretrizStokkiCp204(campos) {
  for (const [campo, texto] of Object.entries(campos || {})) {
    const { bloqueios } = conferirLegendaStokkiCp204(campo, texto);
    if (bloqueios.length) return (REDES_DIRETRIZ_STOKKI_CP204.find(r => r.campo === campo)?.nome || 'Legenda') + ': ' + bloqueios[0];
  }
  return '';
}
