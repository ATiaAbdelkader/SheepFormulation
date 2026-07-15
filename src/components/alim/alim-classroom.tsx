"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap, Plus, Users, Send, Award, Eye, Trash2,
  Copy, CheckCircle2, AlertCircle, Loader2, BookOpen, ChevronRight,
  Trophy, BarChart3, FileText, Star, Target, TrendingUp, Clock,
  Sparkles, Medal, AlertTriangle,
} from "lucide-react";
import { alimData, num, fmt } from "@/lib/alim-data";
import { TEMPLATES, CATEGORIES, DIFFICULTIES } from "@/lib/templates";

type Assignment = {
  id: string;
  code: string;
  title: string;
  description: string;
  animalCategory: string;
  maxCostPerDay: number | null;
  minPDICoverage: number;
  minUFLCoverage: number;
  minPabsCoverage: number | null;
  minCaabsCoverage: number | null;
  maxConcentratePct: number | null;
  weightCost: number;
  weightCoverage: number;
  weightFeasibility: number;
  createdBy: string;
  createdAt: string;
  dueDate: string | null;
  isActive: boolean;
  difficulty: string;
  topic: string;
  _count?: { submissions: number };
  submissions?: Submission[];
};

type Submission = {
  id: string;
  studentName: string;
  studentEmail: string | null;
  totalUFL: number;
  totalPDI: number;
  totalPabs: number;
  totalCaabs: number;
  totalMS: number;
  totalCost: number;
  coverageUFL: number;
  coveragePDI: number;
  coveragePabs: number;
  coverageCaabs: number;
  concentratePct: number;
  feasibleUM: boolean;
  score: number | null;
  grade: string | null;
  feedback: string | null;
  submittedAt: string;
};

type Student = {
  id: string;
  name: string;
  email: string | null;
  totalSubmissions: number;
  averageScore: number;
  bestScore: number;
  certificatesEarned: number;
  skillEnergy: number;
  skillProtein: number;
  skillMinerals: number;
  skillCost: number;
  skillFeasibility: number;
  firstSubmission: string | null;
  lastSubmission: string | null;
};

type Tab = "assignments" | "templates" | "leaderboard" | "analytics" | "students";

export function AlimClassroom() {
  const [tab, setTab] = useState<Tab>("assignments");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-700" />
          Académie — AgriSkills Academy LMS
        </h2>
        <p className="text-sm text-stone-500">
          Système d&apos;apprentissage complet: devoirs, modèles, classements, suivi de compétences et certificats.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-1">
        <TabButton active={tab === "assignments"} onClick={() => setTab("assignments")} icon={<BookOpen className="h-3.5 w-3.5" />} label="Devoirs" />
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")} icon={<FileText className="h-3.5 w-3.5" />} label="Modèles (15+)" />
        <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")} icon={<Trophy className="h-3.5 w-3.5" />} label="Classement" />
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")} icon={<BarChart3 className="h-3.5 w-3.5" />} label="Analytics" />
        <TabButton active={tab === "students"} onClick={() => setTab("students")} icon={<Users className="h-3.5 w-3.5" />} label="Étudiants" />
      </div>

      {tab === "assignments" && <AssignmentsTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "leaderboard" && <LeaderboardTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "students" && <StudentsTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-colors ${
        active ? "bg-indigo-100 text-indigo-900 border-b-2 border-indigo-600" : "text-stone-600 hover:bg-stone-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ==================== ASSIGNMENTS TAB ====================
function AssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [viewSubmissions, setViewSubmissions] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/assignment");
      if (res.ok) setAssignments(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  if (viewSubmissions) {
    return <SubmissionsView code={viewSubmissions} onBack={() => setViewSubmissions(null)} />;
  }
  if (showCreate) {
    return <CreateAssignment onCreated={() => { setShowCreate(false); fetchAssignments(); }} onCancel={() => setShowCreate(false)} />;
  }
  if (showJoin) {
    return <StudentSubmit onBack={() => setShowJoin(false)} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Créer un devoir</Button>
        <Button size="sm" variant="outline" onClick={() => setShowJoin(true)}><Users className="h-4 w-4 mr-1" /> Étudiant: Soumettre</Button>
        <Button size="sm" variant="ghost" onClick={fetchAssignments}>Rafraîchir</Button>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>
      ) : assignments.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <GraduationCap className="h-10 w-10 mx-auto mb-2 text-stone-400" />
            Aucun devoir. Créez-en un ou utilisez un modèle de la bibliothèque.
          </CardContent>
        </Card>
      ) : (
        assignments.map((a) => (
          <Card key={a.id} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-stone-900">{a.title}</h3>
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 font-mono">{a.code}</Badge>
                    {a.difficulty && a.difficulty !== "normal" && (
                      <Badge className={`text-[9px] ${DIFFICULTIES.find((d) => d.id === a.difficulty)?.color}`}>
                        {DIFFICULTIES.find((d) => d.id === a.difficulty)?.stars} {a.difficulty}
                      </Badge>
                    )}
                    {a.topic && a.topic !== "general" && (
                      <Badge className="text-[9px] bg-stone-100 text-stone-700">{CATEGORIES.find((c) => c.id === a.topic)?.label}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mb-1.5">{a.description}</p>
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                    {a.maxCostPerDay && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Max {a.maxCostPerDay}€/jour</span>}
                    <span className="px-1.5 py-0.5 rounded bg-stone-100">Min UFL: {a.minUFLCoverage}%</span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100">Min PDI: {a.minPDICoverage}%</span>
                    {a.maxConcentratePct && <span className="px-1.5 py-0.5 rounded bg-stone-100">Max conc: {a.maxConcentratePct}%</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    <Users className="h-3 w-3 mr-1" />
                    {a._count?.submissions || 0}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setViewSubmissions(a.code)}>
                      <Eye className="h-3 w-3 mr-1" /> Voir
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-400 hover:text-rose-600"
                      onClick={async () => { if (confirm("Supprimer ?")) { await fetch(`/api/classroom/assignment?id=${a.id}`, { method: "DELETE" }); fetchAssignments(); } }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-2">
                <span className="text-[10px] text-stone-500">Code:</span>
                <code className="text-xs font-mono px-2 py-0.5 rounded bg-stone-900 text-white">{a.code}</code>
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => navigator.clipboard.writeText(a.code)}>
                  <Copy className="h-3 w-3 mr-1" /> Copier
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ==================== TEMPLATES TAB ====================
function TemplatesTab() {
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = TEMPLATES.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (difficulty !== "all" && t.difficulty !== difficulty) return false;
    return true;
  });

  const createFromTemplate = async (index: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateIndex: index, createdBy: "Professeur" }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedCode(data.assignment.code);
        setTimeout(() => setCreatedCode(null), 5000);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      {/* Created code confirmation */}
      {createdCode && (
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
            <p className="text-sm font-medium text-stone-900">Devoir créé depuis le modèle!</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <code className="text-lg font-mono font-bold px-3 py-1 rounded bg-stone-900 text-white">{createdCode}</code>
              <Button size="sm" onClick={() => navigator.clipboard.writeText(createdCode)}><Copy className="h-3 w-3 mr-1" /> Copier</Button>
            </div>
            <p className="text-xs text-stone-500 mt-1">Partagez ce code avec vos étudiants.</p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-stone-200">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-500 uppercase">Catégorie:</span>
            <button onClick={() => setCategory("all")} className={`text-[10px] px-2 py-1 rounded ${category === "all" ? "bg-stone-900 text-white" : "bg-stone-100"}`}>Toutes</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={`text-[10px] px-2 py-1 rounded ${category === c.id ? "bg-stone-900 text-white" : c.color}`}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[10px] text-stone-500 uppercase">Niveau:</span>
            <button onClick={() => setDifficulty("all")} className={`text-[10px] px-2 py-1 rounded ${difficulty === "all" ? "bg-stone-900 text-white" : "bg-stone-100"}`}>Tous</button>
            {DIFFICULTIES.map((d) => (
              <button key={d.id} onClick={() => setDifficulty(d.id)} className={`text-[10px] px-2 py-1 rounded ${difficulty === d.id ? "bg-stone-900 text-white" : d.color}`}>
                {d.stars} {d.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((t, i) => {
          const realIndex = TEMPLATES.indexOf(t);
          const cat = CATEGORIES.find((c) => c.id === t.category);
          const diff = DIFFICULTIES.find((d) => d.id === t.difficulty);
          return (
            <Card key={i} className="border-stone-200 hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-base">{cat?.icon}</span>
                      <h4 className="text-sm font-semibold text-stone-900">{t.title}</h4>
                    </div>
                    <p className="text-[11px] text-stone-600 mb-1.5">{t.description}</p>
                  </div>
                  <Badge className={`text-[9px] flex-shrink-0 ${diff?.color}`}>{diff?.stars}</Badge>
                </div>

                {/* Learning objectives */}
                <div className="mb-2">
                  <span className="text-[9px] font-medium text-stone-500 uppercase">Objectifs:</span>
                  <ul className="text-[10px] text-stone-600 mt-0.5 space-y-0.5">
                    {t.learningObjectives.map((obj, j) => (
                      <li key={j} className="flex items-start gap-1">
                        <Target className="h-2.5 w-2.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Constraints */}
                <div className="flex flex-wrap gap-1 text-[9px] mb-2">
                  {t.maxCostPerDay && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">≤{t.maxCostPerDay}€/j</span>}
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">UFL ≥{t.minUFLCoverage}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">PDI ≥{t.minPDICoverage}%</span>
                  {t.maxConcentratePct && <span className="px-1.5 py-0.5 rounded bg-stone-100">Conc ≤{t.maxConcentratePct}%</span>}
                  <span className="px-1.5 py-0.5 rounded bg-stone-100"><Clock className="h-2 w-2 inline" /> {t.estimatedTime}min</span>
                </div>

                <Button size="sm" className="w-full h-7 text-xs" onClick={() => createFromTemplate(realIndex)} disabled={loading}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                  Créer un devoir
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ==================== LEADERBOARD TAB ====================
function LeaderboardTab() {
  const [period, setPeriod] = useState<string>("all");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(true));
    fetch(`/api/classroom/leaderboard?period=${period}`)
      .then((r) => r.json())
      .then((data) => { setLeaderboard(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const getMedalColor = (rank: number) => {
    if (rank === 0) return "text-yellow-500";
    if (rank === 1) return "text-stone-400";
    if (rank === 2) return "text-orange-600";
    return "text-stone-300";
  };

  return (
    <div className="space-y-3">
      {/* Period filter */}
      <div className="flex gap-2">
        <button onClick={() => setPeriod("all")} className={`text-xs px-3 py-1.5 rounded-md ${period === "all" ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-700"}`}>Tout temps</button>
        <button onClick={() => setPeriod("month")} className={`text-xs px-3 py-1.5 rounded-md ${period === "month" ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-700"}`}>Ce mois</button>
        <button onClick={() => setPeriod("week")} className={`text-xs px-3 py-1.5 rounded-md ${period === "week" ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-700"}`}>Cette semaine</button>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>
      ) : leaderboard.length === 0 ? (
        <Card className="border-stone-200 bg-stone-50">
          <CardContent className="p-8 text-center text-sm text-stone-500">
            <Trophy className="h-10 w-10 mx-auto mb-2 text-stone-400" />
            Aucune soumission pour cette période.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Classement ({leaderboard.length} étudiants)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-12">Rang</th>
                    <th className="text-left px-3 py-2 font-medium">Étudiant</th>
                    <th className="text-right px-3 py-2 font-medium">Score moyen</th>
                    <th className="text-right px-3 py-2 font-medium">Meilleur</th>
                    <th className="text-right px-3 py-2 font-medium">Soumissions</th>
                    {period === "all" && <th className="text-center px-3 py-2 font-medium">Certificats</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s, i) => (
                    <tr key={i} className={`border-b border-stone-100 ${i < 3 ? "bg-yellow-50/30" : ""}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {i < 3 ? <Medal className={`h-4 w-4 ${getMedalColor(i)}`} /> : <span className="text-stone-400 text-xs ml-1">{i + 1}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-stone-900">{s.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={`font-bold ${s.averageScore >= 80 ? "text-emerald-700" : s.averageScore >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                          {fmt(s.averageScore, 0)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-600">{fmt(s.bestScore, 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-stone-600">{s.totalSubmissions}</td>
                      {period === "all" && (
                        <td className="px-3 py-2 text-center">
                          {s.certificatesEarned > 0 ? (
                            <Badge className="text-[9px] bg-emerald-100 text-emerald-800"><Award className="h-2.5 w-2.5 mr-0.5" />{s.certificatesEarned}</Badge>
                          ) : <span className="text-stone-300">—</span>}
                        </td>
                      )}
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

// ==================== ANALYTICS TAB ====================
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(true));
    fetch("/api/classroom/analytics")
      .then((r) => r.json())
      .then((data) => { setAnalytics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;

  if (!analytics || analytics.totalSubmissions === 0) {
    return (
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-8 text-center text-sm text-stone-500">
          <BarChart3 className="h-10 w-10 mx-auto mb-2 text-stone-400" />
          Aucune donnée disponible. Les analytics apparaîtront après les premières soumissions.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="Total soumissions" value={analytics.totalSubmissions} icon={<Send className="h-3 w-3" />} />
        <KPICard label="Étudiants" value={analytics.studentCount} icon={<Users className="h-3 w-3" />} />
        <KPICard label="Score moyen" value={fmt(analytics.averageScore, 0)} icon={<TrendingUp className="h-3 w-3" />} />
        <KPICard label="Certificats émis" value={Object.entries(analytics.gradeDistribution).filter(([g]) => g === "A").reduce((s, [, v]) => s + (v as number), 0)} icon={<Award className="h-3 w-3" />} />
      </div>

      {/* Grade distribution */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Distribution des notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-8 rounded-lg overflow-hidden ring-1 ring-stone-200">
            {["A", "B", "C", "D", "F"].map((grade) => {
              const count = analytics.gradeDistribution[grade] || 0;
              const pct = analytics.totalSubmissions > 0 ? (count / analytics.totalSubmissions) * 100 : 0;
              const colors: Record<string, string> = { A: "bg-emerald-500", B: "bg-lime-500", C: "bg-amber-500", D: "bg-orange-500", F: "bg-rose-500" };
              return (
                <div key={grade} className={`${colors[grade]} flex items-center justify-center text-[10px] text-white font-medium`} style={{ width: `${pct}%` }}>
                  {pct > 5 ? `${grade} ${count}` : ""}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-stone-500">
            {["A (90+)", "B (80+)", "C (70+)", "D (60+)", "F (<60)"].map((g) => <span key={g}>{g}</span>)}
          </div>
        </CardContent>
      </Card>

      {/* Common issues */}
      {analytics.commonIssues.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
              Difficultés identifiées dans la classe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {analytics.commonIssues.map((issue: any, i: number) => (
              <div key={i} className={`rounded p-2 ${issue.severity === "high" ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-900">{issue.issue}</span>
                  <Badge className={`text-[9px] ${issue.severity === "high" ? "bg-rose-200 text-rose-900" : "bg-amber-200 text-amber-900"}`}>
                    {fmt(issue.percentage, 0)}% des étudiants
                  </Badge>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-stone-500 italic mt-2">
              💡 Suggestion: Créez un devoir ciblé sur ces points faibles pour aider les étudiants à progresser.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Coverage averages */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold">Couverture nutritionnelle moyenne</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "UFL", value: analytics.coverageAverages.UFL, color: "bg-emerald-500" },
              { label: "PDI", value: analytics.coverageAverages.PDI, color: "bg-blue-500" },
              { label: "Pabs", value: analytics.coverageAverages.Pabs, color: "bg-amber-500" },
              { label: "Caabs", value: analytics.coverageAverages.Caabs, color: "bg-rose-500" },
              { label: "Faisabilité", value: analytics.coverageAverages.feasibility, color: "bg-purple-500" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-[10px] text-stone-500 uppercase">{m.label}</div>
                <div className={`text-lg font-bold ${m.value >= 95 ? "text-emerald-700" : m.value >= 85 ? "text-amber-700" : "text-rose-700"}`}>
                  {fmt(m.value, 0)}%
                </div>
                <div className="h-1 bg-stone-200 rounded-full overflow-hidden mt-1">
                  <div className={`h-full ${m.color}`} style={{ width: `${Math.min(100, m.value)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top & struggling students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 text-emerald-800">
              <Trophy className="h-3.5 w-3.5" /> Top 5 étudiants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {analytics.topStudents.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Medal className={`h-3 w-3 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-stone-400" : i === 2 ? "text-orange-600" : "text-stone-300"}`} />
                  {s.name}
                </span>
                <span className="font-bold text-emerald-700">{fmt(s.avgScore, 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-rose-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 text-rose-800">
              <AlertCircle className="h-3.5 w-3.5" /> Étudiants en difficulté
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {analytics.strugglingStudents.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span>{s.name}</span>
                <span className="font-bold text-rose-700">{fmt(s.avgScore, 0)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== STUDENTS TAB ====================
function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setLoading(true));
    fetch("/api/classroom/students")
      .then((r) => r.json())
      .then((data) => { setStudents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (selectedStudent) {
    return <StudentProfile name={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;

  if (students.length === 0) {
    return (
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-8 text-center text-sm text-stone-500">
          <Users className="h-10 w-10 mx-auto mb-2 text-stone-400" />
          Aucun étudiant enregistré pour le moment.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Étudiants ({students.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nom</th>
                  <th className="text-right px-3 py-2 font-medium">Soumissions</th>
                  <th className="text-right px-3 py-2 font-medium">Score moyen</th>
                  <th className="text-right px-3 py-2 font-medium">Meilleur</th>
                  <th className="text-center px-3 py-2 font-medium">Certificats</th>
                  <th className="text-center px-3 py-2 font-medium">Profil</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/50 cursor-pointer" onClick={() => setSelectedStudent(s.name)}>
                    <td className="px-3 py-2 font-medium text-stone-900">{s.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-600">{s.totalSubmissions}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={`font-bold ${s.averageScore >= 80 ? "text-emerald-700" : s.averageScore >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                        {fmt(s.averageScore, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-stone-600">{fmt(s.bestScore, 0)}</td>
                    <td className="px-3 py-2 text-center">
                      {s.certificatesEarned > 0 ? (
                        <Badge className="text-[9px] bg-emerald-100 text-emerald-800"><Award className="h-2.5 w-2.5 mr-0.5" />{s.certificatesEarned}</Badge>
                      ) : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ChevronRight className="h-3 w-3 text-stone-400 mx-auto" />
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

// ==================== STUDENT PROFILE ====================
function StudentProfile({ name, onBack }: { name: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/classroom/students?name=${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [name]);

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;
  if (!data || !data.student) return <div className="text-center text-sm text-stone-500">Étudiant introuvable</div>;

  const s = data.student;
  const skills = [
    { label: "Énergie (UFL)", value: s.skillEnergy, color: "#10b981" },
    { label: "Protéines (PDI)", value: s.skillProtein, color: "#3b82f6" },
    { label: "Minéraux (Ca/P)", value: s.skillMinerals, color: "#f59e0b" },
    { label: "Coût", value: s.skillCost, color: "#8b5cf6" },
    { label: "Faisabilité (UEM)", value: s.skillFeasibility, color: "#ec4899" },
  ];

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> Retour</Button>

      {/* Header */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-stone-900">{s.name}</h3>
              {s.email && <p className="text-xs text-stone-500">{s.email}</p>}
              <p className="text-[10px] text-stone-400 mt-1">
                Inscrit depuis {s.firstSubmission ? new Date(s.firstSubmission).toLocaleDateString("fr-FR") : "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-700">{fmt(s.averageScore, 0)}</div>
              <div className="text-[10px] text-stone-500 uppercase">Score moyen</div>
              {s.certificatesEarned > 0 && (
                <Badge className="mt-1 text-[10px] bg-emerald-100 text-emerald-800"><Award className="h-2.5 w-2.5 mr-0.5" />{s.certificatesEarned} certificat(s)</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill mastery radar */}
      <Card className="border-stone-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <Target className="h-3.5 w-3.5" />
            Maîtrise des compétences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkillRadar skills={skills} />
        </CardContent>
      </Card>

      {/* Submission history */}
      {data.submissions && data.submissions.length > 0 && (
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold">Historique des soumissions ({data.submissions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Devoir</th>
                    <th className="text-right px-3 py-2 font-medium">Score</th>
                    <th className="text-center px-3 py-2 font-medium">Note</th>
                    <th className="text-right px-3 py-2 font-medium">UFL%</th>
                    <th className="text-right px-3 py-2 font-medium">PDI%</th>
                    <th className="text-right px-3 py-2 font-medium">€/jour</th>
                    <th className="text-right px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((sub: any, i: number) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="px-3 py-1.5 text-stone-900 truncate max-w-xs">{sub.assignment?.title || "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-bold">{sub.score}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge className={`text-[9px] ${sub.grade === "A" ? "bg-emerald-100 text-emerald-800" : sub.grade === "B" ? "bg-lime-100 text-lime-800" : sub.grade === "C" ? "bg-amber-100 text-amber-800" : sub.grade === "D" ? "bg-orange-100 text-orange-800" : "bg-rose-100 text-rose-800"}`}>{sub.grade}</Badge>
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(sub.coverageUFL, 0)}%</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(sub.coveragePDI, 0)}%</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{fmt(sub.totalCost, 2)}€</td>
                      <td className="px-3 py-1.5 text-right text-stone-500">{new Date(sub.submittedAt).toLocaleDateString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificates */}
      {data.certificates && data.certificates.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold flex items-center gap-2 text-emerald-800">
              <Award className="h-3.5 w-3.5" />
              Certificats obtenus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.certificates.map((cert: any, i: number) => (
              <div key={i} className="rounded-lg border border-emerald-300 bg-white p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-stone-900">{cert.assignmentTitle}</div>
                  <div className="text-[10px] text-stone-500">
                    Score: {cert.score}/100 · Note: {cert.grade} · {new Date(cert.issuedAt).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="text-[10px] text-stone-400 font-mono">N° {cert.certificateNumber}</div>
                </div>
                <Award className="h-8 w-8 text-emerald-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== SKILL RADAR ====================
function SkillRadar({ skills }: { skills: Array<{ label: string; value: number; color: string }> }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 85;
  const n = skills.length;
  const rings = [25, 50, 75, 100];

  const axisPoints = skills.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle), angle };
  });

  const dataPoints = skills.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const r = (s.value / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), value: s.value };
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 flex-shrink-0">
        {rings.map((ring, ri) => {
          const pts = skills.map((_, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const r = (ring / 100) * maxR;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(" ");
          return <polygon key={ri} points={pts} fill="none" stroke="#e7e5e4" strokeWidth="1" strokeDasharray={ring === 100 ? "0" : "2,2"} />;
        })}
        {axisPoints.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e7e5e4" strokeWidth="1" />)}
        <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(99, 102, 241, 0.2)" stroke="#6366f1" strokeWidth="2" />
        {dataPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={skills[i].color} stroke="white" strokeWidth="1" />)}
        {axisPoints.map((p, i) => {
          const labelR = maxR + 18;
          const lx = cx + labelR * Math.cos(p.angle);
          const ly = cy + labelR * Math.sin(p.angle);
          return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-stone-700 font-medium">{skills[i].label.split(" ")[0]}</text>;
        })}
      </svg>
      <div className="flex-1 space-y-1.5 w-full">
        {skills.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: s.color }} />
            <span className="flex-1 text-stone-700">{s.label}</span>
            <span className={`font-bold ${s.value >= 80 ? "text-emerald-700" : s.value >= 60 ? "text-amber-700" : "text-rose-700"}`}>{fmt(s.value, 0)}</span>
            <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.value}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================
function KPICard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="border-stone-200">
      <CardContent className="p-3">
        <div className="text-[10px] text-stone-500 uppercase tracking-wide flex items-center gap-1">{icon}{label}</div>
        <div className="text-xl font-bold text-stone-900 mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}

// ==================== CREATE ASSIGNMENT (existing, updated) ====================
function CreateAssignment({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: "", description: "", animalCategory: "",
    maxCostPerDay: "", minUFLCoverage: "95", minPDICoverage: "95",
    maxConcentratePct: "", weightCost: "40", weightCoverage: "40", weightFeasibility: "20",
    createdBy: "", dueDate: "",
    difficulty: "normal", topic: "general",
  });
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  const availableAnimals = alimData.animals.filter((a) => num(a.UFL) !== null);

  const submit = async () => {
    if (!form.title || !form.animalCategory) return;
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxCostPerDay: form.maxCostPerDay ? Number(form.maxCostPerDay) : null,
          minUFLCoverage: Number(form.minUFLCoverage),
          minPDICoverage: Number(form.minPDICoverage),
          maxConcentratePct: form.maxConcentratePct ? Number(form.maxConcentratePct) : null,
          weightCost: Number(form.weightCost), weightCoverage: Number(form.weightCoverage), weightFeasibility: Number(form.weightFeasibility),
        }),
      });
      if (res.ok) { const data = await res.json(); setCreatedCode(data.code); setTimeout(onCreated, 3000); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (createdCode) {
    return (
      <Card className="border-emerald-300 bg-emerald-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
          <h3 className="text-lg font-bold text-stone-900 mb-1">Devoir créé !</h3>
          <p className="text-sm text-stone-600 mb-3">Partagez ce code:</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <code className="text-2xl font-mono font-bold px-4 py-2 rounded-lg bg-stone-900 text-white">{createdCode}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(createdCode)}><Copy className="h-4 w-4 mr-1" /> Copier</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Créer un devoir personnalisé</CardTitle>
          <Button size="sm" variant="ghost" onClick={onCancel}>Annuler</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Titre *</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ex: Ration brebis gestantes hiver" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Professeur</Label>
            <Input value={form.createdBy} onChange={(e) => update("createdBy", e.target.value)} placeholder="Votre nom" className="h-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Description / Consignes</Label>
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Décrivez le contexte..." className="text-sm" rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Animal cible *</Label>
          <Select value={form.animalCategory} onValueChange={(v) => update("animalCategory", v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {availableAnimals.map((a, i) => <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Difficulty & topic */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Difficulté</Label>
            <Select value={form.difficulty} onValueChange={(v) => update("difficulty", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => <SelectItem key={d.id} value={d.id}>{d.stars} {d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Thématique</Label>
            <Select value={form.topic} onValueChange={(v) => update("topic", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.icon} {c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Coût max (€/jour)</Label>
            <Input type="number" step="0.01" value={form.maxCostPerDay} onChange={(e) => update("maxCostPerDay", e.target.value)} placeholder="ex: 0.80" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Min UFL (%)</Label>
            <Input type="number" value={form.minUFLCoverage} onChange={(e) => update("minUFLCoverage", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Min PDI (%)</Label>
            <Input type="number" value={form.minPDICoverage} onChange={(e) => update("minPDICoverage", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max concentré (%)</Label>
            <Input type="number" value={form.maxConcentratePct} onChange={(e) => update("maxConcentratePct", e.target.value)} placeholder="ex: 40" className="h-9" />
          </div>
        </div>
        <div className="flex justify-end pt-2 border-t border-stone-200">
          <Button onClick={submit} disabled={loading || !form.title || !form.animalCategory}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Créer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== SUBMISSIONS VIEW (existing, reused) ====================
function SubmissionsView({ code, onBack }: { code: string; onBack: () => void }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/classroom/assignment?code=${code}`)
      .then((r) => r.json())
      .then((data) => { setAssignment(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;
  if (!assignment) return <div className="text-center text-sm text-stone-500">Devoir introuvable</div>;

  const subs = assignment.submissions || [];

  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> Retour</Button>
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{assignment.title}</CardTitle>
          <CardDescription className="text-xs">Code: <code className="font-mono">{assignment.code}</code> · {subs.length} soumission(s)</CardDescription>
        </CardHeader>
      </Card>
      {subs.length > 0 && (
        <Card className="border-stone-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Étudiant</th>
                    <th className="text-right px-3 py-2 font-medium">Score</th>
                    <th className="text-center px-3 py-2 font-medium">Note</th>
                    <th className="text-right px-3 py-2 font-medium">UFL%</th>
                    <th className="text-right px-3 py-2 font-medium">PDI%</th>
                    <th className="text-right px-3 py-2 font-medium">€/jour</th>
                    <th className="text-right px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.sort((a, b) => (b.score || 0) - (a.score || 0)).map((s) => (
                    <tr key={s.id} className="border-b border-stone-100">
                      <td className="px-3 py-2 font-medium">{s.studentName}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{s.score}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[10px] ${s.grade === "A" ? "bg-emerald-100 text-emerald-800" : s.grade === "B" ? "bg-lime-100 text-lime-800" : s.grade === "C" ? "bg-amber-100 text-amber-800" : s.grade === "D" ? "bg-orange-100 text-orange-800" : "bg-rose-100 text-rose-800"}`}>{s.grade}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.coverageUFL.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.coveragePDI.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.totalCost.toFixed(2)}€</td>
                      <td className="px-3 py-2 text-right text-stone-500">{new Date(s.submittedAt).toLocaleDateString("fr-FR")}</td>
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

// ==================== STUDENT SUBMIT (existing, reused) ====================
function StudentSubmit({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [result, setResult] = useState<any>(null);

  const findAssignment = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/classroom/assignment?code=${code.toUpperCase()}`);
      if (res.ok) { const data = await res.json(); setAssignment(data); }
      else { alert("Devoir introuvable"); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const submitDemo = async () => {
    if (!assignment || !studentName) return;
    setLoading(true);
    const metrics = {
      totalUFL: 1.14, totalPDI: 146, totalPabs: 3.2, totalCaabs: 3.5, totalMS: 1.71,
      totalCost: 0.45, coverageUFL: 100, coveragePDI: 100, coveragePabs: 100, coverageCaabs: 100,
      concentratePct: 30, feasibleUM: true,
    };
    try {
      const res = await fetch("/api/classroom/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentCode: assignment.code, studentName, rationData: { demo: true }, metrics }),
      });
      if (res.ok) { const data = await res.json(); setResult(data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> Retour</Button>
      {!assignment && (
        <Card className="border-stone-200">
          <CardHeader><CardTitle className="text-sm">Entrer le code du devoir</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ex: AB3X9K" className="h-10 font-mono text-center text-lg tracking-wider" maxLength={6} />
              <Button onClick={findAssignment} disabled={loading || !code}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}</Button>
            </div>
          </CardContent>
        </Card>
      )}
      {assignment && !result && (
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="text-sm">{assignment.title}</CardTitle>
            <CardDescription className="text-xs">{assignment.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded bg-stone-50 p-2"><strong>Animal:</strong> {assignment.animalCategory.slice(0, 40)}</div>
              {assignment.maxCostPerDay && <div className="rounded bg-amber-50 p-2"><strong>Coût max:</strong> {assignment.maxCostPerDay}€/jour</div>}
              <div className="rounded bg-stone-50 p-2"><strong>Min UFL:</strong> {assignment.minUFLCoverage}%</div>
              <div className="rounded bg-stone-50 p-2"><strong>Min PDI:</strong> {assignment.minPDICoverage}%</div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Votre nom *</Label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Prénom Nom" className="h-9" />
            </div>
            <Button onClick={submitDemo} disabled={loading || !studentName} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Soumettre
            </Button>
          </CardContent>
        </Card>
      )}
      {result && (
        <Card className={`border-2 ${result.grade === "A" || result.grade === "B" ? "border-emerald-300" : result.grade === "F" ? "border-rose-300" : "border-amber-300"}`}>
          <CardContent className="p-6 text-center">
            <Award className={`h-12 w-12 mx-auto mb-3 ${result.grade === "A" ? "text-emerald-600" : result.grade === "F" ? "text-rose-600" : "text-amber-600"}`} />
            <h3 className="text-lg font-bold text-stone-900">Note: {result.grade}</h3>
            <div className="text-3xl font-bold my-2 text-stone-900">{result.score}/100</div>
            {result.certificate && (
              <Badge className="mb-3 bg-emerald-100 text-emerald-800"><Award className="h-3 w-3 mr-1" /> Certificat obtenu! N° {result.certificate.certificateNumber}</Badge>
            )}
            <div className="rounded-lg bg-stone-50 p-3 mt-3 text-left">
              <p className="text-xs text-stone-700 whitespace-pre-wrap">{result.feedback}</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={onBack}>Retour</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
