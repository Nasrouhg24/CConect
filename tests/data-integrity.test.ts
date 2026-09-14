import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeCompanyName } from "../src/lib/company-name.ts";
import { PLACES } from "../src/lib/data/places.ts";
import {
  AUTHORS,
  COMPANIES,
  CONTACTS,
  EXPERIENCES,
} from "../src/lib/data/seed.ts";

/**
 * Ces tests valident le graphe : entreprises uniques, aucune référence
 * pendante, aucune coordonnée privée. Ils portent sur le jeu de démonstration,
 * mais les invariants qu'ils vérifient sont ceux que la base impose en
 * production (index unique, clés étrangères, absence de colonne email).
 */

const companyIds = new Set(COMPANIES.map((c) => c.id));
const placeIds = new Set(PLACES.map((p) => p.id));
const authorIds = new Set(AUTHORS.map((a) => a.id));

test("aucune entreprise dupliquée, ni par slug ni par nom canonique", () => {
  const slugs = new Set<string>();
  const canonicals = new Map<string, string>();

  for (const company of COMPANIES) {
    assert.ok(!slugs.has(company.slug), `slug dupliqué : ${company.slug}`);
    slugs.add(company.slug);

    const canonical = normalizeCompanyName(company.name);
    const previous = canonicals.get(canonical);
    assert.equal(
      previous,
      undefined,
      `« ${company.name} » et « ${previous} » partagent la clé ${canonical}`,
    );
    canonicals.set(canonical, company.name);

    assert.equal(
      company.normalizedName,
      canonical,
      `normalizedName désynchronisé pour ${company.name}`,
    );
  }
});

test("tous les contacts sont rattachés à une entreprise existante", () => {
  for (const contact of CONTACTS) {
    assert.ok(
      companyIds.has(contact.company.id),
      `contact ${contact.id} orphelin : ${contact.company.id}`,
    );
    assert.ok(placeIds.has(contact.place.id), `contact ${contact.id} : lieu inconnu`);
    assert.ok(authorIds.has(contact.author.id), `contact ${contact.id} : auteur inconnu`);
  }
});

test("toutes les expériences référencent des entités existantes", () => {
  for (const experience of EXPERIENCES) {
    assert.ok(companyIds.has(experience.company.id), `exp ${experience.id} : entreprise`);
    assert.ok(placeIds.has(experience.place.id), `exp ${experience.id} : lieu`);
    assert.ok(authorIds.has(experience.author.id), `exp ${experience.id} : auteur`);
  }
});

test("aucun identifiant dupliqué dans les entités", () => {
  const check = (label: string, ids: string[]) => {
    assert.equal(new Set(ids).size, ids.length, `identifiants dupliqués dans ${label}`);
  };
  check("contacts", CONTACTS.map((c) => c.id));
  check("expériences", EXPERIENCES.map((e) => e.id));
  check("membres", AUTHORS.map((a) => a.id));
});

test("aucun contact externe ne porte d'email ou de téléphone", () => {
  const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const PHONE = /(?:\+?\d[\s.\-()]?){8,}/;

  for (const contact of CONTACTS) {
    // Seuls les champs écrits par un membre sont concernés : `createdAt` est
    // un horodatage produit par le système, pas du texte libre.
    const fields = Object.entries(contact).filter(
      ([key]) =>
        !(["author", "company", "place", "createdAt", "id"] as string[]).includes(key),
    );
    for (const [key, value] of fields) {
      if (typeof value !== "string") continue;
      assert.ok(!EMAIL.test(value), `contact ${contact.id}.${key} contient un email`);
      assert.ok(!PHONE.test(value), `contact ${contact.id}.${key} contient un téléphone`);
    }
    // Garde-fou structurel : la forme même de l'objet ne doit pas gagner de
    // champ de coordonnées privées au fil des évolutions.
    assert.ok(!("email" in contact), "la structure Contact ne doit pas avoir d'email");
    assert.ok(!("phone" in contact), "la structure Contact ne doit pas avoir de téléphone");
  }
});

test("les lieux ont des coordonnées valides et des identifiants uniques", () => {
  const ids = new Set<string>();
  for (const place of PLACES) {
    assert.ok(!ids.has(place.id), `lieu dupliqué : ${place.id}`);
    ids.add(place.id);
    assert.ok(place.lat >= -90 && place.lat <= 90, `latitude hors bornes : ${place.id}`);
    assert.ok(place.lng >= -180 && place.lng <= 180, `longitude hors bornes : ${place.id}`);
    assert.equal(place.countryCode.length, 2, `code pays invalide : ${place.id}`);
  }
});

test("les URLs stockées sont en https", () => {
  const urls = [
    ...COMPANIES.flatMap((c) => [c.website, c.linkedinUrl, c.logoUrl]),
    ...CONTACTS.map((c) => c.linkedinUrl),
    ...AUTHORS.map((a) => a.linkedinUrl),
  ].filter((u): u is string => Boolean(u));

  for (const url of urls) {
    assert.ok(url.startsWith("https://"), `URL non sécurisée : ${url}`);
  }
});
