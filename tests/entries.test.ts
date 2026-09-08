import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSuggestions,
  clusterByPlace,
  computeStats,
  contactToEntry,
  experienceToEntry,
  filterEntries,
  summarize,
} from "../src/lib/entries.ts";
import { CONTACTS, EXPERIENCES, JOB_OFFERS } from "../src/lib/data/seed.ts";
import { isOfferExpired, splitByExpiry } from "../src/lib/offers.ts";
import {
  findPrivateContactDetails,
  parseTechnologies,
} from "../src/lib/validation.ts";
import { EMPTY_FILTERS } from "../src/lib/types.ts";

const ENTRIES = [
  ...EXPERIENCES.map(experienceToEntry),
  ...CONTACTS.map(contactToEntry),
];

test("un filtre vide laisse passer toutes les entrées", () => {
  assert.equal(filterEntries(ENTRIES, EMPTY_FILTERS).length, ENTRIES.length);
});

test("les filtres se combinent en ET, pas en OU", () => {
  const cyber = filterEntries(ENTRIES, { ...EMPTY_FILTERS, domain: "cybersecurity" });
  const cyberAlumni = filterEntries(ENTRIES, {
    ...EMPTY_FILTERS,
    domain: "cybersecurity",
    status: "alumni",
  });
  assert.ok(cyberAlumni.length > 0, "le jeu de démo doit couvrir ce croisement");
  assert.ok(cyberAlumni.length <= cyber.length);
  assert.ok(
    cyberAlumni.every((e) => e.domain === "cybersecurity" && e.author.status === "alumni"),
  );
});

test("la recherche libre accepte les noms de pays en anglais", () => {
  const germany = filterEntries(ENTRIES, { ...EMPTY_FILTERS, q: "germany" });
  assert.ok(germany.length > 0);
  assert.ok(germany.every((e) => e.place.countryCode === "DE"));
});

test("la recherche libre combine plusieurs termes", () => {
  const results = filterEntries(ENTRIES, { ...EMPTY_FILTERS, q: "cybersecurity paris" });
  assert.ok(results.length > 0);
  assert.ok(
    results.every((e) => e.domain === "cybersecurity" && e.place.city === "Paris"),
  );
});

test("la recherche ignore accents et casse", () => {
  const a = filterEntries(ENTRIES, { ...EMPTY_FILTERS, q: "MONTREAL" });
  const b = filterEntries(ENTRIES, { ...EMPTY_FILTERS, q: "montréal" });
  assert.deepEqual(
    a.map((e) => e.id),
    b.map((e) => e.id),
  );
});

test("le regroupement par ville conserve toutes les entrées", () => {
  const clusters = clusterByPlace(ENTRIES);
  const total = clusters.reduce((sum, c) => sum + c.entries.length, 0);
  assert.equal(total, ENTRIES.length);
  for (const cluster of clusters) {
    assert.equal(
      cluster.experienceCount + cluster.contactCount,
      cluster.entries.length,
    );
    assert.ok(
      cluster.entries.every((e) => e.place.id === cluster.place.id),
      "une entrée est rangée dans la mauvaise ville",
    );
  }
});

test("les clusters sont triés du plus dense au moins dense", () => {
  const sizes = clusterByPlace(ENTRIES).map((c) => c.entries.length);
  assert.deepEqual(sizes, [...sizes].sort((a, b) => b - a));
});

test("les statistiques comptent des entités distinctes", () => {
  const stats = computeStats(ENTRIES);
  assert.equal(stats.experiences + stats.contacts, ENTRIES.length);
  assert.equal(stats.cities, new Set(ENTRIES.map((e) => e.place.id)).size);
  assert.equal(stats.countries, new Set(ENTRIES.map((e) => e.place.countryCode)).size);
  assert.equal(stats.companies, new Set(ENTRIES.map((e) => e.company.slug)).size);
});

test("le résumé d'entreprise agrège offres, contacts et domaines", () => {
  const microsoft = ENTRIES.filter((e) => e.company.slug === "microsoft");
  const summary = summarize(microsoft);
  assert.equal(summary.experiences + summary.contacts, microsoft.length);
  assert.equal(summary.companies.length, 1);
  assert.ok(summary.years !== null && summary.years.min <= summary.years.max);
});

test("l'autocomplétion propose l'entreprise avant la ville", () => {
  const suggestions = buildSuggestions(ENTRIES, "micro");
  assert.ok(suggestions.length > 0);
  assert.equal(suggestions[0].kind, "company");
  assert.equal(suggestions[0].label, "Microsoft");
  assert.deepEqual(suggestions[0].patch, { company: "microsoft" });
});

test("l'autocomplétion reste muette sous deux caractères", () => {
  assert.deepEqual(buildSuggestions(ENTRIES, "m"), []);
});

test("choisir une suggestion produit un filtre qui renvoie des résultats", () => {
  for (const suggestion of buildSuggestions(ENTRIES, "paris")) {
    const results = filterEntries(ENTRIES, { ...EMPTY_FILTERS, ...suggestion.patch });
    assert.ok(results.length > 0, `filtre vide pour ${suggestion.label}`);
  }
});

test("le garde-fou refuse emails et téléphones, accepte le reste", () => {
  assert.equal(findPrivateContactDetails("Contacte moi : a.b@um6p.ma"), "l'adresse email");
  assert.equal(
    findPrivateContactDetails("Appelle au +212 6 12 34 56 78"),
    "le numéro de téléphone",
  );
  assert.equal(findPrivateContactDetails("Stage de 6 mois en 2026, équipe de 12"), null);
  assert.equal(
    findPrivateContactDetails("Candidatures du 2026-01-05 au 2026-06-30"),
    null,
    "une plage de dates ne doit pas passer pour un numéro",
  );
});

test("la liste de technologies est nettoyée, dédupliquée et bornée", () => {
  assert.deepEqual(parseTechnologies("Python, python , SQL"), ["Python", "SQL"]);
  assert.deepEqual(parseTechnologies(undefined), []);
  assert.equal(parseTechnologies(Array.from({ length: 20 }, (_, i) => `T${i}`).join(",")).length, 12);
});

test("le partage des offres par expiration est exhaustif", () => {
  const { open, expired } = splitByExpiry(JOB_OFFERS);
  assert.equal(open.length + expired.length, JOB_OFFERS.length);
  assert.ok(expired.every((o) => isOfferExpired(o)));
  assert.ok(open.every((o) => !isOfferExpired(o)));
});

test("une offre sans date d'expiration n'expire jamais", () => {
  const permanent = JOB_OFFERS.find((o) => o.expiresAt === null);
  assert.ok(permanent, "le jeu de démo doit contenir une offre sans échéance");
  assert.equal(isOfferExpired(permanent, Date.now() + 1e12), false);
});
