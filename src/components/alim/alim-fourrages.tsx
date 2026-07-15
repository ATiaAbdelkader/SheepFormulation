"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, allFourrages, algerianFeeds, type FourrageRecord } from "@/lib/alim-data";
import { assessForageQuality, getSeasonalInfo, getRegionForFeed, REGIONS, type QualityAssessment } from "@/lib/forage-quality";
import { listStocks, saveStock, deleteStock, listPrices, savePrice, deletePrice, type ForageStock, type PriceRecord } from "@/lib/forage-inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Wheat, Info, Database, Award, Package, TrendingUp, MapPin,
  Plus, Trash2, Calendar, Euro, Star, Leaf, AlertTriangle, CheckCircle2,
} from "lucide-react";

type Tab = "database" | "quality" | "inventory" | "prices";

// Forage category detection
function forageCategory(name: string): { cat: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("ensilage")) return { cat: "Ensilage", color: "bg-green-100 text-green-800" };
  if (n.includes("enrubann")) return { cat: "Enrubanné", color: "bg-lime-100 text-lime-800" };
  if (n.includes("foin")) return { cat: "Foin", color: "bg-amber-100 text-amber-800" };
  if (n.includes("paille")) return { cat: "Paille", color: "bg-yellow-100 text-yellow-800" };
  if (n.includes("pâtur") || n.includes("pature") || n.includes("pré") || n.includes("pre")) return { cat: "Pâture", color: "bg-emerald-100 text-emerald-800" };
  if (n.includes("betterave") || n.includes("navet") || n.includes("colza fourrager")) return { cat: "Racines", color: "bg-orange-100 text-orange-800" };
  if (n.includes("maïs") || n.includes("mais")) return { cat: "Maïs", color: "bg-yellow-100 text-yellow-800" };
  if (n.includes("luzerne")) return { cat: "Luzerne", color: "bg-purple-100 text-purple-800" };
  return { cat: "Autre", color: "bg-stone-100 text-stone-700" };
}

export function AlimFourrages() {
  const [tab, setTab] = useState<Tab>("database");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Wheat className="h-5 w-5 text-lime-700" />
          Base de données fourragres — Qualité & Inventaire
        </h2>
        <p className="text-sm text-stone-500">
          {allFourrages.length} fourrages (FR + DZ) avec notation qualité A/B/C/D, suivi des stocks,
          disponibilité saisonnière et historique des prix.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "database"} onClick={() => setTab("database")} icon={<Database className="h-3.5 w-3.5" />} label="Base de données" />
        <TabButton active={tab === "quality"} onClick={() => setTab("quality")} icon={<Award className="h-3.5 w-3.5" />} label="Qualité (A/B/C/D)" />
        <TabButton active={tab === "inventory"} onClick={() => setTab("inventory")} icon={<Package className="h-3.5 w-3.5" />} label="Inventaire" />
        <TabButton active={tab === "prices"} onClick={() => setTab("prices")} icon={<TrendingUp className="h-3.5 w-3.5" />} label="Prix" />
      </div>

      {tab === "database" && <DatabaseTab />}
      {tab === "quality" && <QualityTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "prices" && <PricesTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-lime-100 text-lime-900 border-b-2 border-lime-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== DATABASE TAB ====================
function DatabaseTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [grade, setGrade] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const enriched = useMemo(() => {
    return allFourrages.map((f) => {
      const quality = assessForageQuality({
        ufl: num(f.ufl), pdin: num(f.pdin), cb: num(f.ms_pct) ? null : null, ms_pct: num(f.ms_pct),
      });
      const seasonal = getSeasonalInfo(f.name);
      const feedRegion = getRegionForFeed(f.name);
      return { ...f, quality, seasonal, region: feedRegion };
    });
  }, []);

  const filtered = useMemo(() => {
    return enriched.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && forageCategory(f.name).cat !== category) return false;
      if (region !== "all" && (!f.region || f.region.id !== region)) return false;
      if (grade !== "all" && f.quality.grade !== grade) return false;
      if (onlyAvailable && num(f.ufl) === null) return false;
      return true;
    });
  }, [enriched, search, category, region, grade, onlyAvailable]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allFourrages.forEach((f) => set.add(forageCategory(f.name).cat));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-stone-700">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="lg:col-span-2 space-y-1">
            <Label className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
              <Input placeholder="Nom du fourrage..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Catégorie</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="all">Toutes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Région</Label>
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="all">Toutes</option>
              <optgroup label="🇫🇷 France">
                {REGIONS.filter((r) => r.country === "FR").map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </optgroup>
              <optgroup label="🇩🇿 Algérie">
                {REGIONS.filter((r) => r.country === "DZ").map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qualité</Label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="all">Toutes</option>
              <option value="A">A — Excellente</option>
              <option value="B">B — Bonne</option>
              <option value="C">C — Moyenne</option>
              <option value="D">D — Faible</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Badge variant="outline" className="bg-stone-50">{filtered.length} fourrage(s)</Badge>
        <label className="flex items-center gap-1.5 text-xs text-stone-600 cursor-pointer">
          <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} className="rounded" />
          Masquer les valeurs &quot;ND&quot;
        </label>
      </div>

      {/* Table */}
      <Card className="border-stone-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2.5 font-medium">Nom</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Catégorie</th>
                  <th className="text-center px-3 py-2.5 font-medium">Qualité</th>
                  <th className="text-right px-3 py-2.5 font-medium">% MS</th>
                  <th className="text-right px-3 py-2.5 font-medium">UFL</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDIN</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Pabs</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Caabs</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">Région</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((f, i) => {
                  const cat = forageCategory(f.name);
                  return (
                    <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                      <td className="px-3 py-2 text-stone-900 font-medium text-xs">
                        <div className="flex items-center gap-1">
                          {f.name.startsWith("[DZ]") && <span className="text-[10px]">🇩🇿</span>}
                          {f.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cat.color}`}>{cat.cat}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[10px] ${f.quality.bgColor} ${f.quality.color}`}>{f.quality.grade}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(num(f.ms_pct), 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">{fmt(num(f.ufl))}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(num(f.pdin), 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs hidden sm:table-cell">{fmt(num(f.pabs), 2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs hidden sm:table-cell">{fmt(num(f.caabs), 2)}</td>
                      <td className="px-3 py-2 text-xs hidden lg:table-cell text-stone-500">{f.region?.label.slice(0, 20) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div className="p-3 text-center text-xs text-stone-500 border-t border-stone-200">
              200 premiers résultats affichés sur {filtered.length}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== QUALITY TAB ====================
function QualityTab() {
  const [selectedFeed, setSelectedFeed] = useState<string>("");

  const enriched = useMemo(() => {
    return allFourrages.map((f) => {
      const quality = assessForageQuality({
        ufl: num(f.ufl), pdin: num(f.pdin), cb: null, ms_pct: num(f.ms_pct),
      });
      return { ...f, quality };
    }).sort((a, b) => b.quality.score - a.quality.score);
  }, []);

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    enriched.forEach((f) => { dist[f.quality.grade]++; });
    return dist;
  }, [enriched]);

  const selected = enriched.find((f) => f.name === selectedFeed);

  return (
    <div className="space-y-3">
      {/* Grade distribution */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-lime-700" />
            Distribution de la qualité ({enriched.length} fourrages)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-10 rounded-lg overflow-hidden ring-1 ring-stone-200">
            {(["A", "B", "C", "D"] as const).map((g) => {
              const count = gradeDistribution[g];
              const pct = enriched.length > 0 ? (count / enriched.length) * 100 : 0;
              const colors: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-rose-500" };
              return (
                <div key={g} className={`${colors[g]} flex items-center justify-center text-[11px] text-white font-medium`} style={{ width: `${pct}%` }}>
                  {pct > 5 ? `${g} (${count})` : ""}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-stone-500">
            <span>A — Excellente</span><span>B — Bonne</span><span>C — Moyenne</span><span>D — Faible</span>
          </div>
        </CardContent>
      </Card>

      {/* Feed selector */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Analyse qualité détaillée</CardTitle>
          <CardDescription className="text-xs">Sélectionnez un fourrage pour voir son évaluation complète</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedFeed} onValueChange={setSelectedFeed}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir un fourrage..." /></SelectTrigger>
            <SelectContent className="max-h-80">
              {enriched.map((f, i) => (
                <SelectItem key={i} value={f.name} className="text-xs">
                  <span className={`inline-block w-4 text-center font-bold ${f.quality.color}`}>{f.quality.grade}</span>
                  {" "}{f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Detailed quality assessment */}
      {selected && (
        <Card className={`border-2 ${selected.quality.borderColor} ${selected.quality.bgColor}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{selected.name}</CardTitle>
                <CardDescription className="text-xs">{selected.quality.label} · Score: {selected.quality.score}/100</CardDescription>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold ${selected.quality.bgColor} ${selected.quality.color} border-2 ${selected.quality.borderColor}`}>
                {selected.quality.grade}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-stone-700">{selected.quality.description}</p>

            {/* Strengths */}
            {selected.quality.strengths.length > 0 && (
              <div>
                <span className="text-[10px] font-medium text-emerald-700 uppercase flex items-center gap-1 mb-1">
                  <CheckCircle2 className="h-3 w-3" /> Points forts
                </span>
                <ul className="text-xs text-stone-700 space-y-0.5">
                  {selected.quality.strengths.map((s, i) => <li key={i} className="flex items-start gap-1"><span className="text-emerald-600">✓</span><span>{s}</span></li>)}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {selected.quality.weaknesses.length > 0 && (
              <div>
                <span className="text-[10px] font-medium text-rose-700 uppercase flex items-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3" /> Points faibles
                </span>
                <ul className="text-xs text-stone-700 space-y-0.5">
                  {selected.quality.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-1"><span className="text-rose-600">✗</span><span>{w}</span></li>)}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className={`rounded p-2 ${selected.quality.bgColor} border ${selected.quality.borderColor}`}>
              <span className="text-[10px] font-medium text-stone-700 uppercase flex items-center gap-1 mb-1">
                <Info className="h-3 w-3" /> Recommandations d&apos;usage
              </span>
              <ul className="text-xs text-stone-700 space-y-0.5">
                {selected.quality.recommendations.map((r, i) => <li key={i} className="flex items-start gap-1"><span className="text-stone-500">→</span><span>{r}</span></li>)}
              </ul>
            </div>

            {/* Nutritional values */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-200">
              <NutBox label="UFL" value={fmt(num(selected.ufl))} />
              <NutBox label="PDIN" value={fmt(num(selected.pdin), 0)} />
              <NutBox label="MS%" value={fmt(num(selected.ms_pct), 0)} />
              <NutBox label="Pabs" value={fmt(num(selected.pabs), 2)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NutBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-1.5 text-center border border-stone-200">
      <div className="text-[9px] text-stone-500 uppercase">{label}</div>
      <div className="text-xs font-bold text-stone-900">{value}</div>
    </div>
  );
}

// ==================== INVENTORY TAB ====================
function InventoryTab() {
  const [stocks, setStocks] = useState<ForageStock[]>(() => listStocks());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    feedName: "", region: "", quantityTons: "", pricePerTon: "",
    harvestDate: "", qualityGrade: "B", qualityScore: 60, notes: "",
  });

  const handleSave = () => {
    if (!form.feedName || !form.quantityTons) return;
    saveStock({
      feedName: form.feedName,
      region: form.region || "Non précisée",
      quantityTons: Number(form.quantityTons) || 0,
      pricePerTon: Number(form.pricePerTon) || 0,
      harvestDate: form.harvestDate || new Date().toISOString(),
      qualityGrade: form.qualityGrade,
      qualityScore: form.qualityScore,
      notes: form.notes,
    });
    setStocks(listStocks());
    setShowForm(false);
    setForm({ feedName: "", region: "", quantityTons: "", pricePerTon: "", harvestDate: "", qualityGrade: "B", qualityScore: 60, notes: "" });
  };

  const handleDelete = (id: string) => {
    deleteStock(id);
    setStocks(listStocks());
  };

  const totalTons = stocks.reduce((s, st) => s + st.quantityTons, 0);
  const totalValue = stocks.reduce((s, st) => s + st.quantityTons * st.pricePerTon, 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Package className="h-4 w-4 text-stone-500 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Stocks</div>
            <div className="text-lg font-bold text-stone-900">{stocks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Leaf className="h-4 w-4 text-lime-600 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Total volume</div>
            <div className="text-lg font-bold text-stone-900">{fmt(totalTons, 1)} t</div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3 text-center">
            <Euro className="h-4 w-4 text-amber-600 mx-auto mb-1" />
            <div className="text-[10px] text-stone-500 uppercase">Valeur totale</div>
            <div className="text-lg font-bold text-stone-900">{fmt(totalValue, 0)} €</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">{stocks.length} stock(s)</Badge>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? "Annuler" : "Ajouter un stock"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-lime-300 bg-lime-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Nouveau stock fourrager</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nom du fourrage *</Label>
                <Input value={form.feedName} onChange={(e) => setForm({ ...form, feedName: e.target.value })} placeholder="Ex: Foin de prairie 2026" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Région</Label>
                <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                  <option value="">Non précisée</option>
                  {REGIONS.map((r) => <option key={r.id} value={r.label}>{r.country === "FR" ? "🇫🇷" : "🇩🇿"} {r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Quantité (tonnes)</Label>
                <Input type="number" step="0.1" value={form.quantityTons} onChange={(e) => setForm({ ...form, quantityTons: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prix (€/t)</Label>
                <Input type="number" step="1" value={form.pricePerTon} onChange={(e) => setForm({ ...form, pricePerTon: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qualité</Label>
                <Select value={form.qualityGrade} onValueChange={(v) => setForm({ ...form, qualityGrade: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <option value="A">A — Excellente</option>
                    <option value="B">B — Bonne</option>
                    <option value="C">C — Moyenne</option>
                    <option value="D">D — Faible</option>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date récolte</Label>
                <Input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex: 1er cycle, bon fanage..." className="h-9" />
            </div>
            <Button onClick={handleSave} disabled={!form.feedName || !form.quantityTons} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Enregistrer le stock
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stocks list */}
      {stocks.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <Package className="h-10 w-10 mx-auto mb-2 text-stone-400" />
            Aucun stock enregistré.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {stocks.map((s) => {
            const gradeColors: Record<string, string> = { A: "bg-emerald-100 text-emerald-800", B: "bg-lime-100 text-lime-800", C: "bg-amber-100 text-amber-800", D: "bg-rose-100 text-rose-800" };
            return (
              <Card key={s.id} className="border-stone-200">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${gradeColors[s.qualityGrade] || "bg-stone-100"}`}>{s.qualityGrade}</Badge>
                      <span className="text-sm font-medium text-stone-900">{s.feedName}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <div><span className="text-stone-500">Quantité:</span> <span className="font-medium">{s.quantityTons} t</span></div>
                    <div><span className="text-stone-500">Prix:</span> <span className="font-medium">{s.pricePerTon} €/t</span></div>
                    <div><span className="text-stone-500">Valeur:</span> <span className="font-medium text-amber-700">{fmt(s.quantityTons * s.pricePerTon, 0)} €</span></div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-stone-500">
                    {s.region && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{s.region}</span>}
                    {s.harvestDate && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{new Date(s.harvestDate).toLocaleDateString("fr-FR")}</span>}
                  </div>
                  {s.notes && <p className="text-[10px] text-stone-500 italic mt-1">{s.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== PRICES TAB ====================
function PricesTab() {
  const [prices, setPrices] = useState<PriceRecord[]>(() => listPrices());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ feedName: "", pricePerKg: "", date: new Date().toISOString().slice(0, 10), region: "" });

  const handleSave = () => {
    if (!form.feedName || !form.pricePerKg) return;
    savePrice({ feedName: form.feedName, pricePerKg: Number(form.pricePerKg), date: form.date, region: form.region });
    setPrices(listPrices());
    setShowForm(false);
    setForm({ feedName: "", pricePerKg: "", date: new Date().toISOString().slice(0, 10), region: "" });
  };

  const handleDelete = (id: string) => {
    deletePrice(id);
    setPrices(listPrices());
  };

  // Group by feed name for trend analysis
  const priceTrends = useMemo(() => {
    const map = new Map<string, PriceRecord[]>();
    prices.forEach((p) => {
      const arr = map.get(p.feedName) || [];
      arr.push(p);
      map.set(p.feedName, arr);
    });
    return Array.from(map.entries()).map(([name, records]) => {
      const sorted = records.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const trend = last.pricePerKg - first.pricePerKg;
      const trendPct = first.pricePerKg > 0 ? (trend / first.pricePerKg) * 100 : 0;
      return { name, records: sorted, latestPrice: last.pricePerKg, trend, trendPct, recordCount: records.length };
    });
  }, [prices]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">{prices.length} enregistrement(s)</Badge>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? "Annuler" : "Enregistrer un prix"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Nouveau prix</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Aliment</Label>
                <Input value={form.feedName} onChange={(e) => setForm({ ...form, feedName: e.target.value })} placeholder="Ex: Foin de prairie" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Région</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Ex: Auvergne" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Prix (€/kg)</Label>
                <Input type="number" step="0.01" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-9" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={!form.feedName || !form.pricePerKg} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Enregistrer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Price trends */}
      {priceTrends.length > 0 ? (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-amber-700" />
              Tendances de prix par aliment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-right px-3 py-2 font-medium">Prix actuel</th>
                    <th className="text-right px-3 py-2 font-medium">Prix initial</th>
                    <th className="text-right px-3 py-2 font-medium">Variation</th>
                    <th className="text-right px-3 py-2 font-medium">% variation</th>
                    <th className="text-center px-3 py-2 font-medium">Enregistrements</th>
                    <th className="text-center px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {priceTrends.map((t, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-900 font-medium">{t.name}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(t.latestPrice, 2)} €/kg</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-stone-500">{fmt(t.records[0].pricePerKg, 2)} €</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${t.trend > 0 ? "text-rose-600" : t.trend < 0 ? "text-emerald-600" : "text-stone-400"}`}>
                        {t.trend > 0 ? "+" : ""}{fmt(t.trend, 2)} €
                      </td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${t.trendPct > 0 ? "text-rose-600" : t.trendPct < 0 ? "text-emerald-600" : "text-stone-400"}`}>
                        {t.trendPct > 0 ? "+" : ""}{fmt(t.trendPct, 1)}%
                      </td>
                      <td className="px-3 py-1.5 text-center text-stone-500">{t.recordCount}</td>
                      <td className="px-3 py-1.5 text-center">
                        {t.trend > 0 ? <TrendingUp className="h-3 w-3 text-rose-500 mx-auto" /> : t.trend < 0 ? <TrendingUp className="h-3 w-3 text-emerald-500 rotate-180 mx-auto" /> : <span className="text-stone-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 text-stone-400" />
            Aucun prix enregistré. Commencez à suivre les prix pour voir les tendances.
          </CardContent>
        </Card>
      )}

      {/* Recent price records */}
      {prices.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Historique récent</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-right px-3 py-2 font-medium">Prix (€/kg)</th>
                    <th className="text-left px-3 py-2 font-medium">Région</th>
                    <th className="text-right px-3 py-2 font-medium">Date</th>
                    <th className="text-center px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {prices.slice(0, 50).map((p) => (
                    <tr key={p.id} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-900">{p.feedName}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(p.pricePerKg, 2)} €</td>
                      <td className="px-3 py-1.5 text-stone-500">{p.region || "—"}</td>
                      <td className="px-3 py-1.5 text-right text-stone-500">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
