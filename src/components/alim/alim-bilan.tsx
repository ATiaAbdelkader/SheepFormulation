"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Scale, Plus, Trash2, Info, CheckCircle2, AlertTriangle } from "lucide-react";

type LotItem = {
  id: string;
  categoryId: string;
  effectif: number;
  durationDays: number;
};

type StockItem = {
  id: string;
  name: string;
  quantityTons: number;
};

export function AlimBilan() {
  const [lots, setLots] = useState<LotItem[]>([
    { id: "lot-1", categoryId: "Brebis gestante", effectif: 50, durationDays: 60 },
  ]);
  const [stocks, setStocks] = useState<StockItem[]>([
    { id: "stock-1", name: "Foin de prairie", quantityTons: 10 },
  ]);

  // Categories available
  const lotCategories = alimData.besoins_categories;
  const stockCategories = alimData.stock_categories;

  // Compute total needs
  const totalNeeds = useMemo(() => {
    const details = lots.map((lot) => {
      const cat = lotCategories.find((c) => c.category === lot.categoryId);
      const consumption = num(cat?.consumption_kg_ms_day) || 0;
      const dailyMS = consumption * lot.effectif;
      const periodMS = dailyMS * lot.durationDays;
      return {
        ...lot,
        ugb: num(cat?.ugb),
        consumption,
        dailyMS,
        periodMS,
      };
    });
    const totalMS = details.reduce((sum, d) => sum + d.periodMS, 0);
    return { totalMS, details };
  }, [lots, lotCategories]);

  // Compute total stocks
  const totalStocks = useMemo(() => {
    return stocks.reduce((sum, s) => sum + s.quantityTons * 1000, 0);
  }, [stocks]);

  const balance = totalStocks - totalNeeds.totalMS;
  const coveragePct = totalNeeds.totalMS > 0 ? (totalStocks / totalNeeds.totalMS) * 100 : 0;

  const addLot = () => {
    setLots([
      ...lots,
      { id: `lot-${Date.now()}`, categoryId: lotCategories[0]?.category || "", effectif: 0, durationDays: 30 },
    ]);
  };

  const updateLot = (id: string, field: keyof LotItem, value: string | number) => {
    setLots(lots.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const removeLot = (id: string) => {
    setLots(lots.filter((l) => l.id !== id));
  };

  const addStock = () => {
    setStocks([
      ...stocks,
      { id: `stock-${Date.now()}`, name: "Nouveau stock", quantityTons: 0 },
    ]);
  };

  const updateStock = (id: string, field: keyof StockItem, value: string | number) => {
    setStocks(stocks.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeStock = (id: string) => {
    setStocks(stocks.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Scale className="h-5 w-5 text-teal-700" />
          Bilan fourrager du troupeau
        </h2>
        <p className="text-sm text-stone-500">
          Comparez les besoins en matière sèche de vos lots d&apos;animaux avec les stocks fourragers
          disponibles. Indicateur clé : le % de couverture des besoins.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-stone-500">Besoins totaux</div>
            <div className="text-2xl font-bold text-stone-900">{fmt(totalNeeds.totalMS / 1000, 2)} t</div>
            <div className="text-[11px] text-stone-500">{fmt(totalNeeds.totalMS, 0)} kg MS</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-stone-500">Stocks disponibles</div>
            <div className="text-2xl font-bold text-stone-900">{fmt(totalStocks / 1000, 2)} t</div>
            <div className="text-[11px] text-stone-500">{fmt(totalStocks, 0)} kg MS</div>
          </CardContent>
        </Card>
        <Card className={`border-2 ${coveragePct >= 100 ? "border-emerald-300 bg-emerald-50" : coveragePct >= 80 ? "border-amber-300 bg-amber-50" : "border-rose-300 bg-rose-50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wide text-stone-500">Couverture</div>
              {coveragePct >= 100 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div className={`text-2xl font-bold ${coveragePct >= 100 ? "text-emerald-900" : coveragePct >= 80 ? "text-amber-900" : "text-rose-900"}`}>
              {fmt(coveragePct, 0)}%
            </div>
            <div className="text-[11px] text-stone-600">
              {balance >= 0 ? `Excédent: ${fmt(balance / 1000, 2)} t` : `Déficit: ${fmt(Math.abs(balance) / 1000, 2)} t`}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lots */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Lots d&apos;animaux</CardTitle>
                <CardDescription className="text-xs">Effectifs et durées d&apos;alimentation</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addLot}>
                <Plus className="h-4 w-4 mr-1" /> Lot
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lots.length === 0 && (
              <div className="text-xs text-stone-500 text-center py-4">Ajoutez un lot pour commencer.</div>
            )}
            {lots.map((lot) => (
              <div key={lot.id} className="rounded-lg border border-stone-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Select value={lot.categoryId} onValueChange={(v) => updateLot(lot.id, "categoryId", v)}>
                    <SelectTrigger className="h-8 text-xs flex-1 mr-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lotCategories.map((c) => (
                        <SelectItem key={c.category} value={c.category}>{c.category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeLot(lot.id)} className="h-8 w-8">
                    <Trash2 className="h-3 w-3 text-stone-400" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-stone-500">Effectif</Label>
                    <Input
                      type="number"
                      value={lot.effectif || ""}
                      onChange={(e) => updateLot(lot.id, "effectif", Number(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-stone-500">Durée (j)</Label>
                    <Input
                      type="number"
                      value={lot.durationDays || ""}
                      onChange={(e) => updateLot(lot.id, "durationDays", Number(e.target.value) || 0)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-stone-500">Bilan (kg MS)</Label>
                    <div className="h-8 flex items-center text-xs font-medium tabular-nums">
                      {fmt(lots.find((l) => l.id === lot.id) ? (num(lotCategories.find((c) => c.category === lot.categoryId)?.consumption_kg_ms_day) || 0) * lot.effectif * lot.durationDays : 0, 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {lots.length > 0 && (
              <div className="pt-2 border-t border-stone-200 flex justify-between text-xs">
                <span className="text-stone-500">Total besoins</span>
                <span className="font-semibold">{fmt(totalNeeds.totalMS, 0)} kg MS</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stocks */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Stocks fourragers</CardTitle>
                <CardDescription className="text-xs">Quantités disponibles (tonnes brut)</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addStock}>
                <Plus className="h-4 w-4 mr-1" /> Stock
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stocks.length === 0 && (
              <div className="text-xs text-stone-500 text-center py-4">Ajoutez un stock pour commencer.</div>
            )}
            {stocks.map((stock) => (
              <div key={stock.id} className="rounded-lg border border-stone-200 p-3 flex items-center gap-2">
                <Input
                  value={stock.name}
                  onChange={(e) => updateStock(stock.id, "name", e.target.value)}
                  className="h-8 text-xs flex-1"
                  placeholder="Nom du fourrage"
                />
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.1"
                    value={stock.quantityTons || ""}
                    onChange={(e) => updateStock(stock.id, "quantityTons", Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="tonnes"
                  />
                </div>
                <span className="text-[10px] text-stone-500">t</span>
                <Button variant="ghost" size="icon" onClick={() => removeStock(stock.id)} className="h-8 w-8">
                  <Trash2 className="h-3 w-3 text-stone-400" />
                </Button>
              </div>
            ))}
            {stocks.length > 0 && (
              <div className="pt-2 border-t border-stone-200 flex justify-between text-xs">
                <span className="text-stone-500">Total stocks</span>
                <span className="font-semibold">{fmt(totalStocks / 1000, 2)} t ({fmt(totalStocks, 0)} kg MS)</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reference categories */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
            <Info className="h-3 w-3" />
            Catégories d&apos;animaux — UGB et consommation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Catégorie</th>
                  <th className="text-right px-3 py-2 font-medium">UGB</th>
                  <th className="text-right px-3 py-2 font-medium">Consommation (kg MS/j)</th>
                </tr>
              </thead>
              <tbody>
                {lotCategories.map((c, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="px-3 py-1.5 text-stone-900">{c.category}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmt(num(c.ugb), 1)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmt(num(c.consumption_kg_ms_day), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
