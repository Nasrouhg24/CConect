import { COUNTRY_ALIASES } from "./data/countries";
import {
  CAMPUS_LABELS,
  DOMAIN_LABELS,
  EXPERIENCE_KIND_LABELS,
  STATUS_LABELS,
} from "./labels";
import type {
  Author,
  Company,
  Contact,
  Domain,
  Entry,
  Experience,
  Filters,
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

export interface PlaceCluster {
  place: Place;
  entries: Entry[];
  experienceCount: number;
  contactCount: number;
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

/** Regroupe les entrées par ville pour dessiner un marqueur par lieu. */
export function clusterByPlace(entries: Entry[]): PlaceCluster[] {
  const byPlace = new Map<string, PlaceCluster>();
  for (const entry of entries) {
    let cluster = byPlace.get(entry.place.id);
    if (!cluster) {
      cluster = {
        place: entry.place,
        entries: [],
        experienceCount: 0,
        contactCount: 0,
      };
      byPlace.set(entry.place.id, cluster);
    }
    cluster.entries.push(entry);
    if (entry.entryKind === "experience") cluster.experienceCount += 1;
    else cluster.contactCount += 1;
  }
  return [...byPlace.values()].sort(
    (a, b) => b.entries.length - a.entries.length,
  );
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
 * Autocomplétion calculée à la volée sur le jeu d'entrées déjà chargé.
 * Pas d'appel réseau : la recherche reste instantanée et fonctionne hors ligne.
 */
export function buildSuggestions(
  entries: Entry[],
  query: string,
  limit = 7,
): Suggestion[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  const companies = new Map<string, Suggestion>();
  const cities = new Map<string, Suggestion>();
  const countries = new Map<string, Suggestion>();
  const domains = new Map<string, Suggestion>();
  const members = new Map<string, Suggestion>();

  const bump = (
    store: Map<string, Suggestion>,
    key: string,
    make: () => Suggestion,
  ) => {
    const existing = store.get(key);
    if (existing) existing.count += 1;
    else store.set(key, make());
  };

  for (const entry of entries) {
    if (normalize(entry.company.name).includes(q)) {
      bump(companies, entry.company.slug, () => ({
        kind: "company",
        label: entry.company.name,
        hint: "Entreprise",
        patch: { company: entry.company.slug },
        count: 1,
      }));
    }
    if (normalize(entry.place.city).includes(q)) {
      bump(cities, entry.place.id, () => ({
        kind: "city",
        label: `${entry.place.city}, ${entry.place.countryName}`,
        hint: "Ville",
        patch: { city: entry.place.id, country: null, continent: null },
        count: 1,
      }));
    }
    const countryTerms = [
      entry.place.countryName,
      ...(COUNTRY_ALIASES[entry.place.countryCode] ?? []),
    ];
    if (countryTerms.some((term) => normalize(term).includes(q))) {
      bump(countries, entry.place.countryCode, () => ({
        kind: "country",
        label: entry.place.countryName,
        hint: "Pays",
        patch: { country: entry.place.countryCode, city: null, continent: null },
        count: 1,
      }));
    }
    if (normalize(DOMAIN_LABELS[entry.domain]).includes(q)) {
      bump(domains, entry.domain, () => ({
        kind: "domain",
        label: DOMAIN_LABELS[entry.domain],
        hint: "Domaine",
        patch: { domain: entry.domain },
        count: 1,
      }));
    }
    if (normalize(entry.author.fullName).includes(q)) {
      bump(members, entry.author.id, () => ({
        kind: "member",
        label: entry.author.fullName,
        hint: `${STATUS_LABELS[entry.author.status]} · ${CAMPUS_LABELS[entry.author.campus]}`,
        patch: { q: entry.author.fullName },
        count: 1,
      }));
    }
  }

  const buckets: Record<SuggestionKind, Map<string, Suggestion>> = {
    company: companies,
    city: cities,
    country: countries,
    domain: domains,
    member: members,
  };

  return SUGGESTION_ORDER.flatMap((kind) =>
    [...buckets[kind].values()].sort((a, b) => b.count - a.count),
  ).slice(0, limit);
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
