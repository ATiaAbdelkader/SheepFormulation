"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, allConcentres, type ConcentreRecord } from "@/lib/alim-data";
import { assessConcentrateQuality, findSubstitutes, calculateBulkPurchase, concentrateCategory } from "@/lib/concentrate-market";
import { listSuppliers, saveSupplier, deleteSupplier, listConcentratePrices, saveConcentratePrice, deleteConcentratePrice, type Supplier, type ConcentratePrice } from "@/lib/supplier-storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Sprout, Info, Database, Award, Store, TrendingUp, Euro,
  Plus, Trash2, Star, ArrowRight, ShoppingCart, Phone, Mail, MapPin,
  Truck, AlertTriangle, CheckCircle2, PiggyBank,
} from "lucide-react";

type Tab = "market" | "quality" | "suppliers" | "bulk" | "substitutes";

export function AlimConcentres() {
  const [tab, setTab] = useState<Tab>("market");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Sprout className="h-5 w-5 text-orange-700" />
          Marché des concentrés — Qualité, Prix & Fournisseurs
        </h2>
        <p className="text-sm text-stone-500">
          {allConcentres.length} concentrés (FR + DZ) avec notation qualité, suivi des prix,
          base fournisseurs, calcul d&apos;achat en gros et suggestions de substitution.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "market"} onClick={() => setTab("market")} icon={<Database className="h-3.5 w-3.5" />} label="Marché" />
        <TabButton active={tab === "quality"} onClick={() => setTab("quality")} icon={<Award className="h-3.5 w-3.5" />} label="Qualité" />
        <TabButton active={tab === "suppliers"} onClick={() => setTab("suppliers")} icon={<Store className="h-3.5 w-3.5" />} label="Fournisseurs" />
        <TabButton active={tab === "bulk"} onClick={() => setTab("bulk")} icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Achat en gros" />
        <TabButton active={tab === "substitutes"} onClick={() => setTab("substitutes")} icon={<ArrowRight className="h-3.5 w-3.5" />} label="Substituts" />
      </div>

      {tab === "market" && <MarketTab />}
      {tab === "quality" && <QualityTab />}
      {tab === "suppliers" && <SuppliersTab />}
      {tab === "bulk" && <BulkTab />}
      {tab === "substitutes" && <SubstitutesTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-orange-100 text-orange-900 border-b-2 border-orange-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== MARKET TAB ====================
function MarketTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  const enriched = useMemo(() => {
    return allConcentres.map((c) => {
      const quality = assessConcentrateQuality({
        ufl: num(c.ufl), pdin: num(c.pdin), pdie: num(c.pdie),
        pabs: num(c.pabs), caabs: num(c.caabs), price: num(c.price),
      });
      const cat = concentrateCategory(c.name);
      const uflPerEuro = num(c.ufl) !== null && num(c.price) !== null && num(c.price)! > 0 ? num(c.ufl)! / num(c.price)! : null;
      return { ...c, quality, cat, uflPerEuro };
    });
  }, []);

  const filtered = useMemo(() => {
    let result = enriched.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && c.cat.cat !== category) return false;
      return true;
    });
    // Sort
    if (sortBy === "price-low") result.sort((a, b) => (num(a.price) ?? 999) - (num(b.price) ?? 999));
    else if (sortBy === "price-high") result.sort((a, b) => (num(b.price) ?? 0) - (num(a.price) ?? 0));
    else if (sortBy === "ufl") result.sort((a, b) => (num(b.ufl) ?? 0) - (num(a.ufl) ?? 0));
    else if (sortBy === "quality") result.sort((a, b) => b.quality.score - a.quality.score);
    else if (sortBy === "value") result.sort((a, b) => (b.uflPerEuro ?? 0) - (a.uflPerEuro ?? 0));
    return result;
  }, [enriched, search, category, sortBy]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allConcentres.forEach((c) => set.add(concentrateCategory(c.name).cat));
    return Array.from(set).sort();
  }, []);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <Card className="border-stone-200">
        <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
            <option value="all">Toutes catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
            <option value="name">Trier par: Nom</option>
            <option value="price-low">Trier par: Prix croissant</option>
            <option value="price-high">Trier par: Prix décroissant</option>
            <option value="ufl">Trier par: UFL</option>
            <option value="quality">Trier par: Qualité</option>
            <option value="value">Trier par: Ratio UFL/€</option>
          </select>
        </CardContent>
      </Card>

      <Badge variant="outline" className="bg-stone-50">{filtered.length} concentré(s)</Badge>

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
                  <th className="text-right px-3 py-2.5 font-medium">UFL</th>
                  <th className="text-right px-3 py-2.5 font-medium">PDIN</th>
                  <th className="text-right px-3 py-2.5 font-medium">€/kg</th>
                  <th className="text-right px-3 py-2.5 font-medium hidden lg:table-cell">UFL/€</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50">
                    <td className="px-3 py-2 text-stone-900 font-medium text-xs">
                      <div className="flex items-center gap-1">
                        {c.name.startsWith("[DZ]") && <span className="text-[10px]">🇩🇿</span>}
                        {c.name}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${c.cat.color}`}>{c.cat.cat}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`text-[10px] ${c.quality.bgColor} ${c.quality.color}`}>{c.quality.grade}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">{fmt(num(c.ufl))}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">{fmt(num(c.pdin), 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-amber-700 font-medium">
                      {num(c.price) !== null ? `${fmt(num(c.price), 2)} €` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs hidden lg:table-cell">
                      {c.uflPerEuro !== null ? (
                        <span className={c.uflPerEuro >= 4 ? "text-emerald-700 font-medium" : c.uflPerEuro >= 2 ? "text-amber-700" : "text-rose-700"}>
                          {fmt(c.uflPerEuro, 1)}
                        </span>
                      ) : "—"}
                    </td>
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

// ==================== QUALITY TAB ====================
function QualityTab() {
  const [selectedFeed, setSelectedFeed] = useState<string>("");

  const enriched = useMemo(() => {
    return allConcentres.map((c) => {
      const quality = assessConcentrateQuality({
        ufl: num(c.ufl), pdin: num(c.pdin), pdie: num(c.pdie),
        pabs: num(c.pabs), caabs: num(c.caabs), price: num(c.price),
      });
      return { ...c, quality };
    }).sort((a, b) => b.quality.score - a.quality.score);
  }, []);

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    enriched.forEach((c) => { dist[c.quality.grade]++; });
    return dist;
  }, [enriched]);

  const selected = enriched.find((c) => c.name === selectedFeed);

  return (
    <div className="space-y-3">
      {/* Grade distribution */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Award className="h-3.5 w-3.5 text-orange-700" />
            Distribution de la qualité ({enriched.length} concentrés)
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
        </CardContent>
      </Card>

      {/* Feed selector */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Analyse qualité détaillée</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFeed} onValueChange={setSelectedFeed}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir un concentré..." /></SelectTrigger>
            <SelectContent className="max-h-80">
              {enriched.map((c, i) => (
                <SelectItem key={i} value={c.name} className="text-xs">
                  <span className={`inline-block w-4 text-center font-bold ${c.quality.color}`}>{c.quality.grade}</span>
                  {" "}{c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Detailed assessment */}
      {selected && (
        <Card className={`border-2 ${selected.quality.bgColor.replace("bg-", "border-").replace("100", "300")}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{selected.name}</CardTitle>
                <CardDescription className="text-xs">{selected.quality.label} · Score: {selected.quality.score}/100</CardDescription>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold ${selected.quality.bgColor} ${selected.quality.color} border-2 border-current`}>
                {selected.quality.grade}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-stone-700">{selected.quality.bestUse}</p>

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

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-stone-200">
              <NutBox label="UFL" value={fmt(num(selected.ufl))} />
              <NutBox label="PDIN" value={fmt(num(selected.pdin), 0)} />
              <NutBox label="€/kg" value={num(selected.price) !== null ? fmt(num(selected.price), 2) : "—"} />
              <NutBox label="UFL/€" value={num(selected.ufl) !== null && num(selected.price) !== null && num(selected.price)! > 0 ? fmt(num(selected.ufl)! / num(selected.price)!, 1) : "—"} />
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

// ==================== SUPPLIERS TAB ====================
function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => listSuppliers());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", feedName: "", region: "", contact: "", phone: "", email: "",
    pricePerKg: "", minOrderKg: "", deliveryAvailable: false, deliveryCost: "", rating: "3", notes: "",
  });

  const handleSave = () => {
    if (!form.name || !form.feedName) return;
    saveSupplier({
      name: form.name, feedName: form.feedName, region: form.region,
      contact: form.contact, phone: form.phone, email: form.email,
      pricePerKg: Number(form.pricePerKg) || 0, minOrderKg: Number(form.minOrderKg) || 0,
      deliveryAvailable: form.deliveryAvailable, deliveryCost: Number(form.deliveryCost) || 0,
      rating: Number(form.rating) || 3, notes: form.notes,
    });
    setSuppliers(listSuppliers());
    setShowForm(false);
    setForm({ name: "", feedName: "", region: "", contact: "", phone: "", email: "", pricePerKg: "", minOrderKg: "", deliveryAvailable: false, deliveryCost: "", rating: "3", notes: "" });
  };

  const handleDelete = (id: string) => { deleteSupplier(id); setSuppliers(listSuppliers()); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">{suppliers.length} fournisseur(s)</Badge>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> {showForm ? "Annuler" : "Ajouter"}
        </Button>
      </div>

      {showForm && (
        <Card className="border-orange-300 bg-orange-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Nouveau fournisseur</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Nom du fournisseur *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Aliment proposé *</Label><Input value={form.feedName} onChange={(e) => setForm({ ...form, feedName: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Région</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Contact</Label><Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Prix (€/kg)</Label><Input type="number" step="0.01" value={form.pricePerKg} onChange={(e) => setForm({ ...form, pricePerKg: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Commande min (kg)</Label><Input type="number" value={form.minOrderKg} onChange={(e) => setForm({ ...form, minOrderKg: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Coût livraison (€)</Label><Input type="number" value={form.deliveryCost} onChange={(e) => setForm({ ...form, deliveryCost: e.target.value })} className="h-9" /></div>
              <div className="space-y-1"><Label className="text-xs">Note (0-5)</Label><Input type="number" min="0" max="5" step="0.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="h-9" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9" /></div>
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => setForm({ ...form, deliveryAvailable: e.target.checked })} />Livraison disponible</label>
            <Button onClick={handleSave} disabled={!form.name || !form.feedName} className="w-full"><Plus className="h-4 w-4 mr-1" /> Enregistrer</Button>
          </CardContent>
        </Card>
      )}

      {suppliers.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50"><CardContent className="p-8 text-center text-sm text-stone-500">
          <Store className="h-10 w-10 mx-auto mb-2 text-stone-400" />Aucun fournisseur enregistré.
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {suppliers.map((s) => (
            <Card key={s.id} className="border-stone-200">
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <div className="text-sm font-semibold text-stone-900">{s.name}</div>
                    <div className="text-[10px] text-stone-500">{s.feedName}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex">{Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.floor(s.rating) ? "text-amber-400 fill-amber-400" : "text-stone-200"}`} />
                    ))}</div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-600">
                  {s.pricePerKg > 0 && <div><Euro className="h-2.5 w-2.5 inline" /> {s.pricePerKg} €/kg</div>}
                  {s.minOrderKg > 0 && <div>Min: {s.minOrderKg} kg</div>}
                  {s.region && <div><MapPin className="h-2.5 w-2.5 inline" /> {s.region}</div>}
                  {s.deliveryAvailable && <div><Truck className="h-2.5 w-2.5 inline" /> Livraison ({s.deliveryCost}€)</div>}
                  {s.phone && <div><Phone className="h-2.5 w-2.5 inline" /> {s.phone}</div>}
                  {s.email && <div><Mail className="h-2.5 w-2.5 inline" /> {s.email}</div>}
                </div>
                {s.notes && <p className="text-[10px] text-stone-500 italic mt-1">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== BULK PURCHASE TAB ====================
function BulkTab() {
  const [selectedFeed, setSelectedFeed] = useState<string>("");
  const [customPrice, setCustomPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("500");

  const feed = allConcentres.find((c) => c.name === selectedFeed);
  const price = customPrice ? Number(customPrice) : num(feed?.price) ?? 0;
  const qty = Number(quantity) || 0;

  const analysis = useMemo(() => {
    if (!feed || price <= 0 || qty <= 0) return null;
    return calculateBulkPurchase(feed.name, price, qty);
  }, [feed, price, qty]);

  return (
    <div className="space-y-3">
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <ShoppingCart className="h-3.5 w-3.5 text-orange-700" />
            Calculateur d&apos;achat en gros
          </CardTitle>
          <CardDescription className="text-xs">
            Simulez l&apos;impact d&apos;une variation de prix sur votre achat et décidez du bon moment pour acheter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Concentré</Label>
            <Select value={selectedFeed} onValueChange={(v) => { setSelectedFeed(v); setCustomPrice(""); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                {allConcentres.map((c, i) => (
                  <SelectItem key={i} value={c.name} className="text-xs">
                    {c.name} {num(c.price) !== null ? `(${fmt(num(c.price), 2)} €/kg)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Prix actuel (€/kg)</Label>
              <Input type="number" step="0.01" value={customPrice || (feed ? fmt(num(feed.price) ?? 0, 2) : "")} onChange={(e) => setCustomPrice(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantité (kg)</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <>
          {/* Buy now cost */}
          <Card className="border-amber-300 bg-amber-50/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-stone-500 uppercase">Coût achat immédiat</div>
                  <div className="text-2xl font-bold text-amber-900">{fmt(analysis.buyNowCost, 0)} €</div>
                  <div className="text-[10px] text-stone-500">{fmt(analysis.currentPrice, 2)} €/kg × {analysis.quantityNeeded} kg</div>
                </div>
                <PiggyBank className="h-10 w-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          {/* Scenarios */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Scénarios de variation de prix</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Variation</th>
                      <th className="text-right px-3 py-2 font-medium">Nouveau prix</th>
                      <th className="text-right px-3 py-2 font-medium">Coût total</th>
                      <th className="text-right px-3 py-2 font-medium">Économie</th>
                      <th className="text-left px-3 py-2 font-medium">Recommandation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.scenarios.map((s, i) => (
                      <tr key={i} className={`border-b border-stone-100 ${s.priceChange === 0 ? "bg-stone-50" : ""}`}>
                        <td className="px-3 py-1.5 font-medium">
                          <span className={s.priceChange < 0 ? "text-emerald-700" : s.priceChange > 0 ? "text-rose-700" : "text-stone-600"}>
                            {s.priceChange > 0 ? "+" : ""}{s.priceChange}%
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmt(s.newPrice, 2)} €</td>
                        <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(s.totalCost, 0)} €</td>
                        <td className={`px-3 py-1.5 text-right tabular-nums ${s.savings > 0 ? "text-emerald-700 font-medium" : s.savings < 0 ? "text-rose-700" : "text-stone-400"}`}>
                          {s.savings > 0 ? "+" : ""}{fmt(s.savings, 0)} €
                        </td>
                        <td className="px-3 py-1.5 text-[10px] text-stone-600">{s.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Best scenario */}
          {analysis.bestScenario && (
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-900">
                    <strong>Meilleur scénario:</strong> Si le prix baisse de {analysis.bestScenario.priceChange}%,
                    vous économisez <strong>{fmt(analysis.bestScenario.savings, 0)} €</strong> ({fmt(analysis.bestScenario.savingsPct, 1)}%).
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ==================== SUBSTITUTES TAB ====================
function SubstitutesTab() {
  const [selectedFeed, setSelectedFeed] = useState<string>("");

  const feedsForSub = useMemo(() => {
    return allConcentres.map((c) => ({
      name: c.name,
      ufl: num(c.ufl),
      pdin: num(c.pdin),
      pdie: num(c.pdie),
      pabs: num(c.pabs),
      caabs: num(c.caabs),
      price: num(c.price),
    }));
  }, []);

  const substitutes = useMemo(() => {
    if (!selectedFeed) return [];
    return findSubstitutes(selectedFeed, feedsForSub, 6);
  }, [selectedFeed, feedsForSub]);

  return (
    <div className="space-y-3">
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5 text-orange-700" />
            Moteur de substitution
          </CardTitle>
          <CardDescription className="text-xs">
            Trouvez des alternatives moins chères ou plus disponibles, avec analyse de similarité nutritionnelle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedFeed} onValueChange={setSelectedFeed}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner un concentré..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {allConcentres.map((c, i) => (
                <SelectItem key={i} value={c.name} className="text-xs">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {substitutes.length > 0 && (
        <div className="space-y-2">
          {substitutes.map((s, i) => {
            const recColors: Record<string, string> = {
              excellent: "border-emerald-300 bg-emerald-50/40",
              good: "border-lime-300 bg-lime-50/40",
              acceptable: "border-amber-300 bg-amber-50/40",
              caution: "border-rose-300 bg-rose-50/40",
            };
            const recBadges: Record<string, string> = {
              excellent: "bg-emerald-200 text-emerald-900",
              good: "bg-lime-200 text-lime-900",
              acceptable: "bg-amber-200 text-amber-900",
              caution: "bg-rose-200 text-rose-900",
            };
            return (
              <Card key={i} className={`border-2 ${recColors[s.recommendation]}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">{s.substituteName}</div>
                      <div className="text-[10px] text-stone-500">Substitut de: {s.originalName}</div>
                    </div>
                    <Badge className={`text-[10px] ${recBadges[s.recommendation]}`}>{s.recommendation}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="rounded bg-white p-1.5 text-center border border-stone-200">
                      <div className="text-[9px] text-stone-500 uppercase">Similarité</div>
                      <div className={`text-sm font-bold ${s.similarity >= 80 ? "text-emerald-700" : s.similarity >= 60 ? "text-amber-700" : "text-rose-700"}`}>{fmt(s.similarity, 0)}%</div>
                    </div>
                    <div className="rounded bg-white p-1.5 text-center border border-stone-200">
                      <div className="text-[9px] text-stone-500 uppercase">Δ Prix</div>
                      <div className={`text-sm font-bold ${s.priceDifference !== null && s.priceDifference < 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {s.priceDifference !== null ? `${s.priceDifference > 0 ? "+" : ""}${fmt(s.priceDifference, 2)} €` : "—"}
                      </div>
                    </div>
                    <div className="rounded bg-white p-1.5 text-center border border-stone-200">
                      <div className="text-[9px] text-stone-500 uppercase">Économie</div>
                      <div className={`text-sm font-bold ${s.savingsPct !== null && s.savingsPct > 0 ? "text-emerald-700" : "text-stone-400"}`}>
                        {s.savingsPct !== null ? `${s.savingsPct > 0 ? "+" : ""}${fmt(s.savingsPct, 0)}%` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-stone-600 mb-2">
                    {s.uflDiff !== null && <span>ΔUFL: <span className={Math.abs(s.uflDiff) < 0.1 ? "text-emerald-700 font-medium" : "text-amber-700"}>{s.uflDiff > 0 ? "+" : ""}{fmt(s.uflDiff, 2)}</span></span>}
                    {s.pdinDiff !== null && <span>ΔPDIN: <span className={Math.abs(s.pdinDiff) < 20 ? "text-emerald-700 font-medium" : "text-amber-700"}>{s.pdinDiff > 0 ? "+" : ""}{fmt(s.pdinDiff, 0)}</span></span>}
                  </div>

                  <p className="text-[11px] text-stone-700 italic">{s.reason}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedFeed && substitutes.length === 0 && (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-6 text-center text-sm text-stone-500">
            Aucun substitut similaire trouvé pour {selectedFeed}.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
