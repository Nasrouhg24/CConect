import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { AUTHORS, CONTACTS, EXPERIENCES } from "../src/lib/data/seed.ts";
import {
  clusterByPlace,
  computeFacets,
  contactToEntry,
  experienceToEntry,
  filterEntries,
} from "../src/lib/entries.ts";
import { expandQuery } from "../src/lib/search.ts";
import { EMPTY_FILTERS, type Filters } from "../src/lib/types.ts";

/**
 * Parité entre l'agrégat de la base et celui de l'application.
 *
 * `/network` ne transfère plus les contributions : la carte est dessinée
 * depuis `map_clusters`, calculé en base. Mais le mode démo et le mode
 * terminal, eux, agrègent en mémoire avec `clusterByPlace(filterEntries(…))`.
 * Deux implémentations de la même règle, donc deux occasions de diverger —
 * exactement le risque que ce fichier ferme : le même jeu de données passe par
 * les deux chemins, et les marqueurs obtenus doivent être identiques,
 * filtre par filtre.
 *
 * La recherche libre est le point délicat : les libellés français
 * (« Cybersécurité », « Alumni ») n'existent pas en base. `expandQuery` les
 * traduit en clés avant l'appel ; si cette traduction se décale, c'est ici que
 * ça se voit.
 */

const ROOT = new URL("../", import.meta.url);
const dir = (path: string) => fileURLToPath(new URL(path, ROOT));

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

/** Le jeu de démonstration, sous la forme que voit la carte. */
const ENTRIES = [
  ...EXPERIENCES.map(experienceToEntry),
  ...CONTACTS.map(contactToEntry),
];

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

let db: PGlite;
/** `p-paris` → l'uuid tiré par la base pour cette ville. */
const placeIds = new Map<string, string>();

/** Ce qui est comparé : la ville, son poids, ce qu'elle contient. */
interface Marker {
  city: string;
  countryCode: string;
  total: number;
  experienceCount: number;
  contactCount: number;
  companySlugs: string[];
}

async function fromDatabase(filters: Filters): Promise<Marker[]> {
  const payload: Record<string, unknown> = {
    entryKind: filters.entryKind,
    continent: filters.continent,
    country: filters.country,
    city: filters.city,
    company: filters.company,
    domain: filters.domain,
    campus: filters.campus,
    status: filters.status,
    year: filters.year,
    experienceKind: filters.experienceKind,
    tokens: expandQuery(filters.q),
  };
  const { rows } = await db.query<{ c: Marker[] }>(
    "select public.map_clusters($1::jsonb) as c",
    [JSON.stringify(payload)],
  );
  return rows[0].c.map((row) => ({
    city: row.city,
    countryCode: row.countryCode,
    total: Number(row.total),
    experienceCount: Number(row.experienceCount),
    contactCount: Number(row.contactCount),
    companySlugs: [...row.companySlugs].sort(),
  }));
}

function fromApplication(filters: Filters): Marker[] {
  return clusterByPlace(filterEntries(ENTRIES, filters)).map((cluster) => ({
    city: cluster.place.city,
    countryCode: cluster.place.countryCode,
    total: cluster.total,
    experienceCount: cluster.experienceCount,
    contactCount: cluster.contactCount,
    companySlugs: [...cluster.companySlugs].sort(),
  }));
}

/**
 * Les deux chemins trient à poids égal sur un identifiant différent (un uuid
 * en base, la clé du référentiel en mémoire) : on compare des ensembles, pas
 * un ordre. L'ordre qui compte — le poids décroissant — est vérifié à part.
 */
function byCity(markers: Marker[]) {
  return [...markers].sort((a, b) => a.city.localeCompare(b.city));
}

async function bothAgree(label: string, filters: Filters) {
  const expected = fromApplication(filters);
  const actual = await fromDatabase(filters);
  assert.deepEqual(byCity(actual), byCity(expected), label);
  return expected;
}

before(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);

  for (const file of readdirSync(dir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(dir(`supabase/migrations/${file}`), "utf8"));
  }
  await db.exec(readFileSync(dir("supabase/seed.sql"), "utf8"));

  const places = await db.query<{ id: string; city: string; country_code: string }>(
    "select id, city, country_code from places",
  );
  const bySlugKey = new Map(
    places.rows.map((r) => [`${r.city}|${r.country_code}`, r.id]),
  );
  for (const entry of ENTRIES) {
    const id = bySlugKey.get(`${entry.place.city}|${entry.place.countryCode}`);
    assert.ok(id, `ville absente du référentiel : ${entry.place.city}`);
    placeIds.set(entry.place.id, id);
  }

  /* Les écritures sont faites sans session : le quota d'écriture et la RLS
     visent un membre connecté, et ce fichier teste l'agrégat, pas les droits
     (c'est `database-security.test.ts` qui les attaque). */
  const authorIds = new Map<string, string>();
  for (const [index, member] of AUTHORS.entries()) {
    const id = uuid(index + 1);
    authorIds.set(member.id, id);
    await db.query("insert into auth.users (id, email) values ($1, $2)", [
      id,
      `${member.id}@um6p.ma`,
    ]);
    await db.query(
      `insert into profiles (id, full_name, campus, status, promotion)
       values ($1, $2, $3, $4, $5)`,
      [id, member.fullName, member.campus, member.status, member.promotion],
    );
  }

  const companies = await db.query<{ id: string; slug: string }>(
    "select id, slug from companies",
  );
  const companyIds = new Map(companies.rows.map((r) => [r.slug, r.id]));

  for (const e of EXPERIENCES) {
    await db.query(
      `insert into experiences (author_id, company_id, place_id, domain, kind, year, title, summary)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        authorIds.get(e.author.id),
        companyIds.get(e.company.slug),
        placeIds.get(e.place.id),
        e.domain,
        e.kind,
        e.year,
        e.title,
        e.summary,
      ],
    );
  }

  for (const c of CONTACTS) {
    await db.query(
      `insert into contacts (author_id, company_id, place_id, domain, first_name,
                             last_name, position, linkedin_url, notes, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        authorIds.get(c.author.id),
        companyIds.get(c.company.slug),
        placeIds.get(c.place.id),
        c.domain,
        c.firstName,
        c.lastName,
        c.position,
        c.linkedinUrl,
        c.notes,
        c.createdAt,
      ],
    );
  }
});

/* ------------------------------------------------------------------ */
/* Sans filtre                                                         */
/* ------------------------------------------------------------------ */

test("sans filtre : un marqueur par ville, les mêmes des deux côtés", async () => {
  const markers = await bothAgree("carte complète", EMPTY_FILTERS);
  assert.ok(markers.length > 1, "le jeu de démonstration couvre plusieurs villes");
  assert.equal(
    markers.reduce((n, m) => n + m.total, 0),
    ENTRIES.length,
    "aucune contribution perdue par l'agrégat",
  );
});

test("les marqueurs sont rendus du plus lourd au plus léger", async () => {
  const { rows } = await db.query<{ c: { total: number }[] }>(
    "select public.map_clusters('{}'::jsonb) as c",
  );
  const totals = rows[0].c.map((m) => Number(m.total));
  assert.deepEqual(totals, [...totals].sort((a, b) => b - a));
});

/* ------------------------------------------------------------------ */
/* Filtres structurels                                                 */
/* ------------------------------------------------------------------ */

test("chaque filtre structurel donne le même résultat en base et en mémoire", async () => {
  const cases: [string, Partial<Filters>][] = [
    ["domaine", { domain: "cybersecurity" }],
    ["pays", { country: "FR" }],
    ["continent", { continent: "europe" }],
    ["entreprise", { company: "microsoft" }],
    ["type d'entrée", { entryKind: "contact" }],
    ["type de stage", { experienceKind: "pfe" }],
    ["statut", { status: "alumni" }],
    ["campus", { campus: "benguerir" }],
    ["année", { year: 2022 }],
    ["croisement", { country: "FR", domain: "cybersecurity", status: "alumni" }],
  ];

  for (const [label, patch] of cases) {
    await bothAgree(label, { ...EMPTY_FILTERS, ...patch });
  }
});

test("filtrer sur une ville ne laisse que cette ville", async () => {
  const demoPlace = ENTRIES[0].place;
  const markers = await fromDatabase({
    ...EMPTY_FILTERS,
    city: placeIds.get(demoPlace.id) ?? "",
  });
  assert.deepEqual(
    markers.map((m) => m.city),
    [demoPlace.city],
  );
  assert.deepEqual(
    markers,
    byCity(fromApplication({ ...EMPTY_FILTERS, city: demoPlace.id })),
  );
});

/* ------------------------------------------------------------------ */
/* Recherche libre                                                     */
/* ------------------------------------------------------------------ */

test("la recherche libre se comporte pareil en base et en mémoire", async () => {
  const queries = [
    "paris",
    "microsoft",
    "cybersecurite", // libellé de domaine, sans accent
    "Cybersécurité", // le même, accentué
    "alumni", // libellé de statut
    "germany", // alias de pays, qui n'existe pas en base
    "contact", // le mot qui désigne les entrées sans stage
    "recruiter",
    "microsoft paris", // deux mots : les deux doivent toucher
    "introuvable-xyz",
  ];

  for (const q of queries) {
    await bothAgree(`recherche « ${q} »`, { ...EMPTY_FILTERS, q });
  }
});

test("un mot de la recherche n'est jamais lu comme un joker SQL", async () => {
  for (const q of ["%", "_", "%%", "a%b"]) {
    const markers = await fromDatabase({ ...EMPTY_FILTERS, q });
    assert.deepEqual(
      byCity(markers),
      byCity(fromApplication({ ...EMPTY_FILTERS, q })),
      `« ${q} » doit être cherché tel quel`,
    );
  }
});

test("recherche et filtre se cumulent", async () => {
  await bothAgree("recherche + filtre", {
    ...EMPTY_FILTERS,
    q: "paris",
    entryKind: "experience",
  });
});

/* ------------------------------------------------------------------ */
/* Facettes et autocomplétion                                          */
/* ------------------------------------------------------------------ */

test("les facettes offertes par la base sont celles du jeu de données", async () => {
  const { rows } = await db.query<{
    f: { countries: { code: string; name: string }[]; years: number[] };
  }>("select public.network_facets() as f");
  const expected = computeFacets(ENTRIES);

  assert.deepEqual(
    rows[0].f.countries.map((c) => c.code).sort(),
    expected.countries.map((c) => c.code).sort(),
  );
  assert.deepEqual(
    rows[0].f.years.map(Number).sort((a, b) => b - a),
    expected.years,
  );
});

test("l'autocomplétion remonte entreprise, ville, pays et membre", async () => {
  const { rows } = await db.query<{
    s: {
      companies: { name: string; count: number }[];
      cities: { city: string }[];
      countries: { code: string }[];
      members: { name: string }[];
    };
  }>("select public.network_suggestions($1, $2, $3) as s", ["micro", [], 7]);

  assert.ok(
    rows[0].s.companies.some((c) => c.name === "Microsoft"),
    "l'entreprise tapée est proposée",
  );
  assert.ok(
    rows[0].s.companies.every((c) => Number(c.count) > 0),
    "une suggestion sans contribution n'a rien à proposer",
  );

  const paris = await db.query<{ s: { cities: { city: string }[] } }>(
    "select public.network_suggestions($1, $2, $3) as s",
    ["paris", [], 7],
  );
  assert.ok(paris.rows[0].s.cities.some((c) => c.city === "Paris"));

  // « germany » n'est nulle part en base : l'alias est développé par
  // l'application, qui passe le code pays.
  const germany = await db.query<{ s: { countries: { code: string }[] } }>(
    "select public.network_suggestions($1, $2, $3) as s",
    ["germany", ["DE"], 7],
  );
  assert.ok(germany.rows[0].s.countries.some((c) => c.code === "DE"));
});

test("une recherche vide ne propose rien", async () => {
  const { rows } = await db.query<{ s: Record<string, unknown[]> }>(
    "select public.network_suggestions($1, $2, $3) as s",
    ["", [], 7],
  );
  for (const list of Object.values(rows[0].s)) {
    assert.deepEqual(list, []);
  }
});
