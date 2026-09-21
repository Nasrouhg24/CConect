import Link from "next/link";
import { HomeMap } from "@/components/home/HomeMap";
import { JoinSection } from "@/components/home/JoinSection";
import { SiteFooter } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/button";
import { getCurrentMember, getPlaces } from "@/lib/repository";
import type { Place } from "@/lib/types";

const DESTINATIONS = [
  {
    href: "/network",
    title: "Carte",
    body: "Les villes, les entreprises et les personnes du réseau, là où elles sont.",
  },
  {
    href: "/companies",
    title: "Entreprises",
    body: "Chaque fiche réunit les contacts et les expériences d'une entreprise.",
  },
  {
    href: "/stats",
    title: "Couverture",
    body: "Les domaines où personne n'est encore passé.",
  },
] as const;

/**
 * Accueil — une page d'exploration, pas un tableau de bord.
 *
 * Trois temps, et pas un chiffre :
 *
 *   1. **Couverture** : la promesse, la recherche, et la carte comme image.
 *      La carte est ce que le produit *est* ; un décor abstrait ne disait
 *      rien qu'elle ne dise mieux.
 *   2. **Explorer** : les destinations, une ligne chacune.
 *   3. **Rejoindre** — ou, pour un membre déjà connecté, **contribuer** : la
 *      seule action qui fait grandir le réseau.
 *
 * Les lieux viennent de la table de référence, la plus légère de la base.
 * Si elle ne répond pas, l'accueil s'affiche quand même, carte sans points.
 */
export default async function HomePage() {
  const [member, places] = await Promise.all([
    getCurrentMember(),
    getPlaces().catch((): Place[] => []),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---- 1. Couverture ---------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-content items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pb-24 lg:pt-24">
        <div>
          <p className="flex items-center gap-2.5 font-mono text-label uppercase tracking-[0.14em] text-text-faint">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            CConnect · College of Computing
          </p>

          <h1 className="mt-6 text-hero font-medium leading-[1.06] tracking-[-0.025em] text-text sm:text-hero-lg">
            Quelqu&apos;un est déjà passé par là.
          </h1>

          <p className="mt-5 max-w-[32rem] text-lead text-text-muted">
            Retrouvez les étudiants et anciens du College of Computing qui
            sont passés par les entreprises que vous visez.
          </p>

          {/* Un vrai formulaire GET : il marche sans JavaScript, il est
              partageable en URL, et le bouton retour du navigateur le
              ramène. */}
          <form action="/network" method="get" role="search" className="mt-9 max-w-[30rem]">
            <label htmlFor="home-search" className="sr-only">
              Chercher une entreprise, une ville ou un domaine
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="home-search"
                type="search"
                name="q"
                autoComplete="off"
                placeholder="Entreprise, ville ou domaine…"
                className="h-11 w-full min-w-0 rounded-sm border border-border-strong bg-surface-raised px-4 text-body text-text placeholder:text-text-faint transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft sm:flex-1"
              />
              <button
                type="submit"
                className={buttonClass({ variant: "primary", size: "lg", className: "sm:px-6" })}
              >
                Explorer
              </button>
            </div>
          </form>
        </div>

        <HomeMap places={places} />
      </section>

      {/* ---- 2. Explorer ------------------------------------------------ */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-content px-4 py-14 sm:px-6 lg:py-20">
          <h2 className="font-mono text-label text-text-faint">explorer</h2>
          <nav aria-label="Explorer CConnect" className="rule-cols mt-6">
            {DESTINATIONS.map((item, i) => (
              <Link key={item.href} href={item.href} className="rule-col group block">
                <span className="font-mono text-label text-text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-2 block text-section font-medium text-text group-hover:text-accent group-hover:underline group-hover:underline-offset-4">
                  {item.title}
                </span>
                <span className="mt-1.5 block max-w-[22rem] text-list text-text-muted">
                  {item.body}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* ---- 3. Rejoindre / contribuer ----------------------------------- */}
      <JoinSection member={member} />

      <SiteFooter />
    </div>
  );
}
