import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { CareerTimeline } from "@/components/career/CareerTimeline";
import { ActionPlan } from "@/components/advisor/ActionPlan";
import type { ActionPlan as Plan } from "@/lib/advisor-actions";
import { plural, type AdvisorReport, type SkillSignal } from "@/lib/advisor";
import { DOMAIN_LABELS } from "@/lib/labels";
import { PROFILE_CAREER_HREF, personHref } from "@/lib/links";

/**
 * Tableau du conseiller.
 *
 * Une couche de navigation, pas un écran de plus : chaque bloc résume ce que
 * le réseau contient pour le profil, et chaque ligne mène à l'écran où on le
 * vérifie (carte filtrée, personnes, fiche entreprise, profil).
 *
 * Un bloc sans donnée ne s'invente pas de contenu : il disparaît, ou dit ce
 * qui manque et où le compléter.
 */
export function AdvisorDashboard({ report, plan }: { report: AdvisorReport; plan: Plan }) {
  const { objective, focus, missing, basis, companies, connections, skills, paths } =
    report;

  const focusLine = [
    focus.domain ? DOMAIN_LABELS[focus.domain] : null,
    focus.role,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-10">
      {/* ---- bandeau : où j'en suis ---- */}
      <dl className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
        <Fact label="Objectif actuel" value={objective.label} note={objective.context} strong />
        <Fact
          label="Focus"
          value={focusLine || "Non défini"}
          note={
            focus.countries.length > 0
              ? focus.countries.map((c) => c.name).join(" · ")
              : "Tous pays"
          }
          muted={!focusLine}
        />
        {/* Les deux chiffres renvoient à leur liste plus bas, calculée sur le même
            périmètre : un filtre de carte à un seul pays afficherait d'autres
            comptes dès que plusieurs pays sont visés. */}
        <Fact
          label="Entreprises à explorer"
          value={companies.total > 0 ? String(companies.total) : "Aucune"}
          note={companies.total > 0 ? "liées à ton périmètre" : "dans ton périmètre pour l'instant"}
          href={companies.leads.length > 0 ? "#advisor-companies" : undefined}
          muted={companies.total === 0}
        />
        <Fact
          label="Connexions UM6P"
          value={connections.people > 0 ? plural(connections.people, "personne") : "Aucune"}
          note={
            connections.currentInFocus > 0
              ? `${connections.currentInFocus} en poste${focus.domain ? ` en ${DOMAIN_LABELS[focus.domain]}` : ""}`
              : connections.alumni > 0
                ? `dont ${connections.alumni} alumni`
                : connections.people > 0
                  ? "pas encore d'alumni"
                  : "dans ton périmètre pour l'instant"
          }
          href={connections.people > 0 ? "#advisor-people" : undefined}
          muted={connections.people === 0}
        />
      </dl>

      <ActionPlan plan={plan} />

      {/* Le plan porte déjà une action de profil (ou l'accueil) : ce bloc ne
          réapparaît que si elle a été écartée par la limite de 5 actions. */}
      {missing.length > 0 && !plan.onboarding && !plan.actions.some((a) => a.category === "profile") ? (
        <section
          aria-labelledby="advisor-missing"
          className="rounded-sm border border-border border-l-2 border-l-warning bg-surface px-4 py-3.5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="advisor-missing" className="text-list font-medium text-text">
              Complète ton profil pour améliorer les recommandations
            </h2>
            <Link href={PROFILE_CAREER_HREF} className="text-meta text-accent underline-offset-2 hover:underline">
              Compléter →
            </Link>
          </div>
          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {missing.map((m) => (
              <li key={m.key} className="text-meta text-text-muted">
                <span className="text-text">{m.label}</span> — {m.why}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---- autour de mon parcours : ce qui existe, en appui du plan ---- */}
      <div className="grid gap-10 border-t border-border pt-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          {/* ---- entreprises ---- */}
          {companies.leads.length > 0 ? (
            <section aria-labelledby="advisor-companies">
              <SectionTitle
                id="advisor-companies"
                aside={
                  companies.total > companies.leads.length ? (
                    <Link href={companies.href} className="text-meta text-accent underline-offset-2 hover:underline">
                      Les {companies.total} sur la carte →
                    </Link>
                  ) : null
                }
              >
                Entreprises à explorer
              </SectionTitle>
              <ul className="divide-y divide-border border-y border-border">
                {companies.leads.map((lead) => (
                  <li key={lead.company.slug}>
                    <Link
                      href={lead.href}
                      className="group flex items-center gap-3 py-3 transition-colors hover:bg-surface-hover sm:-mx-2 sm:px-2"
                    >
                      <CompanyLogo company={lead.company} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-text group-hover:underline group-hover:underline-offset-2">
                          {lead.company.name}
                        </span>
                        <span className="block truncate text-meta text-text-faint">
                          {lead.reasons.join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ---- parcours ---- */}
          {paths.examples.length > 0 ? (
            <section aria-labelledby="advisor-paths">
              <SectionTitle id="advisor-paths">Parcours observés</SectionTitle>
              {paths.patterns.length > 0 ? (
                <ul className="mb-5 space-y-1.5">
                  {paths.patterns.slice(0, 3).map((pattern) => (
                    <li key={pattern.label} className="flex flex-wrap items-baseline gap-x-3 text-list">
                      <span className="font-mono text-text">{pattern.label}</span>
                      <span className="text-meta text-text-faint">
                        suivi par {plural(pattern.people.length, "membre")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-5 text-meta text-text-faint">
                  Aucun enchaînement n&apos;est encore partagé par deux personnes ou plus : ce
                  sont des parcours individuels, pas une tendance.
                </p>
              )}
              <ul className="grid gap-6 md:grid-cols-2">
                {paths.examples.map((path) => (
                  <li key={path.author.id} className="min-w-0">
                    <Link
                      href={personHref(path.author.id)}
                      className="mb-2 inline-block text-list font-medium text-text underline-offset-2 hover:underline"
                    >
                      {path.author.fullName}
                    </Link>
                    <CareerTimeline author={path.author} records={path.steps} compact />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-10">
          {/* ---- personnes ---- */}
          <section aria-labelledby="advisor-people">
            <SectionTitle id="advisor-people">Connexions les plus directes</SectionTitle>
            {connections.leads.length === 0 ? (
              <p className="text-list text-text-faint">
                Personne dans ce périmètre pour l&apos;instant.
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {connections.leads.map((lead) => (
                    <li key={lead.author.id}>
                      <Link
                        href={lead.href}
                        className="text-list font-medium text-text underline-offset-2 hover:underline"
                      >
                        {lead.author.fullName}
                      </Link>
                      <p className="text-meta text-text-muted">{lead.sentence}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta">
                  <Link href={connections.href} className="text-accent underline-offset-2 hover:underline">
                    Toutes les personnes →
                  </Link>
                  {connections.currentInFocus > 0 ? (
                    <Link href={connections.currentHref} className="text-accent underline-offset-2 hover:underline">
                      En poste →
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </section>

          {report.mentors.people.length > 0 ? (
            <section aria-labelledby="advisor-mentors">
              <SectionTitle id="advisor-mentors">Ouverts au mentorat</SectionTitle>
              <ul className="space-y-1">
                {report.mentors.people.map((a) => (
                  <li key={a.id}>
                    <Link href={personHref(a.id)} className="text-list text-text underline-offset-2 hover:underline">
                      {a.fullName}
                    </Link>
                    <span className="text-meta text-text-faint"> · Alumni {a.promotion}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ---- compétences ---- */}
          <section aria-labelledby="advisor-skills">
            <SectionTitle id="advisor-skills">Compétences fréquentes</SectionTitle>
            {skills.signals.length === 0 ? (
              <p className="text-list text-text-faint">
                {skills.recordsWithSkills === 0
                  ? "Aucune expérience de ce périmètre ne liste encore ses compétences."
                  : "Pas assez d'expériences pour dégager une compétence qui revient."}
              </p>
            ) : (
              <>
                <p className="mb-3 text-meta text-text-muted">
                  Elles reviennent dans les expériences que tu vises. C&apos;est une indication,
                  pas un prérequis.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {skills.signals.map((s) => (
                    <SkillChip key={s.label} signal={s} />
                  ))}
                </ul>
                <p className="mt-3 text-label text-text-faint">
                  {skills.profileHasSkills ? (
                    <>
                      <span className="text-accent">●</span> dans ton profil ·{" "}
                      <span>○</span> pas dans ton profil
                    </>
                  ) : (
                    <>
                      Ton profil ne liste pas de compétences : rien n&apos;est comparé.{" "}
                      <Link href={PROFILE_CAREER_HREF} className="text-accent underline-offset-2 hover:underline">
                        Les ajouter
                      </Link>
                    </>
                  )}
                </p>
              </>
            )}
          </section>

          <p className="border-t border-border pt-3 font-mono text-label leading-relaxed text-text-faint">
            Base : {plural(basis.records, "expérience")} du réseau · {basis.description}
            {objective.kind === "pfa" || objective.kind === "pfe"
              ? basis.objectiveRecords > 0
                ? ` · dont ${basis.objectiveRecords} ${objective.label}`
                : ` · dont aucun ${objective.label}`
              : ""}
            . Aucune donnée n&apos;est estimée ni complétée.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  note,
  href,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  note: string;
  href?: string;
  strong?: boolean;
  muted?: boolean;
}) {
  const body = (
    <>
      <dt className="text-label uppercase tracking-[0.08em] text-text-faint">{label}</dt>
      {/* Tronqué seulement sur quatre colonnes : sur mobile, le rôle et les pays
          visés passent à la ligne au lieu de disparaître. */}
      <dd className={`mt-1 break-words underline-offset-4 group-hover:underline lg:truncate ${strong ? "text-metric-sm font-medium" : "text-metric-sm"} ${muted ? "text-text-faint" : "text-text"}`}>
        {value}
      </dd>
      <dd className="break-words text-meta text-text-muted lg:truncate">{note}</dd>
    </>
  );
  const cell =
    "min-w-0 border-border px-0 py-4 odd:pr-4 even:border-l even:pl-4 lg:border-l lg:px-4 lg:first:border-l-0 lg:first:pl-0";
  return href ? (
    <div className={cell}>
      <Link href={href} className="group block">
        {body}
      </Link>
    </div>
  ) : (
    <div className={cell}>{body}</div>
  );
}

function SectionTitle({
  id,
  children,
  aside,
}: {
  id: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="scroll-mt-20 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
        {children}
      </h2>
      {aside}
    </div>
  );
}

function SkillChip({ signal }: { signal: SkillSignal }) {
  const tone =
    signal.status === "listed"
      ? "border-accent-border bg-accent-soft text-text"
      : signal.status === "not_listed"
        ? "border-border-strong bg-surface-raised text-text"
        : "border-border bg-surface text-text-muted";
  const mark = signal.status === "listed" ? "●" : signal.status === "not_listed" ? "○" : null;
  const title =
    signal.status === "listed"
      ? "Dans ton profil"
      : signal.status === "not_listed"
        ? "Pas dans ton profil"
        : "Profil sans compétences : non comparé";
  return (
    <li
      title={title}
      className={`inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 font-mono text-meta ${tone}`}
    >
      {mark ? (
        <span aria-hidden className={signal.status === "listed" ? "text-accent" : "text-text-faint"}>
          {mark}
        </span>
      ) : null}
      {signal.label}
      <span className="text-text-faint">{signal.count}</span>
      <span className="sr-only">
        {title}, cité {signal.count} fois
      </span>
    </li>
  );
}
