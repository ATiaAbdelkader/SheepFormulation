"use client";

import { useState, useMemo } from "react";
import { alimData, num, fmt, type CMVRecord } from "@/lib/alim-data";
import {
  analyzeDeficit, recommendCMVs, checkMineralInteractions, calculateDosage,
  type DeficitProfile, type CMVRecommendation, type MineralWarning,
} from "@/lib/cmv-selector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Pill, Wand2, Database, GitCompare, Info, AlertTriangle, CheckCircle2,
  Calculator, Shield, Zap, Euro, Beaker, ArrowRight, Star, Award,
} from "lucide-react";

type Tab = "wizard" | "database" | "compare";

export function AlimCMV() {
  const [tab, setTab] = useState<Tab>("wizard");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <Pill className="h-5 w-5 text-rose-700" />
          CMV — Assistant de sélection & base minérale
        </h2>
        <p className="text-sm text-stone-500">
          {alimData.cmvs.length} compléments minéraux. Assistant intelligent en 3 questions,
          calculateur de dosage, analyse des interactions minérales.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "wizard"} onClick={() => setTab("wizard")} icon={<Wand2 className="h-3.5 w-3.5" />} label="Assistant" />
        <TabButton active={tab === "database"} onClick={() => setTab("database")} icon={<Database className="h-3.5 w-3.5" />} label="Base de données" />
        <TabButton active={tab === "compare"} onClick={() => setTab("compare")} icon={<GitCompare className="h-3.5 w-3.5" />} label="Comparer" />
      </div>

      {tab === "wizard" && <WizardTab />}
      {tab === "database" && <DatabaseTab />}
      {tab === "compare" && <CompareTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-rose-100 text-rose-900 border-b-2 border-rose-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== WIZARD TAB ====================
function WizardTab() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pabsNeeded, setPabsNeeded] = useState<string>("");
  const [caabsNeeded, setCaabsNeeded] = useState<string>("");
  const [pabsProvided, setPabsProvided] = useState<string>("");
  const [caabsProvided, setCaabsProvided] = useState<string>("");
  const [animalStage, setAnimalStage] = useState<string>("unknown");
  const [budget, setBudget] = useState<string>("medium");

  const deficit = useMemo<DeficitProfile>(() => {
    return analyzeDeficit({
      pabsNeeded: pabsNeeded ? Number(pabsNeeded) : null,
      caabsNeeded: caabsNeeded ? Number(caabsNeeded) : null,
      pabsProvided: pabsProvided ? Number(pabsProvided) : 0,
      caabsProvided: caabsProvided ? Number(caabsProvided) : 0,
    });
  }, [pabsNeeded, caabsNeeded, pabsProvided, caabsProvided]);

  const recommendations = useMemo(() => {
    if (deficit.primaryDeficit === "neither") return [];
    return recommendCMVs(alimData.cmvs, deficit, budget as any);
  }, [deficit, budget]);

  // Mineral interactions
  const warnings = useMemo<MineralWarning[]>(() => {
    return checkMineralInteractions({
      caPRatio: deficit.caPRatio,
      pabsExcess: deficit.pabsDeficit !== null && deficit.pabsDeficit < -0.5,
      caabsExcess: deficit.caabsDeficit !== null && deficit.caabsDeficit < -0.5,
      highCaabs: caabsProvided ? Number(caabsProvided) : null,
      highPabs: pabsProvided ? Number(pabsProvided) : null,
    });
  }, [deficit, caabsProvided, pabsProvided]);

  const reset = () => {
    setStep(1);
    setPabsNeeded(""); setCaabsNeeded(""); setPabsProvided(""); setCaabsProvided("");
    setAnimalStage("unknown"); setBudget("medium");
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex items-center ${s < 3 ? "flex-1" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s ? "bg-rose-600 text-white" : "bg-stone-200 text-stone-400"
            }`}>{s}</div>
            {s < 3 && <div className={`flex-1 h-0.5 mx-1 ${step > s ? "bg-rose-600" : "bg-stone-200"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Deficit input */}
      {step === 1 && (
        <Card className="border-rose-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Beaker className="h-4 w-4 text-rose-700" /> Étape 1 — Bilan minéral de la ration
            </CardTitle>
            <CardDescription className="text-xs">
              Saisissez les besoins et apports de votre ration (en g/jour/animal).
              Ces valeurs sont disponibles dans le module Ration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Besoins</Label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-stone-500 w-20">Pabs (g/j)</Label>
                    <Input type="number" step="0.1" value={pabsNeeded} onChange={(e) => setPabsNeeded(e.target.value)} className="h-8 text-xs" placeholder="ex: 3.2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-stone-500 w-20">Caabs (g/j)</Label>
                    <Input type="number" step="0.1" value={caabsNeeded} onChange={(e) => setCaabsNeeded(e.target.value)} className="h-8 text-xs" placeholder="ex: 3.5" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-stone-700">Apports (aliments seuls)</Label>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-stone-500 w-20">Pabs (g/j)</Label>
                    <Input type="number" step="0.1" value={pabsProvided} onChange={(e) => setPabsProvided(e.target.value)} className="h-8 text-xs" placeholder="ex: 2.1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-stone-500 w-20">Caabs (g/j)</Label>
                    <Input type="number" step="0.1" value={caabsProvided} onChange={(e) => setCaabsProvided(e.target.value)} className="h-8 text-xs" placeholder="ex: 2.8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live deficit preview */}
            {pabsProvided && caabsProvided && (pabsNeeded || caabsNeeded) && (
              <div className="rounded-lg bg-stone-50 p-3 border border-stone-200">
                <div className="text-[10px] font-medium text-stone-600 uppercase mb-1.5">Aperçu du déficit</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-[9px] text-stone-500">Déficit Pabs</div>
                    <div className={`font-bold ${deficit.pabsDeficit !== null && deficit.pabsDeficit > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {deficit.pabsDeficit !== null ? `${deficit.pabsDeficit > 0 ? "-" : "+"}${fmt(Math.abs(deficit.pabsDeficit), 2)} g` : "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-stone-500">Déficit Caabs</div>
                    <div className={`font-bold ${deficit.caabsDeficit !== null && deficit.caabsDeficit > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {deficit.caabsDeficit !== null ? `${deficit.caabsDeficit > 0 ? "-" : "+"}${fmt(Math.abs(deficit.caabsDeficit), 2)} g` : "—"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] text-stone-500">Ca/P actuel</div>
                    <div className={`font-bold ${deficit.caPRatio !== null && (deficit.caPRatio < 0.8 || deficit.caPRatio > 2.0) ? "text-amber-700" : "text-emerald-700"}`}>
                      {deficit.caPRatio !== null ? fmt(deficit.caPRatio, 2) : "—"}
                    </div>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <Badge className={`text-[10px] ${
                    deficit.primaryDeficit === "calcium" ? "bg-rose-100 text-rose-800"
                    : deficit.primaryDeficit === "phosphorus" ? "bg-amber-100 text-amber-800"
                    : deficit.primaryDeficit === "both" ? "bg-purple-100 text-purple-800"
                    : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {deficit.primaryDeficit === "calcium" && "Déficit en CALCIUM"}
                    {deficit.primaryDeficit === "phosphorus" && "Déficit en PHOSPHORE"}
                    {deficit.primaryDeficit === "both" && "Double déficit Ca + P"}
                    {deficit.primaryDeficit === "neither" && "Aucun déficit détecté"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={() => setStep(2)} disabled={!pabsProvided && !caabsProvided}>
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Animal stage & budget */}
      {step === 2 && (
        <Card className="border-rose-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-700" /> Étape 2 — Contexte animal
            </CardTitle>
            <CardDescription className="text-xs">
              Ces informations permettent d&apos;affiner la recommandation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Stade physiologique de l&apos;animal</Label>
              <Select value={animalStage} onValueChange={setAnimalStage}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestation">Gestation (besoins Ca accrus)</SelectItem>
                  <SelectItem value="lactation">Lactation (risque hypocalcémie)</SelectItem>
                  <SelectItem value="growth">Croissance (besoins P accrus)</SelectItem>
                  <SelectItem value="maintenance">Entretien</SelectItem>
                  <SelectItem value="unknown">Non précisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Budget pour le CMV</Label>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Économique (minimiser le coût)</SelectItem>
                  <SelectItem value="medium">Standard</SelectItem>
                  <SelectItem value="high">Premium (qualité max)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={() => setStep(3)}>
                Obtenir les recommandations <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Deficit summary */}
          <Card className="border-2 border-rose-300 bg-rose-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-700" /> Bilan minéral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DeficitBox label="Déficit Pabs" value={deficit.pabsDeficit} unit="g/j" />
                <DeficitBox label="Déficit Caabs" value={deficit.caabsDeficit} unit="g/j" />
                <DeficitBox label="Ca/P actuel" value={deficit.caPRatio} unit="" decimals={2} />
                <div className="rounded-lg bg-white p-2.5 text-center border border-stone-200">
                  <div className="text-[10px] text-stone-500 uppercase">Sévérité</div>
                  <div className={`text-sm font-bold ${
                    deficit.severity === "high" ? "text-rose-700" : deficit.severity === "moderate" ? "text-amber-700" : "text-emerald-700"
                  }`}>
                    {deficit.severity === "high" ? "Élevée" : deficit.severity === "moderate" ? "Modérée" : "Faible"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mineral interaction warnings */}
          {warnings.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  Interactions minérales détectées ({warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {warnings.map((w, i) => (
                  <div key={i} className={`rounded p-2 text-xs ${
                    w.level === "danger" ? "bg-rose-100 border border-rose-300"
                    : w.level === "warning" ? "bg-amber-100 border border-amber-300"
                    : "bg-stone-100 border border-stone-200"
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {w.level === "danger" ? <AlertTriangle className="h-3 w-3 text-rose-600" />
                      : w.level === "warning" ? <AlertTriangle className="h-3 w-3 text-amber-600" />
                      : <Info className="h-3 w-3 text-stone-500" />}
                      <span className="font-medium text-stone-900">{w.title}</span>
                    </div>
                    <p className="text-stone-700 mt-0.5">{w.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                  <Award className="h-4 w-4 text-rose-700" />
                  CMV recommandés ({recommendations.length})
                </h3>
                <Button size="sm" variant="ghost" onClick={reset}>Recommencer</Button>
              </div>

              {recommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} rank={i + 1} />
              ))}
            </div>
          ) : (
            <Card className="border-emerald-300 bg-emerald-50/40">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
                <h3 className="text-sm font-semibold text-stone-900">Aucun déficit minéral détecté</h3>
                <p className="text-xs text-stone-600 mt-1">
                  Votre ration couvre les besoins en Pabs et Caabs. Aucun CMV n&apos;est nécessaire.
                </p>
                <Button variant="outline" className="mt-4" onClick={reset}>Recommencer</Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function DeficitBox({ label, value, unit, decimals = 2 }: { label: string; value: number | null; unit: string; decimals?: number }) {
  const isDeficit = value !== null && value > 0;
  const isExcess = value !== null && value < -0.1;
  return (
    <div className="rounded-lg bg-white p-2.5 text-center border border-stone-200">
      <div className="text-[10px] text-stone-500 uppercase">{label}</div>
      <div className={`text-sm font-bold ${isDeficit ? "text-rose-700" : isExcess ? "text-amber-700" : "text-emerald-700"}`}>
        {value !== null ? `${isDeficit ? "-" : isExcess ? "+" : ""}${fmt(Math.abs(value), decimals)} ${unit}` : "—"}
      </div>
    </div>
  );
}

function RecommendationCard({ rec, rank }: { rec: CMVRecommendation; rank: number }) {
  const rankColors = ["bg-amber-400 text-white", "bg-stone-300 text-white", "bg-orange-300 text-white", "bg-stone-200", "bg-stone-200"];
  return (
    <Card className={`border-stone-200 ${rank === 1 ? "border-2 border-rose-300" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[rank - 1] || "bg-stone-200"}`}>
              {rank}
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">CMV {rec.cmv.name}</div>
              <div className="text-[10px] text-stone-500">Ca/P = {fmt(num(rec.cmv.ca_p_ratio), 1)} · Pabs {fmt(num(rec.cmv.pabs_per_kg), 1)} g/kg · Caabs {fmt(num(rec.cmv.caabs_per_kg), 1)} g/kg</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-rose-700">{fmt(rec.matchScore, 0)}</div>
            <div className="text-[9px] text-stone-500">score</div>
          </div>
        </div>

        {/* Reason */}
        <div className="rounded bg-stone-50 p-2 mb-2">
          <p className="text-[11px] text-stone-700">
            <Info className="h-3 w-3 inline mr-1" />
            {rec.reason}
          </p>
        </div>

        {/* Dosage */}
        {rec.recommendedDosage !== null && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div className="rounded bg-rose-50 p-2 text-center border border-rose-200">
              <div className="text-[9px] text-stone-500 uppercase">Dosage recommandé</div>
              <div className="text-base font-bold text-rose-900">{fmt(rec.recommendedDosage, 0)} g/j</div>
            </div>
            <div className="rounded bg-white p-2 text-center border border-stone-200">
              <div className="text-[9px] text-stone-500 uppercase">Apport Pabs</div>
              <div className="text-sm font-bold text-stone-900">+{fmt(rec.pabsContrib, 2)} g</div>
            </div>
            <div className="rounded bg-white p-2 text-center border border-stone-200">
              <div className="text-[9px] text-stone-500 uppercase">Apport Caabs</div>
              <div className="text-sm font-bold text-stone-900">+{fmt(rec.caabsContrib, 2)} g</div>
            </div>
            <div className={`rounded p-2 text-center border ${rec.fullyCorrected ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="text-[9px] text-stone-500 uppercase">Correction</div>
              <div className={`text-sm font-bold ${rec.fullyCorrected ? "text-emerald-700" : "text-amber-700"}`}>
                {rec.fullyCorrected ? "Complète" : "Partielle"}
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {rec.warnings.length > 0 && (
          <div className="space-y-1">
            {rec.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-800">
                <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== DATABASE TAB ====================
function DatabaseTab() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");

  const enriched = useMemo(() => {
    return alimData.cmvs.map((c) => {
      const caP = num(c.ca_p_ratio);
      let type = "Équilibré";
      let typeColor = "bg-stone-100 text-stone-700";
      if (caP !== null) {
        if (caP <= 0.1) { type = "Riche en P"; typeColor = "bg-amber-100 text-amber-800"; }
        else if (caP <= 0.5) { type = "P > Ca"; typeColor = "bg-yellow-100 text-yellow-800"; }
        else if (caP >= 3.0) { type = "Riche en Ca"; typeColor = "bg-rose-100 text-rose-800"; }
        else if (caP >= 1.5) { type = "Ca > P"; typeColor = "bg-purple-100 text-purple-800"; }
      }
      return { ...c, caP, type, typeColor };
    });
  }, []);

  const filtered = useMemo(() => {
    let result = enriched.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === "ca-low") result.sort((a, b) => (a.caP ?? 999) - (b.caP ?? 999));
    else if (sortBy === "ca-high") result.sort((a, b) => (b.caP ?? 0) - (a.caP ?? 0));
    else if (sortBy === "pabs") result.sort((a, b) => (num(b.pabs_per_kg) ?? 0) - (num(a.pabs_per_kg) ?? 0));
    else if (sortBy === "caabs") result.sort((a, b) => (num(b.caabs_per_kg) ?? 0) - (num(a.caabs_per_kg) ?? 0));
    return result;
  }, [enriched, search, sortBy]);

  return (
    <div className="space-y-3">
      <Card className="border-stone-200">
        <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <Info className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
            <option value="name">Trier par: Nom</option>
            <option value="ca-low">Trier par: Ca/P croissant (P riche)</option>
            <option value="ca-high">Trier par: Ca/P décroissant (Ca riche)</option>
            <option value="pabs">Trier par: Pabs</option>
            <option value="caabs">Trier par: Caabs</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((c, i) => (
          <Card key={i} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-stone-900">CMV {c.name}</CardTitle>
                <Badge className={`text-[10px] ${c.typeColor}`}>{c.type}</Badge>
              </div>
              <CardDescription className="text-xs">Ca/P = {fmt(c.caP, c.caP !== null && c.caP > 10 ? 0 : 2)}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-stone-50 p-2">
                <div className="text-stone-500">Pabs / kg</div>
                <div className="text-sm font-semibold text-stone-900">{fmt(num(c.pabs_per_kg), 1)} g</div>
              </div>
              <div className="rounded-md bg-stone-50 p-2">
                <div className="text-stone-500">Caabs / kg</div>
                <div className="text-sm font-semibold text-stone-900">{fmt(num(c.caabs_per_kg), 1)} g</div>
              </div>
              {num(c.ca_pct) !== null && (
                <div className="rounded-md bg-rose-50 p-2">
                  <div className="text-rose-600">Ca total</div>
                  <div className="text-sm font-semibold text-rose-900">{fmt(num(c.ca_pct), 0)} g/kg</div>
                </div>
              )}
              {num(c.p_pct) !== null && (
                <div className="rounded-md bg-amber-50 p-2">
                  <div className="text-amber-600">P total</div>
                  <div className="text-sm font-semibold text-amber-900">{fmt(num(c.p_pct), 0)} g/kg</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== COMPARE TAB ====================
function CompareTab() {
  const [cmv1, setCmv1] = useState<string>("");
  const [cmv2, setCmv2] = useState<string>("");
  const [pabsDeficit, setPabsDeficit] = useState<string>("");
  const [caabsDeficit, setCaabsDeficit] = useState<string>("");
  const [animalWeight, setAnimalWeight] = useState<string>("70");

  const c1 = alimData.cmvs.find((c) => c.name === cmv1);
  const c2 = alimData.cmvs.find((c) => c.name === cmv2);

  const calc1 = useMemo(() => {
    if (!c1) return null;
    return calculateDosage({
      cmv: c1,
      pabsDeficit: pabsDeficit ? Number(pabsDeficit) : null,
      caabsDeficit: caabsDeficit ? Number(caabsDeficit) : null,
      animalWeight: Number(animalWeight) || 70,
    });
  }, [c1, pabsDeficit, caabsDeficit, animalWeight]);

  const calc2 = useMemo(() => {
    if (!c2) return null;
    return calculateDosage({
      cmv: c2,
      pabsDeficit: pabsDeficit ? Number(pabsDeficit) : null,
      caabsDeficit: caabsDeficit ? Number(caabsDeficit) : null,
      animalWeight: Number(animalWeight) || 70,
    });
  }, [c2, pabsDeficit, caabsDeficit, animalWeight]);

  return (
    <div className="space-y-4">
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-rose-700" />
            Comparateur de CMV avec calculateur de dosage
          </CardTitle>
          <CardDescription className="text-xs">
            Comparez 2 CMV côte à côte et calculez le dosage exact pour corriger votre déficit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">CMV N°1</Label>
              <Select value={cmv1} onValueChange={setCmv1}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {alimData.cmvs.map((c) => <SelectItem key={c.name} value={c.name} className="text-xs">CMV {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CMV N°2</Label>
              <Select value={cmv2} onValueChange={setCmv2}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {alimData.cmvs.map((c) => <SelectItem key={c.name} value={c.name} className="text-xs">CMV {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500">Déficit Pabs (g)</Label>
              <Input type="number" step="0.1" value={pabsDeficit} onChange={(e) => setPabsDeficit(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500">Déficit Caabs (g)</Label>
              <Input type="number" step="0.1" value={caabsDeficit} onChange={(e) => setCaabsDeficit(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-stone-500">Poids animal (kg)</Label>
              <Input type="number" value={animalWeight} onChange={(e) => setAnimalWeight(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison table */}
      {c1 && c2 && (
        <Card className="border-stone-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Critère</th>
                    <th className="text-center px-3 py-2 font-medium">CMV {c1.name}</th>
                    <th className="text-center px-3 py-2 font-medium">CMV {c2.name}</th>
                    <th className="text-center px-3 py-2 font-medium">Meilleur</th>
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Ca/P ratio" v1={fmt(num(c1.ca_p_ratio), num(c1.ca_p_ratio) !== null && num(c1.ca_p_ratio)! > 10 ? 0 : 2)} v2={fmt(num(c2.ca_p_ratio), num(c2.ca_p_ratio) !== null && num(c2.ca_p_ratio)! > 10 ? 0 : 2)} better={num(c1.ca_p_ratio) ?? 0 > num(c2.ca_p_ratio) ?? 0 ? 0 : 1} />
                  <CompareRow label="Pabs / kg (g)" v1={fmt(num(c1.pabs_per_kg), 1)} v2={fmt(num(c2.pabs_per_kg), 1)} better={(num(c1.pabs_per_kg) ?? 0) > (num(c2.pabs_per_kg) ?? 0) ? 0 : 1} higherIsBetter />
                  <CompareRow label="Caabs / kg (g)" v1={fmt(num(c1.caabs_per_kg), 1)} v2={fmt(num(c2.caabs_per_kg), 1)} better={(num(c1.caabs_per_kg) ?? 0) > (num(c2.caabs_per_kg) ?? 0) ? 0 : 1} higherIsBetter />
                  <CompareRow label="Dosage (g/j)" v1={calc1?.dosage ? fmt(calc1.dosage, 0) : "—"} v2={calc2?.dosage ? fmt(calc2.dosage, 0) : "—"} better={
                    calc1?.dosage && calc2?.dosage ? (calc1.dosage < calc2.dosage ? 0 : 1) : -1
                  } />
                  <CompareRow label="Apport Pabs (g)" v1={calc1 ? fmt(calc1.pabsContrib, 2) : "—"} v2={calc2 ? fmt(calc2.pabsContrib, 2) : "—"} better={-1} />
                  <CompareRow label="Apport Caabs (g)" v1={calc1 ? fmt(calc1.caabsContrib, 2) : "—"} v2={calc2 ? fmt(calc2.caabsContrib, 2) : "—"} better={-1} />
                  <CompareRow label="Dosage / 100kg PV" v1={calc1?.per100kg ? fmt(calc1.per100kg, 1) : "—"} v2={calc2?.per100kg ? fmt(calc2.per100kg, 1) : "—"} better={-1} />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {calc1?.warning && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-2">
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> CMV {c1?.name}: {calc1.warning}
            </p>
          </CardContent>
        </Card>
      )}
      {calc2?.warning && (
        <Card className="border-amber-300 bg-amber-50/30">
          <CardContent className="p-2">
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> CMV {c2?.name}: {calc2.warning}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CompareRow({ label, v1, v2, better, higherIsBetter }: { label: string; v1: string; v2: string; better: number; higherIsBetter?: boolean }) {
  return (
    <tr className="border-b border-stone-100">
      <td className="px-3 py-2 text-stone-700 font-medium">{label}</td>
      <td className={`px-3 py-2 text-center tabular-nums ${better === 0 ? "text-emerald-700 font-bold" : ""}`}>{v1}</td>
      <td className={`px-3 py-2 text-center tabular-nums ${better === 1 ? "text-emerald-700 font-bold" : ""}`}>{v2}</td>
      <td className="px-3 py-2 text-center">
        {better === 0 && <CheckCircle2 className="h-3 w-3 text-emerald-600 mx-auto" />}
        {better === 1 && <CheckCircle2 className="h-3 w-3 text-emerald-600 mx-auto" />}
        {better === -1 && <span className="text-stone-300">—</span>}
      </td>
    </tr>
  );
}
