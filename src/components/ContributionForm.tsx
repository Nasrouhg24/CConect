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

type Mode = "experience" | "contact" | "offer";

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "experience",
    label: "Une expérience",
    hint: "Un stage ou un poste que tu as réellement occupé.",
  },
  {
    value: "contact",
    label: "Un contact",
    hint: "Une personne que tu connais dans une entreprise — même sans y avoir travaillé.",
  },
  {
    value: "offer",
    label: "Une offre",
    hint: "Une annonce ouverte que la promo peut viser dès maintenant.",
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
              className={`flex-1 rounded-xs px-3 py-2 text-[13px] transition-colors ${
                mode === option.value
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-text-faint">{activeMode.hint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <CompanyPicker
            companies={companies}
            value={company}
            onChange={setCompany}
          />
          {err.companyId ? (
            <p className="mt-1 text-[12px] text-danger">{err.companyId}</p>
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

            <Field label="Intitulé du poste" name="title" error={err.title} full>
              <input
                name="title"
                required
                maxLength={120}
                placeholder="Security Engineer Intern"
                className={inputClass}
              />
            </Field>

            <Field
              label="Ce qui aiderait quelqu'un qui postule"
              name="summary"
              error={err.summary}
              full
            >
              <textarea
                name="summary"
                rows={4}
                maxLength={1000}
                placeholder="Process de recrutement, équipe, stack, période de candidature…"
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
              label="Profil LinkedIn public (optionnel)"
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
              label="Comment tu le/la connais"
              name="notes"
              error={err.notes}
              full
            >
              <textarea
                name="notes"
                rows={3}
                maxLength={500}
                placeholder="Ancien encadrant de stage, rencontré à une conférence…"
                className={textareaClass}
              />
            </Field>
          </>
        ) : null}

        {mode === "offer" ? (
          <>
            <Field label="Intitulé de l'offre" name="title" error={err.title} full>
              <input
                name="title"
                required
                maxLength={140}
                placeholder="Cybersecurity Intern"
                className={inputClass}
              />
            </Field>

            <Field label="Type de contrat" name="kind" error={err.kind}>
              <select name="kind" required defaultValue="internship" className={inputClass}>
                {EXPERIENCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {EXPERIENCE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Durée en mois (optionnel)"
              name="durationMonths"
              error={err.durationMonths}
            >
              <input
                name="durationMonths"
                type="number"
                min={1}
                max={36}
                placeholder="4"
                className={inputClass}
              />
            </Field>

            <Field
              label="Technologies"
              name="technologies"
              error={err.technologies}
              hint="Séparées par des virgules, 12 maximum."
              full
            >
              <input
                name="technologies"
                maxLength={200}
                placeholder="Cybersecurity, SOC, SIEM"
                className={inputClass}
              />
            </Field>

            <Field
              label="Lien vers l'annonce (optionnel)"
              name="url"
              error={err.url}
              full
            >
              <input
                name="url"
                type="url"
                maxLength={400}
                placeholder="https://careers.exemple.com/…"
                className={inputClass}
              />
            </Field>

            <Field label="Description" name="description" error={err.description} full>
              <textarea
                name="description"
                rows={4}
                maxLength={1500}
                placeholder="Missions, équipe, process de candidature, date limite…"
                className={textareaClass}
              />
            </Field>
          </>
        ) : null}
      </div>

      <p className="rounded-sm border border-border bg-surface p-3 text-[12px] leading-relaxed text-text-faint">
        Ne renseigne jamais l&apos;email ou le téléphone d&apos;un contact
        externe : ces champs n&apos;existent pas en base et le texte libre est
        vérifié. C&apos;est toi que les autres membres contacteront.
      </p>

      {state ? (
        <div
          role="status"
          className={`rounded-sm border p-3 text-[13px] ${
            state.ok
              ? "border-accent/40 bg-accent-soft text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          <p>{state.message}</p>
          {state.createdCompany ? (
            <p className="mt-1 text-text-muted">
              Nouvelle fiche entreprise créée : {state.createdCompany}. Complète-la
              depuis sa page si tu as le secteur ou le site.
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
        <span className="mt-1 block text-[12px] text-text-faint">{hint}</span>
      ) : null}
      {error ? (
        <span className="mt-1 block text-[12px] text-danger">{error}</span>
      ) : null}
    </label>
  );
}
