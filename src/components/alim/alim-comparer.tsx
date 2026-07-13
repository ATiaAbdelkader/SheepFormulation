"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AnimalRecord, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import { listRations, type SavedRation } from "@/lib/ration-storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GitCompare, ArrowRight, ArrowLeft, Equal, TrendingDown, TrendingUp, Info } from "lucide-react";

type ComputedRation = {
  name: string;
  animalCategory: string;
  totalMS: number;
  totalUFL: number;
  totalPDI: number;
  totalPDIN: number;
  totalPDIE: number;
  totalPabs: number;
  totalCaabs: number;
  totalCost: number;
  costPerUFL: number | null;
  derm: number | null;
  rmic: number | null;
  caPRatio: number | null;
  needs: { UEM: number | null; UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  coverage: { UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  feedCount: number;
};

function msFromBrut(quantityBrut: number, msPct: number | null): number {
  if (!msPct || msPct <= 0) return 0;
  return quantityBrut * (msPct / 100);
}

function computeRation(ration: SavedRation): ComputedRation | null {
  const animal = alimData.animals.find((a) => a.category === ration.animalCategory);
  if (!animal) return null;
  const needs = {
    UEM: num(animal.UEM),
    UFL: num(animal.UFL),
    PDI: num(animal.PDI),
    Pabs: num(animal.Pabs),
    Caabs: num(animal.Caabs),
  };

  let totalMS = 0, totalUFL = 0, totalPDIN = 0, totalPDIE = 0, totalPabs = 0, totalCaabs = 0, totalCost = 0;

  ration.feedItems.forEach((s) => {
    const source = s.kind === "fourrage" ? alimData.fourrages : alimData.concentres;
    const record = source.find((f) => f.name === s.recordName);
    if (!record) return;
    const msPct = num(record.ms_pct);
    const msQty = msFromBrut(s.quantityKgBrut, msPct);
    const ufl = num(record.ufl);
    const pdin = num((record as FourrageRecord).pdin ?? (record as ConcentreRecord).pdin);
    const pdie = num((record as FourrageRecord).pdie ?? (record as ConcentreRecord).pdie);
    const pabs = num(record.pabs);
    const caabs = num(record.caabs);
    if (ufl !== null) totalUFL += ufl * msQty;
    if (pdin !== null) totalPDIN += pdin * msQty;
    if (pdie !== null) totalPDIE += pdie * msQty;
    if (pabs !== null) totalPabs += pabs * msQty;
    if (caabs !== null) totalCaabs += caabs * msQty;
    totalMS += msQty;
    totalCost += s.quantityKgBrut * s.pricePerKg;
  });

  // CMV contribution
  const cmv = alimData.cmvs.find((c) => c.name === ration.cmvId);
  if (cmv && ration.cmvQuantity > 0) {
    const cmvKg = ration.cmvQuantity / 1000;
    const pabsPerKg = num(cmv.pabs_per_kg);
    const caabsPerKg = num(cmv.caabs_per_kg);
    if (pabsPerKg !== null) totalPabs += pabsPerKg * cmvKg;
    if (caabsPerKg !== null) totalCaabs += caabsPerKg * cmvKg;
    totalCost += cmvKg * ration.cmvPricePerKg;
  }

  const totalPDI = Math.min(totalPDIN, totalPDIE);
  const coverage = {
    UFL: needs.UFL !== null && needs.UFL > 0 ? (totalUFL / needs.UFL) * 100 : null,
    PDI: needs.PDI !== null && needs.PDI > 0 ? (totalPDI / needs.PDI) * 100 : null,
    Pabs: needs.Pabs !== null && needs.Pabs > 0 ? (totalPabs / needs.Pabs) * 100 : null,
    Caabs: needs.Caabs !== null && needs.Caabs > 0 ? (totalCaabs / needs.Caabs) * 100 : null,
  };
  const derm = totalMS > 0 ? totalUFL / totalMS : null; // simplified
  const rmic = totalUFL > 0 ? (totalPDIN - totalPDIE) / totalUFL : null;
  const caPRatio = totalPabs > 0 ? totalCaabs / totalPabs : null;
  const costPerUFL = totalUFL > 0 ? totalCost / totalUFL : null;

  return {
    name: ration.name,
    animalCategory: ration.animalCategory,
    totalMS, totalUFL, totalPDI, totalPDIN, totalPDIE, totalPabs, totalCaabs, totalCost,
    costPerUFL, derm, rmic, caPRatio, needs, coverage,
    feedCount: ration.feedItems.length,
  };
}

export function AlimComparer() {
  const savedRations = listRations();
  const [rationAId, setRationAId] = useState<string>("");
  const [rationBId, setRationBId] = useState<string>("");

  const rationA = useMemo(() => {
    if (!rationAId) return null;
    const r = savedRations.find((s) => s.id === rationAId);
    return r ? computeRation(r) : null;
  }, [rationAId, savedRations]);

  const rationB = useMemo(() => {
    if (!rationBId) return null;
    const r = savedRations.find((s) => s.id === rationBId);
    return r ? computeRation(r) : null;
  }, [rationBId, savedRations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-indigo-700" />
          Comparer deux rations
        </h2>
        <p className="text-sm text-stone-500">
          Comparez deux rations enregistrées côte à côte : composition, coûts, couverture des besoins,
          indicateurs (DERm, RMIC, Ca/P). Idéal pour évaluer des scénarios (hiver vs transition, etc.).
        </p>
      </div>

      {savedRations.length < 2 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Vous avez besoin d&apos;au moins 2 rations enregistrées pour les comparer.
            <br />
            <span className="text-xs">Allez dans le module <strong>Ration</strong>, créez et enregistrez des rations, puis revenez ici.</span>
            <div className="mt-3 text-xs">
              Rations actuelles : <Badge variant="outline">{savedRations.length}</Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">A</span>
                  Ration A
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={rationAId} onValueChange={setRationAId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {savedRations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">B</span>
                  Ration B
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={rationBId} onValueChange={setRationBId}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {savedRations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {rationA && rationB && (
            <ComparisonTable a={rationA} b={rationB} />
          )}

          {rationA && !rationB && (
            <Card className="border-stone-200 bg-stone-50">
              <CardContent className="p-6 text-center text-sm text-stone-500">
                Sélectionnez la ration B pour comparer.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ComparisonTable({ a, b }: { a: ComputedRation; b: ComputedRation }) {
  const rows: Array<{
    label: string;
    a: string;
    b: string;
    diff: string;
    better: "a" | "b" | "equal" | null;
    betterHint?: string;
  }> = [
    {
      label: "Animal",
      a: a.animalCategory.slice(0, 40),
      b: b.animalCategory.slice(0, 40),
      diff: a.animalCategory === b.animalCategory ? "Identique" : "Différent",
      better: a.animalCategory === b.animalCategory ? "equal" : null,
    },
    {
      label: "Nombre d'aliments",
      a: String(a.feedCount),
      b: String(b.feedCount),
      diff: `${b.feedCount - a.feedCount > 0 ? "+" : ""}${b.feedCount - a.feedCount}`,
      better: a.feedCount === b.feedCount ? "equal" : null,
    },
    {
      label: "MS totale (kg/j)",
      a: fmt(a.totalMS, 2),
      b: fmt(b.totalMS, 2),
      diff: fmt(b.totalMS - a.totalMS, 2),
      better: null,
    },
    {
      label: "UFL fournis",
      a: fmt(a.totalUFL, 2),
      b: fmt(b.totalUFL, 2),
      diff: fmt(b.totalUFL - a.totalUFL, 2),
      better: null,
    },
    {
      label: "PDI fournis (g)",
      a: fmt(a.totalPDI, 0),
      b: fmt(b.totalPDI, 0),
      diff: fmt(b.totalPDI - a.totalPDI, 0),
      better: null,
    },
    {
      label: "Pabs fournis (g)",
      a: fmt(a.totalPabs, 2),
      b: fmt(b.totalPabs, 2),
      diff: fmt(b.totalPabs - a.totalPabs, 2),
      better: null,
    },
    {
      label: "Caabs fournis (g)",
      a: fmt(a.totalCaabs, 2),
      b: fmt(b.totalCaabs, 2),
      diff: fmt(b.totalCaabs - a.totalCaabs, 2),
      better: null,
    },
    {
      label: "Coût / animal / jour (€)",
      a: fmt(a.totalCost, 3),
      b: fmt(b.totalCost, 3),
      diff: `${b.totalCost - a.totalCost > 0 ? "+" : ""}${fmt(b.totalCost - a.totalCost, 3)}`,
      better: a.totalCost < b.totalCost ? "a" : a.totalCost > b.totalCost ? "b" : "equal",
      betterHint: "moins cher",
    },
    {
      label: "Coût par UFL (€)",
      a: a.costPerUFL !== null ? fmt(a.costPerUFL, 3) : "—",
      b: b.costPerUFL !== null ? fmt(b.costPerUFL, 3) : "—",
      diff: a.costPerUFL !== null && b.costPerUFL !== null ? fmt(b.costPerUFL - a.costPerUFL, 3) : "—",
      better: a.costPerUFL !== null && b.costPerUFL !== null ? (a.costPerUFL < b.costPerUFL ? "a" : a.costPerUFL > b.costPerUFL ? "b" : "equal") : null,
      betterHint: "meilleur ratio coût/énergie",
    },
    {
      label: "Couverture UFL (%)",
      a: a.coverage.UFL !== null ? fmt(a.coverage.UFL, 0) + "%" : "—",
      b: b.coverage.UFL !== null ? fmt(b.coverage.UFL, 0) + "%" : "—",
      diff: a.coverage.UFL !== null && b.coverage.UFL !== null ? fmt(b.coverage.UFL - a.coverage.UFL, 0) + "%" : "—",
      better: null,
    },
    {
      label: "Couverture PDI (%)",
      a: a.coverage.PDI !== null ? fmt(a.coverage.PDI, 0) + "%" : "—",
      b: b.coverage.PDI !== null ? fmt(b.coverage.PDI, 0) + "%" : "—",
      diff: a.coverage.PDI !== null && b.coverage.PDI !== null ? fmt(b.coverage.PDI - a.coverage.PDI, 0) + "%" : "—",
      better: null,
    },
    {
      label: "RMIC (g PDI/UFL)",
      a: a.rmic !== null ? fmt(a.rmic, 1) : "—",
      b: b.rmic !== null ? fmt(b.rmic, 1) : "—",
      diff: a.rmic !== null && b.rmic !== null ? fmt(b.rmic - a.rmic, 1) : "—",
      better: null,
    },
    {
      label: "Rapport Ca/P",
      a: a.caPRatio !== null ? fmt(a.caPRatio, 2) : "—",
      b: b.caPRatio !== null ? fmt(b.caPRatio, 2) : "—",
      diff: a.caPRatio !== null && b.caPRatio !== null ? fmt(b.caPRatio - a.caPRatio, 2) : "—",
      better: null,
    },
  ];

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Tableau comparatif</CardTitle>
        <CardDescription className="text-xs">
          Différence = B − A. <span className="text-emerald-700">Vert</span> = meilleure valeur,
          <span className="text-rose-700"> rouge</span> = moins bonne.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Indicateur</th>
                <th className="text-right px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-bold">A</span>
                    {a.name}
                  </span>
                </th>
                <th className="text-right px-3 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[9px] font-bold">B</span>
                    {b.name}
                  </span>
                </th>
                <th className="text-right px-3 py-2.5 font-medium">Différence</th>
                <th className="text-center px-3 py-2.5 font-medium">Avantage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                  <td className="px-3 py-2 text-stone-700 text-xs">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-xs">
                    <span className={row.better === "b" ? "text-rose-600" : ""}>{row.a}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-xs">
                    <span className={row.better === "a" ? "text-rose-600" : ""}>{row.b}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs text-stone-500">{row.diff}</td>
                  <td className="px-3 py-2 text-center">
                    {row.better === "a" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium" title={row.betterHint}>
                        <ArrowLeft className="h-3 w-3" /> A
                      </span>
                    )}
                    {row.better === "b" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium" title={row.betterHint}>
                        B <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                    {row.better === "equal" && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-400">
                        <Equal className="h-3 w-3" />
                      </span>
                    )}
                    {row.better === null && <span className="text-[10px] text-stone-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
