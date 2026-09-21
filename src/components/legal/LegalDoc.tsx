import Link from "next/link";
import {
  LEGAL_CONTACT,
  LEGAL_PAGES,
  POLICY_UPDATED_LABEL,
  POLICY_VERSION,
} from "@/lib/legal";

/**
 * Typographie des pages légales.
 *
 * Un texte juridique se lit autrement qu'un écran de produit : on y cherche un
 * article précis, on n'y balaie pas une liste. D'où une mesure courte (65
 * caractères environ, `max-w-prose`), des titres d'article ancrés — un membre
 * peut envoyer le lien exact de la clause dont il parle — et le corps en
 * `text-body`, la même taille que partout ailleurs, plutôt qu'un petit corps
 * « mentions légales » que personne ne lit.
 *
 * Aucun de ces composants n'est générique : ils vivent ici parce que seules
 * les trois pages légales en ont besoin.
 */

export function LegalDoc({ children }: { children: React.ReactNode }) {
  return <div className="max-w-prose">{children}</div>;
}

/** Bandeau de version, en tête de document. */
export function LegalMeta({ lead }: { lead: string }) {
  return (
    <div className="mb-10 border-l-2 border-accent-border pl-4">
      <p className="text-body text-text-muted">{lead}</p>
      <p className="mt-2 font-mono text-meta text-text-faint">
        Version {POLICY_VERSION} · en vigueur depuis le {POLICY_UPDATED_LABEL}
      </p>
    </div>
  );
}

export function Article({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-20 border-t border-border pt-8 first:mt-0 first:border-0 first:pt-0">
      <h2 className="font-display text-section font-medium tracking-tight text-text">
        {title}
      </h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-text-muted">{children}</p>;
}

/** Mise en exergue d'une garantie : ce que le produit s'interdit de faire. */
export function Guarantee({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-sm border border-accent-border bg-accent-soft px-4 py-3 text-body text-text">
      {children}
    </p>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-body text-text-muted">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-border-strong" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tableau de registre (traitements, cookies).
 *
 * Il redevient une pile de fiches sous `sm` : un tableau de quatre colonnes
 * sur un téléphone se lit en le faisant défiler de côté, c'est-à-dire pas.
 * Les en-têtes de colonne restent dans le DOM pour le lecteur d'écran, et
 * réapparaissent en étiquette de champ sur petit écran.
 *
 * Sur grand écran il déborde la mesure du texte (`lg:-mr-32`) pour occuper
 * toute la colonne de la page : 65 caractères conviennent à un paragraphe,
 * pas à quatre colonnes qui s'y retrouveraient à trois mots par ligne. Le
 * débordement est borné par le conteneur de la page, jamais par la fenêtre.
 */
export function Register({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <div className="mt-1 overflow-hidden rounded-md border border-border lg:-mr-32">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="hidden sm:table-header-group">
          <tr className="border-b border-border bg-surface">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-3.5 py-2.5 text-label font-medium uppercase tracking-wide text-text-faint"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="block border-b border-border last:border-0 sm:table-row"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="block px-3.5 pb-2 pt-1 align-top text-body text-text-muted first:pt-3 last:pb-3 sm:table-cell sm:py-3 sm:first:pt-3 sm:last:pb-3"
                >
                  <span className="mb-0.5 block text-label uppercase tracking-wide text-text-faint sm:hidden">
                    {columns[j]}
                  </span>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Adresse de contact, ou avertissement si elle n'est pas configurée.
 *
 * Une politique qui promet un droit sans donner d'adresse pour l'exercer est
 * une politique fausse. Plutôt qu'un contact inventé, la page dit qu'il
 * manque — c'est visible, donc ça se corrige avant la mise en ligne.
 */
export function LegalContact() {
  if (!LEGAL_CONTACT) {
    return (
      <p className="rounded-sm border border-danger/40 bg-danger-soft px-4 py-3 text-body text-text">
        Adresse de contact non configurée&nbsp;: renseigne{" "}
        <code className="font-mono text-meta">NEXT_PUBLIC_LEGAL_CONTACT</code> avant la
        mise en ligne.
      </p>
    );
  }
  return (
    <p className="text-body text-text-muted">
      Écris à{" "}
      <a
        href={`mailto:${LEGAL_CONTACT}`}
        className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
      >
        {LEGAL_CONTACT}
      </a>
      .
    </p>
  );
}

/** Renvoi vers les deux autres documents, en pied de page légale. */
export function LegalNav({ current }: { current: string }) {
  const others = LEGAL_PAGES.filter((page) => page.href !== current);
  return (
    <nav
      aria-label="Autres documents"
      className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5"
    >
      {others.map((page) => (
        <Link
          key={page.href}
          href={page.href}
          className="text-body text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          {page.label}
        </Link>
      ))}
    </nav>
  );
}
