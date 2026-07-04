import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export interface PcmSection {
  heading: string;
  level: number;
  content: string;
}

const HEADING_SELECTOR = "h1, h2, h3";

/**
 * Extrai o texto de um elemento, trocando <br> por \n e colapsando espaços.
 */
function cellText($: cheerio.CheerioAPI, el: AnyNode): string {
  const clone = $(el).clone();
  clone.find("br").replaceWith("\n");
  return clone.text().replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}

/**
 * Converte um nó de bloco em texto. Tabelas viram linhas "célula | célula".
 */
function blockText($: cheerio.CheerioAPI, node: AnyNode): string {
  const $node = $(node);
  if ((node as { tagName?: string }).tagName === "table") {
    return $node
      .find("tr")
      .toArray()
      .map((tr) =>
        $(tr)
          .find("th, td")
          .toArray()
          .map((c) => cellText($, c))
          .join(" | ")
      )
      .filter((line) => line.replace(/[ |]/g, "").length > 0)
      .join("\n");
  }
  return cellText($, node);
}

/**
 * Quebra o HTML renderizado de uma página Confluence em seções por heading
 * (h1–h3). O conteúdo antes do primeiro heading vira uma seção sintética
 * `intro` (level 0). Seções sem heading e sem conteúdo são descartadas.
 */
export function parseSections(html: string): PcmSection[] {
  const $ = cheerio.load(html);
  const sections: PcmSection[] = [];

  const headings = $(HEADING_SELECTOR).toArray();

  // Seção intro: nós irmãos antes do primeiro heading (ou a página toda se não há heading).
  const first = headings[0];
  const introNodes = first ? $(first).prevAll().toArray().reverse() : $("body").contents().toArray();
  const introParts = introNodes.map((n) => blockText($, n)).filter(Boolean);
  const introContent = introParts.join("\n\n").trim();
  if (introContent) sections.push({ heading: "intro", level: 0, content: introContent });

  for (const el of headings) {
    const heading = cellText($, el);
    if (!heading) continue;
    const level = Number((el as { tagName: string }).tagName.slice(1));
    const parts = $(el)
      .nextUntil(HEADING_SELECTOR)
      .toArray()
      .map((n) => blockText($, n))
      .filter(Boolean);
    sections.push({ heading, level, content: parts.join("\n\n").trim() });
  }

  return sections;
}
