# Carte — base de données

Retour à la [carte générale](../MAP.md).

**Le schéma fait foi.** Les garanties du produit (accès réservé, aucune
coordonnée privée, écriture réservée à l'auteur) sont appliquées par Postgres,
pas par l'interface — une faille d'interface ne les contourne donc pas. Détail
du raisonnement : `docs/SECURITY.md`.

Les migrations s'appliquent dans l'ordre des numéros, et les tests les
rejouent sur un Postgres jetable (PGlite) : elles doivent rester applicables
sans Supabase Storage ni extension propriétaire.

## Migrations

| Fichier | Apporte |
|---|---|
| `0001_init.sql` | Schéma initial : `profiles`, `places`, `companies`, `experiences`, `contacts`, `reports`, `allowed_email_domains`. RLS de départ. |
| `0002_member_contact.sql` | `contact_email`, préparation `linkedin_id`. |
| `0003_companies_offers_contacts.sql` | Entreprises comme entités à part entière ; contacts détaillés ; `job_offers` (retirée en 0006). |
| `0004_scale.sql` | Index composites, vue `company_stats`, RPC `network_stats`, quotas d'écriture. |
| `0005_hardening.sql` | Corrections de l'audit : domaine d'inscription en base, détection de coordonnées privées, `audit_log`, protection du rôle. |
| `0006_drop_offers.sql` | Retrait des offres. |
| `0007_company_domain.sql` | Domaine d'une entreprise, clé de son logo. |
| `0008_career_graph.sql` | Graphe de carrière : année d'études, relations datées, compétences, cibles. Plafonds par déclencheur. |
| `0009_profile_photo.sql` | `avatar_path` + bucket privé `avatars` et ses politiques. |
| `0010_consent.sql` | Acceptation des politiques : colonnes sur `profiles`, `consent_events` en ajout seul, RPC `accept_policy`. |

## Tables

| Table | Contenu | Lecture | Écriture |
|---|---|---|---|
| `profiles` | Membre : nom, campus, statut, promotion, canaux, carrière, photo, version acceptée | membres | soi-même (rôle protégé par déclencheur) |
| `places` | Villes du référentiel | membres | modérateurs |
| `companies` | Fiches entreprise | membres | membres (nom canonique forcé) |
| `experiences` | Expériences vécues | membres | auteur |
| `contacts` | Personnes connues dans une entreprise — **ni email ni téléphone** | membres | auteur |
| `skills`, `profile_skills`, `experience_skills` | Référentiel et rattachements | membres | auteur / soi-même |
| `profile_target_countries`, `profile_target_companies` | Cibles de recherche | **son propriétaire seul** | soi-même |
| `consent_events` | Preuve datée des acceptations, **en ajout seul** | son propriétaire seul | soi-même, jamais de modification ni de suppression |
| `reports` | Signalements | modérateurs | membres |
| `audit_log` | Journal des écritures | membres (lecture) | déclencheurs |
| `write_rate_events` | Compteurs anti-abus | personne | déclencheurs |
| `allowed_email_domains` | Domaines autorisés | hook d'inscription | modérateurs |

## Fonctions

**Contrôle d'accès** — `is_member`, `is_moderator`, `restrict_signup_domain`
(hook d'inscription), `enforce_allowed_email_domain`.

**Garde-fous** — `has_private_contact_details` (refuse email/téléphone dans un
champ libre), `protect_profile_role`, `enforce_write_quota`,
`consume_write_quota`, `enforce_row_cap`, `enforce_skill_quota`.

**Opérations atomiques** (`security invoker`, la RLS s'applique) —
`accept_policy`, `set_profile_skills`, `set_experience_skills`,
`set_profile_targets`, `ensure_skill_ids`.

**Dérivations** — `canonical_company_name`, `set_canonical_company_name`,
`normalize_company_domain`, `touch_updated_at`, `unaccent_fallback`.

**Agrégats** — vue `company_stats`, fonction `network_stats()`.

## Ajouter un champ

1. Nouvelle migration `00NN_…sql` (jamais modifier une migration appliquée).
2. `src/lib/types.ts` — le modèle de domaine.
3. `src/lib/repository.ts` — colonnes sélectionnées, `mapAuthor`/`map…`, et la
   branche `isDemoMode`.
4. `src/lib/validation.ts` si le champ se saisit.
5. Un test dans `tests/` si le champ porte une règle (RLS, contrainte, format).
