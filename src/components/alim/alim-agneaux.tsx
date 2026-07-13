"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AgneauRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Baby, Search, Info, Calculator } from "lucide-react";

const POIDS = ["15 kg", "20 kg", "25 kg", "30 kg", "35 kg", "40 kg"];
const GMQ = ["150 g", "200 g", "250 g", "300 g", "350 g", "400 g", "450 g"];
const POTENTIELS = ["Elevé", "Modéré"];
const SEXES = ["femelle", "mâle"];

export function AlimAgneaux() {
  const [search, setSearch] = useState("");
  const [poids, setPoids] = useState<string>("all");
  const [potentiel, setPotentiel] = useState<string>("all");
  const [sexe, setSexe] = useState<string>("all");

  // Calculator state
  const [calcPoids, setCalcPoids] = useState<string>("30 kg");
  const [calcGmq, setCalcGmq] = useState<string>("250 g");
  const [calcPotentiel, setCalcPotentiel] = useState<string>("Elevé");
  const [calcSexe, setCalcSexe] = useState<string>("mâle");
  const [prixAliment, setPrixAliment] = useState<number>(250);
  const [nbAgneaux, setNbAgneaux] = useState<number>(50);
  const [duree, setDuree] = useState<number>(60);

  const filtered = useMemo(() => {
    return alimData.agneaux.filter((a) => {
      if (search && !a.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (poids !== "all" && a.poids !== poids) return false;
      if (potentiel !== "all" && a.potentiel !== potentiel) return false;
      if (sexe !== "all" && a.sexe !== sexe) return false;
      return true;
    });
  }, [search, poids, potentiel, sexe]);

  // Calculator: find matching agneau record
  const calcRecord = useMemo(() => {
    return alimData.agneaux.find(
      (a) => a.poids === calcPoids && a.gmq === calcGmq && a.potentiel === calcPotentiel && a.sexe === calcSexe
    );
  }, [calcPoids, calcGmq, calcPotentiel, calcSexe]);

  // Estimate daily feed intake (kg/j) based on UFV need
  // A reasonable assumption: 1 kg of feed provides ~1 UFV (mixed concentrate)
  // Better approach: feed quantity ~ 3.5% of body weight (kg MS/day)
  const calcResults = useMemo(() => {
    if (!calcRecord || num(calcRecord.UFV) === null) return null;
    const poidsNum = parseInt(calcPoids);
    // Dry matter intake: ~3.5% of body weight for fattening lambs
    const dailyMS = poidsNum * 0.035; // kg MS / day
    // Convert to kg brut assuming 88% MS (typical concentrate)
    const dailyBrut = dailyMS / 0.88;
    // UFV concentration needed
    const ufvPerKgMS = num(calcRecord.UFV)! / dailyMS;
    // Days to reach 40 kg from current weight (target = 40 kg)
    const gmqNum = parseInt(calcGmq);
    const daysToTarget = Math.round((40 - poidsNum) * 1000 / gmqNum);
    // Total feed
    const totalFeed = dailyBrut * daysToTarget * nbAgneaux;
    // Cost
    const costPerDayPerLamb = (dailyBrut * prixAliment) / 1000;
    const totalCost = costPerDayPerLamb * daysToTarget * nbAgneaux;

    return {
      dailyMS,
      dailyBrut,
      ufvPerKgMS,
      daysToTarget,
      totalFeed,
      costPerDayPerLamb,
      totalCost,
      totalCostPerLamb: costPerDayPerLamb * daysToTarget,
    };
  }, [calcRecord, calcPoids, calcGmq, nbAgneaux, prixAliment, duree]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Baby className="h-5 w-5 text-yellow-700" />
          Agneaux à l&apos;engrais — Besoins alimentaires
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.agneaux.length} combinaisons poids × GMQ × potentiel × sexe. Les besoins sont
          exprimés en UFV (Unité Fourragère Viande), PDI, Pabs et Caabs.
        </p>
      </div>

      {/* Calculator */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4 text-emerald-700" />
            Calculateur d&apos;engraissement
          </CardTitle>
          <CardDescription className="text-xs">
            Estimation des quantités d&apos;aliment et du coût total pour un lot d&apos;agneaux.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Poids vif</Label>
              <Select value={calcPoids} onValueChange={setCalcPoids}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{POIDS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GMQ (gain quotidien)</Label>
              <Select value={calcGmq} onValueChange={setCalcGmq}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{GMQ.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Potentiel</Label>
              <Select value={calcPotentiel} onValueChange={setCalcPotentiel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{POTENTIELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sexe</Label>
              <Select value={calcSexe} onValueChange={setCalcSexe}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{SEXES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Prix de l&apos;aliment (€/tonne)</Label>
              <Input type="number" value={prixAliment} onChange={(e) => setPrixAliment(Number(e.target.value) || 0)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre d&apos;agneaux</Label>
              <Input type="number" value={nbAgneaux} onChange={(e) => setNbAgneaux(Number(e.target.value) || 0)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Durée d&apos;engraissement (j)</Label>
              <Input type="number" value={duree} onChange={(e) => setDuree(Number(e.target.value) || 0)} className="h-9" />
            </div>
          </div>

          {calcResults ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-emerald-200">
              <ResultBox label="Besoin UFV/j" value={fmt(num(calcRecord?.UFV), 2)} />
              <ResultBox label="Aliment/j/agneau" value={`${fmt(calcResults.dailyBrut, 2)} kg`} />
              <ResultBox label="Coût/j/agneau" value={`${fmt(calcResults.costPerDayPerLamb, 2)} €`} />
              <ResultBox label="Jours jusqu&apos;à 40 kg" value={`${calcResults.daysToTarget} j`} highlight />
              <ResultBox label="Qté totale (lot entier)" value={`${fmt(calcResults.totalFeed, 0)} kg`} />
              <ResultBox label="Coût total/agneau" value={`${fmt(calcResults.totalCostPerLamb, 2)} €`} />
              <ResultBox label="Coût total du lot" value={`${fmt(calcResults.totalCost, 0)} €`} highlight />
              <ResultBox label="UFV/kg MS requis" value={fmt(calcResults.ufvPerKgMS, 2)} />
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <Info className="h-4 w-4 inline mr-1" />
              Aucune donnée disponible pour cette combinaison. Essayez d&apos;autres paramètres.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-stone-700">Table des besoins</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-1 space-y-1.5">
            <Label className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input placeholder="Description..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Poids</Label>
            <Select value={poids} onValueChange={setPoids}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {POIDS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Potentiel</Label>
            <Select value={potentiel} onValueChange={setPotentiel}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {POTENTIELS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sexe</Label>
            <Select value={sexe} onValueChange={setSexe}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {SEXES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Badge variant="outline" className="bg-stone-50">{filtered.length} combinaisons</Badge>

      <Card className="border-stone-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Poids</th>
                  <th className="text-left px-3 py-2.5 font-medium">GMQ</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Potentiel</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Sexe</th>
                  <th className="text-right px-3 py-2.5 font-medium">UFV</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDI (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Pabs (g)</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Caabs (g)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((a, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="px-3 py-2 font-medium">{a.poids}</td>
                    <td className="px-3 py-2">{a.gmq}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">
                      <Badge variant={a.potentiel === "Elevé" ? "default" : "secondary"} className="text-[10px]">
                        {a.potentiel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 hidden sm:table-cell capitalize text-stone-600">{a.sexe}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(num(a.UFV))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(num(a.PDI), 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{fmt(num(a.Pabs), 1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums hidden sm:table-cell">{fmt(num(a.Caabs), 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-stone-500">
              <Info className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              Aucun résultat.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2.5 ${highlight ? "bg-emerald-100 ring-1 ring-emerald-300" : "bg-white border border-stone-200"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`text-base font-bold ${highlight ? "text-emerald-900" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}
