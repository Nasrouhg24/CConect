# Carte — bibliothèque (`src/lib/`)

Retour à la [carte générale](../MAP.md).

Aucun JSX ici. C'est la couche qui survit à un changement d'interface, et
celle que les tests attaquent directement.

## Accès aux données

| Fichier | Rôle |
|---|---|
| `repository.ts` (1 300 l.) | **Point d'entrée unique** pour lire/écrire. Deux implémentations derrière la même signature : Supabase, ou store en mémoire en mode démo. Deux règles : filtrer/compter en SQL (jamais en JS), et mémoïser par requête (`cache` de React). Les collections passent par `fetchPaged` — PostgREST tronque en silence à 1 000 lignes. |
| `demo-store.ts` | Store en mémoire du mode démo, sur `globalThis`. `SEED_VERSION` à incrémenter dès que la forme change. |
| `supabase/server.ts` | Client lié aux cookies de la requête. |
| `supabase/client.ts` | Client navigateur. |
| `supabase/cookie-options.ts` | Options du cookie de session : `secure` en production, `sameSite=lax`, 30 jours glissants. `httpOnly` reste faux — contrainte assumée, documentée sur place. |
| `db-error.ts` | Traduit une erreur Postgres en message lisible, et journalise le reste. |

## Modèle et règles

| Fichier | Rôle |
|---|---|
| `types.ts` | Modèle de domaine : `Author`, `Entry`, `Company`, `Contact`, `Experience`, `Place`, `CareerProfile`, énumérations. |
| `entries.ts` | La forme commune. `experienceToEntry` / `contactToEntry`, filtrage, recherche, grappes de carte, statistiques. |
| `validation.ts` | Schémas zod partagés client/serveur. |
| `labels.ts` | Tous les libellés et couleurs de domaine. **Premier endroit à regarder pour un changement de mot.** |
| `career.ts` | Relations de carrière : statut d'emploi, périodes, ordre chronologique. |
| `skills.ts` | Compétences : forme canonique, plafonds. |
| `links.ts` | Liens profonds entre écrans, et lecture des filtres depuis l'URL. |
| `avatar.ts` | Photo si elle existe, sinon initiale. |

## Conseiller

| Fichier | Rôle |
|---|---|
| `advisor.ts` | Objectif du membre, champs manquants, pistes d'entreprises et de connexions. |
| `advisor-actions.ts` | Traduit le rapport en plan d'action priorisé (`MAX_PLAN_ACTIONS`). |

## Entreprises et logos

| Fichier | Rôle |
|---|---|
| `company-name.ts` | Normalisation, slug, initiales, teinte du monogramme. |
| `company-domain.ts` | Domaine déduit du site — la clé du logo. |
| `logo-provider.ts` | Logo.dev. Sans jeton, aucune requête ne part vers un tiers. |

## Sécurité et plateforme

| Fichier | Rôle |
|---|---|
| `env.ts` | Toute lecture d'environnement. `isSupabaseConfigured` décide du mode démo. |
| `csp.ts` | CSP construite par requête, avec nonce. |
| `safe-redirect.ts` | Ramène une destination à un chemin interne (redirection ouverte). |
| `rate-limit.ts` / `rate-limit-server.ts` | Plafond d'écritures par membre ; le plafond qui fait foi est en base. |
| `security-log.ts` | Journal des tentatives **refusées** — celles que la base ne voit pas. Ni jeton, ni contenu, ni coordonnée. |
| `legal.ts` | Source de vérité des textes légaux : `POLICY_VERSION`, registre des traitements, inventaire des cookies, `CONSENT_PATH`. |

## Photo de profil

| Fichier | Rôle |
|---|---|
| `profile-photo.ts` | Validation et normalisation (serveur uniquement) : types, tailles, réencodage WebP. |
| `profile-photo-service.ts` | Orchestration, indépendante du stockage (`PhotoStore`). |

## Terminal

| Fichier | Rôle |
|---|---|
| `terminal/terminal-types.ts` | Types partagés et liste des commandes. |
| `terminal/terminal-data.ts` | Arbre de navigation dérivé des données existantes — aucune table en plus. |
| `terminal/terminal-navigation.ts` | Résolution de chemins, `ls`, `cd`, complétion. |
| `terminal/terminal-parser.ts` | Analyse d'une ligne saisie. |

## Données statiques

| Fichier | Rôle |
|---|---|
| `data/places.ts` | Référentiel de villes de la carte. |
| `data/countries.ts` | Alias de pays, pour la recherche libre uniquement. |
| `data/seed.ts` | Jeu de démonstration, 100 % fictif. Source de `supabase/seed.sql` via `scripts/generate-seed-sql.mjs`. |
