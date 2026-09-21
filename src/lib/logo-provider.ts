/**
 * Fournisseur de logos — Logo.dev.
 *
 * Le projet ne stocke pas d'images : une URL de logo se **calcule** à partir du
 * domaine de l'entreprise. Aucun fichier à maintenir, aucune liste de marques
 * codée en dur, et le même mécanisme vaut pour seize entreprises comme pour
 * dix mille.
 *
 *   domaine  →  https://img.logo.dev/<domaine>?token=…  →  image
 *
 * Trois points vérifiés dans la documentation du fournisseur (logo.dev/docs) :
 *
 *   - le jeton est une **clé publiable** (`pk_…`), conçue pour figurer dans une
 *     URL d'image côté navigateur. Elle est donc exposée par construction, d'où
 *     le préfixe `NEXT_PUBLIC_`. La clé *secrète* (`sk_…`), qui ouvre les API
 *     de données, n'a rien à faire dans ce fichier ni dans le bundle ;
 *   - `fallback=404` est indispensable : sans lui, le service répond 200 avec
 *     **son propre** monogramme. L'image ne serait jamais en erreur, notre
 *     monogramme ne s'afficherait jamais, et une entreprise inconnue
 *     apparaîtrait avec une lettre dessinée par un tiers ;
 *   - `size` est en pixels d'image. On demande le double de la boîte pour
 *     rester net sur un écran à haute densité.
 *
 * Sans jeton configuré, `companyLogoSrc` renvoie `null` : l'application
 * n'émet alors **aucune** requête vers un tiers et affiche des monogrammes.
 * C'est le mode par défaut, et c'est un mode complet, pas un mode dégradé.
 */

import { LOGO_DEV_TOKEN } from "./env";

/** Origine à autoriser dans `img-src` quand le fournisseur est actif. */
export const LOGO_PROVIDER_ORIGIN = "https://img.logo.dev";

export const isLogoProviderEnabled = LOGO_DEV_TOKEN.length > 0;

/**
 * Construction de l'URL, jeton passé en argument.
 *
 * Séparée de la configuration pour être vérifiable telle quelle : les deux
 * branches — avec et sans jeton — se testent sans manipuler l'environnement.
 */
export function buildLogoSrc(
  domain: string | null | undefined,
  boxSize: number,
  token: string,
): string | null {
  if (!domain || token.length === 0) return null;

  const params = new URLSearchParams({
    token,
    size: String(Math.round(boxSize * 2)),
    format: "webp",
    // Rend l'absence de logo détectable : voir l'en-tête de ce fichier.
    fallback: "404",
  });

  return `${LOGO_PROVIDER_ORIGIN}/${encodeURIComponent(domain)}?${params}`;
}

/**
 * URL du logo d'un domaine, ou `null` s'il n'y a rien à demander.
 *
 * Déterministe : le même domaine et la même taille donnent toujours la même
 * URL. C'est ce qui fait le cache — le navigateur reconnaît l'image d'une page
 * à l'autre, et le travail de mise en cache n'a pas à être réinventé ici.
 */
export function companyLogoSrc(
  domain: string | null | undefined,
  boxSize: number,
): string | null {
  return buildLogoSrc(domain, boxSize, LOGO_DEV_TOKEN);
}
