import { SiteFooter } from "@/components/PageShell";
import {
  CompanyLibrary,
  type LibraryRow,
} from "@/components/companies/CompanyLibrary";
import { EmptyState } from "@/components/ui/feedback";
import { getCompanies, getCompanyStats } from "@/lib/repository";

export const metadata = { title: "Entreprises" };

const NO_COUNTS = { contacts: 0, experiences: 0 };

/**
 * Répertoire des entreprises.
 *
 * La page ne fait que lire : tout le tri, le filtre et la recherche vivent
 * dans `CompanyLibrary`, côté client, parce qu'ils réagissent à la frappe.
 *
 * Elle n'utilise pas `PageShell` : l'en-tête n'est pas un titre de page suivi
 * d'un chapô, c'est une ouverture de répertoire — un filet, le nom du volume,
 * son nombre de fiches. La colonne et le pied de page restent ceux du site.
 */
export default async function CompaniesPage() {
  // Les compteurs sont agrégés en base (vue `company_stats`).
  const [companies, stats] = await Promise.all([
    getCompanies(),
    getCompanyStats(),
  ]);

  const rows: LibraryRow[] = companies
    .map((company) => ({
      company,
      ...(stats.get(company.slug) ?? NO_COUNTS),
    }))
    .sort(
      (a, b) =>
        b.contacts + b.experiences - (a.contacts + a.experiences) ||
        a.company.name.localeCompare(b.company.name),
    );

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6 sm:py-16">
        <header className="mb-10 sm:mb-12">
          {/* Une seule connexion tirée du motif de l'accueil : un nœud plein,
              un filet, un nœud ouvert. C'est la signature, pas le décor — elle
              tient dans 72 px et ne bouge pas. */}
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

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className="text-title font-medium uppercase tracking-[0.13em] text-text">
              Entreprises
            </h1>
            <p className="font-mono text-meta tabular-nums text-text-faint">
              {companies.length} fiche{companies.length === 1 ? "" : "s"}
            </p>
          </div>

          <p className="mt-4 max-w-[34rem] text-list text-text-muted">
            Les endroits où le réseau du College of Computing a déjà ouvert une
            porte.
          </p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="Répertoire vide"
            body="Ajoutez la première fiche : toutes les contributions s'y rattacheront."
            action={{ href: "/companies/new", label: "Ajouter une entreprise" }}
          />
        ) : (
          <CompanyLibrary rows={rows} />
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
