# Sécurité et confidentialité

Ce projet manipule des informations sur des personnes réelles — membres de la
communauté **et** contacts externes qui n'ont rien demandé. Les règles
ci-dessous ne sont pas des intentions : chacune est appliquée par du code, à
l'endroit indiqué.

## 1. Aucune coordonnée privée de contact externe

| Garantie | Où |
|---|---|
| Pas de colonne `email` ni `phone` sur `contacts` | `supabase/migrations/0001_init.sql` |
| Seul un lien LinkedIn **public** est accepté, format vérifié | contrainte `CHECK` SQL + `validation.ts` |
| Les champs libres sont scannés (email, téléphone) et refusés | `findPrivateContactDetails()` dans `src/lib/validation.ts`, appelé par la Server Action |

Si quelqu'un veut joindre un contact, il passe par le membre qui l'a ajouté.
C'est le cœur du produit, pas une limitation.

## 2. Accès réservé à la communauté

- Connexion par lien magique Supabase, restreinte aux domaines de
  `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` (`um6p.ma` par défaut).
- Le filtre côté navigateur évite d'envoyer un email inutile ; il ne protège
  rien. La garantie réelle est le trigger Postgres
  `enforce_allowed_email_domain` : un profil ne peut pas être créé depuis une
  adresse hors périmètre, même avec une requête forgée.
- `src/app/auth/callback/route.ts` revérifie le domaine et déconnecte sinon.

## 3. Row Level Security partout

Toutes les tables ont `enable row level security`. Résumé des politiques :

| Table | Lecture | Écriture |
|---|---|---|
| `profiles` | membres | soi-même (le champ `role` est protégé par trigger) |
| `experiences`, `contacts` | membres | l'auteur, ou la modération |
| `companies`, `places` | membres | création par tout membre, modification par la modération |
| `reports` | son auteur + la modération | tout membre peut signaler |

Le rôle `anon` n'a aucune politique : sans session, la base ne renvoie rien.

## 4. Ce qui circule côté client

- La clé `anon` de Supabase est publique **par conception** — toute la sécurité
  repose sur la RLS. La clé `service_role` ne doit jamais apparaître dans le
  dépôt ni dans une variable `NEXT_PUBLIC_*`.
- L'auteur d'une contribution n'est jamais lu depuis le formulaire : il vient
  de la session serveur (`getCurrentMember()`).
- Toute entrée de formulaire est revalidée côté serveur par zod, quelle que
  soit la validation HTML.

## 5. En-têtes HTTP

Définis dans `next.config.ts` :

- **CSP stricte** — `default-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`.
  Aucun script tiers, aucune tuile distante, aucun CDN : c'est ce qui rend
  cette CSP tenable. `'unsafe-eval'` n'est ajouté qu'en développement.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  restrictive, `Strict-Transport-Security`.
- Les pages sont marquées `noindex` : le réseau n'a rien à faire dans un moteur
  de recherche.

## 6. Coordonnées des membres (à ne pas confondre)

Depuis la migration `0002`, un membre peut renseigner **son** profil LinkedIn et
**son** email institutionnel, pour être joignable. Ce sont ses données, exposées
volontairement, visibles des seuls membres connectés (RLS).

Ça ne change rien à la règle du §1 : un contact externe n'a toujours ni email
ni téléphone dans le schéma. La modale de contact prépare un brouillon adressé
au **membre**, jamais au professionnel externe.

La colonne `linkedin_id` est réservée à une future authentification LinkedIn.
Aucun OAuth n'est configuré aujourd'hui : « Connecter LinkedIn » enregistre une
URL publique, rien de plus.

## 7. Liens sortants

Tout lien externe (LinkedIn) porte `target="_blank"` +
`rel="noopener noreferrer nofollow"` : pas d'accès à `window.opener`, pas de
`Referer` transmis.

## Limites connues (à traiter — voir ROADMAP)

- **Pas de limitation de débit** sur l'envoi de liens magiques ni sur les
  écritures. À faire avant l'ouverture au-delà d'un cercle restreint.
- **Pas d'audit log** des modifications et suppressions.
- **Modération manuelle** : les signalements sont stockés mais il n'y a pas
  encore d'interface pour les traiter.
- **Consentement des contacts externes** : la plateforme ne le collecte pas.
  La règle est donc de ne publier qu'une information qu'on pourrait assumer
  devant la personne concernée. Un contact peut demander son retrait par
  signalement.

## Signaler une faille

Ouvrir une issue **sans détail exploitable** et demander un canal privé, ou
contacter directement un mainteneur. Ne pas publier de preuve de concept sur le
dépôt public.
