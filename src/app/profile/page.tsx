import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ProfileChannels } from "@/components/ProfileChannels";
import { summarize } from "@/lib/entries";
import { CAMPUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { getCurrentMember, getEntries, isDemoMode } from "@/lib/repository";
import { Metric } from "@/components/ui";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <PageShell title="Profil" width="narrow">
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-sm text-text-muted">
            Connecte-toi avec ton adresse UM6P pour voir ton profil.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-sm bg-accent px-4 py-2 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      </PageShell>
    );
  }

  const mine = (await getEntries()).filter((e) => e.author.id === member.id);
  const summary = summarize(mine);

  return (
    <PageShell
      title={member.fullName}
      lead={`${STATUS_LABELS[member.status]} ${member.promotion} · Campus ${CAMPUS_LABELS[member.campus]}${
        isDemoMode ? " · profil de démonstration" : ""
      }`}
      width="narrow"
    >
      <div className="mb-10 grid grid-cols-3 gap-6 border-y border-border py-5">
        <Metric value={summary.experiences} label="expériences" />
        <Metric value={summary.contacts} label="contacts partagés" />
        <Metric value={summary.companies.length} label="entreprises" />
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-base font-medium text-text">
          Comment les autres membres te joignent
        </h2>
        <p className="mb-5 text-[13px] leading-relaxed text-text-muted">
          Quand un étudiant tombe sur une de tes contributions, c&apos;est toi
          qu&apos;il contacte — jamais le professionnel externe. Renseigne au
          moins un canal pour que ce soit possible.
        </p>
        <ProfileChannels member={member} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-text">Mes contributions</h2>
        {mine.length === 0 ? (
          <p className="text-[13px] text-text-faint">
            Rien pour l&apos;instant.{" "}
            <Link href="/contribute" className="text-accent underline-offset-2 hover:underline">
              Ajouter une expérience ou un contact
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {mine.map((entry) => (
              <li
                key={`${entry.entryKind}-${entry.id}`}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-text">
                    {entry.entryKind === "contact"
                      ? `${entry.contactName} — ${entry.headline}`
                      : entry.headline}
                  </p>
                  <p className="text-[12px] text-text-faint">
                    {entry.company.name} · {entry.place.city}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-faint">
                  {entry.year}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
