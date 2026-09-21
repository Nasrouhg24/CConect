"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { describeDbError, reportDbError } from "@/lib/db-error";
import { demoStore } from "@/lib/demo-store";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import {
  getCompanies,
  getCurrentMember,
  isDemoMode,
  updateCareerProfile,
} from "@/lib/repository";
import { MAX_PROFILE_SKILLS, parseSkillList } from "@/lib/skills";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { careerProfileSchema } from "@/lib/validation";

const linkedinPattern = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i;

const profileSchema = z.object({
  linkedinUrl: z.union([
    z.string().trim().regex(linkedinPattern, "URL LinkedIn invalide"),
    z.literal(""),
  ]),
  contactEmail: z.union([z.string().trim().email(), z.literal("")]),
});

export interface ProfileResult {
  ok: boolean;
  message: string;
}

/**
 * Met à jour les canaux de contact du membre.
 *
 * Ce sont ses propres coordonnées, qu'il choisit d'exposer aux autres membres.
 * Rien à voir avec les contacts externes, dont aucune coordonnée n'est stockée.
 */
export async function updateContactChannels(
  _prev: ProfileResult | null,
  formData: FormData,
): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse({
    linkedinUrl: formData.get("linkedinUrl") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Vérifie les champs.",
    };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const linkedinUrl = parsed.data.linkedinUrl || null;
  const contactEmail = parsed.data.contactEmail || null;

  if (isDemoMode) {
    // En place : les contributions du store pointent vers ce même auteur.
    Object.assign(demoStore.currentMember, { linkedinUrl, contactEmail });
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ linkedin_url: linkedinUrl, contact_email: contactEmail })
      .eq("id", member.id);
    if (error) {
      reportDbError("profile.updateContactChannels", error);
      return { ok: false, message: describeDbError(error) };
    }
  }

  revalidatePath("/profile");
  revalidatePath("/network");
  return { ok: true, message: "Profil mis à jour." };
}

export interface CareerProfileResult extends ProfileResult {
  fieldErrors?: Record<string, string>;
}

/**
 * Année d'études, objectif et préférences : ce qui oriente le conseiller.
 *
 * Tout est facultatif sauf le statut. Un champ laissé vide efface la valeur :
 * le conseiller dira alors qu'il lui manque, plutôt que de garder une
 * préférence que le membre a retirée.
 */
export async function saveCareerProfile(
  _prev: CareerProfileResult | null,
  formData: FormData,
): Promise<CareerProfileResult> {
  const parsed = careerProfileSchema.safeParse({
    status: formData.get("status"),
    studyYear: formData.get("studyYear") ?? "",
    openToMentoring: formData.get("openToMentoring") ?? "",
    targetDomain: formData.get("targetDomain") ?? "",
    targetRole: formData.get("targetRole") ?? "",
    skills: formData.get("skills") ?? "",
    targetCountries: formData.getAll("targetCountries").map(String),
    targetCompanies: formData.getAll("targetCompanies").map(String),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    }
    return { ok: false, message: "Certains champs sont invalides.", fieldErrors };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée." };

  const limit = await enforceWriteQuota("profile", `profile:${member.id}`);
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit.retryAfterSeconds) };
  }

  const input = parsed.data;

  // Une entreprise visée doit exister : on ne crée pas de fiche depuis ici.
  const companies = await getCompanies();
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  const targetCompanyIds: string[] = [];
  for (const slug of new Set(input.targetCompanies)) {
    const company = bySlug.get(slug);
    if (!company) {
      return {
        ok: false,
        message: "Une entreprise visée n'existe plus.",
        fieldErrors: { targetCompanies: "Entreprise inconnue" },
      };
    }
    targetCompanyIds.push(company.id);
  }

  try {
    await updateCareerProfile(member, {
      status: input.status,
      studyYear: input.status === "student" && input.studyYear ? input.studyYear : null,
      openToMentoring:
        input.openToMentoring === "yes" ? true : input.openToMentoring === "no" ? false : null,
      targetDomain: input.targetDomain || null,
      targetRole: input.targetRole || null,
      skills: parseSkillList(input.skills ?? "", MAX_PROFILE_SKILLS) ?? [],
      targetCountries: [...new Set(input.targetCountries)],
      targetCompanyIds,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Enregistrement impossible.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/advisor");
  revalidatePath("/people");
  return { ok: true, message: "Parcours mis à jour." };
}
