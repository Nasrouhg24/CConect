import { CompanyForm } from "@/components/companies/CompanyForm";
import { PageShell } from "@/components/PageShell";
import { getCompanies, getPlaces } from "@/lib/repository";

export const metadata = { title: "Nouvelle entreprise" };

export default async function NewCompanyPage() {
  const [companies, places] = await Promise.all([getCompanies(), getPlaces()]);

  return (
    <PageShell
      title="Ajouter une entreprise"
      lead="Une fiche par entreprise réelle. Les offres, les contacts et les expériences viendront s'y rattacher — c'est ce qui rend le réseau navigable."
      width="narrow"
    >
      <CompanyForm companies={companies} places={places} />
    </PageShell>
  );
}
