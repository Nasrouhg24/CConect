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
import { domainFromWebsite } from "@/lib/company-domain";
import { INDUSTRIES, INDUSTRY_LABELS } from "@/lib/labels";
import type { Company, Place } from "@/lib/types";
import { buttonClass } from "@/components/ui/button";

/**
 * Création d'une fiche entreprise.
 *
 * Sept champs étaient posés à plat, tous d'apparence obligatoire : site,
 * LinkedIn, logo, description, implantation. Deux suffisent pour qu'une fiche
 * soit utile — le nom et le secteur — et le reste se complète depuis la fiche
 * quand quelqu'un le sait. Les champs facultatifs sont donc repliés : ajouter
 * une entreprise est un geste de dix secondes, pas un formulaire à remplir.
 *
 * Le rapprochement anti-doublons reste montré pendant la saisie : dès que le
 * nom tapé se réduit au nom canonique d'une fiche existante, on renvoie vers
 * cette fiche au lieu d'en créer une seconde.
 */
export function CompanyForm({
  companies,
  places,
  initialName = "",
}: {
  companies: Company[];
  places: Place[];
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);
  /* Le site est tenu en état pour une seule raison : il donne le domaine, et le
     domaine donne le logo. L'aperçu se met donc à jour à la frappe, et le
     membre voit avant d'enregistrer ce que sa fiche affichera. */
  const [website, setWebsite] = useState("");
  const [state, formAction, pending] = useActionState<
    CompanyFormResult | null,
    FormData
  >(createCompanyProfile, null);

  const canonical = normalizeCompanyName(name.trim());
  const duplicate =
    canonical.length >= 2
      ? companies.find((c) => c.normalizedName === canonical)
      : undefined;

  const domain = domainFromWebsite(website);
  const err = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-end gap-3">
        <span className="mb-0.5">
          <CompanyLogo name={name || "?"} domain={domain} size="lg" />
        </span>
        <label className="block min-w-0 flex-1">
          <span className={labelClass}>Nom</span>
          <input
            name="name"
            required
            autoFocus={initialName.length === 0}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Microsoft"
            className={`${inputClass} mt-1.5`}
          />
          {err.name ? (
            <span className="mt-1 block text-meta text-danger">{err.name}</span>
          ) : null}
        </label>
      </div>

      {duplicate ? (
        <div className="flex items-center gap-3 rounded-sm border border-warning/40 bg-warning/10 p-3">
          <CompanyLogo company={duplicate} size="sm" />
          <p className="flex-1 text-meta text-warning">
            <span className="font-medium">{duplicate.name}</span> existe déjà.
          </p>
          <Link
            href={`/companies/${duplicate.slug}`}
            className={buttonClass({ size: "sm", className: "text-meta font-normal" })}
          >
            Ouvrir
          </Link>
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

      {/* Facultatif, et replié : la fiche vit sans, et se complète plus tard. */}
      <details className="rounded-sm border border-border">
        <summary className="cursor-pointer px-3 py-2.5 text-list text-text-muted transition-colors hover:text-text">
          Plus de détails
        </summary>

        <div className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Ville principale</span>
            <select
              name="headquartersId"
              defaultValue=""
              className={`${inputClass} mt-1.5`}
            >
              <option value="">—</option>
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
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://exemple.com"
              className={`${inputClass} mt-1.5`}
            />
            {err.website ? (
              <span className="mt-1 block text-meta text-danger">{err.website}</span>
            ) : null}
            {/* Le domaine retenu est montré tel qu'il sera enregistré : c'est
                lui qui sert de clé au logo, et une URL mal formée se voit ici
                plutôt qu'après coup. */}
            {domain ? (
              <span className="mt-1 block font-mono text-meta text-text-faint">
                → {domain}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelClass}>LinkedIn</span>
            <input
              name="linkedinUrl"
              type="url"
              placeholder="https://www.linkedin.com/company/…"
              className={`${inputClass} mt-1.5`}
            />
            {err.linkedinUrl ? (
              <span className="mt-1 block text-meta text-danger">
                {err.linkedinUrl}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelClass}>Logo</span>
            <input
              name="logoUrl"
              type="url"
              placeholder="https://…/logo.png"
              className={`${inputClass} mt-1.5`}
            />
            {err.logoUrl ? (
              <span className="mt-1 block text-meta text-danger">{err.logoUrl}</span>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              name="description"
              rows={3}
              maxLength={600}
              placeholder="Équipes, process de recrutement, périodes…"
              className={`${textareaClass} mt-1.5`}
            />
          </label>
        </div>
      </details>

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

      <Button type="submit" variant="primary" loading={pending} disabled={Boolean(duplicate)}>
        {pending ? "Ajout…" : "Ajouter"}
      </Button>
    </form>
  );
}
