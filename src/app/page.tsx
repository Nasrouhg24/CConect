import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { SiteFooter } from "@/components/PageShell";
import { computeStats } from "@/lib/entries";
import { getEntries } from "@/lib/repository";

export default async function HomePage() {
  const stats = computeStats(await getEntries());

  const figures = [
    { value: stats.countries, label: "pays" },
    { value: stats.cities, label: "villes" },
    { value: stats.companies, label: "entreprises" },
    { value: stats.experiences, label: "expériences" },
    { value: stats.contacts, label: "contacts" },
    { value: stats.members, label: "membres" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-text-faint">
              <BrandMark className="h-3.5 w-3.5 text-accent" />
              College of Computing · Rabat & Benguerir
            </p>
            <h1 className="max-w-xl text-[40px] font-medium leading-[1.1] tracking-tight text-text sm:text-[46px]">
              Le plus dur n&apos;est pas de trouver l&apos;entreprise.
              <span className="block text-text-muted">
                C&apos;est de trouver la bonne personne.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-text-muted">
              Quelqu&apos;un de la promo y a peut-être déjà fait un stage. Un
              alumni y travaille peut-être aujourd&apos;hui. Cette information
              existe — elle est éparpillée entre WhatsApp, LinkedIn et nos
              carnets d&apos;adresses. CConnect la rassemble sur une carte.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/network"
                className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Explorer la carte
              </Link>
              <Link
                href="/contribute"
                className="rounded-sm border border-border px-5 py-2.5 text-[13px] text-text transition-colors hover:border-border-strong hover:bg-surface"
              >
                Ajouter une contribution
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-x-6 gap-y-8 border-l border-border pl-8">
            {figures.map((figure) => (
              <div key={figure.label}>
                <dd className="font-mono text-[28px] tabular-nums leading-none text-text">
                  {figure.value}
                </dd>
                <dt className="mt-1.5 text-[11px] uppercase tracking-[0.08em] text-text-faint">
                  {figure.label}
                </dt>
              </div>
            ))}
          </dl>
        </section>

        <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-3">
          <Panel
            index="01"
            title="Une carte, pas un annuaire"
            body="Continent, pays, ville, entreprise, domaine, campus, promo, type de stage : chaque filtre redessine la carte."
          />
          <Panel
            index="02"
            title="Le contact passe par un membre"
            body="Sarah, Cybersecurity Recruiter chez Microsoft Paris, ajoutée par Ahmed. Tu ne contactes pas Sarah : tu contactes Ahmed, qui décide."
          />
          <Panel
            index="03"
            title="Pas besoin d'y avoir travaillé"
            body="« Je n'ai jamais bossé chez Google, mais je connais un Software Engineer à Berlin. » Cette phrase vaut une entrée."
          />
        </section>

        <section id="confidentialite" className="py-20">
          <h2 className="text-2xl font-medium tracking-tight text-text">
            Ce que CConnect ne fera jamais
          </h2>
          <ul className="mt-8 grid gap-8 md:grid-cols-3">
            <Rule
              title="Stocker un email ou un téléphone externe"
              body="Il n'existe aucune colonne pour ça dans la base. Ce qui n'existe pas dans le schéma ne peut pas fuiter."
            />
            <Rule
              title="Être ouvert au public"
              body="Accès réservé aux adresses UM6P, vérifié par la base elle-même, pas seulement par l'interface."
            />
            <Rule
              title="Garder une information contestée"
              body="Chaque contribution appartient à son auteur, peut être corrigée par lui et signalée par n'importe quel membre."
            />
          </ul>
        </section>
      </div>

      <SiteFooter />
    </div>
  );
}

function Panel({
  index,
  title,
  body,
}: {
  index: string;
  title: string;
  body: string;
}) {
  return (
    <article className="bg-base p-7">
      <p className="font-mono text-[11px] text-accent">{index}</p>
      <h3 className="mt-4 text-[15px] font-medium text-text">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{body}</p>
    </article>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <li>
      <p className="text-[14px] font-medium text-text">{title}</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{body}</p>
    </li>
  );
}
