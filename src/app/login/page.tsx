import { PageShell } from "@/components/PageShell";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/env";
import { isDemoMode } from "@/lib/repository";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <PageShell
      title="Connexion"
      lead={`Réservé aux étudiants et alumni du College of Computing. Seules les adresses @${ALLOWED_EMAIL_DOMAINS.join(", @")} peuvent créer un compte.`}
      width="narrow"
    >
      <div className="max-w-sm">
        {isDemoMode ? (
          <div className="rounded-md border border-border bg-surface p-5">
            <p className="text-[13px] font-medium text-text">Mode démo</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
              Aucun projet Supabase n&apos;est configuré : tu es déjà considéré
              comme membre de démonstration et peux contribuer directement.
              Renseigne <code className="font-mono text-text">.env.local</code>{" "}
              pour activer la vraie authentification.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </PageShell>
  );
}
