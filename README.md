# CConnect

**College of Computing Career Network**

Le réseau professionnel privé des étudiants et alumni du **College of Computing**
(UM6P — Rabat & Benguerir).

Chercher un stage, ce n'est pas chercher une entreprise : c'est chercher la
bonne personne à qui parler. Cette information existe déjà dans la promo — elle
est simplement dispersée entre WhatsApp, LinkedIn et les carnets d'adresses
personnels. Ce projet la rassemble sur une carte, et laisse toujours le membre
qui connaît le contact décider de mettre en relation.

> **Statut :** MVP fonctionnel. Carte, filtres, contributions, statistiques,
> schéma Postgres avec RLS. Voir [ROADMAP](docs/ROADMAP.md) pour la suite.

## Démarrer en 2 minutes

```bash
npm install
npm run dev
```

Ouvrir <http://localhost:3000>. **Aucune configuration n'est nécessaire** :
sans variables d'environnement l'application tourne en *mode démo* sur un jeu
de données fictif, avec un membre de démonstration déjà connecté. C'est fait
exprès — un nouveau contributeur doit pouvoir voir l'application entière avant
d'avoir un compte Supabase.

Pour brancher la vraie base : voir [docs/SETUP_SUPABASE.md](docs/SETUP_SUPABASE.md).

## Ce que fait le produit

| | |
|---|---|
| 🌍 **Carte plein écran** | La carte *est* le produit : elle occupe tout l'espace, la recherche et les filtres flottent au-dessus. SVG rendu localement (Natural Earth, domaine public) — pas de clé API, pas de tuile distante, pas de traceur tiers. Molette, trackpad, glisser-déposer, zoom vers le curseur. |
| 🔎 **Recherche + filtres** | Autocomplétion locale sur entreprises, villes, pays, domaines et membres. Les filtres vivent dans un panneau qu'on ouvre ; les filtres actifs restent lisibles en puces. |
| 🧭 **Détail progressif** | Rien sous la carte par défaut. Cliquer une ville ouvre un panneau contextuel ; de là on descend vers la fiche entreprise. |
| 🎛️ **Critères croisés** | Continent, pays, ville, entreprise, domaine, campus, student/alumni, année, type de stage (PFA, PFE, stage, alternance, emploi, recherche). |
| 💼 **Expériences** | Ce que quelqu'un a réellement vécu : poste, année, process de recrutement, conseils. |
| 🤝 **Contacts** | Une personne connue dans une entreprise — **sans avoir eu à y travailler**. « Je n'ai jamais bossé chez Google, mais je connais un SWE à Berlin » vaut une entrée. |
| 💼 **Offres** | Annonces rattachées à une fiche entreprise : logo, lieu, durée, technologies, date de publication et d’expiration. |
| 🏢 **Entreprises** | Entités à part entière — secteur, site, LinkedIn, siège, description — avec leurs offres, leurs contacts et les expériences vécues. |
| 📊 **Statistiques** | Pays, villes, entreprises, domaines, évolution par année. |

## La règle de confidentialité, appliquée dans le schéma

La table `contacts` **n'a pas de colonne email ni téléphone**. Ce n'est pas une
politique d'interface qu'un futur contributeur pourrait contourner par
inadvertance : le stockage de coordonnées privées est structurellement
impossible. En plus de ça :

- les champs de texte libre sont scannés à l'écriture (email, téléphone → refus) ;
- l'accès est réservé aux adresses `@um6p.ma`, vérifié par un trigger Postgres,
  pas seulement par l'interface ;
- toutes les tables sont en Row Level Security : lecture réservée aux membres,
  écriture réservée à l'auteur de la contribution ;
- chaque entrée peut être signalée par n'importe quel membre.

Ces garanties sont publiées, pas seulement appliquées : la [politique de
confidentialité](src/app/legal/confidentialite/page.tsx), la [politique de
cookies](src/app/legal/cookies/page.tsx) et les [conditions
d'utilisation](src/app/legal/conditions/page.tsx) vivent dans l'application
(`/legal/…`) et sont engendrées depuis `src/lib/legal.ts` — registre des
traitements et inventaire des cookies compris. Leur acceptation est **bloquante** :
tant qu'un membre n'a pas accepté la version en cours, la coquille remplace
l'application entière par l'écran d'acceptation, et l'accord est horodaté dans
une table en ajout seul.

Côté cookies, il n'y en a que trois, tous strictement nécessaires — aucune
mesure d'audience, aucun traceur, aucun cookie tiers. Le bandeau informe donc,
il ne quémande pas un consentement sans objet.

Détail complet : [docs/SECURITY.md](docs/SECURITY.md).

## Stack

- **Next.js 16** (App Router, React 19, Server Components + Server Actions)
- **TypeScript** strict, **Tailwind CSS v4**
- **Supabase** (Postgres + Auth par lien magique + RLS)
- **d3-geo** + **world-atlas** pour la projection cartographique
- **zod** pour la validation, partagée client/serveur

## Structure

Pour se repérer sans tout lire : [docs/MAP.md](docs/MAP.md) va d'une intention
(« changer un libellé », « ajouter une colonne ») aux fichiers concernés, et
`docs/map/` détaille couche par couche.

```
src/
  app/                Routes (App Router)
    network/          Carte plein écran (écran principal)
    offers/           Liste des offres et fiche détaillée
    companies/        Liste, fiche détaillée et création d’entreprise
    contacts/         Server Actions de modification et suppression
    profile/          Profil membre : LinkedIn et email de contact
    contribute/       Formulaire + Server Action d'écriture
    stats/            Statistiques du réseau
    login/            Connexion par lien magique
    onboarding/       Création du profil membre
    auth/callback/    Échange du code OAuth/OTP
  components/
    ui/               Primitives du design system (bouton, puce, métrique…)
    map/              Carte SVG et ses contrôles
    network/          Recherche, filtres, tiroir de ville, modale de contact
  lib/
    types.ts          Modèle de domaine
    entries.ts        Filtrage, clustering par ville, statistiques (fonctions pures)
    repository.ts     Accès aux données — Supabase OU mode démo
    validation.ts     Schémas zod partagés
    data/             Référentiel de villes + jeu de démonstration
  proxy.ts            Rafraîchissement de session et garde de routes
supabase/
  migrations/         Schéma SQL, RLS, triggers
  seed.sql            Données de départ (villes, entreprises)
tests/                Tests unitaires et d’intégrité (node --test)
docs/                 Architecture, design system, sécurité, setup, roadmap
```

## Contribuer

Ce projet est pensé pour être repris par les promotions suivantes. Le point
d'entrée est [CONTRIBUTING.md](CONTRIBUTING.md), et l'architecture est
expliquée dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Toute
contribution visuelle passe par [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

Il y a du travail pour du frontend, du backend, de l'UI/UX, de la
cybersécurité, du DevOps, des tests, de la documentation et de la modération —
les tâches ouvertes sont listées dans [docs/ROADMAP.md](docs/ROADMAP.md).

## Licence

MIT — voir [LICENSE](LICENSE).
