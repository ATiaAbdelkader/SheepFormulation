// Microbial Encyclopedia Data
// Detailed info on rumen microbe types for the Rumen Lab

export type MicrobeInfo = {
  id: string;
  name: string;
  scientificName: string;
  type: "bacteria" | "protozoa" | "fungi" | "archaea";
  color: string;
  icon: string;
  // What they digest
  substrates: string[];
  products: string[];
  // Optimal conditions
  optimalPH: { min: number; max: number; optimal: number };
  optimalTemp: { min: number; max: number };
  // Role in rumen
  role: string;
  roleFr: string;
  description: string;
  descriptionFr: string;
  // Key species examples
  keySpecies: string[];
  // What happens when pH drops
  phDropEffect: string;
  // Population dynamics
  doublingTime: string; // hours
  biomassFraction: string; // % of total microbial biomass
};

export const MICROBE_ENCYCLOPEDIA: MicrobeInfo[] = [
  {
    id: "cellulolytic",
    name: "Bactéries cellulolytiques",
    scientificName: "Fibrobacter succinogenes, Ruminococcus albus",
    type: "bacteria",
    color: "#10b981",
    icon: "🟢",
    substrates: ["Cellulose", "Hémicellulose", "NDF", "ADF"],
    products: ["Acétate", "H₂", "CO₂", "Succinate"],
    optimalPH: { min: 6.2, max: 7.0, optimal: 6.7 },
    optimalTemp: { min: 38, max: 40 },
    role: "Primary fiber degraders",
    roleFr: "Dégradeurs primaires de fibres",
    description: "Gram-negative bacteria that break down cellulose and hemicellulose using cellulosome complexes. They are the most important microbes for forage digestion.",
    descriptionFr: "Bactéries Gram-négatives qui décomposent la cellulose et l'hémicellulose via des complexes cellulosomes. Ce sont les microbes les plus importants pour la digestion des fourrages.",
    keySpecies: ["Fibrobacter succinogenes", "Ruminococcus albus", "Ruminococcus flavefaciens"],
    phDropEffect: "Inhibition à pH < 6.0 — arrêt de la dégradation des fibres",
    doublingTime: "6-12h",
    biomassFraction: "20-30%",
  },
  {
    id: "amylolytic",
    name: "Bactéries amylolytiques",
    scientificName: "Streptococcus bovis, Ruminobacter amylophilus",
    type: "bacteria",
    color: "#f59e0b",
    icon: "🟡",
    substrates: ["Amidon", "Sucres", "Glucides solubles"],
    products: ["Lactate", "Propionate", "Butyrate", "Succinate"],
    optimalPH: { min: 5.5, max: 7.0, optimal: 6.0 },
    optimalTemp: { min: 38, max: 40 },
    role: "Starch and sugar fermenters",
    roleFr: "Fermenteurs d'amidon et de sucres",
    description: "Fast-growing bacteria that rapidly ferment starch and soluble sugars. Streptococcus bovis can produce excessive lactate, leading to lactic acidosis.",
    descriptionFr: "Bactéries à croissance rapide qui fermentent l'amidon et les sucres solubles. Streptococcus bovis peut produire un excès de lactate, causant l'acidose lactique.",
    keySpecies: ["Streptococcus bovis", "Ruminobacter amylophilus", "Prevotella ruminicola", "Selenomonas ruminantium"],
    phDropEffect: "Prolifération à pH < 6.0 — production de lactate qui aggrave l'acidose",
    doublingTime: "0.5-2h",
    biomassFraction: "30-40%",
  },
  {
    id: "proteolytic",
    name: "Bactéries protéolytiques",
    scientificName: "Prevotella ruminicola, Butyrivibrio fibrisolvens",
    type: "bacteria",
    color: "#ef4444",
    icon: "🔴",
    substrates: ["Protéines", "Peptides", "Acides aminés", "Azote non protéique"],
    products: ["NH₃", "Acides aminés", "Branched-chain VFA", "CO₂"],
    optimalPH: { min: 6.0, max: 7.0, optimal: 6.5 },
    optimalTemp: { min: 38, max: 40 },
    role: "Protein degraders — supply nitrogen for microbial protein",
    roleFr: "Dégradeurs de protéines — fournissent l'azote pour les protéines microbiennes",
    description: "Bacteria that hydrolyze proteins into peptides and amino acids, then deaminate them to produce ammonia (NH₃). This ammonia is used by other microbes for protein synthesis.",
    descriptionFr: "Bactéries qui hydrolysent les protéines en peptides et acides aminés, puis les désaminationnt pour produire de l'ammoniac (NH₃). Cet ammoniac est utilisé par d'autres microbes pour la synthèse protéique.",
    keySpecies: ["Prevotella ruminicola", "Butyrivibrio fibrisolvens", "Clostridium sticklandii", "Peptostreptococcus anaerobius"],
    phDropEffect: "Réduction de l'activité à pH < 5.8 — moins d'azote disponible",
    doublingTime: "2-4h",
    biomassFraction: "10-15%",
  },
  {
    id: "protozoa",
    name: "Protozoaires",
    scientificName: "Entodinium, Diplodinium, Isotricha",
    type: "protozoa",
    color: "#06b6d4",
    icon: "🔵",
    substrates: ["Bactéries (prédation)", "Amidon", "Sucres", "Cellulose (certains)"],
    products: ["Acétate", "Butyrate", "Lactate", "Biomasse microbienne"],
    optimalPH: { min: 6.0, max: 7.2, optimal: 6.8 },
    optimalTemp: { min: 38, max: 40 },
    role: "Predators of bacteria — regulate microbial populations",
    roleFr: "Prédateurs de bactéries — régulent les populations microbiennes",
    description: "Large eukaryotic organisms (50-200μm) that engulf bacteria and starch granules. They slow down starch fermentation (beneficial) but also consume 50% of bacterial protein (negative for PDI supply).",
    descriptionFr: "Organismes eucaryotes de grande taille (50-200μm) qui engloutissent les bactéries et les granules d'amidon. Ils ralentissent la fermentation de l'amidon (bénéfique) mais consomment aussi 50% des protéines bactériennes (négatif pour l'apport PDI).",
    keySpecies: ["Entodinium simplex", "Diplodinium dentatum", "Isotricha prostoma", "Dasytricha ruminantium"],
    phDropEffect: "Disparition à pH < 5.8 — défagellation et lyse",
    doublingTime: "24-48h",
    biomassFraction: "20-50% (variable)",
  },
  {
    id: "fungi",
    name: "Champignons anaérobies",
    scientificName: "Neocallimastix frontalis, Piromyces communis",
    type: "fungi",
    color: "#a855f7",
    icon: "🟣",
    substrates: ["Cellulose lignifiée", "Hémicellulose", "Pectine", "Lignine (partiellement)"],
    products: ["Acétate", "Lactate", "Éthanol", "H₂", "Enzymes cellulosolytiques"],
    optimalPH: { min: 6.0, max: 7.5, optimal: 6.8 },
    optimalTemp: { min: 37, max: 41 },
    role: "Pioneer colonizers of lignified fiber",
    roleFr: "Colonisateurs pionniers des fibres lignifiées",
    description: "The only anaerobic fungi in nature. They penetrate lignified plant tissues with rhizoids and secrete powerful cellulosolytic enzymes. Essential for digesting mature forages and straw.",
    descriptionFr: "Les seuls champignons anaérobies de la nature. Ils pénètrent les tissus végétaux lignifiés avec des rhizoïdes et sécrètent de puissantes enzymes cellulosolytiques. Essentiels pour digérer les fourrages matures et la paille.",
    keySpecies: ["Neocallimastix frontalis", "Piromyces communis", "Caecomyces equi", "Orpinomyces joyonii"],
    phDropEffect: "Inhibition à pH < 6.0 — perte de l'activité cellulosolytique sur fibres dures",
    doublingTime: "8-16h",
    biomassFraction: "5-10%",
  },
  {
    id: "methanogens",
    name: "Archées méthanogènes",
    scientificName: "Methanobrevibacter ruminantium, Methanosarcina",
    type: "archaea",
    color: "#78716c",
    icon: "⚪",
    substrates: ["H₂ + CO₂", "Acétate (certains)", "Formate", "Méthanol"],
    products: ["CH₄ (méthane)", "H₂O", "CO₂"],
    optimalPH: { min: 6.0, max: 7.5, optimal: 6.9 },
    optimalTemp: { min: 37, max: 42 },
    role: "Hydrogen sinks — maintain low H₂ pressure for fermentation",
    roleFr: "Puits d'hydrogène — maintiennent une faible pression H₂ pour la fermentation",
    description: "Not bacteria but Archaea — a separate domain of life. They convert H₂ and CO₂ (byproducts of fermentation) into methane (CH₄). This represents 2-12% energy loss for the animal and is a potent greenhouse gas (28× CO₂ GWP).",
    descriptionFr: "Pas des bactéries mais des Archées — un domaine du vivant séparé. Elles convertissent le H₂ et CO₂ (sous-produits de la fermentation) en méthane (CH₄). Cela représente 2-12% de perte d'énergie pour l'animal et un puissant gaz à effet de serre (28× CO₂ en GWP100).",
    keySpecies: ["Methanobrevibacter ruminantium", "Methanobrevibacter smithii", "Methanosarcina barkeri", "Methanomicrobium mobile"],
    phDropEffect: "Réduction à pH < 5.5 — moins de méthane (seul point positif de l'acidose!)",
    doublingTime: "12-24h",
    biomassFraction: "1-3% (mais activité métabolique élevée)",
  },
];

// pH buffer simulation
export type BufferResult = {
  bicarbonateGrams: number;
  phBefore: number;
  phAfter: number;
  phChange: number;
  bufferingCapacity: number; // mEq/L
  salivaContribution: number; // L/day
  recommendation: string;
  costPerDay: number;
};

// Bicarbonate buffering: 1g NaHCO3 per 50kg body weight raises pH by ~0.1-0.15
export function simulateBuffer(
  currentPH: number,
  animalWeight: number,
  bicarbonateGrams: number
): BufferResult {
  // Each gram of NaHCO3 per 50kg BW raises pH by ~0.12
  const dosePer50kg = bicarbonateGrams / (animalWeight / 50);
  const phChange = Math.min(0.8, dosePer50kg * 0.12);
  const phAfter = Math.min(7.2, currentPH + phChange);
  const actualChange = phAfter - currentPH;

  // Buffering capacity (mEq/L) — approximate
  const bufferingCapacity = bicarbonateGrams * 12; // ~12 mEq per gram NaHCO3

  // Saliva contribution (L/day) — sheep produce ~6-10 L/day
  const salivaContribution = 4 + (animalWeight / 70) * 4;

  // Cost: NaHCO3 ~0.50 €/kg
  const costPerDay = (bicarbonateGrams / 1000) * 0.50;

  let recommendation = "";
  if (currentPH < 5.5) {
    recommendation = "Acidose aiguë! Le bicarbonate seul ne suffit pas. Réduisez les concentrés immédiatement et consultez un vétérinaire.";
  } else if (currentPH < 6.0) {
    if (phAfter >= 6.2) {
      recommendation = `Acidose subaiguë corrigée: pH remonté à ${phAfter.toFixed(2)}. Maintenez la dose et surveillez. Réduisez aussi la part de concentré.`;
    } else {
      recommendation = `Acidose subaiguë partiellement corrigée. Augmentez la dose à ${Math.ceil((6.2 - currentPH) / 0.12 * (animalWeight / 50))}g ou réduisez les concentrés.`;
    }
  } else if (currentPH < 6.4) {
    recommendation = `pH limite. La supplémentation en bicarbonate (${bicarbonateGrams}g) élève le pH à ${phAfter.toFixed(2)}. Préventif acceptable.`;
  } else {
    recommendation = `pH normal (${currentPH.toFixed(2)}). Aucune supplémentation nécessaire. Le bicarbonate n'est pas justifié.`;
  }

  return {
    bicarbonateGrams,
    phBefore: currentPH,
    phAfter,
    phChange: actualChange,
    bufferingCapacity,
    salivaContribution,
    recommendation,
    costPerDay,
  };
}
