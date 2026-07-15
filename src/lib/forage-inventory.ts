// Forage Inventory Storage — localStorage persistence
// Track forage stocks with quality grades, quantities, and prices

export type ForageStock = {
  id: string;
  feedName: string;
  region: string;
  quantityTons: number;
  pricePerTon: number;
  harvestDate: string; // ISO date
  qualityGrade: string; // A/B/C/D
  qualityScore: number;
  notes: string;
  createdAt: number;
};

const STORAGE_KEY = "ovinformulation:forage-inventory";

export function listStocks(): ForageStock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveStock(data: Omit<ForageStock, "id" | "createdAt">): ForageStock {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listStocks();
  const stock: ForageStock = {
    ...data,
    id: `stock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([stock, ...existing]));
  return stock;
}

export function deleteStock(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listStocks();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
}

export function updateStock(id: string, data: Partial<Omit<ForageStock, "id" | "createdAt">>): void {
  if (typeof window === "undefined") return;
  const existing = listStocks();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.map((s) => (s.id === id ? { ...s, ...data } : s))));
}

// Price history tracking
export type PriceRecord = {
  id: string;
  feedName: string;
  pricePerKg: number;
  date: string; // ISO date
  region: string;
};

const PRICE_KEY = "ovinformulation:price-history";

export function listPrices(): PriceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRICE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export function savePrice(data: Omit<PriceRecord, "id">): PriceRecord {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listPrices();
  const record: PriceRecord = { ...data, id: `price-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  localStorage.setItem(PRICE_KEY, JSON.stringify([record, ...existing].slice(0, 200)));
  return record;
}

export function deletePrice(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listPrices();
  localStorage.setItem(PRICE_KEY, JSON.stringify(existing.filter((p) => p.id !== id)));
}
