import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ProfileChannels } from "@/components/ProfileChannels";
import { summarize } from "@/lib/entries";
import { CAMPUS_LABELS, STATUS_LABELS } from "@/lib/labels";
import { CareerProfileForm } from "@/components/career/CareerProfileForm";
import { objectiveFor } from "@/lib/advisor";
import {
  getCareerProfile,
  getCompanies,
  getCurrentMember,
  getEntriesByAuthor,
  getPlaces,
  getProfilePhotoVersion,
  isDemoMode,
} from "@/lib/repository";
import { ProfilePhoto } from "@/components/ProfilePhoto";
import { Metric } from "@/components/ui";
import { contactDisplayName } from "@/lib/types";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <PageShell title="Profil" width="narrow">
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <p className="text-body text-text-muted">
            Connecte-toi avec ton adresse UM6P.
          </p>
          <Link
            href="/login"
            className={buttonClass({ variant: "primary", className: "mt-4 text-list" })}
          >
            Se connecter
          </Link>
        </div>
      </PageShell>
    );
  }

  const [mine, career, companies, places, photoVersion] = await Promise.all([
    getEntriesByAuthor(member.id),
    getCareerProfile(member),
    getCompanies(),
    getPlaces(),
    getProfilePhotoVersion(member.id),
  ]);
  const summary = summarize(mine);
  const countries = [...new Map(places.map((p) => [p.countryCode, p.countryName])).entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const objective = objectiveFor(member);

  return (
    <PageShell
      title={member.fullName}
      lead={`${STATUS_LABELS[member.status]} ${member.promotion} · Campus ${CAMPUS_LABELS[member.campus]}${
        isDemoMode ? " · profil de démonstration" : ""
      }`}
      width="narrow"
    >
      <div className="-mt-2 mb-8">
        <ProfilePhoto member={{ id: member.id, fullName: member.fullName }} version={photoVersion} />
      </div>

      <div className="mb-10 grid grid-cols-3 gap-6 border-y border-border py-5">
        <Metric value={summary.experiences} label="expériences" />
        <Metric value={summary.contacts} label="contacts" />
        <Metric value={summary.companies.length} label="entreprises" />
      </div>

      <section id="parcours" className="mb-10 scroll-mt-20">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="mb-1 text-section text-text">Parcours et objectifs</h2>
            <p className="text-list text-text-muted">
              Objectif actuel :{" "}
              <span className="text-text">
                {objective.label}
              </span>{" "}
              <span className="text-text-faint">· {objective.context}</span>
            </p>
          </div>
          <Link href="/advisor" className="text-list text-accent underline-offset-2 hover:underline">
            Voir le conseiller →
          </Link>
        </div>
        <CareerProfileForm profile={career} countries={countries} companies={companies} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-section text-text">Comment on te joint</h2>
        <p className="mb-5 text-list text-text-muted">
          Renseigne au moins un canal.
        </p>
        <ProfileChannels member={member} />
      </section>

      <section id="contributions" className="scroll-mt-6">
        <h2 className="mb-3 text-section text-text">Mes contributions</h2>
        {mine.length === 0 ? (
          <p className="text-list text-text-faint">
            Rien pour l&apos;instant.{" "}
            <Link href="/contribute" className="text-accent underline-offset-2 hover:underline">
              Ajouter
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
                  <p className="truncate text-body text-text">
                    {entry.entryKind === "contact"
                      ? `${contactDisplayName(entry.contactFirstName ?? "", entry.contactLastName)} — ${entry.headline}`
                      : entry.headline}
                  </p>
                  <p className="text-meta text-text-faint">
                    {entry.company.name} · {entry.place.city}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-label tabular-nums text-text-faint">
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
