import Link from "next/link";
import { LEGAL_PAGES } from "@/lib/legal";

/**
 * Conteneur des pages de contenu (tout sauf la carte).
 *
 * Centralise la largeur, le rythme vertical et le pied de page.
 *
 * **Une seule colonne pour tout le site** (`--container-content`, 76 rem), la
 * même que l'en-tête et le pied de page : le titre d'une page se cale donc
 * toujours sous la marque, d'un écran à l'autre. C'est la colonne qui est
 * commune, jamais la mesure du contenu.
 *
 * `width="narrow"` ne rétrécit plus la colonne — il rétrécit **le contenu**
 * (`--container-form`, 48 rem) pour les écrans de saisie, où une ligne de champ
 * trop longue se remplit mal. Rétrécir la colonne entière désalignait le titre
 * et recréait, sur un grand écran, le vide à droite qu'on vient de supprimer.
 */
export function PageShell({
  title,
  lead,
  actions,
  children,
  width = "wide",
}: {
  title: string;
  lead?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-title font-medium tracking-tight text-text">
              {title}
            </h1>
            {lead ? (
              <p className="mt-1.5 max-w-2xl text-body text-text-muted">
                {lead}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
        <div className={width === "narrow" ? "max-w-form" : undefined}>
          {children}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

/**
 * Conteneur des parcours pas à pas (création de profil, contribution).
 *
 * Pas de titre de page : chaque étape porte le sien. Une colonne centrée à la
 * mesure d'un champ, et du blanc autour — un parcours n'est pas un document.
 */
export function FlowShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[32rem] px-4 py-12 sm:px-6 sm:py-20">
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

/**
 * Le lien « Confidentialité » pointait autrefois sur `/#confidentialite`, une
 * ancre de l'accueil qui avait disparu avec la refonte du hero ; il avait été
 * retiré faute de destination. Les trois documents existent maintenant pour de
 * bon (`src/app/legal/`), et le pied de page est le seul endroit où un visiteur
 * s'attend à les trouver — il les porte donc sur toutes les pages de contenu.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-5 text-meta text-text-faint sm:px-6">
        <p>CConnect · College of Computing, UM6P</p>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="rounded-xs transition-colors duration-150 hover:text-text"
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
