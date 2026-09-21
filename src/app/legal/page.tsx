import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { POLICY_UPDATED_LABEL, POLICY_VERSION } from "@/lib/legal";

export const metadata = {
  title: "Informations légales",
  description:
    "Confidentialité, cookies et conditions d'utilisation de CConnect.",
};

const DOCUMENTS = [
  {
    href: "/legal/confidentialite",
    label: "Politique de confidentialité",
    lead: "Quelles données sont traitées, par qui, combien de temps, et comment exercer ses droits.",
  },
  {
    href: "/legal/cookies",
    label: "Politique de cookies",
    lead: "Trois cookies, tous strictement nécessaires. Aucun traceur, aucun tiers.",
  },
  {
    href: "/legal/conditions",
    label: "Conditions d'utilisation",
    lead: "Qui peut rejoindre le réseau, ce qu'on peut y publier, et ce qui fait perdre l'accès.",
  },
] as const;

export default function LegalIndexPage() {
  return (
    <PageShell
      title="Informations légales"
      lead={`Version ${POLICY_VERSION}, en vigueur depuis le ${POLICY_UPDATED_LABEL}.`}
      width="narrow"
    >
      <ul className="grid max-w-prose gap-3">
        {DOCUMENTS.map((document) => (
          <li key={document.href}>
            <Link
              href={document.href}
              className="block rounded-md border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover"
            >
              <span className="text-section font-medium text-text">
                {document.label}
              </span>
              <span className="mt-1 block text-body text-text-muted">
                {document.lead}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
