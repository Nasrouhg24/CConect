import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/csp";
import { CONSENT_PATH, POLICY_VERSION } from "./lib/legal";
import { AUTH_COOKIE_OPTIONS } from "./lib/supabase/cookie-options";

/**
 * Rafraîchit la session Supabase, pose la CSP et protège les routes membres.
 *
 * En mode démo (aucune variable Supabase), l'accès est ouvert : c'est le seul
 * moyen de faire tourner l'application sans backend. Le garde-fou de route est
 * optimiste — l'autorisation réelle est appliquée par les politiques RLS de la
 * base, pas ici.
 *
 * La CSP est construite ici et non plus dans `next.config.ts` parce qu'elle
 * porte désormais un nonce, qui doit être tiré à chaque requête. Il est posé
 * sur les en-têtes de la *requête* pour que Next l'appose sur ses propres
 * balises `<script>`, et sur la réponse pour que le navigateur l'applique.
 */
const PROTECTED = [
  "/network",
  "/companies",
  "/people",
  "/advisor",
  "/terminal",
  "/contribute",
  "/stats",
  "/profile",
  "/onboarding",
];

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withCsp = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  // Mode démo : ni session, ni blocage des politiques. Ce n'est pas un trou,
  // c'est l'absence de base — il n'y a aucun consentement à enregistrer, donc
  // rien à exiger. L'écran d'acceptation reste visitable (`/legal/accepter`)
  // pour qu'on puisse le voir tourner sans backend.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, key, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PROTECTED.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (needsAuth && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return withCsp(NextResponse.redirect(login));
  }

  /**
   * Blocage tant que les politiques en vigueur ne sont pas acceptées.
   *
   * Il vit ici, et non dans la coquille : un layout racine n'est pas re-rendu
   * lors d'une navigation côté client, si bien qu'un écran de blocage posé là
   * laisse passer le premier clic sur un lien interne. Le proxy, lui, voit
   * chaque requête — y compris celles que React émet pour une navigation
   * douce, et les envois de Server Action, qui repassent par le même chemin.
   *
   * Seules les routes déjà protégées sont concernées : `/legal` reste
   * accessible, sinon le membre ne pourrait pas lire ce qu'on lui demande
   * d'accepter, et `/login` reste ouvert.
   *
   * Un profil absent n'est pas bloqué : c'est l'inscription qui recueille
   * l'acceptation, et elle ne peut pas avoir lieu derrière un blocage.
   */
  if (needsAuth && user) {
    const { data } = await supabase
      .from("profiles")
      .select("policy_version")
      .eq("id", user.id)
      .maybeSingle();

    if (data && data.policy_version !== POLICY_VERSION) {
      const gate = new URL(CONSENT_PATH, request.url);
      gate.searchParams.set("next", request.nextUrl.pathname);
      return withCsp(NextResponse.redirect(gate));
    }
  }

  return withCsp(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)"],
};
