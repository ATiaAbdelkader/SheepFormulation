import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "ingredient" or "finished"
    const lotNumber = searchParams.get("lotNumber"); // for recall analysis

    // Recall analysis: find all shipments containing a specific lot
    if (lotNumber) {
      const lot = await db.lot.findUnique({
        where: { lotNumber },
        include: {
          ingredientLots: { include: { batchLot: { include: { batch: true, shipments: { include: { shipment: { include: { order: true } } } } } } } },
          batchLots: { include: { ingredientLot: true } },
          shipments: { include: { shipment: { include: { order: true } } } },
        },
      });

      if (!lot) return NextResponse.json({ error: "Lot introuvable" }, { status: 404 });

      // Trace forward: ingredient lot → batches → shipments → customers
      const affectedBatches = lot.ingredientLots.map((g) => ({
        batchLotNumber: g.batchLot.lotNumber,
        batchNumber: g.batchLot.batch?.batchNumber || "—",
        formulaName: g.batchLot.feedName,
        quantityUsed: g.quantityUsedKg,
      }));

      const affectedShipments = lot.shipments.map((sl) => ({
        shipmentNumber: sl.shipment.shipmentNumber,
        customer: sl.shipment.order?.customerName || "—",
        quantity: sl.quantityKg,
        shipmentDate: sl.shipment.shipmentDate,
      }));

      // Also trace through batches that used this lot as ingredient
      const downstreamShipments = lot.ingredientLots.flatMap((g) =>
        g.batchLot.shipments.map((sl) => ({
          shipmentNumber: sl.shipment.shipmentNumber,
          customer: sl.shipment.order?.customerName || "—",
          quantity: sl.quantityKg,
          shipmentDate: sl.shipment.shipmentDate,
          viaBatch: g.batchLot.lotNumber,
        }))
      );

      return NextResponse.json({
        lot,
        affectedBatches,
        affectedShipments,
        downstreamShipments,
        recallSummary: {
          totalBatchesAffected: affectedBatches.length,
          totalShipmentsAffected: affectedShipments.length + downstreamShipments.length,
          customersAffected: new Set([...affectedShipments, ...downstreamShipments].map((s) => s.customer)).size,
        },
      });
    }

    // Regular lot listing
    const where: any = {};
    if (type) where.type = type;

    const lots = await db.lot.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        batch: true,
        _count: { select: { ingredientLots: true, batchLots: true, shipments: true } },
      },
    });

    return NextResponse.json(lots);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feedName, type, quantityKg, supplier, qualityStatus, notes, linkToBatchId, ingredientLotId, quantityUsedKg } = body;

    const lotNumber = `LOT-${type === "ingredient" ? "IN" : "FG"}-${Date.now().toString().slice(-8)}`;

    const lot = await db.lot.create({
      data: {
        lotNumber,
        type: type || "ingredient",
        feedName,
        quantityKg: quantityKg || 0,
        supplier: supplier || null,
        qualityStatus: qualityStatus || "pending",
        notes: notes || null,
        receivedDate: type === "ingredient" ? new Date() : null,
        ...(linkToBatchId && { batchId: linkToBatchId }),
      },
    });

    // If linking ingredient lot to a batch lot (genealogy)
    if (ingredientLotId && linkToBatchId) {
      const batchLot = await db.lot.findFirst({ where: { batchId: linkToBatchId, type: "finished" } });
      if (batchLot) {
        await db.lotGenealogy.create({
          data: {
            ingredientLotId,
            batchLotId: batchLot.id,
            quantityUsedKg: quantityUsedKg || 0,
          },
        });
      }
    }

    return NextResponse.json(lot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, qualityStatus, notes } = body;

    const lot = await db.lot.update({
      where: { id },
      data: {
        ...(qualityStatus && { qualityStatus }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(lot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.lotGenealogy.deleteMany({ where: { OR: [{ ingredientLotId: id }, { batchLotId: id }] } });
    await db.shipmentLot.deleteMany({ where: { lotId: id } });
    await db.lot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
