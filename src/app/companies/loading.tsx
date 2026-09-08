import { PageShell } from "@/components/PageShell";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

/**
 * L'en-tête est rendu immédiatement : le titre et le chapô ne dépendent
 * d'aucune donnée, il n'y a aucune raison de les faire attendre. Seules les
 * lignes de l'annuaire sont en attente, avec la même géométrie que la liste
 * réelle pour qu'aucun élément ne saute à l'arrivée des données.
 */
export default function CompaniesLoading() {
  return (
    <PageShell
      title="Entreprises"
      lead="Chaque entreprise est une fiche unique : ses offres, ses contacts et les expériences que la promo y a vécues sont regroupés au même endroit."
    >
      <LoadingRegion label="Chargement de l&#39;annuaire des entreprises">
        <div className="border-t border-border">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border py-4"
            >
              <Skeleton className="h-9 w-9 shrink-0 rounded-sm" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5" style={{ width: `${42 - index * 2}%` }} />
                <Skeleton className="h-2.5 w-28" />
              </div>
              <div className="hidden gap-8 sm:flex">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-6" />
              </div>
            </div>
          ))}
        </div>
      </LoadingRegion>
    </PageShell>
  );
}
