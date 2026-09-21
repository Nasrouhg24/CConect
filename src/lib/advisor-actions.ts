import { plural, type AdvisorReport } from "./advisor";
import { chronological, employmentStatus, isEmployment, isExperience } from "./career";
import { DOMAIN_LABELS, STUDY_YEAR_LABELS } from "./labels";
import { PROFILE_CAREER_HREF, companyHref } from "./links";
import type { CareerProfile, Entry } from "./types";

/**
 * Plan d'action du conseiller.
 *
 *   données CConnect → moteur de carrière (`advisor.ts`) → moteur d'actions (ici) → plan
 *
 * Ce fichier ne lit aucune donnée par lui-même : il transforme le rapport déjà
 * calculé, le profil et les expériences du membre en une liste courte
 * d'actions. Tout est déterministe — mêmes entrées, même plan — et chaque
 * action porte les faits qui la justifient (`evidence`). Une future couche
 * d'explication pourra consommer ces objets tels quels ; elle n'existe pas ici.
 *
 * Règles :
 *  - une action n'existe que si la donnée qui la fonde existe ; aucun compte
 *    n'est affiché à zéro, aucune personne ni entreprise n'est supposée ;
 *  - pas de score : trois priorités lisibles, puis un ordre fixe de catégories ;
 *  - une information absente est « non renseignée », jamais « manquante ».
 */

export type ActionPriority = "high" | "medium" | "low";

export type ActionCategory =
  | "profile"
  | "connections"
  | "target_companies"
  | "career_record"
  | "exploration"
  | "skills"
  | "paths"
  | "optional";

export interface PlanAction {
  /** Stable : sert de clé d'affichage et de repère pour les tests. */
  id: string;
  category: ActionCategory;
  priority: ActionPriority;
  title: string;
  description: string;
  /** Faits, un par ligne, qui expliquent l'action (« Pourquoi ? »). */
  evidence: string[];
  href: string;
  label: string;
}

export interface OnboardingStep {
  label: string;
  done: boolean;
  /** Ce qui est renseigné, ou comment l'étape se déduit. */
  detail: string;
}

export interface ActionPlan {
  actions: PlanAction[];
  /** Présent quand le profil ne dit presque rien : on commence par l'objectif. */
  onboarding: OnboardingStep[] | null;
}

export interface ActionPlanInput {
  report: AdvisorReport;
  profile: CareerProfile;
  /** Les contributions du membre lui-même (expériences et contacts). */
  ownEntries: Entry[];
}

export const MAX_PLAN_ACTIONS = 5;

const PRIORITY_RANK: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };

const CATEGORY_RANK: Record<ActionCategory, number> = {
  profile: 0,
  connections: 1,
  target_companies: 2,
  career_record: 3,
  exploration: 4,
  skills: 5,
  paths: 6,
  optional: 7,
};

/** Ancres de la page `/advisor` — elles existent dans `AdvisorDashboard`. */
const ADVISOR_SKILLS = "/advisor#advisor-skills";
const ADVISOR_COMPANIES = "/advisor#advisor-companies";
const ADVISOR_PATHS = "/advisor#advisor-paths";
const ADVISOR_PEOPLE = "/advisor#advisor-people";

export function buildActionPlan({ report, profile, ownEntries }: ActionPlanInput): ActionPlan {
  const { objective, focus, connections, companies, skills, paths, opportunities, mentors } = report;
  const member = profile.member;
  const actions: PlanAction[] = [];

  /* ---- faits du profil, réutilisés dans les « Pourquoi ? » ---- */

  const facts: string[] = [];
  if (member.status === "alumni") facts.push(`Tu es alumni (promotion ${member.promotion})`);
  else if (member.studyYear) facts.push(`Tu es en ${STUDY_YEAR_LABELS[member.studyYear].toLowerCase()}`);
  if (objective.kind === "pfa" || objective.kind === "pfe") {
    facts.push(`Tu recherches un ${objective.label}`);
  }
  if (focus.domain) facts.push(`Ton domaine visé est ${DOMAIN_LABELS[focus.domain]}`);
  if (focus.countries.length > 0) {
    facts.push(`Tes pays visés : ${focus.countries.map((c) => c.name).join(", ")}`);
  }
  // Les filtres de la carte et de l'annuaire n'acceptent qu'un pays. Avec
  // plusieurs pays, un lien filtré en perdrait et la page d'arrivée afficherait
  // d'autres comptes : on renvoie alors aux listes du conseiller, exactes.
  const multiCountry = focus.countries.length > 1;
  const hasCriteria =
    Boolean(focus.domain) || focus.countries.length > 0 || profile.targetCompanies.length > 0;

  /* ---- 1. profil ---- */

  const ownExperiences = chronological(ownEntries.filter(isExperience));
  const notProvided: string[] = [];
  if (member.status === "student" && !member.studyYear) notProvided.push("ton année d'études");
  if (!focus.domain) notProvided.push("ton domaine visé");
  if (!focus.role) notProvided.push("ton rôle visé");
  if (focus.countries.length === 0) notProvided.push("tes pays visés");
  if (profile.skills.length === 0) notProvided.push("tes compétences");

  const goalMissing = (member.status === "student" && !member.studyYear) || !focus.domain;

  const onboarding =
    member.status === "student" && !member.studyYear && !focus.domain && !focus.role && focus.countries.length === 0
      ? onboardingSteps(profile)
      : null;

  if (notProvided.length > 0) {
    const evidence = notProvided.map((f) => `Non renseigné : ${f}`);
    if (profile.skills.length === 0 && skills.signals.length > 0) {
      evidence.push(
        `${plural(skills.signals.length, "compétence revient", "compétences reviennent")} dans les expériences de ton périmètre, sans point de comparaison`,
      );
    }
    actions.push({
      id: "profile-goal",
      category: "profile",
      // Sans année ni domaine, le reste du plan ne sait pas quoi filtrer.
      priority: goalMissing ? "high" : "medium",
      title: goalMissing ? "Complète ton objectif professionnel" : "Précise ton profil",
      description: goalMissing
        ? "Indique ton année et ton domaine pour que le conseiller filtre les entreprises et les connexions pour toi."
        : `Pas encore renseigné dans ton profil : ${joinFr(notProvided)}.`,
      evidence,
      href: PROFILE_CAREER_HREF,
      label: "Modifier mon profil",
    });
  }

  if (ownExperiences.length === 0 && member.status === "alumni") {
    actions.push({
      id: "profile-first-experience",
      category: "profile",
      priority: "medium",
      title: "Partage ton parcours",
      description: "Aucune expérience n'est encore renseignée sur ton profil : les étudiants ne voient pas ton parcours.",
      evidence: ["Tu es alumni", "Aucune expérience publiée sous ton nom"],
      href: "/contribute",
      label: "Ajouter une expérience",
    });
  }

  /* ---- 3. connexions UM6P ---- */

  if (hasCriteria && connections.people > 0) {
    const current = connections.currentInFocus;
    actions.push({
      id: "connections",
      category: "connections",
      priority: "high",
      title: "Contacte des connexions UM6P pertinentes",
      description:
        current > 0
          ? `${plural(current, "connexion UM6P travaille", "connexions UM6P travaillent")} actuellement dans ton périmètre.`
          : `${plural(connections.people, "membre UM6P a", "membres UM6P ont")} une expérience qui correspond à ton objectif.`,
      evidence: [
        ...facts,
        `${plural(connections.people, "membre correspond", "membres correspondent")} à ces critères`,
        ...(connections.alumni > 0 ? [`dont ${plural(connections.alumni, "alumni", "alumni")}`] : []),
        ...(current > 0 ? [`dont ${current} en poste aujourd'hui`] : []),
      ],
      href: multiCountry ? ADVISOR_PEOPLE : current > 0 ? connections.currentHref : connections.href,
      label: "Voir les connexions",
    });
  }

  /* ---- 4. entreprises cibles ---- */

  if (profile.targetCompanies.length > 0) {
    const present = focus.companies;
    if (present.length > 0) {
      const withPeople = companies.targets.filter((l) => l.counts.people > 0);
      actions.push({
        id: "target-companies",
        category: "target_companies",
        priority: withPeople.length > 0 ? "high" : "medium",
        title: "Explore tes entreprises cibles",
        description:
          withPeople.length > 0
            ? `${plural(present.length, "entreprise cible présente", "entreprises cibles présentes")} dans CConnect, dont ${withPeople.length} avec des membres UM6P.`
            : `${plural(present.length, "entreprise cible présente", "entreprises cibles présentes")} dans CConnect, sans relation de membre dans ton domaine pour l'instant.`,
        evidence: [
          `Tes entreprises cibles : ${present.map((c) => c.name).join(", ")}`,
          ...withPeople.map((l) => `${l.company.name} : ${describeCounts(l.counts)}`),
        ],
        href: present.length === 1 ? companyHref(present[0].slug, "connexions") : ADVISOR_COMPANIES,
        label: present.length === 1 ? "Voir l'entreprise" : "Voir mes entreprises cibles",
      });
    } else {
      actions.push({
        id: "broaden-search",
        category: "target_companies",
        priority: "medium",
        title: "Élargis ta recherche",
        description: "Aucune de tes entreprises cibles n'est encore présente dans CConnect.",
        evidence: [`${plural(profile.targetCompanies.length, "entreprise cible enregistrée", "entreprises cibles enregistrées")}, aucune fiche correspondante`],
        href: PROFILE_CAREER_HREF,
        label: "Modifier mes cibles",
      });
    }
  } else if (hasCriteria && report.basis.records === 0 && companies.total === 0) {
    actions.push({
      id: "broaden-search",
      category: "target_companies",
      priority: "medium",
      title: "Élargis ta recherche",
      description: "Le réseau n'a encore aucune expérience ni contact dans ton périmètre.",
      evidence: [...facts, "Aucune expérience ni aucun contact du réseau dans ce périmètre"],
      href: PROFILE_CAREER_HREF,
      label: "Modifier mon périmètre",
    });
  }

  /* ---- 5. parcours du membre ---- */

  const undated = ownExperiences.filter((e) => !e.startDate);
  const unknownStatus = ownExperiences.filter(
    (e) => isEmployment(e) && employmentStatus(e) === "unknown",
  );
  const incomplete = ownExperiences.filter((e) => undated.includes(e) || unknownStatus.includes(e));
  if (incomplete.length > 0) {
    const first = incomplete[0];
    actions.push({
      id: "career-record",
      category: "career_record",
      priority: unknownStatus.length > 0 ? "high" : "medium",
      title: "Complète ton parcours professionnel",
      description:
        "Certaines expériences n'ont pas encore de dates ou de statut renseigné. Les compléter affichera un parcours plus précis.",
      evidence: [
        ...(undated.length > 0 ? [`${plural(undated.length, "expérience")} sans mois de début`] : []),
        ...(unknownStatus.length > 0
          ? [`${plural(unknownStatus.length, "emploi")} sans statut (en poste ou terminé)`]
          : []),
        `Première à compléter : ${first.headline} chez ${first.company.name}`,
      ],
      href: companyHref(first.company.slug, "experiences"),
      label: "Modifier mon parcours",
    });
  }

  /* ---- 2. exploration selon l'objectif ---- */

  // Une entreprise visée sans aucune donnée figure dans la liste du conseiller
  // (le membre l'a choisie), mais elle n'est pas « à explorer » : la carte
  // filtrée ne montrerait rien. L'action ne compte que les entreprises qui ont
  // des expériences ou des contacts.
  const emptyTargets = companies.targets.filter((l) => l.counts.people === 0 && l.contacts === 0).length;
  const explorable = companies.total - emptyTargets;

  if (objective.kind === "pfa" || objective.kind === "pfe") {
    if (opportunities.count > 0 || explorable > 0) {
      actions.push({
        id: `explore-${objective.kind}`,
        category: "exploration",
        priority: "medium",
        title: `Explore les entreprises pour ton ${objective.label}`,
        description:
          opportunities.count > 0
            ? `${plural(opportunities.count, `${objective.label} déjà réalisé`, `${objective.label} déjà réalisés`)} par le réseau dans ton périmètre, avec sujets et villes.`
            : `${plural(explorable, "entreprise liée", "entreprises liées")} à ton périmètre, sans ${objective.label} partagé pour l'instant.`,
        evidence: [
          ...facts,
          ...(opportunities.count > 0 ? [`${plural(opportunities.count, objective.label)} dans le réseau`] : []),
          ...(explorable > 0
            ? [`${plural(explorable, "entreprise")} avec des expériences ou des contacts dans ce périmètre`]
            : []),
        ],
        href: multiCountry
          ? ADVISOR_COMPANIES
          : opportunities.count > 0
            ? opportunities.href
            : companies.href,
        label: multiCountry ? "Voir les entreprises" : "Voir sur la carte",
      });
    }
  } else if (objective.kind === "career") {
    if (explorable > 0 || connections.people > 0) {
      const parts = [
        explorable > 0 ? plural(explorable, "entreprise") : null,
        connections.people > 0 ? plural(connections.people, "membre") : null,
      ].filter(Boolean);
      const toCompanies = explorable > 0;
      actions.push({
        id: "explore-career",
        category: "exploration",
        priority: "medium",
        title: "Explore les opportunités et connexions professionnelles",
        description: `${parts.join(" et ")} du réseau dans ton périmètre.`,
        evidence: [
          ...facts,
          ...(opportunities.count > 0 ? [`${plural(opportunities.count, "emploi")} partagé par le réseau`] : []),
        ],
        href: toCompanies
          ? multiCountry
            ? ADVISOR_COMPANIES
            : companies.href
          : multiCountry
            ? ADVISOR_PEOPLE
            : connections.href,
        label: toCompanies ? (multiCountry ? "Voir les entreprises" : "Voir sur la carte") : "Voir les connexions",
      });
    }
  }

  /* ---- 6. compétences ---- */

  if (profile.skills.length > 0 && skills.signals.length > 0) {
    const notListed = skills.signals.filter((s) => s.status === "not_listed");
    const listed = skills.signals.filter((s) => s.status === "listed");
    actions.push({
      id: "skills",
      category: "skills",
      priority: "medium",
      title: "Compare tes compétences avec les parcours pertinents",
      description:
        "Voici les compétences qui apparaissent régulièrement dans les expériences correspondant à ton objectif.",
      evidence: [
        ...notListed
          .slice(0, 4)
          .map(
            (s) =>
              `${s.label} apparaît dans ${s.count} expériences pertinentes et n'est pas actuellement renseigné dans ton profil`,
          ),
        ...(listed.length > 0 ? [`Déjà dans ton profil : ${listed.map((s) => s.label).join(", ")}`] : []),
      ],
      href: ADVISOR_SKILLS,
      label: "Voir les compétences",
    });
  }

  /* ---- 7. parcours partagés ---- */

  if (paths.patterns.length > 0) {

    actions.push({
      id: "paths",
      category: "paths",
      priority: "medium",
      title: "Explore des parcours similaires",
      description: "Des membres de CConnect ont suivi des parcours similaires à ton objectif.",
      evidence: paths.patterns
        .slice(0, 3)
        .map((p) => `${p.label} : suivi par ${plural(p.people.length, "membre")}`),
      href: ADVISOR_PATHS,
      label: "Voir les parcours",
    });
  }

  /* ---- facultatif ---- */

  if (member.status === "student" && mentors.people.length > 0) {
    actions.push({
      id: "mentors",
      category: "optional",
      priority: "low",
      title: "Sollicite un alumni ouvert au mentorat",
      description: `${plural(mentors.people.length, "alumni de ton périmètre accepte", "alumni de ton périmètre acceptent")} d'être sollicités.`,
      evidence: mentors.people.map((a) => `${a.fullName} a indiqué accepter le mentorat`),
      href: mentors.href,
      label: "Voir les mentors",
    });
  }
  if (member.status === "alumni" && member.openToMentoring === null) {
    actions.push({
      id: "mentoring-consent",
      category: "optional",
      priority: "low",
      title: "Indique si tu acceptes du mentorat",
      description: "Les étudiants ne voient une proposition de mentorat que si tu l'as indiquée.",
      evidence: ["Tu es alumni", "Disponibilité pour du mentorat : non renseignée"],
      href: PROFILE_CAREER_HREF,
      label: "Modifier mon profil",
    });
  }

  const ordered = actions
    .map((action, index) => ({ action, index }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.action.priority] - PRIORITY_RANK[b.action.priority] ||
        CATEGORY_RANK[a.action.category] - CATEGORY_RANK[b.action.category] ||
        a.index - b.index,
    )
    .map((x) => x.action)
    .slice(0, MAX_PLAN_ACTIONS);

  return { actions: ordered, onboarding };
}

function onboardingSteps(profile: CareerProfile): OnboardingStep[] {
  const m = profile.member;
  return [
    {
      label: "Année d'études",
      done: Boolean(m.studyYear),
      detail: m.studyYear ? STUDY_YEAR_LABELS[m.studyYear] : "Non renseignée",
    },
    {
      label: "Domaine",
      done: Boolean(profile.targetDomain),
      detail: profile.targetDomain ? DOMAIN_LABELS[profile.targetDomain] : "Non renseigné",
    },
    {
      label: "Type d'expérience recherché",
      done: Boolean(m.studyYear),
      detail: m.studyYear
        ? m.studyYear === "final"
          ? "PFE"
          : "PFA"
        : "Se déduit de ton année : PFA en 3e et 4e année, PFE en dernière année",
    },
    {
      label: "Pays",
      done: profile.targetCountries.length > 0,
      detail: profile.targetCountries.length > 0 ? profile.targetCountries.join(", ") : "Non renseignés",
    },
    {
      label: "Rôle cible",
      done: Boolean(profile.targetRole),
      detail: profile.targetRole ?? "Non renseigné",
    },
  ];
}

/** « 2 membres UM6P, dont 1 en poste et 1 passé en stage » — uniquement les comptes non nuls. */
function describeCounts(c: AdvisorReport["companies"]["targets"][number]["counts"]): string {
  const parts = [
    c.current > 0 ? `${c.current} en poste` : null,
    c.former > 0 ? `${c.former} ancien${c.former > 1 ? "s" : ""} employé${c.former > 1 ? "s" : ""}` : null,
    c.internships > 0 ? `${c.internships} passé${c.internships > 1 ? "s" : ""} en stage` : null,
  ].filter(Boolean);
  const head = plural(c.people, "membre UM6P", "membres UM6P");
  return parts.length > 0 ? `${head}, dont ${joinFr(parts as string[])}` : head;
}

function joinFr(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
