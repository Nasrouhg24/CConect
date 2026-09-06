"use client";

import { useActionState } from "react";
import {
  createProfile,
  type OnboardingResult,
} from "@/app/onboarding/actions";
import { CAMPUSES, CAMPUS_LABELS, STATUS_LABELS } from "@/lib/labels";

const inputClass =
  "mt-1 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState<
    OnboardingResult | null,
    FormData
  >(createProfile, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs text-text-muted sm:col-span-2">
        Nom complet
        <input name="fullName" required maxLength={80} className={inputClass} />
      </label>

      <label className="block text-xs text-text-muted">
        Campus
        <select name="campus" required defaultValue="rabat" className={inputClass}>
          {CAMPUSES.map((c) => (
            <option key={c} value={c}>
              {CAMPUS_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-text-muted">
        Statut
        <select name="status" required defaultValue="student" className={inputClass}>
          {(["student", "alumni"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-text-muted">
        Promotion
        <input
          name="promotion"
          type="number"
          required
          min={2010}
          max={2100}
          defaultValue={new Date().getFullYear() + 1}
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-text-muted">
        Filière (optionnel)
        <input name="program" maxLength={120} className={inputClass} />
      </label>

      <label className="block text-xs text-text-muted sm:col-span-2">
        LinkedIn (optionnel) — c&apos;est par là que les autres membres te
        contacteront
        <input
          name="linkedinUrl"
          type="url"
          placeholder="https://www.linkedin.com/in/…"
          className={inputClass}
        />
      </label>

      {state && !state.ok ? (
        <p className="text-xs text-danger sm:col-span-2">{state.message}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:bg-accent-hover disabled:opacity-50 sm:col-span-2"
      >
        {pending ? "Création…" : "Créer mon profil"}
      </button>
    </form>
  );
}
