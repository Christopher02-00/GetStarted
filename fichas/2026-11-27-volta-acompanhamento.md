# volta-acompanhamento — o bloco de organização do Acompanhamento volta (a Cecília marca o que foi gravado)
Pedido (Chris, 27/11): "A Cecília acabou de perguntar o porquê que ela não consegue marcar mais … os vídeos que já foram gravados. Ela
não tem mais acesso a essa aba … a gente precisa fazer voltar essas coisas para elas."
Unidade: volta 1 de 3 · Tipo: erro (regressão da LZ7a)
Causa: a LZ7a tirou o bloco "organização" do Acompanhamento (editor I63 da Cecília, leitura dos filmmakers, cartão do Início, item do
checklist, menu do Nathan/Luís) porque o export de 25/11 mostrava gravacoes_cliente com 0 documentos. O export só lista o NÍVEL DE CIMA;
a marcação fica em gravacoes_cliente/{cliente}/meses/{mês}/itens (subcoleção) — tinha uso real. Erro de evidência do catálogo.
Mudança: desfeitos exatamente os 13 trechos da LZ7a que tratavam do Acompanhamento (código idêntico ao anterior) e gs-conferencia-cecilia-i65.js
de volta. O resto da LZ7a (telas sem caminho, fantasmas, console, migrações mortas) continua fora.
Regra nova (AGENTS.md): antes de dar uma coleção como "sem uso", contar também as subcoleções (collectionGroup) — o export lista só o topo.
Testes: J136 nova — contraprova no código de hoje: sem cartão, sem "Marcar gravado", Luís sem o item (3 vermelhos); com a volta: resultado abaixo.
