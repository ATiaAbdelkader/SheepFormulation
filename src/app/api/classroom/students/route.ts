import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: List all students or get a specific student's profile
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (name) {
      // Get specific student with their submissions
      const student = await db.student.findFirst({ where: { name } });
      if (!student) {
        return NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });
      }
      const submissions = await db.submission.findMany({
        where: { studentName: name },
        orderBy: { submittedAt: "desc" },
        include: { assignment: true },
      });
      const certificates = await db.certificate.findMany({
        where: { studentName: name },
        orderBy: { issuedAt: "desc" },
      });
      return NextResponse.json({ student, submissions, certificates });
    }

    // List all students
    const students = await db.student.findMany({
      orderBy: { averageScore: "desc" },
    });
    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
