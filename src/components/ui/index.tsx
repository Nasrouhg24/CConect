"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/lib/labels";
import type { Domain } from "@/lib/types";

/**
 * Primitives CConnect.
 *
 * Toute variation visuelle passe par ici : si un écran a besoin d'un bouton
 * ou d'un champ, il en prend un d'ici plutôt que d'inventer ses classes.
 * C'est ce qui évite le retour des paddings et des rayons arbitraires.
 * Voir docs/DESIGN_SYSTEM.md.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-pressed",
  secondary:
    "border border-border-strong bg-surface-raised text-text hover:bg-surface-hover hover:border-border-strong",
  ghost: "text-text-muted hover:bg-surface-hover hover:text-text",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-4 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    />
  );
}

/** Bouton carré à icône — carte, barres d'outils. Toujours étiqueté. */
export function IconButton({
  label,
  className = "",
  active = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={props["aria-pressed"] ?? undefined}
      className={`grid h-9 w-9 place-items-center rounded-sm border transition-colors duration-150 ${
        active
          ? "border-accent/60 bg-accent-soft text-accent"
          : "border-border bg-surface/90 text-text-muted hover:border-border-strong hover:bg-surface-hover hover:text-text"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Puce de filtre actif. Sans `onRemove`, c'est une simple étiquette. */
export function Chip({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-border bg-surface-raised pl-2.5 pr-1.5 text-[12px] text-text">
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Retirer ce filtre"
          className="grid h-4 w-4 place-items-center rounded-xs text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

/**
 * Indicateur de domaine : un point de 6px, jamais un badge coloré plein.
 * La couleur reste une information secondaire.
 */
export function DomainDot({
  domain,
  withLabel = false,
}: {
  domain: Domain;
  withLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: DOMAIN_COLORS[domain] }}
      />
      {withLabel ? (
        <span className="text-[12px] text-text-muted">
          {DOMAIN_LABELS[domain]}
        </span>
      ) : (
        <span className="sr-only">{DOMAIN_LABELS[domain]}</span>
      )}
    </span>
  );
}

/** Paire chiffre + libellé, utilisée partout où l'on compte quelque chose. */
export function Metric({
  value,
  label,
  size = "md",
}: {
  value: number | string;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div>
      <p
        className={`font-mono tabular-nums text-text ${
          size === "sm" ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-text-faint">
        {label}
      </p>
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-sm border border-border bg-surface px-3 text-sm text-text placeholder:text-text-faint transition-colors focus:border-accent focus:outline-none";

export const textareaClass =
  "w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text placeholder:text-text-faint transition-colors focus:border-accent focus:outline-none";

export const selectClass = `${inputClass} appearance-none bg-[length:10px] bg-[right_0.6rem_center] bg-no-repeat pr-8`;

export const labelClass =
  "block text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint";

export const panelClass =
  "rounded-md border border-border bg-surface-raised shadow-[var(--shadow-panel)]";
