"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, allFourrages, allConcentres, type AnimalRecord, type FourrageRecord, type ConcentreRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Layers, Plus, Trash2, Users, Euro, Wheat, Download, Info, Copy,
} from "lucide-react";

type LotFeed = {
  id: string;
  kind: "fourrage" | "concentre";
  record: FourrageRecord | ConcentreRecord;
  quantityKgBrut: number;
  pricePerKg: number;
};

type Lot = {
  id: string;
  name: string;
  animalCategory: string;
  effectif: number;
  feedingDays: number;
  feeds: LotFeed[];
};

function msFromBrut(quantityBrut: number, msPct: number | null): number {
  if (!msPct || msPct <= 0) return 0;
  return quantityBrut * (msPct / 100);
}

export function AlimRationMultiLot() {
  const [lots, setLots] = useState<Lot[]>([
    {
      id: "lot-1",
      name: "Lot brebis gestantes",
      animalCategory: "",
      effectif: 50,
      feedingDays: 60,
      feeds: [],
    },
  ]);

  const availableAnimals = useMemo(() => alimData.animals.filter((a) => num(a.UFL) !== null), []);

  const addLot = () => {
    setLots([...lots, {
      id: `lot-${Date.now()}`,
      name: `Lot ${lots.length + 1}`,
      animalCategory: "",
      effectif: 30,
      feedingDays: 30,
      feeds: [],
    }]);
  };

  const removeLot = (id: string) => {
    setLots(lots.filter((l) => l.id !== id));
  };

  const updateLot = (id: string, field: keyof Lot, value: string | number) => {
    setLots(lots.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const addFeedToLot = (lotId: string, kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    setLots(lots.map((l) => {
      if (l.id !== lotId) return l;
      const id = `${kind}-${record.name}-${Date.now()}`;
      const price = num(record.price) ?? 0;
      return { ...l, feeds: [...l.feeds, { id, kind, record, quantityKgBrut: 0, pricePerKg: price }] };
    }));
  };

  const updateLotFeed = (lotId: string, feedId: string, field: "quantityKgBrut" | "pricePerKg", value: number) => {
    setLots(lots.map((l) => {
      if (l.id !== lotId) return l;
      return { ...l, feeds: l.feeds.map((f) => (f.id === feedId ? { ...f, [field]: value } : f)) };
    }));
  };

  const removeLotFeed = (lotId: string, feedId: string) => {
    setLots(lots.map((l) => {
      if (l.id !== lotId) return l;
      return { ...l, feeds: l.feeds.filter((f) => f.id !== feedId) };
    }));
  };

  const cloneLot = (lotId: string) => {
    const lot = lots.find((l) => l.id === lotId);
    if (!lot) return;
    const newLot: Lot = {
      ...lot,
      id: `lot-${Date.now()}`,
      name: `${lot.name} (copie)`,
      feeds: lot.feeds.map((f) => ({ ...f, id: `${f.id}-copy-${Date.now()}` })),
    };
    setLots([...lots, newLot]);
  };

  // Compute aggregated feed needs
  const aggregation = useMemo(() => {
    const feedMap = new Map<string, {
      name: string;
      kind: "fourrage" | "concentre";
      totalKgBrutPerDay: number;
      totalKgBrutPeriod: number;
      totalCostPerDay: number;
      totalCostPeriod: number;
      lotCount: number;
    }>();

    let totalCostPerDay = 0;
    let totalCostPeriod = 0;
    let totalAnimals = 0;

    lots.forEach((lot) => {
      totalAnimals += lot.effectif;
      lot.feeds.forEach((feed) => {
        const qtyPerAnimal = feed.quantityKgBrut;
        const qtyPerLotPerDay = qtyPerAnimal * lot.effectif;
        const qtyPerLotPeriod = qtyPerLotPerDay * lot.feedingDays;
        const costPerAnimalPerDay = feed.quantityKgBrut * feed.pricePerKg;
        const costPerLotPerDay = costPerAnimalPerDay * lot.effectif;
        const costPerLotPeriod = costPerLotPerDay * lot.feedingDays;

        totalCostPerDay += costPerLotPerDay;
        totalCostPeriod += costPerLotPeriod;

        const key = feed.record.name;
        const existing = feedMap.get(key);
        if (existing) {
          existing.totalKgBrutPerDay += qtyPerLotPerDay;
          existing.totalKgBrutPeriod += qtyPerLotPeriod;
          existing.totalCostPerDay += costPerLotPerDay;
          existing.totalCostPeriod += costPerLotPeriod;
          existing.lotCount++;
        } else {
          feedMap.set(key, {
            name: feed.record.name,
            kind: feed.kind,
            totalKgBrutPerDay: qtyPerLotPerDay,
            totalKgBrutPeriod: qtyPerLotPeriod,
            totalCostPerDay: costPerLotPerDay,
            totalCostPeriod: costPerLotPeriod,
            lotCount: 1,
          });
        }
      });
    });

    const aggregatedFeeds = Array.from(feedMap.values()).sort((a, b) => b.totalKgBrutPeriod - a.totalKgBrutPeriod);

    return {
      aggregatedFeeds,
      totalCostPerDay,
      totalCostPeriod,
      totalAnimals,
      lotCount: lots.length,
    };
  }, [lots]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-700" />
          Multi-lot — Rationnement par lots
        </h2>
        <p className="text-sm text-stone-500">
          Gérez plusieurs lots simultanément et agrégz les besoins en aliments pour le troupeau complet.
          Idéal pour planifier les achats et le stock fourrager.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">
          {lots.length} lot{lots.length > 1 ? "s" : ""} · {aggregation.totalAnimals} animaux
        </Badge>
        <Button size="sm" onClick={addLot}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un lot
        </Button>
      </div>

      {/* Lots */}
      <div className="space-y-3">
        {lots.map((lot, lotIdx) => {
          const animal = alimData.animals.find((a) => a.category === lot.animalCategory);
          const lotCostPerDay = lot.feeds.reduce((s, f) => s + f.quantityKgBrut * f.pricePerKg * lot.effectif, 0);
          const lotCostPeriod = lotCostPerDay * lot.feedingDays;
          return (
            <Card key={lot.id} className={`border-stone-200 ${lotIdx % 2 === 0 ? "border-l-4 border-l-purple-300" : "border-l-4 border-l-indigo-300"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-900 text-white text-xs font-bold flex-shrink-0">
                      {lotIdx + 1}
                    </span>
                    <Input
                      value={lot.name}
                      onChange={(e) => updateLot(lot.id, "name", e.target.value)}
                      className="h-8 text-sm font-medium flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => cloneLot(lot.id)}>
                      <Copy className="h-3 w-3 mr-1" /> Cloner
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-400 hover:text-rose-600" onClick={() => removeLot(lot.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Lot config */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-stone-500">Animal cible</Label>
                    <Select value={lot.animalCategory} onValueChange={(v) => updateLot(lot.id, "animalCategory", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {availableAnimals.map((a, i) => (
                          <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-stone-500 flex items-center gap-1"><Users className="h-2.5 w-2.5" /> Effectif</Label>
                    <Input type="number" min="1" value={lot.effectif || ""} onChange={(e) => updateLot(lot.id, "effectif", Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-stone-500">Durée (jours)</Label>
                    <Input type="number" min="1" value={lot.feedingDays || ""} onChange={(e) => updateLot(lot.id, "feedingDays", Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                </div>

                {/* Animal needs */}
                {animal && (
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: "UEM", value: num(animal.UEM) },
                      { label: "UFL", value: num(animal.UFL) },
                      { label: "PDI", value: num(animal.PDI) },
                      { label: "Pabs", value: num(animal.Pabs) },
                      { label: "Caabs", value: num(animal.Caabs) },
                    ].map((n) => (
                      <div key={n.label} className="rounded bg-stone-50 p-1 text-center">
                        <div className="text-[8px] text-stone-500 uppercase">{n.label}</div>
                        <div className="text-xs font-medium text-stone-900">{n.value !== null ? fmt(n.value) : "—"}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feeds */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-stone-600">Aliments du lot:</span>
                    <MultiLotFeedPicker kind="fourrage" onPick={(r) => addFeedToLot(lot.id, "fourrage", r as FourrageRecord)} />
                    <MultiLotFeedPicker kind="concentre" onPick={(r) => addFeedToLot(lot.id, "concentre", r as ConcentreRecord)} />
                  </div>
                  {lot.feeds.length === 0 ? (
                    <div className="text-[10px] text-stone-400 italic py-1">Aucun aliment ajouté</div>
                  ) : (
                    lot.feeds.map((feed) => (
                      <div key={feed.id} className="flex items-center gap-2 rounded border border-stone-200 p-1.5">
                        <Badge variant="outline" className={`text-[9px] ${feed.kind === "fourrage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                          {feed.kind === "fourrage" ? "F" : "C"}
                        </Badge>
                        <span className="text-xs flex-1 truncate text-stone-900">{feed.record.name}</span>
                        <Input type="number" step="0.1" min="0" value={feed.quantityKgBrut || ""} onChange={(e) => updateLotFeed(lot.id, feed.id, "quantityKgBrut", Number(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" placeholder="kg" />
                        <span className="text-[9px] text-stone-400">kg/j</span>
                        <Input type="number" step="0.01" min="0" value={feed.pricePerKg || ""} onChange={(e) => updateLotFeed(lot.id, feed.id, "pricePerKg", Number(e.target.value) || 0)} className="h-7 w-16 text-xs text-right" placeholder="€" />
                        <span className="text-[9px] text-stone-400">€/kg</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => removeLotFeed(lot.id, feed.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Lot cost */}
                {lot.feeds.length > 0 && lot.effectif > 0 && (
                  <div className="flex items-center justify-between rounded bg-amber-50 p-2 text-xs">
                    <span className="text-stone-600">Coût du lot:</span>
                    <div className="flex gap-3">
                      <span className="font-medium text-stone-900">{fmt(lotCostPerDay, 2)} €/jour</span>
                      <span className="font-bold text-amber-800">{fmt(lotCostPeriod, 0)} € / {lot.feedingDays}j</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Aggregated summary */}
      {aggregation.aggregatedFeeds.length > 0 && (
        <Card className="border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/40 to-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wheat className="h-4 w-4 text-emerald-700" />
              Besoins agrégés du troupeau
            </CardTitle>
            <CardDescription className="text-xs">
              {aggregation.lotCount} lot(s) · {aggregation.totalAnimals} animaux · Total période: {fmt(aggregation.totalCostPeriod, 0)} €
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-center px-3 py-2 font-medium">Type</th>
                    <th className="text-center px-3 py-2 font-medium">Lots</th>
                    <th className="text-right px-3 py-2 font-medium">kg brut / jour</th>
                    <th className="text-right px-3 py-2 font-medium">Total période (kg)</th>
                    <th className="text-right px-3 py-2 font-medium">Coût / jour</th>
                    <th className="text-right px-3 py-2 font-medium">Coût période</th>
                    <th className="text-right px-3 py-2 font-medium">% coût</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregation.aggregatedFeeds.map((f, i) => {
                    const pctCost = aggregation.totalCostPeriod > 0 ? (f.totalCostPeriod / aggregation.totalCostPeriod) * 100 : 0;
                    return (
                      <tr key={i} className="border-b border-stone-100">
                        <td className="px-3 py-1.5 text-stone-900 font-medium">{f.name}</td>
                        <td className="px-3 py-1.5 text-center">
                          <Badge variant="outline" className={`text-[9px] ${f.kind === "fourrage" ? "bg-lime-50 text-lime-700" : "bg-orange-50 text-orange-700"}`}>
                            {f.kind === "fourrage" ? "F" : "C"}
                          </Badge>
                        </td>
                        <td className="px-3 py-1.5 text-center tabular-nums text-stone-500">{f.lotCount}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(f.totalKgBrutPerDay, 1)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(f.totalKgBrutPeriod, 0)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(f.totalCostPerDay, 2)} €</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-800">{fmt(f.totalCostPeriod, 0)} €</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctCost}%` }} />
                            </div>
                            <span>{fmt(pctCost, 0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-stone-50 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>TOTAL</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(aggregation.aggregatedFeeds.reduce((s, f) => s + f.totalKgBrutPerDay, 0), 1)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(aggregation.aggregatedFeeds.reduce((s, f) => s + f.totalKgBrutPeriod, 0), 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(aggregation.totalCostPerDay, 2)} €</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-800">{fmt(aggregation.totalCostPeriod, 0)} €</td>
                    <td className="px-3 py-2 text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-purple-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-purple-900">Multi-lot:</strong> Définissez chaque lot avec son animal, effectif et durée.
              L&apos;outil agrège automatiquement les besoins en aliments de tout le troupeau, calcule les quantités
              totales à acheter pour la période, et le coût global. Utilisez &quot;Cloner&quot; pour dupliquer
              rapidement un lot similaire.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MultiLotFeedPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const data = kind === "fourrage" ? allFourrages : allConcentres;
  const filtered = data.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(!open)}
        className={`h-6 text-[10px] ${kind === "fourrage" ? "border-lime-300 text-lime-800 hover:bg-lime-50" : "border-orange-300 text-orange-800 hover:bg-orange-50"}`}>
        <Plus className="h-2.5 w-2.5 mr-0.5" />{kind === "fourrage" ? "Fourrage" : "Concentré"}
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 max-w-[90vw] rounded-md border border-stone-200 bg-white shadow-lg">
          <div className="p-1.5 border-b border-stone-100">
            <Input autoFocus placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.slice(0, 30).map((d, i) => (
              <button key={i} className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-stone-50 border-b border-stone-100"
                onClick={() => { onPick(d); setOpen(false); setSearch(""); }}>
                <div className="font-medium text-stone-900">{d.name}</div>
                <div className="text-[9px] text-stone-500">MS {fmt(num(d.ms_pct), 0)}% · UFL {fmt(num(d.ufl))}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
