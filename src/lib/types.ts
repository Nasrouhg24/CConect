/**
 * Modèle de domaine de CConnect.
 *
 * Le graphe est : Entreprise → Offres → Contacts, plus les expériences vécues
 * par les membres. Une offre ou un contact ne porte jamais un nom d'entreprise
 * en texte libre : ils référencent une `Company` par son identifiant.
 *
 * Règle non négociable, appliquée jusque dans le schéma SQL :
 * aucun champ ne stocke l'email ou le téléphone d'un contact externe.
 * Un contact expose un nom, un poste, une entreprise, un lieu et un lien
 * LinkedIn public — la mise en relation passe toujours par le membre
 * qui l'a ajouté.
 */

export type Campus = "rabat" | "benguerir";
export type MemberStatus = "student" | "alumni";
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
  /** URL d'un logo. Vide dans la plupart des cas : on affiche un monogramme. */
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

/** Offre de stage ou d'emploi partagée par un membre. */
export interface JobOffer {
  id: string;
  company: Company;
  place: Place;
  postedBy: Author;
  title: string;
  domain: Domain;
  kind: ExperienceKind;
  /** Durée en mois. `null` pour un poste permanent. */
  durationMonths: number | null;
  description: string | null;
  technologies: string[];
  /** Lien vers l'annonce d'origine. */
  url: string | null;
  publishedAt: string;
  /** Date au-delà de laquelle l'offre n'est plus proposée. */
  expiresAt: string | null;
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
