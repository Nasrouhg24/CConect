"use client";

import { Chip } from "@/components/ui";
import {
  CAMPUS_LABELS,
  CONTINENT_LABELS,
  DOMAIN_LABELS,
  EXPERIENCE_KIND_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { Company, Filters, Place } from "@/lib/types";

/** Traduit l'état des filtres en puces retirables une par une. */
export function ActiveFilters({
  filters,
  onChange,
  onClear,
  companies,
  places,
  countryNames,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClear: () => void;
  companies: Company[];
  places: Place[];
  countryNames: Map<string, string>;
}) {
  const chips: { key: keyof Filters; label: string; reset: Partial<Filters> }[] = [];

  if (filters.q.trim()) {
    chips.push({ key: "q", label: `« ${filters.q.trim()} »`, reset: { q: "" } });
  }
  if (filters.continent) {
    chips.push({
      key: "continent",
      label: CONTINENT_LABELS[filters.continent],
      reset: { continent: null },
    });
  }
  if (filters.country) {
    chips.push({
      key: "country",
      label: countryNames.get(filters.country) ?? filters.country,
      reset: { country: null, city: null },
    });
  }
  if (filters.city) {
    chips.push({
      key: "city",
      label: places.find((p) => p.id === filters.city)?.city ?? "Ville",
      reset: { city: null },
    });
  }
  if (filters.company) {
    chips.push({
      key: "company",
      label: companies.find((c) => c.slug === filters.company)?.name ?? "Entreprise",
      reset: { company: null },
    });
  }
  if (filters.domain) {
    chips.push({
      key: "domain",
      label: DOMAIN_LABELS[filters.domain],
      reset: { domain: null },
    });
  }
  if (filters.experienceKind) {
    chips.push({
      key: "experienceKind",
      label: EXPERIENCE_KIND_LABELS[filters.experienceKind],
      reset: { experienceKind: null },
    });
  }
  if (filters.campus) {
    chips.push({
      key: "campus",
      label: `Campus ${CAMPUS_LABELS[filters.campus]}`,
      reset: { campus: null },
    });
  }
  if (filters.status) {
    chips.push({
      key: "status",
      label: STATUS_LABELS[filters.status],
      reset: { status: null },
    });
  }
  if (filters.year) {
    chips.push({ key: "year", label: String(filters.year), reset: { year: null } });
  }
  if (filters.entryKind) {
    chips.push({
      key: "entryKind",
      label: filters.entryKind === "experience" ? "Expériences" : "Contacts",
      reset: { entryKind: null },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="animate-fade flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          onRemove={() => onChange({ ...filters, ...chip.reset })}
        >
          {chip.label}
        </Chip>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="ml-0.5 text-[12px] text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
      >
        Tout effacer
      </button>
    </div>
  );
}
