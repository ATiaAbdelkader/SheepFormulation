// Alim'OVINS v5.1 - Sheep feed formulation data
// Source: AlimOVINSv5.1.xlsx by Fabrice RANOUX - Lycée Agricole du Bourbonnais

import data from "./alim-data.json";

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
