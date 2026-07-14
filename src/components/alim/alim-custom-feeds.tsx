"use client";

import { useState, useMemo } from "react";
import { listCustomFeeds, saveCustomFeed, deleteCustomFeed, type CustomFeed } from "@/lib/custom-feed-storage";
import { algerianFeeds, type AlgerianFeed } from "@/lib/alim-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, FlaskConical, Save, Info, Wheat, Sprout, MapPin, Search } from "lucide-react";

type FormData = {
  name: string;
  kind: "fourrage" | "concentre";
  ms_pct: string;
  uem: string;
  ufl: string;
  pdin: string;
  pdie: string;
  pabs: string;
  caabs: string;
  price: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  kind: "fourrage",
  ms_pct: "",
  uem: "",
  ufl: "",
  pdin: "",
  pdie: "",
  pabs: "",
  caabs: "",
  price: "",
};

export function AlimCustomFeeds() {
  const [feeds, setFeeds] = useState<CustomFeed[]>(() => listCustomFeeds());
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const toNum = (s: string): number | null => {
      if (s === "" || s === undefined) return null;
      const n = Number(s);
      return isNaN(n) ? null : n;
    };
    saveCustomFeed({
      name: form.name.trim(),
      kind: form.kind,
      ms_pct: toNum(form.ms_pct),
      uem: toNum(form.uem),
      ueb: null,
      ufl: toNum(form.ufl),
      ufv: null,
      pdin: toNum(form.pdin),
      pdie: toNum(form.pdie),
      pabs: toNum(form.pabs),
      caabs: toNum(form.caabs),
      price: toNum(form.price),
    });
    setFeeds(listCustomFeeds());
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteCustomFeed(id);
    setFeeds(listCustomFeeds());
  };

  const update = (field: keyof FormData, value: string) => {
    setForm({ ...form, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-cyan-700" />
          Mes aliments — Saisie personnalisée
        </h2>
        <p className="text-sm text-stone-500">
          Créez vos propres aliments à partir des analyses de laboratoire (MS%, UFL, PDIN, PDIE, Pabs, Caabs).
          Ces aliments personnalisés s&apos;ajoutent à la base de données et peuvent être utilisés dans le
          calculateur de rations.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-cyan-200 bg-cyan-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">Comment utiliser :</strong> Saisissez les valeurs de votre
              analyse de laboratoire (par kg de matière sèche). Le % de MS permet de convertir les quantités
              brutes en quantités MS. Les aliments créés sont stockés dans votre navigateur (localStorage)
              et persistent entre les sessions.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="bg-stone-50">
          {feeds.length} aliment{feeds.length > 1 ? "s" : ""} personnalisé{feeds.length > 1 ? "s" : ""}
        </Badge>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? "Annuler" : (
            <><Plus className="h-4 w-4 mr-1" /> Nouvel aliment</>
          )}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-cyan-300 bg-gradient-to-br from-cyan-50/40 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Nouvel aliment personnalisé</CardTitle>
            <CardDescription className="text-xs">
              Saisissez les valeurs de l&apos;analyse de laboratoire. Les champs marqués d&apos;un * sont obligatoires.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Nom de l&apos;aliment *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: Foin de prairie 2026"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.kind} onValueChange={(v) => update("kind", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fourrage">Fourrage</SelectItem>
                    <SelectItem value="concentre">Concentré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormInput label="% MS" value={form.ms_pct} onChange={(v) => update("ms_pct", v)} placeholder="ex: 85" unit="%" />
              <FormInput label="UEM" value={form.uem} onChange={(v) => update("uem", v)} placeholder="ex: 1.2" />
              <FormInput label="UFL" value={form.ufl} onChange={(v) => update("ufl", v)} placeholder="ex: 0.75" />
              <FormInput label="PDIN" value={form.pdin} onChange={(v) => update("pdin", v)} placeholder="ex: 80" unit="g/kg" />
              <FormInput label="PDIE" value={form.pdie} onChange={(v) => update("pdie", v)} placeholder="ex: 75" unit="g/kg" />
              <FormInput label="Pabs" value={form.pabs} onChange={(v) => update("pabs", v)} placeholder="ex: 2.5" unit="g/kg" />
              <FormInput label="Caabs" value={form.caabs} onChange={(v) => update("caabs", v)} placeholder="ex: 4.0" unit="g/kg" />
              <FormInput label="Prix" value={form.price} onChange={(v) => update("price", v)} placeholder="ex: 0.20" unit="€/kg" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-cyan-200">
              <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!form.name.trim()}>
                <Save className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Algerian feeds library (preloaded) */}
      <AlgerianFeedsLibrary />

      {/* List of custom feeds */}
      {feeds.length === 0 && !showForm ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <FlaskConical className="h-8 w-8 mx-auto mb-2 text-stone-400" />
            Aucun aliment personnalisé pour le moment.
            <br />
            <span className="text-xs">Cliquez sur &quot;Nouvel aliment&quot; pour en créer un.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {feeds.map((f) => (
            <Card key={f.id} className="border-stone-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {f.kind === "fourrage" ? (
                      <Wheat className="h-4 w-4 text-lime-700 flex-shrink-0" />
                    ) : (
                      <Sprout className="h-4 w-4 text-orange-700 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold text-stone-900 truncate">{f.name}</CardTitle>
                      <CardDescription className="text-[10px]">
                        {f.kind === "fourrage" ? "Fourrage" : "Concentré"} · Créé le {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(f.id)}
                    className="h-7 w-7 text-stone-400 hover:text-rose-600 flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <FeedStat label="MS%" value={f.ms_pct} decimals={0} />
                  <FeedStat label="UFL" value={f.ufl} decimals={2} />
                  <FeedStat label="PDIN" value={f.pdin} decimals={0} unit="g" />
                  <FeedStat label="PDIE" value={f.pdie} decimals={0} unit="g" />
                  <FeedStat label="Pabs" value={f.pabs} decimals={2} unit="g" />
                  <FeedStat label="Caabs" value={f.caabs} decimals={2} unit="g" />
                  <FeedStat label="UEM" value={f.uem} decimals={2} />
                  <FeedStat label="Prix" value={f.price} decimals={2} unit="€" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, unit }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-stone-500">{label}{unit && <span className="text-stone-400 ml-0.5">({unit})</span>}</Label>
      <Input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  );
}

function FeedStat({ label, value, decimals = 2, unit }: { label: string; value: number | null; decimals?: number; unit?: string }) {
  return (
    <div className="rounded bg-stone-50 p-1.5 text-center">
      <div className="text-[9px] text-stone-500 uppercase">{label}</div>
      <div className="text-xs font-medium text-stone-900">
        {value !== null ? value.toFixed(decimals) : "—"}
        {unit && value !== null && <span className="text-[8px] text-stone-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

// ---------- Algerian Feeds Library (preloaded) ----------
function AlgerianFeedsLibrary() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    algerianFeeds.forEach((f) => set.add(f.category));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return algerianFeeds.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && f.category !== category) return false;
      return true;
    });
  }, [search, category]);

  const displayed = showAll ? filtered : filtered.slice(0, 12);

  return (
    <Card className="border-emerald-200 bg-emerald-50/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-700" />
              Base algérienne d&apos;aliments ({algerianFeeds.length} aliments)
            </CardTitle>
            <CardDescription className="text-xs">
              Table de composition et de la valeur nutritive des matières premières (ITGC/INRAA Algérie).
              Disponibles dans tous les modules de formulation.
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">🇩🇿 DZ</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Rechercher un aliment algérien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Feed grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {displayed.map((f, i) => (
            <AlgerianFeedCard key={i} feed={f} />
          ))}
        </div>

        {/* Show more / less */}
        {filtered.length > 12 && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Afficher moins" : `Afficher les ${filtered.length - 12} restants`}
            </Button>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center text-xs text-stone-500 py-4">
            Aucun aliment trouvé pour cette recherche.
          </div>
        )}

        {/* Info */}
        <div className="pt-2 border-t border-emerald-200">
          <p className="text-[10px] text-stone-500 italic">
            <Info className="h-3 w-3 inline mr-1" />
            Ces aliments sont préchargés et disponibles dans les modules Ration, Optimisation, Vérificateur et Mélange.
            Les valeurs Caabs et Pabs sont estimées à partir du Ca et P totaux avec des coefficients d&apos;absorption standards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AlgerianFeedCard({ feed }: { feed: AlgerianFeed }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-2.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs font-medium text-stone-900 flex-1 min-w-0">
          {feed.kind === "fourrage" ? (
            <Wheat className="h-3 w-3 text-lime-700 inline mr-1 flex-shrink-0" />
          ) : (
            <Sprout className="h-3 w-3 text-orange-700 inline mr-1 flex-shrink-0" />
          )}
          {feed.name}
        </span>
      </div>
      <Badge variant="outline" className="text-[9px] mb-1.5 bg-emerald-50 text-emerald-700">
        {feed.category}
      </Badge>
      <div className="grid grid-cols-4 gap-1 text-[10px]">
        <DzStat label="MS%" value={feed.ms_pct} decimals={0} />
        <DzStat label="UFL" value={feed.ufl} decimals={2} />
        <DzStat label="PDIN" value={feed.pdin} decimals={0} unit="g" />
        <DzStat label="PDIE" value={feed.pdie} decimals={0} unit="g" />
        <DzStat label="CB%" value={feed.cb_pct} decimals={1} />
        <DzStat label="MAT%" value={feed.protein_pct} decimals={1} />
        <DzStat label="Caabs" value={feed.caabs} decimals={2} unit="g" />
        <DzStat label="Pabs" value={feed.pabs} decimals={2} unit="g" />
      </div>
    </div>
  );
}

function DzStat({ label, value, decimals = 2, unit }: { label: string; value: number | null; decimals?: number; unit?: string }) {
  return (
    <div className="rounded bg-stone-50 p-1 text-center">
      <div className="text-[8px] text-stone-500 uppercase">{label}</div>
      <div className="text-[10px] font-medium text-stone-900">
        {value !== null && value !== undefined ? value.toFixed(decimals) : "—"}
        {unit && value !== null && value !== undefined && <span className="text-[7px] text-stone-400 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
