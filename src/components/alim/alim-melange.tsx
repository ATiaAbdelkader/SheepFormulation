"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type ConcentreRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Blend, Info, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

export function AlimMelange() {
  const [conc1Id, setConc1Id] = useState<string>("");
  const [conc2Id, setConc2Id] = useState<string>("");
  const [targetUFL, setTargetUFL] = useState<number>(1.0);
  const [targetPDIN, setTargetPDIN] = useState<number>(150);

  const conc1 = useMemo(() => alimData.concentres.find((c) => c.name === conc1Id), [conc1Id]);
  const conc2 = useMemo(() => alimData.concentres.find((c) => c.name === conc2Id), [conc2Id]);

  // Solve system of 2 equations and 2 unknowns
  // x * ufl1 + y * ufl2 = target_ufl  (1)
  // x * pdin1 + y * pdin2 = target_pdin (2)
  // Where x and y are in kg, and ufl1, ufl2 are per kg brut
  // Note: For mix to work, we want x + y = 1 (1 kg of mix)
  // So: x * ufl1 + (1-x) * ufl2 = target_ufl
  //     x = (target_ufl - ufl2) / (ufl1 - ufl2)
  const result = useMemo(() => {
    if (!conc1 || !conc2) return null;
    const ufl1 = num(conc1.ufl);
    const ufl2 = num(conc2.ufl);
    const pdin1 = num(conc1.pdin);
    const pdin2 = num(conc2.pdin);
    if (ufl1 === null || ufl2 === null || pdin1 === null || pdin2 === null) return null;
    if (Math.abs(ufl1 - ufl2) < 0.001) return { error: "UFL identiques pour les deux concentrés — le mélange n'est pas possible." };

    // Solve for x and y where x + y = 1
    // From equations:
    //   x*ufl1 + y*ufl2 = target_ufl
    //   x*pdin1 + y*pdin2 = target_pdin
    // With y = 1 - x:
    //   x*ufl1 + (1-x)*ufl2 = target_ufl
    //   x = (target_ufl - ufl2) / (ufl1 - ufl2)
    const x = (targetUFL - ufl2) / (ufl1 - ufl2);
    const y = 1 - x;

    if (x < 0 || y < 0 || x > 1 || y > 1) {
      // Mixture not feasible - try using PDIN instead
      if (Math.abs(pdin1 - pdin2) < 0.001) return { error: "PDIN identiques pour les deux concentrés." };
      const xAlt = (targetPDIN - pdin2) / (pdin1 - pdin2);
      const yAlt = 1 - xAlt;
      if (xAlt < 0 || yAlt < 0 || xAlt > 1 || yAlt > 1) {
        return { error: "Mélange impossible avec ces objectifs. Les valeurs cibles sont hors de portée des deux concentrés." };
      }
      return computeMix(xAlt, yAlt, conc1, conc2);
    }

    return computeMix(x, y, conc1, conc2);
  }, [conc1, conc2, targetUFL, targetPDIN]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Blend className="h-5 w-5 text-cyan-700" />
          Mélange de 2 concentrés
        </h2>
        <p className="text-sm text-stone-500">
          Calcul de la composition d&apos;un mélange de 2 concentrés (système de 2 équations à 2 inconnues).
          Définissez un objectif UFL ou PDIN, l&apos;outil calcule la proportion de chaque concentré.
        </p>
      </div>

      <Card className="border-cyan-200 bg-cyan-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 leading-relaxed">
              <p className="font-medium text-cyan-900 mb-1">Principe</p>
              <p>
                On cherche x et y tels que x + y = 1 (1 kg de mélange) et :
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>x × UFL₁ + y × UFL₂ = UFL cible</li>
                <li>x × PDIN₁ + y × PDIN₂ = PDIN cible</li>
              </ul>
              <p className="mt-1">Si l&apos;objectif UFL est impossible à atteindre (hors plage), l&apos;outil tente l&apos;objectif PDIN.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Concentrés</CardTitle>
            <CardDescription className="text-xs">Sélectionnez les 2 concentrés à mélanger</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Concentré N°1</Label>
              <Select value={conc1Id} onValueChange={setConc1Id}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {alimData.concentres.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conc1 && (
                <div className="grid grid-cols-4 gap-1 text-[11px] mt-1">
                  <MiniVal label="MS%" value={fmt(num(conc1.ms_pct), 0)} />
                  <MiniVal label="UFL" value={fmt(num(conc1.ufl))} />
                  <MiniVal label="PDIN" value={fmt(num(conc1.pdin), 0)} />
                  <MiniVal label="Pabs" value={fmt(num(conc1.pabs), 1)} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Concentré N°2</Label>
              <Select value={conc2Id} onValueChange={setConc2Id}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {alimData.concentres.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conc2 && (
                <div className="grid grid-cols-4 gap-1 text-[11px] mt-1">
                  <MiniVal label="MS%" value={fmt(num(conc2.ms_pct), 0)} />
                  <MiniVal label="UFL" value={fmt(num(conc2.ufl))} />
                  <MiniVal label="PDIN" value={fmt(num(conc2.pdin), 0)} />
                  <MiniVal label="Pabs" value={fmt(num(conc2.pabs), 1)} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Objectifs du mélange</CardTitle>
            <CardDescription className="text-xs">Valeurs cibles par kg de mélange</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">UFL cible (par kg brut)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetUFL || ""}
                onChange={(e) => setTargetUFL(Number(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PDIN cible (g/kg brut)</Label>
              <Input
                type="number"
                step="1"
                value={targetPDIN || ""}
                onChange={(e) => setTargetPDIN(Number(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div className="rounded-md bg-stone-50 p-2 text-[11px] text-stone-600">
              <p>Astuce : pour un mélange à énergie moyenne, viser ~1.0 UFL. Pour un mélange protéique, viser ~200 g PDIN.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Result */}
      {result && (
        <Card className={`border-2 ${"error" in result ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              {"error" in result ? (
                <AlertTriangle className="h-4 w-4 text-rose-700" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              )}
              Résultat du mélange
            </CardTitle>
          </CardHeader>
          <CardContent>
            {"error" in result ? (
              <p className="text-sm text-rose-800">{result.error}</p>
            ) : (
              <div className="space-y-4">
                {/* Composition */}
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 rounded-lg bg-white border border-stone-200 p-3 text-center">
                    <div className="text-[10px] text-stone-500 uppercase">Concentré 1</div>
                    <div className="text-sm font-bold text-stone-900 truncate">{conc1?.name}</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{fmt(result.x * 100, 1)}%</div>
                    <div className="text-[10px] text-stone-500">{fmt(result.x, 3)} kg/kg mélange</div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-stone-400 text-xl">+</span>
                  </div>
                  <div className="flex-1 rounded-lg bg-white border border-stone-200 p-3 text-center">
                    <div className="text-[10px] text-stone-500 uppercase">Concentré 2</div>
                    <div className="text-sm font-bold text-stone-900 truncate">{conc2?.name}</div>
                    <div className="text-2xl font-bold text-emerald-700 mt-1">{fmt(result.y * 100, 1)}%</div>
                    <div className="text-[10px] text-stone-500">{fmt(result.y, 3)} kg/kg mélange</div>
                  </div>
                </div>

                {/* Mix values */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MixVal label="UFL/kg" target={targetUFL} actual={result.mixUFL} />
                  <MixVal label="PDIN (g/kg)" target={targetPDIN} actual={result.mixPDIN} />
                  <MixVal label="PDIE (g/kg)" actual={result.mixPDIE} />
                  <MixVal label="Pabs (g/kg)" actual={result.mixPabs} />
                </div>

                {/* Visual bar */}
                <div>
                  <div className="text-xs text-stone-600 mb-1.5">Composition visuelle</div>
                  <div className="h-6 rounded-full overflow-hidden flex ring-1 ring-stone-200">
                    <div
                      className="bg-cyan-600 flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ width: `${result.x * 100}%` }}
                    >
                      {result.x > 0.1 ? `${fmt(result.x * 100, 0)}%` : ""}
                    </div>
                    <div
                      className="bg-emerald-600 flex items-center justify-center text-[10px] text-white font-medium"
                      style={{ width: `${result.y * 100}%` }}
                    >
                      {result.y > 0.1 ? `${fmt(result.y * 100, 0)}%` : ""}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!conc1 || !conc2 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-6 text-center text-sm text-stone-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Sélectionnez deux concentrés pour calculer le mélange.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function computeMix(x: number, y: number, c1: ConcentreRecord, c2: ConcentreRecord) {
  const mixUFL = x * (num(c1.ufl) || 0) + y * (num(c2.ufl) || 0);
  const mixPDIN = x * (num(c1.pdin) || 0) + y * (num(c2.pdin) || 0);
  const mixPDIE = x * (num(c1.pdie) || 0) + y * (num(c2.pdie) || 0);
  const mixPabs = x * (num(c1.pabs) || 0) + y * (num(c2.pabs) || 0);
  return { x, y, mixUFL, mixPDIN, mixPDIE, mixPabs };
}

function MiniVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-stone-100 p-1 text-center">
      <div className="text-[9px] text-stone-500">{label}</div>
      <div className="text-xs font-medium text-stone-900">{value}</div>
    </div>
  );
}

function MixVal({ label, target, actual }: { label: string; target?: number; actual: number }) {
  const matchTarget = target !== undefined && Math.abs(actual - target) < 0.01;
  return (
    <div className={`rounded-lg p-2 ${matchTarget ? "bg-emerald-100 ring-1 ring-emerald-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase">{label}</div>
      <div className="text-sm font-bold text-stone-900">{fmt(actual, 2)}</div>
      {target !== undefined && (
        <div className="text-[9px] text-stone-500">cible: {fmt(target, 2)}</div>
      )}
    </div>
  );
}
