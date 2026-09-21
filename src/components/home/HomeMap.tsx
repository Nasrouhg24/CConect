import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from "d3-geo";
import Link from "next/link";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import worldTopo from "world-atlas/countries-110m.json";
import { isPlottable } from "@/lib/entries";
import type { Place } from "@/lib/types";

const W = 720;
const H = 380;

/* Géométrie calculée une fois par processus : elle ne dépend que du dessin,
   pas de la requête. */
const GEOMETRY = (() => {
  const topology = worldTopo as unknown as Topology;
  const countries = (
    feature(topology, topology.objects.countries) as unknown as GeoJSON.FeatureCollection
  ).features;
  const projection = geoNaturalEarth1().fitExtent(
    [
      [4, 4],
      [W - 4, H - 4],
    ],
    { type: "Sphere" } as GeoPermissibleObjects,
  );
  const path = geoPath(projection);
  return {
    projection,
    land: countries
      .map((f) => path(f as unknown as GeoPermissibleObjects) ?? "")
      .filter(Boolean),
  };
})();

/**
 * Aperçu de la carte — l'image de l'accueil.
 *
 * La même carte gravée que `/network`, figée et rendue côté serveur : aucun
 * JavaScript, rien à hydrater. Un point par ville du réseau, tous de la même
 * taille : l'aperçu montre *où* mène le réseau, pas *combien* — les volumes se
 * lisent sur la vraie carte, un clic plus loin.
 *
 * Tout l'aperçu est un lien vers la carte ; le dessin est `aria-hidden`, c'est
 * la légende qui nomme la destination.
 */
export function HomeMap({ places }: { places: Place[] }) {
  const points = places.filter(isPlottable).flatMap((place) => {
    const xy = GEOMETRY.projection([place.lng, place.lat]);
    return xy ? [{ id: place.id, x: xy[0], y: xy[1] }] : [];
  });

  return (
    <Link
      href="/network"
      className="group block rounded-md border border-border bg-surface transition-colors duration-150 hover:border-border-strong"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full px-3 pt-4 sm:px-5 sm:pt-6"
        aria-hidden
        focusable="false"
      >
        {GEOMETRY.land.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="var(--color-map-land)"
            stroke="var(--color-map-border)"
            strokeWidth={0.5}
          />
        ))}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={6.5} fill="var(--color-accent)" fillOpacity={0.14} />
            <circle cx={p.x} cy={p.y} r={2.75} fill="var(--color-accent)" />
          </g>
        ))}
      </svg>
      <span className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <span className="font-mono text-label text-text-faint">carte du réseau</span>
        <span className="text-list font-medium text-accent group-hover:underline group-hover:underline-offset-2">
          Ouvrir la carte →
        </span>
      </span>
    </Link>
  );
}
