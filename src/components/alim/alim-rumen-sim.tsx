"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Atom, Play, Pause, RotateCcw, Info, Droplet, Bug, Zap } from "lucide-react";

// ---------- Types ----------
type SimFeed = {
  name: string;
  kind: "forage" | "concentre";
  msKg: number; // kg MS
  ufl: number;
  pdin: number;
  pdie: number;
  cb: number; // cellulose brute (estimated from UEM/fiber)
  starch: number; // starch content (estimated)
};

type RumenState = {
  pH: number;
  bacteria: number; // 0-100 (population level)
  protozoa: number;
  fungi: number;
  vfaTotal: number; // mmol/L
  acetate: number; // % of VFA
  propionate: number;
  butyrate: number;
  ammonia: number; // mg/dL
  fillLevel: number; // 0-100% rumen fill
};

// ---------- Feed library (simplified for simulation) ----------
const SIM_FEEDS: SimFeed[] = [
  { name: "Foin de prairie", kind: "forage", msKg: 1.5, ufl: 0.65, pdin: 70, pdie: 65, cb: 32, starch: 2 },
  { name: "Ensilage maïs", kind: "forage", msKg: 1.8, ufl: 0.91, pdin: 50, pdie: 70, cb: 22, starch: 30 },
  { name: "Foin de luzerne", kind: "forage", msKg: 1.3, ufl: 0.58, pdin: 110, pdie: 95, cb: 28, starch: 3 },
  { name: "Pâture (herbe)", kind: "forage", msKg: 2.0, ufl: 0.85, pdin: 90, pdie: 80, cb: 20, starch: 5 },
  { name: "Orge", kind: "concentre", msKg: 0.5, ufl: 0.95, pdin: 69, pdie: 87, cb: 5, starch: 55 },
  { name: "Blé", kind: "concentre", msKg: 0.4, ufl: 1.02, pdin: 70, pdie: 89, cb: 3, starch: 65 },
  { name: "Tourteau de soja", kind: "concentre", msKg: 0.3, ufl: 1.06, pdin: 331, pdie: 229, cb: 7, starch: 8 },
  { name: "Tourteau de colza", kind: "concentre", msKg: 0.3, ufl: 0.85, pdin: 219, pdie: 138, cb: 13, starch: 5 },
  { name: "Lupin", kind: "concentre", msKg: 0.3, ufl: 1.18, pdin: 213, pdie: 106, cb: 13, starch: 4 },
  { name: "Maïs grain", kind: "concentre", msKg: 0.5, ufl: 1.06, pdin: 64, pdie: 84, cb: 2, starch: 70 },
];

// ---------- Simulation engine ----------
function simulateRumen(feeds: SimFeed[], tick: number): RumenState {
  const totalMS = feeds.reduce((s, f) => s + f.msKg, 0);
  if (totalMS === 0) {
    return {
      pH: 7.0, bacteria: 20, protozoa: 15, fungi: 10,
      vfaTotal: 40, acetate: 65, propionate: 20, butyrate: 15,
      ammonia: 5, fillLevel: 0,
    };
  }

  const totalCB = feeds.reduce((s, f) => s + (f.cb * f.msKg), 0) / totalMS;
  const totalStarch = feeds.reduce((s, f) => s + (f.starch * f.msKg), 0) / totalMS;
  const totalPDIN = feeds.reduce((s, f) => s + (f.pdin * f.msKg), 0);
  const foragePct = feeds.filter((f) => f.kind === "forage").reduce((s, f) => s + f.msKg, 0) / totalMS * 100;

  // pH: starch lowers pH, fiber buffers it
  // Base pH = 6.8, each 10% starch drops by 0.15, each 10% CB raises by 0.1
  const tickEffect = Math.sin(tick * 0.05) * 0.15; // diurnal cycle
  let pH = 6.8 - (totalStarch / 100) * 1.5 + (totalCB / 100) * 0.8 + tickEffect;
  pH = Math.max(5.2, Math.min(7.2, pH));

  // Microbial populations
  const fiberFactor = totalCB / 30; // higher fiber = more cellulolytic bacteria
  const starchFactor = totalStarch / 30; // higher starch = more amylolytic bacteria
  const bacteria = Math.min(100, 30 + fiberFactor * 25 + starchFactor * 30 + Math.sin(tick * 0.03) * 5);
  const protozoa = Math.max(5, Math.min(90, 40 - starchFactor * 20 + fiberFactor * 15 + Math.cos(tick * 0.04) * 5));
  const fungi = Math.max(5, Math.min(80, 20 + fiberFactor * 20 + Math.sin(tick * 0.02) * 3));

  // VFA production
  const vfaTotal = 60 + starchFactor * 40 + fiberFactor * 20 + Math.sin(tick * 0.06) * 5;
  // Acetate:Propionate ratio shifts with forage:concentrate
  const acetate = Math.max(40, Math.min(75, 65 + (foragePct - 50) * 0.3));
  const propionate = Math.max(15, Math.min(40, 22 + (100 - foragePct - 50) * 0.2));
  const butyrate = 100 - acetate - propionate;

  // Ammonia (from protein degradation)
  const ammonia = Math.max(2, Math.min(40, 5 + totalPDIN / 50 + Math.sin(tick * 0.07) * 2));

  // Rumen fill
  const fillLevel = Math.min(100, (totalMS / 3.0) * 100);

  return { pH, bacteria, protozoa, fungi, vfaTotal, acetate, propionate, butyrate, ammonia, fillLevel };
}

// ---------- Component ----------
export function AlimRumenSim() {
  const [selectedFeeds, setSelectedFeeds] = useState<SimFeed[]>([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation loop
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setTick((t) => t + 1);
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  const state = useMemo(() => simulateRumen(selectedFeeds, tick), [selectedFeeds, tick]);

  const addFeed = (feed: SimFeed) => {
    setSelectedFeeds([...selectedFeeds, { ...feed }]);
  };

  const removeFeed = (idx: number) => {
    setSelectedFeeds(selectedFeeds.filter((_, i) => i !== idx));
  };

  const reset = () => {
    setSelectedFeeds([]);
    setTick(0);
  };

  // pH status
  const pHStatus = state.pH >= 6.4 ? { label: "Optimal", color: "text-emerald-600", bg: "bg-emerald-100" }
    : state.pH >= 6.0 ? { label: "Attention", color: "text-amber-600", bg: "bg-amber-100" }
    : state.pH >= 5.5 ? { label: "Acidose subaiguë", color: "text-orange-600", bg: "bg-orange-100" }
    : { label: "Acidose aiguë", color: "text-red-600", bg: "bg-red-100" };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Atom className="h-5 w-5 text-cyan-700" />
          Simulateur de rumen interactif
        </h2>
        <p className="text-sm text-stone-500">
          Visualisez en temps réel comment les aliments modifient l&apos;équilibre du rumen :
          pH, populations microbiles, production d&apos;AGV (acides gras volatils).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Feed selector */}
        <Card className="border-stone-200 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Aliments disponibles</CardTitle>
            <CardDescription className="text-xs">Cliquez pour ajouter au rumen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-96 overflow-y-auto">
            {SIM_FEEDS.map((feed, i) => (
              <button
                key={i}
                onClick={() => addFeed(feed)}
                className={`w-full text-left text-xs p-2 rounded-lg border transition-colors ${
                  feed.kind === "forage"
                    ? "border-lime-200 bg-lime-50/50 hover:bg-lime-100"
                    : "border-orange-200 bg-orange-50/50 hover:bg-orange-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-stone-900">{feed.name}</span>
                  <Badge variant="outline" className={`text-[9px] ${feed.kind === "forage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"}`}>
                    {feed.kind === "forage" ? "F" : "C"}
                  </Badge>
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {feed.msKg} kg MS · UFL {feed.ufl} · CB {feed.cb}% · Amidon {feed.starch}%
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Rumen visualization */}
        <Card className="border-cyan-300 lg:col-span-2 bg-gradient-to-b from-cyan-50/30 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-cyan-600" />
                  État du rumen
                </CardTitle>
                <CardDescription className="text-xs">
                  Simulation temps réel · Cycle: {tick}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setPlaying(!playing)} className="h-8 w-8">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={reset} className="h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RumenVisualization state={state} feeds={selectedFeeds} pHStatus={pHStatus} />

            {/* Selected feeds */}
            {selectedFeeds.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-200">
                <div className="text-xs font-medium text-stone-600 mb-1.5">Dans le rumen:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedFeeds.map((feed, i) => (
                    <button
                      key={i}
                      onClick={() => removeFeed(i)}
                      className={`text-[10px] px-2 py-1 rounded-md flex items-center gap-1 ${
                        feed.kind === "forage" ? "bg-lime-100 text-lime-800" : "bg-orange-100 text-orange-800"
                      } hover:opacity-70 transition-opacity`}
                      title="Cliquer pour retirer"
                    >
                      {feed.name}
                      <span className="text-[8px]">({feed.msKg}kg) ×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <MetricCard
          label="pH ruminal"
          value={state.pH.toFixed(2)}
          unit=""
          status={pHStatus}
          icon={<Droplet className="h-3.5 w-3.5" />}
          bar={state.pH >= 6.4 ? "bg-emerald-500" : state.pH >= 6.0 ? "bg-amber-500" : "bg-red-500"}
          barPct={((state.pH - 5.0) / 2.5) * 100}
        />
        <MetricCard
          label="Bactéries"
          value={state.bacteria.toFixed(0)}
          unit="/100"
          status={{ label: state.bacteria > 60 ? "Actif" : "Faible", color: "text-emerald-600", bg: "bg-emerald-100" }}
          icon={<Bug className="h-3.5 w-3.5" />}
          bar="bg-purple-500"
          barPct={state.bacteria}
        />
        <MetricCard
          label="Protozoaires"
          value={state.protozoa.toFixed(0)}
          unit="/100"
          status={{ label: state.protozoa > 30 ? "Stable" : "Réduit", color: "text-cyan-600", bg: "bg-cyan-100" }}
          icon={<Bug className="h-3.5 w-3.5" />}
          bar="bg-cyan-500"
          barPct={state.protozoa}
        />
        <MetricCard
          label="AGV totaux"
          value={state.vfaTotal.toFixed(0)}
          unit="mmol/L"
          status={{ label: "Normal", color: "text-amber-600", bg: "bg-amber-100" }}
          icon={<Zap className="h-3.5 w-3.5" />}
          bar="bg-amber-500"
          barPct={Math.min(100, state.vfaTotal)}
        />
        <MetricCard
          label="Ammoniac"
          value={state.ammonia.toFixed(1)}
          unit="mg/dL"
          status={{ label: state.ammonia > 20 ? "Élevé" : state.ammonia < 5 ? "Bas" : "OK", color: state.ammonia > 20 ? "text-orange-600" : state.ammonia < 5 ? "text-rose-600" : "text-emerald-600", bg: state.ammonia > 20 ? "bg-orange-100" : state.ammonia < 5 ? "bg-rose-100" : "bg-emerald-100" }}
          icon={<Droplet className="h-3.5 w-3.5" />}
          bar="bg-blue-500"
          barPct={Math.min(100, state.ammonia * 3)}
        />
      </div>

      {/* VFA composition */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-stone-700">Composition des AGV (acides gras volatils)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-8 rounded-lg overflow-hidden ring-1 ring-stone-200">
            <div className="bg-emerald-500 flex items-center justify-center text-[10px] text-white font-medium" style={{ width: `${state.acetate}%` }}>
              Acétate {state.acetate.toFixed(0)}%
            </div>
            <div className="bg-amber-500 flex items-center justify-center text-[10px] text-white font-medium" style={{ width: `${state.propionate}%` }}>
              Propionate {state.propionate.toFixed(0)}%
            </div>
            <div className="bg-rose-500 flex items-center justify-center text-[10px] text-white font-medium" style={{ width: `${state.butyrate}%` }}>
              Butyrate {state.butyrate.toFixed(0)}%
            </div>
          </div>
          <p className="text-[10px] text-stone-500 mt-1.5">
            L&apos;acétate (fibres) favorise le lait et la graisse · Le propionate (amidon) favorise l&apos;énergie et la croissance · Le butyrate nourrit la paroi du rumen.
          </p>
        </CardContent>
      </Card>

      {/* Educational info */}
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 space-y-1">
              <p><strong className="text-cyan-900">pH ruminal:</strong> Un pH entre 6.2 et 7.0 est optimal pour la digestion des fibres. Sous 6.0, l&apos;acidose subaiguë (SARA) réduit l&apos;activité des bactéries cellulolytiques.</p>
              <p><strong className="text-cyan-900">Microbiote:</strong> Les bactéries prolifèrent avec les glucides. Les protozoaires sont sensibles aux baisses de pH. Les champignons dégradent les fibres lignifiées.</p>
              <p><strong className="text-cyan-900">AGV:</strong> L&apos;acétate prédomine avec les fourrages (lait). Le propionate augmente avec les concentrés (croissance/énergie).</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Rumen SVG visualization ----------
function RumenVisualization({ state, feeds, pHStatus }: { state: RumenState; feeds: SimFeed[]; pHStatus: any }) {
  const width = 400;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2 + 20;
  const rx = 140;
  const ry = 100;

  // pH color mapping
  const pHColor = state.pH >= 6.4 ? "#10b981" : state.pH >= 6.0 ? "#f59e0b" : state.pH >= 5.5 ? "#f97316" : "#ef4444";

  // Microbial dots positions (simulated)
  const bacteria = Array.from({ length: 15 }, (_, i) => ({
    x: cx + (Math.sin(i * 1.3 + state.tick * 0.02) * rx * 0.7),
    y: cy + (Math.cos(i * 1.7 + state.tick * 0.015) * ry * 0.6),
    r: 3 + Math.sin(i + state.tick * 0.05) * 1,
    opacity: 0.3 + (state.bacteria / 100) * 0.7,
  }));

  const protozoa = Array.from({ length: 8 }, (_, i) => ({
    x: cx + (Math.sin(i * 2.1 + state.tick * 0.01) * rx * 0.6),
    y: cy + (Math.cos(i * 2.5 + state.tick * 0.012) * ry * 0.5),
    r: 5 + Math.sin(i + state.tick * 0.03) * 1.5,
    opacity: 0.2 + (state.protozoa / 100) * 0.8,
  }));

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
        {/* Sheep body outline (simplified) */}
        <path
          d={`M 50 ${cy - 40} Q 30 ${cy - 10} 50 ${cy + 30} L 80 ${cy + 50} L ${cx - rx - 10} ${cy + 50}`}
          fill="#e7e5e4"
          stroke="#a8a29e"
          strokeWidth="2"
        />
        {/* Head */}
        <ellipse cx="45" cy={cy - 30} rx="18" ry="15" fill="#d6d3d1" stroke="#a8a29e" strokeWidth="2" />
        {/* Ear */}
        <ellipse cx="35" cy={cy - 40} rx="6" ry="4" fill="#a8a29e" transform={`rotate(-30 35 ${cy - 40})`} />

        {/* Rumen (main compartment) */}
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={pHColor}
          fillOpacity={0.15 + (state.fillLevel / 100) * 0.25}
          stroke={pHColor}
          strokeWidth="3"
        />

        {/* Fill level indicator */}
        <clipPath id="rumenClip">
          <ellipse cx={cx} cy={cy} rx={rx - 3} ry={ry - 3} />
        </clipPath>
        <g clipPath="url(#rumenClip)">
          <rect
            x={cx - rx}
            y={cy + ry - (state.fillLevel / 100) * ry * 2}
            width={rx * 2}
            height={(state.fillLevel / 100) * ry * 2}
            fill={pHColor}
            fillOpacity={0.2}
          />
          {/* Feed particles in the fill */}
          {feeds.map((feed, i) => {
            const angle = (i / feeds.length) * Math.PI * 2 + state.tick * 0.005;
            const r = 0.4 + (i % 3) * 0.15;
            return (
              <circle
                key={i}
                cx={cx + Math.cos(angle) * rx * r * 0.7}
                cy={cy + ry - 10 + Math.sin(angle) * ry * r * 0.3}
                r={4 + feed.msKg}
                fill={feed.kind === "forage" ? "#65a30d" : "#ea580c"}
                fillOpacity={0.6}
              />
            );
          })}
        </g>

        {/* Bacteria (purple dots) */}
        {bacteria.map((b, i) => (
          <circle key={`b-${i}`} cx={b.x} cy={b.y} r={b.r} fill="#8b5cf6" fillOpacity={b.opacity} />
        ))}

        {/* Protozoa (cyan, larger) */}
        {protozoa.map((p, i) => (
          <ellipse key={`p-${i}`} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.7} fill="#06b6d4" fillOpacity={p.opacity} />
        ))}

        {/* Label */}
        <text x={cx} y={cy - ry - 8} textAnchor="middle" className="text-[10px] fill-stone-600 font-medium">
          Rumen (panse)
        </text>

        {/* pH indicator */}
        <text x={cx} y={cy + 4} textAnchor="middle" className="text-2xl fill-stone-900 font-bold">
          {state.pH.toFixed(2)}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="text-[9px] fill-stone-500">
          pH
        </text>

        {/* Fill level label */}
        <text x={cx + rx + 15} y={cy + 5} className="text-[9px] fill-stone-600 font-medium">
          {state.fillLevel.toFixed(0)}%
        </text>
        <text x={cx + rx + 15} y={cy + 16} className="text-[8px] fill-stone-400">
          remplissage
        </text>

        {/* Legs */}
        <line x1="100" y1={cy + 50} x2="100" y2={cy + 80} stroke="#a8a29e" strokeWidth="3" />
        <line x1={cx + rx - 20} y1={cy + 50} x2={cx + rx - 20} y2={cy + 80} stroke="#a8a29e" strokeWidth="3" />
      </svg>

      {/* Status badge */}
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${pHStatus.bg} ${pHStatus.color}`}>
        {pHStatus.label}
      </div>
    </div>
  );
}

// ---------- Metric card ----------
function MetricCard({ label, value, unit, status, icon, bar, barPct }: any) {
  return (
    <Card className="border-stone-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">
            {icon}
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-stone-900">{value}</span>
          <span className="text-[10px] text-stone-400">{unit}</span>
        </div>
        <div className="mt-1.5 h-1 bg-stone-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, barPct)}%` }} />
        </div>
        <div className="mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>{status.label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
