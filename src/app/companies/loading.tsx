import { SiteFooter } from "@/components/PageShell";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

/**
 * L'en-tête est rendu immédiatement : il ne dépend d'aucune donnée. Seuls la
 * recherche, les filtres et l'index attendent, avec la géométrie réelle des
 * lignes — numéro, logo, deux lignes de texte — pour que rien ne saute à
 * l'arrivée des données.
 */
export default function CompaniesLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 sm:mb-12">
          <svg
            viewBox="0 0 72 8"
            aria-hidden
            focusable="false"
            className="h-2 w-[72px]"
          >
            <line
              x1="8"
              y1="4"
              x2="63"
              y2="4"
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
            <circle cx="3.5" cy="4" r="2.5" fill="var(--color-accent)" />
            <circle
              cx="67"
              cy="4"
              r="2"
              fill="var(--color-base)"
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
          </svg>

          <h1 className="mt-5 text-title font-medium uppercase tracking-[0.13em] text-text">
            Entreprises
          </h1>

          <p className="mt-4 max-w-[34rem] text-list text-text-muted">
            Les endroits où le réseau du College of Computing a déjà ouvert une
            porte.
          </p>
        </header>

        <Skeleton className="h-12 w-full rounded-sm" />

        <LoadingRegion label="Chargement des entreprises">
          <div className="mt-7 flex gap-x-6 border-b border-border pb-2.5 pt-2.5">
            {[4, 7, 6, 5].map((width, index) => (
              <Skeleton key={index} className="h-3" style={{ width: `${width}rem` }} />
            ))}
          </div>

          <div className="mt-7 border-t border-border">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)] items-center gap-x-4 border-b border-border py-4 sm:grid-cols-[2rem_2.25rem_minmax(0,1fr)_auto]"
              >
                <Skeleton className="h-2.5 w-4" />
                <Skeleton className="h-9 w-9 rounded-sm" />
                <div className="min-w-0 space-y-2">
                  <Skeleton
                    className="h-3.5"
                    style={{ width: `${44 - (index % 3) * 8}%` }}
                  />
                  <Skeleton className="h-2.5 w-40" />
                </div>
                <Skeleton className="hidden h-2.5 w-20 sm:block" />
              </div>
            ))}
          </div>
        </LoadingRegion>
      </div>

      <SiteFooter />
    </div>
  );
}
