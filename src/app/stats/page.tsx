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
 * Cette page montrait six compteurs et quatre classements « les plus
 * représentés » : de quoi se féliciter, rien pour décider. Or la question
 * qu'un membre se pose n'est pas « combien sommes-nous », c'est « est-ce que
 * quelqu'un couvre ce qui m'intéresse, et sinon qu'est-ce que je peux
 * ajouter ». Ce sont les *absences* qui sont actionnables.
 *
 * L'écran est donc organisé en deux temps : ce qui manque d'abord, ce qui est
 * dense ensuite. Les classements restent — savoir que Casablanca concentre
 * dix contributions aide à juger si une onzième vaut le coup — mais ils ne
 * sont plus le sujet.
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
      <PageShell
        title="Couverture du réseau"
        lead="Où la promo est déjà présente, et où elle ne l'est pas encore."
      >
        <EmptyState
          title="Le réseau est vide"
          body="Rien à mesurer pour l'instant : la couverture se construit une contribution à la fois. La première entrée rend la carte utile pour tous les suivants."
          action={{ href: "/contribute", label: "Ajouter la première contribution" }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Couverture du réseau"
      lead="Où la promo est déjà présente, et où elle ne l'est pas encore. Les manques sont en haut : ce sont eux qui indiquent quoi ajouter."
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
        <h2 className="text-base font-medium text-text">Angles morts</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-text-muted">
          Un domaine sans aucune entrée, c&apos;est un étudiant qui cherchera
          sans rien trouver. Si tu connais quelqu&apos;un dans un de ces
          domaines — même sans y avoir travaillé — cette entrée vaut plus que
          la cinquantième chez une entreprise déjà couverte.
        </p>

        {uncovered.length === 0 ? (
          <p className="mt-5 border-l-2 border-accent/50 pl-4 text-[13px] leading-relaxed text-text-muted">
            Les neuf domaines ont au moins une contribution. Le prochain manque
            se lit plus bas, dans les domaines à une ou deux entrées.
          </p>
        ) : (
          <ul className="mt-5 grid gap-px border-y border-border sm:grid-cols-2">
            {uncovered.map(({ domain }) => (
              <li
                key={domain}
                className="flex items-center gap-2.5 py-3 text-[13px]"
              >
                <DomainDot domain={domain} />
                <span className="flex-1 text-text">{DOMAIN_LABELS[domain]}</span>
                <span className="text-[12px] text-text-faint">
                  personne pour l&apos;instant
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/contribute"
          className="mt-5 inline-flex h-9 items-center rounded-sm bg-accent px-4 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          Ajouter une contribution
        </Link>
      </section>

      {/* ---------------------------------------------------------------- *
       * 2. Ce qui est couvert — contexte pour juger, pas un palmarès.
       * ---------------------------------------------------------------- */}
      <section className="mt-14 border-t border-border pt-10">
        <h2 className="text-base font-medium text-text">Là où le réseau est dense</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-text-muted">
          Ces entreprises et ces villes sont déjà bien documentées : tu y
          trouveras quelqu&apos;un à qui parler.
        </p>

        <div className="mt-7 grid gap-10 lg:grid-cols-2">
          <Block title="Entreprises" empty="Aucune entreprise documentée">
            <Bars rows={stats.topCompanies} />
          </Block>
          <Block title="Villes" empty="Aucune ville documentée">
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
                <li key={domain} className="flex items-center gap-2.5 text-[13px]">
                  <DomainDot domain={domain as Domain} />
                  <span
                    className={`flex-1 ${count === 0 ? "text-text-faint" : "text-text-muted"}`}
                  >
                    {DOMAIN_LABELS[domain as Domain]}
                  </span>
                  <span
                    className={`font-mono text-[12px] tabular-nums ${
                      count === 0 ? "text-text-faint/60" : "text-text-faint"
                    }`}
                  >
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Par année" empty="Pas encore assez d'historique">
            {years.length > 0 ? (
              <>
                <YearChart rows={years} />
                {latest && previous ? (
                  <p className="mt-4 text-[12px] leading-relaxed text-text-muted">
                    {latest.count >= previous.count
                      ? `${latest.count} contribution${latest.count > 1 ? "s" : ""} pour ${latest.year}, contre ${previous.count} en ${previous.year}.`
                      : `${latest.count} contribution${latest.count > 1 ? "s" : ""} pour ${latest.year} — moins que les ${previous.count} de ${previous.year}. L'année en cours n'est pas terminée.`}
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
      <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h3>
      {isEmpty && empty ? (
        <p className="text-[13px] text-text-faint">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-text-faint">Rien à afficher.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-text-muted">{row.label}</span>
            <span className="font-mono text-[12px] tabular-nums text-text-faint">
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
          <span className="font-mono text-[10px] tabular-nums text-text-faint">
            {row.count}
          </span>
          <div
            className="w-full bg-accent/45"
            style={{ height: `${Math.max(2, (row.count / max) * 100)}%` }}
          />
          <span className="font-mono text-[10px] tabular-nums text-text-faint">
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
