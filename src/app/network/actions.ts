"use server";

import { filtersFromParams } from "@/lib/links";
import { getCurrentMember, getPlaceEntries } from "@/lib/repository";
import type { Entry } from "@/lib/types";

/**
 * Le détail d'une ville, demandé à l'ouverture du panneau.
 *
 * C'est la contrepartie de l'agrégat : la carte reçoit des compteurs, et les
 * contributions ne voyagent que pour la ville qu'on regarde vraiment.
 *
 * Les filtres arrivent sous la forme qu'ils ont dans l'URL, et repassent par
 * `filtersFromParams` : une Server Action est une porte d'entrée publique,
 * son argument est une saisie comme une autre. La session est vérifiée ici
 * aussi — `proxy.ts` protège les pages, pas les actions.
 */
export async function loadPlaceEntries(
  placeId: string,
  params: Record<string, string>,
): Promise<Entry[]> {
  const member = await getCurrentMember();
  if (!member) return [];

  return getPlaceEntries(placeId, filtersFromParams(params));
}
