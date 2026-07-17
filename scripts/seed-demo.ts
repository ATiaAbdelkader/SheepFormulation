// Demo seed script — populates database with sample data for first-run experience
// Run with: bun run scripts/seed-demo.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo data...");

  // ---------- 1. Assignment Templates ----------
  console.log("  📚 Creating assignments...");

  const assignment1 = await db.assignment.create({
    data: {
      code: "DEMO01",
      title: "Brebis gestante — fin de gestation (démo)",
      description: "Formulez une ration pour 50 brebis gestantes doubles, 3 semaines avant agnelage. Budget: 0.80€/jour.",
      animalCategory: "Brebis  70 kg   Gestante    Double      Semaines - 3 à - 4",
      maxCostPerDay: 0.80,
      minPDICoverage: 95,
      minUFLCoverage: 95,
      minPabsCoverage: 90,
      minCaabsCoverage: 90,
      maxConcentratePct: 45,
      weightCost: 35,
      weightCoverage: 45,
      weightFeasibility: 20,
      createdBy: "AgriSkills Academy",
      difficulty: "normal",
      topic: "gestation",
    },
  });

  const assignment2 = await db.assignment.create({
    data: {
      code: "DEMO02",
      title: "Agneau engrais 30→40kg (démo)",
      description: "Optimisez la croissance d'agneaux à l'engrais. Objectif: 300g GMQ/jour sous 0.70€/jour.",
      animalCategory: "Agnelle  30 kg   Croissance",
      maxCostPerDay: 0.70,
      minPDICoverage: 95,
      minUFLCoverage: 95,
      maxConcentratePct: 60,
      weightCost: 45,
      weightCoverage: 35,
      weightFeasibility: 20,
      createdBy: "AgriSkills Academy",
      difficulty: "normal",
      topic: "engrais",
    },
  });

  // ---------- 2. Sample Submissions ----------
  console.log("  📝 Creating sample submissions...");

  const submissions = [
    { name: "Amel Benali", score: 92, grade: "A", assignmentCode: "DEMO01" },
    { name: "Karim Mansouri", score: 78, grade: "B", assignmentCode: "DEMO01" },
    { name: "Sara Cherif", score: 65, grade: "C", assignmentCode: "DEMO01" },
    { name: "Yacine Bouzid", score: 88, grade: "B", assignmentCode: "DEMO02" },
    { name: "Lina Hadj", score: 95, grade: "A", assignmentCode: "DEMO02" },
  ];

  for (const sub of submissions) {
    const assignment = sub.assignmentCode === "DEMO01" ? assignment1 : assignment2;
    await db.submission.create({
      data: {
        assignmentId: assignment.id,
        studentName: sub.name,
        rationData: JSON.stringify({ demo: true }),
        totalUFL: 1.14, totalPDI: 146, totalPabs: 3.2, totalCaabs: 3.5,
        totalMS: 1.71, totalCost: 0.45,
        coverageUFL: 100, coveragePDI: 100, coveragePabs: 100, coverageCaabs: 100,
        concentratePct: 30, feasibleUM: true,
        score: sub.score, grade: sub.grade,
        feedback: sub.score >= 90 ? "Excellent travail!" : "Bonne ration avec quelques améliorations.",
      },
    });

    // Create/update student records
    const existing = await db.student.findFirst({ where: { name: sub.name } });
    if (existing) {
      await db.student.update({
        where: { id: existing.id },
        data: {
          totalSubmissions: { increment: 1 },
          averageScore: (existing.averageScore + sub.score) / 2,
          bestScore: Math.max(existing.bestScore, sub.score),
          certificatesEarned: sub.grade === "A" ? existing.certificatesEarned + 1 : existing.certificatesEarned,
          lastSubmission: new Date(),
        },
      });
    } else {
      await db.student.create({
        data: {
          name: sub.name,
          totalSubmissions: 1,
          averageScore: sub.score,
          bestScore: sub.score,
          certificatesEarned: sub.grade === "A" ? 1 : 0,
          skillEnergy: 95 + Math.random() * 5,
          skillProtein: 90 + Math.random() * 8,
          skillMinerals: 85 + Math.random() * 10,
          skillCost: 75 + Math.random() * 15,
          skillFeasibility: 90 + Math.random() * 10,
          firstSubmission: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          lastSubmission: new Date(),
        },
      });
    }

    // Create certificate for A grades
    if (sub.grade === "A") {
      await db.certificate.create({
        data: {
          studentName: sub.name,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          score: sub.score,
          grade: sub.grade,
          certificateNumber: `OVI-DEMO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        },
      });
    }
  }

  // ---------- 3. Production Batches ----------
  console.log("  🏭 Creating production batches...");

  const batch1 = await db.productionBatch.create({
    data: {
      batchNumber: "BATCH-DEMO-001",
      formulaName: "Aliment brebis gestation 16%",
      formulaSnapshot: JSON.stringify({ ufl: 1.05, pdin: 90, ingredients: ["Blé", "Orge", "Tourteau colza"] }),
      targetQuantityKg: 500,
      actualQuantityKg: 495,
      status: "completed",
      productionLine: "Line A",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      notes: "Production nominale, qualité conforme",
    },
  });

  const batch2 = await db.productionBatch.create({
    data: {
      batchNumber: "BATCH-DEMO-002",
      formulaName: "Aliment agneau finition 14%",
      formulaSnapshot: JSON.stringify({ ufl: 1.10, pdin: 70, ingredients: ["Maïs", "Orge", "Soja 48"] }),
      targetQuantityKg: 800,
      status: "in_progress",
      productionLine: "Line A",
      startDate: new Date(),
      notes: "En cours de production",
    },
  });

  const batch3 = await db.productionBatch.create({
    data: {
      batchNumber: "BATCH-DEMO-003",
      formulaName: "Aliment brebis allaitante 18%",
      formulaSnapshot: JSON.stringify({ ufl: 1.08, pdin: 110, ingredients: ["Orge", "Maïs", "Tourteau soja"] }),
      targetQuantityKg: 600,
      status: "planned",
      productionLine: "Line B",
      notes: "Planifié pour la semaine prochaine",
    },
  });

  // ---------- 4. Lots ----------
  console.log("  📦 Creating lots...");

  // Ingredient lots
  const lot1 = await db.lot.create({
    data: {
      lotNumber: "LOT-IN-2024-001",
      type: "ingredient",
      feedName: "Blé tendre",
      quantityKg: 5000,
      supplier: "Coopérative Cèrès",
      receivedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      qualityStatus: "passed",
      notes: "Bon grain, humidité 13%",
    },
  });

  const lot2 = await db.lot.create({
    data: {
      lotNumber: "LOT-IN-2024-002",
      type: "ingredient",
      feedName: "Orge",
      quantityKg: 3000,
      supplier: "Coopérative Cèrès",
      receivedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      qualityStatus: "passed",
    },
  });

  const lot3 = await db.lot.create({
    data: {
      lotNumber: "LOT-IN-2024-003",
      type: "ingredient",
      feedName: "Tourteau de colza 35",
      quantityKg: 1500,
      supplier: "SONATRACH Agro",
      receivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      qualityStatus: "held",
      notes: "En attente d'analyse toxinologique",
    },
  });

  // Finished goods lot (linked to batch 1)
  const lotFG1 = await db.lot.create({
    data: {
      lotNumber: "LOT-FG-2024-001",
      type: "finished",
      feedName: "Aliment brebis gestation 16%",
      quantityKg: 495,
      qualityStatus: "passed",
      batchId: batch1.id,
      notes: "Conforme aux specs",
    },
  });

  // Lot genealogy: ingredient lots used in batch 1
  await db.lotGenealogy.create({
    data: { ingredientLotId: lot1.id, batchLotId: lotFG1.id, quantityUsedKg: 2000 },
  });
  await db.lotGenealogy.create({
    data: { ingredientLotId: lot2.id, batchLotId: lotFG1.id, quantityUsedKg: 1500 },
  });

  // ---------- 5. Sales Orders ----------
  console.log("  📋 Creating sales orders...");

  const order1 = await db.salesOrder.create({
    data: {
      orderNumber: "ORD-DEMO-001",
      customerName: "Ferme El Baraka",
      customerPhone: "+213 555 12 34 56",
      customerAddress: "Route de Tizi Ouzou, Km 5",
      product: "Aliment brebis gestation 16%",
      quantityKg: 500,
      unitPrice: 0.35,
      totalAmount: 175,
      status: "delivered",
      deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const order2 = await db.salesOrder.create({
    data: {
      orderNumber: "ORD-DEMO-002",
      customerName: "Élevage Beni Yenni",
      customerPhone: "+213 555 78 90 12",
      product: "Aliment brebis gestation 16%",
      quantityKg: 300,
      unitPrice: 0.35,
      totalAmount: 105,
      status: "shipped",
    },
  });

  // Shipments
  const shipment1 = await db.shipment.create({
    data: {
      shipmentNumber: "SHP-DEMO-001",
      orderId: order1.id,
      shipmentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      quantityKg: 500,
      status: "delivered",
      driver: "Mohamed A.",
      vehicle: "Camion T-456",
    },
  });

  // Link shipment to lot
  await db.shipmentLot.create({
    data: { shipmentId: shipment1.id, lotId: lotFG1.id, quantityKg: 495 },
  });

  const shipment2 = await db.shipment.create({
    data: {
      shipmentNumber: "SHP-DEMO-002",
      orderId: order2.id,
      shipmentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      quantityKg: 300,
      status: "in_transit",
      driver: "Ahmed B.",
      vehicle: "Camion T-789",
    },
  });

  await db.shipmentLot.create({
    data: { shipmentId: shipment2.id, lotId: lotFG1.id, quantityKg: 300 },
  });

  console.log("\n✅ Demo data seeded successfully!");
  console.log("   📚 2 assignments (codes: DEMO01, DEMO02)");
  console.log("   📝 5 submissions with grades and certificates");
  console.log("   🏭 3 production batches (1 completed, 1 in progress, 1 planned)");
  console.log("   📦 4 lots (3 ingredients, 1 finished) with genealogy links");
  console.log("   📋 2 sales orders with shipments linked to lots");
  console.log("\n💡 You can now test the recall traceability with lot: LOT-IN-2024-001");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
