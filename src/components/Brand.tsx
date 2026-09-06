/**
 * Marque CConnect.
 *
 * Un C ouvert dont l'extrémité devient un nœud relié : le C du College of
 * Computing, et la connexion. Rien d'autre — pas de globe, pas de poignée de
 * main, pas de dégradé.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M17 6.6A7 7 0 1 0 17 17.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <circle cx="18.4" cy="17.9" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-sm border border-border bg-surface-raised text-accent">
        <BrandMark className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight text-text">
          CConnect
        </span>
        {compact ? null : (
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-text-faint">
            College of Computing
          </span>
        )}
      </span>
    </span>
  );
}
