import { PageShell } from "@/components/PageShell";
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/env";
import { isDemoMode } from "@/lib/repository";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <PageShell
      title="Connexion"
      lead={`Adresses @${ALLOWED_EMAIL_DOMAINS.join(", @")} uniquement.`}
      width="narrow"
    >
      <div className="max-w-sm">
        {isDemoMode ? (
          <div className="rounded-md border border-border bg-surface p-5">
            <p className="text-list font-medium text-text">Mode démo</p>
            <p className="mt-1.5 text-list text-text-muted">
              Aucune base connectée : tu es déjà membre de démonstration.
              Renseigne <code className="font-mono text-text">.env.local</code>{" "}
              pour activer l&apos;authentification.
            </p>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </PageShell>
  );
}
