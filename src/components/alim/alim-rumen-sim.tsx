"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Atom, Play, Pause, RotateCcw, Info, Droplet, Bug, Zap, Wind,
  Thermometer, Gauge, Activity, Brain, Award, CheckCircle2, XCircle,
  Sunrise, Sun, Sunset, Moon, FlaskConical, AlertCircle, Beaker, GitCompare,
  ArrowRight, Plus,
} from "lucide-react";
import { MICROBE_ENCYCLOPEDIA, simulateBuffer } from "@/lib/microbe-encyclopedia";

// ==================== TYPES ====================

type FeedKind = "forage" | "concentre" | "liquid";

type SimFeed = {
  id: string;
  name: string;
  kind: FeedKind;
  msKg: number;
  ufl: number;
  pdin: number;
  pdie: number;
  cb: number;           // cellulose brute %
  ndf: number;          // NDF %
  starch: number;       // %
  sugar: number;        // soluble sugars %
  protein: number;      // crude protein (MAT) %
  fat: number;          // ether extract %
  degradationRate: number; // kd (fraction/h) — how fast it ferments
  particleSize: number;    // 1-10 (1=fine, 10=coarse)
  color: string;
};

type RumenState = {
  pH: number;
  // Microbial populations (0-100)
  cellulolytic: number;
  amylolytic: number;
  proteolytic: number;
  protozoa: number;
  fungi: number;
  methanogens: number;
  // Metabolites
  vfaTotal: number;
  acetate: number;
  propionate: number;
  butyrate: number;
  ammonia: number;
  lacticAcid: number;
  // Gas production
  methane: number;      // L/day
  co2: number;          // L/day
  // Physical
  fillLevel: number;
  passageRate: number;
  salivaFlow: number;
  temperature: number;
};

type TimePoint = {
  hour: number;
  pH: number;
  vfa: number;
  ammonia: number;
  lacticAcid: number;
  methane: number;
};

type FeedingEvent = {
  hour: number;
  feedName: string;
  amount: number;
};

type Scenario = {
  id: string;
  name: string;
  description: string;
  feeds: string[]; // feed ids
  color: string;
};

// ==================== FEED LIBRARY (20+ feeds) ====================

const FEED_LIBRARY: SimFeed[] = [
  // Fourrages
  { id: "foin-prairie", name: "Foin de prairie", kind: "forage", msKg: 1.5, ufl: 0.65, pdin: 70, pdie: 65, cb: 32, ndf: 55, starch: 2, sugar: 8, protein: 11, fat: 2, degradationRate: 0.04, particleSize: 8, color: "#84cc16" },
  { id: "foin-luzerne", name: "Foin de luzerne", kind: "forage", msKg: 1.3, ufl: 0.58, pdin: 110, pdie: 95, cb: 28, ndf: 45, starch: 3, sugar: 6, protein: 18, fat: 2.5, degradationRate: 0.06, particleSize: 7, color: "#65a30d" },
  { id: "ensilage-mais", name: "Ensilage maïs", kind: "forage", msKg: 1.8, ufl: 0.91, pdin: 50, pdie: 70, cb: 22, ndf: 40, starch: 30, sugar: 2, protein: 8, fat: 3, degradationRate: 0.05, particleSize: 6, color: "#eab308" },
  { id: "ensilage-herbe", name: "Ensilage d'herbe", kind: "forage", msKg: 1.6, ufl: 0.78, pdin: 80, pdie: 75, cb: 28, ndf: 50, starch: 4, sugar: 10, protein: 14, fat: 3.5, degradationRate: 0.06, particleSize: 6, color: "#22c55e" },
  { id: "pature", name: "Pâture (herbe jeune)", kind: "forage", msKg: 2.0, ufl: 0.85, pdin: 90, pdie: 80, cb: 20, ndf: 38, starch: 5, sugar: 15, protein: 16, fat: 4, degradationRate: 0.08, particleSize: 5, color: "#10b981" },
  { id: "pature-mature", name: "Pâture (herbe mature)", kind: "forage", msKg: 1.8, ufl: 0.72, pdin: 65, pdie: 70, cb: 30, ndf: 55, starch: 3, sugar: 8, protein: 10, fat: 3, degradationRate: 0.05, particleSize: 7, color: "#059669" },
  { id: "paille", name: "Paille de blé", kind: "forage", msKg: 0.8, ufl: 0.44, pdin: 20, pdie: 35, cb: 42, ndf: 80, starch: 1, sugar: 1, protein: 3, fat: 1.5, degradationRate: 0.02, particleSize: 9, color: "#d97706" },
  { id: "foin-regain", name: "Foin de regain", kind: "forage", msKg: 1.4, ufl: 0.62, pdin: 85, pdie: 78, cb: 30, ndf: 52, starch: 2, sugar: 9, protein: 13, fat: 2.5, degradationRate: 0.05, particleSize: 8, color: "#a3e635" },
  { id: "enrubanne", name: "Enrubanné luzerne", kind: "forage", msKg: 1.5, ufl: 0.70, pdin: 105, pdie: 90, cb: 26, ndf: 42, starch: 4, sugar: 7, protein: 17, fat: 3, degradationRate: 0.07, particleSize: 6, color: "#4ade80" },
  // Céréales
  { id: "orge", name: "Orge", kind: "concentre", msKg: 0.5, ufl: 0.95, pdin: 69, pdie: 87, cb: 5, ndf: 18, starch: 55, sugar: 3, protein: 11, fat: 2, degradationRate: 0.12, particleSize: 3, color: "#f59e0b" },
  { id: "ble", name: "Blé", kind: "concentre", msKg: 0.4, ufl: 1.02, pdin: 70, pdie: 89, cb: 3, ndf: 12, starch: 65, sugar: 3, protein: 12, fat: 2, degradationRate: 0.18, particleSize: 2, color: "#fbbf24" },
  { id: "mais-grain", name: "Maïs grain", kind: "concentre", msKg: 0.5, ufl: 1.06, pdin: 64, pdie: 84, cb: 2, ndf: 9, starch: 70, sugar: 2, protein: 9, fat: 4, degradationRate: 0.08, particleSize: 4, color: "#eab308" },
  { id: "avoine", name: "Avoine", kind: "concentre", msKg: 0.5, ufl: 0.77, pdin: 61, pdie: 61, cb: 11, ndf: 30, starch: 42, sugar: 2, protein: 10, fat: 5, degradationRate: 0.10, particleSize: 4, color: "#d97706" },
  { id: "triticale", name: "Triticale", kind: "concentre", msKg: 0.5, ufl: 0.95, pdin: 63, pdie: 84, cb: 4, ndf: 14, starch: 58, sugar: 3, protein: 11, fat: 1.5, degradationRate: 0.14, particleSize: 3, color: "#f59e0b" },
  // Tourteaux
  { id: "soja-48", name: "Tourteau de soja", kind: "concentre", msKg: 0.3, ufl: 1.06, pdin: 331, pdie: 229, cb: 7, ndf: 14, starch: 8, sugar: 12, protein: 50, fat: 2, degradationRate: 0.09, particleSize: 2, color: "#ef4444" },
  { id: "colza-35", name: "Tourteau de colza", kind: "concentre", msKg: 0.3, ufl: 0.85, pdin: 219, pdie: 138, cb: 13, ndf: 28, starch: 5, sugar: 8, protein: 35, fat: 3, degradationRate: 0.08, particleSize: 3, color: "#dc2626" },
  { id: "tournesol", name: "Tourteau de tournesol", kind: "concentre", msKg: 0.3, ufl: 0.56, pdin: 178, pdie: 93, cb: 24, ndf: 40, starch: 3, sugar: 5, protein: 30, fat: 3, degradationRate: 0.06, particleSize: 3, color: "#f97316" },
  // Protéagineux
  { id: "lupin", name: "Lupin", kind: "concentre", msKg: 0.3, ufl: 1.18, pdin: 213, pdie: 106, cb: 13, ndf: 25, starch: 4, sugar: 6, protein: 34, fat: 6, degradationRate: 0.10, particleSize: 5, color: "#8b5cf6" },
  { id: "feverole", name: "Féverole", kind: "concentre", msKg: 0.3, ufl: 1.03, pdin: 170, pdie: 97, cb: 9, ndf: 18, starch: 40, sugar: 4, protein: 28, fat: 1.5, degradationRate: 0.09, particleSize: 5, color: "#a78bfa" },
  { id: "pois", name: "Pois", kind: "concentre", msKg: 0.3, ufl: 1.04, pdin: 130, pdie: 83, cb: 6, ndf: 13, starch: 45, sugar: 5, protein: 22, fat: 1.5, degradationRate: 0.12, particleSize: 5, color: "#c084fc" },
  // Divers
  { id: "pulpe-betterave", name: "Pulpe de betterave", kind: "concentre", msKg: 0.5, ufl: 0.89, pdin: 59, pdie: 97, cb: 19, ndf: 45, starch: 2, sugar: 7, protein: 10, fat: 0.5, degradationRate: 0.07, particleSize: 4, color: "#fb923c" },
  { id: "melasse", name: "Mélasse", kind: "liquid", msKg: 0.2, ufl: 0.75, pdin: 63, pdie: 54, cb: 0, ndf: 0, starch: 0, sugar: 50, protein: 10, fat: 0, degradationRate: 0.25, particleSize: 1, color: "#451a03" },
  { id: "uree", name: "Urée", kind: "liquid", msKg: 0.03, ufl: 0, pdin: 1443, pdie: 0, cb: 0, ndf: 0, starch: 0, sugar: 0, protein: 287, fat: 0, degradationRate: 0.50, particleSize: 1, color: "#94a3b8" },
];

// ==================== SCENARIOS ====================

const SCENARIOS: Scenario[] = [
  {
    id: "healthy",
    name: "Ration équilibrée",
    description: "Foin + ensilage + orge — couvre les besoins sans excès",
    feeds: ["foin-prairie", "ensilage-mais", "orge"],
    color: "#10b981",
  },
  {
    id: "acidosis",
    name: "Risque d'acidose",
    description: "Beaucoup de blé (amidon rapide), peu de fibres",
    feeds: ["ble", "ble", "mais-grain", "paille"],
    color: "#ef4444",
  },
  {
    id: "protein-deficit",
    name: "Déficit protéique",
    description: "Énergie sans protéines — ammonia bas, croissance microbienne limitée",
    feeds: ["ensilage-mais", "mais-grain", "mais-grain"],
    color: "#f59e0b",
  },
  {
    id: "protein-excess",
    name: "Excès protéique",
    description: "Tourteau de soja + urée — ammonia très élevé, gaspillage",
    feeds: ["foin-luzerne", "soja-48", "soja-48", "uree"],
    color: "#8b5cf6",
  },
  {
    id: "optimal-lactation",
    name: "Lactation optimale",
    description: "Bonne pâture + complément énergético-protéique",
    feeds: ["pature", "mais-grain", "soja-48"],
    color: "#06b6d4",
  },
  {
    id: "fiber-heavy",
    name: "Ration fibreuse",
    description: "Surtout des fourrages — pH élevé, fermentation lente",
    feeds: ["foin-prairie", "foin-regain", "paille"],
    color: "#84cc16",
  },
];

// ==================== SIMULATION ENGINE ====================

function simulateRumen(feeds: SimFeed[], hour: number, feedingEvents: FeedingEvent[]): RumenState {
  const totalMS = feeds.reduce((s, f) => s + f.msKg, 0);

  if (totalMS === 0) {
    return {
      pH: 7.0, cellulolytic: 20, amylolytic: 15, proteolytic: 15,
      protozoa: 15, fungi: 10, methanogens: 10,
      vfaTotal: 40, acetate: 65, propionate: 20, butyrate: 15,
      ammonia: 5, lacticAcid: 0, methane: 5, co2: 10,
      fillLevel: 0, passageRate: 0.02, salivaFlow: 6, temperature: 39.0,
    };
  }

  // Weighted averages
  const wAvg = (key: keyof SimFeed) => feeds.reduce((s, f) => s + (f[key] as number * f.msKg), 0) / totalMS;
  const totalCB = wAvg("cb");
  const totalNDF = wAvg("ndf");
  const totalStarch = wAvg("starch");
  const totalSugar = wAvg("sugar");
  const totalProtein = wAvg("protein");
  const totalFat = wAvg("fat");
  const avgKd = wAvg("degradationRate");
  const avgParticle = wAvg("particleSize");

  const forageMS = feeds.filter((f) => f.kind === "forage").reduce((s, f) => s + f.msKg, 0);
  const concentrateMS = feeds.filter((f) => f.kind === "concentre").reduce((s, f) => s + f.msKg, 0);
  const foragePct = (forageMS / totalMS) * 100;
  const concentratePct = (concentrateMS / totalMS) * 100;

  // Effect of recent feeding on pH (simulates post-feeding drop)
  const recentFeeds = feedingEvents.filter((e) => {
    const diff = hour - e.hour;
    return diff >= 0 && diff < 4; // feeds within last 4 hours
  });
  const recentStarch = recentFeeds.reduce((s, e) => {
    const feed = FEED_LIBRARY.find((f) => f.name === e.feedName);
    return s + (feed ? feed.starch * e.amount : 0);
  }, 0);
  const feedingEffect = recentStarch * 0.005; // more recent starch = lower pH

  // pH model
  const basePH = 6.8;
  const starchEffect = (totalStarch / 100) * 1.8;
  const fiberEffect = (totalCB / 100) * 1.0;
  const sugarEffect = (totalSugar / 100) * 0.6;
  const diurnalOscillation = Math.sin((hour - 8) * Math.PI / 12) * 0.12;
  let pH = basePH - starchEffect - sugarEffect + fiberEffect + diurnalOscillation - feedingEffect;
  pH = Math.max(5.2, Math.min(7.2, pH));

  // Microbial populations
  const fiberFactor = totalCB / 30;
  const starchFactor = totalStarch / 30;
  const sugarFactor = totalSugar / 20;
  const proteinFactor = totalProtein / 15;

  const cellulolytic = Math.min(100, 25 + fiberFactor * 25 + Math.sin(hour * 0.1) * 3);
  const amylolytic = Math.min(100, 20 + starchFactor * 30 + sugarFactor * 10 + Math.cos(hour * 0.12) * 3);
  const proteolytic = Math.min(100, 18 + proteinFactor * 20 + Math.sin(hour * 0.08) * 2);
  const protozoa = Math.max(5, Math.min(95, 45 - starchFactor * 25 - sugarFactor * 10 + fiberFactor * 18 + Math.cos(hour * 0.09) * 3));
  const fungi = Math.max(5, Math.min(85, 22 + fiberFactor * 22 + Math.sin(hour * 0.06) * 2));
  const methanogens = Math.max(5, Math.min(90, 28 + fiberFactor * 20 + Math.cos(hour * 0.07) * 2));

  // VFA production
  const vfaTotal = 50 + starchFactor * 45 + sugarFactor * 20 + fiberFactor * 20 + Math.sin(hour * 0.15) * 5;

  // Acetate:Propionate ratio shifts with forage:concentrate
  const acetate = Math.max(35, Math.min(78, 68 + (foragePct - 50) * 0.35));
  const propionate = Math.max(12, Math.min(45, 20 + (concentratePct - 50) * 0.25 + sugarFactor * 5));
  const butyrate = Math.max(5, 100 - acetate - propionate);

  // Ammonia (from protein degradation)
  const totalPDIN = feeds.reduce((s, f) => s + (f.pdin * f.msKg), 0);
  const ammonia = Math.max(2, Math.min(45, 4 + totalPDIN / 60 + Math.sin(hour * 0.14) * 2));

  // Lactic acid (acidosis indicator)
  let lacticAcid = 0;
  if (pH < 6.0) lacticAcid = (6.0 - pH) * 8;
  if (pH < 5.5) lacticAcid += (5.5 - pH) * 15;
  lacticAcid = Math.max(0, lacticAcid);

  // Gas production (methane + CO2)
  const methane = 8 + fiberFactor * 12 + Math.sin(hour * 0.13) * 1.5;
  const co2 = 12 + starchFactor * 10 + sugarFactor * 8 + Math.cos(hour * 0.16) * 1.5;

  // Physical parameters
  const fillLevel = Math.min(100, (totalMS / 3.5) * 100);
  const passageRate = 0.02 + (totalMS / 10) * 0.03 + (1 - avgParticle / 10) * 0.02;
  // Saliva flow increases with chewing (fiber)
  const salivaFlow = 4 + fiberFactor * 4 + avgParticle * 0.5;
  const temperature = 39.0 + Math.sin(hour * 0.1) * 0.1;

  return {
    pH, cellulolytic, amylolytic, proteolytic, protozoa, fungi, methanogens,
    vfaTotal, acetate, propionate, butyrate, ammonia, lacticAcid,
    methane, co2, fillLevel, passageRate, salivaFlow, temperature,
  };
}

// ==================== COMPONENT ====================

export function AlimRumenSim() {
  const [labTab, setLabTab] = useState<"lab" | "microbes" | "buffer" | "compare">("lab");
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>(["foin-prairie", "ensilage-mais", "orge"]);
  const [hour, setHour] = useState(8); // 0-24
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [feedingEvents, setFeedingEvents] = useState<FeedingEvent[]>([
    { hour: 8, feedName: "Foin de prairie", amount: 1.5 },
    { hour: 8, feedName: "Ensilage maïs", amount: 1.8 },
    { hour: 8, feedName: "Orge", amount: 0.5 },
  ]);
  const [history, setHistory] = useState<TimePoint[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedFeeds = useMemo(() => {
    return selectedFeedIds.map((id) => FEED_LIBRARY.find((f) => f.id === id)!).filter(Boolean);
  }, [selectedFeedIds]);

  const state = useMemo(() => simulateRumen(selectedFeeds, hour, feedingEvents), [selectedFeeds, hour, feedingEvents]);

  // Record history — guard inside effect to prevent cascade
  const historyRef = useRef<TimePoint[]>([]);
  useEffect(() => {
    const point: TimePoint = {
      hour,
      pH: state.pH,
      vfa: state.vfaTotal,
      ammonia: state.ammonia,
      lacticAcid: state.lacticAcid,
      methane: state.methane,
    };
    const existing = historyRef.current.find((p) => p.hour === hour);
    if (existing && existing.pH === point.pH) return;
    const updated = [...historyRef.current.filter((p) => p.hour !== hour), point].sort((a, b) => a.hour - b.hour).slice(-25);
    historyRef.current = updated;
    // Use microtask to defer state update
    Promise.resolve().then(() => setHistory(updated));
  }, [hour, state.pH, state.vfaTotal, state.ammonia, state.lacticAcid, state.methane]);

  // Animation loop — advance time
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setHour((h) => (h + speed * 0.5) % 24);
      }, 300);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, speed]);

  const addFeed = useCallback((feed: SimFeed) => {
    setSelectedFeedIds((prev) => [...prev, feed.id]);
    setFeedingEvents((prev) => [...prev, { hour: Math.floor(hour), feedName: feed.name, amount: feed.msKg }]);
  }, [hour]);

  const removeFeed = useCallback((idx: number) => {
    setSelectedFeedIds((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const loadScenario = useCallback((scenario: Scenario) => {
    setSelectedFeedIds(scenario.feeds);
    setFeedingEvents(scenario.feeds.map((id, i) => {
      const feed = FEED_LIBRARY.find((f) => f.id === id)!;
      return { hour: 8, feedName: feed.name, amount: feed.msKg };
    }));
    setHistory([]);
    setHour(8);
  }, []);

  const reset = useCallback(() => {
    setSelectedFeedIds([]);
    setFeedingEvents([]);
    setHistory([]);
    setHour(8);
  }, []);

  // pH status
  const pHStatus = state.pH >= 6.4 ? { label: "Optimal", color: "text-emerald-600", bg: "bg-emerald-100" }
    : state.pH >= 6.0 ? { label: "Attention", color: "text-amber-600", bg: "bg-amber-100" }
    : state.pH >= 5.5 ? { label: "Acidose subaiguë", color: "text-orange-600", bg: "bg-orange-100" }
    : { label: "Acidose aiguë", color: "text-red-600", bg: "bg-red-100" };

  const timeLabel = `${Math.floor(hour).toString().padStart(2, "0")}h${Math.floor((hour % 1) * 60).toString().padStart(2, "0")}`;
  const timeOfDay = hour >= 6 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "afternoon" : hour >= 18 && hour < 21 ? "evening" : "night";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Atom className="h-5 w-5 text-cyan-700" />
          Rumen Lab — Laboratoire de fermentation
        </h2>
        <p className="text-sm text-stone-500">
          Simulation avancée: pH, 6 populations microbiennes, AGV, gaz, ammonia, tamponnement, encyclopédie microbienne.
        </p>
      </div>

      {/* Lab tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <button onClick={() => setLabTab("lab")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${labTab === "lab" ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"}`}>
          <Atom className="h-3.5 w-3.5" /> Laboratoire
        </button>
        <button onClick={() => setLabTab("microbes")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${labTab === "microbes" ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"}`}>
          <Bug className="h-3.5 w-3.5" /> Encyclopédie microbienne
        </button>
        <button onClick={() => setLabTab("buffer")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${labTab === "buffer" ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"}`}>
          <Beaker className="h-3.5 w-3.5" /> Tampon pH
        </button>
        <button onClick={() => setLabTab("compare")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${labTab === "compare" ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"}`}>
          <GitCompare className="h-3.5 w-3.5" /> Comparaison
        </button>
      </div>

      {/* Microbe Encyclopedia Tab */}
      {labTab === "microbes" && <MicrobeEncyclopediaTab currentRumenState={state} />}

      {/* Buffer Tab */}
      {labTab === "buffer" && <BufferTab currentPH={state.pH} />}

      {/* Compare Tab */}
      {labTab === "compare" && <CompareTab currentFeeds={selectedFeeds} currentHour={hour} currentFeedingEvents={feedingEvents} />}

      {/* Lab Tab (original simulator) */}
      {labTab === "lab" && (
        <>
      {/* Scenario presets */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold text-stone-700">Scénarios préprogrammés</CardTitle>
            <Button
              size="sm"
              variant={showQuiz ? "default" : "outline"}
              onClick={() => setShowQuiz(!showQuiz)}
              className="h-7 text-xs"
            >
              <Award className="h-3 w-3 mr-1" />
              {showQuiz ? "Masquer le quiz" : "Mode quiz"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => loadScenario(s)}
              className="text-left text-xs p-2 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 transition-colors flex items-start gap-2 max-w-xs"
              title={s.description}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: s.color }} />
              <div>
                <div className="font-medium text-stone-900">{s.name}</div>
                <div className="text-[10px] text-stone-500">{s.description}</div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Feed selector */}
        <Card className="border-stone-200 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Bibliothèque d'aliments ({FEED_LIBRARY.length})</CardTitle>
            <CardDescription className="text-xs">Cliquez pour ajouter au rumen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {(["forage", "concentre", "liquid"] as FeedKind[]).map((kind) => (
              <div key={kind}>
                <div className="text-[10px] font-semibold text-stone-500 uppercase mb-1">
                  {kind === "forage" ? "Fourrages" : kind === "concentre" ? "Concentrés" : "Liquides"}
                </div>
                <div className="space-y-1">
                  {FEED_LIBRARY.filter((f) => f.kind === kind).map((feed) => (
                    <button
                      key={feed.id}
                      onClick={() => addFeed(feed)}
                      className="w-full text-left text-xs p-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: feed.color }} />
                          {feed.name}
                        </span>
                        <Badge variant="outline" className="text-[9px]">
                          {feed.kind === "forage" ? "F" : feed.kind === "concentre" ? "C" : "L"}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        UFL {feed.ufl} · CB {feed.cb}% · Amidon {feed.starch}% · kd {feed.degradationRate}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
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
                <CardDescription className="text-xs flex items-center gap-1">
                  Heure: <span className="font-mono font-medium">{timeLabel}</span>
                  {timeOfDay === "morning" && <Sunrise className="h-3 w-3 text-amber-500" />}
                  {timeOfDay === "afternoon" && <Sun className="h-3 w-3 text-amber-500" />}
                  {timeOfDay === "evening" && <Sunset className="h-3 w-3 text-orange-500" />}
                  {timeOfDay === "night" && <Moon className="h-3 w-3 text-indigo-500" />}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)} className="h-7 text-xs">
                  {speed}x
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setPlaying(!playing)} className="h-8 w-8">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={reset} className="h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Time slider */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min="0"
                max="23.5"
                step="0.5"
                value={hour}
                onChange={(e) => { setHour(Number(e.target.value)); setPlaying(false); }}
                className="flex-1 h-1 accent-cyan-600"
              />
            </div>
          </CardHeader>
          <CardContent>
            <RumenVisualization state={state} feeds={selectedFeeds} pHStatus={pHStatus} hour={hour} />

            {/* Selected feeds */}
            {selectedFeeds.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-200">
                <div className="text-xs font-medium text-stone-600 mb-1.5">Dans le rumen ({selectedFeeds.length}):</div>
                <div className="flex flex-wrap gap-1">
                  {selectedFeeds.map((feed, i) => (
                    <button
                      key={i}
                      onClick={() => removeFeed(i)}
                      className="text-[10px] px-2 py-1 rounded-md flex items-center gap-1 bg-stone-100 text-stone-700 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                      title="Cliquer pour retirer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: feed.color }} />
                      {feed.name}
                      <span className="text-stone-400">({feed.msKg}kg) ×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 24h Time-series chart */}
      {history.length > 1 && (
        <FermentationChart history={history} feedingEvents={feedingEvents} currentHour={hour} />
      )}

      {/* Detailed metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="pH ruminal" value={state.pH.toFixed(2)} status={pHStatus} icon={<Droplet className="h-3 w-3" />} bar={state.pH >= 6.4 ? "bg-emerald-500" : state.pH >= 6.0 ? "bg-amber-500" : "bg-red-500"} barPct={((state.pH - 5.0) / 2.5) * 100} />
        <MetricCard label="AGV totaux" value={state.vfaTotal.toFixed(0)} unit="mmol/L" status={{ label: "Normal", color: "text-amber-600", bg: "bg-amber-100" }} icon={<Zap className="h-3 w-3" />} bar="bg-amber-500" barPct={Math.min(100, state.vfaTotal)} />
        <MetricCard label="Acide lactique" value={state.lacticAcid.toFixed(1)} unit="mmol/L" status={{ label: state.lacticAcid > 5 ? "Dangereux" : state.lacticAcid > 1 ? "Attention" : "OK", color: state.lacticAcid > 5 ? "text-red-600" : state.lacticAcid > 1 ? "text-amber-600" : "text-emerald-600", bg: state.lacticAcid > 5 ? "bg-red-100" : state.lacticAcid > 1 ? "bg-amber-100" : "bg-emerald-100" }} icon={<AlertCircle className="h-3 w-3" />} bar="bg-red-500" barPct={Math.min(100, state.lacticAcid * 10)} />
        <MetricCard label="Ammoniac" value={state.ammonia.toFixed(1)} unit="mg/dL" status={{ label: state.ammonia > 25 ? "Élevé" : state.ammonia < 5 ? "Bas" : "OK", color: state.ammonia > 25 ? "text-orange-600" : state.ammonia < 5 ? "text-rose-600" : "text-emerald-600", bg: state.ammonia > 25 ? "bg-orange-100" : state.ammonia < 5 ? "bg-rose-100" : "bg-emerald-100" }} icon={<Droplet className="h-3 w-3" />} bar="bg-blue-500" barPct={Math.min(100, state.ammonia * 3)} />
        <MetricCard label="Méthane" value={state.methane.toFixed(1)} unit="L/j" status={{ label: "Production", color: "text-stone-600", bg: "bg-stone-100" }} icon={<Wind className="h-3 w-3" />} bar="bg-stone-500" barPct={Math.min(100, state.methane * 3)} />
        <MetricCard label="Température" value={state.temperature.toFixed(1)} unit="°C" status={{ label: "Normal", color: "text-rose-600", bg: "bg-rose-100" }} icon={<Thermometer className="h-3 w-3" />} bar="bg-rose-400" barPct={((state.temperature - 38) / 2) * 100} />
      </div>

      {/* Microbial populations */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
            <Bug className="h-3.5 w-3.5" />
            Populations microbiennes (6 types)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MicrobeBar label="Bactéries cellulolytiques" value={state.cellulolytic} color="bg-emerald-500" desc="Dégradent les fibres (cellulose)" />
            <MicrobeBar label="Bactéries amylolytiques" value={state.amylolytic} color="bg-amber-500" desc="Dégradent l'amidon (céréales)" />
            <MicrobeBar label="Bactéries protéolytiques" value={state.proteolytic} color="bg-rose-500" desc="Dégradent les protéines" />
            <MicrobeBar label="Protozoaires" value={state.protozoa} color="bg-cyan-500" desc="Prédateurs de bactéries, sensibles au pH bas" />
            <MicrobeBar label="Champignons" value={state.fungi} color="bg-purple-500" desc="Dégradent les fibres lignifiées" />
            <MicrobeBar label="Méthanogènes" value={state.methanogens} color="bg-stone-500" desc="Produisent le méthane (archaea)" />
          </div>
        </CardContent>
      </Card>

      {/* VFA composition + Gas production */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-stone-700">Composition des AGV</CardTitle>
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
            <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-stone-600">
              <div>🟢 Lait & graisse</div>
              <div>🟡 Énergie & croissance</div>
              <div>🔴 Paroi ruminale</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-1">
              <Wind className="h-3.5 w-3.5" />
              Production de gaz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-stone-100 p-2.5 text-center">
                <Wind className="h-4 w-4 text-stone-500 mx-auto mb-1" />
                <div className="text-[10px] text-stone-500 uppercase">Méthane (CH₄)</div>
                <div className="text-lg font-bold text-stone-900">{state.methane.toFixed(1)}</div>
                <div className="text-[9px] text-stone-400">L/jour</div>
              </div>
              <div className="rounded-lg bg-stone-100 p-2.5 text-center">
                <Wind className="h-4 w-4 text-stone-500 mx-auto mb-1" />
                <div className="text-[10px] text-stone-500 uppercase">CO₂</div>
                <div className="text-lg font-bold text-stone-900">{state.co2.toFixed(1)}</div>
                <div className="text-[9px] text-stone-400">L/jour</div>
              </div>
            </div>
            <p className="text-[10px] text-stone-500 mt-2">
              Les gaz sont produits par la fermentation. Le méthane représente une perte d&apos;énergie (2-12% de l&apos;énergie ingérée) et un GES.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Physical parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SimpleMetric label="Remplissage" value={`${state.fillLevel.toFixed(0)}%`} icon={<Gauge className="h-3 w-3" />} />
        <SimpleMetric label="Vitesse de passage" value={`${state.passageRate.toFixed(3)}/h`} icon={<Activity className="h-3 w-3" />} />
        <SimpleMetric label="Flux salivaire" value={`${state.salivaFlow.toFixed(1)} L/j`} icon={<Droplet className="h-3 w-3" />} />
        <SimpleMetric label="Température" value={`${state.temperature.toFixed(1)}°C`} icon={<Thermometer className="h-3 w-3" />} />
      </div>

      {/* Health outcome prediction */}
      <HealthPrediction state={state} feeds={selectedFeeds} />

      {/* Quiz mode */}
      {showQuiz && <QuizMode state={state} feeds={selectedFeeds} />}

      {/* Educational info */}
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 space-y-1">
              <p><strong className="text-cyan-900">pH ruminal:</strong> Optimal entre 6.2 et 7.0. Sous 6.0, les bactéries cellulolytiques s&apos;inhibent. Sous 5.5, acidose aiguë.</p>
              <p><strong className="text-cyan-900">Acide lactique:</strong> Produit par les bactéries lactiques quand l&apos;amidon est en excès. Non métabolisé à pH bas, il aggrave l&apos;acidose.</p>
              <p><strong className="text-cyan-900">Ammoniac:</strong> Issu de la dégradation des protéines. Trop bas = croissance microbienne limitée. Trop haut = gaspillage et toxicité.</p>
              <p><strong className="text-cyan-900">Méthane:</strong> Produit par les archées méthanogènes. Représente une perte d&apos;énergie et un gaz à effet de serre.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

// ==================== MICROBE ENCYCLOPEDIA TAB ====================
function MicrobeEncyclopediaTab({ currentRumenState }: { currentRumenState: RumenState }) {
  const [selected, setSelected] = useState<string>("cellulolytic");

  const microbe = MICROBE_ENCYCLOPEDIA.find((m) => m.id === selected);
  // Map current rumen state to microbe population values
  const populationMap: Record<string, number> = {
    cellulolytic: currentRumenState.cellulolytic,
    amylolytic: currentRumenState.amylolytic,
    proteolytic: currentRumenState.proteolytic,
    protozoa: currentRumenState.protozoa,
    fungi: currentRumenState.fungi,
    methanogens: currentRumenState.methanogens,
  };

  return (
    <div className="space-y-4">
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Bug className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">Encyclopédie microbienne</strong> — Cliquez sur un microbe pour voir son rôle, ses substrats, ses conditions optimales et son état actuel dans votre rumen.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Microbe selector grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {MICROBE_ENCYCLOPEDIA.map((m) => {
          const pop = populationMap[m.id] || 0;
          return (
            <button key={m.id} onClick={() => setSelected(m.id)}
              className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                selected === m.id ? "border-cyan-500 bg-cyan-50 shadow-sm" : "border-stone-200 bg-white hover:border-stone-300"
              }`}>
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="text-[10px] font-medium text-stone-900">{m.name}</div>
              <div className="mt-1.5 h-1 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pop}%`, backgroundColor: m.color }} />
              </div>
              <div className="text-[9px] text-stone-500 mt-0.5">{pop.toFixed(0)}/100</div>
            </button>
          );
        })}
      </div>

      {/* Detail card */}
      {microbe && (
        <Card className="border-2" style={{ borderColor: microbe.color }}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="text-2xl">{microbe.icon}</span>
                  {microbe.name}
                </CardTitle>
                <CardDescription className="text-xs italic mt-1">{microbe.scientificName}</CardDescription>
              </div>
              <Badge className="text-[10px]" style={{ backgroundColor: microbe.color + "30", color: microbe.color }}>
                {microbe.type === "bacteria" ? "Bactérie" : microbe.type === "protozoa" ? "Protozoaire" : microbe.type === "fungi" ? "Champignon" : "Archée"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current population */}
            <div className="rounded-lg bg-stone-50 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-stone-700">Population actuelle dans votre rumen</span>
                <span className="text-lg font-bold" style={{ color: microbe.color }}>{populationMap[microbe.id]?.toFixed(0)}/100</span>
              </div>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${populationMap[microbe.id] || 0}%`, backgroundColor: microbe.color }} />
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-[10px] font-medium text-stone-500 uppercase">Description</span>
              <p className="text-xs text-stone-700 mt-0.5 leading-relaxed">{microbe.descriptionFr}</p>
            </div>

            {/* Role */}
            <div>
              <span className="text-[10px] font-medium text-stone-500 uppercase">Rôle dans le rumen</span>
              <p className="text-xs text-stone-700 mt-0.5">{microbe.roleFr}</p>
            </div>

            {/* Substrates & Products */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-2 border border-emerald-200">
                <span className="text-[10px] font-medium text-emerald-700 uppercase">Substrats (digère)</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {microbe.substrates.map((s, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] bg-white">{s}</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
                <span className="text-[10px] font-medium text-amber-700 uppercase">Produits (génère)</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {microbe.products.map((p, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] bg-white">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Optimal conditions */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded bg-stone-50 p-2 text-center">
                <div className="text-[9px] text-stone-500 uppercase">pH optimal</div>
                <div className="text-sm font-bold text-stone-900">{microbe.optimalPH.min}-{microbe.optimalPH.max}</div>
                <div className="text-[8px] text-stone-400">idéal: {microbe.optimalPH.optimal}</div>
              </div>
              <div className="rounded bg-stone-50 p-2 text-center">
                <div className="text-[9px] text-stone-500 uppercase">Température</div>
                <div className="text-sm font-bold text-stone-900">{microbe.optimalTemp.min}-{microbe.optimalTemp.max}°C</div>
              </div>
              <div className="rounded bg-stone-50 p-2 text-center">
                <div className="text-[9px] text-stone-500 uppercase">Temps de doublement</div>
                <div className="text-sm font-bold text-stone-900">{microbe.doublingTime}</div>
              </div>
            </div>

            {/* pH drop effect */}
            <div className="rounded-lg bg-rose-50 p-2 border border-rose-200">
              <span className="text-[10px] font-medium text-rose-700 uppercase">Effet d'une baisse de pH</span>
              <p className="text-xs text-rose-800 mt-0.5">{microbe.phDropEffect}</p>
            </div>

            {/* Key species */}
            <div>
              <span className="text-[10px] font-medium text-stone-500 uppercase">Espèces clés</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {microbe.keySpecies.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] italic bg-stone-50">{s}</Badge>
                ))}
              </div>
            </div>

            {/* Biomass fraction */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">Fraction de la biomasse microbienne:</span>
              <span className="font-medium text-stone-900">{microbe.biomassFraction}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== BUFFER TAB ====================
function BufferTab({ currentPH }: { currentPH: number }) {
  const [animalWeight, setAnimalWeight] = useState(70);
  const [bicarbonateGrams, setBicarbonateGrams] = useState(15);

  const result = useMemo(() => simulateBuffer(currentPH, animalWeight, bicarbonateGrams), [currentPH, animalWeight, bicarbonateGrams]);

  return (
    <div className="space-y-4">
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Beaker className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">Simulateur de tampon pH</strong> — Ajoutez du bicarbonate de sodium (NaHCO₃) et voyez l&apos;effet sur le pH ruminal.
              Le pH actuel est celui du rumen dans l&apos;onglet Laboratoire.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Paramètres du tampon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">pH ruminal actuel</Label>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-10 rounded-lg flex items-center justify-center text-2xl font-bold ${
                  currentPH >= 6.4 ? "bg-emerald-100 text-emerald-700" : currentPH >= 6.0 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                }`}>
                  {currentPH.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Poids de l&apos;animal (kg)</Label>
              <Input type="number" min="20" max="150" value={animalWeight} onChange={(e) => setAnimalWeight(Number(e.target.value) || 70)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bicarbonate de sodium (g/jour)</Label>
              <Input type="number" min="0" max="100" step="5" value={bicarbonateGrams} onChange={(e) => setBicarbonateGrams(Number(e.target.value) || 0)} className="h-9" />
              <input type="range" min="0" max="100" step="5" value={bicarbonateGrams} onChange={(e) => setBicarbonateGrams(Number(e.target.value))} className="w-full h-1.5 accent-cyan-600 mt-1" />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="border-cyan-300 bg-gradient-to-br from-cyan-50/40 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Beaker className="h-4 w-4 text-cyan-700" /> Effet du tampon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* pH before/after */}
            <div className="flex items-center justify-between rounded-lg bg-white p-3 border border-stone-200">
              <div className="text-center">
                <div className="text-[10px] text-stone-500 uppercase">pH avant</div>
                <div className={`text-2xl font-bold ${result.phBefore >= 6.4 ? "text-emerald-700" : result.phBefore >= 6.0 ? "text-amber-700" : "text-rose-700"}`}>
                  {result.phBefore.toFixed(2)}
                </div>
              </div>
              <ArrowRight className="h-6 w-6 text-stone-400" />
              <div className="text-center">
                <div className="text-[10px] text-stone-500 uppercase">pH après</div>
                <div className={`text-2xl font-bold ${result.phAfter >= 6.4 ? "text-emerald-700" : result.phAfter >= 6.0 ? "text-amber-700" : "text-rose-700"}`}>
                  {result.phAfter.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-stone-500 uppercase">Δ pH</div>
                <div className="text-2xl font-bold text-cyan-700">+{result.phChange.toFixed(2)}</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-white p-2 text-center border border-stone-200">
                <div className="text-[9px] text-stone-500 uppercase">Capacité tampon</div>
                <div className="text-sm font-bold text-stone-900">{result.bufferingCapacity.toFixed(0)} mEq/L</div>
              </div>
              <div className="rounded bg-white p-2 text-center border border-stone-200">
                <div className="text-[9px] text-stone-500 uppercase">Salive (L/j)</div>
                <div className="text-sm font-bold text-stone-900">{result.salivaContribution.toFixed(1)}</div>
              </div>
              <div className="rounded bg-white p-2 text-center border border-stone-200">
                <div className="text-[9px] text-stone-500 uppercase">Coût / jour</div>
                <div className="text-sm font-bold text-amber-700">{result.costPerDay.toFixed(3)} €</div>
              </div>
              <div className="rounded bg-white p-2 text-center border border-stone-200">
                <div className="text-[9px] text-stone-500 uppercase">Dose / 50kg</div>
                <div className="text-sm font-bold text-stone-900">{(bicarbonateGrams / (animalWeight / 50)).toFixed(1)} g</div>
              </div>
            </div>

            {/* Recommendation */}
            <div className={`rounded-lg p-3 border ${
              result.phAfter >= 6.4 ? "bg-emerald-50 border-emerald-200" : result.phAfter >= 6.0 ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"
            }`}>
              <p className="text-xs text-stone-700">{result.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* pH gauge visualization */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Échelle de pH ruminal</CardTitle></CardHeader>
        <CardContent>
          <div className="relative h-12 rounded-lg overflow-hidden flex">
            {/* pH scale: 5.0 to 7.2 */}
            <div className="bg-red-500 flex items-center justify-center text-[10px] text-white" style={{ width: `${((5.5 - 5.0) / (7.2 - 5.0)) * 100}%` }}>5.0-5.5</div>
            <div className="bg-orange-500 flex items-center justify-center text-[10px] text-white" style={{ width: `${((6.0 - 5.5) / (7.2 - 5.0)) * 100}%` }}>5.5-6.0</div>
            <div className="bg-amber-400 flex items-center justify-center text-[10px] text-white" style={{ width: `${((6.4 - 6.0) / (7.2 - 5.0)) * 100}%` }}>6.0-6.4</div>
            <div className="bg-emerald-500 flex items-center justify-center text-[10px] text-white" style={{ width: `${((7.2 - 6.4) / (7.2 - 5.0)) * 100}%` }}>6.4-7.2</div>
            {/* Before marker */}
            <div className="absolute top-0 h-3 w-0.5 bg-stone-800" style={{ left: `${((result.phBefore - 5.0) / (7.2 - 5.0)) * 100}%` }} />
            <div className="absolute top-3 text-[8px] font-medium text-stone-800" style={{ left: `${((result.phBefore - 5.0) / (7.2 - 5.0)) * 100}%`, transform: "translateX(-50%)" }}>Avant</div>
            {/* After marker */}
            <div className="absolute bottom-0 h-3 w-0.5 bg-cyan-600" style={{ left: `${((result.phAfter - 5.0) / (7.2 - 5.0)) * 100}%` }} />
            <div className="absolute bottom-3 text-[8px] font-medium text-cyan-700" style={{ left: `${((result.phAfter - 5.0) / (7.2 - 5.0)) * 100}%`, transform: "translateX(-50%)" }}>Après</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700 space-y-1">
              <p><strong>Comment ça marche:</strong> Le NaHCO₃ (bicarbonate de sodium) augmente le pH ruminal en neutralisant les acides produits par la fermentation. La salive est le tampon naturel (riche en bicarbonate).</p>
              <p><strong>Dose recommandée:</strong> 10-20g par brebis et par jour en prévention, 30-50g en cas d&apos;acidose subaiguë. Au-delà de 50g, l&apos;effet plafonne et le coût n&apos;est plus justifié.</p>
              <p><strong>Alternative:</strong> Augmenter la part de fourrage dans la ration stimule la mastication et donc la production de salive (tampon naturel gratuit).</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== COMPARE TAB ====================
function CompareTab({ currentFeeds, currentHour, currentFeedingEvents }: {
  currentFeeds: SimFeed[];
  currentHour: number;
  currentFeedingEvents: FeedingEvent[];
}) {
  const [scenarioFeeds, setScenarioFeeds] = useState<string[]>(["ble", "mais-grain", "ble"]);
  const scenarioFeedObjs = scenarioFeeds.map((id) => FEED_LIBRARY.find((f) => f.id === id)!).filter(Boolean);

  const stateA = useMemo(() => simulateRumen(currentFeeds, currentHour, currentFeedingEvents), [currentFeeds, currentHour, currentFeedingEvents]);
  const stateB = useMemo(() => simulateRumen(scenarioFeedObjs, currentHour, currentFeedingEvents), [scenarioFeedObjs, currentHour, currentFeedingEvents]);

  const addScenarioFeed = (feed: SimFeed) => setScenarioFeeds([...scenarioFeeds, feed.id]);
  const removeScenarioFeed = (idx: number) => setScenarioFeeds(scenarioFeeds.filter((_, i) => i !== idx));

  const metrics: Array<{ label: string; a: number; b: number; unit: string; better: "high" | "low" | null }> = [
    { label: "pH", a: stateA.pH, b: stateB.pH, unit: "", better: "high" },
    { label: "AGV totaux", a: stateA.vfaTotal, b: stateB.vfaTotal, unit: "mmol/L", better: null },
    { label: "Acide lactique", a: stateA.lacticAcid, b: stateB.lacticAcid, unit: "mmol/L", better: "low" },
    { label: "Ammoniac", a: stateA.ammonia, b: stateB.ammonia, unit: "mg/dL", better: null },
    { label: "Méthane", a: stateA.methane, b: stateB.methane, unit: "L/j", better: "low" },
    { label: "CO₂", a: stateA.co2, b: stateB.co2, unit: "L/j", better: "low" },
    { label: "Cellulolytiques", a: stateA.cellulolytic, b: stateB.cellulolytic, unit: "/100", better: "high" },
    { label: "Amylolytiques", a: stateA.amylolytic, b: stateB.amylolytic, unit: "/100", better: null },
    { label: "Protozoaires", a: stateA.protozoa, b: stateB.protozoa, unit: "/100", better: "high" },
    { label: "Champignons", a: stateA.fungi, b: stateB.fungi, unit: "/100", better: "high" },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <GitCompare className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">Comparaison côte à côte</strong> — Comparez deux scénarios d&apos;alimentation
              et voyez l&apos;impact sur le pH, les microbes et les gaz.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scenario A (current) */}
        <Card className="border-indigo-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-indigo-800">Scénario A (Laboratoire)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {currentFeeds.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="flex-1 text-stone-700">{f.name}</span>
                  <span className="text-stone-400">{f.msKg}kg</span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100 grid grid-cols-2 gap-1 text-xs">
              <div>pH: <span className={`font-bold ${stateA.pH >= 6.4 ? "text-emerald-700" : stateA.pH >= 6.0 ? "text-amber-700" : "text-rose-700"}`}>{stateA.pH.toFixed(2)}</span></div>
              <div>CH₄: <span className="font-bold">{stateA.methane.toFixed(1)} L</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Scenario B (custom) */}
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-purple-800">Scénario B (comparaison)</CardTitle>
              <CompareFeedPicker onPick={(f) => addScenarioFeed(f)} />
            </div>
          </CardHeader>
          <CardContent>
            {scenarioFeedObjs.length === 0 ? (
              <div className="text-xs text-stone-400 text-center py-2">Ajoutez des aliments</div>
            ) : (
              <div className="space-y-1">
                {scenarioFeedObjs.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                    <span className="flex-1 text-stone-700">{f.name}</span>
                    <span className="text-stone-400">{f.msKg}kg</span>
                    <button onClick={() => removeScenarioFeed(i)} className="text-stone-400 hover:text-rose-600 text-[10px]">✗</button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-stone-100 grid grid-cols-2 gap-1 text-xs">
              <div>pH: <span className={`font-bold ${stateB.pH >= 6.4 ? "text-emerald-700" : stateB.pH >= 6.0 ? "text-amber-700" : "text-rose-700"}`}>{stateB.pH.toFixed(2)}</span></div>
              <div>CH₄: <span className="font-bold">{stateB.methane.toFixed(1)} L</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold">Comparaison des paramètres</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Paramètre</th>
                  <th className="text-right px-3 py-2 font-medium">Scénario A</th>
                  <th className="text-right px-3 py-2 font-medium">Scénario B</th>
                  <th className="text-right px-3 py-2 font-medium">Δ</th>
                  <th className="text-center px-3 py-2 font-medium">Meilleur</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const diff = m.b - m.a;
                  let better: "A" | "B" | "—" = "—";
                  if (m.better === "high") better = m.a > m.b ? "A" : m.b > m.a ? "B" : "—";
                  else if (m.better === "low") better = m.a < m.b ? "A" : m.b < m.a ? "B" : "—";
                  return (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-700">{m.label}</td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${better === "A" ? "text-emerald-700 font-bold" : ""}`}>{m.a.toFixed(m.unit === "" ? 2 : 1)} <span className="text-[9px] text-stone-400">{m.unit}</span></td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${better === "B" ? "text-emerald-700 font-bold" : ""}`}>{m.b.toFixed(m.unit === "" ? 2 : 1)} <span className="text-[9px] text-stone-400">{m.unit}</span></td>
                      <td className={`px-3 py-1.5 text-right tabular-nums ${diff > 0 ? "text-amber-700" : diff < 0 ? "text-emerald-700" : "text-stone-400"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(m.unit === "" ? 2 : 1)}</td>
                      <td className="px-3 py-1.5 text-center">
                        {better !== "—" && <span className="text-[10px] text-emerald-700 font-medium">{better}</span>}
                        {better === "—" && <span className="text-[10px] text-stone-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompareFeedPicker({ onPick }: { onPick: (f: SimFeed) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = FEED_LIBRARY.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setOpen(!open)}>
        <Plus className="h-3 w-3 mr-0.5" /> Ajouter
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 w-60 rounded-md border border-stone-200 bg-white shadow-lg right-0">
          <div className="p-1.5 border-b border-stone-100">
            <Input autoFocus placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.slice(0, 20).map((f, i) => (
              <button key={i} className="w-full text-left px-2 py-1 text-[10px] hover:bg-stone-50 border-b border-stone-100"
                onClick={() => { onPick(f); setOpen(false); setSearch(""); }}>
                <span className="font-medium">{f.name}</span>
                <span className="text-stone-400 ml-1">UFL {f.ufl} · CB {f.cb}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RumenVisualization({ state, feeds, pHStatus, hour }: { state: RumenState; feeds: SimFeed[]; pHStatus: any; hour: number }) {
  const width = 400;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2 + 20;
  const rx = 140;
  const ry = 100;
  const pHColor = state.pH >= 6.4 ? "#10b981" : state.pH >= 6.0 ? "#f59e0b" : state.pH >= 5.5 ? "#f97316" : "#ef4444";

  // Microbial dots — different types at different positions
  const microbeTypes = [
    { type: "cellulolytic", count: 8, color: "#10b981", size: 3, val: state.cellulolytic },
    { type: "amylolytic", count: 6, color: "#f59e0b", size: 3, val: state.amylolytic },
    { type: "proteolytic", count: 4, color: "#ef4444", size: 2.5, val: state.proteolytic },
    { type: "protozoa", count: 5, color: "#06b6d4", size: 5, val: state.protozoa },
    { type: "fungi", count: 3, color: "#a855f7", size: 4, val: state.fungi },
    { type: "methanogens", count: 4, color: "#78716c", size: 2.5, val: state.methanogens },
  ];

  // Gas bubbles
  const gasBubbles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2 + hour * 0.05;
    const r = 0.3 + (i % 3) * 0.2;
    const bubbleY = cy + ry * r * Math.sin(angle) - ((hour * 3 + i * 10) % 60);
    return {
      cx: cx + rx * r * 0.7 * Math.cos(angle),
      cy: Math.max(cy - ry, bubbleY),
      r: 2 + (i % 3),
      opacity: 0.3 + Math.sin(hour + i) * 0.2,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
        {/* Sheep body */}
        <path d={`M 50 ${cy - 40} Q 30 ${cy - 10} 50 ${cy + 30} L 80 ${cy + 50} L ${cx - rx - 10} ${cy + 50}`} fill="#e7e5e4" stroke="#a8a29e" strokeWidth="2" />
        <ellipse cx="45" cy={cy - 30} rx="18" ry="15" fill="#d6d3d1" stroke="#a8a29e" strokeWidth="2" />
        <ellipse cx="35" cy={cy - 40} rx="6" ry="4" fill="#a8a29e" transform={`rotate(-30 35 ${cy - 40})`} />

        {/* Rumen */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={pHColor} fillOpacity={0.15 + (state.fillLevel / 100) * 0.25} stroke={pHColor} strokeWidth="3" />

        <clipPath id="rumenClip2">
          <ellipse cx={cx} cy={cy} rx={rx - 3} ry={ry - 3} />
        </clipPath>
        <g clipPath="url(#rumenClip2)">
          {/* Fill level */}
          <rect x={cx - rx} y={cy + ry - (state.fillLevel / 100) * ry * 2} width={rx * 2} height={(state.fillLevel / 100) * ry * 2} fill={pHColor} fillOpacity={0.2} />

          {/* Feed particles */}
          {feeds.map((feed, i) => {
            const angle = (i / feeds.length) * Math.PI * 2 + hour * 0.03;
            const r = 0.3 + (i % 3) * 0.15;
            return (
              <g key={i}>
                <circle cx={cx + Math.cos(angle) * rx * r * 0.7} cy={cy + ry - 10 + Math.sin(angle) * ry * r * 0.3} r={3 + feed.msKg * 2} fill={feed.color} fillOpacity={0.7} />
                {/* Particle breakdown — smaller fragments */}
                {feed.degradationRate > 0.1 && Array.from({ length: 3 }).map((_, j) => (
                  <circle key={j} cx={cx + Math.cos(angle + j) * rx * r * 0.5} cy={cy + ry - 15 + j * 5} r={1} fill={feed.color} fillOpacity={0.4} />
                ))}
              </g>
            );
          })}

          {/* Microbial populations */}
          {microbeTypes.map((mt, mi) =>
            Array.from({ length: mt.count }).map((_, i) => {
              const angle = (i / mt.count) * Math.PI * 2 + mi + hour * 0.02;
              const r = 0.2 + (i % 3) * 0.15;
              const x = cx + Math.cos(angle) * rx * r * 0.8;
              const y = cy + ry * r * 0.6 * Math.sin(angle);
              return (
                <circle
                  key={`${mi}-${i}`}
                  cx={x}
                  cy={y}
                  r={mt.size}
                  fill={mt.color}
                  fillOpacity={0.2 + (mt.val / 100) * 0.7}
                />
              );
            })
          )}

          {/* Gas bubbles rising */}
          {gasBubbles.map((b, i) => (
            <circle key={`gas-${i}`} cx={b.cx} cy={b.cy} r={b.r} fill="white" fillOpacity={b.opacity * 0.5} stroke="#cbd5e1" strokeWidth="0.5" />
          ))}
        </g>

        {/* Labels */}
        <text x={cx} y={cy - ry - 8} textAnchor="middle" className="text-[10px] fill-stone-600 font-medium">Rumen (panse)</text>
        <text x={cx} y={cy + 4} textAnchor="middle" className="text-2xl fill-stone-900 font-bold">{state.pH.toFixed(2)}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" className="text-[9px] fill-stone-500">pH</text>

        {/* Fill level */}
        <text x={cx + rx + 15} y={cy + 5} className="text-[9px] fill-stone-600 font-medium">{state.fillLevel.toFixed(0)}%</text>
        <text x={cx + rx + 15} y={cy + 16} className="text-[8px] fill-stone-400">remplissage</text>

        {/* Methane indicator */}
        {state.methane > 10 && (
          <g>
            <text x={cx} y={cy - ry - 25} textAnchor="middle" className="text-[9px] fill-stone-500">
              💨 {state.methane.toFixed(0)}L CH₄/j
            </text>
          </g>
        )}

        {/* Legs */}
        <line x1="100" y1={cy + 50} x2="100" y2={cy + 80} stroke="#a8a29e" strokeWidth="3" />
        <line x1={cx + rx - 20} y1={cy + 50} x2={cx + rx - 20} y2={cy + 80} stroke="#a8a29e" strokeWidth="3" />

        {/* Lactic acid warning */}
        {state.lacticAcid > 1 && (
          <g>
            <circle cx={cx + rx - 30} cy={cy - ry + 10} r="8" fill="#ef4444" fillOpacity="0.8" />
            <text x={cx + rx - 30} y={cy - ry + 13} textAnchor="middle" className="text-[9px] fill-white font-bold">!</text>
          </g>
        )}
      </svg>

      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${pHStatus.bg} ${pHStatus.color}`}>
        {pHStatus.label}
        {state.lacticAcid > 1 && ` · Acide lactique: ${state.lacticAcid.toFixed(1)}`}
      </div>
    </div>
  );
}

// ==================== FERMENTATION CHART (24h) ====================

function FermentationChart({ history, feedingEvents, currentHour }: { history: TimePoint[]; feedingEvents: FeedingEvent[]; currentHour: number }) {
  const width = 800;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xScale = (h: number) => padding.left + (h / 24) * chartW;
  const yScale = (v: number, min: number, max: number) => padding.top + chartH - ((v - min) / (max - min)) * chartH;

  // pH line (5.0 - 7.2)
  const pHPath = history.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.hour)} ${yScale(p.pH, 5.0, 7.2)}`).join(" ");
  // VFA line (0 - 200)
  const vfaPath = history.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.hour)} ${yScale(p.vfa, 0, 200)}`).join(" ");
  // Ammonia line (0 - 40)
  const nh3Path = history.map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.hour)} ${yScale(p.ammonia, 0, 40)}`).join(" ");

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Courbes de fermentation (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Grid */}
          {[5.0, 5.5, 6.0, 6.5, 7.0].map((ph) => (
            <g key={ph}>
              <line x1={padding.left} y1={yScale(ph, 5.0, 7.2)} x2={width - padding.right} y2={yScale(ph, 5.0, 7.2)} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="2,2" />
              <text x={padding.left - 5} y={yScale(ph, 5.0, 7.2) + 3} textAnchor="end" className="text-[8px] fill-stone-400">{ph.toFixed(1)}</text>
            </g>
          ))}

          {/* Danger zone (pH < 5.8) */}
          <rect x={padding.left} y={yScale(5.8, 5.0, 7.2)} width={chartW} height={yScale(5.0, 5.0, 7.2) - yScale(5.8, 5.0, 7.2)} fill="#ef4444" fillOpacity="0.05" />

          {/* X-axis labels */}
          {[0, 6, 12, 18, 24].map((h) => (
            <text key={h} x={xScale(h)} y={height - 10} textAnchor="middle" className="text-[8px] fill-stone-500">{h}h</text>
          ))}

          {/* Feeding events */}
          {feedingEvents.map((e, i) => (
            <g key={i}>
              <line x1={xScale(e.hour)} y1={padding.top} x2={xScale(e.hour)} y2={height - padding.bottom} stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <text x={xScale(e.hour)} y={padding.top - 5} textAnchor="middle" className="text-[7px] fill-amber-600">🍽️</text>
            </g>
          ))}

          {/* Current time marker */}
          <line x1={xScale(currentHour)} y1={padding.top} x2={xScale(currentHour)} y2={height - padding.bottom} stroke="#06b6d4" strokeWidth="2" />

          {/* Lines */}
          <path d={pHPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
          <path d={vfaPath} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.7" />
          <path d={nh3Path} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" />

          {/* Current value dots */}
          {history.length > 0 && (
            <>
              <circle cx={xScale(history[history.length - 1].hour)} cy={yScale(history[history.length - 1].pH, 5.0, 7.2)} r="4" fill="#10b981" stroke="white" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500" /> pH (5.0-7.2)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" /> AGV totaux (mmol/L)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500" /> Ammoniac (mg/dL)</span>
          <span className="flex items-center gap-1">🍽️ Repas</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-cyan-500" /> Heure actuelle</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MICROBE BAR ====================

function MicrobeBar({ label, value, color, desc }: { label: string; value: number; color: string; desc: string }) {
  return (
    <div className="rounded-lg border border-stone-200 p-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-stone-700">{label}</span>
        <span className="text-xs font-bold tabular-nums text-stone-900">{value.toFixed(0)}</span>
      </div>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${value}%` }} />
      </div>
      <p className="text-[9px] text-stone-500 mt-0.5">{desc}</p>
    </div>
  );
}

// ==================== METRIC CARD ====================

function MetricCard({ label, value, unit, status, icon, bar, barPct }: any) {
  return (
    <Card className="border-stone-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">{icon}{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-stone-900">{value}</span>
          {unit && <span className="text-[10px] text-stone-400">{unit}</span>}
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

function SimpleMetric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-stone-200">
      <CardContent className="p-3">
        <div className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">{icon}{label}</div>
        <div className="text-base font-bold text-stone-900 mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}

// ==================== HEALTH PREDICTION ====================

function HealthPrediction({ state, feeds }: { state: RumenState; feeds: SimFeed[] }) {
  const risks: Array<{ name: string; level: string; color: string; bg: string; detail: string }> = [];

  // Acidosis risk
  if (state.pH < 5.5) {
    risks.push({ name: "Acidose aiguë", level: "Critique", color: "text-red-700", bg: "bg-red-100", detail: `pH ${state.pH.toFixed(2)} — intervention urgente requise` });
  } else if (state.pH < 6.0) {
    risks.push({ name: "Acidose subaiguë (SARA)", level: "Élevé", color: "text-orange-700", bg: "bg-orange-100", detail: `pH ${state.pH.toFixed(2)} — réduire les concentrés` });
  } else if (state.lacticAcid > 1) {
    risks.push({ name: "Risque d'acidose", level: "Modéré", color: "text-amber-700", bg: "bg-amber-100", detail: `Acide lactique ${state.lacticAcid.toFixed(1)} — surveiller` });
  }

  // Ammonia toxicity
  if (state.ammonia > 30) {
    risks.push({ name: "Toxicité ammoniacale", level: "Élevé", color: "text-orange-700", bg: "bg-orange-100", detail: `NH₃ ${state.ammonia.toFixed(1)} mg/dL — trop de protéines` });
  }

  // Protein deficit
  if (state.ammonia < 5 && feeds.length > 0) {
    risks.push({ name: "Déficit azoté", level: "Modéré", color: "text-amber-700", bg: "bg-amber-100", detail: `NH₃ ${state.ammonia.toFixed(1)} — croissance microbienne limitée` });
  }

  // Bloat risk (high gas + high fill)
  if (state.methane > 20 && state.fillLevel > 80) {
    risks.push({ name: "Tympanisme (météorisation)", level: "Modéré", color: "text-amber-700", bg: "bg-amber-100", detail: "Gaz piégés — risque de ballonnement" });
  }

  if (risks.length === 0) {
    return (
      <Card className="border-emerald-300 bg-emerald-50/40">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-900">Rumen sain — aucun risque détecté</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-stone-700 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" />
          Prédiction des risques ruminaux
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {risks.map((r, i) => (
          <div key={i} className={`rounded-lg p-2 ${r.bg}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-900">{r.name}</span>
              <Badge className={`text-[9px] ${r.bg} ${r.color} border border-current`}>{r.level}</Badge>
            </div>
            <p className={`text-[10px] ${r.color} mt-0.5`}>{r.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ==================== QUIZ MODE ====================

function QuizMode({ state, feeds }: { state: RumenState; feeds: SimFeed[] }) {
  const questions = useMemo(() => [
    {
      q: "Quel est le pH optimal du rumen pour la digestion des fibres ?",
      options: ["5.0-5.5", "5.5-6.0", "6.2-7.0", "7.0-8.0"],
      correct: 2,
      explanation: "Un pH entre 6.2 et 7.0 permet aux bactéries cellulolytiques de dégrader les fibres efficacement.",
    },
    {
      q: "Que se passe-t-il si le pH descend sous 5.5 ?",
      options: ["Rien de particulier", "Acidose aiguë — arrêt de la rumination", "Augmentation des protozoaires", "Augmentation du pH salivaire"],
      correct: 1,
      explanation: "Sous 5.5, c'est l'acidose aiguë : les bactéries meurent, la rumination s'arrête, l'animal est en danger.",
    },
    {
      q: "Quel type de bactéries dégrade l'amidon des céréales ?",
      options: ["Cellulolytiques", "Amylolytiques", "Protéolytiques", "Méthanogènes"],
      correct: 1,
      explanation: "Les bactéries amylolytiques utilisent l'amidon. Elles prolifèrent quand on donne des céréales.",
    },
    {
      q: "D'où vient l'ammoniac dans le rumen ?",
      options: ["Dégradation des fibres", "Dégradation des protéines", "Dégradation de l'amidon", "Production de méthane"],
      correct: 1,
      explanation: "L'ammoniac (NH₃) est issu de la dégradation des protéines par les bactéries protéolytiques.",
    },
    {
      q: "Pourquoi le méthane est-il un problème ?",
      options: ["Il est toxique pour l'animal", "Il représente une perte d'énergie et un GES", "Il n'y a pas de problème", "Il augmente le pH"],
      correct: 1,
      explanation: "Le méthane représente 2-12% de perte d'énergie et est un gaz à effet de serre 28x plus puissant que le CO₂.",
    },
  ], []);

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const answer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === questions[currentQ].correct) setScore(score + 1);
  };

  const next = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const isFinished = currentQ === questions.length - 1 && answered;

  return (
    <Card className="border-purple-300 bg-purple-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-purple-700" />
          Quiz rumen — Question {currentQ + 1}/{questions.length}
          {answered && (
            <Badge className={`ml-auto text-[10px] ${selected === questions[currentQ].correct ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
              {selected === questions[currentQ].correct ? "✓ Correct" : "✗ Faux"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFinished ? (
          <div className="text-center py-4">
            <Award className={`h-12 w-12 mx-auto mb-2 ${score >= 4 ? "text-emerald-600" : score >= 3 ? "text-amber-600" : "text-rose-600"}`} />
            <p className="text-lg font-bold text-stone-900">Score: {score}/{questions.length}</p>
            <p className="text-sm text-stone-600 mt-1">
              {score >= 4 ? "Excellent ! Vous maîtrisez la physiologie ruminale." : score >= 3 ? "Bien, quelques révisions nécessaires." : "À retravailler — consultez le glossaire."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-stone-900">{questions[currentQ].q}</p>
            <div className="space-y-1.5">
              {questions[currentQ].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={answered}
                  className={`w-full text-left text-xs p-2.5 rounded-lg border transition-colors ${
                    !answered
                      ? "border-stone-200 bg-white hover:bg-stone-50"
                      : i === questions[currentQ].correct
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : i === selected
                          ? "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-stone-200 bg-white opacity-50"
                  }`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {answered && i === questions[currentQ].correct && <CheckCircle2 className="h-3 w-3 inline ml-2 text-emerald-600" />}
                  {answered && i === selected && i !== questions[currentQ].correct && <XCircle className="h-3 w-3 inline ml-2 text-rose-600" />}
                </button>
              ))}
            </div>
            {answered && (
              <div className="rounded-lg bg-purple-100 border border-purple-200 p-2.5">
                <p className="text-xs text-purple-900">
                  <FlaskConical className="h-3 w-3 inline mr-1" />
                  {questions[currentQ].explanation}
                </p>
              </div>
            )}
            {answered && (
              <Button onClick={next} size="sm" className="w-full">
                {currentQ < questions.length - 1 ? "Question suivante" : "Voir le score"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
