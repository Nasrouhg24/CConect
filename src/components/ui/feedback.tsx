import Link from "next/link";
import type { ReactNode } from "react";

/**
 * États vides, de chargement et d'erreur.
 *
 * Séparés de `ui/index.tsx` parce qu'ils ne sont jamais interactifs : ils
 * s'affichent depuis des Server Components et n'ont aucune raison d'envoyer du
 * JavaScript au navigateur.
 *
 * Règle de rédaction : un état vide dit quoi faire ensuite, en une phrase.
 * « Aucune donnée » ne le dit pas ; un paragraphe d'explication le noie.
 */

export function EmptyState({
  title,
  body,
  action,
  compact = false,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  compact?: boolean;
}) {
  return (
    <div
      className={`border border-dashed border-border text-center ${
        compact ? "rounded-sm px-5 py-8" : "rounded-md px-6 py-12"
      }`}
    >
      <p className="text-body text-text">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-list leading-relaxed text-text-muted">
        {body}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-block rounded-sm bg-accent px-4 py-2 text-list font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Bloc de chargement.
 *
 * Il reprend la forme de ce qui va s'afficher — pas un rond qui tourne au
 * milieu de l'écran. La page ne bouge donc pas au moment où les données
 * arrivent, et l'attente indique déjà ce qui arrive.
 *
 * `aria-hidden` : la structure n'a rien à dire à un lecteur d'écran, c'est le
 * conteneur qui porte l'annonce (voir `LoadingRegion`).
 */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`animate-pulse-soft rounded-xs bg-surface-raised ${className}`}
      style={style}
    />
  );
}

/** Annonce l'attente une seule fois, pour l'ensemble des blocs qu'elle enveloppe. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Suite de lignes de hauteur décroissante — une liste en cours de chargement. */
export function SkeletonRows({
  rows = 6,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-px ${className}`}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 py-3.5">
          <Skeleton className="h-4 flex-1" style={{ maxWidth: `${58 - index * 4}%` }} />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}
