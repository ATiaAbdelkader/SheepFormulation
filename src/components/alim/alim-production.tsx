"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Factory, Package, Search, AlertTriangle, CheckCircle2, Plus, Trash2,
  Loader2, GitBranch, ArrowRight, ShieldAlert, FileSearch, Clock,
  Box, TrendingUp, Users,
} from "lucide-react";

type Batch = {
  id: string; batchNumber: string; formulaName: string;
  formulaSnapshot: string; targetQuantityKg: number; actualQuantityKg: number | null;
  status: string; productionLine: string; startDate: string | null; endDate: string | null;
  notes: string | null; createdAt: string;
  _count?: { lots: number };
};

type Lot = {
  id: string; lotNumber: string; type: string; feedName: string;
  quantityKg: number; supplier: string | null; receivedDate: string | null;
  qualityStatus: string; notes: string | null; createdAt: string;
  batch?: { batchNumber: string; formulaName: string } | null;
  _count?: { ingredientLots: number; batchLots: number; shipments: number };
};

type Tab = "batches" | "lots" | "traceability" | "orders";

export function AlimProduction() {
  const [tab, setTab] = useState<Tab>("batches");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Factory className="h-5 w-5 text-amber-700" />
          Production & Traçabilité — Mini-usine
        </h2>
        <p className="text-sm text-stone-500">
          Gestion des batches de production, lots, traçabilité et commandes clients.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabBtn active={tab === "batches"} onClick={() => setTab("batches")} icon={<Factory className="h-3.5 w-3.5" />} label="Production" />
        <TabBtn active={tab === "lots"} onClick={() => setTab("lots")} icon={<Package className="h-3.5 w-3.5" />} label="Lots" />
        <TabBtn active={tab === "traceability"} onClick={() => setTab("traceability")} icon={<GitBranch className="h-3.5 w-3.5" />} label="Traçabilité" />
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} icon={<Users className="h-3.5 w-3.5" />} label="Commandes" />
      </div>

      {tab === "batches" && <BatchesTab />}
      {tab === "lots" && <LotsTab />}
      {tab === "traceability" && <TraceabilityTab />}
      {tab === "orders" && <OrdersTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-amber-100 text-amber-900 border-b-2 border-amber-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== BATCHES TAB ====================
function BatchesTab() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ formulaName: "", targetQuantityKg: "", productionLine: "Line A", notes: "" });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedmill/batches");
      if (res.ok) setBatches(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleCreate = async () => {
    if (!form.formulaName) return;
    await fetch("/api/feedmill/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, targetQuantityKg: Number(form.targetQuantityKg) || 0, formulaSnapshot: { name: form.formulaName } }),
    });
    setForm({ formulaName: "", targetQuantityKg: "", productionLine: "Line A", notes: "" });
    setShowForm(false);
    fetchBatches();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/feedmill/batches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...(status === "in_progress" && { startDate: new Date() }), ...(status === "completed" && { endDate: new Date() }) }),
    });
    fetchBatches();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce batch et ses lots?")) return;
    await fetch(`/api/feedmill/batches?id=${id}`, { method: "DELETE" });
    fetchBatches();
  };

  const statusColors: Record<string, string> = {
    planned: "bg-stone-100 text-stone-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
  };
  const statusLabels: Record<string, string> = {
    planned: "Planifié", in_progress: "En cours", completed: "Terminé", cancelled: "Annulé",
  };

  // KPIs
  const planned = batches.filter((b) => b.status === "planned").length;
  const inProgress = batches.filter((b) => b.status === "in_progress").length;
  const completed = batches.filter((b) => b.status === "completed").length;
  const totalKg = batches.reduce((s, b) => s + (b.actualQuantityKg || b.targetQuantityKg), 0);

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        <KPI icon={<Clock className="h-3 w-3" />} label="Planifiés" value={planned} color="text-stone-600" />
        <KPI icon={<Factory className="h-3 w-3" />} label="En cours" value={inProgress} color="text-blue-600" />
        <KPI icon={<CheckCircle2 className="h-3 w-3" />} label="Terminés" value={completed} color="text-emerald-600" />
        <KPI icon={<TrendingUp className="h-3 w-3" />} label="Production totale" value={`${(totalKg / 1000).toFixed(1)}t`} color="text-amber-600" />
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">{batches.length} batch(es)</Badge>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Nouveau batch</Button>
      </div>

      {showForm && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Nom de la formule *</Label><Input value={form.formulaName} onChange={(e) => setForm({ ...form, formulaName: e.target.value })} className="h-9" placeholder="Ex: Aliment brebis 16%" /></div>
              <div><Label className="text-xs">Quantité cible (kg)</Label><Input type="number" value={form.targetQuantityKg} onChange={(e) => setForm({ ...form, targetQuantityKg: e.target.value })} className="h-9" placeholder="Ex: 500" /></div>
              <div><Label className="text-xs">Ligne de production</Label><Input value={form.productionLine} onChange={(e) => setForm({ ...form, productionLine: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="h-9" /></div>
            </div>
            <Button onClick={handleCreate} disabled={!form.formulaName} className="w-full"><Plus className="h-4 w-4 mr-1" /> Créer le batch</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>
      ) : batches.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50"><CardContent className="p-8 text-center text-sm text-stone-500">
          <Factory className="h-10 w-10 mx-auto mb-2 text-stone-400" />Aucun batch de production.
        </CardContent></Card>
      ) : (
        batches.map((b) => (
          <Card key={b.id} className="border-stone-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{b.batchNumber}</span>
                    <Badge className={`text-[9px] ${statusColors[b.status]}`}>{statusLabels[b.status]}</Badge>
                  </div>
                  <div className="text-xs text-stone-600 mt-0.5">{b.formulaName}</div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {b.productionLine} · {b.targetQuantityKg} kg cible{b.actualQuantityKg ? ` · ${b.actualQuantityKg} kg réel` : ""} · {b._count?.lots || 0} lot(s)
                  </div>
                </div>
                <div className="flex gap-1">
                  {b.status === "planned" && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateStatus(b.id, "in_progress")}>Démarrer</Button>}
                  {b.status === "in_progress" && <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => updateStatus(b.id, "completed")}>Terminer</Button>}
                  <Button size="sm" variant="ghost" className="h-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(b.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              {/* Formula snapshot */}
              <div className="rounded bg-stone-50 p-1.5 text-[10px] text-stone-500">
                <Box className="h-2.5 w-2.5 inline mr-1" />Instantané formule: {b.formulaSnapshot.slice(0, 80)}...
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ==================== LOTS TAB ====================
function LotsTab() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ feedName: "", type: "ingredient", quantityKg: "", supplier: "", notes: "" });

  const fetchLots = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter !== "all" ? `/api/feedmill/lots?type=${filter}` : "/api/feedmill/lots";
      const res = await fetch(url);
      if (res.ok) setLots(await res.json());
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchLots(); }, [fetchLots]);

  const handleCreate = async () => {
    if (!form.feedName) return;
    await fetch("/api/feedmill/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantityKg: Number(form.quantityKg) || 0 }),
    });
    setForm({ feedName: "", type: "ingredient", quantityKg: "", supplier: "", notes: "" });
    setShowForm(false);
    fetchLots();
  };

  const updateQuality = async (id: string, status: string) => {
    await fetch("/api/feedmill/lots", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, qualityStatus: status }) });
    fetchLots();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce lot?")) return;
    await fetch(`/api/feedmill/lots?id=${id}`, { method: "DELETE" });
    fetchLots();
  };

  const qColors: Record<string, string> = {
    pending: "bg-stone-100 text-stone-600",
    passed: "bg-emerald-100 text-emerald-700",
    failed: "bg-rose-100 text-rose-700",
    held: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          <button onClick={() => setFilter("all")} className={`text-[10px] px-2 py-1 rounded ${filter === "all" ? "bg-stone-900 text-white" : "bg-stone-100"}`}>Tous</button>
          <button onClick={() => setFilter("ingredient")} className={`text-[10px] px-2 py-1 rounded ${filter === "ingredient" ? "bg-stone-900 text-white" : "bg-stone-100"}`}>Ingrédients</button>
          <button onClick={() => setFilter("finished")} className={`text-[10px] px-2 py-1 rounded ${filter === "finished" ? "bg-stone-900 text-white" : "bg-stone-100"}`}>Produits finis</button>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Nouveau lot</Button>
      </div>

      {showForm && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Nom de l'aliment *</Label><Input value={form.feedName} onChange={(e) => setForm({ ...form, feedName: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ingredient">Ingrédient</SelectItem><SelectItem value="finished">Produit fini</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Quantité (kg)</Label><Input type="number" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Fournisseur</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="h-9" /></div>
            </div>
            <Button onClick={handleCreate} disabled={!form.feedName} className="w-full"><Plus className="h-4 w-4 mr-1" /> Enregistrer</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>
      ) : lots.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50"><CardContent className="p-8 text-center text-sm text-stone-500">
          <Package className="h-10 w-10 mx-auto mb-2 text-stone-400" />Aucun lot enregistré.
        </CardContent></Card>
      ) : (
        <Card className="border-stone-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">N° Lot</th>
                    <th className="text-left px-3 py-2 font-medium">Aliment</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-right px-3 py-2 font-medium">Qté (kg)</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Fournisseur</th>
                    <th className="text-center px-3 py-2 font-medium">Qualité</th>
                    <th className="text-center px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr key={lot.id} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 font-mono text-[10px] text-stone-700">{lot.lotNumber}</td>
                      <td className="px-3 py-1.5 text-stone-900">{lot.feedName}</td>
                      <td className="px-3 py-1.5">
                        <Badge variant="outline" className={`text-[9px] ${lot.type === "ingredient" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {lot.type === "ingredient" ? "Ingrédient" : "Fini"}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{lot.quantityKg}</td>
                      <td className="px-3 py-1.5 text-stone-500 hidden sm:table-cell">{lot.supplier || "—"}</td>
                      <td className="px-3 py-1.5 text-center">
                        <select value={lot.qualityStatus} onChange={(e) => updateQuality(lot.id, e.target.value)}
                          className={`text-[9px] px-1 py-0.5 rounded border-0 ${qColors[lot.qualityStatus]}`}>
                          <option value="pending">En attente</option>
                          <option value="passed">Conforme</option>
                          <option value="failed">Non conforme</option>
                          <option value="held">Bloqué</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(lot.id)}><Trash2 className="h-3 w-3" /></Button>
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

// ==================== TRACEABILITY TAB ====================
function TraceabilityTab() {
  const [searchLot, setSearchLot] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!searchLot.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feedmill/lots?lotNumber=${encodeURIComponent(searchLot.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setResult({ error: "Lot introuvable" });
      }
    } catch {
      setResult({ error: "Erreur de recherche" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-amber-700" /> Recherche de traçabilité (Recall)
          </CardTitle>
          <CardDescription className="text-xs">
            Entrez un numéro de lot pour tracer sa chaîne complète: ingrédient → batch → expédition → client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={searchLot} onChange={(e) => setSearchLot(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Ex: LOT-IN-12345678" className="h-9 font-mono" />
            <Button onClick={search} disabled={loading || !searchLot.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && result.error && (
        <Card className="border-rose-300 bg-rose-50"><CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-sm text-rose-800">{result.error}</span>
        </CardContent></Card>
      )}

      {result && !result.error && (
        <div className="space-y-3">
          {/* Recall summary */}
          <Card className="border-2 border-amber-400 bg-amber-50/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
                <span className="text-sm font-semibold text-stone-900">Rapport de traçabilité — {result.lot.lotNumber}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded bg-white p-2 text-center border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase">Batches affectés</div>
                  <div className="text-xl font-bold text-amber-700">{result.recallSummary.totalBatchesAffected}</div>
                </div>
                <div className="rounded bg-white p-2 text-center border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase">Expéditions touchées</div>
                  <div className="text-xl font-bold text-rose-700">{result.recallSummary.totalShipmentsAffected}</div>
                </div>
                <div className="rounded bg-white p-2 text-center border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase">Clients affectés</div>
                  <div className="text-xl font-bold text-stone-900">{result.recallSummary.customersAffected}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lot info */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Détails du lot</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-0.5">
              <div><span className="text-stone-500">Aliment:</span> <span className="font-medium">{result.lot.feedName}</span></div>
              <div><span className="text-stone-500">Type:</span> {result.lot.type === "ingredient" ? "Ingrédient" : "Produit fini"}</div>
              <div><span className="text-stone-500">Quantité:</span> {result.lot.quantityKg} kg</div>
              <div><span className="text-stone-500">Fournisseur:</span> {result.lot.supplier || "—"}</div>
              <div><span className="text-stone-500">Statut qualité:</span>
                <Badge className="ml-1 text-[9px]">{result.lot.qualityStatus}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Affected batches */}
          {result.affectedBatches.length > 0 && (
            <Card className="border-stone-200">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-1"><ArrowRight className="h-3 w-3" /> Batches utilisant ce lot ({result.affectedBatches.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                      <tr><th className="text-left px-3 py-1.5 font-medium">N° Batch</th><th className="text-left px-3 py-1.5 font-medium">Formule</th><th className="text-right px-3 py-1.5 font-medium">Qté utilisée (kg)</th></tr>
                    </thead>
                    <tbody>
                      {result.affectedBatches.map((b: any, i: number) => (
                        <tr key={i} className="border-b border-stone-100">
                          <td className="px-3 py-1.5 font-mono text-[10px]">{b.batchLotNumber}</td>
                          <td className="px-3 py-1.5">{b.formulaName}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{b.quantityUsed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Affected shipments */}
          {(result.affectedShipments.length > 0 || result.downstreamShipments.length > 0) && (
            <Card className="border-rose-300 bg-rose-50/30">
              <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold flex items-center gap-1 text-rose-800"><ShieldAlert className="h-3 w-3" /> Expéditions affectées — Clients à contacter</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-rose-100 text-rose-700 border-b border-rose-200">
                      <tr><th className="text-left px-3 py-1.5 font-medium">N° Expédition</th><th className="text-left px-3 py-1.5 font-medium">Client</th><th className="text-right px-3 py-1.5 font-medium">Qté (kg)</th><th className="text-right px-3 py-1.5 font-medium">Date</th></tr>
                    </thead>
                    <tbody>
                      {[...result.affectedShipments, ...result.downstreamShipments].map((s: any, i: number) => (
                        <tr key={i} className="border-b border-stone-100">
                          <td className="px-3 py-1.5 font-mono text-[10px]">{s.shipmentNumber}</td>
                          <td className="px-3 py-1.5 font-medium text-stone-900">{s.customer}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{s.quantity}</td>
                          <td className="px-3 py-1.5 text-right text-stone-500">{new Date(s.shipmentDate).toLocaleDateString("fr-FR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result.affectedBatches.length === 0 && result.affectedShipments.length === 0 && result.downstreamShipments.length === 0 && (
            <Card className="border-emerald-300 bg-emerald-50"><CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-sm text-emerald-800">Aucune expédition affectée — ce lot n&apos;a pas encore été distribué.</span>
            </CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== ORDERS TAB ====================
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", product: "", quantityKg: "", unitPrice: "" });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedmill/orders");
      if (res.ok) setOrders(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCreate = async () => {
    if (!form.customerName || !form.product) return;
    await fetch("/api/feedmill/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantityKg: Number(form.quantityKg) || 0, unitPrice: Number(form.unitPrice) || 0 }),
    });
    setForm({ customerName: "", customerPhone: "", product: "", quantityKg: "", unitPrice: "" });
    setShowForm(false);
    fetchOrders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette commande?")) return;
    await fetch(`/api/feedmill/orders?id=${id}`, { method: "DELETE" });
    fetchOrders();
  };

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalKg = orders.reduce((s, o) => s + o.quantityKg, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <KPI icon={<Users className="h-3 w-3" />} label="Commandes" value={orders.length} color="text-stone-600" />
        <KPI icon={<Package className="h-3 w-3" />} label="Volume total" value={`${(totalKg / 1000).toFixed(1)}t`} color="text-amber-600" />
        <KPI icon={<TrendingUp className="h-3 w-3" />} label="Chiffre d'affaires" value={`${totalRevenue.toFixed(0)}€`} color="text-emerald-600" />
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">{orders.length} commande(s)</Badge>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> Nouvelle commande</Button>
      </div>

      {showForm && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Client *</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Téléphone</Label><Input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Produit *</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Quantité (kg)</Label><Input type="number" value={form.quantityKg} onChange={(e) => setForm({ ...form, quantityKg: e.target.value })} className="h-9" /></div>
              <div><Label className="text-xs">Prix unitaire (€/kg)</Label><Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} className="h-9" /></div>
            </div>
            <Button onClick={handleCreate} disabled={!form.customerName || !form.product} className="w-full"><Plus className="h-4 w-4 mr-1" /> Créer la commande</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>
      ) : orders.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50"><CardContent className="p-8 text-center text-sm text-stone-500">
          <Users className="h-10 w-10 mx-auto mb-2 text-stone-400" />Aucune commande.
        </CardContent></Card>
      ) : (
        <Card className="border-stone-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">N° Commande</th>
                    <th className="text-left px-3 py-2 font-medium">Client</th>
                    <th className="text-left px-3 py-2 font-medium">Produit</th>
                    <th className="text-right px-3 py-2 font-medium">Qté (kg)</th>
                    <th className="text-right px-3 py-2 font-medium">Montant</th>
                    <th className="text-center px-3 py-2 font-medium">Statut</th>
                    <th className="text-center px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 font-mono text-[10px]">{o.orderNumber}</td>
                      <td className="px-3 py-1.5 font-medium text-stone-900">{o.customerName}</td>
                      <td className="px-3 py-1.5">{o.product}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{o.quantityKg}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-emerald-700">{o.totalAmount.toFixed(0)} €</td>
                      <td className="px-3 py-1.5 text-center"><Badge variant="outline" className="text-[9px]">{o.status}</Badge></td>
                      <td className="px-3 py-1.5 text-center"><Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => handleDelete(o.id)}><Trash2 className="h-3 w-3" /></Button></td>
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

function KPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-stone-200"><CardContent className="p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">{icon}<span className="text-[9px] text-stone-500 uppercase">{label}</span></div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </CardContent></Card>
  );
}
