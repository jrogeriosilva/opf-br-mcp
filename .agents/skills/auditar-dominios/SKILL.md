---
name: auditar-dominios
description: Identifica domínios desatualizados do opf-br-mcp comparando configurações e cobertura com as fontes oficiais do Open Finance Brasil. Use para listar atualizações pendentes, conferir versões ou auditar páginas cadastradas, sem alterar o projeto.
---

# Auditar domínios

Produza um diagnóstico verificável de quais domínios precisam de atualização e por quê. A auditoria não modifica arquivos do projeto nem chama `refresh`: reler fontes cadastradas não descobre novas fontes.

## Escopo e inventário

Leia o `AGENTS.md` da raiz do repositório e use `src/core/registry.ts` como inventário. Se o usuário não restringiu o escopo, cubra todos os domínios registrados; explicite os que não conseguiu verificar.

Leia as configurações e implementações relevantes para identificar fontes, `specVersion`, páginas, parser e domínio pareado. URLs e versões devem vir do repositório e da consulta atual às fontes, nunca de exemplos memorizados. Verifique também as afirmações de versão e cobertura nas descrições e no README.

Separe três questões:

- **Configuração:** aponta para a edição desejada e para as páginas corretas?
- **Cobertura:** o parser consegue extrair o conteúdo relevante dessas fontes?
- **Dados:** o conteúdo mudou em uma fonte já cadastrada e basta reextraí-lo?

TTL, `extractedAt`, sucesso de `refresh` e versão do pacote não provam que um domínio acompanha a publicação oficial. Não execute o MCP instalado como substituto da inspeção deste checkout: ele pode usar outra versão do código.

## Verificar as fontes

Consulte as fontes oficiais pela rede. Prefira metadados e árvores antes de baixar documentos completos, respeite paginação e os intervalos/retries definidos no projeto. Buscas no portal ou na web ajudam a localizar a árvore; resultados parciais não comprovam sua completude. Se uma fonte estiver inacessível ou ambígua, registre a limitação e prossiga nos domínios independentes.

### APIs versionadas

- No GitHub ou GitHub Pages indicado pela configuração, enumere as versões disponíveis e inspecione o documento candidato. Compare `info.version`, URL/ref e conteúdo; `openapi` normalmente identifica a versão do formato, não a API.
- Trate exceções documentadas individualmente. Em `pcm-openapi`, leia os comentários da configuração: há pin por commit e campos de versão não convencionais. Não substitua o SHA por `main` ou pelo head de uma branch sem comprovar a edição e o conteúdo correspondentes.
- No Confluence, localize a árvore publicada da API em `spaces/OF`. Enumere as versões, incluindo RCs, e todas as páginas da edição candidata, percorrendo a paginação. Compare os IDs configurados e `specVersion` com essa árvore. `spaces/DraftOF` é apenas evidência complementar.
- Use a árvore para descobrir também páginas novas e reorganizadas. Exclua do conteúdo do domínio os índices só de links, Informações Técnicas só com download, subárvores de Histórico de Especificações e Changelog, conforme `AGENTS.md`. Registre exclusões que expliquem diferenças de cobertura. Títulos ajudam a classificar; não são o único critério de identidade.
- Verifique OpenAPI e regras de negócio separadamente. Elas podem publicar minor, patch ou RC diferentes. Não descreva o par como sendo da mesma versão quando só o major coincide.
- Distinga a edição mais recente no major existente de um major novo. Um v4 mantido para compatibilidade não está desatualizado só porque existe v5; reporte a disponibilidade do novo major separadamente.
- Identifique estável, RC e vigência quando houver evidência oficial. Uma RC mais recente é uma candidata, não uma autorização para substituir a edição estável. Não confunda presença no espaço OF com entrada em vigor.

### Conteúdo sem versão e domínios live

Compare localização, árvore, revisões disponíveis e cobertura atual das fontes. Mudanças de registros em `participantes` normalmente exigem reextração; mudanças de URL ou formato podem exigir código. `portal` consulta ao vivo, mas ainda depende de endpoint e parser válidos. Ausência de `specVersion` não significa ausência de manutenção.

Sem uma revisão ou snapshot anterior, não afirme que o conteúdo mudou apenas por ter sido consultado agora; registre o que é verificável.

### Cobertura da extração

Quando houver fonte nova, reorganização ou suspeita de perda de conteúdo, obtenha o documento em área temporária e use o parser existente para inspecionar a extração, sem gravar o cache do usuário. HTTP 200 e uma contagem total positiva não bastam: confira as seções ou registros esperados e perdas em páginas individuais.

Se `parseSections` deixar headings vazios e tabelas relevantes de fora por causa da estrutura HTML, reporte necessidade de parser de tabela/domínio com outro formato de item. Não classifique isso como simples troca de IDs de páginas.

## Entrega

Informe data da verificação, escopo e uma tabela:

| Domínio | Configurado | Encontrado na fonte | Situação | Ação recomendada |
|---|---|---|---|---|

Use situações que distingam **atualizado no major**, **atualização disponível**, **RC disponível**, **novo major disponível**, **cobertura incompleta**, **somente reextração** e **não verificado**. Um domínio pode ter mais de uma observação. Marque como atualizado apenas após concluir as verificações pertinentes à sua fonte; não generalize os resultados de uma amostra.

Para cada ação proposta, forneça evidências suficientes para a atualização:

- Versão atual e candidata por fonte, classificação estável/RC e evidência de vigência, se conhecida.
- URLs oficiais consultadas, raiz da árvore e IDs/títulos das páginas a adicionar, substituir ou retirar, com o motivo. Em listas grandes, mantenha a tabela resumida e detalhe apenas os domínios afetados abaixo dela.
- Arquivos afetados, divergências do par OpenAPI/regras e eventuais mudanças de parser.
- Limitações que impeçam selecionar uma edição com segurança.

Entregue o relatório na conversa, salvo se o usuário pediu um arquivo. Não aplique atualizações a partir de um pedido apenas de auditoria. Quando houver pedido de atualização, o fluxo complementar está em [atualizar-dominios](../atualizar-dominios/SKILL.md).
