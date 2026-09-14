import Link from "next/link";

/**
 * Entreprise introuvable.
 *
 * Distinct du 404 général, parce que la situation l'est : arriver ici signifie
 * presque toujours que l'entreprise n'a pas encore de fiche — pas qu'on s'est
 * trompé de lien. La sortie utile n'est donc pas « retour à l'accueil », c'est
 * « crée la fiche », qui est précisément la contribution qui manque.
 */
export default function CompanyNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <p className="text-label uppercase tracking-[0.12em] text-text-faint">
          Entreprise
        </p>
        <h1 className="mt-2 text-title-sm font-medium tracking-tight text-text">
          Aucune fiche pour cette entreprise
        </h1>
        <p className="mt-3 text-body text-text-muted">
          Elle n&apos;est pas encore dans la bibliothèque.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/companies/new"
            className="inline-flex h-9 items-center rounded-sm bg-accent px-4 text-body font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Créer la fiche
          </Link>
          <Link
            href="/companies"
            className="inline-flex h-9 items-center rounded-sm border border-border-strong bg-surface-raised px-4 text-body font-medium text-text transition-colors hover:bg-surface-hover"
          >
            Parcourir
          </Link>
        </div>

        <p className="mt-8 border-t border-border pt-4 text-meta text-text-faint">
          Cherche d&apos;abord le nom : une entreprise = une seule fiche.
        </p>
      </div>
    </div>
  );
}
