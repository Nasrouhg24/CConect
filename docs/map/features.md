# Carte — fonctionnalités de bout en bout

Retour à la [carte générale](../MAP.md).

Les autres cartes découpent par couche. Celle-ci suit une fonctionnalité de
l'écran jusqu'à la table : c'est ce qu'on veut quand on doit *modifier* un
comportement, pas seulement le trouver.

## Contribuer une expérience ou un contact

`/contribute` → `components/ContributionForm.tsx` (+ `CompanyPicker`,
`career/ExperienceCareerFields`) → `app/contribute/actions.ts` →
`lib/validation.ts` → `repository.createExperience` / `createContact` →
tables `experiences` / `contacts`.

À savoir : l'entreprise peut ne pas exister, `findOrCreateCompany` la crée
avec son nom canonique. Les champs libres sont scannés **en base** — un email
ou un téléphone fait échouer l'écriture, pas seulement l'interface.

Édition et suppression passent par `app/experiences/actions.ts` et
`app/contacts/actions.ts`, appelées depuis les fiches entreprise.

## Carte du monde

`/network` → `components/network/NetworkExplorer.tsx` → `map/WorldMap.tsx`.
Les données viennent de `repository.getEntries()` ramenées à la forme commune
par `lib/entries.ts`, qui porte aussi le filtrage et les grappes. L'état des
filtres vit dans l'URL (`lib/links.ts`), pas dans un état React : un écran se
partage par son lien.

Le dessin est local (Natural Earth, domaine public) : aucune tuile distante,
aucune clé d'API, aucun traceur.

## Authentification et inscription

`/login` → `LoginForm` → Supabase envoie un lien magique (domaines de
`lib/env.ts`, contrôle définitif en base) → `/auth/callback` échange le code →
`/onboarding` → `app/onboarding/actions.ts` crée le profil **et** enregistre la
version des politiques acceptée.

`src/proxy.ts` rafraîchit la session à chaque requête et protège les routes.

## Légal — consentement et cookies

La chaîne complète, dans l'ordre où elle s'exécute :

| Étape | Fichier |
|---|---|
| Source de vérité (version, registre, cookies, `CONSENT_PATH`) | `lib/legal.ts` |
| Publication des trois documents | `app/legal/{confidentialite,cookies,conditions}/page.tsx` |
| Typographie de ces pages | `components/legal/LegalDoc.tsx` |
| Recueil à l'inscription | `components/OnboardingForm.tsx` → `app/onboarding/actions.ts` |
| Blocage des membres existants | `src/proxy.ts` → redirection vers `/legal/accepter` |
| Écran d'acceptation | `app/legal/accepter/page.tsx` → `components/legal/ConsentGate.tsx` |
| Enregistrement | `app/legal/actions.ts` → `repository.recordPolicyAcceptance` → RPC `accept_policy` |
| État + preuve | `profiles.policy_version` et table `consent_events` (`0010_consent.sql`) |
| Bandeau cookies | `app/layout.tsx` (décision serveur) → `components/legal/CookieNotice.tsx` |
| Verrous | `tests/legal.test.ts`, `tests/consent-database.test.ts` |

Deux pièges déjà rencontrés, à ne pas refaire :

- **Le blocage ne peut pas vivre dans le layout racine.** Un layout n'est pas
  re-rendu lors d'une navigation côté client : le premier lien cliqué passerait
  au travers. Il est dans le proxy, qui voit chaque requête.
- **Changer `POLICY_VERSION` redemande le consentement à tout le monde.**
  C'est fait pour, mais pas pour une faute de frappe.

Avant publication : renseigner `NEXT_PUBLIC_LEGAL_CONTACT`, sinon les pages
affichent un avertissement à la place du contact (volontaire — mieux vaut un
trou visible qu'une adresse inventée).

## Photo de profil

`/profile` → `components/ProfilePhoto.tsx` → `POST /api/profile-photo` →
`lib/profile-photo.ts` (validation, réencodage WebP 512 px) →
`lib/profile-photo-service.ts` → bucket privé `avatars`. La lecture passe par
`GET /api/profile-photo/[memberId]`, avec les droits d'un profil : jamais
d'URL publique devinable.

## Conseiller d'orientation

`/advisor` → `components/advisor/AdvisorDashboard.tsx` + `ActionPlan.tsx`.
Le calcul est pur et testé : `lib/advisor.ts` produit le rapport,
`lib/advisor-actions.ts` le traduit en plan priorisé. Les préférences
qu'il utilise ne sont lisibles que par leur auteur — la base l'impose.

## Mode terminal

`/terminal` → `components/terminal/TerminalExplorer.tsx`, logique dans
`lib/terminal/`. L'arbre est **dérivé** des données existantes
(`terminal-data.ts`) : aucune table supplémentaire, rien à synchroniser.

## Mode démo

Sans variables Supabase, `lib/env.ts` bascule tout le produit sur
`lib/demo-store.ts`, amorcé par `lib/data/seed.ts`. Toute nouvelle lecture ou
écriture du `repository` doit avoir sa branche démo, sinon l'application ne
démarre plus sans backend. Le proxy, lui, ne bloque rien en démo : sans base,
il n'y a ni session ni consentement à enregistrer.
