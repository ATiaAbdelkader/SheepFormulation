"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Info } from "lucide-react";

type LotSchedule = {
  id: string;
  name: string;
  effectif: number;
  stage: string; // physiological stage
  startMonth: number; // 0-11 (Jan=0)
  durationMonths: number;
};

type StageInfo = {
  name: string;
  color: string;
  bgColor: string;
  description: string;
};

const STAGES: StageInfo[] = [
  { name: "Vide / Entretien", color: "text-stone-700", bgColor: "bg-stone-300", description: "Brebis taries, entre sevrage et mise-bas" },
  { name: "Gestation début", color: "text-blue-700", bgColor: "bg-blue-300", description: "Semaines -5 à 0 avant agnelage" },
  { name: "Gestation fin", color: "text-blue-800", bgColor: "bg-blue-400", description: "Semaines -3 à 0 (forts besoins)" },
  { name: "Mise-bas / Allaitante début", color: "text-emerald-700", bgColor: "bg-emerald-400", description: "Semaines 0 à +3 (production laitière max)" },
  { name: "Allaitante milieu", color: "text-emerald-800", bgColor: "bg-emerald-500", description: "Semaines +4 à +6" },
  { name: "Allaitante fin", color: "text-emerald-900", bgColor: "bg-emerald-600", description: "Semaines +7 à +10 (sevrage)" },
  { name: "Flushing", color: "text-purple-700", bgColor: "bg-purple-300", description: "3 semaines avant lutte (pré-saillie)" },
  { name: "Lutte / Saillie", color: "text-pink-700", bgColor: "bg-pink-300", description: "Période de reproduction" },
  { name: "Engrais", color: "text-amber-700", bgColor: "bg-amber-400", description: "Croissance et finition" },
  { name: "Croissance", color: "text-lime-700", bgColor: "bg-lime-300", description: "Agnelles de renouvellement" },
];

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export function AlimCalendrier() {
  const [lots, setLots] = useState<LotSchedule[]>([
    { id: "lot-1", name: "Lot brebis principales", effectif: 80, stage: "Gestation fin", startMonth: 10, durationMonths: 2 },
    { id: "lot-2", name: "Lot agneaux engrais", effectif: 120, stage: "Engrais", startMonth: 1, durationMonths: 4 },
    { id: "lot-3", name: "Lot béliers", effectif: 5, stage: "Lutte / Saillie", startMonth: 8, durationMonths: 2 },
  ]);

  const addLot = () => {
    setLots([...lots, {
      id: `lot-${Date.now()}`,
      name: "Nouveau lot",
      effectif: 0,
      stage: "Vide / Entretien",
      startMonth: 0,
      durationMonths: 3,
    }]);
  };

  const updateLot = (id: string, field: keyof LotSchedule, value: string | number) => {
    setLots(lots.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLot = (id: string) => {
    setLots(lots.filter((l) => l.id !== id));
  };

  // Compute monthly summary
  const monthlySummary = useMemo(() => {
    const summary = Array(12).fill(0).map(() => ({ effectif: 0, stages: new Set<string>() }));
    lots.forEach((lot) => {
      for (let m = 0; m < lot.durationMonths; m++) {
        const monthIdx = (lot.startMonth + m) % 12;
        summary[monthIdx].effectif += lot.effectif;
        summary[monthIdx].stages.add(lot.stage);
      }
    });
    return summary;
  }, [lots]);

  const totalAnimals = lots.reduce((s, l) => s + l.effectif, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-indigo-700" />
          Calendrier de production du troupeau
        </h2>
        <p className="text-sm text-stone-500">
          Planifiez les stades physiologiques de vos lots sur l&apos;année. Visualisez les périodes de forte
          demande (gestation, allaitement) et anticipez les changements de ration.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Total lots</div>
            <div className="text-xl font-bold text-stone-900">{lots.length}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Total animaux</div>
            <div className="text-xl font-bold text-stone-900">{totalAnimals}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Pic d&apos;effectif</div>
            <div className="text-xl font-bold text-stone-900">{Math.max(...monthlySummary.map((m) => m.effectif))}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="text-[10px] text-stone-500 uppercase">Mois le + chargé</div>
            <div className="text-xl font-bold text-stone-900">
              {MONTHS[monthlySummary.indexOf(max(monthlySummary.map((m) => m.effectif)))]}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt chart */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Planning annuel</CardTitle>
              <CardDescription className="text-xs">Vue Gantt des stades physiologiques par lot</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addLot}>
              <Plus className="h-4 w-4 mr-1" /> Lot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Month headers */}
          <div className="flex items-center gap-1">
            <div className="w-40 sm:w-56 flex-shrink-0 text-[10px] text-stone-500 uppercase font-medium">Lot</div>
            <div className="flex-1 grid grid-cols-12 gap-px">
              {MONTHS.map((m, i) => (
                <div key={i} className="text-center text-[10px] text-stone-600 font-medium py-1">
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Lot rows */}
          {lots.map((lot) => {
            const stage = STAGES.find((s) => s.name === lot.stage) || STAGES[0];
            return (
              <div key={lot.id} className="flex items-center gap-1 group">
                <div className="w-40 sm:w-56 flex-shrink-0 flex items-center gap-1">
                  <Input
                    value={lot.name}
                    onChange={(e) => updateLot(lot.id, "name", e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeLot(lot.id)} className="h-7 w-7 text-stone-400 hover:text-rose-600 opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1 grid grid-cols-12 gap-px relative">
                  {Array(12).fill(0).map((_, monthIdx) => {
                    const inSchedule = (() => {
                      for (let m = 0; m < lot.durationMonths; m++) {
                        if ((lot.startMonth + m) % 12 === monthIdx) return true;
                      }
                      return false;
                    })();
                    return (
                      <div
                        key={monthIdx}
                        className={`h-8 rounded-sm ${inSchedule ? stage.bgColor : "bg-stone-100"} flex items-center justify-center`}
                      >
                        {inSchedule && monthIdx === lot.startMonth && (
                          <span className="text-[8px] font-medium text-white truncate px-0.5">
                            {lot.effectif > 0 ? `${lot.effectif}` : ""}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {lots.length === 0 && (
            <div className="text-center text-sm text-stone-500 py-8">
              Aucun lot. Cliquez sur &quot;Lot&quot; pour ajouter un lot à votre planning.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot details editor */}
      {lots.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Détail des lots</CardTitle>
            <CardDescription className="text-xs">Configurez le stade, le mois de début et la durée</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {lots.map((lot) => {
              const stage = STAGES.find((s) => s.name === lot.stage) || STAGES[0];
              return (
                <div key={lot.id} className="rounded-lg border border-stone-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-[10px] text-stone-500">Nom du lot</Label>
                    <div className="text-sm font-medium text-stone-900 truncate">{lot.name}</div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-stone-500">Effectif</Label>
                    <Input
                      type="number"
                      value={lot.effectif || ""}
                      onChange={(e) => updateLot(lot.id, "effectif", Number(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-stone-500">Stade</Label>
                    <Select value={lot.stage} onValueChange={(v) => updateLot(lot.id, "stage", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-[10px] text-stone-500">Début</Label>
                      <Select value={String(lot.startMonth)} onValueChange={(v) => updateLot(lot.id, "startMonth", Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m, i) => (
                            <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-stone-500">Durée (mois)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        value={lot.durationMonths}
                        onChange={(e) => updateLot(lot.id, "durationMonths", Number(e.target.value) || 1)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Monthly summary */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Effectif total par mois</CardTitle>
          <CardDescription className="text-xs">Somme des animaux présents chaque mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {monthlySummary.map((m, i) => {
              const maxEff = Math.max(...monthlySummary.map((x) => x.effectif));
              const pct = maxEff > 0 ? (m.effectif / maxEff) * 100 : 0;
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-[10px] text-stone-500 mb-1">{m.effectif}</div>
                  <div className="w-full h-20 bg-stone-100 rounded-sm flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-sm ${m.stages.size > 2 ? "bg-rose-400" : m.stages.size > 1 ? "bg-amber-400" : m.stages.size > 0 ? "bg-emerald-400" : ""}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-stone-600 font-medium mt-1">{MONTHS[i]}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-stone-700">Légende des stades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {STAGES.map((s) => (
              <div key={s.name} className="flex items-start gap-2 text-xs">
                <span className={`w-3 h-3 rounded ${s.bgColor} flex-shrink-0 mt-0.5`} />
                <div>
                  <span className="font-medium text-stone-900">{s.name}</span>
                  <span className="text-stone-500 block text-[10px]">{s.description}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function max(arr: number[]): number {
  return Math.max(...arr);
}
