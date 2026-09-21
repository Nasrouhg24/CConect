"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { POLICY_VERSION } from "@/lib/legal";
import { getCurrentMember, recordPolicyAcceptance } from "@/lib/repository";

export interface AcceptResult {
  ok: boolean;
  message: string;
}

/**
 * Acceptation des politiques par un membre déjà inscrit.
 *
 * La version acceptée n'est **pas** lue dans le formulaire : elle est prise
 * côté serveur. Sinon un champ caché modifié suffirait à enregistrer
 * l'acceptation d'une version qu'on n'a jamais affichée — une preuve de
 * consentement qui ne prouve rien.
 *
 * `revalidatePath("/", "layout")` : les pages rendues avant l'acceptation ont
 * été produites alors que le proxy renvoyait tout vers ce blocage ; sans
 * invalidation, le membre retrouverait la version en cache de la page qu'il
 * cherchait.
 */
export async function acceptPolicies(
  _prev: AcceptResult | null,
  formData: FormData,
): Promise<AcceptResult> {
  if (formData.get("accept") !== "on") {
    return {
      ok: false,
      message: "Coche la case pour confirmer que tu as lu les deux documents.",
    };
  }

  const member = await getCurrentMember();
  if (!member) return { ok: false, message: "Session expirée. Reconnecte-toi." };

  try {
    await recordPolicyAcceptance(POLICY_VERSION);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "L'enregistrement a échoué. Réessaie.",
    };
  }

  revalidatePath("/", "layout");

  // La destination est déjà ramenée à un chemin interne par la page ; on la
  // repasse au tamis, parce qu'une Server Action reçoit ce qu'on lui envoie et
  // pas seulement ce que la page a rendu.
  const next = formData.get("next");
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/network";
  redirect(target);
}
