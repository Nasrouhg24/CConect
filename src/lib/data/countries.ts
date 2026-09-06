/**
 * Alias de pays utilisés uniquement par la recherche libre.
 *
 * L'interface est en français, mais on tape souvent le nom anglais d'un pays
 * (« Germany », « Spain »). Ces alias vivent côté application et ne sont pas
 * stockés en base : ajouter une langue ne demande pas de migration.
 */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  MA: ["morocco", "maroc"],
  TN: ["tunisia"],
  SN: ["senegal"],
  FR: ["france"],
  GB: ["united kingdom", "uk", "england", "britain", "angleterre"],
  DE: ["germany", "deutschland", "allemagne"],
  NL: ["netherlands", "holland", "pays-bas"],
  IE: ["ireland", "irlande"],
  ES: ["spain", "espagne"],
  PT: ["portugal"],
  CH: ["switzerland", "suisse"],
  CA: ["canada"],
  US: ["united states", "usa", "etats-unis", "america"],
  AE: ["united arab emirates", "uae", "emirates"],
  IN: ["india", "inde"],
  SG: ["singapore", "singapour"],
  JP: ["japan", "japon"],
  BR: ["brazil", "bresil"],
  AU: ["australia", "australie"],
};
