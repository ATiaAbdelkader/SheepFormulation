"use client";

import { useState, useMemo } from "react";
import { GLOSSARY, CATEGORIES, generateBibTeX, generateRIS, type Language, type GlossaryEntry } from "@/lib/glossary-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Search, Calculator, Languages, FileText, Copy, CheckCircle2,
  Info, ArrowRight, FlaskConical, Zap, Euro, ChevronDown, ChevronRight,
  Download,
} from "lucide-react";

type Tab = "encyclopedia" | "calculators" | "multilingual" | "references";

export function AlimGlossaire() {
  const [tab, setTab] = useState<Tab>("encyclopedia");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-700" />
          Encyclopédie interactive de nutrition ovine
        </h2>
        <p className="text-sm text-stone-500">
          {GLOSSARY.length} termes en FR/EN/AR avec calculateurs intégrés, formules interactives et export de citations.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "encyclopedia"} onClick={() => setTab("encyclopedia")} icon={<BookOpen className="h-3.5 w-3.5" />} label="Encyclopédie" />
        <TabButton active={tab === "calculators"} onClick={() => setTab("calculators")} icon={<Calculator className="h-3.5 w-3.5" />} label="Calculateurs" />
        <TabButton active={tab === "multilingual"} onClick={() => setTab("multilingual")} icon={<Languages className="h-3.5 w-3.5" />} label="Multilingue (FR/EN/AR)" />
        <TabButton active={tab === "references"} onClick={() => setTab("references")} icon={<FileText className="h-3.5 w-3.5" />} label="Références" />
      </div>

      {tab === "encyclopedia" && <EncyclopediaTab />}
      {tab === "calculators" && <CalculatorsTab />}
      {tab === "multilingual" && <MultilingualTab />}
      {tab === "references" && <ReferencesTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-cyan-100 text-cyan-900 border-b-2 border-cyan-600" : "text-stone-600 hover:bg-stone-100"
      }`}>
      {icon}{label}
    </button>
  );
}

// ==================== ENCYCLOPEDIA TAB ====================
function EncyclopediaTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return GLOSSARY.filter((g) => {
      if (search) {
        const s = search.toLowerCase();
        return g.symbol.toLowerCase().includes(s) ||
          g.names.fr.toLowerCase().includes(s) ||
          g.names.en.toLowerCase().includes(s) ||
          g.names.ar.includes(search) ||
          g.descriptions.fr.toLowerCase().includes(s);
      }
      if (category !== "all" && g.category !== category) return false;
      return true;
    });
  }, [search, category]);

  return (
    <div className="space-y-3">
      {/* Search & filters */}
      <Card className="border-stone-200">
        <CardContent className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-400" />
            <Input placeholder="Rechercher en FR / EN / AR..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                className={`text-xs px-2.5 py-1 rounded-md ${category === c.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}>
                {c.icon} {c.label.fr}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Badge variant="outline" className="bg-stone-50">{filtered.length} terme(s)</Badge>

      {/* Entries */}
      <div className="space-y-2">
        {filtered.map((g) => (
          <Card key={g.id} className="border-stone-200 hover:shadow-md transition-shadow">
            <div className="p-3">
              <button onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className="w-full flex items-start justify-between gap-2 text-left">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="inline-flex items-center justify-center rounded-md bg-stone-900 text-white px-2.5 py-1 text-sm font-bold font-mono flex-shrink-0">
                    {g.symbol}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-900">{g.names.fr}</div>
                    <div className="text-[10px] text-stone-500">{g.unit}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {g.calculator && <Badge variant="outline" className="text-[9px] bg-cyan-50 text-cyan-700"><Calculator className="h-2.5 w-2.5 mr-0.5" />Calculateur</Badge>}
                  <Badge variant="outline" className="text-[9px]">
                    {CATEGORIES.find((c) => c.id === g.category)?.icon} {CATEGORIES.find((c) => c.id === g.category)?.label.fr}
                  </Badge>
                  {expanded === g.id ? <ChevronDown className="h-4 w-4 text-stone-400" /> : <ChevronRight className="h-4 w-4 text-stone-400" />}
                </div>
              </button>

              {/* Expanded content */}
              {expanded === g.id && (
                <div className="mt-3 pt-3 border-t border-stone-200 space-y-3">
                  {/* Description */}
                  <p className="text-xs text-stone-700 leading-relaxed">{g.descriptions.fr}</p>

                  {/* Multilingual names */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-stone-100">🇫🇷 {g.names.fr}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100">🇬🇧 {g.names.en}</span>
                    <span className="px-2 py-0.5 rounded bg-stone-100" dir="rtl">🇩🇿 {g.names.ar}</span>
                  </div>

                  {/* Formula */}
                  {g.formula && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
                      <div className="text-[9px] text-amber-700 uppercase font-medium mb-0.5">Formule</div>
                      <code className="text-xs font-mono text-amber-900">{g.formula}</code>
                    </div>
                  )}

                  {/* Normal range */}
                  {g.normalRange && (
                    <div className="rounded-md bg-stone-50 p-2">
                      <div className="text-[9px] text-stone-500 uppercase font-medium mb-0.5">Plage normale</div>
                      <div className="text-xs text-stone-700">{g.normalRange}</div>
                    </div>
                  )}

                  {/* Embedded calculator */}
                  {g.calculator && <EmbeddedCalculator entry={g} />}

                  {/* Related terms */}
                  {g.related && g.related.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-stone-500 uppercase font-medium">Voir aussi:</span>
                      {g.related.map((r) => {
                        const related = GLOSSARY.find((g) => g.id === r);
                        return related ? (
                          <button key={r} onClick={() => setExpanded(related.id)}
                            className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                            {related.symbol}
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Reference */}
                  <div className="text-[10px] text-stone-400 italic">
                    <BookOpen className="h-3 w-3 inline mr-1" />{g.reference}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== EMBEDDED CALCULATOR ====================
function EmbeddedCalculator({ entry }: { entry: GlossaryEntry }) {
  const calc = entry.calculator!;
  const [inputs, setInputs] = useState<Record<string, number>>(
    calc.inputs.reduce((acc, inp) => ({ ...acc, [inp.key]: inp.default }), {})
  );

  // Compute result directly from inputs (no setState in render)
  const result = calc.compute(inputs);

  return (
    <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-2.5">
      <div className="text-[10px] font-medium text-cyan-700 uppercase flex items-center gap-1 mb-1.5">
        <Calculator className="h-3 w-3" /> Calculateur intégré
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {calc.inputs.map((inp) => (
          <div key={inp.key}>
            <Label className="text-[9px] text-stone-500">{inp.label} ({inp.unit})</Label>
            <Input type="number" step="any" value={inputs[inp.key]} onChange={(e) => setInputs({ ...inputs, [inp.key]: Number(e.target.value) || 0 })} className="h-7 text-xs" />
          </div>
        ))}
      </div>
      {result && (
        <div className="rounded bg-white p-2 border border-cyan-200">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-stone-500">{result.label}</span>
            <span className="text-lg font-bold text-cyan-900">
              {result.result.toFixed(result.unit === "" ? 2 : 3)} <span className="text-[10px] text-stone-400">{result.unit}</span>
            </span>
          </div>
          <p className="text-[10px] text-stone-600 mt-0.5">{result.interpretation}</p>
        </div>
      )}
    </div>
  );
}

// ==================== CALCULATORS TAB ====================
function CalculatorsTab() {
  const calculators = GLOSSARY.filter((g) => g.calculator);

  return (
    <div className="space-y-3">
      <Card className="border-cyan-200 bg-cyan-50/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <Calculator className="h-4 w-4 text-cyan-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-stone-700">
              <strong className="text-cyan-900">{calculators.length} calculateurs interactifs</strong> — modifiez les valeurs
              et voyez le résultat en temps réel avec interprétation automatique.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {calculators.map((g) => (
          <Card key={g.id} className="border-stone-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-md bg-stone-900 text-white px-2 py-0.5 text-xs font-bold font-mono">
                  {g.symbol}
                </span>
                <CardTitle className="text-sm">{g.names.fr}</CardTitle>
              </div>
              <CardDescription className="text-[10px]">{g.formula}</CardDescription>
            </CardHeader>
            <CardContent>
              <EmbeddedCalculator entry={g} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== MULTILINGUAL TAB ====================
function MultilingualTab() {
  const [lang, setLang] = useState<Language>("fr");

  return (
    <div className="space-y-3">
      {/* Language selector */}
      <Card className="border-stone-200">
        <CardContent className="p-3 flex items-center gap-2">
          <Languages className="h-4 w-4 text-cyan-700" />
          <span className="text-xs text-stone-600">Langue:</span>
          <button onClick={() => setLang("fr")} className={`text-xs px-3 py-1 rounded-md ${lang === "fr" ? "bg-cyan-600 text-white" : "bg-stone-100"}`}>🇫🇷 Français</button>
          <button onClick={() => setLang("en")} className={`text-xs px-3 py-1 rounded-md ${lang === "en" ? "bg-cyan-600 text-white" : "bg-stone-100"}`}>🇬🇧 English</button>
          <button onClick={() => setLang("ar")} className={`text-xs px-3 py-1 rounded-md ${lang === "ar" ? "bg-cyan-600 text-white" : "bg-stone-100"}`}>🇩🇿 العربية</button>
        </CardContent>
      </Card>

      {/* Glossary in selected language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {GLOSSARY.map((g) => (
          <Card key={g.id} className="border-stone-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center justify-center rounded bg-stone-900 text-white px-1.5 py-0.5 text-[10px] font-bold font-mono">
                  {g.symbol}
                </span>
                <span className="text-sm font-semibold text-stone-900" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {g.names[lang]}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed" dir={lang === "ar" ? "rtl" : "ltr"}>
                {g.descriptions[lang]}
              </p>
              <div className="text-[10px] text-stone-400 mt-1">{g.unit}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== REFERENCES TAB ====================
function ReferencesTab() {
  const [selectedEntry, setSelectedEntry] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  const entry = GLOSSARY.find((g) => g.id === selectedEntry);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Term selector */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Export de citations</CardTitle>
          <CardDescription className="text-xs">Sélectionnez un terme pour générer les citations BibTeX et RIS</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEntry} onValueChange={setSelectedEntry}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Choisir un terme..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {GLOSSARY.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-xs">
                  {g.symbol} — {g.names.fr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Citation outputs */}
      {entry && (
        <div className="space-y-3">
          {/* BibTeX */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> BibTeX
                </CardTitle>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => copyToClipboard(generateBibTeX(entry), "bibtex")}>
                  {copied === "bibtex" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Copié</> : <><Copy className="h-3 w-3 mr-1" /> Copier</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-[10px] font-mono text-stone-700 bg-stone-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{generateBibTeX(entry)}</pre>
            </CardContent>
          </Card>

          {/* RIS */}
          <Card className="border-stone-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" /> RIS
                </CardTitle>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => copyToClipboard(generateRIS(entry), "ris")}>
                  {copied === "ris" ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Copié</> : <><Copy className="h-3 w-3 mr-1" /> Copier</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-[10px] font-mono text-stone-700 bg-stone-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">{generateRIS(entry)}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bibliography */}
      <Card className="border-stone-200 bg-stone-50">
        <CardHeader>
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-stone-600" /> Références bibliographiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-stone-700">
          <p className="leading-relaxed">
            <strong>INRA (2018).</strong> Alimentation des ruminants. Apports nutritionnels et besoins.
            Éditions Quae, Versailles. 720 p. ISBN: 978-2-7592-2966-3.
          </p>
          <p className="leading-relaxed">
            <strong>Sauvant, D., Giger-Reverdin, S., Serment, A., et al. (2011).</strong>
            Modélisation des flux d&apos;azote et de méthane chez les ruminants.
            INRA Productions Animales, 24(5), 437-448.
          </p>
          <p className="leading-relaxed">
            <strong>IPCC (2019).</strong> 2019 Refinement to the 2006 IPCC Guidelines for National
            Greenhouse Gas Inventories: Volume 4 — Agriculture, Forestry and Other Land Use.
          </p>
          <p className="leading-relaxed">
            <strong>Atia, A.</strong> OvinFormulation v1.0 — AgriSkills Academy.
            Adaptation web de l&apos;outil Alim&apos;OVINS v5.1 (RANOUX F., Lycée Agricole du Bourbonnais).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
