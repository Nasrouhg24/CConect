import { companyInitials, monogramTint } from "@/lib/company-name";
import type { Company } from "@/lib/types";

const SIZES = {
  sm: { box: 28, text: 11, radius: 5 },
  md: { box: 40, text: 14, radius: 6 },
  lg: { box: 56, text: 19, radius: 8 },
  xl: { box: 72, text: 24, radius: 10 },
} as const;

/**
 * Identité visuelle d'une entreprise.
 *
 * Le logo distant n'est affiché que si `logo_url` est renseigné ET qu'un hôte
 * de logos est autorisé par la CSP (voir `next.config.ts`). Par défaut, on rend
 * un monogramme : pas de requête vers un tiers, aucune image cassée, et la même
 * pastille pour la même entreprise sur toutes les pages.
 */
export function CompanyLogo({
  company,
  size = "md",
}: {
  company: Pick<Company, "name" | "logoUrl">;
  size?: keyof typeof SIZES;
}) {
  const { box, text, radius } = SIZES[size];

  if (company.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- hôte externe non
      // connu à la compilation ; l'optimiseur d'images n'apporterait rien ici.
      <img
        src={company.logoUrl}
        alt=""
        width={box}
        height={box}
        loading="lazy"
        className="shrink-0 border border-border bg-surface object-contain"
        style={{ width: box, height: box, borderRadius: radius }}
      />
    );
  }

  const tint = monogramTint(company.name);

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center border border-border/80 font-semibold tracking-tight text-text"
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        fontSize: text,
        backgroundColor: tint,
      }}
    >
      {companyInitials(company.name)}
    </span>
  );
}
