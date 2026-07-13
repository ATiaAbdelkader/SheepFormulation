import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST: Create a new assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, description, animalCategory,
      maxCostPerDay, minPDICoverage, minUFLCoverage,
      minPabsCoverage, minCaabsCoverage, maxConcentratePct,
      weightCost, weightCoverage, weightFeasibility,
      createdBy, dueDate,
    } = body;

    if (!title || !animalCategory) {
      return NextResponse.json({ error: "Titre et catégorie animal requis" }, { status: 400 });
    }

    // Generate unique 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const assignment = await db.assignment.create({
      data: {
        code,
        title,
        description: description || "",
        animalCategory,
        maxCostPerDay: maxCostPerDay || null,
        minPDICoverage: minPDICoverage || 95,
        minUFLCoverage: minUFLCoverage || 95,
        minPabsCoverage: minPabsCoverage || null,
        minCaabsCoverage: minCaabsCoverage || null,
        maxConcentratePct: maxConcentratePct || null,
        weightCost: weightCost || 40,
        weightCoverage: weightCoverage || 40,
        weightFeasibility: weightFeasibility || 20,
        createdBy: createdBy || "Professeur",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json(assignment);
  } catch (error: any) {
    console.error("[Classroom API] Error creating assignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: List all assignments or get by code
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (code) {
      const assignment = await db.assignment.findUnique({
        where: { code: code.toUpperCase() },
        include: { submissions: { orderBy: { submittedAt: "desc" } } },
      });
      if (!assignment) {
        return NextResponse.json({ error: "Devoir introuvable" }, { status: 404 });
      }
      return NextResponse.json(assignment);
    }

    const assignments = await db.assignment.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
    return NextResponse.json(assignments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete an assignment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

    await db.submission.deleteMany({ where: { assignmentId: id } });
    await db.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
