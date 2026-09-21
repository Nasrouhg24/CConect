/* Ce fichier configure l'environnement AVANT d'importer la CSP : le jeton est
   lu au chargement du module (`src/lib/env.ts`), comme toute variable
   `NEXT_PUBLIC_` que le bundler remplace à la compilation. Le lanceur de tests
   de Node donne un processus par fichier, donc ce réglage ne fuit pas sur les
   autres tests — ceux de `tests/security.test.ts` vérifient la CSP sans jeton. */
process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN = "pk_test_token";

import assert from "node:assert/strict";
import { test } from "node:test";

const { buildContentSecurityPolicy } = await import("../src/lib/csp.ts");

test("le fournisseur de logos n'est ouvert dans img-src que s'il est configuré", () => {
  const csp = buildContentSecurityPolicy("nonce-abc");
  const imgSrc = csp
    .split("; ")
    .find((directive) => directive.startsWith("img-src "));

  assert.ok(imgSrc, "img-src absent de la CSP");
  assert.match(imgSrc, /https:\/\/img\.logo\.dev/);

  // Ouvrir une origine d'images ne doit rien ouvrir d'autre : le fournisseur
  // sert des images, pas des scripts ni des requêtes.
  assert.ok(!csp.includes("script-src 'self' https://img.logo.dev"));
  assert.match(csp, /connect-src 'self'/);
});
