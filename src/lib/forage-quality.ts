// Forage Quality Grading Engine
// Grades forages A/B/C/D based on nutritional values (UFL, PDIN, CB, MS)
// Reference: INRA 2018 quality standards for forages

export type QualityGrade = "A" | "B" | "C" | "D";

export type QualityAssessment = {
  grade: QualityGrade;
  score: number; // 0-100
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

// Quality thresholds per parameter (for forages)
// Reference: INRA 2018 tables
const THRESHOLDS = {
  ufl: {
    excellent: 0.80,
    good: 0.65,
    average: 0.50,
  },
  pdin: {
    excellent: 90,
    good: 70,
    average: 50,
  },
  cb: {
    excellent: 25,  // low CB = high quality
    good: 32,
    average: 40,
  },
  ms_pct: {
    excellent: 85,
    good: 70,
    average: 50,
  },
};

export function assessForageQuality(params: {
  ufl: number | null;
  pdin: number | null;
  cb: number | null;
  ms_pct: number | null;
  pdie?: number | null;
}): QualityAssessment {
  const { ufl, pdin, cb, ms_pct } = params;
  let score = 50; // base score
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // UFL scoring (0-30 points)
  if (ufl !== null) {
    if (ufl >= THRESHOLDS.ufl.excellent) {
      score += 25;
      strengths.push(`UFL élevé (${ufl.toFixed(2)}) — excellente valeur énergétique`);
    } else if (ufl >= THRESHOLDS.ufl.good) {
      score += 15;
      strengths.push(`UFL correct (${ufl.toFixed(2)})`);
    } else if (ufl >= THRESHOLDS.ufl.average) {
      score += 5;
    } else {
      score -= 10;
      weaknesses.push(`UFL faible (${ufl !== null ? ufl.toFixed(2) : "—"}) — valeur énergétique limitée`);
    }
  }

  // PDIN scoring (0-25 points)
  if (pdin !== null) {
    if (pdin >= THRESHOLDS.pdin.excellent) {
      score += 20;
      strengths.push(`PDIN élevé (${pdin.toFixed(0)} g/kg) — bonne valeur protéique`);
    } else if (pdin >= THRESHOLDS.pdin.good) {
      score += 12;
    } else if (pdin >= THRESHOLDS.pdin.average) {
      score += 5;
    } else {
      score -= 8;
      weaknesses.push(`PDIN faible (${pdin.toFixed(0)} g/kg) — déficit protéique`);
    }
  }

  // CB scoring (0-20 points) — lower is better
  if (cb !== null) {
    if (cb <= THRESHOLDS.cb.excellent) {
      score += 15;
      strengths.push(`Cellulose faible (${cb.toFixed(0)}%) — bonne digestibilité`);
    } else if (cb <= THRESHOLDS.cb.good) {
      score += 8;
    } else if (cb <= THRESHOLDS.cb.average) {
      score += 2;
    } else {
      score -= 12;
      weaknesses.push(`Cellulose élevée (${cb.toFixed(0)}%) — digestibilité réduite`);
    }
  }

  // MS% scoring (0-15 points)
  if (ms_pct !== null) {
    if (ms_pct >= THRESHOLDS.ms_pct.excellent) {
      score += 10;
      strengths.push(`MS élevée (${ms_pct.toFixed(0)}%) — bon conservateur`);
    } else if (ms_pct >= THRESHOLDS.ms_pct.good) {
      score += 5;
    } else if (ms_pct < 30) {
      score -= 5;
      weaknesses.push(`MS très faible (${ms_pct.toFixed(0)}%) — risque d'ensilage mal conservé`);
    }
  }

  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade: QualityGrade;
  let label: string;
  let color: string;
  let bgColor: string;
  let borderColor: string;
  let description: string;

  if (score >= 80) {
    grade = "A";
    label = "Excellente qualité";
    color = "text-emerald-700";
    bgColor = "bg-emerald-100";
    borderColor = "border-emerald-300";
    description = "Fourrage de très haute qualité nutritionnelle. Convient aux animaux à besoins élevés (gestation fin, allaitement début).";
  } else if (score >= 60) {
    grade = "B";
    label = "Bonne qualité";
    color = "text-lime-700";
    bgColor = "bg-lime-100";
    borderColor = "border-lime-300";
    description = "Fourrage de qualité correcte. Adapté à la majorité des situations d'élevage.";
  } else if (score >= 40) {
    grade = "C";
    label = "Qualité moyenne";
    color = "text-amber-700";
    bgColor = "bg-amber-100";
    borderColor = "border-amber-300";
    description = "Fourrage de qualité moyenne. À compléter avec des concentrés pour les animaux à besoins élevés.";
  } else {
    grade = "D";
    label = "Qualité faible";
    color = "text-rose-700";
    bgColor = "bg-rose-100";
    borderColor = "border-rose-300";
    description = "Fourrage de faible qualité. Réservé aux animaux à besoins réduits (entretien) ou à mélanger avec de meilleurs fourrages.";
  }

  // Recommendations
  const recommendations: string[] = [];
  if (grade === "A") {
    recommendations.push("Réserver en priorité aux brebis gestantes et allaitantes");
    recommendations.push("Peut être distribué à volonté sans risque de déficit");
  } else if (grade === "B") {
    recommendations.push("Convient à la plupart des lots");
    recommendations.push("Compléter avec un concentré pour les allaitantes");
  } else if (grade === "C") {
    recommendations.push("Limiter la part dans la ration des animaux à besoins élevés");
    recommendations.push("Associer à un fourrage de meilleure qualité (grade A ou B)");
    recommendations.push("Prévoir une supplémentation énergétique (céréales)");
  } else {
    recommendations.push("Réserver aux brebis taries ou à l'entretien");
    recommendations.push("Mélanger avec au moins 50% de fourrage de meilleure qualité");
    recommendations.push("Prévoir une supplémentation énergétique et protéique importante");
  }

  return {
    grade,
    score,
    label,
    color,
    bgColor,
    borderColor,
    description,
    strengths,
    weaknesses,
    recommendations,
  };
}

// Seasonal availability data for forage types
export type SeasonalInfo = {
  harvestSeason: string;
  bestUsePeriod: string;
  storageType: string;
  conservationMonths: number;
};

export function getSeasonalInfo(forageName: string): SeasonalInfo {
  const n = forageName.toLowerCase();
  if (n.includes("pâture") || n.includes("pature") || n.includes("pré")) {
    return {
      harvestSeason: "Printemps - Automne (pâturage direct)",
      bestUsePeriod: "Avril - Novembre",
      storageType: "Non stockable (pâturage)",
      conservationMonths: 0,
    };
  }
  if (n.includes("ensilage")) {
    return {
      harvestSeason: "Mai - Juillet (récolte précoce)",
      bestUsePeriod: "Octobre - Avril",
      storageType: "Silo bouché (anaérobie)",
      conservationMonths: 12,
    };
  }
  if (n.includes("enrubann")) {
    return {
      harvestSeason: "Mai - Juillet",
      bestUsePeriod: "Octobre - Avril",
      storageType: "Enrubannage (film plastique)",
      conservationMonths: 12,
    };
  }
  if (n.includes("foin")) {
    return {
      harvestSeason: "Juin - Août (fenaison)",
      bestUsePeriod: "Octobre - Mai",
      storageType: "Sec, à l'abri de l'humidité",
      conservationMonths: 18,
    };
  }
  if (n.includes("paille")) {
    return {
      harvestSeason: "Juillet - Août",
      bestUsePeriod: "Toute l'année (litière + appoint)",
      storageType: "Sec, à l'abri",
      conservationMonths: 24,
    };
  }
  if (n.includes("betterave") || n.includes("navet") || n.includes("racine")) {
    return {
      harvestSeason: "Octobre - Décembre",
      bestUsePeriod: "Novembre - Mars",
      storageType: "Silo ou clamp (protégé du gel)",
      conservationMonths: 4,
    };
  }
  return {
    harvestSeason: "Variable selon type",
    bestUsePeriod: "Selon stockage",
    storageType: "Selon type",
    conservationMonths: 6,
  };
}

// Regional origin mapping
export type Region = {
  id: string;
  label: string;
  country: "FR" | "DZ";
};

export const REGIONS: Region[] = [
  // France
  { id: "fr-auvergne", label: "Auvergne-Rhône-Alpes", country: "FR" },
  { id: "fr-normandie", label: "Normandie", country: "FR" },
  { id: "fr-bretagne", label: "Bretagne", country: "FR" },
  { id: "fr-occitanie", label: "Occitanie", country: "FR" },
  { id: "fr-nouvelle-aquitaine", label: "Nouvelle-Aquitaine", country: "FR" },
  { id: "fr-pdl", label: "Pays de la Loire", country: "FR" },
  { id: "fr-bfc", label: "Bourgogne-Franche-Comté", country: "FR" },
  { id: "fr-grand-est", label: "Grand Est", country: "FR" },
  // Algérie
  { id: "dz-tizi-ouzou", label: "Tizi Ouzou", country: "DZ" },
  { id: "dz-bejaia", label: "Béjaïa", country: "DZ" },
  { id: "dz-setif", label: "Sétif", country: "DZ" },
  { id: "dz-tiaret", label: "Tiaret", country: "DZ" },
  { id: "dz-msila", label: "M'Sila", country: "DZ" },
  { id: "dz-djelfa", label: "Djelfa", country: "DZ" },
  { id: "dz-laghouat", label: "Laghouat", country: "DZ" },
  { id: "dz-ouargla", label: "Ouargla", country: "DZ" },
];

export function getRegionForFeed(feedName: string): Region | null {
  // Algerian feeds are prefixed with [DZ]
  if (feedName.startsWith("[DZ]")) {
    // Assign based on category or random for demo
    const dzRegions = REGIONS.filter((r) => r.country === "DZ");
    return dzRegions[Math.abs(feedName.length) % dzRegions.length];
  }
  // French feeds — assign based on name patterns
  const frRegions = REGIONS.filter((r) => r.country === "FR");
  return frRegions[Math.abs(feedName.length) % frRegions.length];
}
