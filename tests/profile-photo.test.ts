import assert from "node:assert/strict";
import { before, test } from "node:test";
import type { PGlite } from "@electric-sql/pglite";
import sharp from "sharp";
import { avatarDisplay } from "../src/lib/avatar.ts";
import {
  MAX_PHOTO_BYTES,
  OUTPUT_SIDE,
  newPhotoKey,
  normalizeProfilePhoto,
  photoVersion,
  sniffImageType,
} from "../src/lib/profile-photo.ts";
import {
  removeProfilePhoto,
  uploadProfilePhoto,
  type PhotoStore,
} from "../src/lib/profile-photo-service.ts";
import { as, bootDatabase, refused, uuid } from "./pg-harness.ts";

/* ------------------------------------------------------------------ */
/* Images de test, générées à la volée                                 */
/* ------------------------------------------------------------------ */

const base = (width = 400, height = 300) =>
  sharp({ create: { width, height, channels: 3, background: { r: 23, g: 107, b: 82 } } });

const jpeg = async (w?: number, h?: number) => new Uint8Array(await base(w, h).jpeg().toBuffer());
const png = async (w?: number, h?: number) => new Uint8Array(await base(w, h).png().toBuffer());
const webp = async (w?: number, h?: number) => new Uint8Array(await base(w, h).webp().toBuffer());

const file = (type: string, bytes: Uint8Array) => ({ declaredType: type, size: bytes.length, bytes });

async function expectWebpSquare(bytes: Uint8Array) {
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, OUTPUT_SIDE);
  assert.equal(meta.height, OUTPUT_SIDE);
  return meta;
}

/* ------------------------------------------------------------------ */
/* Validation du contenu                                               */
/* ------------------------------------------------------------------ */

test("JPEG valide → WebP carré réencodé, sans métadonnées EXIF", async () => {
  const withExif = new Uint8Array(
    await base().jpeg().withExif({ IFD0: { Copyright: "secret", Artist: "gps-owner" } }).toBuffer(),
  );
  assert.ok((await sharp(withExif).metadata()).exif, "fixture avec EXIF");
  const result = await normalizeProfilePhoto(file("image/jpeg", withExif));
  assert.ok(result.ok);
  const meta = await expectWebpSquare(result.webp);
  assert.equal(meta.exif, undefined);
});

test("PNG valide accepté", async () => {
  const result = await normalizeProfilePhoto(file("image/png", await png()));
  assert.ok(result.ok);
  await expectWebpSquare(result.webp);
});

test("WebP valide accepté", async () => {
  const result = await normalizeProfilePhoto(file("image/webp", await webp()));
  assert.ok(result.ok);
  await expectWebpSquare(result.webp);
});

test("type MIME non accepté → 415 (GIF, SVG)", async () => {
  const gif = new Uint8Array(await base().gif().toBuffer());
  const gifResult = await normalizeProfilePhoto(file("image/gif", gif));
  assert.equal(gifResult.ok, false);
  assert.equal(!gifResult.ok && gifResult.error.status, 415);

  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const svgResult = await normalizeProfilePhoto(file("image/svg+xml", svg));
  assert.equal(!svgResult.ok && svgResult.error.status, 415);
});

test("fichier déguisé : le type annoncé ne suffit pas", async () => {
  // Un script annoncé comme PNG.
  const script = new TextEncoder().encode("#!/bin/sh\nrm -rf /\n".padEnd(400, " "));
  const disguised = await normalizeProfilePhoto(file("image/png", script));
  assert.equal(!disguised.ok && disguised.error.status, 415);

  // Un vrai PNG annoncé comme JPEG.
  const mismatch = await normalizeProfilePhoto(file("image/jpeg", await png()));
  assert.equal(!mismatch.ok && mismatch.error.status, 415);

  // La bonne signature, mais un contenu corrompu derrière.
  const corrupt = new Uint8Array(2000);
  corrupt.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const broken = await normalizeProfilePhoto(file("image/png", corrupt));
  assert.equal(!broken.ok && broken.error.status, 422);

  assert.equal(sniffImageType(await webp()), "image/webp");
  assert.equal(sniffImageType(script), null);
});

test("fichier trop lourd → 413, avant tout décodage", async () => {
  const bytes = new Uint8Array(MAX_PHOTO_BYTES + 1);
  bytes.set([0xff, 0xd8, 0xff]);
  const result = await normalizeProfilePhoto(file("image/jpeg", bytes));
  assert.equal(!result.ok && result.error.status, 413);

  // La taille annoncée compte aussi.
  const declared = await normalizeProfilePhoto({ declaredType: "image/jpeg", size: MAX_PHOTO_BYTES + 1, bytes: await jpeg() });
  assert.equal(!declared.ok && declared.error.status, 413);
});

test("dimensions hors limites → 422", async () => {
  const tiny = await normalizeProfilePhoto(file("image/png", await png(64, 64)));
  assert.equal(!tiny.ok && tiny.error.status, 422);
  const huge = await normalizeProfilePhoto(file("image/png", await png(9000, 200)));
  assert.equal(!huge.ok && huge.error.status, 422);
});

test("clé de stockage générée, jamais dérivée du nom de fichier", () => {
  const key = newPhotoKey(uuid(1));
  assert.match(key, /^00000000-0000-4000-8000-000000000001\/[0-9a-f-]{36}\.webp$/);
  assert.throws(() => newPhotoKey("../../etc"));
  assert.throws(() => newPhotoKey("a/b"));
  assert.doesNotMatch(photoVersion(key), /\//, "la version ne révèle pas la clé");
});

/* ------------------------------------------------------------------ */
/* Service : ajout, remplacement, suppression, session                 */
/* ------------------------------------------------------------------ */

function memoryStore() {
  const keys = new Map<string, string>();
  const objects = new Map<string, Uint8Array>();
  const store: PhotoStore = {
    currentKey: async (id) => keys.get(id) ?? null,
    putObject: async (key, bytes) => void objects.set(key, bytes),
    setKey: async (id, key) => void (key ? keys.set(id, key) : keys.delete(id)),
    deleteObject: async (key) => void objects.delete(key),
  };
  return { store, keys, objects };
}

const upload = async (bytes: Uint8Array, type = "image/jpeg") => ({ type, size: bytes.length, bytes });

test("upload puis remplacement : une seule photo stockée, l'ancienne supprimée", async () => {
  const { store, keys, objects } = memoryStore();
  const me = uuid(10);

  const first = await uploadProfilePhoto(store, me, await upload(await jpeg()));
  assert.ok(first.ok && first.version);
  const firstKey = keys.get(me)!;
  assert.ok(firstKey.startsWith(`${me}/`));

  const second = await uploadProfilePhoto(store, me, await upload(await png(), "image/png"));
  assert.ok(second.ok && second.version);
  assert.notEqual(second.version, first.version, "l'URL change, le cache est invalidé");
  assert.notEqual(keys.get(me), firstKey);
  assert.equal(objects.size, 1);
  assert.ok(!objects.has(firstKey));
});

test("un envoi refusé ne touche pas à la photo existante", async () => {
  const { store, keys, objects } = memoryStore();
  const me = uuid(11);
  await uploadProfilePhoto(store, me, await upload(await jpeg()));
  const before = keys.get(me);
  const rejected = await uploadProfilePhoto(store, me, await upload(new TextEncoder().encode("pas une image"), "image/png"));
  assert.equal(rejected.ok, false);
  assert.equal(keys.get(me), before);
  assert.equal(objects.size, 1);
});

test("suppression de la photo, et suppression sans photo", async () => {
  const { store, keys, objects } = memoryStore();
  const me = uuid(12);
  await uploadProfilePhoto(store, me, await upload(await webp(), "image/webp"));
  const removed = await removeProfilePhoto(store, me);
  assert.deepEqual(removed, { ok: true, version: null });
  assert.equal(keys.has(me), false);
  assert.equal(objects.size, 0);
  assert.deepEqual(await removeProfilePhoto(store, me), { ok: true, version: null });
});

test("sans session, ni envoi ni suppression", async () => {
  const { store, keys, objects } = memoryStore();
  const up = await uploadProfilePhoto(store, null, await upload(await jpeg()));
  assert.deepEqual(up.ok ? null : up.status, 401);
  const del = await removeProfilePhoto(store, null);
  assert.deepEqual(del.ok ? null : del.status, 401);
  assert.equal(keys.size + objects.size, 0);
});

test("avatar de repli : initiale sans photo, URL opaque avec photo", () => {
  const member = { id: uuid(13), fullName: "salma T." };
  assert.deepEqual(avatarDisplay(member, null), {
    kind: "monogram",
    initial: "S",
    alt: "Photo de salma T.",
  });
  const withPhoto = avatarDisplay(member, "abc123");
  assert.equal(withPhoto.kind, "photo");
  assert.equal(withPhoto.kind === "photo" && withPhoto.src, `/api/profile-photo/${uuid(13)}?v=abc123`);
  const blank = avatarDisplay({ id: "x", fullName: "  " }, null);
  assert.equal(blank.kind === "monogram" && blank.initial, "?");
});

/* ------------------------------------------------------------------ */
/* Base et stockage : on ne modifie que sa propre photo                */
/* ------------------------------------------------------------------ */

const ALICE = uuid(201);
const BOB = uuid(202);
const photoKey = (owner: string, n: number) =>
  `${owner}/${`0000000${n}`.slice(-8)}-1111-4222-8333-444444444444.webp`;

let db: PGlite;

before(async () => {
  db = await bootDatabase({ storage: true });
  for (const [id, email, name] of [
    [ALICE, "alice.photo@um6p.ma", "Alice"],
    [BOB, "bob.photo@um6p.ma", "Bob"],
  ]) {
    await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    await as(db, id, () =>
      db.query("insert into profiles (id, full_name, campus, promotion) values ($1, $2, 'rabat', 2026)", [id, name]),
    );
  }
});

test("le bucket avatars est privé et n'accepte que du WebP", async () => {
  const { rows } = await db.query<{ public: boolean; allowed_mime_types: string[]; file_size_limit: string }>(
    "select public, allowed_mime_types, file_size_limit from storage.buckets where id = 'avatars'",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].public, false);
  assert.deepEqual(rows[0].allowed_mime_types, ["image/webp"]);
});

test("un membre dépose et référence une photo dans son propre dossier", async () => {
  const key = photoKey(ALICE, 1);
  await as(db, ALICE, async () => {
    await db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [key]);
    const { affectedRows } = await db.query("update profiles set avatar_path = $1 where id = $2", [key, ALICE]);
    assert.equal(affectedRows, 1);
  });
});

test("un membre ne peut pas écrire dans le dossier d'un autre", async () => {
  await refused(
    () => as(db, BOB, () => db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [photoKey(ALICE, 2)])),
    /row-level security/i,
  );
});

test("un membre ne peut ni remplacer ni supprimer la photo d'un autre", async () => {
  const key = photoKey(ALICE, 1);
  const updated = await as(db, BOB, () =>
    db.query("update storage.objects set name = $1 where name = $2", [photoKey(BOB, 3), key]),
  );
  assert.equal(updated.affectedRows, 0);
  const deleted = await as(db, BOB, () => db.query("delete from storage.objects where name = $1", [key]));
  assert.equal(deleted.affectedRows, 0);
  const profile = await as(db, BOB, () =>
    db.query("update profiles set avatar_path = null where id = $1", [ALICE]),
  );
  assert.equal(profile.affectedRows, 0);
  const still = await db.query<{ avatar_path: string }>("select avatar_path from profiles where id = $1", [ALICE]);
  assert.equal(still.rows[0].avatar_path, key);
});

test("un profil ne peut pas pointer vers la photo d'un autre membre", async () => {
  await refused(
    () => as(db, BOB, () => db.query("update profiles set avatar_path = $1 where id = $2", [photoKey(ALICE, 1), BOB])),
    /profiles_avatar_path_own_folder/,
  );
  await refused(
    () => as(db, BOB, () => db.query("update profiles set avatar_path = $1 where id = $2", [`${BOB}/../x.webp`, BOB])),
    /profiles_avatar_path_own_folder/,
  );
});

test("les membres voient les photos, un visiteur anonyme non", async () => {
  const member = await as(db, BOB, () =>
    db.query<{ n: number }>("select count(*)::int as n from storage.objects where bucket_id = 'avatars'"),
  );
  assert.equal(Number(member.rows[0].n), 1);

  await db.exec("set role anon");
  try {
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from storage.objects");
    assert.equal(Number(rows[0].n), 0);
  } finally {
    await db.exec("reset role");
  }
});

test("le membre supprime sa propre photo", async () => {
  const key = photoKey(ALICE, 1);
  await as(db, ALICE, async () => {
    await db.query("update profiles set avatar_path = null where id = $1", [ALICE]);
    const { affectedRows } = await db.query("delete from storage.objects where name = $1", [key]);
    assert.equal(affectedRows, 1);
  });
});
