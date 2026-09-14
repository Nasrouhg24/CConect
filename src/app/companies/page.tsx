import { PageShell } from "@/components/PageShell";
import {
  CompanyLibrary,
  type LibraryRow,
} from "@/components/companies/CompanyLibrary";
import { EmptyState } from "@/components/ui/feedback";
import { getCompanies, getCompanyStats } from "@/lib/repository";

export const metadata = { title: "Entreprises" };

const NO_COUNTS = { contacts: 0, experiences: 0 };

/**
 * Bibliothèque des entreprises.
 *
 * La page ne fait que lire : tout le tri, le filtre et la recherche vivent
 * dans `CompanyLibrary`, côté client, parce qu'ils réagissent à la frappe.
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
    <PageShell title="Entreprises">
      {rows.length === 0 ? (
        <EmptyState
          title="Bibliothèque vide"
          body="Ajoute la première fiche : toutes les contributions s'y rattacheront."
          action={{ href: "/companies/new", label: "Ajouter une entreprise" }}
        />
      ) : (
        <CompanyLibrary rows={rows} />
      )}
    </PageShell>
  );
}
