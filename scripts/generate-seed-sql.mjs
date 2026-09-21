/**
 * Génère `supabase/seed.sql` à partir des référentiels TypeScript.
 *
 * Le mode démo et la base réelle doivent partir des mêmes villes et des mêmes
 * entreprises. Écrire le SQL à la main les ferait diverger au premier ajout ;
 * ce script garantit qu'ils restent la même liste.
 *
 * Usage : npm run seed:sql
 */
import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const quote = (value) =>
  value === null ? "null" : `'${String(value).replace(/'/g, "''")}'`;

/* Villes -------------------------------------------------------------- */

const placesSource = read("src/lib/data/places.ts");
const placeRe =
  /\{ id: "([^"]+)", city: "([^"]+)", countryCode: "([^"]+)", countryName: "([^"]+)", continent: "([^"]+)", lat: ([-\d.]+), lng: ([-\d.]+) \}/g;

const places = [...placesSource.matchAll(placeRe)].map((m) => ({
  id: m[1],
  city: m[2],
  countryCode: m[3],
  countryName: m[4],
  continent: m[5],
  lat: m[6],
  lng: m[7],
}));

/* Entreprises --------------------------------------------------------- */

const seedSource = read("src/lib/data/seed.ts");
const companyRe =
  /company\(\{\s*name: "([^"]+)",\s*website: (?:"([^"]+)"|null),\s*industry: "([^"]+)",\s*description:\s*"((?:[^"\\]|\\.)*)",\s*linkedinUrl: (?:"([^"]+)"|null),\s*headquartersId: (?:"([^"]+)"|null),\s*\}\)/g;

const companies = [...seedSource.matchAll(companyRe)].map((m) => ({
  name: m[1],
  website: m[2] ?? null,
  industry: m[3],
  description: m[4].replace(/\\"/g, '"'),
  linkedinUrl: m[5] ?? null,
  headquartersId: m[6] ?? null,
}));

if (places.length === 0 || companies.length === 0) {
  throw new Error(
    "Extraction vide : le format des données sources a changé, mets à jour ce script.",
  );
}

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const placeRow = (p) =>
  `  (${quote(p.city)}, ${quote(p.countryCode)}, ${quote(p.countryName)}, ${quote(p.continent)}, ${p.lat}, ${p.lng})`;

/* Le domaine n'est pas écrit dans les données source : il se déduit du site, et
   c'est la base qui le déduit (`normalize_company_domain`, migration 0007). Une
   seule règle de normalisation, appliquée au même endroit pour les fiches
   semées et pour celles créées par un membre. */
const companyRow = (c) =>
  `  (${quote(c.name)}, ${quote(slugify(c.name))}, public.canonical_company_name(${quote(c.name)}), ${quote(c.website)}, public.normalize_company_domain(${quote(c.website)}), ${quote(c.industry)}, ${quote(c.linkedinUrl)}, ${quote(c.description)}, ${
    c.headquartersId
      ? `(select id from places where city = ${quote(places.find((p) => p.id === c.headquartersId)?.city ?? "")} limit 1)`
      : "null"
  })`;

const sql = `-- Données de départ de CConnect. Généré par scripts/generate-seed-sql.mjs.
-- Ne pas éditer à la main : modifier src/lib/data/*.ts puis relancer
--   npm run seed:sql
--
-- À exécuter après les migrations. Ce fichier ne contient QUE des référentiels
-- (villes, entreprises) : les expériences et contacts viennent des
-- membres.

insert into places (city, country_code, country_name, continent, lat, lng) values
${places.map(placeRow).join(",\n")}
on conflict (city, country_code) do nothing;

insert into companies (name, slug, normalized_name, website, domain, industry, linkedin_url, description, headquarters_id) values
${companies.map(companyRow).join(",\n")}
on conflict (normalized_name) do nothing;
`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql : ${places.length} villes, ${companies.length} entreprises`);
