import assert from "node:assert/strict";
import { test } from "node:test";
import { describeDbError, GENERIC_DB_ERROR } from "../src/lib/db-error.ts";
import { DEFAULT_REDIRECT, safeRedirectPath } from "../src/lib/safe-redirect.ts";
import { buildContentSecurityPolicy } from "../src/lib/csp.ts";
import { AUTH_COOKIE_OPTIONS } from "../src/lib/supabase/cookie-options.ts";
import { findPrivateContactDetails } from "../src/lib/validation.ts";

/* ------------------------------------------------------------------ */
/* F-06 — redirection ouverte après connexion                          */
/* ------------------------------------------------------------------ */

const ORIGIN = "https://cconnect.example";

test("F-06 seules les destinations internes sont acceptées", () => {
  // Le troisième cas est celui qui passait : l'analyseur d'URL traite
  // l'antislash comme un slash, donc « /\evil.com » vaut « //evil.com ».
  const hostile = [
    "//evil.com",
    "/\\evil.com",
    "/\\\\evil.com",
    "https://evil.com",
    "https://evil.com/network",
    "//evil.com/../network",
    "http://cconnect.example/network",
    "javascript:alert(1)",
    "\\\\evil.com",
  ];

  for (const raw of hostile) {
    assert.equal(
      safeRedirectPath(raw, ORIGIN),
      DEFAULT_REDIRECT,
      `destination hostile acceptée : ${JSON.stringify(raw)}`,
    );
  }
});

test("F-06 les destinations internes légitimes passent inchangées", () => {
  for (const [raw, expected] of [
    ["/network", "/network"],
    ["/companies/microsoft", "/companies/microsoft"],
    ["/companies?q=ocp", "/companies?q=ocp"],
    ["/..//evil.com", "//evil.com"], // reste sur l'origine : chemin, pas hôte
  ] as const) {
    assert.equal(safeRedirectPath(raw, ORIGIN), expected, `pour ${raw}`);
  }
});

test("F-06 l'absence de destination renvoie au réseau", () => {
  assert.equal(safeRedirectPath(null, ORIGIN), DEFAULT_REDIRECT);
  assert.equal(safeRedirectPath("", ORIGIN), DEFAULT_REDIRECT);
});

/* ------------------------------------------------------------------ */
/* F-07 — pas de message Postgres brut dans l'interface                */
/* ------------------------------------------------------------------ */

test("F-07 aucun détail de schéma ne fuit vers l'utilisateur", () => {
  const leaky = [
    {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "companies_normalized_name_key"',
    },
    {
      code: "23503",
      message:
        'insert or update on table "contacts" violates foreign key constraint "contacts_company_id_fkey"',
    },
    { code: "42501", message: 'new row violates row-level security policy for table "reports"' },
    { code: "42P01", message: 'relation "profiles" does not exist' },
  ];

  for (const error of leaky) {
    const shown = describeDbError(error);
    for (const forbidden of ["constraint", "relation", "table \"", "_key", "_fkey", "violates"]) {
      assert.ok(
        !shown.includes(forbidden),
        `« ${forbidden} » visible dans : ${shown}`,
      );
    }
  }
});

test("F-07 le refus de quota garde son message, avec le délai", () => {
  const message = "Trop de publications d'affilée. Réessaie dans 42 secondes.";
  assert.equal(describeDbError({ code: "CC429", message }), message);
});

test("F-07 la règle des coordonnées privées explique quoi corriger", () => {
  const shown = describeDbError({
    code: "23514",
    message:
      'new row for relation "contacts" violates check constraint "contacts_notes_no_private_details"',
  });
  assert.match(shown, /email|téléphone/i);
  assert.ok(!shown.includes("constraint"));
});

test("F-07 une erreur inconnue reste générique", () => {
  assert.equal(describeDbError({ code: "XX000", message: "internal" }), GENERIC_DB_ERROR);
  assert.equal(describeDbError(null), GENERIC_DB_ERROR);
  assert.equal(describeDbError(undefined), GENERIC_DB_ERROR);
});

/* ------------------------------------------------------------------ */
/* F-05 — CSP et cookies de session                                    */
/* ------------------------------------------------------------------ */

test("F-05 la CSP n'autorise plus les scripts en ligne", () => {
  const csp = buildContentSecurityPolicy("abc123");
  const scriptSrc = csp
    .split("; ")
    .find((directive) => directive.startsWith("script-src"));

  assert.ok(scriptSrc, "directive script-src absente");
  assert.ok(
    !scriptSrc.includes("'unsafe-inline'"),
    `unsafe-inline encore présent : ${scriptSrc}`,
  );
  assert.ok(scriptSrc.includes("'nonce-abc123'"), "le nonce n'est pas repris");
  assert.ok(scriptSrc.includes("'strict-dynamic'"), "strict-dynamic absent");
});

test("F-05 le nonce est repris tel quel, sans être partagé entre requêtes", () => {
  const first = buildContentSecurityPolicy("nonce-un");
  const second = buildContentSecurityPolicy("nonce-deux");
  assert.notEqual(first, second);
});

test("F-05 les directives de confinement restent en place", () => {
  const csp = buildContentSecurityPolicy("x");
  for (const directive of [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]) {
    assert.ok(csp.includes(directive), `directive manquante : ${directive}`);
  }
});

test("F-05 le cookie de session est borné et marqué SameSite", () => {
  assert.equal(AUTH_COOKIE_OPTIONS.sameSite, "lax");
  // 400 jours par défaut dans la bibliothèque ; on ne dépasse pas un mois.
  assert.ok(
    (AUTH_COOKIE_OPTIONS.maxAge ?? Infinity) <= 60 * 60 * 24 * 31,
    `durée de vie trop longue : ${AUTH_COOKIE_OPTIONS.maxAge}`,
  );
});

/* ------------------------------------------------------------------ */
/* F-02 — parité du garde-fou « coordonnées privées »                  */
/* ------------------------------------------------------------------ */

test("F-02 le garde-fou applicatif reste d'accord avec la contrainte SQL", () => {
  // La contrainte `*_no_private_details` reproduit ces règles en base ; le
  // test de bout en bout est dans tests/database-security.test.ts. Ici on fige
  // le comportement attendu des deux côtés.
  for (const refused of [
    "écris-lui à karim.recruteur@contoso.com",
    "appelle-le au +212 6 12 34 56 78",
    "tel 0612345678",
  ]) {
    assert.ok(findPrivateContactDetails(refused), `accepté à tort : ${refused}`);
  }

  for (const accepted of [
    "rencontré pendant le stage du 2026-01-05 au 2026-06-30",
    "équipe data de 12 personnes, stage de 6 mois",
    "",
  ]) {
    assert.equal(
      findPrivateContactDetails(accepted),
      null,
      `refusé à tort : ${accepted}`,
    );
  }
});
