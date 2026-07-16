// OvinFormulation v1.0 - Sheep feed formulation data
// Source: Abdelkader Atia - AgriSkills Academy

import data from "./alim-data.json";
import algerianFeedsData from "./algerian-feeds.json";

export type AnimalRecord = {
  category: string;
  animal_type: string;
  weight: string;
  stage: string;
  sub_stage: string;
  UEM: string | number | null;
  UFL: string | number | null;
  PDI: string | number | null;
  Pabs: string | number | null;
  Caabs: string | number | null;
};

export type FourrageRecord = {
  name: string;
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
};

export type ConcentreRecord = {
  name: string;
  ms_pct: number | null;
  ufl: number | null;
  pdin: number | null;
  pdie: number | null;
  pabs: number | null;
  caabs: number | null;
  price: number | null;
};

export type CMVRecord = {
  name: string;
  ca_p_ratio: number | null;
  pabs_per_kg: number | null;
  caabs_per_kg: number | null;
  p_pct: number | null;
  ca_pct: number | null;
};

export type AgneauRecord = {
  poids: string;
  gmq: string;
  potentiel: string;
  sexe: string;
  description: string;
  UFV: number | null;
  PDI: number | null;
  Pabs: number | null;
  Caabs: number | null;
};

export type BesoinCategory = {
  category: string;
  ugb: number | null;
  consumption_kg_ms_day: number | null;
};

export type AlgerianFeed = {
  name: string;
  kind: "fourrage" | "concentre";
  category: string;
  ms_pct: number | null;
  ufl: number | null;
  ufv: number | null;
  pdin: number | null;
  pdie: number | null;
  pdia: number | null;
  protein_pct: number | null;
  cb_pct: number | null;
  fat_pct: number | null;
  ash_pct: number | null;
  ndf_pct: number | null;
  adf_pct: number | null;
  adl_pct: number | null;
  ca_pct: number | null;
  p_pct: number | null;
  caabs: number | null;
  pabs: number | null;
  uem: number | null;
  energy_kcal: number | null;
  dmd_pct: number | null;
  price: number | null;
  source: string;
};

export type AlimData = {
  animals: AnimalRecord[];
  fourrages: FourrageRecord[];
  concentres: ConcentreRecord[];
  cmvs: CMVRecord[];
  besoins_categories: BesoinCategory[];
  stock_categories: BesoinCategory[];
  agneaux: AgneauRecord[];
  agneau_concentres: Array<Record<string, unknown>>;
  paturage_categories: string[];
  paturage_density_options: string[];
};

export const alimData = data as unknown as AlimData;

// Algerian feed database (59 feeds from ITGC/INRAA tables)
export const algerianFeeds = algerianFeedsData as unknown as AlgerianFeed[];

// Make names unique by appending category when there are duplicates
function deduplicateFeeds<T extends { name: string; category?: string }>(feeds: T[]): T[] {
  const nameCount = new Map<string, number>();
  const nameSeen = new Map<string, number>();
  // Count occurrences
  feeds.forEach((f) => nameCount.set(f.name, (nameCount.get(f.name) || 0) + 1));
  // Append suffix for duplicates
  return feeds.map((f) => {
    const count = nameCount.get(f.name) || 1;
    if (count === 1) return f;
    const seen = (nameSeen.get(f.name) || 0) + 1;
    nameSeen.set(f.name, seen);
    if (seen === 1) return f; // first occurrence keeps original name
    const cat = (f as any).category || "";
    const suffix = cat ? ` (${cat})` : ` (${seen})`;
    return { ...f, name: `${f.name}${suffix}` };
  });
}

const dedupedAlgerianFeeds = deduplicateFeeds(algerianFeeds);

// Combined feed list: Algerian feeds compatible with FourrageRecord/ConcentreRecord format
export const algerianFourrages: FourrageRecord[] = dedupedAlgerianFeeds
  .filter((f) => f.kind === "fourrage")
  .map((f) => ({
    name: `[DZ] ${f.name}`,
    ms_pct: f.ms_pct,
    uem: f.uem,
    ueb: null,
    ufl: f.ufl,
    ufv: f.ufv,
    pdin: f.pdin,
    pdie: f.pdie,
    pabs: f.pabs,
    caabs: f.caabs,
    price: f.price,
  }));

export const algerianConcentres: ConcentreRecord[] = dedupedAlgerianFeeds
  .filter((f) => f.kind === "concentre")
  .map((f) => ({
    name: `[DZ] ${f.name}`,
    ms_pct: f.ms_pct,
    ufl: f.ufl,
    pdin: f.pdin,
    pdie: f.pdie,
    pabs: f.pabs,
    caabs: f.caabs,
    price: f.price,
  }));

// All available fourrages (French + Algerian)
export const allFourrages: FourrageRecord[] = [...alimData.fourrages, ...algerianFourrages];

// All available concentres (French + Algerian)
export const allConcentres: ConcentreRecord[] = [...alimData.concentres, ...algerianConcentres];

// Helper: parse a numeric value that may be "ND" or null
export function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (v === "ND") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Helper: format a number for display
export function fmt(v: number | null, decimals = 2): string {
  if (v === null || v === undefined) return "ND";
  return v.toFixed(decimals);
}

// Helper: convert "ND" cells to null for filtering
export function hasValue(v: unknown): boolean {
  return v !== null && v !== undefined && v !== "ND";
}
