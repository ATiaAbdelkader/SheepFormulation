import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Global leaderboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all"; // all, week, month

    let dateFilter: Date | null = null;
    if (period === "week") {
      dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "month") {
      dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all students
    const students = await db.student.findMany({
      orderBy: { averageScore: "desc" },
    });

    // If period filter, recompute from submissions
    let leaderboard;
    if (dateFilter) {
      const submissions = await db.submission.findMany({
        where: { submittedAt: { gte: dateFilter } },
        orderBy: { score: "desc" },
      });

      // Group by student
      const studentMap = new Map<string, { name: string; scores: number[]; bestScore: number; submissions: number }>();
      submissions.forEach((s) => {
        const existing = studentMap.get(s.studentName) || { name: s.studentName, scores: [], bestScore: 0, submissions: 0 };
        existing.scores.push(s.score || 0);
        existing.bestScore = Math.max(existing.bestScore, s.score || 0);
        existing.submissions++;
        studentMap.set(s.studentName, existing);
      });

      leaderboard = Array.from(studentMap.values())
        .map((s) => ({
          name: s.name,
          averageScore: s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length,
          bestScore: s.bestScore,
          totalSubmissions: s.submissions,
        }))
        .sort((a, b) => b.averageScore - a.averageScore);
    } else {
      leaderboard = students.map((s) => ({
        name: s.name,
        averageScore: s.averageScore,
        bestScore: s.bestScore,
        totalSubmissions: s.totalSubmissions,
        certificatesEarned: s.certificatesEarned,
        skillEnergy: s.skillEnergy,
        skillProtein: s.skillProtein,
        skillMinerals: s.skillMinerals,
        skillCost: s.skillCost,
        skillFeasibility: s.skillFeasibility,
      }));
    }

    return NextResponse.json(leaderboard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
