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

export interface Domain {
  id: string;
  title: string;
  description: string;
  ttlHours: number;
  filters: FilterSpec[];
  /** Busca as fontes remotas e devolve os registros estruturados. */
  extract(): Promise<DomainData>;
  /** Busca filtrada; pode devolver itens resumidos, mas sempre com `id`. */
  search(data: DomainData, query?: string, filters?: Record<string, string>): Item[];
  /** Registro completo por id estável (ids vêm dos resultados de search). */
  getItem(data: DomainData, id: string): Item | null;
}
