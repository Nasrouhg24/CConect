import "server-only";

import { COMPANIES, CONTACTS, EXPERIENCES, JOB_OFFERS } from "./data/seed";
import { PLACES, PLACES_BY_ID } from "./data/places";
import { companySlug, normalizeCompanyName } from "./company-name";
import { contactToEntry, experienceToEntry } from "./entries";
import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./supabase/server";
import { demoStore } from "./demo-store";
import type {
  Author,
  Company,
  Contact,
  Entry,
  Experience,
  Industry,
  JobOffer,
  Place,
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
 */

export const isDemoMode = !isSupabaseConfigured;

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
  };
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

function mapJobOffer(row: Row): JobOffer {
  return {
    id: String(row.id),
    company: mapCompany(firstRelation(row.company)),
    place: mapPlace(firstRelation(row.place)),
    postedBy: mapAuthor(firstRelation(row.posted_by)),
    title: String(row.title),
    domain: row.domain as JobOffer["domain"],
    kind: row.kind as JobOffer["kind"],
    durationMonths: (row.duration_months as number | null) ?? null,
    description: (row.description as string | null) ?? null,
    technologies: Array.isArray(row.technologies)
      ? (row.technologies as string[])
      : [],
    url: (row.url as string | null) ?? null,
    publishedAt: String(row.published_at),
    expiresAt: (row.expires_at as string | null) ?? null,
  };
}

const COMPANY_SELECT =
  "company:companies(id,name,slug,normalized_name,website,logo_url,industry,description,linkedin_url)";
const PLACE_SELECT =
  "place:places(id,city,country_code,country_name,continent,lat,lng)";
const AUTHOR_SELECT =
  "author:profiles(id,full_name,campus,status,promotion,linkedin_url,contact_email)";
const POSTER_SELECT =
  "posted_by:profiles(id,full_name,campus,status,promotion,linkedin_url,contact_email)";
const COMPANY_COLUMNS =
  "id,name,slug,normalized_name,website,logo_url,industry,description,linkedin_url";

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

function demoCompanies(): Company[] {
  return [...COMPANIES, ...demoStore.companies];
}

export async function getEntries(): Promise<Entry[]> {
  if (isDemoMode) {
    return [
      ...[...EXPERIENCES, ...demoStore.experiences].map(experienceToEntry),
      ...[...CONTACTS, ...demoStore.contacts].map(contactToEntry),
    ].sort((a, b) => b.year - a.year);
  }

  const supabase = await createSupabaseServerClient();
  const [experiences, contacts] = await Promise.all([
    supabase
      .from("experiences")
      .select(
        `id,domain,kind,year,title,summary,created_at,${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`,
      )
      .order("year", { ascending: false }),
    supabase
      .from("contacts")
      .select(
        `id,domain,first_name,last_name,position,linkedin_url,notes,created_at,${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`,
      )
      .order("created_at", { ascending: false }),
  ]);

  if (experiences.error) throw new Error(experiences.error.message);
  if (contacts.error) throw new Error(contacts.error.message);

  return [
    ...(experiences.data ?? []).map((r) => experienceToEntry(mapExperience(r as Row))),
    ...(contacts.data ?? []).map((r) => contactToEntry(mapContact(r as Row))),
  ].sort((a, b) => b.year - a.year);
}

export async function getCompanies(): Promise<Company[]> {
  if (isDemoMode) {
    return demoCompanies().sort((a, b) => a.name.localeCompare(b.name));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapCompany(r as Row));
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (isDemoMode) {
    return demoCompanies().find((c) => c.slug === slug) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCompany(data as Row) : null;
}

export async function getPlaces(): Promise<Place[]> {
  if (isDemoMode) {
    return [...PLACES].sort((a, b) => a.city.localeCompare(b.city));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("places")
    .select("id,city,country_code,country_name,continent,lat,lng")
    .order("city");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapPlace(r as Row));
}

export async function getJobOffers(): Promise<JobOffer[]> {
  if (isDemoMode) {
    return [...JOB_OFFERS, ...demoStore.offers].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("job_offers")
    .select(
      `id,title,domain,kind,duration_months,description,technologies,url,published_at,expires_at,${COMPANY_SELECT},${PLACE_SELECT},${POSTER_SELECT}`,
    )
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapJobOffer(r as Row));
}

export async function getJobOffer(id: string): Promise<JobOffer | null> {
  const offers = await getJobOffers();
  return offers.find((o) => o.id === id) ?? null;
}

/** Contacts rattachés à une entreprise — la relation Entreprise → Contacts. */
export async function getContacts(): Promise<Contact[]> {
  if (isDemoMode) {
    return [...CONTACTS, ...demoStore.contacts];
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      `id,domain,first_name,last_name,position,linkedin_url,notes,created_at,${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapContact(r as Row));
}

/** Tout ce qu'il faut pour la fiche entreprise, en une passe. */
export interface CompanyBundle {
  company: Company;
  offers: JobOffer[];
  contacts: Contact[];
  experiences: Entry[];
}

export async function getCompanyBundle(
  slug: string,
): Promise<CompanyBundle | null> {
  const company = await getCompanyBySlug(slug);
  if (!company) return null;

  const [offers, contacts, entries] = await Promise.all([
    getJobOffers(),
    getContacts(),
    getEntries(),
  ]);

  return {
    company,
    offers: offers.filter((o) => o.company.slug === slug),
    contacts: contacts.filter((c) => c.company.slug === slug),
    experiences: entries.filter(
      (e) => e.company.slug === slug && e.entryKind === "experience",
    ),
  };
}

/** Profil du membre connecté, ou `null` (visiteur, ou mode démo sans session). */
export async function getCurrentMember(): Promise<Author | null> {
  if (isDemoMode) return demoStore.currentMember;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,campus,status,promotion,linkedin_url,contact_email")
    .eq("id", user.id)
    .maybeSingle();

  return data ? mapAuthor(data as Row) : null;
}

/* ------------------------------------------------------------------ */
/* Écriture                                                            */
/* ------------------------------------------------------------------ */

export interface NewCompanyInput {
  name: string;
  website: string | null;
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
      logo_url: input.logoUrl,
      industry: input.industry,
      description: input.description,
      linkedin_url: input.linkedinUrl,
      headquarters_id: input.headquartersId,
      created_by: authorId,
    })
    .select(COMPANY_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
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
    .select(
      `id,domain,first_name,last_name,position,linkedin_url,notes,created_at,${COMPANY_SELECT},${PLACE_SELECT},${AUTHOR_SELECT}`,
    )
    .single();

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Contact introuvable ou non modifiable");
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

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Contact introuvable ou non supprimable");
}

export interface OfferWrite {
  companyId: string;
  placeId: string;
  title: string;
  domain: JobOffer["domain"];
  kind: JobOffer["kind"];
  durationMonths: number | null;
  description: string | null;
  technologies: string[];
  url: string | null;
}

export async function createJobOffer(
  input: OfferWrite,
  author: Author,
): Promise<JobOffer> {
  if (isDemoMode) {
    const company = demoCompanies().find((c) => c.id === input.companyId);
    const place = PLACES_BY_ID.get(input.placeId);
    if (!company) throw new Error("Entreprise inconnue");
    if (!place) throw new Error("Ville inconnue");

    const offer: JobOffer = {
      id: `o-${crypto.randomUUID()}`,
      company,
      place,
      postedBy: author,
      title: input.title,
      domain: input.domain,
      kind: input.kind,
      durationMonths: input.durationMonths,
      description: input.description,
      technologies: input.technologies,
      url: input.url,
      publishedAt: new Date().toISOString(),
      expiresAt: null,
    };
    demoStore.offers.push(offer);
    return offer;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("job_offers")
    .insert({
      company_id: input.companyId,
      place_id: input.placeId,
      posted_by_id: author.id,
      title: input.title,
      domain: input.domain,
      kind: input.kind,
      duration_months: input.durationMonths,
      description: input.description,
      technologies: input.technologies,
      url: input.url,
    })
    .select(
      `id,title,domain,kind,duration_months,description,technologies,url,published_at,expires_at,${COMPANY_SELECT},${PLACE_SELECT},${POSTER_SELECT}`,
    )
    .single();

  if (error) throw new Error(error.message);
  return mapJobOffer(data as Row);
}

export async function createExperience(
  input: {
    companyId: string;
    placeId: string;
    domain: Experience["domain"];
    kind: Experience["kind"];
    year: number;
    title: string;
    summary: string | null;
  },
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
    });
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("experiences").insert({
    author_id: author.id,
    company_id: input.companyId,
    place_id: input.placeId,
    domain: input.domain,
    kind: input.kind,
    year: input.year,
    title: input.title,
    summary: input.summary,
  });
  if (error) throw new Error(error.message);
}
