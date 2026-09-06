"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { CAMPUS_LABELS, EXPERIENCE_KIND_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { Entry } from "@/lib/types";

type Reason =
  | "internship"
  | "contact"
  | "company"
  | "opportunity"
  | "other";

const REASONS: { value: Reason; label: string; subject: (e: Entry) => string }[] = [
  {
    value: "internship",
    label: "En savoir plus sur son expérience",
    subject: (e) => `Votre expérience chez ${e.company.name}`,
  },
  {
    value: "contact",
    label: "Être mis en relation avec son contact",
    subject: (e) => `Mise en relation — ${e.company.name}`,
  },
  {
    value: "company",
    label: "Des questions sur l'entreprise",
    subject: (e) => `Questions sur ${e.company.name}`,
  },
  {
    value: "opportunity",
    label: "Une opportunité de stage",
    subject: (e) => `Opportunité de stage — ${e.company.name}`,
  },
  {
    value: "other",
    label: "Autre",
    subject: (e) => `CConnect — ${e.company.name}`,
  },
];

/**
 * Mise en relation avec le membre qui a publié l'entrée.
 *
 * On n'envoie rien : on prépare un brouillon que l'utilisateur ouvre dans son
 * client de messagerie institutionnel. Le contact externe n'est cité que par
 * son prénom et son rôle — jamais son email ni son téléphone, qui n'existent
 * nulle part dans le système.
 */
export function ContactModal({
  entry,
  onClose,
}: {
  entry: Entry;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<Reason>(
    entry.entryKind === "contact" ? "contact" : "internship",
  );
  const [message, setMessage] = useState("");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("input")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const member = entry.author;
  const firstName = member.fullName.split(" ")[0];
  const chosen = REASONS.find((r) => r.value === reason)!;

  const context =
    entry.entryKind === "contact"
      ? `Sur CConnect, tu as ajouté un contact chez ${entry.company.name} (${entry.place.city}) : ${entry.contactName}, ${entry.headline}.`
      : `Sur CConnect, tu as partagé ton expérience « ${entry.headline} » chez ${entry.company.name} (${entry.place.city}${
          entry.experienceKind
            ? `, ${EXPERIENCE_KIND_LABELS[entry.experienceKind]} ${entry.year}`
            : ""
        }).`;

  const body = [
    `Bonjour ${firstName},`,
    "",
    context,
    "",
    message.trim() ||
      "Je me permets de te contacter à ce sujet et je serais reconnaissant·e d'avoir ton retour.",
    "",
    "Merci d'avance,",
    "",
    "— Envoyé depuis CConnect, le réseau du College of Computing",
  ].join("\n");

  const mailto = member.contactEmail
    ? `mailto:${encodeURIComponent(member.contactEmail)}?subject=${encodeURIComponent(
        chosen.subject(entry),
      )}&body=${encodeURIComponent(body)}`
    : null;

  return (
    <div
      className="animate-fade fixed inset-0 z-50 grid place-items-center bg-base/70 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet w-full max-w-lg overflow-hidden rounded-md border border-border bg-surface-raised shadow-[var(--shadow-overlay)]"
      >
        <header className="border-b border-border px-5 py-4">
          <h2 id={titleId} className="text-base font-medium text-text">
            Contacter {firstName}
          </h2>
          <p className="mt-0.5 text-[12px] text-text-muted">
            {STATUS_LABELS[member.status]} {member.promotion} · Campus{" "}
            {CAMPUS_LABELS[member.campus]}
          </p>
        </header>

        <div className="thin-scroll max-h-[60vh] overflow-y-auto px-5 py-4">
          <fieldset>
            <legend className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
              Motif
            </legend>
            <div className="mt-2 space-y-1">
              {REASONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] transition-colors ${
                    reason === option.value
                      ? "bg-accent-soft text-text"
                      : "text-text-muted hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={() => setReason(option.value)}
                    className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-4 block">
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
              Message (optionnel)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={800}
              placeholder="Deux lignes suffisent : qui tu es, ce que tu cherches."
              className="mt-1.5 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
            />
          </label>

          <details className="mt-3 rounded-sm border border-border bg-surface px-3 py-2">
            <summary className="cursor-pointer text-[12px] text-text-muted">
              Aperçu de l&apos;email
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-text-faint">
              <span className="text-text-muted">Objet : </span>
              {chosen.subject(entry)}
              {"\n\n"}
              {body}
            </p>
          </details>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <p className="text-[11px] leading-snug text-text-faint">
            {entry.entryKind === "contact"
              ? "Les coordonnées privées du contact externe ne sont jamais transmises."
              : "Aucun email n'est envoyé par CConnect."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            {mailto ? (
              <a
                href={mailto}
                className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Ouvrir dans Outlook
              </a>
            ) : member.linkedinUrl ? (
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-8 items-center rounded-sm bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Contacter sur LinkedIn
              </a>
            ) : (
              <Button size="sm" disabled title="Ce membre n'a renseigné ni email ni LinkedIn">
                Aucun canal renseigné
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
