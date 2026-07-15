// Concentrate Market Engine
// Quality grading, substitution suggestions, bulk purchase optimization
// Reference: INRA 2018 tables for concentrate feeds

import { num } from "./alim-data";

export type ConcentrateQuality = {
  grade: "A" | "B" | "C" | "D";
  score: number;
  label: string;
  color: string;
  bgColor: string;
  strengths: string[];
  weaknesses: string[];
  bestUse: string;
};

// Quality thresholds for concentrates (different from forages)
const THRESHOLDS = {
  ufl: { excellent: 1.10, good: 0.95, average: 0.80 },
  pdin: { excellent: 200, good: 100, average: 60 },
  price: { cheap: 0.15, medium: 0.30, expensive: 0.50 }, // €/kg
};

export function assessConcentrateQuality(params: {
  ufl: number | null;
  pdin: number | null;
  pdie: number | null;
  pabs: number | null;
  caabs: number | null;
  price: number | null;
}): ConcentrateQuality {
  const { ufl, pdin, pdie, price } = params;
  let score = 50;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // UFL scoring (0-30 points)
  if (ufl !== null) {
    if (ufl >= THRESHOLDS.ufl.excellent) {
      score += 20;
      strengths.push(`UFL élevé (${ufl.toFixed(2)}) — excellente densité énergétique`);
    } else if (ufl >= THRESHOLDS.ufl.good) {
      score += 12;
      strengths.push(`UFL correct (${ufl.toFixed(2)})`);
    } else if (ufl >= THRESHOLDS.ufl.average) {
      score += 5;
    } else {
      score -= 8;
      weaknesses.push(`UFL faible (${ufl.toFixed(2)}) — faible valeur énergétique`);
    }
  }

  // PDIN scoring (0-25 points)
  if (pdin !== null) {
    if (pdin >= THRESHOLDS.pdin.excellent) {
      score += 18;
      strengths.push(`PDIN très élevé (${pdin.toFixed(0)} g/kg) — riche en protéines`);
    } else if (pdin >= THRESHOLDS.pdin.good) {
      score += 10;
    } else if (pdin >= THRESHOLDS.pdin.average) {
      score += 4;
    } else {
      weaknesses.push(`PDIN faible (${pdin.toFixed(0)} g/kg) — peu de protéines`);
    }
  }

  // Price scoring (0-25 points) — lower is better
  if (price !== null && price > 0) {
    if (price <= THRESHOLDS.price.cheap) {
      score += 18;
      strengths.push(`Prix bas (${price.toFixed(2)} €/kg) — excellent rapport qualité/prix`);
    } else if (price <= THRESHOLDS.price.medium) {
      score += 10;
    } else if (price <= THRESHOLDS.price.expensive) {
      score += 3;
    } else {
      score -= 10;
      weaknesses.push(`Prix élevé (${price.toFixed(2)} €/kg) — coût important`);
    }
  }

  // Value for money: UFL per euro
  if (ufl !== null && price !== null && price > 0) {
    const uflPerEuro = ufl / price;
    if (uflPerEuro >= 5) {
      score += 5;
      strengths.push(`Excellent ratio UFL/€ (${uflPerEuro.toFixed(1)})`);
    } else if (uflPerEuro < 2) {
      score -= 5;
      weaknesses.push(`Ratio UFL/€ faible (${uflPerEuro.toFixed(1)})`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade: "A" | "B" | "C" | "D";
  let label: string;
  let color: string;
  let bgColor: string;
  let bestUse: string;

  if (score >= 75) {
    grade = "A";
    label = "Excellente valeur";
    color = "text-emerald-700";
    bgColor = "bg-emerald-100";
    bestUse = "À privilégier dans les rations à fort enjeu (gestation fin, allaitement, engrais)";
  } else if (score >= 55) {
    grade = "B";
    label = "Bonne valeur";
    color = "text-lime-700";
    bgColor = "bg-lime-100";
    bestUse = "Bon choix pour la majorité des rations";
  } else if (score >= 35) {
    grade = "C";
    label = "Valeur moyenne";
    color = "text-amber-700";
    bgColor = "bg-amber-100";
    bestUse = "À utiliser en complément ou pour les animaux à besoins modérés";
  } else {
    grade = "D";
    label = "Valeur limitée";
    color = "text-rose-700";
    bgColor = "bg-rose-100";
    bestUse = "Réservé aux usages spécifiques ou si prix très bas";
  }

  return { grade, score, label, color, bgColor, strengths, weaknesses, bestUse };
}

// ---------- Substitution Engine ----------
export type SubstituteSuggestion = {
  originalName: string;
  substituteName: string;
  // How similar they are nutritionally (0-100%)
  similarity: number;
  // Price comparison
  originalPrice: number | null;
  substitutePrice: number | null;
  priceDifference: number | null;
  savingsPct: number | null;
  // Nutritional comparison
  uflDiff: number | null;
  pdinDiff: number | null;
  // Recommendation
  recommendation: "excellent" | "good" | "acceptable" | "caution";
  reason: string;
};

export function findSubstitutes(
  targetName: string,
  feeds: Array<{
    name: string;
    ufl: number | null;
    pdin: number | null;
    pdie: number | null;
    pabs: number | null;
    caabs: number | null;
    price: number | null;
  }>,
  maxResults: number = 5
): SubstituteSuggestion[] {
  const target = feeds.find((f) => f.name === targetName);
  if (!target) return [];

  const targetUFL = target.ufl;
  const targetPDIN = target.pdin;
  const targetPrice = target.price;

  const candidates = feeds
    .filter((f) => f.name !== targetName)
    .map((f) => {
      // Calculate nutritional similarity (Euclidean distance, normalized)
      let diffSum = 0;
      let count = 0;

      if (targetUFL !== null && f.ufl !== null) {
        diffSum += Math.pow((f.ufl - targetUFL) / 1.5, 2); // normalize by max range
        count++;
      }
      if (targetPDIN !== null && f.pdin !== null) {
        diffSum += Math.pow((f.pdin - targetPDIN) / 400, 2);
        count++;
      }

      const avgDiff = count > 0 ? Math.sqrt(diffSum / count) : 1;
      const similarity = Math.max(0, Math.min(100, (1 - avgDiff) * 100));

      const priceDiff = targetPrice !== null && f.price !== null ? f.price - targetPrice : null;
      const savingsPct = targetPrice !== null && f.price !== null && targetPrice > 0
        ? ((targetPrice - f.price) / targetPrice) * 100
        : null;

      const uflDiff = targetUFL !== null && f.ufl !== null ? f.ufl - targetUFL : null;
      const pdinDiff = targetPDIN !== null && f.pdin !== null ? f.pdin - targetPDIN : null;

      // Recommendation level
      let recommendation: SubstituteSuggestion["recommendation"] = "caution";
      let reason = "";

      if (similarity >= 85 && (savingsPct === null || savingsPct >= 0)) {
        recommendation = "excellent";
        reason = `Substitut quasi-identique${savingsPct !== null && savingsPct > 0 ? ` et ${savingsPct.toFixed(0)}% moins cher` : ""}`;
      } else if (similarity >= 70) {
        recommendation = "good";
        reason = `Proche nutritionnellement${savingsPct !== null && savingsPct > 0 ? ` et économise ${savingsPct.toFixed(0)}%` : ""}`;
      } else if (similarity >= 50) {
        recommendation = "acceptable";
        reason = `Substitut acceptable — vérifiez l'impact sur la ration`;
      } else {
        recommendation = "caution";
        reason = `Différences nutritionnelles significatives — à utiliser avec précaution`;
      }

      return {
        originalName: targetName,
        substituteName: f.name,
        similarity,
        originalPrice: targetPrice,
        substitutePrice: f.price,
        priceDifference: priceDiff,
        savingsPct,
        uflDiff,
        pdinDiff,
        recommendation,
        reason,
      };
    })
    .filter((s) => s.similarity > 20) // filter out very different feeds
    .sort((a, b) => {
      // Sort by: excellent first, then by savings
      const recOrder = { excellent: 0, good: 1, acceptable: 2, caution: 3 };
      if (recOrder[a.recommendation] !== recOrder[b.recommendation]) {
        return recOrder[a.recommendation] - recOrder[b.recommendation];
      }
      return (b.savingsPct || 0) - (a.savingsPct || 0);
    })
    .slice(0, maxResults);

  return candidates;
}

// ---------- Bulk Purchase Calculator ----------
export type BulkAnalysis = {
  feedName: string;
  currentPrice: number;
  quantityNeeded: number; // kg
  // Scenarios: buy now vs wait
  buyNowCost: number;
  // If price drops by X%, savings
  scenarios: Array<{
    priceChange: number;
    newPrice: number;
    totalCost: number;
    savings: number;
    savingsPct: number;
    recommendation: string;
  }>;
  bestScenario: {
    priceChange: number;
    savings: number;
    savingsPct: number;
  } | null;
};

export function calculateBulkPurchase(
  feedName: string,
  currentPrice: number,
  quantityNeeded: number,
  priceChanges: number[] = [-15, -10, -5, 0, 5, 10, 15]
): BulkAnalysis {
  const buyNowCost = currentPrice * quantityNeeded;

  const scenarios = priceChanges.map((change) => {
    const newPrice = currentPrice * (1 + change / 100);
    const totalCost = newPrice * quantityNeeded;
    const savings = buyNowCost - totalCost;
    const savingsPct = buyNowCost > 0 ? (savings / buyNowCost) * 100 : 0;

    let recommendation = "";
    if (change < -10) {
      recommendation = "Si le prix baisse, attendez — économie significative";
    } else if (change < -5) {
      recommendation = "Si le prix baisse légèrement, attendez";
    } else if (change === 0) {
      recommendation = "Prix actuel — achetez si le besoin est urgent";
    } else if (change > 10) {
      recommendation = "Si le prix monte, achetez MAINTENANT pour éviter la hausse";
    } else {
      recommendation = "Surveillance recommandée";
    }

    return { priceChange: change, newPrice, totalCost, savings, savingsPct, recommendation };
  });

  // Best scenario = highest savings (most negative price change that's realistic)
  const buyScenarios = scenarios.filter((s) => s.priceChange <= 0);
  const bestScenario = buyScenarios.length > 0
    ? buyScenarios.reduce((best, s) => s.savings > best.savings ? s : best, buyScenarios[0])
    : null;

  return {
    feedName,
    currentPrice,
    quantityNeeded,
    buyNowCost,
    scenarios,
    bestScenario: bestScenario ? {
      priceChange: bestScenario.priceChange,
      savings: bestScenario.savings,
      savingsPct: bestScenario.savingsPct,
    } : null,
  };
}

// ---------- Concentrate categories ----------
export function concentrateCategory(name: string): { cat: string; color: string } {
  const n = name.toLowerCase();
  if (["blé", "orge", "avoine", "triticale", "seigle", "maïs grain", "sorgho", "sarrazin"].some((c) => n.includes(c))) {
    return { cat: "Céréale", color: "bg-amber-100 text-amber-800" };
  }
  if (["tourteau", "colza 35", "soja 48", "tournesol", "arachide", "lin", "coton"].some((c) => n.includes(c))) {
    return { cat: "Tourteau", color: "bg-orange-100 text-orange-800" };
  }
  if (["pois", "lupin", "féverole", "vesce", "soja extrudé", "soja tanné"].some((c) => n.includes(c))) {
    return { cat: "Protéagineux", color: "bg-rose-100 text-rose-800" };
  }
  if (["drêches", "son de blé", "pulpe de betterave", "mélasse", "urée", "huile", "graine de colza", "graines de colza", "poudre de lait", "lait écrémé", "luzerne"].some((c) => n.includes(c))) {
    return { cat: "Divers", color: "bg-stone-100 text-stone-700" };
  }
  return { cat: "Autre", color: "bg-stone-100 text-stone-700" };
}
