import type { Place } from "../types";

/**
 * Référentiel de villes utilisé par la carte.
 * Ajouter une ville = ajouter une ligne ici (et dans `supabase/seed.sql`).
 * Coordonnées en degrés décimaux, WGS84.
 */
export const PLACES: Place[] = [
  { id: "p-casablanca", city: "Casablanca", countryCode: "MA", countryName: "Maroc", continent: "africa", lat: 33.573, lng: -7.59 },
  { id: "p-rabat", city: "Rabat", countryCode: "MA", countryName: "Maroc", continent: "africa", lat: 34.02, lng: -6.841 },
  { id: "p-benguerir", city: "Benguerir", countryCode: "MA", countryName: "Maroc", continent: "africa", lat: 32.236, lng: -7.951 },
  { id: "p-tunis", city: "Tunis", countryCode: "TN", countryName: "Tunisie", continent: "africa", lat: 36.806, lng: 10.181 },
  { id: "p-dakar", city: "Dakar", countryCode: "SN", countryName: "Sénégal", continent: "africa", lat: 14.716, lng: -17.467 },
  { id: "p-paris", city: "Paris", countryCode: "FR", countryName: "France", continent: "europe", lat: 48.857, lng: 2.352 },
  { id: "p-toulouse", city: "Toulouse", countryCode: "FR", countryName: "France", continent: "europe", lat: 43.605, lng: 1.444 },
  { id: "p-lyon", city: "Lyon", countryCode: "FR", countryName: "France", continent: "europe", lat: 45.764, lng: 4.836 },
  { id: "p-london", city: "Londres", countryCode: "GB", countryName: "Royaume-Uni", continent: "europe", lat: 51.507, lng: -0.128 },
  { id: "p-berlin", city: "Berlin", countryCode: "DE", countryName: "Allemagne", continent: "europe", lat: 52.52, lng: 13.405 },
  { id: "p-munich", city: "Munich", countryCode: "DE", countryName: "Allemagne", continent: "europe", lat: 48.135, lng: 11.582 },
  { id: "p-amsterdam", city: "Amsterdam", countryCode: "NL", countryName: "Pays-Bas", continent: "europe", lat: 52.37, lng: 4.895 },
  { id: "p-dublin", city: "Dublin", countryCode: "IE", countryName: "Irlande", continent: "europe", lat: 53.35, lng: -6.26 },
  { id: "p-madrid", city: "Madrid", countryCode: "ES", countryName: "Espagne", continent: "europe", lat: 40.417, lng: -3.704 },
  { id: "p-lisbon", city: "Lisbonne", countryCode: "PT", countryName: "Portugal", continent: "europe", lat: 38.722, lng: -9.139 },
  { id: "p-zurich", city: "Zurich", countryCode: "CH", countryName: "Suisse", continent: "europe", lat: 47.377, lng: 8.542 },
  { id: "p-montreal", city: "Montréal", countryCode: "CA", countryName: "Canada", continent: "north_america", lat: 45.502, lng: -73.567 },
  { id: "p-toronto", city: "Toronto", countryCode: "CA", countryName: "Canada", continent: "north_america", lat: 43.653, lng: -79.383 },
  { id: "p-sanfrancisco", city: "San Francisco", countryCode: "US", countryName: "États-Unis", continent: "north_america", lat: 37.775, lng: -122.419 },
  { id: "p-seattle", city: "Seattle", countryCode: "US", countryName: "États-Unis", continent: "north_america", lat: 47.606, lng: -122.332 },
  { id: "p-newyork", city: "New York", countryCode: "US", countryName: "États-Unis", continent: "north_america", lat: 40.713, lng: -74.006 },
  { id: "p-dubai", city: "Dubaï", countryCode: "AE", countryName: "Émirats arabes unis", continent: "asia", lat: 25.205, lng: 55.271 },
  { id: "p-bangalore", city: "Bangalore", countryCode: "IN", countryName: "Inde", continent: "asia", lat: 12.972, lng: 77.594 },
  { id: "p-singapore", city: "Singapour", countryCode: "SG", countryName: "Singapour", continent: "asia", lat: 1.352, lng: 103.82 },
  { id: "p-tokyo", city: "Tokyo", countryCode: "JP", countryName: "Japon", continent: "asia", lat: 35.676, lng: 139.65 },
  { id: "p-saopaulo", city: "São Paulo", countryCode: "BR", countryName: "Brésil", continent: "south_america", lat: -23.55, lng: -46.633 },
  { id: "p-sydney", city: "Sydney", countryCode: "AU", countryName: "Australie", continent: "oceania", lat: -33.869, lng: 151.209 },
];

export const PLACES_BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function place(id: string): Place {
  const found = PLACES_BY_ID.get(id);
  if (!found) throw new Error(`Lieu inconnu: ${id}`);
  return found;
}
