# Roadmap

Découpée en lots indépendants, pour que plusieurs personnes travaillent sans se
marcher dessus. Les tâches marquées 🟢 sont de bons premiers tickets.

## Fait (MVP)

- [x] Carte mondiale SVG, marqueurs par ville, zoom / déplacement
- [x] Filtres croisés (continent, pays, ville, entreprise, domaine, campus,
      statut, année, type de stage, expérience / contact)
- [x] Contribution d'une expérience ou d'un contact (Server Action + zod)
- [x] Refus des coordonnées privées dans les champs libres
- [x] Page statistiques
- [x] Schéma Postgres complet : types, contraintes, triggers, RLS
- [x] Connexion par lien magique restreinte au domaine UM6P + onboarding profil
- [x] En-têtes de sécurité et CSP stricte
- [x] Mode démo sans backend
- [x] Refonte carte-first : carte plein cadre, recherche flottante avec
      autocomplétion, filtres en surcouche, puces de filtres actifs
- [x] Zoom molette / trackpad / boutons, déplacement au glisser, zoom vers le curseur
- [x] Panneau contextuel de ville + feuille basse sur mobile
- [x] Fiche entreprise et liste des entreprises
- [x] Profil membre : LinkedIn public et email institutionnel
- [x] Modale de contact générant un brouillon Outlook
- [x] Design system documenté (docs/DESIGN_SYSTEM.md)

## Lot 1 — Fiabilité (prioritaire)

- [ ] **Tests unitaires de `src/lib/entries.ts`** (filtrage, clustering, stats) 🟢
- [ ] Tests des schémas zod, dont `findPrivateContactDetails` 🟢
- [ ] Test e2e Playwright : filtrer → cliquer un marqueur → contribuer
- [ ] CI GitHub Actions : `lint` + `typecheck` + `test` + `build` sur chaque PR 🟢
- [ ] Tests des politiques RLS (un membre ne peut pas modifier l'entrée d'un autre)

## Lot 2 — Modération et qualité des données

- [ ] Interface de signalement depuis une carte d'entrée 🟢
- [ ] Tableau de bord modérateur (traiter les `reports`)
- [ ] Modification et suppression de ses propres contributions
- [ ] Fusion des doublons d'entreprises (`Microsoft` / `Microsoft France`)
- [ ] Journal d'audit des modifications

## Lot 3 — Produit

- [ ] Messagerie interne entre membres (aujourd'hui : brouillon Outlook ou LinkedIn)
- [ ] Authentification LinkedIn (OAuth) — la colonne  est prête, le
      fournisseur n'est pas configuré
- [ ] Profil membre public (au sein du réseau)
- [ ] Ajout d'une ville depuis le formulaire, avec validation par la modération
- [ ] Export CSV filtré, pour le service carrière
- [ ] Notifications : « une entrée vient d'être ajoutée chez X »

## Lot 4 — Carte

- [ ] Regroupement dynamique des marqueurs superposés en Europe 🟢

- [ ] Éclatement des marqueurs superposés à fort zoom
- [ ] Vue « pays » : agrégation quand le zoom est faible
- [ ] Mode clair (les tokens sont centralisés, c'est surtout une palette à écrire)

## Lot 5 — Exploitation

- [ ] Limitation de débit sur l'envoi de liens magiques et sur les écritures
- [ ] Environnement de préproduction + déploiement automatique
- [ ] Supervision des erreurs
- [ ] Sauvegardes vérifiées et procédure de restauration documentée
- [ ] Politique de rétention et procédure de retrait sur demande d'un contact

## Idées à discuter

- Statistiques anonymisées publiques (« 25 pays, 200 entreprises ») pour
  donner envie de rejoindre le réseau sans rien exposer.
- Intégration annuaire alumni officiel UM6P, si l'école l'ouvre.
- Suggestions de contacts pertinents à partir des filtres actifs.
