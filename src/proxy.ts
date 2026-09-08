import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/csp";
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
  "/offers",
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

  return withCsp(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)"],
};
