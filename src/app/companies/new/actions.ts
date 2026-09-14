"use server";

import { revalidatePath } from "next/cache";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import { normalizeCompanyName } from "@/lib/company-name";
import {
  findOrCreateCompany,
  getCompanyByNormalizedName,
  getCurrentMember,
} from "@/lib/repository";
import { companyProfileSchema } from "@/lib/validation";

export interface CompanyFormResult {
  ok: boolean;
  message: string;
  slug?: string;
  /** Vrai quand on a rattaché la saisie à une fiche déjà existante. */
  merged?: boolean;
  fieldErrors?: Record<string, string>;
}

/**
 * Création d'une fiche entreprise.
 *
 * Si le nom se réduit au même nom canonique qu'une fiche existante, on renvoie
 * cette fiche au lieu d'en créer une seconde : c'est la règle anti-doublons,
 * appliquée ici et redoublée par un index unique en base.
 */
export async function createCompanyProfile(
  _prev: CompanyFormResult | null,
  formData: FormData,
): Promise<CompanyFormResult> {
  const parsed = companyProfileSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, message: "Vérifie les champs signalés.", fieldErrors };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const limit = await enforceWriteQuota("company", `company:${member.id}`);
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };
  }

  const input = parsed.data;
  const canonical = normalizeCompanyName(input.name);
  const existing = await getCompanyByNormalizedName(canonical);

  if (existing) {
    return {
      ok: true,
      merged: true,
      slug: existing.slug,
      message: `${existing.name} existe déjà — sa fiche est ouverte.`,
    };
  }

  try {
    const { company } = await findOrCreateCompany(
      {
        name: input.name,
        industry: input.industry,
        website: input.website?.trim() || null,
        linkedinUrl: input.linkedinUrl?.trim() || null,
        logoUrl: input.logoUrl?.trim() || null,
        description: input.description?.trim() || null,
        headquartersId: input.headquartersId?.trim() || null,
      },
      member.id,
    );

    revalidatePath("/companies");
    revalidatePath(`/companies/${company.slug}`);
    revalidatePath("/contribute");

    return {
      ok: true,
      slug: company.slug,
      message: `${company.name} ajoutée.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Création impossible.",
    };
  }
}
