import { TerminalExplorer } from "@/components/terminal/TerminalExplorer";
import { getCompanies, getEntries } from "@/lib/repository";

export const metadata = { title: "Mode terminal" };

/**
 * Mode terminal — navigation expérimentale, en plus de la carte habituelle.
 *
 * Mêmes lectures que `/network` : l'arbre (pays, villes, entreprises) est
 * dérivé des contributions déjà chargées pour la carte, sans table ni requête
 * propre au terminal.
 */
export default async function TerminalPage() {
  const [entries, companies] = await Promise.all([getEntries(), getCompanies()]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TerminalExplorer entries={entries} companies={companies} />
    </div>
  );
}
