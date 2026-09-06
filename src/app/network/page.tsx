import { NetworkExplorer } from "@/components/network/NetworkExplorer";
import { getCompanies, getEntries, getPlaces } from "@/lib/repository";

export const metadata = { title: "Réseau" };

export default async function NetworkPage() {
  const [entries, companies, places] = await Promise.all([
    getEntries(),
    getCompanies(),
    getPlaces(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Carte du réseau CConnect</h1>
      <NetworkExplorer entries={entries} companies={companies} places={places} />
    </div>
  );
}
