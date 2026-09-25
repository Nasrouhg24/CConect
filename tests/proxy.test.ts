import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { POLICY_VERSION } from "../src/lib/legal.ts";
import { proxy } from "../src/proxy.ts";

/**
 * `proxy.ts` — requête entrante, réponse sortante.
 *
 * `legal.test.ts` vérifie que le fichier *contient* les bons mots ; ici on
 * l'exécute. La seule dépendance extérieure du proxy est Supabase, par HTTP :
 * c'est là, et seulement là, qu'on la remplace (`fetch`), pour que le vrai
 * client Supabase tourne tel quel derrière.
 */

const SUPABASE_URL = "https://proxy-test.supabase.test";
const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const realFetch = globalThis.fetch;

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  globalThis.fetch = realFetch;
});

function demoMode() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function get(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

test("mode démo : l'accès reste ouvert, avec une CSP à nonce tirée à chaque requête", async () => {
  demoMode();

  const first = await proxy(get("/network"));
  const second = await proxy(get("/network"));

  // Ni redirection, ni blocage : sans base, il n'y a rien à protéger.
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("location"), null);

  const nonce = nonceOf(first.headers.get("Content-Security-Policy"));
  assert.ok(nonce && nonce.length >= 16, "la CSP doit porter un nonce");
  assert.notEqual(nonce, nonceOf(second.headers.get("Content-Security-Policy")));

  // Le même nonce part vers Next, qui l'appose sur ses propres balises.
  assert.equal(first.headers.get("x-middleware-request-x-nonce"), nonce);
});

/** Supabase configuré, et aucun appel réseau toléré tant qu'un test ne l'a pas prévu. */
function configured() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-de-test";
  globalThis.fetch = async (input) => {
    throw new Error(`appel réseau imprévu : ${String(input)}`);
  };
}

test("sans session, une route membre renvoie vers /login en gardant la destination", async () => {
  configured();

  const response = await proxy(get("/network"));

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/network");
  // Une redirection porte la CSP comme le reste.
  assert.ok(response.headers.get("Content-Security-Policy"));
});

test("sans session, /login et les pages légales restent lisibles", async () => {
  configured();

  for (const path of ["/login", "/legal/conditions", "/legal/accepter"]) {
    const response = await proxy(get(path));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("location"), null, path);
  }
});

const MEMBER_ID = "00000000-0000-4000-8000-000000000042";

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/**
 * Un membre connecté : le cookie de session tel que `@supabase/ssr` le lit, et
 * un faux Supabase qui répond `/auth/v1/user` et `/rest/v1/profiles`.
 *
 * `profile` est la ligne que la base renverrait : `null` pour un membre sans
 * profil encore (inscription en cours).
 */
function signedIn(profile: { policy_version: string | null } | null): { cookie: string } {
  configured();

  const user = {
    id: MEMBER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "membre@um6p.ma",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const session = {
    access_token: `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: MEMBER_ID, exp: 4102444800 })}.signature`,
    refresh_token: "refresh-de-test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 4102444800,
    user,
  };

  globalThis.fetch = async (input) => {
    const url = new URL(String(input instanceof Request ? input.url : input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    if (url.pathname === "/auth/v1/user") return json(user);
    if (url.pathname === "/rest/v1/profiles") return json(profile ? [profile] : []);
    throw new Error(`appel réseau imprévu : ${url.pathname}`);
  };

  return { cookie: `sb-proxy-test-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` };
}

function getAs(member: { cookie: string }, path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers: { cookie: member.cookie } });
}

test("consentement : une version périmée renvoie vers l'acceptation, destination gardée", async () => {
  const member = signedIn({ policy_version: "2020-01-01" });

  const response = await proxy(getAs(member, "/network"));

  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/legal/accepter");
  assert.equal(location.searchParams.get("next"), "/network");
});

test("consentement : la version en vigueur passe", async () => {
  const member = signedIn({ policy_version: POLICY_VERSION });

  const response = await proxy(getAs(member, "/network"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("consentement : un membre sans profil n'est pas bloqué, l'inscription recueille l'acceptation", async () => {
  const member = signedIn(null);

  const response = await proxy(getAs(member, "/onboarding"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("consentement : l'écran d'acceptation lui-même n'est jamais bloqué (pas de boucle)", async () => {
  const member = signedIn({ policy_version: null });

  for (const path of ["/legal/accepter", "/legal/conditions"]) {
    const response = await proxy(getAs(member, path));
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("location"), null, path);
  }
});
