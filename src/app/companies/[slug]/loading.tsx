import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

/**
 * Fiche entreprise en attente.
 *
 * Le titre dépend ici de la donnée : l'afficher d'avance obligerait à le
 * remplacer sous les yeux du lecteur. On garde donc la silhouette de
 * l'en-tête, sans texte provisoire.
 */
export default function CompanyLoading() {
  return (
    <LoadingRegion label="Chargement de la fiche entreprise">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-10 flex flex-wrap items-start gap-5 border-b border-border pb-8">
          <Skeleton className="h-[72px] w-[72px] rounded-md" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-full max-w-xl" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 border-b border-border pb-8">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {Array.from({ length: 3 }, (_, section) => (
            <div key={section}>
              <Skeleton className="mb-4 h-2.5 w-32" />
              <div className="border-y border-border">
                {Array.from({ length: 3 }, (_, row) => (
                  <div key={row} className="flex items-center gap-4 py-3.5">
                    <Skeleton
                      className="h-3.5 flex-1"
                      style={{ maxWidth: `${52 - row * 6}%` }}
                    />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
