// Ration utilities — storage + cost calculation in one module
// (Consolidated to avoid Turbopack alias resolution issues)

export type SavedFeedItem = {
  kind: "fourrage" | "concentre" | "custom";
  recordName: string;
  quantityKgBrut: number;
  pricePerKg: number;
};

export type SavedRation = {
  id: string;
  name: string;
  animalCategory: string;
  feedItems: SavedFeedItem[];
  cmvId: string;
  cmvQuantity: number;
  cmvPricePerKg: number;
  lotSize: number;
  feedingDays: number;
  savedAt: number;
};

const STORAGE_KEY = "ovinformulation:rations";

// ---------- Storage ----------

export function listRations(): SavedRation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export function saveRation(data: Omit<SavedRation, "id" | "savedAt">): SavedRation {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listRations();
  const newRation: SavedRation = {
    ...data,
    id: `ration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: Date.now(),
  };
  const updated = [newRation, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newRation;
}

export function deleteRation(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listRations();
  const updated = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function loadRation(id: string): SavedRation | null {
  return listRations().find((r) => r.id === id) || null;
}

// ---------- Cost helpers ----------

export function computeFeedCost(item: { quantityKgBrut: number; pricePerKg: number }): number {
  return item.quantityKgBrut * item.pricePerKg;
}

export function computeRationCost(
  ration: { feedItems: SavedFeedItem[]; cmvQuantity: number; cmvPricePerKg: number }
): { feedCost: number; cmvCost: number; total: number } {
  const feedCost = ration.feedItems.reduce((sum, it) => sum + computeFeedCost(it), 0);
  const cmvCost = (ration.cmvQuantity / 1000) * ration.cmvPricePerKg;
  return { feedCost, cmvCost, total: feedCost + cmvCost };
}

// ---------- Convenience namespace ----------

export const RationStorage = {
  list: listRations,
  save: saveRation,
  delete: deleteRation,
  load: loadRation,
};
