"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campusSchema } from "@/lib/validation";

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  campus: campusSchema,
  status: z.enum(["student", "alumni"]),
  promotion: z.coerce.number().int().min(2010).max(2100),
  program: z.string().trim().max(120).optional(),
  linkedinUrl: z
    .union([
      z
        .string()
        .trim()
        .regex(/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/.+/i),
      z.literal(""),
    ])
    .optional(),
});

export interface OnboardingResult {
  ok: boolean;
  message: string;
}

export async function createProfile(
  _prev: OnboardingResult | null,
  formData: FormData,
): Promise<OnboardingResult> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: "Vérifie les champs du formulaire." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: parsed.data.fullName,
    campus: parsed.data.campus,
    status: parsed.data.status,
    promotion: parsed.data.promotion,
    program: parsed.data.program?.trim() || null,
    linkedin_url: parsed.data.linkedinUrl?.trim() || null,
  });

  if (error) return { ok: false, message: error.message };

  redirect("/network");
}
