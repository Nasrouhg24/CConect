import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { OfferCard } from "@/components/offers/OfferCard";
import { EmptyState } from "@/components/ui/feedback";
import { splitByExpiry } from "@/lib/offers";
import { getJobOffers } from "@/lib/repository";

export const metadata = { title: "Offres" };

export default async function OffersPage() {
  const offers = await getJobOffers();
  const { open, expired: closed } = splitByExpiry(offers);

  return (
    <PageShell
      title="Offres"
      lead="Les annonces partagées par la communauté. Chacune est rattachée à une fiche entreprise : un clic sur le nom mène aux expériences et aux contacts qu'on y a déjà."
      actions={
        <Link
          href="/contribute"
          className="rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Publier une offre
        </Link>
      }
    >
      {offers.length === 0 ? (
        <EmptyState
          title="Aucune offre ouverte"
          body="Les annonces viennent des membres : une entreprise qui recrute, un stage repéré, une candidature spontanée qui a fonctionné. La première publiée servira à toute la promo."
          action={{ href: "/contribute", label: "Publier une offre" }}
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {open.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </ul>

          {open.length === 0 ? (
            <EmptyState
              compact
              title="Aucune offre encore ouverte"
              body="Toutes les annonces publiées ont expiré. Elles restent consultables plus bas : une offre passée indique quand même une entreprise qui recrute des profils comme les nôtres."
              action={{ href: "/contribute", label: "Publier une offre" }}
            />
          ) : null}

          {closed.length > 0 ? (
            <section className="mt-12 border-t border-border pt-8">
              <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
                Offres expirées · {closed.length}
              </h2>
              <p className="mb-4 max-w-2xl text-[12px] leading-relaxed text-text-faint">
                Gardées volontairement : la date est passée, mais l&apos;entreprise
                et la personne qui l&apos;a publiée restent des pistes.
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {closed.map((offer) => (
                  <li key={offer.id}>
                    <OfferCard offer={offer} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
