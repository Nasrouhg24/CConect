import "server-only";

import { cache } from "react";
import { PLACES, PLACES_BY_ID } from "./data/places";
import { companySlug, normalizeCompanyName } from "./company-name";
import { domainFromWebsite } from "./company-domain";
import {
  buildSuggestions,
  clusterByPlace,
  computeFacets,
  computeStats,
  contactToEntry,
  experienceToEntry,
  filterEntries,
  sortFacets,
  suggestionsFrom,
  MIN_SUGGESTION_LENGTH,
  normalize,
  type NetworkFacets,
  type NetworkStats,
  type PlaceCluster,
  type Suggestion,
} from "./entries";
import { countriesMatching, expandQuery } from "./search";
import { DOMAIN_LABELS } from "./labels";
import { describeDbError, reportDbError } from "./db-error";
import { logSecurityEvent } from "./security-log";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./supabase/server";
import { demoStore } from "./demo-store";
import { photoVersion } from "./profile-photo";
import type { PhotoStore } from "./profile-photo-service";
import type {
  Author,
  CareerProfile,
  Company,
  Contact,
  Domain,
  Entry,
  Experience,
  Filters,
  Industry,
  MemberStatus,
  Place,
  StudyYear,
} from "./types";

/**
 * Point d'entrée unique pour lire/écrire les données.
 *
 * Deux implémentations derrière la même signature :
 *  - Supabase, dès que `NEXT_PUBLIC_SUPABASE_URL` et la clé anon sont définies ;
 *  - mode démo en mémoire sinon, pour que l'application tourne sans backend.
 *
 * Les composants n'importent jamais Supabase directement — cela garde la
 * possibilité de changer de base sans toucher à l'interface.
 *
 * Deux règles tiennent la montée en charge, et il faut les respecter en
 * ajoutant une lecture :
 *
 *  1. **Filtrer et compter en SQL, jamais en JavaScript.** Charger toutes les
 *     expériences du réseau pour n'en afficher qu'une est correct à 50 lignes
 *     et ruineux à 50 000. Les lectures ciblées (`…ByCompany`, `…ByAuthor`) et les
 *     agrégats (`getCompanyStats`, `getNetworkStats`) existent pour ça.
 *  2. **Toute lecture est mémoïsée par requête** (`cache` de React). Deux
 *     composants de la même page peuvent donc appeler la même fonction sans
 *     déclencher deux allers-retours. La portée est la requête : rien n'est
 *     partagé entre deux membres, ce qui serait une fuite avec la RLS.
 */

export const isDemoMode = !isSupabaseConfigured;

/**
 * PostgREST plafonne une réponse (1 000 lignes par défaut sur Supabase) et
 * tronque **en silence** au-delà. Une liste non paginée ne renvoie donc pas
 * une erreur quand le réseau grandit : elle renvoie une carte incomplète.
 * Les lectures de collection passent toutes par `fetchPaged`.
 */
const PAGE_SIZE = 1000;

/**
 * Garde-fou : au-delà, on refuse de charger plutôt que de faire tomber
 * l'instance en mémoire. C'est le seuil à partir duquel la carte doit passer
 * à un agrégat côté base — voir docs/ARCHITECTURE.md.
 */
const MAX_ROWS = 50_000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string; code?: string; details?: string } | null;
}

async function fetchPaged<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw dbFailure("fetchPaged", error);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new Error(
    `Plus de ${MAX_ROWS} lignes à charger : cette lecture doit être filtrée ou agrégée côté base.`,
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Erreur d'écriture ou de lecture remontée à l'appelant.
 *
 * Le message rendu à l'utilisateur est traduit (`describeDbError`) : le texte
 * brut de Postgres nomme contraintes et colonnes, ce qui renseigne un
 * attaquant sans aider un membre. Le détail part dans les journaux serveur.
 */
function dbFailure(context: string, error: unknown): Error {
  reportDbError(context, error);
  return new Error(describeDbError(error));
}


/* ------------------------------------------------------------------ */
/* Mapping des lignes Supabase vers le modèle de domaine               */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function firstRelation(value: unknown): Row | null {
  if (Array.isArray(value)) return (value[0] as Row) ?? null;
  return (value as Row) ?? null;
}

function mapPlace(row: Row | null): Place {
  return {
    id: String(row?.id ?? ""),
    city: String(row?.city ?? "—"),
    countryCode: String(row?.country_code ?? ""),
    countryName: String(row?.country_name ?? ""),
    continent: (row?.continent as Place["continent"]) ?? "africa",
    lat: Number(row?.lat ?? 0),
    lng: Number(row?.lng ?? 0),
  };
}

function mapCompany(row: Row | null): Company {
  const name = String(row?.name ?? "—");
  return {
    id: String(row?.id ?? ""),
    name,
    slug: String(row?.slug ?? ""),
    normalizedName: String(row?.normalized_name ?? normalizeCompanyName(name)),
    website: (row?.website as string | null) ?? null,
    domain: (row?.domain as string | null) ?? null,
    logoUrl: (row?.logo_url as string | null) ?? null,
    industry: (row?.industry as Industry) ?? "other",
    description: (row?.description as string | null) ?? null,
    linkedinUrl: (row?.linkedin_url as string | null) ?? null,
    headquarters: row?.headquarters
      ? mapPlace(firstRelation(row.headquarters))
      : null,
  };
}

function mapAuthor(row: Row | null): Author {
  return {
    id: String(row?.id ?? ""),
    fullName: String(row?.full_name ?? "Membre CConnect"),
    campus: (row?.campus as Author["campus"]) ?? "rabat",
    status: (row?.status as Author["status"]) ?? "student",
    promotion: Number(row?.promotion ?? 0),
    linkedinUrl: (row?.linkedin_url as string | null) ?? null,
    contactEmail: (row?.contact_email as string | null) ?? null,
    studyYear: (row?.study_year as StudyYear | null) ?? null,
    openToMentoring: (row?.open_to_mentoring as boolean | null) ?? null,
  };
}

/** `experience_skills(skill:skills(label))` → `["SIEM", "Python"]` */
function mapSkillLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((link) => firstRelation((link as Row)?.skill)?.label)
    .filter((label): label is string => typeof label === "string")
    .sort((a, b) => a.localeCompare(b));
}

function mapExperience(row: Row): Experience {
  return {
    id: String(row.id),
    author: mapAuthor(firstRelation(row.author)),
    company: mapCompany(firstRelation(row.company)),
    place: mapPlace(firstRelation(row.place)),
    domain: row.domain as Experience["domain"],
    kind: row.kind as Experience["kind"],
    year: Number(row.year),
    title: String(row.title),
    summary: (row.summary as string | null) ?? null,
    createdAt: String(row.created_at),
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    isCurrent: (row.is_current as boolean | null) ?? null,
    skills: mapSkillLabels(row.experience_skills),
  };
}

function mapContact(row: Row): Contact {
  return {
    id: String(row.id),
    author: mapAuthor(firstRelation(row.author)),
    company: mapCompany(firstRelation(row.company)),
    place: mapPlace(firstRelation(row.place)),
    domain: row.domain as Contact["domain"],
    firstName: String(row.first_name),
    lastName: (row.last_name as string | null) ?? null,
    position: String(row.position),
    linkedinUrl: (row.linkedin_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

const COMPANY_SELECT =
  "company:companies(id,name,slug,normalized_name,website,domain,logo_url,industry,description,linkedin_url)";
const PLACE_SELECT =
  "place:places(id,city,country_code,country_name,continent,lat,lng)";
const PROFILE_COLUMNS =
  "id,full_name,campus,status,promotion,linkedin_url,contact_email,study_year,open_to_mentoring";
const AUTHOR_SELECT = `author:profiles(${PROFILE_COLUMNS})`;
const COMPANY_COLUMNS =
  "id,name,slug,normalized_name,website,domain,logo_url,industry,description,linkedin_url";

const EXPERIENCE_SELECT = `id,domain,kind,year,title,summary,created_at,start_date,end_date,is_current,experience_skills(skill:skills(label)),${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`;
const CONTACT_SELECT = `id,domain,first_name,last_name,position,linkedin_url,notes,created_at,${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`;

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

function demoCompanies(): Company[] {
  return demoStore.companies;
}

/**
 * Toutes les contributions.
 *
 * Lecture volontairement non filtrée, et la plus chère du dépôt : elle
 * transfère le réseau entier. La carte ne s'en sert plus — elle passe par
 * `getMapClusters` — mais le conseiller, l'annuaire et le terminal la
 * demandent encore, et c'est le plafond connu de l'architecture (voir
 * « Passage à l'échelle » dans docs/ARCHITECTURE.md). Une page nouvelle doit
 * passer par une lecture ciblée ou un agrégat, jamais par ici.
 */
export const getEntries = cache(async (): Promise<Entry[]> => {
  if (isDemoMode) {
    return [
      ...demoStore.experiences.map(experienceToEntry),
      ...demoStore.contacts.map(contactToEntry),
    ].sort((a, b) => b.year - a.year);
  }

  const supabase = await createSupabaseServerClient();
  const [experiences, contacts] = await Promise.all([
    fetchPaged<Row>((from, to) =>
      supabase
        .from("experiences")
        .select(EXPERIENCE_SELECT)
        .order("year", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    fetchPaged<Row>((from, to) =>
      supabase
        .from("contacts")
        .select(CONTACT_SELECT)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);

  return [
    ...experiences.map((r) => experienceToEntry(mapExperience(r))),
    ...contacts.map((r) => contactToEntry(mapContact(r))),
  ].sort((a, b) => b.year - a.year);
});

/**
 * Ce que la base doit recevoir pour filtrer comme `matchesFilters` le fait.
 *
 * La recherche libre part développée (`expandQuery`) : la base ne connaît que
 * des clés, les libellés affichés restent dans l'application. Un identifiant
 * de ville mal formé est ignoré plutôt que transmis — il finirait en cast
 * raté, donc en erreur Postgres, sur une valeur qui vient de l'URL.
 */
function filtersPayload(filters: Filters) {
  return {
    entryKind: filters.entryKind,
    continent: filters.continent,
    country: filters.country,
    city: filters.city && UUID.test(filters.city) ? filters.city : null,
    company: filters.company,
    domain: filters.domain,
    campus: filters.campus,
    status: filters.status,
    year: filters.year,
    experienceKind: filters.experienceKind,
    tokens: expandQuery(filters.q),
  };
}

function mapCluster(row: Row): PlaceCluster {
  return {
    place: {
      id: String(row.placeId ?? ""),
      city: String(row.city ?? "—"),
      countryCode: String(row.countryCode ?? ""),
      countryName: String(row.countryName ?? ""),
      continent: (row.continent as Place["continent"]) ?? "africa",
      lat: Number(row.lat ?? 0),
      lng: Number(row.lng ?? 0),
    },
    total: Number(row.total ?? 0),
    experienceCount: Number(row.experienceCount ?? 0),
    contactCount: Number(row.contactCount ?? 0),
    companySlugs: Array.isArray(row.companySlugs)
      ? row.companySlugs.map(String)
      : [],
  };
}

/**
 * Les marqueurs de la carte : une ville, son poids, ses entreprises.
 *
 * Le filtrage se fait en base. C'est ce qui permet à `/network` de ne plus
 * transférer les contributions une à une : la réponse grandit avec le nombre
 * de villes du réseau, pas avec le nombre de contributions. Le détail d'une
 * ville est lu séparément, à l'ouverture du panneau (`getPlaceEntries`).
 *
 * Pas de `cache` ici, contrairement aux autres lectures : la clé serait un
 * objet reconstruit à chaque appel, donc jamais retrouvé. La page n'appelle
 * qu'une fois.
 */
export async function getMapClusters(filters: Filters): Promise<PlaceCluster[]> {
  if (isDemoMode) {
    return clusterByPlace(filterEntries(await getEntries(), filters));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("map_clusters", {
    p_filters: filtersPayload(filters),
  });
  if (error) throw dbFailure("getMapClusters", error);
  return ((data ?? []) as Row[]).map(mapCluster);
}

/**
 * Les contributions d'une ville, chargées à l'ouverture du panneau.
 *
 * Lecture ciblée sur `place_id` : c'est la contrepartie de l'agrégat, et la
 * raison pour laquelle la carte n'a plus besoin du réseau entier. Les filtres
 * en cours sont réappliqués en mémoire sur ce petit jeu, par la fonction qui
 * sert déjà partout ailleurs — une seule définition de « correspondre ».
 */
export async function getPlaceEntries(
  placeId: string,
  filters: Filters,
): Promise<Entry[]> {
  if (isDemoMode) {
    const entries = (await getEntries()).filter((e) => e.place.id === placeId);
    return filterEntries(entries, filters);
  }
  if (!UUID.test(placeId)) return [];

  const supabase = await createSupabaseServerClient();
  const [experiences, contacts] = await Promise.all([
    fetchPaged<Row>((from, to) =>
      supabase
        .from("experiences")
        .select(EXPERIENCE_SELECT)
        .eq("place_id", placeId)
        .order("year", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    fetchPaged<Row>((from, to) =>
      supabase
        .from("contacts")
        .select(CONTACT_SELECT)
        .eq("place_id", placeId)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
  ]);

  const entries = [
    ...experiences.map((r) => experienceToEntry(mapExperience(r))),
    ...contacts.map((r) => contactToEntry(mapContact(r))),
  ].sort((a, b) => b.year - a.year);

  return filterEntries(entries, filters);
}

/**
 * Les valeurs que le menu de filtres peut proposer.
 *
 * Pays et années dépendent de ce que le réseau contient : le menu les lisait
 * dans le jeu d'entrées complet, il les reçoit maintenant agrégées. Non
 * filtrées, volontairement — retirer un filtre doit rester possible.
 */
export const getNetworkFacets = cache(async (): Promise<NetworkFacets> => {
  if (isDemoMode) return computeFacets(await getEntries());

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("network_facets");
  if (error) throw dbFailure("getNetworkFacets", error);

  const raw = (data ?? {}) as Partial<NetworkFacets>;
  return sortFacets({
    countries: raw.countries ?? [],
    years: (raw.years ?? []).map(Number),
    domains: (raw.domains ?? []).map((d) => ({
      key: d.key as Domain,
      count: Number(d.count),
    })),
  });
});

/**
 * L'autocomplétion de la recherche.
 *
 * Les domaines sont traités à part : leur libellé n'existe que dans
 * l'application, la base ne saurait pas dire lequel correspond à « cyber ».
 * On compare donc ici, et on ne demande à la base que le compteur (facette).
 */
export async function getSuggestions(query: string): Promise<Suggestion[]> {
  if (isDemoMode) return buildSuggestions(await getEntries(), query);

  const trimmed = query.trim();
  if (normalize(trimmed).length < MIN_SUGGESTION_LENGTH) return [];

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, facets] = await Promise.all([
    supabase.rpc("network_suggestions", {
      p_query: trimmed,
      p_countries: countriesMatching(trimmed),
    }),
    getNetworkFacets(),
  ]);
  if (error) throw dbFailure("getSuggestions", error);

  const raw = (data ?? {}) as Record<string, Row[]>;
  const needle = normalize(trimmed);

  return suggestionsFrom({
    companies: (raw.companies ?? []).map((c) => ({
      slug: String(c.slug),
      name: String(c.name),
      count: Number(c.count),
    })),
    cities: (raw.cities ?? []).map((c) => ({
      placeId: String(c.placeId),
      city: String(c.city),
      countryName: String(c.countryName),
      count: Number(c.count),
    })),
    countries: (raw.countries ?? []).map((c) => ({
      code: String(c.code),
      name: String(c.name),
      count: Number(c.count),
    })),
    domains: facets.domains.filter((d) =>
      normalize(DOMAIN_LABELS[d.key]).includes(needle),
    ),
    members: (raw.members ?? []).map((m) => ({
      id: String(m.id),
      name: String(m.name),
      status: m.status as MemberStatus,
      campus: m.campus as Author["campus"],
      count: Number(m.count),
    })),
  });
}

export const getCompanies = cache(async (): Promise<Company[]> => {
  if (isDemoMode) {
    // Copie : trier en place modifierait le store à la lecture.
    return [...demoCompanies()].sort((a, b) => a.name.localeCompare(b.name));
  }
  const supabase = await createSupabaseServerClient();
  const rows = await fetchPaged<Row>((from, to) =>
    supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .order("name")
      .order("id")
      .range(from, to),
  );
  return rows.map(mapCompany);
});

export const getCompanyBySlug = cache(
  async (slug: string): Promise<Company | null> => {
    if (isDemoMode) {
      return demoCompanies().find((c) => c.slug === slug) ?? null;
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw dbFailure("repository", error);
    return data ? mapCompany(data as Row) : null;
  },
);

/**
 * Résolution d'une entreprise par son identifiant.
 *
 * Les Server Actions vérifient que l'entreprise visée existe avant d'écrire.
 * Charger l'annuaire complet pour une seule vérification est le genre de
 * détail qui ne se voit qu'une fois la plateforme remplie.
 */
export const getCompanyById = cache(
  async (id: string): Promise<Company | null> => {
    if (isDemoMode) return demoCompanies().find((c) => c.id === id) ?? null;
    if (!UUID.test(id)) return null;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw dbFailure("repository", error);
    return data ? mapCompany(data as Row) : null;
  },
);

/** Rapprochement anti-doublons : la même clé que l'index unique en base. */
export const getCompanyByNormalizedName = cache(
  async (normalized: string): Promise<Company | null> => {
    if (isDemoMode) {
      return demoCompanies().find((c) => c.normalizedName === normalized) ?? null;
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS)
      .eq("normalized_name", normalized)
      .maybeSingle();
    if (error) throw dbFailure("repository", error);
    return data ? mapCompany(data as Row) : null;
  },
);

export const getContact = cache(async (id: string): Promise<Contact | null> => {
  if (isDemoMode) return demoStore.contacts.find((c) => c.id === id) ?? null;
  if (!UUID.test(id)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbFailure("repository", error);
  return data ? mapContact(data as Row) : null;
});

export const getPlaces = cache(async (): Promise<Place[]> => {
  if (isDemoMode) {
    return [...PLACES].sort((a, b) => a.city.localeCompare(b.city));
  }
  const supabase = await createSupabaseServerClient();
  const rows = await fetchPaged<Row>((from, to) =>
    supabase
      .from("places")
      .select("id,city,country_code,country_name,continent,lat,lng")
      .order("city")
      .order("id")
      .range(from, to),
  );
  return rows.map(mapPlace);
});

/** Contacts rattachés à une entreprise — la relation Entreprise → Contacts. */
export const getContacts = cache(async (): Promise<Contact[]> => {
  if (isDemoMode) {
    return [...demoStore.contacts];
  }
  const supabase = await createSupabaseServerClient();
  const rows = await fetchPaged<Row>((from, to) =>
    supabase
      .from("contacts")
      .select(CONTACT_SELECT)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return rows.map(mapContact);
});

/** Contributions d'un membre — pour la page profil. */
export const getEntriesByAuthor = cache(
  async (authorId: string): Promise<Entry[]> => {
    if (isDemoMode) {
      return [
        ...demoStore.experiences
          .filter((e) => e.author.id === authorId)
          .map(experienceToEntry),
        ...demoStore.contacts
          .filter((c) => c.author.id === authorId)
          .map(contactToEntry),
      ].sort((a, b) => b.year - a.year);
    }

    const supabase = await createSupabaseServerClient();
    const [experiences, contacts] = await Promise.all([
      fetchPaged<Row>((from, to) =>
        supabase
          .from("experiences")
          .select(EXPERIENCE_SELECT)
          .eq("author_id", authorId)
          .order("year", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      fetchPaged<Row>((from, to) =>
        supabase
          .from("contacts")
          .select(CONTACT_SELECT)
          .eq("author_id", authorId)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ]);

    return [
      ...experiences.map((r) => experienceToEntry(mapExperience(r))),
      ...contacts.map((r) => contactToEntry(mapContact(r))),
    ].sort((a, b) => b.year - a.year);
  },
);

/** Tout ce qu'il faut pour la fiche entreprise, en une passe. */
export interface CompanyBundle {
  company: Company;
  contacts: Contact[];
  experiences: Entry[];
}

/**
 * Fiche entreprise : deux lectures filtrées sur `company_id`, servies par les
 * index composites de la migration 0004. La version précédente chargeait les
 * contacts et expériences du réseau entier pour n'en garder qu'une poignée —
 * le coût d'une fiche grandissait avec la plateforme.
 */
export const getCompanyBundle = cache(
  async (slug: string): Promise<CompanyBundle | null> => {
    const company = await getCompanyBySlug(slug);
    if (!company) return null;

    if (isDemoMode) {
      // Filtrer un tableau en mémoire ne coûte rien : on réutilise les
      // accesseurs pour garder exactement le même ordre d'affichage.
      const [contacts, entries] = await Promise.all([
        getContacts(),
        getEntries(),
      ]);
      return {
        company,
        contacts: contacts.filter((c) => c.company.slug === slug),
        experiences: entries.filter(
          (e) => e.company.slug === slug && e.entryKind === "experience",
        ),
      };
    }

    const supabase = await createSupabaseServerClient();
    const [contacts, experiences] = await Promise.all([
      fetchPaged<Row>((from, to) =>
        supabase
          .from("contacts")
          .select(CONTACT_SELECT)
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
      fetchPaged<Row>((from, to) =>
        supabase
          .from("experiences")
          .select(EXPERIENCE_SELECT)
          .eq("company_id", company.id)
          .order("year", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ]);

    return {
      company,
      contacts: contacts.map(mapContact),
      experiences: experiences.map((r) => experienceToEntry(mapExperience(r))),
    };
  },
);

/** Compteurs affichés par la liste des entreprises, agrégés en base. */
export interface CompanyCounts {
  contacts: number;
  experiences: number;
}

export const getCompanyStats = cache(
  async (): Promise<Map<string, CompanyCounts>> => {
    const stats = new Map<string, CompanyCounts>();

    if (isDemoMode) {
      const bump = (slug: string, key: keyof CompanyCounts) => {
        const row = stats.get(slug) ?? { contacts: 0, experiences: 0 };
        row[key] += 1;
        stats.set(slug, row);
      };
      for (const c of demoStore.contacts) bump(c.company.slug, "contacts");
      for (const e of demoStore.experiences) bump(e.company.slug, "experiences");
      return stats;
    }

    const supabase = await createSupabaseServerClient();
    const rows = await fetchPaged<Row>((from, to) =>
      supabase
        .from("company_stats")
        .select("company_slug,contact_count,experience_count")
        .order("company_slug")
        .range(from, to),
    );

    for (const row of rows) {
      stats.set(String(row.company_slug), {
        contacts: Number(row.contact_count ?? 0),
        experiences: Number(row.experience_count ?? 0),
      });
    }
    return stats;
  },
);

/**
 * Statistiques du réseau.
 *
 * Une seule requête d'agrégat côté Postgres (`network_stats()`), au lieu de
 * transférer toutes les contributions pour les compter en mémoire. En mode
 * démo, le calcul en JavaScript de `computeStats` fait le même travail.
 */
export const getNetworkStats = cache(async (): Promise<NetworkStats> => {
  if (isDemoMode) return computeStats(await getEntries());

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("network_stats");
  if (error) throw dbFailure("repository", error);

  const raw = (data ?? {}) as Partial<NetworkStats>;
  return {
    countries: raw.countries ?? 0,
    cities: raw.cities ?? 0,
    companies: raw.companies ?? 0,
    experiences: raw.experiences ?? 0,
    contacts: raw.contacts ?? 0,
    members: raw.members ?? 0,
    topCompanies: raw.topCompanies ?? [],
    topCities: raw.topCities ?? [],
    // La base renvoie la clé du domaine ; le libellé affiché reste côté
    // application, pour que la traduction ne vive pas dans deux endroits.
    topDomains: (raw.topDomains ?? []).map((d) => ({
      ...d,
      label: DOMAIN_LABELS[d.key as Domain] ?? d.key,
    })),
    byYear: raw.byYear ?? [],
  };
});

/** Profil du membre connecté, ou `null` (visiteur, ou mode démo sans session). */
export const getCurrentMember = cache(async (): Promise<Author | null> => {
  if (isDemoMode) return demoStore.currentMember;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  return data ? mapAuthor(data as Row) : null;
});

/* ------------------------------------------------------------------ */
/* Acceptation des politiques                                          */
/* ------------------------------------------------------------------ */

export interface PolicyAcceptance {
  /** Version acceptée, ou `null` si le membre n'a jamais accepté. */
  version: string | null;
  acceptedAt: string | null;
}

/**
 * Ce que le membre connecté a accepté.
 *
 * Lecture séparée du profil, et non un champ de plus sur `Author` : le
 * consentement n'est pas une donnée d'affichage, il ne doit jamais partir vers
 * le navigateur avec la liste des auteurs d'une page.
 */
export const getPolicyAcceptance = cache(
  async (memberId: string): Promise<PolicyAcceptance> => {
    if (isDemoMode) {
      return {
        version: demoStore.policyVersion,
        acceptedAt: demoStore.policyAcceptedAt,
      };
    }
    if (!UUID.test(memberId)) return { version: null, acceptedAt: null };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("policy_version,policy_accepted_at")
      .eq("id", memberId)
      .maybeSingle();

    if (error) throw dbFailure("repository.getPolicyAcceptance", error);
    const row = data as Row | null;
    return {
      version: (row?.policy_version as string | null) ?? null,
      acceptedAt: (row?.policy_accepted_at as string | null) ?? null,
    };
  },
);

/**
 * Enregistre l'acceptation : état courant **et** preuve datée, en une
 * opération (`accept_policy`, voir `supabase/migrations/0010_consent.sql`).
 * Deux requêtes depuis ici laisseraient, en cas d'échec de la seconde, un
 * accès débloqué sans trace — exactement ce que le RGPD demande de pouvoir
 * produire.
 */
export async function recordPolicyAcceptance(version: string): Promise<void> {
  if (isDemoMode) {
    demoStore.policyVersion = version;
    demoStore.policyAcceptedAt = new Date().toISOString();
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("accept_policy", { p_version: version });
  if (error) throw dbFailure("repository.recordPolicyAcceptance", error);
}

/* ------------------------------------------------------------------ */
/* Photo de profil                                                     */
/* ------------------------------------------------------------------ */

const AVATAR_BUCKET = "avatars";

/**
 * Version opaque de la photo d'un membre, ou `null` sans photo.
 *
 * Lue sous la RLS de `profiles` : un visiteur qui ne peut pas lire le profil
 * n'obtient pas non plus l'existence d'une photo.
 */
export const getProfilePhotoVersion = cache(
  async (memberId: string): Promise<string | null> => {
    if (isDemoMode) {
      const key = demoStore.photoKeys.get(memberId);
      return key ? photoVersion(key) : null;
    }
    if (!UUID.test(memberId)) return null;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw dbFailure("repository.photoVersion", error);
    const key = (data as Row | null)?.avatar_path;
    return typeof key === "string" ? photoVersion(key) : null;
  },
);

/** Octets WebP de la photo d'un membre. Mêmes droits que la lecture du profil. */
export async function readProfilePhoto(memberId: string): Promise<Uint8Array | null> {
  if (isDemoMode) {
    const key = demoStore.photoKeys.get(memberId);
    return key ? (demoStore.photoObjects.get(key) ?? null) : null;
  }
  if (!UUID.test(memberId)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", memberId)
    .maybeSingle();
  if (error) throw dbFailure("repository.readPhoto", error);
  const key = (data as Row | null)?.avatar_path;
  if (typeof key !== "string") return null;
  const file = await supabase.storage.from(AVATAR_BUCKET).download(key);
  if (file.error || !file.data) {
    reportDbError("repository.readPhoto.storage", file.error);
    return null;
  }
  return new Uint8Array(await file.data.arrayBuffer());
}

/**
 * Stockage de la photo pour le membre connecté.
 *
 * En production, chaque écriture part avec la session du membre : ce sont les
 * politiques de `storage.objects` et la contrainte sur `profiles.avatar_path`
 * qui garantissent qu'il n'écrit que dans son propre dossier.
 */
export async function profilePhotoStore(): Promise<PhotoStore> {
  if (isDemoMode) {
    return {
      currentKey: async (id) => demoStore.photoKeys.get(id) ?? null,
      putObject: async (key, webp) => {
        demoStore.photoObjects.set(key, webp);
      },
      setKey: async (id, key) => {
        if (key) demoStore.photoKeys.set(id, key);
        else demoStore.photoKeys.delete(id);
      },
      deleteObject: async (key) => {
        demoStore.photoObjects.delete(key);
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  return {
    currentKey: async (id) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", id)
        .maybeSingle();
      if (error) throw dbFailure("repository.photoKey", error);
      const key = (data as Row | null)?.avatar_path;
      return typeof key === "string" ? key : null;
    },
    putObject: async (key, webp) => {
      const { error } = await bucket.upload(key, webp, {
        contentType: "image/webp",
        upsert: false,
        cacheControl: "3600",
      });
      if (error) throw dbFailure("repository.photoUpload", error);
    },
    setKey: async (id, key) => {
      const { error, count } = await supabase
        .from("profiles")
        .update({ avatar_path: key }, { count: "exact" })
        .eq("id", id);
      if (error) throw dbFailure("repository.photoSetKey", error);
      if (count === 0) {
        logSecurityEvent("ownership.denied", { action: "profiles.avatar", member: id });
        throw new Error("Profil introuvable ou non modifiable");
      }
    },
    deleteObject: async (key) => {
      const { error } = await bucket.remove([key]);
      if (error) throw dbFailure("repository.photoDelete", error);
    },
  };
}

/** Fiche d'un membre, pour l'annuaire des personnes. */
export const getMemberById = cache(async (id: string): Promise<Author | null> => {
  if (isDemoMode) {
    return demoStore.members.find((m) => m.id === id) ?? null;
  }
  if (!UUID.test(id)) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw dbFailure("repository", error);
  return data ? mapAuthor(data as Row) : null;
});

/** Compétences déclarées par un membre (lisibles par le réseau). */
export const getProfileSkills = cache(async (id: string): Promise<string[]> => {
  if (isDemoMode) return demoStore.careerProfiles.get(id)?.skills ?? [];
  if (!UUID.test(id)) return [];

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profile_skills")
    .select("skill:skills(label)")
    .eq("profile_id", id);
  if (error) throw dbFailure("repository", error);
  return mapSkillLabels(data);
});

const EMPTY_CAREER: Omit<CareerProfile, "member"> = {
  targetDomain: null,
  targetRole: null,
  skills: [],
  targetCountries: [],
  targetCompanies: [],
};

/**
 * Préférences de carrière du membre connecté.
 *
 * Les pays et entreprises visés ne sont lisibles que par leur propriétaire
 * (RLS, migration 0008) : cette lecture n'a de sens que pour soi.
 */
export const getCareerProfile = cache(
  async (member: Author): Promise<CareerProfile> => {
    if (isDemoMode) {
      return { member, ...(demoStore.careerProfiles.get(member.id) ?? EMPTY_CAREER) };
    }

    const supabase = await createSupabaseServerClient();
    const [profile, skills, countries, companies] = await Promise.all([
      supabase
        .from("profiles")
        .select("target_domain,target_role")
        .eq("id", member.id)
        .maybeSingle(),
      getProfileSkills(member.id),
      supabase
        .from("profile_target_countries")
        .select("country_code")
        .eq("profile_id", member.id),
      supabase
        .from("profile_target_companies")
        .select("company:companies(slug)")
        .eq("profile_id", member.id),
    ]);
    for (const result of [profile, countries, companies]) {
      if (result.error) throw dbFailure("repository.careerProfile", result.error);
    }

    const row = (profile.data ?? {}) as Row;
    return {
      member,
      targetDomain: (row.target_domain as Domain | null) ?? null,
      targetRole: (row.target_role as string | null) ?? null,
      skills,
      targetCountries: ((countries.data ?? []) as Row[])
        .map((r) => String(r.country_code))
        .sort(),
      targetCompanies: ((companies.data ?? []) as Row[])
        .map((r) => firstRelation(r.company)?.slug)
        .filter((slug): slug is string => typeof slug === "string"),
    };
  },
);

export interface CareerProfileWrite {
  status: Author["status"];
  studyYear: StudyYear | null;
  openToMentoring: boolean | null;
  targetDomain: Domain | null;
  targetRole: string | null;
  skills: string[];
  targetCountries: string[];
  /** Identifiants d'entreprises existantes, déjà vérifiés par l'appelant. */
  targetCompanyIds: string[];
}

export async function updateCareerProfile(
  member: Author,
  input: CareerProfileWrite,
): Promise<void> {
  // Un alumni n'a pas d'année d'études ; la base refuse la combinaison.
  const studyYear = input.status === "student" ? input.studyYear : null;

  if (isDemoMode) {
    const slugs = input.targetCompanyIds
      .map((id) => demoCompanies().find((c) => c.id === id)?.slug)
      .filter((slug): slug is string => Boolean(slug));
    // Modification en place : les expériences du store référencent ce même
    // objet auteur, qui doit refléter le nouveau statut partout.
    Object.assign(member, {
      status: input.status,
      studyYear,
      openToMentoring: input.openToMentoring,
    });
    const stored = demoStore.members.find((m) => m.id === member.id);
    if (stored && stored !== member) Object.assign(stored, member);
    demoStore.careerProfiles.set(member.id, {
      targetDomain: input.targetDomain,
      targetRole: input.targetRole,
      skills: input.skills,
      targetCountries: input.targetCountries,
      targetCompanies: slugs,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      status: input.status,
      study_year: studyYear,
      open_to_mentoring: input.openToMentoring,
      target_domain: input.targetDomain,
      target_role: input.targetRole,
    })
    .eq("id", member.id);
  if (error) throw dbFailure("repository.careerProfile", error);

  const [skills, targets] = await Promise.all([
    supabase.rpc("set_profile_skills", { labels: input.skills }),
    supabase.rpc("set_profile_targets", {
      countries: input.targetCountries,
      company_ids: input.targetCompanyIds,
    }),
  ]);
  if (skills.error) throw dbFailure("repository.profileSkills", skills.error);
  if (targets.error) throw dbFailure("repository.profileTargets", targets.error);
}

/* ------------------------------------------------------------------ */
/* Écriture                                                            */
/* ------------------------------------------------------------------ */

export interface NewCompanyInput {
  name: string;
  website: string | null;
  /**
   * Optionnel : par défaut il est déduit du site web ci-dessus. Le champ existe
   * pour le cas où le domaine de marque diffère du site (une filiale servie
   * depuis le domaine du groupe).
   */
  domain?: string | null;
  industry: Industry;
  description: string | null;
  linkedinUrl: string | null;
  logoUrl: string | null;
  headquartersId: string | null;
}

/**
 * Crée une entreprise, ou renvoie celle qui existe déjà.
 *
 * Le rapprochement se fait sur le nom canonique : saisir « Microsoft Corp. »
 * quand « Microsoft » existe renvoie la fiche existante au lieu d'en créer une
 * seconde. C'est ce qui empêche le graphe de se fragmenter.
 */
export async function findOrCreateCompany(
  input: NewCompanyInput,
  authorId: string,
): Promise<{ company: Company; created: boolean }> {
  const normalized = normalizeCompanyName(input.name);
  /* Le domaine n'est jamais inventé : il sort du site web saisi, normalisé, ou
     il reste nul. Un domaine faux coûte un logo faux ; un domaine absent ne
     coûte qu'un monogramme. */
  const domain = input.domain ?? domainFromWebsite(input.website);

  if (isDemoMode) {
    const existing = demoCompanies().find(
      (c) => c.normalizedName === normalized,
    );
    if (existing) return { company: existing, created: false };

    const baseSlug = companySlug(input.name);
    const taken = new Set(demoCompanies().map((c) => c.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const company: Company = {
      id: `c-${slug}`,
      name: input.name,
      slug,
      normalizedName: normalized,
      website: input.website,
      domain,
      logoUrl: input.logoUrl,
      industry: input.industry,
      description: input.description,
      linkedinUrl: input.linkedinUrl,
      headquarters: input.headquartersId
        ? (PLACES_BY_ID.get(input.headquartersId) ?? null)
        : null,
    };
    demoStore.companies.push(company);
    return { company, created: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("normalized_name", normalized)
    .maybeSingle();
  if (existing) return { company: mapCompany(existing as Row), created: false };

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: input.name,
      slug: companySlug(input.name),
      normalized_name: normalized,
      website: input.website,
      domain,
      logo_url: input.logoUrl,
      industry: input.industry,
      description: input.description,
      linkedin_url: input.linkedinUrl,
      headquarters_id: input.headquartersId,
      created_by: authorId,
    })
    .select(COMPANY_COLUMNS)
    .single();

  if (error) throw dbFailure("repository", error);
  return { company: mapCompany(data as Row), created: true };
}

export interface ContactWrite {
  companyId: string;
  placeId: string;
  domain: Contact["domain"];
  firstName: string;
  lastName: string | null;
  position: string;
  linkedinUrl: string | null;
  notes: string | null;
}

export async function createContact(
  input: ContactWrite,
  author: Author,
): Promise<Contact> {
  if (isDemoMode) {
    const company = demoCompanies().find((c) => c.id === input.companyId);
    const place = PLACES_BY_ID.get(input.placeId);
    if (!company) throw new Error("Entreprise inconnue");
    if (!place) throw new Error("Ville inconnue");

    const contact: Contact = {
      id: `k-${crypto.randomUUID()}`,
      author,
      company,
      place,
      domain: input.domain,
      firstName: input.firstName,
      lastName: input.lastName,
      position: input.position,
      linkedinUrl: input.linkedinUrl,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    demoStore.contacts.push(contact);
    return contact;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      author_id: author.id,
      company_id: input.companyId,
      place_id: input.placeId,
      domain: input.domain,
      first_name: input.firstName,
      last_name: input.lastName,
      position: input.position,
      linkedin_url: input.linkedinUrl,
      notes: input.notes,
    })
    .select(CONTACT_SELECT)
    .single();

  if (error) throw dbFailure("repository", error);
  return mapContact(data as Row);
}

export async function updateContact(
  id: string,
  input: ContactWrite,
  member: Author,
): Promise<void> {
  if (isDemoMode) {
    const contact = demoStore.contacts.find((c) => c.id === id);
    if (!contact) throw new Error("Contact introuvable ou non modifiable");
    if (contact.author.id !== member.id) throw new Error("Contact d'un autre membre");

    const company = demoCompanies().find((c) => c.id === input.companyId);
    const place = PLACES_BY_ID.get(input.placeId);
    if (!company) throw new Error("Entreprise inconnue");
    if (!place) throw new Error("Ville inconnue");

    Object.assign(contact, {
      company,
      place,
      domain: input.domain,
      firstName: input.firstName,
      lastName: input.lastName,
      position: input.position,
      linkedinUrl: input.linkedinUrl,
      notes: input.notes,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  // La RLS refuse déjà la ligne d'un autre membre ; le filtre explicite évite
  // une mise à jour silencieusement vide et permet de le signaler.
  const { error, count } = await supabase
    .from("contacts")
    .update(
      {
        company_id: input.companyId,
        place_id: input.placeId,
        domain: input.domain,
        first_name: input.firstName,
        last_name: input.lastName,
        position: input.position,
        linkedin_url: input.linkedinUrl,
        notes: input.notes,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("author_id", member.id);

  if (error) throw dbFailure("repository", error);
  if (count === 0) {
    logSecurityEvent("ownership.denied", { action: "contacts.update", member: member.id });
    throw new Error("Contact introuvable ou non modifiable");
  }
}

export async function deleteContact(id: string, member: Author): Promise<void> {
  if (isDemoMode) {
    const index = demoStore.contacts.findIndex(
      (c) => c.id === id && c.author.id === member.id,
    );
    if (index === -1) throw new Error("Contact introuvable ou non supprimable");
    demoStore.contacts.splice(index, 1);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("contacts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("author_id", member.id);

  if (error) throw dbFailure("repository", error);
  if (count === 0) {
    logSecurityEvent("ownership.denied", { action: "contacts.delete", member: member.id });
    throw new Error("Contact introuvable ou non supprimable");
  }
}

export interface ExperienceWrite {
  companyId: string;
  placeId: string;
  domain: Experience["domain"];
  kind: Experience["kind"];
  year: number;
  title: string;
  summary: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean | null;
  skills: string[];
}

function experienceColumns(input: ExperienceWrite) {
  return {
    company_id: input.companyId,
    place_id: input.placeId,
    domain: input.domain,
    kind: input.kind,
    year: input.year,
    title: input.title,
    summary: input.summary,
    start_date: input.startDate,
    end_date: input.endDate,
    is_current: input.isCurrent,
  };
}

export async function createExperience(
  input: ExperienceWrite,
  author: Author,
): Promise<void> {
  if (isDemoMode) {
    const company = demoCompanies().find((c) => c.id === input.companyId);
    const place = PLACES_BY_ID.get(input.placeId);
    if (!company) throw new Error("Entreprise inconnue");
    if (!place) throw new Error("Ville inconnue");

    demoStore.experiences.push({
      id: `e-${crypto.randomUUID()}`,
      author,
      company,
      place,
      domain: input.domain,
      kind: input.kind,
      year: input.year,
      title: input.title,
      summary: input.summary,
      createdAt: new Date().toISOString(),
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent,
      skills: input.skills,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("experiences")
    .insert({ author_id: author.id, ...experienceColumns(input) })
    .select("id")
    .single();
  if (error) throw dbFailure("repository", error);

  if (input.skills.length > 0) {
    const { error: skillsError } = await supabase.rpc("set_experience_skills", {
      experience: (data as Row).id,
      labels: input.skills,
    });
    if (skillsError) throw dbFailure("repository.experienceSkills", skillsError);
  }
}

export async function updateExperience(
  id: string,
  input: ExperienceWrite,
  member: Author,
): Promise<void> {
  if (isDemoMode) {
    const experience = demoStore.experiences.find((e) => e.id === id);
    if (!experience) throw new Error("Expérience introuvable");
    if (experience.author.id !== member.id) {
      throw new Error("Expérience d'un autre membre");
    }

    const company = demoCompanies().find((c) => c.id === input.companyId);
    const place = PLACES_BY_ID.get(input.placeId);
    if (!company) throw new Error("Entreprise inconnue");
    if (!place) throw new Error("Ville inconnue");

    Object.assign(experience, {
      company,
      place,
      domain: input.domain,
      kind: input.kind,
      year: input.year,
      title: input.title,
      summary: input.summary,
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent,
      skills: input.skills,
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("experiences")
    .update(experienceColumns(input), { count: "exact" })
    .eq("id", id)
    .eq("author_id", member.id);

  if (error) throw dbFailure("repository", error);
  if (count === 0) {
    logSecurityEvent("ownership.denied", { action: "experiences.update", member: member.id });
    throw new Error("Expérience introuvable ou non modifiable");
  }

  const { error: skillsError } = await supabase.rpc("set_experience_skills", {
    experience: id,
    labels: input.skills,
  });
  if (skillsError) throw dbFailure("repository.experienceSkills", skillsError);
}

export async function deleteExperience(id: string, member: Author): Promise<void> {
  if (isDemoMode) {
    const index = demoStore.experiences.findIndex(
      (e) => e.id === id && e.author.id === member.id,
    );
    if (index === -1) throw new Error("Expérience introuvable ou non supprimable");
    demoStore.experiences.splice(index, 1);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("experiences")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("author_id", member.id);

  if (error) throw dbFailure("repository", error);
  if (count === 0) {
    logSecurityEvent("ownership.denied", { action: "experiences.delete", member: member.id });
    throw new Error("Expérience introuvable ou non supprimable");
  }
}
