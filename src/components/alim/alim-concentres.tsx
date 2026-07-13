"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type ConcentreRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Sprout, Info } from "lucide-react";

function concentrateCategory(name: string): { cat: string; color: string } {
  const n = name.toLowerCase();
  if (["blé", "orge", "avoine", "triticale", "seigle", "maïs grain", "sorgho", "sarrazin"].some((c) => n.includes(c))) {
    return { cat: "Céréale", color: "bg-amber-100 text-amber-800" };
  }
  if (["tourteau", "colza 35", "soja 48", "tournesol", "arachide", "lin", "coton"].some((c) => n.includes(c))) {
    return { cat: "Tourteau", color: "bg-orange-100 text-orange-800" };
  }
  if (["pois", "lupin", "féverole", "vesce", "soja extrudé", "soja tanné"].some((c) => n.includes(c))) {
    return { cat: "Protéagineux", color: "bg-rose-100 text-rose-800" };
  }
  if (["drêches", "son de blé", "pulpe de betterave", "mélasse", "urée", "huile", "graine de colza", "graines de colza", "poudre de lait", "lait écrémé"].some((c) => n.includes(c))) {
    return { cat: "Divers", color: "bg-stone-100 text-stone-700" };
  }
  if (["luzerne"].some((c) => n.includes(c))) {
    return { cat: "Divers", color: "bg-stone-100 text-stone-700" };
  }
  return { cat: "Autre", color: "bg-stone-100 text-stone-700" };
}

export function AlimConcentres() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    return alimData.concentres.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && concentrateCategory(c.name).cat !== category) return false;
      return true;
    });
  }, [search, category]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    alimData.concentres.forEach((c) => set.add(concentrateCategory(c.name).cat));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Sprout className="h-5 w-5 text-orange-700" />
          Concentrés — Valeurs alimentaires
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.concentres.length} concentrés référencés (céréales, tourteaux, protéagineux, divers).
          Valeurs par kg brut.
        </p>
      </div>

      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-1.5">
            <Label htmlFor="search" className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="search"
                placeholder="Nom du concentré..."
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
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Toutes</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Badge variant="outline" className="bg-stone-50">
        {filtered.length} concentré{filtered.length > 1 ? "s" : ""}
      </Badge>

      <Card className="border-stone-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Nom</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Catégorie</th>
                  <th className="text-right px-3 py-2.5 font-medium">% MS</th>
                  <th className="text-right px-3 py-2.5 font-medium">UFL</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDIN</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden md:table-cell">PDIE</th>
                  <th className="text-right px-3 py-2.5 font-medium">Pabs (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium">Caabs (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">Prix (€/t)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <ConcentreRow key={i} c={c} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-sm text-stone-500">
                      <Info className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                      Aucun concentré trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConcentreRow({ c }: { c: ConcentreRecord }) {
  const cat = concentrateCategory(c.name);
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
      <td className="px-3 py-2 text-stone-900 font-medium text-sm">{c.name}</td>
      <td className="px-3 py-2 hidden md:table-cell">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cat.color}`}>
          {cat.cat}
        </span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-sm">{fmt(num(c.ms_pct), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm font-medium">{fmt(num(c.ufl))}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm">{fmt(num(c.pdin), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm hidden md:table-cell">{fmt(num(c.pdie), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm">{fmt(num(c.pabs), 2)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm">{fmt(num(c.caabs), 2)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-sm hidden lg:table-cell">
        {num(c.price) !== null ? fmt(num(c.price), 1) : "—"}
      </td>
    </tr>
  );
}
