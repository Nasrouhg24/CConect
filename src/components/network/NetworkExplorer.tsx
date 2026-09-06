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
}: {
  entries: Entry[];
  companies: Company[];
  places: Place[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const filtered = useMemo(
    () => filterEntries(entries, filters),
    [entries, filters],
  );
  const clusters = useMemo(() => clusterByPlace(filtered), [filtered]);

  const selected = clusters.find((c) => c.place.id === filters.city) ?? null;

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
        selectedPlaceId={filters.city}
        onSelectPlace={(placeId) => setFilters((f) => ({ ...f, city: placeId }))}
        panelOpen={Boolean(selected)}
      />

      {/* Barre flottante : au-dessus de la carte, jamais à côté. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2.5">
          <div className="flex items-start gap-2">
            <NetworkSearch
              entries={entries}
              value={filters.q}
              onChange={(q) => setFilters((f) => ({ ...f, q }))}
              onApply={(patch) => setFilters((f) => ({ ...f, ...patch }))}
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
      <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden items-center gap-5 sm:flex">
        <Legend label="1 contribution" tone="var(--color-node-1)" size={6} />
        <Legend label="Plusieurs" tone="var(--color-node-2)" size={9} />
        <Legend label="Pôle du réseau" tone="var(--color-node-3)" size={12} />
        <span className="border-l border-border pl-5 text-[10px] uppercase tracking-[0.1em] text-text-faint/70">
          Natural Earth · domaine public
        </span>
      </div>

      {filtered.length === 0 && hasActiveFilters(filters) ? (
        <div className="animate-fade pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="pointer-events-auto rounded-md border border-border bg-surface-raised px-5 py-4 text-center shadow-[var(--shadow-panel)]">
            <p className="text-sm text-text">Aucun résultat sur la carte</p>
            <p className="mt-1 text-[12px] text-text-muted">
              Élargis la recherche, ou ajoute la première contribution.
            </p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="mt-3 text-[12px] text-accent underline-offset-2 hover:underline"
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
              onClose={() => setFilters((f) => ({ ...f, city: null }))}
            />
          </div>
          <div className="animate-sheet absolute inset-x-0 bottom-0 z-30 h-[58vh] overflow-hidden rounded-t-lg border-t border-border shadow-[var(--shadow-overlay)] md:hidden">
            <PlaceDrawer
              place={selected.place}
              entries={selected.entries}
              onClose={() => setFilters((f) => ({ ...f, city: null }))}
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
    <span className="flex items-center gap-1.5 text-[11px] text-text-faint">
      <span
        className="rounded-full"
        style={{ backgroundColor: tone, width: size, height: size }}
      />
      {label}
    </span>
  );
}

