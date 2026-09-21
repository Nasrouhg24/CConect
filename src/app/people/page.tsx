import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { CareerTimeline } from "@/components/career/CareerTimeline";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/fields";
import {
  RELATION_FILTERS,
  RELATION_FILTER_LABELS,
  countConnections,
  describeConnection,
  findPeople,
} from "@/lib/career";
import { plural } from "@/lib/advisor";
import { DOMAINS, DOMAIN_LABELS, MEMBER_STATUSES, STATUS_LABELS } from "@/lib/labels";
import { peopleHref, peopleQueryFromParams, personHref } from "@/lib/links";
import { getCompanies, getCurrentMember, getEntries, getPlaces } from "@/lib/repository";

export const metadata = { title: "Personnes" };

/**
 * Annuaire des personnes, vu par leurs relations de carrière.
 *
 * Ce n'est pas une liste de profils : on y arrive avec une question (« qui
 * travaille en cybersécurité chez Orange ? ») et chaque résultat dit quelle
 * expérience y répond. Les filtres sont un simple formulaire GET — l'URL est
 * partageable, et c'est la même que celle que construit le conseiller.
 */
export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const query = peopleQueryFromParams(await searchParams);
  const [entries, companies, places, viewer] = await Promise.all([
    getEntries(),
    getCompanies(),
    getPlaces(),
    getCurrentMember(),
  ]);

  const people = findPeople(entries, query);
  // Le conseiller compte les autres ; l'annuaire t'inclut. On le dit, pour que
  // « 1 membre » là-bas et « 2 personnes » ici ne se contredisent pas.
  const includesViewer = Boolean(viewer && people.some((p) => p.author.id === viewer.id));
  const counts = countConnections(people.flatMap((p) => p.matches));
  const company = query.company ? companies.find((c) => c.slug === query.company) : null;
  const countries = [...new Map(places.map((p) => [p.countryCode, p.countryName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );
  const filtered = Object.values(query).some(Boolean);

  return (
    <PageShell
      title="Personnes"
      lead="Les membres du réseau, lus à travers leurs stages et leurs postes. Chaque résultat dit ce qui le relie à ta recherche."
    >
      <form
        method="get"
        action="/people"
        className="mb-8 grid gap-3 border-y border-border py-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end"
      >
        <Select label="Entreprise" name="company" value={query.company}>
          {companies.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select label="Domaine" name="domain" value={query.domain}>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {DOMAIN_LABELS[d]}
            </option>
          ))}
        </Select>
        <Select label="Relation" name="relation" value={query.relation}>
          {RELATION_FILTERS.map((r) => (
            <option key={r} value={r}>
              {RELATION_FILTER_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select label="Pays" name="country" value={query.country}>
          {countries.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </Select>
        <Select label="Statut" name="status" value={query.status}>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className={buttonClass({ variant: "primary", className: "flex-1 lg:flex-none" })}>
            Filtrer
          </button>
          {filtered ? (
            <Link href={peopleHref()} className={buttonClass({ variant: "ghost" })}>
              Effacer
            </Link>
          ) : null}
        </div>
      </form>

      {people.length > 0 ? (
        <p className="mb-4 font-mono text-meta tabular-nums text-text-faint">
          {people.length} personne{people.length > 1 ? "s" : ""}
          {includesViewer ? " (dont toi)" : ""}
          {company ? ` liée${people.length > 1 ? "s" : ""} à ${company.name}` : ""}
          {counts.current > 0 ? ` · ${counts.current} en poste` : ""}
          {counts.former > 0 ? ` · ${plural(counts.former, "ancien employé", "anciens employés")}` : ""}
          {counts.internships > 0 ? ` · ${counts.internships} passé${counts.internships > 1 ? "s" : ""} en stage` : ""}
        </p>
      ) : null}

      {people.length === 0 ? (
        <EmptyState
          title={filtered ? "Personne ne correspond" : "Aucun parcours partagé"}
          body={
            filtered
              ? "Aucune expérience du réseau ne réunit tous ces critères. Retire un filtre."
              : "Les personnes apparaissent dès qu'un membre partage une expérience."
          }
          action={
            filtered
              ? { href: peopleHref(), label: "Voir tout le réseau" }
              : { href: "/contribute", label: "Partager une expérience" }
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {people.map((person) => (
            <li key={person.author.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,16rem)_1fr]">
              <div className="min-w-0">
                <Link
                  href={personHref(person.author.id)}
                  className="text-body font-medium text-text underline-offset-2 hover:underline"
                >
                  {person.author.fullName}
                </Link>
                {person.author.id === viewer?.id ? (
                  <span className="ml-2 text-meta text-text-faint">C&apos;est toi</span>
                ) : null}
                <p className="mt-1 text-meta text-text-muted">
                  {describeConnection(person.author, person.matches)}
                </p>
                {person.author.openToMentoring ? (
                  <p className="mt-1.5 text-meta text-accent">Ouvert·e au mentorat</p>
                ) : null}
              </div>
              <CareerTimeline
                author={person.author}
                records={person.records}
                compact
                highlight={filtered ? new Set(person.matches.map((m) => m.id)) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function Select({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className={labelClass}>{label}</span>
      <select name={name} defaultValue={value ?? ""} className={`${inputClass} mt-1.5`}>
        <option value="">Tous</option>
        {children}
      </select>
    </label>
  );
}
