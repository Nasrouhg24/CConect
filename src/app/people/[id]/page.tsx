import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { CareerTimeline } from "@/components/career/CareerTimeline";
import { ContactPersonButton } from "@/components/career/ContactPersonButton";
import { Metric } from "@/components/ui";
import {
  chronological,
  isInternship,
  describeConnection,
  isExperience,
} from "@/lib/career";
import { CAMPUS_LABELS, STATUS_LABELS, STUDY_YEAR_LABELS } from "@/lib/labels";
import { PROFILE_CAREER_HREF, companyHref, peopleHref } from "@/lib/links";
import {
  getCurrentMember,
  getEntriesByAuthor,
  getMemberById,
  getProfileSkills,
} from "@/lib/repository";

export async function generateMetadata({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const member = await getMemberById(decodeURIComponent(id));
  return { title: member?.fullName ?? "Personne" };
}

/**
 * Parcours d'un membre : sa frise complète, et les entreprises où il peut
 * ouvrir une porte. Tout vient de ce qu'il a lui-même publié.
 */
export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  const authorId = decodeURIComponent(id);
  const member = await getMemberById(authorId);
  if (!member) notFound();

  const [entries, skills, viewer] = await Promise.all([
    getEntriesByAuthor(authorId),
    getProfileSkills(authorId),
    getCurrentMember(),
  ]);

  const records = chronological(entries.filter(isExperience));
  const contacts = entries.filter((e) => e.entryKind === "contact");
  const companies = new Set(records.map((r) => r.company.slug)).size;
  const latest = records[records.length - 1] ?? null;
  const isSelf = viewer?.id === member.id;

  const lead = [
    `${STATUS_LABELS[member.status]} ${member.promotion}`,
    member.studyYear ? STUDY_YEAR_LABELS[member.studyYear] : null,
    `Campus ${CAMPUS_LABELS[member.campus]}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell
      title={member.fullName}
      lead={lead}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {member.linkedinUrl ? (
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-list text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              LinkedIn
            </a>
          ) : null}
          {isSelf ? (
            <Link href={PROFILE_CAREER_HREF} className="text-list text-accent underline-offset-2 hover:underline">
              Modifier mon parcours
            </Link>
          ) : latest ? (
            <ContactPersonButton entry={latest} label={`Contacter ${member.fullName.split(" ")[0]}`} />
          ) : null}
        </div>
      }
    >
      {latest ? (
        <p className="-mt-4 mb-8 max-w-2xl text-body text-text-muted">
          {describeConnection(member, records)}
        </p>
      ) : null}

      <div className="mb-10 grid grid-cols-2 gap-6 border-y border-border py-5 sm:grid-cols-4">
        <Metric value={records.length} label="expériences" />
        <Metric value={companies} label="entreprises" />
        <Metric value={records.filter(isInternship).length} label="stages" />
        <Metric value={contacts.length} label="contacts partagés" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section>
          <h2 className="mb-4 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
            Parcours
          </h2>
          {records.length === 0 ? (
            <p className="text-list text-text-faint">
              Aucune expérience partagée pour l&apos;instant.
            </p>
          ) : (
            <CareerTimeline author={member} records={records} />
          )}
        </section>

        <aside className="space-y-8">
          <section>
            <h2 className="mb-2.5 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
              Compétences
            </h2>
            {skills.length > 0 ? (
              <p className="font-mono text-meta leading-relaxed text-text-muted">
                {skills.join(" · ")}
              </p>
            ) : (
              <p className="text-list text-text-faint">Non renseignées.</p>
            )}
          </section>

          {member.status === "alumni" ? (
            <section>
              <h2 className="mb-2.5 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
                Mentorat
              </h2>
              <p className="text-list text-text-muted">
                {member.openToMentoring === true
                  ? "Accepte d'être sollicité·e pour du mentorat."
                  : member.openToMentoring === false
                    ? "N'est pas disponible pour du mentorat."
                    : "Non renseigné."}
              </p>
            </section>
          ) : null}

          {contacts.length > 0 ? (
            <section>
              <h2 className="mb-2.5 text-label font-medium uppercase tracking-[0.08em] text-text-faint">
                Peut mettre en relation chez
              </h2>
              <ul className="space-y-1">
                {[...new Map(contacts.map((c) => [c.company.slug, c.company])).values()].map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={companyHref(c.slug, "contacts")}
                      className="text-list text-text underline-offset-2 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Link
            href={peopleHref()}
            className="inline-block text-meta text-text-faint underline-offset-2 hover:text-text hover:underline"
          >
            ← Toutes les personnes
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}
