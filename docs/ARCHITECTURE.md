# Architecture

Ce document explique **pourquoi** le code est organisé ainsi. Si tu arrives sur
le projet dans deux ans, commence ici.

## Vue d'ensemble

```
Navigateur
   │  (HTML rendu côté serveur + îlots React)
   ▼
Next.js App Router  ──── proxy.ts (rafraîchit la session, garde les routes)
   │
   ├── Server Components  ──► src/lib/repository.ts ──┬──► Supabase (Postgres + RLS)
   │                                                   └──► mode démo (mémoire)
   └── Server Actions     ──► validation zod ──► repository
```

Trois idées structurent tout le reste.

### 1. Le rendu se fait sur le serveur, les données ne transitent jamais deux fois

Les pages (`src/app/**/page.tsx`) sont des Server Components : elles appellent
directement `repository.ts` et passent les données déjà façonnées aux
composants clients. Il n'y a **pas d'API REST maison**, pas de `useEffect` de
chargement, pas d'état de chargement à gérer.

Les seuls composants `"use client"` sont ceux qui ont besoin
d'interactivité : la carte, les filtres, les formulaires.

### 2. `repository.ts` est la seule porte vers les données

Aucun composant n'importe Supabase. Toutes les lectures et écritures passent
par `src/lib/repository.ts` et `src/app/*/actions.ts`.

Conséquence directe : le **mode démo**. Quand `NEXT_PUBLIC_SUPABASE_URL` est
absent, le repository sert le jeu de données de `src/lib/data/seed.ts` et écrit
dans `src/lib/demo-store.ts` (mémoire). L'application entière fonctionne sans
backend, ce qui rend le projet abordable pour un contributeur qui découvre.

C'est aussi ce qui permettrait de changer de base plus tard sans réécrire
l'interface.

### 3. La logique métier est en fonctions pures

`src/lib/entries.ts` contient le filtrage, le regroupement par ville et le
calcul des statistiques. Aucune dépendance à React, à Next ou à Supabase : ce
sont des fonctions testables directement, et c'est là qu'il faut écrire les
premiers tests unitaires (voir ROADMAP).

## Modèle de données

```
profiles ──┬─< experiences >── companies
           │        │
           │        └────────< places
           └─< contacts >──── companies / places

reports ──> (experience | contact | profile)
```

- **`experiences`** : ce qu'un membre a vécu (PFA, PFE, stage, alternance,
  emploi, recherche).
- **`contacts`** : une personne connue dans une entreprise. **Aucune colonne
  email ou téléphone** — voir [SECURITY.md](SECURITY.md).
- **`places`** : référentiel de villes avec latitude/longitude. La carte ne
  géocode rien à la volée ; ajouter une ville est une contribution explicite.
- **`companies`** : dédoublonnées par `slug`, créées à la volée lors d'une
  contribution.

Les deux types d'entrée sont projetés vers un type unique `Entry`
(`src/lib/types.ts`) pour que la carte et la liste n'aient qu'une seule forme à
manipuler.

## La carte

Volontairement **sans bibliothèque de cartographie**. `d3-geo` projette la
géométrie de `world-atlas` (Natural Earth, domaine public) en chemins SVG.

Ce que ça évite : clé API, quota, tuiles distantes, traceur tiers, et une CSP
qu'il faudrait ouvrir. Ce que ça coûte : pas de rue ni de relief — inutiles
pour l'usage visé.

La projection est **recalculée à la taille réelle du conteneur** (ResizeObserver
+ `useMemo`) au lieu d'être figée dans un viewBox. C'est ce qui permet à la
carte d'occuper toute la largeur disponible sans jamais rogner un continent, et
de réserver une marge haute pour la barre de recherche flottante.

Zoom et déplacement sont une transformation `translate(x y) scale(k)` avec
`transform-origin: 0 0`. Cette origine simplifie le zoom vers le curseur :

    x' = mx − (mx − x) · k'/k

L'écouteur `wheel` est attaché à la main plutôt que via React, qui l'enregistre
en passif — sans `preventDefault()`, la page défilerait pendant le zoom. Le
pincement trackpad arrive comme un `wheel` avec `ctrlKey`, avec sa propre
intensité. La transition CSS n'est active que pour les boutons : à la molette
elle introduirait un retard.

Les marqueurs sont regroupés par ville (`clusterByPlace`) ; leur rayon suit la
racine carrée du nombre d'entrées, pour que l'aire perçue reste proportionnelle.
Leur couleur encode la densité, jamais le domaine — voir
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Le détail arrive par paliers

L'écran de la carte n'affiche rien d'autre au repos — pas de liste de cartes
sous la carte. Le détail se déplie à mesure qu'on explore :

1. la carte et ses marqueurs ;
2. une info-bulle au survol (ville, volumes) ;
3. un panneau contextuel au clic sur une ville : chiffres, entreprises,
   domaines, contributions ;
4. la fiche entreprise (`/companies/[slug]`) pour le détail complet.

Le panneau ne couvre pas la carte : elle reste visible et manipulable derrière,
et les contrôles de zoom se décalent pour ne pas passer dessous. Sur mobile, le
même composant est présenté en feuille basse — c'est le même contenu réagencé,
pas une colonne rétrécie.

## Recherche

`buildSuggestions()` (dans `src/lib/entries.ts`) construit l'autocomplétion à
partir des entrées déjà chargées : aucun aller-retour réseau, et le classement
reflète ce que le réseau contient réellement. La recherche libre indexe aussi
les libellés affichés (domaine, statut, campus) et des alias de pays
(`src/lib/data/countries.ts`), pour que « alumni Germany » ou
« Cybersecurity Paris » fonctionnent sans moteur de recherche.

## Authentification

Lien magique Supabase, restreint aux domaines de `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS`.

1. `/login` envoie le lien (filtre côté client, pour ne pas écrire à n'importe qui).
2. `/auth/callback` échange le code contre une session, vérifie le domaine, et
   redirige vers `/onboarding` si le profil n'existe pas encore.
3. `proxy.ts` rafraîchit la session à chaque requête et bloque les routes
   membres — de façon **optimiste**. L'autorisation réelle vient des politiques
   RLS de Postgres.

## Décisions notables

| Décision | Raison |
|---|---|
| Next.js App Router plutôt qu'un SPA + API | Moins de code : pas d'API à écrire ni de client HTTP à maintenir. |
| Supabase plutôt qu'un backend maison | RLS écrit une fois, appliqué partout ; pas de serveur à héberger pour une association étudiante. |
| Mode démo en mémoire | Un contributeur doit pouvoir lancer le projet en une commande. |
| Carte SVG maison | Zéro dépendance externe au runtime, CSP stricte possible. |
| Pas de colonne email/téléphone pour les contacts | Ce qui n'existe pas ne peut pas fuiter. |
| Français dans l'interface, anglais dans le code | L'interface s'adresse à la promo ; le code doit rester lisible par tous. |
| Carte en plein cadre, filtres en surcouche | La carte est le produit. Une colonne de filtres permanente lui prenait un quart de l'écran pour une information qu'on consulte par intermittence. |
| Une seule couleur d'accent | Voir [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) : la couleur porte une information, elle ne décore pas. |
| `contact_email` et `linkedin_url` sur `profiles` | Ce sont les coordonnées **du membre**, qu'il choisit d'exposer. La règle « aucune coordonnée d'un contact externe » reste intacte. |
| Pas d'OAuth LinkedIn | Rien n'est configuré côté fournisseur ; prétendre le contraire serait mentir. La colonne `linkedin_id` existe pour que l'ajout soit une migration additive. |
