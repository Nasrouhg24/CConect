import { RELATION_FILTERS, type PeopleQuery, type RelationFilter } from "./career";
import {
  CAMPUSES,
  CONTINENTS,
  DOMAINS,
  EXPERIENCE_KINDS,
  MEMBER_STATUSES,
} from "./labels";
import {
  EMPTY_FILTERS,
  type Campus,
  type Continent,
  type Domain,
  type ExperienceKind,
  type Filters,
  type MemberStatus,
} from "./types";

/**
 * Liens profonds entre les écrans.
 *
 * Le conseiller ne fait que *pointer* vers la carte, l'annuaire des personnes
 * ou une fiche entreprise déjà filtrés. Ces liens doivent donc être lus par la
 * page d'arrivée exactement comme ils sont écrits ici : constructeur et
 * lecteur vivent dans le même fichier pour ne jamais diverger.
 *
 * Tout paramètre inconnu ou mal formé est ignoré, jamais relayé : une URL est
 * une saisie.
 */

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | null {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.length <= 120 ? raw : null;
}

function oneOf<T extends string>(params: Params, key: string, allowed: readonly T[]): T | null {
  const raw = one(params, key);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

const SLUG = /^[a-z0-9-]{2,120}$/;
const COUNTRY = /^[A-Z]{2}$/;
/* Un uuid quand l'instance est branchée, la clé du référentiel en mode démo
   (« p-paris ») : les deux formes passent par l'URL. */
const PLACE_ID = /^[a-zA-Z0-9-]{2,64}$/;
/* Même intervalle que la contrainte de la table `experiences`. */
const YEAR = { min: 2005, max: 2100 };

function query(pairs: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(pairs)) {
    if (value) search.set(key, value);
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/* --------------------------------------------------------------- carte -- */

export interface NetworkLink {
  q?: string | null;
  domain?: Domain | null;
  country?: string | null;
  continent?: Continent | null;
  company?: string | null;
  kind?: ExperienceKind | null;
  status?: MemberStatus | null;
  entry?: "experience" | "contact" | null;
  city?: string | null;
  campus?: Campus | null;
  year?: number | null;
}

export function networkHref(link: NetworkLink = {}): string {
  return `/network${query({
    q: link.q,
    domain: link.domain,
    country: link.country,
    continent: link.continent,
    company: link.company,
    kind: link.kind,
    status: link.status,
    entry: link.entry,
    city: link.city,
    campus: link.campus,
    year: link.year ? String(link.year) : null,
  })}`;
}

/**
 * L'état complet de la carte, écrit dans l'URL.
 *
 * Tous les filtres y passent depuis que c'est la base qui filtre : l'écran ne
 * peut plus se contenter d'un état local, puisque changer un filtre demande
 * un nouvel agrégat. Effet de bord bienvenu — une carte filtrée se partage et
 * se recharge telle quelle, y compris ville, campus et année.
 */
export function networkHrefFromFilters(filters: Filters): string {
  return networkHref({
    q: filters.q.trim() || null,
    domain: filters.domain,
    country: filters.country,
    continent: filters.continent,
    company: filters.company,
    kind: filters.experienceKind,
    status: filters.status,
    entry: filters.entryKind,
    city: filters.city,
    campus: filters.campus,
    year: filters.year,
  });
}

/**
 * Les mêmes filtres, sous forme de paires — ce que `filtersFromParams` relit.
 *
 * La Server Action qui charge le détail d'une ville reçoit son contexte comme
 * ça : elle revalide l'URL au lieu de faire confiance à un objet venu du
 * navigateur.
 */
export function networkQuery(filters: Filters): string {
  return networkHrefFromFilters(filters).split("?")[1] ?? "";
}

export function filtersFromParams(params: Params): Filters {
  const country = one(params, "country");
  const company = one(params, "company");
  const entry = one(params, "entry");
  const city = one(params, "city");
  const year = Number(one(params, "year"));
  return {
    ...EMPTY_FILTERS,
    q: one(params, "q") ?? "",
    domain: oneOf(params, "domain", DOMAINS),
    country: country && COUNTRY.test(country) ? country : null,
    continent: oneOf(params, "continent", CONTINENTS),
    company: company && SLUG.test(company) ? company : null,
    experienceKind: oneOf(params, "kind", EXPERIENCE_KINDS),
    status: oneOf(params, "status", MEMBER_STATUSES),
    entryKind: entry === "experience" || entry === "contact" ? entry : null,
    city: city && PLACE_ID.test(city) ? city : null,
    campus: oneOf(params, "campus", CAMPUSES),
    year:
      Number.isInteger(year) && year >= YEAR.min && year <= YEAR.max
        ? year
        : null,
  };
}

/* ----------------------------------------------------------- personnes -- */

export function peopleHref(link: PeopleQuery = {}): string {
  return `/people${query({
    company: link.company,
    domain: link.domain,
    relation: link.relation,
    status: link.status,
    country: link.country,
  })}`;
}

export function peopleQueryFromParams(params: Params): PeopleQuery {
  const company = one(params, "company");
  const country = one(params, "country");
  return {
    company: company && SLUG.test(company) ? company : null,
    domain: oneOf(params, "domain", DOMAINS),
    relation: oneOf<RelationFilter>(params, "relation", RELATION_FILTERS),
    status: oneOf(params, "status", MEMBER_STATUSES),
    country: country && COUNTRY.test(country) ? country : null,
  };
}

export function personHref(authorId: string): string {
  return `/people/${encodeURIComponent(authorId)}`;
}

export function companyHref(slug: string, anchor?: string): string {
  return `/companies/${slug}${anchor ? `#${anchor}` : ""}`;
}

export const PROFILE_CAREER_HREF = "/profile#parcours";
