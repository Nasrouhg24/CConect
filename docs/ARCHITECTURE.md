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

### 1 bis. La seule frontière est la base, pas l'application

La clé anon de Supabase part dans le navigateur — c'est le principe même du
modèle. Un membre peut donc parler directement à PostgREST et court-circuiter
entièrement Next.js. **Toute règle qui ne vit que dans une Server Action est
un confort d'interface, pas un contrôle.**

C'est ce qui décide où va quoi :

| Règle | Où elle est appliquée |
|---|---|
| Qui peut lire, écrire, supprimer quoi | politiques RLS |
| Rôle d'un membre | politique + déclencheur sur `profiles` |
| Pas d'email ni de téléphone dans les champs libres | contrainte `CHECK` |
| Débit d'écriture | déclencheur `enforce_write_quota` |
| Forme canonique d'un nom d'entreprise | déclencheur sur `companies` |
| Longueurs, formats, énumérations | contraintes de colonne, doublées par zod |
| Messages d'erreur, libellés, confort de saisie | application |

`tests/database-security.test.ts` rejoue les migrations dans un Postgres
jetable et attaque le résultat sans passer par l'application : c'est la seule
façon de vérifier une règle censée tenir face à un client hostile.

### 2. `repository.ts` est la seule porte vers les données

Aucun composant n'importe Supabase. Toutes les lectures et écritures passent
par `src/lib/repository.ts` et `src/app/*/actions.ts`.

Conséquence directe : le **mode démo**. Quand `NEXT_PUBLIC_SUPABASE_URL` est
absent, le repository sert le jeu de données de `src/lib/data/seed.ts` et écrit
dans `src/lib/demo-store.ts` (mémoire). L'application entière fonctionne sans
backend, ce qui rend le projet abordable pour un contributeur qui découvre.

C'est aussi ce qui permettrait de changer de base plus tard sans réécrire
l'interface.

### 2 bis. Le store du mode démo est versionné

`src/lib/demo-store.ts` vit sur `globalThis` pour survivre au rechargement à
chaud. Il survit donc aussi à un changement de modèle : une collection ajoutée
ou renommée laisse une forme périmée en mémoire, et l'application sert des
pages vides ou des 404 jusqu'au redémarrage. `SEED_VERSION` règle ça — on
l'incrémente à chaque changement de forme, et le store est reconstruit.

### 3. La logique métier est en fonctions pures

`src/lib/entries.ts` contient le filtrage, le regroupement par ville et le
calcul des statistiques. Aucune dépendance à React, à Next ou à Supabase : ce
sont des fonctions testables directement, et c'est là que porte l'essentiel de
la suite `npm test` (voir `tests/`).

## Modèle de données

```
                     ┌──< job_offers >──┐
   companies <───────┼──< contacts >────┼───> places
        ▲            └──< experiences >─┘
        │                     │
     profiles ────────────────┘

reports ──> (experience | contact | profile | company | offer)
```

**Une entreprise est une entité, pas une chaîne de caractères.** Offres,
contacts et expériences référencent `companies.id` ; aucun ne stocke un nom
d'entreprise en texte libre. C'est ce qui rend le graphe navigable dans les
deux sens : d'une offre vers l'entreprise, d'une entreprise vers ses contacts.

- **`companies`** : nom, secteur, logo, site, LinkedIn, description, siège.
- **`job_offers`** : annonce ouverte — titre, durée, technologies, lien,
  date de publication et d'expiration.
- **`contacts`** : une personne connue dans une entreprise (prénom, nom, poste,
  LinkedIn public, notes). **Aucune colonne email ou téléphone** — voir
  [SECURITY.md](SECURITY.md).
- **`experiences`** : ce qu'un membre a vécu (PFA, PFE, stage, alternance,
  emploi, recherche).
- **`places`** : référentiel de villes avec latitude/longitude. La carte ne
  géocode rien à la volée ; ajouter une ville est une contribution explicite.

### Anti-doublons d'entreprise

L'unicité repose sur `companies.normalized_name` : le nom réduit à sa forme
canonique — minuscules, sans accent, sans ponctuation, sans suffixe juridique.
« Microsoft », « Microsoft Corp. » et « Microsoft Corporation » y convergent.

La règle est écrite deux fois, et c'est volontaire :

- `src/lib/company-name.ts` guide la saisie (le sélecteur propose la fiche
  existante et masque « créer ») ;
- un index unique sur `normalized_name` en base la garantit, même si un futur
  écran oublie de passer par le sélecteur.

Expériences et contacts sont projetés vers un type unique `Entry`
(`src/lib/types.ts`) pour que la carte et les listes n'aient qu'une seule forme
à manipuler. Les offres gardent leur propre type : elles ne décrivent pas la
présence du réseau mais une opportunité datée.

## Passage à l'échelle

Le premier jet lisait des tables entières et filtrait en JavaScript. C'est
invisible avec le jeu de démonstration et ruineux avec une vraie promo : le
coût d'une page grandissait avec la plateforme, pas avec ce qu'elle affichait.

Quatre règles corrigent ça, et une lecture ajoutée doit les respecter.

**1. Filtrer et compter en SQL.** Une fiche entreprise lit les offres, contacts
et expériences *de cette entreprise* (`getCompanyBundle`, filtré sur
`company_id`) ; la page profil lit les contributions *du membre*
(`getEntriesByAuthor`) ; la liste des entreprises lit des compteurs agrégés par
la vue `company_stats` ; l'accueil et `/stats` appellent la fonction
`network_stats()`, qui renvoie la page entière en un seul agrégat.

**2. Pas de lecture non paginée.** PostgREST plafonne une réponse (1 000 lignes
par défaut) et tronque **en silence** : une liste non paginée ne casse pas
quand le réseau grandit, elle ment. Toutes les lectures de collection passent
par `fetchPaged` dans `repository.ts`, et un plafond dur (`MAX_ROWS`) lève une
erreur explicite plutôt que de laisser une instance tomber en mémoire.

**3. Une lecture par requête, pas par composant.** Chaque fonction de lecture
est enveloppée dans `cache` de React. Deux composants de la même page qui
demandent les mêmes données déclenchent un seul aller-retour. La portée est la
requête : rien n'est partagé entre deux membres — un cache inter-requêtes
contournerait la RLS et ferait fuiter les données d'un membre vers un autre.
C'est aussi pourquoi les pages ne sont pas mises en cache par l'ISR : elles
dépendent du cookie de session.

**4. Le travail par ligne coûte, en base aussi.** Les politiques RLS écrivent
`(select auth.uid())` et `(select public.is_member())` plutôt que l'appel nu.
Enveloppé dans un sous-select, Postgres l'évalue une fois par requête
(InitPlan) au lieu d'une fois par ligne examinée. Sur une table de contributions
qui grossit, c'est la différence entre un index scan et une lecture complète
payée au prix fort. Les index composites de la migration `0004` servent le
couple filtre + tri des listes (`(company_id, published_at desc)`, etc.).

### Ce qui reste borné, et le sait

- **La carte charge tout le réseau** (`getEntries`). C'est assumé : la
  recherche est instantanée parce qu'elle travaille sur un jeu déjà chargé, et
  la carte projette par définition l'ensemble. C'est le plafond connu de
  l'architecture. Le jour où le volume gêne, l'étape suivante n'est pas de
  paginer la carte mais de la faire dessiner à partir d'un agrégat par ville
  (`place_id`, compteurs), le détail n'étant chargé qu'à l'ouverture du
  panneau.
- **Le sélecteur d'entreprise** reçoit l'annuaire complet pour son
  autocomplétion. Même raisonnement, même issue : une recherche côté serveur
  quand l'annuaire dépassera quelques milliers de fiches.

### Limitation de débit

Le compteur en mémoire (`rate-limit.ts`) ne vaut que pour une instance : sur
plusieurs instances serverless, la limite réelle était « 12 × nombre
d'instances », et le nombre d'instances augmente précisément quand quelqu'un
tape fort. En production, `enforceWriteQuota` appelle donc la fonction
`consume_write_quota` : une fenêtre glissante en base, partagée, rattachée à
`auth.uid()` — le client ne peut pas la contourner en changeant la clé qu'il
envoie. Le compteur mémoire reste le repli si la base ne répond pas, pour
qu'une panne ne *supprime* pas la protection.

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
