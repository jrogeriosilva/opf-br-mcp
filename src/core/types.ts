export interface FilterSpec {
  name: string;
  description: string;
}

export interface Item {
  id: string;
  [key: string]: unknown;
}

export interface DomainData {
  items: Item[];
}

export interface ExtractContext {
  /** Sinal de cancelamento vindo do cliente MCP. */
  signal?: AbortSignal;
  /** Progresso da extração, de 0 até `total` (unidade a critério do domínio). */
  onProgress?: (progress: number, total: number, message?: string) => void;
}

interface DomainBase {
  id: string;
  title: string;
  description: string;
  /** Filtros aceitos por search (pode ser vazio em domínios live). */
  filters: FilterSpec[];
}

/** Domínio extraído: extract() busca tudo, cache local com TTL, busca síncrona sobre os dados. */
export interface ExtractedDomain extends DomainBase {
  live?: undefined;
  ttlHours: number;
  /** Busca as fontes remotas e devolve os registros estruturados. */
  extract(ctx?: ExtractContext): Promise<DomainData>;
  /** Busca filtrada; pode devolver itens resumidos, mas sempre com `id`. */
  search(data: DomainData, query?: string, filters?: Record<string, string>): Item[];
  /** Registro completo por id estável (ids vêm dos resultados de search). */
  getItem(data: DomainData, id: string): Item | null;
}

/** Domínio ao vivo: consulta a fonte a cada chamada; sem cache/TTL/refresh. */
export interface LiveDomain extends DomainBase {
  live: {
    search(query: string, filters?: Record<string, string>, ctx?: ExtractContext): Promise<Item[]>;
    getItem(id: string, ctx?: ExtractContext): Promise<Item | null>;
  };
}

export type Domain = ExtractedDomain | LiveDomain;
