/**
 * Modèle de domaine de CConnect.
 *
 * Le graphe est : Entreprise → Contacts, plus les expériences vécues par les
 * membres. Un contact ne porte jamais un nom d'entreprise en texte libre : il
 * référence une `Company` par son identifiant.
 *
 * Règle non négociable, appliquée jusque dans le schéma SQL :
 * aucun champ ne stocke l'email ou le téléphone d'un contact externe.
 * Un contact expose un nom, un poste, une entreprise, un lieu et un lien
 * LinkedIn public — la mise en relation passe toujours par le membre
 * qui l'a ajouté.
 */

export type Campus = "rabat" | "benguerir";
export type MemberStatus = "student" | "alumni";

/**
 * Année d'études d'un étudiant. Elle fixe l'objectif de stage : 3e et 4e année
 * cherchent un PFA, la dernière année un PFE. Un alumni n'en a pas.
 */
export type StudyYear = "third" | "fourth" | "final";
export type MemberRole = "member" | "moderator" | "admin";

export type Domain =
  | "cybersecurity"
  | "ai_ml"
  | "software_engineering"
  | "data"
  | "cloud_devops"
  | "networks"
  | "embedded"
  | "product_design"
  | "other";

export type ExperienceKind =
  | "pfa"
  | "pfe"
  | "internship"
  | "apprenticeship"
  | "job"
  | "research";

export type Continent =
  | "africa"
  | "europe"
  | "north_america"
  | "south_america"
  | "asia"
  | "oceania";

/** Secteur d'activité d'une entreprise. Liste courte et stable. */
export type Industry =
  | "software"
  | "consulting"
  | "finance"
  | "telecom"
  | "industry"
  | "energy"
  | "public"
  | "research"
  | "other";

export interface Place {
  id: string;
  city: string;
  countryCode: string; // ISO 3166-1 alpha-2
  countryName: string;
  continent: Continent;
  lat: number;
  lng: number;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  /**
   * Nom réduit à sa forme canonique (minuscules, sans accent, sans suffixe
   * juridique). Sert à empêcher « Microsoft », « Microsoft Corp. » et
   * « Microsoft Corporation » de devenir trois entreprises distinctes.
   */
  normalizedName: string;
  website: string | null;
  /**
   * Domaine canonique (`microsoft.com`), déduit du site web à l'écriture.
   * C'est la clé du logo : voir `src/lib/logo-provider.ts`. `null` quand aucun
   * site n'est connu — la fiche affiche alors son monogramme.
   */
  domain: string | null;
  /**
   * URL d'un logo saisie à la main. Prioritaire sur le fournisseur, pour le cas
   * où une entreprise a un logo que le domaine ne donne pas.
   */
  logoUrl: string | null;
  industry: Industry;
  description: string | null;
  linkedinUrl: string | null;
  /** Siège ou principale implantation connue du réseau. */
  headquarters: Place | null;
}

/** Auteur d'une contribution, tel qu'exposé aux autres membres. */
export interface Author {
  id: string;
  fullName: string;
  campus: Campus;
  status: MemberStatus;
  promotion: number;
  /** Profil LinkedIn public du membre — sert à l'identifier, pas à le joindre. */
  linkedinUrl: string | null;
  /** Email institutionnel, renseigné volontairement pour être contacté. */
  contactEmail: string | null;
  /** `null` pour un alumni, ou tant que l'étudiant ne l'a pas renseignée. */
  studyYear: StudyYear | null;
  /** Consentement explicite au mentorat. `null` = non renseigné. */
  openToMentoring: boolean | null;
}

/**
 * Ce que le membre dit de lui-même pour orienter le conseiller. Tout est
 * facultatif : un champ vide reste vide, il n'est jamais déduit.
 */
export interface CareerProfile {
  member: Author;
  targetDomain: Domain | null;
  targetRole: string | null;
  skills: string[];
  /** Codes ISO alpha-2. */
  targetCountries: string[];
  /** Slugs d'entreprises. */
  targetCompanies: string[];
}

export interface Experience {
  id: string;
  author: Author;
  company: Company;
  place: Place;
  domain: Domain;
  kind: ExperienceKind;
  year: number;
  title: string;
  summary: string | null;
  createdAt: string;
  /** Date ISO (`YYYY-MM-DD`). `null` quand seule l'année est connue. */
  startDate: string | null;
  endDate: string | null;
  /** En poste aujourd'hui : `true` ; terminé : `false` ; non renseigné : `null`. */
  isCurrent: boolean | null;
  skills: string[];
}

/**
 * Contact professionnel connu d'un membre.
 * Rattaché à une entreprise existante — jamais à un nom saisi à la main.
 */
export interface Contact {
  id: string;
  author: Author;
  company: Company;
  place: Place;
  domain: Domain;
  firstName: string;
  /** Souvent une initiale : on n'exige pas le nom complet. */
  lastName: string | null;
  position: string;
  linkedinUrl: string | null;
  /** Comment l'auteur connaît cette personne — visible par les membres. */
  notes: string | null;
  createdAt: string;
}

export type EntryKind = "experience" | "contact";

/** Vue unifiée carte + liste : une expérience ou un contact. */
export interface Entry {
  id: string;
  entryKind: EntryKind;
  company: Company;
  place: Place;
  domain: Domain;
  year: number;
  author: Author;
  /** Titre du poste (expérience) ou poste du contact. */
  headline: string;
  detail: string | null;
  experienceKind: ExperienceKind | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactLinkedinUrl: string | null;
  /** Propres aux expériences ; vides pour un contact. */
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean | null;
  skills: string[];
}

export interface Filters {
  q: string;
  continent: Continent | null;
  country: string | null;
  city: string | null;
  company: string | null;
  domain: Domain | null;
  campus: Campus | null;
  status: MemberStatus | null;
  year: number | null;
  experienceKind: ExperienceKind | null;
  entryKind: EntryKind | null;
}

export const EMPTY_FILTERS: Filters = {
  q: "",
  continent: null,
  country: null,
  city: null,
  company: null,
  domain: null,
  campus: null,
  status: null,
  year: null,
  experienceKind: null,
  entryKind: null,
};

/** Nom affichable d'un contact, tolérant à l'absence de nom de famille. */
export function contactDisplayName(
  firstName: string,
  lastName: string | null,
): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}
