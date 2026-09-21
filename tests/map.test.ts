import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

/**
 * Garde-fou de `docs/MAP.md` et de `docs/map/`.
 *
 * Une carte périmée coûte plus cher que pas de carte du tout : elle envoie
 * lire un fichier qui n'existe plus, et laisse croire que ce qu'elle ne
 * mentionne pas n'existe pas. Deux vérifications, donc, dans les deux sens :
 * tout fichier du dépôt est inscrit quelque part, et tout chemin cité existe.
 *
 * Ce test échoue quand on ajoute un fichier sans l'inscrire. C'est voulu —
 * c'est le seul moment où l'inscrire coûte une minute.
 */

const ROOT = new URL("../", import.meta.url);
const path = (p: string) => fileURLToPath(new URL(p, ROOT));
const read = (p: string) => readFileSync(path(p), "utf8");

const MAPS = [
  "docs/MAP.md",
  "docs/map/routes.md",
  "docs/map/components.md",
  "docs/map/lib.md",
  "docs/map/database.md",
  "docs/map/tests.md",
  "docs/map/features.md",
];

const atlas = MAPS.map(read).join("\n");

function walk(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(path(dir), { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(child, match, out);
    else if (match.test(entry.name)) out.push(child);
  }
  return out;
}

/**
 * Un fichier est « inscrit » si une carte le désigne **sans ambiguïté**.
 *
 * Deux formes acceptées, et pas une de plus : un chemin d'au moins deux
 * segments (`legal/ConsentGate.tsx`), ou le nom seul quand ce nom n'existe
 * qu'une fois dans le dépôt (`repository.ts`). Accepter n'importe quel nom nu
 * viderait le test de son sens : `page.tsx` apparaît des dizaines de fois,
 * il « couvrirait » toutes les routes du monde.
 */
function inscribed(file: string, uniqueNames: Set<string>): boolean {
  const parts = file.split("/");
  for (let i = 0; i <= parts.length - 2; i += 1) {
    if (atlas.includes(parts.slice(i).join("/"))) return true;
  }
  const name = parts[parts.length - 1];
  return uniqueNames.has(name) && atlas.includes(name);
}

/** Noms de fichier qui n'apparaissent qu'une fois dans tout le dépôt. */
function unambiguousNames(files: string[]): Set<string> {
  const seen = new Map<string, number>();
  for (const f of files) {
    const name = f.split("/").pop()!;
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n === 1).map(([name]) => name));
}

test("les cartes existent", () => {
  for (const map of MAPS) {
    assert.ok(existsSync(path(map)), `${map} manque`);
  }
});

const SOURCES = walk("src", /\.(ts|tsx)$/);
const SUITES = walk("tests", /\.(ts|mjs)$/);
const MIGRATIONS = walk("supabase/migrations", /\.sql$/);
const UNIQUE = unambiguousNames([...SOURCES, ...SUITES, ...MIGRATIONS]);

test("chaque fichier source est inscrit dans une carte", () => {
  const missing = SOURCES.filter((f) => !inscribed(f, UNIQUE));
  assert.deepEqual(missing, [], "fichiers absents des cartes");
});

test("chaque suite de tests est inscrite", () => {
  const missing = SUITES.filter((f) => !inscribed(f, UNIQUE));
  assert.deepEqual(missing, [], "tests absents de docs/map/tests.md");
});

test("chaque migration est inscrite", () => {
  const missing = MIGRATIONS.filter((f) => !inscribed(f, UNIQUE));
  assert.deepEqual(missing, [], "migrations absentes de docs/map/database.md");
});

test("chaque chemin cité par une carte existe", () => {
  /*
   * Les cartes citent court : la carte des composants écrit
   * `network/NetworkExplorer.tsx`, celle des routes `LoginForm.tsx`. Une
   * citation est donc valide si un fichier du dépôt s'y termine — ce qui
   * garde la citation lisible sans la rendre invérifiable, et attrape quand
   * même le fichier renommé ou supprimé.
   */
  const files = [
    ...walk("src", /\.(ts|tsx|css)$/),
    ...walk("tests", /\.(ts|mjs)$/),
    ...walk("docs", /\.md$/),
    ...walk("supabase", /\.sql$/),
    ...walk("scripts", /\.mjs$/),
    // Les documents de la racine (AGENTS.md, README.md…) sont cités eux aussi.
    ...readdirSync(path("."), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name),
  ];

  const alive = (cite: string) =>
    files.some((f) => f === cite || f.endsWith(`/${cite}`));

  const dead: string[] = [];
  for (const map of MAPS) {
    for (const [, cite] of read(map).matchAll(
      /`([A-Za-z0-9_./[\]-]+\.(?:ts|tsx|sql|css|mjs|md))`/g,
    )) {
      if (cite.startsWith("node_modules/")) continue;
      if (!alive(cite)) dead.push(`${map} → ${cite}`);
    }
  }
  assert.deepEqual(dead, [], "chemins cités qui n'existent pas");
});

test("les liens entre cartes pointent sur un fichier réel", () => {
  for (const map of MAPS) {
    const dir = map.slice(0, map.lastIndexOf("/"));
    for (const [, href] of read(map).matchAll(/\]\((?!https?:)([^)#]+\.md)(?:#[^)]*)?\)/g)) {
      const target = new URL(href, new URL(`${dir}/`, ROOT));
      assert.ok(existsSync(fileURLToPath(target)), `${map} → ${href} est mort`);
    }
  }
});

test("le point d'entrée de la carte est annoncé au chargement du projet", () => {
  // Sans cette ligne dans CLAUDE.md, la carte n'est lue que si on pense à la
  // chercher — c'est-à-dire trop tard.
  assert.match(read("CLAUDE.md"), /docs\/MAP\.md/);
});
