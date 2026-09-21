import type { NextRequest } from "next/server";
import { getCurrentMember, readProfilePhoto } from "@/lib/repository";

/**
 * Sert la photo d'un membre.
 *
 * Même règle que la lecture d'un profil : réservé aux membres. La réponse ne
 * contient que l'image — ni clé de stockage, ni champ du profil — et le
 * navigateur n'a aucun moyen d'en déduire l'emplacement réel de l'objet.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/profile-photo/[memberId]">) {
  const viewer = await getCurrentMember();
  if (!viewer) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });

  const { memberId } = await ctx.params;
  const bytes = await readProfilePhoto(memberId);
  if (!bytes) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

  return new Response(new Uint8Array(bytes), {
    headers: {
      // Toujours du WebP réencodé par le serveur : le type est connu, pas déduit.
      "Content-Type": "image/webp",
      "Content-Length": String(bytes.length),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      // Privé : l'image ne doit pas finir dans un cache partagé accessible hors
      // session. L'URL change à chaque nouvelle photo (`?v=`), d'où la durée.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
