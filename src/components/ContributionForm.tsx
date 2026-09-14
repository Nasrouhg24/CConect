"use client";

import { useActionState, useState } from "react";
import {
  submitContribution,
  type ContributionResult,
} from "@/app/contribute/actions";
import { CompanyPicker } from "@/components/CompanyPicker";
import { Button, inputClass, labelClass, textareaClass } from "@/components/ui";
import {
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
} from "@/lib/labels";
import type { Company, Place } from "@/lib/types";

const CURRENT_YEAR = new Date().getFullYear();

type Mode = "experience" | "contact";

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "experience",
    label: "J'ai fait un stage",
    hint: "Un stage ou un poste que tu as occupé.",
  },
  {
    value: "contact",
    label: "Je connais quelqu'un",
    hint: "Même sans avoir travaillé là-bas.",
  },
];

export function ContributionForm({
  places,
  companies,
}: {
  places: Place[];
  companies: Company[];
}) {
  const [mode, setMode] = useState<Mode>("experience");
  const [company, setCompany] = useState<{
    companyId: string | null;
    newName: string | null;
  }>({ companyId: null, newName: null });

  const [state, formAction, pending] = useActionState<
    ContributionResult | null,
    FormData
  >(submitContribution, null);

  const err = state?.fieldErrors ?? {};
  const activeMode = MODES.find((m) => m.value === mode)!;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="entryKind" value={mode} />

      <div>
        <div className="flex rounded-sm border border-border p-1">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              aria-pressed={mode === option.value}
              className={`flex-1 rounded-xs px-3 py-2 text-list transition-colors ${
                mode === option.value
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-meta text-text-faint">{activeMode.hint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CompanyPicker
            companies={companies}
            value={company}
            onChange={setCompany}
          />
          {err.companyId ? (
            <p className="mt-1 text-meta text-danger">{err.companyId}</p>
          ) : null}
        </div>

        <Field label="Ville" name="placeId" error={err.placeId}>
          <select name="placeId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.city}, {p.countryName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Domaine" name="domain" error={err.domain}>
          <select name="domain" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
        </Field>

        {mode === "experience" ? (
          <>
            <Field label="Type" name="kind" error={err.kind}>
              <select name="kind" required defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Choisir…
                </option>
                {EXPERIENCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EXPERIENCE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Année" name="year" error={err.year}>
              <input
                name="year"
                type="number"
                required
                min={2005}
                max={2100}
                defaultValue={CURRENT_YEAR}
                className={inputClass}
              />
            </Field>

            <Field label="Poste" name="title" error={err.title} full>
              <input
                name="title"
                required
                maxLength={120}
                placeholder="Security Engineer Intern"
                className={inputClass}
              />
            </Field>

            <Field
              label="Conseils pour candidater"
              name="summary"
              error={err.summary}
              full
            >
              <textarea
                name="summary"
                rows={4}
                maxLength={1000}
                placeholder="Process, équipe, stack, période…"
                className={textareaClass}
              />
            </Field>
          </>
        ) : null}

        {mode === "contact" ? (
          <>
            <Field label="Prénom" name="firstName" error={err.firstName}>
              <input
                name="firstName"
                required
                maxLength={80}
                placeholder="Sarah"
                className={inputClass}
              />
            </Field>

            <Field
              label="Nom (optionnel)"
              name="lastName"
              error={err.lastName}
              hint="Une initiale suffit."
            >
              <input
                name="lastName"
                maxLength={80}
                placeholder="M."
                className={inputClass}
              />
            </Field>

            <Field label="Poste" name="position" error={err.position} full>
              <input
                name="position"
                required
                maxLength={120}
                placeholder="Cybersecurity Recruiter"
                className={inputClass}
              />
            </Field>

            <Field
              label="LinkedIn (optionnel)"
              name="linkedinUrl"
              error={err.linkedinUrl}
              full
            >
              <input
                name="linkedinUrl"
                type="url"
                maxLength={300}
                placeholder="https://www.linkedin.com/in/…"
                className={inputClass}
              />
            </Field>

            <Field
              label="Comment tu la connais"
              name="notes"
              error={err.notes}
              full
            >
              <textarea
                name="notes"
                rows={3}
                maxLength={500}
                placeholder="Ancien encadrant, rencontré en conférence…"
                className={textareaClass}
              />
            </Field>
          </>
        ) : null}
      </div>

      <p className="text-meta text-text-faint">
        Pas d&apos;email ni de téléphone : c&apos;est toi qu&apos;on
        contactera.
      </p>

      {state ? (
        <div
          role="status"
          className={`rounded-sm border p-3 text-list ${
            state.ok
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          <p>{state.message}</p>
          {state.createdCompany ? (
            <p className="mt-1 text-text-muted">
              Fiche créée : {state.createdCompany}.
            </p>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Publication…" : "Publier"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  full,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className={labelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint ? (
        <span className="mt-1 block text-meta text-text-faint">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-meta text-danger">{error}</span>
      ) : null}
    </label>
  );
}
