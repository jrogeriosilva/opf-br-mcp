import { fetchConfluencePage } from "../../core/confluence.js";
import type { DomainData, ExtractedDomain, Item } from "../../core/types.js";
import { matchesQuery, normalize } from "../../core/text.js";
import { limitesPorEndpointConfig } from "./config.js";
import { parseEndpointLimits, type EndpointLimit } from "./parser.js";

interface LimitItem extends Item, EndpointLimit {
  page: { pageId: string; title: string; url: string };
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildItems(
  page: { pageId: string; title: string; url: string },
  limits: EndpointLimit[]
): Item[] {
  const items: Item[] = [];
  const seen = new Map<string, number>();
  for (const limit of limits) {
    const base = `${page.pageId}:${slugify(`${limit.api} ${limit.metodo ?? ""} ${limit.path}`)}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    items.push({ ...limit, id: count > 1 ? `${base}-${count}` : base, page });
  }
  return items;
}

export const limitesPorEndpointDomain: ExtractedDomain = {
  id: "limites-por-endpoint",
  title: "Limites por endpoint — SLA, timeout, TPM, TPS e limite operacional",
  description:
    "Tabela de referência do Manual de APIs do Open Finance Brasil com os limites de cada endpoint de todas " +
    "as famílias de API (Dados Abertos, Dados Cadastrais e Transacionais, Serviços de Iniciação, " +
    "Portabilidade de Crédito, Webhook, Admin e Discovery). Um item por endpoint, com a faixa de frequência " +
    "(alta, média-alta, média ou baixa), o SLA em ms do percentil 95 do tempo de resposta, o timeout em " +
    "segundos, os limites de tráfego TPM e TPS e o limite operacional de consultas por mês. " +
    "Responde perguntas do tipo \"qual o SLA e o timeout do GET /resources\". " +
    "O texto normativo por trás desses números (como o SLA é medido e apurado, disponibilidade mínima, " +
    "regras de limites de tráfego e operacionais) está em requisitos-nao-funcionais. " +
    "search devolve o registro completo — em TPM algumas linhas trazem a tabela de faixas QCA→TPM como texto.",
  ttlHours: 72,
  filters: [
    { name: "endpoint", description: "Substring na rota (ex.: /resources)" },
    { name: "api", description: "Substring no nome da família de API (ex.: Recursos, [SV] API Pagamentos)" },
    { name: "method", description: "Verbo HTTP exato (ex.: GET)" },
    { name: "frequencia", description: "Substring na faixa de frequência (ex.: Alta, Baixa)" },
  ],
  async extract(ctx): Promise<DomainData> {
    ctx?.onProgress?.(0, 1, `Extraindo "${limitesPorEndpointConfig.pageTitle}"`);
    const { html, url } = await fetchConfluencePage(
      limitesPorEndpointConfig.confluenceBaseUrl,
      limitesPorEndpointConfig.pageId,
      limitesPorEndpointConfig.retryDelaysMs,
      ctx?.signal
    );
    ctx?.onProgress?.(1, 1);
    const page = {
      pageId: limitesPorEndpointConfig.pageId,
      title: limitesPorEndpointConfig.pageTitle,
      url,
    };
    return { items: buildItems(page, parseEndpointLimits(html)) };
  },
  search(data, query, filters = {}) {
    const endpoint = filters.endpoint ? normalize(filters.endpoint) : undefined;
    const api = filters.api ? normalize(filters.api) : undefined;
    const metodo = filters.method?.trim().toUpperCase();
    const frequencia = filters.frequencia ? normalize(filters.frequencia) : undefined;

    return (data.items as LimitItem[]).filter((item) => {
      if (endpoint && !normalize(item.path).includes(endpoint)) return false;
      if (api && !normalize(item.api).includes(api)) return false;
      if (metodo && item.metodo !== metodo) return false;
      if (frequencia && !normalize(item.frequencia ?? "").includes(frequencia)) return false;
      if (query?.trim() && !matchesQuery(`${item.api} ${item.metodo ?? ""} ${item.path}`, query)) {
        return false;
      }
      return true;
    });
  },
  getItem(data, id) {
    return data.items.find((i) => i.id === id) ?? null;
  },
};
