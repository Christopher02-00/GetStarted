#!/usr/bin/env python3
"""Extrai cada <script> inline de um HTML para um arquivo próprio e imprime os caminhos.

Uso (passo 1 do portão da skill get-mudanca-segura):
    python3 ferramentas/extrair_inline.py escritorio.html | xargs -I{} node --check {}

Scripts type="module" saem como .mjs (o node checa como ES module); os demais como .js.
Scripts com src= (externos ou locais) são ignorados: os arquivos locais são checados direto.
"""
import argparse
import hashlib
import os
import re
import sys
import tempfile

ABRE = re.compile(r'<script\b([^>]*)>', re.I)
FECHA = re.compile(r'</script\s*>', re.I)


def extrair(html):
    """Devolve [(indice, eh_modulo, codigo)] dos scripts inline, na ordem do arquivo."""
    saida = []
    pos = 0
    while True:
        m = ABRE.search(html, pos)
        if not m:
            return saida
        fim = FECHA.search(html, m.end())
        if not fim:
            raise SystemExit(f'<script> sem </script> perto do byte {m.start()}')
        attrs = m.group(1)
        pos = fim.end()
        if re.search(r'\bsrc\s*=', attrs, re.I):
            continue
        tipo = re.search(r'\btype\s*=\s*["\']?([\w/+-]+)', attrs, re.I)
        tipo = (tipo.group(1).lower() if tipo else 'text/javascript')
        if tipo not in ('module', 'text/javascript', 'application/javascript'):
            continue  # JSON, templates etc. não são JavaScript executável
        saida.append((len(saida), tipo == 'module', html[m.end():fim.start()]))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('html')
    ap.add_argument('--dir', help='pasta de saída (padrão: pasta temporária nova)')
    a = ap.parse_args()
    html = open(a.html, encoding='utf-8').read()
    base = os.path.splitext(os.path.basename(a.html))[0]
    destino = a.dir or tempfile.mkdtemp(prefix=f'inline-{base}-')
    os.makedirs(destino, exist_ok=True)
    scripts = extrair(html)
    if not scripts:
        print(f'nenhum script inline em {a.html}', file=sys.stderr)
        return 1
    for i, modulo, codigo in scripts:
        h = hashlib.sha256(codigo.encode('utf-8')).hexdigest()[:8]
        caminho = os.path.join(destino, f'{base}-{i:02d}-{h}.{"mjs" if modulo else "js"}')
        with open(caminho, 'w', encoding='utf-8') as f:
            f.write(codigo)
        print(caminho)
    return 0


if __name__ == '__main__':
    sys.exit(main())
