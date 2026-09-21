import assert from "node:assert/strict";
import { before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { as, bootDatabase, refused, uuid } from "./pg-harness.ts";

/**
 * Migration 0010 — preuve du consentement, sur un vrai Postgres.
 *
 * Ce qu'on vérifie ici n'est pas que l'écran de blocage s'affiche : c'est que
 * la preuve qu'il produit tient. Une trace qu'on peut forger au nom d'un autre,
 * modifier après coup ou effacer ne prouve rien — et c'est bien une preuve que
 * demande le RGPD (art. 7.1), pas un drapeau.
 *
 * Les personnes ci-dessous sont des fixtures créées dans une base jetable.
 */

const MEMBER = uuid(301);
const OTHER = uuid(302);

let db: PGlite;

before(async () => {
  db = await bootDatabase();
  for (const [id, email] of [
    [MEMBER, "consent-member@um6p.ma"],
    [OTHER, "consent-other@um6p.ma"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  }
  for (const [id, name] of [
    [MEMBER, "Membre"],
    [OTHER, "Autre"],
  ]) {
    await as(db, id, () =>
      db.query(
        "insert into profiles (id, full_name, campus, promotion, status) values ($1, $2, 'rabat', 2026, 'student')",
        [id, name],
      ),
    );
  }
});

test("un profil naît sans consentement", async () => {
  const { rows } = await as(db, MEMBER, () =>
    db.query<{ policy_version: string | null }>(
      "select policy_version from profiles where id = $1",
      [MEMBER],
    ),
  );
  assert.equal(rows[0].policy_version, null);
});

test("accept_policy écrit l'état et la preuve en une fois", async () => {
  await as(db, MEMBER, () => db.query("select accept_policy('2026-09-21')"));

  const profile = await as(db, MEMBER, () =>
    db.query<{ policy_version: string; policy_accepted_at: Date }>(
      "select policy_version, policy_accepted_at from profiles where id = $1",
      [MEMBER],
    ),
  );
  assert.equal(profile.rows[0].policy_version, "2026-09-21");
  assert.ok(profile.rows[0].policy_accepted_at);

  const events = await as(db, MEMBER, () =>
    db.query<{ policy_version: string }>(
      "select policy_version from consent_events where profile_id = $1",
      [MEMBER],
    ),
  );
  assert.deepEqual(
    events.rows.map((r) => r.policy_version),
    ["2026-09-21"],
  );
});

test("une nouvelle version s'ajoute à l'historique sans écraser l'ancienne", async () => {
  await as(db, MEMBER, () => db.query("select accept_policy('2027-01-15')"));

  const { rows } = await as(db, MEMBER, () =>
    db.query<{ policy_version: string }>(
      "select policy_version from consent_events where profile_id = $1 order by accepted_at",
      [MEMBER],
    ),
  );
  assert.deepEqual(
    rows.map((r) => r.policy_version),
    ["2026-09-21", "2027-01-15"],
  );
});

test("une version qui n'est pas une date est refusée", async () => {
  await refused(
    () => as(db, MEMBER, () => db.query("select accept_policy('latest')")),
    /invalide/i,
  );
  await refused(
    () =>
      as(db, MEMBER, () =>
        db.query(
          "insert into consent_events (profile_id, policy_version) values ($1, 'v2')",
          [MEMBER],
        ),
      ),
    /policy_version/i,
  );
});

test("on n'enregistre pas un consentement au nom d'un autre", async () => {
  await refused(
    () =>
      as(db, OTHER, () =>
        db.query(
          "insert into consent_events (profile_id, policy_version) values ($1, '2026-09-21')",
          [MEMBER],
        ),
      ),
    /row-level security|policy/i,
  );
});

test("l'historique est en ajout seul, même pour son propriétaire", async () => {
  // Pas de politique update ni delete : la RLS ne refuse pas, elle ne voit
  // aucune ligne à toucher. Zéro ligne affectée *est* le refus.
  const updated = await as(db, MEMBER, () =>
    db.query("update consent_events set policy_version = '1999-01-01' where profile_id = $1", [
      MEMBER,
    ]),
  );
  assert.equal(updated.affectedRows, 0);

  const deleted = await as(db, MEMBER, () =>
    db.query("delete from consent_events where profile_id = $1", [MEMBER]),
  );
  assert.equal(deleted.affectedRows, 0);

  const { rows } = await as(db, MEMBER, () =>
    db.query("select 1 from consent_events where profile_id = $1", [MEMBER]),
  );
  assert.equal(rows.length, 2);
});

test("l'historique d'un membre n'est lisible que par lui", async () => {
  const { rows } = await as(db, OTHER, () =>
    db.query("select 1 from consent_events where profile_id = $1", [MEMBER]),
  );
  assert.equal(rows.length, 0);
});

test("un visiteur anonyme ne voit rien et n'écrit rien", async () => {
  // La migration retire le privilège à `anon`, mais PostgREST le redonne sur
  // l'ensemble du schéma : c'est donc la RLS qui tient, et elle le fait en ne
  // montrant aucune ligne plutôt qu'en refusant la requête. Les deux valent,
  // tant que rien ne sort.
  await db.exec("set role anon");
  try {
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from consent_events",
    );
    assert.equal(Number(rows[0].n), 0);

    await refused(
      () =>
        db.query(
          "insert into consent_events (profile_id, policy_version) values ($1, '2026-09-21')",
          [MEMBER],
        ),
      /permission|denied|row-level security|policy/i,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("la suppression du compte emporte la preuve", async () => {
  // Le droit à l'effacement passe devant la conservation d'un consentement
  // devenu sans objet : `on delete cascade`, et pas une trace orpheline.
  await db.exec("set role postgres");
  await db.query("delete from profiles where id = $1", [OTHER]);
  await db.exec("reset role");

  const { rows } = await db.query("select 1 from consent_events where profile_id = $1", [OTHER]);
  assert.equal(rows.length, 0);
});
