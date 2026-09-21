import Link from "next/link";
import { JoinSection } from "@/components/home/JoinSection";
import { NetworkPreview } from "@/components/home/NetworkPreview";
import { SiteFooter } from "@/components/PageShell";
import { buttonClass } from "@/components/ui/button";
import { pickNetworkSample } from "@/lib/entries";
import { getCurrentMember, getEntries } from "@/lib/repository";

export const metadata = { title: "Couverture" };

const DOORS = [
  {
    href: "/network",
    title: "Carte",
    body: "Les villes, les entreprises et les membres, là où ils sont.",
  },
  {
    href: "/network",
    title: "Personnes",
    body: "Cherche un étudiant ou un alumni par son nom, depuis la carte.",
  },
  {
    href: "/companies",
    title: "Entreprises",
    body: "Chaque fiche réunit ses contacts et les expériences qui y ont été vécues.",
  },
] as const;

/**
 * Couverture — comprendre CConnect.
 *
 * La carte a sa page ; celle-ci ne la répète pas. Elle dit ce que CConnect
 * relie, puis où aller :
 *
 *   1. **Ce que CConnect relie** : une phrase, un geste vers la carte, et un
 *      aperçu dessiné — quatre éléments réels autour de la marque.
 *   2. **Trois portes** vers l'application, en lignes d'index.
 *   3. **Rejoindre**, ou contribuer pour un membre déjà connecté.
 *
 * Aucun chiffre. `getNetworkStats()` et `network_stats()` restent en place
 * côté données ; cette page ne s'en sert plus.
 */
export default async function CoveragePage() {
  const [entries, member] = await Promise.all([getEntries(), getCurrentMember()]);
  const sample = pickNetworkSample(entries);

  return (
    <div className="flex flex-1 flex-col">
      {/* ---- 1. Ce que CConnect relie ------------------------------------ */}
      <section className="mx-auto grid w-full max-w-content items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pb-24">
        <div>
          <p className="flex items-center gap-2.5 font-mono text-label uppercase tracking-[0.14em] text-text-faint">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            Couverture
          </p>
          <h1 className="mt-5 font-display text-title font-medium tracking-tight text-text">
            Des personnes, des entreprises, reliées.
          </h1>
          <p className="mt-2 max-w-[30rem] text-body text-text-muted">
            CConnect relie les étudiants et alumni du College of Computing aux
            entreprises où ils sont passés, et aux villes où elles se trouvent.
          </p>
          <Link
            href="/network"
            className={buttonClass({ variant: "primary", size: "lg", className: "mt-8" })}
          >
            Explorer le réseau
          </Link>
        </div>

        <NetworkPreview sample={sample} />
      </section>

      {/* ---- 2. Les portes ------------------------------------------------ */}
      <section className="border-t border-border">
        <div className="mx-auto grid w-full max-w-content gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20">
          <h2 className="font-mono text-label text-text-faint">explorer</h2>
          <nav aria-label="Explorer CConnect">
            <ul className="border-t border-border">
              {DOORS.map((door) => (
                <li key={door.title} className="border-b border-border">
                  <Link
                    href={door.href}
                    className="group -mx-3 flex items-baseline gap-4 rounded-sm px-3 py-5 transition-colors duration-150 hover:bg-surface sm:gap-8"
                  >
                    <span className="w-28 shrink-0 text-section font-medium text-text group-hover:text-accent">
                      {door.title}
                    </span>
                    <span className="min-w-0 flex-1 text-list text-text-muted">
                      {door.body}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-list text-text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* ---- 3. Rejoindre / contribuer ----------------------------------- */}
      <JoinSection member={member} />

      <SiteFooter />
    </div>
  );
}
