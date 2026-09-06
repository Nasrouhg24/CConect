/**
 * Normalisation des noms d'entreprise.
 *
 * Sans ça, « Microsoft », « Microsoft Corp. » et « MICROSOFT Corporation »
 * créent trois fiches et cassent le graphe. La forme canonique sert de clé de
 * rapprochement à la saisie ; elle ne remplace jamais le nom affiché, qui reste
 * celui qu'un membre a écrit.
 */

/** Suffixes juridiques et mentions de forme sociale, retirés avant comparaison. */
const LEGAL_SUFFIXES = [
  "corporation",
  "corp",
  "incorporated",
  "inc",
  "limited",
  "ltd",
  "llc",
  "plc",
  "gmbh",
  "ag",
  "sarl",
  "sas",
  "sasu",
  "sa",
  "spa",
  "srl",
  "bv",
  "nv",
  "oy",
  "ab",
  "as",
  "company",
  "co",
  "group",
  "groupe",
  "holding",
  "holdings",
  "international",
  "technologies",
  "technology",
  "solutions",
  "services",
];

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Forme canonique servant de clé de rapprochement.
 * « Microsoft Corp. » et « microsoft » donnent tous deux `microsoft`.
 */
export function normalizeCompanyName(name: string): string {
  const words = stripDiacritics(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // On ne retire un suffixe que s'il reste au moins un mot : « Group SA »
  // doit rester identifiable, et « SA » seul ne doit pas devenir vide.
  const kept: string[] = [];
  for (let i = words.length - 1; i >= 0; i -= 1) {
    const word = words[i];
    const isTrailingSuffix = kept.length === 0 && LEGAL_SUFFIXES.includes(word);
    if (!isTrailingSuffix) kept.unshift(word);
  }

  const result = kept.join(" ");
  return result || words.join(" ");
}

export function companySlug(name: string): string {
  return (
    stripDiacritics(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "entreprise"
  );
}

/** Monogramme affiché quand aucun logo n'est disponible. */
export function companyInitials(name: string): string {
  const words = stripDiacritics(name)
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Teinte du monogramme, déterministe à partir du nom.
 *
 * Six teintes désaturées de la même famille que la palette : c'est un repère
 * d'identification stable, pas une couleur au hasard — la même entreprise a
 * toujours la même pastille, sur toutes les pages.
 */
export const MONOGRAM_TINTS = [
  "#3f5d6b",
  "#4a5570",
  "#5d5068",
  "#6b5551",
  "#4f6350",
  "#5a5f47",
] as const;

export function monogramTint(name: string): string {
  let hash = 0;
  const canonical = normalizeCompanyName(name);
  for (let i = 0; i < canonical.length; i += 1) {
    hash = (hash * 31 + canonical.charCodeAt(i)) >>> 0;
  }
  return MONOGRAM_TINTS[hash % MONOGRAM_TINTS.length];
}
