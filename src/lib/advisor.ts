import {
  compareStrength,
  countConnections,
  describeConnection,
  employmentStatus,
  groupPeople,
  isEmployment,
  isExperience,
  isInternship,
  strongestRelation,
  careerPaths,
  type CareerPath,
  type ConnectionCounts,
  type ConnectionStrength,
  type PathPattern,
} from "./career";
import { DOMAIN_LABELS, STUDY_YEAR_LABELS } from "./labels";
import {
  PROFILE_CAREER_HREF,
  companyHref,
  networkHref,
  peopleHref,
  personHref,
} from "./links";
import { skillKey } from "./skills";
import type {
  Author,
  CareerProfile,
  Company,
  Domain,
  Entry,
  ExperienceKind,
  Place,
} from "./types";

/**
 * Conseiller de carrière.
 *
 * Une fonction pure : un profil et les données déjà présentes dans CConnect
 * entrent, un rapport sort. Pas de modèle de langage, pas de texte généré :
 * chaque phrase est un gabarit rempli par un compte ou un nom qui existe en
 * base, et chaque recommandation pointe vers l'écran où on la vérifie.
 *
 * Trois règles tiennent tout le fichier :
 *
 *  1. **Ne rien supposer.** Un domaine, un pays ou une année absents du profil
 *     restent absents ; le rapport le dit et renvoie vers le profil. On ne
 *     déduit pas un domaine cible des stages passés.
 *  2. **Ne rien afficher à zéro.** Une étape « Contacter 0 alumni » n'est pas
 *     une étape. Une section sans donnée disparaît ou dit qu'elle manque.
 *  3. **Expliquer, ne pas noter.** Aucun score. Les listes sont ordonnées par
 *     des critères lisibles (en poste > ancien poste > PFE > PFA), et chaque
 *     élément porte la phrase qui justifie sa place.
 */

/* ------------------------------------------------------------ objectif -- */

export type ObjectiveKind = "pfa" | "pfe" | "career" | "unknown";

export interface Objective {
  kind: ObjectiveKind;
  /** « PFA », « PFE », « Évolution professionnelle » */
  label: string;
  /** « 4e année », « Alumni 2022 », ou ce qui manque. */
  context: string;
}

export function objectiveFor(member: Author): Objective {
  if (member.status === "alumni") {
    return {
      kind: "career",
      label: "Évolution professionnelle",
      context: `Alumni ${member.promotion}`,
    };
  }
  switch (member.studyYear) {
    case "third":
    case "fourth":
      return { kind: "pfa", label: "PFA", context: STUDY_YEAR_LABELS[member.studyYear] };
    case "final":
      return { kind: "pfe", label: "PFE", context: STUDY_YEAR_LABELS.final };
    default:
      return {
        kind: "unknown",
        label: "À préciser",
        context: "Année d'études non renseignée",
      };
  }
}

/** Les expériences qui répondent à l'objectif : PFA pour un PFA, emploi pour un alumni. */
function servesObjective(entry: Entry, objective: ObjectiveKind): boolean {
  switch (objective) {
    case "pfa":
      return entry.experienceKind === "pfa";
    case "pfe":
      return entry.experienceKind === "pfe";
    case "career":
      return isEmployment(entry);
    case "unknown":
      return isInternship(entry);
  }
}

function objectiveKinds(objective: ObjectiveKind): ExperienceKind | null {
  return objective === "pfa" || objective === "pfe" ? objective : null;
}

/* ------------------------------------------------------------- rapport -- */

export interface MissingField {
  key: "studyYear" | "targetDomain" | "targetCountries" | "skills" | "mentoring";
  label: string;
  why: string;
  href: string;
}

export interface CompanyLead {
  company: Company;
  /** Expériences du réseau ici qui correspondent à l'objectif (PFA, PFE, emploi). */
  objectiveRecords: number;
  counts: ConnectionCounts;
  contacts: number;
  /** Phrases factuelles, dans l'ordre d'importance. */
  reasons: string[];
  href: string;
}

export interface ConnectionLead {
  author: Author;
  strength: ConnectionStrength;
  sentence: string;
  href: string;
}

export interface SkillSignal {
  label: string;
  /** Nombre d'expériences pertinentes qui la citent. */
  count: number;
  /**
   * `listed` : dans le profil. `not_listed` : le profil liste des compétences,
   * mais pas celle-ci. `unknown` : le profil n'en liste aucune — on ne peut
   * rien conclure, et on ne dit pas « manque ».
   */
  status: "listed" | "not_listed" | "unknown";
}

export interface AdvisorAction {
  label: string;
  detail: string;
  href: string;
}

export interface AdvisorReport {
  objective: Objective;
  focus: {
    domain: Domain | null;
    role: string | null;
    countries: { code: string; name: string }[];
    companies: Company[];
  };
  missing: MissingField[];
  /** Expériences du réseau (hors les siennes) qui forment la base du rapport. */
  basis: { records: number; objectiveRecords: number; description: string };
  companies: {
    total: number;
    leads: CompanyLead[];
    /** Toutes les entreprises visées présentes, sans la limite d'affichage. */
    targets: CompanyLead[];
    href: string;
  };
  connections: {
    people: number;
    alumni: number;
    currentInFocus: number;
    leads: ConnectionLead[];
    href: string;
    currentHref: string;
  };
  mentors: { people: Author[]; href: string };
  opportunities: { count: number; kind: ExperienceKind | null; href: string };
  skills: {
    signals: SkillSignal[];
    /** Expériences pertinentes qui listent au moins une compétence. */
    recordsWithSkills: number;
    profileHasSkills: boolean;
  };
  paths: { patterns: PathPattern[]; examples: CareerPath[] };
  actions: AdvisorAction[];
}

export interface AdvisorInput {
  profile: CareerProfile;
  /** Toutes les entrées du réseau (expériences et contacts). */
  entries: Entry[];
  companies: Company[];
  places: Place[];
}

/** Au-delà, une liste cesse d'être une recommandation et redevient un annuaire. */
const LEAD_LIMIT = 5;
/** Une compétence citée une seule fois n'est pas « fréquente ». */
const MIN_SKILL_MENTIONS = 2;

export function buildAdvisorReport(input: AdvisorInput): AdvisorReport {
  const { profile, entries, companies, places } = input;
  const member = profile.member;
  const objective = objectiveFor(member);
  const domain = profile.targetDomain;
  const countrySet = new Set(profile.targetCountries);
  const companySet = new Set(profile.targetCompanies);

  const countryName = new Map(places.map((p) => [p.countryCode, p.countryName]));
  const companyBySlug = new Map(companies.map((c) => [c.slug, c]));

  /* ---- ce qui manque au profil ---- */

  const missing: MissingField[] = [];
  if (member.status === "student" && !member.studyYear) {
    missing.push({
      key: "studyYear",
      label: "Année d'études",
      why: "Elle détermine si tu cherches un PFA ou un PFE.",
      href: PROFILE_CAREER_HREF,
    });
  }
  if (!domain) {
    missing.push({
      key: "targetDomain",
      label: "Domaine visé",
      why: "Sans lui, les entreprises et les alumni ne sont pas triés pour toi.",
      href: PROFILE_CAREER_HREF,
    });
  }
  if (countrySet.size === 0) {
    missing.push({
      key: "targetCountries",
      label: "Pays visés",
      why: "Le rapport couvre alors le réseau dans tous les pays.",
      href: PROFILE_CAREER_HREF,
    });
  }
  if (profile.skills.length === 0) {
    missing.push({
      key: "skills",
      label: "Compétences",
      why: "Sans elles, impossible de situer ton profil face aux compétences fréquentes.",
      href: PROFILE_CAREER_HREF,
    });
  }
  if (member.status === "alumni" && member.openToMentoring === null) {
    missing.push({
      key: "mentoring",
      label: "Disponibilité pour du mentorat",
      why: "Les étudiants de ton domaine ne savent pas s'ils peuvent te solliciter.",
      href: PROFILE_CAREER_HREF,
    });
  }

  /* ---- base du rapport : le réseau, filtré par ce que le profil dit ---- */

  const experiences = entries.filter(isExperience);
  const others = experiences.filter((e) => e.author.id !== member.id);

  const inGeography = (e: Entry) =>
    countrySet.size === 0 ||
    countrySet.has(e.place.countryCode) ||
    companySet.has(e.company.slug);
  const inDomain = (e: Entry) => !domain || e.domain === domain;

  const relevant = others.filter((e) => inDomain(e) && inGeography(e));
  const objectiveRecords = relevant.filter((e) => servesObjective(e, objective.kind));

  const scopeParts = [
    domain ? DOMAIN_LABELS[domain] : "tous domaines",
    countrySet.size > 0
      ? [...countrySet].map((c) => countryName.get(c) ?? c).join(", ")
      : "tous pays",
  ];
  const basis = {
    records: relevant.length,
    objectiveRecords: objectiveRecords.length,
    description: scopeParts.join(" · "),
  };

  /* ---- entreprises ---- */

  const contactsByCompany = new Map<string, number>();
  for (const e of entries) {
    // Ses propres contacts ne sont pas une piste à se recommander.
    if (e.entryKind !== "contact" || e.author.id === member.id || !inDomain(e) || !inGeography(e)) continue;
    contactsByCompany.set(e.company.slug, (contactsByCompany.get(e.company.slug) ?? 0) + 1);
  }

  const bySlug = new Map<string, Entry[]>();
  for (const e of relevant) {
    const list = bySlug.get(e.company.slug);
    if (list) list.push(e);
    else bySlug.set(e.company.slug, [e]);
  }
  // Une entreprise visée explicitement reste dans la liste même sans relation
  // dans le domaine : c'est le membre qui l'a choisie.
  for (const slug of companySet) if (!bySlug.has(slug) && companyBySlug.has(slug)) bySlug.set(slug, []);
  for (const slug of contactsByCompany.keys()) if (!bySlug.has(slug)) bySlug.set(slug, []);

  const leads: CompanyLead[] = [...bySlug.entries()]
    .map(([slug, records]) => {
      const company = companyBySlug.get(slug) ?? records[0]?.company;
      const counts = countConnections(records);
      const onObjective = records.filter((e) => servesObjective(e, objective.kind)).length;
      const contacts = contactsByCompany.get(slug) ?? 0;
      const reasons: string[] = [];
      if (companySet.has(slug)) reasons.push("Dans tes entreprises visées");
      if (onObjective > 0) {
        reasons.push(`${plural(onObjective, objectiveNoun(objective.kind))} dans le réseau`);
      }
      if (counts.current > 0) reasons.push(`${plural(counts.current, "membre")} en poste`);
      if (counts.former > 0) reasons.push(plural(counts.former, "ancien employé", "anciens employés"));
      if (contacts > 0) reasons.push(`${plural(contacts, "contact")} connu${contacts > 1 ? "s" : ""}`);
      return { company, records, counts, onObjective, contacts, reasons };
    })
    .filter((x): x is typeof x & { company: Company } => Boolean(x.company))
    .filter((x) => x.reasons.length > 0 || x.records.length > 0)
    .sort(
      (a, b) =>
        Number(companySet.has(b.company.slug)) - Number(companySet.has(a.company.slug)) ||
        b.onObjective - a.onObjective ||
        b.counts.current - a.counts.current ||
        b.records.length - a.records.length ||
        b.contacts - a.contacts ||
        a.company.name.localeCompare(b.company.name),
    )
    .map((x) => ({
      company: x.company,
      objectiveRecords: x.onObjective,
      counts: x.counts,
      contacts: x.contacts,
      reasons: x.reasons.length > 0 ? x.reasons : [`${plural(x.records.length, "expérience")} dans le réseau`],
      href: companyHref(x.company.slug, "connexions"),
    }));

  const singleCountry = countrySet.size === 1 ? [...countrySet][0] : null;

  /* ---- personnes ---- */

  const people = groupPeople(relevant);
  const connectionLeads: ConnectionLead[] = people
    .map((p) => ({
      author: p.author,
      strength: strongestRelation(p.records),
      sentence: describeConnection(p.author, p.records),
      href: personHref(p.author.id),
    }))
    .sort(
      (a, b) =>
        compareStrength(a.strength, b.strength) ||
        Number(b.author.status === "alumni") - Number(a.author.status === "alumni") ||
        a.author.fullName.localeCompare(b.author.fullName),
    );

  const currentInFocus = new Set(
    relevant
      .filter((e) => isEmployment(e) && employmentStatus(e) === "current")
      .map((e) => e.author.id),
  ).size;

  const alumniCount = people.filter((p) => p.author.status === "alumni").length;

  const mentorPeople = people
    .map((p) => p.author)
    .filter((a) => a.status === "alumni" && a.openToMentoring === true);

  /* ---- compétences ---- */

  // On regarde d'abord les expériences qui servent l'objectif ; s'il n'y en a
  // pas assez pour dégager une fréquence, le domaine entier.
  const skillSource =
    objectiveRecords.filter((e) => e.skills.length > 0).length >= MIN_SKILL_MENTIONS
      ? objectiveRecords
      : relevant;
  const withSkills = skillSource.filter((e) => e.skills.length > 0);
  const tally = new Map<string, { label: string; count: number }>();
  for (const e of withSkills) {
    const seen = new Set<string>();
    for (const skill of e.skills) {
      const key = skillKey(skill);
      if (seen.has(key)) continue;
      seen.add(key);
      const row = tally.get(key);
      if (row) row.count += 1;
      else tally.set(key, { label: skill, count: 1 });
    }
  }
  const mine = new Set(profile.skills.map(skillKey));
  const profileHasSkills = mine.size > 0;
  const signals: SkillSignal[] = [...tally.entries()]
    .filter(([, v]) => v.count >= MIN_SKILL_MENTIONS)
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
    .slice(0, 10)
    .map(([key, v]) => ({
      label: v.label,
      count: v.count,
      status: !profileHasSkills ? "unknown" : mine.has(key) ? "listed" : "not_listed",
    }));

  /* ---- parcours ---- */

  const { patterns, paths } = careerPaths(
    others.filter((e) => inGeography(e)),
    domain,
  );

  /* ---- opportunités : les stages déjà réalisés par le réseau ---- */

  const opportunityKind = objectiveKinds(objective.kind);
  const opportunities = {
    count: objectiveRecords.length,
    kind: opportunityKind,
    href: networkHref({
      domain,
      country: singleCountry,
      kind: opportunityKind ?? (objective.kind === "career" ? "job" : null),
      entry: "experience",
    }),
  };

  const companiesHref = networkHref({ domain, country: singleCountry });
  const peopleLink = peopleHref({ domain, country: singleCountry });
  const currentLink = peopleHref({ domain, country: singleCountry, relation: "current" });

  /* ---- étapes ---- */

  const actions: AdvisorAction[] = [];
  const focusLabel = domain ? ` en ${DOMAIN_LABELS[domain]}` : "";

  if (missing.some((m) => m.key === "studyYear")) {
    actions.push({
      label: "Indiquer ton année d'études",
      detail: "C'est ce qui distingue une recherche de PFA d'une recherche de PFE.",
      href: PROFILE_CAREER_HREF,
    });
  }

  if (leads.length > 0) {
    const n = Math.min(leads.length, LEAD_LIMIT);
    actions.push({
      label: `Explorer ${plural(n, "entreprise")}${focusLabel}`,
      detail: leads
        .slice(0, 3)
        .map((l) => l.company.name)
        .join(", "),
      href: n === 1 ? leads[0].href : companiesHref,
    });
  }

  if (objective.kind !== "career" && opportunities.count > 0) {
    actions.push({
      label: `Lire les ${plural(opportunities.count, objectiveNoun(objective.kind))} du réseau${focusLabel}`,
      detail: "Sujets, villes et processus de recrutement racontés par ceux qui y sont passés.",
      href: opportunities.href,
    });
  }

  if (paths.length > 0) {
    const n = Math.min(paths.length, 3);
    actions.push({
      label: `Étudier ${plural(n, "parcours")} de membres${focusLabel}`,
      detail: patterns[0]
        ? `Chemin le plus suivi : ${patterns[0].label} (${plural(patterns[0].people.length, "personne")}).`
        : "Pas encore de chemin partagé par plusieurs personnes : lis les parcours un à un.",
      href: n === 1 ? personHref(paths[0].author.id) : peopleLink,
    });
  }

  const notListed = signals.filter((s) => s.status === "not_listed");
  if (signals.length > 0) {
    actions.push(
      profileHasSkills
        ? {
            label:
              notListed.length > 0
                ? `Vérifier ${plural(notListed.length, "compétence fréquente absente", "compétences fréquentes absentes")} de ton profil`
                : "Tes compétences couvrent celles qui reviennent le plus",
            detail: (notListed.length > 0 ? notListed : signals)
              .slice(0, 4)
              .map((s) => s.label)
              .join(" · "),
            href: PROFILE_CAREER_HREF,
          }
        : {
            label: "Ajouter tes compétences à ton profil",
            detail: `Pour les comparer à ${plural(signals.length, "compétence")} qui reviennent dans le réseau.`,
            href: PROFILE_CAREER_HREF,
          },
    );
  }

  const topPerson = connectionLeads[0];
  if (topPerson) {
    actions.push({
      label: `Contacter ${topPerson.author.fullName}`,
      detail: topPerson.sentence,
      href: topPerson.href,
    });
  }

  if (mentorPeople.length > 0 && member.status === "student") {
    actions.push({
      label: `Solliciter ${plural(mentorPeople.length, "alumni ouvert", "alumni ouverts")} au mentorat`,
      detail: mentorPeople.slice(0, 3).map((a) => a.fullName).join(", "),
      href: peopleLink,
    });
  }

  if (member.status === "alumni" && member.openToMentoring === null) {
    actions.push({
      label: "Dire si tu acceptes du mentorat",
      detail: "Les étudiants ne voient une proposition de mentorat que si tu l'as indiquée.",
      href: PROFILE_CAREER_HREF,
    });
  }

  return {
    objective,
    focus: {
      domain,
      role: profile.targetRole,
      countries: [...countrySet].map((code) => ({ code, name: countryName.get(code) ?? code })),
      companies: [...companySet]
        .map((slug) => companyBySlug.get(slug))
        .filter((c): c is Company => Boolean(c)),
    },
    missing,
    basis,
    companies: {
      total: leads.length,
      leads: leads.slice(0, LEAD_LIMIT),
      targets: leads.filter((l) => companySet.has(l.company.slug)),
      href: companiesHref,
    },
    connections: {
      people: people.length,
      alumni: alumniCount,
      currentInFocus,
      leads: connectionLeads.slice(0, LEAD_LIMIT),
      href: peopleLink,
      currentHref: currentLink,
    },
    mentors: { people: mentorPeople, href: peopleLink },
    opportunities,
    skills: { signals, recordsWithSkills: withSkills.length, profileHasSkills },
    paths: { patterns, examples: paths.slice(0, 3) },
    actions,
  };
}

function objectiveNoun(kind: ObjectiveKind): string {
  switch (kind) {
    case "pfa":
      return "PFA";
    case "pfe":
      return "PFE";
    case "career":
      return "emploi";
    case "unknown":
      return "stage";
  }
}

/** « 1 PFA », « 3 PFA », « 2 entreprises ». Les sigles restent invariables. */
export function plural(n: number, singular: string, pluralForm?: string): string {
  const invariable = /^[A-Z]{2,}$/.test(singular) || singular.endsWith("s");
  const word = n > 1 ? (pluralForm ?? (invariable ? singular : `${singular}s`)) : singular;
  return `${n} ${word}`;
}
