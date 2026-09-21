import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Postgres jetable pour les suites qui ont besoin de leur propre base.
 *
 * Mêmes rôles et mêmes privilèges que `database-security.test.ts` : une suite
 * isolée évite qu'un test de quota épuise le débit d'un membre utilisé
 * ailleurs. Pas un fichier `*.test.ts` : il n'est pas exécuté seul.
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

/**
 * Ce que Supabase Storage installe, réduit au nécessaire : les deux tables, la
 * fonction `foldername` qu'utilisent les politiques, et la RLS activée comme
 * sur un vrai projet. Optionnel : les suites qui ne touchent pas au stockage
 * vérifient au passage que les migrations s'appliquent sans lui.
 */
const STORAGE_STUB = `
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid(),
  unique (bucket_id, name)
);
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $fn$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$fn$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.objects, storage.buckets to anon;
grant select on storage.buckets to authenticated;
`;

const API_GRANTS = `
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant execute                       on all functions  in schema public to authenticated;
grant select                        on all tables     in schema public to anon;

revoke all on table write_rate_events from anon, authenticated;
revoke all on table audit_log         from anon, authenticated;
grant select on table audit_log to authenticated;
`;

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export async function bootDatabase({ storage = false } = {}): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  if (storage) await db.exec(STORAGE_STUB);
  const migrations = readdirSync(dir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await db.exec(readFileSync(dir(`supabase/migrations/${file}`), "utf8"));
  }
  await db.exec(readFileSync(dir("supabase/seed.sql"), "utf8"));
  await db.exec(API_GRANTS);
  return db;
}

/** Exécute `fn` sous le rôle `authenticated`, avec `auth.uid()` positionné. */
export async function as<T>(db: PGlite, id: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

export async function refused(fn: () => Promise<unknown>, by: RegExp): Promise<string> {
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
