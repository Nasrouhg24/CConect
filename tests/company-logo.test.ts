import assert from "node:assert/strict";
import { test } from "node:test";
import { companyInitials } from "../src/lib/company-name.ts";
import { domainFromWebsite, normalizeDomain } from "../src/lib/company-domain.ts";
import { buildLogoSrc } from "../src/lib/logo-provider.ts";
import { COMPANIES } from "../src/lib/data/seed.ts";

/**
 * Le logo d'une entreprise n'est pas un fichier : c'est une URL calculée à
 * partir de son domaine. Ces tests verrouillent les trois maillons de cette
 * chaîne — normalisation du domaine, construction de l'URL, monogramme de
 * repli — et le fait qu'aucun domaine ne soit inventé.
 */

test("une URL de site se réduit toujours au même domaine", () => {
  const cases: [string, string][] = [
    ["https://www.microsoft.com/", "microsoft.com"],
    ["https://microsoft.com", "microsoft.com"],
    ["www.microsoft.com", "microsoft.com"],
    ["MICROSOFT.COM", "microsoft.com"],
    ["  https://Microsoft.com/fr-fr/about?x=1#top  ", "microsoft.com"],
    // Le point final de la forme absolue et le port ne changent pas la marque.
    ["https://ocpgroup.ma.", "ocpgroup.ma"],
    ["http://OCPGROUP.MA:8443/carrieres", "ocpgroup.ma"],
    // Un sous-domaine autre que `www` est une marque à part entière.
    ["https://aws.amazon.com/console", "aws.amazon.com"],
    // Des identifiants glissés dans l'URL ne doivent pas devenir le domaine.
    ["https://user:secret@capgemini.com/x", "capgemini.com"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normalizeDomain(input), expected, input);
  }
});

test("ce qui n'est pas un domaine ne devient jamais un domaine", () => {
  const rejected = [
    null,
    undefined,
    "",
    "   ",
    "invalid",
    "invalid-domain",
    // Pas de marque publique derrière un hôte interne ou une adresse IP.
    "http://localhost:3000",
    "192.168.0.1",
    "https://10.0.0.1/logo",
    "-microsoft.com",
    "microsoft-.com",
    "micro soft.com",
    // TLD numérique : c'est une IP déguisée, aucun fournisseur ne la résout.
    "example.123",
    `${"a".repeat(64)}.com`,
  ];

  for (const input of rejected) {
    assert.equal(normalizeDomain(input), null, String(input));
  }
});

test("le domaine d'une fiche sort de son site web, jamais de son nom", () => {
  for (const company of COMPANIES) {
    assert.equal(
      company.domain,
      domainFromWebsite(company.website),
      company.name,
    );
    // Aucune fiche sans site ne se voit attribuer un domaine.
    if (!company.website) assert.equal(company.domain, null, company.name);
  }

  // Le jeu de démonstration doit effectivement exercer le chemin nominal :
  // un test qui passerait sur seize `null` ne prouverait rien.
  assert.ok(COMPANIES.some((c) => c.domain !== null));
});

test("l'URL du fournisseur est déterministe et signale les logos absents", () => {
  const src = buildLogoSrc("microsoft.com", 36, "pk_test");
  assert.ok(src, "une URL est attendue avec un domaine et un jeton");

  const url = new URL(src);
  assert.equal(url.origin + url.pathname, "https://img.logo.dev/microsoft.com");
  assert.equal(url.searchParams.get("token"), "pk_test");
  // Le double de la boîte : net sur un écran à haute densité.
  assert.equal(url.searchParams.get("size"), "72");
  /* `fallback=404` est ce qui rend le repli possible : sans lui le service
     répond 200 avec son propre monogramme, l'image n'est jamais en erreur, et
     notre monogramme ne s'affiche jamais. */
  assert.equal(url.searchParams.get("fallback"), "404");

  assert.equal(buildLogoSrc("microsoft.com", 36, "pk_test"), src);
});

test("sans domaine ou sans jeton, aucune requête n'est construite", () => {
  assert.equal(buildLogoSrc(null, 36, "pk_test"), null);
  assert.equal(buildLogoSrc(undefined, 36, "pk_test"), null);
  assert.equal(buildLogoSrc("", 36, "pk_test"), null);
  // Jeton absent : l'application n'émet rien vers le tiers, et affiche des
  // monogrammes. C'est le mode par défaut du projet.
  assert.equal(buildLogoSrc("microsoft.com", 36, ""), null);
});

test("le monogramme de repli reste lisible quel que soit le nom", () => {
  const cases: [string, string][] = [
    ["Orange Cyberdefense", "OC"],
    ["OCP Group", "OG"],
    ["Amazon Web Services", "AW"],
    // Un seul mot : ses deux premières lettres. Produire « MS » pour Microsoft
    // demanderait une table de marques, exactement ce que ce système évite.
    ["Microsoft", "MI"],
    // Ponctuation et accents ne doivent jamais ressortir dans la pastille.
    ["Booking.com", "BC"],
    ["Société Générale", "SG"],
    ["  ", "?"],
    ["!!!", "?"],
  ];

  for (const [name, expected] of cases) {
    assert.equal(companyInitials(name), expected, name);
    assert.match(companyInitials(name), /^[A-Z0-9?]{1,2}$/, name);
  }
});

test("corpus réel : domaine extrait et URL Logo.dev pour chaque entreprise", async () => {
  const { LOGO_CASES } = await import("./logo-corpus.ts");
  assert.ok(LOGO_CASES.length >= 20);

  for (const c of LOGO_CASES) {
    const domain = domainFromWebsite(c.website);
    assert.equal(domain, c.domain, `${c.name} : ${String(c.website)}`);

    const src = buildLogoSrc(domain, 36, "pk_test");
    if (c.expect === "none") {
      assert.equal(src, null, `${c.name} : aucune requête ne doit partir`);
      continue;
    }
    assert.ok(src, `${c.name} : URL attendue`);
    const url = new URL(src);
    assert.equal(url.origin, "https://img.logo.dev");
    // Le domaine canonique est le seul segment du chemin : ni schéma, ni
    // `www.`, ni majuscule, ni chemin de page ne doivent y survivre.
    assert.equal(decodeURIComponent(url.pathname.slice(1)), c.domain, c.name);
    assert.doesNotMatch(url.pathname, /www\.|https?:|[A-Z]|\/.*\//, c.name);
    assert.equal(url.searchParams.get("fallback"), "404", c.name);
  }
});
