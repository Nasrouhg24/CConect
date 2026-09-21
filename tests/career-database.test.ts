import assert from "node:assert/strict";
import { before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import { as, bootDatabase, refused, uuid } from "./pg-harness.ts";

/**
 * Migration 0008 — graphe de carrière, sur un vrai Postgres.
 *
 * Les personnes ci-dessous sont des fixtures de test créées dans une base
 * jetable, jamais dans le jeu de démo ni dans `seed.sql`.
 */

const STUDENT = uuid(101);
const ALUMNI = uuid(102);
const OTHER = uuid(103);

let db: PGlite;
let placeId: string;
let companyId: string;

const insertExperience = (
  author: string,
  columns: Record<string, unknown>,
) => {
  const base = {
    author_id: author,
    company_id: companyId,
    place_id: placeId,
    domain: "cybersecurity",
    kind: "pfa",
    year: 2024,
    title: "Stage SOC",
    ...columns,
  };
  const keys = Object.keys(base);
  return db.query<{ id: string }>(
    `insert into experiences (${keys.join(",")})
     values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning id`,
    Object.values(base),
  );
};

before(async () => {
  db = await bootDatabase();
  for (const [id, email] of [
    [STUDENT, "student@um6p.ma"],
    [ALUMNI, "alumni@um6p.ma"],
    [OTHER, "other@um6p.ma"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  }
  await as(db, STUDENT, () =>
    db.query(
      "insert into profiles (id, full_name, campus, promotion, status) values ($1, 'Étudiant', 'rabat', 2027, 'student')",
      [STUDENT],
    ),
  );
  await as(db, ALUMNI, () =>
    db.query(
      "insert into profiles (id, full_name, campus, promotion, status) values ($1, 'Alumni', 'benguerir', 2022, 'alumni')",
      [ALUMNI],
    ),
  );
  await as(db, OTHER, () =>
    db.query(
      "insert into profiles (id, full_name, campus, promotion) values ($1, 'Autre', 'rabat', 2026)",
      [OTHER],
    ),
  );
  placeId = (await db.query<{ id: string }>("select id from places limit 1")).rows[0].id;
  companyId = (await db.query<{ id: string }>("select id from companies limit 1")).rows[0].id;
});

test("une expérience écrite sans les nouvelles colonnes les garde à null", async () => {
  const { rows } = await as(db, OTHER, () => insertExperience(OTHER, {}));
  const row = (
    await db.query<{ start_date: unknown; end_date: unknown; is_current: unknown }>(
      "select start_date, end_date, is_current from experiences where id = $1",
      [rows[0].id],
    )
  ).rows[0];
  assert.deepEqual(row, { start_date: null, end_date: null, is_current: null });
});

test("une personne peut avoir PFA, PFE et emploi dans la même entreprise", async () => {
  await as(db, ALUMNI, async () => {
    await insertExperience(ALUMNI, { kind: "pfa", year: 2024 });
    await insertExperience(ALUMNI, { kind: "pfe", year: 2025 });
    await insertExperience(ALUMNI, {
      kind: "job",
      year: 2026,
      title: "SOC Analyst",
      start_date: "2026-03-01",
      is_current: true,
    });
  });
  const { rows } = await as(db, STUDENT, () =>
    db.query<{ kind: string; is_current: boolean | null }>(
      "select kind, is_current from experiences where author_id = $1 and company_id = $2 order by year",
      [ALUMNI, companyId],
    ),
  );
  assert.deepEqual(
    rows.map((r) => [r.kind, r.is_current]),
    [
      ["pfa", null],
      ["pfe", null],
      ["job", true],
    ],
  );
});

test("un poste en cours ne peut pas avoir de date de fin", async () => {
  await refused(
    () =>
      as(db, ALUMNI, () =>
        insertExperience(ALUMNI, {
          kind: "job",
          year: 2023,
          start_date: "2023-01-01",
          end_date: "2024-01-01",
          is_current: true,
        }),
      ),
    /experiences_current_has_no_end/,
  );
});

test("la fin ne peut pas précéder le début", async () => {
  await refused(
    () =>
      as(db, ALUMNI, () =>
        insertExperience(ALUMNI, {
          kind: "job",
          year: 2024,
          start_date: "2024-06-01",
          end_date: "2024-01-01",
        }),
      ),
    /experiences_dates_ordered/,
  );
});

test("l'année doit correspondre au mois de début", async () => {
  await refused(
    () =>
      as(db, ALUMNI, () =>
        insertExperience(ALUMNI, { kind: "job", year: 2020, start_date: "2024-06-01" }),
      ),
    /experiences_year_matches_start/,
  );
});

test("l'année d'études est réservée aux étudiants", async () => {
  await as(db, STUDENT, () =>
    db.query("update profiles set study_year = 'fourth' where id = $1", [STUDENT]),
  );
  await refused(
    () =>
      as(db, ALUMNI, () =>
        db.query("update profiles set study_year = 'final' where id = $1", [ALUMNI]),
      ),
    /profiles_study_year_student_only/,
  );
});

test("les compétences sont dédoublonnées sur leur forme canonique", async () => {
  await as(db, STUDENT, () =>
    db.query("select set_profile_skills($1)", [["Python", " python ", "Threat  Detection", "Linux"]]),
  );
  await as(db, OTHER, () => db.query("select set_profile_skills($1)", [["PYTHON"]]));

  const { rows } = await as(db, STUDENT, () =>
    db.query<{ normalized: string }>(
      `select s.normalized from profile_skills ps join skills s on s.id = ps.skill_id
       where ps.profile_id = $1 order by 1`,
      [STUDENT],
    ),
  );
  assert.deepEqual(
    rows.map((r) => r.normalized),
    ["linux", "python", "threat detection"],
  );
  const shared = await db.query<{ n: number }>(
    "select count(*)::int as n from skills where normalized = 'python'",
  );
  assert.equal(Number(shared.rows[0].n), 1);
});

test("remplacer les compétences retire les anciennes", async () => {
  await as(db, STUDENT, () => db.query("select set_profile_skills($1)", [["SIEM"]]));
  const { rows } = await db.query<{ n: number }>(
    "select count(*)::int as n from profile_skills where profile_id = $1",
    [STUDENT],
  );
  assert.equal(Number(rows[0].n), 1);
});

test("au-delà de 30 compétences, la base refuse", async () => {
  const labels = Array.from({ length: 31 }, (_, i) => `Skill ${i}`);
  await refused(
    () => as(db, STUDENT, () => db.query("select set_profile_skills($1)", [labels])),
    /Limite atteinte/,
  );
});

test("un membre ne peut pas poser de compétences sur l'expérience d'un autre", async () => {
  const { rows } = await db.query<{ id: string }>(
    "select id from experiences where author_id = $1 limit 1",
    [ALUMNI],
  );
  await refused(
    () =>
      as(db, OTHER, () =>
        db.query("select set_experience_skills($1, $2)", [rows[0].id, ["Détournement"]]),
      ),
    /non modifiable/,
  );

  const skill = await db.query<{ id: string }>("select id from skills limit 1");
  await refused(
    () =>
      as(db, OTHER, () =>
        db.query("insert into experience_skills (experience_id, skill_id) values ($1, $2)", [
          rows[0].id,
          skill.rows[0].id,
        ]),
      ),
    /row-level security/i,
  );
});

test("l'auteur pose les compétences de sa propre expérience", async () => {
  const { rows } = await db.query<{ id: string }>(
    "select id from experiences where author_id = $1 and kind = 'job' limit 1",
    [ALUMNI],
  );
  await as(db, ALUMNI, () =>
    db.query("select set_experience_skills($1, $2)", [rows[0].id, ["SIEM", "Splunk"]]),
  );
  const read = await as(db, STUDENT, () =>
    db.query<{ label: string }>(
      `select s.label from experience_skills es join skills s on s.id = es.skill_id
       where es.experience_id = $1 order by 1`,
      [rows[0].id],
    ),
  );
  assert.deepEqual(
    read.rows.map((r) => r.label),
    ["SIEM", "Splunk"],
  );
});

test("les pays visés ne sont lisibles que par leur propriétaire", async () => {
  await as(db, STUDENT, () =>
    db.query("select set_profile_targets($1, $2)", [["fr", "DE"], [companyId]]),
  );
  const own = await as(db, STUDENT, () =>
    db.query<{ country_code: string }>(
      "select country_code from profile_target_countries order by 1",
    ),
  );
  assert.deepEqual(
    own.rows.map((r) => r.country_code),
    ["DE", "FR"],
  );
  const foreign = await as(db, OTHER, () =>
    db.query("select * from profile_target_countries where profile_id = $1", [STUDENT]),
  );
  assert.equal(foreign.rows.length, 0);
  const companies = await as(db, OTHER, () =>
    db.query("select * from profile_target_companies where profile_id = $1", [STUDENT]),
  );
  assert.equal(companies.rows.length, 0);
});

test("au-delà de 5 pays visés, la base refuse", async () => {
  await refused(
    () =>
      as(db, STUDENT, () =>
        db.query("select set_profile_targets($1, $2)", [["FR", "DE", "NL", "ES", "PT", "IE"], []]),
      ),
    /Limite atteinte/,
  );
});

test("un visiteur anonyme ne lit ni compétences ni préférences", async () => {
  // Supabase accorde `select` à anon sur tout le schéma : c'est la RLS, sans
  // politique pour anon, qui doit renvoyer zéro ligne.
  await db.exec("set role anon");
  try {
    for (const table of ["skills", "profile_skills", "experience_skills", "profile_target_countries"]) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table}`);
      assert.equal(Number(rows[0].n), 0, `${table} lisible par anon`);
    }
  } finally {
    await db.exec("reset role");
  }
});

test("un visiteur anonyme ne lit ni ne modifie les préférences privées d'un membre", async () => {
  // L'étudiant a posé ses cibles dans un test précédent : la donnée existe.
  const stored = await db.query<{ n: number }>(
    "select count(*)::int as n from profile_target_companies where profile_id = $1",
    [STUDENT],
  );
  assert.ok(Number(stored.rows[0].n) > 0, "fixture attendue");

  await db.exec("set role anon");
  try {
    for (const table of ["profile_target_countries", "profile_target_companies"]) {
      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from ${table}`);
      assert.equal(Number(rows[0].n), 0, `${table} lisible par anon`);
    }
    await refused(
      () => db.query("select set_profile_targets($1, $2)", [["FR"], []]),
      /permission denied|Aucune session/i,
    );
  } finally {
    await db.exec("reset role");
  }
});
