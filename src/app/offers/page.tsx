import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { OfferCard } from "@/components/offers/OfferCard";
import { getJobOffers } from "@/lib/repository";

export const metadata = { title: "Offres" };

export default async function OffersPage() {
  const offers = await getJobOffers();
  const now = Date.now();
  const open = offers.filter(
    (o) => !o.expiresAt || new Date(o.expiresAt).getTime() >= now,
  );
  const closed = offers.filter(
    (o) => o.expiresAt && new Date(o.expiresAt).getTime() < now,
  );

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
        <div className="rounded-md border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-muted">Aucune offre pour l&apos;instant.</p>
          <p className="mt-1 text-[13px] text-text-faint">
            La première annonce publiée servira à toute la promo.
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {open.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} />
              </li>
            ))}
          </ul>

          {closed.length > 0 ? (
            <section className="mt-10">
              <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
                Offres expirées · {closed.length}
              </h2>
              <ul className="grid gap-3 opacity-60 md:grid-cols-2">
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
