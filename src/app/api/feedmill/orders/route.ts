import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const orders = await db.salesOrder.findMany({
      orderBy: { orderDate: "desc" },
      include: { _count: { select: { shipments: true } } },
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerPhone, customerAddress, product, quantityKg, unitPrice, notes } = body;

    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    const totalAmount = (quantityKg || 0) * (unitPrice || 0);

    const order = await db.salesOrder.create({
      data: {
        orderNumber,
        customerName,
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        product,
        quantityKg: quantityKg || 0,
        unitPrice: unitPrice || 0,
        totalAmount,
        notes: notes || null,
      },
    });

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.shipmentLot.deleteMany({ where: { shipment: { orderId: id } } });
    await db.shipment.deleteMany({ where: { orderId: id } });
    await db.salesOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
