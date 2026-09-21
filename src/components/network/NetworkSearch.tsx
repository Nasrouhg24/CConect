"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSuggestions, type Suggestion } from "@/lib/entries";
import type { Entry, Filters } from "@/lib/types";

const KIND_ICON: Record<Suggestion["kind"], string> = {
  company: "M2 13h12M4 13V4h4v9M10 13V7h3v6",
  city: "M8 2.5c2 0 3.5 1.5 3.5 3.4C11.5 8.6 8 13 8 13S4.5 8.6 4.5 5.9C4.5 4 6 2.5 8 2.5Z",
  country: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2ZM2.5 8h11M8 2.2c1.6 1.6 2.4 3.6 2.4 5.8S9.6 12.2 8 13.8c-1.6-1.6-2.4-3.6-2.4-5.8S6.4 3.8 8 2.2Z",
  domain: "M8 2.5 13 5v6l-5 2.5L3 11V5Z",
  member: "M8 8.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 13.5c.6-2.2 2.5-3.4 5-3.4s4.4 1.2 5 3.4",
};

/**
 * Recherche globale, posée au-dessus de la carte.
 *
 * Les suggestions sont calculées localement sur les entrées déjà chargées :
 * aucun aller-retour réseau, et le classement suit ce que le réseau contient
 * réellement (entreprises d'abord, puis villes, pays, domaines, membres).
 */
export function NetworkSearch({
  entries,
  value,
  onChange,
  onApply,
  resultCount,
}: {
  entries: Entry[];
  value: string;
  onChange: (value: string) => void;
  onApply: (patch: Partial<Filters>) => void;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => buildSuggestions(entries, value),
    [entries, value],
  );

  useEffect(() => {
    function onDocPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  const showList = open && suggestions.length > 0;

  function choose(suggestion: Suggestion) {
    onApply({ q: "", ...suggestion.patch });
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex h-12 items-center gap-2.5 rounded-sm border border-border-strong bg-surface px-3.5 shadow-[var(--shadow-panel)] transition-colors focus-within:border-accent">
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-text-faint" aria-hidden>
          <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.2 10.2 13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>

        <input
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls="cc-search-suggestions"
          aria-autocomplete="list"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!showList) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => (h + 1) % suggestions.length);
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
            }
            if (event.key === "Enter") {
              event.preventDefault();
              choose(suggestions[highlight]);
            }
          }}
          placeholder="Rechercher une entreprise, une ville, un domaine, un membre…"
          className="h-full flex-1 bg-transparent text-body text-text placeholder:text-text-faint focus:outline-none"
          aria-label="Rechercher dans le réseau"
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            aria-label="Effacer la recherche"
            className="grid h-5 w-5 place-items-center rounded-xs text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
          >
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}

        {/* Repère clavier : signale que le champ est la commande principale
            de l'écran. `aria-hidden` parce qu'il ne décrit rien pour qui
            n'utilise pas la souris — le champ garde son libellé propre. */}
        {value.length === 0 ? (
          <span
            aria-hidden
            className="hidden shrink-0 rounded-xs border border-border-strong px-1.5 py-px font-mono text-micro text-text-faint sm:block"
          >
            /
          </span>
        ) : null}
        <span className="hidden shrink-0 border-l border-border pl-3 font-mono text-label tabular-nums text-text-faint sm:block">
          {resultCount}
        </span>
      </div>

      {showList ? (
        <ul
          id="cc-search-suggestions"
          role="listbox"
          className="animate-fade absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-[var(--shadow-overlay)]"
        >
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.kind}-${suggestion.label}`} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === highlight}
                onPointerEnter={() => setHighlight(index)}
                onClick={() => choose(suggestion)}
                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors ${
                  index === highlight ? "bg-surface-hover" : ""
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-text-faint" aria-hidden>
                  <path
                    d={KIND_ICON[suggestion.kind]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="flex-1 truncate text-list text-text">
                  {suggestion.label}
                </span>
                <span className="text-label text-text-faint">{suggestion.hint}</span>
                <span className="font-mono text-label tabular-nums text-text-faint">
                  {suggestion.count}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
