import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { alimData } from "@/lib/alim-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { message, animalCategory } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message requis" }, { status: 400 });
    }

    // Initialize Z.ai SDK
    const zai = await ZAI.create();

    // Build context with available feeds and animals
    const fourragesList = alimData.fourrages
      .filter((f) => f.ufl !== null && f.ufl !== "ND")
      .slice(0, 80)
      .map((f) => `- ${f.name} (UFL: ${f.ufl}, PDIN: ${f.pdin ?? "ND"}, MS%: ${f.ms_pct ?? "ND"})`)
      .join("\n");

    const concentresList = alimData.concentres
      .map((c) => `- ${c.name} (UFL: ${c.ufl}, PDIN: ${c.pdin ?? "ND"}, MS%: ${c.ms_pct ?? "ND"}, prix: ${c.price ?? "ND"} €/kg)`)
      .join("\n");

    const systemPrompt = `Tu es un expert en nutrition ovine (moutons/brebis) travaillant pour l'outil OvinFormulation. 
L'utilisateur te décrit sa situation en langage naturel (français). Tu dois:

1. Analyser sa demande (type d'animal, stade physiologique, aliments disponibles, contraintes de coût, etc.)
2. Proposer 1 à 3 rations adaptées sous forme structurée JSON

RÈGLES:
- Utilise UNIQUEMENT les aliments de la liste ci-dessous
- Les quantités sont en kg brut par animal et par jour
- Vérifie que les apports couvrent les besoins (UFL, PDI, Pabs, Caabs)
- Tiens compte du coût si mentionné
- Réponds en français

FORMAT DE RÉPONSE (JSON valide uniquement, sans markdown):
{
  "analysis": "Analyse brève de la demande de l'utilisateur (2-3 phrases)",
  "rations": [
    {
      "name": "Nom de la ration",
      "description": "Description en 1-2 phrases",
      "feeds": [
        { "name": "nom exact de l'aliment", "quantityKgBrut": 1.5 },
        ...
      ],
      "expectedUFL": 1.14,
      "expectedPDI": 146,
      "expectedCost": 0.45,
      "recommendation": "Pourquoi cette ration est recommandée"
    }
  ],
  "advice": "Conseil supplémentaire (1-2 phrases)"
}

ALIMENTS DISPONIBLES:

FOURRAGES:
${fourragesList}

CONCENTRÉS:
${concentresList}

${animalCategory ? `ANIMAL CIBLE: ${animalCategory}` : "ANIMAL: à déterminer à partir du message utilisateur"}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Extract the response text
    const responseText = completion.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      // Remove any markdown code blocks if present
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return the raw text
      return NextResponse.json({
        error: "Format de réponse invalide",
        rawResponse: responseText,
      }, { status: 200 });
    }

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[AI Ration API] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de la ration: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
