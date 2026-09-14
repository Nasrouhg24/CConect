"use client";

import { useActionState, useState } from "react";
import {
  editExperience,
  removeExperience,
  type ExperienceMutationResult,
} from "@/app/experiences/actions";
import { CompanyPicker } from "@/components/CompanyPicker";
import { ContactModal } from "@/components/network/ContactModal";
import { Button, DomainDot, inputClass, labelClass, textareaClass } from "@/components/ui";
import {
  CAMPUS_LABELS,
  DOMAINS,
  DOMAIN_LABELS,
  EXPERIENCE_KINDS,
  EXPERIENCE_KIND_LABELS,
  STATUS_LABELS,
} from "@/lib/labels";
import type { Company, Entry, Place } from "@/lib/types";

/**
 * Expériences réellement vécues chez une entreprise.
 * Se lit comme un journal : quoi, quand, et qui peut en parler. L'auteur peut
 * corriger ou retirer la sienne, personne d'autre.
 */
export function CompanyExperiences({
  entries,
  currentMemberId,
  companies,
  places,
}: {
  entries: Entry[];
  currentMemberId: string | null;
  companies: Company[];
  places: Place[];
}) {
  const [target, setTarget] = useState<Entry | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <ul className="divide-y divide-border border-y border-border">
        {entries.map((entry) => (
          <li key={entry.id} className="py-4">
            {editing === entry.id ? (
              <ExperienceEditor
                entry={entry}
                companies={companies}
                places={places}
                onDone={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body text-text">{entry.headline}</p>
                    <p className="mt-0.5 text-meta text-text-faint">
                      {entry.place.city}
                      {entry.experienceKind
                        ? ` · ${EXPERIENCE_KIND_LABELS[entry.experienceKind]} ${entry.year}`
                        : ""}
                    </p>
                  </div>
                  <DomainDot domain={entry.domain} />
                </div>

                {entry.detail ? (
                  <p className="mt-2 text-list leading-relaxed text-text-muted">
                    {entry.detail}
                  </p>
                ) : null}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
                  <span className="text-text-faint">
                    Partagé par{" "}
                    <span className="text-text-muted">{entry.author.fullName}</span> ·{" "}
                    {STATUS_LABELS[entry.author.status]} {entry.author.promotion} ·{" "}
                    {CAMPUS_LABELS[entry.author.campus]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTarget(entry)}
                    className="text-accent underline-offset-2 transition-colors hover:underline"
                  >
                    Contacter {entry.author.fullName.split(" ")[0]}
                  </button>
                  {entry.author.linkedinUrl ? (
                    <a
                      href={entry.author.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {entry.author.id === currentMemberId ? (
                    <button
                      type="button"
                      onClick={() => setEditing(entry.id)}
                      className="ml-auto text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      Modifier
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {target ? (
        <ContactModal entry={target} onClose={() => setTarget(null)} />
      ) : null}
    </>
  );
}

function ExperienceEditor({
  entry,
  companies,
  places,
  onDone,
}: {
  entry: Entry;
  companies: Company[];
  places: Place[];
  onDone: () => void;
}) {
  const [company, setCompany] = useState<{
    companyId: string | null;
    newName: string | null;
  }>({ companyId: entry.company.id, newName: null });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [state, formAction, pending] = useActionState<
    ExperienceMutationResult | null,
    FormData
  >(editExperience, null);
  const [deleteState, deleteAction, deletePending] = useActionState<
    ExperienceMutationResult | null,
    FormData
  >(removeExperience, null);

  const err = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="experienceId" value={entry.id} />
      <input type="hidden" name="entryKind" value="experience" />
      <input type="hidden" name="companySlug" value={entry.company.slug} />

      <CompanyPicker
        companies={companies}
        value={company}
        onChange={setCompany}
        allowCreate={false}
        label="Entreprise"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Intitulé du poste</span>
          <input
            name="title"
            defaultValue={entry.headline}
            required
            maxLength={120}
            className={`${inputClass} mt-1.5`}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Ville</span>
          <select
            name="placeId"
            defaultValue={entry.place.id}
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
            defaultValue={entry.domain}
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
          <span className={labelClass}>Type</span>
          <select
            name="kind"
            defaultValue={entry.experienceKind ?? "internship"}
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
          <span className={labelClass}>Année</span>
          <input
            name="year"
            type="number"
            min={2005}
            max={2100}
            defaultValue={entry.year}
            className={`${inputClass} mt-1.5`}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={labelClass}>Ce qui aiderait quelqu&apos;un qui postule</span>
          <textarea
            name="summary"
            rows={3}
            defaultValue={entry.detail ?? ""}
            maxLength={1000}
            className={`${textareaClass} mt-1.5`}
          />
        </label>
      </div>

      {Object.values(err).length > 0 ? (
        <p className="text-meta text-danger">{Object.values(err)[0]}</p>
      ) : null}
      {state ? (
        <p className={`text-meta ${state.ok ? "text-accent" : "text-danger"}`}>
          {state.message}
        </p>
      ) : null}
      {deleteState && !deleteState.ok ? (
        <p className="text-meta text-danger">{deleteState.message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Fermer
        </Button>

        {confirmDelete ? (
          <>
            <span className="text-meta text-text-muted">Supprimer ?</span>
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
