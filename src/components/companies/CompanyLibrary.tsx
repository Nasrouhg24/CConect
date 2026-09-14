"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { normalizeCompanyName, stripDiacritics } from "@/lib/company-name";
import { INDUSTRY_LABELS } from "@/lib/labels";
import type { Company, Industry } from "@/lib/types";

export interface LibraryRow {
  company: Company;
  contacts: number;
  experiences: number;
}

/**
 * Bibliothèque des entreprises.
 *
 * C'était une liste triée par volume, sur trois colonnes de chiffres : pour
 * savoir si Capgemini y figurait, il fallait parcourir la page à l'œil. La
 * réponse à « est-ce que cette entreprise est là ? » doit se lire en tapant
 * son nom — c'est ce que fait n'importe qui sur LinkedIn.
 *
 * Le filtrage est local : les fiches entreprises sont peu nombreuses et déjà
 * chargées, donc aucune requête n'est nécessaire et la liste se redessine à
 * chaque frappe. Si le réseau grandit au point que ce ne soit plus vrai, c'est
 * le moment de passer à une recherche serveur paginée — pas avant.
 *
 * La création n'est pas un bouton à part : si le nom tapé ne correspond à
 * aucune fiche, la ligne « Ajouter … » apparaît à la fin des résultats, avec
 * le nom déjà saisi. Le nom canonique sert de garde-fou : tapé « Microsoft
 * Corp. », on retrouve « Microsoft » et la création n'est plus proposée.
 */
export function CompanyLibrary({ rows }: { rows: LibraryRow[] }) {
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<Industry | null>(null);

  // Seuls les secteurs réellement représentés : un filtre qui ne renvoie
  // jamais rien n'est pas un filtre, c'est une fausse piste.
  const industries = useMemo(() => {
    const counts = new Map<Industry, number>();
    for (const row of rows) {
      counts.set(row.company.industry, (counts.get(row.company.industry) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || INDUSTRY_LABELS[a[0]].localeCompare(INDUSTRY_LABELS[b[0]]),
    );
  }, [rows]);

  const trimmed = query.trim();
  const canonical = normalizeCompanyName(trimmed);

  const results = useMemo(() => {
    const needle = stripDiacritics(trimmed).toLowerCase();
    return rows.filter(({ company }) => {
      if (industry && company.industry !== industry) return false;
      if (needle.length === 0) return true;
      return (
        stripDiacritics(company.name).toLowerCase().includes(needle) ||
        company.normalizedName.includes(canonical) ||
        stripDiacritics(company.headquarters?.city ?? "")
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [rows, industry, trimmed, canonical]);

  const exists =
    canonical.length >= 2 &&
    rows.some(({ company }) => company.normalizedName === canonical);
  const canCreate = trimmed.length >= 2 && !exists;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-64">
          <span className="sr-only">Chercher une entreprise</span>
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint"
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Microsoft, OCP, Casablanca…"
            autoComplete="off"
            className="h-10 w-full rounded-sm border border-border bg-surface pl-9 pr-3 text-body text-text placeholder:text-text-faint transition-colors focus:border-accent focus:outline-none"
          />
        </label>

        <Link
          href="/companies/new"
          className="inline-flex h-10 shrink-0 items-center rounded-sm bg-accent px-4 text-body font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Ajouter
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip active={industry === null} onClick={() => setIndustry(null)}>
          Tout
        </FilterChip>
        {industries.map(([key, count]) => (
          <FilterChip
            key={key}
            active={industry === key}
            onClick={() => setIndustry(industry === key ? null : key)}
          >
            {INDUSTRY_LABELS[key]}
            <span className="font-mono text-label tabular-nums text-text-faint">
              {count}
            </span>
          </FilterChip>
        ))}
      </div>

      <p className="mt-5 text-meta text-text-faint" role="status" aria-live="polite">
        {results.length} entreprise{results.length === 1 ? "" : "s"}
      </p>

      {results.length > 0 ? (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ company, contacts, experiences }) => (
            <li key={company.slug}>
              <Link
                href={`/companies/${company.slug}`}
                className="flex h-full items-start gap-3 rounded-md border border-border bg-surface p-3.5 transition-colors hover:border-border-strong hover:bg-surface-hover"
              >
                <CompanyLogo company={company} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-text">
                    {company.name}
                  </span>
                  <span className="block truncate text-meta text-text-faint">
                    {INDUSTRY_LABELS[company.industry]}
                    {company.headquarters ? ` · ${company.headquarters.city}` : ""}
                  </span>
                  <span className="mt-2 flex gap-3 text-label text-text-muted">
                    <Tally value={contacts} singular="contact" plural="contacts" />
                    <Tally value={experiences} singular="stage" plural="stages" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {canCreate ? (
        <Link
          href={`/companies/new?name=${encodeURIComponent(trimmed)}`}
          className="mt-2 flex items-center gap-3 rounded-md border border-dashed border-border-strong p-3.5 transition-colors hover:bg-surface-hover"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-dashed border-border-strong text-lead text-accent">
            +
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body text-text">
              Ajouter «&nbsp;{trimmed}&nbsp;»
            </span>
            <span className="block text-meta text-text-faint">
              Pas encore dans la bibliothèque
            </span>
          </span>
        </Link>
      ) : null}

      {results.length === 0 && !canCreate ? (
        <p className="mt-3 rounded-md border border-dashed border-border px-4 py-8 text-center text-list text-text-faint">
          Rien avec ce filtre.
        </p>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm border px-2.5 text-meta transition-colors ${
        active
          ? "border-accent/60 bg-accent-soft text-accent"
          : "border-border text-text-muted hover:border-border-strong hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

/** Un zéro reste gris et muet : « 0 contact » n'aide personne à choisir. */
function Tally({
  value,
  singular,
  plural,
}: {
  value: number;
  singular: string;
  plural: string;
}) {
  return (
    <span className={value === 0 ? "text-text-faint/70" : undefined}>
      <span className="font-mono tabular-nums">{value}</span>{" "}
      {value === 1 ? singular : plural}
    </span>
  );
}
