"use client";

import { useActionState, useState } from "react";
import {
  editOffer,
  removeOffer,
  type OfferMutationResult,
} from "@/app/offers/actions";
import { CompanyPicker } from "@/components/CompanyPicker";
import { Button, inputClass, labelClass, textareaClass } from "@/components/ui";
import {
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
} from "@/lib/labels";
import type { Company, JobOffer, Place } from "@/lib/types";

/**
 * Édition d'une offre par la personne qui l'a publiée.
 *
 * Repliée par défaut : la page reste une fiche à lire, pas un formulaire.
 * L'entreprise se change parmi les fiches existantes uniquement — corriger une
 * annonce ne doit pas pouvoir créer un doublon.
 */
export function OfferEditor({
  offer,
  companies,
  places,
}: {
  offer: JobOffer;
  companies: Company[];
  places: Place[];
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [company, setCompany] = useState<{
    companyId: string | null;
    newName: string | null;
  }>({ companyId: offer.company.id, newName: null });

  const [state, formAction, pending] = useActionState<
    OfferMutationResult | null,
    FormData
  >(editOffer, null);
  const [deleteState, deleteAction, deletePending] = useActionState<
    OfferMutationResult | null,
    FormData
  >(removeOffer, null);

  if (!open) {
    return (
      <div className="mt-8 flex items-center gap-3 border-t border-border pt-5">
        <p className="flex-1 text-[12px] text-text-faint">
          Tu as publié cette offre.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          Modifier l&apos;offre
        </Button>
      </div>
    );
  }

  const err = state?.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="mt-8 rounded-md border border-border bg-surface p-4"
    >
      <input type="hidden" name="offerId" value={offer.id} />
      <input type="hidden" name="entryKind" value="offer" />

      <h2 className="mb-4 text-[13px] font-medium text-text">Modifier l&apos;offre</h2>

      <div className="space-y-3">
        <CompanyPicker
          companies={companies}
          value={company}
          onChange={setCompany}
          allowCreate={false}
          label="Entreprise"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Intitulé</span>
            <input
              name="title"
              defaultValue={offer.title}
              required
              maxLength={140}
              className={`${inputClass} mt-1.5`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Ville</span>
            <select
              name="placeId"
              defaultValue={offer.place.id}
              className={`${inputClass} mt-1.5`}
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.city}, {p.countryName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Domaine</span>
            <select
              name="domain"
              defaultValue={offer.domain}
              className={`${inputClass} mt-1.5`}
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Type de contrat</span>
            <select
              name="kind"
              defaultValue={offer.kind}
              className={`${inputClass} mt-1.5`}
            >
              {EXPERIENCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EXPERIENCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Durée en mois</span>
            <input
              name="durationMonths"
              type="number"
              min={1}
              max={36}
              defaultValue={offer.durationMonths ?? ""}
              className={`${inputClass} mt-1.5`}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={labelClass}>Technologies</span>
            <input
              name="technologies"
              defaultValue={offer.technologies.join(", ")}
              maxLength={200}
              className={`${inputClass} mt-1.5`}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={labelClass}>Lien vers l&apos;annonce</span>
            <input
              name="url"
              type="url"
              defaultValue={offer.url ?? ""}
              maxLength={400}
              className={`${inputClass} mt-1.5`}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              name="description"
              rows={4}
              defaultValue={offer.description ?? ""}
              maxLength={1500}
              className={`${textareaClass} mt-1.5`}
            />
          </label>
        </div>
      </div>

      {Object.values(err).length > 0 ? (
        <p className="mt-3 text-[12px] text-danger">{Object.values(err)[0]}</p>
      ) : null}
      {state ? (
        <p
          className={`mt-3 text-[12px] ${state.ok ? "text-accent" : "text-danger"}`}
        >
          {state.message}
        </p>
      ) : null}
      {deleteState && !deleteState.ok ? (
        <p className="mt-3 text-[12px] text-danger">{deleteState.message}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Fermer
        </Button>

        {confirmDelete ? (
          <>
            <span className="text-[12px] text-text-muted">Supprimer l&apos;offre ?</span>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              formAction={deleteAction}
              disabled={deletePending}
            >
              {deletePending ? "Suppression…" : "Confirmer"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="ml-auto"
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
