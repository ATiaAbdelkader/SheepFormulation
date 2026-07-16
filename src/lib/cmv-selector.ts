// CMV Selector Wizard Engine
// Smart mineral supplement recommendation based on deficit analysis
// Reference: INRA 2018 mineral nutrition guidelines

import { num } from "./alim-data";

export type CMVRecord = {
  name: string;
  ca_p_ratio: number | null;
  pabs_per_kg: number | null;
  caabs_per_kg: number | null;
  p_pct: number | null;
  ca_pct: number | null;
};

export type DeficitProfile = {
  pabsDeficit: number | null;  // g/day (positive = deficit)
  caabsDeficit: number | null; // g/day
  caPRatio: number | null;     // current Ca/P ratio
  targetCaPRatio: number;      // optimal: 1.2
  primaryDeficit: "calcium" | "phosphorus" | "both" | "neither";
  severity: "low" | "moderate" | "high";
};

export type CMVRecommendation = {
  cmv: CMVRecord;
  matchScore: number; // 0-100
  rank: number;
  reason: string;
  // Dosage calculation
  recommendedDosage: number | null; // g/animal/day
  pabsContrib: number; // g Pabs from CMV at recommended dose
  caabsContrib: number; // g Caabs from CMV at recommended dose
  // After correction
  residualPabsDeficit: number;
  residualCaabsDeficit: number;
  finalCaPRatio: number | null;
  fullyCorrected: boolean;
  // Cost
  costPerDay: number | null; // at recommended dosage
  warnings: string[];
};

export type WizardAnswers = {
  deficitType: "calcium" | "phosphorus" | "both" | "unknown";
  animalStage: "gestation" | "lactation" | "growth" | "maintenance" | "unknown";
  budget: "low" | "medium" | "high";
};

// ---------- Analyze deficit from ration ----------
export function analyzeDeficit(params: {
  pabsNeeded: number | null;
  caabsNeeded: number | null;
  pabsProvided: number;
  caabsProvided: number;
}): DeficitProfile {
  const { pabsNeeded, caabsNeeded, pabsProvided, caabsProvided } = params;

  const pabsDeficit = pabsNeeded !== null ? pabsNeeded - pabsProvided : null;
  const caabsDeficit = caabsNeeded !== null ? caabsNeeded - caabsProvided : null;
  const caPRatio = pabsProvided > 0 ? caabsProvided / pabsProvided : null;

  let primaryDeficit: DeficitProfile["primaryDeficit"] = "neither";
  if (pabsDeficit !== null && pabsDeficit > 0.1 && caabsDeficit !== null && caabsDeficit > 0.1) {
    primaryDeficit = "both";
  } else if (caabsDeficit !== null && caabsDeficit > 0.1) {
    primaryDeficit = "calcium";
  } else if (pabsDeficit !== null && pabsDeficit > 0.1) {
    primaryDeficit = "phosphorus";
  }

  // Severity: based on largest deficit relative to needs
  let severity: DeficitProfile["severity"] = "low";
  const pabsSev = pabsDeficit !== null && pabsNeeded !== null && pabsNeeded > 0 ? (pabsDeficit / pabsNeeded) * 100 : 0;
  const caabsSev = caabsDeficit !== null && caabsNeeded !== null && caabsNeeded > 0 ? (caabsDeficit / caabsNeeded) * 100 : 0;
  const maxSev = Math.max(pabsSev, caabsSev);

  if (maxSev > 30) severity = "high";
  else if (maxSev > 15) severity = "moderate";

  return {
    pabsDeficit,
    caabsDeficit,
    caPRatio,
    targetCaPRatio: 1.2,
    primaryDeficit,
    severity,
  };
}

// ---------- Recommend CMVs ----------
export function recommendCMVs(
  cmvs: CMVRecord[],
  deficit: DeficitProfile,
  budget: "low" | "medium" | "high" = "medium"
): CMVRecommendation[] {
  if (deficit.primaryDeficit === "neither") return [];

  const recommendations = cmvs.map((cmv) => {
    let matchScore = 50;
    const warnings: string[] = [];
    const reasons: string[] = [];

    const cmvCaPRatio = num(cmv.ca_p_ratio);
    const cmvPabs = num(cmv.pabs_per_kg);
    const cmvCaabs = num(cmv.caabs_per_kg);

    // Score based on how well the CMV's Ca/P ratio matches the deficit
    if (deficit.primaryDeficit === "calcium") {
      // Need Ca-rich CMV (high Ca/P ratio)
      if (cmvCaPRatio !== null) {
        if (cmvCaPRatio >= 2.0) {
          matchScore += 30;
          reasons.push("Riche en calcium (Ca/P élevé)");
        } else if (cmvCaPRatio >= 1.0) {
          matchScore += 15;
          reasons.push("Équilibré Ca/P");
        } else {
          matchScore -= 10;
          warnings.push("Pauvre en Ca pour un déficit calcique");
        }
      }
    } else if (deficit.primaryDeficit === "phosphorus") {
      // Need P-rich CMV (low Ca/P ratio)
      if (cmvCaPRatio !== null) {
        if (cmvCaPRatio <= 0.1) {
          matchScore += 30;
          reasons.push("Très riche en phosphore (Ca/P ≈ 0)");
        } else if (cmvCaPRatio <= 0.5) {
          matchScore += 20;
          reasons.push("Riche en phosphore");
        } else if (cmvCaPRatio <= 1.0) {
          matchScore += 10;
        } else {
          matchScore -= 10;
          warnings.push("Pauvre en P pour un déficit phosphoré");
        }
      }
    } else if (deficit.primaryDeficit === "both") {
      // Need balanced CMV (Ca/P ≈ 1.0-1.5)
      if (cmvCaPRatio !== null) {
        if (cmvCaPRatio >= 0.8 && cmvCaPRatio <= 1.5) {
          matchScore += 25;
          reasons.push("Équilibré Ca/P — idéal pour double déficit");
        } else if (cmvCaPRatio >= 0.5 && cmvCaPRatio <= 2.0) {
          matchScore += 10;
        }
      }
    }

    // Score based on absolute mineral content (potency)
    if (cmvPabs !== null && cmvPabs > 0) {
      matchScore += Math.min(10, cmvPabs / 10);
    }
    if (cmvCaabs !== null && cmvCaabs > 0) {
      matchScore += Math.min(10, cmvCaabs / 10);
    }

    // Calculate dosage: to correct the primary deficit
    let recommendedDosage: number | null = null;
    let pabsContrib = 0;
    let caabsContrib = 0;

    if (deficit.primaryDeficit === "phosphorus" && cmvPabs !== null && cmvPabs > 0 && deficit.pabsDeficit !== null && deficit.pabsDeficit > 0) {
      // Dosage to correct P deficit: deficit (g) / Pabs per kg (g/kg) × 1000 (g)
      recommendedDosage = (deficit.pabsDeficit / cmvPabs) * 1000;
      pabsContrib = deficit.pabsDeficit;
      if (cmvCaabs !== null) caabsContrib = cmvCaabs * (recommendedDosage / 1000);
    } else if (deficit.primaryDeficit === "calcium" && cmvCaabs !== null && cmvCaabs > 0 && deficit.caabsDeficit !== null && deficit.caabsDeficit > 0) {
      recommendedDosage = (deficit.caabsDeficit / cmvCaabs) * 1000;
      caabsContrib = deficit.caabsDeficit;
      if (cmvPabs !== null) pabsContrib = cmvPabs * (recommendedDosage / 1000);
    } else if (deficit.primaryDeficit === "both") {
      // Correct both — use the larger deficit to determine dosage
      const pDose = cmvPabs !== null && cmvPabs > 0 && deficit.pabsDeficit !== null ? (deficit.pabsDeficit / cmvPabs) * 1000 : 0;
      const caDose = cmvCaabs !== null && cmvCaabs > 0 && deficit.caabsDeficit !== null ? (deficit.caabsDeficit / cmvCaabs) * 1000 : 0;
      recommendedDosage = Math.max(pDose, caDose);
      if (cmvPabs !== null) pabsContrib = cmvPabs * (recommendedDosage / 1000);
      if (cmvCaabs !== null) caabsContrib = cmvCaabs * (recommendedDosage / 1000);
    }

    // Cap dosage at 200g for safety
    if (recommendedDosage !== null && recommendedDosage > 200) {
      warnings.push(`Dosage calculé élevé (${recommendedDosage.toFixed(0)}g) — vérifiez avec un nutritionniste`);
      recommendedDosage = 200;
    }
    if (recommendedDosage !== null && recommendedDosage < 5) {
      recommendedDosage = 5; // minimum
    }

    // Residual deficits after correction
    const residualPabsDeficit = deficit.pabsDeficit !== null ? Math.max(0, deficit.pabsDeficit - pabsContrib) : 0;
    const residualCaabsDeficit = deficit.caabsDeficit !== null ? Math.max(0, deficit.caabsDeficit - caabsContrib) : 0;

    // Final Ca/P ratio
    const totalPabs = (deficit.pabsDeficit !== null ? deficit.pabsDeficit : 0) + pabsContrib - deficit.pabsDeficit; // = provided + contrib
    const totalCaabs = (deficit.caabsDeficit !== null ? deficit.caabsDeficit : 0) + caabsContrib - deficit.caabsDeficit;
    // Simpler: final ratio = (provided Ca + CMV Ca) / (provided P + CMV P)
    // But we don't have the "provided" values here — estimate from deficit
    const finalCaPRatio = pabsContrib > 0 || caabsContrib > 0 ? null : deficit.caPRatio;

    const fullyCorrected = residualPabsDeficit < 0.1 && residualCaabsDeficit < 0.1;

    // Budget scoring (rough — no price data in CMV, use Ca/P as proxy for complexity)
    if (budget === "low" && cmvCaPRatio !== null) {
      // Simple CMVs (extreme ratios) tend to be cheaper
      if (cmvCaPRatio > 5 || cmvCaPRatio < 0.2) matchScore += 5;
    }

    matchScore = Math.max(0, Math.min(100, matchScore));

    return {
      cmv,
      matchScore,
      rank: 0, // will be set after sorting
      reason: reasons.join("; ") || "CMV standard",
      recommendedDosage,
      pabsContrib,
      caabsContrib,
      residualPabsDeficit,
      residualCaabsDeficit,
      finalCaPRatio,
      fullyCorrected,
      costPerDay: null, // no price data
      warnings,
    };
  });

  // Sort by match score and assign ranks
  recommendations.sort((a, b) => b.matchScore - a.matchScore);
  recommendations.forEach((r, i) => { r.rank = i + 1; });

  return recommendations.slice(0, 5); // top 5
}

// ---------- Mineral interaction warnings ----------
export type MineralWarning = {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
};

export function checkMineralInteractions(params: {
  caPRatio: number | null;
  pabsExcess: boolean;
  caabsExcess: boolean;
  highCaabs: number | null;
  highPabs: number | null;
}): MineralWarning[] {
  const warnings: MineralWarning[] = [];
  const { caPRatio, pabsExcess, caabsExcess, highCaabs, highPabs } = params;

  // Ca/P ratio issues
  if (caPRatio !== null) {
    if (caPRatio < 0.8) {
      warnings.push({
        level: "danger",
        title: "Risque de calculs urinaires",
        message: `Rapport Ca/P = ${caPRatio.toFixed(2)} (trop bas). Un excès de phosphore par rapport au calcium favorise la formation de calculs (struvite) chez les mâles. Augmentez le calcium ou réduisez le phosphore.`,
      });
    } else if (caPRatio > 2.5) {
      warnings.push({
        level: "warning",
        title: "Interférence avec l'absorption du phosphore",
        message: `Rapport Ca/P = ${caPRatio.toFixed(2)} (trop élevé). Un excès de calcium inhibe l'absorption du phosphore. Le rapport optimal est 1.0-1.5.`,
      });
    } else if (caPRatio < 1.0) {
      warnings.push({
        level: "info",
        title: "Rapport Ca/P légèrement bas",
        message: `Rapport Ca/P = ${caPRatio.toFixed(2)}. Cible optimale: 1.0-1.5. Surveiller les mâles (risque de calculs).`,
      });
    }
  }

  // Excess minerals
  if (pabsExcess) {
    warnings.push({
      level: "warning",
      title: "Excès de phosphore",
      message: "L'excès de phosphore est éliminé dans les fèces, contribuant à la pollution environnementale (eutrophisation). Réduisez les aliments riches en P (tourteaux, son).",
    });
  }

  if (caabsExcess) {
    warnings.push({
      level: "warning",
      title: "Excès de calcium",
      message: "Un excès de calcium peut interférer avec l'absorption d'autres minéraux (P, Mg, Zn, Cu). Particulièrement problématique pour les animaux en croissance.",
    });
  }

  // High absolute values
  if (highCaabs !== null && highCaabs > 8) {
    warnings.push({
      level: "info",
      title: "Calcium très élevé",
      message: `Apport en Caabs = ${highCaabs.toFixed(1)} g/jour. Vérifiez que ce niveau est justifié (allaitement, croissance). Un excès chronique peut calcifier les tissus mous.`,
    });
  }

  if (highPabs !== null && highPabs > 6) {
    warnings.push({
      level: "info",
      title: "Phosphore élevé",
      message: `Apport en Pabs = ${highPabs.toFixed(1)} g/jour. Surplus environnemental. Si non justifié, envisagez de réduire les concentrés riches en P.`,
    });
  }

  return warnings;
}

// ---------- Dosage calculator (standalone) ----------
export function calculateDosage(params: {
  cmv: CMVRecord;
  pabsDeficit: number | null;
  caabsDeficit: number | null;
  animalWeight: number; // kg
}): {
  dosage: number | null;
  pabsContrib: number;
  caabsContrib: number;
  per100kg: number | null;
  warning: string | null;
} {
  const { cmv, pabsDeficit, caabsDeficit, animalWeight } = params;
  const cmvPabs = num(cmv.pabs_per_kg);
  const cmvCaabs = num(cmv.caabs_per_kg);

  let dosage: number | null = null;

  if (pabsDeficit !== null && pabsDeficit > 0 && cmvPabs !== null && cmvPabs > 0) {
    dosage = (pabsDeficit / cmvPabs) * 1000; // g
  }
  if (caabsDeficit !== null && caabsDeficit > 0 && cmvCaabs !== null && cmvCaabs > 0) {
    const caDose = (caabsDeficit / cmvCaabs) * 1000;
    dosage = dosage !== null ? Math.max(dosage, caDose) : caDose;
  }

  if (dosage === null) return { dosage: null, pabsContrib: 0, caabsContrib: 0, per100kg: null, warning: "Impossible de calculer le dosage — déficit ou valeurs CMV manquants" };

  // Cap at 200g
  let warning: string | null = null;
  if (dosage > 200) {
    warning = `Dosage calculé très élevé (${dosage.toFixed(0)}g) — recommandé de choisir un CMV plus concentré ou de corriger la ration de base`;
    dosage = 200;
  }
  if (dosage < 5) dosage = 5;

  const pabsContrib = cmvPabs !== null ? cmvPabs * (dosage / 1000) : 0;
  const caabsContrib = cmvCaabs !== null ? cmvCaabs * (dosage / 1000) : 0;
  const per100kg = animalWeight > 0 ? (dosage / animalWeight) * 100 : null;

  return { dosage, pabsContrib, caabsContrib, per100kg, warning };
}
