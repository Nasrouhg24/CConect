"use client";

import { useActionState, useState } from "react";
import {
  updateContactChannels,
  type ProfileResult,
} from "@/app/profile/actions";
import { Button, inputClass, labelClass } from "@/components/ui";
import type { Author } from "@/lib/types";

/**
 * Canaux par lesquels les autres membres peuvent joindre ce membre.
 *
 * « Connecter LinkedIn » signifie ici : enregistrer l'URL publique de son
 * profil. Aucune authentification LinkedIn n'est branchée — le dire clairement
 * vaut mieux que de laisser croire le contraire. La colonne `linkedin_id`
 * existe en base pour qu'un OAuth puisse s'y greffer sans migration lourde.
 */
export function ProfileChannels({ member }: { member: Author }) {
  const [editing, setEditing] = useState(
    !member.linkedinUrl && !member.contactEmail,
  );
  const [state, formAction, pending] = useActionState<ProfileResult | null, FormData>(
    updateContactChannels,
    null,
  );

  if (!editing) {
    return (
      <div className="space-y-4">
        <Channel
          label="LinkedIn"
          value={member.linkedinUrl}
          href={member.linkedinUrl}
          empty="Aucun profil renseigné"
        />
        <Channel
          label="Email institutionnel"
          value={member.contactEmail}
          empty="Non renseigné — les membres ne pourront pas t'écrire depuis Outlook"
        />
        {state?.ok ? (
          <p className="text-[12px] text-accent">{state.message}</p>
        ) : null}
        <Button size="sm" onClick={() => setEditing(true)}>
          Modifier
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className={labelClass}>Profil LinkedIn</span>
        <input
          name="linkedinUrl"
          type="url"
          defaultValue={member.linkedinUrl ?? ""}
          placeholder="https://www.linkedin.com/in/…"
          className={`${inputClass} mt-1.5`}
        />
        <span className="mt-1 block text-[12px] text-text-faint">
          Public. C&apos;est ce lien que verront les membres qui veulent
          t&apos;identifier.
        </span>
      </label>

      <label className="block">
        <span className={labelClass}>Email institutionnel</span>
        <input
          name="contactEmail"
          type="email"
          defaultValue={member.contactEmail ?? ""}
          placeholder="prenom.nom@um6p.ma"
          className={`${inputClass} mt-1.5`}
        />
        <span className="mt-1 block text-[12px] text-text-faint">
          Visible des seuls membres connectés. Il sert à pré-remplir le brouillon
          Outlook quand quelqu&apos;un veut te contacter.
        </span>
      </label>

      {state && !state.ok ? (
        <p className="text-[12px] text-danger">{state.message}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {member.linkedinUrl || member.contactEmail ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
          >
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Channel({
  label,
  value,
  href,
  empty,
}: {
  label: string;
  value: string | null;
  href?: string | null;
  empty: string;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>
      {value ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1 block truncate text-[13px] text-text underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="mt-1 truncate text-[13px] text-text">{value}</p>
        )
      ) : (
        <p className="mt-1 text-[13px] text-text-faint">{empty}</p>
      )}
    </div>
  );
}
