// Interactive Encyclopedia Data
// Multilingual (FR/EN/AR) glossary with embedded calculators
// Reference: INRA 2018, Sauvant et al. 2011

export type Language = "fr" | "en" | "ar";

export type GlossaryEntry = {
  id: string;
  symbol: string;
  names: Record<Language, string>;
  category: "energie" | "proteines" | "mineraux" | "ingestion" | "economie" | "indicateur";
  unit: string;
  descriptions: Record<Language, string>;
  formula?: string;
  formulaLatex?: string;
  normalRange?: string;
  reference: string;
  // Embedded calculator
  calculator?: {
    type: "derm" | "rmic" | "caP" | "pdi" | "costPerUFL" | "coverage";
    inputs: Array<{ label: string; key: string; unit: string; default: number }>;
    compute: (inputs: Record<string, number>) => { result: number; label: string; unit: string; interpretation: string };
  };
  // Related terms
  related?: string[];
  // Video/resource links
  resources?: Array<{ type: "video" | "article" | "tool"; label: string; url: string }>;
};

export const GLOSSARY: GlossaryEntry[] = [
  // ---------- ÉNERGIE ----------
  {
    id: "ufl",
    symbol: "UFL",
    names: {
      fr: "Unité Fourragère Lait",
      en: "Forage Unit for Milk",
      ar: "وحدة علفية للحليب",
    },
    category: "energie",
    unit: "UFL/kg MS",
    descriptions: {
      fr: "Unité de référence pour l'énergie nette destinée à la production laitière et l'entretien. 1 UFL = 1700 kcal d'énergie nette. Utilisée pour les brebis, agnelles et béliers.",
      en: "Reference unit for net energy for milk production and maintenance. 1 UFL = 1700 kcal net energy. Used for ewes, ewe lambs, and rams.",
      ar: "وحدة مرجعية للطاقة الصافية المخصصة لإنتاج الحليب والصيانة. 1 UFL = 1700 سعرة حرارية صافية. تُستخدم للنعاج والحوليات والكباش.",
    },
    formula: "UFL = Énergie nette / 1700 kcal",
    normalRange: "Fourrages: 0.4–1.0 UFL/kg MS · Concentrés: 0.8–1.3 UFL/kg MS",
    reference: "INRA 2018 — Système d'unités fourragères",
    related: ["ufv", "uem", "derm"],
    resources: [
      { type: "article", label: "INRA 2018 — Tables", url: "https://www.inrae.fr" },
    ],
  },
  {
    id: "ufv",
    symbol: "UFV",
    names: {
      fr: "Unité Fourragère Viande",
      en: "Forage Unit for Meat",
      ar: "وحدة علفية للحوم",
    },
    category: "energie",
    unit: "UFV/kg MS",
    descriptions: {
      fr: "Unité d'énergie nette pour la production de viande. Utilisée principalement pour les agneaux à l'engrais. 1 UFV ≈ 1.82 UFL selon le type d'animal.",
      en: "Net energy unit for meat production. Used mainly for fattening lambs. 1 UFV ≈ 1.82 UFL depending on animal type.",
      ar: "وحدة طاقة صافية لإنتاج اللحوم. تُستخدم أساساً لتسمين الحملان. 1 UFV ≈ 1.82 UFL حسب نوع الحيوان.",
    },
    normalRange: "Agneaux: besoin de 0.6 à 1.5 UFV/j selon le poids et le GMQ",
    reference: "INRA 2018",
    related: ["ufl"],
  },
  {
    id: "uem",
    symbol: "UEM",
    names: {
      fr: "Unité d'Encombrement Mouton",
      en: "Sheep Fill Unit",
      ar: "وحدة امتلاء الخراف",
    },
    category: "ingestion",
    unit: "UEM",
    descriptions: {
      fr: "Mesure la capacité d'ingestion de l'animal. Une UEM correspond à environ 1.7 kg de MS de foin. La somme des UEM des aliments ne doit pas dépasser la capacité d'ingestion de l'animal.",
      en: "Measures the animal's intake capacity. One UEM corresponds to about 1.7 kg DM of hay. The sum of UEM from feeds must not exceed the animal's intake capacity.",
      ar: "تقيس قدرة الحيوان على الاستهلاك. وحدة UEM واحدة تعادل حوالي 1.7 كجم مادة جافة من التبن. مجموع وحدات الامتلاء من الأعلاف يجب ألا يتجاوز قدرة الحيوان على الاستهلاك.",
    },
    normalRange: "Brebis 70 kg: 1.5–2.5 UEM/j · Bélier: 2.0–3.0 UEM/j",
    reference: "INRA 2018 — Capacité d'ingestion",
    related: ["derm"],
  },
  {
    id: "derm",
    symbol: "DERm",
    names: {
      fr: "Densité Énergétique de la Ration minimale",
      en: "Minimum Dietary Energy Density",
      ar: "الكثافة الطاقية الدنيا للعليقة",
    },
    category: "indicateur",
    unit: "UFL/UEM",
    descriptions: {
      fr: "Rapport entre les besoins en UFL et la capacité d'ingestion (UEM). Indique la densité énergétique minimale que doit avoir la ration pour couvrir les besoins sans dépasser la capacité d'ingestion.",
      en: "Ratio between UFL requirements and intake capacity (UEM). Indicates the minimum energy density the ration must have to meet requirements without exceeding intake capacity.",
      ar: "النسبة بين احتياجات الطاقة (UFL) وقدرة الاستهلاك (UEM). تشير إلى الحد الأدنى للكثافة الطاقية التي يجب أن تحتويها العليقة لتلبية الاحتياجات دون تجاوز قدرة الاستهلاك.",
    },
    formula: "DERm = Besoins UFL / Capacité d'ingestion (UEM)",
    normalRange: "Brebis gestantes: 0.6–0.8 · Brebis allaitantes: 0.9–1.1",
    reference: "INRA 2018",
    related: ["ufl", "uem"],
    calculator: {
      type: "derm",
      inputs: [
        { label: "Besoins UFL", key: "ufl", unit: "UFL/j", default: 1.14 },
        { label: "Capacité d'ingestion", key: "uem", unit: "UEM", default: 1.71 },
      ],
      compute: (inputs) => {
        const derm = inputs.ufl / inputs.uem;
        let interpretation = "";
        if (derm < 0.6) interpretation = "Ration très peu dense — adaptée à l'entretien";
        else if (derm < 0.8) interpretation = "Densité faible — gestation début";
        else if (derm < 1.0) interpretation = "Densité moyenne — gestation fin / allaitement début";
        else if (derm < 1.2) interpretation = "Densité élevée — allaitement pic / croissance";
        else interpretation = "Densité très élevée — engraissement";
        return { result: derm, label: "DERm", unit: "UFL/UEM", interpretation };
      },
    },
  },

  // ---------- PROTÉINES ----------
  {
    id: "pdin",
    symbol: "PDIN",
    names: {
      fr: "Protéines Digestibles Intestinales (azote)",
      en: "Intestinally Digestible Protein (nitrogen)",
      ar: "بروتينات قابلة للهضم المعوي (نيتروجين)",
    },
    category: "proteines",
    unit: "g/kg MS",
    descriptions: {
      fr: "Protéines réellement absorbées dans l'intestin, issues de la dégradation de l'azote alimentaire non utilisé par les microbes du rumen. Réflète l'apport protéique alimentaire.",
      en: "Proteins actually absorbed in the intestine, from degradation of dietary nitrogen not used by rumen microbes. Reflects dietary protein supply.",
      ar: "البروتينات الممتصة فعلياً في الأمعاء، الناتجة عن تحلل النيتروجين الغذائي غير المستخدم من قبل ميكروبات الكرش. تعكس مدى الإمداد بالبروتين الغذائي.",
    },
    normalRange: "Fourrages: 50–120 g/kg · Concentrés: 60–350 g/kg",
    reference: "INRA 2018 — Système PDI",
    related: ["pdie", "pdi"],
  },
  {
    id: "pdie",
    symbol: "PDIE",
    names: {
      fr: "Protéines Digestibles Intestinales (énergie)",
      en: "Intestinely Digestible Protein (energy)",
      ar: "بروتينات قابلة للهضم المعوي (طاقة)",
    },
    category: "proteines",
    unit: "g/kg MS",
    descriptions: {
      fr: "Protéines microbiennes issues de la fermentation énergétique du rumen. Limite la synthèse microbienne lorsque l'énergie est le facteur limitant.",
      en: "Microbial proteins from energy fermentation in the rumen. Limits microbial synthesis when energy is the limiting factor.",
      ar: "بروتينات ميكروبية ناتجة عن تخمر الطاقة في الكرش. تحد من تخليق الميكروبات عندما تكون الطاقة هي العامل المحدد.",
    },
    normalRange: "Fourrages: 50–100 g/kg · Concentrés: 60–230 g/kg",
    reference: "INRA 2018",
    related: ["pdin", "pdi"],
  },
  {
    id: "pdi",
    symbol: "PDI",
    names: {
      fr: "Protéines Digestibles Intestinales",
      en: "Intestinely Digestible Protein",
      ar: "البروتينات القابلة للهضم المعوي",
    },
    category: "proteines",
    unit: "g/jour",
    descriptions: {
      fr: "Protéines réellement disponibles pour l'animal. Le PDI effectif est le minimum entre PDIN et PDIE (le facteur limitant détermine l'apport réel).",
      en: "Proteins actually available to the animal. Effective PDI is the minimum of PDIN and PDIE (the limiting factor determines actual supply).",
      ar: "البروتينات المتاحة فعلياً للحيوان. PDI الفعلي هو الحد الأدنى بين PDIN و PDIE (العامل المحدد يحدد الإمداد الفعلي).",
    },
    formula: "PDI = min(PDIN, PDIE)",
    normalRange: "Brebis 70 kg gestante: 100–180 g/j · Allaitante: 150–280 g/j",
    reference: "INRA 2018",
    related: ["pdin", "pdie"],
    calculator: {
      type: "pdi",
      inputs: [
        { label: "PDIN", key: "pdin", unit: "g/j", default: 146 },
        { label: "PDIE", key: "pdie", unit: "g/j", default: 140 },
      ],
      compute: (inputs) => {
        const pdi = Math.min(inputs.pdin, inputs.pdie);
        const limiting = inputs.pdin < inputs.pdie ? "PDIN (azote)" : "PDIE (énergie)";
        return {
          result: pdi,
          label: "PDI effectif",
          unit: "g/j",
          interpretation: `Facteur limitant: ${limiting}. PDI = min(${inputs.pdin}, ${inputs.pdie}) = ${pdi} g/j`,
        };
      },
    },
  },
  {
    id: "rmic",
    symbol: "RMIC",
    names: {
      fr: "Équilibre Azote/Énergie Microbien",
      en: "Rumen Microbial Nitrogen Balance",
      ar: "توازن النيتروجين/الطاقة الميكروبي",
    },
    category: "indicateur",
    unit: "g PDI/UFL",
    descriptions: {
      fr: "Indicateur de l'équilibre entre l'azote et l'énergie disponibles pour les microbes du rumen. Une valeur trop négative indique un déficit en azote dégradable, limitant la synthèse microbienne.",
      en: "Indicator of the balance between nitrogen and energy available to rumen microbes. A very negative value indicates a degradable nitrogen deficit, limiting microbial synthesis.",
      ar: "مؤشر على التوازن بين النيتروجين والطاقة المتاحة لميكروبات الكرش. القيمة السلبية جداً تشير إلى نقص النيتروجين القابل للتحلل، مما يحد من تخليق الميكروبات.",
    },
    formula: "RMIC = (PDIN - PDIE) / UFL",
    normalRange: "> -12 (agneaux simples) · > -6 (agneaux doubles) · Idéalement proche de 0",
    reference: "INRA 2018",
    related: ["pdin", "pdie", "ufl"],
    calculator: {
      type: "rmic",
      inputs: [
        { label: "PDIN total", key: "pdin", unit: "g/j", default: 146 },
        { label: "PDIE total", key: "pdie", unit: "g/j", default: 140 },
        { label: "UFL total", key: "ufl", unit: "UFL/j", default: 1.14 },
      ],
      compute: (inputs) => {
        const rmic = (inputs.pdin - inputs.pdie) / inputs.ufl;
        let interpretation = "";
        if (rmic < -12) interpretation = "⚠ Déséquilibre grave — déficit d'azote dégradable";
        else if (rmic < -6) interpretation = "⚠ Déséquilibre — surveiller les agneaux doubles";
        else if (rmic < 0) interpretation = "Léger déficit d'azote — acceptable";
        else if (rmic <= 10) interpretation = "✓ Équilibre optimal";
        else interpretation = "Excès d'azote — gaspillage et pollution";
        return { result: rmic, label: "RMIC", unit: "g PDI/UFL", interpretation };
      },
    },
  },

  // ---------- MINÉRAUX ----------
  {
    id: "pabs",
    symbol: "Pabs",
    names: {
      fr: "Phosphore absorbable",
      en: "Absorbable Phosphorus",
      ar: "الفوسفور القابل للامتصاص",
    },
    category: "mineraux",
    unit: "g/kg MS",
    descriptions: {
      fr: "Phosphore réellement disponible pour l'animal après absorption intestinale. Essentiel pour la croissance osseuse, le métabolisme énergétique et la reproduction.",
      en: "Phosphorus actually available to the animal after intestinal absorption. Essential for bone growth, energy metabolism, and reproduction.",
      ar: "الفوسفور المتاح فعلياً للحيوان بعد الامتصاص المعوي. ضروري لنمو العظام واستقلاب الطاقة والتكاثر.",
    },
    normalRange: "Fourrages: 1.0–4.0 g/kg · Concentrés: 0.5–9.0 g/kg",
    reference: "INRA 2018",
    related: ["caabs", "caP"],
  },
  {
    id: "caabs",
    symbol: "Caabs",
    names: {
      fr: "Calcium absorbable",
      en: "Absorbable Calcium",
      ar: "الكالسيوم القابل للامتصاص",
    },
    category: "mineraux",
    unit: "g/kg MS",
    descriptions: {
      fr: "Calcium réellement disponible pour l'animal. Critique pour la croissance osseuse, la lactation et la contraction musculaire.",
      en: "Calcium actually available to the animal. Critical for bone growth, lactation, and muscle contraction.",
      ar: "الكالسيوم المتاح فعلياً للحيوان. حاسم لنمو العظام والإرضاع وتقلص العضلات.",
    },
    normalRange: "Fourrages: 0.5–5.0 g/kg · Concentrés: 0.3–11.0 g/kg",
    reference: "INRA 2018",
    related: ["pabs", "caP"],
  },
  {
    id: "caP",
    symbol: "Ca/P",
    names: {
      fr: "Rapport Calcium/Phosphore",
      en: "Calcium/Phosphorus Ratio",
      ar: "نسبة الكالسيوم/الفوسفور",
    },
    category: "indicateur",
    unit: "ratio",
    descriptions: {
      fr: "Rapport entre le calcium absorbable et le phosphore absorbable. Un rapport équilibré est crucial pour éviter les calculs urinaires (trop de P) ou les troubles de l'absorption (trop de Ca).",
      en: "Ratio between absorbable calcium and absorbable phosphorus. A balanced ratio is crucial to avoid urinary calculi (too much P) or absorption disorders (too much Ca).",
      ar: "النسبة بين الكالسيوم القابل للامتصاص والفوسفور القابل للامتصاص. النسبة المتوازنة ضرورية لتجنب حصى المسالك البولية (زيادة الفوسفور) أو اضطرابات الامتصاص (زيادة الكالسيوم).",
    },
    formula: "Ca/P = Caabs / Pabs",
    normalRange: "Optimal: 1.0–1.5 · < 1.0 = risque de calculs · > 2.0 = interfère avec l'absorption du P",
    reference: "INRA 2018",
    related: ["pabs", "caabs"],
    calculator: {
      type: "caP",
      inputs: [
        { label: "Caabs total", key: "caabs", unit: "g/j", default: 3.5 },
        { label: "Pabs total", key: "pabs", unit: "g/j", default: 3.2 },
      ],
      compute: (inputs) => {
        const ratio = inputs.caabs / inputs.pabs;
        let interpretation = "";
        if (ratio < 0.8) interpretation = "⚠ Risque de calculs urinaires — trop de phosphore";
        else if (ratio < 1.0) interpretation = "Légèrement bas — surveiller les mâles";
        else if (ratio <= 1.5) interpretation = "✓ Optimal (1.0–1.5)";
        else if (ratio <= 2.0) interpretation = "Légèrement élevé";
        else interpretation = "⚠ Trop élevé — interfère avec l'absorption du P";
        return { result: ratio, label: "Ca/P", unit: "", interpretation };
      },
    },
  },
  {
    id: "cmv",
    symbol: "CMV",
    names: {
      fr: "Complément Minéral Vitaminé",
      en: "Mineral Vitamin Supplement",
      ar: "مكمل معدني فيتاميني",
    },
    category: "mineraux",
    unit: "g/jour",
    descriptions: {
      fr: "Mélange de minéraux (Ca, P, Mg, Na, oligo-éléments) et vitamines (A, D3, E) utilisé pour corriger les déficits minéraux de la ration. Le choix du CMV dépend du rapport Ca/P du déficit.",
      en: "Mixture of minerals (Ca, P, Mg, Na, trace elements) and vitamins (A, D3, E) used to correct mineral deficits in the ration. CMV choice depends on the deficit's Ca/P ratio.",
      ar: "مزيج من المعادن (الكالسيوم، الفوسفور، المغنيسيوم، الصوديوم، العناصر النادرة) والفيتامينات (A، D3، E) يُستخدم لتصحيح نقص المعادن في العليقة. يعتمد اختيار المكمل على نسبة Ca/P للنقص.",
    },
    normalRange: "10–50 g/animal/jour selon le déficit",
    reference: "INRA 2018",
    related: ["pabs", "caabs", "caP"],
  },

  // ---------- ÉCONOMIE ----------
  {
    id: "costPerUFL",
    symbol: "€/UFL",
    names: {
      fr: "Coût par Unité Fourragère Lait",
      en: "Cost per Forage Unit Milk",
      ar: "التكلفة لكل وحدة علفية",
    },
    category: "economie",
    unit: "€/UFL",
    descriptions: {
      fr: "Indicateur économique permettant de comparer l'efficience énergétique des rations. Plus le coût par UFL est bas, plus la ration est économique.",
      en: "Economic indicator comparing the energy efficiency of rations. Lower cost per UFL means a more economical ration.",
      ar: "مؤشر اقتصادي يقارن الكفاءة الطاقية للعلائق. انخفاض التكلفة لكل وحدة علفية يعني عليقة أكثر اقتصاداً.",
    },
    formula: "Coût/UFL = Coût total de la ration / UFL totaux",
    normalRange: "Fourrages: 0.05–0.20 €/UFL · Concentrés: 0.15–0.50 €/UFL",
    reference: "Calcul OvinFormulation",
    related: ["ufl"],
    calculator: {
      type: "costPerUFL",
      inputs: [
        { label: "Coût total ration", key: "cost", unit: "€/j", default: 0.45 },
        { label: "UFL totaux", key: "ufl", unit: "UFL/j", default: 1.14 },
      ],
      compute: (inputs) => {
        const costPerUFL = inputs.cost / inputs.ufl;
        let interpretation = "";
        if (costPerUFL < 0.20) interpretation = "✓ Très économique";
        else if (costPerUFL < 0.35) interpretation = "Coût modéré";
        else if (costPerUFL < 0.50) interpretation = "Coût élevé";
        else interpretation = "⚠ Coût très élevé — envisager des alternatives";
        return { result: costPerUFL, label: "Coût/UFL", unit: "€", interpretation };
      },
    },
  },
  {
    id: "costPerKgMS",
    symbol: "€/kg MS",
    names: {
      fr: "Coût par kg de matière sèche",
      en: "Cost per kg dry matter",
      ar: "التكلفة لكل كجم مادة جافة",
    },
    category: "economie",
    unit: "€/kg MS",
    descriptions: {
      fr: "Coût unitaire de la matière sèche de la ration. Permet de comparer des rations indépendamment de leur concentration énergétique.",
      en: "Unit cost of ration dry matter. Allows comparing rations independently of energy concentration.",
      ar: "التكلفة الوحدية للمادة الجافة للعليقة. يسمح بمقارنة العلائق بشكل مستقل عن التركيز الطاقي.",
    },
    formula: "Coût/kg MS = Coût total / MS totale",
    reference: "Calcul OvinFormulation",
    related: ["costPerUFL"],
  },

  // ---------- COVERAGE ----------
  {
    id: "coverage",
    symbol: "Couverture",
    names: {
      fr: "Taux de couverture des besoins",
      en: "Requirement Coverage Rate",
      ar: "معدل تغطية الاحتياجات",
    },
    category: "indicateur",
    unit: "%",
    descriptions: {
      fr: "Pourcentage des besoins nutritionnels couverts par les apports de la ration. 100% = couverture parfaite. <95% = déficit. >105% = excès.",
      en: "Percentage of nutritional requirements covered by ration supply. 100% = perfect coverage. <95% = deficit. >105% = excess.",
      ar: "النسبة المئوية للاحتياجات الغذائية التي تغطيها العليقة. 100% = تغطية مثالية. <95% = نقص. >105% = فائض.",
    },
    formula: "Couverture = (Apports / Besoins) × 100",
    normalRange: "Optimal: 95–105% · <90% = déficit · >110% = excès",
    reference: "Calcul OvinFormulation",
    related: ["ufl", "pdi", "pabs", "caabs"],
    calculator: {
      type: "coverage",
      inputs: [
        { label: "Apports", key: "supply", unit: "g ou UFL", default: 1.14 },
        { label: "Besoins", key: "need", unit: "g ou UFL", default: 1.14 },
      ],
      compute: (inputs) => {
        const coverage = (inputs.supply / inputs.need) * 100;
        let interpretation = "";
        if (coverage < 85) interpretation = "⚠ Déficit sévère";
        else if (coverage < 95) interpretation = "Déficit modéré";
        else if (coverage <= 105) interpretation = "✓ Équilibré (95–105%)";
        else if (coverage <= 115) interpretation = "Excès modéré";
        else interpretation = "⚠ Excès sévère — gaspillage";
        return { result: coverage, label: "Couverture", unit: "%", interpretation };
      },
    },
  },
];

export const CATEGORIES = [
  { id: "all", label: { fr: "Toutes", en: "All", ar: "الكل" }, icon: "📚", color: "text-stone-700" },
  { id: "energie", label: { fr: "Énergie", en: "Energy", ar: "الطاقة" }, icon: "⚡", color: "text-amber-700" },
  { id: "proteines", label: { fr: "Protéines", en: "Proteins", ar: "البروتينات" }, icon: "🧬", color: "text-emerald-700" },
  { id: "mineraux", label: { fr: "Minéraux", en: "Minerals", ar: "المعادن" }, icon: "💊", color: "text-rose-700" },
  { id: "ingestion", label: { fr: "Ingestion", en: "Intake", ar: "الاستهلاك" }, icon: "🌾", color: "text-lime-700" },
  { id: "economie", label: { fr: "Économie", en: "Economics", ar: "الاقتصاد" }, icon: "💰", color: "text-amber-700" },
  { id: "indicateur", label: { fr: "Indicateurs", en: "Indicators", ar: "مؤشرات" }, icon: "📊", color: "text-cyan-700" },
] as const;

// BibTeX citation generator
export function generateBibTeX(entry: GlossaryEntry): string {
  const key = entry.id.toUpperCase() + "_INRA2018";
  return `@misc{${key},
  title = {${entry.names.en} (${entry.symbol})},
  author = {INRA},
  year = {2018},
  howpublished = {\\url{https://www.inrae.fr}},
  note = {${entry.reference}},
}`;
}

// RIS citation generator
export function generateRIS(entry: GlossaryEntry): string {
  return `TY  - GEN
TI  - ${entry.names.en} (${entry.symbol})
AU  - INRA
PY  - 2018
PB  - ${entry.reference}
UR  - https://www.inrae.fr
ER  -`;
}
