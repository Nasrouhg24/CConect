import { PageShell } from "@/components/PageShell";
import { DomainDot, Metric } from "@/components/ui";
import { computeStats } from "@/lib/entries";
import { DOMAIN_LABELS } from "@/lib/labels";
import { getEntries } from "@/lib/repository";
import type { Domain } from "@/lib/types";

export const metadata = { title: "Statistiques" };

export default async function StatsPage() {
  const stats = computeStats(await getEntries());
  const maxYear = Math.max(1, ...stats.byYear.map((y) => y.count));

  return (
    <PageShell
      title="Ce que le réseau couvre"
      lead="Ces chiffres n'ont d'intérêt que s'ils augmentent : chaque contribution élargit ce que la promo suivante trouvera ici."
    >
      <div className="grid grid-cols-2 gap-6 border-y border-border py-6 md:grid-cols-6">
        <Metric value={stats.countries} label="pays" />
        <Metric value={stats.cities} label="villes" />
        <Metric value={stats.companies} label="entreprises" />
        <Metric value={stats.experiences} label="expériences" />
        <Metric value={stats.contacts} label="contacts" />
        <Metric value={stats.members} label="membres" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <Block title="Entreprises les plus représentées">
          <Bars rows={stats.topCompanies} />
        </Block>
        <Block title="Villes les plus représentées">
          <Bars rows={stats.topCities} />
        </Block>

        <Block title="Domaines">
          <ul className="space-y-2.5">
            {stats.topDomains.map((d) => (
              <li key={d.key} className="flex items-center gap-2.5 text-[13px]">
                <DomainDot domain={d.key as Domain} />
                <span className="flex-1 text-text-muted">
                  {DOMAIN_LABELS[d.key as Domain]}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-text-faint">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Par année">
          <ul className="flex h-44 items-end gap-1.5">
            {stats.byYear.map((y) => (
              <li key={y.year} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-[10px] tabular-nums text-text-faint">
                  {y.count}
                </span>
                <div
                  className="w-full bg-accent/45"
                  style={{ height: `${(y.count / maxYear) * 100}%` }}
                />
                <span className="font-mono text-[10px] tabular-nums text-text-faint">
                  {y.year}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </PageShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; count: number }[] }) {
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
