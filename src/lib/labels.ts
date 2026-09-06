import type {
  Campus,
  Industry,
  Continent,
  Domain,
  ExperienceKind,
  MemberStatus,
} from "./types";

export const DOMAIN_LABELS: Record<Domain, string> = {
  cybersecurity: "Cybersecurity",
  ai_ml: "AI / Machine Learning",
  software_engineering: "Software Engineering",
  data: "Data",
  cloud_devops: "Cloud & DevOps",
  networks: "Réseaux & Télécoms",
  embedded: "Embarqué & IoT",
  product_design: "Product & UX",
  other: "Autre",
};

/**
 * Indicateurs de domaine — teintes désaturées, luminosité homogène.
 * Elles servent de repère secondaire (un point de 6px), jamais de décor :
 * l'accent de la marque reste la seule couleur forte de l'interface.
 */
export const DOMAIN_COLORS: Record<Domain, string> = {
  cybersecurity: "#b8695e",
  ai_ml: "#8478b0",
  software_engineering: "#5a8bb0",
  data: "#b09a5a",
  cloud_devops: "#5aa08c",
  networks: "#6b83b5",
  embedded: "#b08461",
  product_design: "#ab6f92",
  other: "#78838f",
};

export const EXPERIENCE_KIND_LABELS: Record<ExperienceKind, string> = {
  pfa: "PFA",
  pfe: "PFE",
  internship: "Stage",
  apprenticeship: "Alternance",
  job: "Emploi",
  research: "Recherche",
};

export const CAMPUS_LABELS: Record<Campus, string> = {
  rabat: "Rabat",
  benguerir: "Benguerir",
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  student: "Student",
  alumni: "Alumni",
};

export const CONTINENT_LABELS: Record<Continent, string> = {
  africa: "Afrique",
  europe: "Europe",
  north_america: "Amérique du Nord",
  south_america: "Amérique du Sud",
  asia: "Asie",
  oceania: "Océanie",
};

export const DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[];
export const EXPERIENCE_KINDS = Object.keys(
  EXPERIENCE_KIND_LABELS,
) as ExperienceKind[];
export const CAMPUSES = Object.keys(CAMPUS_LABELS) as Campus[];
export const MEMBER_STATUSES = Object.keys(STATUS_LABELS) as MemberStatus[];
export const CONTINENTS = Object.keys(CONTINENT_LABELS) as Continent[];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  software: "Logiciel & Cloud",
  consulting: "Conseil & ESN",
  finance: "Finance & Assurance",
  telecom: "Télécoms",
  industry: "Industrie & Aéronautique",
  energy: "Énergie",
  public: "Secteur public",
  research: "Recherche",
  other: "Autre",
};

export const INDUSTRIES = Object.keys(INDUSTRY_LABELS) as Industry[];
