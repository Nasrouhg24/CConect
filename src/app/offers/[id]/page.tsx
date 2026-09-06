import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { PageShell } from "@/components/PageShell";
import { formatDate } from "@/components/offers/OfferCard";
import { DomainDot } from "@/components/ui";
import {
  DOMAIN_LABELS,
  EXPERIENCE_KIND_LABELS,
  INDUSTRY_LABELS,
} from "@/lib/labels";
import { getCompanyBundle, getJobOffer } from "@/lib/repository";

export async function generateMetadata({ params }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  const offer = await getJobOffer(id);
  return { title: offer ? `${offer.title} — ${offer.company.name}` : "Offre" };
}

export default async function OfferPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  const offer = await getJobOffer(id);
  if (!offer) notFound();

  // La fiche entreprise est la source des chiffres : une offre ne duplique
  // jamais ce que l'entreprise sait déjà d'elle-même.
  const bundle = await getCompanyBundle(offer.company.slug);
  const expired =
    offer.expiresAt !== null && new Date(offer.expiresAt) < new Date();

  return (
    <PageShell title={offer.title} width="narrow">
      <div className="mb-8 flex items-center gap-3.5 rounded-md border border-border bg-surface p-4">
        <CompanyLogo company={offer.company} size="lg" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/companies/${offer.company.slug}`}
            className="text-[15px] text-text underline-offset-4 hover:underline"
          >
            {offer.company.name}
          </Link>
          <p className="mt-0.5 text-[12px] text-text-faint">
            {INDUSTRY_LABELS[offer.company.industry]}
            {bundle
              ? ` · ${bundle.offers.length} offre${bundle.offers.length > 1 ? "s" : ""} · ${bundle.contacts.length} contact${bundle.contacts.length > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>
        <Link
          href={`/companies/${offer.company.slug}`}
          className="shrink-0 rounded-sm border border-border px-3 py-1.5 text-[12px] text-text-muted transition-colors hover:border-border-strong hover:text-text"
        >
          Voir l&apos;entreprise
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-5 sm:grid-cols-4">
        <Row label="Lieu">
          {offer.place.city}, {offer.place.countryName}
        </Row>
        <Row label="Contrat">{EXPERIENCE_KIND_LABELS[offer.kind]}</Row>
        <Row label="Durée">
          {offer.durationMonths ? `${offer.durationMonths} mois` : "—"}
        </Row>
        <Row label="Publiée le">{formatDate(offer.publishedAt)}</Row>
      </dl>

      {expired ? (
        <p className="mt-5 rounded-sm border border-warning/40 bg-warning/10 p-3 text-[13px] text-warning">
          Cette offre a expiré le {formatDate(offer.expiresAt!)}. L&apos;entreprise
          et les contacts restent utiles pour une candidature spontanée.
        </p>
      ) : null}

      {offer.description ? (
        <section className="mt-8">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
            Description
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
            {offer.description}
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          Domaine et technologies
        </h2>
        <ul className="flex flex-wrap items-center gap-2">
          <li className="flex items-center gap-1.5 text-[13px] text-text-muted">
            <DomainDot domain={offer.domain} />
            {DOMAIN_LABELS[offer.domain]}
          </li>
          {offer.technologies.map((tech) => (
            <li
              key={tech}
              className="rounded-xs border border-border px-2 py-0.5 text-[12px] text-text-muted"
            >
              {tech}
            </li>
          ))}
        </ul>
      </section>

      {bundle && bundle.contacts.length > 0 ? (
        <section className="mt-8 rounded-md border border-border bg-surface p-4">
          <h2 className="text-[13px] font-medium text-text">
            Le réseau connaît {bundle.contacts.length} personne
            {bundle.contacts.length > 1 ? "s" : ""} ici
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">
            Avant de postuler en ligne, regarde qui de la promo peut te faire
            passer le CV en interne.
          </p>
          <Link
            href={`/companies/${offer.company.slug}#contacts`}
            className="mt-3 inline-block text-[13px] text-accent underline-offset-2 hover:underline"
          >
            Voir les contacts chez {offer.company.name}
          </Link>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {offer.url ? (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Ouvrir l&apos;annonce
          </a>
        ) : null}
        <p className="text-[12px] text-text-faint">
          Publiée par {offer.postedBy.fullName}
        </p>
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.08em] text-text-faint">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] text-text">{children}</dd>
    </div>
  );
}
