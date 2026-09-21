"use client";

import Link from "next/link";
import { useState } from "react";
import { summarize } from "@/lib/entries";
import { periodLabel, relationLabel } from "@/lib/career";
import { DOMAIN_LABELS } from "@/lib/labels";
import { personHref } from "@/lib/links";
import { Button, DomainDot, IconButton, Metric } from "@/components/ui";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ContactModal } from "./ContactModal";
import { contactDisplayName, type Entry, type Place } from "@/lib/types";

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
  loading = false,
  onClose,
}: {
  place: Place;
  entries: Entry[];
  /** Le détail de la ville est en route : les compteurs seraient faux. */
  loading?: boolean;
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
            {/* Le type du point est écrit, pas déduit : un panneau qui s'ouvre
                sur « Paris » et un panneau qui s'ouvrirait sur « Google » ne
                doivent pas se ressembler. Un mot en chasse fixe suffit — le
                registre n'a pas besoin d'une pastille de couleur pour dire ce
                qu'il montre. */}
            <p className="font-mono text-label uppercase tracking-[0.12em] text-text-faint">
              Ville · {place.countryName}
            </p>
            <h2 className="mt-0.5 text-subtitle text-text">
              {place.city}
            </h2>
          </div>
          <IconButton
            label="Fermer le panneau"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="-mr-1.5"
          >
            <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
        </header>

        {/* Les contributions ne sont chargées qu'ici, à l'ouverture : la
            carte, elle, n'a reçu que des compteurs par ville. Afficher des
            totaux à zéro en attendant les annoncerait faux. */}
        {loading ? (
          <div className="flex-1 px-5 py-5">
            <p className="animate-pulse font-mono text-label uppercase tracking-[0.12em] text-text-faint">
              Chargement du détail…
            </p>
          </div>
        ) : (
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
                    className="-mx-2 flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-list text-text transition-colors hover:bg-surface-hover"
                  >
                    {/* Le même composant que partout ailleurs : domaine →
                        fournisseur → monogramme. La carte n'a pas sa propre
                        logique de logo. */}
                    <CompanyLogo company={company} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{company.name}</span>
                    <span className="font-mono text-label tabular-nums text-text-faint">
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
                <li key={domain} className="flex items-center gap-2 text-list">
                  <DomainDot domain={domain} />
                  <span className="flex-1 text-text-muted">{DOMAIN_LABELS[domain]}</span>
                  <span className="font-mono text-label tabular-nums text-text-faint">
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
                    <p className="text-list text-text">
                      {entry.entryKind === "contact" ? (
                        <>
                          <span className="font-medium">
                            {contactDisplayName(entry.contactFirstName ?? "", entry.contactLastName)}
                          </span>
                          <span className="text-text-muted"> · {entry.headline}</span>
                        </>
                      ) : (
                        entry.headline
                      )}
                    </p>
                    <DomainDot domain={entry.domain} />
                  </div>
                  <p className="mt-0.5 text-meta text-text-faint">
                    {entry.company.name}
                    {entry.experienceKind
                      ? ` · ${relationLabel(entry)} · ${periodLabel(entry)}`
                      : " · contact"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Link
                      href={personHref(entry.author.id)}
                      className="text-meta text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                    >
                      {entry.author.fullName}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setContactTarget(entry)}
                      className="text-meta text-accent underline-offset-2 transition-colors hover:underline"
                    >
                      Contacter
                    </button>
                    {entry.contactLinkedinUrl ? (
                      <a
                        href={entry.contactLinkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-meta text-text-faint underline-offset-2 transition-colors hover:text-text hover:underline"
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
                className="mt-3 text-meta text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
              >
                {expanded
                  ? "Réduire"
                  : `Voir les ${entries.length - 4} autres contributions`}
              </button>
            ) : null}
          </Section>
        </div>
        )}

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
      <h3 className="mb-2.5 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}
