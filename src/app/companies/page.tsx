import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { summarize } from "@/lib/entries";
import { DOMAIN_LABELS } from "@/lib/labels";
import { getEntries } from "@/lib/repository";
import type { Entry } from "@/lib/types";

export const metadata = { title: "Entreprises" };

export default async function CompaniesPage() {
  const entries = await getEntries();

  const byCompany = new Map<string, Entry[]>();
  for (const entry of entries) {
    const list = byCompany.get(entry.company.slug);
    if (list) list.push(entry);
    else byCompany.set(entry.company.slug, [entry]);
  }

  const rows = [...byCompany.values()]
    .map((list) => ({ list, summary: summarize(list) }))
    .sort((a, b) => b.list.length - a.list.length);

  return (
    <PageShell
      title="Entreprises"
      lead="Chaque entreprise où la communauté a une expérience vécue ou un contact identifié."
    >
      <ul className="divide-y divide-border border-y border-border">
        {rows.map(({ list, summary }) => {
          const company = list[0].company;
          const cities = [...new Set(list.map((e) => e.place.city))];
          return (
            <li key={company.slug}>
              <Link
                href={`/companies/${company.slug}`}
                className="group flex items-center gap-6 px-2 py-4 transition-colors hover:bg-surface"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] text-text">{company.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-text-faint">
                    {cities.slice(0, 3).join(" · ")}
                    {cities.length > 3 ? ` +${cities.length - 3}` : ""}
                  </p>
                </div>

                <p className="hidden w-44 truncate text-[12px] text-text-muted sm:block">
                  {summary.domains
                    .slice(0, 2)
                    .map((d) => DOMAIN_LABELS[d.domain])
                    .join(", ")}
                </p>

                <div className="flex shrink-0 gap-5 font-mono text-[12px] tabular-nums text-text-muted">
                  <span title="Expériences">{summary.experiences} exp.</span>
                  <span title="Contacts">{summary.contacts} cont.</span>
                </div>

                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
