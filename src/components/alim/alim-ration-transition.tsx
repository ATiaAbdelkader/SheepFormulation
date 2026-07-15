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
  GitBranch, Plus, Trash2, ArrowRight, Calendar, TrendingDown, Info, AlertTriangle,
} from "lucide-react";

type TransitionFeed = {
  id: string;
  kind: "fourrage" | "concentre";
  record: FourrageRecord | ConcentreRecord;
  qtyA: number; // kg brut in ration A (day 0)
  qtyB: number; // kg brut in ration B (final day)
  pricePerKg: number;
};

type DayPoint = {
  day: number;
  feeds: Array<{ name: string; qty: number; cost: number }>;
  totalCost: number;
  totalMS: number;
  totalUFL: number;
};

function msFromBrut(quantityBrut: number, msPct: number | null): number {
  if (!msPct || msPct <= 0) return 0;
  return quantityBrut * (msPct / 100);
}

export function AlimRationTransition() {
  const [animalCategory, setAnimalCategory] = useState<string>("");
  const [transitionDays, setTransitionDays] = useState<number>(7);
  const [feeds, setFeeds] = useState<TransitionFeed[]>([]);

  const availableAnimals = useMemo(() => alimData.animals.filter((a) => num(a.UFL) !== null), []);
  const selectedAnimal = useMemo(() => alimData.animals.find((a) => a.category === animalCategory) || null, [animalCategory]);

  const addFeed = (kind: "fourrage" | "concentre", record: FourrageRecord | ConcentreRecord) => {
    const id = `${kind}-${record.name}-${Date.now()}`;
    const price = num(record.price) ?? 0;
    setFeeds([...feeds, { id, kind, record, qtyA: 0, qtyB: 0, pricePerKg: price }]);
  };

  const updateFeed = (id: string, field: "qtyA" | "qtyB" | "pricePerKg", value: number) => {
    setFeeds(feeds.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFeed = (id: string) => {
    setFeeds(feeds.filter((f) => f.id !== id));
  };

  // Compute transition schedule
  const schedule = useMemo<DayPoint[]>(() => {
    if (feeds.length === 0 || transitionDays <= 0) return [];
    const points: DayPoint[] = [];

    // Generate points for each day
    for (let day = 0; day <= transitionDays; day++) {
      const ratio = day / transitionDays; // 0 = ration A, 1 = ration B
      const dayFeeds = feeds.map((f) => {
        const qty = f.qtyA + (f.qtyB - f.qtyA) * ratio;
        const cost = qty * f.pricePerKg;
        return { name: f.record.name, qty, cost };
      });
      const totalCost = dayFeeds.reduce((s, f) => s + f.cost, 0);
      const totalMS = feeds.reduce((s, f) => {
        const qty = f.qtyA + (f.qtyB - f.qtyA) * ratio;
        return s + msFromBrut(qty, num(f.record.ms_pct));
      }, 0);
      const totalUFL = feeds.reduce((s, f) => {
        const qty = f.qtyA + (f.qtyB - f.qtyA) * ratio;
        const ms = msFromBrut(qty, num(f.record.ms_pct));
        return s + (num(f.record.ufl) || 0) * ms;
      }, 0);
      points.push({ day, feeds: dayFeeds, totalCost, totalMS, totalUFL });
    }
    return points;
  }, [feeds, transitionDays]);

  // Compute warnings
  const warnings = useMemo(() => {
    const warns: string[] = [];
    if (feeds.length === 0) return warns;

    // Check for sudden changes (large qty difference in short time)
    feeds.forEach((f) => {
      const change = Math.abs(f.qtyB - f.qtyA);
      const changePct = f.qtyA > 0 ? (change / f.qtyA) * 100 : 0;
      if (changePct > 50 && transitionDays < 7) {
        warns.push(`${f.record.name}: variation de ${fmt(changePct, 0)}% en ${transitionDays} jours — transition trop rapide`);
      }
    });

    // Check concentrate ratio
    const concMSA = feeds.filter((f) => f.kind === "concentre").reduce((s, f) => s + msFromBrut(f.qtyA, num(f.record.ms_pct)), 0);
    const concMSB = feeds.filter((f) => f.kind === "concentre").reduce((s, f) => s + msFromBrut(f.qtyB, num(f.record.ms_pct)), 0);
    if (concMSB > concMSA * 1.5 && transitionDays < 10) {
      warns.push("Augmentation importante de concentré — risque d'acidose si transition < 10 jours");
    }

    return warns;
  }, [feeds, transitionDays]);

  const costA = feeds.reduce((s, f) => s + f.qtyA * f.pricePerKg, 0);
  const costB = feeds.reduce((s, f) => s + f.qtyB * f.pricePerKg, 0);
  const costDiff = costB - costA;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-cyan-700" />
          Planificateur de transition alimentaire
        </h2>
        <p className="text-sm text-stone-500">
          Planifiez une transition progressive de la ration A vers la ration B sur plusieurs jours.
          Visualisez l&apos;évolution quotidienne des quantités et du coût. Prévient l&apos;acidose et les chocs métaboliques.
        </p>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border-stone-200">
          <CardContent className="p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Animal cible</Label>
              <Select value={animalCategory} onValueChange={setAnimalCategory}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {availableAnimals.map((a, i) => (
                    <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Durée de transition (jours)</Label>
              <Input type="number" min="1" max="30" value={transitionDays} onChange={(e) => setTransitionDays(Number(e.target.value) || 1)} className="h-9" />
              <p className="text-[10px] text-stone-500">Minimum recommandé: 7 jours pour éviter l&apos;acidose</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardContent className="p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Aliments de transition</Label>
              <div className="flex gap-2">
                <TransitionFeedPicker kind="fourrage" onPick={(r) => addFeed("fourrage", r as FourrageRecord)} />
                <TransitionFeedPicker kind="concentre" onPick={(r) => addFeed("concentre", r as ConcentreRecord)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feeds with A and B quantities */}
      {feeds.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Rations A → B</CardTitle>
            <CardDescription className="text-xs">Définissez les quantités (kg brut/jour) au jour 0 (A) et au jour final (B)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {feeds.map((f) => (
              <div key={f.id} className="rounded-lg border border-stone-200 p-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-[9px] ${f.kind === "fourrage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                    {f.kind === "fourrage" ? "F" : "C"}
                  </Badge>
                  <span className="text-xs font-medium text-stone-900 flex-1 truncate">{f.record.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-stone-400 hover:text-rose-600" onClick={() => removeFeed(f.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-stone-500">Jour 0 (Ration A)</Label>
                    <Input type="number" step="0.1" min="0" value={f.qtyA || ""} onChange={(e) => updateFeed(f.id, "qtyA", Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="text-center">
                    <ArrowRight className="h-4 w-4 text-stone-400 mx-auto" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-stone-500">Jour {transitionDays} (Ration B)</Label>
                    <Input type="number" step="0.1" min="0" value={f.qtyB || ""} onChange={(e) => updateFeed(f.id, "qtyB", Number(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500">
                  <span>Prix: <Input type="number" step="0.01" min="0" value={f.pricePerKg || ""} onChange={(e) => updateFeed(f.id, "pricePerKg", Number(e.target.value) || 0)} className="inline h-6 w-16 text-[10px]" /> €/kg</span>
                  <span>Δ: <span className={f.qtyB > f.qtyA ? "text-amber-700" : f.qtyB < f.qtyA ? "text-emerald-700" : "text-stone-400"}>{f.qtyB > f.qtyA ? "+" : ""}{fmt(f.qtyB - f.qtyA, 2)} kg</span></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cost summary */}
      {feeds.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-stone-200">
            <CardContent className="p-2.5 text-center">
              <div className="text-[9px] text-stone-500 uppercase">Coût ration A</div>
              <div className="text-base font-bold text-stone-900">{fmt(costA, 2)} €/j</div>
            </CardContent>
          </Card>
          <Card className="border-stone-200">
            <CardContent className="p-2.5 text-center">
              <div className="text-[9px] text-stone-500 uppercase">Coût ration B</div>
              <div className="text-base font-bold text-stone-900">{fmt(costB, 2)} €/j</div>
            </CardContent>
          </Card>
          <Card className={`border-2 ${costDiff > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
            <CardContent className="p-2.5 text-center">
              <div className="text-[9px] text-stone-500 uppercase">Différence</div>
              <div className={`text-base font-bold ${costDiff > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                {costDiff > 0 ? "+" : ""}{fmt(costDiff, 2)} €/j
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transition schedule chart */}
      {schedule.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Planning de transition ({transitionDays + 1} jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <TransitionChart schedule={schedule} feeds={feeds} transitionDays={transitionDays} />
          </CardContent>
        </Card>
      )}

      {/* Daily schedule table */}
      {schedule.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Détail journalier</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Jour</th>
                    {feeds.map((f, i) => (
                      <th key={i} className="text-right px-3 py-2 font-medium">{f.record.name.slice(0, 15)}</th>
                    ))}
                    <th className="text-right px-3 py-2 font-medium">Coût €/j</th>
                    <th className="text-right px-3 py-2 font-medium">UFL</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.filter((_, i) => i % Math.max(1, Math.floor(schedule.length / 10)) === 0 || i === schedule.length - 1).map((p, i) => (
                    <tr key={i} className={`border-b border-stone-100 ${p.day === 0 ? "bg-blue-50/30" : p.day === transitionDays ? "bg-emerald-50/30" : ""}`}>
                      <td className="px-3 py-1.5 font-medium">
                        {p.day === 0 ? "A (J0)" : p.day === transitionDays ? `B (J${transitionDays})` : `J${p.day}`}
                      </td>
                      {p.feeds.map((f, j) => (
                        <td key={j} className="px-3 py-1.5 text-right tabular-nums">{fmt(f.qty, 2)}</td>
                      ))}
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-amber-800">{fmt(p.totalCost, 2)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(p.totalUFL, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">Transition alimentaire:</strong> Le rumen met 10-15 jours pour
              adapter sa flore microbienne à un nouvel équilibre. Une transition trop rapide augmente le risque
              d&apos;acidose (pH &lt; 5.5) et de déséquilibre métabolique. Recommandation: 7 jours minimum,
              10-14 jours pour les transitions avec forte augmentation de concentré.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TransitionChart({ schedule, feeds, transitionDays }: {
  schedule: DayPoint[];
  feeds: TransitionFeed[];
  transitionDays: number;
}) {
  const width = 700;
  const height = 250;
  const padding = { top: 20, right: 80, bottom: 35, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Find max qty for scaling
  const allQtys = schedule.flatMap((p) => p.feeds.map((f) => f.qty));
  const maxQty = Math.max(...allQtys, 0.1);

  const xScale = (day: number) => padding.left + (day / transitionDays) * chartW;
  const yScale = (qty: number) => padding.top + chartH - (qty / maxQty) * chartH;

  const colors = ["#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1"];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={padding.left} y1={padding.top + t * chartH} x2={width - padding.right} y2={padding.top + t * chartH} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
          <text x={padding.left - 5} y={padding.top + t * chartH + 3} textAnchor="end" className="text-[8px] fill-stone-400">{(maxQty * (1 - t)).toFixed(1)}</text>
        </g>
      ))}

      {/* Lines for each feed */}
      {feeds.map((feed, fi) => {
        const color = colors[fi % colors.length];
        const path = schedule.map((p, i) => {
          const qty = p.feeds[fi]?.qty || 0;
          return `${i === 0 ? "M" : "L"} ${xScale(p.day)} ${yScale(qty)}`;
        }).join(" ");
        return (
          <g key={fi}>
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
            {schedule.map((p, i) => {
              if (i % 2 !== 0 && i !== schedule.length - 1) return null;
              const qty = p.feeds[fi]?.qty || 0;
              return <circle key={i} cx={xScale(p.day)} cy={yScale(qty)} r="3" fill={color} stroke="white" strokeWidth="1" />;
            })}
          </g>
        );
      })}

      {/* X-axis labels */}
      {[0, Math.floor(transitionDays / 4), Math.floor(transitionDays / 2), Math.floor(transitionDays * 3 / 4), transitionDays].map((d) => (
        <text key={d} x={xScale(d)} y={height - padding.bottom + 15} textAnchor="middle" className="text-[8px] fill-stone-500">J{d}</text>
      ))}

      {/* Legend */}
      {feeds.map((feed, fi) => (
        <g key={`leg-${fi}`}>
          <rect x={width - padding.right + 5} y={padding.top + fi * 14} width="8" height="8" fill={colors[fi % colors.length]} rx="1" />
          <text x={width - padding.right + 16} y={padding.top + fi * 14 + 7} className="text-[8px] fill-stone-700">{feed.record.name.slice(0, 18)}</text>
        </g>
      ))}

      {/* Labels */}
      <text x={padding.left + chartW / 2} y={height - 5} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium">Jour de transition</text>
      <text x={15} y={padding.top + chartH / 2} textAnchor="middle" className="text-[10px] fill-stone-700 font-medium" transform={`rotate(-90 15 ${padding.top + chartH / 2})`}>Quantité (kg brut/j)</text>
    </svg>
  );
}

function TransitionFeedPicker({ kind, onPick }: { kind: "fourrage" | "concentre"; onPick: (r: FourrageRecord | ConcentreRecord) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const data = kind === "fourrage" ? allFourrages : allConcentres;
  const filtered = data.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(!open)}
        className={`h-7 text-[10px] ${kind === "fourrage" ? "border-lime-300 text-lime-800 hover:bg-lime-50" : "border-orange-300 text-orange-800 hover:bg-orange-50"}`}>
        <Plus className="h-3 w-3 mr-0.5" />{kind === "fourrage" ? "Fourrage" : "Concentré"}
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
