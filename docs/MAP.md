# Carte du dépôt

**À lire en premier, à chaque session.** Ce fichier et les cartes de
`docs/map/` existent pour une raison unique : trouver le bon fichier sans
ouvrir les autres. Le dépôt fait ~20 000 lignes de TypeScript ; en explorer
10 % pour situer un bouton coûte plus cher que tout le travail qui suit.

## Comment s'en servir

1. Partir du **tableau d'aiguillage** ci-dessous : il va d'une intention
   (« changer un libellé », « ajouter une colonne ») aux fichiers concernés.
2. Ouvrir **une seule** carte de détail si l'aiguillage ne suffit pas.
3. N'ouvrir les fichiers nommés qu'ensuite — et seulement ceux-là.

Ce qu'il ne faut pas faire : `grep` à l'aveugle sur tout `src/`, lire
`repository.ts` (1 300 lignes) en entier pour une fonction, ou redécouvrir la
structure alors qu'elle est écrite ici.

**La carte n'est pas le code.** Elle dit *où regarder*, jamais *ce que fait*
une fonction dans le détail — ça, c'est le commentaire en tête de fichier, qui
est dense et à jour dans ce dépôt. Si les deux se contredisent, le code a
raison et la carte est à corriger (`tests/map.test.ts` attrape les fichiers
oubliés, pas les descriptions périmées).

## Le produit en huit lignes

CConnect est le réseau privé des étudiants et alumni du College of Computing
(UM6P Rabat & Benguerir). Un membre y déclare **des expériences** (ce qu'il a
vécu dans une entreprise) et **des contacts** (une personne qu'il connaît dans
une entreprise, sans y avoir travaillé). Les deux se ramènent à une forme
commune, l'`Entry`, qui alimente la carte du monde, les fiches entreprise,
l'annuaire et les statistiques. L'accès est réservé aux adresses `@um6p.ma`,
vérifié en base. Aucune coordonnée privée de tiers n'est stockable : la table
`contacts` n'a pas de colonne pour ça.

## Aiguillage

| Intention | Aller voir |
|---|---|
| Changer un **libellé**, une couleur de domaine, un intitulé de statut | `src/lib/labels.ts` |
| Changer un **texte de page** | la page dans `src/app/<route>/page.tsx` → [routes](map/routes.md) |
| Ajouter/modifier un **écran** | [routes](map/routes.md), puis [composants](map/components.md) |
| Toucher au **style** (bouton, champ, carte, rayon, ombre) | `src/components/ui/`, `src/app/globals.css`, `docs/DESIGN_SYSTEM.md` |
| Lire ou écrire des **données** | `src/lib/repository.ts` — jamais Supabase en direct depuis un composant |
| Ajouter un **champ en base** | `supabase/migrations/` (nouvelle migration) → [base](map/database.md) → `types.ts` → `repository.ts` → `validation.ts` |
| Valider une **saisie** | `src/lib/validation.ts` (partagé client/serveur, le serveur revalide) |
| Écrire une **Server Action** | `src/app/<route>/actions.ts` → [routes](map/routes.md) |
| Toucher à la **sécurité** (RLS, CSP, session, quotas) | `docs/SECURITY.md`, `src/proxy.ts`, `src/lib/csp.ts`, [base](map/database.md) |
| Toucher au **consentement / aux politiques** | [fonctionnalités § Légal](map/features.md#légal--consentement-et-cookies) |
| Comprendre la **carte du monde** | `src/components/map/WorldMap.tsx`, `src/lib/entries.ts` |
| Comprendre le **conseiller** | `src/lib/advisor.ts` puis `src/lib/advisor-actions.ts` |
| Comprendre le **mode terminal** | `src/lib/terminal/` → [bibliothèque](map/lib.md#terminal) |
| Faire tourner ou étendre les **tests** | [tests](map/tests.md) |
| Suivre une fonctionnalité **de bout en bout** | [fonctionnalités](map/features.md) |

## Arborescence

```
src/
  app/          Routes (App Router). Une page = un dossier ; les écritures
                vivent dans le `actions.ts` voisin.   → map/routes.md
  components/   Interface. `ui/` = primitives ; les sous-dossiers suivent
                les écrans.                            → map/components.md
  lib/          Domaine, données, règles. Aucun JSX.   → map/lib.md
  proxy.ts      Middleware : session, CSP à nonce, routes protégées,
                blocage tant que les politiques ne sont pas acceptées.
supabase/
  migrations/   Le schéma fait foi : RLS, contraintes, RPC. → map/database.md
  seed.sql      Jeu de démonstration, engendré par scripts/generate-seed-sql.mjs
tests/          node:test + PGlite (vrai Postgres jetable). → map/tests.md
docs/           ARCHITECTURE, SECURITY, DESIGN_SYSTEM, ROADMAP, SETUP_SUPABASE
                et cette carte.
public/         Cinq SVG d'illustration hérités du gabarit Next.
scripts/        generate-seed-sql.mjs — `seed.ts` → `supabase/seed.sql`.
```

## Cartes de détail

| Carte | Contenu |
|---|---|
| [map/routes.md](map/routes.md) | Chaque route : URL, fichiers, Server Actions, protection |
| [map/components.md](map/components.md) | Chaque composant, par famille |
| [map/lib.md](map/lib.md) | Chaque module de `src/lib/`, par rôle |
| [map/database.md](map/database.md) | Tables, RLS, fonctions, migrations |
| [map/tests.md](map/tests.md) | Suites, ce qu'elles couvrent, comment les lancer |
| [map/features.md](map/features.md) | Chaînes complètes : de l'écran à la table |

## Règles du dépôt qu'on oublie souvent

- **Next.js 16** : lire `node_modules/next/dist/docs/` avant d'écrire du code
  de framework (voir `AGENTS.md`). Les conventions ont changé.
- **Tout est en français** : commentaires, libellés, messages d'erreur,
  noms de branches et de commits. Le code (identifiants) reste en anglais.
- Les commentaires expliquent **une contrainte**, jamais ce que le code dit
  déjà.
- **Aucune lecture de collection non paginée** dans `repository.ts` :
  `fetchPaged` existe pour ça, PostgREST tronque en silence à 1 000 lignes.
- **Le mode démo doit continuer de tourner** sans Supabase : toute nouvelle
  lecture ou écriture a une branche `isDemoMode`.
- **Ne jamais stocker de coordonnée privée de tiers** — c'est la promesse du
  produit, appliquée par le schéma.

## Tenir la carte à jour

`tests/map.test.ts` vérifie que chaque fichier de `src/`, `tests/` et
`supabase/migrations/` figure dans une carte, et que chaque chemin cité par une
carte existe. Ajouter un fichier sans l'inscrire fait échouer la suite : c'est
volontaire, une carte fausse coûte plus cher qu'une carte absente.
