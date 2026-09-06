"use client";

/**
 * Contrôles de la carte.
 *
 * Groupe unique, bordure partagée, 36px de côté : ils se lisent comme un seul
 * objet plutôt que comme trois boutons empilés. Le niveau de zoom est affiché
 * pour que l'utilisateur sache toujours où il en est.
 */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  canZoomIn,
  canZoomOut,
  canReset,
  zoomLabel,
  shifted = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canReset: boolean;
  zoomLabel: string;
  /** Le panneau contextuel est ouvert : décaler pour rester visible. */
  shifted?: boolean;
}) {
  return (
    <div
      data-shifted={shifted}
      className="map-controls absolute bottom-5 z-20 flex flex-col items-stretch overflow-hidden rounded-sm border border-border bg-surface/95 backdrop-blur-sm transition-[right] duration-200"
    >
      <ControlButton label="Zoom avant" onClick={onZoomIn} disabled={!canZoomIn}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M8 3.5v9M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </ControlButton>

      <p className="border-y border-border py-1 text-center font-mono text-[10px] tabular-nums text-text-faint">
        {zoomLabel}
      </p>

      <ControlButton label="Zoom arrière" onClick={onZoomOut} disabled={!canZoomOut}>
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M3.5 8h9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </ControlButton>

      <ControlButton
        label="Recentrer la carte"
        onClick={onReset}
        disabled={!canReset}
        className="border-t border-border"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M8 3a5 5 0 1 1-4.6 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M3 2.5v3.2h3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 place-items-center text-text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-text active:bg-accent-soft active:text-accent disabled:pointer-events-none disabled:text-text-faint/40 ${className}`}
    >
      {children}
    </button>
  );
}
