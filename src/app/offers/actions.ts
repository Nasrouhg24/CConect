"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import {
  deleteJobOffer,
  getCompanyById,
  getCurrentMember,
  getJobOffer,
  updateJobOffer,
} from "@/lib/repository";
import {
  findPrivateContactDetails,
  offerInputSchema,
  parseTechnologies,
} from "@/lib/validation";

export interface OfferMutationResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

function revalidateOffer(companySlug: string, id: string) {
  revalidatePath("/offers");
  revalidatePath(`/offers/${id}`);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companySlug}`);
}

/**
 * Modification d'une offre.
 *
 * Comme pour les contacts, l'entreprise cible doit être une fiche existante :
 * corriger une annonce ne doit pas pouvoir créer une entreprise en double.
 */
export async function editOffer(
  _prev: OfferMutationResult | null,
  formData: FormData,
): Promise<OfferMutationResult> {
  const id = String(formData.get("offerId") ?? "");
  if (!id) return { ok: false, message: "Offre manquante." };

  const parsed = offerInputSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    entryKind: "offer",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, message: "Champs invalides.", fieldErrors };
  }

  const input = parsed.data;
  const leak = findPrivateContactDetails(input.description ?? "");
  if (leak) {
    return {
      ok: false,
      message: `Retire ${leak} de la description : la plateforme ne publie aucune coordonnée privée.`,
      fieldErrors: { description: `Contient ${leak}` },
    };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const limit = await enforceWriteQuota("offer", `offer:${member.id}`);
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };
  }

  if (!input.companyId) {
    return {
      ok: false,
      message: "Choisis une entreprise existante.",
      fieldErrors: { companyId: "Entreprise requise" },
    };
  }

  const company = await getCompanyById(input.companyId);
  if (!company) {
    return {
      ok: false,
      message: "Entreprise inconnue.",
      fieldErrors: { companyId: "Entreprise inconnue" },
    };
  }

  const previous = await getJobOffer(id);

  try {
    await updateJobOffer(
      id,
      {
        companyId: company.id,
        placeId: input.placeId,
        title: input.title,
        domain: input.domain,
        kind: input.kind,
        durationMonths:
          typeof input.durationMonths === "number" ? input.durationMonths : null,
        description: input.description?.trim() || null,
        technologies: parseTechnologies(input.technologies),
        url: input.url?.trim() || null,
      },
      member,
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Modification impossible.",
    };
  }

  revalidateOffer(company.slug, id);
  if (previous && previous.company.slug !== company.slug) {
    revalidatePath(`/companies/${previous.company.slug}`);
  }

  return { ok: true, message: "Offre mise à jour." };
}

export async function removeOffer(
  _prev: OfferMutationResult | null,
  formData: FormData,
): Promise<OfferMutationResult> {
  const id = String(formData.get("offerId") ?? "");
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const existing = await getJobOffer(id);

  try {
    await deleteJobOffer(id, member);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Suppression impossible.",
    };
  }

  if (existing) revalidateOffer(existing.company.slug, id);
  // L'offre n'existe plus : rester sur sa page afficherait un 404.
  redirect("/offers");
}
