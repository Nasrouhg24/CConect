# Carte — routes

Retour à la [carte générale](../MAP.md).

Convention du dépôt : une route = un dossier sous `src/app/`. La page rend,
le `actions.ts` voisin écrit. Les `loading.tsx` et `not-found.tsx` ne sont
présents que là où l'attente ou l'absence se voit vraiment.

**Protection** : la colonne dit si `src/proxy.ts` exige une session. Les
routes protégées sont aussi soumises au blocage des politiques — une session
qui n'a pas accepté la version en vigueur est renvoyée sur `/legal/accepter`.

## Écrans membres

| URL | Fichier | Protégée | Rôle |
|---|---|---|---|
| `/` | `app/page.tsx` | non | Accueil : hero, aperçu du réseau, section « rejoindre ». Assemble `components/home/`. |
| `/network` | `app/network/page.tsx` (+ `network/loading.tsx`) | oui | **L'écran principal.** Carte plein écran, dessinée depuis un agrégat par ville ; **tous** les filtres vivent dans l'URL (`?q=`, `?domain=`, `?city=`, `?campus=`, `?year=`…) et sont appliqués en base. Rend `components/network/NetworkExplorer.tsx`. |
| `/companies` | `app/companies/page.tsx` (+ `companies/loading.tsx`) | oui | Répertoire des entreprises → `components/companies/CompanyLibrary.tsx`. |
| `/companies/[slug]` | `app/companies/[slug]/page.tsx` (+ `[slug]/loading.tsx`, `[slug]/not-found.tsx`) | oui | Fiche : contacts, expériences, connexions. |
| `/companies/new` | `app/companies/new/page.tsx` | oui | Création d'une fiche. `?name=` prérempli depuis la bibliothèque. |
| `/people` | `app/people/page.tsx` | oui | Annuaire par relations de carrière. |
| `/people/[id]` | `app/people/[id]/page.tsx` | oui | Parcours d'un membre : frise + entreprises où il peut ouvrir une porte. |
| `/contribute` | `app/contribute/page.tsx` | oui | Formulaire d'ajout d'expérience ou de contact. |
| `/profile` | `app/profile/page.tsx` | oui | Profil : canaux de contact, photo, objectifs de carrière, contributions. |
| `/stats` | `app/stats/page.tsx` | oui | « Couverture » : ce que le réseau couvre, et ce qui manque. |
| `/advisor` | `app/advisor/page.tsx` | oui | Conseiller d'orientation → `components/advisor/`. |
| `/terminal` | `app/terminal/page.tsx` | oui | Navigation expérimentale au clavier → `components/terminal/`. |
| `/onboarding` | `app/onboarding/page.tsx` | oui | Création du profil après la première connexion. Recueille l'acceptation des politiques. |
| `/login` | `app/login/page.tsx`, `LoginForm.tsx` | non | Lien magique, domaines `@um6p.ma` seulement. |

## Pages légales

Publiques et hors blocage : un membre à qui l'on demande d'accepter doit
pouvoir lire ce qu'il accepte.

| URL | Fichier | Rôle |
|---|---|---|
| `/legal` | `app/legal/page.tsx` | Index des trois documents. |
| `/legal/confidentialite` | `app/legal/confidentialite/page.tsx` | Politique de confidentialité ; le registre vient de `lib/legal.ts`. |
| `/legal/cookies` | `app/legal/cookies/page.tsx` | Inventaire des cookies, engendré depuis `ESSENTIAL_COOKIES`. |
| `/legal/conditions` | `app/legal/conditions/page.tsx` | Conditions d'utilisation. |
| `/legal/accepter` | `app/legal/accepter/page.tsx` | Écran bloquant. Se garde lui-même ; `?next=` ramené à un chemin interne. |

## Server Actions

Toutes revalident côté serveur avec `lib/validation.ts` : la validation de
formulaire n'est qu'un confort.

| Fichier | Exporte | Écrit |
|---|---|---|
| `app/contribute/actions.ts` | `submitContribution` | Expérience ou contact, avec création d'entreprise au besoin |
| `app/experiences/actions.ts` | `editExperience`, `removeExperience` | Expériences (pas de page : actions seules) |
| `app/contacts/actions.ts` | `editContact`, `removeContact` | Contacts, y compris rattachement à une autre entreprise |
| `app/companies/new/actions.ts` | `createCompanyProfile` | Fiche entreprise |
| `app/profile/actions.ts` | `updateContactChannels`, `saveCareerProfile` | Canaux de contact, objectifs de carrière |
| `app/onboarding/actions.ts` | `createProfile` | Profil + version des politiques acceptée |
| `app/legal/actions.ts` | `acceptPolicies` | Acceptation d'une version (membre déjà inscrit) |
| `app/network/actions.ts` | `loadPlaceEntries` | *N'écrit rien* : lit le détail d'une ville à l'ouverture du panneau. Revalide ses filtres comme une URL. |

## Routes techniques

| URL | Fichier | Rôle |
|---|---|---|
| `/auth/callback` | `app/auth/callback/route.ts` | Échange le code du lien magique contre une session. |
| `POST/DELETE /api/profile-photo` | `app/api/profile-photo/route.ts` | Dépose ou retire la photo du membre connecté. |
| `GET /api/profile-photo/[memberId]` | `app/api/profile-photo/[memberId]/route.ts` | Sert la photo, avec les droits d'un profil (jamais d'URL publique). |
| `/qa-logos` | `app/qa-logos/page.tsx`, `QaLogos.tsx` | Page d'assurance qualité des logos. Outil interne. |

## Coquille et états globaux

| Fichier | Rôle |
|---|---|
| `app/layout.tsx` | Polices, en-tête, bandeau démo, bandeau cookies. `force-dynamic`. |
| `app/error.tsx` | Erreur d'une route. |
| `app/not-found.tsx` | 404 de l'application. |
| `app/globals.css` | Tokens Tailwind v4, thème, animations. Voir `docs/DESIGN_SYSTEM.md`. |
| `proxy.ts` | Session Supabase, CSP à nonce, routes protégées, blocage des politiques. |
