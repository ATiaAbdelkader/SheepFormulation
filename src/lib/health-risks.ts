// Health Risk Forecasting Engine
// Computes risk scores for common sheep health conditions based on ration composition
// Reference: INRA 2018, veterinary nutrition guidelines

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type HealthRisk = {
  id: string;
  name: string;
  level: RiskLevel;
  score: number; // 0-100, higher = more risk
  probability: string; // human-readable
  description: string;
  causes: string[];
  recommendations: string[];
  icon: string; // emoji or icon name
};

export type RationContext = {
  animalCategory: string;
  animalType: string; // Brebis, Bélier, Agnelle, etc.
  stage: string; // Gestante, Allaitante, Vide, etc.
  subStage: string; // e.g. "Double", "Semaines -3 à -4"
  totalUFL: number;
  totalUEM: number;
  totalPDI: number;
  totalPDIN: number;
  totalPDIE: number;
  totalPabs: number;
  totalCaabs: number;
  totalMS: number;
  forageMS: number; // MS from forages only
  concentrateMS: number; // MS from concentrates only
  needs: {
    UEM: number | null;
    UFL: number | null;
    PDI: number | null;
    Pabs: number | null;
    Caabs: number | null;
  };
  coverage: {
    UEM: number | null;
    UFL: number | null;
    PDI: number | null;
    Pabs: number | null;
    Caabs: number | null;
  };
  caPRatio: number | null;
  rmic: number | null;
  derm: number | null;
};

function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

function probabilityText(score: number): string {
  if (score >= 75) return "Risque très élevé";
  if (score >= 50) return "Risque élevé";
  if (score >= 25) return "Risque modéré";
  if (score >= 10) return "Risque faible";
  return "Risque négligeable";
}

// ---------- Risk 1: Acidosis ----------
// Subacute ruminal acidosis (SARA)
// Key factors: high concentrate proportion, low fiber, high energy density
function assessAcidosis(ctx: RationContext): HealthRisk {
  let score = 0;
  const causes: string[] = [];

  const concentratePct = ctx.totalMS > 0 ? (ctx.concentrateMS / ctx.totalMS) * 100 : 0;
  const foragePct = ctx.totalMS > 0 ? (ctx.forageMS / ctx.totalMS) * 100 : 0;

  // Concentrate proportion
  if (concentratePct > 60) {
    score += 35;
    causes.push(`Part de concentré très élevée (${fmt1(concentratePct)}% de la MS)`);
  } else if (concentratePct > 45) {
    score += 20;
    causes.push(`Part de concentré élevée (${fmt1(concentratePct)}% de la MS)`);
  } else if (concentratePct > 30) {
    score += 10;
    causes.push(`Part de concentré modérée (${fmt1(concentratePct)}% de la MS)`);
  }

  // Forage proportion (fiber)
  if (foragePct < 30 && ctx.totalMS > 0) {
    score += 25;
    causes.push(`Part de fourrage très faible (${fmt1(foragePct)}% de la MS)`);
  } else if (foragePct < 50 && ctx.totalMS > 0) {
    score += 10;
    causes.push(`Part de fourrage faible (${fmt1(foragePct)}% de la MS)`);
  }

  // Energy density (UFL/UEM)
  if (ctx.derm !== null && ctx.derm > 0.95) {
    score += 20;
    causes.push(`Densité énergétique élevée (${fmt3(ctx.derm)} UFL/UEM)`);
  } else if (ctx.derm !== null && ctx.derm > 0.85) {
    score += 10;
    causes.push(`Densité énergétique modérée (${fmt3(ctx.derm)} UFL/UEM)`);
  }

  // RMIC imbalance (energy excess relative to nitrogen)
  if (ctx.rmic !== null && ctx.rmic < -12) {
    score += 15;
    causes.push(`Déséquilibre microbial (RMIC = ${fmt1(ctx.rmic)})`);
  }

  score = Math.min(100, score);

  return {
    id: "acidosis",
    name: "Acidose ruminale (SARA)",
    level: levelFromScore(score),
    score,
    probability: probabilityText(score),
    description: "L'acidose subaiguë du rumen survient quand le pH ruminal chute sous 5.8, généralement à cause d'un excès de concentrés (amidon fermentescible) au détriment des fourrages (fibres).",
    causes,
    recommendations: score >= 25 ? [
      "Maintenir au minimum 40% de fourrage dans la MS totale",
      "Fractionner les concentrés en 2 distributions minimum par jour",
      "Privilégier les concentrés à amidon lent (maïs grain) vs rapide (blé)",
      "Ajouter un tampon (bicarbonate de sodium) si risque élevé: 15-20 g/animal/jour",
    ] : ["La ration présente un faible risque d'acidose. Maintenir la part de fourrage."],
    icon: "⚠️",
  };
}

// ---------- Risk 2: Pregnancy Toxemia ----------
// (ketosis in late gestation)
function assessPregnancyToxemia(ctx: RationContext): HealthRisk {
  let score = 0;
  const causes: string[] = [];

  const isGestante = ctx.stage === "Gestante" || ctx.subStage.toLowerCase().includes("gest");
  const isLateGestation = ctx.subStage.includes("-3") || ctx.subStage.includes("-2") || ctx.subStage.includes("0");
  const isTwin = ctx.subStage.toLowerCase().includes("double") || ctx.subStage.toLowerCase().includes("triple");

  if (!isGestante) {
    return {
      id: "toxemia",
      name: "Toxémie de gestation",
      level: "low",
      score: 0,
      probability: "Non applicable (animal non gestant)",
      description: "La toxémie de gestation est un trouble métabolique affectant les brebis en fin de gestation, causé par un déficit énergétique face aux besoins des fœtus.",
      causes: ["Animal non concerné par ce risque"],
      recommendations: ["Risque non applicable à cette catégorie d'animal."],
      icon: "🤰",
    };
  }

  // Late gestation increases risk
  if (isLateGestation) {
    score += 20;
    causes.push("Fin de gestation (dernières semaines)");
  }

  // Twin pregnancy increases risk dramatically
  if (isTwin) {
    score += 25;
    causes.push("Portée double (besoins énergétiques accrus)");
  }

  // Energy coverage
  if (ctx.coverage.UFL !== null) {
    if (ctx.coverage.UFL < 80) {
      score += 35;
      causes.push(`Déficit énergétique sévère (${fmt0(ctx.coverage.UFL)}% des besoins UFL couverts)`);
    } else if (ctx.coverage.UFL < 90) {
      score += 20;
      causes.push(`Déficit énergétique (${fmt0(ctx.coverage.UFL)}% des besoins UFL couverts)`);
    } else if (ctx.coverage.UFL < 95) {
      score += 10;
      causes.push(`Couverture énergétique limite (${fmt0(ctx.coverage.UFL)}%)`);
    }
  }

  // UEM capacity exceeded (can't eat enough)
  if (ctx.coverage.UEM !== null && ctx.coverage.UEM > 100) {
    score += 15;
    causes.push("Capacité d'ingestion dépassée — l'animal ne peut pas compenser");
  }

  score = Math.min(100, score);

  return {
    id: "toxemia",
    name: "Toxémie de gestation",
    level: levelFromScore(score),
    score,
    probability: probabilityText(score),
    description: "La toxémie de gestation (cétose) survient en fin de gestation quand l'apport énergétique est insuffisant face aux besoins des fœtus. Mortalité可达 80% sans traitement. Particulièrement dangereuse pour les portées doubles.",
    causes,
    recommendations: score >= 25 ? [
      "Augmenter la densité énergétique de la ration (ajouter du concentré)",
      "Fractionner les repas (minimum 2 par jour, idéalement 3)",
      "Surveiller l'état corporel (BCS) — cible 3.0-3.5 en fin de gestation",
      "En prévention: propylène glycol 30-50 ml/jour les 3 dernières semaines",
      "Éviter le jeûne: mettre à disposition du foin en permanence",
    ] : ["Couverture énergétique adéquate pour cette phase de gestation."],
    icon: "🤰",
  };
}

// ---------- Risk 3: Urinary Calculi ----------
// (urolithiasis) — especially in males
function assessUrinaryCalculi(ctx: RationContext): HealthRisk {
  let score = 0;
  const causes: string[] = [];

  if (ctx.caPRatio !== null) {
    if (ctx.caPRatio < 0.8) {
      score += 50;
      causes.push(`Rapport Ca/P très bas (${fmt2(ctx.caPRatio)} — trop de phosphore)`);
    } else if (ctx.caPRatio < 1.0) {
      score += 30;
      causes.push(`Rapport Ca/P bas (${fmt2(ctx.caPRatio)})`);
    } else if (ctx.caPRatio < 1.2) {
      score += 10;
      causes.push(`Rapport Ca/P légèrement bas (${fmt2(ctx.caPRatio)})`);
    }
  }

  // High phosphorus
  if (ctx.coverage.Pabs !== null && ctx.coverage.Pabs > 130) {
    score += 20;
    causes.push(`Excès de phosphore (${fmt0(ctx.coverage.Pabs)}% des besoins)`);
  }

  // Low calcium
  if (ctx.coverage.Caabs !== null && ctx.coverage.Caabs < 80) {
    score += 15;
    causes.push(`Déficit en calcium (${fmt0(ctx.coverage.Caabs)}% des besoins)`);
  }

  // High concentrate increases P intake
  const concentratePct = ctx.totalMS > 0 ? (ctx.concentrateMS / ctx.totalMS) * 100 : 0;
  if (concentratePct > 60) {
    score += 10;
    causes.push("Ration riche en concentrés (apport élevé en phosphore)");
  }

  score = Math.min(100, score);

  return {
    id: "calculi",
    name: "Calculs urinaires (urolithiase)",
    level: levelFromScore(score),
    score,
    probability: probabilityText(score),
    description: "Les calculs urinaires (struvite, phosphate de calcium) se forment quand le rapport Ca/P est déséquilibré. Particulièrement dangereux chez les mâles (urétre étroit) — peut être mortel par obstruction urinaire.",
    causes,
    recommendations: score >= 25 ? [
      "Ajuster le rapport Ca/P vers 1.0-1.5 en modifiant le CMV",
      "Choisir un CMV riche en calcium (ex: CMV 12-12 ou 8-18)",
      "Assurer un apport hydrique suffisant (eau à volonté, propre)",
      "Ajouter du chlorure d'ammonium (10-15 g/jour) pour acidifier les urines",
      "Réduire les aliments riches en phosphore (céréales, son)",
    ] : ["Rapport Ca/P dans la zone de sécurité. Continuer à surveiller."],
    icon: "💧",
  };
}

// ---------- Risk 4: Hypocalcemia ----------
// (milk fever) — at parturition and early lactation
function assessHypocalcemia(ctx: RationContext): HealthRisk {
  let score = 0;
  const causes: string[] = [];

  const isAllaitante = ctx.stage === "Allaitante" || ctx.subStage.toLowerCase().includes("allait");
  const isGestante = ctx.stage === "Gestante";
  const isEarlyLactation = ctx.subStage.includes("0 à") || ctx.subStage.includes("+ 4");

  if (!isAllaitante && !isGestante) {
    return {
      id: "hypocalcemia",
      name: "Hypocalcémie (fièvre vitulaire)",
      level: "low",
      score: 0,
      probability: "Non applicable",
      description: "L'hypocalcémie survient au moment de la mise-bas et en début de lactation quand les besoins en calcium explosent pour la production laitière.",
      causes: ["Animal non concerné par cette phase"],
      recommendations: ["Risque non applicable."],
      icon: "🥛",
    };
  }

  // Calcium coverage
  if (ctx.coverage.Caabs !== null) {
    if (ctx.coverage.Caabs < 70) {
      score += 45;
      causes.push(`Déficit calcique sévère (${fmt0(ctx.coverage.Caabs)}% des besoins)`);
    } else if (ctx.coverage.Caabs < 85) {
      score += 25;
      causes.push(`Déficit calcique (${fmt0(ctx.coverage.Caabs)}% des besoins)`);
    } else if (ctx.coverage.Caabs < 95) {
      score += 10;
      causes.push(`Couverture calcique limite (${fmt0(ctx.coverage.Caabs)}%)`);
    }
  }

  // Early lactation is highest risk
  if (isEarlyLactation && isAllaitante) {
    score += 20;
    causes.push("Début de lactation (pic de demande calcique)");
  }

  // High P interferes with Ca absorption
  if (ctx.coverage.Pabs !== null && ctx.coverage.Pabs > 140) {
    score += 15;
    causes.push("Excès de phosphore (interfère avec l'absorption du calcium)");
  }

  // Ca/P ratio
  if (ctx.caPRatio !== null && ctx.caPRatio < 1.0) {
    score += 10;
    causes.push(`Rapport Ca/P < 1.0 (${fmt2(ctx.caPRatio)})`);
  }

  score = Math.min(100, score);

  return {
    id: "hypocalcemia",
    name: "Hypocalcémie (fièvre vitulaire)",
    level: levelFromScore(score),
    score,
    probability: probabilityText(score),
    description: "L'hypocalcémie survient au moment de la mise-bas quand les besoins en calcium pour la production laitière dépassent les capacités d'absorption. Peut être mortelle en quelques heures si non traitée.",
    causes,
    recommendations: score >= 25 ? [
      "Augmenter le calcium: ajouter un CMV riche en Ca (ex: CMV 12-12)",
      "En fin de gestation: éviter l'excès de calcium pour stimuler l'absorption active",
      "Au moment de la mise-bas: apport de calcium rapidement disponible (CaCO3)",
      "Vitamine D3: 300 000 UI en injection 7 jours avant agnelage",
      "Surveiller particulièrement les brebis à portée double",
    ] : ["Apport calcique adéquat pour cette phase."],
    icon: "🥛",
  };
}

// ---------- Risk 5: Mastitis Vulnerability ----------
// (linked to immune function)
function assessMastitis(ctx: RationContext): HealthRisk {
  let score = 0;
  const causes: string[] = [];

  const isAllaitante = ctx.stage === "Allaitante" || ctx.subStage.toLowerCase().includes("allait");

  if (!isAllaitante) {
    return {
      id: "mastitis",
      name: "Sensibilité aux mammites",
      level: "low",
      score: 0,
      probability: "Non applicable",
      description: "Les mammites sont favorisées par un déficit immunitaire, souvent lié à une carence nutritionnelle (protéines, sélénium, vitamine E) en début de lactation.",
      causes: ["Animal non allaitant"],
      recommendations: ["Risque non applicable."],
      icon: "🐑",
    };
  }

  // Protein deficiency → immune suppression
  if (ctx.coverage.PDI !== null) {
    if (ctx.coverage.PDI < 75) {
      score += 35;
      causes.push(`Déficit protéique sévère (${fmt0(ctx.coverage.PDI)}% — immunité affaiblie)`);
    } else if (ctx.coverage.PDI < 90) {
      score += 20;
      causes.push(`Déficit protéique (${fmt0(ctx.coverage.PDI)}%)`);
    }
  }

  // Energy deficit → immune suppression
  if (ctx.coverage.UFL !== null && ctx.coverage.UFL < 85) {
    score += 20;
    causes.push(`Déficit énergétique (${fmt0(ctx.coverage.UFL)}%)`);
  }

  // Early lactation highest risk
  if (ctx.subStage.includes("0 à") || ctx.subStage.includes("+ 4")) {
    score += 15;
    causes.push("Début de lactation (période de risque maximal)");
  }

  // RMIC imbalance
  if (ctx.rmic !== null && ctx.rmic < -12) {
    score += 10;
    causes.push("Déséquilibre ruminal (synthèse protéique microbienne réduite)");
  }

  score = Math.min(100, score);

  return {
    id: "mastitis",
    name: "Sensibilité aux mammites",
    level: levelFromScore(score),
    score,
    probability: probabilityText(score),
    description: "Les mammites sont favorisées par un déficit immunitaire en début de lactation. Les carences en protéines et énergie réduisent la capacité de défense de la mamelle contre les pathogènes.",
    causes,
    recommendations: score >= 25 ? [
      "Assurer une couverture protéique ≥ 95% des besoins PDI",
      "Supplémentation en vitamine E (200-400 UI/jour) et sélénium",
      "Maintenir une hygiène de traite/mise-bas rigoureuse",
      "Éviter les changements brusques de ration en début de lactation",
      "Surveiller l'état corporel: BCS < 2.5 = risque élevé",
    ] : ["Couverture nutritionnelle adéquate pour la fonction immunitaire."],
    icon: "🐑",
  };
}

// ---------- Main export ----------
export function assessAllHealthRisks(ctx: RationContext): HealthRisk[] {
  return [
    assessAcidosis(ctx),
    assessPregnancyToxemia(ctx),
    assessUrinaryCalculi(ctx),
    assessHypocalcemia(ctx),
    assessMastitis(ctx),
  ];
}

export function getOverallRiskScore(risks: HealthRisk[]): { score: number; level: RiskLevel; label: string } {
  const applicable = risks.filter((r) => r.score > 0);
  if (applicable.length === 0) {
    return { score: 0, level: "low", label: "Aucun risque détecté" };
  }
  const avg = applicable.reduce((s, r) => s + r.score, 0) / applicable.length;
  const max = Math.max(...applicable.map((r) => r.score));
  // Use weighted combination: 60% average + 40% max
  const combined = avg * 0.6 + max * 0.4;
  return {
    score: Math.round(combined),
    level: levelFromScore(combined),
    label: probabilityText(combined),
  };
}

// ---------- Formatting helpers ----------
function fmt0(n: number | null): string { return n !== null ? n.toFixed(0) : "—"; }
function fmt1(n: number | null): string { return n !== null ? n.toFixed(1) : "—"; }
function fmt2(n: number | null): string { return n !== null ? n.toFixed(2) : "—"; }
function fmt3(n: number | null): string { return n !== null ? n.toFixed(3) : "—"; }
