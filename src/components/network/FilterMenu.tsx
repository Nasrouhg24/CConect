"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAMPUSES,
  CAMPUS_LABELS,
  CONTINENTS,
  CONTINENT_LABELS,
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
  MEMBER_STATUSES,
  STATUS_LABELS,
} from "@/lib/labels";
import { labelClass, selectClass } from "@/components/ui";
import type { Company, Entry, Filters, Place } from "@/lib/types";

/**
 * Filtres en surcouche.
 *
 * Ils étaient dans une colonne permanente qui mangeait un quart de l'écran ;
 * ils vivent maintenant dans un panneau qu'on ouvre, qu'on ferme, et dont
 * l'état reste lisible grâce aux puces affichées sous la recherche.
 */
export function FilterMenu({
  filters,
  onChange,
  entries,
  companies,
  places,
  activeCount,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  entries: Entry[];
  companies: Company[];
  places: Place[];
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const countries = [
    ...new Map(entries.map((e) => [e.place.countryCode, e.place.countryName])),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const years = [...new Set(entries.map((e) => e.year))].sort((a, b) => b - a);

  const visiblePlaces = places.filter(
    (p) => !filters.country || p.countryCode === filters.country,
  );

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm sm:px-3.5 shadow-[var(--shadow-panel)] backdrop-blur-md transition-colors ${
          open || activeCount > 0
            ? "border-accent/60 bg-accent-soft text-accent"
            : "border-border bg-surface/95 text-text-muted hover:border-border-strong hover:text-text"
        }`}
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M2.5 4h11M4.5 8h7M6.5 12h3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span className="hidden sm:inline">Filtres</span>
        {activeCount > 0 ? (
          <span className="font-mono text-[11px] tabular-nums">{activeCount}</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Filtres du réseau"
          className="animate-fade absolute right-0 top-[calc(100%+6px)] z-30 w-[min(92vw,30rem)] rounded-md border border-border bg-surface-raised p-4 shadow-[var(--shadow-overlay)]"
        >
          <Group title="Lieu">
            <Select
              label="Continent"
              value={filters.continent}
              onChange={(v) =>
                onChange({
                  ...filters,
                  continent: v as Filters["continent"],
                  country: null,
                  city: null,
                })
              }
              options={CONTINENTS.map((c) => ({ value: c, label: CONTINENT_LABELS[c] }))}
            />
            <Select
              label="Pays"
              value={filters.country}
              onChange={(v) => onChange({ ...filters, country: v, city: null })}
              options={countries.map(([code, name]) => ({ value: code, label: name }))}
            />
            <Select
              label="Ville"
              value={filters.city}
              onChange={(v) => set("city", v)}
              options={visiblePlaces.map((p) => ({ value: p.id, label: p.city }))}
            />
          </Group>

          <Group title="Entreprise & domaine">
            <Select
              label="Entreprise"
              value={filters.company}
              onChange={(v) => set("company", v)}
              options={companies.map((c) => ({ value: c.slug, label: c.name }))}
            />
            <Select
              label="Domaine"
              value={filters.domain}
              onChange={(v) => set("domain", v as Filters["domain"])}
              options={DOMAINS.map((d) => ({ value: d, label: DOMAIN_LABELS[d] }))}
            />
            <Select
              label="Type"
              value={filters.experienceKind}
              onChange={(v) => set("experienceKind", v as Filters["experienceKind"])}
              options={EXPERIENCE_KINDS.map((k) => ({
                value: k,
                label: EXPERIENCE_KIND_LABELS[k],
              }))}
            />
          </Group>

          <Group title="Communauté">
            <Select
              label="Campus"
              value={filters.campus}
              onChange={(v) => set("campus", v as Filters["campus"])}
              options={CAMPUSES.map((c) => ({ value: c, label: CAMPUS_LABELS[c] }))}
            />
            <Select
              label="Statut"
              value={filters.status}
              onChange={(v) => set("status", v as Filters["status"])}
              options={MEMBER_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
            <Select
              label="Année"
              value={filters.year === null ? null : String(filters.year)}
              onChange={(v) => set("year", v ? Number(v) : null)}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </Group>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <p className="text-[12px] text-text-faint">
              Contribution : expérience ou contact
            </p>
            <div className="flex rounded-sm border border-border">
              {(
                [
                  [null, "Tout"],
                  ["experience", "Expériences"],
                  ["contact", "Contacts"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set("entryKind", value)}
                  aria-pressed={filters.entryKind === value}
                  className={`px-2.5 py-1 text-[12px] transition-colors ${
                    filters.entryKind === value
                      ? "bg-accent-soft text-accent"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={`${selectClass} mt-1`}
      >
        <option value="">Tous</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
