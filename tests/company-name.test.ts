import assert from "node:assert/strict";
import { test } from "node:test";
import {
  companyInitials,
  companySlug,
  monogramTint,
  normalizeCompanyName,
} from "../src/lib/company-name.ts";

test("les variantes juridiques d'un même nom se réduisent à la même clé", () => {
  const canonical = normalizeCompanyName("Microsoft");
  for (const variant of [
    "Microsoft Corporation",
    "Microsoft Corp.",
    "MICROSOFT",
    "  microsoft  ",
    "Microsoft, Inc.",
  ]) {
    assert.equal(
      normalizeCompanyName(variant),
      canonical,
      `${variant} devrait se réduire à « ${canonical} »`,
    );
  }
});

test("deux entreprises différentes gardent des clés différentes", () => {
  assert.notEqual(
    normalizeCompanyName("Orange Cyberdefense"),
    normalizeCompanyName("Orange Business"),
  );
  assert.notEqual(
    normalizeCompanyName("Attijariwafa Bank"),
    normalizeCompanyName("Bank Of Africa"),
  );
});

test("les accents et la ponctuation n'influencent pas la clé", () => {
  assert.equal(normalizeCompanyName("Société Générale"), "societe generale");
  assert.equal(normalizeCompanyName("Booking.com"), "booking com");
});

test("un nom réduit à un suffixe juridique ne devient jamais vide", () => {
  assert.equal(normalizeCompanyName("Group"), "group");
  assert.equal(normalizeCompanyName("SA"), "sa");
});

test("le slug est stable et sûr pour une URL", () => {
  assert.equal(companySlug("Amazon Web Services"), "amazon-web-services");
  assert.equal(companySlug("Booking.com"), "booking-com");
  assert.equal(companySlug("Société Générale"), "societe-generale");
  assert.equal(companySlug("!!!"), "entreprise");
});

test("les initiales du monogramme couvrent les cas limites", () => {
  assert.equal(companyInitials("Microsoft"), "MI");
  assert.equal(companyInitials("Orange Cyberdefense"), "OC");
  assert.equal(companyInitials("OCP Group"), "OG");
  assert.equal(companyInitials(""), "?");
});

test("la teinte du monogramme est déterministe et insensible au suffixe", () => {
  assert.equal(monogramTint("Microsoft"), monogramTint("Microsoft Corp."));
  assert.equal(monogramTint("Stripe"), monogramTint("Stripe"));
});
