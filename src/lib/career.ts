import { EXPERIENCE_KIND_LABELS, STATUS_LABELS } from "./labels";
import type { Author, Domain, Entry, ExperienceKind, MemberStatus } from "./types";

/**
 * Relations de carrière Personne → Entreprise.
 *
 * Une expérience est une relation, pas un profil : un même membre peut avoir
 * un PFA en 2024, un PFE en 2025 et un emploi en 2026 dans la même entreprise.
 * Tout ce qui suit travaille donc sur des lignes d'expérience, et ne compte
 * des *personnes* qu'au moment de résumer (ensembles d'identifiants).
 *
 * Rien n'est déduit au-delà de la donnée : un emploi sans `isCurrent` ni date
 * de fin est « statut non renseigné », jamais « actuel ».
 */

export type EmploymentStatus = "current" | "former" | "unknown";

const INTERNSHIP_KINDS: ReadonlySet<ExperienceKind> = new Set(["pfa", "pfe", "internship"]);
const EMPLOYMENT_KINDS: ReadonlySet<ExperienceKind> = new Set(["job", "apprenticeship"]);

export function isExperience(entry: Entry): boolean {
  return entry.entryKind === "experience" && entry.experienceKind !== null;
}

export function isInternship(entry: Entry): boolean {
  return entry.experienceKind !== null && INTERNSHIP_KINDS.has(entry.experienceKind);
}

export function isEmployment(entry: Entry): boolean {
  return entry.experienceKind !== null && EMPLOYMENT_KINDS.has(entry.experienceKind);
}

/**
 * Statut d'un emploi. Une date de fin renseignée suffit à dire « terminé » :
 * c'est une donnée, pas une supposition. L'absence de date de fin, elle, ne
 * dit rien — beaucoup de membres ne la saisissent simplement pas.
 */
export function employmentStatus(entry: Entry): EmploymentStatus {
  if (entry.isCurrent === true) return "current";
  if (entry.isCurrent === false || entry.endDate) return "former";
  return "unknown";
}

/** Libellé de la relation, tel qu'on l'affiche à côté d'un nom d'entreprise. */
export function relationLabel(entry: Entry): string {
  if (!entry.experienceKind) return "Contact";
  if (isEmployment(entry)) {
    const status = employmentStatus(entry);
    const base = EXPERIENCE_KIND_LABELS[entry.experienceKind];
    if (status === "current") return `${base} · en poste`;
    if (status === "former") return `${base} · ancien poste`;
    return `${base} · statut non renseigné`;
  }
  if (entry.isCurrent === true) return `${EXPERIENCE_KIND_LABELS[entry.experienceKind]} · en cours`;
  return EXPERIENCE_KIND_LABELS[entry.experienceKind];
}

const MONTHS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function monthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  const m = Number(month);
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${year}` : year;
}

/** « mars 2026 → aujourd'hui », « 2024 → 2025 », ou l'année seule. */
export function periodLabel(entry: Entry): string {
  const start = entry.startDate ? monthLabel(entry.startDate) : String(entry.year);
  if (entry.isCurrent === true) return `${start} → aujourd'hui`;
  if (entry.endDate) return `${start} → ${monthLabel(entry.endDate)}`;
  return start;
}

/**
 * Ordre d'une frise. À année égale sans date précise, l'ordre académique fait
 * foi : un PFA précède un PFE, qui précède un emploi.
 */
const KIND_ORDER: Record<ExperienceKind, number> = {
  pfa: 0,
  internship: 1,
  research: 2,
  pfe: 3,
  apprenticeship: 4,
  job: 5,
};

function sortKey(entry: Entry): string {
  const date = entry.startDate ?? `${entry.year}-00-00`;
  const kind = entry.experienceKind ? KIND_ORDER[entry.experienceKind] : 9;
  return `${date}#${kind}`;
}

export function chronological(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/* ------------------------------------------------------------------ */
/* Personnes                                                           */
/* ------------------------------------------------------------------ */

export interface Person {
  author: Author;
  /** Toutes ses expériences, dans l'ordre chronologique. */
  records: Entry[];
}

/** Regroupe les expériences par membre. Les contacts externes n'en font pas partie. */
export function groupPeople(entries: Entry[]): Person[] {
  const byAuthor = new Map<string, Person>();
  for (const entry of entries) {
    if (!isExperience(entry)) continue;
    const person = byAuthor.get(entry.author.id);
    if (person) person.records.push(entry);
    else byAuthor.set(entry.author.id, { author: entry.author, records: [entry] });
  }
  for (const person of byAuthor.values()) person.records = chronological(person.records);
  return [...byAuthor.values()];
}

/** Filtres de relation proposés dans l'annuaire des personnes. */
export type RelationFilter =
  | "current"
  | "former"
  | "employment"
  | "internship"
  | "pfa"
  | "pfe";

export const RELATION_FILTER_LABELS: Record<RelationFilter, string> = {
  current: "En poste",
  former: "Ancien poste",
  employment: "Emploi",
  internship: "Stage (PFA, PFE, autre)",
  pfa: "PFA",
  pfe: "PFE",
};

export const RELATION_FILTERS = Object.keys(RELATION_FILTER_LABELS) as RelationFilter[];

export function matchesRelation(entry: Entry, relation: RelationFilter): boolean {
  switch (relation) {
    case "current":
      return isEmployment(entry) && employmentStatus(entry) === "current";
    case "former":
      return isEmployment(entry) && employmentStatus(entry) === "former";
    case "employment":
      return isEmployment(entry);
    case "internship":
      return isInternship(entry);
    case "pfa":
      return entry.experienceKind === "pfa";
    case "pfe":
      return entry.experienceKind === "pfe";
  }
}

export interface PeopleQuery {
  company?: string | null;
  domain?: Domain | null;
  relation?: RelationFilter | null;
  status?: MemberStatus | null;
  country?: string | null;
}

export interface PersonMatch extends Person {
  /** Les expériences qui justifient sa présence dans le résultat. */
  matches: Entry[];
}

/**
 * Une personne apparaît si **une même expérience** satisfait tous les critères
 * de relation. « En poste · Cybersecurity · Orange » ne doit pas remonter
 * quelqu'un en poste ailleurs qui a fait un stage cyber chez Orange.
 */
export function findPeople(entries: Entry[], query: PeopleQuery): PersonMatch[] {
  const out: PersonMatch[] = [];
  for (const person of groupPeople(entries)) {
    if (query.status && person.author.status !== query.status) continue;
    const matches = person.records.filter(
      (e) =>
        (!query.company || e.company.slug === query.company) &&
        (!query.domain || e.domain === query.domain) &&
        (!query.country || e.place.countryCode === query.country) &&
        (!query.relation || matchesRelation(e, query.relation)),
    );
    if (matches.length > 0) out.push({ ...person, matches });
  }
  return out.sort(
    (a, b) =>
      relationRank(b.matches) - relationRank(a.matches) ||
      a.author.fullName.localeCompare(b.author.fullName),
  );
}

/**
 * Ordre d'affichage explicable, pas un score : en poste, puis ancien poste,
 * puis PFE, PFA, autre stage. C'est la proximité *actuelle* avec l'entreprise.
 */
export type ConnectionStrength =
  | "current"
  | "former"
  | "employment"
  | "pfe"
  | "pfa"
  | "internship"
  | "other";

export function strongestRelation(records: Entry[]): ConnectionStrength {
  if (records.some((e) => isEmployment(e) && employmentStatus(e) === "current")) return "current";
  if (records.some((e) => isEmployment(e) && employmentStatus(e) === "former")) return "former";
  // Un emploi dont le statut manque reste un emploi : il passe avant un stage,
  // sans jamais être présenté comme actuel.
  if (records.some(isEmployment)) return "employment";
  if (records.some((e) => e.experienceKind === "pfe")) return "pfe";
  if (records.some((e) => e.experienceKind === "pfa")) return "pfa";
  if (records.some(isInternship)) return "internship";
  return "other";
}

const STRENGTH_RANK: Record<ConnectionStrength, number> = {
  current: 6,
  former: 5,
  employment: 4,
  pfe: 3,
  pfa: 2,
  internship: 1,
  other: 0,
};

function relationRank(records: Entry[]): number {
  return STRENGTH_RANK[strongestRelation(records)];
}

export function compareStrength(a: ConnectionStrength, b: ConnectionStrength): number {
  return STRENGTH_RANK[b] - STRENGTH_RANK[a];
}

/**
 * La phrase qui explique un lien, à partir de l'expérience la plus forte.
 * « Alumni 2022 · SOC Analyst chez Orange Cyberdefense, en poste depuis 2026 ».
 */
export function describeConnection(author: Author, records: Entry[]): string {
  const strength = strongestRelation(records);
  const pick =
    chronological(records)
      .reverse()
      .find((e) => {
        if (strength === "current" || strength === "former") {
          return isEmployment(e) && employmentStatus(e) === strength;
        }
        if (strength === "employment") return isEmployment(e);
        if (strength === "pfe" || strength === "pfa") return e.experienceKind === strength;
        return true;
      }) ?? records[0];

  const who = `${STATUS_LABELS[author.status]} ${author.promotion}`;
  const at = `${pick.headline} chez ${pick.company.name}`;
  switch (strength) {
    case "current":
      return `${who} · ${at}, en poste depuis ${pick.startDate ? periodLabel(pick).split(" →")[0] : pick.year}`;
    case "former":
      return `${who} · ancien ${at} (${periodLabel(pick)})`;
    case "pfe":
    case "pfa":
      return `${who} · ${EXPERIENCE_KIND_LABELS[strength]} chez ${pick.company.name} en ${pick.year}`;
    default:
      return `${who} · ${relationLabel(pick)} chez ${pick.company.name} en ${pick.year}`;
  }
}

/* ------------------------------------------------------------------ */
/* Connexions d'une entreprise                                         */
/* ------------------------------------------------------------------ */

export interface ConnectionCounts {
  /** Membres distincts ayant au moins une relation avec l'entreprise. */
  people: number;
  alumni: number;
  current: number;
  former: number;
  /** Emplois dont le statut n'est pas renseigné — affichés comme tels. */
  employmentUnknown: number;
  internships: number;
  pfa: number;
  pfe: number;
}

/**
 * Compte des **personnes**, pas des lignes : deux PFE du même membre ne font
 * qu'un « membre passé en PFE ». Chaque compteur est indépendant — quelqu'un
 * qui a fait son PFE puis y travaille compte dans les deux.
 */
export function countConnections(entries: Entry[]): ConnectionCounts {
  const sets = {
    people: new Set<string>(),
    alumni: new Set<string>(),
    current: new Set<string>(),
    former: new Set<string>(),
    employmentUnknown: new Set<string>(),
    internships: new Set<string>(),
    pfa: new Set<string>(),
    pfe: new Set<string>(),
  };
  for (const e of entries) {
    if (!isExperience(e)) continue;
    const id = e.author.id;
    sets.people.add(id);
    if (e.author.status === "alumni") sets.alumni.add(id);
    if (isEmployment(e)) sets[employmentStatusKey(employmentStatus(e))].add(id);
    if (isInternship(e)) sets.internships.add(id);
    if (e.experienceKind === "pfa") sets.pfa.add(id);
    if (e.experienceKind === "pfe") sets.pfe.add(id);
  }
  return {
    people: sets.people.size,
    alumni: sets.alumni.size,
    current: sets.current.size,
    former: sets.former.size,
    employmentUnknown: sets.employmentUnknown.size,
    internships: sets.internships.size,
    pfa: sets.pfa.size,
    pfe: sets.pfe.size,
  };
}

function employmentStatusKey(status: EmploymentStatus): "current" | "former" | "employmentUnknown" {
  return status === "unknown" ? "employmentUnknown" : status;
}

/* ------------------------------------------------------------------ */
/* Parcours observés                                                   */
/* ------------------------------------------------------------------ */

export interface CareerPath {
  author: Author;
  steps: Entry[];
}

export interface PathPattern {
  /** « PFA → PFE → Emploi » */
  label: string;
  steps: string[];
  people: Author[];
}

/**
 * Parcours réels : les membres qui ont au moins deux expériences, dont une
 * dans le domaine visé.
 *
 * Un *motif* (« PFA → PFE → Emploi ») n'est retenu qu'à partir de `minPeople`
 * personnes distinctes qui l'ont suivi. En dessous, c'est l'histoire d'une
 * personne, pas une tendance — elle reste visible comme parcours individuel,
 * mais n'est pas présentée comme un chemin type.
 */
export function careerPaths(
  entries: Entry[],
  domain: Domain | null,
  minPeople = 2,
): { paths: CareerPath[]; patterns: PathPattern[] } {
  const paths = groupPeople(entries)
    .filter((p) => p.records.length >= 2)
    .filter((p) => !domain || p.records.some((e) => e.domain === domain))
    .map((p) => ({ author: p.author, steps: p.records }));

  const byPattern = new Map<string, PathPattern>();
  for (const path of paths) {
    const steps: string[] = [];
    for (const e of path.steps) {
      const label = e.experienceKind ? EXPERIENCE_KIND_LABELS[e.experienceKind] : "Contact";
      if (steps[steps.length - 1] !== label) steps.push(label);
    }
    if (steps.length < 2) continue;
    const key = steps.join(" → ");
    const pattern = byPattern.get(key);
    if (pattern) pattern.people.push(path.author);
    else byPattern.set(key, { label: key, steps, people: [path.author] });
  }

  return {
    paths: paths.sort((a, b) => b.steps.length - a.steps.length),
    patterns: [...byPattern.values()]
      .filter((p) => p.people.length >= minPeople)
      .sort((a, b) => b.people.length - a.people.length),
  };
}
