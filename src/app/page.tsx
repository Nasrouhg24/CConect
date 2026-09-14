import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { SiteFooter } from "@/components/PageShell";
import { getNetworkStats } from "@/lib/repository";

/**
 * Accueil.
 *
 * Version précédente : un titre en deux temps, un paragraphe de quatre
 * lignes, trois encarts de prose et trois « ce que CConnect ne fera jamais »
 * — soit près de deux cents mots avant le premier clic utile. Un étudiant qui
 * cherche un stage ne lit pas une page de présentation : il cherche une ville
 * et un nom.
 *
 * Ce qui reste : la promesse en une phrase, les deux actions, les chiffres.
 * Les règles de confidentialité gardent leur ancre (le pied de page y renvoie)
 * mais tiennent en trois lignes — le détail est dans docs/SECURITY.md, à sa
 * place, pour qui le cherche.
 */
export default async function HomePage() {
  const stats = await getNetworkStats();

  const figures = [
    { value: stats.companies, label: "entreprises" },
    { value: stats.cities, label: "villes" },
    { value: stats.contacts, label: "contacts" },
    { value: stats.experiences, label: "expériences" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="py-16 sm:py-20">
          <p className="mb-5 inline-flex items-center gap-2 text-label uppercase tracking-[0.12em] text-text-faint">
            <BrandMark className="h-3.5 w-3.5 text-accent" />
            College of Computing · UM6P
          </p>

          <h1 className="max-w-2xl text-hero font-medium tracking-tight text-text sm:text-hero-lg">
            Quelqu&apos;un de la promo y a déjà fait un stage.
          </h1>
          <p className="mt-4 max-w-md text-lead text-text-muted">
            Trouve qui, et parle-lui.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/network"
              className="rounded-sm bg-accent px-5 py-2.5 text-body font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Ouvrir la carte
            </Link>
            <Link
              href="/companies"
              className="rounded-sm border border-border px-5 py-2.5 text-body text-text transition-colors hover:border-border-strong hover:bg-surface"
            >
              Voir les entreprises
            </Link>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-8 sm:grid-cols-4">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dd className="font-mono text-metric-lg tabular-nums text-text">
                  {figure.value}
                </dd>
                <dt className="mt-1.5 text-label uppercase tracking-[0.08em] text-text-faint">
                  {figure.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Trois phrases, une par idée. Le titre porte l'information, la
            seconde ligne ne fait que la situer. */}
        <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
          <Panel title="Cherche une ville" body="La carte filtre par entreprise, domaine, promo." />
          <Panel title="Trouve un membre" body="C'est lui que tu contactes, pas l'inconnu." />
          <Panel title="Ajoute ce que tu sais" body="Un stage vécu, ou juste quelqu'un que tu connais." />
        </section>

        <section id="confidentialite" className="py-16">
          <h2 className="text-title-sm font-medium tracking-tight text-text">
            Ce qui n&apos;est jamais stocké
          </h2>
          <p className="mt-3 max-w-xl text-body text-text-muted">
            Aucun email ni téléphone d&apos;un contact externe : la colonne
            n&apos;existe pas en base. Accès réservé aux adresses UM6P.
          </p>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}

function Panel({ title, body }: { title: string; body: string }) {
  return (
    <article className="bg-base p-6">
      <h3 className="text-body font-medium text-text">{title}</h3>
      <p className="mt-1.5 text-list text-text-muted">{body}</p>
    </article>
  );
}
