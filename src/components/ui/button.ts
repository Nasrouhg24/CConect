/**
 * Styles de bouton, hors du module client de `ui/index.tsx` : un composant
 * serveur qui habille un `Link` en bouton doit pouvoir appeler
 * `buttonClass()`, ce qu'il ne peut pas faire d'une fonction exportée par un
 * module `"use client"`.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * Les états de survol passent par `enabled:` : un bouton désactivé ne réagit
 * plus, sans pour autant couper les événements pointeur — son `title` reste
 * lisible, c'est souvent lui qui explique pourquoi il est désactivé.
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-on-accent enabled:hover:border-accent-hover enabled:hover:bg-accent-hover enabled:active:border-accent-pressed enabled:active:bg-accent-pressed [&:is(a)]:hover:bg-accent-hover [&:is(a)]:active:bg-accent-pressed",
  secondary:
    "border border-border-strong bg-surface-raised text-text shadow-[0_1px_0_rgb(23_22_20/0.04)] enabled:hover:bg-surface-hover enabled:active:bg-surface-pressed [&:is(a)]:hover:bg-surface-hover [&:is(a)]:active:bg-surface-pressed",
  ghost:
    "border border-transparent text-text-muted enabled:hover:bg-surface-hover enabled:hover:text-text enabled:active:bg-surface-pressed [&:is(a)]:hover:bg-surface-hover [&:is(a)]:hover:text-text [&:is(a)]:active:bg-surface-pressed",
  danger:
    "border border-danger/45 bg-surface-raised text-danger enabled:hover:border-danger enabled:hover:bg-danger-soft enabled:active:bg-danger/15",
};

/*
 * Hauteur fixe, jamais de padding vertical : deux boutons de même taille ont
 * la même hauteur quel que soit leur contenu. `lg` s'aligne sur les champs de
 * formulaire (44 px), c'est le bouton qui valide un formulaire.
 */
const BUTTON_SIZES: Record<ButtonSize, { box: string; text: string }> = {
  sm: { box: "h-8 gap-1.5 px-3", text: "text-list" },
  md: { box: "h-9 gap-2 px-3.5", text: "text-body" },
  lg: { box: "h-11 gap-2 px-5", text: "text-body" },
};

const TYPE_SIZE = /(^|\s)text-(micro|label|meta|list|body|lead)(\s|$)/;
const TYPE_WEIGHT = /(^|\s)font-(normal|medium|semibold)(\s|$)/;

/**
 * Classes d'un bouton, pour ce qui n'est pas un `<button>` : un `Link` ou un
 * `<a>` qui se présente comme une action.
 *
 * Le corps de texte d'un appel peut rester le sien (`text-list`,
 * `font-semibold`) : il remplace alors celui de la taille au lieu d'entrer en
 * conflit avec lui dans la feuille de style.
 */
export function buttonClass({
  variant = "secondary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const { box, text } = BUTTON_SIZES[size];
  return [
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-sm",
    "transition-[background-color,border-color,color,box-shadow] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-45",
    BUTTON_VARIANTS[variant],
    box,
    TYPE_SIZE.test(className) ? "" : text,
    TYPE_WEIGHT.test(className) ? "" : "font-medium",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}
