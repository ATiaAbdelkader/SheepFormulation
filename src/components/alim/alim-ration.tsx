"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type AnimalRecord, type FourrageRecord, type ConcentreRecord, type CMVRecord } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  saveRation, loadRation, deleteRation, listRations,
  type SavedRation,
} from "@/lib/ration-storage";
import {
  Calculator, Plus, Trash2, AlertTriangle, CheckCircle2, Info,
  Save, FolderOpen, Euro, Users, Calendar, X, FileText,
} from "lucide-react";
import { RationPieChart, NutrientRadarChart } from "./alim-charts";

const PIE_COLORS = [
  "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4",
  "#84cc16", "#f97316", "#6366f1", "#ef4444", "#14b8a6",
  "#a855f7", "#eab308", "#22c55e", "#3b82f6", "#d946ef",
];

type FeedItem = {
  id: string;
  kind: "fourrage" | "concentre" | "custom";
  record: FourrageRecord | ConcentreRecord;
  quantityKgBrut: number; // kg brut / animal / jour
  pricePerKg: number; // € / kg brut (user editable, defaults from data)
};

// Compute the dry-matter quantity (kg MS) from kg brut and % MS
function msFromBrut(quantityBrut: number, msPct: number | null): number {
  if (!msPct || msPct <= 0) return 0;
  return quantityBrut * (msPct / 100);
}

// Get UFL value per kg MS for a feed (forages use .ufl, concentrates use .ufl)
function feedUFL(f: FourrageRecord | ConcentreRecord): number | null {
  return num(f.ufl);
}

function feedPDIN(f: FourrageRecord | ConcentreRecord): number | null {
  return num((f as FourrageRecord).pdin ?? (f as ConcentreRecord).pdin);
}

function feedPDIE(f: FourrageRecord | ConcentreRecord): number | null {
  return num((f as FourrageRecord).pdie ?? (f as ConcentreRecord).pdie);
}

function feedPabs(f: FourrageRecord | ConcentreRecord): number | null {
  return num(f.pabs);
}

function feedCaabs(f: FourrageRecord | ConcentreRecord): number | null {
  return num(f.caabs);
}

function feedMS(f: FourrageRecord | ConcentreRecord): number | null {
  return num(f.ms_pct);
}

// Default price from record (€/kg brut)
function defaultPrice(f: FourrageRecord | ConcentreRecord): number {
  return num(f.price) ?? 0;
}

export function AlimRation() {
  const [animalCategory, setAnimalCategory] = useState<string>("");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [cmvId, setCmvId] = useState<string>("");
  const [cmvQuantity, setCmvQuantity] = useState<number>(0);
  const [cmvPricePerKg, setCmvPricePerKg] = useState<number>(0.5); // €/kg CMV
  // Lot economics
  const [lotSize, setLotSize] = useState<number>(50);
  const [feedingDays, setFeedingDays] = useState<number>(30);

  // Save/Load state
  const [savedRations, setSavedRations] = useState<SavedRation[]>(() => listRations());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [rationName, setRationName] = useState("");

  // Available animals (only those with UFL values)
  const availableAnimals = useMemo(() => {
    return alimData.animals.filter((a) => num(a.UFL) !== null);
  }, []);

  const selectedAnimal = useMemo(() => {
    return alimData.animals.find((a) => a.category === animalCategory) || null;
  }, [animalCategory]);

  const selectedCmv = useMemo(() => {
    return alimData.cmvs.find((c) => c.name === cmvId) || null;
  }, [cmvId]);

  // Compute ration totals
  const ration = useMemo(() => {
    if (!selectedAnimal) return null;

    const needs = {
      UEM: num(selectedAnimal.UEM),
      UFL: num(selectedAnimal.UFL),
      PDI: num(selectedAnimal.PDI),
      Pabs: num(selectedAnimal.Pabs),
      Caabs: num(selectedAnimal.Caabs),
    };

    let totalMS = 0;
    let totalUEM = 0;
    let totalUFL = 0;
    let totalPDIN = 0;
    let totalPDIE = 0;
    let totalPabs = 0;
    let totalCaabs = 0;
    let totalCostPerAnimal = 0; // €/animal/day

    const itemDetails = feedItems.map((item) => {
      const msPct = feedMS(item.record);
      const msQty = msFromBrut(item.quantityKgBrut, msPct);
      const ufl = feedUFL(item.record);
      const pdin = feedPDIN(item.record);
      const pdie = feedPDIE(item.record);
      const pabs = feedPabs(item.record);
      const caabs = feedCaabs(item.record);

      // Values are per kg MS
      const u = ufl !== null ? ufl * msQty : 0;
      const pn = pdin !== null ? pdin * msQty : 0;
      const pe = pdie !== null ? pdie * msQty : 0;
      const pa = pabs !== null ? pabs * msQty : 0;
      const ca = caabs !== null ? caabs * msQty : 0;
      // Cost: kg brut × €/kg
      const cost = item.quantityKgBrut * item.pricePerKg;

      totalMS += msQty;
      totalUFL += u;
      totalPDIN += pn;
      totalPDIE += pe;
      totalPabs += pa;
      totalCaabs += ca;
      totalCostPerAnimal += cost;

      return {
        ...item,
        msQty,
        ufl: u,
        pdin: pn,
        pdie: pe,
        pabs: pa,
        caabs: ca,
        cost,
      };
    });

    // CMV contribution (per kg brut, values per kg)
    let cmvCost = 0;
    if (selectedCmv && cmvQuantity > 0) {
      const cmvKg = cmvQuantity / 1000; // g to kg
      const pabsPerKg = num(selectedCmv.pabs_per_kg);
      const caabsPerKg = num(selectedCmv.caabs_per_kg);
      if (pabsPerKg !== null) totalPabs += pabsPerKg * cmvKg;
      if (caabsPerKg !== null) totalCaabs += caabsPerKg * cmvKg;
      cmvCost = cmvKg * cmvPricePerKg;
      totalCostPerAnimal += cmvCost;
    }

    // Use the minimum of PDIN/PDIE as the effective PDI (per INRA system)
    const totalPDI = Math.min(totalPDIN, totalPDIE);

    // Compute differences (apports - besoins)
    const diff = {
      UEM: needs.UEM !== null ? totalUEM - needs.UEM : null,
      UFL: needs.UFL !== null ? totalUFL - needs.UFL : null,
      PDI: needs.PDI !== null ? totalPDI - needs.PDI : null,
      Pabs: needs.Pabs !== null ? totalPabs - needs.Pabs : null,
      Caabs: needs.Caabs !== null ? totalCaabs - needs.Caabs : null,
    };

    // Coverage percentages
    const coverage = {
      UEM: needs.UEM !== null && needs.UEM > 0 ? (totalUEM / needs.UEM) * 100 : null,
      UFL: needs.UFL !== null && needs.UFL > 0 ? (totalUFL / needs.UFL) * 100 : null,
      PDI: needs.PDI !== null && needs.PDI > 0 ? (totalPDI / needs.PDI) * 100 : null,
      Pabs: needs.Pabs !== null && needs.Pabs > 0 ? (totalPabs / needs.Pabs) * 100 : null,
      Caabs: needs.Caabs !== null && needs.Caabs > 0 ? (totalCaabs / needs.Caabs) * 100 : null,
    };

    // DERm (density of energy): UFL / UEM (should be >= DERm for the ration to be feasible)
    const derm = totalUEM > 0 ? totalUFL / totalUEM : null;
    const recommendedDERM = needs.UEM !== null && needs.UFL !== null && needs.UEM > 0 ? needs.UFL / needs.UEM : null;

    // RMIC (rumen microbial nitrogen balance indicator)
    const rmic = totalUFL > 0 ? (totalPDIN - totalPDIE) / totalUFL : null;

    // Cost calculations
    const costPerAnimalPerDay = totalCostPerAnimal;
    const costPerAnimalPerMonth = totalCostPerAnimal * 30.44;
    const costPerLotPerDay = totalCostPerAnimal * lotSize;
    const costPerLotPerPeriod = totalCostPerAnimal * lotSize * feedingDays;
    // Cost per UFL (energy cost)
    const costPerUFL = totalUFL > 0 ? totalCostPerAnimal / totalUFL : null;
    // Cost per kg MS
    const costPerKgMS = totalMS > 0 ? totalCostPerAnimal / totalMS : null;
    // CMV share
    const cmvSharePct = totalCostPerAnimal > 0 ? (cmvCost / totalCostPerAnimal) * 100 : 0;

    // Ca/P ratio (absorbable, final)
    const caPRatio = totalPabs > 0 ? totalCaabs / totalPabs : null;
    // Reference: INRA 2018 — Ca/P ratio of 1.0-1.5 is optimal for sheep
    // Below 1.0 → too much P relative to Ca → risk of urinary calculi
    // Above 2.0 → too much Ca relative to P → can interfere with P absorption

    // Mineral breakdown: pre-CMV (feeds only) → after CMV correction
    let preCmvPabs = 0;
    let preCmvCaabs = 0;
    feedItems.forEach((item) => {
      const msPct = feedMS(item.record);
      const msQty = msFromBrut(item.quantityKgBrut, msPct);
      const pabs = feedPabs(item.record);
      const caabs = feedCaabs(item.record);
      if (pabs !== null) preCmvPabs += pabs * msQty;
      if (caabs !== null) preCmvCaabs += caabs * msQty;
    });
    const preCmvCaPRatio = preCmvPabs > 0 ? preCmvCaabs / preCmvPabs : null;
    const pabsDeficitPreCmv = needs.Pabs !== null ? needs.Pabs - preCmvPabs : null;
    const caabsDeficitPreCmv = needs.Caabs !== null ? needs.Caabs - preCmvCaabs : null;

    // CMV contribution to minerals
    let cmvPabsContrib = 0;
    let cmvCaabsContrib = 0;
    if (selectedCmv && cmvQuantity > 0) {
      const cmvKg = cmvQuantity / 1000;
      const pabsPerKg = num(selectedCmv.pabs_per_kg);
      const caabsPerKg = num(selectedCmv.caabs_per_kg);
      if (pabsPerKg !== null) cmvPabsContrib = pabsPerKg * cmvKg;
      if (caabsPerKg !== null) cmvCaabsContrib = caabsPerKg * cmvKg;
    }

    // After correction (final, with CMV)
    const pabsAfterCorrection = preCmvPabs + cmvPabsContrib;
    const caabsAfterCorrection = preCmvCaabs + cmvCaabsContrib;
    const finalPabsDeficit = needs.Pabs !== null ? needs.Pabs - pabsAfterCorrection : null;
    const finalCaabsDeficit = needs.Caabs !== null ? needs.Caabs - caabsAfterCorrection : null;

    return {
      needs,
      totalMS,
      totalUEM,
      totalUFL,
      totalPDIN,
      totalPDIE,
      totalPDI,
      totalPabs,
      totalCaabs,
      diff,
      coverage,
      derm,
      recommendedDERM,
      rmic,
      itemDetails,
      costPerAnimalPerDay,
      costPerAnimalPerMonth,
      costPerLotPerDay,
      costPerLotPerPeriod,
      costPerUFL,
      costPerKgMS,
      cmvCost,
      cmvSharePct,
      // Minerals
      caPRatio,
      preCmvPabs,
      preCmvCaabs,
      preCmvCaPRatio,
      pabsDeficitPreCmv,
      caabsDeficitPreCmv,
      cmvPabsContrib,
      cmvCaabsContrib,
      pabsAfterCorrection,
      caabsAfterCorrection,
      finalPabsDeficit,
      finalCaabsDeficit,
    };
  }, [selectedAnimal, feedItems, selectedCmv, cmvQuantity, cmvPricePerKg, lotSize, feedingDays]);

  const addFeedItem = (kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    const id = `${kind}-${record.name}-${Date.now()}`;
    const price = defaultPrice(record);
    setFeedItems([...feedItems, { id, kind, record, quantityKgBrut: 0, pricePerKg: price }]);
  };

  const updateFeedItem = (id: string, field: "quantityKgBrut" | "pricePerKg", value: number) => {
    setFeedItems(feedItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const removeFeedItem = (id: string) => {
    setFeedItems(feedItems.filter((it) => it.id !== id));
  };

  // Save/load handlers
  const handleSave = () => {
    if (!rationName.trim() || !selectedAnimal) return;
    const saved = saveRation({
      name: rationName.trim(),
      animalCategory,
      feedItems: feedItems.map((it) => ({
        kind: it.kind,
        recordName: it.record.name,
        quantityKgBrut: it.quantityKgBrut,
        pricePerKg: it.pricePerKg,
      })),
      cmvId,
      cmvQuantity,
      cmvPricePerKg,
      lotSize,
      feedingDays,
    });
    setSavedRations(listRations());
    setShowSaveDialog(false);
    setRationName("");
  };

  const handleLoad = (r: SavedRation) => {
    setAnimalCategory(r.animalCategory);
    setCmvId(r.cmvId);
    setCmvQuantity(r.cmvQuantity);
    setCmvPricePerKg(r.cmvPricePerKg);
    setLotSize(r.lotSize);
    setFeedingDays(r.feedingDays);
    // Reconstruct feed items from saved data
    const items: FeedItem[] = r.feedItems.map((s, i) => {
      const source = s.kind === "fourrage" ? alimData.fourrages : alimData.concentres;
      const record = source.find((f) => f.name === s.recordName);
      if (!record) return null;
      return {
        id: `${s.kind}-${s.recordName}-${i}`,
        kind: s.kind,
        record,
        quantityKgBrut: s.quantityKgBrut,
        pricePerKg: s.pricePerKg,
      };
    }).filter(Boolean) as FeedItem[];
    setFeedItems(items);
    setShowLoadDialog(false);
  };

  const handleDelete = (id: string) => {
    deleteRation(id);
    setSavedRations(listRations());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-700" />
              Ration — Établir une ration équilibrée
            </h2>
            <p className="text-sm text-stone-500">
              Sélectionnez un animal, ajoutez des fourrages et concentrés, ajustez les quantités.
              L&apos;outil calcule les apports (UFL, PDI, Pabs, Caabs), le coût et les compare aux besoins.
            </p>
          </div>
          {/* Save/Load buttons */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(true)} disabled={!selectedAnimal}>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowLoadDialog(true)}>
              <FolderOpen className="h-4 w-4 mr-1" /> Charger
              {savedRations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">{savedRations.length}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Animal selection */}
        <Card className="border-stone-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">1</span>
              Animal
            </CardTitle>
            <CardDescription className="text-xs">
              Choisissez la catégorie, le poids et le stade physiologique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={animalCategory} onValueChange={setAnimalCategory}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Sélectionner un animal..." />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {availableAnimals.map((a, i) => (
                  <SelectItem key={i} value={a.category} className="text-xs">
                    {a.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAnimal && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <NeedBox label="UEM" value={fmt(num(selectedAnimal.UEM))} />
                <NeedBox label="UFL" value={fmt(num(selectedAnimal.UFL))} highlight />
                <NeedBox label="PDI (g)" value={fmt(num(selectedAnimal.PDI), 0)} />
                <NeedBox label="Pabs (g)" value={fmt(num(selectedAnimal.Pabs), 1)} />
                <NeedBox label="Caabs (g)" value={fmt(num(selectedAnimal.Caabs), 1)} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* CMV selection */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">3</span>
              CMV (optionnel)
            </CardTitle>
            <CardDescription className="text-xs">
              Complément minéral pour corriger les déficits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={cmvId} onValueChange={setCmvId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Aucun CMV" />
              </SelectTrigger>
              <SelectContent>
                {alimData.cmvs.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">
                    CMV {c.name} (Ca/P = {fmt(num(c.ca_p_ratio), 1)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCmv && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Quantité (g/j)</Label>
                    <Input
                      type="number"
                      value={cmvQuantity || ""}
                      onChange={(e) => setCmvQuantity(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Prix (€/kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={cmvPricePerKg || ""}
                      onChange={(e) => setCmvPricePerKg(Number(e.target.value) || 0)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-stone-50 p-1.5">
                    <div className="text-stone-500">Pabs / kg</div>
                    <div className="font-medium">{fmt(num(selectedCmv.pabs_per_kg), 1)} g</div>
                  </div>
                  <div className="rounded bg-stone-50 p-1.5">
                    <div className="text-stone-500">Caabs / kg</div>
                    <div className="font-medium">{fmt(num(selectedCmv.caabs_per_kg), 1)} g</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feeds selection */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">2</span>
            Aliments de la ration
          </CardTitle>
          <CardDescription className="text-xs">
            Ajoutez des fourrages et concentrés, puis saisissez les quantités brutes (kg/animal/jour) et le prix (€/kg brut).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <FeedPicker kind="fourrage" onPick={(r) => addFeedItem("fourrage", r as FourrageRecord)} />
            <FeedPicker kind="concentre" onPick={(r) => addFeedItem("concentre", r as ConcentreRecord)} />
          </div>

          {feedItems.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
              <Plus className="h-6 w-6 mx-auto mb-2 text-stone-400" />
              Ajoutez des fourrages et concentrés pour composer la ration.
            </div>
          ) : (
            <div className="space-y-2">
              {feedItems.map((item) => (
                <FeedItemRow
                  key={item.id}
                  item={item}
                  onUpdate={(field, value) => updateFeedItem(item.id, field, value)}
                  onRemove={() => removeFeedItem(item.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot economics */}
      <Card className="border-stone-200 bg-amber-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-700" />
            Paramètres économiques du lot
          </CardTitle>
          <CardDescription className="text-xs">
            Effectif et durée pour calculer le coût total de la ration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Users className="h-3 w-3" /> Effectif du lot (têtes)
              </Label>
              <Input
                type="number"
                min="1"
                value={lotSize || ""}
                onChange={(e) => setLotSize(Number(e.target.value) || 1)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Durée d&apos;alimentation (jours)
              </Label>
              <Input
                type="number"
                min="1"
                value={feedingDays || ""}
                onChange={(e) => setFeedingDays(Number(e.target.value) || 1)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {ration && <RationResults ration={ration} animal={selectedAnimal} lotSize={lotSize} feedingDays={feedingDays} />}

      {!selectedAnimal && (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-6 text-center text-sm text-stone-500">
            <Info className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Sélectionnez un animal pour calculer la ration.
          </CardContent>
        </Card>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSaveDialog(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Enregistrer la ration</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowSaveDialog(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom de la ration</Label>
                <Input
                  value={rationName}
                  onChange={(e) => setRationName(e.target.value)}
                  placeholder="Ex: Brebis gestantes hiver 2026"
                  autoFocus
                  className="h-9"
                />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={!rationName.trim()}>
                <Save className="h-4 w-4 mr-2" /> Enregistrer
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLoadDialog(false)}>
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Rations enregistrées</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowLoadDialog(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {savedRations.length === 0 ? (
                <div className="text-center text-sm text-stone-500 py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                  Aucune ration enregistrée.
                </div>
              ) : (
                <div className="space-y-2">
                  {savedRations.map((r) => (
                    <div key={r.id} className="rounded-lg border border-stone-200 p-3 hover:bg-stone-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => handleLoad(r)} className="flex-1 text-left">
                          <div className="text-sm font-medium text-stone-900">{r.name}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{r.animalCategory}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {r.feedItems.length} aliment(s) · {new Date(r.savedAt).toLocaleDateString("fr-FR")}
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-stone-400 hover:text-rose-600"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function NeedBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-2 text-center ${highlight ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-stone-50"}`}>
      <div className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-bold ${highlight ? "text-emerald-900" : "text-stone-900"}`}>{value}</div>
    </div>
  );
}

function FeedPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const data = kind === "fourrage" ? alimData.fourrages : alimData.concentres;

  const filtered = useMemo(() => {
    return data.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={kind === "fourrage" ? "border-lime-300 text-lime-800 hover:bg-lime-50" : "border-orange-300 text-orange-800 hover:bg-orange-50"}
      >
        <Plus className="h-4 w-4 mr-1" />
        {kind === "fourrage" ? "Fourrage" : "Concentré"}
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 w-80 max-w-[90vw] rounded-md border border-stone-200 bg-white shadow-lg">
          <div className="p-2 border-b border-stone-100">
            <Input
              autoFocus
              placeholder={`Rechercher un ${kind}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.slice(0, 50).map((d, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 border-b border-stone-100"
                onClick={() => {
                  onPick(d);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <div className="font-medium text-stone-900">{d.name}</div>
                <div className="text-[10px] text-stone-500">
                  {kind === "fourrage"
                    ? `MS ${fmt(num((d as FourrageRecord).ms_pct), 0)}% · UFL ${fmt(num(d.ufl))} · PDIN ${fmt(num((d as FourrageRecord).pdin), 0)}`
                    : `MS ${fmt(num((d as ConcentreRecord).ms_pct), 0)}% · UFL ${fmt(num(d.ufl))} · PDIN ${fmt(num((d as ConcentreRecord).pdin), 0)}`}
                  {num(d.price) !== null && <span className="ml-1 text-emerald-700">· {fmt(num(d.price), 2)} €/kg</span>}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-stone-500">Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FeedItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: FeedItem;
  onUpdate: (field: "quantityKgBrut" | "pricePerKg", value: number) => void;
  onRemove: () => void;
}) {
  const msPct = feedMS(item.record);
  const msQty = msFromBrut(item.quantityKgBrut, msPct);
  const isFourrage = item.kind === "fourrage";
  const cost = item.quantityKgBrut * item.pricePerKg;

  return (
    <div className={`rounded-lg border p-3 ${isFourrage ? "border-lime-200 bg-lime-50/30" : "border-orange-200 bg-orange-50/30"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${isFourrage ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
              {isFourrage ? "Fourrage" : "Concentré"}
            </Badge>
            <span className="text-sm font-medium text-stone-900 truncate">{item.record.name}</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            MS {fmt(msPct, 0)}% · UFL {fmt(feedUFL(item.record))} · PDIN {fmt(feedPDIN(item.record), 0)} · Pabs {fmt(feedPabs(item.record), 2)} · Caabs {fmt(feedCaabs(item.record), 2)}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col">
            <Label className="text-[10px] text-stone-500">kg brut / j</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={item.quantityKgBrut || ""}
              onChange={(e) => onUpdate("quantityKgBrut", Number(e.target.value) || 0)}
              className="h-9 w-24"
            />
          </div>
          <div className="flex flex-col">
            <Label className="text-[10px] text-stone-500">€ / kg</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.pricePerKg || ""}
              onChange={(e) => onUpdate("pricePerKg", Number(e.target.value) || 0)}
              className="h-9 w-20"
            />
          </div>
          <div className="flex flex-col text-[10px] text-stone-500 min-w-[60px]">
            <span>= {fmt(msQty, 2)} kg MS</span>
            <span className="text-amber-700 font-medium">{fmt(cost, 2)} €/j</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-stone-400 hover:text-rose-600 h-9 w-9">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

type RationData = {
  needs: { UEM: number | null; UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  totalMS: number;
  totalUEM: number;
  totalUFL: number;
  totalPDIN: number;
  totalPDIE: number;
  totalPDI: number;
  totalPabs: number;
  totalCaabs: number;
  diff: { UEM: number | null; UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  coverage: { UEM: number | null; UFL: number | null; PDI: number | null; Pabs: number | null; Caabs: number | null };
  derm: number | null;
  recommendedDERM: number | null;
  rmic: number | null;
  itemDetails: Array<FeedItem & { msQty: number; ufl: number; pdin: number; pdie: number; pabs: number; caabs: number; cost: number }>;
  costPerAnimalPerDay: number;
  costPerAnimalPerMonth: number;
  costPerLotPerDay: number;
  costPerLotPerPeriod: number;
  costPerUFL: number | null;
  costPerKgMS: number | null;
  cmvCost: number;
  cmvSharePct: number;
  // Minerals
  caPRatio: number | null;
  preCmvPabs: number;
  preCmvCaabs: number;
  preCmvCaPRatio: number | null;
  pabsDeficitPreCmv: number | null;
  caabsDeficitPreCmv: number | null;
  cmvPabsContrib: number;
  cmvCaabsContrib: number;
  pabsAfterCorrection: number;
  caabsAfterCorrection: number;
  finalPabsDeficit: number | null;
  finalCaabsDeficit: number | null;
};

function RationResults({ ration, animal, lotSize, feedingDays }: { ration: RationData; animal: AnimalRecord | null; lotSize: number; feedingDays: number }) {
  const getStatus = (coverage: number | null): { label: string; color: string; icon: React.ReactNode } => {
    if (coverage === null) return { label: "N/A", color: "text-stone-400", icon: <Info className="h-3 w-3" /> };
    if (coverage >= 95 && coverage <= 105) return { label: "Équilibré", color: "text-emerald-700", icon: <CheckCircle2 className="h-3 w-3" /> };
    if (coverage < 95) return { label: "Déficit", color: "text-rose-700", icon: <AlertTriangle className="h-3 w-3" /> };
    return { label: "Excès", color: "text-amber-700", icon: <AlertTriangle className="h-3 w-3" /> };
  };

  return (
    <div className="space-y-4">
      {/* COST SUMMARY — Featured card */}
      <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Euro className="h-4 w-4 text-amber-700" />
            Coût de la ration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <CostBox label="Coût / animal / jour" value={ration.costPerAnimalPerDay} unit="€" highlight />
            <CostBox label="Coût / animal / mois" value={ration.costPerAnimalPerMonth} unit="€" />
            <CostBox label={`Coût / lot (${lotSize}) / jour`} value={ration.costPerLotPerDay} unit="€" />
            <CostBox label={`Coût / lot / ${feedingDays}j`} value={ration.costPerLotPerPeriod} unit="€" highlight />
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-600">Coût par UFL</span>
              <span className="font-medium text-stone-900">{ration.costPerUFL !== null ? `${fmt(ration.costPerUFL, 3)} €` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Coût par kg MS</span>
              <span className="font-medium text-stone-900">{ration.costPerKgMS !== null ? `${fmt(ration.costPerKgMS, 3)} €` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">Part CMV</span>
              <span className="font-medium text-stone-900">{fmt(ration.cmvSharePct, 1)}% ({fmt(ration.cmvCost, 3)} €/j)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Headline metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label="MS distribuée" value={fmt(ration.totalMS, 2)} unit="kg/j" status={getStatus(ration.coverage.UEM)} />
        <MetricCard label="UFL" value={fmt(ration.totalUFL, 2)} unit={`/ ${fmt(ration.needs.UFL)}`} coverage={ration.coverage.UFL} status={getStatus(ration.coverage.UFL)} />
        <MetricCard label="PDI" value={fmt(ration.totalPDI, 0)} unit={`g / ${fmt(ration.needs.PDI, 0)} g`} coverage={ration.coverage.PDI} status={getStatus(ration.coverage.PDI)} />
        <MetricCard label="Pabs" value={fmt(ration.totalPabs, 2)} unit={`g / ${fmt(ration.needs.Pabs, 1)} g`} coverage={ration.coverage.Pabs} status={getStatus(ration.coverage.Pabs)} />
        <MetricCard label="Caabs" value={fmt(ration.totalCaabs, 2)} unit={`g / ${fmt(ration.needs.Caabs, 1)} g`} coverage={ration.coverage.Caabs} status={getStatus(ration.coverage.Caabs)} />
      </div>

      {/* Detailed balance table */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Bilan détaillé de la ration</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Élément</th>
                  <th className="text-right px-3 py-2 font-medium">Besoins</th>
                  <th className="text-right px-3 py-2 font-medium">Apports</th>
                  <th className="text-right px-3 py-2 font-medium">Différence</th>
                  <th className="text-right px-3 py-2 font-medium">Couverture</th>
                  <th className="text-center px-3 py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                <BalanceRow label="UEM (capacité ingestion)" need={ration.needs.UEM} supply={ration.totalUEM} coverage={ration.coverage.UEM} />
                <BalanceRow label="UFL (énergie)" need={ration.needs.UFL} supply={ration.totalUFL} coverage={ration.coverage.UFL} />
                <BalanceRow label="PDI (protéines, min PDIN/PDIE)" need={ration.needs.PDI} supply={ration.totalPDI} coverage={ration.coverage.PDI} />
                <BalanceRow label="Pabs (phosphore)" need={ration.needs.Pabs} supply={ration.totalPabs} coverage={ration.coverage.Pabs} />
                <BalanceRow label="Caabs (calcium)" need={ration.needs.Caabs} supply={ration.totalCaabs} coverage={ration.coverage.Caabs} />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-stone-700">Densité énergétique (UFL/UEM)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{ration.derm !== null ? fmt(ration.derm, 3) : "—"}</span>
              <span className="text-xs text-stone-500">/ recommandé: {ration.recommendedDERM !== null ? fmt(ration.recommendedDERM, 3) : "—"}</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              La densité énergétique de la ration doit être ≥ à la densité minimale recommandée pour couvrir les besoins sans dépasser la capacité d&apos;ingestion.
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-stone-700">RMIC (équilibre PDIN/PDIE)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-stone-900">{ration.rmic !== null ? fmt(ration.rmic, 1) : "—"}</span>
              <span className="text-xs text-stone-500">g PDI/UFL</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              RMIC = (PDIN - PDIE) / UFL. Valeur &lt; -12 (agneaux simples) ou &lt; -6 (agneaux doubles) = risque de déséquilibre.
              {ration.rmic !== null && ration.rmic < -12 && (
                <span className="block mt-1 text-rose-700 font-medium">⚠ Déséquilibre microbial détecté</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mineral detail panel */}
      <Card className="border-rose-200 bg-gradient-to-br from-rose-50/60 to-amber-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold">Ca/P</span>
            Bilan minéral & choix du CMV
          </CardTitle>
          <CardDescription className="text-xs">
            Le rapport Ca/P doit être entre 1.0 et 1.5 pour les ovins (INRA 2018). Le CMV corrige les déficits en Pabs et Caabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ca/P ratio big display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-white p-3 border border-rose-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Rapport Ca/P (final)</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${ration.caPRatio === null ? "text-stone-400" : ration.caPRatio >= 1.0 && ration.caPRatio <= 1.5 ? "text-emerald-700" : "text-amber-700"}`}>
                  {ration.caPRatio !== null ? fmt(ration.caPRatio, 2) : "—"}
                </span>
                <span className="text-[10px] text-stone-500">optimal: 1.0–1.5</span>
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 border border-rose-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Ca/P avant CMV</div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${ration.preCmvCaPRatio === null ? "text-stone-400" : ration.preCmvCaPRatio >= 1.0 && ration.preCmvCaPRatio <= 1.5 ? "text-emerald-700" : "text-amber-700"}`}>
                  {ration.preCmvCaPRatio !== null ? fmt(ration.preCmvCaPRatio, 2) : "—"}
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-white p-3 border border-rose-200">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Statut minéral</div>
              <div className="text-sm font-medium">
                {ration.finalPabsDeficit !== null && ration.finalCaabsDeficit !== null ? (
                  Math.abs(ration.finalPabsDeficit) < 0.1 && Math.abs(ration.finalCaabsDeficit) < 0.1 ? (
                    <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Équilibré</span>
                  ) : ration.finalPabsDeficit > 0.2 || ration.finalCaabsDeficit > 0.2 ? (
                    <span className="text-amber-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Excès résiduel</span>
                  ) : (
                    <span className="text-rose-700 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Déficit résiduel</span>
                  )
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed mineral table */}
          <div className="overflow-x-auto rounded-lg border border-rose-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-rose-50 text-stone-700 border-b border-rose-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Minéral</th>
                  <th className="text-right px-3 py-2 font-medium">Besoins</th>
                  <th className="text-right px-3 py-2 font-medium">Apports aliments</th>
                  <th className="text-right px-3 py-2 font-medium">Déficit (avant CMV)</th>
                  <th className="text-right px-3 py-2 font-medium">Apport CMV</th>
                  <th className="text-right px-3 py-2 font-medium">Total corrigé</th>
                  <th className="text-right px-3 py-2 font-medium">Déficit final</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-100">
                  <td className="px-3 py-2 text-stone-900 font-medium">Pabs (Phosphore absorbable, g)</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.needs.Pabs, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.preCmvPabs, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ration.pabsDeficitPreCmv !== null && ration.pabsDeficitPreCmv > 0 ? "text-rose-700 font-medium" : "text-emerald-700"}`}>
                    {ration.pabsDeficitPreCmv !== null ? (ration.pabsDeficitPreCmv > 0 ? `-${fmt(ration.pabsDeficitPreCmv, 2)}` : `+${fmt(Math.abs(ration.pabsDeficitPreCmv), 2)}`) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">+{fmt(ration.cmvPabsContrib, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(ration.pabsAfterCorrection, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${ration.finalPabsDeficit !== null ? (Math.abs(ration.finalPabsDeficit) < 0.1 ? "text-emerald-700" : ration.finalPabsDeficit > 0 ? "text-rose-700" : "text-amber-700") : "text-stone-400"}`}>
                    {ration.finalPabsDeficit !== null ? (Math.abs(ration.finalPabsDeficit) < 0.1 ? "0.00" : ration.finalPabsDeficit > 0 ? `-${fmt(ration.finalPabsDeficit, 2)}` : `+${fmt(Math.abs(ration.finalPabsDeficit), 2)}`) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 text-stone-900 font-medium">Caabs (Calcium absorbable, g)</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.needs.Caabs, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.preCmvCaabs, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${ration.caabsDeficitPreCmv !== null && ration.caabsDeficitPreCmv > 0 ? "text-rose-700 font-medium" : "text-emerald-700"}`}>
                    {ration.caabsDeficitPreCmv !== null ? (ration.caabsDeficitPreCmv > 0 ? `-${fmt(ration.caabsDeficitPreCmv, 2)}` : `+${fmt(Math.abs(ration.caabsDeficitPreCmv), 2)}`) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-700">+{fmt(ration.cmvCaabsContrib, 2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(ration.caabsAfterCorrection, 2)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${ration.finalCaabsDeficit !== null ? (Math.abs(ration.finalCaabsDeficit) < 0.1 ? "text-emerald-700" : ration.finalCaabsDeficit > 0 ? "text-rose-700" : "text-amber-700") : "text-stone-400"}`}>
                    {ration.finalCaabsDeficit !== null ? (Math.abs(ration.finalCaabsDeficit) < 0.1 ? "0.00" : ration.finalCaabsDeficit > 0 ? `-${fmt(ration.finalCaabsDeficit, 2)}` : `+${fmt(Math.abs(ration.finalCaabsDeficit), 2)}`) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* CMV recommendation */}
          {ration.pabsDeficitPreCmv !== null && ration.caabsDeficitPreCmv !== null && (ration.pabsDeficitPreCmv > 0.1 || ration.caabsDeficitPreCmv > 0.1) && (
            <div className="rounded-lg bg-amber-100 border border-amber-300 p-3 text-xs">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">Recommandation CMV</p>
                  <p className="text-amber-800 mt-1">
                    {ration.caabsDeficitPreCmv > ration.pabsDeficitPreCmv ? (
                      <>Déficit principalement en <strong>calcium</strong>. Choisissez un CMV riche en Ca (ex: &quot;12 - 12&quot; ou &quot;8 - 18&quot;).</>
                    ) : ration.pabsDeficitPreCmv > ration.caabsDeficitPreCmv ? (
                      <>Déficit principalement en <strong>phosphore</strong>. Choisissez un CMV riche en P (ex: &quot;0 - 27&quot; ou &quot;2 - 28&quot;).</>
                    ) : (
                      <>Déficit équilibré Ca/P. Choisissez un CMV équilibré (ex: &quot;5 - 20&quot; ou &quot;6 - 18&quot;).</>
                    )}
                    {ration.preCmvCaPRatio !== null && (
                      <> Rapport Ca/P actuel: <strong>{fmt(ration.preCmvCaPRatio, 2)}</strong>.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualizations (pie chart + radar chart) */}
      {ration.itemDetails.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RationPieChart
            title="Répartition de la MS (matière sèche)"
            unit="kg MS"
            slices={ration.itemDetails
              .filter((it) => it.msQty > 0.001)
              .map((it, i) => ({
                label: it.record.name.length > 30 ? it.record.name.slice(0, 28) + "…" : it.record.name,
                value: it.msQty,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))}
          />
          <RationPieChart
            title="Répartition du coût"
            unit="€/jour"
            slices={ration.itemDetails
              .filter((it) => it.cost > 0.001)
              .map((it, i) => ({
                label: it.record.name.length > 30 ? it.record.name.slice(0, 28) + "…" : it.record.name,
                value: it.cost,
                color: PIE_COLORS[i % PIE_COLORS.length],
              }))}
          />
        </div>
      )}

      {/* Radar chart of nutrient coverage */}
      {ration.needs.UFL !== null && (
        <NutrientRadarChart
          title="Couverture des besoins nutritionnels (%)"
          axes={[
            { label: "UFL", value: ration.coverage.UFL ?? 0 },
            { label: "PDI", value: ration.coverage.PDI ?? 0 },
            { label: "Pabs", value: ration.coverage.Pabs ?? 0 },
            { label: "Caabs", value: ration.coverage.Caabs ?? 0 },
            { label: "UEM", value: ration.coverage.UEM ?? 0 },
          ]}
        />
      )}

      {/* Feed contributions with cost */}
      {ration.itemDetails.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Contribution des aliments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-right px-3 py-2 font-medium">kg brut</th>
                    <th className="text-right px-3 py-2 font-medium">kg MS</th>
                    <th className="text-right px-3 py-2 font-medium">€/kg</th>
                    <th className="text-right px-3 py-2 font-medium">UFL</th>
                    <th className="text-right px-3 py-2 font-medium">PDIN (g)</th>
                    <th className="text-right px-3 py-2 font-medium">PDIE (g)</th>
                    <th className="text-right px-3 py-2 font-medium">Pabs (g)</th>
                    <th className="text-right px-3 py-2 font-medium">Caabs (g)</th>
                    <th className="text-right px-3 py-2 font-medium">Coût (€/j)</th>
                  </tr>
                </thead>
                <tbody>
                  {ration.itemDetails.map((it, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-900">
                        <Badge variant="outline" className={`text-[9px] mr-1 ${it.kind === "fourrage" ? "bg-lime-50 text-lime-700" : "bg-orange-50 text-orange-700"}`}>
                          {it.kind === "fourrage" ? "F" : "C"}
                        </Badge>
                        <span className="font-medium">{it.record.name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.quantityKgBrut, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.msQty, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-amber-700">{fmt(it.pricePerKg, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.ufl, 3)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.pdin, 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.pdie, 0)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.pabs, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.caabs, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-800">{fmt(it.cost, 3)}</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50 font-semibold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.itemDetails.reduce((s, it) => s + it.quantityKgBrut, 0), 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalMS, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">—</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalUFL, 3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalPDIN, 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalPDIE, 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalPabs, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(ration.totalCaabs, 2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-800">{fmt(ration.costPerAnimalPerDay, 3)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animal context */}
      {animal && (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-4">
            <p className="text-xs text-stone-600">
              <span className="font-medium">Animal sélectionné :</span> {animal.category}
              {animal.sub_stage && <span> — {animal.sub_stage}</span>}
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Besoins affichés : UEM {fmt(num(animal.UEM))} · UFL {fmt(num(animal.UFL))} · PDI {fmt(num(animal.PDI), 0)} g · Pabs {fmt(num(animal.Pabs), 1)} g · Caabs {fmt(num(animal.Caabs), 1)} g
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CostBox({ label, value, unit, highlight }: { label: string; value: number; unit: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? "bg-amber-100 ring-1 ring-amber-300" : "bg-white border border-amber-200"}`}>
      <div className="text-[10px] text-stone-600 uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`text-lg font-bold ${highlight ? "text-amber-900" : "text-stone-900"}`}>{fmt(value, 2)}</span>
        <span className="text-[10px] text-stone-500">{unit}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, coverage, status }: { label: string; value: string; unit: string; coverage?: number | null; status: { label: string; color: string; icon: React.ReactNode } }) {
  return (
    <Card className="border-stone-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wide">{label}</span>
          <span className={`flex items-center gap-1 text-[10px] font-medium ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-stone-900">{value}</span>
          <span className="text-[10px] text-stone-500">{unit}</span>
        </div>
        {coverage !== undefined && coverage !== null && (
          <div className="mt-1.5 h-1 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${coverage >= 95 && coverage <= 105 ? "bg-emerald-500" : coverage < 95 ? "bg-rose-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(100, coverage)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceRow({ label, need, supply, coverage }: { label: string; need: number | null; supply: number; coverage: number | null }) {
  const diff = need !== null ? supply - need : null;
  const status = coverage !== null
    ? coverage >= 95 && coverage <= 105
      ? { color: "text-emerald-700", bg: "bg-emerald-50" }
      : coverage < 95
        ? { color: "text-rose-700", bg: "bg-rose-50" }
        : { color: "text-amber-700", bg: "bg-amber-50" }
    : { color: "text-stone-400", bg: "bg-stone-50" };

  return (
    <tr className="border-b border-stone-100">
      <td className="px-3 py-2 text-stone-900">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{need !== null ? fmt(need, 2) : "—"}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(supply, 2)}</td>
      <td className={`px-3 py-2 text-right tabular-nums ${diff !== null ? (diff < 0 ? "text-rose-700" : diff > 0 ? "text-amber-700" : "text-emerald-700") : "text-stone-400"}`}>
        {diff !== null ? (diff > 0 ? "+" : "") + fmt(diff, 2) : "—"}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {coverage !== null ? `${fmt(coverage, 0)}%` : "—"}
      </td>
      <td className={`px-3 py-2 text-center`}>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.color}`}>
          {coverage === null ? "N/A" : coverage >= 95 && coverage <= 105 ? "OK" : coverage < 95 ? "Déficit" : "Excès"}
        </span>
      </td>
    </tr>
  );
}
