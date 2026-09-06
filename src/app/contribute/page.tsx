import Link from "next/link";
import { ContributionForm } from "@/components/ContributionForm";
import { PageShell } from "@/components/PageShell";
import { getCurrentMember, getPlaces, isDemoMode } from "@/lib/repository";

export const metadata = { title: "Contribuer" };

export default async function ContributePage() {
  const [places, member] = await Promise.all([getPlaces(), getCurrentMember()]);

  return (
    <PageShell
      title="Ajouter au réseau"
      lead="Une expérience que tu as vécue, ou une personne que tu connais dans une entreprise. Les deux ont de la valeur."
      width="narrow"
    >
      {member ? (
        <>
          <p className="mb-6 text-[12px] text-text-faint">
            Publié en tant que{" "}
            <span className="text-text-muted">{member.fullName}</span>
            {isDemoMode ? " (membre de démonstration)" : ""}
          </p>
          <ContributionForm places={places} />
        </>
      ) : (
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            Connecte-toi avec ton adresse UM6P pour contribuer.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      )}
    </PageShell>
  );
}
