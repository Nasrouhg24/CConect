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
        <p className="text-[11px] uppercase tracking-[0.12em] text-text-faint">
          Entreprise
        </p>
        <h1 className="mt-2 text-[22px] font-medium tracking-tight text-text">
          Aucune fiche pour cette entreprise
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Elle n&apos;est pas encore dans le réseau, ou son nom a changé depuis
          que ce lien a été partagé. Les fiches sont créées par les membres :
          celle-ci attend quelqu&apos;un.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/companies/new"
            className="inline-flex h-9 items-center rounded-sm bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Créer la fiche
          </Link>
          <Link
            href="/companies"
            className="inline-flex h-9 items-center rounded-sm border border-border-strong bg-surface-raised px-4 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
          >
            Voir les entreprises existantes
          </Link>
        </div>

        <p className="mt-8 border-t border-border pt-4 text-[12px] leading-relaxed text-text-faint">
          Avant de créer, vérifie le nom dans la liste : « Microsoft » et
          « Microsoft France » doivent rester une seule fiche.
        </p>
      </div>
    </div>
  );
}
