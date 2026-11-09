// R2 — exporta o Firestore de produção (SÓ LEITURA, conta claude-site-get) e anonimiza na hora.
// Saída: um JSON por coleção em ./exportacao/<colecao>.json, já sem dados pessoais:
//  - e-mails → ensaio+<hash>@ensaio.get ; telefones/WhatsApp → 41 9xxxx-xxxx determinístico ; URLs → mantidas só o domínio
//  - campos de nome de pessoa física e textos livres longos → substituídos por texto de mesmo tamanho aproximado
//  - valores financeiros (valor*, preco*, mensalidade*, salario*) → arredondados para faixas (centenas)
//  - a equipe e os slugs/nomes de CLIENTES (empresas) ficam como estão: são a estrutura que o ensaio precisa reproduzir.
// Nada é gravado no Firestore. O resultado vira artefato do run (privado do repositório), nunca commit.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
const projeto = process.argv[2] || 'get-started-4956d';
const SAIDA = 'exportacao'; fs.mkdirSync(SAIDA, { recursive: true });
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/datastore'] });
const client = await auth.getClient(); const token = (await client.getAccessToken()).token;
const base = `https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents`;
const H = { Authorization: `Bearer ${token}` };
const h = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const EQUIPE = new Set(['Chris','Christopher','Amanda','Cecília','Cecilia','Helo','Heloísa','João Victor','Nathan','Luís','Luis','Yas','Yasmin','Gabrielle','Gabi','Fernanda','Júlia','Julia']);
const CAMPOS_FINANCEIROS = /^(valor|preco|preço|mensalidade|salario|salário|total|desconto|caixa|receita|custo|faturamento)/i;
const CAMPOS_PESSOA = /^(nomeContato|contato|responsavel|responsável|nomeResponsavel|nomeCliente|nomeCompleto|cpf|rg|endereco|endereço|cep)$/i;
const CAMPOS_TEXTO_LIVRE = /(descricao|descrição|observa|roteiro|legenda|comentario|comentário|mensagem|resumo|notas?|texto|conteudo|conteúdo|motivo|feedback|briefing)/i;
const fake = (s, i = 0) => { const n = Math.min(Math.max(String(s).length, 8), 160); return ('Texto anonimizado do ensaio ' + h(s + i).slice(0, 6) + ' ').repeat(Math.ceil(n / 36)).slice(0, n).trim(); };
function anonValor(chave, v, ctx) {
  if (typeof v === 'string') {
    // identificadores técnicos nunca são dado pessoal e os contratos do servidor os conferem byte a byte:
    // hashes hex (assinaturas, publicacao, operationId), ids com prefixo (prov140_…), datas ISO. Um hash com 10 dígitos seguidos já virou "telefone" uma vez.
    if (/^[a-f0-9]{32,}$/i.test(v) || /^[a-z0-9]+_[a-f0-9]{32,}$/i.test(v) || /^\d{4}-\d{2}-\d{2}(T|$)/.test(v)) return v;
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return `ensaio+${h(v).slice(0, 8)}@ensaio.get`;
    if (/(^|\D)(\+?55)?\s?\(?\d{2}\)?\s?9?\d{4}[- ]?\d{4}(\D|$)/.test(v) && v.replace(/\D/g, '').length >= 10) return `41 9${h(v).replace(/\D/g, '').padEnd(8, '0').slice(0, 4)}-${h(v + 'b').replace(/\D/g, '').padEnd(4, '0').slice(0, 4)}`;
    if (/^https?:\/\//.test(v)) { try { return new URL(v).origin + '/ensaio-' + h(v).slice(0, 8); } catch { return 'https://ensaio.get/' + h(v).slice(0, 8); } }
    if (CAMPOS_PESSOA.test(chave)) return 'Pessoa ' + h(v).slice(0, 6);
    if (/^(nome|name|titulo|title)$/i.test(chave) && !EQUIPE.has(v) && ctx.colecao !== 'clientes_extras' && ctx.colecao !== 'clientes_config' && /\s/.test(v) === false && v.length > 12) return 'Nome ' + h(v).slice(0, 6);
    if (CAMPOS_TEXTO_LIVRE.test(chave) && v.length > 24) return fake(v);
    return v;
  }
  if (typeof v === 'number' && CAMPOS_FINANCEIROS.test(chave)) return Math.round(v / 100) * 100;
  if (Array.isArray(v)) return v.map((x, i) => anonValor(chave, x, ctx));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, anonValor(k, x, ctx)]));
  return v;
}
// decodificação Firestore REST → JSON simples (preserva tipos como marcadores)
function dv(x) {
  if ('stringValue' in x) return x.stringValue; if ('integerValue' in x) return Number(x.integerValue); if ('doubleValue' in x) return x.doubleValue;
  if ('booleanValue' in x) return x.booleanValue; if ('nullValue' in x) return null; if ('timestampValue' in x) return { __ts: x.timestampValue };
  if ('arrayValue' in x) return (x.arrayValue.values || []).map(dv); if ('mapValue' in x) return Object.fromEntries(Object.entries(x.mapValue.fields || {}).map(([k, y]) => [k, dv(y)]));
  if ('referenceValue' in x) return { __ref: x.referenceValue.split('/documents/')[1] }; if ('geoPointValue' in x) return { __geo: x.geoPointValue };
  return null;
}
async function listarColecoes() { // paginado: a página padrão é de 100 ids e a base já passou disso ('sistema' ficava de fora)
  const ids = []; let pageToken = '';
  do { const r = await fetch(`${base}:listCollectionIds`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ pageSize: 300, ...(pageToken ? { pageToken } : {}) }) }); if (!r.ok) throw new Error('listCollectionIds ' + r.status + ' ' + await r.text()); const j = await r.json(); ids.push(...(j.collectionIds || [])); pageToken = j.nextPageToken || ''; } while (pageToken);
  return ids;
}
async function baixar(colecao) {
  const docs = []; let token2 = '';
  do { const r = await fetch(`${base}/${colecao}?pageSize=300${token2 ? '&pageToken=' + token2 : ''}`, { headers: H }); if (!r.ok) throw new Error(`${colecao}: ${r.status} ${await r.text()}`); const j = await r.json();
    for (const d of j.documents || []) docs.push({ __id: d.name.split('/').pop(), ...anonValor('', Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, dv(v)])), { colecao }) });
    token2 = j.nextPageToken || ''; } while (token2);
  return docs;
}
const colecoes = await listarColecoes(); const resumo = [];
for (const c of colecoes) { const docs = await baixar(c); fs.writeFileSync(`${SAIDA}/${c}.json`, JSON.stringify(docs)); resumo.push({ colecao: c, documentos: docs.length }); console.log(`${c}: ${docs.length}`); }
fs.writeFileSync(`${SAIDA}/_resumo.json`, JSON.stringify({ projeto, exportadoEm: new Date().toISOString(), colecoes: resumo }, null, 1));
console.log(`OK · ${colecoes.length} coleções · ${resumo.reduce((a, b) => a + b.documentos, 0)} documentos (anonimizados)`);
