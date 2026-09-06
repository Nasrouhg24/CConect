"use client";

import { useActionState, useState } from "react";
import {
  editContact,
  removeContact,
  type ContactMutationResult,
} from "@/app/contacts/actions";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CompanyPicker } from "@/components/CompanyPicker";
import { ContactModal } from "@/components/network/ContactModal";
import { Button, inputClass, labelClass, textareaClass } from "@/components/ui";
import { contactToEntry } from "@/lib/entries";
import { CAMPUS_LABELS, DOMAINS, DOMAIN_LABELS, STATUS_LABELS } from "@/lib/labels";
import { contactDisplayName, type Company, type Contact, type Place } from "@/lib/types";

/**
 * Contacts d'une entreprise, présentés à la manière d'un profil : logo,
 * nom, poste, entreprise. L'auteur de la fiche peut la corriger, la déplacer
 * vers une autre entreprise ou la supprimer — les autres membres ne voient que
 * le bouton de mise en relation.
 */
export function CompanyContacts({
  contacts,
  currentMemberId,
  companies,
  places,
}: {
  contacts: Contact[];
  currentMemberId: string | null;
  companies: Company[];
  places: Place[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [contacting, setContacting] = useState<Contact | null>(null);

  return (
    <>
      <ul className="grid gap-3 md:grid-cols-2">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="rounded-md border border-border bg-surface p-4"
          >
            {editing === contact.id ? (
              <ContactEditor
                contact={contact}
                companies={companies}
                places={places}
                onDone={() => setEditing(null)}
              />
            ) : (
              <ContactCard
                contact={contact}
                canEdit={contact.author.id === currentMemberId}
                onEdit={() => setEditing(contact.id)}
                onContact={() => setContacting(contact)}
              />
            )}
          </li>
        ))}
      </ul>

      {contacting ? (
        <ContactModal
          entry={contactToEntry(contacting)}
          onClose={() => setContacting(null)}
        />
      ) : null}
    </>
  );
}

function ContactCard({
  contact,
  canEdit,
  onEdit,
  onContact,
}: {
  contact: Contact;
  canEdit: boolean;
  onEdit: () => void;
  onContact: () => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <CompanyLogo company={contact.company} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-text">
            {contactDisplayName(contact.firstName, contact.lastName)}
          </p>
          <p className="truncate text-[13px] text-text-muted">{contact.position}</p>
          <p className="truncate text-[12px] text-text-faint">
            {contact.company.name} · {contact.place.city}
          </p>
        </div>
      </div>

      {contact.notes ? (
        <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
          {contact.notes}
        </p>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-[12px]">
        <span className="text-text-faint">
          Ajouté par{" "}
          <span className="text-text-muted">{contact.author.fullName}</span> ·{" "}
          {STATUS_LABELS[contact.author.status]} {contact.author.promotion} ·{" "}
          {CAMPUS_LABELS[contact.author.campus]}
        </span>
        <button
          type="button"
          onClick={onContact}
          className="text-accent underline-offset-2 transition-colors hover:underline"
        >
          Contacter {contact.author.fullName.split(" ")[0]}
        </button>
        {contact.linkedinUrl ? (
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            LinkedIn du contact
          </a>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            Modifier
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ContactEditor({
  contact,
  companies,
  places,
  onDone,
}: {
  contact: Contact;
  companies: Company[];
  places: Place[];
  onDone: () => void;
}) {
  const [company, setCompany] = useState<{
    companyId: string | null;
    newName: string | null;
  }>({ companyId: contact.company.id, newName: null });

  const [editState, editAction, editPending] = useActionState<
    ContactMutationResult | null,
    FormData
  >(editContact, null);
  const [deleteState, deleteAction, deletePending] = useActionState<
    ContactMutationResult | null,
    FormData
  >(removeContact, null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Le formulaire d'édition ne propose que des entreprises existantes : une
  // correction ne doit jamais fabriquer une fiche en double.
  const pickerCompanies = companies.some((c) => c.id === contact.company.id)
    ? companies
    : [contact.company, ...companies];

  const err = editState?.fieldErrors ?? {};

  return (
    <form action={editAction} className="space-y-3">
      <input type="hidden" name="contactId" value={contact.id} />
      <input type="hidden" name="entryKind" value="contact" />

      <CompanyPicker
        companies={pickerCompanies}
        value={company}
        onChange={setCompany}
        allowCreate={false}
        label="Entreprise du contact"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Prénom</span>
          <input
            name="firstName"
            defaultValue={contact.firstName}
            required
            maxLength={80}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Nom</span>
          <input
            name="lastName"
            defaultValue={contact.lastName ?? ""}
            maxLength={80}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Poste</span>
          <input
            name="position"
            defaultValue={contact.position}
            required
            maxLength={120}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Ville</span>
          <select
            name="placeId"
            defaultValue={contact.place.id}
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
            defaultValue={contact.domain}
            className={`${inputClass} mt-1.5`}
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>LinkedIn du contact</span>
          <input
            name="linkedinUrl"
            type="url"
            defaultValue={contact.linkedinUrl ?? ""}
            className={`${inputClass} mt-1.5`}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Notes</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={contact.notes ?? ""}
            maxLength={500}
            className={`${textareaClass} mt-1.5`}
          />
        </label>
      </div>

      {err.companyId ? (
        <p className="text-[12px] text-danger">{err.companyId}</p>
      ) : null}
      {editState && !editState.ok ? (
        <p className="text-[12px] text-danger">{editState.message}</p>
      ) : null}
      {editState?.ok ? (
        <p className="text-[12px] text-accent">{editState.message}</p>
      ) : null}
      {deleteState && !deleteState.ok ? (
        <p className="text-[12px] text-danger">{deleteState.message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={editPending}>
          {editPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Fermer
        </Button>

        {confirmDelete ? (
          <>
            <span className="text-[12px] text-text-muted">Supprimer ce contact ?</span>
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
