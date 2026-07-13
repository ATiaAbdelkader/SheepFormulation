"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trees, Info, CheckCircle2, AlertTriangle } from "lucide-react";

const CATEGORIES = ["Brebis vide", "Brebis gestante", "Brebis allaitante", "Agnelle", "Bélier"];
const DENSITY_OPTIONS = [
  { label: "Nulle (Hiver - Sécheresse)", kgPerHaCm: 0 },
  { label: "Faible (Eté)", kgPerHaCm: 200 },
  { label: "Moyenne (Automne)", kgPerHaCm: 250 },
  { label: "Forte (Printemps)", kgPerHaCm: 300 },
];

// Estimated daily grass consumption per animal category (kg MS / day)
const DAILY_CONSUMPTION: Record<string, number> = {
  "Brebis vide": 1.5,
  "Brebis gestante": 1.8,
  "Brebis allaitante": 2.4,
  "Agnelle": 1.2,
  "Bélier": 2.0,
};

type AnimalGroup = {
  id: string;
  category: string;
  count: number;
};

export function AlimPaturage() {
  const [surface, setSurface] = useState<number>(5); // hectares
  const [entryHeight, setEntryHeight] = useState<number>(8); // cm
  const [exitHeight, setExitHeight] = useState<number>(4); // cm
  const [densityIdx, setDensityIdx] = useState<number>(3); // default Forte (Printemps)
  const [growthRate, setGrowthRate] = useState<number>(50); // kg MS/ha/j (pousse)
  const [groups, setGroups] = useState<AnimalGroup[]>([
    { id: "g1", category: "Brebis allaitante", count: 100 },
  ]);

  const updateGroup = (id: string, field: keyof AnimalGroup, value: string | number) => {
    setGroups(groups.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };
  const addGroup = () => {
    setGroups([...groups, { id: `g-${Date.now()}`, category: CATEGORIES[0], count: 0 }]);
  };
  const removeGroup = (id: string) => {
    setGroups(groups.filter((g) => g.id !== id));
  };

  const calculation = useMemo(() => {
    const density = DENSITY_OPTIONS[densityIdx].kgPerHaCm;
    // Available grass = surface * (entry_height - exit_height) * density (kg MS)
    const availableGrass = surface * Math.max(0, entryHeight - exitHeight) * density;
    // Total daily consumption
    const dailyConsumption = groups.reduce(
      (sum, g) => sum + (DAILY_CONSUMPTION[g.category] || 0) * g.count,
      0
    );
    // Daily grass growth (regrowth)
    const dailyGrowth = surface * growthRate;
    // Net daily consumption = dailyConsumption - dailyGrowth
    const netDaily = Math.max(0, dailyConsumption - dailyGrowth);
    // Days of grazing available
    const grazingDays = netDaily > 0 ? availableGrass / netDaily : null;

    return {
      availableGrass,
      dailyConsumption,
      dailyGrowth,
      netDaily,
      grazingDays: grazingDays !== null ? Math.floor(grazingDays) : null,
    };
  }, [surface, entryHeight, exitHeight, densityIdx, growthRate, groups]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Trees className="h-5 w-5 text-green-700" />
          Pâturage — Jours d&apos;avance
        </h2>
        <p className="text-sm text-stone-500">
          Estimez les jours de pâturage disponibles en fonction de la surface, de la hauteur d&apos;herbe,
          de la densité de la prairie et de la pousse de l&apos;herbe.
        </p>
      </div>

      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 leading-relaxed">
              <p className="font-medium text-green-900 mb-1">Méthode de calcul</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Herbe disponible (kg MS) = surface × (hauteur entrée − hauteur sortie) × densité</li>
                <li>Consommation journalière = Σ (effectif × conso/j par catégorie)</li>
                <li>Pousse journalière = surface × taux de pousse (kg MS/ha/j)</li>
                <li>Jours d&apos;avance = herbe disponible / (consommation − pousse)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Parcelle & prairie</CardTitle>
            <CardDescription className="text-xs">Caractéristiques de la parcelle à pâturer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Surface (ha)</Label>
                <Input type="number" step="0.1" value={surface || ""} onChange={(e) => setSurface(Number(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hauteur d&apos;herbe entrée (cm)</Label>
                <Input type="number" step="0.5" value={entryHeight || ""} onChange={(e) => setEntryHeight(Number(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hauteur de sortie prévue (cm)</Label>
                <Input type="number" step="0.5" value={exitHeight || ""} onChange={(e) => setExitHeight(Number(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pousse de l&apos;herbe (kg MS/ha/j)</Label>
                <Input type="number" step="1" value={growthRate || ""} onChange={(e) => setGrowthRate(Number(e.target.value) || 0)} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Densité de la prairie</Label>
              <Select value={String(densityIdx)} onValueChange={(v) => setDensityIdx(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DENSITY_OPTIONS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d.label} ({d.kgPerHaCm} kg/ha/cm)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Animaux au pâturage</CardTitle>
                <CardDescription className="text-xs">Effectifs par catégorie</CardDescription>
              </div>
              <button onClick={addGroup} className="text-xs text-green-700 hover:underline">+ Ajouter</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <Select value={g.category} onValueChange={(v) => updateGroup(g.id, "category", v)}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={g.count || ""}
                  onChange={(e) => updateGroup(g.id, "count", Number(e.target.value) || 0)}
                  className="h-8 w-20 text-xs"
                  placeholder="nb"
                />
                <span className="text-[10px] text-stone-500 w-24">
                  × {DAILY_CONSUMPTION[g.category] || 0} kg/j
                </span>
                <button onClick={() => removeGroup(g.id)} className="text-stone-400 hover:text-rose-600 text-xs">×</button>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="text-xs text-stone-500 text-center py-4">Ajoutez un groupe pour commencer.</div>
            )}
            <div className="pt-2 border-t border-stone-200 flex justify-between text-xs">
              <span className="text-stone-500">Consommation totale</span>
              <span className="font-semibold">{calculation.dailyConsumption.toFixed(1)} kg MS/j</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Herbe disponible</div>
            <div className="text-xl font-bold text-stone-900">{fmt(calculation.availableGrass, 0)}</div>
            <div className="text-[10px] text-stone-500">kg MS</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Pousse journalière</div>
            <div className="text-xl font-bold text-stone-900">{fmt(calculation.dailyGrowth, 0)}</div>
            <div className="text-[10px] text-stone-500">kg MS/j</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Consommation nette</div>
            <div className="text-xl font-bold text-stone-900">{fmt(calculation.netDaily, 0)}</div>
            <div className="text-[10px] text-stone-500">kg MS/j (après pousse)</div>
          </CardContent>
        </Card>
        <Card className={`border-2 ${calculation.grazingDays !== null && calculation.grazingDays >= 7 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-stone-500 uppercase">Jours d&apos;avance</div>
              {calculation.grazingDays !== null && calculation.grazingDays >= 7 ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-amber-600" />
              )}
            </div>
            <div className={`text-2xl font-bold ${calculation.grazingDays !== null && calculation.grazingDays >= 7 ? "text-emerald-900" : "text-amber-900"}`}>
              {calculation.grazingDays !== null ? calculation.grazingDays : "∞"}
            </div>
            <div className="text-[10px] text-stone-500">jours</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-4 text-xs text-stone-600">
          <p className="font-medium text-stone-700 mb-1">Règle de gestion</p>
          <p>
            Un cheptel dispose d&apos;une sécurité suffisante lorsque les jours d&apos;avance sont ≥ 7.
            En dessous, envisagez de réduire le temps de présence sur la parcelle, d&apos;augmenter la surface
            ou de recourir à un apport de fourrage complémentaire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
