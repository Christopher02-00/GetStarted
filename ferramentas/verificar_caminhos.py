#!/usr/bin/env python3
"""Verificador estático de caminhos de um HTML do Site Get (passo 2 do portão).

Confere três tipos de ligação, lendo o HTML e todos os scripts/módulos locais que ele
carrega (src= e import, recursivo, ignorando ?v=):

  handlers  on*="nome(...)"   → `nome` precisa existir como global (window.nome = …,
                                 function/var/let/const em script clássico, globalThis/self)
  rotas     irPara('x')       → precisa existir algum id "view-x" nas fontes
  ids       getElementById('y') → precisa existir id "y" nas fontes (estático ou em template)

Rotas e ids são heurísticos (ids criados por concatenação não são vistos); por isso o
portão compara com a linha de base em ferramentas/baseline.json: falha só quando aparece
um quebrado NOVO. Handlers quebrados ficam na linha de base pelo nome.

Uso:
    python3 ferramentas/verificar_caminhos.py escritorio.html [--out /tmp/vc.json]
    python3 ferramentas/verificar_caminhos.py escritorio.html --gravar-baseline   # só com motivo no PR
"""
import argparse
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
BASELINE = os.path.join(AQUI, 'baseline.json')

ABRE = re.compile(r'<script\b([^>]*)>', re.I)
FECHA = re.compile(r'</script\s*>', re.I)
IDENT = r'[A-Za-z_$][\w$]*'

# Nomes que um handler pode chamar sem serem funções do site.
NATIVOS = set('''
event this window document navigator location history console alert confirm prompt
setTimeout setInterval clearTimeout clearInterval requestAnimationFrame queueMicrotask
fetch open close print scrollTo encodeURIComponent decodeURIComponent parseInt parseFloat
Number String Boolean Array Object JSON Math Date Promise Error URL Intl Set Map
if else return void typeof new delete try catch finally for while do switch case break
let const var function async await true false null undefined
'''.split())


EVENTOS = ('click|dblclick|change|input|submit|reset|invalid|select|keydown|keyup|keypress|blur|focus|'
           'focusin|focusout|mousedown|mouseup|mouseover|mouseout|mouseenter|mouseleave|pointerdown|pointerup|'
           'touchstart|touchend|contextmenu|wheel|scroll|load|error|paste|copy|cut|drag|dragstart|dragend|'
           'dragover|dragleave|drop|toggle|animationend|transitionend')


def ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()


def local(ref, base):
    """Caminho local de um src/import relativo, ou None se for externo."""
    ref = ref.split('?')[0].split('#')[0]
    if not ref or re.match(r'^[a-z]+:|^//', ref, re.I):
        return None
    p = os.path.normpath(os.path.join(base, ref))
    return p if os.path.isfile(p) else None


def coletar(html_path):
    """Devolve (html, [(caminho, codigo, classico)]) com todas as fontes alcançáveis."""
    html = ler(html_path)
    base = os.path.dirname(os.path.abspath(html_path))
    fontes, vistos, fila = [], set(), []
    pos = 0
    while True:
        m = ABRE.search(html, pos)
        if not m:
            break
        fim = FECHA.search(html, m.end())
        pos = fim.end() if fim else len(html)
        attrs = m.group(1)
        modulo = re.search(r'type\s*=\s*["\']?module', attrs, re.I) is not None
        src = re.search(r'\bsrc\s*=\s*["\']([^"\']+)', attrs, re.I)
        if src:
            p = local(src.group(1), base)
            if p:
                fila.append((p, not modulo))
        else:
            fontes.append((html_path + f'#script@{html.count(chr(10), 0, m.start()) + 1}',
                           html[m.end():fim.start() if fim else len(html)], not modulo))
    for _, codigo, _ in list(fontes):
        for ref in re.findall(r'''\bimport\s*(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]''', codigo):
            p = local(ref[0] or ref[1], base)
            if p:
                fila.append((p, False))
    while fila:
        p, classico = fila.pop()
        if p in vistos:
            continue
        vistos.add(p)
        codigo = ler(p)
        fontes.append((p, codigo, classico))
        for ref in re.findall(r'''\bimport\s*(?:[^'"()]*?\bfrom\s*)?['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]''', codigo):
            q = local(ref[0] or ref[1], os.path.dirname(p))
            if q:
                fila.append((q, False))
    return html, fontes


def globais(fontes):
    nomes = set()
    for _, codigo, classico in fontes:
        # apelidos do objeto global no próprio arquivo (ex.: const w=globalThis;)
        alvos = {'window', 'globalThis', 'self'}
        alvos |= set(re.findall(rf'\b(?:const|let|var)\s+({IDENT})\s*=\s*(?:window|globalThis|self)\b(?!\.)', codigo))
        g = '(?:' + '|'.join(re.escape(x) for x in sorted(alvos)) + ')'
        nomes.update(re.findall(rf'(?<![\w$.]){g}\.({IDENT})\s*=(?!=)', codigo))
        nomes.update(re.findall(rf'(?<![\w$.]){g}\[\s*[\'"]({IDENT})[\'"]\s*\]\s*=(?!=)', codigo))
        for bloco in re.findall(rf'Object\.assign\(\s*{g}\s*,\s*\{{([^{{}}]*)\}}', codigo):
            nomes.update(re.findall(rf'(?:^|,)\s*(?:async\s+)?({IDENT})\s*(?=[,:(]|$)', bloco.strip()))
        if classico:
            nomes.update(re.findall(rf'\b(?:async\s+)?function\s*\*?\s*({IDENT})\s*\(', codigo))
            nomes.update(re.findall(rf'\b(?:var|let|const)\s+({IDENT})\s*=', codigo))
    return nomes


def limpar_handler(corpo):
    """Tira do atributo o que roda na montagem do HTML, não no clique, e o texto literal.

    ${...} e '+...+' são avaliados ao renderizar; strings ('a(b)', "rgba(...)",
    seletores CSS) não são chamadas.
    """
    saida, i, prof = [], 0, 0
    while i < len(corpo):  # remove ${...} com chaves aninhadas
        if corpo.startswith('${', i):
            prof, i = 1, i + 2
            while i < len(corpo) and prof:
                prof += {'{': 1, '}': -1}.get(corpo[i], 0)
                i += 1
            saida.append(' 0 ')
            continue
        saida.append(corpo[i])
        i += 1
    corpo = ''.join(saida)
    corpo = re.sub(r"""(['"])\s*\+.*?\+\s*\1""", ' 0 ', corpo)       # '+expr+'
    corpo = re.sub(r"\\?'(?:[^'\\]|\\.)*?\\?'", ' 0 ', corpo)                # 'texto'
    corpo = re.sub(r'\\?"(?:[^"\\]|\\.)*?\\?"', ' 0 ', corpo)                # "texto"
    return corpo


def handlers(texto):
    """[(nome_chamado, trecho)] de todos os atributos on*= (estáticos ou em templates)."""
    saida = []
    for m in re.finditer(r'\bon(?:' + EVENTOS + r')\s*=\s*(\\?["\'])(.*?)(?<!\\)\1', texto, re.S):
        corpo = limpar_handler(m.group(2))
        for chamada in re.finditer(rf'(?<![\w$.])(?:window\.)?({IDENT})\s*\(', corpo):
            nome = chamada.group(1)
            if nome not in NATIVOS:  # método (x.y()) já fica de fora pelo lookbehind
                saida.append((nome, m.group(2).strip()[:80]))
    return saida


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('html')
    ap.add_argument('--out')
    ap.add_argument('--gravar-baseline', action='store_true')
    a = ap.parse_args()

    html, fontes = coletar(a.html)
    tudo = html + '\n'.join(c for _, c, _ in fontes)
    g = globais(fontes)
    ids = set(re.findall(r'''\bid\s*[=:]\s*\\?["'`]([\w-]+)''', tudo))
    ids |= set(re.findall(r'''\.id\s*=\s*["'`]([\w-]+)''', tudo))

    h_quebrados = sorted({n for n, _ in handlers(tudo) if n not in g})
    rotas = set(re.findall(r'''irPara\(\s*['"]([\w-]+)['"]''', tudo))
    r_quebradas = sorted(r for r in rotas if f'view-{r}' not in ids)
    usados = set(re.findall(r'''getElementById\(\s*['"]([\w-]+)['"]\s*\)''', tudo))
    i_quebrados = sorted(i for i in usados if i not in ids)

    rel = os.path.relpath(a.html)
    resultado = {
        'arquivo': rel,
        'fontes': len(fontes),
        'globais': len(g),
        'handlers': {'quebrados': h_quebrados},
        'rotas': {'total': len(rotas), 'quebradas': r_quebradas},
        'ids': {'total': len(usados), 'quebrados': i_quebrados},
    }
    if a.out:
        with open(a.out, 'w', encoding='utf-8') as f:
            json.dump(resultado, f, ensure_ascii=False, indent=1)

    base = json.load(open(BASELINE, encoding='utf-8')) if os.path.exists(BASELINE) else {}
    if a.gravar_baseline:
        base.setdefault('caminhos', {})[rel] = {
            'handlers': h_quebrados, 'rotas': r_quebradas, 'ids': i_quebrados}
        with open(BASELINE, 'w', encoding='utf-8') as f:
            json.dump(base, f, ensure_ascii=False, indent=1, sort_keys=True)
            f.write('\n')
        print(f'linha de base gravada para {rel}')
        return 0

    conhecido = base.get('caminhos', {}).get(rel, {'handlers': [], 'rotas': [], 'ids': []})
    novos = {
        'handlers': [x for x in h_quebrados if x not in conhecido.get('handlers', [])],
        'rotas': [x for x in r_quebradas if x not in conhecido.get('rotas', [])],
        'ids': [x for x in i_quebrados if x not in conhecido.get('ids', [])],
    }
    print(f'{rel}: {len(fontes)} fontes, {len(g)} globais | handlers quebrados {len(h_quebrados)} | '
          f'rotas sem view {len(r_quebradas)}/{len(rotas)} | ids sem dono {len(i_quebrados)}/{len(usados)}')
    falhou = False
    for tipo, lista in novos.items():
        for x in lista:
            print(f'NOVO {tipo[:-1] if tipo != "ids" else "id"} quebrado: {x}')
            falhou = True
    resolvidos = sum(len([x for x in conhecido.get(t, []) if x not in v])
                     for t, v in (('handlers', h_quebrados), ('rotas', r_quebradas), ('ids', i_quebrados)))
    if resolvidos:
        print(f'{resolvidos} item(ns) da linha de base já não estão quebrados — atualize com --gravar-baseline')
    print('FALHA' if falhou else 'ok (nada novo além da linha de base)')
    return 1 if falhou else 0


if __name__ == '__main__':
    sys.exit(main())
