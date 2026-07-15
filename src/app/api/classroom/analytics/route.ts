import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Class analytics for teachers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");

    let submissions;
    if (assignmentId) {
      submissions = await db.submission.findMany({
        where: { assignmentId },
        orderBy: { submittedAt: "desc" },
      });
    } else {
      submissions = await db.submission.findMany({
        orderBy: { submittedAt: "desc" },
        take: 500, // last 500 submissions
      });
    }

    if (submissions.length === 0) {
      return NextResponse.json({
        totalSubmissions: 0,
        averageScore: 0,
        gradeDistribution: {},
        topicPerformance: {},
        commonIssues: [],
        topStudents: [],
        strugglingStudents: [],
      });
    }

    // Overall stats
    const totalSubs = submissions.length;
    const avgScore = submissions.reduce((s, sub) => s + (sub.score || 0), 0) / totalSubs;

    // Grade distribution
    const gradeDist: Record<string, number> = {};
    submissions.forEach((s) => { if (s.grade) gradeDist[s.grade] = (gradeDist[s.grade] || 0) + 1; });

    // Coverage analysis (common weaknesses)
    const avgUFL = submissions.reduce((s, sub) => s + sub.coverageUFL, 0) / totalSubs;
    const avgPDI = submissions.reduce((s, sub) => s + sub.coveragePDI, 0) / totalSubs;
    const avgPabs = submissions.reduce((s, sub) => s + sub.coveragePabs, 0) / totalSubs;
    const avgCaabs = submissions.reduce((s, sub) => s + sub.coverageCaabs, 0) / totalSubs;
    const feasibleRate = submissions.filter((s) => s.feasibleUM).length / totalSubs * 100;

    // Identify common issues
    const commonIssues: Array<{ issue: string; percentage: number; severity: string }> = [];
    if (avgUFL < 95) commonIssues.push({ issue: "Couverture UFL insuffisante", percentage: submissions.filter((s) => s.coverageUFL < 95).length / totalSubs * 100, severity: avgUFL < 85 ? "high" : "moderate" });
    if (avgPDI < 95) commonIssues.push({ issue: "Couverture PDI insuffisante", percentage: submissions.filter((s) => s.coveragePDI < 95).length / totalSubs * 100, severity: avgPDI < 85 ? "high" : "moderate" });
    if (avgPabs < 90) commonIssues.push({ issue: "Déficit en phosphore (Pabs)", percentage: submissions.filter((s) => s.coveragePabs < 90).length / totalSubs * 100, severity: avgPabs < 80 ? "high" : "moderate" });
    if (avgCaabs < 90) commonIssues.push({ issue: "Déficit en calcium (Caabs)", percentage: submissions.filter((s) => s.coverageCaabs < 90).length / totalSubs * 100, severity: avgCaabs < 80 ? "high" : "moderate" });
    if (feasibleRate < 80) commonIssues.push({ issue: "Capacité d'ingestion dépassée (UEM)", percentage: (100 - feasibleRate), severity: feasibleRate < 60 ? "high" : "moderate" });

    // Per-student performance
    const studentMap = new Map<string, { name: string; scores: number[]; subs: number }>();
    submissions.forEach((s) => {
      const existing = studentMap.get(s.studentName) || { name: s.studentName, scores: [], subs: 0 };
      existing.scores.push(s.score || 0);
      existing.subs++;
      studentMap.set(s.studentName, existing);
    });

    const studentPerf = Array.from(studentMap.values()).map((s) => ({
      name: s.name,
      avgScore: s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length,
      bestScore: Math.max(...s.scores),
      totalSubs: s.subs,
    }));

    const topStudents = [...studentPerf].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
    const strugglingStudents = [...studentPerf].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

    return NextResponse.json({
      totalSubmissions: totalSubs,
      averageScore: avgScore,
      gradeDistribution: gradeDist,
      coverageAverages: { UFL: avgUFL, PDI: avgPDI, Pabs: avgPabs, Caabs: avgCaabs, feasibility: feasibleRate },
      commonIssues,
      topStudents,
      strugglingStudents,
      studentCount: studentMap.size,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
