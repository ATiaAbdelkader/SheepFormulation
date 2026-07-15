// Concentrate Supplier Storage — localStorage persistence
// Track feed suppliers with contact info, prices, and ratings

export type Supplier = {
  id: string;
  name: string;
  feedName: string;
  region: string;
  contact: string;
  phone: string;
  email: string;
  pricePerKg: number;
  minOrderKg: number;
  deliveryAvailable: boolean;
  deliveryCost: number;
  rating: number; // 0-5
  notes: string;
  createdAt: number;
};

const STORAGE_KEY = "ovinformulation:suppliers";

export function listSuppliers(): Supplier[] {
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

export function saveSupplier(data: Omit<Supplier, "id" | "createdAt">): Supplier {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listSuppliers();
  const supplier: Supplier = {
    ...data,
    id: `supplier-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([supplier, ...existing]));
  return supplier;
}

export function deleteSupplier(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listSuppliers();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((s) => s.id !== id)));
}

// Concentrate price tracking (separate from forage prices)
export type ConcentratePrice = {
  id: string;
  feedName: string;
  pricePerKg: number;
  date: string;
  supplier: string;
};

const PRICE_KEY = "ovinformulation:concentrate-prices";

export function listConcentratePrices(): ConcentratePrice[] {
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

export function saveConcentratePrice(data: Omit<ConcentratePrice, "id">): ConcentratePrice {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listConcentratePrices();
  const record: ConcentratePrice = { ...data, id: `cprice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  localStorage.setItem(PRICE_KEY, JSON.stringify([record, ...existing].slice(0, 200)));
  return record;
}

export function deleteConcentratePrice(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listConcentratePrices();
  localStorage.setItem(PRICE_KEY, JSON.stringify(existing.filter((p) => p.id !== id)));
}
