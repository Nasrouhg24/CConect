import assert from "node:assert/strict";
import { test } from "node:test";
import { clusterByPlace, isPlottable, summarize } from "../src/lib/entries.ts";
import { CONTACTS, EXPERIENCES } from "../src/lib/data/seed.ts";
import { contactToEntry, experienceToEntry } from "../src/lib/entries.ts";
import type { Entry, Place } from "../src/lib/types.ts";

/**
 * La carte ne dessine pas des entreprises : elle dessine des **villes**, une
 * par lieu, et le panneau ouvre le détail de la ville cliquée. Ces tests
 * verrouillent la transformation « données CConnect → marqueurs » et
 * l'appariement marqueur → entité, qui est ce qu'un clic met en jeu.
 */

const entries: Entry[] = [
  ...EXPERIENCES.map(experienceToEntry),
  ...CONTACTS.map(contactToEntry),
];

const place = (over: Partial<Place>): Place => ({
  id: "p-test",
  city: "Testville",
  countryCode: "MA",
  countryName: "Maroc",
  continent: "africa",
  lat: 33.6,
  lng: -7.6,
  ...over,
});

test("un marqueur par ville, identifié par l'id réel du lieu", () => {
  const clusters = clusterByPlace(entries);

  assert.ok(clusters.length > 0);
  // L'identité d'un marqueur est celle de son lieu : ni un index, ni un nom.
  const ids = clusters.map((c) => c.place.id);
  assert.equal(new Set(ids).size, ids.length, "deux marqueurs pour un lieu");

  for (const cluster of clusters) {
    assert.ok(cluster.place.id.length > 0);
    // Toute entrée du groupe appartient bien au lieu du groupe : c'est
    // exactement ce qu'un clic promet d'afficher.
    for (const entry of cluster.entries) {
      assert.equal(entry.place.id, cluster.place.id);
    }
  }
});

test("le panneau d'un marqueur ne décrit que ce marqueur", () => {
  const clusters = clusterByPlace(entries);
  const paris = clusters.find((c) => c.place.city === "Paris");
  const casa = clusters.find((c) => c.place.city === "Casablanca");
  assert.ok(paris && casa, "villes de référence absentes du jeu de démo");

  const parisSummary = summarize(paris.entries);
  const casaSummary = summarize(casa.entries);

  // Aucune entrée d'une ville ne fuit dans le résumé de l'autre.
  for (const { company } of parisSummary.companies) {
    assert.ok(
      paris.entries.some((e) => e.company.slug === company.slug),
      `${company.name} n'est pas à Paris`,
    );
  }
  assert.equal(
    parisSummary.experiences + parisSummary.contacts,
    paris.entries.length,
  );
  assert.equal(
    casaSummary.experiences + casaSummary.contacts,
    casa.entries.length,
  );
});

test("deux entreprises au même endroit restent toutes les deux accessibles", () => {
  const clusters = clusterByPlace(entries);
  const shared = clusters.find(
    (c) => new Set(c.entries.map((e) => e.company.slug)).size > 1,
  );
  assert.ok(shared, "aucune ville ne porte deux entreprises dans le jeu de démo");

  const companies = summarize(shared.entries).companies;
  assert.ok(companies.length > 1);
  // Le regroupement par ville ne fait disparaître aucune entreprise : elles
  // sont toutes listées dans le panneau, avec leur compte.
  const total = companies.reduce((sum, c) => sum + c.count, 0);
  assert.equal(total, shared.entries.length);
});

test("une coordonnée douteuse ne produit jamais de marqueur", () => {
  const rejected: Partial<Place>[] = [
    { lat: Number.NaN, lng: 2.3 },
    { lat: 48.8, lng: Number.NaN },
    { lat: Number.POSITIVE_INFINITY, lng: 2.3 },
    // Hors plage : une saisie inversée ou une unité erronée.
    { lat: 120, lng: 2.3 },
    { lat: 48.8, lng: -400 },
    // Repli d'une ligne incomplète (voir `mapPlace`) : aucune ville en 0,0.
    { lat: 0, lng: 0 },
  ];

  for (const over of rejected) {
    assert.equal(isPlottable(place(over)), false, JSON.stringify(over));
  }
});

test("les villes réelles du réseau sont toutes plaçables", () => {
  for (const cluster of clusterByPlace(entries)) {
    assert.equal(
      isPlottable(cluster.place),
      true,
      `${cluster.place.city} n'est pas plaçable`,
    );
  }
});
