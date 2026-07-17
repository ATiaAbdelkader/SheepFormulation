import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const batches = await db.productionBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { lots: true } } },
    });
    return NextResponse.json(batches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formulaName, formulaSnapshot, targetQuantityKg, productionLine, notes } = body;

    const batchNumber = `BATCH-${Date.now().toString().slice(-8)}`;

    const batch = await db.productionBatch.create({
      data: {
        batchNumber,
        formulaName,
        formulaSnapshot: JSON.stringify(formulaSnapshot || {}),
        targetQuantityKg: targetQuantityKg || 0,
        productionLine: productionLine || "Line A",
        notes: notes || null,
      },
    });

    // Auto-create a finished goods lot for this batch
    const lotNumber = `LOT-FG-${Date.now().toString().slice(-8)}`;
    const lot = await db.lot.create({
      data: {
        lotNumber,
        type: "finished",
        feedName: formulaName,
        quantityKg: targetQuantityKg || 0,
        qualityStatus: "pending",
        batchId: batch.id,
      },
    });

    return NextResponse.json({ batch, lot });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, actualQuantityKg, startDate, endDate } = body;

    const batch = await db.productionBatch.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(actualQuantityKg !== undefined && { actualQuantityKg }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
    });

    return NextResponse.json(batch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.lot.deleteMany({ where: { batchId: id } });
    await db.productionBatch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
