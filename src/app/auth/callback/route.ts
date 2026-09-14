import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/env";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Échange le code du lien magique contre une session.
 *
 * `next` n'est jamais utilisé tel quel : `safeRedirectPath` le résout et
 * n'accepte que ce qui retombe sur notre propre origine. Voir le commentaire
 * de ce module pour ce que le filtre par préfixe laissait passer.
 */

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"), url.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_code", url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rempart applicatif ; la base refuse de toute façon le profil (cf. trigger
  // `enforce_allowed_email_domain`).
  if (!user?.email || !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=domain", url.origin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    new URL(profile ? next : "/onboarding", url.origin),
  );
}
