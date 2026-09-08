import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/ui/feedback";
import { INDUSTRY_LABELS } from "@/lib/labels";
import { getCompanies, getCompanyStats } from "@/lib/repository";

export const metadata = { title: "Entreprises" };

const NO_COUNTS = { offers: 0, contacts: 0, experiences: 0 };

/**
 * Annuaire des entreprises.
 *
 * C'était une grille de cartes : seize blocs identiques, chacun répétant sa
 * bordure et son fond pour porter trois nombres. Comparer deux entreprises
 * demandait de traverser la grille en zigzag, et les nombres ne s'alignaient
 * jamais.
 *
 * C'est une liste, parce que c'est ce que la donnée est : des lignes
 * comparables sur les mêmes trois colonnes. Les chiffres sont alignés à
 * droite en chasse fixe, l'œil descend une seule colonne, et les séparateurs
 * suffisent à distinguer les lignes — sans dessiner seize conteneurs.
 */
export default async function CompaniesPage() {
  // Les compteurs sont agrégés en base (vue `company_stats`).
  const [companies, stats] = await Promise.all([
    getCompanies(),
    getCompanyStats(),
  ]);

  const rows = companies
    .map((company) => ({
      company,
      ...(stats.get(company.slug) ?? NO_COUNTS),
    }))
    .sort(
      (a, b) =>
        b.offers + b.contacts + b.experiences -
          (a.offers + a.contacts + a.experiences) ||
        a.company.name.localeCompare(b.company.name),
    );

  return (
    <PageShell
      title="Entreprises"
      lead="Chaque entreprise est une fiche unique : ses offres, ses contacts et les expériences que la promo y a vécues sont regroupés au même endroit."
      actions={
        <Link
          href="/companies/new"
          className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-[13px] text-text transition-colors hover:border-border-strong hover:bg-surface"
        >
          Ajouter une entreprise
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title="Aucune entreprise dans le réseau"
          body="Les fiches sont créées par les membres, au moment où ils partagent une expérience ou un contact. La première fiche servira à toutes les contributions suivantes."
          action={{ href: "/companies/new", label: "Créer la première fiche" }}
        />
      ) : (
        <>
          <p className="mb-3 text-[12px] text-text-faint">
            {rows.length} entreprise{rows.length > 1 ? "s" : ""}, des mieux
            documentées aux plus récentes.
          </p>

          {/* En-tête de colonnes : desktop seulement. Sur mobile les chiffres
              sont étiquetés un par un, une ligne de titres serait illisible. */}
          <div
            aria-hidden
            className="hidden items-center gap-4 border-b border-border-strong pb-2 text-[11px] uppercase tracking-[0.08em] text-text-faint sm:flex"
          >
            <span className="w-9 shrink-0" />
            <span className="flex-1">Entreprise</span>
            <span className="w-16 text-right">Offres</span>
            <span className="w-16 text-right">Contacts</span>
            <span className="w-20 text-right">Expér.</span>
          </div>

          <ul className="border-b border-border">
            {rows.map(({ company, offers, contacts, experiences }) => (
              <li key={company.slug}>
                <Link
                  href={`/companies/${company.slug}`}
                  className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-sm border-b border-border px-2 py-3.5 transition-colors hover:bg-surface-hover sm:flex-nowrap"
                >
                  <CompanyLogo company={company} size="sm" />

                  <div className="min-w-0 flex-1 basis-[60%] sm:basis-auto">
                    <p className="truncate text-[14px] text-text">{company.name}</p>
                    <p className="truncate text-[12px] text-text-faint">
                      {INDUSTRY_LABELS[company.industry]}
                      {company.headquarters ? ` · ${company.headquarters.city}` : ""}
                    </p>
                  </div>

                  <Count value={offers} label="offres" highlight />
                  <Count value={contacts} label="contacts" />
                  <Count value={experiences} label="expériences" wide />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageShell>
  );
}

/**
 * Un compteur de la ligne.
 *
 * `highlight` n'est pas décoratif : seules les offres sont une information
 * périssable sur laquelle on peut agir aujourd'hui. Un zéro reste gris, pour
 * que la couleur signale une opportunité et non une colonne.
 */
function Count({
  value,
  label,
  highlight = false,
  wide = false,
}: {
  value: number;
  label: string;
  highlight?: boolean;
  wide?: boolean;
}) {
  return (
    <span
      className={`flex items-baseline gap-1.5 text-right sm:justify-end ${
        wide ? "sm:w-20" : "sm:w-16"
      }`}
    >
      <span
        className={`font-mono text-[13px] tabular-nums ${
          highlight && value > 0 ? "text-accent" : "text-text-muted"
        }`}
      >
        {value}
      </span>
      <span className="text-[11px] text-text-faint sm:hidden">{label}</span>
    </span>
  );
}
