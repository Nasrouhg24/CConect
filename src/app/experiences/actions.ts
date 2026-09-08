"use server";

import { revalidatePath } from "next/cache";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import {
  deleteExperience,
  getCompanyById,
  getCurrentMember,
  updateExperience,
} from "@/lib/repository";
import {
  experienceInputSchema,
  findPrivateContactDetails,
} from "@/lib/validation";

export interface ExperienceMutationResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

function revalidateAll(companySlug?: string) {
  revalidatePath("/network");
  revalidatePath("/companies");
  revalidatePath("/stats");
  revalidatePath("/profile");
  revalidatePath("/");
  if (companySlug) revalidatePath(`/companies/${companySlug}`);
}

export async function editExperience(
  _prev: ExperienceMutationResult | null,
  formData: FormData,
): Promise<ExperienceMutationResult> {
  const id = String(formData.get("experienceId") ?? "");
  if (!id) return { ok: false, message: "Expérience manquante." };

  const parsed = experienceInputSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    entryKind: "experience",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, message: "Champs invalides.", fieldErrors };
  }

  const input = parsed.data;
  const leak = findPrivateContactDetails(input.summary ?? "");
  if (leak) {
    return {
      ok: false,
      message: `Retire ${leak} du texte : la plateforme ne publie aucune coordonnée privée.`,
      fieldErrors: { summary: `Contient ${leak}` },
    };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const limit = await enforceWriteQuota("experience", `experience:${member.id}`);
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

  try {
    await updateExperience(
      id,
      {
        companyId: company.id,
        placeId: input.placeId,
        domain: input.domain,
        kind: input.kind,
        year: input.year,
        title: input.title,
        summary: input.summary?.trim() || null,
      },
      member,
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Modification impossible.",
    };
  }

  revalidateAll(company.slug);
  return { ok: true, message: "Expérience mise à jour." };
}

export async function removeExperience(
  _prev: ExperienceMutationResult | null,
  formData: FormData,
): Promise<ExperienceMutationResult> {
  const id = String(formData.get("experienceId") ?? "");
  const slug = String(formData.get("companySlug") ?? "");
  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  try {
    await deleteExperience(id, member);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Suppression impossible.",
    };
  }

  revalidateAll(slug || undefined);
  return { ok: true, message: "Expérience supprimée." };
}
