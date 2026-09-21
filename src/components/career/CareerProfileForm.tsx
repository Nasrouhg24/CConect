"use client";

import { useActionState, useState } from "react";
import { saveCareerProfile, type CareerProfileResult } from "@/app/profile/actions";
import { Button, inputClass, labelClass, textareaClass } from "@/components/ui";
import {
  DOMAINS,
  DOMAIN_LABELS,
  STATUS_LABELS,
  STUDY_YEARS,
  STUDY_YEAR_LABELS,
} from "@/lib/labels";
import { MAX_PROFILE_SKILLS } from "@/lib/skills";
import type { CareerProfile, Company, MemberStatus } from "@/lib/types";

const MAX_COUNTRIES = 5;
const MAX_COMPANIES = 10;

/**
 * Parcours et objectifs.
 *
 * Pas un questionnaire : une poignée de champs, tous facultatifs sauf le
 * statut. Chaque champ dit à quoi il sert dans le conseiller, pour qu'on sache
 * ce qu'on gagne à le remplir — et qu'on puisse choisir de ne pas le faire.
 */
export function CareerProfileForm({
  profile,
  countries,
  companies,
}: {
  profile: CareerProfile;
  countries: { code: string; name: string }[];
  companies: Company[];
}) {
  const [state, formAction, pending] = useActionState<CareerProfileResult | null, FormData>(
    saveCareerProfile,
    null,
  );
  const [status, setStatus] = useState<MemberStatus>(profile.member.status);
  const [picked, setPicked] = useState(new Set(profile.targetCountries));
  const [pickedCompanies, setPickedCompanies] = useState(new Set(profile.targetCompanies));
  const err = state?.fieldErrors ?? {};

  const toggle = (set: Set<string>, value: string, max: number) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else if (next.size < max) next.add(value);
    return next;
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Statut</span>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MemberStatus)}
            className={`${inputClass} mt-1.5`}
          >
            <option value="student">{STATUS_LABELS.student}</option>
            <option value="alumni">{STATUS_LABELS.alumni}</option>
          </select>
        </label>

        {status === "student" ? (
          <label className="block">
            <span className={labelClass}>Année d&apos;études</span>
            <select
              name="studyYear"
              defaultValue={profile.member.studyYear ?? ""}
              className={`${inputClass} mt-1.5`}
            >
              <option value="">Non renseignée</option>
              {STUDY_YEARS.map((y) => (
                <option key={y} value={y}>
                  {STUDY_YEAR_LABELS[y]} — {y === "final" ? "PFE" : "PFA"}
                </option>
              ))}
            </select>
            <Hint>Fixe ton objectif : PFA en 3e et 4e année, PFE en dernière année.</Hint>
          </label>
        ) : (
          <label className="block">
            <span className={labelClass}>Mentorat</span>
            <select
              name="openToMentoring"
              defaultValue={
                profile.member.openToMentoring === true
                  ? "yes"
                  : profile.member.openToMentoring === false
                    ? "no"
                    : ""
              }
              className={`${inputClass} mt-1.5`}
            >
              <option value="">Non renseigné</option>
              <option value="yes">J&apos;accepte d&apos;être sollicité·e</option>
              <option value="no">Pas pour l&apos;instant</option>
            </select>
            <Hint>Visible des étudiants de ton domaine dans le conseiller.</Hint>
          </label>
        )}

        <label className="block">
          <span className={labelClass}>Domaine visé</span>
          <select
            name="targetDomain"
            defaultValue={profile.targetDomain ?? ""}
            className={`${inputClass} mt-1.5`}
          >
            <option value="">Non renseigné</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
          <Hint>Trie entreprises, alumni et compétences fréquentes.</Hint>
        </label>

        <label className="block">
          <span className={labelClass}>Poste visé</span>
          <input
            name="targetRole"
            defaultValue={profile.targetRole ?? ""}
            maxLength={120}
            placeholder="SOC Analyst"
            className={`${inputClass} mt-1.5`}
          />
          {err.targetRole ? <ErrorText>{err.targetRole}</ErrorText> : null}
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Compétences</span>
          <textarea
            name="skills"
            rows={2}
            maxLength={1500}
            defaultValue={profile.skills.join(", ")}
            placeholder="Python, Linux, SIEM"
            className={`${textareaClass} mt-1.5`}
          />
          {err.skills ? (
            <ErrorText>{err.skills}</ErrorText>
          ) : (
            <Hint>
              Séparées par des virgules, {MAX_PROFILE_SKILLS} au plus. Sans elles, le conseiller
              ne compare rien.
            </Hint>
          )}
        </label>
      </div>

      <fieldset>
        <legend className={labelClass}>
          Pays visés{" "}
          <span className="font-mono normal-case tracking-normal">
            {picked.size}/{MAX_COUNTRIES}
          </span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {countries.map((c) => {
            const on = picked.has(c.code);
            return (
              <label
                key={c.code}
                className={`inline-flex h-8 cursor-pointer items-center rounded-sm border px-2.5 text-meta transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
                  on
                    ? "border-accent-border bg-accent-soft text-text"
                    : "border-border bg-surface-raised text-text-muted hover:bg-surface-hover"
                } ${!on && picked.size >= MAX_COUNTRIES ? "opacity-45" : ""}`}
              >
                <input
                  type="checkbox"
                  name="targetCountries"
                  value={c.code}
                  checked={on}
                  disabled={!on && picked.size >= MAX_COUNTRIES}
                  onChange={() => setPicked((s) => toggle(s, c.code, MAX_COUNTRIES))}
                  className="sr-only"
                />
                {c.name}
              </label>
            );
          })}
        </div>
        {err.targetCountries ? <ErrorText>{err.targetCountries}</ErrorText> : null}
      </fieldset>

      <fieldset>
        <legend className={labelClass}>
          Entreprises visées{" "}
          <span className="font-mono normal-case tracking-normal">
            {pickedCompanies.size}/{MAX_COMPANIES}
          </span>
        </legend>
        <div className="thin-scroll mt-2 grid max-h-44 gap-x-4 overflow-y-auto rounded-sm border border-border bg-surface px-3 py-2 sm:grid-cols-2">
          {companies.map((c) => {
            const on = pickedCompanies.has(c.slug);
            const full = !on && pickedCompanies.size >= MAX_COMPANIES;
            return (
              <label
                key={c.slug}
                className={`flex h-8 cursor-pointer items-center gap-2 text-list ${full ? "opacity-45" : "text-text-muted"}`}
              >
                <input
                  type="checkbox"
                  name="targetCompanies"
                  value={c.slug}
                  checked={on}
                  disabled={full}
                  onChange={() => setPickedCompanies((s) => toggle(s, c.slug, MAX_COMPANIES))}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                <span className={on ? "text-text" : undefined}>{c.name}</span>
              </label>
            );
          })}
        </div>
        {err.targetCompanies ? <ErrorText>{err.targetCompanies}</ErrorText> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state ? (
          <p role="status" className={`text-meta ${state.ok ? "text-accent" : "text-danger"}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-meta text-text-faint">{children}</span>;
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-meta text-danger">{children}</span>;
}
