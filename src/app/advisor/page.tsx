import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { AdvisorDashboard } from "@/components/advisor/AdvisorDashboard";
import { buttonClass } from "@/components/ui/button";
import { buildAdvisorReport } from "@/lib/advisor";
import { buildActionPlan } from "@/lib/advisor-actions";
import {
  getCareerProfile,
  getCompanies,
  getCurrentMember,
  getEntries,
  getPlaces,
} from "@/lib/repository";

export const metadata = { title: "Conseiller" };

/**
 * Conseiller de carrière.
 *
 * Il ne charge rien de nouveau : il relit les mêmes données que la carte (le
 * réseau entier est déjà chargé pour elle, voir `getEntries`) à travers le
 * profil du membre. Le calcul est une fonction pure, `buildAdvisorReport`.
 */
export default async function AdvisorPage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <PageShell title="Conseiller" width="narrow">
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-body text-text-muted">
            Le conseiller part de ton profil : connecte-toi avec ton adresse UM6P.
          </p>
          <Link href="/login?next=/advisor" className={buttonClass({ variant: "primary", className: "mt-4 text-list" })}>
            Se connecter
          </Link>
        </div>
      </PageShell>
    );
  }

  const [profile, entries, companies, places] = await Promise.all([
    getCareerProfile(member),
    getEntries(),
    getCompanies(),
    getPlaces(),
  ]);

  const report = buildAdvisorReport({ profile, entries, companies, places });
  // Mêmes entrées déjà chargées : le plan ne relit rien.
  const plan = buildActionPlan({
    report,
    profile,
    ownEntries: entries.filter((e) => e.author.id === member.id),
  });

  return (
    <PageShell
      title="Conseiller"
      lead="Ce que tu peux faire maintenant, d'après ton profil et les parcours réels du réseau."
      actions={
        <Link href="/profile#parcours" className="text-list text-text-muted underline-offset-2 hover:text-text hover:underline">
          Modifier mon profil
        </Link>
      }
    >
      <AdvisorDashboard report={report} plan={plan} />
    </PageShell>
  );
}
