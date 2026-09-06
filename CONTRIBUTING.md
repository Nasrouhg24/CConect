# Contribuer

Ce projet appartient à la communauté du College of Computing. Il est conçu pour
être repris d'une promotion à l'autre — donc pour être compris vite.

## Premier pas

```bash
git clone <url-du-depot>
cd cconnect
npm install
npm run dev
```

Pas de compte, pas de variable d'environnement : l'application démarre en mode
démo avec des données fictives. Si ça ne marche pas en une commande, c'est un
bug — ouvre une issue.

Ensuite, lis [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Dix minutes qui
évitent une semaine de malentendus.

## Où contribuer selon ton envie

| Envie | Regarde |
|---|---|
| **Frontend** | `src/components/` — carte, filtres, cartes d'entrée |
| **Backend / données** | `supabase/migrations/`, `src/lib/repository.ts` |
| **UI / UX** | `src/app/globals.css`, parcours `/network` et `/contribute` |
| **Cybersécurité** | `docs/SECURITY.md`, politiques RLS, revue de la CSP |
| **DevOps** | CI, préproduction, déploiement (lot 5 de la roadmap) |
| **Tests** | `src/lib/entries.ts` et `src/lib/validation.ts` en priorité |
| **Documentation** | `docs/`, et tout ce qui t'a bloqué en arrivant |
| **Modération** | Table `reports` et interface associée (lot 2) |

Les tickets marqués 🟢 dans [docs/ROADMAP.md](docs/ROADMAP.md) sont faits pour
une première contribution.

## Avant d'ouvrir une PR

```bash
npm run lint
npm run typecheck
npm run build
```

Les trois doivent passer. Ajoute un test quand tu touches à une fonction pure
de `src/lib/`.

## Conventions

- **Interface en français, code en anglais.** Les noms de variables, types et
  fonctions sont en anglais ; les libellés visibles sont en français, centralisés
  dans `src/lib/labels.ts`.
- **TypeScript strict**, pas de `any` (`unknown` + affinage si besoin).
- **Commentaires rares et utiles** : on commente une contrainte que le code ne
  peut pas montrer, jamais ce que le code dit déjà.
- **Server Components par défaut.** `"use client"` seulement quand il y a un
  état ou un événement.
- **Aucun accès direct à Supabase depuis un composant.** Tout passe par
  `src/lib/repository.ts` ou une Server Action.
- **Messages de commit** courts et à l'impératif : `feat: ajoute le filtre par
  domaine`, `fix: corrige le clustering à fort zoom`.

## La règle qu'on ne négocie pas

Aucun champ, aucune migration, aucune fonctionnalité ne doit permettre de
stocker **l'email ou le téléphone d'un contact externe**. Une PR qui ajoute une
telle colonne sera refusée, même utile par ailleurs. Le raisonnement complet est
dans [docs/SECURITY.md](docs/SECURITY.md).

Si tu penses avoir un bon argument contre cette règle, ouvre une discussion
avant d'écrire le code.

## Revue

Une PR a besoin d'une relecture. On regarde, dans l'ordre :

1. est-ce que ça respecte la règle de confidentialité ?
2. est-ce que quelqu'un qui arrive dans deux ans comprendra le code ?
3. est-ce que lint / typecheck / build passent ?
4. est-ce que le comportement a été vérifié dans l'application, pas seulement
   compilé ?

## Code de conduite

Voir [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
