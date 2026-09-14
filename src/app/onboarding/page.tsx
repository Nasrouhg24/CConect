import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PageShell } from "@/components/PageShell";
import { getCurrentMember, isDemoMode } from "@/lib/repository";

export const metadata = { title: "Créer son profil" };

export default async function OnboardingPage() {
  if (isDemoMode) redirect("/network");

  const member = await getCurrentMember();
  if (member) redirect("/network");

  return (
    <PageShell
      title="Ton profil"
      lead="Ce nom apparaîtra sous tes contributions."
      width="narrow"
    >
      <OnboardingForm />
    </PageShell>
  );
}
