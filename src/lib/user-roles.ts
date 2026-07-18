// User Role Management — Role-Based Access Control (RBAC)
// Three tiers: Student → Farmer → Feed Mill (each includes everything below)

export type UserRole = "student" | "farmer" | "feedmill";

export type RoleInfo = {
  id: UserRole;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  color: string;
  bgColor: string;
  features: string[];
};

export const ROLES: RoleInfo[] = [
  {
    id: "student",
    label: "Étudiant",
    shortLabel: "Étudiant",
    icon: "🎓",
    description: "Accès aux outils d'apprentissage: bases de données, calculateurs, simulateur de rumen, quiz et glossaire.",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    features: [
      "Bases de données (animaux, fourrages, concentrés, CMV)",
      "Calculateur de ration (visualisation)",
      "Simulateur de rumen interactif",
      "Glossaire multilingue (FR/EN/AR)",
      "Décodeur d'étiquettes",
      "Mode classe (étudiant)",
      "Quiz et certificats",
    ],
  },
  {
    id: "farmer",
    label: "Éleveur",
    shortLabel: "Éleveur",
    icon: "🚜",
    description: "Gestion complète de la ferme: rations, inventaire, pâturage, calendrier, santé, IA.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    features: [
      "Tout ce qui est inclus dans Étudiant",
      "Assistant IA (génération de rations)",
      "Sauvegarde et chargement de rations",
      "Multi-lot et planificateur de transition",
      "Vérificateur de ration",
      "Comparateur de scénarios",
      "Inventaire fourrager et suivi des prix",
      "Bilan fourrager du troupeau",
      "Calendrier de production",
      "Suivi de pâturage",
      "Aliments personnalisés",
      "Prévision des risques sanitaires",
      "Calculateur de coût (€/animal/jour)",
    ],
  },
  {
    id: "feedmill",
    label: "Mini-usine d'aliment",
    shortLabel: "Usine",
    icon: "🏭",
    description: "Production, traçabilité, contrôle qualité, distribution — pour les petits fabricants d'aliment.",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    features: [
      "Tout ce qui est inclus dans Éleveur",
      "Gestion de production (lots, batches)",
      "Contrôle qualité (inspections, CAPA)",
      "Traçabilité des lots (généalogie)",
      "Gestion des achats et fournisseurs",
      "Distribution et commandes",
      "Calculateur de ROI",
      "Export de recettes de production",
      "Analyse de sensibilité des prix",
    ],
  },
];

// Module access matrix — which modules each role can access
export const MODULE_ACCESS: Record<UserRole, string[]> = {
  student: [
    "dashboard",
    "ration",
    "optimisation",  // single objective only
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "glossaire",
    "rumen-sim",
    "prevision",
    "melange",       // 2-mix only
    "classroom",     // student mode
  ],
  farmer: [
    // All student modules
    "dashboard",
    "ration",
    "optimisation",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "glossaire",
    "rumen-sim",
    "prevision",
    "melange",
    "classroom",
    // Farmer-only modules
    "ai-ration",
    "verificateur",
    "comparer",
    "custom-feeds",
    "bilan",
    "paturage",
    "calendrier",
  ],
  feedmill: [
    // All student + farmer modules
    "dashboard",
    "ration",
    "optimisation",
    "animals",
    "fourrages",
    "concentres",
    "cmv",
    "agneaux",
    "glossaire",
    "rumen-sim",
    "prevision",
    "melange",
    "classroom",
    "ai-ration",
    "verificateur",
    "comparer",
    "custom-feeds",
    "bilan",
    "paturage",
    "calendrier",
    // Feed mill-only modules
    "production",
  ],
};

// Modules that are locked per role (shown but greyed out with upgrade prompt)
export const LOCKED_MODULES: Record<UserRole, Array<{ id: string; label: string; requiredRole: UserRole }>> = {
  student: [
    { id: "ai-ration", label: "Assistant IA", requiredRole: "farmer" },
    { id: "verificateur", label: "Vérificateur", requiredRole: "farmer" },
    { id: "comparer", label: "Comparer", requiredRole: "farmer" },
    { id: "custom-feeds", label: "Mes aliments", requiredRole: "farmer" },
    { id: "bilan", label: "Bilan fourrager", requiredRole: "farmer" },
    { id: "paturage", label: "Pâturage", requiredRole: "farmer" },
    { id: "calendrier", label: "Calendrier", requiredRole: "farmer" },
    { id: "production", label: "Production", requiredRole: "feedmill" },
  ],
  farmer: [
    { id: "production", label: "Production", requiredRole: "feedmill" },
  ],
  feedmill: [],
};

// Check if a role can access a module
export function canAccess(role: UserRole, moduleId: string): boolean {
  return MODULE_ACCESS[role].includes(moduleId);
}

// Get the role that unlocks a module
export function getRequiredRole(moduleId: string): UserRole | null {
  for (const role of ["student", "farmer", "feedmill"] as UserRole[]) {
    if (MODULE_ACCESS[role].includes(moduleId)) return role;
  }
  return null;
}

// localStorage persistence
const ROLE_KEY = "ovinformulation:user-role";

export function getStoredRole(): UserRole {
  if (typeof window === "undefined") return "farmer"; // default
  try {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored === "student" || stored === "farmer" || stored === "feedmill") return stored;
    return "farmer"; // default to farmer (most useful for general users)
  } catch {
    return "farmer";
  }
}

export function setStoredRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROLE_KEY, role);
}

// Role hierarchy for upgrade prompts
export function getNextRole(role: UserRole): UserRole | null {
  if (role === "student") return "farmer";
  if (role === "farmer") return "feedmill";
  return null;
}

export function getRoleInfo(role: UserRole): RoleInfo {
  return ROLES.find((r) => r.id === role) || ROLES[1]; // default farmer
}
