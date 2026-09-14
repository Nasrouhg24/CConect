import Link from "next/link";
import { ContributionForm } from "@/components/ContributionForm";
import { PageShell } from "@/components/PageShell";
import {
  getCompanies,
  getCurrentMember,
  getPlaces,
  isDemoMode,
} from "@/lib/repository";

export const metadata = { title: "Contribuer" };

export default async function ContributePage() {
  const [places, member, companies] = await Promise.all([
    getPlaces(),
    getCurrentMember(),
    getCompanies(),
  ]);

  return (
    <PageShell title="Ajouter" width="narrow">
      {member ? (
        <>
          <p className="mb-6 text-meta text-text-faint">
            En tant que{" "}
            <span className="text-text-muted">{member.fullName}</span>
            {isDemoMode ? " (démo)" : ""}
          </p>
          <ContributionForm places={places} companies={companies} />
        </>
      ) : (
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-body text-text-muted">
            Connecte-toi avec ton adresse UM6P.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 text-list font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      )}
    </PageShell>
  );
}
