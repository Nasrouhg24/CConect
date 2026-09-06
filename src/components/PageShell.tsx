import Link from "next/link";

/**
 * Conteneur des pages de contenu (tout sauf la carte).
 * Centralise la largeur, le rythme vertical et le pied de page, pour que la
 * hiérarchie typographique soit la même d'un écran à l'autre.
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
      <div
        className={`mx-auto w-full px-4 py-10 sm:px-6 ${
          width === "narrow" ? "max-w-3xl" : "max-w-6xl"
        }`}
      >
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-medium tracking-tight text-text">
              {title}
            </h1>
            {lead ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-muted">
                {lead}
              </p>
            ) : null}
          </div>
          {actions}
        </header>
        {children}
      </div>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[12px] text-text-faint sm:px-6">
        <p>CConnect · College of Computing Career Network — UM6P</p>
        <p>
          Aucune coordonnée privée de contact externe n&apos;est stockée.{" "}
          <Link href="/#confidentialite" className="underline underline-offset-2 hover:text-text">
            Pourquoi
          </Link>
        </p>
      </div>
    </footer>
  );
}
