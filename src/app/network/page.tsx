import { NetworkExplorer } from "@/components/network/NetworkExplorer";
import { filtersFromParams } from "@/lib/links";
import {
  getCompanies,
  getMapClusters,
  getNetworkFacets,
  getPlaces,
  getSuggestions,
} from "@/lib/repository";

export const metadata = { title: "Réseau" };

/**
 * Les filtres de la carte sont lisibles dans l'URL (`?q=`, `?domain=`,
 * `?country=`, `?kind=`…) : la recherche de l'accueil et les étapes du
 * conseiller ouvrent ainsi la carte déjà filtrée. Constructeur et lecteur
 * vivent ensemble dans `src/lib/links.ts`.
 *
 * L'URL n'est plus seulement un point d'entrée : c'est l'état de l'écran.
 * La carte est dessinée depuis un agrégat par ville calculé en base
 * (`getMapClusters`), donc changer un filtre demande un nouvel agrégat, donc
 * une nouvelle URL. La page transférait auparavant toutes les contributions
 * pour filtrer dans le navigateur ; elle n'en transfère plus aucune tant
 * qu'aucune ville n'est ouverte.
 */
export default async function NetworkPage({ searchParams }: PageProps<"/network">) {
  const filters = filtersFromParams(await searchParams);

  const [clusters, facets, suggestions, companies, places] = await Promise.all([
    getMapClusters(filters),
    getNetworkFacets(),
    getSuggestions(filters.q),
    getCompanies(),
    getPlaces(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Carte du réseau CConnect</h1>
      <NetworkExplorer
        clusters={clusters}
        facets={facets}
        suggestions={suggestions}
        companies={companies}
        places={places}
        filters={filters}
      />
    </div>
  );
}
