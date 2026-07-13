// Custom feed storage — localStorage persistence for user-created feeds
// Allows farmers to enter their own forage/concentrate with lab analysis values

export type CustomFeed = {
  id: string;
  name: string;
  kind: "fourrage" | "concentre";
  ms_pct: number | null;
  uem: number | null;
  ueb: number | null;
  ufl: number | null;
  ufv: number | null;
  pdin: number | null;
  pdie: number | null;
  pabs: number | null;
  caabs: number | null;
  price: number | null;
  createdAt: number;
};

const STORAGE_KEY = "ovinformulation:custom-feeds";

export function listCustomFeeds(): CustomFeed[] {
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

export function saveCustomFeed(data: Omit<CustomFeed, "id" | "createdAt">): CustomFeed {
  if (typeof window === "undefined") throw new Error("localStorage not available");
  const existing = listCustomFeeds();
  const newFeed: CustomFeed = {
    ...data,
    id: `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  const updated = [newFeed, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newFeed;
}

export function deleteCustomFeed(id: string): void {
  if (typeof window === "undefined") return;
  const existing = listCustomFeeds();
  const updated = existing.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateCustomFeed(id: string, data: Partial<Omit<CustomFeed, "id" | "createdAt">>): void {
  if (typeof window === "undefined") return;
  const existing = listCustomFeeds();
  const updated = existing.map((f) => (f.id === id ? { ...f, ...data } : f));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export const CustomFeedStorage = {
  list: listCustomFeeds,
  save: saveCustomFeed,
  delete: deleteCustomFeed,
  update: updateCustomFeed,
};
