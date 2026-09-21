import { COUNTRY_ALIASES } from "./data/countries";
import { normalize } from "./entries";
import {
  CAMPUSES,
  CAMPUS_LABELS,
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
  MEMBER_STATUSES,
  STATUS_LABELS,
} from "./labels";
import type {
  Campus,
  Domain,
  EntryKind,
  ExperienceKind,
  MemberStatus,
} from "./types";

/**
 * Traduction de la recherche libre en quelque chose que la base sait comparer.
 *
 * La carte filtrait en JavaScript sur un jeu déjà chargé : la recherche
 * pouvait donc comparer le mot tapé aux libellés affichés (« Cybersécurité »,
 * « Alumni », « Stage PFE »). Depuis que l'agrégat est calculé en base, il
 * faut lui passer la requête — mais la base ne connaît que des clés
 * (`cybersecurity`, `alumni`, `pfe`), et c'est très bien ainsi : les libellés
 * ne doivent vivre qu'à un endroit, sinon traduire l'interface demanderait une
 * migration.
 *
 * Chaque mot tapé est donc développé ici en ce qu'il désigne : un fragment de
 * texte (comparé aux noms, villes, titres, personnes) *et* les clés d'énumérés
 * dont le libellé le contient. La base n'a plus qu'à vérifier « ce mot touche
 * le texte de la ligne, ou l'une de ses clés ».
 *
 * Un mot doit matcher — comme `matchesFilters` en mémoire, dont cette
 * expansion reproduit la sémantique. `tests/search-expansion.test.ts` tient
 * les deux chemins ensemble.
 */
export interface QueryToken {
  /** Le mot normalisé, cherché dans le texte de la ligne. */
  text: string;
  domains: Domain[];
  statuses: MemberStatus[];
  campuses: Campus[];
  experienceKinds: ExperienceKind[];
  entryKinds: EntryKind[];
  /** Codes des pays dont un alias contient le mot (« germany » → `DE`). */
  countries: string[];
}

const COUNTRY_CODES = Object.keys(COUNTRY_ALIASES);

function matching<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
  needle: string,
): T[] {
  return values.filter((value) => normalize(labels[value]).includes(needle));
}

export function expandQuery(query: string): QueryToken[] {
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({
      text,
      domains: matching(DOMAINS, DOMAIN_LABELS, text),
      statuses: matching(MEMBER_STATUSES, STATUS_LABELS, text),
      campuses: matching(CAMPUSES, CAMPUS_LABELS, text),
      experienceKinds: matching(EXPERIENCE_KINDS, EXPERIENCE_KIND_LABELS, text),
      /* Une entrée de type contact n'a pas de libellé de stage : le mot
         « contact » tient ce rôle dans le texte indexé (voir `haystack`). */
      entryKinds: ("contact".includes(text) ? ["contact"] : []) as EntryKind[],
      countries: COUNTRY_CODES.filter((code) =>
        (COUNTRY_ALIASES[code] ?? []).some((alias) =>
          normalize(alias).includes(text),
        ),
      ),
    }));
}

/**
 * Les pays dont un alias contient le texte cherché.
 *
 * L'autocomplétion travaille sur la requête entière, pas mot à mot : taper
 * « united king » doit encore proposer le Royaume-Uni. Les alias ne sont pas
 * stockés en base, c'est donc à l'application de fournir les codes.
 */
export function countriesMatching(query: string): string[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  return COUNTRY_CODES.filter((code) =>
    (COUNTRY_ALIASES[code] ?? []).some((alias) =>
      normalize(alias).includes(needle),
    ),
  );
}
