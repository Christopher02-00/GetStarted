# Firebase Emulator V111 — propostas protegidas do Portal

Harness local e sintético da Causa 0B1/V111. Ele copia temporariamente as
`firestore.rules` canônicas do espelho, inicia um projeto `demo-*` isolado e
valida o contrato de índice, verificador privado, liberação por sessão,
projeção pública estreita e dual-write atômico com `negocios`.

O runner reutiliza as dependências já instaladas do harness V101 quando não
existe `node_modules` local. Ele procura um JDK nesta ordem:

1. `GET_V111_JAVA_HOME`;
2. `GET_V103_JAVA_HOME`;
3. `GET_V101_JAVA_HOME`;
4. os JDKs locais temporários já usados pelas entregas V108/V101.

Execução:

```sh
node ./run-emulator-tests.mjs
```

Todos os slugs, tokens, PINs, propostas, URLs, UIDs e e-mails de cliente são
fixtures artificiais. O projeto é `demo-get-portal-propostas-v111`; o harness
não recebe credenciais e não acessa nem altera o Firebase de produção.
