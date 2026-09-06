"use client";

import Link from "next/link";
import { useState } from "react";
import { summarize } from "@/lib/entries";
import { DOMAIN_LABELS, EXPERIENCE_KIND_LABELS } from "@/lib/labels";
import { Button, DomainDot, Metric } from "@/components/ui";
import { ContactModal } from "./ContactModal";
import type { Entry, Place } from "@/lib/types";

/**
 * Panneau contextuel d'une ville.
 *
 * Il ne couvre pas la carte : largeur fixe, ancré à droite, la carte reste
 * visible et manipulable derrière. On y va du général (combien, quelles
 * entreprises, quels domaines) au détail (les entrées une à une).
 */
export function PlaceDrawer({
  place,
  entries,
  onClose,
}: {
  place: Place;
  entries: Entry[];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [contactTarget, setContactTarget] = useState<Entry | null>(null);
  const summary = summarize(entries);

  return (
    <>
      <aside
        className="animate-panel pointer-events-auto absolute right-0 top-0 z-30 flex h-full w-[min(100%,23rem)] flex-col border-l border-border bg-surface/95 backdrop-blur-md"
        aria-label={`Détail de ${place.city}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.1em] text-text-faint">
              {place.countryName}
            </p>
            <h2 className="mt-0.5 text-xl font-medium tracking-tight text-text">
              {place.city}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panneau"
            className="mt-1 grid h-7 w-7 place-items-center rounded-sm text-text-faint transition-colors hover:bg-surface-hover hover:text-text"
          >
            <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="thin-scroll flex-1 overflow-y-auto">
          <section className="grid grid-cols-3 gap-3 border-b border-border px-5 py-4">
            <Metric size="sm" value={summary.experiences} label="expériences" />
            <Metric size="sm" value={summary.contacts} label="contacts" />
            <Metric size="sm" value={summary.members} label="membres" />
          </section>

          <Section title={`Entreprises · ${summary.companies.length}`}>
            <ul className="space-y-0.5">
              {summary.companies.slice(0, 6).map(({ company, count }) => (
                <li key={company.slug}>
                  <Link
                    href={`/companies/${company.slug}`}
                    className="flex items-center justify-between rounded-sm px-2 py-1.5 -mx-2 text-[13px] text-text transition-colors hover:bg-surface-hover"
                  >
                    <span className="truncate">{company.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-text-faint">
                      {count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Domaines">
            <ul className="space-y-1.5">
              {summary.domains.map(({ domain, count }) => (
                <li key={domain} className="flex items-center gap-2 text-[13px]">
                  <DomainDot domain={domain} />
                  <span className="flex-1 text-text-muted">{DOMAIN_LABELS[domain]}</span>
                  <span className="font-mono text-[11px] tabular-nums text-text-faint">
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title={`Contributions · ${entries.length}`}>
            <ul className="space-y-3">
              {(expanded ? entries : entries.slice(0, 4)).map((entry) => (
                <li key={`${entry.entryKind}-${entry.id}`} className="border-l border-border pl-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] text-text">
                      {entry.entryKind === "contact" ? (
                        <>
                          <span className="font-medium">{entry.contactName}</span>
                          <span className="text-text-muted"> · {entry.headline}</span>
                        </>
                      ) : (
                        entry.headline
                      )}
                    </p>
                    <DomainDot domain={entry.domain} />
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-faint">
                    {entry.company.name}
                    {entry.experienceKind
                      ? ` · ${EXPERIENCE_KIND_LABELS[entry.experienceKind]} ${entry.year}`
                      : " · contact"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="text-[12px] text-text-muted">
                      {entry.author.fullName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setContactTarget(entry)}
                      className="text-[12px] text-accent underline-offset-2 transition-colors hover:underline"
                    >
                      Contacter
                    </button>
                    {entry.contactLinkedinUrl ? (
                      <a
                        href={entry.contactLinkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[12px] text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {entries.length > 4 ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 text-[12px] text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
              >
                {expanded
                  ? "Réduire"
                  : `Voir les ${entries.length - 4} autres contributions`}
              </button>
            ) : null}
          </Section>
        </div>

        <footer className="border-t border-border p-4">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setExpanded(true)}
          >
            Explorer {place.city}
          </Button>
        </footer>
      </aside>

      {contactTarget ? (
        <ContactModal
          entry={contactTarget}
          onClose={() => setContactTarget(null)}
        />
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-5 py-4 last:border-b-0">
      <h3 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}
