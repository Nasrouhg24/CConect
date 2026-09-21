import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { rateLimitMessage } from "@/lib/rate-limit";
import { enforceWriteQuota } from "@/lib/rate-limit-server";
import { MAX_PHOTO_BYTES } from "@/lib/profile-photo";
import {
  removeProfilePhoto,
  uploadProfilePhoto,
  type PhotoResult,
} from "@/lib/profile-photo-service";
import { getCurrentMember, isDemoMode, profilePhotoStore } from "@/lib/repository";
import { logSecurityEvent } from "@/lib/security-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Photo de profil du membre connecté : `POST` pour ajouter ou remplacer,
 * `DELETE` pour retirer.
 *
 * Route Handler plutôt que Server Action : une Server Action plafonne le corps
 * à 1 Mo pour **toutes** les actions du site, et relever ce plafond pour une
 * photo l'aurait relevé partout. Ici la limite ne vaut que pour cette route.
 *
 * Aucune cible dans la requête : on ne modifie jamais que la photo de la
 * session.
 */

/** Marge pour l'enveloppe multipart autour du fichier. */
const MAX_REQUEST_BYTES = MAX_PHOTO_BYTES + 64 * 1024;

function json(result: PhotoResult | { ok: false; status: number; message: string }) {
  const status = result.ok ? 200 : result.status;
  return Response.json(result.ok ? { ok: true, version: result.version } : { ok: false, message: result.message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Les cookies de session partent avec toute requête vers le site : sans ce
 * contrôle, une page tierce pourrait poster un formulaire ici au nom du
 * membre. Les Server Actions font la même vérification d'origine.
 */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

async function quota(memberId: string) {
  if (isDemoMode) {
    const limit = await enforceWriteQuota("profile_photo", `profile_photo:${memberId}`);
    return limit.ok ? null : rateLimitMessage(limit.retryAfterSeconds);
  }
  // Même compteur partagé que les autres écritures (migration 0004), avec sa
  // propre fenêtre : 10 changements de photo par tranche de 10 minutes.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("consume_write_quota", {
    bucket_name: "profile_photo",
    max_writes: 10,
    window_secs: 600,
  });
  if (error) return "Opération impossible pour l'instant. Réessaie.";
  const wait = Number(data ?? 0);
  return wait > 0 ? rateLimitMessage(wait) : null;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    logSecurityEvent("csrf.rejected", { route: "profile-photo" });
    return json({ ok: false, status: 403, message: "Requête refusée." });
  }

  const member = await getCurrentMember();
  if (!member) return json({ ok: false, status: 401, message: "Connecte-toi pour modifier ta photo." });

  // Refus avant de lire le corps : un envoi énorme ne doit pas être mis en mémoire.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_REQUEST_BYTES) {
    return json({ ok: false, status: 413, message: "Image trop lourde : 5 Mo au plus." });
  }

  const limited = await quota(member.id);
  if (limited) return json({ ok: false, status: 429, message: limited });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("photo");
  } catch {
    return json({ ok: false, status: 400, message: "Envoi invalide." });
  }
  if (!(file instanceof File)) {
    return json({ ok: false, status: 400, message: "Aucune image reçue." });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return json({ ok: false, status: 413, message: "Image trop lourde : 5 Mo au plus." });
  }

  const result = await uploadProfilePhoto(await profilePhotoStore(), member.id, {
    type: file.type,
    size: file.size,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (result.ok) revalidatePath("/profile");
  return json(result);
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) {
    logSecurityEvent("csrf.rejected", { route: "profile-photo" });
    return json({ ok: false, status: 403, message: "Requête refusée." });
  }
  const member = await getCurrentMember();
  const result = await removeProfilePhoto(await profilePhotoStore(), member?.id ?? null);
  if (result.ok) revalidatePath("/profile");
  return json(result);
}
