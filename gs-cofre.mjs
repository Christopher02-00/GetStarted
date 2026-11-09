// Cofre de credenciais dos clientes — chave v2 fora do HTML público.
// Ficha: fichas/2026-11-09-cofre-chave-fora-do-html.md (P9, fase A).
//
// Antes: AES-GCM com chave derivada de uma string fixa no escritorio.html (pública).
// Agora: chave aleatória de 32 bytes em cofre_chaves/v2, que as rules só deixam
// Chris/Amanda/Cecília ler e só o Chris criar (uma vez, sem update/delete).
// Registro v1 continua legível pela chave antiga até a migração (fase B a remove).

export const COLECAO_CHAVES_COFRE = 'cofre_chaves';
export const ID_CHAVE_COFRE_V2 = 'v2';
const COLECAO_COFRE = 'cofre_senhas';

const paraBase64 = bytes => btoa(String.fromCharCode(...bytes));
const deBase64 = texto => Uint8Array.from(atob(String(texto || '')), c => c.charCodeAt(0));

export function versaoPacoteCofre(pacote) {
  return pacote && typeof pacote === 'object' && pacote.versao === 2 ? 2 : 1;
}

export function criarCofre({ db, doc, getDoc, getDocs, collection, runTransaction, serverTimestamp, derivarChaveLegada, quem }) {
  const refChave = () => doc(db, COLECAO_CHAVES_COFRE, ID_CHAVE_COFRE_V2);

  // A chave nunca fica guardada em variável do módulo: cada operação relê o documento.
  async function chaveV2() {
    const snap = await getDoc(refChave());
    if (!snap.exists()) return null;
    const bruta = deBase64(snap.data()?.chave);
    if (bruta.length !== 32) throw new Error('A chave do cofre está num formato inválido. Avise o Chris.');
    return crypto.subtle.importKey('raw', bruta, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  async function cifrarCom(chave, texto, versao) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(String(texto)));
    const pacote = { iv: paraBase64(iv), dados: paraBase64(new Uint8Array(cifrado)) };
    if (versao === 2) pacote.versao = 2;
    return pacote;
  }

  async function decifrarCom(chave, pacote) {
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(pacote.iv) }, chave, deBase64(pacote.dados));
    return new TextDecoder().decode(claro);
  }

  async function decifrar(pacote) {
    if (!pacote || !pacote.iv || !pacote.dados) throw new Error('Credencial sem conteúdo cifrado.');
    if (versaoPacoteCofre(pacote) === 2) {
      const chave = await chaveV2();
      if (!chave) throw new Error('A chave nova do cofre não foi encontrada.');
      return decifrarCom(chave, pacote);
    }
    return decifrarCom(await derivarChaveLegada(), pacote);
  }

  // Sem chave v2 ainda (antes do Chris proteger o cofre) a gravação segue como hoje;
  // a migração converte esses registros depois. Nunca trava a Amanda por isso.
  async function cifrar(texto) {
    const chave = await chaveV2();
    if (chave) return cifrarCom(chave, texto, 2);
    return cifrarCom(await derivarChaveLegada(), texto, 1);
  }

  // Prévia: só leitura. Inclui arquivados (excluido:true), que também guardam segredo.
  async function previa() {
    const [snapChave, snap] = await Promise.all([getDoc(refChave()), getDocs(collection(db, COLECAO_COFRE))]);
    const r = { chaveExiste: snapChave.exists(), total: 0, v1: [], v2: 0, semCifra: [], ilegiveis: [] };
    const legada = await derivarChaveLegada();
    for (const d of snap.docs) {
      r.total++;
      const pacote = d.data()?.senhaCriptografada;
      if (!pacote || !pacote.iv || !pacote.dados) { r.semCifra.push(d.id); continue; }
      if (versaoPacoteCofre(pacote) === 2) { r.v2++; continue; }
      try { await decifrarCom(legada, pacote); r.v1.push(d.id); } catch { r.ilegiveis.push(d.id); }
    }
    return r;
  }

  async function garantirChaveV2() {
    await runTransaction(db, async tx => {
      const s = await tx.get(refChave());
      if (s.exists()) return;
      tx.set(refChave(), {
        chave: paraBase64(crypto.getRandomValues(new Uint8Array(32))),
        criadoEm: serverTimestamp(),
        criadoPor: quem(),
      });
    });
    const chave = await chaveV2();
    if (!chave) throw new Error('A chave nova não foi confirmada depois de criada.');
    return chave;
  }

  // Recriptografa cada registro v1 numa transação própria. Idempotente: v2 é pulado.
  async function proteger(ids) {
    const chave = await garantirChaveV2();
    const legada = await derivarChaveLegada();
    const r = { convertidos: [], jaProtegidos: [], falhas: [] };
    for (const id of ids) {
      const ref = doc(db, COLECAO_COFRE, id);
      try {
        const resultado = await runTransaction(db, async tx => {
          const s = await tx.get(ref);
          if (!s.exists()) throw new Error('registro sumiu');
          const pacote = s.data()?.senhaCriptografada;
          if (versaoPacoteCofre(pacote) === 2) return 'ja';
          const texto = await decifrarCom(legada, pacote);
          const novo = await cifrarCom(chave, texto, 2);
          if (await decifrarCom(chave, novo) !== texto) throw new Error('conferência da cifra nova falhou');
          tx.update(ref, { senhaCriptografada: novo, recriptografadoEm: serverTimestamp(), recriptografadoPor: quem() });
          return 'ok';
        });
        (resultado === 'ja' ? r.jaProtegidos : r.convertidos).push(id);
      } catch (e) {
        r.falhas.push({ id, erro: String(e?.code || e?.message || e) });
      }
    }
    return r;
  }

  return { cifrar, decifrar, previa, proteger };
}
