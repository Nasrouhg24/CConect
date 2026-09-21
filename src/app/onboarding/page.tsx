import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { FlowShell } from "@/components/PageShell";
import { getCurrentMember, isDemoMode } from "@/lib/repository";

export const metadata = { title: "Créer son profil" };

export default async function OnboardingPage() {
  if (isDemoMode) redirect("/network");

  const member = await getCurrentMember();
  if (member) redirect("/network");

  return (
    <FlowShell>
      <OnboardingForm />
    </FlowShell>
  );
}
