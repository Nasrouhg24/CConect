import type { JobOffer } from "./types";

/**
 * Fraîcheur d'une offre.
 *
 * Isolé du rendu : lire l'horloge dans le corps d'un composant rend le résultat
 * dépendant du moment du rendu, ce que React interdit désormais explicitement.
 */
export function isOfferExpired(offer: JobOffer, now = Date.now()): boolean {
  return offer.expiresAt !== null && new Date(offer.expiresAt).getTime() < now;
}

export function splitByExpiry(offers: JobOffer[]): {
  open: JobOffer[];
  expired: JobOffer[];
} {
  const now = Date.now();
  const open: JobOffer[] = [];
  const expired: JobOffer[] = [];
  for (const offer of offers) {
    if (isOfferExpired(offer, now)) expired.push(offer);
    else open.push(offer);
  }
  return { open, expired };
}
