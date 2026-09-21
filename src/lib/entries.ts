import { COUNTRY_ALIASES } from "./data/countries";
import {
  CAMPUS_LABELS,
  DOMAIN_LABELS,
  EXPERIENCE_KIND_LABELS,
  STATUS_LABELS,
} from "./labels";
import type {
  Author,
  Campus,
  Company,
  Contact,
  Domain,
  Entry,
  Experience,
  Filters,
  MemberStatus,
  Place,
} from "./types";

/** Une expérience et un contact partagent la même forme dans la carte et la liste. */
export function experienceToEntry(e: Experience): Entry {
  return {
    id: e.id,
    entryKind: "experience",
    company: e.company,
    place: e.place,
    domain: e.domain,
    year: e.year,
    author: e.author,
    headline: e.title,
    detail: e.summary,
    experienceKind: e.kind,
    contactFirstName: null,
    contactLastName: null,
    contactLinkedinUrl: null,
    startDate: e.startDate,
    endDate: e.endDate,
    isCurrent: e.isCurrent,
    skills: e.skills,
  };
}

export function contactToEntry(c: Contact): Entry {
  return {
    id: c.id,
    entryKind: "contact",
    company: c.company,
    place: c.place,
    domain: c.domain,
    year: new Date(c.createdAt).getUTCFullYear(),
    author: c.author,
    headline: c.position,
    detail: c.notes,
    experienceKind: null,
    contactFirstName: c.firstName,
    contactLastName: c.lastName,
    contactLinkedinUrl: c.linkedinUrl,
    startDate: null,
    endDate: null,
    isCurrent: null,
    skills: [],
  };
}

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Texte indexé pour la recherche libre.
 *
 * On y met les libellés affichés (domaine, statut, campus, type de stage) et
 * les alias de pays, pour que « alumni Germany » ou « Cybersecurity Paris »
 * fonctionnent sans construire un moteur de recherche.
 */
function haystack(entry: Entry): string {
  return normalize(
    [
      entry.company.name,
      entry.place.city,
      entry.place.countryName,
      entry.place.countryCode,
      ...(COUNTRY_ALIASES[entry.place.countryCode] ?? []),
      DOMAIN_LABELS[entry.domain],
      STATUS_LABELS[entry.author.status],
      CAMPUS_LABELS[entry.author.campus],
      entry.experienceKind
        ? EXPERIENCE_KIND_LABELS[entry.experienceKind]
        : "contact",
      String(entry.year),
      entry.headline,
      entry.detail ?? "",
      entry.contactFirstName ?? "",
      entry.contactLastName ?? "",
      entry.author.fullName,
    ].join(" "),
  );
}

export function matchesFilters(entry: Entry, filters: Filters): boolean {
  if (filters.entryKind && entry.entryKind !== filters.entryKind) return false;
  if (filters.continent && entry.place.continent !== filters.continent) return false;
  if (filters.country && entry.place.countryCode !== filters.country) return false;
  if (filters.city && entry.place.id !== filters.city) return false;
  if (filters.company && entry.company.slug !== filters.company) return false;
  if (filters.domain && entry.domain !== filters.domain) return false;
  if (filters.campus && entry.author.campus !== filters.campus) return false;
  if (filters.status && entry.author.status !== filters.status) return false;
  if (filters.year && entry.year !== filters.year) return false;
  if (filters.experienceKind && entry.experienceKind !== filters.experienceKind) {
    return false;
  }

  if (filters.q.trim()) {
    const text = haystack(entry);
    const needles = normalize(filters.q).split(/\s+/).filter(Boolean);
    if (!needles.every((n) => text.includes(n))) return false;
  }

  return true;
}

export function filterEntries(entries: Entry[], filters: Filters): Entry[] {
  return entries.filter((e) => matchesFilters(e, filters));
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.continent !== null ||
    filters.country !== null ||
    filters.city !== null ||
    filters.company !== null ||
    filters.domain !== null ||
    filters.campus !== null ||
    filters.status !== null ||
    filters.year !== null ||
    filters.experienceKind !== null ||
    filters.entryKind !== null
  );
}

/* ------------------------------------------------------------------ */
/* Agrégations                                                         */
/* ------------------------------------------------------------------ */

/**
 * Un marqueur de la carte : une ville et ce qu'elle pèse.
 *
 * Volontairement sans les entrées elles-mêmes. La carte n'a besoin que d'un
 * poids pour dimensionner le point et des entreprises représentées pour
 * tracer les liens entre villes ; le détail est chargé à l'ouverture du
 * panneau. C'est ce qui permet à `/network` de tenir avec un agrégat par
 * ville au lieu de la totalité des contributions.
 */
export interface PlaceCluster {
  place: Place;
  total: number;
  experienceCount: number;
  contactCount: number;
  /** Entreprises représentées dans la ville, dédoublonnées. */
  companySlugs: string[];
}

/**
 * Un lieu peut-il être placé sur la carte ?
 *
 * La carte reçoit des coordonnées qui viennent de la base, donc d'une saisie :
 * une ville sans latitude, une valeur hors plage, un `NaN` né d'une conversion
 * ratée. Projeter l'une d'elles produit `NaN`, et un `NaN` posé dans un
 * attribut SVG ne casse pas la carte bruyamment — il fait disparaître le point
 * en silence, ou déplace le marqueur n'importe où.
 *
 * Le test est fait ici, une fois, avant la projection. `0, 0` est une
 * coordonnée valide au sens mathématique mais ne désigne aucune ville : c'est
 * la valeur de repli d'une ligne incomplète (voir `mapPlace`), et elle est
 * écartée avec les autres.
 */
export function isPlottable(place: Place): boolean {
  const { lat, lng } = place;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Regroupe les entrées par ville pour dessiner un marqueur par lieu.
 *
 * Équivalent en JavaScript de la fonction `map_clusters` en base : le mode
 * démo et le mode terminal, qui travaillent sur un jeu déjà en mémoire,
 * doivent produire exactement les mêmes marqueurs que `/network` branché sur
 * Supabase. Les deux sont tenus ensemble par `tests/map-aggregate.test.ts`.
 */
export function clusterByPlace(entries: Entry[]): PlaceCluster[] {
  const byPlace = new Map<string, PlaceCluster & { slugs: Set<string> }>();
  for (const entry of entries) {
    let cluster = byPlace.get(entry.place.id);
    if (!cluster) {
      cluster = {
        place: entry.place,
        total: 0,
        experienceCount: 0,
        contactCount: 0,
        companySlugs: [],
        slugs: new Set<string>(),
      };
      byPlace.set(entry.place.id, cluster);
    }
    cluster.total += 1;
    cluster.slugs.add(entry.company.slug);
    if (entry.entryKind === "experience") cluster.experienceCount += 1;
    else cluster.contactCount += 1;
  }
  return [...byPlace.values()]
    .map(({ slugs, ...cluster }) => ({
      ...cluster,
      companySlugs: [...slugs].sort(),
    }))
    .sort((a, b) => b.total - a.total || a.place.id.localeCompare(b.place.id));
}

/**
 * Les valeurs que le menu de filtres propose vraiment.
 *
 * Pays et années ne sont pas des listes fermées comme les domaines ou les
 * statuts : elles dépendent de ce que le réseau contient. Le menu les lisait
 * dans le jeu d'entrées complet ; il les reçoit maintenant du serveur, qui
 * les agrège (`network_facets` en base, cette fonction en mode démo).
 */
export interface NetworkFacets {
  countries: { code: string; name: string }[];
  years: number[];
  /** Nombre de contributions par domaine — le compteur de l'autocomplétion. */
  domains: { key: Domain; count: number }[];
}

export function computeFacets(entries: Entry[]): NetworkFacets {
  const countries = new Map<string, string>();
  const years = new Set<number>();
  const domains = new Map<Domain, number>();
  for (const entry of entries) {
    countries.set(entry.place.countryCode, entry.place.countryName);
    years.add(entry.year);
    domains.set(entry.domain, (domains.get(entry.domain) ?? 0) + 1);
  }
  return sortFacets({
    countries: [...countries].map(([code, name]) => ({ code, name })),
    years: [...years],
    domains: [...domains].map(([key, count]) => ({ key, count })),
  });
}

/**
 * L'ordre d'affichage des facettes, quelle que soit leur provenance.
 *
 * Postgres trie selon la collation de la base, `localeCompare` selon celle du
 * serveur Node : deux listes de pays qui ne se ressemblent pas. Le classement
 * est donc refait ici, après la lecture, pour que le menu propose le même
 * ordre branché ou non.
 */
export function sortFacets(facets: NetworkFacets): NetworkFacets {
  return {
    countries: [...facets.countries].sort((a, b) => a.name.localeCompare(b.name)),
    years: [...facets.years].sort((a, b) => b - a),
    domains: [...facets.domains].sort((a, b) => b.count - a.count),
  };
}

/** Ce que le panneau contextuel d'une ville ou d'une entreprise affiche. */
export interface EntrySummary {
  experiences: number;
  contacts: number;
  companies: { company: Company; count: number }[];
  domains: { domain: Domain; count: number }[];
  members: number;
  years: { min: number; max: number } | null;
}

export function summarize(entries: Entry[]): EntrySummary {
  const companies = new Map<string, { company: Company; count: number }>();
  const domains = new Map<Domain, number>();
  const members = new Set<string>();
  let experiences = 0;
  let contacts = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const entry of entries) {
    if (entry.entryKind === "experience") experiences += 1;
    else contacts += 1;
    members.add(entry.author.id);
    domains.set(entry.domain, (domains.get(entry.domain) ?? 0) + 1);
    const existing = companies.get(entry.company.slug);
    if (existing) existing.count += 1;
    else companies.set(entry.company.slug, { company: entry.company, count: 1 });
    min = Math.min(min, entry.year);
    max = Math.max(max, entry.year);
  }

  return {
    experiences,
    contacts,
    members: members.size,
    companies: [...companies.values()].sort((a, b) => b.count - a.count),
    domains: [...domains.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count })),
    years: Number.isFinite(min) ? { min, max } : null,
  };
}

export interface NetworkStats {
  countries: number;
  cities: number;
  companies: number;
  experiences: number;
  contacts: number;
  members: number;
  topCompanies: { label: string; count: number }[];
  topCities: { label: string; count: number }[];
  topDomains: { label: string; count: number; key: string }[];
  byYear: { year: number; count: number }[];
}

function rank(counts: Map<string, number>, limit: number) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function computeStats(entries: Entry[]): NetworkStats {
  const countries = new Set<string>();
  const cities = new Set<string>();
  const companies = new Set<string>();
  const members = new Set<string>();
  const companyCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const yearCounts = new Map<number, number>();
  let experiences = 0;
  let contacts = 0;

  for (const entry of entries) {
    countries.add(entry.place.countryCode);
    cities.add(entry.place.id);
    companies.add(entry.company.slug);
    members.add(entry.author.id);
    if (entry.entryKind === "experience") experiences += 1;
    else contacts += 1;

    companyCounts.set(
      entry.company.name,
      (companyCounts.get(entry.company.name) ?? 0) + 1,
    );
    const cityLabel = `${entry.place.city}, ${entry.place.countryName}`;
    cityCounts.set(cityLabel, (cityCounts.get(cityLabel) ?? 0) + 1);
    domainCounts.set(entry.domain, (domainCounts.get(entry.domain) ?? 0) + 1);
    yearCounts.set(entry.year, (yearCounts.get(entry.year) ?? 0) + 1);
  }

  return {
    countries: countries.size,
    cities: cities.size,
    companies: companies.size,
    experiences,
    contacts,
    members: members.size,
    topCompanies: rank(companyCounts, 8),
    topCities: rank(cityCounts, 8),
    /* Le libellé affiché ne vit qu'à un endroit : ici comme côté base
       (`network_stats` renvoie la clé, `repository` la traduit). Sans cette
       traduction, le mode démo affichait « cloud_devops » là où l'instance
       branchée affiche « Cloud & DevOps ». */
    topDomains: rank(domainCounts, 9).map((d) => ({
      key: d.label,
      label: DOMAIN_LABELS[d.label as Domain] ?? d.label,
      count: d.count,
    })),
    byYear: [...yearCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count })),
  };
}

/* ------------------------------------------------------------------ */
/* Suggestions de recherche                                            */
/* ------------------------------------------------------------------ */

export type SuggestionKind = "company" | "city" | "country" | "domain" | "member";

export interface Suggestion {
  kind: SuggestionKind;
  label: string;
  hint: string;
  /** Filtre appliqué quand la suggestion est choisie. */
  patch: Partial<Filters>;
  count: number;
}

const SUGGESTION_ORDER: SuggestionKind[] = [
  "company",
  "city",
  "country",
  "domain",
  "member",
];

/**
 * D'où viennent les suggestions, avant mise en forme.
 *
 * Deux sources les produisent : le jeu en mémoire (mode démo, mode terminal)
 * et `network_suggestions` en base. Les libellés, les indices et surtout les
 * filtres posés au clic ne sont écrits qu'ici — sinon choisir « Paris »
 * n'aurait pas le même effet selon que l'instance est branchée ou non.
 */
export interface SuggestionSource {
  companies: { slug: string; name: string; count: number }[];
  cities: { placeId: string; city: string; countryName: string; count: number }[];
  countries: { code: string; name: string; count: number }[];
  domains: { key: Domain; count: number }[];
  members: {
    id: string;
    name: string;
    status: MemberStatus;
    campus: Campus;
    count: number;
  }[];
}

/**
 * Mise en forme et classement des suggestions. Entreprises d'abord — c'est ce
 * qu'on cherche le plus souvent sur cette carte —, puis villes, pays,
 * domaines, membres ; à l'intérieur d'une famille, le plus représenté gagne.
 */
export function suggestionsFrom(
  source: SuggestionSource,
  limit = 7,
): Suggestion[] {
  const buckets: Record<SuggestionKind, Suggestion[]> = {
    company: source.companies.map((c) => ({
      kind: "company",
      label: c.name,
      hint: "Entreprise",
      patch: { company: c.slug },
      count: c.count,
    })),
    city: source.cities.map((c) => ({
      kind: "city",
      label: `${c.city}, ${c.countryName}`,
      hint: "Ville",
      /* Choisir une ville, c'est y aller : les filtres de zone plus larges
         seraient contradictoires et sont retirés. */
      patch: { city: c.placeId, country: null, continent: null },
      count: c.count,
    })),
    country: source.countries.map((c) => ({
      kind: "country",
      label: c.name,
      hint: "Pays",
      patch: { country: c.code, city: null, continent: null },
      count: c.count,
    })),
    domain: source.domains.map((d) => ({
      kind: "domain",
      label: DOMAIN_LABELS[d.key],
      hint: "Domaine",
      patch: { domain: d.key },
      count: d.count,
    })),
    member: source.members.map((m) => ({
      kind: "member",
      label: m.name,
      hint: `${STATUS_LABELS[m.status]} · ${CAMPUS_LABELS[m.campus]}`,
      /* Un membre n'est pas un filtre : on relance la recherche sur son nom. */
      patch: { q: m.name },
      count: m.count,
    })),
  };

  return SUGGESTION_ORDER.flatMap((kind) =>
    [...buckets[kind]].sort((a, b) => b.count - a.count),
  ).slice(0, limit);
}

/** En deçà de deux caractères, tout correspond : on ne propose rien. */
export const MIN_SUGGESTION_LENGTH = 2;

/**
 * Autocomplétion calculée sur un jeu d'entrées déjà en mémoire — le mode démo
 * et le mode terminal. Branchée sur Supabase, la même liste est agrégée en
 * base (`network_suggestions`), pour ne pas avoir à charger le réseau entier.
 */
export function buildSuggestions(
  entries: Entry[],
  query: string,
  limit = 7,
): Suggestion[] {
  const q = normalize(query.trim());
  if (q.length < MIN_SUGGESTION_LENGTH) return [];

  const companies = new Map<string, SuggestionSource["companies"][number]>();
  const cities = new Map<string, SuggestionSource["cities"][number]>();
  const countries = new Map<string, SuggestionSource["countries"][number]>();
  const domains = new Map<Domain, SuggestionSource["domains"][number]>();
  const members = new Map<string, SuggestionSource["members"][number]>();

  const bump = <K, V extends { count: number }>(
    store: Map<K, V>,
    key: K,
    make: () => V,
  ) => {
    const existing = store.get(key);
    if (existing) existing.count += 1;
    else store.set(key, make());
  };

  for (const entry of entries) {
    if (normalize(entry.company.name).includes(q)) {
      bump(companies, entry.company.slug, () => ({
        slug: entry.company.slug,
        name: entry.company.name,
        count: 1,
      }));
    }
    if (normalize(entry.place.city).includes(q)) {
      bump(cities, entry.place.id, () => ({
        placeId: entry.place.id,
        city: entry.place.city,
        countryName: entry.place.countryName,
        count: 1,
      }));
    }
    const countryTerms = [
      entry.place.countryName,
      ...(COUNTRY_ALIASES[entry.place.countryCode] ?? []),
    ];
    if (countryTerms.some((term) => normalize(term).includes(q))) {
      bump(countries, entry.place.countryCode, () => ({
        code: entry.place.countryCode,
        name: entry.place.countryName,
        count: 1,
      }));
    }
    if (normalize(DOMAIN_LABELS[entry.domain]).includes(q)) {
      bump(domains, entry.domain, () => ({ key: entry.domain, count: 1 }));
    }
    if (normalize(entry.author.fullName).includes(q)) {
      bump(members, entry.author.id, () => ({
        id: entry.author.id,
        name: entry.author.fullName,
        status: entry.author.status,
        campus: entry.author.campus,
        count: 1,
      }));
    }
  }

  return suggestionsFrom(
    {
      companies: [...companies.values()],
      cities: [...cities.values()],
      countries: [...countries.values()],
      domains: [...domains.values()],
      members: [...members.values()],
    },
    limit,
  );
}

/**
 * Un échantillon réel pour illustrer le réseau : une entreprise, un alumni,
 * un étudiant, une ville — pas une visualisation des données.
 *
 * L'entreprise retenue est celle qui réunit le plus de statuts différents
 * parmi ses auteurs (à égalité, le plus de contributions) : c'est elle qui
 * montre le mieux qu'un alumni et un étudiant se croisent au même endroit.
 * Chaque personne est prise dans cette entreprise si possible, sinon ailleurs
 * dans le réseau ; `linked` dit laquelle des deux y est vraiment passée, pour
 * ne dessiner que des liens qui existent.
 */
export interface NetworkSample {
  company: Company | null;
  place: Place | null;
  alumni: { author: Author; linked: boolean } | null;
  student: { author: Author; linked: boolean } | null;
}

export function pickNetworkSample(entries: Entry[]): NetworkSample {
  const byCompany = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = byCompany.get(entry.company.id);
    if (list) list.push(entry);
    else byCompany.set(entry.company.id, [entry]);
  }

  let best: Entry[] = [];
  let bestScore = -1;
  for (const list of byCompany.values()) {
    const statuses = new Set(list.map((e) => e.author.status)).size;
    const score = statuses * 1000 + list.length;
    if (score > bestScore) {
      best = list;
      bestScore = score;
    }
  }

  const person = (status: Author["status"]) => {
    const here = best.find((e) => e.author.status === status);
    if (here) return { author: here.author, linked: true };
    const elsewhere = entries.find((e) => e.author.status === status);
    return elsewhere ? { author: elsewhere.author, linked: false } : null;
  };

  return {
    company: best[0]?.company ?? null,
    place: best[0]?.place ?? null,
    alumni: person("alumni"),
    student: person("student"),
  };
}
