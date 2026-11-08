# Ensaio Get — portão de jornadas em navegador real
Sobe Firestore+Auth emulators com as rules do repo, serve o checkout, popula dados representativos e percorre jornadas por papel no Chromium (Playwright).
```bash
cd ensaio && npm i && node montar-cdn.mjs        # uma vez: SDK Firebase local (sem CDN)
node ensaio/rodar.mjs                            # bateria inteira → ensaio/saida/resultado.json + screenshots
node ensaio/rodar.mjs --jornadas J02             # só uma jornada
node ensaio/explorar.mjs Cecília                 # abre o site como a pessoa e tira foto (debug)
```
Requisitos: Node ≥ 20, Java 21, firebase-tools 15 (`npm i -g firebase-tools@15`), jar do Firestore emulator em `~/.cache/firebase/emulators/` (baixado pelo `firebase setup:emulators:firestore`).
Nunca aponta para `get-started-4956d`; o gancho no `escritorio.html` só liga em `127.0.0.1?ensaio=1`.
Regra: todo PR roda a bateria; falhou → corrigir a causa, não o teste. Bug novo → jornada nova no mesmo PR.
