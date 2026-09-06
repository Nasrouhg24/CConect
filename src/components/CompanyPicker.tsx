"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { inputClass } from "@/components/ui";
import { normalizeCompanyName, stripDiacritics } from "@/lib/company-name";
import { INDUSTRY_LABELS } from "@/lib/labels";
import type { Company } from "@/lib/types";

/**
 * Sélecteur d'entreprise, à la manière de LinkedIn.
 *
 * On ne retape jamais un nom d'entreprise : on choisit une fiche existante, et
 * le formulaire transmet son identifiant. La création explicite n'est proposée
 * qu'en dernier recours, et seulement si aucune fiche ne correspond au nom
 * canonique — c'est ce qui évite « Microsoft Corp. » à côté de « Microsoft ».
 */
export function CompanyPicker({
  companies,
  value,
  onChange,
  allowCreate = true,
  label = "Entreprise",
}: {
  companies: Company[];
  value: { companyId: string | null; newName: string | null };
  onChange: (value: { companyId: string | null; newName: string | null }) => void;
  allowCreate?: boolean;
  label?: string;
}) {
  const selected = companies.find((c) => c.id === value.companyId) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const trimmed = query.trim();
  const canonical = normalizeCompanyName(trimmed);

  const matches = useMemo(() => {
    if (trimmed.length < 1) return companies.slice(0, 6);
    const needle = stripDiacritics(trimmed).toLowerCase();
    return companies
      .filter(
        (c) =>
          stripDiacritics(c.name).toLowerCase().includes(needle) ||
          c.normalizedName.includes(canonical),
      )
      .slice(0, 6);
  }, [companies, trimmed, canonical]);

  // Un nom qui se réduit à une fiche existante n'ouvre jamais la création.
  const exactCanonical = companies.some((c) => c.normalizedName === canonical);
  const showCreate = allowCreate && trimmed.length >= 2 && !exactCanonical;
  const options = showCreate ? matches.length : matches.length - 1;

  function pick(company: Company) {
    onChange({ companyId: company.id, newName: null });
    setQuery("");
    setOpen(false);
  }

  function createNew() {
    onChange({ companyId: null, newName: trimmed });
    setQuery("");
    setOpen(false);
  }

  // Les champs cachés portent la valeur soumise, quel que soit l'état affiché.
  const hiddenFields = (
    <>
      <input type="hidden" name="companyId" value={value.companyId ?? ""} readOnly />
      <input
        type="hidden"
        name="newCompanyName"
        value={value.newName ?? ""}
        readOnly
      />
    </>
  );

  if (selected || value.newName) {
    return (
      <div>
        {hiddenFields}
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          {label}
        </p>
        <div className="mt-1.5 flex items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2">
          <CompanyLogo
            company={selected ?? { name: value.newName!, logoUrl: null }}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-text">
              {selected?.name ?? value.newName}
            </p>
            <p className="text-[11px] text-text-faint">
              {selected
                ? INDUSTRY_LABELS[selected.industry]
                : "Nouvelle entreprise — sera créée à la publication"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ companyId: null, newName: null })}
            className="text-[12px] text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      {hiddenFields}
      <label className="block">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          {label}
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="cc-company-options"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") return setOpen(false);
            if (!open) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => Math.min(h + 1, options));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (highlight < matches.length) pick(matches[highlight]);
              else if (showCreate) createNew();
            }
          }}
          placeholder="Microsoft, OCP Group…"
          className={`${inputClass} mt-1.5`}
        />
      </label>

      {open && (matches.length > 0 || showCreate) ? (
        <ul
          id="cc-company-options"
          role="listbox"
          className="animate-fade absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-[var(--shadow-overlay)]"
        >
          {matches.map((company, index) => (
            <li key={company.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onPointerEnter={() => setHighlight(index)}
                onClick={() => pick(company)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  index === highlight ? "bg-surface-hover" : ""
                }`}
              >
                <CompanyLogo company={company} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-text">
                    {company.name}
                  </span>
                  <span className="block truncate text-[11px] text-text-faint">
                    {INDUSTRY_LABELS[company.industry]}
                    {company.headquarters ? ` · ${company.headquarters.city}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}

          {showCreate ? (
            <li role="none" className="border-t border-border">
              <button
                type="button"
                role="option"
                aria-selected={highlight === matches.length}
                onPointerEnter={() => setHighlight(matches.length)}
                onClick={createNew}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  highlight === matches.length ? "bg-surface-hover" : ""
                }`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-sm border border-dashed border-border-strong text-accent">
                  +
                </span>
                <span className="text-[13px] text-text">
                  Créer «&nbsp;{trimmed}&nbsp;»
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
