import { PageShell } from "@/components/PageShell";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

/**
 * L'en-tête et la barre de recherche sont rendus immédiatement : ils ne
 * dépendent d'aucune donnée. Seules les cartes attendent, avec la géométrie de
 * la grille réelle pour que rien ne saute à l'arrivée des données.
 */
export default function CompaniesLoading() {
  return (
    <PageShell title="Entreprises">
      <Skeleton className="h-10 w-full rounded-sm" />
      <LoadingRegion label="Chargement des entreprises">
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-md border border-border p-3.5"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5" style={{ width: `${70 - (index % 3) * 12}%` }} />
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}
