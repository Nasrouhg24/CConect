"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  createCompanyProfile,
  type CompanyFormResult,
} from "@/app/companies/new/actions";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button, inputClass, labelClass, textareaClass } from "@/components/ui";
import { normalizeCompanyName } from "@/lib/company-name";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import type { Company, Place } from "@/lib/types";

/**
 * Création d'une fiche entreprise.
 *
 * Le rapprochement est montré pendant la saisie : dès que le nom tapé se
 * réduit au nom canonique d'une fiche existante, on propose de rejoindre cette
 * fiche plutôt que d'en créer une nouvelle.
 */
export function CompanyForm({
  companies,
  places,
}: {
  companies: Company[];
  places: Place[];
}) {
  const [name, setName] = useState("");
  const [state, formAction, pending] = useActionState<
    CompanyFormResult | null,
    FormData
  >(createCompanyProfile, null);

  const canonical = normalizeCompanyName(name.trim());
  const duplicate =
    canonical.length >= 2
      ? companies.find((c) => c.normalizedName === canonical)
      : undefined;

  const err = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Nom de l&apos;entreprise</span>
          <input
            name="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Microsoft"
            className={`${inputClass} mt-1.5`}
          />
          {err.name ? (
            <span className="mt-1 block text-[12px] text-danger">{err.name}</span>
          ) : null}
        </label>

        {duplicate ? (
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 rounded-sm border border-warning/40 bg-warning/10 p-3">
              <CompanyLogo company={duplicate} size="sm" />
              <p className="flex-1 text-[12px] leading-relaxed text-warning">
                <span className="font-medium">{duplicate.name}</span> existe déjà
                sous ce nom. Ouvre plutôt sa fiche : créer un doublon casserait
                les offres et contacts déjà rattachés.
              </p>
              <Link
                href={`/companies/${duplicate.slug}`}
                className="shrink-0 rounded-sm border border-border px-2.5 py-1.5 text-[12px] text-text transition-colors hover:bg-surface-hover"
              >
                Ouvrir
              </Link>
            </div>
          </div>
        ) : null}

        <label className="block">
          <span className={labelClass}>Secteur</span>
          <select
            name="industry"
            defaultValue="software"
            className={`${inputClass} mt-1.5`}
          >
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {INDUSTRY_LABELS[industry]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Principale implantation</span>
          <select
            name="headquartersId"
            defaultValue=""
            className={`${inputClass} mt-1.5`}
          >
            <option value="">Non renseignée</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.city}, {p.countryName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelClass}>Site web</span>
          <input
            name="website"
            type="url"
            placeholder="https://exemple.com"
            className={`${inputClass} mt-1.5`}
          />
          {err.website ? (
            <span className="mt-1 block text-[12px] text-danger">{err.website}</span>
          ) : null}
        </label>

        <label className="block">
          <span className={labelClass}>Page LinkedIn</span>
          <input
            name="linkedinUrl"
            type="url"
            placeholder="https://www.linkedin.com/company/…"
            className={`${inputClass} mt-1.5`}
          />
          {err.linkedinUrl ? (
            <span className="mt-1 block text-[12px] text-danger">
              {err.linkedinUrl}
            </span>
          ) : null}
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>URL du logo (optionnel)</span>
          <input
            name="logoUrl"
            type="url"
            placeholder="https://…/logo.png"
            className={`${inputClass} mt-1.5`}
          />
          <span className="mt-1 block text-[12px] text-text-faint">
            Laisse vide pour afficher le monogramme : aucune requête vers un
            service tiers n&apos;est faite depuis le navigateur des membres.
          </span>
          {err.logoUrl ? (
            <span className="mt-1 block text-[12px] text-danger">{err.logoUrl}</span>
          ) : null}
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Description</span>
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            placeholder="Ce qu'il faut savoir pour candidater : équipes, process, périodes de recrutement…"
            className={`${textareaClass} mt-1.5`}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[12px] text-text-faint">Aperçu</span>
        <CompanyLogo company={{ name: name || "??", logoUrl: null }} size="sm" />
      </div>

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
          {state.slug ? (
            <Link
              href={`/companies/${state.slug}`}
              className="mt-1 inline-block text-text underline underline-offset-2"
            >
              Ouvrir la fiche
            </Link>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" variant="primary" disabled={pending || Boolean(duplicate)}>
        {pending ? "Création…" : "Créer la fiche"}
      </Button>
    </form>
  );
}
