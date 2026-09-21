import { NetworkExplorer } from "@/components/network/NetworkExplorer";
import { filtersFromParams } from "@/lib/links";
import { getCompanies, getEntries, getPlaces } from "@/lib/repository";

export const metadata = { title: "Réseau" };

/**
 * Les filtres de la carte sont lisibles dans l'URL (`?q=`, `?domain=`,
 * `?country=`, `?kind=`…) : la recherche de l'accueil et les étapes du
 * conseiller ouvrent ainsi la carte déjà filtrée. Constructeur et lecteur
 * vivent ensemble dans `src/lib/links.ts`.
 */
export default async function NetworkPage({ searchParams }: PageProps<"/network">) {
  const initialFilters = filtersFromParams(await searchParams);

  const [entries, companies, places] = await Promise.all([
    getEntries(),
    getCompanies(),
    getPlaces(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Carte du réseau CConnect</h1>
      <NetworkExplorer
        entries={entries}
        companies={companies}
        places={places}
        initialFilters={initialFilters}
      />
    </div>
  );
}
