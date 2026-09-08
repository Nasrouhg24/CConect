import type { NextConfig } from "next";

/**
 * Refus de construire une production sans backend.
 *
 * Sans variables Supabase, l'application bascule en mode démo : plus
 * d'authentification, tout le monde est « membre de démonstration ». C'est
 * exactement ce qu'il faut en local, et exactement ce qu'il ne faut pas sur un
 * déploiement. Ces variables étant figées au build, une erreur de
 * configuration produisait un site ouvert qui avait l'air de fonctionner.
 *
 * On ne se contente pas de `NODE_ENV`, que `next build` met à `production`
 * même en local : c'est la plateforme (`VERCEL_ENV`) ou une déclaration
 * explicite (`CC_REQUIRE_SUPABASE=1`) qui signale un vrai déploiement.
 */
const isDeployment =
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.CC_REQUIRE_SUPABASE === "1";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

if (isDeployment && !(supabaseOrigin && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  throw new Error(
    "Déploiement sans backend : NEXT_PUBLIC_SUPABASE_URL et " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis, sinon l'application sert le " +
      "mode démo sans authentification. Voir docs/SETUP_SUPABASE.md.",
  );
}

/**
 * En-têtes de sécurité constants.
 *
 * La Content-Security-Policy n'est **pas** ici : elle porte un nonce tiré à
 * chaque requête et vit donc dans `src/proxy.ts`. La poser aux deux endroits
 * enverrait deux en-têtes, dont l'intersection casserait la page.
 */
const nextConfig: NextConfig = {
  // Rien à gagner à annoncer le framework et sa version.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
