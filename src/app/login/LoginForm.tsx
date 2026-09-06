"use client";

import { useState } from "react";
import { ALLOWED_EMAIL_DOMAINS, isAllowedEmail } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/**
 * Connexion par lien magique, restreinte aux domaines autorisés.
 * Le filtre côté client évite d'envoyer un email inutile ; l'accès réel est
 * refusé par la base (trigger + RLS) si l'adresse n'est pas éligible.
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isAllowedEmail(email)) {
      setStatus({
        kind: "error",
        message: `Utilise ton adresse ${ALLOWED_EMAIL_DOMAINS.join(" ou ")}.`,
      });
      return;
    }

    setStatus({ kind: "sending" });
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setStatus(
      error ? { kind: "error", message: error.message } : { kind: "sent" },
    );
  }

  if (status.kind === "sent") {
    return (
      <p className="rounded-sm border border-accent/40 bg-accent-soft p-4 text-sm text-accent">
        Lien envoyé à {email}. Ouvre-le depuis le même navigateur.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="email" className="block text-xs text-text-muted">
        Adresse email UM6P
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`prenom.nom@${ALLOWED_EMAIL_DOMAINS[0]}`}
          className="mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
        />
      </label>

      {status.kind === "error" ? (
        <p className="text-xs text-danger">{status.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="w-full rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover disabled:opacity-50"
      >
        {status.kind === "sending" ? "Envoi…" : "Recevoir un lien de connexion"}
      </button>
    </form>
  );
}
