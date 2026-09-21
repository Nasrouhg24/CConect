import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

/**
 * Attente de la carte.
 *
 * C'est l'écran le plus lourd — il charge tout le réseau — et c'était le seul
 * qui n'affichait rien pendant ce temps. On pose donc la géométrie définitive
 * tout de suite : fond de carte, barre de recherche flottante, légende en bas
 * à gauche. Quand les données arrivent, rien ne se déplace.
 */
export default function NetworkLoading() {
  return (
    <LoadingRegion label="Chargement de la carte du réseau">
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[var(--color-map-ocean)]" />

        <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl items-start gap-2">
            <Skeleton className="h-12 flex-1 rounded-sm" />
            <Skeleton className="h-12 w-24 rounded-sm" />
          </div>
        </div>

        <div className="absolute bottom-5 left-5 z-20 hidden items-center gap-5 sm:flex">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      </section>
    </LoadingRegion>
  );
}
