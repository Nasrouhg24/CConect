"use client";

import { useEffect, useState } from "react";
import { loadPlaceEntries } from "@/app/network/actions";
import type { PlaceCluster } from "@/lib/entries";
import type { Entry } from "@/lib/types";
import { PlaceDrawer } from "./PlaceDrawer";

/**
 * Le panneau d'une ville, et le chargement de son contenu.
 *
 * La carte ne reçoit plus que des compteurs par ville : ouvrir une ville est
 * donc le moment où ses contributions voyagent, et le seul. C'est la raison
 * d'être de ce composant — `PlaceDrawer` se contente d'afficher, il ne sait
 * pas d'où vient ce qu'il montre.
 *
 * `query` est la chaîne de recherche de l'URL, pas un objet de filtres : elle
 * sert de clé au rechargement (changer un filtre change le détail affiché) et
 * repart telle quelle vers le serveur, qui la revalide.
 */
export function PlaceDetail({
  cluster,
  query,
  onClose,
}: {
  cluster: PlaceCluster;
  query: string;
  onClose: () => void;
}) {
  /* Ce qui est en mémoire, et pour quelle demande. Tant que la clé ne
     correspond pas, le panneau est en attente : rien à remettre à zéro au
     changement de ville, donc pas d'état à écrire depuis l'effet. */
  const [loaded, setLoaded] = useState<{ key: string; entries: Entry[] } | null>(
    null,
  );

  const placeId = cluster.place.id;
  const key = `${placeId}?${query}`;
  const entries = loaded?.key === key ? loaded.entries : null;

  useEffect(() => {
    /* Deux ouvertures rapprochées : la première réponse ne doit pas écraser
       la seconde si elle arrive en retard. */
    let current = true;

    loadPlaceEntries(placeId, Object.fromEntries(new URLSearchParams(query)))
      .then((rows) => {
        if (current) setLoaded({ key, entries: rows });
      })
      .catch(() => {
        if (current) setLoaded({ key, entries: [] });
      });

    return () => {
      current = false;
    };
  }, [placeId, query, key]);

  return (
    <PlaceDrawer
      place={cluster.place}
      entries={entries ?? []}
      loading={entries === null}
      onClose={onClose}
    />
  );
}
