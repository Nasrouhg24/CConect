import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { PageShell } from "@/components/PageShell";
import { CompanyContacts } from "@/components/companies/CompanyContacts";
import { CompanyExperiences } from "@/components/companies/CompanyExperiences";
import { OfferCard } from "@/components/offers/OfferCard";
import { DomainDot, Metric } from "@/components/ui";
import { summarize } from "@/lib/entries";
import { DOMAIN_LABELS, INDUSTRY_LABELS } from "@/lib/labels";
import { getCompanyBundle, getCurrentMember, getPlaces } from "@/lib/repository";

export async function generateMetadata({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  const bundle = await getCompanyBundle(slug);
  return { title: bundle?.company.name ?? "Entreprise" };
}

export default async function CompanyPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  const bundle = await getCompanyBundle(slug);
  if (!bundle) notFound();

  const { company, offers, contacts, experiences } = bundle;
  const [places, member] = await Promise.all([getPlaces(), getCurrentMember()]);
  const summary = summarize(experiences);
  const cities = [
    ...new Map(
      [...offers, ...contacts, ...experiences].map((x) => [x.place.id, x.place]),
    ).values(),
  ];

  return (
    <PageShell title={company.name} width="wide">
      <header className="-mt-4 mb-10 flex flex-wrap items-start gap-5 border-b border-border pb-8">
        <CompanyLogo company={company} size="xl" />

        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-text-muted">
            {INDUSTRY_LABELS[company.industry]}
            {company.headquarters ? ` · ${company.headquarters.city}` : ""}
          </p>
          {company.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
              {company.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-[13px]">
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
              >
                Site officiel
              </a>
            ) : null}
            {company.linkedinUrl ? (
              <a
                href={company.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
              >
                LinkedIn
              </a>
            ) : null}
            {cities.length > 0 ? (
              <span className="text-text-faint">
                {cities.map((c) => c.city).join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mb-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Metric value={offers.length} label="offres" />
        <Metric value={contacts.length} label="contacts" />
        <Metric value={experiences.length} label="expériences" />
        <Metric value={summary.members} label="membres CC" />
      </div>

      <section className="mb-12">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          Offres · {offers.length}
        </h2>
        {offers.length === 0 ? (
          <EmptyBlock>
            Aucune offre en ligne pour cette entreprise.{" "}
            <Link href="/contribute" className="text-accent underline-offset-2 hover:underline">
              En publier une
            </Link>
          </EmptyBlock>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="contacts" className="mb-12 scroll-mt-20">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          Contacts · {contacts.length}
        </h2>
        {contacts.length === 0 ? (
          <EmptyBlock>
            Personne du réseau n&apos;a encore de contact identifié ici.
          </EmptyBlock>
        ) : (
          <CompanyContacts
            contacts={contacts}
            currentMemberId={member?.id ?? null}
            companies={[company]}
            places={places}
          />
        )}
      </section>

      <section className="mb-12">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
          Expériences vécues · {experiences.length}
        </h2>
        {experiences.length === 0 ? (
          <EmptyBlock>
            Aucun membre n&apos;a encore partagé d&apos;expérience ici.
          </EmptyBlock>
        ) : (
          <CompanyExperiences entries={experiences} />
        )}
      </section>

      {summary.domains.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
            Domaines représentés
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {summary.domains.map(({ domain, count }) => (
              <li key={domain} className="flex items-center gap-2 text-[13px]">
                <DomainDot domain={domain} />
                <span className="text-text-muted">{DOMAIN_LABELS[domain]}</span>
                <span className="font-mono text-[11px] tabular-nums text-text-faint">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="border-t border-border pt-4 text-[12px] leading-relaxed text-text-faint">
        Les contacts listés sont des professionnels connus d&apos;un membre
        CConnect. Leur email et leur téléphone ne sont ni stockés ni affichés :
        la mise en relation passe par le membre qui les a ajoutés.{" "}
        <Link href="/network" className="underline underline-offset-2 hover:text-text">
          Retour à la carte
        </Link>
      </p>
    </PageShell>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-[13px] text-text-faint">
      {children}
    </p>
  );
}
