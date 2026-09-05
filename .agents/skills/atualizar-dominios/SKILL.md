---
name: atualizar-dominios
description: Atualiza domínios preexistentes do opf-br-mcp a partir de fontes oficiais verificadas, ajustando versões, páginas, descrições e fixtures e validando a extração. Use quando o desenvolvedor pedir para aplicar uma atualização; para somente listar pendências, use auditar-dominios.
---

# Atualizar domínios

Execute as atualizações solicitadas usando a arquitetura existente. A autorização para atualizar os domínios selecionados já cobre as edições locais e verificações necessárias; não peça uma nova confirmação para cada arquivo. Commit, push, PR e publicação dependem do escopo autorizado pelo usuário.

## Selecionar a atualização

Leia o `AGENTS.md` da raiz e confira o estado do Git antes de editar. Preserve alterações do usuário. Identifique os domínios pedidos e seus pares; consultar um par não implica atualizar sua versão sem necessidade.

Leia os critérios de fontes e evidências de [auditar-dominios](../auditar-dominios/SKILL.md). Aproveite o relatório disponível, revalidando a fonte candidata e os IDs antes de editar. Sem relatório, faça a auditoria apenas do escopo necessário; não exija que o usuário execute outra skill primeiro.

Se o usuário informou uma versão, procure essa edição. Caso contrário, prefira a edição estável mais recente comprovada dentro do major atual. Descubra e reporte RCs, mas só promova o domínio para uma RC se isso fizer parte do pedido ou da política explícita do projeto. Se só houver candidatas ambíguas, peça a decisão necessária e continue as atualizações independentes. Não invente equivalência entre versões de OpenAPI e Confluence.

Se o problema for apenas dados antigos nas mesmas fontes e o parser estiver correto, explique que basta reextração e execute-a quando estiver no escopo, usando o código deste checkout. Confira `stale` e a fonte efetivamente servida: uma resposta de sucesso de `refresh` não comprova extração nova. Não altere versões, descrições ou fixtures para simular uma atualização.

## Aplicar a mudança mínima

Antes das edições, enuncie versão/páginas de destino e o que será verificado. Baixe as fontes candidatas para uma área temporária e inspecione o conteúdo com o parser existente. Só atualize a configuração para fontes cuja identidade e extração foram verificadas.

- **Minor/patch:** preserve IDs dos domínios e os namespaces `specName` usados nos IDs de itens. Atualize `specVersion`, URL/ref e a lista de páginas conforme a evidência, sem substituição global de números de versão.
- **Major novo:** preserve o domínio antigo. A criação de outro domínio e seu par segue o fluxo de adição do `AGENTS.md` quando estiver no escopo pedido; caso contrário, reporte como trabalho separado. Nunca faça um ID v2 servir uma spec v3.
- **Confluence:** use IDs e títulos reais da árvore publicada, incluindo novas páginas relevantes. Remova páginas substituídas ou excluídas com justificativa e preserve regras compartilhadas/guias nos seus domínios próprios.
- **Descrições e README:** ajuste versões, cobertura e referências cruzadas afetadas em português brasileiro. Preserve números históricos legítimos, como versões de origem em notas de migração. Descreva diferenças de versão entre fontes com precisão.
- **Tools:** verifique se algum texto ficou incorreto. As quatro tools são genéricas; não acrescente tools nem enumere versões nelas para resolver uma atualização de domínio.
- **Parsers:** altere apenas se o novo formato exigir. Se aparecer conteúdo com outro formato de item, avalie o domínio pareado de tabela conforme `AGENTS.md`; não amplie silenciosamente o escopo de uma atualização de configuração.
- **Versão do pacote:** não faça release ou bump apenas para editar um domínio. Se houver pedido de release, siga o sincronismo entre `package.json`, lockfile e `src/core/version.ts` exigido no projeto.

Os IDs de seções do Confluence incluem o `pageId` e o heading; novas páginas podem mudar os IDs dos itens mesmo mantendo o ID do domínio. Informe esse efeito e preserve a regra de descoberta via `search`. Não crie aliases ou um novo esquema de IDs incidentalmente.

## Verificar conteúdo e contrato

A coleta das fontes pode usar rede; os testes automatizados devem usar somente fixtures locais e fetch simulado. Não escreva testes que consultem GitHub, Confluence ou o diretório real.

Use a extração direta das fontes candidatas para verificar o conteúdo de destino. Evite usar cache compartilhado como prova: o cache depende da versão do pacote e pode retornar dados anteriores como fallback. Registre a versão/ref e as páginas efetivamente verificadas.

Atualize fixtures quando necessário para representar estruturas novas ou alteradas, preservando casos anteriores ainda relevantes. Não troque fixtures apenas para mudar um rótulo de versão. Quando houver mudança de parser ou falha reproduzível, inclua uma regressão que comprove o conteúdo recuperado.

Confira as invariantes pertinentes:

- A versão declarada pela fonte corresponde à escolhida, respeitando exceções documentadas como PCM por commit.
- A extração cobre seções/linhas esperadas por página, não apenas um total não vazio.
- `search` produz IDs únicos e todos resolvem em `getItem`; os `refs` internos expostos pela OpenAPI resolvem nos componentes correspondentes.
- O resumo continua leve e o conteúdo completo fica em `get_item`.
- Ao adicionar um domínio autorizado, registre-o em `src/core/registry.ts` e associe sua fixture em `test/contract.test.ts` (ou `liveFixtureFetch` para live).

Execute `npm test`, `npm run typecheck` e `npm run build` após as mudanças. Revise o diff e procure referências antigas nos arquivos afetados, distinguindo valores obsoletos de referências históricas válidas. Não declare a atualização validada se a fonte ou um check necessário não pôde ser verificado; reporte a pendência específica.

## Entrega

Informe domínios atualizados, versões por fonte antes/depois, alterações relevantes de páginas/cobertura, links oficiais usados e resultado dos checks. Destaque RCs não promovidas, diferenças entre fontes, mudanças de IDs de itens e pendências apenas quando se aplicarem. Separe claramente o que foi editado, o que foi validado e o que ainda requer publicação ou reextração no ambiente consumidor.
