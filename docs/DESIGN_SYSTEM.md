# Design system CConnect

Ce document est la référence visuelle du projet. Une nouvelle page ne réinvente
pas ses couleurs, ses espacements ni ses boutons : elle prend ce qui est ici.

Les tokens vivent dans `src/app/globals.css` (bloc `@theme`), les motifs dans
`@layer components` du même fichier, les primitives dans
`src/components/ui/index.tsx`.

## Direction — « Le Registre »

> Un annuaire imprimé, pas une page d'atterrissage.

CConnect n'est pas un produit qu'on vend : c'est un outil interne qu'on
consulte, déjà connecté, pour retrouver quelqu'un. Le système part donc d'un
document — papier, encre, filets, colonnes de chiffres — et non du vocabulaire
d'une landing page SaaS.

Ce que ça exclut, explicitement :

| Interdit | Pourquoi |
|---|---|
| Fond sombre + un accent saturé unique | La signature la plus reconnaissable d'un gabarit généré |
| Titre en serif italique, un mot coloré au milieu | Idem — décor qui mime de l'intention |
| Sur-titre en majuscules espacées avec une puce devant | Un bandeau qui n'informe de rien |
| Deux CTA de même poids côte à côte | Si les deux ont le même poids, aucun n'est le bon |
| Bloc de chiffres flottant, détaché du contenu | Un total se lit à la fin d'un relevé |
| Verre, flou, halo, lueur, dégradé décoratif | La profondeur vient des filets et des niveaux de papier |
| Pilule (`rounded-full`) sur un conteneur | Un registre a des angles droits |

La couleur est une information, pas une décoration, et elle ne la porte jamais
**seule** : un lien est souligné, un bouton a une forme, l'onglet actif est
souligné *et* vert (WCAG 1.4.1). C'est aussi pourquoi les domaines sont
signalés par un point de 6 px et non par une pastille pleine.

## Couleurs

Deux encres sur un papier. Tout le reste est du neutre.

| Token | Valeur | Usage |
|---|---|---|
| `base` | `#f5f2ea` | Papier : fond de l'application et de la carte |
| `surface` | `#faf8f2` | Fiche posée sur le papier : en-tête de bloc, champs |
| `surface-raised` | `#ffffff` | Panneaux, menus, modales, champs de saisie |
| `surface-hover` | `#ebe7dc` | Survol d'un élément interactif |
| `border` | `#d8d4ca` | Filet décoratif, séparateur |
| `border-strong` | `#8a857a` | Contour d'un élément **interactif** |
| `text` | `#171716` | Encre : texte principal |
| `text-muted` | `#5f5c56` | Prose secondaire, descriptions |
| `text-faint` | `#6e6b64` | Libellés, compteurs, liens de navigation |
| `accent` | `#176b52` | Seconde encre : action, lien, état actif, focus |
| `accent-hover` / `accent-pressed` | `#11543f` / `#0d4132` | États du bouton principal |
| `accent-soft` / `accent-border` | vert / 10 % / 35 % | État actif discret, contour de marque |
| `on-accent` | `#f7f5f0` | Texte posé sur le vert |
| `success` | `#176b52` | Présent, confirmé, couvert |
| `warning` | `#8a5a14` | Lacune de couverture |
| `danger` | `#a8442a` | Erreur, destruction |
| `node-1/2/3` | `ink / 34 %`, `#5e8a74`, `#176b52` | Densité des marqueurs : un dégradé, pas une palette |

`success` partage la valeur d'`accent` : dans ce système, le vert dit « ce qui
est là » — qu'il s'agisse d'une action possible ou d'une donnée confirmée. La
brique dit « ce qui manque ». Deux encres de statut suffisent.

### Contrastes mesurés

Contre le papier `#f5f2ea`, au pixel près et non estimés :

| Token | Ratio | Seuil requis |
|---|---|---|
| `text` | 16,1:1 | 4,5:1 (texte) |
| `text-muted` | 5,9:1 | 4,5:1 |
| `text-faint` | 4,8:1 | 4,5:1 — il porte de l'information, pas du décor |
| `accent` | 5,8:1 | 4,5:1 |
| `on-accent` sur `accent` | 5,9:1 | 4,5:1 |
| `border-strong` | 3,3:1 | 3:1 (limite de contrôle, WCAG 1.4.11) |
| `border` | — | filet décoratif uniquement, aucun seuil |

La charte de marque donne `#77746c` comme gris de texte secondaire. Mesuré sur
ce papier, il tombe à 4,2:1 : sous le seuil de lecture. `text-muted` et
`text-faint` gardent sa température et descendent d'un cran — l'écart ne se voit
pas à l'œil, il se lit à la mesure.

Toute nouvelle valeur d'encre se mesure avant d'être écrite. Une bordure de
champ qu'on ne voit pas n'est pas un parti pris, c'est un champ introuvable.

Les couleurs de domaine (`DOMAIN_COLORS` dans `src/lib/labels.ts`) sont
désaturées et de luminosité homogène. Elles ne servent qu'au point indicateur,
toujours doublé d'un libellé (visible ou `sr-only`).

## Typographie

Deux voix, une par **nature de contenu** — pas par niveau hiérarchique :

- **Geist** porte tout ce qui est une *phrase*, titres compris.
- **Geist Mono** porte tout ce qui est une *donnée* : chiffres, noms de
  ville, promos, numéros d'étape, libellés de champ.

La règle se lit à l'œil nu : si c'est en chasse fixe, ça vient de la base. Les
deux sont chargées par `next/font` (auto-hébergées, métrique de repli calculée,
aucun décalage au chargement).

Il n'y a **pas** de troisième voix de titrage. `--font-display` existe encore
comme token — une vingtaine d'écrans l'utilisent — mais pointe sur la grotesque.
C'est le seul endroit à rouvrir si la marque veut un jour une voix distincte.

L'échelle est nommée par rôle dans `@theme` (`text-body`, `text-lead`,
`text-metric`, `text-hero`…). On prend un palier, jamais une taille brute.
L'interligne fait partie du palier.

| Rôle | Classes |
|---|---|
| Titre de héros | `text-hero sm:text-hero-lg font-medium tracking-[-0.022em]` |
| Titre de page | `text-title font-medium tracking-tight` |
| Titre de section | `text-section font-medium` |
| Libellé de bloc | `font-mono text-label text-text-faint` (bas de casse) |
| Corps | `text-body text-text-muted` |
| Métadonnée | `text-meta text-text-faint` |
| Chiffre | `font-mono tabular-nums` — toujours mono, les colonnes s'alignent |

Aucun `font-bold` : le poids maximal est `font-semibold`. Aucune italique.

Les libellés de bloc sont en **bas de casse**, pas en majuscules espacées : la
majuscule espacée avec une puce devant est précisément le sur-titre qu'on a
retiré.

## Rayons

Une échelle par **rôle**, sans valeur hors échelle :

| Token | Valeur | Rôle |
|---|---|---|
| `rounded-xs` | 3 px | Micro-élément : pastille d'initiale, bouton de retrait, segment logé dans un groupe, entrée de menu |
| `rounded-sm` | 5 px | **Contrôle** : bouton, champ, barre de recherche, puce, onglet de navigation |
| `rounded-md` | 7 px | **Conteneur** : panneau, carte, menu, modale, encart |
| `rounded-lg` / `rounded-xl` | 10 px | Feuille mobile (seul le haut est arrondi) |

3 px lisait comme un gabarit non fini ; 5 px reste droit à l'œil et se lit
comme un objet dessiné. Un élément logé dans un autre prend le palier du
dessous (segment `xs` dans un groupe `sm`, entrée `xs` dans un menu `md`).

`rounded-full` est réservé aux **points et pastilles** (marqueur de domaine,
nœud de carte). Jamais sur un bouton, un champ ou une puce : c'est le rayon qui
trahissait le gabarit autant que la couleur.

## Ombres

- `--shadow-panel` : 1 px, à peine perceptible. Élément posé au-dessus de la
  carte géographique.
- `--shadow-overlay` : modale, liste de suggestions, menu ouvert.

Une surface posée **dans le flux** n'a pas d'ombre : elle a un filet. Les trois
niveaux de papier (`base` / `surface` / `surface-raised`) suffisent à étager.

## Motifs

Écrits dans `@layer components` de `globals.css`, pour que les utilitaires
Tailwind gardent le dernier mot sur la forme. Chaque motif encode une relation
réelle ; un effet qui ne dit rien n'y entre pas.

| Motif | Rôle |
|---|---|
| `.index-row` + `.index-row__leader` | Ligne d'index à points de conduite : un nom, un compte, le filet entre les deux. Le motif central de l'accueil |
| `.rule-cols` / `.rule-col` | Colonnes de même poids séparées par un filet : mode d'emploi, garanties, index d'exploration. Empilées sous 768 px |
| `.motif-field` / `.motif-edge` / `.motif-node` | Motif de réseau de l'accueil : des points, des filets, quelques liaisons qui se tracent. Décoratif (`aria-hidden`), en SVG, sans une ligne de JavaScript |
| `.ledger` / `.ledger-cell` | Colonne de chiffres en chasse fixe, séparée par un filet. Pas de tuile |
| `.monogram` | Pastille d'encre neutre pour une entreprise ou un membre |
| `.bchip` | Puce de filtre : les crochets sont des **caractères**, rien à aligner ni arrondir |
| `.semantic-block` (+ `--warn`) | Filet de 2 px dans la marge. Vert = présent, ambre = lacune |

Sur fond clair, un aplat de couleur pâle se lit comme un champ désactivé :
c'est pourquoi les blocs sémantiques portent un filet et non un fond teinté.

## Composants

Tous dans `src/components/ui/index.tsx`, sauf `buttonClass()` qui vit dans
`src/components/ui/button.ts` — un module sans `"use client"`, pour qu'un
composant serveur puisse habiller un `Link` en bouton.

| Composant | Variantes | Règle |
|---|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `danger` × `sm` (32 px), `md` (36 px), `lg` (44 px) + `loading` | Un seul `primary` visible par écran. `lg` valide un formulaire et s'aligne sur les champs |
| `buttonClass()` | mêmes variantes et tailles | Pour un `Link` ou un `<a>` qui se présente comme une action. Jamais de classes de bouton recopiées à la main |
| `IconButton` | `outline` / `ghost` × `sm` (32) / `md` (36), actif / inactif | Carré, `aria-label` et `title` obligatoires |
| `ChoiceOption` | — | Choix exclusif en ligne (radio natif masqué) : filet vert + fond teinté + point rempli. Jamais une grosse carte |
| `StepProgress` | — | Parcours pas à pas : `01 Nature —— 02 Détails`, en chasse fixe. Une étape franchie peut afficher ce qui a été choisi |
| `FlowShell` (`PageShell.tsx`) | — | Colonne centrée de 32 rem pour les parcours (création de profil, contribution). Chaque étape porte son propre titre |
| `Chip` | avec ou sans `onRemove` | Filtre actif, hauteur 28 px |
| `DomainDot` | avec ou sans libellé | Point de 6 px, jamais un badge plein |
| `Metric` | `sm`, `md` | Chiffre mono + libellé |
| `inputClass` / `textareaClass` / `selectClass` | — | Hauteur 44 px, `border-strong`, focus = anneau `accent` de 3 px |
| `panelClass` | — | Filet + `surface-raised` + `shadow-panel` |

Composants d'écran : `MapControls`, `NetworkSearch`, `FilterMenu`,
`ActiveFilters`, `PlaceDrawer`, `ContactModal`, `CompanyLibrary`.

## Icônes

Une seule famille : **Phosphor** (`@phosphor-icons/react`), graisse `regular`.

- Dans un composant serveur, importer depuis `@phosphor-icons/react/ssr`.
- Taille : `h-3.5 w-3.5` en ligne de liste, `h-4 w-4` en tuile.
- Couleur : `text-text-faint`. Une icône situe, elle n'attire pas ; si elle
  doit attirer l'œil, c'est que l'information devrait être du texte.
- Toujours `aria-hidden` : l'icône double un libellé, elle ne le remplace pas.
- Jamais d'emoji en guise d'icône.

## Navigation

L'en-tête est **sticky mais opaque**. Rester à portée au défilement est un
comportement utile ; laisser le contenu transparaître à travers un flou n'en est
pas un. Un filet sépare l'en-tête du document, comme en haut d'une page imprimée.

Trois zones, séparées par un filet vertical : la marque, les destinations, le
compte. Les onglets sont du texte ; le survol pose un fond `surface-hover`
rayon `sm`, jamais une pilule. L'onglet actif passe à l'encre pleine et reçoit
un **filet vert de 2 px posé sur la bordure de l'en-tête**, et porte
`aria-current="page"` : l'état se lit par sa forme, sans percevoir la couleur.

Le compte est un menu (motif *menu button* de l'ARIA APG) : initiale, prénom,
chevron. Il s'ouvre au clic, à Entrée ou à ↓ ; les flèches, Début et Fin
parcourent les entrées ; Échap referme et rend le focus au déclencheur. Les
entrées sont des lignes de 36 px regroupées par des filets, pas des cartes.

Sous 768 px, les destinations passent dans un tiroir : lignes de 44 px, onglet
actif marqué d'un filet vert à gauche et d'un fond. Une navigation ou Échap le
referme.

### États d'un contrôle

| État | Traitement |
|---|---|
| Survol | Un cran de papier (`surface-hover`) ou d'encre (`accent-hover`) |
| Appui | Un cran de plus (`surface-pressed`, `accent-pressed`) — pas de mise à l'échelle |
| Focus clavier | Anneau `accent` de 2 px, décalé de 2 px (`@layer base`, remplaçable par un utilitaire) |
| Désactivé | Opacité 45 %, curseur interdit, aucun survol. Les événements pointeur restent actifs : le `title` qui explique pourquoi reste lisible |
| Chargement | `loading` : verrouille, annonce `aria-busy`, indicateur de 12 px à gauche du libellé |

## Carte géographique

`--color-map-ocean`, `--color-map-land` et `--color-map-border` vivent dans le
même bloc `@theme` que le reste : le fond de carte partage la famille de
neutres. La mer est le papier lui-même, la terre une trame à peine plus dense
tenue par son filet — une carte gravée, pas un fond d'écran.

**Contrôles** : groupe unique, filet partagé, colonne de 36 px — zoom avant,
niveau, zoom arrière, recentrage. Le niveau est affiché en permanence. Le groupe
se décale quand le tiroir s'ouvre, pour rester visible.

**Marqueurs** :

- Rayon `5 + √(n / n_max) · 9` : l'aire perçue suit le volume.
- Trois tons de densité (`node-1/2/3`), pas de couleur par domaine.
- Anneau fin au survol, anneau `accent` à la sélection.
- Compteur affiché à partir de 2 contributions.
- Cible de clic invisible d'au moins 11 px de rayon.
- `.marker-breathe` fait osciller l'**opacité** des pôles : un anneau qui
  grossit est précisément le motif qu'on n'utilise pas.

**Recherche** : `/network` accepte `?q=`. La recherche est donc partageable en
URL, et l'accueil peut ouvrir la carte déjà filtrée.

## Mouvement

| Animation | Durée | Usage |
|---|---|---|
| `animate-fade` | 140 ms | Apparition d'un menu, d'une info-bulle |
| `animate-panel` | 180 ms | Tiroir latéral (glisse de 12 px) |
| `animate-sheet` | 200 ms | Feuille mobile, modale (monte de 16 px) |
| Transition de couleur | 150 ms | Survol, focus |
| Transition de zoom | 260 ms | Boutons uniquement — jamais à la molette |
| `motif-trace` | 36 s | Motif de l'accueil : une liaison se trace, reste, s'efface. Les neuf sont décalées pour qu'il n'y en ait jamais deux à la fois |
| `motif-drift` | 34 s | Motif de l'accueil : dérive de 2 unités sur un dessin de 1440 |

Aucun rebond, aucune mise à l'échelle au survol, aucune lueur.
`prefers-reduced-motion` coupe tout, et fige le squelette de chargement à son
opacité de repos plutôt que de le faire disparaître. Le motif de l'accueil
garde alors son dessin complet, liaisons comprises : ce qui est retiré, c'est le
mouvement, jamais le contenu.

## Accessibilité

- Un seul style de focus, défini globalement dans `globals.css`.
- Tout bouton à icône porte un `aria-label` et un `title`.
- Tout champ porte un libellé **visible** — jamais un placeholder seul.
- La carte se parcourt au clavier (flèches, Entrée) via un contrôle dédié.
- La recherche de la carte est un `combobox` ARIA complet.
- Les modales sont `role="dialog" aria-modal`, fermées par `Échap`.
- Cibles tactiles : 44 px sur les champs et les actions principales.

## Ce qu'on ne fait pas

- Répéter un motif de carte pour de la donnée qui se lit mieux en liste.
- Ajouter une couleur pour distinguer deux éléments : la position et le poids
  typographique suffisent presque toujours.
- Empiler un filet, une ombre et un fond sur la même surface.
- Introduire une icône qui n'ajoute pas d'information.
- Écrire un texte de réassurance qui ne dit rien de vérifiable sur le produit.

## Logos d'entreprise

`CompanyLogo` (`src/components/CompanyLogo.tsx`) est le **seul** endroit du
projet qui décide de ce qu'on affiche à la place d'une entreprise. Partout —
répertoire, fiche, sélecteur, formulaire, contacts — c'est ce composant.

L'ordre est toujours le même :

1. `logo_url`, si un membre en a saisi une. Un choix humain gagne sur une
   déduction.
2. Sinon le **domaine** de l'entreprise (`microsoft.com`), passé au fournisseur
   de logos : `https://img.logo.dev/<domaine>`. Aucun fichier n'est stocké,
   aucune marque n'est codée en dur, et le mécanisme vaut pour dix mille fiches
   comme pour seize.
3. Sinon — pas de domaine, pas de jeton, réseau coupé, 404 — le **monogramme** :
   une ou deux initiales sur une pastille d'encre neutre.

Le monogramme est rendu **en dessous de l'image, tout le temps**. Il n'y a donc
ni trou pendant le chargement, ni décalage à l'arrivée, ni squelette qui pulse :
l'attente est occupée par la réponse correcte. Sans JavaScript, on voit le
monogramme — c'est une dégradation juste.

La pastille est **neutre et identique** pour toutes les entreprises : une teinte
par secteur faisait du monogramme l'élément le plus coloré de la page, alors
qu'il ne porte qu'une initiale. Elle reprend exactement le cadre de l'image —
même filet, même fond, même rayon — pour qu'un index mêlant logos et
monogrammes garde une seule colonne de vignettes.

**Sans `NEXT_PUBLIC_LOGO_DEV_TOKEN`, aucune requête ne part vers un tiers** et
l'application n'affiche que des monogrammes. C'est le mode par défaut, et c'est
un mode complet : il ne raconte rien à personne sur les entreprises que la promo
consulte. Renseigner le jeton ouvre `img-src` sur la seule origine du
fournisseur, automatiquement (`src/lib/csp.ts`).

Le logo est **décoratif** (`alt=""`) partout où il est utilisé, parce que le nom
de l'entreprise est toujours écrit à côté ; `decorative={false}` donne un `alt`
parlant pour un usage où le logo serait seul.
