"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AnimalRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Info } from "lucide-react";

const ANIMAL_TYPES = ["Brebis", "Brebis traite", "Bélier", "Agnelle"];
const STAGES = ["Allaitante", "Croissance", "Engrais", "Entretien", "Flushing", "Gestante", "Vide"];
const WEIGHTS = ["30 kg", "40 kg", "50 kg", "60 kg", "70 kg", "80 kg", "90 kg", "100 kg"];

export function AlimAnimals() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [stage, setStage] = useState<string>("all");
  const [weight, setWeight] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(() => {
    return alimData.animals.filter((a) => {
      if (search && !a.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (type !== "all" && a.animal_type !== type) return false;
      if (stage !== "all" && a.stage !== stage) return false;
      if (weight !== "all" && a.weight !== weight) return false;
      if (onlyAvailable && num(a.UFL) === null) return false;
      return true;
    });
  }, [search, type, stage, weight, onlyAvailable]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-700" />
          Animaux — Besoins alimentaires
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.animals.length} catégories d&apos;animaux (brebis, bélier, agnelle) classées
          par poids et stade physiologique. Les valeurs &quot;ND&quot; signifient que la donnée
          n&apos;est pas disponible dans la table de référence.
        </p>
      </div>

      {/* Filters */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 space-y-1.5">
            <Label htmlFor="search" className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input
                id="search"
                placeholder="Catégorie, stade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {ANIMAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stade</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Poids vif</Label>
            <Select value={weight} onValueChange={setWeight}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {WEIGHTS.map((w) => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-stone-50">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </Badge>
          <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded"
            />
            Masquer les valeurs &quot;ND&quot;
          </label>
        </div>
      </div>

      {/* Table */}
      <Card className="border-stone-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Catégorie</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Poids</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Stade</th>
                  <th className="text-right px-3 py-2.5 font-medium">UEM</th>
                  <th className="text-right px-3 py-2.5 font-medium">UFL</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDI (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Pabs (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Caabs (g)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((a, i) => (
                  <AnimalRow key={i} a={a} />
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
              Aucun résultat. Modifiez vos filtres.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnimalRow({ a }: { a: AnimalRecord }) {
  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
      <td className="px-3 py-2 text-stone-900 font-medium">
        <div className="flex flex-col">
          <span className="text-xs">{a.animal_type}</span>
          <span className="text-[10px] text-stone-500">{a.sub_stage || a.stage}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-stone-600 hidden sm:table-cell">{a.weight || "—"}</td>
      <td className="px-3 py-2 hidden md:table-cell">
        {a.stage ? (
          <Badge variant="secondary" className="text-[10px]">{a.stage}</Badge>
        ) : <span className="text-stone-400">—</span>}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{fmt(num(a.UEM))}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(num(a.UFL))}</td>
      <td className="px-3 py-2 text-right tabular-nums">{fmt(num(a.PDI), 0)}</td>
      <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{fmt(num(a.Pabs), 1)}</td>
      <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{fmt(num(a.Caabs), 1)}</td>
    </tr>
  );
}
