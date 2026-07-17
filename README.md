# 🐑 OvinFormulation v1.0

### Plateforme de formulation de rations pour ovins — Sheep Feed Formulation Platform

> **D'après Abdelkader Atia — AgriSkills Academy**
> 
> Outil pédagogique et professionnel de formulation de rations pour ovins, basé sur les tables INRA 2018 et les données ITGC/INRAA Algérie.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple)](https://web.dev/progressive-web-apps/)

---

## 📖 Table des matières / Table of Contents

- [Aperçu / Overview](#aperçu--overview)
- [Fonctionnalités / Features](#fonctionnalités--features)
- [Captures d'écran / Screenshots](#captures-décran--screenshots)
- [Architecture technique / Tech Stack](#architecture-technique--tech-stack)
- [Installation](#installation)
- [Données / Data Sources](#données--data-sources)
- [Système de rôles / Role System](#système-de-rôles--role-system)
- [Roadmap](#roadmap)
- [Crédits / Credits](#crédits--credits)
- [Licence / License](#licence--license)

---

## Aperçu / Overview

**OvinFormulation** est une application web complète de formulation de rations pour ovins, conçue pour trois publics :

1. **🎓 Étudiants** — Apprendre la nutrition ovine avec simulateurs interactifs, quiz, et calculateurs
2. **🚜 Éleveurs** — Gérer leur troupeau : rations, inventaire, pâturage, calendrier, santé
3. **🏭 Mini-usines d'aliment** — Production, traçabilité, contrôle qualité, distribution

L'application combine les tables **INRA 2018** (France) et les données **ITGC/INRAA** (Algérie) pour offrir une base de données de **480+ aliments** (fourrages, concentrés, CMV) adaptée au contexte méditerranéen et nord-africain.

---

## Fonctionnalités / Features

### 🧮 Formulation & Calcul

| Module | Description |
|--------|-------------|
| **Ration Pro** | Calculateur de ration avec coût, sauvegarde, impression PDF, multi-lot, planificateur de transition |
| **Assistant IA** | Génération de rations en langage naturel (Z.ai SDK) — "50 brebis gestantes, foin + orge" |
| **Optimisation Multi-Objectif** | Solveur LP (Simplex) avec front de Pareto : coût vs méthane vs santé |
| **Vérificateur** | Analyse de ration inconnue → identification de l'animal cible + corrections |
| **Mélange Avancé** | 2-mix, multi-mix (3+), moindre coût LP, instructions de batch, recettes sauvegardées |
| **Comparer** | Comparaison 2-3 rations, simulateur de scénario (troupeau), radar d'overlay, profils de risque |

### 📊 Bases de données

| Module | Description |
|--------|-------------|
| **Animaux** | 354 catégories (brebis, bélier, agnelle) × poids × stade physiologique |
| **Fourrages** | 340 fourrages FR + notation qualité A/B/C/D, inventaire, suivi des prix |
| **Concentrés** | 34 concentrés FR + marché, fournisseurs, achat en gros, substituts |
| **CMV** | 21 compléments minéraux + assistant de sélection 3 étapes + calculateur de dosage |
| **Agneaux** | 168 combinaisons poids × GMQ × potentiel × sexe + calculateur de rentabilité |
| **Mes aliments** | Création d'aliments personnalisés + base algérienne (59 aliments ITGC/INRAA) |

### 🧬 Outils pédagogiques

| Module | Description |
|--------|-------------|
| **Rumen Lab** | Simulateur de rumen temps réel : pH, 6 microbes, AGV, gaz, tampon pH, encyclopédie microbienne, comparaison |
| **Glossaire** | Encyclopédie interactive FR/EN/AR avec calculateurs intégrés et export BibTeX/RIS |
| **Prévision** | Décodeur d'étiquette : prédit UFL/PDI/dMO à partir de l'étiquette commerciale + IC 95% |
| **Classe (LMS)** | Académie complète : 15 modèles de devoirs, notation auto, classement, certificats, analytics |

### 🌾 Gestion de ferme

| Module | Description |
|--------|-------------|
| **Bilan Fourrager** | Besoins du troupeau vs stocks disponibles |
| **Pâturage** | Calculateur de jours d'avance |
| **Calendrier** | Planning annuel Gantt des stades physiologiques |

### 🏭 Production (Mini-usine)

| Module | Description |
|--------|-------------|
| **Production** | Gestion des batches avec instantané de formule, statuts (planifié→en cours→terminé) |
| **Lots** | Lots d'ingrédients et produits finis avec statut qualité |
| **Traçabilité** | Recherche de rappel : lot ingrédient → batch → expédition → client |
| **Commandes** | Commandes clients avec suivi des expéditions |

### 🌍 Innovation

| Feature | Description |
|---------|-------------|
| **Risques sanitaires** | 5 modèles : acidose, toxémie de gestation, calculs urinaires, hypocalcémie, mammites |
| **Impact environnemental** | Méthane (IPCC Ym), CO₂e (GWP100), azote excrété — par ration et par kg MS |
| **PWA + Offline** | Installable sur téléphone, fonctionne hors ligne |
| **Multilingue** | Français / English / العربية (RTL) |
| **ROI Calculator** | Calculateur de rentabilité adapté par rôle (éleveur / mini-usine) |

---

## Captures d'écran / Screenshots

### Tableau de bord
![Dashboard](screenshots/01-dashboard.png)

### Calculateur de ration
![Ration](screenshots/02-ration.png)

### Rumen Lab — Simulateur interactif
![Rumen Lab](screenshots/03-rumen-lab.png)

### Optimisation multi-objectif
![Optimisation](screenshots/04-optimisation.png)

### Assistant IA
![AI Assistant](screenshots/05-ai-assistant.png)

### Académie LMS
![Classroom](screenshots/06-classroom.png)

### Production & Traçabilité
![Production](screenshots/07-production.png)

### Base fourragère avec qualité A/B/C/D
![Fourrages](screenshots/08-fourrages.png)

### Encyclopédie multilingue
![Glossaire](screenshots/09-glossaire.png)

---

## Architecture technique / Tech Stack

| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Langage** | TypeScript 5 (strict mode) |
| **UI** | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| **Icônes** | Lucide React |
| **Base de données** | Prisma ORM + SQLite (développement) / PostgreSQL (production) |
| **IA** | Z.ai Web Dev SDK (chat completions, vision, web search) |
| **Optimisation** | Solveur Simplex LP (TypeScript pur, 2-phase, règle de Bland) |
| **Visualisation** | SVG pur (graphiques, radar, Gantt, rumen) — aucune dépendance externe |
| **PWA** | Service Worker + Web App Manifest + icônes |
| **Persistance** | localStorage (rations, aliments, stocks, prix, recettes) |
| **Auth** | Système de rôles basé sur localStorage (étudiant/éleveur/usine) |

---

## Installation

### Prérequis / Prerequisites

- [Node.js](https://nodejs.org/) 18+ ou [Bun](https://bun.sh/)
- npm ou bun

### Étapes / Steps

```bash
# 1. Cloner le dépôt
git clone https://github.com/ATiaAbdelkader/SheepFormulation.git
cd SheepFormulation

# 2. Installer les dépendances
bun install
# ou: npm install

# 3. Configurer la base de données
bun run db:push
# ou: npx prisma db push

# 4. (Optionnel) Charger les données de démonstration
npx tsx scripts/seed-demo.ts

# 5. Lancer le serveur de développement
bun run dev
# ou: npm run dev

# 6. Ouvrir http://localhost:3000
```

### Build de production / Production Build

```bash
bun run build
bun run start
```

### Variables d'environnement / Environment Variables

```env
# .env
DATABASE_URL="file:./db/custom.db"
# Pour l'IA (déjà configuré via z-ai-web-dev-sdk)
# Aucune clé API supplémentaire requise
```

---

## Données / Data Sources

| Source | Contenu | Référence |
|--------|---------|-----------|
| **INRA 2018** | Tables de composition et valeurs nutritives (France) | Éditions Quae, 720p |
| **Alim'OVINS v5.1** | Tableur original de F. Ranoux (Lycée Agricole du Bourbonnais) | educagri |
| **ITGC/INRAA** | Table de composition des matières premières (Algérie) | 59 aliments, 11 catégories |
| **IPCC 2019** | Facteurs d'émission méthane (Ym) pour petits ruminants | GIEC |
| **Sauvant et al. 2011** | Modélisation des flux d'azote et méthane | INRA Productions Animales |

---

## Système de rôles / Role System

| Rôle | Modules | Cible |
|------|---------|-------|
| 🎓 **Étudiant** | 13 modules | Étudiants en agronomie, apprentissage |
| 🚜 **Éleveur** | 20 modules | Éleveurs ovins, gestion de ferme |
| 🏭 **Mini-usine** | 22 modules | Petits fabricants d'aliment du bétail |

Chaque rôle inclut tout ce qui est en dessous (Étudiant ⊂ Éleveur ⊂ Usine). Le changement de rôle est gratuit et instantané via le sélecteur dans l'en-tête.

---

## Roadmap

- [x] RBAC (Student/Farmer/Feed Mill)
- [x] ROI Calculator
- [x] Production & Traceability
- [ ] Déploiement Vercel + PostgreSQL
- [ ] Authentification (NextAuth.js)
- [ ] Intégration météo (Open-Meteo API)
- [ ] Suivi des prix du marché (FranceAgriMer)
- [ ] OCR d'étiquettes (Z.ai VLM)
- [ ] Base de données communautaire d'analyses fourragères
- [ ] Mode sombre
- [ ] Application mobile native (React Native)

---

## Crédits / Credits

### Conception & Développement
**Abdelkader Atia** — AgriSkills Academy

### Sources de données
- **Fabrice Ranoux** — Lycée Agricole du Bourbonnais, Moulins (Alim'OVINS v5.1)
- **INRA 2018** — Alimentation des ruminants (Éditions Quae)
- **ITGC / INRAA** — Tables de composition algériennes
- **IPCC 2019** — Guidelines pour gaz à effet de serre

### Technologies
- [Next.js](https://nextjs.org) — Framework React
- [shadcn/ui](https://ui.shadcn.com) — Composants UI
- [Prisma](https://prisma.io) — ORM
- [Z.ai](https://z.ai) — SDK IA
- [Lucide](https://lucide.dev) — Icônes

---

## Licence / License

### Code : MIT License

```
MIT License

Copyright (c) 2024 Abdelkader Atia — AgriSkills Academy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

### Données : CC BY-NC-SA 4.0

Les données nutritionnelles (INRA 2018, Alim'OVINS, ITGC/INRAA) sont utilisées à des fins pédagogiques. Veuillez consulter les sources originales pour toute utilisation commerciale.

---

<div align="center">

**🐔🐑🐄 OvinFormulation v1.0 — AgriSkills Academy 🇩🇿🇫🇷**

[GitHub](https://github.com/ATiaAbdelkader/SheepFormulation) · [Issues](https://github.com/ATiaAbdelkader/SheepFormulation/issues)

</div>
