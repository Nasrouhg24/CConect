import { CompanyForm } from "@/components/companies/CompanyForm";
import { PageShell } from "@/components/PageShell";
import { getCompanies, getPlaces } from "@/lib/repository";

export const metadata = { title: "Nouvelle entreprise" };

/**
 * `?name=` vient de la bibliothèque : on y tape un nom, il n'existe pas, on
 * clique « Ajouter … ». Retaper le nom sur l'écran suivant serait demander
 * deux fois la même chose.
 */
export default async function NewCompanyPage({
  searchParams,
}: PageProps<"/companies/new">) {
  const [companies, places, query] = await Promise.all([
    getCompanies(),
    getPlaces(),
    searchParams,
  ]);

  const prefill = typeof query.name === "string" ? query.name.slice(0, 120) : "";

  return (
    <PageShell title="Ajouter une entreprise" width="narrow">
      <CompanyForm
        companies={companies}
        places={places}
        initialName={prefill}
      />
    </PageShell>
  );
}
