import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { DomainDot, Metric } from "@/components/ui";
import { EmptyState } from "@/components/ui/feedback";
import { DOMAIN_LABELS, DOMAINS } from "@/lib/labels";
import { getNetworkStats } from "@/lib/repository";
import type { Domain } from "@/lib/types";

export const metadata = { title: "Couverture" };

/**
 * Couverture du réseau.
 *
 * Les *absences* d'abord, la densité ensuite : la question qu'un étudiant se
 * pose n'est pas « combien sommes-nous » mais « est-ce que quelqu'un couvre ce
 * qui m'intéresse ». Les classements restent en contexte, pas en sujet.
 *
 * Les titres portent l'information ; aucune section n'a de paragraphe
 * d'explication. Un écran de chiffres qu'il faut lire n'est pas un écran de
 * chiffres.
 */
export default async function StatsPage() {
  const stats = await getNetworkStats();

  const byDomain = new Map(stats.topDomains.map((d) => [d.key, d.count]));
  const domains = DOMAINS.map((domain) => ({
    domain,
    count: byDomain.get(domain) ?? 0,
  })).sort((a, b) => b.count - a.count || DOMAIN_LABELS[a.domain].localeCompare(DOMAIN_LABELS[b.domain]));

  const uncovered = domains.filter((d) => d.count === 0);
  const total = stats.experiences + stats.contacts;

  // Une année isolée ne dit rien ; l'écart avec la précédente, si.
  const years = stats.byYear;
  const latest = years.at(-1) ?? null;
  const previous = years.at(-2) ?? null;

  if (total === 0) {
    return (
      <PageShell title="Couverture">
        <EmptyState
          title="Rien à mesurer"
          body="La première contribution rend la carte utile."
          action={{ href: "/contribute", label: "Ajouter" }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Couverture"
      lead="Les manques d'abord : ce sont eux qui indiquent quoi ajouter."
    >
      <div className="grid grid-cols-2 gap-6 border-y border-border py-6 md:grid-cols-6">
        <Metric value={stats.countries} label="pays" />
        <Metric value={stats.cities} label="villes" />
        <Metric value={stats.companies} label="entreprises" />
        <Metric value={stats.experiences} label="expériences" />
        <Metric value={stats.contacts} label="contacts" />
        <Metric value={stats.members} label="membres" />
      </div>

      {/* ---------------------------------------------------------------- *
       * 1. Ce qui manque — la seule partie sur laquelle on peut agir.
       * ---------------------------------------------------------------- */}
      <section className="mt-12">
        <h2 className="text-section text-text">
          Domaines sans personne
        </h2>

        {uncovered.length === 0 ? (
          <p className="mt-4 border-l-2 border-accent/50 pl-4 text-list text-text-muted">
            Les neuf domaines sont couverts.
          </p>
        ) : (
          <ul className="mt-5 grid gap-px border-y border-border sm:grid-cols-2">
            {uncovered.map(({ domain }) => (
              <li
                key={domain}
                className="flex items-center gap-2.5 py-3 text-list"
              >
                <DomainDot domain={domain} />
                <span className="flex-1 text-text">{DOMAIN_LABELS[domain]}</span>
                <span className="text-meta text-text-faint">personne</span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/contribute"
          className="mt-5 inline-flex h-9 items-center rounded-sm bg-accent px-4 text-list font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Ajouter
        </Link>
      </section>

      {/* ---------------------------------------------------------------- *
       * 2. Ce qui est couvert — contexte pour juger, pas un palmarès.
       * ---------------------------------------------------------------- */}
      <section className="mt-14 border-t border-border pt-10">
        <h2 className="text-section text-text">Là où trouver quelqu&apos;un</h2>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Block title="Entreprises" empty="Aucune">
            <Bars rows={stats.topCompanies} />
          </Block>
          <Block title="Villes" empty="Aucune">
            <Bars rows={stats.topCities} />
          </Block>
        </div>
      </section>

      {/* ---------------------------------------------------------------- *
       * 3. Répartition complète — les zéros restent visibles.
       * ---------------------------------------------------------------- */}
      <section className="mt-14 border-t border-border pt-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Block title="Tous les domaines">
            <ul className="space-y-2.5">
              {domains.map(({ domain, count }) => (
                <li key={domain} className="flex items-center gap-2.5 text-list">
                  <DomainDot domain={domain as Domain} />
                  <span
                    className={`flex-1 ${count === 0 ? "text-text-faint" : "text-text-muted"}`}
                  >
                    {DOMAIN_LABELS[domain as Domain]}
                  </span>
                  <span
                    className={`font-mono text-meta tabular-nums ${
                      count === 0 ? "text-text-faint/60" : "text-text-faint"
                    }`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Par année" empty="Pas assez d'historique">
            {years.length > 0 ? (
              <>
                <YearChart rows={years} />
                {latest && previous ? (
                  <p className="mt-4 text-meta text-text-muted">
                    {`${latest.count} en ${latest.year}, ${previous.count} en ${previous.year}.`}
                  </p>
                ) : null}
              </>
            ) : null}
          </Block>
        </div>
      </section>
    </PageShell>
  );
}

function Block({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  const isEmpty =
    children === null ||
    children === undefined ||
    (Array.isArray(children) && children.length === 0);

  return (
    <section>
      <h3 className="mb-4 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h3>
      {isEmpty && empty ? (
        <p className="text-list text-text-faint">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  if (rows.length === 0) {
    return <p className="text-list text-text-faint">Rien.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-list">
            <span className="truncate text-text-muted">{row.label}</span>
            <span className="font-mono text-meta tabular-nums text-text-faint">
              {row.count}
            </span>
          </div>
          <div className="mt-1.5 h-1 bg-surface-raised">
            <div
              className="h-full bg-accent/55"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Histogramme par année.
 *
 * Les barres ne portent aucune information accessible ; la liste qui les
 * accompagne est donc la source de vérité pour un lecteur d'écran, et
 * l'histogramme n'est qu'une aide visuelle.
 */
function YearChart({ rows }: { rows: { year: number; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ol className="flex h-40 items-end gap-1.5" aria-label="Contributions par année">
      {rows.map((row) => (
        <li key={row.year} className="flex flex-1 flex-col items-center gap-2">
          <span className="font-mono text-micro tabular-nums text-text-faint">
            {row.count}
          </span>
          <div
            className="w-full bg-accent/45"
            style={{ height: `${Math.max(2, (row.count / max) * 100)}%` }}
          />
          <span className="font-mono text-micro tabular-nums text-text-faint">
            {row.year}
          </span>
          <span className="sr-only">
            {row.count} contribution{row.count > 1 ? "s" : ""} en {row.year}
          </span>
        </li>
      ))}
    </ol>
  );
}
