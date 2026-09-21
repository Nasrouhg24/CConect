"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button";
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

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Action en cours : le bouton se verrouille et l'annonce. */
  loading?: boolean;
}) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-80"
    />
  );
}

export { buttonClass };

/**
 * Bouton carré à icône — carte, barres d'outils, fermeture de panneau.
 * Toujours étiqueté. `outline` pose un contour de contrôle, `ghost` ne se
 * révèle qu'au survol (fermeture, action secondaire logée dans un en-tête).
 */
export function IconButton({
  label,
  className = "",
  active = false,
  size = "md",
  variant = "outline",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  size?: "sm" | "md";
  variant?: "outline" | "ghost";
}) {
  const tone = active
    ? "border-accent-border bg-accent-soft text-accent"
    : variant === "outline"
      ? "border-border-strong bg-surface-raised text-text-muted enabled:hover:bg-surface-hover enabled:hover:text-text enabled:active:bg-surface-pressed"
      : "border-transparent text-text-muted enabled:hover:bg-surface-hover enabled:hover:text-text enabled:active:bg-surface-pressed";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-sm border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${
        size === "sm" ? "h-8 w-8" : "h-9 w-9"
      } ${tone} ${className}`}
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
    <span className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-border bg-surface-raised pl-2.5 pr-1.5 text-meta text-text">
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
        <span className="text-meta text-text-muted">
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
          size === "sm" ? "text-metric-sm" : "text-metric"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-label uppercase tracking-[0.08em] text-text-faint">
        {label}
      </p>
    </div>
  );
}

/**
 * Option d'un choix exclusif — une ligne, pas une carte.
 *
 * Un vrai `<input type="radio">` masqué : les flèches, l'espace et la
 * soumission de formulaire fonctionnent sans code. L'état choisi se lit par
 * trois indices à la fois — filet vert, fond teinté, point rempli — pour que
 * la couleur ne porte jamais seule l'information.
 */
export function ChoiceOption({
  name,
  value,
  label,
  description,
  checked,
  onChange,
  required,
}: {
  name: string;
  value: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-3.5 rounded-sm border border-border-strong bg-surface-raised px-4 py-3.5 transition-[background-color,border-color] duration-150 hover:bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent">
      <input
        type="radio"
        name={name}
        value={value}
        required={required}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-list text-text-muted">{description}</span>
      </span>
      <span
        aria-hidden
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-raised transition-colors duration-150 peer-checked:border-accent"
      >
        <span className="h-2 w-2 scale-0 rounded-full bg-accent transition-transform duration-150 group-has-[:checked]:scale-100" />
      </span>
    </label>
  );
}

/**
 * Où l'on est, ce qui reste. Une ligne en chasse fixe, pas une frise. Une
 * étape franchie peut afficher ce qui y a été choisi à la place de son nom.
 */
export function StepProgress({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-label text-text-faint">
      {steps.map((label, i) => (
        <li key={i} className="flex items-center gap-3">
          {i > 0 ? <span aria-hidden className="h-px w-8 bg-border-strong/50" /> : null}
          <span
            aria-current={i === current ? "step" : undefined}
            className={i === current ? "text-text" : undefined}
          >
            {String(i + 1).padStart(2, "0")} {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export {
  inputClass,
  labelClass,
  panelClass,
  selectClass,
  textareaClass,
} from "./fields";
