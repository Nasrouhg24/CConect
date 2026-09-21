import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAdvisorReport, objectiveFor, type AdvisorReport } from "../src/lib/advisor.ts";
import {
  careerPaths,
  countConnections,
  describeConnection,
  employmentStatus,
  findPeople,
  periodLabel,
  relationLabel,
} from "../src/lib/career.ts";
import { contactToEntry, experienceToEntry } from "../src/lib/entries.ts";
import {
  filtersFromParams,
  networkHref,
  peopleHref,
  peopleQueryFromParams,
} from "../src/lib/links.ts";
import { parseSkillList } from "../src/lib/skills.ts";
import { careerFieldsFromInput, experienceInputSchema } from "../src/lib/validation.ts";
import { AUTHORS, COMPANIES, CONTACTS, EXPERIENCES } from "../src/lib/data/seed.ts";
import { PLACES } from "../src/lib/data/places.ts";
import type {
  Author,
  CareerProfile,
  Domain,
  Entry,
  ExperienceKind,
  StudyYear,
} from "../src/lib/types.ts";

/* ------------------------------------------------------------------ */
/* Fixtures de test — jamais utilisées par l'application               */
/* ------------------------------------------------------------------ */

const paris = PLACES.find((p) => p.id === "p-paris")!;
const lyon = PLACES.find((p) => p.id === "p-lyon")!;
const orange = COMPANIES.find((c) => c.slug === "orange-cyberdefense")!;
const deloitte = COMPANIES.find((c) => c.slug === "deloitte")!;

function member(id: string, status: Author["status"], studyYear: StudyYear | null = null): Author {
  return {
    id,
    fullName: `Test ${id}`,
    campus: "rabat",
    status,
    promotion: status === "alumni" ? 2022 : 2027,
    linkedinUrl: null,
    contactEmail: null,
    studyYear,
    openToMentoring: null,
  };
}

let seq = 0;
function record(
  author: Author,
  kind: ExperienceKind,
  year: number,
  extra: Partial<Entry> = {},
): Entry {
  seq += 1;
  return {
    id: `t-${seq}`,
    entryKind: "experience",
    company: orange,
    place: paris,
    domain: "cybersecurity",
    year,
    author,
    headline: kind === "job" ? "SOC Analyst" : "Stage SOC",
    detail: null,
    experienceKind: kind,
    contactFirstName: null,
    contactLastName: null,
    contactLinkedinUrl: null,
    startDate: null,
    endDate: null,
    isCurrent: null,
    skills: [],
    ...extra,
  };
}

function profile(author: Author, extra: Partial<Omit<CareerProfile, "member">> = {}): CareerProfile {
  return {
    member: author,
    targetDomain: null,
    targetRole: null,
    skills: [],
    targetCountries: [],
    targetCompanies: [],
    ...extra,
  };
}

const ahmed = member("ahmed", "alumni");
const AHMED_PATH = [
  record(ahmed, "pfa", 2024),
  record(ahmed, "pfe", 2025),
  record(ahmed, "job", 2026, { startDate: "2026-03-01", isCurrent: true }),
];

/* ------------------------------------------------------------------ */
/* Objectif : PFA / PFE / carrière                                     */
/* ------------------------------------------------------------------ */

test("3e et 4e année visent un PFA, la dernière année un PFE", () => {
  assert.equal(objectiveFor(member("a", "student", "third")).kind, "pfa");
  assert.equal(objectiveFor(member("b", "student", "fourth")).kind, "pfa");
  assert.equal(objectiveFor(member("c", "student", "final")).kind, "pfe");
  assert.equal(objectiveFor(member("c", "student", "final")).context, "Dernière année");
});

test("un alumni vise l'évolution professionnelle, pas un stage", () => {
  const o = objectiveFor(member("d", "alumni"));
  assert.equal(o.kind, "career");
  assert.doesNotMatch(o.label, /PF[AE]|stage/i);
});

test("un étudiant sans année n'a pas d'objectif supposé", () => {
  assert.equal(objectiveFor(member("e", "student")).kind, "unknown");
});

/* ------------------------------------------------------------------ */
/* Relations multiples et statut d'emploi                              */
/* ------------------------------------------------------------------ */

test("PFA, PFE et emploi dans la même entreprise restent trois relations distinctes", () => {
  assert.deepEqual(
    AHMED_PATH.map(relationLabel),
    ["PFA", "PFE", "Emploi · en poste"],
  );
  const counts = countConnections(AHMED_PATH);
  assert.equal(counts.people, 1, "une seule personne");
  assert.equal(counts.pfa, 1);
  assert.equal(counts.pfe, 1);
  assert.equal(counts.current, 1);
  assert.equal(counts.internships, 1, "compte des personnes, pas des lignes");
});

test("un emploi sans statut ni date de fin n'est ni actuel ni passé", () => {
  const e = record(ahmed, "job", 2023);
  assert.equal(employmentStatus(e), "unknown");
  assert.equal(relationLabel(e), "Emploi · statut non renseigné");
  const counts = countConnections([e]);
  assert.equal(counts.current, 0);
  assert.equal(counts.former, 0);
  assert.equal(counts.employmentUnknown, 1);
});

test("une date de fin suffit à dire « ancien poste »", () => {
  const e = record(ahmed, "job", 2022, { startDate: "2022-09-01", endDate: "2024-02-01" });
  assert.equal(employmentStatus(e), "former");
  assert.equal(periodLabel(e), "sept. 2022 → févr. 2024");
});

test("la phrase de connexion cite la relation la plus forte", () => {
  const sentence = describeConnection(ahmed, AHMED_PATH);
  assert.match(sentence, /SOC Analyst chez Orange Cyberdefense, en poste depuis mars 2026/);
});

test("une recherche de personnes exige qu'une même expérience réunisse les critères", () => {
  const mixed = member("mixed", "alumni");
  const records = [
    record(mixed, "pfa", 2020, { company: orange, domain: "cybersecurity" }),
    record(mixed, "job", 2023, { company: deloitte, domain: "data", isCurrent: true }),
  ];
  const hit = findPeople(records, { company: "orange-cyberdefense", relation: "current" });
  assert.equal(hit.length, 0, "en poste ailleurs, pas chez Orange");
  const atDeloitte = findPeople(records, { company: "deloitte", relation: "current" });
  assert.equal(atDeloitte.length, 1);
});

test("un parcours isolé n'est pas présenté comme une tendance", () => {
  const one = careerPaths(AHMED_PATH, "cybersecurity");
  assert.equal(one.paths.length, 1);
  assert.equal(one.patterns.length, 0);

  const salma = member("salma", "alumni");
  const two = careerPaths(
    [...AHMED_PATH, record(salma, "pfa", 2021), record(salma, "pfe", 2022), record(salma, "job", 2023)],
    "cybersecurity",
  );
  assert.equal(two.patterns.length, 1);
  assert.equal(two.patterns[0].label, "PFA → PFE → Emploi");
  assert.equal(two.patterns[0].people.length, 2);
});

/* ------------------------------------------------------------------ */
/* Conseiller                                                          */
/* ------------------------------------------------------------------ */

const SEED_ENTRIES = [
  ...EXPERIENCES.map(experienceToEntry),
  ...CONTACTS.map(contactToEntry),
];

function report(p: CareerProfile, entries: Entry[] = SEED_ENTRIES): AdvisorReport {
  return buildAdvisorReport({ profile: p, entries, companies: COMPANIES, places: PLACES });
}

test("un profil vide demande à être complété, sans rien supposer", () => {
  const r = report(profile(member("empty", "student")));
  assert.equal(r.objective.kind, "unknown");
  assert.deepEqual(
    r.missing.map((m) => m.key),
    ["studyYear", "targetDomain", "targetCountries", "skills"],
  );
  assert.equal(r.focus.domain, null);
  assert.deepEqual(r.focus.countries, []);
  assert.equal(r.actions[0].href, "/profile#parcours");
});

test("aucune étape n'annonce un compte nul", () => {
  for (const p of [
    profile(member("s", "student", "fourth"), { targetDomain: "cybersecurity" }),
    profile(member("s2", "student", "final"), { targetDomain: "product_design", targetCountries: ["JP"] }),
    profile(member("al", "alumni"), { targetDomain: "data" }),
  ]) {
    for (const action of report(p).actions) {
      assert.doesNotMatch(action.label, /\b0 /, action.label);
    }
  }
});

test("le jeu de démo ne produit aucun poste « actuel » inventé", () => {
  const r = report(profile(member("s", "student", "fourth"), { targetDomain: "cybersecurity" }));
  assert.equal(r.connections.currentInFocus, 0);
  for (const lead of r.connections.leads) {
    assert.doesNotMatch(lead.sentence, /en poste/, lead.sentence);
  }
  assert.ok(
    EXPERIENCES.every((e) => e.isCurrent === null && e.startDate === null && e.skills.length === 0),
    "le seed ne doit porter ni statut, ni date, ni compétence",
  );
  assert.ok(AUTHORS.every((a) => a.studyYear === null && a.openToMentoring === null));
});

test("PFA et PFE produisent des recommandations différentes", () => {
  const pfaPerson = member("p1", "student", "fourth");
  const pfePerson = member("p2", "student", "final");
  const peers = [
    record(member("x", "student"), "pfa", 2024),
    record(member("y", "student"), "pfe", 2025),
    record(member("z", "student"), "pfe", 2025),
  ];
  const pfa = report(profile(pfaPerson, { targetDomain: "cybersecurity" }), peers);
  const pfe = report(profile(pfePerson, { targetDomain: "cybersecurity" }), peers);
  assert.equal(pfa.opportunities.count, 1);
  assert.equal(pfe.opportunities.count, 2);
  assert.match(pfa.opportunities.href, /kind=pfa/);
  assert.match(pfe.opportunities.href, /kind=pfe/);
  assert.ok(pfa.actions.some((a) => /1 PFA/.test(a.label)));
  assert.ok(pfe.actions.some((a) => /2 PFE/.test(a.label)));
});

test("l'alumni reçoit des pistes de carrière et une invitation au mentorat", () => {
  const al = member("al", "alumni");
  const r = report(profile(al, { targetDomain: "cybersecurity" }), AHMED_PATH);
  assert.equal(r.objective.kind, "career");
  assert.ok(r.missing.some((m) => m.key === "mentoring"));
  assert.ok(r.actions.some((a) => /mentorat/.test(a.label)));
  assert.ok(!r.actions.some((a) => /PFA|PFE/.test(a.label)));
});

test("ses propres expériences ne sont jamais recommandées à soi-même", () => {
  const r = report(profile(ahmed, { targetDomain: "cybersecurity" }), AHMED_PATH);
  assert.equal(r.basis.records, 0);
  assert.equal(r.connections.people, 0);
});

test("compétences : « dans le profil », « pas dans le profil », ou inconnu", () => {
  const peers = [
    record(member("a", "alumni"), "pfa", 2024, { skills: ["SIEM", "Python"] }),
    record(member("b", "alumni"), "pfa", 2024, { skills: ["siem", "Linux"] }),
    record(member("c", "alumni"), "pfa", 2025, { skills: ["Python", "Linux", "Rust"] }),
  ];
  const student = member("s", "student", "third");

  const unknown = report(profile(student, { targetDomain: "cybersecurity" }), peers);
  assert.ok(unknown.skills.signals.every((s) => s.status === "unknown"));
  assert.ok(!unknown.skills.signals.some((s) => s.label === "Rust"), "citée une fois : pas fréquente");

  const known = report(
    profile(student, { targetDomain: "cybersecurity", skills: ["python"] }),
    peers,
  );
  const byLabel = Object.fromEntries(known.skills.signals.map((s) => [s.label.toLowerCase(), s.status]));
  assert.deepEqual(byLabel, { siem: "not_listed", python: "listed", linux: "not_listed" });
  for (const action of known.actions) assert.doesNotMatch(action.label, /manque|lacks/i);
});

test("les pays visés restreignent la base, sauf pour une entreprise visée explicitement", () => {
  const s = member("s", "student", "fourth");
  const peers = [
    record(member("a", "alumni"), "pfa", 2024, { place: paris }),
    record(member("b", "alumni"), "pfa", 2024, { place: { ...lyon, countryCode: "DE", countryName: "Allemagne" }, company: deloitte }),
  ];
  const r = report(profile(s, { targetDomain: "cybersecurity", targetCountries: ["FR"] }), peers);
  assert.equal(r.basis.records, 1);
  const withTarget = report(
    profile(s, { targetDomain: "cybersecurity", targetCountries: ["FR"], targetCompanies: ["deloitte"] }),
    peers,
  );
  assert.equal(withTarget.basis.records, 2);
  assert.equal(withTarget.companies.leads[0].company.slug, "deloitte", "l'entreprise choisie passe en tête");
});

/* ------------------------------------------------------------------ */
/* Liens : tout ce que le conseiller écrit, les pages le relisent      */
/* ------------------------------------------------------------------ */

const ROUTES = [/^\/network(\?|$)/, /^\/people(\?|$)/, /^\/people\/[^/?#]+$/, /^\/companies\/[a-z0-9-]+(#[a-z]+)?$/, /^\/profile#parcours$/];

test("chaque action du conseiller pointe vers une route existante", () => {
  const profiles = [
    profile(member("s", "student")),
    profile(member("s1", "student", "fourth"), { targetDomain: "cybersecurity", targetCountries: ["FR"] }),
    profile(member("s2", "student", "final"), { targetDomain: "data", skills: ["Python"] }),
    profile(member("al", "alumni"), { targetDomain: "software_engineering" }),
  ];
  for (const p of profiles) {
    const r = report(p, [...SEED_ENTRIES, ...AHMED_PATH]);
    const hrefs = [
      ...r.actions.map((a) => a.href),
      ...r.companies.leads.map((l) => l.href),
      ...r.connections.leads.map((l) => l.href),
      r.companies.href,
      r.connections.href,
      r.opportunities.href,
    ];
    for (const href of hrefs) {
      assert.ok(ROUTES.some((re) => re.test(href)), `route inconnue : ${href}`);
    }
  }
});

test("les filtres écrits dans une URL de carte sont relus à l'identique", () => {
  const href = networkHref({ domain: "cybersecurity", country: "FR", kind: "pfa", entry: "experience" });
  const params = Object.fromEntries(new URL(href, "http://x").searchParams);
  const filters = filtersFromParams(params);
  assert.equal(filters.domain, "cybersecurity");
  assert.equal(filters.country, "FR");
  assert.equal(filters.experienceKind, "pfa");
  assert.equal(filters.entryKind, "experience");
});

test("un paramètre d'URL invalide est ignoré, pas relayé", () => {
  const filters = filtersFromParams({ domain: "hacking", country: "france", company: "<script>", kind: "job" });
  assert.equal(filters.domain, null);
  assert.equal(filters.country, null);
  assert.equal(filters.company, null);
  assert.equal(filters.experienceKind, "job");

  const q = peopleQueryFromParams({ relation: "boss", status: "alumni", company: "orange-cyberdefense" });
  assert.equal(q.relation, null);
  assert.equal(q.status, "alumni");
  assert.equal(peopleHref(q), "/people?company=orange-cyberdefense&status=alumni");
});

/* ------------------------------------------------------------------ */
/* Saisie                                                              */
/* ------------------------------------------------------------------ */

test("la liste de compétences est dédoublonnée, et refusée plutôt que tronquée", () => {
  assert.deepEqual(parseSkillList("SIEM, python; Python\n  Threat   Detection ,", 12), [
    "SIEM",
    "python",
    "Threat Detection",
  ]);
  assert.equal(parseSkillList(Array.from({ length: 13 }, (_, i) => `s${i}`).join(","), 12), null);
  assert.equal(parseSkillList("x".repeat(41), 12), null);
});

function parseExperience(extra: Record<string, string>) {
  return experienceInputSchema.safeParse({
    entryKind: "experience",
    companyId: "c-orange-cyberdefense",
    placeId: "p-paris",
    domain: "cybersecurity" satisfies Domain,
    kind: "job",
    year: "2020",
    title: "SOC Analyst",
    ...extra,
  });
}

test("le mois de début fixe l'année, et « en poste » efface la fin", () => {
  const parsed = parseExperience({ startMonth: "2026-03", progress: "current", skills: "SIEM, Splunk" });
  assert.ok(parsed.success);
  assert.deepEqual(careerFieldsFromInput(parsed.data), {
    year: 2026,
    startDate: "2026-03-01",
    endDate: null,
    isCurrent: true,
    skills: ["SIEM", "Splunk"],
  });
});

test("sans statut ni fin, le poste reste « non renseigné »", () => {
  const parsed = parseExperience({});
  assert.ok(parsed.success);
  const fields = careerFieldsFromInput(parsed.data);
  assert.equal(fields.isCurrent, null);
  assert.equal(fields.year, 2020);
});

test("le formulaire refuse une fin avant le début, ou une fin sur un poste en cours", () => {
  assert.equal(parseExperience({ startMonth: "2025-06", endMonth: "2025-01" }).success, false);
  assert.equal(parseExperience({ progress: "current", endMonth: "2025-01" }).success, false);
});
