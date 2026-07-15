import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Auto-grading engine
function gradeSubmission(
  metrics: {
    coverageUFL: number;
    coveragePDI: number;
    coveragePabs: number;
    coverageCaabs: number;
    totalCost: number;
    concentratePct: number;
    feasibleUM: boolean;
  },
  assignment: {
    maxCostPerDay: number | null;
    minPDICoverage: number;
    minUFLCoverage: number;
    minPabsCoverage: number | null;
    minCaabsCoverage: number | null;
    maxConcentratePct: number | null;
    weightCost: number;
    weightCoverage: number;
    weightFeasibility: number;
  }
): { score: number; grade: string; feedback: string } {
  let score = 0;
  const feedback: string[] = [];

  // 1. Coverage score (weight: weightCoverage)
  const coverageScores = [metrics.coverageUFL, metrics.coveragePDI];
  if (assignment.minPabsCoverage) coverageScores.push(metrics.coveragePabs);
  if (assignment.minCaabsCoverage) coverageScores.push(metrics.coverageCaabs);

  const avgCoverage = coverageScores.reduce((s, c) => s + Math.min(100, c), 0) / coverageScores.length;
  const coverageScore = Math.min(100, avgCoverage);
  score += (coverageScore * assignment.weightCoverage) / 100;

  if (metrics.coverageUFL < assignment.minUFLCoverage) {
    feedback.push(`UFL insuffisant: ${metrics.coverageUFL.toFixed(0)}% (minimum requis: ${assignment.minUFLCoverage}%)`);
  }
  if (metrics.coveragePDI < assignment.minPDICoverage) {
    feedback.push(`PDI insuffisant: ${metrics.coveragePDI.toFixed(0)}% (minimum requis: ${assignment.minPDICoverage}%)`);
  }

  // 2. Cost score (weight: weightCost)
  let costScore = 100;
  if (assignment.maxCostPerDay && metrics.totalCost > assignment.maxCostPerDay) {
    const overrun = (metrics.totalCost - assignment.maxCostPerDay) / assignment.maxCostPerDay;
    costScore = Math.max(0, 100 - overrun * 200);
    feedback.push(`Coût dépassé: ${metrics.totalCost.toFixed(2)}€/jour (maximum: ${assignment.maxCostPerDay}€)`);
  } else if (assignment.maxCostPerDay) {
    // Reward being under budget
    const savings = (assignment.maxCostPerDay - metrics.totalCost) / assignment.maxCostPerDay;
    costScore = Math.min(100, 80 + savings * 50);
  }
  score += (costScore * assignment.weightCost) / 100;

  // 3. Feasibility score (weight: weightFeasibility)
  let feasibilityScore = 100;
  if (!metrics.feasibleUM) {
    feasibilityScore = 30;
    feedback.push("Capacité d'ingestion dépassée — la ration est irréaliste");
  }
  if (assignment.maxConcentratePct && metrics.concentratePct > assignment.maxConcentratePct) {
    feasibilityScore *= 0.7;
    feedback.push(`Part de concentré trop élevée: ${metrics.concentratePct.toFixed(0)}% (maximum: ${assignment.maxConcentratePct}%)`);
  }
  score += (feasibilityScore * assignment.weightFeasibility) / 100;

  // Grade letter
  const finalScore = Math.round(Math.min(100, Math.max(0, score)));
  let grade = "F";
  if (finalScore >= 90) grade = "A";
  else if (finalScore >= 80) grade = "B";
  else if (finalScore >= 70) grade = "C";
  else if (finalScore >= 60) grade = "D";

  if (feedback.length === 0) {
    feedback.push("Excellent travail! Tous les critères sont remplis.");
  } else if (finalScore >= 70) {
    feedback.unshift("Bonne ration avec quelques points d'amélioration:");
  } else {
    feedback.unshift("Ration à améliorer:");
  }

  return { score: finalScore, grade, feedback: feedback.join("\n") };
}

// POST: Submit a ration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentCode, studentName, studentEmail, rationData, metrics } = body;

    if (!assignmentCode || !studentName || !metrics) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const assignment = await db.assignment.findUnique({
      where: { code: assignmentCode.toUpperCase() },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 });
    }

    // Grade the submission
    const { score, grade, feedback } = gradeSubmission(metrics, {
      maxCostPerDay: assignment.maxCostPerDay,
      minPDICoverage: assignment.minPDICoverage,
      minUFLCoverage: assignment.minUFLCoverage,
      minPabsCoverage: assignment.minPabsCoverage,
      minCaabsCoverage: assignment.minCaabsCoverage,
      maxConcentratePct: assignment.maxConcentratePct,
      weightCost: assignment.weightCost,
      weightCoverage: assignment.weightCoverage,
      weightFeasibility: assignment.weightFeasibility,
    });

    const submission = await db.submission.create({
      data: {
        assignmentId: assignment.id,
        studentName,
        studentEmail: studentEmail || null,
        rationData: JSON.stringify(rationData),
        totalUFL: metrics.totalUFL,
        totalPDI: metrics.totalPDI,
        totalPabs: metrics.totalPabs,
        totalCaabs: metrics.totalCaabs,
        totalMS: metrics.totalMS,
        totalCost: metrics.totalCost,
        coverageUFL: metrics.coverageUFL,
        coveragePDI: metrics.coveragePDI,
        coveragePabs: metrics.coveragePabs,
        coverageCaabs: metrics.coverageCaabs,
        concentratePct: metrics.concentratePct,
        feasibleUM: metrics.feasibleUM,
        score,
        grade,
        feedback,
      },
    });

    // Update or create Student record with skill mastery
    const existingStudent = await db.student.findFirst({ where: { name: studentName } });
    const allSubmissions = await db.submission.findMany({ where: { studentName } });
    const totalSubs = allSubmissions.length;
    const avgScore = allSubmissions.reduce((s, sub) => s + (sub.score || 0), 0) / totalSubs;
    const bestScore = Math.max(...allSubmissions.map((s) => s.score || 0));

    // Skill mastery: average coverage per dimension
    const skillEnergy = allSubmissions.reduce((s, sub) => s + sub.coverageUFL, 0) / totalSubs;
    const skillProtein = allSubmissions.reduce((s, sub) => s + sub.coveragePDI, 0) / totalSubs;
    const skillMinerals = allSubmissions.reduce((s, sub) => s + (sub.coveragePabs + sub.coverageCaabs) / 2, 0) / totalSubs;
    // Cost skill: higher score = better cost management (inverted: lower cost relative to max = higher skill)
    const maxCosts = allSubmissions.map((s) => s.totalCost);
    const minCost = Math.min(...maxCosts);
    const maxCost = Math.max(...maxCosts);
    const skillCost = maxCost > minCost ? 100 - ((metrics.totalCost - minCost) / (maxCost - minCost)) * 100 : 100;
    const skillFeasibility = allSubmissions.filter((s) => s.feasibleUM).length / totalSubs * 100;

    // Certificate for A grade (score >= 90)
    let certificate: { certificateNumber: string } | null = null;
    if (score >= 90) {
      const certNumber = `OVI-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      certificate = await db.certificate.create({
        data: {
          studentName,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          score,
          grade,
          certificateNumber: certNumber,
        },
      });
      certificate = { certificateNumber: certNumber };
    }

    if (existingStudent) {
      await db.student.update({
        where: { id: existingStudent.id },
        data: {
          email: studentEmail || existingStudent.email,
          totalSubmissions: totalSubs,
          averageScore: avgScore,
          bestScore,
          certificatesEarned: score >= 90 ? existingStudent.certificatesEarned + 1 : existingStudent.certificatesEarned,
          skillEnergy,
          skillProtein,
          skillMinerals,
          skillCost,
          skillFeasibility,
          lastSubmission: new Date(),
        },
      });
    } else {
      await db.student.create({
        data: {
          name: studentName,
          email: studentEmail || null,
          totalSubmissions: totalSubs,
          averageScore: avgScore,
          bestScore,
          certificatesEarned: score >= 90 ? 1 : 0,
          skillEnergy,
          skillProtein,
          skillMinerals,
          skillCost,
          skillFeasibility,
          firstSubmission: new Date(),
          lastSubmission: new Date(),
        },
      });
    }

    return NextResponse.json({ submission, score, grade, feedback, certificate });
  } catch (error: any) {
    console.error("[Submit API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
