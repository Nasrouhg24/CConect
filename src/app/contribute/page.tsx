import Link from "next/link";
import { ContributionForm } from "@/components/ContributionForm";
import { FlowShell } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/button";
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
    <FlowShell>
      {member ? (
        <ContributionForm
          places={places}
          companies={companies}
          author={`${member.fullName}${isDemoMode ? " (démo)" : ""}`}
        />
      ) : (
        <>
          <h1 className="font-display text-title font-medium tracking-tight text-text">
            Ajouter
          </h1>
          <p className="mt-1.5 text-body text-text-muted">
            Connecte-toi avec ton adresse UM6P.
          </p>
          <Link
            href="/login"
            className={buttonClass({ variant: "primary", size: "lg", className: "mt-8 text-list font-semibold" })}
          >
            Se connecter
          </Link>
        </>
      )}
    </FlowShell>
  );
}
