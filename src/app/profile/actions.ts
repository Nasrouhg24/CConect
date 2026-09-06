"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { demoStore } from "@/lib/demo-store";
import { getCurrentMember, isDemoMode } from "@/lib/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    demoStore.currentMember = { ...member, linkedinUrl, contactEmail };
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ linkedin_url: linkedinUrl, contact_email: contactEmail })
      .eq("id", member.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/network");
  return { ok: true, message: "Profil mis à jour." };
}
