"use client";

import { useState } from "react";
import { DomainDot } from "@/components/ui";
import { CAMPUS_LABELS, EXPERIENCE_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import { ContactModal } from "./ContactModal";
import type { Entry } from "@/lib/types";

/**
 * Expériences et contacts d'une entreprise.
 *
 * Deux listes séparées : ce qu'on a vécu, et qui on connaît. Elles ne se
 * lisent pas de la même façon et n'appellent pas la même action.
 */
export function CompanyEntries({ entries }: { entries: Entry[] }) {
  const [target, setTarget] = useState<Entry | null>(null);
  const experiences = entries.filter((e) => e.entryKind === "experience");
  const contacts = entries.filter((e) => e.entryKind === "contact");

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
            Expériences · {experiences.length}
          </h2>
          {experiences.length === 0 ? (
            <p className="text-[13px] text-text-faint">
              Personne n&apos;a encore partagé d&apos;expérience ici.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {experiences.map((entry) => (
                <li key={entry.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] text-text">{entry.headline}</p>
                    <DomainDot domain={entry.domain} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-faint">
                    {entry.place.city}
                    {entry.experienceKind
                      ? ` · ${EXPERIENCE_KIND_LABELS[entry.experienceKind]} ${entry.year}`
                      : ""}
                  </p>
                  {entry.detail ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
                      {entry.detail}
                    </p>
                  ) : null}
                  <Byline entry={entry} onContact={() => setTarget(entry)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
            Contacts · {contacts.length}
          </h2>
          {contacts.length === 0 ? (
            <p className="text-[13px] text-text-faint">
              Aucun contact identifié pour l&apos;instant.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {contacts.map((entry) => (
                <li key={entry.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[14px] text-text">
                      {entry.contactName}
                      <span className="text-text-muted"> — {entry.headline}</span>
                    </p>
                    <DomainDot domain={entry.domain} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-faint">
                    {entry.place.city}, {entry.place.countryName}
                  </p>
                  {entry.detail ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
                      {entry.detail}
                    </p>
                  ) : null}
                  {entry.contactLinkedinUrl ? (
                    <a
                      href={entry.contactLinkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-1.5 inline-block text-[12px] text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      Profil LinkedIn public
                    </a>
                  ) : null}
                  <Byline entry={entry} onContact={() => setTarget(entry)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {target ? (
        <ContactModal entry={target} onClose={() => setTarget(null)} />
      ) : null}
    </>
  );
}

function Byline({ entry, onContact }: { entry: Entry; onContact: () => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
      <span className="text-text-faint">
        {entry.entryKind === "contact" ? "Ajouté par" : "Partagé par"}{" "}
        <span className="text-text-muted">{entry.author.fullName}</span> ·{" "}
        {STATUS_LABELS[entry.author.status]} {entry.author.promotion} ·{" "}
        {CAMPUS_LABELS[entry.author.campus]}
      </span>
      <button
        type="button"
        onClick={onContact}
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
    </div>
  );
}
