import Link from "next/link";
import { DomainDot } from "@/components/ui";
import {
  employmentStatus,
  isEmployment,
  periodLabel,
  relationLabel,
} from "@/lib/career";
import { CAMPUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { companyHref } from "@/lib/links";
import type { Author, Entry } from "@/lib/types";

/**
 * Frise de carrière : UM6P, puis chaque relation dans l'ordre.
 *
 * Le vocabulaire graphique est celui de la signature des entreprises — un
 * nœud plein pour ce qui est en cours, un nœud ouvert pour ce qui est passé,
 * un filet entre les deux. Rien d'autre : pas d'icône par type, le type est
 * écrit.
 *
 * `compact` coupe les détails (ville, domaine, compétences) pour les listes.
 */
export function CareerTimeline({
  author,
  records,
  compact = false,
  highlight,
}: {
  author: Author;
  /** Déjà triées dans l'ordre chronologique. */
  records: Entry[];
  compact?: boolean;
  /** Identifiants d'expériences à mettre en avant (ce qui a justifié le résultat). */
  highlight?: Set<string>;
}) {
  return (
    <ol className="relative">
      <Step
        node="root"
        last={records.length === 0}
        title={
          <span className="font-medium text-text">UM6P · College of Computing</span>
        }
        meta={`${STATUS_LABELS[author.status]} ${author.promotion} · Campus ${CAMPUS_LABELS[author.campus]}`}
      />
      {records.map((entry, i) => {
        const current =
          entry.isCurrent === true ||
          (isEmployment(entry) && employmentStatus(entry) === "current");
        const dimmed = highlight ? !highlight.has(entry.id) : false;
        return (
          <Step
            key={entry.id}
            node={current ? "current" : "past"}
            last={i === records.length - 1}
            dimmed={dimmed}
            title={
              <>
                <span className="text-text-muted">{relationLabel(entry)}</span>
                <span className="text-text-faint"> — </span>
                <Link
                  href={companyHref(entry.company.slug, "connexions")}
                  className="font-medium text-text underline-offset-2 hover:underline"
                >
                  {entry.company.name}
                </Link>
              </>
            }
            aside={periodLabel(entry)}
            meta={
              compact
                ? entry.headline
                : `${entry.headline} · ${entry.place.city}, ${entry.place.countryName}`
            }
            detail={
              compact ? null : (
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DomainDot domain={entry.domain} withLabel />
                  {entry.skills.length > 0 ? (
                    <span className="font-mono text-label text-text-faint">
                      {entry.skills.join(" · ")}
                    </span>
                  ) : null}
                </span>
              )
            }
          />
        );
      })}
    </ol>
  );
}

function Step({
  node,
  last,
  dimmed = false,
  title,
  aside,
  meta,
  detail,
}: {
  node: "root" | "current" | "past";
  last: boolean;
  dimmed?: boolean;
  title: React.ReactNode;
  aside?: string;
  meta: string;
  detail?: React.ReactNode;
}) {
  return (
    <li className={`relative grid grid-cols-[14px_1fr] gap-x-3 ${dimmed ? "opacity-55" : ""}`}>
      <span aria-hidden className="relative flex justify-center">
        {!last ? (
          <span className="absolute bottom-0 top-3 w-px bg-border-strong/60" />
        ) : null}
        <span
          className={`relative mt-[5px] h-2 w-2 rounded-full ${
            node === "current"
              ? "bg-accent"
              : node === "root"
                ? "bg-text"
                : "border border-border-strong bg-base"
          }`}
        />
      </span>
      <div className={last ? "pb-0" : "pb-4"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <p className="text-list">{title}</p>
          {aside ? (
            <span className="font-mono text-label tabular-nums text-text-faint">{aside}</span>
          ) : null}
        </div>
        <p className="text-meta text-text-faint">{meta}</p>
        {detail}
      </div>
    </li>
  );
}
