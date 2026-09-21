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
| Les champs libres sont scannés (email, téléphone) et refusés | contrainte `CHECK … no_private_details` (migration `0005`) **et** `findPrivateContactDetails()` côté application |

> La règle vivait uniquement dans la Server Action. Comme la clé anon est
> publique, un membre pouvait l'ignorer en écrivant directement dans PostgREST.
> Elle est depuis appliquée par la base, sur `contacts.notes`,
> `experiences.summary` et `job_offers.description` ; la version applicative ne
> sert plus qu'à formuler un message clair avant l'aller-retour.

Si quelqu'un veut joindre un contact, il passe par le membre qui l'a ajouté.
C'est le cœur du produit, pas une limitation.

## 2. Accès réservé à la communauté

- Connexion par lien magique Supabase, restreinte aux domaines de
  `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` (`um6p.ma` par défaut).
- Le filtre côté navigateur évite d'envoyer un email inutile ; il ne protège
  rien. La garantie réelle est le trigger Postgres
  `enforce_allowed_email_domain` : un profil ne peut pas être créé depuis une
  adresse hors périmètre, même avec une requête forgée.
- L'**envoi** du lien est restreint par le hook `restrict_signup_domain`
  (*Before User Created*). Il est fourni par la migration `0005` mais doit être
  activé dans le tableau de bord — voir `SETUP_SUPABASE.md`. Sans lui,
  n'importe qui peut faire envoyer des liens de connexion à n'importe quelle
  adresse et épuiser le quota d'emails du projet.
- `src/app/auth/callback/route.ts` revérifie le domaine et déconnecte sinon.

## 3. Row Level Security partout

Toutes les tables ont `enable row level security`. Résumé des politiques :

| Table | Lecture | Écriture |
|---|---|---|
| `profiles` | membres | soi-même ; `role` verrouillé à `member` **à la création comme à la modification** |
| `experiences`, `contacts` | membres | l'auteur, ou la modération |
| `companies` | membres | création par tout membre, modification par la modération |
| `places` | membres | modération seule (en attendant le parcours « proposer une ville ») |
| `audit_log` | modération | déclencheurs uniquement |
| `reports` | son auteur + la modération | tout **membre** peut signaler |

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

La CSP est construite par requête dans `src/proxy.ts` (`src/lib/csp.ts`) ; les
en-têtes constants restent dans `next.config.ts`.

- **CSP à nonce** — `script-src 'self' 'nonce-…' 'strict-dynamic'`. Le
  `'unsafe-inline'` qui s'y trouvait autorisait aussi bien le script du
  framework que celui d'une éventuelle injection : la directive ne protégeait
  de rien. Le nonce, tiré à chaque requête, distingue les deux. `'unsafe-eval'`
  n'est ajouté qu'en développement.
- `style-src` garde `'unsafe-inline'`, et c'est délibéré : l'interface pose des
  styles en attribut, que `style-src-attr` n'autorise pas par nonce.
- `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `form-action 'self'`, `base-uri 'self'`, `upgrade-insecure-requests`.
  Aucun script tiers, aucune tuile distante, aucun CDN : c'est ce qui rend
  cette CSP tenable.
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

## 5 bis. Session

Le cookie de session est posé avec `secure` en production, `sameSite=lax` et
une durée de vie glissante de 30 jours (`src/lib/supabase/cookie-options.ts`).
Il n'est **pas** `httpOnly`, et c'est une contrainte, pas un oubli : le client
navigateur de Supabase lit lui-même le jeton pour rafraîchir la session. La
conséquence est explicite — une faille XSS donnerait la session, pas seulement
une action dans la page. C'est la raison pour laquelle la CSP a été refaite
autour d'un nonce.

## 8. Politiques publiées et consentement

Trois documents vivent dans l'application, pas dans un fichier joint :
`/legal/confidentialite`, `/legal/cookies`, `/legal/conditions`
(`src/app/legal/`). Ils sont engendrés depuis `src/lib/legal.ts` — registre des
traitements et inventaire des cookies compris — pour qu'une politique ne
puisse pas décrire un produit d'il y a six mois.

**Le consentement est bloquant.** `POLICY_VERSION` est la date de mise en
ligne ; tant que `profiles.policy_version` ne l'égale pas, `src/proxy.ts`
renvoie toute requête vers une route protégée sur `/legal/accepter`.

Le blocage vit dans le proxy et **pas** dans la coquille, et c'est le point à
ne pas défaire : un layout racine n'est pas re-rendu lors d'une navigation côté
client, si bien qu'un écran posé là laisse passer le premier lien cliqué. Le
proxy voit chaque requête — navigations douces et envois de Server Action
compris, puisque ceux-ci repassent par le même chemin.

`/legal` reste ouvert (refuser la lecture de ce qu'on demande d'accepter serait
absurde), `/login` aussi. Un profil absent n'est pas bloqué : c'est
l'inscription qui recueille l'acceptation, et elle ne peut pas se dérouler
derrière un blocage. Le paramètre `?next=` est ramené à un chemin interne aux
deux bouts — page et Server Action — pour ne pas offrir une redirection
ouverte.

En mode démo, rien n'est bloqué : sans base, il n'y a aucun consentement à
enregistrer. L'écran reste visitable sur `/legal/accepter`.

Changer `POLICY_VERSION` redemande donc le consentement à **tout le monde**.
C'est fait pour ; ce n'est pas à faire pour une faute de frappe.

**La preuve est séparée de l'état.** `profiles` porte l'état courant, que
l'application lit à chaque requête ; `consent_events` (migration 0010) porte
l'historique en ajout seul — ni `update`, ni `delete`, pas même pour son
propriétaire. C'est ce que demande le RGPD art. 7.1 : pouvoir *démontrer* le
consentement, y compris après qu'une nouvelle version a écrasé l'état courant.
La suppression du compte l'emporte (`on delete cascade`) : le droit à
l'effacement passe devant la conservation d'une preuve devenue sans objet.

La version enregistrée est toujours lue côté serveur, jamais reçue du
formulaire — sinon un champ caché modifié ferait enregistrer l'acceptation d'un
texte jamais affiché. Rien n'est pré-coché : une case cochée par défaut n'est
pas un consentement (RGPD art. 4.11).

**Cookies.** Les trois cookies du site sont strictement nécessaires (session,
vérificateur PKCE, mémoire du bandeau). D'où un bandeau qui *informe* au lieu
de demander : proposer « Refuser » serait mentir, puisque refuser le cookie de
session revient à refuser de se connecter. `tests/legal.test.ts` verrouille
l'inventaire et vérifie qu'aucun traceur n'entre dans le bundle ; ajouter un
cookie non nécessaire fait tomber ce raisonnement et impose alors un vrai
recueil de consentement, refus aussi simple que l'acceptation.

**Avant la mise en ligne.** `NEXT_PUBLIC_LEGAL_CONTACT` doit être renseignée :
sans elle, les pages légales affichent un avertissement à la place du contact,
plutôt qu'une adresse inventée derrière laquelle un droit ne s'exercerait pas.

## Limites connues (à traiter — voir ROADMAP)

- **Limitation de débit.** Les écritures sont plafonnées à 12 par minute, par
  membre et par table, par le déclencheur `enforce_write_quota` en base — donc
  quelle que soit la porte d'entrée. Reste hors périmètre : la limitation par
  IP de l'envoi de liens magiques, qui se joue au niveau de Supabase ou du
  réseau.
- **Modération manuelle** : les signalements et le journal d'audit sont
  stockés, mais il n'y a pas encore d'interface pour les traiter.
- **Consentement des contacts externes** : la plateforme ne le collecte pas.
  La règle est donc de ne publier qu'une information qu'on pourrait assumer
  devant la personne concernée. Un contact peut demander son retrait par
  signalement — et la politique de confidentialité le lui promet noir sur
  blanc (`/legal/confidentialite`, section « Les personnes mentionnées par un
  membre »), avec la base légale invoquée et les limites qui l'encadrent.

## Signaler une faille

Ouvrir une issue **sans détail exploitable** et demander un canal privé, ou
contacter directement un mainteneur. Ne pas publier de preuve de concept sur le
dépôt public.
