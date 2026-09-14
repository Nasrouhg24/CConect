import Link from "next/link";

/**
 * 404 de l'application.
 *
 * Une page introuvable vient presque toujours d'un lien partagé dans une
 * conversation, vers une fiche renommée ou supprimée. On propose donc les deux
 * façons de retrouver la même information — par la carte, ou par la
 * bibliothèque — plutôt qu'un « retour à l'accueil » qui oblige à recommencer
 * la recherche.
 */
export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <p className="font-mono text-label uppercase tracking-[0.12em] text-text-faint">
          404
        </p>
        <h1 className="mt-2 text-title-sm font-medium tracking-tight text-text">
          Cette page n&apos;existe pas
        </h1>
        <p className="mt-3 text-body text-text-muted">
          Le lien est peut-être ancien.
        </p>

        <nav aria-label="Reprendre la navigation" className="mt-7">
          <ul className="divide-y divide-border border-y border-border">
            {[
              {
                href: "/network",
                label: "Ouvrir la carte",
                hint: "Ville, entreprise, domaine",
              },
              {
                href: "/companies",
                label: "Entreprises",
                hint: "Toute la bibliothèque",
              },
              {
                href: "/contribute",
                label: "Ajouter",
                hint: "Un stage, un contact",
              },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="-mx-2 flex items-baseline justify-between gap-4 rounded-sm px-2 py-3 transition-colors hover:bg-surface-hover"
                >
                  <span className="text-body text-text">{item.label}</span>
                  <span className="shrink-0 text-meta text-text-faint">
                    {item.hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
