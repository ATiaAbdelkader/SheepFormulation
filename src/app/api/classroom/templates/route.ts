import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/templates";

// GET: List all templates (from library + DB)
export async function GET() {
  try {
    // Return the static templates library
    return NextResponse.json(TEMPLATES.map((t, i) => ({ id: `tpl-${i}`, ...t })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create an assignment from a template
export async function POST(req: NextRequest) {
  try {
    const { templateIndex, createdBy } = await req.json();

    if (templateIndex < 0 || templateIndex >= TEMPLATES.length) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    const template = TEMPLATES[templateIndex];
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const assignment = await db.assignment.create({
      data: {
        code,
        title: template.title,
        description: template.description,
        animalCategory: template.animalCategory,
        maxCostPerDay: template.maxCostPerDay,
        minPDICoverage: template.minPDICoverage,
        minUFLCoverage: template.minUFLCoverage,
        minPabsCoverage: template.minPabsCoverage,
        minCaabsCoverage: template.minCaabsCoverage,
        maxConcentratePct: template.maxConcentratePct,
        weightCost: template.weightCost,
        weightCoverage: template.weightCoverage,
        weightFeasibility: template.weightFeasibility,
        createdBy: createdBy || "Professeur",
        difficulty: template.difficulty,
        topic: template.category,
      },
    });

    return NextResponse.json({ assignment, template });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
