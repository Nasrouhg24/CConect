"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { describeDbError, reportDbError } from "@/lib/db-error";
import { POLICY_VERSION } from "@/lib/legal";
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
  /**
   * Case à cocher, obligatoire. `z.literal("on")` et non un booléen permissif :
   * une case décochée n'envoie rien du tout, et `Boolean(undefined)` est faux —
   * mais `Boolean("false")` est vrai. On n'accepte donc que la valeur exacte
   * qu'envoie une case cochée.
   *
   * La version acceptée n'est pas lue dans le formulaire : elle est prise
   * côté serveur, pour qu'un champ caché modifié ne puisse pas faire enregistrer
   * l'acceptation d'un texte jamais affiché.
   */
  acceptPolicies: z.literal("on"),
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
    const refused = parsed.error.issues.some((issue) =>
      issue.path.includes("acceptPolicies"),
    );
    return {
      ok: false,
      message: refused
        ? "L'acceptation de la politique de confidentialité et des conditions est nécessaire pour créer un compte."
        : "Vérifie les champs du formulaire.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Session expirée." };

  // Le consentement part avec le profil, dans la même écriture : un profil
  // créé sans version acceptée se ferait bloquer par la coquille à la seconde
  // suivante, alors que le membre vient justement d'accepter.
  const acceptedAt = new Date().toISOString();
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: parsed.data.fullName,
    campus: parsed.data.campus,
    status: parsed.data.status,
    promotion: parsed.data.promotion,
    program: parsed.data.program?.trim() || null,
    linkedin_url: parsed.data.linkedinUrl?.trim() || null,
    policy_version: POLICY_VERSION,
    policy_accepted_at: acceptedAt,
  });

  if (error) {
    reportDbError("onboarding.createProfile", error);
    return { ok: false, message: describeDbError(error) };
  }

  // La preuve datée, dans sa table en ajout seul. Elle échoue sans empêcher
  // l'inscription : le consentement a bien été donné et il est enregistré sur
  // le profil ; refuser le compte pour un défaut de journalisation punirait le
  // membre d'un incident qui n'est pas le sien.
  const { error: traceError } = await supabase.from("consent_events").insert({
    profile_id: user.id,
    policy_version: POLICY_VERSION,
    accepted_at: acceptedAt,
  });
  if (traceError) reportDbError("onboarding.consentEvent", traceError);

  redirect("/network");
}
