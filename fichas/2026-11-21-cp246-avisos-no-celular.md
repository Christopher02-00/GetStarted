# cp246-avisos-no-celular — Escritório instalável e passo exato no iPhone para ligar os avisos

Origem: Programa Estabilidade (pedido do Chris, 20/11). Achado do Raio-X da produção (exportação de 21/11, só leitura), regra G2.
Unidade: única · Tipo: ajuste (alcance dos avisos)

Caso real:
- 1.899 avisos operacionais no histórico. Push com falha "Não há aparelho ativo confirmado" em 561 avisos da Amanda, 704 da Cecília e 174 do João Victor.
- Só o Chris e a Helo têm aparelho (`notificacoes_dispositivos_i165`: 2 registros).
- Pendentes hoje: Amanda 18, Cecília 192, João Victor 5. Esses avisos só são vistos quando a pessoa abre o site.
- O e-mail está cortado desde 28/10 (cota do EmailJS, decisão do Chris em 09/11).

Causa (lida no código):
- no iPhone, o Safari aberto direto não oferece `Notification`: o aviso no aparelho só existe com o site instalado na Tela de Início;
- o Escritório não tinha manifest, então não era instalável como app;
- a tela dizia só "Este navegador não oferece os avisos de aparelho necessários", sem dizer o que fazer.

Correção:
- `manifest-escritorio.webmanifest` (standalone, abre `escritorio.html`) + ícones `icone-escritorio-192/512.png` e `apple-touch-icon.png`;
- metas de app no `<head>` do `escritorio.html`;
- `gs-avisos-canal-i165.mjs`: a função `motivoSemAvisosCp246` dá a mensagem certa para cada aparelho.
  - iPhone/iPad sem o Get instalado: "Compartilhar → Adicionar à Tela de Início → abrir pelo ícone → Ativar no meu aparelho".
  - Instalado em iOS antigo: atualizar para o 16.4 ou mais novo.
  - Outro navegador: usar o Chrome (Android) ou instalar (iPhone).
  - O hash do import no `escritorio.html` foi atualizado.
- Não muda: o fluxo de ativação e teste (I165/I171), o servidor, as rules e o login.

Árvore:
RAIZ: avisos fora do site não chegam a 3 das 5 pessoas da operação
├─ ESCRITORES : nenhum dado novo; a pessoa ativa o próprio aparelho pelo botão que já existe
├─ LEITORES   : cartão "Avisos que precisam de você" (mensagem do aparelho)
├─ PAPÉIS     : todos que usam celular (Amanda, Cecília, João Victor em especial)
├─ RULES      : sem mudança
├─ AUTOMAÇÕES : sem mudança (o despacho I165 já tenta o push; passa a ter aparelho)
├─ LEGADO     : quem já usa no computador ou no Android segue igual
└─ EFEITO     : a pessoa instala o Get no iPhone, ativa e passa a receber o aviso no celular

Testes:
- J100: contraprova no site anterior com 2/5 (sem manifest, sem a função, sem ícone); depois 3/3.
- Vizinhas: J01 (cada papel entra) e a bateria inteira (desktop e celular) no CI.

Depois do ar (ação de pessoas, não de código): Amanda, Cecília e João Victor instalam o Get no celular e tocam em "Ativar no meu aparelho" e depois em "Enviar teste para mim". O Raio-X (G2) mostra quem ainda falta.
Risco conhecido: o login pelo Google dentro do app instalado no iPhone pode pedir "Entrar nesta aba" (o redirecionamento já existe). Se não entrar, a pessoa segue pelo Safari como hoje, sem regressão.
