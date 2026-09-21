import assert from "node:assert/strict";
import { test } from "node:test";
import { domainFromWebsite } from "../src/lib/company-domain.ts";
import { buildLogoSrc } from "../src/lib/logo-provider.ts";
import { LOGO_CASES } from "./logo-corpus.ts";

/**
 * Test **live** contre Logo.dev — hors de la suite par défaut.
 *
 * Il interroge le vrai service avec la vraie clé publiable, donc il dépend du
 * réseau et d'un jeton. Il ne tourne que sur demande :
 *
 *   LOGO_DEV_LIVE=1 node --env-file=.env.local --test \
 *     --experimental-strip-types --import=./tests/ts-resolver.mjs \
 *     tests/logo-dev-live.test.ts
 *
 * Ce qu'il vérifie est la réponse réelle, pas une maquette : statut HTTP, type
 * de contenu, et taille non nulle pour un logo ; un 404 pour une entreprise
 * inconnue (c'est `fallback=404` qui rend ce cas détectable côté navigateur).
 */

const token = (process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN ?? "").trim();
const live = process.env.LOGO_DEV_LIVE === "1" && token.length > 0;

test("Logo.dev répond comme le corpus l'annonce", { skip: !live && "LOGO_DEV_LIVE=1 et un jeton sont requis" }, async () => {
  const results = await Promise.all(
    LOGO_CASES.map(async (c) => {
      const domain = domainFromWebsite(c.website);
      const src = buildLogoSrc(domain, 36, token);
      if (!src) return { c, domain, status: null as number | null, type: "", bytes: 0 };
      const res = await fetch(src);
      const body = new Uint8Array(await res.arrayBuffer());
      return { c, domain, status: res.status, type: res.headers.get("content-type") ?? "", bytes: body.length };
    }),
  );

  // Le relevé complet, sans le jeton : il sert de rapport.
  console.table(
    results.map(({ c, domain, status, type, bytes }) => ({
      company: c.name,
      domain,
      status,
      type,
      bytes,
      expected: c.expect,
    })),
  );

  for (const { c, domain, status, type, bytes } of results) {
    assert.equal(domain, c.domain, `${c.name} : domaine`);
    if (c.expect === "none") {
      assert.equal(status, null, `${c.name} : aucune requête attendue`);
    } else if (c.expect === "logo") {
      assert.equal(status, 200, `${c.name} (${domain}) : logo attendu`);
      assert.match(type, /^image\//, `${c.name} : image attendue`);
      assert.ok(bytes > 0, `${c.name} : image vide`);
    } else {
      assert.equal(status, 404, `${c.name} (${domain}) : 404 attendu`);
    }
  }
});
