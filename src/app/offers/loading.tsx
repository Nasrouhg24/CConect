import { PageShell } from "@/components/PageShell";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback";

export default function OffersLoading() {
  return (
    <PageShell
      title="Offres"
      lead="Les annonces partagées par la communauté. Chacune est rattachée à une fiche entreprise : un clic sur le nom mène aux expériences et aux contacts qu&#39;on y a déjà."
    >
      <LoadingRegion label="Chargement des offres">
        <ul className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="rounded-md border border-border bg-surface p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-sm" />
                <div className="min-w-0 flex-1 space-y-2.5">
                  <Skeleton className="h-4" style={{ width: `${70 - index * 6}%` }} />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-5 w-16 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-sm" />
              </div>
            </li>
          ))}
        </ul>
      </LoadingRegion>
    </PageShell>
  );
}
