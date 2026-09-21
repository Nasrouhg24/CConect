import { isPlottable } from "../entries";
import type { Company, Entry } from "../types";
import type { TerminalTree } from "./terminal-types";

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });

/**
 * Arbre de navigation, dérivé des données existantes — aucune table en plus.
 *
 *   Monde → Pays → Ville → Entreprise   (depuis les expériences et contacts)
 *   Companies → Entreprise              (toutes les fiches entreprise)
 *
 * La géographie vient des mêmes entrées que la carte : un pays ou une ville
 * n'apparaît que si le réseau y a au moins une expérience ou un contact. C'est
 * ce qui garantit qu'un `cd` a toujours quelque chose à montrer sur la carte.
 * Une entreprise présente dans plusieurs villes figure sous chacune, mais reste
 * un seul objet (`companies`, par slug).
 */
export function buildTerminalTree(entries: Entry[], companies: Company[]): TerminalTree {
  const countries = new Map<string, { code: string; name: string; cityIds: Set<string> }>();
  const cities = new Map<string, { place: Entry["place"]; companySlugs: Set<string> }>();
  const companyRecords = new Map<string, { company: Company; placeIds: Set<string> }>();

  for (const company of companies) {
    companyRecords.set(company.slug, { company, placeIds: new Set() });
  }

  for (const entry of entries) {
    // Un lieu que la carte refuse de dessiner ne peut pas être une destination.
    if (!isPlottable(entry.place) || !entry.place.countryCode) continue;
    const { place, company } = entry;

    let country = countries.get(place.countryCode);
    if (!country) {
      country = { code: place.countryCode, name: place.countryName, cityIds: new Set() };
      countries.set(place.countryCode, country);
    }
    country.cityIds.add(place.id);

    let city = cities.get(place.id);
    if (!city) {
      city = { place, companySlugs: new Set() };
      cities.set(place.id, city);
    }
    city.companySlugs.add(company.slug);

    let record = companyRecords.get(company.slug);
    if (!record) {
      record = { company, placeIds: new Set() };
      companyRecords.set(company.slug, record);
    }
    record.placeIds.add(place.id);
  }

  const cityName = (id: string) => cities.get(id)?.place.city ?? "";
  const companyName = (slug: string) => companyRecords.get(slug)?.company.name ?? "";

  return {
    countries: new Map(
      [...countries].map(([code, c]) => [
        code,
        { code, name: c.name, cityIds: [...c.cityIds].sort((a, b) => byName(cityName(a), cityName(b))) },
      ]),
    ),
    countryOrder: [...countries.values()].sort((a, b) => byName(a.name, b.name)).map((c) => c.code),
    cities: new Map(
      [...cities].map(([id, c]) => [
        id,
        { place: c.place, companySlugs: [...c.companySlugs].sort((a, b) => byName(companyName(a), companyName(b))) },
      ]),
    ),
    companies: new Map(
      [...companyRecords].map(([slug, c]) => [
        slug,
        { company: c.company, placeIds: [...c.placeIds].sort((a, b) => byName(cityName(a), cityName(b))) },
      ]),
    ),
    companyOrder: [...companyRecords.values()]
      .sort((a, b) => byName(a.company.name, b.company.name))
      .map((c) => c.company.slug),
  };
}
