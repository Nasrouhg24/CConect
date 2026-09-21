# Carte — composants

Retour à la [carte générale](../MAP.md).

Règle : toute variation visuelle passe par `ui/`. Un écran qui invente ses
paddings et ses rayons fait revenir l'incohérence que le système de design a
supprimée — voir `docs/DESIGN_SYSTEM.md`.

## Primitives (`components/ui/`)

| Fichier | Exporte |
|---|---|
| `ui/index.tsx` | `Button`, `IconButton`, `Chip`, `DomainDot`, `Metric`, `ChoiceOption`, `StepProgress` |
| `ui/button.ts` | `buttonClass`, `ButtonVariant`, `ButtonSize` — hors du module client, donc importable depuis un Server Component |
| `ui/fields.ts` | `inputClass`, `textareaClass`, `selectClass`, `labelClass`, `panelClass` — même raison |
| `ui/feedback.tsx` | `EmptyState`, `Skeleton`, `LoadingRegion`, `SkeletonRows` |

## Coquille

| Fichier | Rôle |
|---|---|
| `Brand.tsx` | `BrandMark`, `BrandLockup`. |
| `SiteHeader.tsx` | Navigation, menu du compte (motif « menu button » de l'ARIA APG). |
| `PageShell.tsx` | `PageShell` (pages de contenu), `FlowShell` (parcours pas à pas), `SiteFooter` (porte les liens légaux). |

## Carte du monde (`components/map/`)

| Fichier | Rôle |
|---|---|
| `map/WorldMap.tsx` | Le gros morceau : projection, zoom, grappes, rendu SVG local (Natural Earth, aucune tuile distante). |
| `map/MapControls.tsx` | Zoom, recentrage, légende. |

## Écran réseau (`components/network/`)

| Fichier | Rôle |
|---|---|
| `network/NetworkExplorer.tsx` | Assemble carte, recherche, filtres, panneau. État des filtres ↔ URL. |
| `network/NetworkSearch.tsx` | Recherche globale flottante, autocomplétion locale. |
| `network/FilterMenu.tsx` | Filtres en surcouche. |
| `network/ActiveFilters.tsx` | Filtres actifs en puces retirables. |
| `network/PlaceDrawer.tsx` | Panneau contextuel d'une ville. |
| `network/ContactModal.tsx` | Mise en relation avec l'auteur d'une entrée. |

## Entreprises (`components/companies/`)

| Fichier | Rôle |
|---|---|
| `companies/CompanyLibrary.tsx` | Répertoire : recherche, secteurs, lignes de fiche. |
| `companies/CompanyContacts.tsx` | Contacts d'une entreprise, présentés comme des profils. |
| `companies/CompanyExperiences.tsx` | Expériences vécues, avec édition par l'auteur. |
| `companies/CompanyConnections.tsx` | Connexions UM6P d'une entreprise. |
| `companies/CompanyForm.tsx` | Création/édition d'une fiche. |
| `CompanyLogo.tsx` | Logo ou monogramme ; rayons alignés sur les tokens. |
| `CompanyPicker.tsx` | Sélecteur d'entreprise (existante ou à créer). |

## Carrière et conseiller

| Fichier | Rôle |
|---|---|
| `advisor/AdvisorDashboard.tsx` | Tableau du conseiller. |
| `advisor/ActionPlan.tsx` | « Ton plan d'action » — la couche « que faire ensuite ». |
| `career/CareerProfileForm.tsx` | Parcours et objectifs du membre. |
| `career/CareerTimeline.tsx` | Frise : UM6P puis chaque relation, dans l'ordre. |
| `career/ExperienceCareerFields.tsx` | Dates, statut et compétences d'une expérience. |
| `career/ContactPersonButton.tsx` | Ouvre la modale de mise en relation depuis une fiche. |

## Profil et contribution

| Fichier | Rôle |
|---|---|
| `ContributionForm.tsx` | Formulaire d'ajout (expérience ou contact). |
| `OnboardingForm.tsx` | Création du profil en deux étapes + acceptation des politiques. |
| `ProfileChannels.tsx` | Canaux de contact du membre. |
| `ProfilePhoto.tsx` | Dépôt, recadrage et retrait de la photo. |

## Accueil (`components/home/`)

| Fichier | Rôle |
|---|---|
| `home/HomeMap.tsx` | Carte décorative de l'accueil, géométrie calculée une fois par processus. |
| `home/NetworkPreview.tsx` | Aperçu du graphe (marque au centre, quatre satellites). |
| `home/JoinSection.tsx` | Dernière section de l'accueil et de la Couverture. |

## Légal (`components/legal/`)

| Fichier | Rôle |
|---|---|
| `legal/LegalDoc.tsx` | Typographie des pages légales : `LegalDoc`, `LegalMeta`, `Article`, `P`, `Guarantee`, `List`, `Register`, `LegalContact`, `LegalNav`. |
| `legal/ConsentGate.tsx` | Écran d'acceptation. Rien n'est pré-coché ; le refus mène quelque part. |
| `legal/CookieNotice.tsx` | Bandeau d'information (pas de recueil de consentement : tout est nécessaire). |

## Terminal

| Fichier | Rôle |
|---|---|
| `terminal/TerminalExplorer.tsx` | Interface du mode terminal. La logique est dans `lib/terminal/`. |
