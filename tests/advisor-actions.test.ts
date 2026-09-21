import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAdvisorReport } from "../src/lib/advisor.ts";
import { MAX_PLAN_ACTIONS, buildActionPlan, type ActionPlan } from "../src/lib/advisor-actions.ts";
import { contactToEntry, experienceToEntry } from "../src/lib/entries.ts";
import { COMPANIES, CONTACTS, EXPERIENCES } from "../src/lib/data/seed.ts";
import { PLACES } from "../src/lib/data/places.ts";
import type { Author, CareerProfile, Company, Entry, ExperienceKind, StudyYear } from "../src/lib/types.ts";

/* Fixtures de test uniquement — jamais importées par l'application. */

const paris = PLACES.find((p) => p.id === "p-paris")!;
const berlin = PLACES.find((p) => p.id === "p-berlin")!;
const orange = COMPANIES.find((c) => c.slug === "orange-cyberdefense")!;
const deloitte = COMPANIES.find((c) => c.slug === "deloitte")!;

function member(id: string, status: Author["status"], studyYear: StudyYear | null = null): Author {
  return {
    id,
    fullName: `Test ${id}`,
    campus: "rabat",
    status,
    promotion: status === "alumni" ? 2021 : 2027,
    linkedinUrl: null,
    contactEmail: null,
    studyYear,
    openToMentoring: null,
  };
}

let seq = 0;
function record(author: Author, kind: ExperienceKind, year: number, extra: Partial<Entry> = {}): Entry {
  seq += 1;
  return {
    id: `a-${seq}`,
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

function careerProfile(author: Author, extra: Partial<Omit<CareerProfile, "member">> = {}): CareerProfile {
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

function plan(
  profile: CareerProfile,
  entries: Entry[],
  { companies = COMPANIES, own = [] as Entry[] }: { companies?: Company[]; own?: Entry[] } = {},
): ActionPlan {
  const all = [...entries, ...own];
  const report = buildAdvisorReport({ profile, entries: all, companies, places: PLACES });
  return buildActionPlan({ report, profile, ownEntries: own });
}

const ids = (p: ActionPlan) => p.actions.map((a) => a.id);
const find = (p: ActionPlan, id: string) => p.actions.find((a) => a.id === id);

const complete = (author: Author, extra: Partial<Omit<CareerProfile, "member">> = {}) =>
  careerProfile(author, {
    targetDomain: "cybersecurity",
    targetRole: "SOC Analyst",
    targetCountries: ["FR"],
    skills: ["Python"],
    ...extra,
  });

const peers = () => [
  record(member("p1", "student"), "pfa", 2024),
  record(member("p2", "student"), "pfe", 2025),
  record(member("p3", "student"), "pfe", 2025),
];

/* ------------------------------------------------ objectif PFA / PFE / carrière -- */

for (const year of ["third", "fourth"] as const) {
  test(`${year === "third" ? "3e" : "4e"} année → action d'exploration pour un PFA`, () => {
    const p = plan(complete(member("me", "student", year)), peers());
    const action = find(p, "explore-pfa");
    assert.ok(action, ids(p).join(","));
    assert.match(action.title, /PFA/);
    assert.doesNotMatch(action.title, /PFE/);
    assert.match(action.href, /kind=pfa/);
    assert.match(action.description, /^1 PFA déjà réalisé/);
    assert.ok(action.evidence.includes(`Tu es en ${year === "third" ? "3e" : "4e"} année`));
  });
}

test("dernière année → action d'exploration pour un PFE", () => {
  const p = plan(complete(member("me", "student", "final")), peers());
  const action = find(p, "explore-pfe");
  assert.ok(action);
  assert.match(action.title, /PFE/);
  assert.match(action.href, /kind=pfe/);
  assert.match(action.description, /^2 PFE déjà réalisés/);
  assert.equal(find(p, "explore-pfa"), undefined);
});

test("alumni → opportunités professionnelles, jamais un stage", () => {
  const p = plan(
    complete(member("me", "alumni")),
    [record(member("x", "alumni"), "job", 2025, { isCurrent: true, startDate: "2025-01-01" })],
  );
  assert.ok(find(p, "explore-career"));
  assert.ok(find(p, "mentoring-consent"));
  for (const a of p.actions) assert.doesNotMatch(`${a.title} ${a.description}`, /\bPF[AE]\b/);
});

/* ------------------------------------------------------------- profil -- */

test("profil vide → accueil en 5 étapes et action de profil prioritaire", () => {
  const p = plan(careerProfile(member("me", "student")), peers());
  assert.ok(p.onboarding);
  assert.deepEqual(
    p.onboarding.map((s) => s.label),
    ["Année d'études", "Domaine", "Type d'expérience recherché", "Pays", "Rôle cible"],
  );
  assert.ok(p.onboarding.every((s) => !s.done));
  assert.equal(p.actions[0].id, "profile-goal");
  assert.equal(p.actions[0].priority, "high");
  assert.equal(p.actions[0].href, "/profile#parcours");
  // Sans critère, aucune connexion n'est proposée, même si le réseau en contient.
  assert.equal(find(p, "connections"), undefined);
});

test("sans domaine visé → objectif prioritaire, avec le domaine dans le « Pourquoi ? »", () => {
  const p = plan(complete(member("me", "student", "fourth"), { targetDomain: null }), peers());
  const action = find(p, "profile-goal");
  assert.ok(action);
  assert.equal(action.priority, "high");
  assert.ok(action.evidence.includes("Non renseigné : ton domaine visé"));
  assert.equal(p.onboarding, null);
});

test("sans pays visé → précision de profil, priorité moyenne", () => {
  const p = plan(complete(member("me", "student", "fourth"), { targetCountries: [] }), peers());
  const action = find(p, "profile-goal");
  assert.ok(action);
  assert.equal(action.priority, "medium");
  assert.equal(action.title, "Précise ton profil");
  assert.equal(action.description, "Pas encore renseigné dans ton profil : tes pays visés.");
});

test("le vocabulaire ne dit jamais qu'il « manque » quelque chose", () => {
  const scenarios = [
    plan(careerProfile(member("a", "student")), peers()),
    plan(complete(member("b", "student", "fourth"), { skills: ["Rust"] }), [
      record(member("c", "alumni"), "pfa", 2024, { skills: ["SIEM"] }),
      record(member("d", "alumni"), "pfa", 2024, { skills: ["SIEM"] }),
    ]),
  ];
  for (const p of scenarios) {
    for (const a of p.actions) {
      const text = [a.title, a.description, ...a.evidence].join(" ");
      assert.doesNotMatch(text, /manque|lacks|tu n'as pas|il te manque/i, text);
    }
  }
});

/* --------------------------------------------------------- connexions -- */

test("connexions pertinentes : le nombre est celui des personnes réelles", () => {
  const entries = [
    record(member("x", "alumni"), "job", 2025, { isCurrent: true, startDate: "2025-02-01" }),
    record(member("y", "alumni"), "job", 2024, { isCurrent: true, startDate: "2024-02-01" }),
    record(member("y", "alumni"), "pfe", 2023),
    record(member("z", "student"), "pfa", 2024),
  ];
  const p = plan(complete(member("me", "student", "fourth")), entries);
  const action = find(p, "connections");
  assert.ok(action);
  assert.equal(action.priority, "high");
  assert.equal(action.description, "2 connexions UM6P travaillent actuellement dans ton périmètre.");
  assert.ok(action.evidence.includes("3 membres correspondent à ces critères"));
  assert.match(action.href, /relation=current/);
});

test("connexions hors des pays visés : pas d'action", () => {
  const p = plan(complete(member("me", "student", "fourth")), [
    record(member("x", "alumni"), "pfa", 2024, { place: berlin }),
  ]);
  assert.equal(find(p, "connections"), undefined);
});

/* --------------------------------------------------- entreprises cibles -- */

test("entreprise cible présente avec des membres → lien vers sa fiche", () => {
  const p = plan(complete(member("me", "student", "fourth"), { targetCompanies: ["orange-cyberdefense"] }), peers());
  const action = find(p, "target-companies");
  assert.ok(action);
  assert.equal(action.priority, "high");
  assert.equal(action.href, "/companies/orange-cyberdefense#connexions");
  assert.match(action.description, /^1 entreprise cible présente dans CConnect, dont 1 avec des membres UM6P/);
  assert.ok(action.evidence.includes("Orange Cyberdefense : 3 membres UM6P, dont 3 passés en stage"), action.evidence.join(" | "));
});

test("plusieurs entreprises cibles → la liste du conseiller, comptes exacts", () => {
  const p = plan(
    complete(member("me", "student", "fourth"), { targetCompanies: ["orange-cyberdefense", "deloitte"] }),
    peers(),
  );
  const action = find(p, "target-companies");
  assert.ok(action);
  assert.equal(action.href, "/advisor#advisor-companies");
  assert.match(action.description, /^2 entreprises cibles présentes dans CConnect, dont 1 avec/);
});

test("entreprise cible absente de CConnect → « Élargis ta recherche », rien d'inventé", () => {
  const p = plan(
    complete(member("me", "student", "fourth"), { targetCompanies: ["entreprise-inconnue"] }),
    peers(),
  );
  assert.equal(find(p, "target-companies"), undefined);
  const action = find(p, "broaden-search");
  assert.ok(action);
  assert.doesNotMatch(action.description, /entreprise-inconnue/);
});

/* ------------------------------------------------ parcours du membre -- */

test("expériences sans date ni statut → compléter son parcours, lien vers la fiche", () => {
  const me = member("me", "alumni");
  const own = [
    record(me, "pfe", 2020, { company: deloitte }),
    record(me, "job", 2022, { company: orange }),
  ];
  const p = plan(complete(me), [], { own });
  const action = find(p, "career-record");
  assert.ok(action);
  assert.equal(action.priority, "high", "un emploi sans statut compte comme important");
  assert.ok(action.evidence.includes("2 expériences sans mois de début"));
  assert.ok(action.evidence.includes("1 emploi sans statut (en poste ou terminé)"));
  assert.equal(action.href, "/companies/deloitte#experiences");
  assert.equal(action.label, "Modifier mon parcours");
});

test("expériences datées et statut renseigné → pas d'action de parcours", () => {
  const me = member("me", "alumni");
  const own = [
    record(me, "job", 2022, { startDate: "2022-09-01", endDate: "2024-01-01", isCurrent: false }),
  ];
  assert.equal(find(plan(complete(me), [], { own }), "career-record"), undefined);
});

/* --------------------------------------------------------- compétences -- */

test("compétences fréquentes → comparaison formulée sans jugement", () => {
  const p = plan(complete(member("me", "student", "fourth"), { skills: ["python"] }), [
    record(member("a", "alumni"), "pfa", 2024, { skills: ["SIEM", "Python"] }),
    record(member("b", "alumni"), "pfa", 2024, { skills: ["siem", "Python"] }),
  ]);
  const action = find(p, "skills");
  assert.ok(action);
  assert.ok(
    action.evidence.includes(
      "SIEM apparaît dans 2 expériences pertinentes et n'est pas actuellement renseigné dans ton profil",
    ),
    action.evidence.join(" | "),
  );
  assert.ok(action.evidence.includes("Déjà dans ton profil : Python"));
});

test("données de compétences insuffisantes → pas d'action compétences", () => {
  const p = plan(complete(member("me", "student", "fourth")), [
    record(member("a", "alumni"), "pfa", 2024, { skills: ["SIEM"] }),
    record(member("b", "alumni"), "pfa", 2024, { skills: ["Linux"] }),
  ]);
  assert.equal(find(p, "skills"), undefined);
});

test("profil sans compétences → pas de comparaison, même si le réseau en a", () => {
  const p = plan(complete(member("me", "student", "fourth"), { skills: [] }), [
    record(member("a", "alumni"), "pfa", 2024, { skills: ["SIEM"] }),
    record(member("b", "alumni"), "pfa", 2024, { skills: ["SIEM"] }),
  ]);
  assert.equal(find(p, "skills"), undefined);
  assert.ok(find(p, "profile-goal")?.evidence.some((e) => /1 compétence revient/.test(e)));
});

/* ------------------------------------------------------------ parcours -- */

test("un parcours suivi par une seule personne n'est pas proposé", () => {
  const a = member("a", "alumni");
  const p = plan(complete(member("me", "student", "fourth")), [record(a, "pfa", 2020), record(a, "pfe", 2021)]);
  assert.equal(find(p, "paths"), undefined);
});

test("un parcours partagé par au moins deux personnes est proposé", () => {
  const a = member("a", "alumni");
  const b = member("b", "alumni");
  const p = plan(complete(member("me", "student", "fourth")), [
    record(a, "pfa", 2020),
    record(a, "pfe", 2021),
    record(b, "pfa", 2021),
    record(b, "pfe", 2022),
  ]);
  const action = find(p, "paths");
  assert.ok(action);
  assert.deepEqual(action.evidence, ["PFA → PFE : suivi par 2 membres"]);
  assert.equal(action.href, "/advisor#advisor-paths");
});

/* ----------------------------------------------------- invariants globaux -- */

function richScenario(): ActionPlan {
  const me = member("me", "student", "fourth");
  const a = member("a", "alumni");
  const b = member("b", "alumni");
  return plan(
    careerProfile(me, {
      targetDomain: "cybersecurity",
      targetCountries: ["FR"],
      targetCompanies: ["orange-cyberdefense", "deloitte"],
      skills: ["Python"],
    }),
    [
      record(a, "pfa", 2020, { skills: ["SIEM"] }),
      record(a, "job", 2022, { isCurrent: true, startDate: "2022-01-01", skills: ["SIEM"] }),
      record(b, "pfa", 2021, { skills: ["SIEM"] }),
      record(b, "job", 2023, { company: deloitte, skills: ["Splunk"] }),
      { ...record(a, "pfa", 2020), author: { ...a, openToMentoring: true } },
    ],
    { own: [record(me, "pfa", 2025, { company: deloitte })] },
  );
}

test("jamais plus de 5 actions, triées par priorité puis par catégorie", () => {
  const p = richScenario();
  assert.ok(p.actions.length <= MAX_PLAN_ACTIONS);
  assert.equal(p.actions.length, MAX_PLAN_ACTIONS, "le scénario riche doit remplir le plan");
  const rank = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < p.actions.length; i += 1) {
    assert.ok(rank[p.actions[i - 1].priority] <= rank[p.actions[i].priority], ids(p).join(","));
  }
  assert.equal(p.actions[0].priority, "high");
});

test("le plan est déterministe", () => {
  assert.deepEqual(richScenario(), richScenario());
});

const ROUTES = [
  /^\/network\?[a-z]+=[A-Za-z0-9_-]+(&[a-z]+=[A-Za-z0-9_-]+)*$/,
  /^\/network$/,
  /^\/people(\?[a-z]+=[A-Za-z0-9_-]+(&[a-z]+=[A-Za-z0-9_-]+)*)?$/,
  /^\/companies\/[a-z0-9-]+#(connexions|experiences)$/,
  /^\/advisor#advisor-(companies|skills|paths|people)$/,
  /^\/profile#parcours$/,
  /^\/contribute$/,
];

test("toutes les actions pointent vers une route interne existante", () => {
  const scenarios = [
    richScenario(),
    plan(careerProfile(member("s", "student")), peers()),
    plan(complete(member("f", "student", "final")), peers()),
    plan(complete(member("al", "alumni")), peers(), { own: [record(member("al", "alumni"), "job", 2020)] }),
    plan(careerProfile(member("e", "alumni")), []),
  ];
  for (const p of scenarios) {
    for (const a of p.actions) {
      assert.ok(ROUTES.some((re) => re.test(a.href)), `route inconnue : ${a.href}`);
      assert.ok(a.label.length > 0 && a.title.length > 0);
    }
  }
});

test("aucune personne ni entreprise citée n'est absente des données d'entrée", () => {
  const p = richScenario();
  const text = p.actions.flatMap((a) => [a.title, a.description, ...a.evidence]).join("\n");
  const known = new Set(["Test a", "Test b", "Test me"]);
  for (const m of text.matchAll(/Test [a-z0-9]+/g)) assert.ok(known.has(m[0]), m[0]);
  const companyNames = new Set(COMPANIES.map((c) => c.name));
  for (const m of text.matchAll(/(?:cibles : |chez )([A-Z][\w .-]+?)(?:,|$|\n| :)/g)) {
    for (const name of m[1].split(", ")) assert.ok(companyNames.has(name.trim()), name);
  }
});

test("base vide → aucune action fondée sur le réseau", () => {
  for (const profile of [
    complete(member("s", "student", "fourth"), { targetCompanies: ["orange-cyberdefense"] }),
    complete(member("f", "student", "final")),
    careerProfile(member("e", "student")),
    complete(member("al", "alumni")),
  ]) {
    const p = plan(profile, [], { companies: [] });
    const allowed = new Set(["profile-goal", "broaden-search", "profile-first-experience", "mentoring-consent"]);
    for (const id of ids(p)) assert.ok(allowed.has(id), `action inventée sur base vide : ${id}`);
    for (const a of p.actions) assert.doesNotMatch(a.description, /\b0 /, a.description);
  }
});

test("le jeu de démo complet ne produit que des comptes vérifiables", () => {
  const entries = [...EXPERIENCES.map(experienceToEntry), ...CONTACTS.map(contactToEntry)];
  const me = member("u-test", "student", "fourth");
  const profile = complete(me, { targetCountries: [] });
  const report = buildAdvisorReport({ profile, entries, companies: COMPANIES, places: PLACES });
  const p = buildActionPlan({ report, profile, ownEntries: [] });
  const connections = find(p, "connections");
  if (connections) {
    assert.match(connections.description, new RegExp(`^${report.connections.people} membre`));
  }
  const explore = find(p, "explore-pfa");
  if (explore && report.opportunities.count > 0) {
    assert.match(explore.description, new RegExp(`^${report.opportunities.count} PFA`));
  }
});

test("ses propres contacts ne comptent pas comme entreprise à explorer", () => {
  const me = member("me", "student", "final");
  const ownContact: Entry = { ...record(me, "pfa", 2025, { company: deloitte }), entryKind: "contact", experienceKind: null };
  const profile = complete(me, { targetCountries: [] });
  const report = buildAdvisorReport({ profile, entries: [ownContact], companies: COMPANIES, places: PLACES });
  assert.equal(report.companies.total, 0);
  assert.equal(find(buildActionPlan({ report, profile, ownEntries: [ownContact] }), "explore-pfe"), undefined);
});

test("plusieurs pays visés → listes exactes du conseiller, pas un filtre qui en perd", () => {
  const p = plan(complete(member("me", "student", "fourth"), { targetCountries: ["FR", "DE"] }), [
    ...peers(),
    record(member("q", "alumni"), "pfa", 2023, { place: berlin }),
  ]);
  assert.equal(find(p, "connections")?.href, "/advisor#advisor-people");
  assert.equal(find(p, "explore-pfa")?.href, "/advisor#advisor-companies");
  const single = plan(complete(member("me", "student", "fourth")), peers());
  assert.match(find(single, "explore-pfa")!.href, /^\/network\?/);
});

test("des entreprises cibles sans donnée ne déclenchent pas l'exploration", () => {
  const p = plan(
    complete(member("me", "student", "third"), {
      targetDomain: "product_design",
      targetCountries: ["DE"],
      targetCompanies: ["siemens", "airbus"],
    }),
    peers(),
  );
  assert.ok(find(p, "target-companies"));
  assert.equal(find(p, "explore-pfa"), undefined);
});

test("alumni : la phrase d’exploration ne contient que des comptes non nuls", () => {
  const p = plan(complete(member("me", "alumni")), [record(member("x", "student"), "pfa", 2024)], {
    companies: [],
  });
  const action = find(p, "explore-career");
  assert.ok(action);
  assert.equal(action.description, "1 entreprise et 1 membre du réseau dans ton périmètre.");
  assert.doesNotMatch(action.description, /\b0 /);
});
