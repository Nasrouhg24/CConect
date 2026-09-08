import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { normalizeCompanyName } from "../src/lib/company-name.ts";

/**
 * Tests des règles de sécurité **de la base**, sur un vrai Postgres.
 *
 * Pourquoi ici et pas dans l'application : la clé anon est publique par
 * conception, donc tout membre peut écrire directement dans PostgREST. Une
 * règle vérifiée seulement dans une Server Action ne protège rien. Ce fichier
 * rejoue les migrations dans un Postgres jetable (PGlite, WebAssembly — pas de
 * Docker, pas de service à démarrer) puis attaque le résultat en se faisant
 * passer pour un membre, un modérateur, un compte hors périmètre, un visiteur.
 *
 * Chaque test porte le numéro du constat d'audit qu'il verrouille. Les
 * migrations sont exécutées dans l'ordre : le fichier prouve donc aussi
 * qu'elles s'appliquent sur une base vierge, ce qu'aucun autre test ne faisait.
 */

const ROOT = new URL("../", import.meta.url);
const dir = (path: string) => fileURLToPath(new URL(path, ROOT));

/** Ce que Supabase fournit et qu'un Postgres nu n'a pas. */
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create role supabase_auth_admin nologin;

create schema auth;
create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique not null
);

create or replace function auth.uid() returns uuid
language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

grant usage  on schema auth to authenticated, supabase_auth_admin;
grant select on auth.users  to authenticated, supabase_auth_admin;
grant usage  on schema public to anon, authenticated, service_role;
`;

/** Les privilèges de table que Supabase accorde d'office aux rôles d'API. */
const API_GRANTS = `
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant execute                       on all functions  in schema public to authenticated;
grant select                        on all tables     in schema public to anon;

-- Ces deux tables ne sont accessibles qu'aux déclencheurs security definer.
revoke all on table write_rate_events from anon, authenticated;
revoke all on table audit_log         from anon, authenticated;
grant select on table audit_log to authenticated;
`;

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const ALICE = uuid(1); // membre légitime
const MALLORY = uuid(2); // membre qui tente l'élévation de privilège
const OUTSIDER = uuid(3); // compte authentifié hors domaine, sans profil
const MOD = uuid(4); // modérateur promu à la main
const EVE = uuid(5); // sert à isoler la politique du déclencheur

let db: PGlite;
let placeId: string;
let companyId: string;

/** Exécute `fn` sous le rôle `authenticated`, avec `auth.uid()` positionné. */
async function as<T>(id: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Vérifie qu'une écriture est refusée, et par le bon garde-fou. */
async function refused(fn: () => Promise<unknown>, by: RegExp): Promise<string> {
  let message: string | null = null;
  try {
    await fn();
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.ok(message, "l'écriture aurait dû être refusée");
  assert.match(message, by);
  return message;
}

before(async () => {
  // `0001_init.sql` demande pgcrypto ; PGlite ne le charge pas d'office.
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);

  const migrations = readdirSync(dir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(migrations.length >= 5, "migrations introuvables");

  for (const file of migrations) {
    await db.exec(readFileSync(dir(`supabase/migrations/${file}`), "utf8"));
  }
  await db.exec(readFileSync(dir("supabase/seed.sql"), "utf8"));
  await db.exec(API_GRANTS);

  for (const [id, email] of [
    [ALICE, "alice@um6p.ma"],
    [MALLORY, "mallory@um6p.ma"],
    [OUTSIDER, "attacker@evil.example"],
    [MOD, "mod@um6p.ma"],
    [EVE, "eve@um6p.ma"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  }

  await as(ALICE, () =>
    db.query(
      "insert into profiles (id, full_name, campus, promotion) values ($1, 'Alice', 'rabat', 2025)",
      [ALICE],
    ),
  );

  // Promotion administrative, faite depuis l'éditeur SQL comme le prévoit la
  // procédure : c'est le seul chemin légitime vers un rôle privilégié.
  await db.query(
    `insert into profiles (id, full_name, campus, promotion, role)
     values ($1, 'Mod', 'rabat', 2020, 'moderator')`,
    [MOD],
  );

  placeId = (await db.query<{ id: string }>("select id from places limit 1")).rows[0].id;
});

/* ------------------------------------------------------------------ */
/* F-01 — élévation de privilège à la création du profil               */
/* ------------------------------------------------------------------ */

test("F-01 un profil qui se déclare admin n'obtient jamais le rôle", async () => {
  // Le déclencheur `before insert` s'exécute avant la vérification de la
  // politique : la valeur est ramenée à `member`, puis la ligne passe. Ce qui
  // compte n'est pas la forme du refus, c'est le rôle obtenu.
  await as(MALLORY, () =>
    db.query(
      `insert into profiles (id, full_name, campus, promotion, role)
       values ($1, 'Mallory', 'rabat', 2026, 'admin')`,
      [MALLORY],
    ),
  );

  const { rows } = await db.query<{ role: string }>(
    "select role from profiles where id = $1",
    [MALLORY],
  );
  assert.equal(rows[0].role, "member");
});

test("F-01 la politique refuse le rôle même sans le déclencheur", async () => {
  // Second rempart, isolé : si le déclencheur venait à disparaître, la
  // politique doit encore refuser la ligne.
  await db.exec("drop trigger profiles_protect_role on profiles");
  try {
    await refused(
      () =>
        as(EVE, () =>
          db.query(
            `insert into profiles (id, full_name, campus, promotion, role)
             values ($1, 'Eve', 'rabat', 2026, 'admin')`,
            [EVE],
          ),
        ),
      /row-level security|policy/i,
    );
  } finally {
    await db.exec(`
      create trigger profiles_protect_role
        before insert or update on profiles
        for each row execute function public.protect_profile_role();
    `);
  }
});

test("F-01 un membre ne peut pas se promouvoir par UPDATE", async () => {
  await as(MALLORY, () =>
    db.query("update profiles set role = 'admin' where id = $1", [MALLORY]),
  );
  const { rows } = await db.query<{ role: string }>(
    "select role from profiles where id = $1",
    [MALLORY],
  );
  assert.equal(rows[0].role, "member");
});

test("F-01 l'inscription normale fonctionne toujours", async () => {
  const { rows } = await db.query<{ role: string }>(
    "select role from profiles where id = $1",
    [ALICE],
  );
  assert.equal(rows[0].role, "member");
});

test("F-01 la promotion administrative depuis l'éditeur SQL reste possible", async () => {
  const { rows } = await db.query<{ role: string }>(
    "select role from profiles where id = $1",
    [MOD],
  );
  assert.equal(rows[0].role, "moderator");
});

/* ------------------------------------------------------------------ */
/* F-08 — journal d'audit                                              */
/* ------------------------------------------------------------------ */

test("F-08 une promotion laisse une trace dans le journal", async () => {
  const { rows } = await db.query<{ target_id: string }>(
    "select target_id from audit_log where action = 'profile.created_with_role'",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].target_id, MOD);
});

test("F-08 le journal n'est lisible que par la modération", async () => {
  const member = await as(ALICE, () =>
    db.query<{ n: number }>("select count(*)::int as n from audit_log"),
  );
  assert.equal(Number(member.rows[0].n), 0);

  const moderator = await as(MOD, () =>
    db.query<{ n: number }>("select count(*)::int as n from audit_log"),
  );
  assert.ok(Number(moderator.rows[0].n) > 0);
});

/* ------------------------------------------------------------------ */
/* F-04 — signalements réservés aux membres                            */
/* ------------------------------------------------------------------ */

test("F-04 un compte authentifié sans profil ne peut pas signaler", async () => {
  await refused(
    () =>
      as(OUTSIDER, () =>
        db.query(
          `insert into reports (reporter_id, target_type, target_id, reason)
           values ($1, 'profile', $2, 'spam spam spam spam')`,
          [OUTSIDER, ALICE],
        ),
      ),
    /row-level security|policy/i,
  );
});

test("F-04 un membre peut toujours signaler", async () => {
  await as(ALICE, () =>
    db.query(
      `insert into reports (reporter_id, target_type, target_id, reason)
       values ($1, 'profile', $2, 'contenu inapproprié à vérifier')`,
      [ALICE, MALLORY],
    ),
  );
  const { rows } = await db.query<{ n: number }>(
    "select count(*)::int as n from reports",
  );
  assert.equal(Number(rows[0].n), 1);
});

/* ------------------------------------------------------------------ */
/* F-09 — création de villes réservée à la modération                  */
/* ------------------------------------------------------------------ */

test("F-09 un membre ne peut pas créer de ville", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into places (city, country_code, country_name, continent, lat, lng)
           values ('Spamville', 'ZZ', 'Nulle part', 'europe', 0, 0)`,
        ),
      ),
    /row-level security|policy/i,
  );
});

test("F-09 un modérateur le peut", async () => {
  await as(MOD, () =>
    db.query(
      `insert into places (city, country_code, country_name, continent, lat, lng)
       values ('Ville Validée', 'MA', 'Maroc', 'africa', 31.0, -8.0)`,
    ),
  );
});

/* ------------------------------------------------------------------ */
/* F-14 — nom canonique dérivé en base                                 */
/* ------------------------------------------------------------------ */

test("F-14 normalized_name est recalculé même s'il est fourni", async () => {
  await as(ALICE, () =>
    db.query(
      `insert into companies (name, slug, normalized_name, created_by)
       values ('Contoso Corp.', 'contoso', 'valeur-forgée', $1)`,
      [ALICE],
    ),
  );
  const { rows } = await db.query<{ id: string; normalized_name: string }>(
    "select id, normalized_name from companies where slug = 'contoso'",
  );
  companyId = rows[0].id;
  assert.equal(rows[0].normalized_name, "contoso");
});

test("F-14 le doublon canonique reste refusé malgré un normalized_name forgé", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into companies (name, slug, normalized_name, created_by)
           values ('Contoso Corporation', 'contoso-2', 'autre-valeur', $1)`,
          [ALICE],
        ),
      ),
    /unique|duplicate/i,
  );
});

/* ------------------------------------------------------------------ */
/* F-02 — coordonnées privées refusées par la base                     */
/* ------------------------------------------------------------------ */

test("F-02 un email dans les notes d'un contact est refusé", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into contacts (author_id, company_id, place_id, domain,
                                 first_name, position, notes)
           values ($1, $2, $3, 'data', 'Karim', 'Recruteur',
                   'écris-lui à karim.recruteur@contoso.com')`,
          [ALICE, companyId, placeId],
        ),
      ),
    /no_private_details/i,
  );
});

test("F-02 un numéro de téléphone dans les notes est refusé", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into contacts (author_id, company_id, place_id, domain,
                                 first_name, position, notes)
           values ($1, $2, $3, 'data', 'Karim', 'Recruteur',
                   'appelle-le au +212 6 12 34 56 78')`,
          [ALICE, companyId, placeId],
        ),
      ),
    /no_private_details/i,
  );
});

test("F-02 une plage de dates légitime passe encore", async () => {
  await as(ALICE, () =>
    db.query(
      `insert into contacts (author_id, company_id, place_id, domain,
                             first_name, position, notes)
       values ($1, $2, $3, 'data', 'Karim', 'Recruteur',
               'rencontré pendant le stage du 2026-01-05 au 2026-06-30')`,
      [ALICE, companyId, placeId],
    ),
  );
});

test("F-02 un email dans le résumé d'une expérience est refusé", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into experiences (author_id, company_id, place_id, domain, kind,
                                    year, title, summary)
           values ($1, $2, $3, 'data', 'pfe', 2025, 'Stage data',
                   'contact direct : rh@contoso.com')`,
          [ALICE, companyId, placeId],
        ),
      ),
    /no_private_details/i,
  );
});

test("F-02 un email dans la description d'une offre est refusé", async () => {
  await refused(
    () =>
      as(ALICE, () =>
        db.query(
          `insert into job_offers (company_id, place_id, posted_by_id, title,
                                   domain, kind, description)
           values ($1, $2, $3, 'Stage data', 'data', 'pfe',
                   'candidature à rh@contoso.com')`,
          [companyId, placeId, ALICE],
        ),
      ),
    /no_private_details/i,
  );
});

/* ------------------------------------------------------------------ */
/* F-02 — quota d'écriture appliqué par la base                        */
/* ------------------------------------------------------------------ */

test("F-02 le quota d'écriture s'applique même sans passer par l'application", async () => {
  let refusal: string | null = null;
  let written = 0;

  await as(ALICE, async () => {
    for (let i = 0; i < 25; i += 1) {
      try {
        await db.query(
          `insert into experiences (author_id, company_id, place_id, domain, kind,
                                    year, title)
           values ($1, $2, $3, 'data', 'pfe', 2025, $4)`,
          [ALICE, companyId, placeId, `Expérience ${i}`],
        );
        written += 1;
      } catch (error) {
        refusal = error instanceof Error ? error.message : String(error);
        break;
      }
    }
  });

  assert.ok(refusal, "aucune écriture n'a été refusée");
  assert.match(refusal, /Trop de publications/);
  // WRITE_LIMIT vaut 12 par minute et par table ; l'important est que la
  // fenêtre se referme, pas le chiffre exact.
  assert.ok(written > 0 && written <= 12, `écritures acceptées : ${written}`);
});

/* ------------------------------------------------------------------ */
/* Non-régression : les garanties d'origine tiennent toujours          */
/* ------------------------------------------------------------------ */

test("un membre ne peut pas modifier la contribution d'un autre", async () => {
  const own = await db.query<{ id: string }>(
    "select id from experiences where author_id = $1 limit 1",
    [ALICE],
  );
  const result = await as(MALLORY, () =>
    db.query("update experiences set title = 'détourné' where id = $1", [own.rows[0].id]),
  );
  assert.equal(result.affectedRows, 0);
});

test("un membre ne peut pas supprimer la contribution d'un autre", async () => {
  const own = await db.query<{ id: string }>(
    "select id from experiences where author_id = $1 limit 1",
    [ALICE],
  );
  const result = await as(MALLORY, () =>
    db.query("delete from experiences where id = $1", [own.rows[0].id]),
  );
  assert.equal(result.affectedRows, 0);
});

test("un visiteur anonyme ne lit aucune contribution", async () => {
  await db.exec("set role anon");
  try {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from experiences",
    );
    assert.equal(Number(rows[0].n), 0);
  } finally {
    await db.exec("reset role");
  }
});

test("un membre lit bien les contributions du réseau", async () => {
  await as(ALICE, async () => {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from experiences",
    );
    assert.ok(Number(rows[0].n) > 0);
  });
});

test("un membre ne lit pas la table de quota", async () => {
  await refused(
    () => as(ALICE, () => db.query("select * from write_rate_events")),
    /permission denied/i,
  );
});

/* ------------------------------------------------------------------ */
/* Agrégats de la migration 0004                                       */
/* ------------------------------------------------------------------ */

test("company_stats compte juste et reste soumise à la RLS", async () => {
  await as(ALICE, async () => {
    const { rows } = await db.query<{
      contact_count: number;
      experience_count: number;
    }>(
      "select contact_count, experience_count from company_stats where company_slug = 'contoso'",
    );
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].contact_count), 1);
    assert.ok(Number(rows[0].experience_count) > 0);
  });
});

test("network_stats() renvoie la forme attendue par l'application", async () => {
  await as(ALICE, async () => {
    const { rows } = await db.query<{ s: Record<string, unknown> }>(
      "select public.network_stats() as s",
    );
    for (const key of [
      "countries", "cities", "companies", "members",
      "experiences", "contacts", "topCompanies", "topCities",
      "topDomains", "byYear",
    ]) {
      assert.ok(key in rows[0].s, `clé manquante : ${key}`);
    }
    assert.ok(Number(rows[0].s.experiences) > 0);
    assert.ok(Array.isArray(rows[0].s.topCompanies));
  });
});

/* ------------------------------------------------------------------ */
/* F-03 — hook d'inscription                                           */
/* ------------------------------------------------------------------ */

test("F-03 le hook accepte le domaine autorisé et ses sous-domaines", async () => {
  for (const email of ["x@um6p.ma", "x@etu.um6p.ma", "X@UM6P.MA"]) {
    const { rows } = await db.query<{ v: Record<string, unknown> }>(
      "select public.restrict_signup_domain(jsonb_build_object('user', jsonb_build_object('email', $1::text))) as v",
      [email],
    );
    assert.deepEqual(rows[0].v, {}, `${email} refusé à tort`);
  }
});

test("F-03 le hook refuse un domaine étranger", async () => {
  const { rows } = await db.query<{ v: { error?: { http_code?: number } } }>(
    `select public.restrict_signup_domain('{"user":{"email":"attacker@evil.example"}}'::jsonb) as v`,
  );
  assert.equal(rows[0].v.error?.http_code, 403);
});

test("F-03 le hook reconnaît aussi la charge utile sous forme claims", async () => {
  const { rows } = await db.query<{ v: Record<string, unknown> }>(
    `select public.restrict_signup_domain('{"claims":{"email":"y@um6p.ma"}}'::jsonb) as v`,
  );
  assert.deepEqual(rows[0].v, {});
});

/* ------------------------------------------------------------------ */
/* Parité application / base sur la forme canonique                    */
/* ------------------------------------------------------------------ */

test("F-14 canonical_company_name() est d'accord avec normalizeCompanyName()", async () => {
  // Le sélecteur d'entreprise propose une fiche existante à partir de la forme
  // calculée en TypeScript ; la base, elle, calcule la sienne et refuse le
  // doublon. Si les deux divergent, l'interface annonce une fusion que la base
  // ne fait pas — ou refuse une création que rien n'explique.
  const names = [
    ...(
      await db.query<{ name: string }>("select name from companies order by name")
    ).rows.map((r) => r.name),
    "Contoso Corp.",
    "Microsoft Corporation",
    "Thales Technologies Group",
    "Group SA",
    "Société Générale",
    "L'Oréal",
    "  Espaces   Multiples  ",
    "Zeta-Tech, Inc.",
  ];

  for (const name of names) {
    const { rows } = await db.query<{ v: string | null }>(
      "select public.canonical_company_name($1::text) as v",
      [name],
    );
    assert.equal(
      rows[0].v,
      normalizeCompanyName(name),
      `divergence sur ${JSON.stringify(name)}`,
    );
  }
});
