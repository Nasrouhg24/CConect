import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DomainDot } from "@/components/ui";
import { EXPERIENCE_KIND_LABELS } from "@/lib/labels";
import type { JobOffer } from "@/lib/types";

/**
 * Carte d'une offre.
 *
 * Le logo et le nom de l'entreprise passent avant le titre du poste : c'est
 * l'entreprise qu'on reconnaît en premier quand on parcourt une liste.
 * Le nom est un lien vers la fiche entreprise, distinct du lien vers l'offre.
 */
export function OfferCard({ offer }: { offer: JobOffer }) {
  const expired =
    offer.expiresAt !== null && new Date(offer.expiresAt) < new Date();

  return (
    <article className="group relative rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised">
      <div className="flex items-start gap-3">
        <CompanyLogo company={offer.company} size="md" />

        <div className="min-w-0 flex-1">
          <Link
            href={`/companies/${offer.company.slug}`}
            className="relative z-10 text-[13px] text-text-muted transition-colors hover:text-text"
          >
            {offer.company.name}
          </Link>
          <h3 className="mt-0.5 text-[15px] font-medium leading-snug text-text">
            <Link href={`/offers/${offer.id}`} className="before:absolute before:inset-0">
              {offer.title}
            </Link>
          </h3>
        </div>

        {expired ? (
          <span className="shrink-0 rounded-xs border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-faint">
            Expirée
          </span>
        ) : null}
      </div>

      <dl className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-muted">
        <Meta label="Lieu" icon={<PinIcon />}>
          {offer.place.city}, {offer.place.countryName}
        </Meta>
        <Meta label="Durée" icon={<ClockIcon />}>
          {offer.durationMonths
            ? `${offer.durationMonths} mois`
            : EXPERIENCE_KIND_LABELS[offer.kind]}
        </Meta>
        <Meta label="Publiée le" icon={<CalendarIcon />}>
          {formatDate(offer.publishedAt)}
        </Meta>
      </dl>

      {offer.technologies.length > 0 ? (
        <ul className="mt-3 flex flex-wrap items-center gap-1.5">
          <li>
            <DomainDot domain={offer.domain} />
          </li>
          {offer.technologies.slice(0, 4).map((tech) => (
            <li
              key={tech}
              className="rounded-xs border border-border px-1.5 py-0.5 text-[11px] text-text-muted"
            >
              {tech}
            </li>
          ))}
          {offer.technologies.length > 4 ? (
            <li className="text-[11px] text-text-faint">
              +{offer.technologies.length - 4}
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}

function Meta({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-faint">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M8 2.5c2 0 3.5 1.5 3.5 3.4C11.5 8.6 8 13 8 13S4.5 8.6 4.5 5.9C4.5 4 6 2.5 8 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3.2l2 1.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
