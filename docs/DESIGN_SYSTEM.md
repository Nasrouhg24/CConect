# Design system CConnect

Ce document est la référence visuelle du projet. Une nouvelle page ne réinvente
pas ses couleurs, ses espacements ni ses boutons : elle prend ce qui est ici.

Les tokens vivent dans `src/app/globals.css` (bloc `@theme`), les primitives
dans `src/components/ui/index.tsx`.

## Principe

> Une seule couleur d'accent. Tout le reste est neutre.

La couleur est une information, pas une décoration. Un badge coloré plein
attire l'œil autant qu'un bouton d'action : c'est pour ça que les domaines sont
signalés par un point de 6 px et non par une pastille pleine.

Interdits explicites, hérités de la revue de l'interface précédente :
dégradés décoratifs, ombres colorées, lueurs, arrondis arbitraires, badges
partout, plusieurs couleurs vives sur le même écran.

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `base` | `#0a0e13` | Fond de l'application, fond de la carte |
| `surface` | `#10151c` | En-tête, champs, surfaces posées sur le fond |
| `surface-raised` | `#161c25` | Panneaux, menus, modales |
| `surface-hover` | `#1c232e` | Survol d'un élément interactif |
| `border` | `#222b36` | Bordure par défaut, séparateurs |
| `border-strong` | `#2f3a48` | Bordure d'un élément interactif au repos |
| `text` | `#e8edf4` | Texte principal |
| `text-muted` | `#98a5b6` | Texte secondaire, descriptions |
| `text-faint` | `#6b7888` | Métadonnées, libellés, unités |
| `accent` | `#2a9d8f` | Action principale, sélection, liens actifs |
| `accent-hover` / `accent-pressed` | `#33b5a5` / `#22857a` | États du bouton principal |
| `accent-soft` | `#14322f` | Fond d'un état actif discret |
| `on-accent` | `#04140f` | Texte posé sur l'accent |
| `success` / `warning` / `danger` | `#4c9a72` / `#cf9445` / `#c65f4d` | **États uniquement**, jamais en décor |
| `node-1` / `node-2` / `node-3` | `#64768a` / `#3c7c78` / `#2a9d8f` | Densité des marqueurs : un dégradé, pas une palette |

Les couleurs de domaine (`DOMAIN_COLORS` dans `src/lib/labels.ts`) sont
désaturées et de luminosité homogène. Elles ne servent qu'au point indicateur.

## Typographie

Une seule famille (Geist), une famille mono pour les chiffres. La hiérarchie
vient du poids et de l'espacement, pas du gras généralisé.

| Rôle | Classes | Note |
|---|---|---|
| Titre de page | `text-[26px] font-medium tracking-tight` | Un seul par écran |
| Titre de héros | `text-[40px] font-medium leading-[1.1] tracking-tight` | Accueil uniquement |
| Titre de section | `text-base font-medium` | |
| Sur-titre / libellé | `text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint` | Étiquette de bloc ou de champ |
| Corps | `text-sm leading-relaxed text-text-muted` | |
| Élément de liste | `text-[13px]` / `text-[14px]` | |
| Métadonnée | `text-[12px] text-text-faint` | |
| Chiffre | `font-mono tabular-nums` | Toujours mono : les colonnes s'alignent |

Aucun texte en `font-bold`. Le poids maximal est `font-semibold`, réservé à la
marque et aux compteurs dans les marqueurs.

## Espacement et rythme

Échelle Tailwind par pas de 4 px. En pratique on n'utilise que
`1.5 / 2 / 2.5 / 3 / 4 / 5 / 6 / 8 / 10 / 20`.

- Padding de panneau : `p-4` (compact) ou `px-5 py-4` (tiroir).
- Espacement entre sections d'une page : `mb-10`.
- Gouttière de grille : `gap-6` en contenu, `gap-2.5` en barre d'outils.

## Rayons

Trois valeurs, pas plus : `rounded-xs` (3 px, micro-boutons), `rounded-sm`
(5 px, **valeur par défaut** — boutons, champs, puces), `rounded-md` (8 px,
panneaux et modales). `rounded-lg` (12 px) est réservé à la feuille mobile.

Aucun `rounded-full` en dehors des points et des pastilles circulaires.

## Ombres

Deux ombres, jamais colorées :

- `--shadow-panel` : élément flottant au-dessus de la carte.
- `--shadow-overlay` : modale, liste de suggestions.

Une surface posée dans le flux n'a pas d'ombre — elle a une bordure.

## Composants

Tous dans `src/components/ui/index.tsx`.

| Composant | Variantes | Règle |
|---|---|---|
| `Button` | `primary`, `secondary`, `ghost`, `danger` × `sm` (32 px), `md` (36 px) | Un seul `primary` visible par écran |
| `IconButton` | actif / inactif | 36 × 36, `aria-label` obligatoire |
| `Chip` | avec ou sans `onRemove` | Filtre actif, hauteur 28 px |
| `DomainDot` | avec ou sans libellé | Point de 6 px, jamais un badge plein |
| `Metric` | `sm`, `md` | Chiffre mono + libellé en majuscules |
| `inputClass` / `selectClass` | — | Hauteur 36 px, bordure `border`, focus `accent` |
| `panelClass` | — | Surface élevée + `shadow-panel` |

Composants d'écran : `MapControls`, `NetworkSearch`, `FilterMenu`,
`ActiveFilters`, `PlaceDrawer`, `ContactModal`.

## Contrôles de carte

Groupe unique, bordure partagée, colonne de 36 px : zoom avant, niveau de zoom,
zoom arrière, recentrage. Le niveau est affiché en permanence. Le groupe se
décale horizontalement quand le tiroir contextuel s'ouvre, pour rester visible.

## Marqueurs

- Rayon `5 + √(n / n_max) · 9` : l'aire perçue suit le volume.
- Trois tons de densité (`node-1/2/3`), pas de couleur par domaine.
- Anneau fin au survol, anneau accent à la sélection.
- Compteur affiché à partir de 2 contributions.
- Cible de clic invisible d'au moins 11 px de rayon.
- Liens ténus vers le nœud actif : c'est un réseau, pas des épingles.

## Mouvement

| Animation | Durée | Usage |
|---|---|---|
| `animate-fade` | 140 ms | Apparition d'un menu, d'une info-bulle |
| `animate-panel` | 180 ms | Tiroir latéral (glisse de 12 px) |
| `animate-sheet` | 200 ms | Feuille mobile, modale (monte de 16 px) |
| Transition de couleur | 150 ms | Survol, focus |
| Transition de zoom | 260 ms | Boutons uniquement — jamais à la molette |

Aucun rebond, aucune mise à l'échelle au survol, aucune lueur.
`prefers-reduced-motion` coupe tout.

## Accessibilité

- Un seul style de focus, défini globalement dans `globals.css`.
- Tout bouton à icône porte un `aria-label` et un `title`.
- La carte se parcourt au clavier (flèches, Entrée) via un contrôle dédié.
- La recherche est un `combobox` ARIA complet (`aria-expanded`,
  `aria-controls`, `role="option"`, `aria-selected`).
- Les modales sont `role="dialog" aria-modal`, fermées par `Échap`.

## Ce qu'on ne fait pas

- Répéter un motif de carte pour de la donnée qui se lit mieux en liste.
- Ajouter une couleur pour distinguer deux éléments : la position et le poids
  typographique suffisent presque toujours.
- Empiler une bordure, une ombre et un fond sur la même surface.
- Introduire une icône qui n'ajoute pas d'information.
