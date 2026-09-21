import Link from "next/link";
import {
  compareStrength,
  countConnections,
  describeConnection,
  groupPeople,
  strongestRelation,
  type ConnectionCounts,
  type RelationFilter,
} from "@/lib/career";
import { DOMAIN_LABELS } from "@/lib/labels";
import { peopleHref, personHref } from "@/lib/links";
import type { Company, Domain, Entry } from "@/lib/types";

/**
 * Connexions UM6P d'une entreprise.
 *
 * Des personnes, pas des lignes : « 3 en poste » veut dire trois membres
 * distincts. Une ligne à zéro n'est pas affichée — « 0 ancien employé » ne dit
 * rien d'utile et ressemble à une donnée. Chaque chiffre ouvre les personnes
 * qui le composent.
 *
 * Le bloc par domaine suit le domaine visé par le lecteur quand il l'a
 * renseigné ; sinon il n'apparaît pas — on ne devine pas ce qui l'intéresse.
 */
export function CompanyConnections({
  company,
  experiences,
  focusDomain,
}: {
  company: Company;
  experiences: Entry[];
  focusDomain: Domain | null;
}) {
  const counts = countConnections(experiences);
  if (counts.people === 0) return null;

  const rows = connectionRows(counts, company.slug, null);
  const inDomain = focusDomain ? experiences.filter((e) => e.domain === focusDomain) : [];
  const domainCounts = countConnections(inDomain);
  const domainRows = focusDomain ? connectionRows(domainCounts, company.slug, focusDomain) : [];

  const strongest = groupPeople(experiences)
    .map((p) => ({ ...p, strength: strongestRelation(p.records) }))
    .sort((a, b) => compareStrength(a.strength, b.strength))
    .slice(0, 3);

  return (
    <section id="connexions" className="mb-12 scroll-mt-20">
      <h2 className="mb-3 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
        Connexions UM6P
      </h2>

      <div className="grid gap-8 border-y border-border py-5 md:grid-cols-2">
        <div>
          <FactList rows={rows} />
          {counts.employmentUnknown > 0 ? (
            <p className="mt-3 text-meta text-text-faint">
              Statut d&apos;emploi non renseigné pour {counts.employmentUnknown}{" "}
              personne{counts.employmentUnknown > 1 ? "s" : ""} : ni en poste, ni ancien,
              tant qu&apos;elles ne l&apos;ont pas indiqué.
            </p>
          ) : null}
        </div>

        <div>
          {focusDomain ? (
            <>
              <p className="mb-2 text-list text-text">
                En {DOMAIN_LABELS[focusDomain]}{" "}
                <span className="text-text-faint">— ton domaine visé</span>
              </p>
              {domainRows.length > 0 ? (
                <FactList rows={domainRows} />
              ) : (
                <p className="text-list text-text-faint">
                  Aucune relation dans ce domaine ici pour l&apos;instant.
                </p>
              )}
            </>
          ) : null}

          <p className={`${focusDomain ? "mt-5" : ""} mb-2 text-list text-text`}>
            Liens les plus directs
          </p>
          <ul className="space-y-2">
            {strongest.map((p) => (
              <li key={p.author.id} className="text-list">
                <Link
                  href={personHref(p.author.id)}
                  className="font-medium text-text underline-offset-2 hover:underline"
                >
                  {p.author.fullName}
                </Link>
                <span className="block text-meta text-text-faint">
                  {describeConnection(p.author, p.records)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

interface Row {
  label: string;
  count: number;
  href: string;
}

function connectionRows(counts: ConnectionCounts, company: string, domain: Domain | null): Row[] {
  const link = (relation: RelationFilter | null, alumniOnly = false) =>
    peopleHref({ company, domain, relation, status: alumniOnly ? "alumni" : null });
  return [
    { label: "membres liés à l'entreprise", count: counts.people, href: link(null) },
    { label: "alumni", count: counts.alumni, href: link(null, true) },
    { label: "en poste actuellement", count: counts.current, href: link("current") },
    { label: "ont travaillé ici", count: counts.former, href: link("former") },
    { label: "y ont fait un stage", count: counts.internships, href: link("internship") },
    { label: "en PFA", count: counts.pfa, href: link("pfa") },
    { label: "en PFE", count: counts.pfe, href: link("pfe") },
  ].filter((row) => row.count > 0);
}

function FactList({ rows }: { rows: Row[] }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.label}>
          <Link
            href={row.href}
            className="group flex items-baseline gap-3 text-list text-text-muted"
          >
            <span className="w-8 shrink-0 text-right font-mono tabular-nums text-text">
              {row.count}
            </span>
            <span className="underline-offset-2 group-hover:text-text group-hover:underline">
              {row.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
