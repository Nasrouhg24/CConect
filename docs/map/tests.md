# Carte — tests

Retour à la [carte générale](../MAP.md).

`node:test` avec typage effacé à la volée. Pas de framework, pas de DOM : ce
qui est testé est la couche `lib/`, le schéma Postgres, et les promesses que
le produit publie.

```
npm test                       # toute la suite (~2 min, PGlite compris)
node --test --experimental-strip-types --import=./tests/ts-resolver.mjs \
     --test-reporter=spec tests/legal.test.ts     # une seule suite
```

## Suites

| Fichier | Couvre |
|---|---|
| `entries.test.ts` | Conversion expérience/contact → `Entry`, filtres, recherche. |
| `map-points.test.ts` | Projection et grappes de la carte. |
| `map-aggregate.test.ts` | Parité entre l'agrégat de la base (`map_clusters`) et celui de l'application, filtre par filtre et recherche par recherche. Rejoue les migrations dans PGlite. |
| `network-sample.test.ts` | Cohérence de l'échantillon de démonstration. |
| `data-integrity.test.ts` | Intégrité du jeu de données (`lib/data/`). |
| `company-name.test.ts` | Normalisation, slug, initiales. |
| `company-logo.test.ts` | Choix logo / monogramme. |
| `logo-csp.test.ts` | L'origine du fournisseur de logos est bien dans la CSP. |
| `logo-dev-live.test.ts` | Test **live** contre Logo.dev — hors suite par défaut. |
| `career-advisor.test.ts` | Rapport du conseiller. |
| `advisor-actions.test.ts` | Plan d'action priorisé. |
| `terminal.test.ts` | Résolution de chemins, commandes, complétion. |
| `profile-photo.test.ts` | Validation, réencodage, droits de la photo. |
| `rate-limit.test.ts` | Plafond d'écritures côté application. |
| `security.test.ts` | CSP, redirections, journal, garde-fous applicatifs. |
| `legal.test.ts` | Inventaire des cookies, absence de traceur, consentement non présumé, `?next=` filtré, blocage dans le proxy. |
| `actions.test.ts` | Server Actions en mode démo : `FormData` en entrée, résultat ou redirection en sortie, chemins invalidés consignés. |
| `proxy.test.ts` | `proxy.ts` exécuté : garde de routes, blocage du consentement, CSP à nonce. Supabase remplacé au niveau HTTP (`fetch`). |
| `repository-demo.test.ts` | Interface publique de `repository.ts` en mode démo, sans base. |
| `map.test.ts` | Cette carte : tout fichier est inscrit, tout chemin cité existe. |

## Suites sur un vrai Postgres

`tests/pg-harness.ts` démarre un PGlite, simule ce que Supabase installe
(rôles, `auth.users`, `auth.uid()`, éventuellement `storage`), applique **toutes
les migrations** puis `seed.sql`. Une migration qui casse ici casse en
production.

| Fichier | Couvre |
|---|---|
| `database-security.test.ts` | RLS, domaines d'inscription, détection de coordonnées privées, quotas, agrégats. |
| `career-database.test.ts` | Migration 0008 : relations datées, compétences, cibles privées. |
| `consent-database.test.ts` | Migration 0010 : `accept_policy`, ajout seul, forge au nom d'un autre, cascade. |

## Utilitaires (pas des suites)

| Fichier | Rôle |
|---|---|
| `pg-harness.ts` | Postgres jetable : `bootDatabase`, `as`, `refused`, `uuid`. |
| `logo-corpus.ts` | Ce qu'un membre colle réellement dans « Site web ». |
| `ts-resolver.mjs`, `ts-resolver-hooks.mjs` | Ajoutent l'extension `.ts` aux imports relatifs, et rendent `next/*` et `server-only` chargeables sous Node. |
| `server-only-stub.mjs` | Module vide qui remplace `server-only` sous `node --test`. |
| `next-cache-stub.mjs` | Remplace `next/cache` : consigne les `revalidatePath` au lieu d'exiger une requête en cours. |

## Tests de bout en bout

`e2e/` : Playwright, un vrai navigateur devant le **build de production** en
mode démo (la CSP à nonce et l'hydratation ne se comportent pas comme en
`next dev`). Hors de `npm test` : ce n'est ni `node:test` ni la couche `lib/`.
Configuration : `playwright.config.ts`.

```
npm run e2e                                   # construit, sert sur :3100, joue tout
npx playwright test e2e/network.spec.ts       # une seule suite
```

| Fichier | Couvre |
|---|---|
| `e2e/smoke.spec.ts` | Chaque écran s'ouvre, dit son titre, ne lève rien dans la console (CSP, hydratation). |
| `e2e/network.spec.ts` | Carte, panneau de ville, parcours clavier, zoom, recherche, filtres portés par l'URL. |
| `e2e/contribute.spec.ts` | Publier un contact jusqu'à la fiche entreprise ; email refusé ; champs obligatoires. |
| `e2e/profile.spec.ts` | Canaux de contact et parcours : enregistrement, rechargement, refus. |
| `e2e/legal.spec.ts` | Avis cookies, aucune requête vers un tiers, consentement. |
| `e2e/mobile.spec.ts` | Feuille basse au toucher. |
| `e2e/fixtures.ts` | `problems` (échoue sur toute erreur de console ou de page) et `visit`. |

- Le store du mode démo vit dans le processus du serveur : les tests tournent
  l'un après l'autre et remettent ce qu'ils changent. L'acceptation des
  politiques est à usage unique par serveur : relancer le serveur pour rejouer
  `e2e/legal.spec.ts`.
- En local, un serveur déjà lancé sur `:3100` est réutilisé, et c'est **son**
  build qui est testé. Après une modification du code : `npm run build`, puis
  relancer le serveur.
- `tsc` et `next build` vérifient aussi `e2e/` : une erreur de type y casse le
  build.

## Écrire un test ici

- Les fixtures de test ne vont **jamais** dans `lib/data/seed.ts` : elles
  restent dans le fichier de test.
- Pour une règle de base, préférer le harnais Postgres à une simulation : la
  règle qu'on veut vérifier est écrite en SQL, pas en TypeScript.
- Sous `anon`, la RLS ne refuse pas : elle ne renvoie aucune ligne. Un test
  qui attend une exception se trompe de garantie.
