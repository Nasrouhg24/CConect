import { countConnections, isExperience } from "../career";
import { COUNTRY_ALIASES } from "../data/countries";
import { normalize } from "../entries";
import { DOMAIN_LABELS, INDUSTRY_LABELS } from "../labels";
import { EMPTY_FILTERS, type Entry, type Filters } from "../types";
import { COMMANDS, type OutputBlock, type ParsedInput, type TerminalPath, type TerminalTree } from "./terminal-types";

/**
 * Navigation du mode terminal : résolution de chemins, exécution de `ls`,
 * `cd` et `cat`, complétion, et dérivation de l'état de la carte.
 *
 * Tout est pur : un chemin, une commande analysée et l'arbre entrent, un
 * nouveau chemin et des blocs de sortie sortent. Un chemin ne peut désigner
 * qu'un nœud de l'arbre CConnect — `..` à la racine reste à la racine, et
 * aucun segment n'est jamais interprété autrement que comme un nom.
 */

export const ROOT: TerminalPath = { type: "world" };
export const COMPANIES_DIR = "Companies";
const MAX_SEGMENTS = 16;

/* ------------------------------------------------------------------ */
/* Arbre : enfants, parents, noms                                      */
/* ------------------------------------------------------------------ */

interface Child {
  label: string;
  path: TerminalPath;
  /** Formes acceptées en plus du nom affiché (code pays, alias, slug). */
  aliases: string[];
}

export function children(path: TerminalPath, tree: TerminalTree): Child[] {
  switch (path.type) {
    case "world":
      return [
        ...tree.countryOrder.map((code) => {
          const country = tree.countries.get(code)!;
          return {
            label: country.name,
            path: { type: "country", countryCode: code } as const,
            aliases: [code, ...(COUNTRY_ALIASES[code] ?? [])],
          };
        }),
        { label: COMPANIES_DIR, path: { type: "companies" }, aliases: ["entreprises"] },
      ];
    case "country":
      return (tree.countries.get(path.countryCode)?.cityIds ?? []).map((placeId) => ({
        label: tree.cities.get(placeId)!.place.city,
        path: { type: "city", countryCode: path.countryCode, placeId },
        aliases: [],
      }));
    case "city":
      return (tree.cities.get(path.placeId)?.companySlugs ?? []).map((slug) => ({
        label: tree.companies.get(slug)!.company.name,
        path: { type: "company", slug, placeId: path.placeId },
        aliases: [slug],
      }));
    case "companies":
      return tree.companyOrder.map((slug) => ({
        label: tree.companies.get(slug)!.company.name,
        path: { type: "company", slug, placeId: null },
        aliases: [slug],
      }));
    case "company":
      return [];
  }
}

export function parent(path: TerminalPath, tree: TerminalTree): TerminalPath {
  switch (path.type) {
    // La racine est son propre parent : `..` ne sort jamais de l'arbre.
    case "world":
    case "country":
    case "companies":
      return ROOT;
    case "city":
      return { type: "country", countryCode: path.countryCode };
    case "company": {
      if (!path.placeId) return { type: "companies" };
      const city = tree.cities.get(path.placeId);
      return city
        ? { type: "city", countryCode: city.place.countryCode, placeId: path.placeId }
        : { type: "companies" };
    }
  }
}

/** Noms des segments, de la racine au nœud : `["France", "Paris", "Orange"]`. */
export function segments(path: TerminalPath, tree: TerminalTree): string[] {
  switch (path.type) {
    case "world":
      return [];
    case "country":
      return [tree.countries.get(path.countryCode)?.name ?? path.countryCode];
    case "city":
      return [...segments({ type: "country", countryCode: path.countryCode }, tree), tree.cities.get(path.placeId)?.place.city ?? path.placeId];
    case "companies":
      return [COMPANIES_DIR];
    case "company": {
      const name = tree.companies.get(path.slug)?.company.name ?? path.slug;
      return [...segments(parent(path, tree), tree), name];
    }
  }
}

/* ------------------------------------------------------------------ */
/* Échappement : un nom peut contenir « / »                            */
/* ------------------------------------------------------------------ */

/**
 * Dans un chemin tapé, `\/` est un « / » littéral et `\\` une barre oblique
 * inverse littérale. Rien d'autre n'est interprété : l'échappement ne sert qu'à
 * distinguer un séparateur d'un caractère de nom, jamais à introduire un
 * opérateur.
 */
export function escapeSegment(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/\//g, "\\/");
}

/** Découpe un chemin sur les « / » non échappés. */
export function splitSegments(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];
    if (char === "\\" && (next === "/" || next === "\\")) {
      current += next;
      i += 1;
    } else if (char === "/") {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/** Position du dernier « / » séparateur (non échappé), ou -1. */
function lastSeparator(raw: string): number {
  let last = -1;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "\\" && (raw[i + 1] === "/" || raw[i + 1] === "\\")) {
      i += 1;
    } else if (raw[i] === "/") {
      last = i;
    }
  }
  return last;
}

/** `/France/Paris/AC\/DC` — relisible tel quel par `cd`. */
export function displayPath(path: TerminalPath, tree: TerminalTree): string {
  const parts = segments(path, tree);
  return parts.length === 0 ? "~" : `/${parts.map(escapeSegment).join("/")}`;
}

export function prompt(path: TerminalPath, tree: TerminalTree): string {
  return `cconnect@world:${displayPath(path, tree)}$`;
}

export function samePath(a: TerminalPath, b: TerminalPath): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function matchChild(name: string, options: Child[]): Child | null {
  const wanted = normalize(name);
  return (
    options.find((c) => normalize(c.label) === wanted) ??
    options.find((c) => c.aliases.some((alias) => normalize(alias) === wanted)) ??
    null
  );
}

export type Resolution =
  | { ok: true; path: TerminalPath }
  | { ok: false; segment: string };

/**
 * Résout un chemin relatif (`Paris`, `../Lyon`) ou absolu (`/France/Paris`,
 * `~/Companies`) contre l'arbre. Seuls `.`, `..`, `/` et `~` ont un sens ;
 * tout le reste est un nom à trouver parmi les enfants du nœud courant.
 */
export function resolvePath(raw: string, from: TerminalPath, tree: TerminalTree): Resolution {
  let rest = raw.trim();
  let current = from;

  if (rest === "~" || rest.startsWith("~/")) {
    current = ROOT;
    rest = rest.slice(1);
  }
  if (rest.startsWith("/")) current = ROOT;

  // Un nom qui contient « / » (« AC/DC ») peut être tapé tel quel : l'argument
  // entier est d'abord comparé aux enfants du nœud courant. Il ne peut désigner
  // qu'un enfant existant — jamais un chemin.
  if (!rest.startsWith("/") && rest.includes("/")) {
    const whole = matchChild(rest, children(current, tree));
    if (whole) return { ok: true, path: whole.path };
  }

  const parts = splitSegments(rest).map((part) => part.trim()).filter(Boolean);
  if (parts.length > MAX_SEGMENTS) return { ok: false, segment: rest.slice(0, 40) };

  for (const [index, part] of parts.entries()) {
    if (part === ".") continue;
    if (part === "..") {
      current = parent(current, tree);
      continue;
    }
    const next = matchChild(part, children(current, tree));
    if (next) {
      current = next.path;
      continue;
    }
    // Nommer le nœud où l'on se trouve le désigne : après `cd Orange`,
    // `cat Orange` affiche sa fiche au lieu de chercher un enfant « Orange ».
    const here = segments(current, tree).at(-1);
    if (index === 0 && here && normalize(here) === normalize(part)) continue;
    return { ok: false, segment: part };
  }
  return { ok: true, path: current };
}

/* ------------------------------------------------------------------ */
/* Exécution                                                           */
/* ------------------------------------------------------------------ */

export interface ExecutionResult {
  path: TerminalPath;
  blocks: OutputBlock[];
}

const HELP = `Commandes disponibles : ${COMMANDS.join(", ")}`;

export function execute(
  parsed: ParsedInput,
  path: TerminalPath,
  tree: TerminalTree,
  entries: Entry[],
): ExecutionResult {
  switch (parsed.type) {
    case "empty":
      return { path, blocks: [] };
    case "invalid":
      return { path, blocks: [{ type: "error", lines: [parsed.message] }] };
    case "unknown":
      return { path, blocks: [{ type: "error", lines: [`${parsed.name}: commande introuvable`, HELP] }] };
  }

  const arg = parsed.args[0];

  switch (parsed.command) {
    case "ls": {
      if (arg !== undefined) {
        return { path, blocks: [{ type: "error", lines: ["ls: cette version n'accepte pas d'argument — utilise cd, puis ls"] }] };
      }
      return {
        path,
        blocks: [
          {
            type: "list",
            items: children(path, tree).map(({ label, path: target }) => ({ label, path: target })),
            empty: path.type === "company" ? "(entreprise : utilise cat pour voir sa fiche)" : "(vide)",
          },
        ],
      };
    }

    case "cd": {
      // Comme un shell : `cd` seul ramène à la racine.
      if (arg === undefined) return { path: ROOT, blocks: [] };
      const resolved = resolvePath(arg, path, tree);
      if (!resolved.ok) {
        return { path, blocks: [{ type: "error", lines: [`cd: ${resolved.segment}: aucun lieu ni entreprise de ce nom dans CConnect`] }] };
      }
      return { path: resolved.path, blocks: [] };
    }

    case "cat": {
      if (arg === undefined) {
        return { path, blocks: [{ type: "error", lines: ["cat: opérande manquant — ex. cat France, cat Paris, cat <entreprise>"] }] };
      }
      const resolved = resolvePath(arg, path, tree);
      if (!resolved.ok) {
        return { path, blocks: [{ type: "error", lines: [`cat: ${resolved.segment}: entité introuvable`] }] };
      }
      return { path, blocks: [describe(resolved.path, tree, entries)] };
    }
  }
}

/* ------------------------------------------------------------------ */
/* cat : fiches, uniquement à partir des données réelles               */
/* ------------------------------------------------------------------ */

function row(label: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "" || value === 0) return [];
  return [{ label, value: String(value) }];
}

function networkRows(scoped: Entry[]) {
  const experiences = scoped.filter(isExperience);
  const counts = countConnections(experiences);
  return [
    ...row("Connexions UM6P", counts.people),
    ...row("En poste", counts.current),
    ...row("Anciens employés", counts.former),
    ...row("Passés en stage", counts.internships),
    ...row("Expériences", experiences.length),
    ...row("Contacts", scoped.length - experiences.length),
  ];
}

export function describe(path: TerminalPath, tree: TerminalTree, entries: Entry[]): OutputBlock {
  switch (path.type) {
    case "world": {
      return {
        type: "info",
        title: "CConnect",
        rows: [
          ...row("Pays", tree.countryOrder.length),
          ...row("Villes", tree.cities.size),
          ...row("Entreprises", tree.companyOrder.length),
          ...networkRows(entries.filter((e) => tree.cities.has(e.place.id))),
        ],
        lists: [],
      };
    }
    case "companies":
      return { type: "info", title: COMPANIES_DIR, rows: row("Entreprises", tree.companyOrder.length), lists: [] };
    case "country": {
      const country = tree.countries.get(path.countryCode)!;
      const scoped = entries.filter((e) => e.place.countryCode === path.countryCode);
      return {
        type: "info",
        title: country.name,
        rows: [
          { label: "Type", value: "Pays" },
          ...row("Villes dans CConnect", country.cityIds.length),
          ...row("Entreprises", new Set(scoped.map((e) => e.company.slug)).size),
          ...networkRows(scoped),
        ],
        lists: [],
      };
    }
    case "city": {
      const city = tree.cities.get(path.placeId)!;
      const scoped = entries.filter((e) => e.place.id === path.placeId);
      return {
        type: "info",
        title: city.place.city,
        rows: [
          { label: "Type", value: "Ville" },
          { label: "Pays", value: city.place.countryName },
          ...row("Entreprises", city.companySlugs.length),
          ...networkRows(scoped),
        ],
        lists: [],
      };
    }
    case "company": {
      const record = tree.companies.get(path.slug)!;
      const { company } = record;
      const scoped = entries.filter((e) => e.company.slug === path.slug);
      const domains = [...new Set(scoped.map((e) => e.domain))].map((d) => DOMAIN_LABELS[d]).sort();
      const locations = record.placeIds.map((id) => {
        const place = tree.cities.get(id)!.place;
        return `${place.city}, ${place.countryName}`;
      });
      return {
        type: "info",
        title: company.name,
        rows: [
          { label: "Type", value: "Entreprise" },
          ...(company.industry !== "other" ? [{ label: "Secteur", value: INDUSTRY_LABELS[company.industry] }] : []),
          ...(company.headquarters
            ? [{ label: "Siège", value: `${company.headquarters.city}, ${company.headquarters.countryName}` }]
            : []),
          ...(locations.length === 0 ? [{ label: "Localisation", value: "Non renseignée" }] : []),
          ...(domains.length > 0 ? [{ label: "Domaines", value: domains.join(", ") }] : []),
          ...networkRows(scoped),
        ],
        lists: locations.length > 0 ? [{ label: "Présence dans le réseau", items: locations }] : [],
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Complétion (Tab)                                                    */
/* ------------------------------------------------------------------ */

export interface Completion {
  value: string;
  /** Plusieurs candidats : à afficher, la saisie ne va que jusqu'au préfixe commun. */
  options: string[];
}

function commonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0];
  for (const value of values.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < value.length && prefix[i].toLowerCase() === value[i].toLowerCase()) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

export function complete(input: string, path: TerminalPath, tree: TerminalTree): Completion {
  const line = input.replace(/\s+/g, " ").trimStart();
  const space = line.indexOf(" ");

  if (space === -1) {
    const options = COMMANDS.filter((c) => c.startsWith(line));
    if (options.length === 1) return { value: `${options[0]} `, options: [] };
    return { value: input, options: line ? [...options] : [] };
  }

  const command = line.slice(0, space);
  if (command !== "cd" && command !== "cat") return { value: input, options: [] };

  const arg = line.slice(space + 1);
  const slash = lastSeparator(arg);
  const base = arg.slice(0, slash + 1);
  const partial = normalize(splitSegments(arg.slice(slash + 1))[0] ?? "");

  const origin = base === "" ? { ok: true as const, path } : resolvePath(base === "/" ? "/" : base.slice(0, -1) || "/", path, tree);
  if (!origin.ok) return { value: input, options: [] };

  const matches = children(origin.path, tree).filter((c) => normalize(c.label).startsWith(partial));
  if (matches.length === 0) return { value: input, options: [] };
  if (matches.length === 1) {
    const only = matches[0];
    const trailing = children(only.path, tree).length > 0 ? "/" : "";
    return { value: `${command} ${base}${escapeSegment(only.label)}${trailing}`, options: [] };
  }
  const prefix = escapeSegment(commonPrefix(matches.map((m) => m.label)));
  const typed = arg.slice(slash + 1);
  return {
    value: prefix.length > typed.length ? `${command} ${base}${prefix}` : input,
    options: matches.map((m) => m.label),
  };
}

/* ------------------------------------------------------------------ */
/* Carte : tout dérive du chemin                                       */
/* ------------------------------------------------------------------ */

export interface TerminalView {
  /** Les filtres existants de la carte (`filterEntries`). */
  filters: Filters;
  /** Villes à cadrer. Vide → vue du monde. */
  focusPlaceIds: string[];
  /** Ville mise en évidence, comme un clic sur la carte. */
  selectedPlaceId: string | null;
}

export function terminalView(path: TerminalPath, tree: TerminalTree): TerminalView {
  switch (path.type) {
    case "world":
    case "companies":
      return { filters: EMPTY_FILTERS, focusPlaceIds: [], selectedPlaceId: null };
    case "country":
      return {
        filters: { ...EMPTY_FILTERS, country: path.countryCode },
        focusPlaceIds: tree.countries.get(path.countryCode)?.cityIds ?? [],
        selectedPlaceId: null,
      };
    case "city":
      return {
        filters: { ...EMPTY_FILTERS, city: path.placeId },
        focusPlaceIds: [path.placeId],
        selectedPlaceId: path.placeId,
      };
    case "company":
      return path.placeId
        ? {
            filters: { ...EMPTY_FILTERS, company: path.slug, city: path.placeId },
            focusPlaceIds: [path.placeId],
            selectedPlaceId: path.placeId,
          }
        : {
            filters: { ...EMPTY_FILTERS, company: path.slug },
            focusPlaceIds: tree.companies.get(path.slug)?.placeIds ?? [],
            selectedPlaceId: null,
          };
  }
}

/**
 * Un clic sur un marqueur de la carte → le chemin de cette ville. Recliquer la
 * ville déjà sélectionnée (la carte envoie `null`) remonte d'un niveau, comme
 * `cd ..`.
 */
export function pathFromMapSelection(
  placeId: string | null,
  current: TerminalPath,
  tree: TerminalTree,
): TerminalPath {
  if (placeId === null) return current.type === "world" ? ROOT : parent(current, tree);
  const city = tree.cities.get(placeId);
  if (!city) return current;
  return { type: "city", countryCode: city.place.countryCode, placeId };
}

/* ------------------------------------------------------------------ */
/* URL : `/terminal?path=/France/Paris`                                */
/* ------------------------------------------------------------------ */

const MAX_QUERY_LENGTH = 512;

/**
 * Valeur du paramètre `path` (avant encodage d'URL) : les noms, séparés par
 * « / ». Dans un nom, seuls « % » et « / » sont échappés (`%25`, `%2F`) pour
 * que le séparateur reste sans ambiguïté. `null` pour la racine.
 */
export function pathToQuery(path: TerminalPath, tree: TerminalTree): string | null {
  const parts = segments(path, tree);
  if (parts.length === 0) return null;
  return `/${parts.map((part) => part.replace(/%/g, "%25").replace(/\//g, "%2F")).join("/")}`;
}

/**
 * Relit le paramètre `path`. Volontairement plus strict que `cd` : chemin
 * absolu uniquement, aucun `.` ni `..`, chaque segment doit nommer un enfant
 * existant. Tout le reste renvoie à la racine — une URL ne peut rien faire
 * d'autre que désigner un nœud de l'arbre.
 */
export function pathFromQuery(value: string | null | undefined, tree: TerminalTree): TerminalPath {
  if (!value || value.length > MAX_QUERY_LENGTH || !value.startsWith("/")) return ROOT;
  const parts = value.slice(1).split("/");
  if (parts.length > MAX_SEGMENTS) return ROOT;

  let current: TerminalPath = ROOT;
  for (const raw of parts) {
    const name = raw.replace(/%(2F|25)/gi, (match) => (match.toUpperCase() === "%2F" ? "/" : "%"));
    if (!name.trim() || name === "." || name === "..") return ROOT;
    const next = matchChild(name, children(current, tree));
    if (!next) return ROOT;
    current = next.path;
  }
  return current;
}

/** Lien vers une position : `/terminal` ou `/terminal?path=/France/Paris`. */
export function terminalHref(path: TerminalPath, tree: TerminalTree): string {
  const query = pathToQuery(path, tree);
  if (!query) return "/terminal";
  // Les « / » séparateurs restent lisibles ; un « %2F » de nom devient « %252F ».
  return `/terminal?path=${encodeURIComponent(query).replace(/%2F/g, "/")}`;
}
