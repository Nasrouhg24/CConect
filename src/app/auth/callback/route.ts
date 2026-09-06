import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Échange le code du lien magique contre une session.
 *
 * `next` n'est jamais utilisé tel quel : seule une redirection interne
 * (chemin commençant par « / » et sans « // ») est acceptée, sinon on
 * offrirait une redirection ouverte à toute personne capable de forger le lien.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/network";
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

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
