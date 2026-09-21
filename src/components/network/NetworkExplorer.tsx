"use client";

import { useMemo, useState } from "react";
import { clusterByPlace, filterEntries, hasActiveFilters } from "@/lib/entries";
import { EMPTY_FILTERS } from "@/lib/types";
import type { Company, Entry, Filters, Place } from "@/lib/types";
import { WorldMap } from "@/components/map/WorldMap";
import { ActiveFilters } from "./ActiveFilters";
import { FilterMenu } from "./FilterMenu";
import { NetworkSearch } from "./NetworkSearch";
import { PlaceDrawer } from "./PlaceDrawer";

/**
 * Écran principal de CConnect.
 *
 * La carte occupe toute la surface ; la recherche et les filtres flottent
 * au-dessus ; le détail n'apparaît que lorsqu'on sélectionne une ville.
 * Rien n'est affiché par défaut sous la carte : l'état de repos est vide,
 * et on descend dans le détail à mesure qu'on explore.
 */
export function NetworkExplorer({
  entries,
  companies,
  places,
  initialFilters = EMPTY_FILTERS,
}: {
  entries: Entry[];
  companies: Company[];
  places: Place[];
  /** Filtres lus dans l'URL : recherche de l'accueil, liens du conseiller. */
  initialFilters?: Filters;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const filtered = useMemo(
    () => filterEntries(entries, filters),
    [entries, filters],
  );
  const clusters = useMemo(() => clusterByPlace(filtered), [filtered]);

  /**
   * La ville dont le panneau est ouvert — **pas** un filtre.
   *
   * Elle l'était : cliquer un marqueur posait `filters.city`, ce qui retirait
   * de la carte toutes les autres villes. Le panneau s'ouvrait donc sur une
   * carte vidée, et on ne pouvait pas passer d'une ville à l'autre sans le
   * fermer d'abord. Sélectionner et filtrer sont deux gestes différents :
   * `filters.city` reste ce que pose le menu de filtres, la sélection ne fait
   * qu'ouvrir le détail.
   */
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const selected = clusters.find((c) => c.place.id === selectedPlaceId) ?? null;

  /* Un filtre peut faire disparaître la ville ouverte : `selected` vaut alors
     `null` et le panneau se referme de lui-même. Rien à synchroniser — c'est
     une dérivation, pas un effet. L'identifiant reste en mémoire, donc retirer
     le filtre rouvre la ville qu'on regardait. */

  const countryNames = useMemo(
    () => new Map(entries.map((e) => [e.place.countryCode, e.place.countryName])),
    [entries],
  );

  const activeCount = useMemo(() => {
    const { q, ...rest } = filters;
    return (
      Object.values(rest).filter((v) => v !== null).length + (q.trim() ? 1 : 0)
    );
  }, [filters]);

  return (
    <section className="relative flex-1 overflow-hidden">
      <WorldMap
        clusters={clusters}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
        panelOpen={Boolean(selected)}
      />

      {/* Barre flottante : au-dessus de la carte, jamais à côté. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <NetworkSearch
              entries={entries}
              value={filters.q}
              onChange={(q) => setFilters((f) => ({ ...f, q }))}
              onApply={(patch) => {
                setFilters((f) => ({ ...f, ...patch }));
                /* Choisir une ville dans la recherche revient à la désigner
                   sur la carte : le panneau s'ouvre, comme au clic. */
                if (patch.city !== undefined) setSelectedPlaceId(patch.city);
              }}
              resultCount={filtered.length}
            />
            <FilterMenu
              filters={filters}
              onChange={setFilters}
              entries={entries}
              companies={companies}
              places={places}
              activeCount={activeCount}
            />
          </div>

          <ActiveFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
            companies={companies}
            places={places}
            countryNames={countryNames}
          />
        </div>
      </div>

      {/* Repères de lecture et attribution : une seule ligne, coin bas gauche. */}
      {/* Carte-index : une entrée par ligne, en mono. Sur une seule ligne,
          les trois paliers se lisaient comme une phrase. */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden sm:block">
        <div className="flex flex-col gap-1 rounded-sm border border-border bg-surface px-3 py-2.5 font-mono text-micro text-text-faint">
          <Legend label="1 contribution" tone="var(--color-node-1)" size={6} />
          <Legend label="Plusieurs" tone="var(--color-node-2)" size={9} />
          <Legend label="Pôle du réseau" tone="var(--color-node-3)" size={12} />
          <span className="mt-1 border-t border-border pt-1.5 uppercase tracking-[0.09em]">
            Natural Earth · domaine public
          </span>
        </div>
      </div>

      {filtered.length === 0 && hasActiveFilters(filters) ? (
        <div className="animate-fade pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto rounded-md border border-border bg-surface px-5 py-4 text-center shadow-[var(--shadow-panel)]">
            <p className="text-body text-text">Aucun résultat sur la carte</p>
            <p className="mt-1 text-meta text-text-muted">
              Élargis la recherche, ou ajoute la première contribution.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 text-meta text-accent underline-offset-2 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      ) : null}

      {/* Desktop : panneau ancré. Mobile : feuille glissée par le bas. */}
      {selected ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-30 hidden md:block">
            <PlaceDrawer
              place={selected.place}
              entries={selected.entries}
              onClose={() => setSelectedPlaceId(null)}
            />
          </div>
          <div className="animate-sheet absolute inset-x-0 bottom-0 z-30 h-[58vh] overflow-hidden rounded-t-lg border-t border-border shadow-[var(--shadow-overlay)] md:hidden">
            <PlaceDrawer
              place={selected.place}
              entries={selected.entries}
              onClose={() => setSelectedPlaceId(null)}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function Legend({
  label,
  tone,
  size,
}: {
  label: string;
  tone: string;
  size: number;
}) {
  return (
    <span className="flex items-center gap-1.5 text-label text-text-faint">
      <span
        className="rounded-full"
        style={{ backgroundColor: tone, width: size, height: size }}
      />
      {label}
    </span>
  );
}

