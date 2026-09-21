import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTACTS, EXPERIENCES } from "../src/lib/data/seed.ts";
import {
  contactToEntry,
  experienceToEntry,
  pickNetworkSample,
} from "../src/lib/entries.ts";
import type { Entry } from "../src/lib/types.ts";

/**
 * L'aperçu de la Couverture montre quelques éléments réels. Ce qui compte : ne
 * rien inventer, et ne dessiner un lien personne → entreprise que s'il existe.
 */

const entries: Entry[] = [
  ...EXPERIENCES.map(experienceToEntry),
  ...CONTACTS.map(contactToEntry),
];

test("l'échantillon ne contient que des éléments réels du réseau", () => {
  const sample = pickNetworkSample(entries);

  assert.ok(sample.company, "aucune entreprise retenue");
  assert.ok(entries.some((e) => e.company.id === sample.company!.id));
  assert.ok(sample.place && entries.some((e) => e.place.id === sample.place!.id));
  assert.equal(sample.alumni?.author.status, "alumni");
  assert.equal(sample.student?.author.status, "student");
});

test("un lien vers l'entreprise n'est marqué que s'il existe vraiment", () => {
  const sample = pickNetworkSample(entries);

  for (const person of [sample.alumni, sample.student]) {
    if (!person) continue;
    const reallyThere = entries.some(
      (e) => e.company.id === sample.company!.id && e.author.id === person.author.id,
    );
    if (person.linked) assert.ok(reallyThere, `${person.author.fullName} n'y est pas passé`);
  }
});

test("l'entreprise qui réunit alumni et étudiants est préférée", () => {
  const sample = pickNetworkSample(entries);
  const statuses = new Set(
    entries.filter((e) => e.company.id === sample.company!.id).map((e) => e.author.status),
  );
  const bestPossible = Math.max(
    ...[...new Set(entries.map((e) => e.company.id))].map(
      (id) => new Set(entries.filter((e) => e.company.id === id).map((e) => e.author.status)).size,
    ),
  );
  assert.equal(statuses.size, bestPossible);
});

test("un réseau vide ne produit rien, sans planter", () => {
  assert.deepEqual(pickNetworkSample([]), {
    company: null,
    place: null,
    alumni: null,
    student: null,
  });
});
