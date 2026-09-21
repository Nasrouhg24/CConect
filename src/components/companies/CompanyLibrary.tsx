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
 * Répertoire des entreprises.
 *
 * La liste répondait à « est-ce que cette entreprise est là ? » ; elle répond
 * maintenant à la même question dans la forme d'un index imprimé — un numéro,
 * un logo, un nom, deux compteurs, un filet. Ce qui a changé n'est que la
 * présentation :
 *
 *   - **La recherche est le seul élément plein.** « Ajouter » était un bloc
 *     vert de la hauteur du champ : sur seize fiches, l'action rare pesait
 *     autant que l'action permanente. C'est un lien discret en bout de ligne.
 *   - **Les filtres sont une ligne de mots**, pas des pastilles. L'actif est
 *     tenu par un filet vert de 2 px sous le mot *et* par sa graisse : la
 *     couleur confirme, elle n'informe pas seule (WCAG 1.4.1).
 *   - **Le numéro est recalculé sur la liste affichée.** C'est un repère de
 *     lecture — « la douzième de cette liste » — pas un identifiant ; il suit
 *     donc le filtre au lieu de trouer la numérotation.
 *
 * Le filtrage reste local : les fiches sont peu nombreuses et déjà chargées,
 * donc aucune requête n'est nécessaire et la liste se redessine à chaque
 * frappe. Si le réseau grandit au point que ce ne soit plus vrai, c'est le
 * moment de passer à une recherche serveur paginée — pas avant.
 *
 * La création n'est pas un écran à part : si le nom tapé ne correspond à
 * aucune fiche, la ligne « Ajouter … » ferme les résultats, avec le nom déjà
 * saisi. Le nom canonique sert de garde-fou : tapé « Microsoft Corp. », on
 * retrouve « Microsoft » et la création n'est plus proposée.
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
      {/* ---- Recherche --------------------------------------------------- *
          Le champ prend toute la largeur ; « Ajouter » se pose en bout de
          ligne, en texte. Sous 640 px il passe à la ligne, aligné à gauche
          sous le champ.                                                     */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="relative min-w-0 flex-1 basis-72">
          <span className="sr-only">Chercher une entreprise</span>
          <svg
            viewBox="0 0 16 16"
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint"
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une entreprise…"
            autoComplete="off"
            className="h-12 w-full rounded-sm border border-border-strong bg-surface-raised pl-10 pr-4 text-body text-text transition-[border-color,box-shadow] duration-150 placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
          />
        </label>

        <Link
          href="/companies/new"
          className="shrink-0 text-list text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          <span aria-hidden className="mr-1.5 font-mono">
            +
          </span>
          Ajouter
        </Link>
      </div>

      {/* ---- Filtres ----------------------------------------------------- *
          Une ligne de mots, pas de pastilles. Sous 640 px elle défile
          horizontalement plutôt que de s'empiler sur quatre rangs : un filtre
          se parcourt, il ne se lit pas.                                     */}
      <div className="thin-scroll mt-7 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div
          role="group"
          aria-label="Filtrer par secteur"
          className="flex min-w-max items-center gap-x-6 border-b border-border"
        >
          <FilterWord active={industry === null} onClick={() => setIndustry(null)}>
            Toutes
          </FilterWord>
          {industries.map(([key, count]) => (
            <FilterWord
              key={key}
              active={industry === key}
              count={count}
              onClick={() => setIndustry(industry === key ? null : key)}
            >
              {INDUSTRY_LABELS[key]}
            </FilterWord>
          ))}
        </div>
      </div>

      <p
        className="mt-5 font-mono text-meta text-text-faint"
        role="status"
        aria-live="polite"
      >
        {results.length} entreprise{results.length === 1 ? "" : "s"}
      </p>

      {/* ---- L'index ----------------------------------------------------- *
          Pas de cartes : seize entreprises qu'on compare se lisent en colonne,
          chiffres alignés à droite. Un filet sépare deux lignes, rien ne les
          encadre.                                                           */}
      {results.length > 0 ? (
        <ol className="mt-2 border-t border-border">
          {results.map(({ company, contacts, experiences }, index) => (
            <li key={company.slug}>
              <Link
                href={`/companies/${company.slug}`}
                className="group grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-border py-4 transition-colors hover:bg-surface sm:grid-cols-[2rem_2.25rem_minmax(0,1fr)_auto]"
              >
                {/* Le numéro est un repère, pas une donnée : il reste en
                    dessous de la ligne de lecture, en chasse fixe. */}
                <span
                  aria-hidden
                  className="self-start font-mono text-micro tabular-nums text-text-faint sm:self-center"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <CompanyLogo company={company} size="md" />

                <span className="min-w-0">
                  <span className="block truncate text-body font-medium text-text underline-offset-4 group-hover:underline">
                    {company.name}
                  </span>
                  <span className="mt-0.5 block truncate text-meta text-text-muted">
                    {INDUSTRY_LABELS[company.industry]}
                    {company.headquarters
                      ? ` · ${company.headquarters.city}, ${company.headquarters.countryName}`
                      : ""}
                  </span>
                </span>

                {/* Sous 640 px les compteurs passent sous le nom plutôt que
                    d'écraser les trois autres colonnes. */}
                <span className="col-start-3 flex gap-x-4 whitespace-nowrap font-mono text-meta tabular-nums text-text-muted sm:col-start-4 sm:flex-col sm:items-end sm:gap-y-0.5">
                  <Tally value={contacts} singular="contact" plural="contacts" />
                  <Tally
                    value={experiences}
                    singular="expérience"
                    plural="expériences"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      {/* La création ferme l'index, à la même mesure que les lignes qui
          précèdent : c'est la suite de la liste, pas un encart. */}
      {canCreate ? (
        <Link
          href={`/companies/new?name=${encodeURIComponent(trimmed)}`}
          className={`group grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-4 transition-colors hover:bg-surface sm:grid-cols-[2rem_2.25rem_minmax(0,1fr)_auto] ${
            results.length === 0 ? "mt-2 border-t" : ""
          }`}
        >
          <span aria-hidden className="font-mono text-micro text-text-faint">
            +
          </span>
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-sm border border-dashed border-border-strong font-mono text-lead text-text-faint transition-colors group-hover:border-accent group-hover:text-accent"
          >
            +
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body text-text underline-offset-4 group-hover:underline">
              Ajouter «&nbsp;{trimmed}&nbsp;»
            </span>
            <span className="mt-0.5 block text-meta text-text-muted">
              Pas encore dans le répertoire
            </span>
          </span>
        </Link>
      ) : null}

      {results.length === 0 && !canCreate ? (
        <p className="mt-6 text-list text-text-faint">Rien avec ce filtre.</p>
      ) : null}
    </div>
  );
}

/**
 * Un filtre est un mot suivi de son compte, souligné quand il est actif.
 *
 * Le filet vert de 2 px vit sous le mot et se réserve sa place quand il est
 * transparent : sans ça, activer un filtre déplacerait toute la ligne de 2 px.
 */
function FilterWord({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`-mb-px shrink-0 whitespace-nowrap border-b-2 py-2.5 text-list transition-colors ${
        active
          ? "border-accent font-medium text-text"
          : "border-transparent text-text-muted hover:text-text"
      }`}
    >
      {children}
      {count !== undefined ? (
        <span className="ml-1.5 font-mono text-micro tabular-nums text-text-faint">
          {count}
        </span>
      ) : null}
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
      <span className="tabular-nums">{value}</span>{" "}
      {value === 1 ? singular : plural}
    </span>
  );
}
