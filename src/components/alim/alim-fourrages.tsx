"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type FourrageRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Wheat, Info } from "lucide-react";

// Forage category detection (heuristic from name)
function forageCategory(name: string): { cat: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("ensilage")) return { cat: "Ensilage", color: "bg-green-100 text-green-800" };
  if (n.includes("enrubann")) return { cat: "Enrubanné", color: "bg-lime-100 text-lime-800" };
  if (n.includes("foin")) return { cat: "Foin", color: "bg-amber-100 text-amber-800" };
  if (n.includes("paille")) return { cat: "Paille", color: "bg-yellow-100 text-yellow-800" };
  if (n.includes("pâtur") || n.includes("pature") || n.includes("pré") || n.includes("pre")) return { cat: "Pâture", color: "bg-emerald-100 text-emerald-800" };
  if (n.includes("betterave") || n.includes("navet") || n.includes("colza fourrager")) return { cat: "Racines", color: "bg-orange-100 text-orange-800" };
  if (n.includes("maïs")) return { cat: "Maïs", color: "bg-yellow-100 text-yellow-800" };
  if (n.includes("luzerne")) return { cat: "Luzerne", color: "bg-purple-100 text-purple-800" };
  return { cat: "Autre", color: "bg-stone-100 text-stone-700" };
}

export function AlimFourrages() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(() => {
    return alimData.fourrages.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all") {
        const c = forageCategory(f.name);
        if (c.cat !== category) return false;
      }
      if (onlyAvailable && num(f.ufl) === null) return false;
      return true;
    });
  }, [search, category, onlyAvailable]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    alimData.fourrages.forEach((f) => set.add(forageCategory(f.name).cat));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Wheat className="h-5 w-5 text-lime-700" />
          Fourrages — Valeurs alimentaires
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.fourrages.length} fourrages référencés. Valeurs par kg de matière sèche (MS).
          La teneur en MS (%) permet de convertir les quantités brutes en quantités MS.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 space-y-1.5">
            <Label htmlFor="search" className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="search"
                placeholder="Nom du fourrage..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Catégorie</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer h-9">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="rounded"
              />
              Masquer les &quot;ND&quot;
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Badge variant="outline" className="bg-stone-50">
          {filtered.length} fourrage{filtered.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <Card className="border-stone-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Nom</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Catégorie</th>
                  <th className="text-right px-3 py-2.5 font-medium">% MS</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">UEM</th>
                  <th className="text-right px-3 py-2.5 font-medium">UFL</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">UFV</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDIN</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden md:table-cell">PDIE</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Pabs</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Caabs</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((f, i) => (
                  <FourrageRow key={i} f={f} />
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="p-3 text-center text-xs text-stone-500 border-t border-stone-200">
              200 premiers résultats affichés sur {filtered.length}. Affinez votre recherche.
            </div>
          )}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-stone-500">
              <Info className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              Aucun fourrage trouvé.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FourrageRow({ f }: { f: FourrageRecord }) {
  const c = forageCategory(f.name);
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
      <td className="px-3 py-2 text-stone-900 font-medium text-xs max-w-xs">
        {f.name}
      </td>
      <td className="px-3 py-2 hidden md:table-cell">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.color}`}>
          {c.cat}
        </span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(num(f.ms_pct), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs hidden lg:table-cell">{fmt(num(f.uem))}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">{fmt(num(f.ufl))}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs hidden lg:table-cell">{fmt(num(f.ufv))}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(num(f.pdin), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs hidden md:table-cell">{fmt(num(f.pdie), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs hidden sm:table-cell">{fmt(num(f.pabs), 2)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-xs hidden sm:table-cell">{fmt(num(f.caabs), 2)}</td>
    </tr>
  );
}
