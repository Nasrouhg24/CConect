/**
 * Content-Security-Policy, construite à chaque requête.
 *
 * Elle contenait `script-src 'unsafe-inline'`, ce dont Next a besoin pour son
 * script d'amorçage — mais un `unsafe-inline` rend la directive inopérante :
 * le script injecté par une éventuelle faille XSS serait autorisé au même
 * titre que celui du framework. Un nonce, tiré à chaque requête, distingue les
 * deux. Next le lit dans l'en-tête de la requête (posé par `src/proxy.ts`) et
 * l'appose lui-même sur ses balises.
 *
 * `style-src` garde `'unsafe-inline'`, et c'est un choix assumé : l'interface
 * pose des styles en attribut (`style={{…}}` sur la carte, sur les pastilles
 * d'entreprise), et `style-src-attr` n'accepte pas de nonce. Le risque n'a pas
 * de commune mesure avec celui d'un script.
 */
import { LOGO_PROVIDER_ORIGIN, isLogoProviderEnabled } from "./logo-provider";

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // `NEXT_PUBLIC_LOGO_HOSTS` reste l'allowlist des logos saisis à la main dans
  // `logo_url`. Le fournisseur, lui, n'est ouvert que s'il est configuré : sans
  // jeton, aucune requête ne part vers lui, donc rien à autoriser.
  const logoHosts = (process.env.NEXT_PUBLIC_LOGO_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter((host) => host.startsWith("https://"));

  if (isLogoProviderEnabled) logoHosts.push(LOGO_PROVIDER_ORIGIN);

  const connect = ["'self'"];
  if (supabaseOrigin) {
    connect.push(supabaseOrigin, supabaseOrigin.replace(/^https:/, "wss:"));
  }

  return [
    "default-src 'self'",
    // `strict-dynamic` : un script autorisé peut en charger d'autres, rien
    // d'autre ne passe. `unsafe-eval` reste cantonné au développement, où
    // React s'en sert pour reconstruire les piles d'erreurs.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${logoHosts.length ? ` ${logoHosts.join(" ")}` : ""}`,
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
