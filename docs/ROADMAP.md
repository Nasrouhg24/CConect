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
- [x] Entreprises comme entités : secteur, logo, site, LinkedIn, description, siège
- [x] Offres de stage (table dédiée), liste, fiche, publication
- [x] Contacts structurés (prénom, nom, poste, notes) rattachés à une entreprise
- [x] Sélecteur d'entreprise avec autocomplétion et anti-doublons
- [x] Modification, suppression et changement d'entreprise d'un contact
- [x] Suite de tests automatisés (77 tests, npm test)
- [x] Lectures ciblées et agrégats côté base (fiche entreprise, profil,
      compteurs, statistiques) — plus de table entière chargée pour afficher
      une poignée de lignes
- [x] Pagination systématique des lectures (PostgREST tronque à 1 000 lignes
      en silence)
- [x] Mémoïsation des lectures par requête (`cache` de React)
- [x] Index composites filtre + tri, et politiques RLS en InitPlan

## Lot 1 — Fiabilité (prioritaire)

- [ ] Test e2e Playwright : filtrer → cliquer un marqueur → contribuer
- [x] CI GitHub Actions : lint + typecheck + test + build sur chaque PR
- [x] Tests des politiques RLS, sur un vrai Postgres jetable
      (`tests/database-security.test.ts`) : les migrations sont rejouées et le
      résultat est attaqué en se faisant passer pour un membre, un modérateur,
      un compte hors périmètre, un visiteur
- [x] CI durcie : `permissions` minimales, actions épinglées par SHA,
      `npm audit` et Semgrep bloquants, Dependabot

## Lot 2 — Modération et qualité des données

- [ ] Interface de signalement depuis une carte d'entrée 🟢
- [ ] Tableau de bord modérateur (traiter les `reports` et lire `audit_log`) 🟢
- [x] Journal d'audit des changements de rôle et des actions de modération
- [x] Modification et suppression des contacts, des offres et des expériences
- [ ] Fusion des doublons d'entreprises (`Microsoft` / `Microsoft France`)

## Lot 3 — Produit

- [ ] Messagerie interne entre membres (aujourd'hui : brouillon Outlook ou LinkedIn)
- [ ] Authentification LinkedIn (OAuth) — la colonne  est prête, le
      fournisseur n'est pas configuré
- [ ] Profil membre public (au sein du réseau)
- [ ] Ajout d'une ville depuis le formulaire, avec validation par la modération
- [ ] Export CSV filtré, pour le service carrière
- [ ] Notifications : « une entrée vient d'être ajoutée chez X »

## Lot 3 bis — Passage à l'échelle (le reste)

- [x] Carte dessinée à partir d'un agrégat par ville (`map_clusters`), détail
      chargé à l'ouverture du panneau. Les filtres sont appliqués en base et
      vivent dans l'URL ; `tests/map-aggregate.test.ts` tient l'agrégat de la
      base et celui du mode démo au même résultat
- [ ] Recherche d'entreprise côté serveur pour le sélecteur, au lieu d'envoyer
      l'annuaire complet 🟢
- [ ] Conseiller, annuaire des personnes et terminal lisent encore tout le
      réseau (`getEntries`) — le prochain plafond, maintenant que la carte
      est passée à l'agrégat
- [ ] Vérifier les migrations sur un Postgres jetable dans la CI
      (`supabase db reset`), aujourd'hui elles ne sont validées qu'à la main
- [ ] Mesurer : `explain analyze` sur les requêtes chaudes avec un jeu de
      100 000 contributions généré

## Lot 4 — Carte

- [ ] Regroupement dynamique des marqueurs superposés en Europe 🟢

- [ ] Éclatement des marqueurs superposés à fort zoom
- [ ] Vue « pays » : agrégation quand le zoom est faible
- [ ] Mode clair (les tokens sont centralisés, c'est surtout une palette à écrire)

## Lot 5 — Exploitation

- [x] Limitation de débit sur les écritures, appliquée par un déclencheur en
      base — donc valable aussi pour une écriture directe dans PostgREST
- [ ] Limitation de débit sur l'envoi de liens magiques par IP (Supabase ou
      réseau) — le hook `restrict_signup_domain` traite le domaine, pas le débit
- [ ] Environnement de préproduction + déploiement automatique
- [ ] Supervision des erreurs
- [ ] Sauvegardes vérifiées et procédure de restauration documentée
- [ ] Politique de rétention et procédure de retrait sur demande d'un contact

## Lot 6 — Suites de l'audit de sécurité

Corrigés et verrouillés par des tests (voir `tests/database-security.test.ts`
et `tests/security.test.ts`) : élévation de privilège à la création du profil,
règle des coordonnées privées appliquée en base, signalements réservés aux
membres, création de villes réservée à la modération, forme canonique dérivée
en base, CSP à nonce, cookie de session borné, redirection ouverte, messages
Postgres bruts, build de déploiement sans backend, journal d'audit.

Reste à faire :

- [ ] **Activer le hook `restrict_signup_domain`** dans le tableau de bord
      Supabase, et configurer un SMTP dédié. Tant que ce n'est pas fait,
      l'envoi de liens de connexion reste ouvert à Internet 🔴
- [ ] Valider les contraintes `no_private_details` (`alter table … validate
      constraint`) après avoir nettoyé les lignes existantes
- [ ] Interface de traitement des signalements et du journal d'audit
- [ ] Rétention : purge automatique de `audit_log` et de `write_rate_events`

## Idées à discuter

- Statistiques anonymisées publiques (« 25 pays, 200 entreprises ») pour
  donner envie de rejoindre le réseau sans rien exposer.
- Intégration annuaire alumni officiel UM6P, si l'école l'ouvre.
- Suggestions de contacts pertinents à partir des filtres actifs.
