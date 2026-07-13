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
  Copy, CheckCircle2, AlertCircle, Loader2, BookOpen, ChevronDown, ChevronRight,
} from "lucide-react";
import { alimData, num, fmt } from "@/lib/alim-data";

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

type View = "list" | "create" | "submissions" | "join";

export function AlimClassroom() {
  const [view, setView] = useState<View>("list");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classroom/assignment");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-700" />
          Mode Classe — AgriSkills Academy
        </h2>
        <p className="text-sm text-stone-500">
          Créez des devoirs de formulation de rations, partagez un code aux étudiants,
          et recevez les soumissions avec notation automatique.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => { setView("list"); fetchAssignments(); }}>
          <BookOpen className="h-4 w-4 mr-1" /> Devoirs
        </Button>
        <Button size="sm" variant={view === "create" ? "default" : "outline"} onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-1" /> Créer un devoir
        </Button>
        <Button size="sm" variant={view === "join" ? "default" : "outline"} onClick={() => setView("join")}>
          <Users className="h-4 w-4 mr-1" /> Étudiant: Soumettre
        </Button>
      </div>

      {view === "list" && (
        <AssignmentList assignments={assignments} loading={loading} onRefresh={fetchAssignments} onViewSubmissions={(code) => { setSelectedCode(code); setView("submissions"); }} />
      )}
      {view === "create" && (
        <CreateAssignment onCreated={() => { setView("list"); fetchAssignments(); }} />
      )}
      {view === "submissions" && (
        <SubmissionsView code={selectedCode} onBack={() => setView("list")} />
      )}
      {view === "join" && (
        <StudentSubmit onBack={() => setView("list")} />
      )}
    </div>
  );
}

// ---------- Assignment List ----------
function AssignmentList({ assignments, loading, onRefresh, onViewSubmissions }: any) {
  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;
  }

  if (assignments.length === 0) {
    return (
      <Card className="border-stone-200 bg-stone-50">
        <CardContent className="p-8 text-center text-sm text-stone-500">
          <GraduationCap className="h-10 w-10 mx-auto mb-2 text-stone-400" />
          Aucun devoir créé pour le moment.
          <br />
          <span className="text-xs">Cliquez sur &quot;Créer un devoir&quot; pour commencer.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((a: Assignment) => (
        <Card key={a.id} className="border-stone-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-stone-900">{a.title}</h3>
                  <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 font-mono">{a.code}</Badge>
                  {a.isActive ? (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-800">Actif</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[9px]">Clôturé</Badge>
                  )}
                </div>
                <p className="text-xs text-stone-600 mb-1.5">{a.description}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px] text-stone-500">
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">Animal: {a.animalCategory.slice(0, 40)}</span>
                  {a.maxCostPerDay && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">Max {a.maxCostPerDay}€/jour</span>}
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">Min UFL: {a.minUFLCoverage}%</span>
                  <span className="px-1.5 py-0.5 rounded bg-stone-100">Min PDI: {a.minPDICoverage}%</span>
                  {a.maxConcentratePct && <span className="px-1.5 py-0.5 rounded bg-stone-100">Max conc: {a.maxConcentratePct}%</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  <Users className="h-3 w-3 mr-1" />
                  {a._count?.submissions || a.submissions?.length || 0} soumission(s)
                </Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onViewSubmissions(a.code)}>
                    <Eye className="h-3 w-3 mr-1" /> Voir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-stone-400 hover:text-rose-600"
                    onClick={async () => {
                      if (confirm("Supprimer ce devoir ?")) {
                        await fetch(`/api/classroom/assignment?id=${a.id}`, { method: "DELETE" });
                        onRefresh();
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            {/* Copy code */}
            <div className="mt-2 pt-2 border-t border-stone-100 flex items-center gap-2">
              <span className="text-[10px] text-stone-500">Code à partager:</span>
              <code className="text-xs font-mono px-2 py-0.5 rounded bg-stone-900 text-white">{a.code}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px]"
                onClick={() => navigator.clipboard.writeText(a.code)}
              >
                <Copy className="h-3 w-3 mr-1" /> Copier
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------- Create Assignment ----------
function CreateAssignment({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    animalCategory: "",
    maxCostPerDay: "",
    minUFLCoverage: "95",
    minPDICoverage: "95",
    maxConcentratePct: "",
    weightCost: "40",
    weightCoverage: "40",
    weightFeasibility: "20",
    createdBy: "",
    dueDate: "",
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
          weightCost: Number(form.weightCost),
          weightCoverage: Number(form.weightCoverage),
          weightFeasibility: Number(form.weightFeasibility),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedCode(data.code);
        setTimeout(() => onCreated(), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (createdCode) {
    return (
      <Card className="border-emerald-300 bg-emerald-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-600" />
          <h3 className="text-lg font-bold text-stone-900 mb-1">Devoir créé !</h3>
          <p className="text-sm text-stone-600 mb-3">Partagez ce code avec vos étudiants:</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <code className="text-2xl font-mono font-bold px-4 py-2 rounded-lg bg-stone-900 text-white">{createdCode}</code>
            <Button size="sm" onClick={() => navigator.clipboard.writeText(createdCode)}>
              <Copy className="h-4 w-4 mr-1" /> Copier
            </Button>
          </div>
          <p className="text-xs text-stone-500">Redirection en cours...</p>
        </CardContent>
      </Card>
    );
  }

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Créer un devoir</CardTitle>
        <CardDescription className="text-xs">Définissez les contraintes et critères de notation</CardDescription>
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
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Décrivez le contexte et les attentes..." className="text-sm" rows={2} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Animal cible *</Label>
          <Select value={form.animalCategory} onValueChange={(v) => update("animalCategory", v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
            <SelectContent className="max-h-72">
              {availableAnimals.map((a, i) => (
                <SelectItem key={i} value={a.category} className="text-xs">{a.category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

        {/* Grading weights */}
        <div>
          <Label className="text-xs font-medium text-stone-700">Pondération de la note</Label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            <div>
              <Label className="text-[10px] text-stone-500">Coût ({form.weightCost}%)</Label>
              <Input type="number" min="0" max="100" value={form.weightCost} onChange={(e) => update("weightCost", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-stone-500">Couverture ({form.weightCoverage}%)</Label>
              <Input type="number" min="0" max="100" value={form.weightCoverage} onChange={(e) => update("weightCoverage", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-stone-500">Faisabilité ({form.weightFeasibility}%)</Label>
              <Input type="number" min="0" max="100" value={form.weightFeasibility} onChange={(e) => update("weightFeasibility", e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-stone-200">
          <Button onClick={submit} disabled={loading || !form.title || !form.animalCategory}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            Créer le devoir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Submissions View ----------
function SubmissionsView({ code, onBack }: { code: string; onBack: () => void }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/classroom/assignment?code=${code}`)
      .then((r) => r.json())
      .then((data) => { setAssignment(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-stone-400" /></div>;
  if (!assignment) return <div className="text-center text-sm text-stone-500">Devoir introuvable</div>;

  const subs = assignment.submissions || [];
  // Stats
  const avgScore = subs.length > 0 ? subs.reduce((s, x) => s + (x.score || 0), 0) / subs.length : 0;
  const gradeDist: Record<string, number> = {};
  subs.forEach((s) => { if (s.grade) gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1; });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> Retour</Button>
      </div>

      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{assignment.title}</CardTitle>
          <CardDescription className="text-xs">
            Code: <code className="font-mono">{assignment.code}</code> · {subs.length} soumission(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-stone-50 p-2 text-center">
              <div className="text-[10px] text-stone-500 uppercase">Soumissions</div>
              <div className="text-lg font-bold text-stone-900">{subs.length}</div>
            </div>
            <div className="rounded-lg bg-stone-50 p-2 text-center">
              <div className="text-[10px] text-stone-500 uppercase">Score moyen</div>
              <div className="text-lg font-bold text-stone-900">{fmt(avgScore, 0)}/100</div>
            </div>
            <div className="rounded-lg bg-stone-50 p-2 text-center">
              <div className="text-[10px] text-stone-500 uppercase">Note A</div>
              <div className="text-lg font-bold text-emerald-700">{gradeDist["A"] || 0}</div>
            </div>
            <div className="rounded-lg bg-stone-50 p-2 text-center">
              <div className="text-[10px] text-stone-500 uppercase">Note F</div>
              <div className="text-lg font-bold text-rose-700">{gradeDist["F"] || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions table */}
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
                    <th className="text-center px-3 py-2 font-medium">UEM</th>
                    <th className="text-right px-3 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.sort((a, b) => (b.score || 0) - (a.score || 0)).map((s) => (
                    <tr key={s.id} className="border-b border-stone-100">
                      <td className="px-3 py-2 text-stone-900 font-medium">{s.studentName}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold">{s.score}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge className={`text-[10px] ${
                          s.grade === "A" ? "bg-emerald-100 text-emerald-800"
                          : s.grade === "B" ? "bg-lime-100 text-lime-800"
                          : s.grade === "C" ? "bg-amber-100 text-amber-800"
                          : s.grade === "D" ? "bg-orange-100 text-orange-800"
                          : "bg-rose-100 text-rose-800"
                        }`}>{s.grade}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.coverageUFL.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.coveragePDI.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.totalCost.toFixed(2)}€</td>
                      <td className="px-3 py-2 text-center">
                        {s.feasibleUM ? <CheckCircle2 className="h-3 w-3 text-emerald-600 mx-auto" /> : <AlertCircle className="h-3 w-3 text-rose-600 mx-auto" />}
                      </td>
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

// ---------- Student Submit ----------
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
      if (res.ok) {
        const data = await res.json();
        setAssignment(data);
      } else {
        alert("Devoir introuvable. Vérifiez le code.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitDemo = async () => {
    if (!assignment || !studentName) return;
    setLoading(true);
    // Demo: submit a sample ration
    const metrics = {
      totalUFL: 1.14, totalPDI: 146, totalPabs: 3.2, totalCaabs: 3.5, totalMS: 1.71,
      totalCost: 0.45, coverageUFL: 100, coveragePDI: 100, coveragePabs: 100, coverageCaabs: 100,
      concentratePct: 30, feasibleUM: true,
    };
    try {
      const res = await fetch("/api/classroom/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentCode: assignment.code,
          studentName,
          rationData: { demo: true },
          metrics,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180" /> Retour</Button>

      {!assignment && (
        <Card className="border-stone-200">
          <CardHeader><CardTitle className="text-sm">Entrer le code du devoir</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ex: AB3X9K"
                className="h-10 font-mono text-center text-lg tracking-wider"
                maxLength={6}
              />
              <Button onClick={findAssignment} disabled={loading || !code}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechercher"}
              </Button>
            </div>
            <p className="text-xs text-stone-500">Le code vous a été communiqué par votre professeur.</p>
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
              {assignment.maxConcentratePct && <div className="rounded bg-stone-50 p-2"><strong>Max conc:</strong> {assignment.maxConcentratePct}%</div>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Votre nom *</Label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Prénom Nom" className="h-9" />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Instructions:</strong> Construisez votre ration dans le module &quot;Ration&quot;,
                puis revenez ici pour soumettre. (Démo: un clic sur &quot;Soumettre&quot; envoie une ration d&apos;exemple.)
              </p>
            </div>

            <Button onClick={submitDemo} disabled={loading || !studentName} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Soumettre la ration
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
            <div className="rounded-lg bg-stone-50 p-3 mt-3 text-left">
              <p className="text-xs text-stone-700 whitespace-pre-wrap">{result.feedback}</p>
            </div>
            <Button variant="outline" className="mt-4" onClick={onBack}>Retour aux devoirs</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
